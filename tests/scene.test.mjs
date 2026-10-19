import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installDocument,fakeCanvas,colors} from './canvas-helpers.mjs';
installDocument();
const S=await import('../src/scriptorium-scene.js'),P=await import('../src/progress.js'),L=await import('../src/lore.js'),G=await import('../src/guide.js'),A=await import('../src/ambience.js');
const src=readFileSync(new URL('../src/scriptorium-scene.js',import.meta.url),'utf8');
const fresh=()=>{const s=P.newGame(4242);s.welcomed=true;return s;};
const paint=(scene,s,opts={})=>{const c=fakeCanvas(480,260);scene.paint(c.getContext('2d'),s,{guests:G.queueOf(s),time:1000,dt:.05,amb:A.ambience(s),...opts});return c;};
const bgOps=s=>{const sc=new S.ScriptoriumScene(),l=sc.layers(s);return [...l.bg.ops,...l.front.ops].filter(o=>o.kind==='rect').map(o=>`${o.x},${o.y},${o.w},${o.h},${o.color}`).join(';');};
// art.md 4.5: every change of the state is seen in the world.
test('every upgrade, every piece of décor, a trophy, a treatise, a second edition, a potion, a rare part and the print change the room',()=>{
 const base=fresh(),plain=bgOps(base);
 for(const u of L.UPGRADES){const s=fresh();s.upgrades=[u.id];assert.notEqual(bgOps(s),plain,`upgrade ${u.id} is seen`);}
 for(const d of L.DECOR){const s=fresh();s.decor=[d.id];const ops=bgOps(s);if(d.id==='stained'){assert.equal(ops,plain);continue;}assert.notEqual(ops,plain,`décor ${d.id} is seen`);}
 const changes={trophy:s=>{s.monsters.werewolf.troph=['grown'];},treatise:s=>{s.monsters.werewolf.treatise=3;},edition:s=>{s.monsters.werewolf.treatise=3;s.editions=['werewolf'];},potion:s=>{s.potions.courage=9;s.recipes.push('courage');},
  rare:s=>{s.stock.werewolf_fang=1;},printed:s=>{s.printed=40;}};
 for(const [k,f] of Object.entries(changes)){const s=fresh();f(s);assert.notEqual(bgOps(s),plain,k);}
 // A treatise and its second edition differ too; the plaque of an ancient trophy is silver with a star.
 const t=fresh();changes.treatise(t);const e=fresh();changes.edition(e);assert.notEqual(bgOps(t),bgOps(e));
 const old=fresh();old.monsters.werewolf.troph=['ancient'];assert.match(bgOps(old),/#c9d2d6/);
 // The stained glass is a pane over the sky, drawn in the frame.
 const sw=fresh();sw.decor=['stained'];const a=paint(new S.ScriptoriumScene(),sw),b=paint(new S.ScriptoriumScene(),fresh());assert.ok(a.ops.filter(o=>o.kind==='image').length>b.ops.filter(o=>o.kind==='image').length);
});
test('the background is cached by the state and kept to four; the flasks fill in five steps of the doses',()=>{
 const sc=new S.ScriptoriumScene(),s=fresh();const first=sc.layers(s);assert.equal(sc.layers(s),first,'the same state, the same layers');
 for(let i=1;i<=6;i++){s.gold+=i;s.potions.courage=i;sc.layers(s);}assert.ok(sc.bg.size<=4);
 s.gold=999;assert.equal(sc.key(s),sc.key({...s,gold:1}),'coins are not in the key');
 assert.deepEqual([0,1,2,3,4,5,6,7,8,9].map(S.doseLevel),[0,0,1,1,2,3,3,4,4,4]);
});
test('who is in the room: Даро in his chair, the Magister at the window, Федя on the ladder, the line by the door',()=>{
 const s=fresh();s.visitors=[{id:'v-1',kind:'hunter',who:'gordey',contract:null,rumour:null,heard:false},{id:'v-2',kind:'daro',who:null,contract:null,rumour:null,heard:false},{id:'v-3',kind:'otto',who:null,contract:null,rumour:null,heard:false},{id:'v-4',kind:'vedana',who:null,contract:null,rumour:'kikimora.yarn',heard:false},{id:'v-5',kind:'yanek',who:null,contract:null,rumour:null,heard:false}];
 s.story.seen.push('S1','S2');const r=S.residents(s,s.visitors);assert.deepEqual(r,{daro:true,otto:true,fedya:true});
 const sc=new S.ScriptoriumScene();assert.deepEqual(sc.cast(s.visitors,null).map(v=>v.id),['v-1','v-4','v-5'],'Даро and the Magister are not in the line');assert.equal(sc.cast(s.visitors,'v-4')[0].id,'v-4','the chosen one at the table');
 const shown=sc.people(s,s.visitors,null,1000,.05,true),at=id=>[...sc.actors].find(([k])=>k===id)?.[1];
 assert.deepEqual([at('#daro').x,at('#daro').y],S.SPOTS.chair);assert.equal(at('#daro').pose,'sit');assert.deepEqual([at('#otto').x,at('#otto').y],S.SPOTS.window);assert.deepEqual([at('#fedya').x,at('#fedya').y],S.SPOTS.ladder);assert.equal(at('#fedya').facing,'left');
 assert.deepEqual([at('v-1').x,at('v-1').y],S.SPOTS.table);assert.equal(at('v-1').pose,'chat');
 // With Даро in the first place of the line and the Magister in the third, the second guest waits in the middle one.
 assert.deepEqual([at('v-4').x,at('v-4').y],S.SPOTS.line[1]);assert.equal(at('v-5'),undefined,'no more than four people and Федя');assert.equal(shown.length,5);
 // Даро also sits on the day of his events, and Федя is there only from S2.
 const e=fresh();e.story.days.S8=e.day;e.story.seen.push('S8');assert.equal(S.residents(e,[]).daro,true);assert.equal(S.residents(fresh(),[]).fedya,false);
});
test('a beaten hunter comes in slow and ragged, bows at the table, and a guest who is gone walks out by the door',()=>{
 const s=fresh();s.hunters.gordey.rag=3;const v={id:'v-1',kind:'hunter',who:'gordey',contract:null,rumour:null,heard:false},sc=new S.ScriptoriumScene();
 sc.people(s,[],null,0,.05,false);sc.people(s,[v],null,100,.05,false);const a=sc.actors.get('v-1');assert.deepEqual([a.x,a.y],S.SPOTS.door,'in by the door');assert.equal(a.slow,.6);assert.equal(a.person.rag,3);
 let doors=0;sc.onDoor=()=>doors++;let t=100;for(let i=0;i<200&&(a.path.length||t<200);i++){t+=50;paint(sc,s,{guests:[v],time:t});}assert.ok(doors>=1,'the door creaks');assert.deepEqual([Math.round(a.x),Math.round(a.y)],S.SPOTS.table);
 paint(sc,s,{guests:[v],time:t+50});assert.equal(a.pose,'bow','a bow on arrival');paint(sc,s,{guests:[v],time:t+700});assert.equal(a.pose,'chat');
 for(let i=0;i<200&&sc.actors.has('v-1');i++){t+=50;paint(sc,s,{guests:[],time:t});if(i===0)assert.ok(sc.actors.get('v-1').leaving);}assert.ok(!sc.actors.has('v-1'),'gone through the door');
 // With less motion everyone simply stands in place.
 const calm=new S.ScriptoriumScene();calm.people(s,[],null,0,.05,true);calm.people(s,[v],null,0,.05,true);assert.deepEqual([calm.actors.get('v-1').x,calm.actors.get('v-1').y],S.SPOTS.table);
 assert.equal(S.hunterPerson(s,'gordey').rag,3);assert.deepEqual(S.hunterPerson(s,'gordey').marks,L.HUNTER.get('gordey').marks);
});
test('the candles of the day burn on the ledge and a spent one shrinks and smokes; the keeper writes alone and talks to a guest',()=>{
 const s=fresh(),sc=new S.ScriptoriumScene();paint(sc,s,{guests:[]});assert.equal(sc.keeper.pose,'write');
 s.daily.candles=1;paint(sc,s,{guests:[],time:1100});assert.deepEqual(sc.spent,{i:P.candlesLeft(s),at:1100});
 const v={id:'v-1',kind:'hunter',who:'gordey',contract:null,rumour:null,heard:false};paint(sc,s,{guests:[v],time:1200,calm:true});assert.equal(sc.keeper.pose,'chat');
 // Brewing flares the cauldron in the colour of the potion and keeps it.
 sc.brew('aconite_oil',2000);assert.equal(sc.liquid,L.POT.get('aconite_oil').look.liquid);assert.equal(sc.brewing.at,2000);
});
test('the window: rain on the glass, grey snow in the Black Winter, the drip of the thaw, the moon at night, the pigeon',()=>{
 const run=(amb,o)=>{const c=fakeCanvas(480,260);S.paintWindow(c.getContext('2d'),amb,5000,o);return colors(c);};
 const day={day:3,season:0,weather:'clear',phase:.3,moon:2};
 assert.ok(run({...day,weather:'rain'},{}).has('rgba(225,238,248,.8)'),'drops crawl down the glass');
 assert.ok(run({...day,season:1,weather:'snow'},{hold:true}).has('rgba(170,172,170,.9)'),'grey snow');assert.ok(run({...day,season:1,weather:'snow'},{}).has('rgba(255,255,255,.9)'));
 assert.ok(run({...day,season:1},{hold:true}).has('#a9aaa8'),'grey snow on the sill');assert.ok(run(day,{thaw:true}).has('rgba(220,235,245,.85)'),'icicles of the thaw');
 assert.ok(run({...day,phase:1,moon:4},{}).has('#fff6d8'),'the moon at night');assert.ok(!run(day,{}).has('#fff6d8'),'no moon by day');
 assert.ok(run(day,{dove:true}).has('#9a9aa2'),'the pigeon of the dovecote');
});
test('the strip of the laboratory and the doorway of the report draw from cached backgrounds; taps on the strip lead to the tabs',()=>{
 const s=fresh();s.stock.herb_aconite=3;s.stock.werewolf_fur=2;s.upgrades=['still'];const sc=new S.ScriptoriumScene(),c=fakeCanvas(480,150);sc.paintLab(c.getContext('2d'),s,{time:500,amb:A.ambience(s)});
 assert.equal(sc.labBg.size,1);sc.paintLab(c.getContext('2d'),s,{time:550,amb:A.ambience(s)});assert.equal(sc.labBg.size,1,'the same background');s.stock.herb_rue=1;sc.paintLab(c.getContext('2d'),s,{time:600,amb:A.ambience(s)});assert.equal(sc.labBg.size,2,'a new herb on the beam');
 const bg=[...sc.labBg.values()][1];assert.ok(colors(bg).has(L.MAT.get('herb_aconite').look.c[0]),'the herb hangs on the beam');
 assert.equal(S.ScriptoriumScene.labTarget(240,100),'alchemy');assert.equal(S.ScriptoriumScene.labTarget(60,80),'samples');assert.equal(S.ScriptoriumScene.labTarget(400,120),null);
 const t=fakeCanvas(240,80);sc.paintThreshold(t.getContext('2d'),S.hunterPerson(s,'gordey'),{weather:'rain',season:0});sc.paintThreshold(t.getContext('2d'),S.hunterPerson(s,'agata'),{weather:'rain',season:0});assert.equal(sc.thresholds.size,1,'cached by the weather');
 assert.ok(t.ops.some(o=>o.kind==='image'&&o.img.width===80),'the hunter is drawn from his sprite');
});
// GDD 11.2: the frame budget — light from ready sprites, nothing slow in a frame.
test('no blur, filter or pixel reading in the scene; gradients only where light sprites and vignettes are made once',()=>{
 assert.doesNotMatch(src,/shadowBlur|\.filter\s*=|getImageData/);assert.equal([...src.matchAll(/createRadialGradient/g)].length,2);
 assert.match(src,/function glow\(color,r\)\{const key=color\+r;let g=glows\.get\(key\);if\(g\)return g;/);assert.match(src,/function vignettePane\(w=W,h=H\)\{const key=w\+'x'\+h;let v=vignettes\.get\(key\);if\(v\)return v;/);
 // A frame with four people in the room paints only a bounded number of things.
 const s=fresh();s.story.seen.push('S1','S2');s.visitors.push({id:'v-9',kind:'otto',who:null,contract:null,rumour:null,heard:false});const sc=new S.ScriptoriumScene();paint(sc,s);const c=paint(sc,s,{time:1050});
 assert.ok(c.ops.filter(o=>o.kind==='image').length<=24,'images a frame');assert.ok(c.ops.length<1600,`${c.ops.length} operations a frame`);assert.ok(!c.ops.some(o=>o.kind==='gradient'),'no gradient made in a frame');
});
