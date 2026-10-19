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
 // A single dose is never an empty flask; eight and nine fill it; nonsense counts as none.
 assert.deepEqual([0,1,2,3,4,5,6,7,8,9].map(S.doseLevel),[0,1,1,1,2,2,3,3,4,4]);assert.deepEqual([-3,null,undefined,12,2.7].map(S.doseLevel),[0,0,0,4,1]);
 // «Алхимия» shows a recipe's flask in the same steps as the shelf.
 assert.match(readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),/flaskImg\(p\.id,32,doseLevel\(doses\)\/4\)/);
});
test('who is in the room: Даро in his chair, the Magister at the window, Федя on the ladder, the line by the door',()=>{
 const s=fresh();s.visitors=[{id:'v-1',kind:'hunter',who:'gordey',contract:null,rumour:null,heard:false},{id:'v-2',kind:'daro',who:null,contract:null,rumour:null,heard:false},{id:'v-3',kind:'otto',who:null,contract:null,rumour:null,heard:false},{id:'v-4',kind:'vedana',who:null,contract:null,rumour:'kikimora.yarn',heard:false},{id:'v-5',kind:'yanek',who:null,contract:null,rumour:null,heard:false}];
 s.story.seen.push('S1','S2');const r=S.residents(s,s.visitors);assert.deepEqual(r,{daro:true,otto:true,fedya:true});
 // Даро and the Magister have their own places; with both in the room one place of the line is left (four people).
 const u=S.lineup(s,s.visitors,null);assert.equal(u.table.id,'v-1');assert.deepEqual(u.line.map(v=>v.id),['v-4']);assert.equal(S.lineup(s,s.visitors,'v-4').table.id,'v-4','the chosen one at the table');
 const two=S.lineup(s,s.visitors.filter(v=>v.kind!=='otto'),null);assert.deepEqual(two.line.map(v=>v.id),['v-4','v-5'],'with Даро alone two wait in the line');
 const quiet=fresh();quiet.day=2;assert.deepEqual(S.lineup(quiet,[],null),{daro:false,otto:false,fedya:false,table:null,line:[]});assert.equal(S.lineup(fresh(),[],null).daro,true,'Даро sits in his chair on the day of the lesson');
 const sc=new S.ScriptoriumScene(),shown=sc.people(s,s.visitors,null,1000,.05,true),at=id=>[...sc.actors].find(([k])=>k===id)?.[1];
 assert.deepEqual([at('#daro').x,at('#daro').y],S.SPOTS.chair);assert.equal(at('#daro').pose,'sit');assert.deepEqual([at('#otto').x,at('#otto').y],S.SPOTS.window);assert.deepEqual([at('#fedya').x,at('#fedya').y],S.SPOTS.ladder);assert.equal(at('#fedya').facing,'left');
 assert.deepEqual([at('v-1').x,at('v-1').y],S.SPOTS.table);assert.equal(at('v-1').pose,'chat');
 // With Даро in the first place of the line and the Magister in the third, the second guest waits in the middle one.
 assert.deepEqual([at('v-4').x,at('v-4').y],S.SPOTS.line[1]);assert.equal(at('v-5'),undefined,'no more than four people and Федя');assert.equal(shown.length,5);
 // Даро also sits on the day of his events, and Федя is there only from S2.
 const e=fresh();e.story.days.S8=e.day;e.story.seen.push('S8');assert.equal(S.residents(e,[]).daro,true);assert.equal(S.residents(fresh(),[]).fedya,false);
});
// art.md 4.6: in the morning the hunters back from their hunts stand in the line in their rag, the winners with their bag.
test('the hunters back this morning wait in the line in their rag, a winner with his bag and the trophy in his hand',()=>{
 const s=fresh();s.day=2;s.hunters.gordey.rag=2;s.hunters.agata.rag=0;const rep=(hunter,win,trophy=null)=>({id:'r-'+hunter,day:s.day,hunter,win,trophy,contract:{monster:'werewolf'},rag:win?0:2});
 s.reports=[rep('gordey',false),rep('agata',true,'grown'),{...rep('marta',false),day:s.day-1}];
 const back=S.returned(s,[]);assert.deepEqual(back.map(v=>v.id),['back-gordey','back-agata'],'only the reports of this morning');assert.ok(back.every(v=>v.kind==='hunter'&&v.back));
 assert.deepEqual(S.returned(s,[{id:'v-1',kind:'hunter',who:'gordey'}]).map(v=>v.who),['agata'],'a hunter with a new case is in the line already');
 const u=S.lineup(s,[],null);assert.equal(u.table,null,'nobody back from a hunt stands at the table by himself');assert.deepEqual(u.line.map(v=>v.who),['gordey','agata']);
 assert.equal(S.hunterPerson(s,'gordey').rag,2);assert.ok(!S.hunterPerson(s,'gordey').carry&&!S.hunterPerson(s,'gordey').trophy,'a lost hunt brings no bag');const a=S.hunterPerson(s,'agata');assert.equal(a.carry,true);assert.deepEqual(a.trophy,L.MON.get('werewolf').trophy.look.c);
 const sc=new S.ScriptoriumScene();sc.people(s,[],null,0,.05,true);assert.deepEqual([sc.actors.get('back-gordey').x,sc.actors.get('back-gordey').y],S.SPOTS.line[0]);assert.equal(sc.actors.get('back-gordey').person.rag,2);
 s.day++;sc.people(s,[],null,100,.05,true);assert.equal(sc.actors.size,0,'the next day they are gone');
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
 // Under a dialog the news waits: a trophy won in the night flashes on the first frame that is seen.
 s.monsters.werewolf.troph=['grown'];paint(sc,s,{guests:[],time:1200,covered:true});assert.equal(sc.flash.length,0);paint(sc,s,{guests:[],time:1250});assert.deepEqual(sc.flash,[{i:0,at:1250}]);
 const calm=new S.ScriptoriumScene(),c=fresh();paint(calm,c,{covered:true});c.monsters.werewolf.troph=['young'];paint(calm,c,{time:50});assert.equal(calm.flash.length,1,'the first frame may be covered');
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
// Found in Г3: the jars of the sill were drawn into the background, and the sky of the window, painted every frame, hid
// them; the keeper of the strip stirred beside a pot as tall as himself with his ladle in the air.
test('the jars and the letter of the sill stand in front of the glass; in the strip the ladle goes in over the rim of the pot',()=>{
 const s=fresh();s.stock.werewolf_fang=1;s.upgrades=['dovecote'];const sc=new S.ScriptoriumScene(),{bg,front}=sc.layers(s),has=(cv,col)=>cv.ops.some(o=>o.kind==='rect'&&o.color===col);
 assert.ok(has(front,'rgba(200,230,210,.32)')&&!has(bg,'rgba(200,230,210,.32)'),'the jar is in front');assert.ok(has(front,'#a3301c'),'the seal of the letter');
 const c=paint(sc,s),imgs=c.ops.filter(o=>o.kind==='image').map(o=>o.img);assert.ok(imgs.indexOf(front)>imgs.indexOf(bg)+1,'the front comes after the window');
 const lab=fakeCanvas(480,150);sc.paintLab(lab.getContext('2d'),s,{time:700,amb:A.ambience(s)});const li=lab.ops.filter(o=>o.kind==='image');
 const keeper=li.findIndex(o=>o.img.width===80),potAt=li.findIndex(o=>o.img.width===480&&o.img.height===150&&o!==li[0]);assert.ok(keeper>0&&potAt>keeper,'the front of the pot over the keeper');
 const k=li[keeper],[x,y,w,h]=k.args;assert.ok(x<294&&x+w>294&&y+h>=146-1,'the keeper stands at the pot');assert.ok(Math.abs(w-80*1.55*.8)<1,'larger than in the room');
});
// Found in Г3: on short screens CSS crops the strip (object-fit:cover), and a tap was read as if the whole picture showed.
test('a tap on the strip is read through the crop of object-fit:cover',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),body=app.match(/function canvasPoint\(el,e\)\{[\s\S]*?\n return [^\n]*\}/)[0];
 const canvasPoint=new Function('getComputedStyle',body+';return canvasPoint;')(()=>({objectPosition:'50% 88%'}));
 // A 358 px wide strip cut to 76 px: the drawing is 358×112 and shifted up by 88% of the 36 px it overflows.
 const el={width:480,height:150,getBoundingClientRect:()=>({left:10,top:100,width:358,height:76})},k=358/480,off=(76-150*k)*.88;
 const [x,y]=canvasPoint(el,{clientX:10+242*k,clientY:100+off+112*k});assert.ok(Math.abs(x-242)<.01&&Math.abs(y-112)<.01,`${x},${y}`);
 assert.equal(S.ScriptoriumScene.labTarget(x,y),'alchemy');
 const plain=new Function('getComputedStyle',body+';return canvasPoint;')(()=>({objectPosition:''})),[a,b]=plain({width:480,height:150,getBoundingClientRect:()=>({left:0,top:0,width:480,height:150})},{clientX:60,clientY:80});assert.deepEqual([a,b],[60,80]);
});
