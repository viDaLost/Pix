import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';

test('first lantern can be forged and delivered with starting resources', () => {
  const s = G.newGame(); G.ensureOrders(s);
  const item = G.craft(s,'lantern','iron','none',74);
  assert.equal(s.energy,4); assert.equal(s.resources.iron,6); assert.equal(s.resources.coal,7);
  assert.equal(s.stock.length,1); assert.equal(item.quality,74);
  G.fulfill(s,'mira-light',item.id);
  assert.equal(s.gold,145); assert.equal(s.storyIndex,1); assert.equal(s.stock.length,0);
  assert.equal(G.regionAvailable(s,'mine'),false);
  const reports = G.endDay(s);
  assert.equal(reports[0].clientName,'Мира'); assert.equal(s.resources.iron,12);
  assert.equal(G.regionAvailable(s,'mine'),true);
  G.endDay(s); assert.equal(s.resources.iron,12); assert.equal(s.expeditions.length,0);
});

test('failed crafting spends neither resources nor energy', () => {
  const s = G.newGame(); s.resources.iron = 0;
  const before = structuredClone(s);
  assert.throws(() => G.craft(s,'lantern'),G.GameError);
  assert.deepEqual(s,before);
  assert.throws(() => G.craft(s,'sword'),G.GameError);
  assert.deepEqual(s,before);
});

test('apprentice batches are atomic when the third item cannot be paid for', () => {
  const s = G.newGame(); s.upgrades.apprentice=1; s.resources.iron=5;
  const before = structuredClone(s);
  assert.throws(() => G.batchCraft(s,'knife','iron','none',3),G.GameError);
  assert.deepEqual(s,before);
  const items = G.batchCraft(s,'knife','iron','none',2);
  assert.equal(items.length,2); assert.equal(s.energy,4); assert.equal(s.gold,68);
  assert.equal(s.resources.iron,1); assert.equal(items[0].quality,72);
});

test('story requirements check quality, metal, and rune', () => {
  const s = G.newGame(); s.storyIndex=3; s.blueprints=['sword']; s.technologies=['alloys']; s.resources.iron=20; s.resources.copper=20;
  const wrong = G.craft(s,'sword','iron','none',90);
  assert.throws(() => G.fulfill(s,'bren-sword',wrong.id),G.GameError);
  const low = G.craft(s,'sword','bronze','none',60);
  assert.throws(() => G.fulfill(s,'bren-sword',low.id),G.GameError);
  const good = G.craft(s,'sword','bronze','none',90);
  G.fulfill(s,'bren-sword',good.id); assert.equal(s.storyIndex,4);
  assert.equal(s.stock.length,2);
});

test('premium sale requires demand, then sale cannot be repeated', () => {
  const s = G.newGame(); const item = G.craft(s,'lantern','iron','none',80);
  const before = structuredClone(s);
  assert.throws(() => G.sell(s,item.id,'premium'),G.GameError); assert.deepEqual(s,before);
  s.day=3; const price = G.sell(s,item.id,'premium'); assert.ok(price > G.itemValue(item));
  const gold = s.gold; assert.throws(() => G.sell(s,item.id),G.GameError); assert.equal(s.gold,gold);
});

test('caravan goods support resale and reset their purchase limit every day', () => {
  const s = G.newGame(); const initial = s.gold;
  const item = G.buyTradeItem(s); G.sell(s,item.id); assert.ok(s.gold > initial);
  G.buyTradeItem(s); G.buyTradeItem(s);
  assert.throws(() => G.buyTradeItem(s),G.GameError);
  G.endDay(s); assert.equal(s.marketToday,0);
});

test('locked recipes, spells, technologies and regions cannot be bypassed', () => {
  const s = G.newGame();
  for (const callback of [() => G.craft(s,'sword'), () => G.craft(s,'knife','bronze'), () => G.craft(s,'knife','iron','guard'), () => G.learnTechnology(s,'lunar'), () => G.explore(s,'ruins'), () => G.buyMaterial(s,'moon')]) {
    const before = structuredClone(s); assert.throws(callback,G.GameError); assert.deepEqual(s,before);
  }
});

test('exploration is deterministic and spends two energy for useful materials', () => {
  const a = G.newGame(123), b = G.newGame(123);
  assert.deepEqual(G.explore(a,'forest'),G.explore(b,'forest'));
  assert.equal(a.energy,4); assert.ok(a.resources.wood>=14); assert.ok(a.resources.coal>=10);
  a.upgrades.furnace=1; assert.ok(G.explore(a,'mine').iron>=4);
});

test('restoring, studying and salvaging relics have distinct outcomes', () => {
  const s = G.newGame(); s.relics=[{id:21,recipe:'amulet',day:1},{id:22,recipe:'key',day:1},{id:23,recipe:'lantern',day:1}]; s.nextId=24;
  G.processRelic(s,21,'study'); assert.ok(G.knownRecipe(s,'amulet')); assert.equal(s.stock.length,0);
  G.processRelic(s,22,'restore'); assert.equal(s.stock[0].quality,82); assert.equal(s.stock[0].recipe,'key');
  const iron = s.resources.iron, crystals = s.resources.crystal;
  G.processRelic(s,23,'salvage'); assert.equal(s.resources.iron,iron+3); assert.equal(s.resources.crystal,crystals+2);
  assert.equal(s.relics.length,0); assert.equal(s.energy,3);
  assert.throws(() => G.processRelic(s,23,'salvage'),G.GameError);
});

