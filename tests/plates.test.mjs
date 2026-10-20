// Г4: the engravings (art.md 5.2–5.5, GDD 11.5–11.6). The data of the 14 plates, the pure geometry of the burin and the
// plans of the morning report are checked in node; painting goes to a context that only counts what it is asked to do.
import test from 'node:test';import assert from 'node:assert/strict';
import * as PL from '../src/plates.js';const {PLATES}=PL;
import {MONSTERS} from '../src/content-data.js';
import * as E from '../src/engraving.js';
import {reportPlan,planDuration,FULL,SHORT} from '../src/report-reveal.js';
const ctx2d=()=>{const calls={fill:0,stroke:0};const c=new Proxy({calls},{get(t,k){if(k in t)return t[k];if(k==='createRadialGradient'||k==='createLinearGradient')return ()=>({addColorStop(){}});if(k==='createPattern')return ()=>null;if(k==='fill'||k==='stroke')return ()=>{calls[k]++;};return ()=>{};},set(t,k,v){t[k]=v;return true;}});return c;};
globalThis.document??={createElement:()=>{const cv={width:0,height:0,getContext:()=>{const c=ctx2d();c.canvas=cv;return c;},toDataURL:()=>'data:image/png;base64,'+Math.random().toString(36).slice(2)};return cv;}};
const ids=MONSTERS.map(m=>m.id);
test('every monster has its plate with five anchors in the field, known primitives and at most 3 KB of data',()=>{
 assert.equal(ids.length,14);for(const id of ids){const P=PLATES[id];assert.ok(P,id);assert.ok(JSON.stringify(P).length<=3072,`${id} is ${JSON.stringify(P).length} B`);
  for(const cat of ['substance','ward','time','place','ritual']){const [x,y]=P.anchors[cat];assert.ok(x>=0&&x<=E.PW&&y>=0&&y<=E.PH,`${id} ${cat}`);}
  for(const s of P.shapes){assert.ok(E.KINDS.includes(s[0]),`${id}: ${s[0]}`);assert.ok(s[1]>=0&&s[1]<=3&&s[2]>=(s[0]==='prop'?-1:0)&&s[2]<=4,`${id}: level and tone`);}
  for(const lv of [0,1,2])assert.ok(P.shapes.some(s=>s[1]===lv),`${id} has primitives of level ${lv}`);}
 for(const [a,b] of Object.entries(PL.PLATE_ALIAS||{}))assert.ok(PLATES[b],`alias ${a}`);});
test('all 14 plates draw at every stage and as a silhouette without throwing, each stage adding ink, within the budget',()=>{
 for(const id of ids){let last=-1,stage0=0;for(const st of [0,1,2,3,4]){const c=ctx2d(),n=E.drawPlate(c,id,st);assert.ok(n,`${id} ${st}`);const ink=n.fills+n.strokes+n.hatch;assert.notEqual(ink,last,`${id}: stage ${st} adds nothing`);if(st===3)assert.ok(ink>stage0,`${id}: the whole plate is more than the sketch`);if(!st)stage0=ink;last=ink;
   if(st===3){assert.ok(n.strokes<=80,`${id}: ${n.strokes} strokes`);assert.ok(n.hatch<=2500,`${id}: ${n.hatch} cuts`);}}
  const s=ctx2d();E.drawSilhouette(s,id);assert.ok(s.calls.fill>=2,`${id} silhouette`);
  for(const it of E.compile(id).items)if(it?.poly)for(const [x,y] of it.poly)assert.ok(Number.isFinite(x)&&Number.isFinite(y),`${id}: a point is not a number`);}});
test('the plates are distinct: no two have the same figures',()=>{
 const sig=id=>E.compile(id).figs.map(f=>f.box.map(v=>Math.round(v/4)).join(',')).join('|');const seen=new Map();
 for(const id of ids){const k=sig(id);assert.ok(!seen.has(k),`${id} draws like ${seen.get(k)}`);seen.set(k,id);}});
