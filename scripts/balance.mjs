import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
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

// The bot plays through the progress wrappers, like the interface: the book, reputation, ranks, the connoisseur
// and the rank budgets all take part.
function design(s,turn){const type=J.TYPES[turn%J.TYPES.length].id,actual=J.typeAvailable(s,type)?type:'amulet',template=['oval','leaf','heart','diamond'][Math.floor(turn/6)%4],metal=s.skills.includes('gold')&&turn%5===0?'gold':turn%3===0?'silver':'copper';
  J.startDesign(s,actual,template,metal);const d=s.draft.design,center=actual==='ring'?{x:50,y:24}:actual==='sword'?{x:50,y:75}:actual==='staff'?{x:50,y:24}:{x:50,y:48};d.gems.push({kind:turn%2?'garnet':'amethyst',...center,size:2.5,cut:'round'});
  const y=center.y;d.strokes.push({kind:'rune',width:1,points:[{x:center.x-3,y:y-4},{x:center.x-2,y:y-2},center]});
  const points=[];for(let i=0;i<6;i++){const p={x:center.x+Math.cos(i)*7,y:y+Math.sin(i)*7};if(J.onMetal(p,d))points.push(p);}if(points.length>=2)d.strokes.push({kind:'engrave',width:1,points});return d;}
