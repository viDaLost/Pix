import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {workProfile} from '../src/crafting.js';

function visitors(s){G.ensureCustomers(s);for(const c of s.customers)G.greetCustomer(s,c.id);return s.customers;}
function deliverable(s,o){
  G.beginWork(s,o.recipe,o.material,o.rune,null,o.design||'balanced');
  for(const action of ['prepare','heat','hammer'])G.advanceWork(s,action,.9);
  G.advanceWork(s,'quench','water');return G.advanceWork(s,'finish',o.finish||'plain');
}

test('personal requests need a conversation and reserve neither payment nor materials',()=>{
  const s=G.newGame();G.ensureCustomers(s);const c=s.customers[0],before=structuredClone(s);
  assert.equal(G.commissionOffer(s,c.id),null);assert.throws(()=>G.acceptCommission(s,c.id),G.GameError);assert.deepEqual(s,before);
  G.greetCustomer(s,c.id);const money=s.gold,stock=structuredClone(s.resources),o=G.acceptCommission(s,c.id);
  assert.equal(o.deadline,3);assert.equal(s.gold,money);assert.deepEqual(s.resources,stock);assert.equal(s.completed,0);
  assert.equal(G.commissionOffer(s,c.id),null);const accepted=structuredClone(s);
  assert.throws(()=>G.acceptCommission(s,c.id),G.GameError);assert.deepEqual(s,accepted);
});
test('two active requests cap the workload; cancelling never removes goods or permits the same offer twice',()=>{
  const s=G.newGame(),guests=visitors(s);G.craft(s,'knife');
  const first=G.acceptCommission(s,guests[0].id);G.acceptCommission(s,guests[1].id);const full=structuredClone(s);
  assert.throws(()=>G.acceptCommission(s,guests[2].id),G.GameError);assert.deepEqual(s,full);
  G.cancelCommission(s,first.id);assert.deepEqual(s.stock,full.stock);assert.deepEqual(s.resources,full.resources);assert.equal(s.gold,full.gold);
  assert.equal(G.commissionOffer(s,guests[0].id),null);G.acceptCommission(s,guests[2].id);assert.equal(s.commissions.length,2);
});
test('requested construction is mandatory and one delivered item pays exactly once across reloads',()=>{
  let s=G.newGame();s.skills.push('precision');visitors(s);const o=G.acceptCommission(s,s.customers[0].id),wrong=deliverable(s,{...o,design:'balanced'});
  assert.equal(o.design,'sturdy');const before=structuredClone(s);assert.throws(()=>G.fulfill(s,o.id,wrong.id),G.GameError);assert.deepEqual(s,before);
  const item=deliverable(s,o);s=G.deserialize(G.serialize(s));const gold=s.gold,xp=s.xp;
  G.fulfill(s,o.id,item.id);assert.equal(s.gold,gold+o.reward);assert.equal(s.xp,xp+16);assert.equal(s.rapport[o.client],2);assert.equal(s.commissions.length,0);assert.equal(s.stock.length,1);
  const paid=structuredClone(s);assert.throws(()=>G.fulfill(s,o.id,item.id),G.GameError);assert.deepEqual(s,paid);
});
test('personal request expiry keeps the unfinished item, stock, money and materials',()=>{
  const s=G.newGame();visitors(s);const o=G.acceptCommission(s,s.customers[0].id),item=deliverable(s,o),gold=s.gold,resources=structuredClone(s.resources);
  G.endDay(s);G.endDay(s);assert.equal(s.commissions.length,1);G.endDay(s);
  assert.equal(s.commissions.length,0);assert.ok(s.stock.some(i=>i.id===item.id));assert.equal(s.gold,gold);assert.deepEqual(s.resources,resources);
  assert.throws(()=>G.fulfill(s,o.id,item.id),G.GameError);
});
test('all eight people ask for accessible goods with their own construction, finish, rune and metal preferences',()=>{
  const seen=new Set();
  for(let day=1;day<=8;day++){
    const s=G.newGame();s.day=day;s.skills.push('precision');s.technologies.push('alloys','runes','lunar');s.equipment.grindstone=1;s.blueprints=G.RECIPES.filter(r=>!r.starter).map(r=>r.id);
    for(const c of visitors(s)){
      const o=G.commissionOffer(s,c.id);seen.add(c.client);assert.ok(G.knownRecipe(s,o.recipe));assert.ok(G.knownMaterial(s,o.material));assert.ok(!o.design||G.designAvailable(s,o.design));assert.ok(o.reward>G.itemValue({...o,quality:o.quality+6}));
      if(c.client==='bren')assert.equal(o.finish,'sharpen');if(c.client==='daro')assert.equal(o.finish,'polish');if(c.client==='elin')assert.equal(o.material,'moon');
      if(o.finish)assert.equal(G.orderMatches({...o,finish:'plain'},o),false);
    }
  }assert.equal(seen.size,8);
});
test('legacy saves add optional settings without losing progress; malformed new requests are rejected',()=>{
  const s=G.newGame();G.craft(s,'knife');G.ensureCustomers(s);delete s.commissions;delete s.music;delete s.volume;const old=G.deserialize(G.serialize(s));
  assert.deepEqual(old.stock,s.stock);assert.equal(old.gold,s.gold);assert.deepEqual(old.commissions,[]);assert.equal(old.music,false);assert.equal(old.volume,.6);
  old.volume=5;assert.equal(G.deserialize(old).volume,1);old.volume=-5;assert.equal(G.deserialize(old).volume,0);
  visitors(old);const o=G.acceptCommission(old,old.customers[0].id);old.commissions.push({...o});assert.throws(()=>G.deserialize(old),G.GameError);
  old.commissions=[{...o,finish:'free-money'}];assert.throws(()=>G.deserialize(old),G.GameError);
});
test('requests never demand an unavailable finish when the guard has no weapon patterns yet',()=>{
  for(let day=1;day<=8;day++)for(const precision of [false,true]){
    const s=G.newGame();s.day=day;s.equipment.grindstone=1;if(precision)s.skills.push('precision');
    for(const c of visitors(s)){
      const o=G.commissionOffer(s,c.id);assert.ok(G.knownRecipe(s,o.recipe));
      if(o.finish)assert.ok(G.finishOptions({...s,work:{recipe:o.recipe}}).some(f=>f.id===o.finish));
    }
  }
  const s=G.newGame();G.ensureCustomers(s);s.customers[0].id='buyer-invalid';assert.throws(()=>G.deserialize(s),G.GameError);
});
test('every new pattern has a distinct processing route and completes through all five stages',()=>{
  const kinds=new Set();for(const id of ['horseshoe','shears','compass','bell']){
    const s=G.newGame();G.learnRecipe(s,id);const before=structuredClone(s.resources);G.beginWork(s,id);G.cancelWork(s);assert.deepEqual(s.resources,before);
    const item=deliverable(s,{recipe:id,material:'iron',rune:'none'});assert.equal(item.recipe,id);assert.equal(s.crafted,1);assert.ok(item.quality>=90);kinds.add(workProfile({recipe:id,material:'iron'}).kind);
    assert.equal(G.deserialize(G.serialize(s)).stock[0].recipe,id);
  }assert.equal(kinds.size,4);
});
test('all sixteen encounter choices pay costs now, persist midway and deliver rewards once at home',()=>{
  for(const event of G.ROUTE_EVENTS)for(const choice of event.choices){
    let s=G.newGame();s.flags=['mine','ruins'];s.technologies=['lunar'];G.beginTrip(s,event.region);s.trip.encounter=event.id;
    const original=structuredClone(s.resources),gold=s.gold,xp=s.xp;
    assert.equal(G.resolveEncounter(s,choice.id),null);assert.equal(s.gold,gold);assert.equal(s.xp,xp);
    for(const id of Object.keys(original))assert.equal(s.resources[id],original[id]-(choice.costs[id]||0));
    assert.equal(s.trip.step,1);assert.deepEqual(s.trip.encounterResult,{event:event.id,choice:choice.id});
    s=G.deserialize(G.serialize(s));const halfway=structuredClone(s);assert.throws(()=>G.resolveEncounter(s,choice.id),G.GameError);assert.deepEqual(s,halfway);
    const result=G.tripAction(s,'help');assert.equal(s.trip,null);assert.equal(s.gold,gold+result.gold);assert.equal(s.xp,xp+result.xp);
    for(const id of Object.keys(original))assert.equal(s.resources[id],original[id]-(choice.costs[id]||0)+(result.found[id]||0));
    if(choice.blueprint)assert.ok(s.blueprints.includes(result.blueprint));if(choice.relic)assert.equal(s.relics.length,1);
    if(choice.route==='help')assert.equal(s.rapport[event.person],1);
    const paid=structuredClone(s);assert.throws(()=>G.tripAction(s,'help'),G.GameError);assert.deepEqual(s,paid);
  }
});
test('an unaffordable event is atomic and still offers a free path; retreat gives no loot',()=>{
  const s=G.newGame();G.beginTrip(s,'forest');s.trip.encounter='forest-bridge';s.resources.wood=0;const before=structuredClone(s);
  assert.throws(()=>G.resolveEncounter(s,'repair'),G.GameError);assert.deepEqual(s,before);G.resolveEncounter(s,'salvage');G.retreatTrip(s);
  assert.equal(s.resources.wood,0);assert.equal(s.gold,before.gold);assert.equal(s.energy,4);assert.equal(s.xp,0);
});
test('ordinary expeditions and legacy midway saves remain playable; foreign encounters are rejected',()=>{
  let s=G.newGame();G.beginTrip(s,'forest');delete s.trip.encounter;s=G.deserialize(G.serialize(s));G.tripAction(s,'gather');
  s=G.deserialize(G.serialize(s));G.tripAction(s,'search');assert.equal(s.trip,null);assert.ok(s.resources.wood>10);
  const invalid=G.newGame();G.beginTrip(invalid,'forest');invalid.trip.encounter='mine-cart';assert.throws(()=>G.deserialize(invalid),G.GameError);
});
test('archive reward becomes a small payment when all patterns are already known',()=>{
  const s=G.newGame();s.flags.push('ruins');s.blueprints=G.RECIPES.filter(r=>!r.starter).map(r=>r.id);G.beginTrip(s,'ruins');s.trip.encounter='ruins-record';G.resolveEncounter(s,'copy');
  assert.equal(s.trip.blueprint,null);assert.equal(s.trip.gold,8);const count=s.blueprints.length;G.tripAction(s,'help');assert.equal(s.blueprints.length,count);
});
test('resting alone cannot inflate regular request rewards; earned mastery has a bounded bonus',()=>{
  const novice=G.newGame(123),waited=G.newGame(123);waited.day=10000;G.ensureOrders(novice);G.ensureOrders(waited);
  assert.deepEqual(waited.orders.map(o=>o.reward),novice.orders.map(o=>o.reward));
  waited.orders=[];waited.xp=1000000;G.ensureOrders(waited);
  for(const o of waited.orders)assert.ok(o.reward<=Math.round(G.recipeById(o.recipe).base*1.6+30));
  assert.equal(G.deserialize(G.serialize(waited)).orders.length,2);
});
