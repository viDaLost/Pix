import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {freshMarks} from '../src/market.js';
import {layoutGems,patternStrokes} from '../src/patterns.js';
const pt=(x,y)=>({x,y});
const rich=s=>{s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;};
const make=(s,d)=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s).item;};
function piece(template='oval',type='pendant',metal='silver'){const d=J.makeDesign(type,template,metal);d.gems=layoutGems(d,'solo',{kind:'amethyst',size:3});d.strokes=[{kind:'engrave',width:1,points:[pt(40,40),pt(44,44)]}];return d;}
// One guest with a known taste and purse, so a single sale tests a single rule.
const buyer=(s,client,extra={})=>{const c={id:'buyer-'+s.nextId++,client,budget:100000,served:false,want:'ring',...extra};s.customers=[c];return c;};
const NEW=['sun','arch','shell','lens'];

test('rank thresholds',()=>{
 const at=rep=>J.rankOf({rep});for(const [rep,rank]of[[0,0],[19,0],[20,1],[99,1],[100,2],[239,2],[240,3],[449,3],[450,4],[749,4],[750,5],[5000,5]])assert.equal(at(rep),rank,String(rep));
 assert.equal(J.rankOf({}),0);assert.equal(J.rankOf({rep:-5}),0);assert.deepEqual(J.RANKS.map(r=>r.budget),[0,40,120,250,450,700]);
});
test('each source of reputation on its own, and nothing for saturated or discounted sales',()=>{
 const s=rich(P.newGame(1)),d=piece(),fit=J.affinity(J.freezeDesign(J.clone(d)),J.CLIENTS.find(p=>p.id==='ada'),'ring');assert.ok(fit<70,'ada does not love this piece');
 let item=make(s,d),c=buyer(s,'ada'),r=s.rep;const first=P.sell(s,item.id,c.id,'fair');assert.ok(first.full&&first.freshFamily);assert.equal(s.rep-r,1+2+2,'full sale, design new to the port, first full sale to ada');assert.equal(first.rep,5);
 item=make(s,d);c=buyer(s,'ada');r=s.rep;P.sell(s,item.id,c.id,'fair');assert.equal(s.rep-r,1,'a plain full sale');
 item=make(s,d);c=buyer(s,'ada');r=s.rep;const low=P.sell(s,item.id,c.id,'low');assert.equal(low.full,false);assert.equal(s.rep-r,0,'a discount earns nothing');
 for(let i=0;i<3;i++){item=make(s,d);c=buyer(s,'ada');P.sell(s,item.id,c.id,'fair');}assert.ok(J.demandInfo(s,d).factor<1,'the design is saturated');
 item=make(s,d);c=buyer(s,'ada');r=s.rep;assert.equal(P.sell(s,item.id,c.id,'fair').demand.factor,.25);assert.equal(s.rep-r,0,'a saturated sale earns nothing');
 // A fit of 70 adds one: Ада loves a rich golden brooch.
 const rich2=rich(P.newGame(2)),b=J.makeDesign('brooch','oval','gold');rich2.skills.push('gold');b.gems=layoutGems(b,'halo',{kind:'garnet',size:3});b.strokes=patternStrokes(b,'filigree');
 const ada=buyer(rich2,'ada',{want:'brooch'}),gold=make(rich2,b);assert.ok(J.affinity(gold.design,J.CLIENTS.find(p=>p.id==='ada'),'brooch')>=70);r=rich2.rep;P.sell(rich2,gold.id,ada.id,'fair');assert.equal(rich2.rep-r,1+1+2+2);
 // An order: four.
 const o=rich(P.newGame(3)),req={id:'request-'+o.nextId++,client:'nora',type:'pendant',style:'symmetry',min:0,minMagic:0,title:'Подвеска',until:o.day+3,done:false};o.requests=[req];const done=make(o,d);r=o.rep;assert.equal(P.deliver(o,req.id,done.id).rep,4);assert.equal(o.rep-r,4);
});
test('the connoisseur of the day: from the first rank, one guest a day, a fuller purse, only new designs, a fifth more',()=>{
 const base=P.newGame(4);assert.ok(base.customers.every(c=>c.novel===undefined),'no connoisseur before the first rank');
 const a=P.newGame(5),b=P.newGame(5);b.rep=20;a.customers=[];b.customers=[];const seedA=a.seed;J.makeCustomers(a);J.makeCustomers(b);assert.equal(a.seed,b.seed,'no extra draw');assert.equal(seedA!==a.seed,true);
 const i=b.day%4;b.customers.forEach((c,k)=>{assert.equal(c.client,a.customers[k].client);assert.equal(c.novel,k===i?true:undefined);assert.equal(c.budget,k===i?Math.round((a.customers[k].budget+40)*1.6):a.customers[k].budget+40);});
 const s=rich(P.newGame(6));s.rep=20;const d=piece('drop'),item=make(s,d),novel=buyer(s,'mira',{novel:true}),plain={...novel,novel:undefined,id:'buyer-x'};
 const fresh=J.quote(s,item,novel,'fair'),usual=J.quote(s,item,plain,'fair');assert.ok(Math.abs(fresh.fair-usual.fair*1.2)<=1,`${fresh.fair} vs ${usual.fair}`);
 assert.ok(J.BOOST_CAP===1.4&&fresh.fair<=usual.fair*J.BOOST_CAP+1);
 const r=s.rep,sold=P.sell(s,item.id,novel.id,'fair');assert.ok(sold.novel&&sold.full);assert.equal(s.rep-r,1+2+2+2+(sold.fit>=70?1:0),'the connoisseur adds two');
 const copy=make(s,d),again=buyer(s,'elin',{novel:true}),no=J.quote(s,copy,again,'fair');assert.equal(no.accepted,false);assert.equal(no.offer,0);assert.match(no.reason,/уже видели/);
 assert.equal(J.quote(s,copy,again,'counter').accepted,false);assert.throws(()=>P.sell(s,copy.id,again.id,'counter'),/уже видели/);
 const saved=P.load(J.serialize(s));assert.equal(saved.customers[0].novel,true,'a save with the connoisseur loads');
 const raw=JSON.parse(J.serialize(s));raw.customers[0].novel='yes';assert.equal('novel'in P.load(JSON.stringify(raw)).customers[0],false,'a broken flag is dropped');
});
test('buyer purses keep growing with the work and add the bonus of the rank',()=>{
 const purse=(crafted,rep)=>{const s=J.newGame(7);s.crafted=crafted;s.rep=rep;s.customers=[];J.makeCustomers(s);return s.customers.map(c=>c.novel?Math.round(c.budget/1.6):c.budget);};
 const zero=purse(0,0);assert.deepEqual(purse(60,0),zero.map(b=>b+480),'no cap on the growth from crafted pieces');
 for(const [rep,bonus]of[[20,40],[100,120],[240,250],[450,450],[750,700]])purse(60,rep).forEach((b,k)=>assert.ok(Math.abs(b-(zero[k]+480+bonus))<=1,`rank bonus at ${rep}`));
});
test('the blanks of the second rank: closed before it, open after it, valid and new to the port',()=>{
 const s=rich(P.newGame(8));for(const id of NEW){assert.equal(J.templateOpen(s,id),false);assert.throws(()=>J.startDesign(s,'pendant',id,'silver'),/Мастер цеха/);}
 assert.ok(J.templateOpen(s,'oval')&&J.templateOpen(s,'free'));s.rep=100;for(const id of NEW){assert.ok(J.templateOpen(s,id));assert.doesNotThrow(()=>J.startDesign(s,'brooch',id,'silver'));}
 for(const type of['pendant','brooch','amulet'])for(const id of NEW){assert.ok(J.templatesFor(type).includes(id));const d=J.makeDesign(type,id,'silver');d.polish=[0];assert.doesNotThrow(()=>J.validateDesign(d,true),`${type}/${id}`);assert.equal(J.evaluate(d).style.symmetry,100,`${type}/${id} symmetry`);}
 for(const type of['ring','sword','staff'])assert.ok(!NEW.some(id=>J.templatesFor(type).includes(id)));
});
test('every blank of the second rank differs from every other blank of the same kind by more than 0.15 of the demand print',()=>{
 for(const type of['pendant','brooch','amulet'])for(const id of NEW){const fp=J.fingerprint(J.makeDesign(type,id,'silver'));
  for(const other of J.templatesFor(type)){if(other===id||other==='free')continue;const sim=J.similarity(fp,J.fingerprint(J.makeDesign(type,other,'silver')));assert.ok(sim<.85,`${type}: ${id} and ${other} are ${sim.toFixed(3)} alike`);}}
});
test('the model library holds 40 works, 60 from the second rank',()=>{
 const s=rich(P.newGame(9));assert.equal(J.libraryLimit(s),40);const d=piece();make(s,d);for(let i=0;i<45;i++)J.rememberItem(s,s.stock[0].id);assert.equal(s.library.length,40);
 s.rep=100;assert.equal(J.libraryLimit(s),60);for(let i=0;i<25;i++)J.rememberItem(s,s.stock[0].id);assert.equal(s.library.length,60);assert.doesNotThrow(()=>J.deserialize(J.serialize(s)));
});
test('personal orders: three, four from «Старшина цеха», never more than eight',()=>{
 for(let seed=1;seed<=30;seed++){const s=P.newGame(seed);assert.equal(s.requests.length,3);s.rep=240;s.requests=[];J.makeRequests(s);assert.equal(s.requests.length,4,'seed '+seed);
  s.requests.push(...Array.from({length:4},(_,i)=>({...s.requests[0],id:'request-'+(900+i),keep:true})));J.makeRequests(s);assert.ok(s.requests.length<=8);
  for(let d=0;d<10;d++){P.nextDay(s);assert.ok(s.requests.length<=8&&s.requests.filter(r=>!r.keep).length<=4);}}
});
test('a version 3 workshop is credited with its work up to «Мастер цеха» and told so once',()=>{
 const s=rich(J.newGame(10));s.crafted=300;s.sold=280;const old=JSON.parse(J.serialize(s));delete old.rep;
 const back=P.load(JSON.stringify(old));assert.equal(back.rep,239);assert.equal(J.rankOf(back),2);assert.equal(back.rankSeen,2);assert.equal(back.upgraded,true);
 const small=JSON.parse(J.serialize(rich(J.newGame(11))));small.crafted=3;small.sold=2;const b2=P.load(JSON.stringify(small));assert.equal(b2.rep,Math.min(239,2*3+2+Object.keys(b2.book.e).length));
 const fresh=P.newGame(12);assert.equal(fresh.rep,0);assert.equal(fresh.rankSeen,0);assert.equal('upgraded'in fresh,false,'a new game has nothing to announce');
 const seen=P.load(J.serialize({...back,upgraded:undefined}));assert.equal('upgraded'in seen,false);
 const raw=JSON.parse(J.serialize(back));raw.rep=-4;raw.rankSeen=9;const fixed=P.load(JSON.stringify(raw));assert.equal(fixed.rep,239);assert.equal(fixed.rankSeen,2);
});
test('the ✦ marks of the gallery are asked only for the connoisseur and cost nothing the second time',()=>{
 const s=rich(P.newGame(13));s.rep=20;s.customers=[];J.makeCustomers(s);for(const t of['drop','star','crescent','oval'])make(s,piece(t));
 const plain=s.customers.find(c=>!c.novel),novel=s.customers.find(c=>c.novel);assert.equal(freshMarks(s,plain),null);
 const first=freshMarks(s,novel);assert.equal(first.size,4);const n=J.tally.similarity;assert.deepEqual(freshMarks(s,novel),first);assert.equal(J.tally.similarity,n);
 const c=s.customers.find(c=>!c.served&&!c.novel);c.budget=100000;P.sell(s,s.stock[0].id,c.id,'fair');assert.equal(freshMarks(s,novel).size,3,'a design sold at the full price is no longer new');
});
test('the velvet tone keys every picture drawn on velvet and leaves bare pictures alone',async()=>{
 let n=0;const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:k.startsWith('create')?()=>({addColorStop(){}}):()=>{},set:(t,k,v)=>{t[k]=v;return true;}});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx,toDataURL:()=>'data:'+n++})};
 try{const A=await import('../src/jewel-art.js'),d=J.freezeDesign(piece());
  const teal=A.jewelURL(d,64),bare=A.jewelURL(d,64,{background:false});assert.equal(A.jewelURL(d,64),teal,'cached');
  const v=P.VELVETS.find(v=>v.id==='cobalt');A.setVelvet(v);assert.equal(A.velvetTone().id,'cobalt');const cobalt=A.jewelURL(d,64);assert.notEqual(cobalt,teal);assert.equal(A.jewelURL(d,64,{background:false}),bare);
  const stops=[];const g={createRadialGradient:()=>({addColorStop:(o,c)=>stops.push(c)}),createPattern:()=>null,fillRect(){}};A.drawVelvet(g,10,10,{light:0});assert.deepEqual(stops.slice(0,3),[v.hi,v.mid,v.lo]);
  A.setVelvet(P.VELVETS[0]);assert.equal(A.jewelURL(d,64),teal,'the teal picture is still cached');
  const draft=piece();A.jewelURL(draft,32);A.setVelvet(v);assert.notEqual(A.jewelURL(draft,32),A.jewelURL(draft,32,{background:false}));A.setVelvet(P.VELVETS[0]);
 }finally{delete globalThis.document;}
});
