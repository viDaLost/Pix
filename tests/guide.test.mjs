import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {layoutGems,patternStrokes} from '../src/patterns.js';
import {addPolish} from '../src/jewel-art.js';
import {orderPieces} from '../src/market.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const pt=(x,y)=>({x,y});
const rich=s=>{s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;};
const step=s=>P.tutorialStep(s);
// One change of the draft as the editor makes it, then the check the interface runs after every change.
const change=(s,fn)=>{const d=J.clone(s.draft.design);fn(d);J.edit(s,d);return P.tutor(s);};
const make=(s,d)=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s).item;};
const buyer=(s,client,extra={})=>{const c={id:'buyer-'+s.nextId++,client,budget:100000,served:false,want:'pendant',...extra};s.customers=[c];return c;};
function piece(template='oval',metal='silver'){const d=J.makeDesign('pendant',template,metal);d.gems=layoutGems(d,'solo',{kind:'amethyst',size:3});return d;}
const v3=s=>{for(const k of['tutorial','hintsSeen','backup'])delete s[k];return s;};

test('the nine lessons lead from the first blank to the first morning, and Даро gives his gift once',()=>{
 const s=P.newGame(41);assert.equal(step(s),0);assert.equal(P.tutor(s),null,'nothing done yet');
 J.startDesign(s,'pendant','drop','silver');assert.deepEqual(P.tutor(s).done,['start']);assert.equal(step(s),1);
 change(s,d=>d.strokes.push(...patternStrokes(d,'beads',{})));assert.equal(step(s),2);
 change(s,d=>d.gems.push(...layoutGems(d,'solo',{kind:'garnet',size:3})));assert.equal(step(s),3);
 change(s,d=>d.strokes.push(...patternStrokes(d,'runes',{})));assert.equal(step(s),4);
 change(s,d=>addPolish(d,[pt(50,50)],40));assert.equal(step(s),5);
 const item=P.complete(s).item;P.tutor(s);assert.equal(step(s),6);
 const c=buyer(s,'nora');P.sell(s,item.id,c.id,'fair');P.tutor(s);assert.equal(step(s),7);
 P.gather(s,'shore');P.tutor(s);assert.equal(step(s),8);
 const sapphire=s.materials.sapphire,silver=s.materials.silver,rep=s.rep;P.nextDay(s);const r=P.tutor(s);
 assert.ok(r.finished&&r.gift);assert.equal(step(s),-1);assert.deepEqual(s.tutorial.done,P.TUTORIAL.map(t=>t.id));
 assert.equal(s.materials.sapphire,sapphire+1);assert.equal(s.materials.silver,silver+4);assert.ok(s.rep>=rep+5);assert.ok(r.letters.includes('daro-0'));assert.equal(s.mail.filter(m=>m.id==='daro-0').length,1);
 assert.ok(s.log.some(e=>e.k==='guide'&&e.d===s.day),'the chronicle remembers the lessons');assert.equal(P.tutor(s),null,'the lessons are over');
 // «Обучение заново» asks for new work and ends without a second gift.
 P.restartTutorial(s);rich(s);assert.equal(step(s),0);assert.equal(P.tutor(s),null,'old work does not count again');
 J.startDesign(s,'pendant','oval','silver');P.tutor(s);make(s,piece('heart'));P.tutor(s);assert.equal(step(s),6,'a finished piece passes the editor steps');
 P.sell(s,s.stock[0].id,buyer(s,'mira').id,'fair');P.gather(s,'shore');P.nextDay(s);const again=P.tutor(s);
 assert.ok(again.finished);assert.equal(again.gift,null);assert.equal(s.mail.filter(m=>m.id==='daro-0').length,1);
});
test('editor steps are passed by a later step of the piece; the five steps of the gift are never skipped',()=>{
 const s=P.newGame(7);J.startDesign(s,'pendant','drop','silver');P.tutor(s);
 change(s,d=>d.gems.push(...layoutGems(d,'solo',{kind:'garnet',size:3})));assert.equal(P.TUTORIAL[step(s)].id,'rune','a stone before a pattern skips the pattern');
 assert.equal(P.stepState(s,1),'skip');assert.equal(P.stepState(s,2),'done');assert.equal(P.stepState(s,3),'now');
 // The gathering comes before the sale: the sale is still asked for, and the editor steps left are passed by «Готово».
 P.gather(s,'shore');P.tutor(s);assert.equal(P.TUTORIAL[step(s)].id,'rune');
 const item=P.complete(s).item;P.tutor(s);assert.equal(P.TUTORIAL[step(s)].id,'sell');assert.deepEqual([3,4].map(i=>P.stepState(s,i)),['skip','skip']);assert.equal(P.stepState(s,7),'done');
 P.sell(s,item.id,buyer(s,'nora').id,'fair');P.tutor(s);assert.equal(P.TUTORIAL[step(s)].id,'day');
 P.nextDay(s);const r=P.tutor(s);assert.ok(r.finished&&r.gift,'the gift does not need the skipped steps');
 // Without a draft the editor steps cannot be done, and the lessons move on once the piece is finished another time.
 const t=P.newGame(8);t.day=1;J.startDesign(t,'pendant','oval','copper');P.tutor(t);t.draft=null;assert.equal(P.TUTORIAL[step(t)].id,'pattern');
});
test('a workshop that has already worked starts without lessons or the gift; skipping and restarting are kept',()=>{
 const s=rich(P.newGame(3));for(let i=0;i<3;i++)make(s,piece(['oval','heart','leaf'][i]));const old=P.normalize(v3(J.clone(s)));
 assert.deepEqual(old.tutorial,{done:[],skipped:false,finished:true,rewarded:true});assert.equal(step(old),-1);assert.equal(P.tutor(old),null);
 const fresh=P.normalize(v3(P.newGame(4)));assert.equal(fresh.tutorial.finished,false);assert.equal(step(fresh),0);
 const later=P.normalize(v3(Object.assign(P.newGame(5),{day:2})));assert.ok(later.tutorial.finished,'a day already ended counts as work');
 P.skipTutorial(fresh);assert.equal(step(fresh),-1);assert.ok(P.normalize(J.deserialize(J.serialize(fresh))).tutorial.skipped);
 P.restartTutorial(old);assert.equal(step(old),0);const back=P.normalize(J.deserialize(J.serialize(old)));assert.deepEqual(back.tutorial,old.tutorial,'a restart survives a reload');
 assert.deepEqual(back.tutorial.from,{crafted:3,sold:0,gathers:0,day:1});
});
test('every lesson is short, and normalize repairs the lessons, the hints and the day of the copy',()=>{
 for(const t of P.TUTORIAL)assert.ok(t.text.length<=42,t.text);assert.equal(P.TUTORIAL.length,9);
 const junk=[null,'x',7,-1,[],{},[null,'start','start','nope'],{done:'start',skipped:'yes',finished:1,rewarded:null,from:{crafted:-1}},{done:['finish','start'],skipped:true,finished:false,rewarded:true,from:{crafted:99,sold:0,gathers:0,day:50}},['counter','counter','ghost',5,'install'],1.5,1e12];
 const base=P.newGame(9);base.crafted=2;base.day=5;
 for(const a of junk)for(const b of junk)for(const c of junk){const s=J.clone(base);s.tutorial=a;s.hintsSeen=b;s.backup=c;assert.doesNotThrow(()=>P.normalize(s));
  const t=s.tutorial;assert.ok(Array.isArray(t.done)&&t.done.every(id=>P.TUTORIAL.some(x=>x.id===id))&&new Set(t.done).size===t.done.length);for(const k of['skipped','finished','rewarded'])assert.equal(typeof t[k],'boolean',k);
  if(t.from)assert.ok(t.from.crafted<=s.crafted&&t.from.day<=s.day&&t.from.day>=1,'lessons never count from ahead of the work');
  assert.ok(Array.isArray(s.hintsSeen)&&s.hintsSeen.every(id=>P.HINT_IDS.includes(id))&&new Set(s.hintsSeen).size===s.hintsSeen.length&&s.hintsSeen.length<=64);
  assert.ok(Number.isInteger(s.backup)&&s.backup>=1&&s.backup<=s.day);assert.deepEqual(P.normalize(J.clone(s)),s,'repair is idempotent');}
 const keep=J.clone(base);keep.tutorial={done:['start'],skipped:false,finished:false,rewarded:true};P.normalize(keep);assert.equal(keep.tutorial.rewarded,true,'a gift given stays given');
});
test('hints come one at a time and once; a hint with a dot waits for its place; later hints wait for the lessons',()=>{
 const s=P.newGame(11);P.skipTutorial(s);assert.equal(P.nextHint(s),null);
 assert.equal(P.nextHint(s,{counter:true}).id,'counter');assert.ok(P.seeHint(s,'counter'));assert.equal(P.seeHint(s,'counter'),false);assert.equal(P.nextHint(s,{counter:true}),null);
 assert.equal(P.seeHint(s,'ghost'),false);assert.ok(!s.hintsSeen.includes('ghost'));
 s.crafted=2;assert.equal(P.nextHint(s).id,'patterns-2');assert.ok(P.dotPending(s,'pattern'));assert.equal(P.nextHint(s,{shown:new Set(['patterns-2'])}),null,'shown once a visit');
 assert.ok(P.seeDots(s,'pattern'));assert.ok(!P.dotPending(s,'pattern'));assert.equal(P.nextHint(s),null);
 s.crafted=3;assert.equal(P.nextHint(s).id,'garden');assert.ok(P.dotPending(s,'map')&&!P.dotPending(s,'pattern'));P.seeDots(s,'map');
 s.crafted=8;assert.deepEqual(['patterns-5','ridge'].map(id=>P.nextHint(s,{shown:new Set(id==='ridge'?['patterns-5']:[])})?.id),['patterns-5','ridge']);P.seeDots(s,'map');P.seeDots(s,'pattern');
 // An empty purse with no metal for even a copper ring.
 for(const m of Object.keys(J.METALS))s.materials[m]=0;s.gold=3;assert.ok(P.broke(s));assert.equal(P.nextHint(s).id,'broke');P.seeHint(s,'broke');s.gold=500;assert.ok(!P.broke(s));
 const item=make(rich(s),piece('heart'));s.requests=[{id:'request-'+s.nextId++,client:'nora',type:'pendant',style:'organic',min:0,minMagic:0,title:'Капля',until:s.day+2,done:false}];assert.equal(P.nextHint(s).id,'order-ready');P.seeHint(s,'order-ready');
 s.customers[0].novel=true;assert.equal(P.nextHint(s).id,'connoisseur');P.seeHint(s,'connoisseur');
 assert.equal(P.nextHint(s).id,'contest');P.seeHint(s,'contest');assert.equal(P.nextHint(s).id,'book');P.seeHint(s,'book');assert.equal(P.nextHint(s),null);assert.ok(item);
 // While Даро teaches, the hints that would distract him wait.
 const t=rich(P.newGame(12));make(t,piece('heart'));assert.ok(P.coaching(t));assert.notEqual(P.nextHint(t)?.id,'book');assert.ok(!['book','contest'].includes(P.nextHint(t)?.id));P.skipTutorial(t);assert.ok(['order-ready','contest','book'].includes(P.nextHint(t).id));
 // An older workshop has already met what its work shows.
 const old=rich(P.newGame(13));for(let i=0;i<5;i++)make(old,piece(['oval','heart','leaf','circle','diamond'][i]));old.sold=2;const seen=P.normalize(v3(J.clone(old))).hintsSeen;
 assert.deepEqual(['counter','patterns-2','patterns-5','garden','order-ready','book'].filter(id=>!seen.includes(id)),[]);assert.ok(!seen.includes('ridge')&&!seen.includes('broke')&&!seen.includes('contest'));
});
test('the demand warning comes one sale before the fall and counts the discounts',()=>{
 assert.match(P.demandWarning({sales:3,soft:0,remaining:0}),/^Ещё одна полная продажа или две со скидкой — и спрос упадёт на 75% на 7 торговых дней$/);
 assert.match(P.demandWarning({sales:3,soft:1,remaining:0}),/даже со скидкой/);for(const d of[{sales:2,soft:1,remaining:0},{sales:4,soft:0,remaining:5},{sales:0,soft:0,remaining:0},null])assert.equal(P.demandWarning(d),null);
 const s=rich(P.newGame(15)),d=piece('heart');for(let i=0;i<3;i++){const item=make(s,d);P.sell(s,item.id,buyer(s,'nora').id,'fair');}const last=make(s,d);
 assert.equal(J.demandInfo(s,last.design).sales,3);assert.ok(P.demandWarning(J.demandInfo(s,last.design)));
 P.sell(s,last.id,buyer(s,'nora').id,'fair');const next=make(s,d);assert.ok(J.demandInfo(s,next.design).remaining>0);assert.equal(P.demandWarning(J.demandInfo(s,next.design)),null);
});
test('the advice of the day puts first what moves the workshop on, three at most',()=>{
 const s=rich(P.newGame(17));P.skipTutorial(s);J.startDesign(s,'pendant','oval','silver');
 assert.match(P.nextSteps(s,{view:'shop'})[0].text,/^Доделать «Кулон»$/);assert.ok(!P.nextSteps(s,{view:'studio'}).some(x=>x.p===100));s.draft=null;
 const item=make(s,piece('heart'));assert.equal(P.nextSteps(s)[0].p,80,'a guest and a piece');assert.ok(s.customers.some(c=>!c.served&&c.id===P.nextSteps(s)[0].buyer)&&P.nextSteps(s)[0].item===item.id);
 const r={id:'request-'+s.nextId++,client:'nora',type:'pendant',style:'organic',min:0,minMagic:0,title:'Капля',until:s.day+2,done:false};s.requests=[r];
 let list=P.nextSteps(s);assert.ok(list.findIndex(x=>x.p===90)<list.findIndex(x=>x.p===80),'a ready order before the guests');assert.match(list[0].text,/^Передать «Кулон» — Нора$/);
 s.requests=[{...r,id:'request-'+s.nextId++,type:'ring',until:s.day}];list=P.nextSteps(s);assert.equal(list[0].p,85,'an order of the last day before the guests');assert.match(list[0].text,/ждёт только сегодня/);
 s.mail=[{id:'mira-2',day:s.day,read:false}];assert.equal(P.nextSteps(s)[0].letter,'mira-2');
 for(const n of[0,1,2,3])assert.ok(P.nextSteps(s).length<=3);
 // All guests served: the day can end. An empty purse sends to the shore.
 const t=P.newGame(18);P.skipTutorial(t);for(const c of t.customers)c.served=true;assert.ok(P.nextSteps(t).some(x=>x.end));
 for(const m of Object.keys(J.METALS))t.materials[m]=0;t.gold=0;const poor=P.nextSteps(t).find(x=>x.p===40);assert.match(poor.text,/Берег/);assert.equal(poor.tab,'map');
 P.gather(t,'shore');assert.ok(P.nextSteps(t).find(x=>x.p===40).end,'the shore searched today: tomorrow');assert.ok(item);
});
test('the morning report: six book chips and three letters at most, every guest of the day with the best piece',()=>{
 const s=rich(P.newGame(19));make(s,piece('heart'));make(s,piece('leaf'));const firsts=[...Object.keys(s.book.e),'form:ring.oval','form:brooch.oval','stone:garnet.round'];assert.ok(firsts.length>6);
 s.mail=['mira-2','bren-2','ada-2','elin-2'].map(id=>({id,day:1,read:false}));const prev={made:2,sales:1,income:90,rep:7,firsts,gift:{by:'mira',id:'garnet',n:1},named:[],week:null,theme:null};
 s.day=2;const r=P.morningReport(s,prev);
 assert.deepEqual(r.yesterday,{day:1,made:2,sales:1,income:90,rep:7});assert.equal(r.book.length,6);assert.equal(r.more,firsts.length-6);assert.equal(r.letters.length,3);
 assert.equal(r.guests.length,s.customers.length);assert.ok(r.guests.every(g=>g.best&&g.best.fit>=0&&s.stock.includes(g.best.item)));assert.deepEqual(r.marks,['Первая работа'],'marks of yesterday');
 assert.equal(r.news.gift.by,'mira');assert.ok(r.advice);assert.equal(r.theme.id,P.themeOf(2).id);assert.equal(r.backup,false);
 // A connoisseur is shown only what the port has not seen yet.
 const novel=s.customers[0];novel.novel=true;const seen=P.morningReport(s,prev).guests[0];assert.ok(!seen.best||J.isFresh(s,seen.best.item.design));
 while(s.stock.length)P.sell(s,s.stock[0].id,buyer(s,'ada').id,'fair');const empty=P.morningReport(s,{});assert.equal(empty.guests.length,1);assert.ok(empty.guests.every(g=>g.best===null));
});
test('a copy of the workshop is suggested every fourteen game days and the chronicle keeps marks, chapters and ranks',()=>{
 const s=rich(P.newGame(23));assert.equal(s.backup,1);s.day=14;assert.equal(P.backupDue(s),false);s.day=15;assert.equal(P.backupDue(s),true);P.markBackup(s);assert.equal(P.backupDue(s),false);s.day=29;assert.equal(P.backupDue(s),true);
 const t=rich(P.newGame(24));make(t,piece('heart'));assert.ok(t.log.some(e=>e.k==='mark'&&e.t==='Клеймо «Первая работа»'&&e.d===1));
 t.rep=19;const r=P.complete(Object.assign(t,{draft:{design:piece('leaf'),undo:[],redo:[]}}));assert.ok(r.rankUp);assert.ok(t.log.some(e=>e.k==='rank'&&e.t==='Звание «Ювелир лавки»'));
});
// The advice of a long game (120 pieces, 500 ledger entries) asks the ledger for one piece a guest and one for the
// guild review, never for the whole showcase; the morning after it costs nothing more.
test('the advice of a long game stays within the comparison budget',()=>{
 const s=P.load(gunzipSync(readFileSync(new URL('./fixtures/v3-dense.json.gz',import.meta.url))).toString('utf8'));P.nextDay(s);P.skipTutorial(s);
 const count=fn=>{const a=J.tally.similarity;fn();return J.tally.similarity-a;},kind=Math.max(...J.TYPES.map(t=>s.demand.filter(f=>f.signature.type===t.id).length));
 count(()=>orderPieces(s));const steps=count(()=>P.nextSteps(s)),guests=s.customers.filter(c=>!c.served).length;
 assert.ok(steps<=(guests+2)*kind,`advice ${steps} > ${(guests+2)*kind}`);assert.equal(count(()=>{P.nextSteps(s);P.morningReport(s,{});}),0,'the morning reuses every comparison');
});

