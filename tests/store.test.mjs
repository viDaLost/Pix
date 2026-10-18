import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// A small in-memory IndexedDB with named databases: requests answer in order, a transaction commits its writes only
// when it completes and drops them when aborted, open() creates a missing database (as the real one does) and
// databases() lists what exists. That is all the store of the bestiary and the reader of «Сияние» rely on.
function fakeIndexedDB({listing=true}={}){
 const dbs=new Map(),later=fn=>setTimeout(fn,0),log={opened:[],created:[],writes:0};
 function connection(name){const data=dbs.get(name);
  function transaction(_,mode){const writes=new Map();let pending=0,aborted=false,ended=false;
   const end=()=>later(()=>{if(pending||ended)return;ended=true;if(aborted){t.error=null;t.onabort?.();}else{for(const [k,v]of writes){data.set(k,v);log.writes++;}t.oncomplete?.();}});
   const request=fn=>{pending++;const req={};later(()=>{if(!aborted){req.result=fn();req.onsuccess?.();}pending--;end();});return req;};
   const store={get:key=>request(()=>writes.has(key)?writes.get(key):data.get(key)),put:(value,key)=>request(()=>{if(mode!=='readwrite')throw new Error('read-only transaction');writes.set(key,value);})};
   const t={error:null,objectStore:()=>store,abort(){aborted=true;}};return t;}
  return {transaction,createObjectStore(){},close(){},objectStoreNames:{contains:n=>n==='saves'&&!!data}};}
 const api={dbs,log,open(name){log.opened.push(name);const req={};later(()=>{const fresh=!dbs.has(name);if(fresh){dbs.set(name,new Map());log.created.push(name);}
   req.result=connection(name);if(fresh){req.transaction={abort(){dbs.delete(name);}};req.onupgradeneeded?.();if(!dbs.has(name)){req.onerror?.();return;}}req.onsuccess?.();});return req;}};
 if(listing)api.databases=async()=>[...dbs.keys()].map(name=>({name,version:1}));
 return api;}
const idb=fakeIndexedDB();globalThis.indexedDB=idb;
const {openStore,readLegacy,LEGACY,StaleTabError}=await import('../src/store.js');
const {SAVE_KEY}=await import('../src/progress.js');
const store=openStore('pix-bestiary');
const memory=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),m};};

