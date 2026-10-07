import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {createWorkInput} from '../src/interactions.js';
import {workProfile,targetZone,timingTarget,advanceTemperature,strike,reheat,craftsmanship} from '../src/crafting.js';
const input=(recipe='knife')=>createWorkInput({recipe,material:'iron',step:2,day:1});
const toFinish=(s)=>{for(const stage of ['prepare','heat','hammer'])G.advanceWork(s,stage,.8);G.advanceWork(s,'quench','water');};
test('different products and metals need different shapes, marks and forging routes',()=>{
  const blade=workProfile({recipe:'knife',material:'iron'}),ring=workProfile({recipe:'ring',material:'copper'}),frame=workProfile({recipe:'lantern',material:'iron'});
  assert.notEqual(blade.kind,ring.kind);assert.notEqual(frame.kind,blade.kind);assert.notDeepEqual(blade.marks,ring.marks);assert.notEqual(blade.heat,ring.heat);
  const t=createWorkInput({recipe:'ring',material:'copper',day:1,step:0});assert.equal(timingTarget(t),ring.marks[0]);t.hits.push(.8);assert.equal(timingTarget(t),ring.marks[1]);
});
test('five accurately placed timed blows make a series; extra and fast blows are ignored',()=>{
  const t=input();t.position=.68;
  for(let i=0;i<5;i++){const result=strike(t,targetZone(t),i*350);assert.equal(result.score,1);assert.equal(result.combo,i+1);assert.equal(strike(t,1,i*350+50),null);}
  assert.equal(t.bestCombo,5);assert.equal(strike(t,0,3000),null);assert.equal(craftsmanship(t).zones.reduce((a,b)=>a+b),5);
});
test('a wrong zone breaks the series and gives a lower score',()=>{
  const t=input();t.position=.68;strike(t,targetZone(t),0);assert.equal(t.combo,1);const hit=strike(t,(targetZone(t)+1)%3,400);assert.equal(hit.matching,false);assert.ok(hit.score<.5);assert.equal(t.combo,0);assert.equal(t.bestCombo,1);
});
test('cooling lowers workable heat, blocks cold blows and reheating preserves the existing shape',()=>{
  const t=input();t.position=.68;strike(t,targetZone(t),0);const hits=[...t.hits],zones=[...t.zoneHits];for(let i=0;i<200;i++)advanceTemperature(t,.1);
  assert.ok(t.temperature<.3);assert.equal(strike(t,1,3000).cold,true);assert.deepEqual(t.hits,hits);assert.ok(reheat(t));assert.equal(t.temperature,.94);assert.deepEqual(t.zoneHits,zones);assert.equal(t.reheats,1);
  t.reheating=true;const before=t.temperature;advanceTemperature(t,.1);assert.equal(t.temperature,before);
});
test('design unlocking, costs and cancellation remain atomic',()=>{
  const s=G.newGame(),before=structuredClone(s);assert.throws(()=>G.beginWork(s,'knife','iron','none',null,'light'),G.GameError);assert.deepEqual(s,before);
  s.skills.push('precision');assert.equal(G.workCosts(s,'knife','iron','none','light').iron,1);assert.equal(G.workCosts(s,'knife','iron','none','sturdy').iron,3);
  const r=structuredClone(s.resources);G.beginWork(s,'knife','iron','none',null,'sturdy');G.cancelWork(s);assert.deepEqual(s.resources,r);
  s.equipment.grindstone=1;s.resources.crystal=0;const poor=structuredClone(s);assert.throws(()=>G.beginWork(s,'knife','iron','none',null,'ornate'),G.GameError);assert.deepEqual(s,poor);
});
test('designed items retain useful traits and trade value after saving',()=>{
  const s=G.newGame();s.skills.push('precision');G.beginWork(s,'knife','iron','none',null,'light');toFinish(s);const item=G.advanceWork(s,'finish','plain');assert.ok(G.itemTraits(item).includes('Лёгкий'));assert.equal(item.design,'light');
  const restored=G.deserialize(G.serialize(s));assert.deepEqual(restored.stock[0].scores,item.scores);assert.ok(G.itemTraits(restored.stock[0]).includes('Лёгкий'));assert.equal(G.itemValue(restored.stock[0]),G.itemValue(item));
});
test('series and workshop marks affect the item once and cannot be used early',()=>{
  const s=G.newGame();s.crafted=3;G.beginWork(s,'knife');assert.throws(()=>G.markWork(s,'ember'),G.GameError);G.advanceWork(s,'prepare',.8);G.advanceWork(s,'heat',.8);G.recordCraftsmanship(s,{combo:5,reheats:1,zones:[1,2,2]});G.advanceWork(s,'hammer',.8);G.advanceWork(s,'quench','water');G.markWork(s,'ember');
  const fame=s.fame,item=G.advanceWork(s,'finish','plain');assert.equal(item.quality,94);assert.equal(item.mark,'ember');assert.equal(item.craftsmanship.combo,5);assert.equal(s.fame,fame+1);assert.ok(G.itemValue(item)>G.itemValue({...item,mark:'none'}));assert.throws(()=>G.markWork(s,'ember'),G.GameError);
});
test('old work resumes with the basic design; malformed craftsmanship cannot raise quality',()=>{
  const s=G.newGame();G.beginWork(s,'knife');delete s.work.design;delete s.work.mark;const old=G.deserialize(G.serialize(s));assert.equal(old.work.design,'balanced');assert.equal(old.work.mark,'none');
  s.work.craftsmanship={combo:50,reheats:0,zones:[0,0,5]};assert.throws(()=>G.deserialize(G.serialize(s)),G.GameError);
  const t=G.newGame();G.beginWork(t,'knife');G.advanceWork(t,'prepare',.8);G.advanceWork(t,'heat',.8);assert.throws(()=>G.recordCraftsmanship(t,{combo:5,reheats:0,zones:[0,0,50]}),G.GameError);
});
