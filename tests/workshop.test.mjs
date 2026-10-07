import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {createActor,moveActor,updateActor} from '../src/motion.js';
const work=(s,id,metal='iron',rune='none',accuracy=.5,temper='water',finish='plain')=>{
  G.beginWork(s,id,metal,rune);
  for(const stage of ['prepare','heat','hammer'])G.advanceWork(s,stage,accuracy);
  G.advanceWork(s,'quench',temper);
  return G.advanceWork(s,'finish',finish);
};

test('manual work has five mandatory stages and reserves materials only once',()=>{
  const s=G.newGame(),before=structuredClone(s.resources);
  G.beginWork(s,'lantern');assert.equal(s.stock.length,0);assert.equal(s.energy,4);
  assert.equal(s.resources.iron,before.iron-2);assert.equal(s.resources.coal,before.coal-1);
  assert.throws(()=>G.advanceWork(s,'hammer',1),G.GameError);
  assert.throws(()=>G.endDay(s),G.GameError);
  for(const stage of ['prepare','heat','hammer']){G.advanceWork(s,stage,.8);assert.equal(s.stock.length,0);}
  G.advanceWork(s,'quench','water');assert.equal(s.stock.length,0);
  const item=G.advanceWork(s,'finish','plain');assert.equal(item.quality,91);assert.equal(s.stock.length,1);assert.equal(s.work,null);assert.equal(s.xp,12);
  assert.equal(s.resources.iron,before.iron-2);
  assert.throws(()=>G.advanceWork(s,'finish','plain'),G.GameError);
});
test('an unfinished item survives a reload and can be completed once',()=>{
  let s=G.newGame();G.beginWork(s,'pickaxe');G.advanceWork(s,'prepare',.7);G.advanceWork(s,'heat',.8);
  s=G.deserialize(G.serialize(s));assert.equal(s.work.step,2);assert.equal(s.energy,4);
  G.advanceWork(s,'hammer',.8);G.advanceWork(s,'quench','air');const item=G.advanceWork(s,'finish','plain');
  assert.ok(G.itemTraits(item).includes('Лёгкий'));assert.equal(s.crafted,1);
});
test('cancel before cutting refunds resources; cancel later salvages only half the metal',()=>{
  const s=G.newGame(),before=structuredClone(s);
  G.beginWork(s,'knife');G.cancelWork(s);assert.deepEqual(s.resources,before.resources);assert.equal(s.energy,6);
  G.beginWork(s,'knife');G.advanceWork(s,'prepare',.5);G.cancelWork(s);
  assert.equal(s.resources.iron,7);assert.equal(s.resources.wood,9);assert.equal(s.resources.coal,7);assert.equal(s.energy,4);assert.equal(s.xp,0);
});
test('oil and premium finishes require the corresponding equipment and technology',()=>{
  const s=G.newGame();G.beginWork(s,'knife');for(const stage of ['prepare','heat','hammer'])G.advanceWork(s,stage,.8);
  const before=structuredClone(s);assert.throws(()=>G.advanceWork(s,'quench','oil'),G.GameError);assert.deepEqual(s,before);
  s.equipment.barrel=1;s.skills.push('hardening');G.advanceWork(s,'quench','oil');assert.equal(s.gold,77);
  assert.throws(()=>G.advanceWork(s,'finish','sharpen'),G.GameError);s.equipment.grindstone=1;
  const item=G.advanceWork(s,'finish','sharpen');assert.ok(G.itemTraits(item).includes('Острый'));assert.equal(item.finish,'sharpen');
});
test('a restored artifact remains reserved until all stages are complete',()=>{
  const s=G.newGame(),relic=G.buyRelic(s);G.beginWork(s,relic.recipe,'iron','none',relic.id);
  assert.throws(()=>G.processRelic(s,relic.id,'salvage'),G.GameError);
  for(const stage of ['prepare','heat','hammer'])G.advanceWork(s,stage,.5);
  G.advanceWork(s,'quench','water');const item=G.advanceWork(s,'finish','plain');
  assert.equal(item.source,'Восстановлено');assert.equal(s.relics.length,0);assert.equal(s.energy,5);
});
test('skill tree enforces parent nodes, equipment and mastery points',()=>{
  const s=G.newGame();assert.equal(G.mastery(s).points,2);
  assert.throws(()=>G.learnSkill(s,'alloys'),G.GameError);
  G.learnSkill(s,'precision');assert.equal(G.mastery(s).points,1);
  s.gold=500;G.upgrade(s,'furnace');G.learnSkill(s,'alloys');assert.ok(G.knownMaterial(s,'bronze'));
  assert.equal(G.mastery(s).points,0);assert.throws(()=>G.learnSkill(s,'appraisal'),G.GameError);
  G.gainXP(s,30);G.learnSkill(s,'appraisal');assert.equal(G.mastery(s).level,2);
  assert.throws(()=>G.learnSkill(s,'precision'),G.GameError);
});
test('buyers require a conversation and leave once after a successful purchase',()=>{
  const s=G.newGame();G.ensureCustomers(s);const buyer=s.customers[0],item=work(s,'knife');
  assert.throws(()=>G.serveCustomer(s,buyer.id,item.id),G.GameError);
  G.greetCustomer(s,buyer.id);assert.ok(G.customerQuote(s,item,buyer.id).accepted);
  const gold=s.gold,result=G.serveCustomer(s,buyer.id,item.id);assert.equal(s.gold,gold+result.price);assert.equal(s.rapport.mira,1);assert.equal(s.xp,18);
  assert.throws(()=>G.serveCustomer(s,buyer.id,item.id),G.GameError);assert.equal(s.sold,1);
  G.endDay(s);assert.equal(s.customers.length,3);assert.ok(s.customers.every(c=>!c.served));
});
test('a failed haggling offer leaves the item intact and consumes a limited attempt',()=>{
  const s=G.newGame();s.skills.push('appraisal','negotiation');G.ensureCustomers(s);const c=s.customers[0],item=work(s,'knife');G.greetCustomer(s,c.id);
  const gold=s.gold;assert.equal(G.serveCustomer(s,c.id,item.id,'fair',1000).accepted,false);assert.equal(c.attempts,1);assert.equal(s.gold,gold);assert.equal(s.stock.length,1);
  G.serveCustomer(s,c.id,item.id,'fair',1000);assert.throws(()=>G.serveCustomer(s,c.id,item.id,'fair',1000),G.GameError);
  assert.ok(G.serveCustomer(s,c.id,item.id,'quick').accepted);
});
test('expeditions require two choices, persist midway and award loot once',()=>{
  let s=G.newGame();const wood=s.resources.wood;G.beginTrip(s,'forest');assert.equal(s.energy,4);
  assert.throws(()=>G.beginWork(s,'knife'),G.GameError);assert.throws(()=>G.endDay(s),G.GameError);
  assert.equal(G.tripAction(s,'gather'),null);assert.equal(s.resources.wood,wood);
  s=G.deserialize(G.serialize(s));const result=G.tripAction(s,'help');assert.equal(s.resources.wood,wood+5);assert.equal(result.gold,14);assert.equal(s.gold,94);assert.equal(s.trip,null);
  assert.throws(()=>G.tripAction(s,'gather'),G.GameError);
});
test('v1 saves migrate money, inventory, discoveries and previous technologies',()=>{
  const s=G.newGame();G.craft(s,'lantern');s.technologies=['alloys','runes'];s.upgrades.bench=1;s.version=1;
  for(const key of ['xp','skills','equipment','customers','rapport','work','trip'])delete s[key];
  const migrated=G.deserialize(JSON.stringify(s));assert.equal(migrated.version,2);assert.equal(migrated.gold,80);assert.equal(migrated.stock.length,1);
  assert.ok(migrated.skills.includes('precision'));assert.ok(migrated.skills.includes('runes'));assert.equal(migrated.xp,8);assert.equal(migrated.equipment.anvil,0);assert.equal(migrated.customers.length,3);
});
test('invalid stage and expedition progress is rejected rather than silently reset',()=>{
  const s=G.newGame();G.beginWork(s,'knife');s.work.step=2;assert.throws(()=>G.deserialize(s),G.GameError);
  const t=G.newGame();G.beginTrip(t,'forest');t.trip.step=1;assert.throws(()=>G.deserialize(t),G.GameError);
});
test('walking follows a path, changes facing and calls arrival exactly once',()=>{
  const actor=createActor(70,210);let arrivals=0;moveActor(actor,335,185);actor.after=()=>arrivals++;
  for(let i=0;i<500;i++)updateActor(actor,.016,i*16);
  assert.equal(actor.x,335);assert.equal(actor.y,185);assert.equal(actor.pose,'idle');assert.equal(arrivals,1);assert.ok(actor.phase>0);
});
test('all story chapters are reachable through staged work, NPC trading and the skill tree',()=>{
  const s=G.newGame();G.ensureOrders(s);G.ensureCustomers(s);
  const rest=(n=2)=>{if(s.energy<n)G.endDay(s);};
  function earn(target){let loops=0;while(s.gold<target){assert.ok(++loops<250);rest();if(!G.canAfford(s,G.craftCosts(s,'knife','copper'))){G.beginTrip(s,'forest');G.tripAction(s,'gather');G.tripAction(s,'gather');continue;}const item=work(s,'knife','copper');let c=s.customers.find(c=>!c.served);if(!c){G.endDay(s);c=s.customers[0];}G.greetCustomer(s,c.id);G.serveCustomer(s,c.id,item.id,'quick');}}
  function supply(costs){for(const[id,n]of Object.entries(costs))while(s.resources[id]<n){earn(G.purchasePrice(s,id,3));G.buyMaterial(s,id,3);}}
  function upgrade(id){const u=G.UPGRADES.find(u=>u.id===id),level=s.upgrades[id];supply(u.costs[level]);earn(u.prices[level]);G.upgrade(s,id);}
  function skill(id){const n=G.SKILLS.find(n=>n.id===id);earn(n.cost);while(G.mastery(s).points<n.points)earn(s.gold+20);rest(1);G.learnSkill(s,id);}
  function recipe(id){earn(G.recipeById(id).learn);rest(1);G.learnRecipe(s,id);}
  function chapter(){const o=G.currentStory(s),metal=o.material||'iron',rune=o.rune||'none';supply(G.craftCosts(s,o.recipe,metal,rune));rest();const item=work(s,o.recipe,metal,rune);G.fulfill(s,o.id,item.id);G.endDay(s);}
  chapter();chapter();skill('precision');upgrade('bench');skill('runes');recipe('amulet');chapter();
  upgrade('furnace');skill('alloys');recipe('sword');chapter();upgrade('furnace');skill('lunar');recipe('staff');chapter();
  assert.equal(s.storyIndex,5);assert.ok(s.ended);assert.ok(s.day<60);assert.ok(s.xp>0);
});
