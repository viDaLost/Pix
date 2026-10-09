import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import * as J from '../src/jewelry.js';
import {addPolish} from '../src/jewel-art.js';
import {layoutGems} from '../src/patterns.js';

const grid=d=>Array.from({length:144},(_,i)=>({x:(i%12+.5)*100/12,y:(Math.floor(i/12)+.5)*100/12})).filter(p=>J.onMetal(p,d));
// Luxury probe: the top of the skill tree must stay sellable, so buyers' budgets keep growing with the work done.
// A polished piece with diamonds goes to a copy of the game that gets the skills and materials it needs;
// it passes when some guest takes it at the full price within four days.
function luxury(src,type,metal,layout){
 const s=J.deserialize(J.serialize(src));for(const id of['gold','facets','alchemy'])if(!s.skills.includes(id))s.skills.push(id);
 J.startDesign(s,type,'oval',metal);const d=s.draft.design;d.gems=layoutGems(d,layout,{kind:'diamond',size:3});addPolish(d,grid(d),.1);
 for(const[id,n]of Object.entries(J.costs(d).resources))s.materials[id]=Math.max(s.materials[id],n);s.stock=[];const item=J.complete(s);
 for(let day=1;day<=4;day++){const offers=s.customers.filter(c=>!c.served).map(c=>J.quote(s,item,c,'fair'));if(offers.some(q=>q.accepted))return {day,fair:Math.max(...offers.map(q=>q.fair))};J.nextDay(s);}
 return {day:0,fair:0};
}

