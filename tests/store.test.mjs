import test from 'node:test';
import assert from 'node:assert/strict';
// A small in-memory IndexedDB: requests answer in order, a transaction commits its writes only when it completes
// and drops them when aborted, which is all the atelier store relies on.
function fakeIndexedDB(){
 const data=new Map(),later=fn=>setTimeout(fn,0);
 function transaction(){
  const writes=new Map();let pending=0,aborted=false,ended=false;
  const end=()=>later(()=>{if(pending||ended)return;ended=true;if(aborted){t.error=null;t.onabort?.();}else{for(const [k,v]of writes)data.set(k,v);t.oncomplete?.();}});
  const request=fn=>{pending++;const req={};later(()=>{if(!aborted){req.result=fn();req.onsuccess?.();}pending--;end();});return req;};
  const store={get:key=>request(()=>writes.has(key)?writes.get(key):data.get(key)),put:(value,key)=>request(()=>{writes.set(key,value);})};
  const t={error:null,objectStore:()=>store,abort(){aborted=true;}};return t;
 }
 return {data,open(){const req={};later(()=>{req.result={transaction,createObjectStore(){}};req.onupgradeneeded?.();req.onsuccess?.();});return req;}};
}
const idb=fakeIndexedDB();globalThis.indexedDB=idb;
const {loadAtelier,saveAtelier,StaleTabError}=await import('../src/atelier-store.js');

test('the disk keeps the save with the stamp of the tab that wrote it',async()=>{
 assert.deepEqual(await loadAtelier(),{raw:null,stamp:null});
 await saveAtelier('first',{at:10,tab:'a',since:0});assert.deepEqual(await loadAtelier(),{raw:'first',stamp:{at:10,tab:'a'}});
 await saveAtelier('again',{at:11,tab:'a',since:10});assert.deepEqual(await loadAtelier(),{raw:'again',stamp:{at:11,tab:'a'}},'a tab never conflicts with itself');
});
test('a tab that loaded before another tab saved cannot overwrite the newer save',async()=>{
 idb.data.clear();await saveAtelier('a-1',{at:100,tab:'a',since:0});
 // Tab b opened after a-1 and saves; tab a still believes a-1 is the latest.
 await saveAtelier('b-1',{at:200,tab:'b',since:100});
 await assert.rejects(saveAtelier('a-2',{at:150,tab:'a',since:100}),e=>e instanceof StaleTabError&&e.stamp.at===200&&e.stamp.tab==='b');
 assert.deepEqual(await loadAtelier(),{raw:'b-1',stamp:{at:200,tab:'b'}},'the refused write changes nothing');
 // The queue keeps working after a refusal, and a tab that has seen the newer stamp may write again.
 await saveAtelier('a-3',{at:300,tab:'a',since:200});assert.equal((await loadAtelier()).raw,'a-3');
});
test('a save written by an older version without a stamp is overwritten normally',async()=>{
 idb.data.clear();idb.data.set('main','old');await saveAtelier('new',{at:5,tab:'c',since:0});assert.deepEqual(await loadAtelier(),{raw:'new',stamp:{at:5,tab:'c'}});
});
