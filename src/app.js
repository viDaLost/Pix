import * as G from './game.js';
import { drawScene, iconURL, portraitURL } from './art.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, color, className = '') => `<img class="${className}" src="${iconURL(id, color)}" alt="" draggable="false">`;
const button = (action, label, cls = 'secondary', attrs = '') => `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const STORAGE_KEY = 'pix-forge-save-v1';
let state = G.newGame(Date.now() >>> 0);
let storageOK = true;
let loadError = false;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) state = G.deserialize(raw);
} catch (error) {
  loadError = error instanceof G.GameError || error instanceof SyntaxError;
  storageOK = false;
}
G.ensureOrders(state);
let view = 'forge', selected = 'lantern', metal = 'iron', rune = 'none';
let allRecipes = false, shopTab = 'stock', policy = 'fair';
let toastTimer, audioContext, forging = null, lastFrame = 0;
const dialog = $('#dialog');
const canvas = $('#scene');

function save() {
  if (loadError) return;
  try {
    localStorage.setItem(STORAGE_KEY, G.serialize(state));
    storageOK = true;
    $('#save-status').textContent = 'Прогресс сохранён на устройстве';
  } catch {
    storageOK = false;
    $('#save-status').textContent = 'Сохранение недоступно';
  }
  storageNotice();
}
function storageNotice() {
  const warning = $('#storage-warning');
  warning.hidden = storageOK;
  warning.textContent = loadError
    ? 'Сохранение не удалось прочитать. Исходный файл сохранён: открой меню, чтобы скачать его или начать заново.'
    : 'Браузер не разрешил сохранить прогресс. Скачивай сохранение через меню, прежде чем закрыть игру.';
}
function toast(message, error = false) {
  const el = $('#toast');
  el.textContent = message; el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}
function sound(kind = 'good') {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = kind === 'hit' ? 240 : kind === 'coin' ? 880 : 540;
    gain.gain.setValueAtTime(.065, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .16);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .17);
  } catch { /* Audio is optional. */ }
}
function act(callback, message) {
  try {
    const result = callback(); save(); render(); sound('coin');
    if (message) toast(typeof message === 'function' ? message(result) : message);
    return result;
  } catch (error) {
    toast(error instanceof G.GameError ? error.message : 'Не удалось выполнить действие. Попробуй ещё раз.', true);
    if (!(error instanceof G.GameError)) console.error(error);
    return null;
  }
}
function showModal(html, closeable = true) {
  forging = null;
  $('#dialog-body').innerHTML = `<div class="modal-inner">${closeable ? button('close', '×', 'modal-close', 'aria-label="Закрыть"') : ''}${html}</div>`;
  if (!dialog.open) dialog.showModal();
  document.body.style.overflow = 'hidden';
}
function closeModal() { forging = null; dialog.close(); document.body.style.overflow = ''; }
dialog.addEventListener('close', () => { forging = null; document.body.style.overflow = ''; });
dialog.addEventListener('cancel', () => { forging = null; });
dialog.addEventListener('click', e => { if (e.target === dialog && !forging) closeModal(); });
function costsHTML(costs) {
  return `<div class="costs">${Object.entries(costs).map(([id,n]) => `<span class="cost${state.resources[id] < n ? ' missing' : ''}" title="${G.MATERIALS[id].name}">${icon(id)}${G.MATERIALS[id].name} ${n}</span>`).join('')}</div>`;
}
function resourcesHTML() {
  return `<div class="resource-strip" aria-label="Материалы">${Object.entries(state.resources).filter(([id,n]) => id !== 'moon' || n || state.technologies.includes('lunar')).map(([id,n]) => `<span class="resource-chip" title="${G.MATERIALS[id].name}">${icon(id)}<b>${n}</b><span>${G.MATERIALS[id].short || G.MATERIALS[id].name}</span></span>`).join('')}</div>`;
}
function head(title, text, meta = '') {
  return `<div class="section-head"><div><h1>${title}</h1><p>${text}</p></div>${meta ? `<span class="section-meta">${meta}</span>` : ''}</div>`;
}
function setView(next) {
  if (!['forge','shop','orders','explore','develop'].includes(next)) return;
  view = next; render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function rank() { return state.fame >= 50 ? 'Мастер города' : state.fame >= 20 ? 'Умелый ремесленник' : state.fame >= 6 ? 'Знакомый кузнец' : 'Начинающий мастер'; }
function render() {
  $('#hud').innerHTML = `<div class="hud-stat" aria-label="${state.gold} монет">${icon('coin')}<span>${state.gold}</span></div><div class="hud-stat" aria-label="Силы ${state.energy} из ${G.maxEnergy(state)}">${icon('energy')}<span>${state.energy}<small> / ${G.maxEnergy(state)}</small></span></div><div class="hud-stat" aria-label="Репутация ${state.fame}">${icon('star')}<span>${state.fame}</span></div><div class="hud-stat day-stat">День <b>${state.day}</b></div>`;
  $('#scene-label').textContent = view === 'explore' ? 'Тропы за городом' : 'Твоя мастерская';
  $('#level-label').textContent = rank();
  canvas.setAttribute('aria-label', view === 'explore' ? 'Пиксельный лес, река и тропа к шахте' : 'Кузнец у наковальни, горящий горн и лавка с покупателями');
  $('#scene-actions').innerHTML = (view === 'explore' ? [['explore','Тихий лес'],['orders','Горожане']] : [['forge','Кузница'],['develop','Верстак'],['shop','Лавка']]).map(([id,title]) => button('navigate', title, `scene-hotspot${view === id ? ' active' : ''}`, `data-view="${id}"`)).join('');
  $('#end-day').innerHTML = `Завершить день <span>→</span>`;
  const nav = [['forge','Кузница'],['shop','Лавка'],['orders','Заказы'],['explore','Поиски'],['develop','Развитие']];
  const story = G.currentStory(state);
  $('#navigation').innerHTML = nav.map(([id,title]) => button('navigate', `${icon(id)}<span>${title}</span>${id === 'orders' && story && state.stock.some(i => G.orderMatches(i,story)) ? '<i class="nav-dot"></i>' : ''}`, `nav-item${view === id ? ' active' : ''}`, `data-view="${id}" aria-label="${title}" ${view === id ? 'aria-current="page"' : ''}`)).join('');
  renderGuide();
  $('#panel').innerHTML = ({ forge: forgeHTML, shop: shopHTML, orders: ordersHTML, explore: exploreHTML, develop: developHTML }[view])();
  drawScene(canvas, state, view, performance.now());
  storageNotice();
}
function renderGuide() {
  const story = G.currentStory(state);
  let title, text, action = 'navigate', attrs = 'data-view="orders"';
  if (!state.energy) { title = 'Пора отдохнуть'; text = 'Заверши день: силы восстановятся, а путешественники вернутся с находками.'; action = 'end-day'; attrs = ''; }
  else if (state.expeditions.length) { title = 'Твои вещи меняют город'; text = 'Заказчик в пути. На следующий день он вернётся с новостями и материалами.'; action = 'end-day'; attrs = ''; }
  else if (story && state.stock.some(i => G.orderMatches(i,story))) { title = `${G.CLIENTS.find(c => c.id === story.client).name} ждёт заказ`; text = 'Нужная вещь уже на витрине. Передай её заказчику и получи награду.'; }
  else if (story) { title = state.storyIndex ? story.title : 'Первая искра'; text = state.storyIndex ? `Следующая цель: ${G.recipeById(story.recipe).name.toLowerCase()}. Подсказки — в заказах.` : 'Сделай фонарь для Миры. Она принесёт руду и откроет путь в шахту.'; action = 'prepare'; attrs = `data-order="${story.id}"`; }
  else { title = state.ended ? 'Маяк снова горит' : 'Маяк ждёт искру'; text = state.ended ? 'Город ожил благодаря твоей кузнице. Продолжай торговлю и собери все 12 чертежей.' : 'Элин вернётся завтра. Заверши день, чтобы узнать, как прошла экспедиция.'; }
  $('#guide').innerHTML = `${icon(state.ended ? 'star' : 'lantern')}<div><strong>${escape(title)}</strong>${escape(text)}</div>${button(action, '→', 'guide-arrow', `${attrs} aria-label="${escape(title)}"`)}`;
}
function forgeHTML() {
  if (!G.knownMaterial(state,metal)) metal = 'iron';
  if (rune !== 'none' && !state.technologies.includes('runes')) rune = 'none';
  const r = G.recipeById(selected), unlocked = G.knownRecipe(state,selected), costs = G.craftCosts(state,selected,metal,rune);
  const recipes = allRecipes ? G.RECIPES : G.RECIPES.filter(x => x.starter || x.id === selected || G.knownRecipe(state,x.id)).slice(0,6);
  const preview = { recipe: selected, material: metal, rune, quality: 74 + state.upgrades.furnace * 4 };
  return head('У огня и наковальни', 'Создавай вещи, которые пригодятся городу.', `${state.crafted} изготовлено`) + resourcesHTML() +
    `<div class="subheading">Выбери чертёж <small>${G.RECIPES.filter(x => G.knownRecipe(state,x.id)).length} / 12 изучено</small></div><div class="recipe-grid">${recipes.map(x => button('select-recipe', `${icon(x.id,G.MATERIALS[metal].color)}<strong>${x.short}</strong>${G.knownRecipe(state,x.id) ? '' : '<span class="recipe-lock">Чертёж</span>'}`, `recipe${x.id === selected ? ' selected' : ''}${G.knownRecipe(state,x.id) ? '' : ' locked'}`, `data-recipe="${x.id}" aria-pressed="${x.id === selected}"`)).join('')}${button('all-recipes', allRecipes ? 'Свернуть чертежи ↑' : 'Все 12 чертежей →', 'recipe-more')}</div>` +
    `<div class="craft-card"><div class="item-heading"><div class="item-icon">${icon(r.id,G.MATERIALS[metal].color)}</div><div><h2>${r.name}</h2><p>${r.desc}</p></div></div>${unlocked ? `<div class="craft-options"><label><span class="field-label">Материал</span><select id="metal-select" aria-label="Материал изделия">${['iron','copper','bronze','moon'].map(id => `<option value="${id}" ${id === metal ? 'selected' : ''} ${G.knownMaterial(state,id) ? '' : 'disabled'}>${G.MATERIALS[id].name}${G.knownMaterial(state,id) ? '' : ' · изучить'}</option>`).join('')}</select></label><label><span class="field-label">Зачарование</span><select id="rune-select" aria-label="Руна изделия">${Object.entries(G.RUNES).map(([id,u]) => `<option value="${id}" ${id === rune ? 'selected' : ''} ${id === 'none' || state.technologies.includes('runes') ? '' : 'disabled'}>${u.name}${id !== 'none' && !state.technologies.includes('runes') ? ' · изучить' : ''}</option>`).join('')}</select></label></div><div class="traits">${G.itemTraits(preview).map(t => `<span class="trait">${t}</span>`).join('')}</div>${costsHTML(costs)}<div class="craft-summary"><span>Ковка: 2 силы · около 10 секунд</span><strong>≈ ${G.itemValue(preview)} монет</strong></div>${button('start-forge', `${icon('forge')}Нагреть горн и ковать`, 'primary', !G.canAfford(state,costs) || state.energy < 2 || state.stock.length >= 60 ? 'disabled' : '')}${state.upgrades.apprentice ? `<div class="button-row">${button('batch', 'Ученику ×1', 'secondary', 'data-count="1"')}${button('batch', 'Ученику ×3', 'secondary', 'data-count="3"')}</div><p class="help-text">Ученик: 1 сила и 6 монет за вещь. Качество ${72 + state.upgrades.furnace * 4}. Материалы расходуются за каждую вещь.</p>` : '<p class="help-text">Нагрей металл, затем нанеси три точных удара. Хорошая работа повышает цену и помогает выполнить сложные заказы.</p>'}${!G.canAfford(state,costs) ? button('supplier', 'Купить недостающие материалы →', 'secondary', 'style="width:100%;margin-top:10px"') : ''}` : `<p class="help-text">Этот чертёж пока закрыт. Купи его у мастера или найди в древних руинах.</p>${button('learn-recipe', `Изучить за ${r.learn} монет · 1 сила`, 'primary', `data-recipe="${r.id}"`)}`}</div>`;
}
function shopHTML() {
  const event = G.demandEvent(state);
  let html = head('Лавка чудес', 'Каждой хорошей вещи найдётся хозяин.', `${state.stock.length} / 60 вещей`) + `<div class="event-card">${icon('star')}<div><strong>${event.name}</strong><p>${event.text}</p></div></div><div class="segmented">${[['stock','Витрина'],['materials','Материалы'],['trade','Караван']].map(([id,label]) => button('shop-tab',label,shopTab === id ? 'active' : '',`data-tab="${id}"`)).join('')}</div>`;
  if (shopTab === 'stock') {
    html += `<div class="subheading">Твоя цена <small>Спрос и витрины влияют на торг</small></div><div class="segmented">${[['quick','Быстро −15%'],['fair','Обычная'],['premium','Дороже +25%']].map(([id,label]) => button('policy',label,policy === id ? 'active' : '',`data-policy="${id}"`)).join('')}</div>`;
    const orders = [G.currentStory(state), ...state.orders].filter(Boolean);
    html += state.stock.length ? `<div class="stock-list">${state.stock.map(item => {
      const quote = G.saleQuote(state,item,policy), order = orders.find(o => G.orderMatches(item,o));
      return `<article class="stock-card"><div class="stock-top"><div class="item-icon">${icon(item.recipe,G.MATERIALS[item.material].color)}</div><div class="stock-info"><h2>${G.itemName(item)}</h2><p>${G.MATERIALS[item.material].name} · ${escape(item.source)}${item.rune === 'none' ? '' : ` · ${G.RUNES[item.rune].name}`}</p></div><div class="quality" title="Качество"><div class="quality-bar"><span style="width:${item.quality}%"></span></div>${item.quality}</div></div><div class="price-row"><p>${quote.accepted ? quote.demanded ? '<b>Сегодня в спросе</b>' : 'Покупатель согласен' : `Покупатель даст до <b>${quote.budget}</b>`}${order ? '<br>Подходит для заказа' : ''}</p>${button('sell', `${quote.price} монет →`, 'secondary', `data-item="${item.id}" ${quote.accepted ? '' : 'disabled'}`)}</div>${order ? `<div class="button-row">${button('navigate','Передать заказчику →','secondary','data-view="orders"')}</div>` : ''}</article>`;
    }).join('')}</div>` : `<div class="empty-state">${icon('shop')}<h2>Пока пусто</h2><p>Выкуй первую вещь или купи товар у каравана, чтобы начать торговлю.</p>${button('navigate','К наковальне →','secondary','data-view="forge"')}</div>`;
    html += '<p class="help-text">После нескольких продаж одинаковых вещей спрос снижается. Снижай цену, меняй ассортимент или дождись следующего дня.</p>';
  } else if (shopTab === 'materials') {
    html += resourcesHTML() + `<div class="subheading">Поставщик <small>${state.flags.includes('supplier') ? 'Твоя скидка: 15%' : 'Материалы продаются пачками по 3'}</small></div><div class="market-grid">${Object.entries(G.MATERIALS).filter(([id,m]) => m.price && (id !== 'moon' || state.technologies.includes('lunar') || state.flags.includes('ruins'))).map(([id,m]) => { const cost = G.purchasePrice(state,id,3); return `<article class="material-card">${icon(id)}<div><h3>${m.name} ×3</h3><p>В запасе: ${state.resources[id]}</p></div>${button('buy-material',`${cost} ◈`,'',`data-material="${id}" aria-label="Купить ${m.name} 3 штуки за ${cost} монет" ${state.gold < cost ? 'disabled' : ''}`)}</article>`; }).join('')}</div><p class="help-text">Бронза выплавляется во время ковки из железа и меди. Материалы также можно бесплатно добывать в разделе «Поиски».</p>`;
  } else {
    const offer = G.tradeOffer(state), quote = G.saleQuote(state,offer,policy);
    html += `<div class="craft-card"><div class="item-heading"><div class="item-icon">${icon(offer.recipe,G.MATERIALS.copper.color)}</div><div><h2>Товар каравана</h2><p>${G.itemName(offer)} · медь · качество 64</p></div></div><p class="help-text">Купи готовую вещь и перепродай в своей лавке. Твоя текущая цена: ${quote.price} монет.</p><div class="craft-summary"><span>Сегодня осталось: ${3 - state.marketToday}</span><strong>Закупка: ${offer.cost} монет</strong></div>${button('trade-buy','Купить для перепродажи','primary',state.gold < offer.cost || state.marketToday >= 3 ? 'disabled' : '')}</div><div class="craft-card"><div class="item-heading"><div class="item-icon">${icon('relic')}</div><div><h2>Древняя находка</h2><p>Артефакт с неизвестной историей</p></div></div><p class="help-text">Можно восстановить и продать, изучить ради чертежа или разобрать на материалы. Находки появятся в «Поисках».</p><div class="craft-summary"><span>Восстановление: 8 монет, дерево ×2, уголь ×1</span><strong>28 монет</strong></div>${button('buy-relic','Купить находку','primary',state.gold < 28 || state.relics.length >= 20 ? 'disabled' : '')}</div>`;
  }
  return html;
}
function orderHint(order) {
  if (!G.knownRecipe(state,order.recipe)) return `Сначала изучи чертёж «${G.recipeById(order.recipe).name}» в «Развитии».`;
  if (order.rune && !state.technologies.includes('runes')) return 'Улучши верстак до уровня 1 и изучи рунную гравировку в «Развитии».';
  if (order.material && !G.knownMaterial(state,order.material)) return order.material === 'moon' ? 'Нужны горн уровня 2 и лунная металлургия. Затем добывай металл на перевале.' : 'Улучши горн до уровня 1 и изучи искусство сплавов.';
  return `Выбери ${order.material ? G.MATERIALS[order.material].name.toLowerCase() : 'любой металл'}${order.rune ? ` и руну «${G.RUNES[order.rune].name}»` : ''}. Качество — не ниже ${order.quality}.`;
}
function orderHTML(order, story = false) {
  const client = G.CLIENTS.find(c => c.id === order.client);
  const match = state.stock.filter(i => G.orderMatches(i,order)).sort((a,b) => a.quality - b.quality)[0];
  return `<article class="order-card${story ? ' story' : ''}"><div class="client-head"><img class="portrait" src="${portraitURL(client)}" alt="${client.name}"><div><h2>${escape(order.title)}</h2><p>${client.name} · ${client.role}</p></div>${story ? '<span class="story-label">История города</span>' : ''}</div><p class="order-text">${escape(order.text)}</p><div class="order-requirement">${icon(order.recipe,order.material ? G.MATERIALS[order.material].color : undefined)}<div><strong>${G.recipeById(order.recipe).name}</strong><small>Качество ${order.quality}+${order.material ? ` · ${G.MATERIALS[order.material].name}` : ' · любой металл'}${order.rune ? ` · руна ${G.RUNES[order.rune].name}` : ''}</small></div></div><div class="reward-row"><span><b>${order.reward} монет</b> · +${order.fame} репутации</span>${match ? button('fulfill','Передать →','',`data-order="${escape(order.id)}" data-item="${match.id}"`) : button('prepare','Подготовить →','',`data-order="${escape(order.id)}"`)}</div>${!match ? `<p class="order-hint">${escape(orderHint(order))}</p>` : ''}</article>`;
}
function ordersHTML() {
  const story = G.currentStory(state);
  let html = head('Люди и их истории','Хорошая вещь начинает новую историю.', `${state.storyIndex} / 5 глав`);
  if (state.expeditions.length) html += state.expeditions.map(e => { const s = G.STORIES.find(x => x.id === e.story), c = G.CLIENTS.find(x => x.id === s.client); return `<div class="pending-card">${icon('explore')}<div><b>${c.name} в пути</b><br>Вернётся в день ${e.due}. Заверши день, чтобы получить новости и материалы.</div></div>`; }).join('');
  if (story) html += orderHTML(story,true);
  else html += `<div class="event-card">${icon('star')}<div><strong>${state.ended ? 'История маяка завершена' : 'Последняя экспедиция в пути'}</strong><p>${state.ended ? 'В город вернулся свет. Кузница продолжает работать: новые заказы, чертежи и товары ждут тебя.' : 'Заверши день, чтобы встретить Элин у восстановленного маяка.'}</p></div></div>`;
  html += '<div class="subheading">Заказы горожан <small>Новые заказы появляются утром</small></div>' + state.orders.map(o => orderHTML(o)).join('');
  return html;
}
function exploreHTML() {
  let html = head('За порогом кузницы','Редкие материалы ждут вдали от прилавка.','Вылазка: 2 силы') + resourcesHTML();
  const hints = { mine: 'Фонарь для Миры или горн уровня 1', ruins: 'Заказ Ады или рунная гравировка', pass: 'Изучи лунную металлургию' };
  html += G.REGIONS.map(r => { const open = G.regionAvailable(state,r.id); return `<article class="region-card${open ? '' : ' locked'}"><div class="region-art" style="background:${r.color}44">${icon(r.id === 'forest' ? 'wood' : r.id === 'mine' ? 'pickaxe' : r.id === 'ruins' ? 'relic' : 'crystal',r.color)}</div><div class="region-info"><h2>${r.name}</h2><p>${r.subtitle}</p><small>${open ? 'Мгновенная вылазка · 2 силы' : hints[r.id]}</small></div>${button('explore',open ? 'В путь →' : 'Закрыто','secondary',`data-region="${r.id}" ${!open || state.energy < 2 ? 'disabled' : ''}`)}</article>`; }).join('');
  html += `<div class="subheading">Древние находки <small>${state.relics.length} / 20</small></div>`;
  html += state.relics.length ? state.relics.map(r => `<article class="relic-card"><div class="item-heading"><div class="item-icon">${icon('relic')}</div><div><h2>Старый ${G.recipeById(r.recipe).short.toLowerCase()}</h2><p>Следы магии на потускневшем металле.</p></div></div><p class="help-text">Восстановить: 8 монет, дерево ×2, уголь ×1, качество 82. Изучить: новый чертёж. Разобрать: железо ×3 и кристаллы ×2. Любое действие — 1 сила.</p><div class="button-row">${[['restore','Восстановить'],['study','Изучить'],['salvage','Разобрать']].map(([a,l]) => button('process-relic',l,'secondary',`data-relic="${r.id}" data-process="${a}" ${state.energy < 1 ? 'disabled' : ''}`)).join('')}</div></article>`).join('') : '<p class="help-text">Находки можно добыть в руинах или купить у каравана. Выбирай: заработать на реставрации, открыть чертёж или получить материалы.</p>';
  return html;
}
function developHTML() {
  let html = head('Ремесло растёт','Улучшай мастерскую и открывай новые возможности.',rank()) + resourcesHTML();
  html += '<div class="subheading">Твоя мастерская</div>' + G.UPGRADES.map(u => {
    const level = state.upgrades[u.id], max = level >= u.max;
    return `<article class="upgrade-card"><div class="item-icon">${icon(u.id === 'furnace' ? 'forge' : u.id === 'bench' ? 'hammer' : u.id === 'shelves' ? 'shop' : 'energy')}</div><div><h2>${u.name} <span class="muted">${level} / ${u.max}</span></h2><div class="level-dots">${Array.from({length:u.max},(_,i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</div><p>${max ? 'Все улучшения установлены.' : u.desc[level]}</p>${max ? '' : costsHTML(u.costs[level])}${max ? '<span class="trait">Готово</span>' : button('upgrade', `${u.prices[level]} монет · улучшить`,'secondary',`data-upgrade="${u.id}" ${state.gold < u.prices[level] || !G.canAfford(state,u.costs[level]) || (u.need && !state.upgrades[u.need]) ? 'disabled' : ''}`)}${u.need && !state.upgrades[u.need] ? '<p class="help-text">Сначала улучши верстак.</p>' : ''}</div></article>`;
  }).join('');
  html += '<div class="subheading" id="technology-list">Новые технологии <small>Исследование: 1 сила</small></div>' + G.TECHNOLOGIES.map(t => { const known = state.technologies.includes(t.id), ready = state.upgrades[t.need] >= t.level; return `<article class="technology">${icon(t.id === 'alloys' ? 'copper' : t.id === 'runes' ? 'amulet' : 'crystal')}<div><h2>${t.name}</h2><p>${t.desc}${known ? '' : !ready ? `<br>Нужен ${t.need === 'furnace' ? 'горн' : 'верстак'} уровня ${t.level}.` : ''}</p></div>${known ? '<span class="trait">Изучено</span>' : button('technology',`${t.cost} ◈`,'secondary',`data-tech="${t.id}" aria-label="Изучить ${t.name} за ${t.cost} монет" ${!ready || state.gold < t.cost || !state.energy ? 'disabled' : ''}`)}</article>`; }).join('');
  html += '<div class="subheading" id="blueprint-list">Библиотека чертежей <small>Обучение: 1 сила</small></div>' + G.RECIPES.filter(r => !r.starter).map(r => `<article class="technology">${icon(r.id)}<div><h2>${r.name}</h2><p>${r.desc}</p></div>${G.knownRecipe(state,r.id) ? '<span class="trait">Изучено</span>' : button('learn-recipe',`${r.learn} ◈`,'secondary',`data-recipe="${r.id}" aria-label="Изучить ${r.name} за ${r.learn} монет" ${state.gold < r.learn || !state.energy ? 'disabled' : ''}`)}</article>`).join('');
  html += '<div class="subheading">Путь мастера</div><div class="stats-grid"><div><strong>'+state.crafted+'</strong><span>вещей создано</span></div><div><strong>'+state.sold+'</strong><span>вещей продано</span></div><div><strong>'+state.completed+'</strong><span>заказов выполнено</span></div></div><div class="subheading">Дневник кузницы <small>Последние события</small></div><div class="journal">'+(state.log.length ? state.log.map(e => `<div class="journal-entry"><time>День ${e.day}</time><p>${escape(e.text)}</p></div>`).join('') : '<p class="help-text">Первая история начнётся с искры в горне.</p>')+'</div>';
  return html;
}
function prepareOrder(id) {
  const order = [G.currentStory(state),...state.orders].find(o => o?.id === id);
  if (!order) return;
  selected = order.recipe;
  if (!G.knownRecipe(state,order.recipe) || (order.material && !G.knownMaterial(state,order.material)) || (order.rune && !state.technologies.includes('runes'))) {
    setView('develop'); toast(orderHint(order));
    if (!G.knownRecipe(state,order.recipe)) $('#blueprint-list').scrollIntoView({ block:'start' });
  } else { metal = order.material || 'iron'; rune = order.rune || 'none'; setView('forge'); }
}
function finishDay() {
  const previous = state.day;
  const reports = act(() => G.endDay(state));
  if (!reports) return;
  showModal(`<p class="modal-eyebrow">Утро у порога</p><h2 id="dialog-title">День ${state.day}</h2><p>Ты отдохнул. Запас сил восстановлен до ${state.energy}. В городе новые планы.</p><div class="event-card">${icon('star')}<div><strong>${G.demandEvent(state).name}</strong><p>${G.demandEvent(state).text}</p></div></div>${reports.map(r => `<div class="report"><div class="report-head"><img src="${portraitURL(G.CLIENTS.find(c => c.id === r.client))}" alt=""><strong>Новости от ${r.clientName}</strong></div><p>${r.returnText}</p><div class="loot-grid">${Object.entries(r.returns).map(([id,n]) => `<div>${icon(id)}+${n}</div>`).join('')}</div></div>`).join('')}${state.ended && reports.some(r => r.unlock === 'beacon') ? '<p>Ты восстановил маяк и завершил историю города! Продолжай развивать мастерскую: впереди ещё новые изделия и заказы.</p>' : ''}<p class="modal-note">За день ${previous}: ${state.stock.length} вещей на витрине. Плата за ожидание отсутствует — играй в своём темпе.</p>${button('close','Разжечь новый день','primary')}`);
}
function startForge() {
  const costs = G.craftCosts(state,selected,metal,rune);
  if (state.energy < 2 || !G.canAfford(state,costs) || state.stock.length >= 60) { toast('Нужны материалы, 2 силы и свободное место на витрине.',true); return; }
  const recipe = selected, material = metal, chosenRune = rune;
  showModal(`<p class="modal-eyebrow">Ручная работа</p><h2 id="dialog-title">Разогрей металл</h2><p>Удерживай кнопку и отпусти, когда огонь попадёт в зелёную зону.</p><div class="craft-stage">${icon(recipe,G.MATERIALS[material].color,'big-item')}<div class="stage-label" id="forge-label">Нагрев заготовки</div><div class="meter" role="meter" aria-label="Нагрев металла" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="meter-target"></div><div class="meter-fill" id="meter-fill"></div><div class="meter-cursor" id="meter-cursor"></div></div><div class="meter-labels"><span>Холодно</span><span>В самый раз</span><span>Перегрев</span></div><div class="hit-dots" id="hit-dots"></div></div><p class="craft-instruction" id="forge-instruction">На клавиатуре: удерживай пробел. Материалы спишутся после завершения.</p>${button('forge-press','Удерживать: нагреть','primary hammer-button','id="forge-press"')}${button('calm-forge','Спокойная ковка · качество '+(74+state.upgrades.furnace*4),'secondary','style="width:100%;margin-top:12px"')}<p class="modal-note">Спокойная ковка создаёт вещь без проверки реакции. Горн добавляет качество обоим режимам.</p>`);
  forging = { recipe, material, rune: chosenRune, stage:'heat', started:performance.now(), holding:false, heat:0, hits:[], position:0 };
  const press = $('#forge-press');
  press.addEventListener('pointerdown', e => { e.preventDefault(); if (!forging) return; if (forging.stage === 'heat') { forging.holding = true; forging.started = performance.now(); press.setPointerCapture(e.pointerId); } else hammerHit(); });
  press.addEventListener('pointerup', e => { e.preventDefault(); if (forging?.stage === 'heat' && forging.holding) finishHeat(); });
  press.addEventListener('pointercancel', () => { if (forging?.stage === 'heat') { forging.holding = false; forging.position = 0; } });
}
function precision(position) { return Math.max(0,1 - Math.abs(position - .68) / .48); }
function finishHeat() {
  if (!forging || forging.stage !== 'heat') return;
  forging.heat = precision(forging.position); forging.holding = false; forging.stage = 'hammer'; forging.started = performance.now();
  $('#dialog-title').textContent = 'Три удара молота';
  $('#dialog-title').nextElementSibling.textContent = 'Нажимай, когда бегунок находится в зелёной зоне. Три удара — и вещь готова.';
  $('#forge-label').textContent = 'Закалка и форма';
  $('#forge-instruction').textContent = 'Нажимай кнопку или пробел три раза. Точные удары повышают качество.';
  $('#forge-press').textContent = 'Ударить молотом';
  $('#hit-dots').innerHTML = '<span></span><span></span><span></span>';
  $('#meter-fill').style.width = '0%';
  sound('hit');
}
function hammerHit() {
  if (!forging || forging.stage !== 'hammer') return;
  const f = forging; f.hits.push(precision(f.position)); sound('hit');
  $('#hit-dots').children[f.hits.length-1].classList.add('done');
  if (f.hits.length === 3) completeForge(Math.round(50 + f.heat * 18 + f.hits.reduce((a,b) => a+b,0) / 3 * 24));
}
function completeForge(quality) {
  const f = forging; if (!f) return;
  forging = null;
  const item = act(() => G.craft(state,f.recipe,f.material,f.rune,quality));
  if (!item) { closeModal(); return; }
  const order = [G.currentStory(state),...state.orders].find(o => o && G.orderMatches(item,o));
  showModal(`<p class="modal-eyebrow">Искра стала вещью</p><h2 id="dialog-title">${G.itemName(item)}</h2>${icon(item.recipe,G.MATERIALS[item.material].color,'result-icon')}<div class="result-quality">Качество ${item.quality} / 100</div><div class="result-grid">${G.itemTraits(item).map(t => `<span class="trait">${t}</span>`).join('')}<span class="trait">Цена: ${G.itemValue(item)} монет</span></div><p>${order ? 'Изделие подходит для заказа. Передай его заказчику и узнай, куда отправится твоя работа.' : 'Новая вещь уже на витрине. Продай её или сохрани для будущего заказа.'}</p>${button('result-go',order ? 'Передать заказчику →' : 'Выставить в лавке →','primary',`data-view="${order ? 'orders' : 'shop'}"`)}${button('close','Продолжить ковку','secondary','style="width:100%;margin-top:10px"')}`);
}
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || !forging || e.repeat || e.target?.dataset.action === 'close') return;
  e.preventDefault();
  if (forging.stage === 'heat') { forging.holding = true; forging.started = performance.now(); }
  else hammerHit();
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && forging?.holding) { e.preventDefault(); finishHeat(); } });
window.addEventListener('blur', () => { if (forging?.stage === 'heat') forging.holding = false; });
function showSettings() {
  showModal(`<p class="modal-eyebrow">Твоя кузница</p><h2 id="dialog-title">Настройки и прогресс</h2><div class="settings-row"><div>Звуки кузницы<small>Короткие сигналы ковки и торговли</small></div>${button('sound',state.sound ? 'Включены' : 'Выключены','secondary')}</div><div class="settings-row"><div>Скачать сохранение<small>Перенеси прогресс на другой телефон</small></div>${button('export','Скачать','secondary')}</div>${loadError ? `<div class="settings-row"><div>Исходное сохранение<small>Скачать файл, который не удалось прочитать</small></div>${button('export-original','Скачать','secondary')}</div>` : ''}<div class="settings-row"><div>Загрузить сохранение<small>Текущий прогресс будет заменён после проверки</small></div>${button('import','Выбрать','secondary')}</div><div class="settings-row"><div>Как играть<small>Ковка, торговля и истории города</small></div>${button('help','Открыть','secondary')}</div><div class="settings-row"><div>Начать заново<small>Удалить прогресс на этом устройстве</small></div>${button('reset-ask','Сбросить','secondary danger')}</div><p class="modal-note">Игра хранит прогресс в этом браузере. Перед очисткой данных скачай сохранение. Чтобы установить игру, выбери «На экран Домой» в меню браузера. Первый запуск требует интернета.</p>`);
}
function exportSave(original = false) {
  let raw;
  try { raw = original ? localStorage.getItem(STORAGE_KEY) : G.serialize(state); } catch { toast('Не удалось прочитать исходный файл.',true); return; }
  const url = URL.createObjectURL(new Blob([raw || ''],{type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = original ? 'pix-original-save.json' : `pix-day-${state.day}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Сохранение скачано. Храни файл, чтобы перенести прогресс.');
}
function showHelp() {
  showModal(`<p class="modal-eyebrow">С чего начинается ремесло</p><h2 id="dialog-title">Как играть</h2><ol class="modal-list"><li>В «Кузнице» выбери чертёж, металл и руну. Нагрей заготовку и нанеси три удара в зелёной зоне.</li><li>В «Заказах» передай подходящую вещь горожанину. За сюжетный заказ он принесёт новые ресурсы на следующий день.</li><li>В «Лавке» продавай вещи, закупай материалы и перепродавай товары каравана. Дорогая цена работает при высоком спросе.</li><li>В «Поисках» добывай материалы и древние находки. Артефакты можно восстановить, изучить или разобрать.</li><li>В «Развитии» улучшай горн, верстак и витрины. Изучай чертежи, сплавы и руны. Ученик делает партии без мини-игры.</li><li>Когда силы кончатся, заверши день. Спешить не нужно: штрафа за ожидание нет.</li></ol><p>Главная цель — помочь пяти путешественникам восстановить городской маяк. После этого кузница продолжает работать.</p>${button('close','Понятно, к работе','primary')}`);
}
document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]'); if (!target || target.disabled) return;
  const d = target.dataset;
  switch (d.action) {
    case 'navigate': setView(d.view); break;
    case 'close': closeModal(); break;
    case 'welcome-start': state.welcomed = true; save(); closeModal(); break;
    case 'select-recipe': selected = d.recipe; render(); break;
    case 'all-recipes': allRecipes = !allRecipes; render(); break;
    case 'start-forge': startForge(); break;
    case 'calm-forge': completeForge(74); break;
    case 'batch': act(() => G.batchCraft(state,selected,metal,rune,Number(d.count)), items => `Ученик изготовил ${items.length} вещей. Они уже на витрине.`); break;
    case 'shop-tab': shopTab = d.tab; render(); break;
    case 'policy': policy = d.policy; render(); break;
    case 'supplier': shopTab = 'materials'; setView('shop'); break;
    case 'buy-material': act(() => G.buyMaterial(state,d.material,3), price => `Куплено: ${G.MATERIALS[d.material].name} ×3 за ${price} монет.`); break;
    case 'sell': act(() => G.sell(state,Number(d.item),policy), price => `Продано за ${price} монет.`); break;
    case 'trade-buy': act(() => G.buyTradeItem(state),'Товар куплен. Перепродай его на витрине.'); break;
    case 'buy-relic': act(() => G.buyRelic(state),'Находка ждёт тебя в разделе «Поиски».'); break;
    case 'process-relic': act(() => G.processRelic(state,Number(d.relic),d.process),'Находка раскрыла свой секрет. Запись добавлена в дневник.'); break;
    case 'prepare': prepareOrder(d.order); break;
    case 'fulfill': act(() => G.fulfill(state,d.order,Number(d.item)), o => `Заказ выполнен! +${o.reward} монет, +${o.fame} репутации.`); break;
    case 'explore': {
      const oldRecipes = state.blueprints.length, oldRelics = state.relics.length;
      const found = act(() => G.explore(state,d.region));
      if (found) showModal(`<p class="modal-eyebrow">Возвращение домой</p><h2 id="dialog-title">Удачная вылазка</h2><p>${G.REGIONS.find(r => r.id === d.region).name}: ты нашёл новые материалы для своей кузницы.</p><div class="loot-grid">${Object.entries(found).map(([id,n]) => `<div>${icon(id)}${G.MATERIALS[id].name} +${n}</div>`).join('')}</div>${state.relics.length > oldRelics ? '<p>Среди камней найден древний артефакт. Его можно восстановить, изучить или разобрать.</p>' : ''}${state.blueprints.length > oldRecipes ? `<p>Найден новый чертёж: ${G.recipeById(state.blueprints.at(-1)).name}!</p>` : ''}${button('close','Разложить находки','primary')}`);
      break;
    }
    case 'upgrade': act(() => G.upgrade(state,d.upgrade),'Мастерская стала лучше. Новые возможности уже доступны.'); break;
    case 'technology': act(() => G.learnTechnology(state,d.tech),'Технология изучена. Попробуй её у наковальни.'); break;
    case 'learn-recipe': act(() => G.learnRecipe(state,d.recipe),'Чертёж изучен. Теперь можно ковать новое изделие.'); break;
    case 'end-day': finishDay(); break;
    case 'result-go': closeModal(); setView(d.view); break;
    case 'sound': state.sound = !state.sound; save(); showSettings(); sound(); break;
    case 'export': exportSave(); break;
    case 'export-original': exportSave(true); break;
    case 'import': $('#import-file').click(); break;
    case 'help': showHelp(); break;
    case 'reset-ask': showModal(`<p class="modal-eyebrow">Новая история</p><h2 id="dialog-title">Начать заново?</h2><p>Все вещи, улучшения и монеты на этом устройстве будут сброшены. Сначала можно скачать сохранение.</p>${button('export','Скачать текущий прогресс','secondary','style="width:100%;margin:10px 0"')}${button('reset','Да, начать новую игру','primary gold')}${button('settings','Вернуться','secondary','style="width:100%;margin-top:10px"')}`); break;
    case 'reset': loadError = false; state = G.newGame(Date.now() >>> 0); state.welcomed = true; G.ensureOrders(state); selected = 'lantern'; metal = 'iron'; rune = 'none'; shopTab = 'stock'; policy = 'fair'; save(); closeModal(); setView('forge'); toast('Новая кузница готова. Мира ждёт первый фонарь.'); break;
    case 'settings': showSettings(); break;
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'metal-select') { metal = e.target.value; render(); }
  if (e.target.id === 'rune-select') { rune = e.target.value; render(); }
});
$('#menu-button').addEventListener('click', showSettings);
$('#end-day').addEventListener('click', finishDay);
$('#import-file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    if (file.size > 200000) throw new G.GameError('Файл слишком большой. Выбери сохранение этой игры.');
    const imported = G.deserialize(await file.text());
    showModal(`<p class="modal-eyebrow">Перенос прогресса</p><h2 id="dialog-title">Загрузить день ${imported.day}?</h2><p>В файле: ${imported.gold} монет, ${imported.crafted} созданных вещей и ${imported.storyIndex} пройденных глав. Текущий прогресс будет заменён.</p>${button('export','Скачать текущий прогресс','secondary','style="width:100%;margin:10px 0"')}<button class="primary" id="confirm-import">Загрузить это сохранение</button>${button('close','Отмена','secondary','style="width:100%;margin-top:10px"')}`);
    $('#confirm-import').addEventListener('click', () => { state = imported; loadError = false; state.welcomed = true; save(); closeModal(); setView('forge'); toast('Прогресс загружен. С возвращением в кузницу!'); }, { once:true });
  } catch (error) { toast(error instanceof G.GameError ? error.message : 'Не удалось прочитать файл сохранения.',true); }
});
function animate(t) {
  if (!document.hidden) {
    if (forging) {
      const f = forging;
      if (f.stage === 'heat' && f.holding) f.position = Math.min(1,(t-f.started)/2100);
      else if (f.stage === 'hammer') f.position = (Math.sin((t-f.started)/480 - Math.PI/2)+1)/2;
      const cursor = $('#meter-cursor'), fill = $('#meter-fill');
      if (cursor) { cursor.style.left = `${Math.min(99,f.position*100)}%`; cursor.parentElement.setAttribute('aria-valuenow',Math.round(f.position*100)); }
      if (fill && f.stage === 'heat') fill.style.width = `${f.position*100}%`;
    }
    if (t-lastFrame > 90 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { drawScene(canvas,state,view,t); lastFrame=t; }
  }
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (forging?.stage === 'heat') forging.holding = false; save(); } });
window.addEventListener('pagehide',save);
render(); save(); requestAnimationFrame(animate);
if (!state.welcomed && !loadError) {
  showModal(`<p class="modal-eyebrow">Маленький город · большая искра</p><h2 id="dialog-title">Твоя кузница<br>начинается здесь</h2><p>За воротами мастерской ждут путешественники. Создавай вещи, торгуй находками и помоги городу снова зажечь древний маяк.</p><canvas class="welcome-art" width="384" height="220" aria-label="Твоя будущая мастерская" role="img" id="welcome-scene"></canvas><ul class="welcome-points"><li>${icon('forge')}Куй изделия и открывай новые чертежи</li><li>${icon('shop')}Покупай, восстанавливай и перепродавай</li><li>${icon('orders')}За твоими вещами продолжаются истории</li></ul>${button('welcome-start','Разжечь первую искру','primary')}<p class="modal-note">Без таймеров ожидания. Прогресс сохраняется на этом устройстве.</p>`,false);
  drawScene($('#welcome-scene'),state,'forge',0);
}
if ('serviceWorker' in navigator && ['https:','http:'].includes(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* The online game still works without offline support. */ }));
}
