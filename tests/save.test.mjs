import test from 'node:test';
import assert from 'node:assert/strict';
import {P,L,R,B,roll,game,snap,place,clear,know,ctx,join} from './bestiary-helpers.mjs';
const raw=s=>JSON.parse(snap(s));
const load=o=>P.load(JSON.stringify(o));
const refuse=(o,re)=>assert.throws(()=>P.load(typeof o==='string'?o:JSON.stringify(o)),e=>e instanceof P.BestiaryError&&re.test(e.message));
// A played state with a bit of everything in it.
function played(seed=81,days=12){const s=game(seed);for(let d=0;d<days;d++){for(const r of s.reports)if(r.offer&&!r.choice)P.claim(s,r.id,'know');
 for(const v of s.visitors)if(!v.heard)P.listen(s,v.id);
 for(const c of[...s.contracts]){if(c.kind==='story'||!s.contracts.includes(c))continue;const cards=P.cards(s,c.id).filter(x=>x.usable&&x.st!=='rumour'),pick=[];for(const x of cards)if(!pick.some(p=>p.cat===x.cat))pick.push(x);if(pick.length===3)P.advise(s,c.id,pick.map(x=>x.id));}
 P.endDay(s);}return s;}

test('a new save key and a strict reading that refuses only what would make the game meaningless (GDD 12.1, 12.3)',()=>{
 assert.equal(P.SAVE_KEY,'pix-bestiary-save-v1');assert.notEqual(P.SAVE_KEY,'pix-forge-save-v1','the save of «Сияние» is never touched');
 const s=game(80),o=raw(s);assert.equal(snap(load(o)),snap(s),'a fresh save reads back unchanged');
 refuse('x'.repeat(4e6+1),/слишком большой/);refuse('{oops',/повреждён/);refuse('[]',/повреждён/);refuse('null',/повреждён/);
 refuse({...o,world:'jewel'},/прежней игры «Сияние»/);refuse({resources:{},technologies:[]},/прежней игры «Сияние»/);refuse({...o,world:'other'},/не сохранение бестиария/);
 refuse({...o,version:2},/версия/);refuse({...o,worldSeed:-1},/зерно/);refuse({...o,worldSeed:2**32},/зерно/);refuse({...o,day:0},/календарь/);refuse({...o,day:100001},/календарь/);
 refuse({...o,gold:-5},/прогресс/);refuse({...o,rep:1.5},/прогресс/);refuse({...o,nextId:'7'},/прогресс/);refuse({...o,know:[]},/записи/);refuse({...o,monsters:null},/записи/);
 assert.equal(P.LEGACY_TEXT,'Это сохранение прежней игры «Сияние». Его можно скачать в меню; в бестиарий оно не переносится.');
});
test('a played save survives load(serialize) unchanged, and normalize is idempotent',()=>{
 const s=played(81,14),a=snap(s),b=snap(P.load(a));assert.equal(b,a);const c=P.normalize(JSON.parse(a));assert.equal(JSON.stringify(P.normalize(c)),JSON.stringify(c));assert.equal(JSON.stringify(c),a);
});
test('normalize, knowledge: unknown facts dropped, impossible states fall back to rumours, rev only for conditions (GDD 12.3.1)',()=>{
 const o=raw(game(82)),k=(st,rev=0,x={})=>({st,rev,src:'hunt',d:1,v:5,ok:0,none:0,worse:0,last:null,...x});
 Object.assign(o.know,{'werewolf.nope':k('confirmed'),'werewolf.garlic':k('confirmed'),'werewolf.dawn':k('refuted'),'werewolf.torch':k('weird'),'werewolf.name':k('refuted',1),
  'werewolf.moonrise':k('confirmed',1),'zlyden.offering':k('dangerous'),'kikimora.frost':k('dangerous'),'kikimora.yarn':k('dangerous'),'upyr.heart':k('rumour',1),'werewolf.clothes':k('confirmed',0,{ok:5000,none:-3,worse:2.5,src:'nowhere',last:{v:'grown',w:'hail',k:0}})});
 const s=load(o);assert.equal(s.know['werewolf.nope'],undefined);
 assert.equal(s.know['werewolf.garlic'].st,'rumour','a myth cannot be confirmed: a change of truth in the content leaves no false seal');assert.equal(s.know['werewolf.dawn'].st,'rumour');assert.equal(s.know['werewolf.torch'].st,'rumour');
 assert.deepEqual([s.know['werewolf.name'].st,s.know['werewolf.name'].rev],['confirmed',1],'a revealed condition is confirmed');assert.equal(s.know['werewolf.moonrise'].rev,0,'rev only for conditions');
 assert.equal(s.know['zlyden.offering'].st,'dangerous','a condition that harms otherwise may be dangerous');assert.equal(s.know['kikimora.frost'].st,'dangerous');assert.equal(s.know['kikimora.yarn'].st,'rumour','a condition that is empty otherwise is never dangerous');
 assert.deepEqual([s.know['upyr.heart'].st,s.know['upyr.heart'].rev],['rumour',0],'a rumour is never revealed');
 const c=s.know['werewolf.clothes'];assert.deepEqual([c.ok,c.none,c.worse,c.src,c.last],[0,0,0,'start',null]);assert.ok(s.kv>=5,'kv ≥ every v');
 // The start records of open pages are written back where they are missing, nothing else is overwritten.
 delete o.know['werewolf.silver'];o.know['werewolf.aconite']=k('confirmed',0,{ok:3});const t=load(o);assert.equal(t.know['werewolf.silver'].st,'confirmed');assert.equal(t.know['werewolf.aconite'].ok,3);
});
test('normalize, pages: what is open is never lost; trophies, studies, sales and treatises within their bounds',()=>{
 const s=game(83);P.applyStory(s,L.STORY.get('S3'));s.day=12;const o=raw(s);delete o.monsters.leshy;o.monsters.nope={u:1};
 Object.assign(o.monsters.werewolf,{troph:['grown','grown','huge'],studied:['young','grown'],sold:['werewolf.silver:confirmed:0','werewolf.silver:rumour:0','upyr.aspen:confirmed:0','troph:grown','troph:ancient',5],treatise:99,u:0});
 o.monsters.koldun={u:1,troph:[],studied:[],sold:[],treatise:5};
 const t=load(o);assert.ok(t.monsters.leshy,'a page opened by the story comes back');assert.equal(t.monsters.leshy.u,t.story.days.S3,'opened on the day of its event');assert.equal(t.monsters.nope,undefined);
 const w=t.monsters.werewolf;assert.deepEqual(w.troph,['grown']);assert.deepEqual(w.studied,['grown']);assert.deepEqual(w.sold,['werewolf.silver:confirmed:0','troph:grown']);assert.equal(w.treatise,0);assert.equal(w.u,1);
 assert.equal(t.monsters.koldun.treatise,0,'the treatise of the sorcerer only after S12');
});
test('normalize, hunters: only those who came by their «joins», numbers within bounds, gear once (GDD 12.3.3)',()=>{
 const o=raw(game(84));o.hunters.marta={trust:3};o.hunters.ghost={trust:3};Object.assign(o.hunters.gordey,{trust:9,out:7,sulk:-1,rag:5,gear:['blade','blade','sword'],skill:4,xp:-3,wins:9,hunts:3,fails:8});o.hunters.agata={trust:0,sulk:0};
 const s=load(o);assert.deepEqual(Object.keys(s.hunters),['gordey','agata']);const g=s.hunters.gordey;
 assert.deepEqual([g.trust,g.out,g.sulk,g.rag,g.skill,g.xp,g.wins,g.fails],[L.HUNTER.get('gordey').trust,0,0,0,0,0,3,0],'out of bounds: the default of the content');assert.deepEqual(g.gear,['blade']);assert.equal(s.hunters.agata.trust,1,'trust 0 without a sulk becomes 1');
 o.day=4;o.hunters.marta={trust:2};delete o.hunters.agata;const t=load(o);assert.ok(t.hunters.marta&&t.hunters.agata,'a hunter whose day has come is in the guild');
});
test('normalize, cases, hunts and reports: broken references dropped; a hunt that breaks the sheet is cancelled (GDD 12.3.4)',()=>{
 const s=game(85);clear(s);const c=place(s,{monster:'werewolf'}),d=place(s,{hunter:'agata',monster:'kikimora'});assert.ok(P.advise(s,c.id,['werewolf.silver','werewolf.aconite','werewolf.crossroads']).ok);
 const o=raw(s);o.hunts.push({...o.hunts[0],contract:{...o.hunts[0].contract,id:'c-77'}});// a second hunt of Гордей
 o.hunts.push({contract:{...d,id:'c-78'},advice:['kikimora.henstone','kikimora.horseshoe','kikimora.silence'],potions:[],ctx:{variant:'grown',weather:'clear',season:0},shown:{low:0,mid:0,high:0},day:1});// two wards
 o.hunts.push({contract:{...d,id:'c-79',hunter:'agata'},advice:['kikimora.henstone','kikimora.salt','kikimora.silence'],potions:['courage','courage'],ctx:{variant:'grown',weather:'clear',season:0},shown:{},day:1});
 o.visitors.push({id:'v-95',kind:'hunter',who:'gordey',contract:c.id,rumour:null,heard:true});o.contracts.push({...d,id:'c-80',monster:'leshy'},{...d,id:'c-81',place:'nowhere'},{...d,id:'c-82',variant:'huge'},{...d,id:'bad'});o.visitors.push({id:'v-90',kind:'hunter',who:'ghost',contract:null,rumour:null,heard:false},{id:'v-91',kind:'vedana',who:'vedana',contract:'c-404',rumour:'nope.x',heard:true});
 const t=load(o);assert.deepEqual(t.hunts.map(h=>h.contract.id),[c.id]);assert.deepEqual(t.contracts.map(x=>x.id),[d.id]);
 const v=t.visitors.find(v=>v.id==='v-91');assert.deepEqual([v.contract,v.rumour],[null,null]);assert.ok(!t.visitors.some(v=>v.id==='v-90'));
 assert.ok(t.visitors.some(v=>v.contract===c.id),'the guest of a case on its way keeps it');
 // Reports: a report about a fact of another monster is dropped, a broken offer becomes none.
 P.endDay(s);const q=raw(s);const r=q.reports[0];q.reports.push({...r,id:'r-500',items:[{...r.items[0],f:'upyr.aspen'},r.items[1],r.items[2]]});if(r.offer)r.offer.loot=[{id:'upyr_shroud',n:1}];
 const u=load(q);assert.ok(!u.reports.some(x=>x.id==='r-500'));if(r.offer)assert.equal(u.reports[0].offer,null);
 assert.ok(u.nextId>Math.max(...[...u.contracts,...u.visitors,...u.reports].map(x=>+x.id.split('-')[1])));
});
test('normalize, stock, daily and counters: keys from the content, limits kept, candles within the day (GDD 12.3.5–6)',()=>{
 const o=raw(game(86));Object.assign(o,{stock:{salt:5,gold_bar:3,werewolf_fur:1000},potions:{courage:12,elixir:1,aconite_oil:2},notes:{werewolf:100,nobody:3},rankSeen:4,nextId:1,kv:0});
 o.daily={candles:6,extra:'yes',talks:-1,firsts:['tip:first_rumour','evil','arc:gordey.2']};o.books=['vilna_werewolves','nope'];o.upgrades=['still','gold'];o.decor=['lamp','lamp','rug'];o.editions=['werewolf'];o.recipes=['nope'];
 const s=load(o);assert.deepEqual(s.stock,{salt:5});assert.deepEqual(s.potions,{aconite_oil:2});assert.deepEqual(s.notes,{});assert.equal(s.rankSeen,0);
 assert.equal(s.daily.candles,R.candleMax(s));assert.equal(s.daily.extra,false);assert.equal(s.daily.talks,0);assert.deepEqual(s.daily.firsts,['tip:first_rumour','arc:gordey.2']);
 assert.deepEqual(s.books,['daro_notes','vilna_werewolves'],'the notebook of Даро is always in the library');assert.deepEqual(s.upgrades,['still']);assert.deepEqual(s.decor,['lamp']);assert.deepEqual(s.editions,[],'a second edition only of a written treatise');
 assert.deepEqual(s.recipes.sort(),['aconite_oil','thistle_brew','thursday_salt'],'recipes come back from the books');assert.ok(s.nextId>1);
});
test('normalize, story: only known events closed by «after»; the winter holds exactly between S5 and S12; personal cases by their arcs',()=>{
 const o=raw(game(87));o.day=30;o.story={seen:['S0','S1','S5','S12','nope'],days:{S1:99},hold:false,thaw:9,koldun:3};
 let s=load(o);assert.deepEqual(s.story.seen,['S0','S1'],'S5 without S4 and S12 without S10 are dropped');assert.equal(s.story.hold,false);assert.equal(s.story.days.S1,30);assert.equal(s.story.koldun,0);
 o.story={seen:['S0','S1','S2','S3','S4','S5'],days:{},hold:false};s=load(o);assert.equal(s.story.hold,true,'the winter holds after S5');assert.ok(s.monsters.basilisk&&s.monsters.koldun,'pages of the events are open');
 o.story.seen.push('S6','S7','S8','S9','S10','S12');o.story.thaw=2;s=load(o);assert.equal(s.story.hold,false);assert.equal(s.story.thaw,2);assert.ok(s.story.koldun>0);
 // Personal cases: only by a fired step of an arc.
 const p=raw(game(88));p.personal={gordey:{monster:'upyr',variant:'young',state:'open'},agata:{state:'won'}};p.arcs=['gordey.1','agata.1','agata.3','nope','marta.3b'];
 const t=load(p);assert.deepEqual(Object.keys(t.personal),['agata']);assert.deepEqual([t.personal.agata.monster,t.personal.agata.variant,t.personal.agata.state],['poludnitsa','grown','won']);assert.ok(!t.arcs.includes('marta.3b'),'repeat steps are never stored');
});
test('normalize, chronicle, tutorial and settings; a state that lacks a field is repaired before any action (GDD 12.3.8–9)',()=>{
 const o=raw(game(89));o.chronicle=[{d:1,t:'x'.repeat(300),k:'hunt'},{d:2,k:'x'},{d:'a',t:'ok',k:'BAD'}];o.tutorial={done:['greet','nope'],skipped:'yes'};o.hintsSeen=['first_rumour','evil'];o.prefs={large:1,calm:true};o.volume=7;o.keeper='nobody';o.sound='on';
 const s=load(o);assert.equal(s.chronicle.length,2);assert.equal(s.chronicle[0].t.length,200);assert.equal(s.chronicle[1].k,'note');assert.deepEqual(s.tutorial.done,['greet']);assert.equal(s.tutorial.skipped,false);
 assert.deepEqual(s.hintsSeen,['first_rumour']);assert.deepEqual(s.prefs,{large:false,calm:true});assert.equal(s.volume,1);assert.equal(s.keeper,'keeper_a');assert.equal(s.sound,false);
 const t=game(90);delete t.daily;delete t.stats;delete t.visitors;const r=P.listen(t,'v-1');assert.equal(r.ok,false);assert.ok(t.daily&&t.stats&&Array.isArray(t.visitors),'ready() normalized the state first');
});
