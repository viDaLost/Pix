// The saves of this device in IndexedDB (GDD 12.1): one database per game, its object store «saves» with the keys main,
// stamp, before-import and before-import:meta. A tab that saved after the stamp another tab knows about wins, writes go
// one after another, and the previous game «Сияние» is only ever read, never opened for writing or created.
export class StaleTabError extends Error{constructor(stamp){super('Игра открыта в другой вкладке.');this.name='StaleTabError';this.stamp=stamp;}}
const BACKUP='before-import';
export function openStore(name){
 let dbPromise=null,queue=Promise.resolve();
 const db=()=>dbPromise??=new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(new Error('IndexedDB недоступна'));return;}const open=indexedDB.open(name,1);open.onupgradeneeded=()=>open.result.createObjectStore('saves');open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
 const write=fn=>{const pending=queue.catch(()=>{}).then(async()=>{const conn=await db();return new Promise(fn.bind(null,conn));});queue=pending;return pending;};
 return {name,
  // The save and its stamp {at,tab} are read and written in one transaction, so tabs see consistent pairs.
  async load(){const conn=await db();return new Promise((resolve,reject)=>{const tx=conn.transaction('saves','readonly'),store=tx.objectStore('saves'),main=store.get('main'),stamp=store.get('stamp');tx.oncomplete=()=>resolve({raw:main.result||null,stamp:stamp.result||null});tx.onabort=()=>reject(tx.error);});},
  // Another tab that saved after the stamp this tab knows about wins: the write is refused, nothing is lost there.
  save(raw,{at=0,tab='',since=0}={}){return write((conn,resolve,reject)=>{const tx=conn.transaction('saves','readwrite'),store=tx.objectStore('saves'),req=store.get('stamp');let stale=null;req.onsuccess=()=>{const v=req.result;if(v&&v.tab!==tab&&v.at>since){stale=v;tx.abort();return;}store.put(raw,'main');store.put({at,tab},'stamp');};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(stale?new StaleTabError(stale):tx.error||new Error('Запись не удалась'));});},
  // The bestiary that an import or a fresh start replaces waits under its own key until the player brings it back.
  saveBackup(raw,meta){return write((conn,resolve,reject)=>{const tx=conn.transaction('saves','readwrite'),store=tx.objectStore('saves');store.put(raw,BACKUP);store.put(meta,BACKUP+':meta');tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Запись не удалась'));});},
  async loadBackup(full=true){const conn=await db();return new Promise((resolve,reject)=>{const tx=conn.transaction('saves','readonly'),store=tx.objectStore('saves'),meta=store.get(BACKUP+':meta'),raw=full?store.get(BACKUP):null;tx.oncomplete=()=>resolve(meta.result?{meta:meta.result,raw:raw?.result??null}:null);tx.onabort=()=>reject(tx.error);});}};
}
// The previous game «Сияние» (GDD 12.1, decision D10): its save in localStorage, or its main record in IndexedDB. The
// database is opened only when indexedDB.databases() lists it — opening a missing one by name would create it — and only
// for reading. The newer of the two copies is returned as it is, byte for byte, for «Скачать сохранение прежней игры».
export const LEGACY={key:'pix-forge-save-v1',db:'pix-jewel-atelier',file:'siyanie-save.json'};
const savedAt=raw=>{try{return JSON.parse(raw)?.savedAt||0;}catch{return -1;}};
export async function readLegacy({storage,idb=globalThis.indexedDB}={}){
 let local=null;try{local=(storage||globalThis.localStorage)?.getItem(LEGACY.key)||null;}catch{}
 let disk=null;
 try{const list=typeof idb?.databases==='function'?await idb.databases():[];
  if(list.some(d=>d?.name===LEGACY.db))disk=await new Promise(resolve=>{const open=idb.open(LEGACY.db);
   // An upgrade here would mean the database was not there after all: it is left empty and nothing is read.
   open.onupgradeneeded=()=>{try{open.transaction.abort();}catch{}resolve(null);};
   open.onerror=()=>resolve(null);open.onblocked=()=>resolve(null);
   open.onsuccess=()=>{const conn=open.result;try{if(!conn.objectStoreNames.contains('saves')){conn.close();resolve(null);return;}const tx=conn.transaction('saves','readonly'),req=tx.objectStore('saves').get('main');tx.oncomplete=()=>{conn.close();resolve(typeof req.result==='string'?req.result:null);};tx.onabort=tx.onerror=()=>{conn.close();resolve(null);};}catch{conn.close();resolve(null);}};});}catch{disk=null;}
 const raw=disk&&(!local||savedAt(disk)>=savedAt(local))?disk:local;
 return raw?{raw,from:raw===disk?'disk':'local',file:LEGACY.file}:null;}
