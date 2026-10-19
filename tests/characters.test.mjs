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
// Review of Г2: characters.js fills what a look leaves out from its old preset «smith», who wears a beard; the people of
// the bestiary say it all themselves, so a keeper, a huntress or a townswoman is never drawn bearded.
test('the people of the bestiary wear only what their look says',async()=>{
 const {personOf,guestPerson,keeperPerson}=await import('../src/scriptorium-scene.js'),L=await import('../src/lore.js');
 const people=[...L.KEEPER_LOOKS.map(k=>personOf(k.id,k.look)),...L.HUNTERS.map(h=>personOf(h.id,h.look,h.lookFallback)),...L.VISITORS.filter(v=>v.look).map(v=>personOf(v.id,v.look,v.lookFallback)),...L.TOWN_TYPES.map(t=>guestPerson({kind:'town',who:t.id}))];
 for(const p of people){assert.equal(p.beard,!!(L.HUNTER.get(p.id)?.look.beard||L.VISITOR.get(p.id)?.look?.beard||L.KEEPER.get(p.id)?.look.beard||L.TOWN_TYPE.get(String(p.id).replace('town-',''))?.look?.beard),p.id);if(p.female)assert.equal(p.beard,false,p.id+' is a woman');}
 assert.equal(keeperPerson({keeper:'keeper_b'}).beard,false);assert.equal(keeperPerson({keeper:'keeper_b'}).female,true);assert.equal(keeperPerson({keeper:'nobody'}).id,'keeper_a');
 // Г3: the cassock and the skufia are drawn now, so о. Никодим and Илларион wear their own (no lookFallback).
 for(const p of people){assert.ok(['smith','miner','farmer','officer','gentleman','rider','surveyor','merchant','apothecary','cassock'].includes(p.outfit),`${p.id}: ${p.outfit}`);assert.ok(!p.hat||['tricorn','felt','bonnet','skufia'].includes(p.hat),`${p.id}: ${p.hat}`);}
 assert.equal(personOf('illarion',L.HUNTER.get('illarion').look,L.HUNTER.get('illarion').lookFallback).outfit,'cassock');assert.equal(personOf('illarion',L.HUNTER.get('illarion').look).hat,'skufia');assert.equal(personOf('nikodim',L.VISITOR.get('nikodim').look).outfit,'cassock');
});
// ---- Г3 (GDD 11.3, art.md 4.8): weapons, rags, personal marks, the cassock and skufia, the keeper's spectacles and quill,
// the poses of the keeper and of a beaten hunter, the limp. Sprites are drawn into a recording canvas.
import {installDocument,colors,inside} from './canvas-helpers.mjs';
installDocument();
const C=await import('../src/characters.js'),R=await import('../src/character-rig.js'),M=await import('../src/motion.js'),Lr=await import('../src/lore.js');
const hunter=(id,rag=0,extra={})=>{const h=Lr.HUNTER.get(id);return {beard:false,female:false,mature:false,cap:false,carry:false,...h.look,id,marks:h.marks,rag,...extra};};
const cellsOf=im=>new Map(im.cells);
test('the new poses keep both arms whole in every facing, with a sling, a crutch and a limp',()=>{
 for(const pose of['write','stir','read','bow','slump','sit'])assert.ok(R.POSES.includes(pose),pose);
 for(const facing of['up','down','left','right'])for(const pose of R.POSES)for(const opts of[{},{sling:true},{crutch:true,limp:true},{sling:true,crutch:true,limp:true}])for(let frame=0;frame<8;frame++){
  const rig=R.characterRig(facing,pose,frame,'water',0,opts);anatomy(rig.near);anatomy(rig.far);
  for(const arm of[rig.near,rig.far])for(const [x,y]of[arm.shoulder,arm.elbow,arm.wrist])assert.ok(x>10&&x<61&&y>5&&y<62,`${pose} ${facing} ${JSON.stringify(opts)}`);}
 // The arm in a sling is held at the chest whatever the pose; the crutch takes the far hand; the limp dips unevenly.
 for(const pose of['idle','chat','walk','write']){const side=R.characterRig('right',pose,2,'water',0,{sling:true});assert.ok(Math.hypot(side.near.wrist[0]-R.SLING.side[0],side.near.wrist[1]-R.SLING.side[1])<.01,pose);}
 assert.deepEqual(R.characterRig('right','idle',0,'water',0,{crutch:true}).far.wrist.map(Math.round),[24,44]);
 assert.deepEqual(R.DIP_LIMP,[0,-1,-2,-1,1,0,0,1]);assert.notDeepEqual([0,1,2,3,4,5,6,7].map(f=>R.characterRig('right','walk',f,'water',0,{limp:true}).bob),[0,1,2,3,4,5,6,7].map(f=>R.characterRig('right','walk',f).bob));
 assert.deepEqual([0,1,2,3,4].map(f=>R.characterRig('right','bow',f).bob),[1,2,2,1,0],'the bow: lower by 1, 2, 2, 1 px');
});
test('dress: the rag is clamped, the marks come with their rag, the hat goes, the clothes are dusted, and twice is once',()=>{
 const g0=C.dress(hunter('gordey',0)),g1=C.dress(hunter('gordey',1)),g2=C.dress(hunter('gordey',2)),g3=C.dress(hunter('gordey',3)),g9=C.dress(hunter('gordey',9));
 assert.deepEqual(g0.marks,[]);assert.deepEqual(g1.marks,['cuffTorn','mudHigh']);assert.deepEqual(g2.marks,['bandageHead','cuffTorn','hatOnBarrel','mudHigh']);assert.equal(g9.rag,3);
 assert.equal(g0.hat,'tricorn');assert.equal(g1.hat,'tricorn');assert.equal(g2.hat,null,'the tricorn hangs on the barrel');assert.ok(g2.bandageHead&&g2.sling&&!g2.crutch);assert.ok(g3.crutch&&g3.bandageHead);
 assert.notEqual(g1.color,g0.color,'dust on the coat');assert.equal(C.dress(g2).color,g2.color,'dressing a dressed person changes nothing');
 assert.equal(C.dress(hunter('agata',1)).hat,null,'Агата lost her hat');assert.equal(C.dress(hunter('illarion',1)).hat,null,'the skufia is lost');assert.ok(C.dress(hunter('illarion',3)).staffCrutch,'the staff becomes the crutch');
 assert.equal(C.dress(hunter('timofey',3)).cap,false);assert.equal(C.dress(hunter('timofey',2)).cap,true);
 assert.equal(C.dress({id:'x',gear:'cannon'}).gear,null,'an unknown weapon is not drawn');
 for(const h of Lr.HUNTERS){assert.ok(C.WEAPONS.includes(h.look.gear),h.id+' carries a weapon of art.md 4.8');for(const m of[...h.marks.rag1,...h.marks.rag2])assert.ok(C.MARKS.includes(m),`${h.id}: ${m}`);}
});
test('eight hunters × rag 0–3 × poses and facings draw without errors inside their frame, and every rag shows',()=>{
 for(const h of Lr.HUNTERS){let before=null;for(let rag=0;rag<4;rag++){for(const facing of['right','left','down'])for(const pose of['idle','walk','chat','bow','slump']){const im=C.spriteOf(hunter(h.id,rag),facing,pose,pose==='walk'?3:1);if(facing==='left'){assert.equal(im.ops.at(-1).kind,'image','the left is the right in a mirror');continue;}assert.ok(im.ops.length>50,`${h.id} ${rag} ${pose}`);assert.ok(inside(im,80,80),`${h.id} rag ${rag} ${pose} ${facing} stays in its frame`);}
  const now=cellsOf(C.spriteOf(hunter(h.id,rag),'right','idle',0));if(before){let changed=0;for(const [k,v] of now)if(before.get(k)!==v)changed++;assert.ok(changed>=8,`${h.id}: rag ${rag} looks different from rag ${rag-1} (${changed} cells)`);}before=now;}
  const worst=colors(C.spriteOf(hunter(h.id,3),'right','idle',0));assert.ok(worst.has('#eadbb8'),h.id+': bandages of linen');assert.ok(worst.has('#9a2418'),h.id+': a spot of blood');
  assert.ok(colors(C.spriteOf(hunter(h.id,3),'right','idle',0)).has(h.id==='illarion'?'#7a5a3a':'#7b5b3c'),h.id+': a crutch (the staff for Илларион)');}
});
test('the keeper wears spectacles and a quill; the priests a cassock with brass buttons and a skufia',()=>{
 for(const k of Lr.KEEPER_LOOKS){const c=colors(C.spriteOf({...k.look,id:k.id},'down','write',2));assert.ok(c.has('#cfe3e8'),'lenses');assert.ok(c.has('#fff1c7'),'the quill');}
 assert.ok(!colors(C.spriteOf(hunter('gordey'),'down','idle',0)).has('#cfe3e8'),'hunters wear no spectacles');
 assert.ok(colors(C.spriteOf({...Lr.VISITOR.get('nikodim').look,id:'nikodim'},'right','idle',0)).has('#c9a050'),'five brass buttons');
 assert.ok(colors(C.spriteOf(hunter('illarion'),'right','idle',0)).has('#22232b'),'the skufia');
 // The keeper writes with a quill, stirs with a ladle, reads a book; Даро sits in his chair.
 assert.ok(colors(C.spriteOf({...Lr.KEEPER_LOOKS[0].look,id:'keeper_a'},'right','stir',2)).has('#7a5a3a'),'the ladle');
 assert.ok(colors(C.spriteOf({...Lr.KEEPER_LOOKS[0].look,id:'keeper_a'},'down','read',0)).has('#ecdfbf'),'the pages');
 assert.notDeepEqual([...cellsOf(C.spriteOf({...Lr.VISITOR.get('daro').look,id:'daro'},'right','sit',0)).keys()].sort(),[...cellsOf(C.spriteOf({...Lr.VISITOR.get('daro').look,id:'daro'},'right','idle',0)).keys()].sort());
});
test('a badly wounded hunter slumps instead of standing idle and walks at 0.6 of the pace; a win puts a trophy in his hand',()=>{
 const c=document.createElement('canvas'),g=c.getContext('2d');C.paintCharacter(g,{x:40,y:78,pose:'idle',facing:'right'},hunter('marta',3),0,1);C.paintCharacter(g,{x:40,y:78,pose:'idle',facing:'right'},hunter('marta',0),0,1);
 const drawn=c.ops.filter(o=>o.kind==='image').map(o=>o.img);assert.notEqual(drawn[0],C.spriteOf(hunter('marta',3),'right','idle',0),'not the idle frame');assert.equal(drawn[0],C.spriteOf(hunter('marta',3),'right','slump',0));
 const walk=slow=>{const a=M.createActor(0,100);a.slow=slow;M.moveActor(a,300,100);for(let i=0;i<20;i++)M.updateActor(a,.05,i*50);return a.x;};assert.equal(M.createActor(0,0).slow,1);assert.ok(walk(.6)<walk(1)*.7,'the limp is slower');
 assert.ok(colors(C.spriteOf(hunter('gordey',0,{carry:true,trophy:['#cfcfd0']}),'down','idle',0)).has('#cfcfd0'),'the trophy in the hand');
});