// The best offer at the fair price within four days; null when nobody takes it.
function offer(s,item){for(let day=0;day<4;day++){const o=s.customers.filter(c=>!c.served).map(c=>({c,q:J.quote(s,item,c,'fair')})).filter(v=>v.q.accepted).sort((a,b)=>b.q.price-a.q.price)[0];if(o)return o;P.nextDay(s);}return null;}
function play(seed,finish){
 const s=P.newGame(seed);let lowestGold=s.gold,buys=0,saturation=0,early=null,rankDay=0;
 const material=(id,n)=>{if(s.materials[id]<n){const count=n-s.materials[id];assert.ok(s.gold>=(J.METALS[id]||J.GEMS[id]).price*count,'replacement materials affordable');P.buy(s,id,count);buys++;}};
 for(let turn=0;turn<60;turn++){
  for(const a of J.AREAS)if(s.crafted>=a.need&&!s.daily.areas.includes(a.id)&&s.energy)P.gather(s,a.id);
  for(const t of J.TOOLS)if(!s.skills.includes(t.id)&&s.xp>=t.xp&&s.gold>=t.cost+100&&t.parents.every(p=>s.skills.includes(p)))P.learn(s,t.id);
  const d=design(s,turn),polishCells=grid(d);addPolish(d,polishCells.slice(0,Math.ceil(polishCells.length*finish)),.1);
  for(const[id,n]of Object.entries(J.costs(d).resources))material(id,n);const {item}=P.complete(s),o=offer(s,item);
  assert.ok(o,'some buyer can afford the work');const q=P.sell(s,item.id,o.c.id);if(q.demand.factor<1)saturation++;
  assert.ok(s.gold>=0);assert.ok(Object.values(s.materials).every(n=>n>=0));lowestGold=Math.min(lowestGold,s.gold);
  if(!rankDay&&J.rankOf(s)>=1)rankDay=s.day;
  if(s.customers.every(c=>c.served)||turn%3===2)P.nextDay(s);
  // The luxury probe runs as soon as the second rank is reached.
  if(!early&&J.rankOf(s)>=2)early={...luxury(s,"ring","gold","pair"),crafted:s.crafted,at:s.day};
  P.load(J.serialize(s));
 }
 assert.equal(s.crafted,60);assert.equal(s.sold,60);assert.equal(s.skills.length,J.TOOLS.length,'every atelier skill reachable without grants');assert.ok(s.gold>180);
 assert.ok(s.rep>=100,`reputation after 60 varied pieces is ${s.rep}`);assert.ok(rankDay&&rankDay<=3,`the first rank came on day ${rankDay}`);assert.ok(early,'the second rank is reached');
 return {seed,finish,day:s.day,gold:s.gold,lowestGold,buys,saturation,rep:s.rep,rank:J.rankOf(s),rankDay,friend:Math.max(...J.CLIENTS.map(p=>J.bondLevel(s,p.id))),helpers:J.CLIENTS.filter(p=>J.privileged(s,p.id)).length,letters:s.mail.length,book:Object.keys(s.book.e).length,marks:Object.keys(s.book.m).length,early,late:luxury(s,'pendant','lunar','trio')};
}
// The same saved model, restored and sold sixty times: reputation must not be farmed by repetition.
// Only this probe gets coins for its materials.
function monotone(seed){
 const s=P.newGame(seed);const d=design(s,0);addPolish(d,grid(d),.1);const model=J.remember(s);s.draft=null;
 for(let i=0;i<60;i++){J.restoreModel(s,model.id);s.gold=Math.max(s.gold,500);for(const[id,n]of Object.entries(J.costs(s.draft.design).resources))if(s.materials[id]<n)P.buy(s,id,n-s.materials[id]);
  const {item}=P.complete(s),o=offer(s,item);if(o)P.sell(s,item.id,o.c.id);if(s.customers.every(c=>c.served)||i%3===2)P.nextDay(s);}
 return s.rep;
}
const runs=[];for(const finish of [.25,.6,.95])for(let seed=1;seed<=40;seed++)runs.push(play(seed,finish));
const repeat=Array.from({length:20},(_,i)=>monotone(i+1));assert.ok(Math.max(...repeat)<70,`one model repeated sixty times earns ${Math.max(...repeat)} reputation`);
// A repeatable design is profitable when fresh, but loses its replacement margin once saturated.
const s=J.newGame(11),d=J.makeDesign('pendant','oval','silver');d.gems.push({kind:'amethyst',x:50,y:49,size:3,cut:'round'});addPolish(d,[{x:50,y:50}],60);
const item={id:'probe',design:d},buyer={client:'bren',budget:10000},raw=J.rawValue(d),fresh=J.quote(s,item,buyer).price;s.demand.push({signature:J.fingerprint(d),sales:4,until:s.tradeDay+7});const tired=J.quote(s,item,buyer).price;assert.ok(fresh>raw);assert.ok(tired<raw);assert.equal(tired,Math.round(fresh*.25));
const dayRange=[Math.min(...runs.map(r=>r.day)),Math.max(...runs.map(r=>r.day))],goldRange=[Math.min(...runs.map(r=>r.gold)),Math.max(...runs.map(r=>r.gold))];
const span=fn=>{const v=runs.map(fn);return [Math.min(...v),Math.max(...v)];},ranks={rep:span(r=>r.rep),firstRankDay:span(r=>r.rankDay),secondRank:{pieces:span(r=>r.early.crafted),day:span(r=>r.early.at)},finalRank:span(r=>r.rank),book:span(r=>r.book),marks:span(r=>r.marks),repeated:[Math.min(...repeat),Math.max(...repeat)]},friends={top:span(r=>r.friend),helpers:span(r=>r.helpers),letters:span(r=>r.letters)};
// Each probe must sell in at least 90% of the runs: a gold ring as soon as the second rank is reached, a moon-alloy pendant after 60 pieces.
const share=key=>runs.filter(r=>r[key].day).length/runs.length,range=key=>{const v=runs.map(r=>r[key].fair).filter(Boolean);return [Math.min(...v),Math.max(...v)];};
const lux={early:{share:share('early'),fair:range('early')},late:{share:share('late'),fair:range('late')}};
assert.ok(lux.early.share>=.9,`a gold ring with two diamonds sells at the full price in ${lux.early.share*100}% of runs`);assert.ok(lux.late.share>=.9,`a moon-alloy pendant with three diamonds sells at the full price in ${lux.late.share*100}% of runs`);
// A range of one value reads as that value: «в день 1», not «в день 1–1».
const fmt=([a,b])=>a===b?String(a):`${a}–${b}`;
const names=J.RANKS.map(r=>`${r.name} — ${r.rep}`).join(', '),bonus=J.RANKS.map(r=>r.budget).join('/');
const report=`# Экономика ювелирной мастерской v8

Команда: \`npm run balance\`. Это проверка правил и достижимости развития; интерес и удобство рисования нужно проверять с игроками.

120 сценариев: 40 начальных seed и обработка 25%, 60%, 95% поверхности. В каждом создано и продано 60 изделий, открыты все шесть навыков, оружейные оправы и три места находок. Бот играет через те же обёртки \`P.*\`, что и интерфейс, поэтому в сценариях работают книга мастера, репутация, звания, знаток дня, бюджеты званий, дружба и помощь жителей. Монеты, материалы и опыт не добавлялись напрямую: использованы реальные закупки, сбор, изготовление и продажи. После каждого изделия сохранение перечитано валидатором и нормализацией. Дни: ${fmt(dayRange)}; итоговые монеты: ${fmt(goldRange)}. Все запасы и остаток монет остаются неотрицательными.

Контрольный серебряный кулон: материалы ${raw} монет, полная цена для подходящего покупателя ${fresh}, после насыщения ${tired}. Продажа одного и того же изделия после четвёртой полной продажи не покрывает закупку материалов. Спрос оценивает нормализованную форму, вырезы, композицию гравировки, рун и расположение камней. Смена названия, толщины, материала, цвета, зеркальное отражение и малое смещение не сбрасывают семью дизайна.

Насыщение длится семь **торговых дней с продажами**. Пропуск пустых дней его не сокращает. Полные цены и личные заказы учитываются вместе; две продажи со скидкой или по встречной цене ниже 95% от полной считаются одной полной, поэтому скидками нельзя продавать один рисунок бесконечно. Для порта дизайн остаётся новым до первой продажи по полной цене. Новый тип или существенно новая композиция получают отдельный спрос.

Мастерство умножает всю цену: множитель 0,7 + 0,006 × мастерство, то есть ×1,00 при 50, ×1,15 при 75 и ×1,24 при 90. Полировка золотого изделия поэтому приносит больше, чем медного.

## Репутация и звания

Звания и пороги репутации: ${names}. Репутация только растёт и приходит только за полные продажи (+1, ещё +1 при совпадении со вкусом от 70, +2 за дизайн, новый для порта, +2 за первую полную продажу этому жителю, +2 за продажу знатоку дня), заказы (+4), первые записи в книге мастера (+1, не больше 4 за изделие), клейма (+3) и собранные главы (+10). Скидки, встречные цены ниже 95% и насыщенные продажи репутации не дают.

В разнообразной игре бота репутация после 60 изделий — ${fmt(ranks.rep)} (порог проверки — не меньше 100); первое звание приходит в день ${fmt(ranks.firstRankDay)} (порог — не позже третьего), второе — после ${fmt(ranks.secondRank.pieces)} изделий, в день ${fmt(ranks.secondRank.day)}. Книга мастера к концу: записей — ${fmt(ranks.book)}, клейм — ${fmt(ranks.marks)}. Монотонный пробник (seed 1–20) сохраняет первую модель и 60 раз восстанавливает и продаёт её по полной цене; монеты на материалы выдаются только ему. Он набирает ${fmt(ranks.repeated)} репутации (порог — меньше 70), то есть повтором звание «Мастер цеха» не получить.

Бюджеты покупателей растут на 8 монет за каждое созданное изделие без верхнего предела, и к ним прибавляется бонус звания ${bonus}, чтобы вершина развития окупалась. Знаток дня (со звания «Ювелир лавки») получает кошелёк ×1,6 и платит за свежий для порта дизайн полную цену ×1,2; общий множитель всех таких надбавок ограничен ×1,4. Пробник роскоши проверяет продажи дорогих вещей на копии игры с нужными навыками и материалами: золотое кольцо с двумя алмазами, сделанное сразу по достижении второго звания, кто-то из гостей берёт по полной цене не позже чем за четыре дня в ${Math.round(lux.early.share*100)}% прогонов (полная цена от ${lux.early.fair[0]} до ${lux.early.fair[1]} монет); лунный кулон с тремя алмазами после 60 изделий — в ${Math.round(lux.late.share*100)}% (от ${lux.late.fair[0]} до ${lux.late.fair[1]} монет). Порог проверки — 90%.

## Дружба и цеховой смотр

Бот продаёт тем, кто больше заплатит, и не выполняет заказов, поэтому дружба у него растёт только за полные продажи по вкусу (+1 от 60%, +2 от 80%). К 60-му изделию самая крепкая дружба — ${fmt(friends.top)}-я ступень из пяти; третьей ступени, на которой житель начинает помогать мастерской, достигают ${fmt(friends.helpers)} из восьми жителей; писем к концу — ${fmt(friends.letters)}. Помощь жителей только добавляет: скидки Ады (−10% на металлы) и Серы (−15% на изумруды и сапфиры), камни Миры у двери, лишнее серебро, медь и пара камней на поисках. Проверка доступности замены материалов в прогонах по-прежнему считает полную цену поставщика, поэтому она осталась строже, чем сама игра. Цеховой смотр бот не посещает: медали и ленты проверяются тестами (\`tests/guild.test.mjs\`), лента прибавляет к цене 5% за ступень в общем потолке ×1,4.

## Оценка и запасной путь

Мастерство зависит от целостности контура, устойчивости камней, гравировки и обработанной площади. Художественная оценка описывает симметрию, сдержанность, насыщенность, текучесть формы и сочетание камней; вкусы жителей различаются. Магические свойства возникают при связи поддерживаемого камня с руной. Это правила игры, а не универсальная оценка красоты.

При пустом кошельке берег доступен бесплатно и даёт три порции меди и камень. Небольшую свободную оправу можно сделать из одной порции меди и продать, затем покупать материалы или продолжать собирать находки.
`;
if(process.argv.includes('--write')){await mkdir(new URL('../docs/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/BALANCE.md',import.meta.url),report);}
console.log(JSON.stringify({playthroughs:runs.length,creations:runs.length*60,finish:[.25,.6,.95],dayRange,goldRange,control:{replacement:raw,fresh,saturated:tired},ranks,friends,luxury:lux,allPassed:true},null,1));
