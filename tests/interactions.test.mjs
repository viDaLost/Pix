import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkInput,finishProgress,placeRivet,rubSurface} from '../src/interactions.js';
import {createActor,moveActor,updateActor} from '../src/motion.js';
import {createEffects,emitEffect,updateEffects} from '../src/effects.js';

test('assembly requires three different fasteners; repeated and invalid taps cannot complete it',()=>{
  const input=createWorkInput({step:4,day:1});
  assert.equal(placeRivet(input,0),false);assert.equal(placeRivet(input,0),false);
  assert.equal(placeRivet(input,-1),false);assert.equal(placeRivet(input,8),false);
  assert.equal(finishProgress(input),1/3);assert.equal(placeRivet(input,2),false);
  assert.equal(placeRivet(input,1),true);assert.equal(finishProgress(input),1);
});
test('surface work needs sustained strokes; jitter and one large pointer jump are insufficient',()=>{
  const input=createWorkInput({step:4,day:1});input.finishMethod='polish';
  for(let i=0;i<100;i++)assert.equal(rubSurface(input,1,1),false);
  assert.equal(finishProgress(input),0);assert.equal(rubSurface(input,900,0),false);
  assert.equal(input.rubDistance,32);assert.equal(rubSurface(input,NaN,10),false);
  for(let i=0;i<7;i++)assert.equal(rubSurface(input,i%2?32:-32,0),false);
  assert.equal(rubSurface(input,32,0),true);assert.equal(finishProgress(input),1);
});
test('scrubbing cannot substitute for assembly and a rivet cannot substitute for polishing',()=>{
  const input=createWorkInput({step:4,day:1});
  for(let i=0;i<20;i++)assert.equal(rubSurface(input,30,0),false);
  input.finishMethod='sharpen';assert.equal(placeRivet(input,0),false);
  assert.deepEqual(input.rivets,[]);assert.equal(finishProgress(input),0);
});
test('movement starts gently, slows before arrival and finishes exactly once',()=>{
  const a=createActor(60,280);moveActor(a,300,280);let arrivals=0;a.after=()=>arrivals++;
  updateActor(a,1/60,0);const first=a.x-60;let peak=0,lastSpeed=0;
  for(let i=1;i<240&&a.path.length;i++){const x=a.x;updateActor(a,1/60,i*1000/60);peak=Math.max(peak,a.x-x);if(a.path.length)lastSpeed=a.speed;}
  assert.ok(first<.3);assert.ok(peak>2);assert.ok(lastSpeed<80);
  assert.equal(a.x,300);assert.equal(a.speed,0);assert.equal(arrivals,1);
  for(let i=0;i<30;i++)updateActor(a,1/60,6000+i*16);assert.equal(arrivals,1);
});
test('effects have a fixed particle limit and release particles and labels after they expire',()=>{
  const fx=createEffects();
  for(let i=0;i<100;i++)emitEffect(fx,'spark',280,246,i*10,'Точно!');
  assert.ok(fx.particles.length<=120);assert.ok(fx.labels.length<=4);
  for(let i=0;i<100;i++)updateEffects(fx,.05);
  assert.equal(fx.particles.length,0);assert.equal(fx.labels.length,0);assert.equal(fx.shake,0);
});
test('heat embers and steam do not shake the camera',()=>{
  const fx=createEffects();emitEffect(fx,'ember',187,150,0);emitEffect(fx,'steam',414,231,0);
  assert.equal(fx.shake,0);assert.ok(fx.particles.some(p=>p.type==='steam'&&p.vy<0));
});
