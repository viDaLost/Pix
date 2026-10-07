export const SAVE_VERSION = 2;
export const SETTING = {
  year:1740,town:'Велен',name:'Веленский порт',
  intro:'После осеннего шторма маяк погас, а корабли обходят гавань. Развивай кузницу, помогай жителям и верни свет в порт.',
};
export const MATERIALS = {
  iron: { name: 'Железо', short: 'Железо', color: '#9ca6b4', price: 5, value: 1, traits: ['Прочный'], costs: { iron: 1 } },
  copper: { name: 'Медь', short: 'Медь', color: '#d78758', price: 4, value: .9, traits: ['Лёгкий'], costs: { copper: 1 } },
  bronze: { name: 'Бронза', short: 'Бронза', color: '#cdb06a', value: 1.35, traits: ['Прочный', 'Лёгкий'], costs: { iron: 1, copper: 1 }, tech: 'alloys' },
  moon: { name: 'Лунный сплав', short: 'Лунный', color: '#a79bea', price: 22, value: 2, traits: ['Магический', 'Лёгкий'], costs: { moon: 1, iron: 1 }, tech: 'lunar' },
  wood: { name: 'Дерево', color: '#b48661', price: 3 },
  coal: { name: 'Уголь', color: '#646575', price: 3 },
  crystal: { name: 'Кристалл', color: '#8bdfdf', price: 12 },
};
export const RUNES = {
  none: { name: 'Без руны', trait: null, multiplier: 1, costs: {} },
  light: { name: 'Свет', trait: 'Светящийся', multiplier: 1.3, costs: { crystal: 1 }, tech: 'runes' },
  guard: { name: 'Защита', trait: 'Защитный', multiplier: 1.35, costs: { crystal: 1 }, tech: 'runes' },
  frost: { name: 'Мороз', trait: 'Ледяной', multiplier: 1.4, costs: { crystal: 2 }, tech: 'runes' },
};
export const RECIPES = [
  { id: 'knife', name: 'Походный нож', short: 'Нож', metal: 2, wood: 1, base: 31, category: 'tools', starter: true, desc: 'Надёжный спутник путешественника.' },
  { id: 'pickaxe', name: 'Кирка', short: 'Кирка', metal: 3, wood: 2, base: 44, category: 'tools', starter: true, desc: 'Для руды, камня и новых открытий.' },
  { id: 'lantern', name: 'Шахтёрский фонарь', short: 'Фонарь', metal: 2, wood: 1, base: 39, category: 'magic', starter: true, desc: 'Закрытый светильник для сырой шахты.' },
  { id: 'sword', name: 'Портовая сабля', short: 'Сабля', metal: 4, wood: 1, base: 66, category: 'weapons', learn: 35, desc: 'Изогнутый клинок с защитной дужкой для портового караула.' },
  { id: 'shield', name: 'Парадный щит' , short: 'Щит', metal: 3, wood: 3, base: 63, category: 'weapons', learn: 30, desc: 'Цеховой герб на деревянной основе с металлической окантовкой.' },
  { id: 'amulet', name: 'Дорожный амулет', short: 'Амулет', metal: 2, wood: 0, base: 45, category: 'magic', learn: 30, desc: 'Небольшой предмет для большой дороги.' },
  { id: 'hammer', name: 'Молот мастера', short: 'Молот', metal: 4, wood: 2, base: 61, category: 'tools', learn: 40, desc: 'Инструмент, который прослужит долгие годы.' },
  { id: 'ring', name: 'Кольцо', short: 'Кольцо', metal: 1, wood: 0, base: 24, category: 'jewelry', learn: 25, desc: 'Изящная вещь, которую приятно подарить.' },
  { id: 'staff', name: 'Жезл навигатора', short: 'Жезл', metal: 2, wood: 4, base: 70, category: 'magic', learn: 55, desc: 'Алхимический прибор для огня маяка и морских путей.' },
  { id: 'axe', name: 'Лесной топор', short: 'Топор', metal: 3, wood: 2, base: 49, category: 'tools', learn: 35, desc: 'Хороший баланс для работы в лесу.' },
  { id: 'key', name: 'Ключ от архива', short: 'Ключ', metal: 2, wood: 0, base: 36, category: 'magic', learn: 45, desc: 'Бородчатый ключ от запертого архива старого аббатства.' },
  { id: 'goblet', name: 'Парадный кубок', short: 'Кубок', metal: 3, wood: 0, base: 58, category: 'jewelry', learn: 40, desc: 'Украшение витрины и праздничного стола.' },
];
export const TECHNOLOGIES = [
  { id: 'alloys', name: 'Искусство сплавов', cost: 55, desc: 'Открывает бронзу: прочную и лёгкую.', need: 'furnace', level: 1 },
  { id: 'runes', name: 'Рунная гравировка', cost: 65, desc: 'Руны света, защиты и мороза.', need: 'bench', level: 1 },
  { id: 'lunar', name: 'Лунная металлургия', cost: 120, desc: 'Изделия из лунного сплава и путь к перевалу.', need: 'furnace', level: 2 },
];
export const UPGRADES = [
  { id: 'furnace', name: 'Горн', max: 2, prices: [45, 110], costs: [{ iron: 2 }, { iron: 4, crystal: 1 }], desc: ['Открывает сплавы и шахту. +4 к качеству.', 'Открывает лунную металлургию. Ещё +4 к качеству.'] },
  { id: 'bench', name: 'Верстак', max: 2, prices: [45, 100], costs: [{ wood: 4 }, { wood: 6, iron: 3 }], desc: ['Открывает руны и обучение ученика.', 'Новый запас сил: 8 единиц в день.'] },
  { id: 'shelves', name: 'Витрины', max: 2, prices: [40, 90], costs: [{ wood: 3 }, { wood: 5, copper: 2 }], desc: ['Покупатели готовы платить на 8% больше.', 'Ещё +8% к бюджету покупателей.'] },
  { id: 'apprentice', name: 'Ученик', max: 1, prices: [130], costs: [{ wood: 2 }], need: 'bench', desc: ['Изготовление партий без мини-игры. Работа: 6 монет за изделие.'] },
];
export const REGIONS = [
  { id: 'forest', name: 'Тихий лес', subtitle: 'Дерево · медь · уголь', desc: 'Старая тропа за мастерской. Здесь всегда найдётся что-то полезное.', color: '#86af87' },
  { id: 'mine', name: 'Старая шахта', subtitle: 'Железо · кристаллы', desc: 'Фонарь Миры осветил новый путь под землю.', color: '#cb9f6d' },
  { id: 'ruins', name: 'Руины аббатства', subtitle: 'Артефакты · чертежи', desc: 'Заброшенное аббатство хранит алхимические записи прошлого века.', color: '#a896d8' },
  { id: 'pass', name: 'Лунный перевал', subtitle: 'Лунный камень · кристаллы', desc: 'Редкий металл ждёт за вершинами гор.', color: '#9ac7dc' },
];
export const CLIENTS = [
  {id:'mira',name:'Мира',role:'Рудокоп',outfit:'miner',female:true,color:'#9b7652',hair:'#593d32',skin:'#deb28d'},
  {id:'bren',name:'Брен',role:'Портовый караул',outfit:'officer',color:'#435b7b',hair:'#634637',skin:'#cea07e'},
  {id:'ada',name:'Ада',role:'Купчиха',outfit:'merchant',female:true,color:'#9b6261',hair:'#543b32',skin:'#c99478'},
  {id:'elin',name:'Элин',role:'Картограф',outfit:'surveyor',female:true,color:'#547b8a',hair:'#8e683f',skin:'#e0b598'},
  {id:'rowan',name:'Рован',role:'Землевладелец',outfit:'farmer',color:'#7c8153',hair:'#6a4a34',skin:'#c99573'},
  {id:'sera',name:'Сера',role:'Аптекарь',outfit:'apothecary',female:true,color:'#82718c',hair:'#af9471',skin:'#e3b99e'},
  {id:'nora',name:'Нора',role:'Проводница',outfit:'rider',female:true,color:'#567967',hair:'#92593a',skin:'#d9aa84'},
  {id:'daro',name:'Даро',role:'Антиквар',outfit:'gentleman',color:'#916948',hair:'#b5ac94',skin:'#d4a98e'},
];
export const EQUIPMENT = [
  { id: 'anvil', name: 'Наковальня', icon: 'anvil', max: 2, prices: [45,95], costs: [{iron:3},{iron:5,copper:2}], desc: 'Точная ковка: +2 к качеству за уровень.' },
  { id: 'bellows', name: 'Меха', icon: 'bellows', max: 2, prices: [35,75], costs: [{wood:3},{wood:4,copper:2}], desc: 'Зелёная зона нагрева шире. Управлять огнём проще.' },
  { id: 'barrel', name: 'Закалочная ванна', icon: 'barrel', max: 1, prices: [40], costs: [{wood:4,iron:1}], desc: 'Открывает закалку в масле после изучения термообработки.' },
  { id: 'grindstone', name: 'Точильный круг', icon: 'grindstone', max: 1, prices: [65], costs: [{iron:3,wood:2}], desc: 'Заточка и полировка: дополнительные свойства и цена.' },
  { id: 'engraver', name: 'Рунный резец', icon: 'amulet', max: 1, prices: [70], costs: [{copper:3,crystal:2}], need: 'runes', desc: 'Точная гравировка даёт +4 к качеству зачарованных вещей.' },
  { id: 'toolkit', name: 'Походный набор', icon: 'backpack', max: 1, prices: [55], costs: [{iron:2,wood:2}], desc: 'В каждой вылазке получаешь ещё 2 единицы основного материала.' },
];
// Grid coordinates also define the visual layout of the technology tree.
export const SKILLS = [
  {id:'basics',name:'Первая искра',icon:'forge',branch:'root',row:0,col:1,parents:[],points:0,cost:0,desc:'Горн, наковальня и три первых чертежа. Начало пути мастера.'},
  {id:'precision',name:'Точная работа',icon:'anvil',branch:'craft',row:1,col:0,parents:['basics'],points:1,cost:25,desc:'+3 к качеству всех изготовленных вещей.'},
  {id:'appraisal',name:'Оценка вещей',icon:'coin',branch:'trade',row:1,col:1,parents:['basics'],points:1,cost:25,desc:'Видишь точный бюджет покупателя и его оценку изделия.'},
  {id:'scouting',name:'Разведка троп',icon:'explore',branch:'travel',row:1,col:2,parents:['basics'],points:1,cost:25,desc:'Сбор в экспедициях приносит дополнительные материалы.'},
  {id:'alloys',name:'Искусство сплавов',icon:'bronze',branch:'craft',row:2,col:0,parents:['precision'],points:1,cost:55,need:'furnace',level:1,desc:'Открывает бронзу: прочный и лёгкий сплав железа и меди.'},
  {id:'negotiation',name:'Искусство торга',icon:'handshake',branch:'trade',row:2,col:1,parents:['appraisal'],points:1,cost:50,desc:'Можно предлагать свою цену. Бюджет покупателя выше на 10%.'},
  {id:'cartography',name:'Заметки путника',icon:'map',branch:'travel',row:2,col:2,parents:['scouting'],points:1,cost:40,desc:'Поиск тайников всегда приносит кристалл и чаще — чертёж.'},
  {id:'runes',name:'Рунная гравировка',icon:'amulet',branch:'craft',row:3,col:0,parents:['precision'],points:1,cost:65,need:'bench',level:1,desc:'Открывает руны света, защиты и мороза; путь к руинам.'},
  {id:'showcase',name:'Слава лавки',icon:'shop',branch:'trade',row:3,col:1,parents:['negotiation'],points:1,cost:60,desc:'Каждый день в лавку приходят два дополнительных покупателя.'},
  {id:'ruinlore',name:'Архивы аббатства',icon:'relic',branch:'travel',row:3,col:2,parents:['cartography'],points:1,cost:60,desc:'Открывает руины аббатства. При поиске там всегда находишь артефакт.'},
  {id:'hardening',name:'Термообработка',icon:'barrel',branch:'craft',row:4,col:0,parents:['alloys'],points:1,cost:55,desc:'Закалка в масле даёт свойство «Острый» и повышает ценность.'},
  {id:'hospitality',name:'Свои люди',icon:'star',branch:'trade',row:4,col:1,parents:['showcase'],points:1,cost:75,desc:'Знакомые покупатели платят больше; отношения растут быстрее.'},
  {id:'pathfinder',name:'Дальний путь',icon:'backpack',branch:'travel',row:4,col:2,parents:['ruinlore'],points:1,cost:80,desc:'Помощь путникам приносит больше монет и опыта. +1 к запасу сил.'},
  {id:'lunar',name:'Лунный металл',icon:'moon',branch:'craft',row:5,col:0,parents:['alloys','runes'],points:2,cost:120,need:'furnace',level:2,desc:'Открывает лунный сплав и перевал на карте.'},
  {id:'mastercraft',name:'Печать мастера',icon:'crown',branch:'craft',row:6,col:0,parents:['lunar','hardening'],points:2,cost:160,desc:'+5 к качеству. Твоя подпись повышает цену ручной работы на 10%.'},
];
export const WORK_STAGES = [
  {id:'prepare',name:'Разметка',station:'supplies',icon:'wood'},
  {id:'heat',name:'Нагрев',station:'furnace',icon:'forge'},
  {id:'hammer',name:'Ковка',station:'anvil',icon:'hammer'},
  {id:'quench',name:'Закалка',station:'barrel',icon:'barrel'},
  {id:'finish',name:'Отделка',station:'bench',icon:'grindstone'},
];
export const DESIGNS = [
  {id:'balanced',name:'Обычный',icon:'anvil',value:1,desc:'Универсальная форма без дополнительных затрат.'},
  {id:'sturdy',name:'Усиленный',icon:'shield',value:1.05,trait:'Прочный',desc:'+2 к качеству при точной ковке. Требует на одну порцию металла больше.'},
  {id:'light',name:'Лёгкий',icon:'wind',value:1.03,trait:'Лёгкий',desc:'Экономит одну порцию металла, даёт лёгкость. Качество на 2 ниже.'},
  {id:'ornate',name:'Изящный',icon:'ring',value:1.12,trait:'Изящный',desc:'Для коллекционеров: +12% к цене и изящность. Расходует кристалл.'},
];
export function designAvailable(state,id){return id==='balanced'||(['sturdy','light'].includes(id)&&state.skills.includes('precision'))||(id==='ornate'&&state.equipment.grindstone>0);}
export function workCosts(state,recipe,material='iron',rune='none',design='balanced'){
  check(DESIGNS.some(d=>d.id===design)&&designAvailable(state,design),'Сначала открой точную работу или купи точильный круг.');
  const costs=craftCosts(state,recipe,material,rune),metal=MATERIALS[material].costs;
  if(design==='sturdy')for(const[id,n]of Object.entries(metal))costs[id]=(costs[id]||0)+n;
  if(design==='light')for(const[id,n]of Object.entries(metal))costs[id]=Math.max(n,costs[id]-n);
  if(design==='ornate')costs.crystal=(costs.crystal||0)+1;
  return costs;
}
export function stampOptions(state){return [{id:'none',name:'Без клейма',icon:'anvil'},...(state.crafted>=3?[{id:'ember',name:'Искра',icon:'fire'}]:[]),...(state.crafted>=3&&state.skills.includes('scouting')?[{id:'leaf',name:'Лист',icon:'wood'}]:[]),...(state.skills.includes('mastercraft')?[{id:'star',name:'Мастер',icon:'crown'}]:[])];}
export function markWork(state,id){check(state.work?.step===4,'Клеймо ставится на этапе отделки.');check(stampOptions(state).some(s=>s.id===id),'Сначала создай три изделия или открой нужный навык.');state.work.mark=id;}
export function recordCraftsmanship(state,stats){check(state.work?.step===2&&validCraftsmanship(stats),'Некорректный результат ковки.');state.work.craftsmanship={combo:stats.combo,reheats:stats.reheats,zones:[...stats.zones]};}
function validCraftsmanship(v){return v&&Number.isInteger(v.combo)&&v.combo>=0&&v.combo<=5&&Number.isInteger(v.reheats)&&v.reheats>=0&&v.reheats<=15&&Array.isArray(v.zones)&&v.zones.length===3&&v.zones.every(n=>Number.isInteger(n)&&n>=0&&n<=5)&&v.zones.reduce((a,b)=>a+b,0)===5;}
const BUYER_TASTES = {
  mira:{category:'tools',trait:'Прочный',line:'В шахте вещам достаётся. Ищу прочный инструмент или надёжный свет.'},
  bren:{category:'weapons',trait:'Острый',line:'Караул охраняет пристань. Ищу надёжный клинок с хорошей заточкой.'},
  ada:{category:'magic',trait:'Защитный',line:'Торговый обоз ждёт на почтовой дороге. Ищу защиту для ценного груза.'},
  elin:{category:'magic',trait:'Магический',line:'Для морских карт и огня маяка нужны приборы с редким сплавом и руной.'},
  rowan:{category:'tools',trait:'Прочный',line:'Покажи добротный инструмент. Главное — чтобы служил долго.'},
  sera:{category:'magic',trait:'Светящийся',line:'В аптекарской лаборатории нужен свет. Покажи работу с ясной руной.'},
  nora:{category:'tools',trait:'Лёгкий',line:'В походе важен каждый грамм. Предпочитаю лёгкое снаряжение.'},
  daro:{category:'jewelry',trait:'Изящный',line:'Покупаю украшения для своего кабинета редкостей. Ценю чистую отделку.'},
};
export const STORIES = [
  {id:'mira-light',client:'mira',recipe:'lantern',quality:55,reward:65,fame:6,title:'Фонарь рудной артели',text:'У речной пристани ждут руду. Нужен закрытый фонарь: свечу заливают капли и гасит сквозняк. Завтра артель поделится новой добычей.',returnText:'Фонарь выдержал сырость. Артель вывезла первую партию руды и разрешает тебе искать материалы в штольне.',returns:{iron:6,crystal:2},unlock:'mine'},
  {id:'rowan-pick',client:'rowan',recipe:'pickaxe',quality:60,reward:85,fame:7,title:'Почтовая дорога',text:'Шторм размыл дорогу к старому мосту. Для ремонта нужна крепкая кирка. Если вернём проезд, познакомлю тебя с цеховым поставщиком.',returnText:'Почтовые кареты снова проходят через мост. Поставщик согласился продавать твоей мастерской материалы дешевле.',returns:{wood:6,copper:3},unlock:'supplier'},
  {id:'ada-guard',client:'ada',recipe:'amulet',rune:'guard',quality:65,reward:125,fame:10,title:'Печать торгового обоза',text:'Везу стекло и аптекарские припасы через туманный перевал. Сделай защитный амулет с рунной гравировкой — это цеховая печать для моего груза.',returnText:'Обоз прошёл перевал. Привезла лунный камень и план архива старого аббатства.',returns:{moon:3,crystal:3},unlock:'ruins'},
  {id:'bren-sword',client:'bren',recipe:'sword',material:'bronze',quality:75,reward:160,fame:10,title:'Сабля портового караула',text:'После шторма караул патрулирует пристань по ночам. Гильдия испытывает алхимическую бронзу: выкуй из неё лёгкую саблю с чистой кромкой.',returnText:'Сабля выдержала службу в солёном тумане. Ремесленная гильдия прислала металл и уголь для нового горна.',returns:{iron:8,wood:5,coal:6},unlock:'guild'},
  {id:'elin-staff',client:'elin',recipe:'staff',material:'moon',rune:'light',quality:80,reward:240,fame:18,title:'Огни Веленского порта',text:'По старым чертежам я восстановила линзу маяка. Теперь нужен жезл навигатора из лунного сплава с руной света. Его огонь снова укажет кораблям вход в гавань.',returnText:'Маяк зажёгся. В гавань вернулись торговые суда, а на картах снова отмечен Велен. На вывеске твоей кузницы появился знак гильдии.',returns:{moon:5,crystal:6},unlock:'beacon'},
];
const EVENTS = [
  { name: 'Торговый обоз', category: 'tools', text: 'Поставщики закупают инструменты для почтовой дороги.' },
  { name: 'Караул на пристани', category: 'weapons', text: 'Караулу и цехам нужны клинки и парадные щиты.' },
  { name: 'Ночь в гавани', category: 'magic', text: 'В порту закупают фонари и алхимические приборы.' },
  { name: 'Праздник на площади', category: 'jewelry', text: 'Жители ищут украшения и подарки.' },
];
const recipeById = id => RECIPES.find(r => r.id === id);
const demandEvent = state => EVENTS[(state.day - 1) % EVENTS.length];
export { recipeById, demandEvent };
export class GameError extends Error {}
function check(condition, text) { if (!condition) throw new GameError(text); }
function int(v, fallback = 0, max = 1000000) { return Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : fallback; }
function random(state) { state.seed = ((state.seed * 1664525 + 1013904223) >>> 0); return state.seed / 4294967296; }
function log(state, text) { state.log.unshift({ day: state.day, text }); state.log = state.log.slice(0, 24); }
function add(state, costs, factor = 1) { for (const [key, n] of Object.entries(costs)) state.resources[key] += n * factor; }
export function canAfford(state, costs) { return Object.entries(costs).every(([key, n]) => state.resources[key] >= n); }
function payResources(state, costs) { check(canAfford(state, costs), 'Не хватает материалов. Загляни к поставщику или отправься на поиски.'); add(state, costs, -1); }
export function maxEnergy(state) { return (state.upgrades.bench >= 2 ? 8 : 6) + (state.skills?.includes('pathfinder') ? 1 : 0); }
export function knownRecipe(state, id) { return Boolean(recipeById(id)?.starter || state.blueprints.includes(id)); }
export function knownMaterial(state, id) { const m = MATERIALS[id]; return Boolean(m?.costs && (!m.tech || state.technologies.includes(m.tech))); }
export function regionAvailable(state, id) {
  if (id === 'forest') return true;
  if (id === 'mine') return state.flags.includes('mine') || state.upgrades.furnace >= 1;
  if (id === 'ruins') return state.flags.includes('ruins') || state.technologies.includes('runes') || state.skills?.includes('ruinlore');
  return id === 'pass' && state.technologies.includes('lunar');
}
export function craftCosts(state, id, material = 'iron', rune = 'none') {
  const r = recipeById(id); const m = MATERIALS[material]; const u = RUNES[rune];
  check(r && m?.costs && u, 'Неизвестный рецепт или материал.');
  const costs = { wood: r.wood, coal: 1 };
  for (const [key, n] of Object.entries(m.costs)) costs[key] = (costs[key] || 0) + n * r.metal;
  for (const [key, n] of Object.entries(u.costs)) costs[key] = (costs[key] || 0) + n;
  return Object.fromEntries(Object.entries(costs).filter(([, n]) => n));
}
export function newGame(seed = 246819) {
  return { version: SAVE_VERSION, day: 1, gold: 80, energy: 6, fame: 0, crafted: 0, sold: 0, completed: 0, seed,
    resources: { iron: 8, copper: 6, wood: 10, coal: 8, crystal: 2, moon: 0 },
    upgrades: { furnace: 0, bench: 0, shelves: 0, apprentice: 0 }, technologies: [], blueprints: [], stock: [], relics: [],
    flags: [], storyIndex: 0, expeditions: [], orders: [], soldToday: {}, marketToday: 0, collection: [], log: [],
    nextId: 1, tutorial: 0, sound: false, welcomed: false, lastSaved: 0, ended: false,
    xp: 0, skills: ['basics'], equipment: Object.fromEntries(EQUIPMENT.map(e => [e.id,0])),
    customers: [], rapport: {}, invitedToday: 0, work: null, trip: null };
}
export function itemValue(item) {
  const r = recipeById(item.recipe); const m = MATERIALS[item.material]; const u = RUNES[item.rune];
  return Math.max(1, Math.round(r.base * m.value * u.multiplier * (.65 + item.quality / 125) * (item.finish === 'polish' || item.finish === 'sharpen' ? 1.06 : 1) * (item.signature ? 1.1 : 1) * (DESIGNS.find(d=>d.id===item.design)?.value||1) * (item.mark&&item.mark!=='none'?1.04:1)));
}
export function itemName(item) { return recipeById(item.recipe)?.name || 'Изделие'; }
export function itemTraits(item) { return [...new Set([...MATERIALS[item.material].traits, ...(RUNES[item.rune].trait ? [RUNES[item.rune].trait] : []), ...(item.temper === 'oil' || item.finish === 'sharpen' ? ['Острый'] : []), ...(item.temper === 'air' ? ['Лёгкий'] : []), ...(item.finish === 'polish' ? ['Изящный'] : []), ...(DESIGNS.find(d=>d.id===item.design)?.trait?[DESIGNS.find(d=>d.id===item.design).trait]:[])])]; }
export function craft(state, id, material = 'iron', rune = 'none', quality = 70, automatic = false) {
  check(!state.work && !state.trip, 'Сначала заверши текущую работу или вылазку.');
  check(knownRecipe(state, id), 'Сначала изучи этот чертёж.');
  check(knownMaterial(state, material), 'Сначала изучи технологию этого сплава.');
  check(RUNES[rune] && (!RUNES[rune].tech || state.technologies.includes(RUNES[rune].tech)), 'Изучи рунную гравировку.');
  check(Number.isFinite(quality) && quality >= 0 && quality <= 100, 'Качество должно быть от 0 до 100.');
  check(!automatic || state.upgrades.apprentice > 0, 'Сначала найми ученика.');
  check(state.stock.length < 60, 'Витрина заполнена. Продай изделия или выполни заказ.');
  const energy = automatic ? 1 : 2; const fee = automatic ? 6 : 0;
  check(state.energy >= energy, 'На сегодня силы закончились. Заверши день, чтобы отдохнуть.');
  check(state.gold >= fee, 'Не хватает монет для работы ученика.');
  const costs = craftCosts(state, id, material, rune); payResources(state, costs);
  state.energy -= energy; state.gold -= fee;
  const item = { id: state.nextId++, recipe: id, material, rune, quality: Math.min(100, Math.round(quality + state.upgrades.furnace * 4)), day: state.day, source: automatic ? 'Ученик' : 'Кузница' };
  state.stock.push(item); state.crafted++; gainXP(state, automatic ? 5 : 8);
  if (!state.collection.includes(id)) state.collection.push(id);
  if (id === 'lantern') state.tutorial = Math.max(state.tutorial, 1);
  log(state, `${automatic ? 'Ученик изготовил' : 'Создано'}: ${itemName(item)} · качество ${item.quality}.`);
  return item;
}
export function batchCraft(state, id, material, rune, count = 2) {
  check(Number.isInteger(count) && count >= 1 && count <= 3, 'В партии от 1 до 3 изделий.');
  const draft = structuredClone(state); const items = [];
  for (let i = 0; i < count; i++) items.push(craft(draft, id, material, rune, 72, true));
  Object.assign(state, draft); return items;
}
export function buyMaterial(state, id, count = 3) {
  check(MATERIALS[id]?.price && Number.isInteger(count) && count > 0 && count <= 99, 'Недопустимая закупка.');
  check(id !== 'moon' || state.technologies.includes('lunar') || state.flags.includes('ruins'), 'Лунный камень появится после возвращения обоза или изучения технологии.');
  const price = purchasePrice(state, id, count); check(state.gold >= price, `Нужно ${price} монет.`);
  state.gold -= price; state.resources[id] += count; log(state, `Куплено: ${MATERIALS[id].name} ×${count} за ${price} монет.`); return price;
}
export function purchasePrice(state, id, count) { return Math.ceil(MATERIALS[id].price * count * (state.flags.includes('supplier') ? .85 : 1)); }
export function saleQuote(state, item, policy = 'fair') {
  const r = recipeById(item.recipe); const event = demandEvent(state); const saturation = state.soldToday[item.recipe] || 0;
  const base = itemValue(item); const demand = event.category === r.category ? 1.3 : 1;
  const budget = Math.round(base * demand * (1.08 + state.upgrades.shelves * .08) * Math.max(.72, 1 - saturation * .07));
  const price = Math.round(base * ({ quick: .85, fair: 1, premium: 1.25 }[policy] || 1));
  return { price, budget, accepted: price <= budget, demanded: demand > 1, base };
}
export function sell(state, id, policy = 'fair') {
  check(['quick', 'fair', 'premium'].includes(policy), 'Выбери ценовую стратегию.');
  const index = state.stock.findIndex(i => i.id === id); check(index >= 0, 'Предмет уже продан.');
  const item = state.stock[index]; const quote = saleQuote(state, item, policy);
  check(quote.accepted, `Покупатель готов дать ${quote.budget} монет. Снизь цену или дождись спроса.`);
  state.stock.splice(index, 1); state.gold += quote.price; state.sold++; state.soldToday[item.recipe] = (state.soldToday[item.recipe] || 0) + 1;
  state.fame += item.quality >= 80 ? 2 : 1; gainXP(state,3); log(state, `Продано: ${itemName(item)} за ${quote.price} монет.`); return quote.price;
}
export function buyTradeItem(state) {
  check(state.marketToday < 3, 'Все товары обоза на сегодня куплены. Ассортимент обновится завтра.');
  check(state.stock.length < 60, 'Сначала освободи витрину.');
  const recipe = ['knife', 'ring', 'shield'][(state.day - 1 + state.marketToday) % 3];
  const item = { id: state.nextId, recipe, material: 'copper', rune: 'none', quality: 64, day: state.day, source: 'Торговый обоз' };
  const cost = Math.round(itemValue(item) * .75); check(state.gold >= cost, `Нужно ${cost} монет.`);
  state.nextId++; state.gold -= cost; state.stock.push(item); state.marketToday++; log(state, `Товар обоза: ${itemName(item)} за ${cost} монет.`); return item;
}
export function tradeOffer(state) {
  const recipe = ['knife', 'ring', 'shield'][(state.day - 1 + state.marketToday) % 3];
  const item = { recipe, material: 'copper', rune: 'none', quality: 64 };
  return { ...item, cost: Math.round(itemValue(item) * .75), value: itemValue(item) };
}
export function upgrade(state, id) {
  const u = UPGRADES.find(x => x.id === id); check(u, 'Неизвестное улучшение.');
  const level = state.upgrades[id]; check(level < u.max, 'Уже улучшено до максимума.');
  check(!u.need || state.upgrades[u.need] >= 1, 'Сначала улучши верстак.');
  check(state.gold >= u.prices[level], `Нужно ${u.prices[level]} монет.`); payResources(state, u.costs[level]); state.gold -= u.prices[level]; state.upgrades[id]++;
  log(state, `Улучшено: ${u.name} · уровень ${state.upgrades[id]}.`); return state.upgrades[id];
}
export function learnTechnology(state, id) {
  const t = TECHNOLOGIES.find(x => x.id === id); check(t && !state.technologies.includes(id), 'Технология уже изучена или неизвестна.');
  check(state.upgrades[t.need] >= t.level, `Нужен ${t.need === 'furnace' ? 'горн' : 'верстак'} уровня ${t.level}.`);
  check(state.energy >= 1, 'Нужна 1 единица сил. Заверши день, чтобы отдохнуть.'); check(state.gold >= t.cost, `Нужно ${t.cost} монет.`);
  state.gold -= t.cost; state.energy--; state.technologies.push(id); log(state, `Изучена технология: ${t.name}.`);
}
export function learnRecipe(state, id) {
  const r = recipeById(id); check(r && !knownRecipe(state, id), 'Этот чертёж уже изучен.');
  check(state.gold >= r.learn, `Нужно ${r.learn} монет.`); check(state.energy >= 1, 'Нужна 1 единица сил.');
  state.gold -= r.learn; state.energy--; state.blueprints.push(id); log(state, `Новый чертёж: ${r.name}.`);
}
export function explore(state, id) {
  check(!state.work && !state.trip,'Сначала закончи работу или текущую экспедицию.');
  check(REGIONS.some(r => r.id === id) && regionAvailable(state, id), 'Этот путь пока закрыт.');
  check(state.energy >= 2, 'Для вылазки нужны 2 единицы сил. Заверши день, чтобы отдохнуть.');
  state.energy -= 2; const found = {}; const n = () => Math.floor(random(state) * 3);
  if (id === 'forest') Object.assign(found, { wood: 4 + n(), copper: 2 + n(), coal: 2 + n() });
  if (id === 'mine') Object.assign(found, { iron: 4 + n(), coal: 2 + n(), crystal: 1 + Math.floor(random(state) * 2) });
  if (id === 'ruins') {
    Object.assign(found, { crystal: 2 + n(), copper: 2 });
    if (state.relics.length < 20) state.relics.push({ id: state.nextId++, recipe: ['lantern', 'amulet', 'key'][n()], day: state.day });
    const locked = RECIPES.filter(r => !knownRecipe(state, r.id));
    if (locked.length && random(state) > .45) { const r = locked[Math.floor(random(state) * locked.length)]; state.blueprints.push(r.id); log(state, `В руинах найден чертёж: ${r.name}.`); }
  }
  if (id === 'pass') Object.assign(found, { moon: 3 + n(), iron: 3, crystal: 2 });
  add(state, found); gainXP(state,5); log(state, `Вылазка: ${REGIONS.find(r => r.id === id).name}. ${Object.entries(found).map(([k, v]) => `${MATERIALS[k].name} +${v}`).join(', ')}.`);
  return found;
}
export function buyRelic(state) {
  check(state.gold >= 28, 'Для покупки находки нужны 28 монет.'); check(state.relics.length < 20, 'Сначала разбери существующие находки.');
  state.gold -= 28; const relic = { id: state.nextId++, recipe: ['amulet', 'lantern', 'key'][Math.floor(random(state) * 3)], day: state.day }; state.relics.push(relic);
  log(state, 'Куплена древняя находка. Её можно восстановить, изучить или разобрать.'); return relic;
}
export function processRelic(state, id, action) {
  check(state.work?.relicId!==id,'Эта находка уже находится на реставрации.');
  const index = state.relics.findIndex(r => r.id === id); check(index >= 0, 'Находка уже использована.');
  check(['restore', 'study', 'salvage'].includes(action), 'Выбери действие с находкой.');
  check(state.energy >= 1, 'Нужна 1 единица сил.'); const relic = state.relics[index];
  if (action === 'restore') {
    check(state.gold >= 8, 'Нужны 8 монет на восстановление.'); check(state.stock.length < 60, 'Сначала освободи витрину.'); payResources(state, { wood: 2, coal: 1 }); state.gold -= 8;
    state.stock.push({ id: state.nextId++, recipe: relic.recipe, material: 'iron', rune: state.technologies.includes('runes') ? 'light' : 'none', quality: 82, day: state.day, source: 'Восстановлено' }); log(state, `Восстановлено: ${recipeById(relic.recipe).name}.`);
  } else if (action === 'study') {
    const r = !knownRecipe(state, relic.recipe) ? recipeById(relic.recipe) : RECIPES.find(r => !knownRecipe(state, r.id));
    check(r, 'Все чертежи изучены. Восстанови находку или получи материалы.'); state.blueprints.push(r.id); log(state, `Исследование открыло чертёж: ${r.name}.`);
  } else { add(state, { iron: 3, crystal: 2 }); log(state, 'Находка разобрана: железо +3, кристаллы +2.'); }
  state.energy--; state.relics.splice(index, 1);
}
export function currentStory(state) { return STORIES[state.storyIndex] || null; }
export function orderMatches(item, order) { return item.recipe === order.recipe && item.quality >= order.quality && (!order.material || item.material === order.material) && (!order.rune || item.rune === order.rune); }
export function fulfill(state, orderId, itemId) {
  const story = currentStory(state); const isStory = story?.id === orderId;
  const order = isStory ? story : state.orders.find(o => o.id === orderId); check(order, 'Заказ уже выполнен.');
  const itemIndex = state.stock.findIndex(i => i.id === itemId); check(itemIndex >= 0, 'Нужное изделие не найдено.');
  check(orderMatches(state.stock[itemIndex], order), 'Предмет не соответствует требованиям заказа.');
  state.stock.splice(itemIndex, 1); state.gold += order.reward; state.fame += order.fame; state.completed++; gainXP(state,isStory ? 18 : 12);
  if (isStory) { state.storyIndex++; state.tutorial = Math.max(state.tutorial, 2); state.expeditions.push({ story: story.id, due: state.day + 1 }); }
  else state.orders = state.orders.filter(o => o.id !== orderId);
  log(state, `Выполнен заказ «${order.title}». +${order.reward} монет, +${order.fame} репутации.`); return order;
}
export function ensureOrders(state) {
  if (state.orders.length >= 2) return;
  const choices = RECIPES.filter(r => knownRecipe(state, r.id));
  while (state.orders.length < 2) {
    const r = choices[Math.floor(random(state) * choices.length)]; const client = CLIENTS[Math.floor(random(state) * CLIENTS.length)];
    state.orders.push({ id: `order-${state.nextId++}`, client: client.id, recipe: r.id, quality: 55 + Math.floor(random(state) * 3) * 5,
      reward: Math.round(r.base * 1.6 + state.day * 2), fame: 3, title: `Заказ: ${r.short}`, text: 'Нужна добротная вещь для работы и дороги. Материал выбери сам.' });
  }
}
export function endDay(state) {
  check(!state.work && !state.trip, 'Сначала закончи работу или вернись из экспедиции.');
  state.day++; state.energy = maxEnergy(state); state.soldToday = {}; state.marketToday = 0; state.customers = []; state.invitedToday = 0;
  const reports = [];
  for (const expedition of state.expeditions.filter(e => e.due <= state.day)) {
    const story = STORIES.find(s => s.id === expedition.story); add(state, story.returns);
    if (!state.flags.includes(story.unlock)) state.flags.push(story.unlock);
    reports.push({ ...story, clientName: CLIENTS.find(c => c.id === story.client).name }); log(state, `${CLIENTS.find(c => c.id === story.client).name}: ${story.returnText}`);
    if (story.unlock === 'beacon') state.ended = true;
  }
  state.expeditions = state.expeditions.filter(e => e.due > state.day);
  if (state.gold < 15 && (state.resources.iron < 2 || state.resources.coal < 1)) { add(state, { iron: 3, wood: 2, coal: 2 }); log(state, 'Гильдия помогла материалами, чтобы кузница снова работала.'); }
  ensureOrders(state); ensureCustomers(state); state.tutorial = Math.max(state.tutorial, state.storyIndex ? 3 : 0);
  log(state, `Начался день ${state.day}. ${demandEvent(state).name}.`); return reports;
}
export function serialize(state) { return JSON.stringify({ ...state, lastSaved: Date.now() }); }
export function deserialize(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  check(value && [1,SAVE_VERSION].includes(value.version), 'Файл сохранения другого формата.');
  check(Number.isInteger(value.day) && value.day >= 1 && value.resources && value.upgrades, 'Сохранение повреждено.');
  for (const key of ['gold', 'energy', 'fame', 'crafted', 'sold', 'completed', 'seed', 'nextId', 'storyIndex']) check(Number.isFinite(value[key]) && value[key] >= 0, 'Некорректные данные сохранения.');
  for (const key of Object.keys(newGame().resources)) check(Number.isInteger(value.resources[key]) && value.resources[key] >= 0 && value.resources[key] <= 1000000, 'Некорректный запас материалов.');
  for (const u of UPGRADES) check(Number.isInteger(value.upgrades[u.id]) && value.upgrades[u.id] >= 0 && value.upgrades[u.id] <= u.max, 'Некорректное улучшение.');
  check(Array.isArray(value.stock) && value.stock.length <= 60 && Array.isArray(value.relics) && value.relics.length <= 20, 'Некорректный инвентарь.');
  check(value.stock.every(i => i && Number.isInteger(i.id) && i.id > 0 && i.id <= 1000000 && recipeById(i.recipe) && MATERIALS[i.material]?.costs && RUNES[i.rune] && Number.isInteger(i.quality) && i.quality >= 0 && i.quality <= 100), 'Некорректные изделия.');
  check(value.stock.every(i=>(!i.design||DESIGNS.some(d=>d.id===i.design))&&(!i.mark||['none','ember','leaf','star'].includes(i.mark))&&(!i.scores||(Array.isArray(i.scores)&&i.scores.length===3&&i.scores.every(n=>Number.isFinite(n)&&n>=0&&n<=1)))&&(!i.craftsmanship||validCraftsmanship(i.craftsmanship))), 'Некорректные свойства изделия.');
  check(value.relics.every(i => i && Number.isInteger(i.id) && i.id > 0 && i.id <= 1000000 && recipeById(i.recipe)), 'Некорректные находки.');
  const inventoryIds = [...value.stock, ...value.relics].map(i => i.id);
  check(new Set(inventoryIds).size === inventoryIds.length, 'Повторяющиеся предметы в сохранении.');
  check(Array.isArray(value.blueprints) && value.blueprints.every(id => recipeById(id)), 'Некорректные чертежи.');
  check(Array.isArray(value.technologies) && value.technologies.every(id => TECHNOLOGIES.some(t => t.id === id)), 'Некорректные технологии.');
  check(Array.isArray(value.expeditions) && value.expeditions.length <= STORIES.length && value.expeditions.every(e => e && STORIES.some(s => s.id === e.story) && Number.isInteger(e.due) && e.due >= 1), 'Некорректные путешествия.');
  check(new Set(value.expeditions.map(e => e.story)).size === value.expeditions.length, 'Повторяющиеся путешествия.');
  check(Array.isArray(value.orders) && value.orders.length <= 2 && value.orders.every(o => o && typeof o.id === 'string' && o.id.startsWith('order-') && o.id.length <= 40 && CLIENTS.some(c => c.id === o.client) && recipeById(o.recipe) && Number.isFinite(o.reward) && o.reward >= 0 && o.reward <= 100000 && Number.isFinite(o.fame) && o.fame >= 0 && o.fame <= 100 && Number.isInteger(o.quality) && o.quality >= 0 && o.quality <= 100 && (!o.material || MATERIALS[o.material]?.costs) && (!o.rune || RUNES[o.rune])), 'Некорректные заказы.');
  check(Array.isArray(value.flags) && value.flags.every(f => ['mine', 'supplier', 'ruins', 'guild', 'beacon'].includes(f)), 'Некорректные события.');
  const result = { ...newGame(), ...value, version:SAVE_VERSION, day: int(value.day, 1), gold: int(value.gold), fame: int(value.fame), storyIndex: int(value.storyIndex, 0, STORIES.length), nextId: int(value.nextId, 1), sound: Boolean(value.sound), welcomed: Boolean(value.welcomed), ended: Boolean(value.ended) };
  result.xp = int(value.xp, value.crafted*8 + value.sold*3 + value.completed*12);
  result.skills = ['basics',...new Set((Array.isArray(value.skills) ? value.skills : value.technologies).filter(id => id !== 'basics' && SKILLS.some(s => s.id === id)))];
  if (value.version === 1 && result.technologies.length && !result.skills.includes('precision')) result.skills.push('precision');
  result.equipment = Object.fromEntries(EQUIPMENT.map(e => [e.id,int(value.equipment?.[e.id],0,e.max)]));
  result.rapport = Object.fromEntries(CLIENTS.map(c => [c.id,int(value.rapport?.[c.id],0,50)]));
  result.invitedToday = int(value.invitedToday,0,3);
  check(!value.work || validWork(value.work), 'Некорректная незавершённая работа.');
  check(!value.trip || validTrip(value.trip), 'Некорректная экспедиция.');
  check(!(value.work && value.trip), 'Две активные работы в сохранении.');
  result.work = value.work ? {...value.work,design:value.work.design||'balanced',mark:value.work.mark||'none'} : null; result.trip = value.trip || null;
  check(!result.work?.relicId || result.relics.some(r=>r.id===result.work.relicId&&r.recipe===result.work.recipe),'Находка для реставрации отсутствует.');
  check(!value.customers || (Array.isArray(value.customers) && value.customers.length <= 10 && value.customers.every(c => c && typeof c.id === 'string' && c.id.startsWith('buyer-') && CLIENTS.some(p => p.id === c.client) && Number.isInteger(c.wallet) && c.wallet >= 0 && c.wallet <= 10000 && Number.isInteger(c.quality) && c.quality >= 0 && c.quality <= 100 && Number.isInteger(c.attempts) && c.attempts >= 0 && c.attempts <= 2)), 'Некорректные покупатели.');
  result.customers = (value.customers || []).map(c => ({...c,greeted:Boolean(c.greeted),served:Boolean(c.served)}));
  result.energy = int(value.energy, 0, maxEnergy(result));
  result.collection = Array.isArray(value.collection) ? [...new Set(value.collection.filter(id => recipeById(id)))] : [];
  result.tutorial = int(value.tutorial, 0, 3);
  result.seed = value.seed >>> 0;
  result.lastSaved = int(value.lastSaved, 0, Number.MAX_SAFE_INTEGER);
  result.stock = result.stock.map(i => ({ ...i, source: typeof i.source === 'string' ? i.source.slice(0,40) : 'Кузница', day: int(i.day,1) }));
  result.orders = result.orders.map(o => ({ ...o, title: typeof o.title === 'string' ? o.title.slice(0,100) : 'Заказ горожанина', text: typeof o.text === 'string' ? o.text.slice(0,500) : 'Нужна хорошая вещь для дороги.' }));
  result.soldToday = Object.fromEntries(Object.entries(value.soldToday || {}).filter(([id,n]) => recipeById(id) && Number.isInteger(n) && n >= 0));
  result.marketToday = int(value.marketToday, 0, 3);
  result.log = Array.isArray(value.log) ? value.log.filter(e => e && Number.isInteger(e.day) && typeof e.text === 'string').slice(0,24).map(e => ({ day: e.day, text: e.text.slice(0,500) })) : [];
  result.nextId = Math.max(result.nextId, ...result.stock.map(i => i.id + 1), ...result.relics.map(i => i.id + 1));
  result.nextId = Math.max(result.nextId,...result.customers.map(c => int(Number(c.id.slice(6)))+1));
  ensureOrders(result); ensureCustomers(result); return result;
}

