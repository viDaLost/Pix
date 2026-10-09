import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {contestList,contestHint} from '../src/market.js';
import {layoutGems,patternStrokes} from '../src/patterns.js';
import {addPolish} from '../src/jewel-art.js';
const pt=(x,y)=>({x,y});
const rich=s=>{s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;};
const make=(s,d)=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s).item;};
const all=d=>Array.from({length:144},(_,i)=>pt((i%12+.5)*100/12,(Math.floor(i/12)+.5)*100/12)).filter(p=>J.onMetal(p,d));
// For «Смотр караула» (symmetry, ward, rings and amulets): a pendant without runes is bronze, a ring silver, a ring with
// awakened amethysts gold. Each is a design of its own.
function bronze(){const d=J.makeDesign('pendant','oval','silver');d.gems=layoutGems(d,'pair',{kind:'amethyst',size:3});return d;}
function silver(){const d=J.makeDesign('ring','oval','silver');d.gems=layoutGems(d,'pair',{kind:'amethyst',size:3});return d;}
function gold(){const d=J.makeDesign('ring','octagon','silver');d.gems=layoutGems(d,'pair',{kind:'amethyst',size:3});d.strokes=patternStrokes(d,'runes');addPolish(d,all(d),.1);return d;}
function plain(){const d=J.makeDesign('brooch','free','copper');d.outline=[pt(20,30),pt(70,22),pt(80,70),pt(35,80),pt(28,60)];d.strokes=[{kind:'engrave',width:1,points:[pt(40,40),pt(46,50),pt(60,45)]}];return d;}

