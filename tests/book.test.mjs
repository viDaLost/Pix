import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {PATTERNS,LAYOUTS,patternStrokes,layoutGems} from '../src/patterns.js';
import {addPolish} from '../src/jewel-art.js';
const pt=(x,y)=>({x,y});
const rich=s=>{s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;s.skills.push('facets','gold','alchemy');return s;};
const make=(s,d)=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s);};
const guest=s=>{if(!s.customers.some(c=>!c.served))P.nextDay(s);return s.customers.find(c=>!c.served);};
const all=d=>Array.from({length:144},(_,i)=>pt((i%12+.5)*100/12,(Math.floor(i/12)+.5)*100/12)).filter(p=>J.onMetal(p,d));
const strip=d=>({...d,strokes:d.strokes.map(({m,...s})=>s),gems:d.gems.map(({l,...g})=>g)});

test('ready-made patterns mark their strokes and layouts their stones; the marks never change the demand print',()=>{
 const d=J.makeDesign('pendant','oval','silver');d.gems=layoutGems(d,'halo',{kind:'garnet',size:3});d.strokes=patternStrokes(d,'filigree');
 assert.ok(d.gems.every(g=>g.l==='halo'));assert.ok(d.strokes.length&&d.strokes.every(s=>s.m==='filigree'));assert.doesNotThrow(()=>J.validateDesign(d,true));
 assert.equal(J.similarity(J.fingerprint(d),J.fingerprint(strip(d))),1);assert.deepEqual(J.evaluate(d),J.evaluate(strip(d)));
 for(const bad of['<x>','abcdefghijklm','A','x'])assert.throws(()=>J.validateDesign({...d,strokes:[{...d.strokes[0],m:bad}]}),/гравировка/,bad);
 assert.throws(()=>J.validateDesign({...d,gems:[{...d.gems[0],l:'<x>'}]}),/камни/);
 const s=J.newGame(2);s.draft={design:d,undo:[],redo:[]};assert.doesNotThrow(()=>J.deserialize(J.serialize(s)),'a labelled draft is a valid save');
});
test('the catalogue keys of a silver drop with a garnet halo and a rune circle',()=>{
 const d=J.makeDesign('pendant','drop','silver');d.gems=layoutGems(d,'halo',{kind:'garnet',size:3});d.strokes=patternStrokes(d,'runes');
 const keys=P.catalogKeys(d);for(const k of['form:pendant.drop','layout:halo','motif:runes','stone:garnet.round','rune:ember','metal:silver.pendant'])assert.ok(keys.includes(k),k);
 assert.ok(keys.every(k=>/^[a-z]+:[a-z0-9.+]{1,40}$/.test(k)));assert.equal(new Set(keys).size,keys.length);
 const both=J.makeDesign('amulet','oval','silver');both.gems=[{kind:'garnet',x:42,y:49,size:3,cut:'round'},{kind:'sapphire',x:58,y:49,size:3,cut:'round'}];both.strokes=patternStrokes(both,'runes');
 assert.ok(P.catalogKeys(both).includes('pair:ember+tide'),'a pair is named in alphabetical order');
 const hand=J.makeDesign('brooch','oval','copper');hand.strokes=[{kind:'engrave',width:1,points:Array.from({length:22},(_,i)=>pt(30+i,50))}];assert.ok(P.catalogKeys(hand).includes('motif:hand'));
 hand.strokes[0].points.length=15;assert.ok(!P.catalogKeys(hand).includes('motif:hand'),'a short scratch is not own engraving');
 const ring=J.makeDesign('ring','leaf','silver');assert.ok(!P.catalogKeys(ring).some(k=>k.startsWith('form:')),'a blank a ring does not offer is not a form of the book');
});
test('a layout counts only when at least half of its stones stand',()=>{
 const d=J.makeDesign('pendant','oval','silver'),cross=layoutGems(d,'cross',{kind:'garnet',size:3});assert.equal(cross.length,5);
 for(const n of[1,2,3,5]){d.gems=cross.slice(0,n);assert.equal(P.catalogKeys(d).includes('layout:cross'),n>=3,`${n} of 5`);}
 for(const l of LAYOUTS)assert.ok(Number.isInteger(l.spots)&&l.spots>=1);
});
test('the chapters list 139 keys and 19 marks open today; friendship and ribbon marks wait for their part of the game',()=>{
 const six=P.CHAPTERS.filter(c=>c.id!=='marks').reduce((n,c)=>n+P.chapterKeys(c.id).length,0);assert.equal(six,139);
 assert.deepEqual(['forms','motifs','stones','layouts','runes','metals'].map(id=>P.chapterKeys(id).length),[56,14,18,6,21,24]);
 assert.equal(P.MARKS.length,21);assert.equal(P.chapterKeys('marks').length,19);assert.ok(!P.chapterKeys('marks').some(id=>['friend','gold-ribbon'].includes(id)));assert.equal(P.bookTotal(),158);
 for(const c of P.CHAPTERS)for(const k of P.chapterKeys(c.id))assert.ok(P.keyName(k)&&!P.keyName(k).includes('undefined'),k);
 assert.equal(P.keyName('form:brooch.crescent'),'Полумесяц · брошь');assert.equal(P.keyName('pair:ember+focus'),'Тепло и ясность');assert.equal(P.keyName('form:sword.oval'),'Готовая оправа · меч');
});
test('a finished piece writes only what is new: at most four reputation, nothing for a copy',()=>{
 const s=rich(P.newGame(3)),d=J.makeDesign('pendant','drop','silver');d.gems=layoutGems(d,'halo',{kind:'garnet',size:3});d.strokes=patternStrokes(d,'runes');
 const rep=s.rep,first=make(s,d);assert.ok(first.fresh.length>4);assert.deepEqual(first.fresh,P.catalogKeys(first.item.design));
 for(const k of first.fresh)assert.equal(s.book.e[k],s.day);assert.deepEqual(s.daily.firsts,first.fresh);
 const marks=first.marks.length*3;assert.equal(s.rep-rep,4+marks);assert.equal(first.rep,4+marks);assert.equal(s.daily.rep,first.rep);
 const again=make(s,d);assert.deepEqual(again.fresh,[]);assert.deepEqual(again.marks,[]);assert.equal(again.rep,0);
 const day=s.day;P.nextDay(s);assert.deepEqual([s.daily.firsts,s.daily.rep],[[],0]);assert.equal(s.book.e['form:pendant.drop'],day,'the book keeps the day of the first time');
});
test('six layouts close their chapter exactly once: ten reputation and the plum velvet',()=>{
 const s=rich(P.newGame(4));let closed=0,rep=0;
 for(const l of LAYOUTS){const d=J.makeDesign('pendant','oval','silver');d.gems=layoutGems(d,l.id,{kind:'amethyst',size:3});const r=make(s,d);closed+=r.chapters.filter(c=>c.id==='layouts').length;if(r.chapters.length)rep=r.rep;}
 assert.equal(closed,1);assert.ok(s.book.pages.includes('layouts'));assert.ok(s.cosmetics.owned.includes('plum'));assert.ok(rep>=10);
 const d=J.makeDesign('pendant','oval','silver');d.gems=layoutGems(d,'halo',{kind:'amethyst',size:3});assert.deepEqual(make(s,d).chapters,[]);assert.equal(s.book.pages.filter(p=>p==='layouts').length,1);
});
test('marks: eight earned by direct scenarios, each once, and checking again changes nothing',()=>{
 const s=rich(P.newGame(5)),earned=r=>r.marks.map(m=>m.id);
 // first-piece and own-contour: a free contour polished to a mirror.
 const free=J.makeDesign('pendant','free','silver');free.template='free';free.outline=[pt(30,22),pt(70,22),pt(78,60),pt(50,82),pt(22,60)];free.gems=[{kind:'garnet',x:50,y:50,size:3,cut:'round'}];addPolish(free,all(free),.1);
 const a=make(s,free);assert.ok(earned(a).includes('first-piece')&&earned(a).includes('own-contour'));assert.ok(!earned(a).includes('silence'),'a piece with a stone is not silent');
 // three-elements: three stones of different elements awakened by one rune circle.
 const three=J.makeDesign('amulet','oval','silver');three.gems=[{kind:'garnet',x:50,y:34,size:3,cut:'round'},{kind:'amethyst',x:40,y:58,size:3,cut:'round'},{kind:'emerald',x:60,y:58,size:3,cut:'round'}];three.strokes=patternStrokes(three,'runes');
 assert.ok(earned(make(s,three)).includes('three-elements'));
 // openwork: three cutouts and craft 85.
 const lace=J.makeDesign('brooch','oval','silver');lace.holes=[[pt(30,45),pt(36,45),pt(33,52)],[pt(47,45),pt(53,45),pt(50,52)],[pt(64,45),pt(70,45),pt(67,52)]];addPolish(lace,all(lace),.1);lace.strokes=patternStrokes(lace,'rope');
 assert.ok(J.evaluate(lace).craft>=85);assert.ok(earned(make(s,lace)).includes('openwork'));
 // silence: no stones, restrained and polished.
 const calm=J.makeDesign('pendant','circle','gold');addPolish(calm,all(calm),.1);calm.strokes=[{kind:'engrave',width:1,points:[pt(45,50),pt(55,50)]}];
 const e=J.evaluate(calm);assert.ok(e.style.minimal>=90&&e.craft>=90,`minimal ${e.style.minimal} craft ${e.craft}`);assert.ok(earned(make(s,calm)).includes('silence'));
 // heart-fit: a buyer for whom the piece is a perfect fit.
 const fit=s.stock[0],c=guest(s);c.budget=100000;const sold=P.sell(s,fit.id,c.id,'counter');
 assert.equal(sold.marks.some(m=>m.id==='heart-fit'),sold.fit>=100);
 const s2=rich(P.newGame(6));const perfect=P.checkMarks(s2,'sell',{q:{fit:100},before:500,buyer:{client:'mira'},item:{design:free}});assert.deepEqual(perfect.map(m=>m.id),['heart-fit']);
 // motley-day: four kinds sold in one day.
 s2.daily.types=['pendant','ring','brooch'];assert.deepEqual(P.checkMarks(s2,'sell',{q:{fit:0},before:500,buyer:{client:'mira'},item:{design:free}}).map(m=>m.id),[]);
 s2.daily.types.push('amulet');assert.deepEqual(P.checkMarks(s2,'sell',{q:{fit:0},before:500,buyer:{client:'mira'},item:{design:free}}).map(m=>m.id),['motley-day']);
 // comeback: a sale with fewer than ten coins in the purse.
 const s3=rich(P.newGame(7)),cheap=make(s3,free).item;s3.gold=4;const b=guest(s3),q=P.sell(s3,cheap.id,b.id,'counter');assert.ok(q.marks.some(m=>m.id==='comeback'));
 // Each mark once: +3 reputation the first time, nothing the second.
 const rep=s2.rep;assert.deepEqual(P.checkMarks(s2,'sell',{q:{fit:100},before:1,buyer:{client:'mira'},item:{design:free}}).map(m=>m.id),['comeback']);assert.equal(s2.rep,rep+3);
 for(const ev of['sell','complete','deliver','book'])P.checkMarks(s2,ev,{q:{fit:100},before:1,buyer:{client:'mira'},item:{design:free},d:free,e:J.evaluate(free)});
 const once=J.serialize(s2);for(const ev of['sell','complete','deliver','book'])P.checkMarks(s2,ev,{q:{fit:100},before:1,buyer:{client:'mira'},item:{design:free},d:free,e:J.evaluate(free)});assert.equal(J.serialize(s2),once,'idempotent');
 assert.ok(!('friend'in s2.book.m)&&!('gold-ribbon'in s2.book.m),'marks of later parts are never earned yet');
});
test('the hidden mark of the cartographer and the halo of diamonds',()=>{
 const s=rich(P.newGame(8)),heart=J.makeDesign('pendant','heart','lunar');
 assert.deepEqual(P.checkMarks(s,'sell',{q:{fit:95},before:500,buyer:{client:'elin'},item:{design:heart}}).map(m=>m.id),['cartographer']);
 assert.ok(P.MARKS.find(m=>m.id==='cartographer').hidden);
 const halo=J.makeDesign('pendant','oval','gold');halo.gems=layoutGems(halo,'halo',{kind:'diamond',size:3});assert.equal(halo.gems.length,9);
 assert.ok(make(s,halo).marks.some(m=>m.id==='diamond-halo'));
});
test('an old workshop gets its book from the showcase and the models, with day 0 and no rewards',()=>{
 const s=rich(J.newGame(9));for(const t of['drop','leaf']){const d=J.makeDesign('pendant',t,'silver');d.gems=layoutGems(d,'solo',{kind:'garnet',size:3});d.strokes=patternStrokes(d,'beads');s.draft={design:d,undo:[],redo:[]};J.complete(s);}
 J.rememberItem(s,s.stock[0].id);const old=JSON.parse(J.serialize(s));for(const i of[...old.stock,...old.library]){for(const st of i.design.strokes)delete st.m;for(const g of i.design.gems)delete g.l;}
 const back=P.load(JSON.stringify(old));assert.ok(Object.values(back.book.e).every(d=>d===0));assert.ok(back.book.e['form:pendant.leaf']===0&&back.book.e['motif:hand']===0,'old patterns count as own engraving');
 assert.deepEqual(back.book.m,{'first-piece':0});assert.deepEqual(back.book.pages,[]);assert.equal(back.rep,Math.min(239,2*2+0+Object.keys(back.book.e).length));
 assert.equal(back.rankSeen,J.rankOf(back));assert.equal(back.upgraded,true);assert.deepEqual(P.normalize(J.clone(back)),back,'repair is idempotent');
});
test('velvets and furnishings: bought once for coins, opened by chapters and ranks, repaired by normalize',()=>{
 const s=P.newGame(10);s.gold=1000;assert.deepEqual(s.cosmetics,{velvet:'teal',owned:['teal'],decor:[]});
 assert.throws(()=>P.buyCosmetic(s,'burgundy'),/главой/);assert.throws(()=>P.buyCosmetic(s,'brass'),/званием/);assert.throws(()=>P.useVelvet(s,'cobalt'),/не открыт/);
 const v=P.buyCosmetic(s,'cobalt');assert.equal(v.price,320);assert.equal(s.gold,680);assert.equal(s.cosmetics.velvet,'cobalt');assert.throws(()=>P.buyCosmetic(s,'cobalt'),/уже есть/);
 P.buyCosmetic(s,'lamp');assert.deepEqual(s.cosmetics.decor,['lamp']);assert.equal(s.gold,500);s.gold=470;assert.throws(()=>P.buyCosmetic(s,'purple'),/монет/);assert.equal(s.gold,470,'a refused purchase spends nothing');assert.ok(!s.cosmetics.owned.includes('purple'));
 P.useVelvet(s,'teal');assert.equal(s.cosmetics.velvet,'teal');for(const v of P.VELVETS.filter(v=>v.price))assert.ok(v.price>=120&&v.price<=480);
 const raw=JSON.parse(J.serialize(s));raw.cosmetics={velvet:'emerald',owned:['ghost','cobalt','cobalt'],decor:['lamp','throne']};raw.book.pages=['stones'];raw.rep=300;
 const back=P.load(JSON.stringify(raw));assert.deepEqual(back.cosmetics,{velvet:'emerald',owned:['teal','emerald','brass','cobalt'],decor:['lamp']});assert.deepEqual(P.normalize(J.clone(back)),back);
 raw.cosmetics='x';assert.deepEqual(P.load(JSON.stringify(raw)).cosmetics.velvet,'teal');
});