test('upgrade and research unlock bronze and extra daily energy', () => {
  const s = G.newGame(); s.gold=500;
  G.upgrade(s,'furnace'); G.learnTechnology(s,'alloys');
  const item = G.craft(s,'knife','bronze','none',74); assert.equal(item.quality,78);
  G.buyMaterial(s,'wood',3); G.upgrade(s,'bench'); G.upgrade(s,'bench'); G.endDay(s);
  assert.equal(s.energy,8); assert.equal(G.maxEnergy(s),8);
});

test('save round-trip preserves inventory and pending story rewards', () => {
  const s = G.newGame(); G.ensureOrders(s);
  const item = G.craft(s,'lantern','iron','none',74); G.fulfill(s,'mira-light',item.id);
  G.buyTradeItem(s); const loaded = G.deserialize(G.serialize(s));
  assert.deepEqual(loaded.stock,s.stock); assert.deepEqual(loaded.orders,s.orders); assert.equal(loaded.gold,s.gold);
  assert.equal(G.endDay(loaded).length,1); assert.ok(loaded.flags.includes('mine'));
});

test('malformed saves are rejected and optional fields are normalized', () => {
  assert.throws(() => G.deserialize('{bad'),SyntaxError);
  assert.throws(() => G.deserialize({version:99}),G.GameError);
  for (const mutate of [s => s.resources.iron=-1, s => s.stock=[null], s => s.upgrades.furnace=9, s => s.orders=[{id:'x'}], s => s.expeditions=[{story:'missing',due:1}]]) {
    const s = G.newGame(); mutate(s); assert.throws(() => G.deserialize(s),G.GameError);
  }
  const s = G.newGame(); s.collection=null; s.log=[null]; s.tutorial='invalid';
  const fixed = G.deserialize(s); assert.deepEqual(fixed.collection,[]); assert.deepEqual(fixed.log,[]); assert.equal(fixed.tutorial,0);
});

test('duplicate inventory or expedition IDs cannot duplicate rewards', () => {
  const s = G.newGame(); const item = G.craft(s,'knife'); s.stock.push({...item});
  assert.throws(() => G.deserialize(s),G.GameError);
  s.stock.pop(); s.expeditions=[{story:'mira-light',due:2},{story:'mira-light',due:2}];
  assert.throws(() => G.deserialize(s),G.GameError);
});

test('a bankrupt player can recover without a reset', () => {
  const s = G.newGame(); s.gold=0; for (const id in s.resources) s.resources[id]=0;
  G.endDay(s); assert.ok(s.resources.iron>=3); assert.ok(s.resources.coal>=2);
  const item = G.craft(s,'knife','iron','none',74); G.sell(s,item.id); assert.ok(s.gold>0);
});

test('all five story chapters are reachable from a real new game without injected resources', () => {
  const s = G.newGame(199); G.ensureOrders(s);
  function rest(energy=2) { if (s.energy < energy) G.endDay(s); }
  function earn(target) {
    let turns=0;
    while (s.gold < target) {
      assert.ok(++turns<250,'economy must make forward progress'); rest();
      if (!G.canAfford(s,G.craftCosts(s,'knife','copper'))) { G.explore(s,'forest'); continue; }
      const item = G.craft(s,'knife','copper','none',74);
      if (!G.saleQuote(s,item,'quick').accepted) G.endDay(s);
      G.sell(s,item.id,'quick');
    }
  }
  function supplies(costs) { for (const [id,n] of Object.entries(costs)) while (s.resources[id]<n) { earn(G.purchasePrice(s,id,3)); G.buyMaterial(s,id,3); } }
  function improve(id) { const u = G.UPGRADES.find(x=>x.id===id), level=s.upgrades[id]; supplies(u.costs[level]); earn(u.prices[level]); G.upgrade(s,id); }
  function research(id) { const t=G.TECHNOLOGIES.find(x=>x.id===id); earn(t.cost); rest(1); G.learnTechnology(s,id); }
  function blueprint(id) { const r=G.recipeById(id); earn(r.learn); rest(1); G.learnRecipe(s,id); }
  function chapter() { const story=G.currentStory(s), metal=story.material||'iron', rune=story.rune||'none'; supplies(G.craftCosts(s,story.recipe,metal,rune)); rest(); const item=G.craft(s,story.recipe,metal,rune,74); G.fulfill(s,story.id,item.id); G.endDay(s); }
  chapter(); chapter(); improve('bench'); research('runes'); blueprint('amulet'); chapter();
  improve('furnace'); research('alloys'); blueprint('sword'); chapter();
  improve('furnace'); research('lunar'); blueprint('staff'); chapter();
  assert.equal(s.storyIndex,5); assert.equal(s.ended,true); assert.ok(s.flags.includes('beacon')); assert.ok(s.gold>=0);
  assert.ok(s.day<60,`progression is excessively slow: ${s.day} days`);
});
