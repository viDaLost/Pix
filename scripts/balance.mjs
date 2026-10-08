import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import * as G from '../src/game.js';

const all=G.newGame();all.technologies=['alloys','runes','lunar'];all.blueprints=G.RECIPES.map(r=>r.id);
const rows=G.RECIPES.map(r=>{
  const costs=G.workCosts(all,r.id),cost=Object.entries(costs).reduce((n,[id,count])=>n+G.purchasePrice(all,id,count),0),price=G.saleQuote(all,{recipe:r.id,material:'iron',rune:'none',quality:80},'quick').price;
  assert.ok(price>cost,`${r.id} must cover replacement materials`);return {name:r.name,cost,price,profit:price-cost};
});
let minMargin=Infinity;for(const r of G.RECIPES)for(const material of ['iron','copper','bronze','moon'])for(const rune of Object.keys(G.RUNES)){
  const cost=Object.entries(G.workCosts(all,r.id,material,rune)).reduce((n,[id,count])=>n+G.purchasePrice(all,id,count),0),price=G.saleQuote(all,{recipe:r.id,material,rune,quality:80},'quick').price;
  minMargin=Math.min(minMargin,price-cost);assert.ok(price>cost,`${r.id}/${material}/${rune}: negative replacement margin`);
}

function play(seed,accuracy){
  const s=G.newGame(seed);G.ensureOrders(s);G.ensureCustomers(s);let decisions=0,trips=0,lowestGold=s.gold;
  const checkpoint=()=>{assert.ok(++decisions<2000,'progress stalled');assert.ok(s.gold>=0);assert.ok(Object.values(s.resources).every(n=>n>=0));lowestGold=Math.min(lowestGold,s.gold);};
  const rest=(energy=2)=>{if(s.energy<energy)G.endDay(s);};
  const work=(id,material='iron',rune='none',design='balanced',finish='plain')=>{
    rest();G.beginWork(s,id,material,rune,null,design);for(const a of ['prepare','heat','hammer'])G.advanceWork(s,a,accuracy);G.advanceWork(s,'quench','water');return G.advanceWork(s,'finish',finish);
  };
  function collect(){rest();G.beginTrip(s,'forest');const e=G.routeEvent(s.trip.encounter),choice=e.choices.find(c=>G.canAfford(s,c.costs));G.resolveEncounter(s,choice.id);G.tripAction(s,'gather');trips++;checkpoint();}
  function earn(target){while(s.gold<target){rest();if(!G.canAfford(s,G.workCosts(s,'knife','copper'))){collect();continue;}
    const item=work('knife','copper');let c=s.customers.find(c=>!c.served);if(!c){G.endDay(s);c=s.customers[0];}if(!c.greeted)G.greetCustomer(s,c.id);G.serveCustomer(s,c.id,item.id,'quick');checkpoint();
  }}
  function supplies(costs){for(const [id,n]of Object.entries(costs))while(s.resources[id]<n){earn(G.purchasePrice(s,id,3));G.buyMaterial(s,id,3);checkpoint();}}
  function improve(id){const u=G.UPGRADES.find(u=>u.id===id),level=s.upgrades[id];supplies(u.costs[level]);earn(u.prices[level]);G.upgrade(s,id);checkpoint();}
  function skill(id){const node=G.SKILLS.find(n=>n.id===id);earn(node.cost);while(G.mastery(s).points<node.points)earn(s.gold+20);rest(1);G.learnSkill(s,id);checkpoint();}
  function pattern(id){earn(G.recipeById(id).learn);rest(1);G.learnRecipe(s,id);checkpoint();}
  function chapter(){const o=G.currentStory(s);supplies(G.workCosts(s,o.recipe,o.material||'iron',o.rune||'none'));const item=work(o.recipe,o.material||'iron',o.rune||'none');G.fulfill(s,o.id,item.id);G.endDay(s);checkpoint();}
  chapter();chapter();skill('precision');improve('bench');skill('runes');pattern('amulet');chapter();improve('furnace');skill('alloys');pattern('sword');chapter();improve('furnace');skill('lunar');pattern('staff');chapter();
  assert.ok(s.ended&&s.storyIndex===5);assert.ok(s.day<60);G.deserialize(G.serialize(s));
  // After the story, unlock and forge the four new patterns using earned funds.
  for(const id of ['horseshoe','shears','compass','bell']){pattern(id);supplies(G.workCosts(s,id));const item=work(id);assert.equal(item.recipe,id);const buyer=s.customers.find(c=>!c.served);if(buyer){if(!buyer.greeted)G.greetCustomer(s,buyer.id);if(G.customerQuote(s,item,buyer.id,'quick').accepted)G.serveCustomer(s,buyer.id,item.id,'quick');}checkpoint();}
  return {seed,accuracy,day:s.day,trips,gold:s.gold,level:G.mastery(s).level,lowestGold,decisions};
}
const runs=[];for(const accuracy of [.4,.7,.95])for(let seed=1;seed<=40;seed++)runs.push(play(seed,accuracy));
const dayRange=[Math.min(...runs.map(r=>r.day)),Math.max(...runs.map(r=>r.day))],tripRange=[Math.min(...runs.map(r=>r.trips)),Math.max(...runs.map(r=>r.trips))];
const report=`# Проверка экономики v6\n\nЭто воспроизводимая проверка правил, а не измерение интереса или удержания настоящих игроков. Команда: \`npm run balance\`.\n\nПроверены 256 сочетаний изделия, металла и руны при качестве 80. Закупка всех расходников по полной цене окупается быстрой продажей: минимальная разница **${minMargin} монет**. Стоимость обучения и улучшений в эту разницу не входит. Силы ограничивают число изделий в день; спрос и бюджет покупателя проверяются отдельно.\n\n| Изделие | Расходники | Быстрая продажа | Разница |\n| --- | ---: | ---: | ---: |\n${rows.map(r=>`| ${r.name} | ${r.cost} | ${r.price} | ${r.profit} |`).join('\n')}\n\n120 прохождений с 40 начальными seed и точностью работы 0,4 / 0,7 / 0,95 завершили все пять глав, затем открыли и изготовили четыре новых изделия. День завершения этого сценария: **${dayRange.join('–')}**, число лесных вылазок: **${tripRange.join('–')}**. День — игровой цикл без реального ожидания. Деньги и материалы не добавлялись напрямую; использованы ручная работа, NPC, закупки, встречи, навыки и отдых. После каждого сценария сохранение успешно перечитано.\n\nЛичные заказы дают 25% над расчётной ценностью вещи, 16 опыта и +2 отношения; срок — текущий день +2. Заказы ограничены двумя активными, новый заказ у того же посетителя после отмены недоступен. Просрочка оставляет вещь и материалы игроку. Обычные новые заказы дают бонус от заработанного мастерства (до 30 монет), поэтому пропуск дней не увеличивает награды. Ранее принятые заказы сохраняют свою цену.\n\nПри банкротстве следующий день даёт небольшой набор материалов гильдии, если не хватает железа или угля; бесплатный вариант встречи и обычный маршрут доступны без закупок. Награды вылазки начисляются после второй остановки, повторное получение невозможно.\n\nНужен последующий плейтест с людьми: время освоения первого изделия, ошибки касаний, частота повторения одних предметов, понятность требований личных заказов и выбор между добычей и покупкой материалов.\n`;
if(process.argv.includes('--write')){await mkdir(new URL('../docs/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/BALANCE.md',import.meta.url),report);}
console.log(JSON.stringify({combinations:256,minReplacementMargin:minMargin,playthroughs:runs.length,accuracy:[.4,.7,.95],dayRange,tripRange,allPassed:true},null,2));