export function gainXP(state, amount) { state.xp = (state.xp || 0) + amount; }
export function mastery(state) {
  const spent = (state.skills || []).reduce((n,id) => n + (SKILLS.find(s => s.id === id)?.points || 0),0);
  return { level:1 + Math.floor((state.xp || 0)/30), progress:(state.xp || 0)%30, next:30, points:Math.max(0,2 + Math.floor((state.xp || 0)/30) - spent) };
}
export function skillStatus(state,id) {
  const skill = SKILLS.find(s => s.id === id); if (!skill) return 'locked';
  if (state.skills.includes(id) || state.technologies.includes(id)) return 'learned';
  return skill.parents.every(p => state.skills.includes(p) || state.technologies.includes(p)) && (!skill.need || state.upgrades[skill.need] >= skill.level) ? 'available' : 'locked';
}
export function learnSkill(state,id) {
  const skill=SKILLS.find(s => s.id === id); check(skill && skillStatus(state,id)==='available','Сначала открой предыдущие навыки и нужное оборудование.');
  check(mastery(state).points>=skill.points,`Нужно ${skill.points} очков мастерства. Получай опыт за работу, заказы и торговлю.`);
  check(state.gold>=skill.cost,`Нужно ${skill.cost} монет.`); check(state.energy>=1,'Для исследования нужна 1 единица сил.');
  state.gold-=skill.cost; state.energy--; state.skills.push(id);
  if (TECHNOLOGIES.some(t=>t.id===id) && !state.technologies.includes(id)) state.technologies.push(id);
  log(state,`Открыт навык: ${skill.name}.`);
}
export function buyEquipment(state,id) {
  const e=EQUIPMENT.find(e=>e.id===id); check(e,'Неизвестное оборудование.');
  const level=state.equipment[id]; check(level<e.max,'Оборудование уже улучшено до максимума.');
  check(!e.need || state.technologies.includes(e.need),'Сначала изучи рунную гравировку.');
  check(state.gold>=e.prices[level],`Нужно ${e.prices[level]} монет.`); payResources(state,e.costs[level]);
  state.gold-=e.prices[level]; state.equipment[id]++; log(state,`${level ? 'Улучшено' : 'Куплено'}: ${e.name}.`);
}
function qualityBonus(state,rune) { return state.upgrades.furnace*4 + state.equipment.anvil*2 + (state.skills.includes('precision') ? 3 : 0) + (state.skills.includes('mastercraft') ? 5 : 0) + (rune !== 'none' ? state.equipment.engraver*4 : 0); }
export function workStage(state) { return state.work ? WORK_STAGES[state.work.step] : null; }
export function beginWork(state,recipe,material='iron',rune='none',relicId=null,design='balanced') {
  check(!state.work && !state.trip,'Сначала заверши текущую работу или экспедицию.');
  const relic=relicId===null ? null : state.relics.find(r=>r.id===relicId);
  check(relicId===null || relic,'Эта находка уже использована.');
  check(recipeById(recipe) && (relic || knownRecipe(state,recipe)),'Сначала изучи чертёж.');
  check(knownMaterial(state,material),'Изучи технологию материала.');
  check(RUNES[rune] && (!RUNES[rune].tech || state.technologies.includes(RUNES[rune].tech)),'Изучи рунную гравировку.');
  check(state.stock.length<60,'Витрина заполнена.');
  const energy=relic ? 1 : 2, fee=relic ? 8 : 0;
  check(state.energy>=energy,`Нужно ${energy} единицы сил.`); check(state.gold>=fee,'На восстановление нужны 8 монет.');
  check(DESIGNS.some(d=>d.id===design)&&designAvailable(state,design),'Этот способ ковки пока не открыт.');
  const costs=relic ? {wood:2,coal:1} : workCosts(state,recipe,material,rune,design); payResources(state,costs);
  state.gold-=fee; state.energy-=energy;
  state.work={recipe,material,rune,design:relic?'balanced':design,mark:'none',step:0,scores:[],temper:'water',finish:'plain',day:state.day,costs,energy,fee,relicId:relic?.id || null};
  log(state,`Начата работа: ${recipeById(recipe).name}. Материалы отложены для заготовки.`);
  return state.work;
}
export function finishOptions(state) {
  const options=[{id:'plain',name:'Сборка',desc:'Соединить детали и проверить изделие.'}];
  if (state.equipment.grindstone) {
    options.push({id:'polish',name:'Полировка',desc:'Свойство «Изящный» и +6% к цене.'});
    if (state.work && ['tools','weapons'].includes(recipeById(state.work.recipe).category)) options.push({id:'sharpen',name:'Заточка',desc:'Свойство «Острый» и +6% к цене.'});
  }
  return options;
}
export function advanceWork(state,action,value) {
  const work=state.work; check(work,'Сначала подготовь заготовку.');
  check(WORK_STAGES[work.step].id===action,'Нужно выполнить текущий этап работы.');
  if (['prepare','heat','hammer'].includes(action)) {
    check(Number.isFinite(value) && value>=0 && value<=1,'Некорректная точность работы.'); work.scores.push(value);
  } else if (action==='quench') {
    check(['water','air','oil'].includes(value),'Выбери способ закалки.');
    check(value!=='oil' || (state.equipment.barrel && state.skills.includes('hardening')),'Для масла нужны закалочная ванна и термообработка.');
    check(value!=='oil' || state.gold>=3,'Масло стоит 3 монеты.'); if(value==='oil')state.gold-=3;
    work.temper=value;
  } else {
    check(state.stock.length<60,'Витрина заполнена. Продай вещь перед завершением работы.');
    check(finishOptions(state).some(o=>o.id===value),'Для этой отделки нужен точильный круг.'); work.finish=value;
  }
  work.step++;
  if(work.step<WORK_STAGES.length)return null;
  const [prepare,heat,hammer]=work.scores;
  const base=work.relicId ? 66 : 48;
  const design=work.design||'balanced',bonus=(design==='sturdy'&&hammer>=.65?2:design==='light'?-2:0)+(work.craftsmanship?.combo>=3?Math.min(3,work.craftsmanship.combo-1):0);
  const quality=Math.min(100,Math.round(base + prepare*6 + heat*16 + hammer*22 + (work.temper==='air' ? 2 : 4) + (work.finish==='plain' ? 4 : 7) + qualityBonus(state,work.rune)+bonus));
  const item={id:state.nextId++,recipe:work.recipe,material:work.material,rune:work.rune,quality,day:state.day,source:work.relicId ? 'Восстановлено' : 'Ручная работа',temper:work.temper,finish:work.finish,signature:state.skills.includes('mastercraft'),design,mark:work.mark||'none',scores:[...work.scores],...(work.craftsmanship?{craftsmanship:work.craftsmanship}:{})};
  if(work.relicId)state.relics=state.relics.filter(r=>r.id!==work.relicId);
  state.stock.push(item); state.crafted++; gainXP(state,12);if(item.mark!=='none')state.fame++;
  if(!state.collection.includes(work.recipe))state.collection.push(work.recipe);
  state.work=null; log(state,`Завершена работа: ${itemName(item)} · качество ${quality}. +12 опыта.`);
  return item;
}
export function cancelWork(state) {
  check(state.work,'Нет незавершённой заготовки.'); const work=state.work;
  if(work.step===0) { add(state,work.costs); state.gold+=work.fee; state.energy=Math.min(maxEnergy(state),state.energy+work.energy); }
  else { const salvage=Object.fromEntries(Object.entries(work.costs).filter(([id])=>['iron','copper','moon'].includes(id)).map(([id,n])=>[id,Math.floor(n/2)])); add(state,salvage); }
  state.work=null; log(state,'Заготовка убрана. До разметки возвращаются все материалы, после — половина металла.');
}
function validWork(w) {
  return w && (!w.design||DESIGNS.some(d=>d.id===w.design)) && (!w.mark||['none','ember','leaf','star'].includes(w.mark)) && (!w.craftsmanship||validCraftsmanship(w.craftsmanship)) && recipeById(w.recipe) && MATERIALS[w.material]?.costs && RUNES[w.rune] && Number.isInteger(w.day) && w.day>=1 && (!w.relicId || (Number.isInteger(w.relicId)&&w.relicId>0)) && Number.isInteger(w.step) && w.step>=0 && w.step<5 && Array.isArray(w.scores) && w.scores.length===Math.min(w.step,3) && w.scores.every(n=>Number.isFinite(n)&&n>=0&&n<=1) && ['water','air','oil'].includes(w.temper) && ['plain','polish','sharpen'].includes(w.finish) && Number.isInteger(w.energy) && w.energy>=1 && w.energy<=2 && Number.isInteger(w.fee) && w.fee>=0 && w.fee<=8 && w.costs && Object.entries(w.costs).every(([id,n])=>MATERIALS[id]&&Number.isInteger(n)&&n>=0&&n<=50);
}