function play(seed,finish){
 const s=J.newGame(seed);let lowestGold=s.gold,buys=0,saturation=0,early=null;
 const material=(id,n)=>{if(s.materials[id]<n){const count=n-s.materials[id];assert.ok(s.gold>=(J.METALS[id]||J.GEMS[id]).price*count,'replacement materials affordable');J.buy(s,id,count);buys++;}};
 for(let turn=0;turn<60;turn++){
  for(const a of J.AREAS)if(s.crafted>=a.need&&!s.daily.areas.includes(a.id)&&s.energy)J.gather(s,a.id);
  for(const t of J.TOOLS)if(!s.skills.includes(t.id)&&s.xp>=t.xp&&s.gold>=t.cost+100&&t.parents.every(p=>s.skills.includes(p)))J.learn(s,t.id);
  const type=J.TYPES[turn%J.TYPES.length].id,actual=J.typeAvailable(s,type)?type:'amulet',template=['oval','leaf','heart','diamond'][Math.floor(turn/6)%4],metal=s.skills.includes('gold')&&turn%5===0?'gold':turn%3===0?'silver':'copper';
  J.startDesign(s,actual,template,metal);const d=s.draft.design,center=actual==='ring'?{x:50,y:24}:actual==='sword'?{x:50,y:75}:actual==='staff'?{x:50,y:24}:{x:50,y:48};d.gems.push({kind:turn%2?'garnet':'amethyst',...center,size:2.5,cut:'round'});
  const y=center.y;d.strokes.push({kind:'rune',width:1,points:[{x:center.x-3,y:y-4},{x:center.x-2,y:y-2},center]});
  const points=[];for(let i=0;i<6;i++){const p={x:center.x+Math.cos(i)*7,y:y+Math.sin(i)*7};if(J.onMetal(p,d))points.push(p);}if(points.length>=2)d.strokes.push({kind:'engrave',width:1,points});
  const polishCells=grid(d);addPolish(d,polishCells.slice(0,Math.ceil(polishCells.length*finish)),.1);
  for(const[id,n]of Object.entries(J.costs(d).resources))material(id,n);const item=J.complete(s);let offer=null;
  for(let day=0;day<4&&!offer;day++){
   offer=s.customers.filter(c=>!c.served).map(c=>({c,q:J.quote(s,item,c,'fair')})).filter(v=>v.q.accepted).sort((a,b)=>b.q.price-a.q.price)[0];
   if(!offer)J.nextDay(s);
  }
  assert.ok(offer,'some buyer can afford the work');const q=J.sell(s,item.id,offer.c.id);if(q.demand.factor<1)saturation++;
  assert.ok(s.gold>=0);assert.ok(Object.values(s.materials).every(n=>n>=0));lowestGold=Math.min(lowestGold,s.gold);
  if(s.customers.every(c=>c.served)||turn%3===2)J.nextDay(s);
  // At this pace the second rank comes on day 5–6, after about 18 pieces.
  if(s.crafted===18)early=luxury(s,'ring','gold','pair');
  J.deserialize(J.serialize(s));
 }
 assert.equal(s.crafted,60);assert.equal(s.sold,60);assert.equal(s.skills.length,J.TOOLS.length,'every atelier skill reachable without grants');assert.ok(s.gold>180);
 return {seed,finish,day:s.day,gold:s.gold,lowestGold,buys,saturation,early,late:luxury(s,'pendant','lunar','trio')};
}
const runs=[];for(const finish of [.25,.6,.95])for(let seed=1;seed<=40;seed++)runs.push(play(seed,finish));
// A repeatable design is profitable when fresh, but loses its replacement margin once saturated.
const s=J.newGame(11),d=J.makeDesign('pendant','oval','silver');d.gems.push({kind:'amethyst',x:50,y:49,size:3,cut:'round'});addPolish(d,[{x:50,y:50}],60);
const item={id:'probe',design:d},buyer={client:'bren',budget:10000},raw=J.rawValue(d),fresh=J.quote(s,item,buyer).price;s.demand.push({signature:J.fingerprint(d),sales:4,until:s.tradeDay+7});const tired=J.quote(s,item,buyer).price;assert.ok(fresh>raw);assert.ok(tired<raw);assert.equal(tired,Math.round(fresh*.25));
const dayRange=[Math.min(...runs.map(r=>r.day)),Math.max(...runs.map(r=>r.day))],goldRange=[Math.min(...runs.map(r=>r.gold)),Math.max(...runs.map(r=>r.gold))];
// Each probe must sell in at least 90% of the runs; the rank budgets of the next version add to this margin.
const share=key=>runs.filter(r=>r[key].day).length/runs.length,range=key=>{const v=runs.map(r=>r[key].fair).filter(Boolean);return [Math.min(...v),Math.max(...v)];};
const lux={early:{share:share('early'),fair:range('early')},late:{share:share('late'),fair:range('late')}};
assert.ok(lux.early.share>=.9,`a gold ring with two diamonds sells at the full price in ${lux.early.share*100}% of runs`);assert.ok(lux.late.share>=.9,`a moon-alloy pendant with three diamonds sells at the full price in ${lux.late.share*100}% of runs`);
const report=`# Экономика ювелирной мастерской v8\n\nКоманда: \`npm run balance\`. Это проверка правил и достижимости развития; интерес и удобство рисования нужно проверять с игроками.\n\n120 сценариев: 40 начальных seed и обработка 25%, 60%, 95% поверхности. В каждом создано и продано 60 изделий, открыты все шесть навыков, оружейные оправы и три места находок. Монеты, материалы и опыт не добавлялись напрямую: использованы реальные закупки, сбор, изготовление и продажи. После каждого изделия сохранение перечитано валидатором. Дни: ${dayRange.join('–')}; итоговые монеты: ${goldRange.join('–')}. Все запасы и остаток монет остаются неотрицательными.\n\nКонтрольный серебряный кулон: материалы ${raw} монет, полная цена для подходящего покупателя ${fresh}, после насыщения ${tired}. Продажа одного и того же изделия после четвёртой полной продажи не покрывает закупку материалов. Спрос оценивает нормализованную форму, вырезы, композицию гравировки, рун и расположение камней. Смена названия, толщины, материала, цвета, зеркальное отражение и малое смещение не сбрасывают семью дизайна.\n\nНасыщение длится семь **торговых дней с продажами**. Пропуск пустых дней его не сокращает. Полные цены и личные заказы учитываются вместе; две продажи со скидкой или по встречной цене ниже 95% от полной считаются одной полной, поэтому скидками нельзя продавать один рисунок бесконечно. Для порта дизайн остаётся новым до первой продажи по полной цене. Новый тип или существенно новая композиция получают отдельный спрос.\n\nМастерство умножает всю цену: множитель 0,7 + 0,006 × мастерство, то есть ×1,00 при 50, ×1,15 при 75 и ×1,24 при 90. Полировка золотого изделия поэтому приносит больше, чем медного.\n\nБюджеты покупателей растут на 8 монет за каждое созданное изделие без верхнего предела, чтобы вершина развития окупалась. Пробник роскоши проверяет это на копии игры с нужными навыками и материалами: золотое кольцо с двумя алмазами после 18 изделий кто-то из гостей берёт по полной цене не позже чем за четыре дня в ${Math.round(lux.early.share*100)}% прогонов (полная цена от ${lux.early.fair[0]} до ${lux.early.fair[1]} монет); лунный кулон с тремя алмазами после 60 изделий — в ${Math.round(lux.late.share*100)}% (от ${lux.late.fair[0]} до ${lux.late.fair[1]} монет). Порог проверки — 90%.\n\nМастерство зависит от целостности контура, устойчивости камней, гравировки и обработанной площади. Художественная оценка описывает симметрию, сдержанность, насыщенность, текучесть формы и сочетание камней; вкусы жителей различаются. Магические свойства возникают при связи поддерживаемого камня с руной. Это правила игры, а не универсальная оценка красоты.\n\nПри пустом кошельке берег доступен бесплатно и даёт три порции меди и камень. Небольшую свободную оправу можно сделать из одной порции меди и продать, затем покупать материалы или продолжать собирать находки.\n`;
if(process.argv.includes('--write')){await mkdir(new URL('../docs/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/BALANCE.md',import.meta.url),report);}
console.log(JSON.stringify({playthroughs:runs.length,creations:runs.length*60,finish:[.25,.6,.95],dayRange,goldRange,control:{replacement:raw,fresh,saturated:tired},luxury:lux,allPassed:true},null,2));