test('the bestiary keeps its save in its own database, with the stamp of the tab that wrote it (GDD 12.1)',async()=>{
 assert.equal(SAVE_KEY,'pix-bestiary-save-v1','a new key: the previous game keeps pix-forge-save-v1');assert.notEqual(SAVE_KEY,LEGACY.key);
 assert.deepEqual(await store.load(),{raw:null,stamp:null});assert.ok(idb.dbs.has('pix-bestiary'));assert.ok(!idb.dbs.has(LEGACY.db),'the database of «Сияние» is not touched');
 await store.save('first',{at:10,tab:'a',since:0});assert.deepEqual(await store.load(),{raw:'first',stamp:{at:10,tab:'a'}});
 await store.save('again',{at:11,tab:'a',since:10});assert.deepEqual(await store.load(),{raw:'again',stamp:{at:11,tab:'a'}},'a tab never conflicts with itself');
});
test('a tab that loaded before another tab saved cannot overwrite the newer save',async()=>{
 idb.dbs.get('pix-bestiary').clear();await store.save('a-1',{at:100,tab:'a',since:0});
 await store.save('b-1',{at:200,tab:'b',since:100});
 await assert.rejects(store.save('a-2',{at:150,tab:'a',since:100}),e=>e instanceof StaleTabError&&e.stamp.at===200&&e.stamp.tab==='b');
 assert.deepEqual(await store.load(),{raw:'b-1',stamp:{at:200,tab:'b'}},'the refused write changes nothing');
 await store.save('a-3',{at:300,tab:'a',since:200});assert.equal((await store.load()).raw,'a-3','the queue keeps working after a refusal');
});
test('the bestiary replaced by an import or a new start waits under its own key and can be swapped back',async()=>{
 idb.dbs.get('pix-bestiary').clear();assert.equal(await store.loadBackup(),null);
 await store.save('current',{at:1,tab:'a',since:0});await store.saveBackup('before',{day:4,gold:120,rep:9,at:7});
 assert.deepEqual(await store.loadBackup(),{meta:{day:4,gold:120,rep:9,at:7},raw:'before'});assert.deepEqual(await store.loadBackup(false),{meta:{day:4,gold:120,rep:9,at:7},raw:null},'the menu reads only the summary');
 assert.equal((await store.load()).raw,'current','the main save is untouched');
 await store.saveBackup('imported',{day:9,gold:5,rep:1,at:8});assert.equal((await store.loadBackup()).raw,'imported','a later replacement keeps the latest previous bestiary');
});
test('the previous game is only read: from localStorage or from its database, the newer copy, byte for byte (decision D10)',async()=>{
 const local=JSON.stringify({savedAt:5,resources:{gold:3},technologies:[]})+'\n',disk=JSON.stringify({savedAt:9,resources:{gold:7},technologies:[]});
 assert.equal(await readLegacy({storage:memory(),idb}),null,'nothing found — nothing to offer');
 assert.ok(!idb.dbs.has(LEGACY.db),'looking for it never creates its database');
 assert.deepEqual(await readLegacy({storage:memory({[LEGACY.key]:local}),idb}),{raw:local,from:'local',file:'siyanie-save.json'},'the very string, trailing newline included');
 idb.dbs.set(LEGACY.db,new Map([['main',disk]]));const writes=idb.log.writes;
 assert.deepEqual(await readLegacy({storage:memory({[LEGACY.key]:local}),idb}),{raw:disk,from:'disk',file:'siyanie-save.json'},'the newer copy wins');
 assert.deepEqual(await readLegacy({storage:memory(),idb}),{raw:disk,from:'disk',file:'siyanie-save.json'});
 assert.equal(idb.log.writes,writes,'reading writes nothing');assert.equal(idb.dbs.get(LEGACY.db).get('main'),disk);
 idb.dbs.get(LEGACY.db).set('main',JSON.stringify({savedAt:1}));assert.equal((await readLegacy({storage:memory({[LEGACY.key]:local}),idb})).raw,local,'an older disk copy loses to a newer local one');
 idb.dbs.delete(LEGACY.db);
});
test('a browser that cannot list its databases is never made to open one by name: only localStorage is read',async()=>{
 const blind=fakeIndexedDB({listing:false});
 assert.equal(await readLegacy({storage:memory(),idb:blind}),null);assert.deepEqual(blind.log.opened,[],'no database opened, none created');
 const raw='{"savedAt":1}';assert.equal((await readLegacy({storage:memory({[LEGACY.key]:raw}),idb:blind})).raw,raw);
 const broken={getItem(){throw new Error('denied');}};assert.equal(await readLegacy({storage:broken,idb:blind}),null,'a locked storage is not an error');
});
test('the interface offers the previous save once in a window and always in the menu, under its own file name',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/readLegacy\(\)\.then\(v=>\{legacy=v;if\(v&&!state\.legacySeen&&!loadError\)queueModal\(showLegacy,'legacy'\);/);
 assert.match(app,/Здесь была ювелирная мастерская «Сияние»\. Её сохранение не тронуто — его можно скачать в меню\. В бестиарий оно не переносится\./,'the text of GDD 10.9');
 assert.match(app,/legacy\?btn\('legacy-export',`\$\{icon\('download'\)\}<span>Скачать сохранение прежней игры<\/span>`\):''/,'the menu item only when something was found');
 assert.match(app,/case'legacy-export':if\(legacy\)download\(new Blob\(\[legacy\.raw\]/,'downloaded as it was read');
 assert.match(app,/openStore\('pix-bestiary'\)/);assert.match(app,/const SAVE=P\.SAVE_KEY,SAVED_AT=SAVE\+':at'/);assert.match(app,/new BroadcastChannel\('pix-bestiary'\)/);
});
