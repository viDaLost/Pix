import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const sw=read('sw.js'),FILES=[...sw.match(/const FILES = \[([^\]]*)\]/)[1].matchAll(/'\.\/([^']*)'/g)].map(m=>m[1]);
// Static imports, side-effect imports and dynamic import('./x.js') of every module reachable from the app.
function reachable(entry){const seen=new Set(),todo=[entry];while(todo.length){const file=todo.pop();if(seen.has(file))continue;seen.add(file);for(const m of read(file).matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g))todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1])));}return seen;}

test('every module reachable from the app is cached for offline play',()=>{
 const modules=reachable('src/app.js');assert.ok(modules.has('src/progress.js')&&modules.has('src/market.js')&&modules.has('src/jewelry.js'));
 for(const file of modules)assert.ok(FILES.includes(file),`${file} is missing from FILES in sw.js`);
});
test('the page, its stylesheet fonts and icons are cached, and every cached file exists',()=>{
 for(const file of FILES)if(file)assert.ok(existsSync(new URL(file,root)),`${file} listed in sw.js does not exist`);
 const html=read('index.html'),css=read('styles.css'),refs=[...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g),...css.matchAll(/url\(\.\/([^)]+)\)/g)].map(m=>m[1]);
 assert.ok(refs.length>8);for(const ref of refs)assert.ok(FILES.includes(ref),`${ref} is referenced but not cached`);
 assert.ok(FILES.includes('')&&FILES.includes('index.html'),'the start page is cached');
});
test('the app never loads modules lazily, so an old cache cannot miss one',()=>{
 for(const file of reachable('src/app.js'))assert.doesNotMatch(read(file),/\bimport\s*\(/,`${file} uses a dynamic import`);
});

// Runs sw.js against an in-memory Cache Storage and a switchable network.
function worker(){
 const handlers={},stores=new Map(),net={online:true,calls:[]},BASE='https://example.test/Pix/';
 const key=r=>typeof r==='string'?r:r.url;
 const open=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {
  async addAll(list){for(const r of list){m.set(key(r),await fetchFake(r));}},
  async put(r,res){m.set(key(r),res);},
  async match(r,{ignoreSearch=false}={}){const url=key(r);if(m.has(url))return m.get(url).clone();if(ignoreSearch){const bare=url.split('?')[0];if(m.has(bare))return m.get(bare).clone();}return undefined;}};};
 const caches={open:async name=>open(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)};
 async function fetchFake(r){net.calls.push({url:key(r),cache:r.cache});if(!net.online)throw new TypeError('offline');return new Response('body of '+key(r).slice(BASE.length),{status:200});}
 const self={location:{href:BASE+'sw.js'},addEventListener:(type,fn)=>{handlers[type]=fn;},skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 vm.runInNewContext(sw,{self,caches,fetch:fetchFake,Request,Response,URL,Promise});
 const dispatch=async(type,extra={})=>{let done;const event={...extra,waitUntil:p=>{done=p;},respondWith:p=>{done=p;}};handlers[type](event);return done&&await done;};
 return {BASE,net,stores,dispatch,request:(url,mode='no-cors')=>({url:BASE+url,method:'GET',mode})};
}
test('install bypasses the HTTP cache and the game then starts without the network',async()=>{
 const w=worker();await w.dispatch('install');await w.dispatch('activate');
 assert.equal(w.net.calls.length,FILES.length);assert.ok(w.net.calls.every(c=>c.cache==='reload'),'install must use cache:reload');
 w.net.online=false;w.net.calls=[];
 for(const file of FILES.filter(Boolean)){const res=await w.dispatch('fetch',{request:w.request(file)});assert.equal(await res.text(),'body of '+file);}
 const page=await w.dispatch('fetch',{request:w.request('?fps','navigate')});assert.equal(await page.text(),'body of index.html');
 assert.equal(w.net.calls.length,0,'cached files are served without the network');
 const missing=await w.dispatch('fetch',{request:w.request('src/missing.js')});assert.equal(missing.type,'error');
});
test('a file missing from the cache is fetched once and kept; old caches are removed on activation',async()=>{
 const w=worker();w.stores.set('pix-forge-old',new Map());await w.dispatch('install');await w.dispatch('activate');assert.deepEqual([...w.stores.keys()],['pix-forge-v10']);
 w.stores.get('pix-forge-v10').delete(w.BASE+'src/app.js');w.net.calls=[];
 await w.dispatch('fetch',{request:w.request('src/app.js')});await w.dispatch('fetch',{request:w.request('src/app.js')});assert.equal(w.net.calls.length,1);
});