function makeCustomer(state,index=0) {
  const client=CLIENTS[(state.day-1+index*3)%CLIENTS.length], taste=BUYER_TASTES[client.id];
  return {id:`buyer-${state.nextId++}`,client:client.id,wallet:Math.min(10000,100+state.day*12+(index%3)*45+state.fame*2),quality:index===0 ? 35 : 45+(index%3)*10,greeted:false,served:false,attempts:0,category:taste.category,trait:taste.trait};
}
export function ensureCustomers(state) {
  if(state.customers.length)return;
  for(let i=0;i<3+(state.skills.includes('showcase') ? 2 : 0);i++)state.customers.push(makeCustomer(state,i));
}
export function customerLine(customer) { return BUYER_TASTES[customer.client].line; }
export function greetCustomer(state,id,approach='needs') {
  const c=state.customers.find(c=>c.id===id); check(c && !c.served,'Этот покупатель уже ушёл.');
  check(!c.greeted,'Вы уже поговорили с покупателем.'); check(['needs','craft'].includes(approach),'Выбери тему разговора.');
  c.greeted=true; c.approach=approach;
  if(approach==='craft')c.wallet+=Math.min(30,state.crafted*2);
  return customerLine(c);
}
export function customerQuote(state,item,customerId,policy='fair',offer=null) {
  const c=state.customers.find(c=>c.id===customerId); if(!c || c.served)return {accepted:false,reason:'Покупатель уже ушёл.',price:0,budget:0};
  const quote=saleQuote(state,item,policy), taste=BUYER_TASTES[c.client];
  const liked=recipeById(item.recipe).category===taste.category, trait=itemTraits(item).includes(taste.trait);
  const relationship=state.rapport[c.client]||0;
  const modifier=1+(liked?.12:0)+(trait?.08:0)+(state.skills.includes('negotiation')?.1:0)+(state.skills.includes('hospitality')?Math.min(.15,relationship*.015):0);
  const budget=Math.min(c.wallet,Math.round(quote.budget*modifier));
  const price=offer===null ? quote.price : offer;
  const reason=!c.greeted ? 'Сначала поговори с покупателем.' : item.quality<c.quality ? `Нужно качество ${c.quality} или выше.` : price>budget ? 'Цена слишком высока. Попробуй снизить её или предложить другую вещь.' : '';
  return {...quote,price,budget,accepted:!reason,reason,liked,trait};
}
export function serveCustomer(state,customerId,itemId,policy='fair',offer=null) {
  const c=state.customers.find(c=>c.id===customerId), index=state.stock.findIndex(i=>i.id===itemId);
  check(c && !c.served && index>=0,'Покупатель или товар уже недоступен.');
  check(['quick','fair','premium'].includes(policy),'Выбери цену.');
  check(offer===null || (state.skills.includes('negotiation') && Number.isInteger(offer) && offer>0 && offer<=100000),'Для собственной цены изучи искусство торга.');
  check(offer===null || c.attempts<2,'На сегодня покупатель закончил торг.');
  const item=state.stock[index], quote=customerQuote(state,item,customerId,policy,offer);
  if(offer!==null && !quote.accepted && c.greeted && item.quality>=c.quality) { c.attempts++; return {accepted:false,...quote}; }
  check(quote.accepted,quote.reason);
  state.stock.splice(index,1); state.gold+=quote.price; state.sold++; state.fame+=item.quality>=80 ? 2 : 1; c.served=true; c.purchase=item.recipe;
  state.soldToday[item.recipe]=(state.soldToday[item.recipe]||0)+1;
  state.rapport[c.client]=Math.min(50,(state.rapport[c.client]||0)+(state.skills.includes('hospitality')?2:1)); gainXP(state,6);
  log(state,`${CLIENTS.find(p=>p.id===c.client).name}: покупка ${itemName(item)} за ${quote.price} монет. Отношения +${state.skills.includes('hospitality')?2:1}, опыт +6.`);
  return {accepted:true,price:quote.price,client:c.client};
}
export function inviteCustomer(state) {
  check(state.invitedToday<3,'Три приглашения на день использованы. Новые гости придут утром.'); check(state.energy>=1,'Чтобы пригласить гостя, нужна 1 единица сил.');
  state.energy--; state.invitedToday++; const c=makeCustomer(state,state.customers.length); state.customers.push(c); return c;
}