test('hatchLines: parallel lines a step apart that cross the box, a few left out',()=>{
 const box=[0,0,100,60];for(const ang of [0,45,-20,90]){const L=E.hatchLines(box,ang,3,0,{jitter:0,skip:0}),a=ang*Math.PI/180,nx=-Math.sin(a),ny=Math.cos(a);assert.ok(L.length>10,`${ang}°`);
  const off=L.map(([s])=>s[0]*nx+s[1]*ny).sort((p,q)=>p-q);for(let i=1;i<off.length;i++)assert.ok(Math.abs(off[i]-off[i-1]-3)<1e-6,`${ang}°: the step`);
  for(const [s,,e] of L){const dx=e[0]-s[0],dy=e[1]-s[1];assert.ok(Math.abs(dx*Math.sin(a)-dy*Math.cos(a))<1e-6,`${ang}°: parallel`);for(const p of [s,e])assert.ok(p[0]>=-1e-6&&p[0]<=100+1e-6&&p[1]>=-1e-6&&p[1]<=60+1e-6,'inside the box');}
  const span=off.at(-1)-off[0],full=Math.abs(100*nx)+Math.abs(60*ny);assert.ok(span>=full-6-1e-6,`${ang}°: covers the box`);}
 const all=E.hatchLines(box,30,2,0,{seed:5}).length,none=E.hatchLines(box,30,2,0,{seed:5,skip:0}).length;assert.ok(all<none&&all>=none*.85,'about 6 % left out');});
test('stages follow the share of settled records; the caches keep 10 plates and 28 thumbnails',()=>{
 assert.equal(E.stageOf(null),null);assert.equal(E.stageOf({resolved:1,total:9}),0);assert.equal(E.stageOf({resolved:3,total:9}),1);assert.equal(E.stageOf({resolved:5,total:9}),2);assert.equal(E.stageOf({resolved:7,total:9}),3);assert.equal(E.stageOf({resolved:2,total:9},true),4);
 for(const id of ids)for(const st of [1,3])E.plateCanvas(id,st,120,1);assert.equal(E.cacheSizes().plates,E.LIMITS.plates);
 const a=E.plateCanvas('werewolf',2,120,1);assert.equal(E.plateCanvas('werewolf',2,120,1),a,'a hit gives the same canvas');
 for(const id of ids)for(const st of [null,1,4])E.thumbURL(id,st);assert.equal(E.cacheSizes().thumbs,E.LIMITS.thumbs);assert.equal(E.thumbURL('koldun',4),E.thumbURL('koldun',4));
 assert.ok(E.revealItems('werewolf',1,3).length>0);assert.deepEqual(E.revealItems('werewolf',3,3),[]);});
test('the morning report: full plan ≤ 4 s with a stamp for each advice, short ≤ 1.8 s, one beat with less motion',()=>{
 const r={win:true,items:[{seen:true,o:'ok'},{seen:true,o:'none'},{seen:false}]};const full=reportPlan(r),short=reportPlan(r,{short:true});
 assert.deepEqual(full.map(b=>b.beat),['door','roll','reveal','line','stamp','stamp','stamp','reward','final']);assert.deepEqual(full.filter(b=>b.beat==='stamp').map(b=>b.t),[1900,2450,3000]);
 assert.ok(planDuration(full)<=4000);assert.ok(planDuration(short,true)<=1800);assert.ok(!short.some(b=>b.beat==='door'));assert.equal(full.at(-1).t,FULL.final);assert.equal(short.at(-1).t,SHORT.final);
 assert.ok(full.every((b,i)=>!i||b.t>=full[i-1].t),'in order');assert.equal(reportPlan({win:false,items:[]}).at(-2).beat,'wound');
 assert.deepEqual(reportPlan(r,{reduced:true}),[{t:0,beat:'final'}]);assert.equal(planDuration(reportPlan(r,{reduced:true})),0);});
