import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {showcase,deliverable,orderPieces} from '../src/market.js';
// Saves written by the code of commit 00d1421 (tests/fixtures/make-v3.mjs), not by the current rules.
const raw=name=>{const data=readFileSync(new URL('./fixtures/'+name,import.meta.url));return (name.endsWith('.gz')?gunzipSync(data):data).toString('utf8');};
const NAMES=['v3-draft.json','v3-saturated.json','v3-orders.json','v3-legacy.json','v3-dense.json.gz'];
const CORE=['version','world','seed','day','tradeDay','gold','xp','energy','crafted','sold','nextId','materials','skills','draft','stock','library','customers','demand','requests','welcomed','sound','music','volume','legacy','savedAt'];
const core=s=>JSON.stringify(Object.fromEntries(CORE.map(k=>[k,s[k]??null])));

test('every version 3 save loads, normalizes and keeps its core fields unchanged',()=>{
 for(const name of NAMES){
  const text=raw(name),old=JSON.parse(text),s=P.load(text);
  assert.equal(core(s),core(old),name);assert.deepEqual({sales:s.daily.sales,areas:s.daily.areas,income:s.daily.income,made:s.daily.made},{sales:old.daily.sales,areas:old.daily.areas,income:old.daily.income||0,made:old.daily.made||0},name);
  assert.deepEqual(s.log.map(e=>e.t),old.log,name);assert.ok(s.log.every(e=>e.d===null),'older entries go to «Ранее»');
  assert.ok(Number.isInteger(s.worldSeed)&&s.stats&&Array.isArray(s.daily.types),name);
  const again=P.load(J.serialize(s));assert.equal(J.serialize(again),J.serialize(s),name+' roundtrip');
  assert.ok(s.stock.every(i=>Object.isFrozen(i.design))&&s.library.every(i=>Object.isFrozen(i.design)),name);
 }
});
test('the old draft keeps its undo and redo history',()=>{
 const s=P.load(raw('v3-draft.json'));assert.deepEqual([s.draft.undo.length,s.draft.redo.length],[4,2]);const now=J.clone(s.draft.design);
 J.undo(s,true);J.undo(s,true);assert.equal(s.draft.design.name,'Капля для Норы');J.undo(s);J.undo(s);assert.deepEqual(s.draft.design,now);J.undo(s);assert.deepEqual([s.draft.undo.length,s.draft.redo.length],[3,3]);
 assert.doesNotThrow(()=>J.deserialize(J.serialize(s)));
});
test('saturated demand from the old ledger still applies to the same design',()=>{
 const s=P.load(raw('v3-saturated.json')),cool=s.demand.find(f=>f.until>s.tradeDay),copy=s.stock.find(i=>J.similarity(J.fingerprint(i.design),cool.signature)>=.9);
 assert.ok(copy,'a copy of the saturated design is on the showcase');const info=J.demandInfo(s,copy.design);assert.equal(info.factor,.25);assert.equal(info.remaining,cool.until-s.tradeDay);assert.equal(J.isFresh(s,copy.design),false);
});
test('old orders, the migrated forge archive and a long game keep playing',()=>{
 const orders=P.load(raw('v3-orders.json'));assert.ok(orders.requests.some(r=>r.done)&&orders.requests.some(r=>!r.done));for(let i=0;i<5;i++)P.nextDay(orders);assert.equal(orders.requests.filter(r=>r.done).length,0);assert.doesNotThrow(()=>J.deserialize(J.serialize(orders)));
 const legacy=P.load(raw('v3-legacy.json'));assert.equal(legacy.legacy.world===undefined,true);assert.equal(legacy.legacy.lastSaved,1700000000000);assert.ok(legacy.stock.length===1&&legacy.welcomed);
 const long=P.load(raw('v3-dense.json.gz'));assert.deepEqual([long.stock.length,long.library.length,long.demand.length],[120,40,500]);
 const c=long.customers;P.nextDay(long);const piece=long.stock[0],buyer=long.customers.find(c=>J.quote(long,piece,c,'counter').accepted);if(buyer)P.sell(long,piece.id,buyer.id,'counter');assert.notEqual(long.customers,c);assert.doesNotThrow(()=>J.deserialize(J.serialize(long)));
});
// The budget behind a smooth showcase on a phone: 120 pieces and 500 ledger entries.
test('rendering the showcase and orders of a long game stays within the comparison budget',()=>{
 const s=P.load(raw('v3-dense.json.gz'));P.nextDay(s);const count=fn=>{const a=J.tally.similarity,b=J.tally.evaluate;fn();return {similarity:J.tally.similarity-a,evaluate:J.tally.evaluate-b};};
 const render=(view={})=>{showcase(s,{sort:'fit',...view});deliverable(s);orderPieces(s);};
 const sameKind=d=>s.demand.filter(f=>f.signature.type===d.type).length;
 const first=count(()=>render());assert.ok(first.evaluate<=s.stock.length+s.library.length,`evaluate ${first.evaluate}`);
 // Each design is compared with its own kind of the ledger once: the featured piece and pieces that fit an open order.
 const featured=showcase(s,{sort:'fit'}).item,candidates=new Set([featured,...s.stock.filter(i=>s.requests.some(r=>!r.done&&J.matches(i.design,r)))]);
 assert.ok(first.similarity<=[...candidates].reduce((n,i)=>n+sameKind(i.design),0),`similarity ${first.similarity}`);
 assert.deepEqual(count(()=>{for(let i=0;i<5;i++)render();}),{similarity:0,evaluate:0},'repeated renders reuse every appraisal');
 const browse=count(()=>{for(const i of s.stock.slice(0,10))render({itemId:i.id});});assert.ok(browse.similarity<=10*s.demand.length,`browsing ${browse.similarity}`);assert.equal(browse.evaluate,0);
 // A sale adds at most one ledger entry; pieces already seen compare themselves with that entry only.
 const sold=showcase(s,{sort:'fit'}),q=sold.quotes?.counter;if(q?.accepted)P.sell(s,sold.item.id,sold.buyer.id,'counter');
 const seen=s.stock.slice(0,10).filter(i=>i.id!==sold.item.id),after=count(()=>{for(const i of seen)render({itemId:i.id});});assert.ok(after.similarity<=seen.length*2+sameKind(s.stock[0].design)*3,`after a sale ${after.similarity}`);assert.equal(after.evaluate,0);
});
test('appraisals, fingerprints and pictures of a long game never reach its save file',()=>{
 const text=raw('v3-dense.json.gz'),s=P.load(text),loaded=J.serialize(s);showcase(s,{sort:'fit'});orderPieces(s);for(const i of s.stock)J.isFresh(s,i.design);
 assert.equal(J.serialize(s),loaded,'rendering changes nothing in the save');
 // The fields of the new version (the book written in from 160 pieces, reputation, velvets) stay small.
 assert.ok(loaded.length<=text.length+6000,`the save grew from ${text.length} to ${loaded.length} bytes`);
});