export const TRIP_CHOICES = [
  {id:'gather',name:'Собрать материалы',icon:'pickaxe',desc:'Больше основного материала и топлива.'},
  {id:'search',name:'Искать тайники',icon:'relic',desc:'Кристаллы, шанс на чертёж, артефакты в руинах.'},
  {id:'help',name:'Помочь путнику',icon:'handshake',desc:'Монеты, отношения и дополнительный опыт.'},
];
export function beginTrip(state,region) {
  check(!state.work && !state.trip,'Сначала заверши работу или текущую экспедицию.');
  check(REGIONS.some(r=>r.id===region)&&regionAvailable(state,region),'Этот путь ещё закрыт.'); check(state.energy>=2,'Для экспедиции нужны 2 единицы сил.');
  state.energy-=2; state.trip={region,step:0,choices:[],found:{},gold:0,xp:5,blueprint:null,relic:false};
  return state.trip;
}
export function tripAction(state,choice) {
  const trip=state.trip; check(trip && trip.step<2,'Экспедиция уже закончилась.'); check(TRIP_CHOICES.some(c=>c.id===choice),'Выбери действие на тропе.');
  const primary={forest:'wood',mine:'iron',ruins:'copper',pass:'moon'}[trip.region];
  const addLoot=(id,n)=>trip.found[id]=(trip.found[id]||0)+n;
  if(choice==='gather') { addLoot(primary,4+(state.skills.includes('scouting')?2:0)+(state.equipment.toolkit?2:0)); addLoot('coal',2); if(trip.region==='forest')addLoot('copper',2); }
  if(choice==='search') {
    addLoot('crystal',state.skills.includes('cartography')?2:1); addLoot(primary,2);
    if(trip.region==='ruins')trip.relic=true;
    const locked=RECIPES.filter(r=>!knownRecipe(state,r.id));
    if(!trip.blueprint && locked.length && random(state)<(state.skills.includes('cartography')?.6:.3))trip.blueprint=locked[Math.floor(random(state)*locked.length)].id;
  }
  if(choice==='help') { trip.gold+=state.skills.includes('pathfinder')?24:14; trip.xp+=state.skills.includes('pathfinder')?8:4; addLoot(primary,1); }
  trip.choices.push(choice); trip.step++;
  if(trip.step<2)return null;
  add(state,trip.found); state.gold+=trip.gold; gainXP(state,trip.xp);
  if(trip.blueprint && !knownRecipe(state,trip.blueprint))state.blueprints.push(trip.blueprint);
  if(trip.relic && state.relics.length<20)state.relics.push({id:state.nextId++,recipe:['lantern','amulet','key'][Math.floor(random(state)*3)],day:state.day});
  if(trip.choices.includes('help')){const id=CLIENTS[state.day%CLIENTS.length].id;state.rapport[id]=Math.min(50,(state.rapport[id]||0)+1);}
  log(state,`Экспедиция: ${REGIONS.find(r=>r.id===trip.region).name}. +${trip.xp} опыта${trip.gold?`, +${trip.gold} монет`:''}.`);
  state.trip=null; return trip;
}
export function retreatTrip(state) { check(state.trip,'Ты уже дома.'); state.trip=null; log(state,'Возвращение с тропы. Силы потрачены, находки остались в пути.'); }
function validTrip(t) { return t && REGIONS.some(r=>r.id===t.region) && Number.isInteger(t.step) && t.step>=0 && t.step<2 && Array.isArray(t.choices) && t.choices.length===t.step && t.choices.every(id=>TRIP_CHOICES.some(c=>c.id===id)) && t.found && Object.entries(t.found).every(([id,n])=>MATERIALS[id]&&Number.isInteger(n)&&n>=0&&n<=50) && Number.isInteger(t.gold) && t.gold>=0 && t.gold<=100 && Number.isInteger(t.xp) && t.xp>=0 && t.xp<=50 && (!t.blueprint || recipeById(t.blueprint)); }