test('a theme a week in a fixed order: days 1–7 the guard, 8–14 the sea, 57 the guard again',()=>{
 for(let d=1;d<=7;d++)assert.equal(P.themeOf(d).id,'guard');for(let d=8;d<=14;d++)assert.equal(P.themeOf(d).id,'sea');assert.equal(P.themeOf(57).id,'guard');assert.equal(P.themeOf(56).id,'moon');
 assert.deepEqual([1,4,7,8,14].map(P.daysLeft),[7,4,1,7,1]);assert.deepEqual(P.THEMES.map(t=>t.host).sort(),J.CLIENTS.map(p=>p.id).sort(),'each resident hosts one theme');
 assert.deepEqual(P.THEMES.map(t=>t.id),['guard','sea','harvest','ball','apothecary','lanterns','curiosities','moon']);
 // The first two weeks ask for the stones of a new workshop: amethyst for ward, sapphire for tide.
 const s=P.newGame(1);assert.ok(s.materials.amethyst>0&&s.materials.sapphire>0);assert.deepEqual(P.THEMES.slice(0,2).map(t=>t.element),['ward','tide']);
});
test('the judge is deterministic, its five parts add up to the score, and the medals start at 62, 75 and 87',()=>{
 const s=rich(P.newGame(2));for(const [make,medal]of[[gold,3],[silver,2],[bronze,1],[plain,0]]){const d=J.freezeDesign(make()),a=P.judge(s,d),b=P.judge(s,J.clone(d));
  assert.deepEqual(a,b);assert.equal(Object.values(a.parts).reduce((x,y)=>x+y,0),a.score);assert.equal(P.medalOf(a.score),medal,`${d.type}/${d.template}: ${a.score} ${JSON.stringify(a.parts)}`);
  for(const [key,,max]of P.PARTS)assert.ok(a.parts[key]>=0&&a.parts[key]<=max,key);}
 assert.deepEqual([61,62,74,75,86,87,100].map(P.medalOf),[0,1,1,2,2,3,3]);
 // The example of the plan: a fresh symmetric silver ring with two awakened amethysts and craft 90.
 const ring=J.makeDesign('ring','oval','silver');ring.gems=layoutGems(ring,'pair',{kind:'amethyst',size:3});ring.strokes=patternStrokes(ring,'runes');addPolish(ring,all(ring),.1);const r=P.judge(s,ring);
 assert.equal(J.evaluate(ring).craft,90);assert.ok(r.score>=90,String(r.score));assert.deepEqual(r.parts,{style:40,craft:18,element:14,fresh:15,type:10});
 // Freshness: 15 for a design the port has not seen sold, 8 while its demand holds, 0 when saturated.
 const sold=make(s,silver()),before=P.judge(s,sold.design).parts.fresh;const c={id:'buyer-'+s.nextId++,client:'bren',budget:100000,served:false,want:'ring'};s.customers=[c];P.sell(s,sold.id,c.id,'fair');
 const copy=make(s,silver());assert.deepEqual([before,P.judge(s,copy.design).parts.fresh],[15,8]);s.demand.find(f=>f.signature.type==='ring').until=s.tradeDay+5;assert.equal(P.judge(s,copy.design).parts.fresh,0);
});
test('three entries a week, each piece once; it stays on the showcase; only a better medal is rewarded',()=>{
 const s=rich(P.newGame(3)),a=make(s,bronze()),b=make(s,silver()),c=make(s,gold()),d=make(s,plain()),rep=s.rep,ame=s.materials.amethyst,bren=J.bondPoints(s,'bren');
 const r1=P.enterContest(s,a.id);assert.equal(r1.medal,1);assert.equal(r1.improved,true);assert.deepEqual(r1.gems,[{id:'amethyst',n:1}]);assert.ok(s.stock.includes(a),'the piece stays on the showcase');assert.deepEqual(a.ribbon,{w:0,medal:1});
 assert.throws(()=>P.enterContest(s,a.id),/уже была/);
 const r2=P.enterContest(s,b.id);assert.equal(r2.medal,2);assert.deepEqual(r2.gems,[{id:'amethyst',n:2}]);
 const r3=P.enterContest(s,c.id);assert.equal(r3.medal,3);assert.deepEqual(r3.gems,[{id:'amethyst',n:3}]);assert.ok(r3.marks.some(m=>m.id==='gold-ribbon'));
 // Bronze, silver, gold: 5 + 5 + 6 = 16 reputation (and three for the golden ribbon's mark), stones 1 + 2 + 3, friendship of the host 1 + 1 + 1.
 assert.equal(s.rep-rep,16+3);assert.equal(s.materials.amethyst-ame,6);assert.equal(J.bondPoints(s,'bren')-bren,3);assert.equal(s.guild.best,3);assert.deepEqual(s.guild.tried,[a.id,b.id,c.id]);
 const raw=J.serialize(s);assert.throws(()=>P.enterContest(s,d.id),/три работы/);assert.equal(J.serialize(s),raw,'a refused entry changes nothing');
 assert.throws(()=>P.enterContest(s,'jewel-999'),J.AtelierError);assert.equal(J.serialize(s),raw);
 // A worse result after a better one gives nothing but the attempt; a medal never lowers a ribbon.
 const t=rich(P.newGame(4)),g=make(t,gold()),br=make(t,bronze());P.enterContest(t,g.id);const before=[t.rep,t.materials.amethyst,J.bondPoints(t,'bren')],late=P.enterContest(t,br.id);
 assert.equal(late.improved,false);assert.deepEqual(late.gems,[]);assert.deepEqual([t.rep,t.materials.amethyst,J.bondPoints(t,'bren')],before);assert.deepEqual(br.ribbon,{w:0,medal:1},'its own medal still ribbons the piece');
 // From «Поставщик двора» the stones are doubled.
 const u=rich(P.newGame(5));u.rep=450;const top=make(u,gold()),am=u.materials.amethyst;P.enterContest(u,top.id);assert.equal(u.materials.amethyst-am,(1+2+3)*2);
 // Without a medal: no ribbon and no reward.
 const v=rich(P.newGame(6)),none=make(v,plain()),r0=P.enterContest(v,none.id);assert.equal(r0.medal,0);assert.equal('ribbon'in none,false);assert.equal(v.guild.best,0);assert.deepEqual(v.guild.tried,[none.id]);
});
test('the prize stone is the stone of the theme\'s element once it is open at the supplier, amethyst before',()=>{
 const s=P.newGame(7),theme=id=>P.THEMES.find(t=>t.id===id);assert.equal(P.prizeGem(s,theme('sea')),'sapphire');assert.equal(P.prizeGem(s,theme('ball')),'garnet');
 assert.equal(P.prizeGem(s,theme('curiosities')),'amethyst','diamond needs «Золотое дело»');assert.equal(P.prizeGem(s,theme('moon')),'amethyst','moonstone needs «Резонанс рун»');
 s.skills.push('gold','facets','alchemy');assert.equal(P.prizeGem(s,theme('curiosities')),'diamond');assert.equal(P.prizeGem(s,theme('lanterns')),'moonstone');
});
test('a ribbon adds 5% to the fair price for each step of its medal, within the common ceiling of 1.4',()=>{
 const s=rich(P.newGame(8)),item=make(s,silver()),guest={client:'mira',budget:100000,want:'ring'},base=J.quote(s,item,guest).fair;
 for(const m of[1,2,3]){item.ribbon={w:0,medal:m};assert.ok(Math.abs(J.quote(s,item,guest).fair-base*(1+.05*m))<=1,'medal '+m);}
 // The connoisseur (×1.2), a golden ribbon (×1.15) and Даро's friendship (×1.15) together stop at ×1.4.
 s.bonds.daro={p:15,lv:3,last:null};item.ribbon={w:0,medal:3};const daro={client:'daro',budget:100000,want:'ring'},plainFair=(()=>{const r=item.ribbon;delete item.ribbon;const f=J.quote(s,item,daro).fair;item.ribbon=r;return f;})();
 const all=J.quote(s,item,{...daro,novel:true}).fair;assert.ok(Math.abs(all-plainFair*1.4)<=1,`${all} vs ${plainFair}×1.4`);
 item.ribbon={w:0,medal:7};assert.equal(J.quote(s,item,guest).fair,base,'a broken ribbon adds nothing');
});
test('a new week closes the old one into the history and starts empty; the last day of a theme is a reason to wait',()=>{
 const s=rich(P.newGame(9)),a=make(s,silver());P.enterContest(s,a.id);assert.equal(s.guild.week,0);
 for(let d=1;d<6;d++){const prev=P.nextDay(s);assert.equal(prev.week,null);}assert.equal(s.day,6);assert.equal(P.themeEnding(s),null);
 P.nextDay(s);assert.equal(s.day,7);assert.equal(P.themeEnding(s),null,'something was entered this week');
 const prev=P.nextDay(s);assert.deepEqual(prev.week,{w:0,theme:'guard',medal:2,score:prev.week.score,name:a.design.name});assert.equal(prev.theme.id,'sea');
 assert.deepEqual({week:s.guild.week,best:s.guild.best,tried:s.guild.tried},{week:1,best:0,tried:[]});assert.equal(s.guild.history.length,1);
 for(let d=0;d<6;d++)P.nextDay(s);assert.equal(s.day,14);assert.equal(P.themeEnding(s).id,'sea');s.stock=[];assert.equal(P.themeEnding(s),null,'an empty showcase has nothing to enter');
 const next=P.nextDay(s);assert.equal(next.week,null,'a week without entries leaves no history');assert.equal(s.guild.history.length,1);
 // The ribbon of the past week stays on its piece.
 assert.deepEqual(a.ribbon,{w:0,medal:2});
});
test('normalize repairs the guild and broken ribbons and closes a week left behind',()=>{
 const s=rich(P.newGame(10)),a=make(s,silver()),b=make(s,bronze());P.enterContest(s,a.id);const raw=JSON.parse(J.serialize(s));
 raw.stock.find(i=>i.id===b.id).ribbon={w:'x',medal:2};raw.stock.find(i=>i.id===a.id).ribbon={w:0,medal:2,extra:1};
 raw.guild={week:0,best:9,tried:['jewel-1','bad','jewel-2','jewel-3','jewel-4'],score:500,name:7,history:[{w:0,theme:'nope',medal:1,score:5,name:'x'},null,{w:1,theme:'sea',medal:3,score:90,name:'Волна'}]};
 const back=P.load(JSON.stringify(raw));assert.deepEqual(back.guild,{week:0,best:0,tried:['jewel-1','jewel-2','jewel-3'],score:0,name:'',seen:false,history:[{w:1,theme:'sea',medal:3,score:90,name:'Волна'}]});
 assert.equal('ribbon'in back.stock.find(i=>i.id===b.id),false);assert.deepEqual(back.stock.find(i=>i.id===a.id).ribbon,{w:0,medal:2});assert.deepEqual(P.normalize(J.clone(back)),back,'repair is idempotent');
 // A save from an earlier week (an older version that never turned it) is closed into the history on load.
 raw.guild={week:0,best:2,tried:[a.id],score:80,name:'Кольцо',history:[]};raw.day=raw.tradeDay=9;const late=P.load(JSON.stringify(raw));
 assert.deepEqual(late.guild,{week:1,best:0,tried:[],score:0,name:'',seen:false,history:[{w:0,theme:'guard',medal:2,score:80,name:'Кольцо'}]});
 for(const g of[null,'x',[],{week:-1},{week:99}]){raw.guild=g;const r=P.load(JSON.stringify(raw));assert.equal(r.guild.week,1);assert.deepEqual(r.guild.tried,[]);}
});
test('the submit list is sorted by the judge, and the hint asks the ledger only when freshness decides a medal',()=>{
 const s=rich(P.newGame(11));assert.equal(contestHint(s,true),false,'an empty showcase');const p=make(s,plain());assert.equal(contestHint(s,false),true,'without the eye: an invitation');assert.equal(contestHint(s,true),false,'no piece can win a medal');
 const g=make(s,gold()),b=make(s,bronze());assert.equal(contestHint(s,true),true);assert.deepEqual(contestList(s).map(e=>e.item.id),[g.id,b.id,p.id]);
 P.enterContest(s,b.id);assert.equal(contestHint(s,true),false,'nothing to point at once something was entered');assert.equal(contestHint(s,false),false);
 // A long game: 120 pieces and 500 ledger entries. The hint compares a design with the ledger only when it is
 // within the freshness of a medal, and the sorted list compares each design once.
 const raw=readFileSync(new URL('./fixtures/v3-dense.json.gz',import.meta.url)),long=P.load(gunzipSync(raw).toString('utf8'));
 const n=J.tally.similarity;contestHint(long,true);const hint=J.tally.similarity-n;contestList(long);const list=J.tally.similarity-n-hint;contestList(long);
 assert.ok(J.tally.similarity-n-hint-list===0,'a second list reuses every comparison');assert.ok(list<=long.stock.length*long.demand.length,`list ${list}`);
});
