import test from 'node:test';
import assert from 'node:assert/strict';
import {solveArm,characterRig,POSES} from '../src/character-rig.js';
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function anatomy(arm){
  for(const point of[arm.shoulder,arm.elbow,arm.wrist])assert.ok(point.every(Number.isFinite));
  assert.ok(Math.abs(length(arm.shoulder,arm.elbow)-10)<1e-7,'upper arm retains its length');
  assert.ok(Math.abs(length(arm.elbow,arm.wrist)-9)<1e-7,'forearm retains its length');
}
test('an unreachable wrist is brought into reach without stretching either bone',()=>{
  const shoulder=[37,28],target=[80,-40],arm=solveArm(shoulder,target);anatomy(arm);
  assert.ok(length(arm.shoulder,arm.wrist)<19);assert.ok(length(arm.wrist,target)>1);
  assert.deepEqual(shoulder,[37,28]);assert.deepEqual(target,[80,-40]);
});
test('a folded arm and coincident hand stay finite on both elbow sides',()=>{
  for(const target of[[37,28],[37,28.001],[37,46],[19,28],[37,9]])for(const bend of[-1,1])anatomy(solveArm([37,28],target,bend));
});
test('all work, walking and NPC frames preserve both arm lengths in every direction',()=>{
  for(const facing of['up','down','left','right'])for(const pose of POSES)for(const temper of['water','oil','air'])for(let frame=0;frame<8;frame++){
    const rig=characterRig(facing,pose,frame,temper,-1);anatomy(rig.near);anatomy(rig.far);
    for(const arm of[rig.near,rig.far])for(const [x,y]of[arm.shoulder,arm.elbow,arm.wrist])assert.ok(x>10&&x<61&&y>5&&y<62,'articulated arm fits within the sprite');
  }
});
test('working tools contact their station surfaces at the impact frame',()=>{
  // Local artwork origin is eight pixels right of the 80px frame origin.
  const positions=[
    {pose:'hammer',frame:4,x:245,y:278,facing:'right',target:[283,246]},
    {pose:'heat',frame:0,x:227,y:217,facing:'left',target:[187,150]},
    {pose:'cut',frame:0,x:125,y:268,facing:'left',target:[88,222]},
    {pose:'quench',frame:4,x:371,y:289,facing:'right',target:[414,231]},
    {pose:'polish',frame:0,x:338,y:226,facing:'right',target:[380,160]},
  ];
  for(const p of positions){const rig=characterRig(p.facing,p.pose,p.frame),[tx,ty]=rig.tool,x=p.x+(tx-32)*1.6*(p.facing==='left'?-1:1),y=p.y+(ty-76)*1.6;assert.ok(Math.hypot(x-p.target[0],y-p.target[1])<3,p.pose+' reaches its workpiece');}
});
