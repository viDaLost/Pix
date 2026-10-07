export const SAVE_VERSION = 1;
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
  { id: 'sword', name: 'Меч стражника', short: 'Меч', metal: 4, wood: 1, base: 66, category: 'weapons', learn: 35, desc: 'Хороший клинок удержит опасность за воротами.' },
  { id: 'shield', name: 'Круглый щит', short: 'Щит', metal: 3, wood: 3, base: 63, category: 'weapons', learn: 30, desc: 'Лёгкая конструкция с прочной окантовкой.' },
  { id: 'amulet', name: 'Дорожный амулет', short: 'Амулет', metal: 2, wood: 0, base: 45, category: 'magic', learn: 30, desc: 'Небольшой предмет для большой дороги.' },
  { id: 'hammer', name: 'Молот мастера', short: 'Молот', metal: 4, wood: 2, base: 61, category: 'tools', learn: 40, desc: 'Инструмент, который прослужит долгие годы.' },
  { id: 'ring', name: 'Кольцо', short: 'Кольцо', metal: 1, wood: 0, base: 24, category: 'jewelry', learn: 25, desc: 'Изящная вещь, которую приятно подарить.' },
  { id: 'staff', name: 'Посох странника', short: 'Посох', metal: 2, wood: 4, base: 70, category: 'magic', learn: 55, desc: 'Основа для сильного зачарования.' },
  { id: 'axe', name: 'Лесной топор', short: 'Топор', metal: 3, wood: 2, base: 49, category: 'tools', learn: 35, desc: 'Хороший баланс для работы в лесу.' },
  { id: 'key', name: 'Ключ от руин', short: 'Ключ', metal: 2, wood: 0, base: 36, category: 'magic', learn: 45, desc: 'Точный механизм для древних замков.' },
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
  { id: 'ruins', name: 'Забытые руины', subtitle: 'Артефакты · чертежи', desc: 'В камне ещё живут следы древней магии.', color: '#a896d8' },
  { id: 'pass', name: 'Лунный перевал', subtitle: 'Лунный камень · кристаллы', desc: 'Редкий металл ждёт за вершинами гор.', color: '#9ac7dc' },
];
export const CLIENTS = [
  { id: 'mira', name: 'Мира', role: 'Шахтёр', color: '#d7a162', hair: '#6b443e' },
  { id: 'bren', name: 'Брен', role: 'Стражник', color: '#92a5bc', hair: '#49373e' },
  { id: 'ada', name: 'Ада', role: 'Караванщица', color: '#bd806d', hair: '#543244' },
  { id: 'elin', name: 'Элин', role: 'Исследователь', color: '#9b8ac9', hair: '#ccab82' },
  { id: 'rowan', name: 'Рован', role: 'Фермер', color: '#7d9e78', hair: '#5c4335' },
];
export const STORIES = [
  { id: 'mira-light', client: 'mira', recipe: 'lantern', quality: 55, reward: 65, fame: 6, title: 'Свет под землёй', text: 'В шахте сыро, а открытый огонь опасен. Сделаешь надёжный закрытый фонарь? Завтра принесу тебе руду.', returnText: 'Твой фонарь выдержал сырость! Мы нашли новую жилу. Шахта теперь открыта для тебя.', returns: { iron: 6, crystal: 2 }, unlock: 'mine' },
  { id: 'rowan-pick', client: 'rowan', recipe: 'pickaxe', quality: 60, reward: 85, fame: 7, title: 'Камни у старого моста', text: 'Хочу расчистить дорогу к мосту. Нужна крепкая кирка. Взамен познакомлю тебя с поставщиком.', returnText: 'Дорога расчищена! Я договорился с поставщиком: материалы для тебя теперь дешевле.', returns: { wood: 6, copper: 3 }, unlock: 'supplier' },
  { id: 'ada-guard', client: 'ada', recipe: 'amulet', rune: 'guard', quality: 65, reward: 125, fame: 10, title: 'Дорога через туман', text: 'Каравану нужен защитный амулет. Изучи чертёж амулета и рунную гравировку на верстаке.', returnText: 'Караван прошёл через туман. Привезла лунный камень и карту руин.', returns: { moon: 3, crystal: 3 }, unlock: 'ruins' },
  { id: 'bren-sword', client: 'bren', recipe: 'sword', material: 'bronze', quality: 75, reward: 160, fame: 10, title: 'Лёгкий клинок', text: 'Впереди долгий дозор. Сделай бронзовый меч: прочный, но легче железного.', returnText: 'Меч выдержал дозор. В благодарность гильдия прислала материалы для нового горна.', returns: { iron: 8, wood: 5, coal: 6 }, unlock: 'guild' },
  { id: 'elin-staff', client: 'elin', recipe: 'staff', material: 'moon', rune: 'light', quality: 80, reward: 240, fame: 18, title: 'Искра древнего города', text: 'Лунный посох со светящейся руной поможет восстановить маяк у перевала. Это работа для настоящего мастера.', returnText: 'Маяк снова горит. В город вернулись торговцы! Теперь все знают имя твоей кузницы.', returns: { moon: 5, crystal: 6 }, unlock: 'beacon' },
];
const EVENTS = [
  { name: 'Путники на дороге', category: 'tools', text: 'Караван покупает инструменты. Их цена сегодня выше.' },
  { name: 'Дозор у ворот', category: 'weapons', text: 'Стража готовится к дозору: клинки и щиты пользуются спросом.' },
  { name: 'Ночь фонарей', category: 'magic', text: 'Городу нужны светильники и магические вещи.' },
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
export function maxEnergy(state) { return state.upgrades.bench >= 2 ? 8 : 6; }
export function knownRecipe(state, id) { return Boolean(recipeById(id)?.starter || state.blueprints.includes(id)); }
export function knownMaterial(state, id) { const m = MATERIALS[id]; return Boolean(m?.costs && (!m.tech || state.technologies.includes(m.tech))); }
export function regionAvailable(state, id) {
  if (id === 'forest') return true;
  if (id === 'mine') return state.flags.includes('mine') || state.upgrades.furnace >= 1;
  if (id === 'ruins') return state.flags.includes('ruins') || state.technologies.includes('runes');
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
    nextId: 1, tutorial: 0, sound: false, welcomed: false, lastSaved: 0, ended: false };
}
export function itemValue(item) {
  const r = recipeById(item.recipe); const m = MATERIALS[item.material]; const u = RUNES[item.rune];
  return Math.max(1, Math.round(r.base * m.value * u.multiplier * (.65 + item.quality / 125)));
}
export function itemName(item) { return recipeById(item.recipe)?.name || 'Изделие'; }
export function itemTraits(item) { return [...MATERIALS[item.material].traits, ...(RUNES[item.rune].trait ? [RUNES[item.rune].trait] : [])]; }
export function craft(state, id, material = 'iron', rune = 'none', quality = 70, automatic = false) {
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
  state.stock.push(item); state.crafted++;
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
  check(id !== 'moon' || state.technologies.includes('lunar') || state.flags.includes('ruins'), 'Лунный камень появится после возвращения каравана или изучения технологии.');
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
  state.fame += item.quality >= 80 ? 2 : 1; log(state, `Продано: ${itemName(item)} за ${quote.price} монет.`); return quote.price;
}
export function buyTradeItem(state) {
  check(state.marketToday < 3, 'Все товары каравана на сегодня куплены. Он обновит ассортимент завтра.');
  check(state.stock.length < 60, 'Сначала освободи витрину.');
  const recipe = ['knife', 'ring', 'shield'][(state.day - 1 + state.marketToday) % 3];
  const item = { id: state.nextId, recipe, material: 'copper', rune: 'none', quality: 64, day: state.day, source: 'Караван' };
  const cost = Math.round(itemValue(item) * .75); check(state.gold >= cost, `Нужно ${cost} монет.`);
  state.nextId++; state.gold -= cost; state.stock.push(item); state.marketToday++; log(state, `Товар каравана: ${itemName(item)} за ${cost} монет.`); return item;
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
  add(state, found); log(state, `Вылазка: ${REGIONS.find(r => r.id === id).name}. ${Object.entries(found).map(([k, v]) => `${MATERIALS[k].name} +${v}`).join(', ')}.`);
  return found;
}
export function buyRelic(state) {
  check(state.gold >= 28, 'Для покупки находки нужны 28 монет.'); check(state.relics.length < 20, 'Сначала разбери существующие находки.');
  state.gold -= 28; const relic = { id: state.nextId++, recipe: ['amulet', 'lantern', 'key'][Math.floor(random(state) * 3)], day: state.day }; state.relics.push(relic);
  log(state, 'Куплена древняя находка. Её можно восстановить, изучить или разобрать.'); return relic;
}
export function processRelic(state, id, action) {
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
  state.stock.splice(itemIndex, 1); state.gold += order.reward; state.fame += order.fame; state.completed++;
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
  state.day++; state.energy = maxEnergy(state); state.soldToday = {}; state.marketToday = 0;
  const reports = [];
  for (const expedition of state.expeditions.filter(e => e.due <= state.day)) {
    const story = STORIES.find(s => s.id === expedition.story); add(state, story.returns);
    if (!state.flags.includes(story.unlock)) state.flags.push(story.unlock);
    reports.push({ ...story, clientName: CLIENTS.find(c => c.id === story.client).name }); log(state, `${CLIENTS.find(c => c.id === story.client).name}: ${story.returnText}`);
    if (story.unlock === 'beacon') state.ended = true;
  }
  state.expeditions = state.expeditions.filter(e => e.due > state.day);
  if (state.gold < 15 && (state.resources.iron < 2 || state.resources.coal < 1)) { add(state, { iron: 3, wood: 2, coal: 2 }); log(state, 'Гильдия помогла материалами, чтобы кузница снова работала.'); }
  ensureOrders(state); state.tutorial = Math.max(state.tutorial, state.storyIndex ? 3 : 0);
  log(state, `Начался день ${state.day}. ${demandEvent(state).name}.`); return reports;
}
export function serialize(state) { return JSON.stringify({ ...state, lastSaved: Date.now() }); }
export function deserialize(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  check(value && value.version === SAVE_VERSION, 'Файл сохранения другого формата.');
  check(Number.isInteger(value.day) && value.day >= 1 && value.resources && value.upgrades, 'Сохранение повреждено.');
  for (const key of ['gold', 'energy', 'fame', 'crafted', 'sold', 'completed', 'seed', 'nextId', 'storyIndex']) check(Number.isFinite(value[key]) && value[key] >= 0, 'Некорректные данные сохранения.');
  for (const key of Object.keys(newGame().resources)) check(Number.isInteger(value.resources[key]) && value.resources[key] >= 0 && value.resources[key] <= 1000000, 'Некорректный запас материалов.');
  for (const u of UPGRADES) check(Number.isInteger(value.upgrades[u.id]) && value.upgrades[u.id] >= 0 && value.upgrades[u.id] <= u.max, 'Некорректное улучшение.');
  check(Array.isArray(value.stock) && value.stock.length <= 60 && Array.isArray(value.relics) && value.relics.length <= 20, 'Некорректный инвентарь.');
  check(value.stock.every(i => i && Number.isInteger(i.id) && i.id > 0 && i.id <= 1000000 && recipeById(i.recipe) && MATERIALS[i.material]?.costs && RUNES[i.rune] && Number.isInteger(i.quality) && i.quality >= 0 && i.quality <= 100), 'Некорректные изделия.');
  check(value.relics.every(i => i && Number.isInteger(i.id) && i.id > 0 && i.id <= 1000000 && recipeById(i.recipe)), 'Некорректные находки.');
  const inventoryIds = [...value.stock, ...value.relics].map(i => i.id);
  check(new Set(inventoryIds).size === inventoryIds.length, 'Повторяющиеся предметы в сохранении.');
  check(Array.isArray(value.blueprints) && value.blueprints.every(id => recipeById(id)), 'Некорректные чертежи.');
  check(Array.isArray(value.technologies) && value.technologies.every(id => TECHNOLOGIES.some(t => t.id === id)), 'Некорректные технологии.');
  check(Array.isArray(value.expeditions) && value.expeditions.length <= STORIES.length && value.expeditions.every(e => e && STORIES.some(s => s.id === e.story) && Number.isInteger(e.due) && e.due >= 1), 'Некорректные путешествия.');
  check(new Set(value.expeditions.map(e => e.story)).size === value.expeditions.length, 'Повторяющиеся путешествия.');
  check(Array.isArray(value.orders) && value.orders.length <= 2 && value.orders.every(o => o && typeof o.id === 'string' && o.id.startsWith('order-') && o.id.length <= 40 && CLIENTS.some(c => c.id === o.client) && recipeById(o.recipe) && Number.isFinite(o.reward) && o.reward >= 0 && o.reward <= 100000 && Number.isFinite(o.fame) && o.fame >= 0 && o.fame <= 100 && Number.isInteger(o.quality) && o.quality >= 0 && o.quality <= 100 && (!o.material || MATERIALS[o.material]?.costs) && (!o.rune || RUNES[o.rune])), 'Некорректные заказы.');
  check(Array.isArray(value.flags) && value.flags.every(f => ['mine', 'supplier', 'ruins', 'guild', 'beacon'].includes(f)), 'Некорректные события.');
  const result = { ...newGame(), ...value, day: int(value.day, 1), gold: int(value.gold), fame: int(value.fame), storyIndex: int(value.storyIndex, 0, STORIES.length), nextId: int(value.nextId, 1), sound: Boolean(value.sound), welcomed: Boolean(value.welcomed), ended: Boolean(value.ended) };
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
  ensureOrders(result); return result;
}
