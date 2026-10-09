import * as J from './jewelry.js';
import * as P from './progress.js';
import {showcase,deliverable,orderPieces} from './market.js';
import {JewelEditor} from './jewel-editor.js';
import {jewelURL,gemURL,metalURL} from './jewel-art.js';
import {PATTERNS,LAYOUTS,patternStrokes,layoutGems,patternUnlocked} from './patterns.js';
import {AtelierScene,paintMap} from './atelier-scene.js';
import {paintPortrait} from './characters.js';
import {GameAudio} from './audio.js';
import {loadAtelier,saveAtelier,StaleTabError,saveBackup,loadBackup} from './atelier-store.js';
import {icon,ELEMENT_ICON} from './icons.js';
import {ToastQueue,ModalQueue,toastSpec,toastDuration} from './notices.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,text,cls='',attrs='')=>`<button type="button" data-action="${action}" class="${cls}" ${attrs}>${text}</button>`;
const SAVE='pix-forge-save-v1',STAMP=SAVE+':at',TAB=Math.random().toString(36).slice(2),portraits=new Map(),scene=new AtelierScene(),audio=new GameAudio();
let state=P.newGame(Date.now()>>>0),sourceRaw=null,loadError=false,storageOK=true,diskOK=true,known=0,conflict=false,dirty=false,saveTimer=0,writing=Promise.resolve(),lastCrash=0,updateReady=false,persistAsked=false,recycled=null,backupMeta=null;
// Any uncaught failure keeps the progress reachable: a toast with the save file, and a recovery card instead of a blank panel.
addEventListener('error',e=>{if(!e.error&&/ResizeObserver/.test(e.message))return;crash(e.error||new Error(e.message||'Ошибка сценария'));});addEventListener('unhandledrejection',e=>crash(e.reason));
const readStamp=()=>{try{const v=JSON.parse(localStorage.getItem(STAMP)||'null');return Number.isFinite(v?.at)?v:null;}catch{return null;}};
try{let local=null;try{local=localStorage.getItem(SAVE);}catch{}let disk=null;try{disk=await loadAtelier();}catch{}const stamp=raw=>{try{return JSON.parse(raw)?.savedAt||0;}catch{return -1;}};sourceRaw=disk?.raw&&(!local||stamp(disk.raw)>=stamp(local))?disk.raw:local;
 // Writes this tab has already seen are not conflicts, even when one of them never reached the disk.
 known=Math.max(sourceRaw?stamp(sourceRaw):0,disk?.stamp?.at||0,readStamp()?.at||0);if(sourceRaw)state=P.load(sourceRaw);}catch{loadError=true;storageOK=false;}
const channel='BroadcastChannel'in globalThis?new BroadcastChannel('pix-forge-save'):null;
let view='studio',supplyTab='buy',selectedType='pendant',template='oval',selectedMetal=state.materials.silver?'silver':'copper',itemId=null,buyerId=null,policy='fair',sortMode='new',editor=null,lastFrame=0,lastPattern={id:null,n:0};
let patternMode='lines';
let editorOptions={tool:'shape',width:1,symmetry:false,gem:'garnet',cut:'round',zoom:1,pan:{x:0,y:0}};
const dialog=$('#dialog'),toastEl=$('#toast'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const still=()=>reduced.matches||!!state.prefs?.calm;
const STYLE={symmetry:'Симметрия',ornate:'Богатый узор',organic:'Плавные формы',minimal:'Сдержанность',contrast:'Сочетание камней'};
const TYPE_WANT={pendant:'кулон',ring:'кольцо',brooch:'брошь',amulet:'амулет',sword:'клинок',staff:'навершие'};
const PRAISE={minimal:'Сдержанно и чисто — то, что нужно.',symmetry:'Безупречная симметрия.',ornate:'Какой богатый узор.',organic:'Линии текут, как вода.',contrast:'Камни играют друг с другом.'};
const DOUBT={minimal:'Слишком много деталей для меня.',symmetry:'Мне не хватает строгой симметрии.',ornate:'Простовато, хочется больше узора.',organic:'Форма слишком жёсткая.',contrast:'Хочется сочетания разных камней.'};
const TOOLSET=[['shape','Форма'],['pattern','Узоры'],['engrave','Гравюра'],['stone','Камни'],['rune','Руны'],['polish','Блеск'],['hole','Вырез'],['move','Сдвиг'],['erase','Убрать']];
const SKILL_ICON={eye:'eye',gold:'coin',facets:'stone',alchemy:'rune',mounts:'sword',signature:'sign'};
const magicOf=e=>Math.round(e.magic*(state.skills.includes('alchemy')?1.25:1));
function portrait(person){if(portraits.has(person.id))return portraits.get(person.id);const c=document.createElement('canvas');c.width=c.height=64;paintPortrait(c.getContext('2d'),person);const url=c.toDataURL();portraits.set(person.id,url);return url;}
function notice(){const el=$('#storage-warning');el.hidden=storageOK;el.textContent=loadError?'Сохранение повреждено. Скачай исходный файл в меню или импортируй другой.':'Автосохранение недоступно. Скачай прогресс через меню.';}
// Serializing a large workshop takes a while, so changes are written in one batch after a short pause;
// leaving the page writes at once.
function scheduleSave(){dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,400);}
// A page that is being left cannot wait for IndexedDB, so then a large save goes to the synchronous mirror too.
// Otherwise a large save drops the mirror, so an older copy is never loaded in place of a newer one.
function save(leaving=false){clearTimeout(saveTimer);saveTimer=0;if(loadError)return;if(conflict){lockTab();return;}const other=readStamp();if(other&&other.tab!==TAB&&other.at>known){lockTab();return;}
 const since=known;state.savedAt=known=Math.max(Date.now(),known+1);dirty=false;const raw=J.serialize(state);let localOK=false;
 try{localStorage.setItem(STAMP,JSON.stringify({at:known,tab:TAB}));if(raw.length<1500000||!diskOK||leaving){localStorage.setItem(SAVE,raw);localOK=true;}}catch{}if(!localOK&&diskOK)try{localStorage.removeItem(SAVE);}catch{}channel?.postMessage({at:known,tab:TAB});
 writing=saveAtelier(raw,{at:state.savedAt,tab:TAB,since}).then(()=>{diskOK=storageOK=true;notice();}).catch(e=>{if(e instanceof StaleTabError){try{localStorage.setItem(STAMP,JSON.stringify(e.stamp));if(localOK)localStorage.removeItem(SAVE);}catch{}lockTab();return;}diskOK=false;if(!localOK)try{localStorage.setItem(SAVE,raw);localOK=true;}catch{}storageOK=localOK;notice();});
 storageOK=localOK||diskOK;notice();}
const flushSave=(leaving=false)=>{editor?.finish();if(dirty)save(leaving);};
// Reloading cuts off a write in progress, so the page waits for it (but never for long).
function reload(){try{if(!conflict)flushSave(true);}catch(e){console.error(e);}Promise.race([writing,new Promise(r=>setTimeout(r,3000))]).then(()=>location.reload());}
// A second tab, or an old one left open, never overwrites newer progress: it stops writing and asks for a reload.
// The browser may still force a dialog shut (repeated Escape, the back gesture), so the notice comes back on close.
function lockTab(){conflict=true;clearTimeout(saveTimer);if(dialog.open&&dialog.classList.contains('lock-dialog'))return;modal('Игра открыта в другой вкладке',`<p>В другой вкладке или окне мастерская уже сохранила более новый прогресс. Эта вкладка больше ничего не записывает, чтобы его не стереть.</p><p class="fine-print">Перезагрузи страницу, чтобы продолжить с последнего сохранения. Состояние этой вкладки можно скачать файлом.</p><div class="row fill">${btn('export',`${icon('download')}<span>Скачать</span>`)}${btn('reload-app','Перезагрузить','primary')}</div>`,false,'lock-dialog');}
const otherWrite=v=>{if(v&&v.tab!==TAB&&v.at>known)lockTab();};
channel?.addEventListener('message',e=>otherWrite(e.data));
// Storage events come only from other tabs; old versions write the save without a stamp.
addEventListener('storage',e=>{if(e.key===STAMP){try{otherWrite(JSON.parse(e.newValue));}catch{}}else if(e.key===SAVE&&e.newValue)lockTab();});
// Toasts live in the top layer, so a reward or an error is seen above an open dialog; the queue rules are in notices.js.
const toasts=new ToastQueue();let toastTimer=0;
function toast(text,opt=false,act=null){if(toasts.add(toastSpec(text,opt,act)))showToast();}
const nextToast=()=>{toasts.next();showToast();};
// An undo offer is withdrawn as soon as the next action makes it stale.
const withdrawToast=action=>{if(toasts.drop(t=>t.action?.action===action))showToast();};
function showToast(){clearTimeout(toastTimer);const t=toasts.now,el=toastEl;
 if(!t){el.classList.remove('show');toastTimer=setTimeout(()=>{try{el.hidePopover?.();}catch{}},320);return;}
 el.innerHTML=`${icon(t.action?.icon||(t.kind==='error'?'info':t.kind==='mark'?'sign':t.kind==='hint'?'help':'check'))}<span>${esc(t.text)}</span>${t.action?btn(t.action.action,t.action.label,'toast-action'):''}`;
 el.setAttribute('role',t.kind==='error'?'alert':'status');el.className='toast '+t.kind+(t.action?' actionable':'');raiseToast();void el.offsetWidth;el.classList.add('show');
 toastTimer=setTimeout(nextToast,toastDuration(t));}
// A modal dialog makes the rest of the page inert, so the toast moves into it; as a popover it is drawn above the
// dialog, and a browser without popovers still shows it as a fixed layer inside the dialog.
function raiseToast(){if(!toasts.now)return;const el=toastEl,host=dialog.open?dialog:document.body;if(el.parentElement!==host)host.append(el);try{if(el.matches(':popover-open'))el.hidePopover();el.showPopover?.();}catch{}}
function crash(e){if(e instanceof J.AtelierError){toast(e.message,true);return;}console.error(e);const now=Date.now();if(now-lastCrash<1500)return;lastCrash=now;
 toast('Что-то пошло не так. Сохранение можно скачать.',true,{action:'export',label:'Скачать'});
 const panel=$('#panel');if(panel&&(!panel.children.length||panel.querySelector('.splash')))panel.innerHTML=`<div class="card empty recovery">${icon('info','big-icon')}<h2>Раздел не открылся</h2><p class="muted">Скачай сохранение, чтобы ничего не потерять, и перезагрузи страницу.</p>${btn('export',`${icon('download')}<span>Скачать сохранение</span>`,'primary big')}${btn('reload-app','Перезагрузить','big')}</div>`;}
// The piece taken apart can come back only until the next action.
const forgetRecycled=()=>{recycled=null;withdrawToast('unrecycle');};
function action(fn,message){try{editor?.finish();const result=fn();forgetRecycled();scheduleSave();render();audio.play('good');if(message)toast(typeof message==='function'?message(result):message);return result;}catch(e){audio.play('error');if(e instanceof J.AtelierError)toast(e.message,true);else crash(e);}}
// One dialog at a time. modal() shows at once, replacing what is open; queueModal() waits until the open one closes,
// and dialogs that wait together open in a fixed order. close() is immediate.
const modals=new ModalQueue();let modalClosable=true,ignorePop=false;
function modal(title,body,closable=true,cls=''){$('#dialog-body').innerHTML=`<div class="modal-title"><h2 id="dialog-title">${title}</h2>${closable?btn('close',icon('close'),'icon-button ghost','aria-label="Закрыть"'):''}</div><div class="modal-body">${body}</div>`;dialog.className=cls;modalClosable=closable;
// The dialog itself takes the focus, so a long one opens at its title rather than scrolled to its first button.
 if(!dialog.open){dialog.showModal();dialog.focus({preventScroll:true});if(!ignorePop&&!history.state?.modal)history.pushState({modal:1},'');}dialog.scrollTop=0;raiseToast();}
function queueModal(fn,kind){modals.add(fn,kind);if(!dialog.open)modals.next()();}
function close(){dialog.close();}
// Only a tap on the dimmed backdrop closes a dialog; its own padding belongs to the dialog.
dialog.addEventListener('click',e=>{if(e.target!==dialog||!modalClosable||conflict)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
// The close event comes after close() has returned. History follows the dialog: the entry added on open is taken back
// whatever closed it (a button, Escape, the system back gesture), unless another dialog has opened in the meantime.
// A welcome closed by the browser itself (Escape twice, the system back gesture) is a quiet start, the default choice.
dialog.addEventListener('close',()=>{if(dialog.open)return;if(conflict){lockTab();return;}if(history.state?.modal){ignorePop=true;history.back();}if(dialog.classList.contains('welcome-dialog')&&!state.welcomed){state.welcomed=true;scheduleSave();render();}raiseToast();modals.next()?.();});
// «Назад» closes an open dialog instead of leaving the game; a dialog that must be answered keeps its entry.
addEventListener('popstate',()=>{if(ignorePop){ignorePop=false;if(dialog.open)history.pushState({modal:1},'');return;}if(!dialog.open)return;if(modalClosable&&!conflict)close();else history.pushState({modal:1},'');});
function currentBuyer(){return state.customers.find(c=>c.id===buyerId&&!c.served)||state.customers.find(c=>!c.served);}
const currentItem=()=>state.stock.find(i=>i.id===itemId)||state.stock[0];
const client=id=>J.CLIENTS.find(p=>p.id===id);
const typeName=id=>J.TYPES.find(t=>t.id===id)?.name||id;
const costText=d=>{const c=J.costs(d);return Object.entries(c.resources).map(([id,n])=>`${(J.METALS[id]||J.GEMS[id]).name} ×${n}`).join(' · ')+(c.coins?' · '+c.coins+' монет':'');};
const coins=n=>`<span class="coins">${icon('coin')}${n}</span>`;
const matName=id=>(J.METALS[id]||J.GEMS[id]).name,mult=e=>J.craftMultiplier(e).toFixed(2).replace('.',',');
const plural=(n,one,few,many)=>{const a=n%10,b=n%100;return a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many;};
function typeIcon(type){const d=J.makeDesign(type,'oval','gold');if(!['sword','staff','ring'].includes(type))d.gems.push({kind:'amethyst',x:50,y:47,size:6,cut:'round'});return jewelURL(d,128,{background:false});}
function templateIcon(id){return id==='free'?null:jewelURL(J.makeDesign(selectedType,id,J.available(state,selectedMetal)?selectedMetal:'copper'),96,{background:false});}
// Thumbnails scale the current silhouette to fill the tile, so fine patterns stay readable.
function fill(d){if(d.outline.length<3)return d;const xs=d.outline.map(p=>p.x),ys=d.outline.map(p=>p.y),x0=Math.min(...xs),y0=Math.min(...ys),k=84/Math.max(Math.max(...xs)-x0,Math.max(...ys)-y0,1),ox=50-(Math.max(...xs)+x0)/2*k,oy=50-(Math.max(...ys)+y0)/2*k+3,m=p=>({...p,x:p.x*k+ox,y:p.y*k+oy});return {...d,outline:d.outline.map(m),holes:d.holes.map(h=>h.map(m)),strokes:d.strokes.map(s=>({...s,width:Math.min(6,s.width*k),points:s.points.map(m)})),gems:d.gems.map(g=>({...m(g),size:Math.min(7,g.size*k)})),polish:[]};}
function patternThumb(id){const base=J.clone(state.draft.design);base.strokes=[];if(id==='runes'&&!base.gems.length)try{base.gems=layoutGems(base,'solo',{kind:'sapphire',size:3});}catch{}try{base.strokes=patternStrokes(base,id,{width:1.6});}catch{return null;}base.polish=[];return jewelURL(fill(base),80,{background:false});}
function layoutThumb(id){const d=J.makeDesign('pendant','circle','silver');try{d.gems=layoutGems(d,id,{kind:editor?.gem||'garnet',size:5});}catch{}return jewelURL(d,80,{background:false});}
function sceneHTML(shop=false){return `<div class="scene-wrap${shop?'':' studio-scene'}"><canvas id="scene" width="480" height="260" aria-label="${shop?'Лавка: прилавок с изделиями и покупатели':'Ювелирная мастерская: стол гравировки, камни, оправы и ювелир'}" role="img"></canvas><span class="scene-caption">${shop?'Лавка авторских украшений':'Веленский порт · 1740'}</span></div>`;}
// Larger text and calmer motion are this player's choices on top of the system setting.
function applyPrefs(){const root=document.documentElement;root.classList.toggle('large-text',!!state.prefs?.large);root.classList.toggle('calm',!!state.prefs?.calm);}
function render(){
 if(editor){editorOptions={tool:editor.tool,width:editor.width,symmetry:editor.symmetry,gem:editor.gem,cut:editor.cut,zoom:editor.zoom,pan:{...editor.pan}};editor.destroy();editor=null;}
applyPrefs();audio.setOptions(state);audio.setScene(view==='shop'||view==='orders'?'shop':view==='supplies'&&supplyTab==='map'?'explore':'forge');
 const level=Math.floor(state.xp/35)+1,guests=state.customers.filter(c=>!c.served).length,ready=deliverable(state);
 $('#hud').innerHTML=`<span class="stat" title="Монеты">${icon('coin')}<b id="hud-gold">${state.gold}</b></span><span class="stat" title="Уровень мастера: опыт ${state.xp}">${icon('spark')}<b>${level}</b><i class="xp" style="--p:${(state.xp%35)/35*100}%"></i></span><span class="stat" title="Изделий на витрине">${icon('box')}<b>${state.stock.length}</b></span><span class="stat day">День <b>${state.day}</b></span>`;
 $('#navigation').innerHTML=[['studio','studio','Мастерская'],['shop','shop','Витрина',guests&&state.stock.length],['supplies','supplies','Материалы'],['orders','orders','Заказы',ready],['develop','develop','Развитие',J.TOOLS.some(t=>!state.skills.includes(t.id)&&t.parents.every(p=>state.skills.includes(p))&&state.gold>=t.cost&&state.xp>=t.xp)]].map(([id,ic,text,dot])=>btn('navigate',`${icon(ic)}<span>${text}</span>${dot?'<i class="dot" aria-hidden="true"></i>':''}`,view===id?'active':'',`data-view="${id}" ${view===id?'aria-current="page"':''}`)).join('');
 $('#panel').className='panel view-'+view+(view==='studio'&&state.draft?' editor-panel':'');$('#panel').innerHTML=({studio:studioHTML,shop:shopHTML,supplies:suppliesHTML,orders:ordersHTML,develop:developHTML}[view])();
 if(view==='studio'&&state.draft){editor=new JewelEditor($('#jewel-canvas'),state,{onChange:updateEditor,onCommit:()=>{scheduleSave();audio.play(editor?.tool==='rune'?'magic':editor?.tool==='polish'?'polish':'rivet');updateEditor();},onError:text=>toast(text,true)});Object.assign(editor,editorOptions);editor.setWidth(editor.width);if(!state.skills.includes('facets'))editor.cut='round';if(!J.available(state,editor.gem))editor.gem='garnet';editor.pan={...editorOptions.pan};editor.dirty=true;updateEditor();}
 if(view==='shop'){const a=$('.buyer-card.active');if(a)a.parentElement.scrollLeft=a.offsetLeft-a.parentElement.offsetLeft-8;}
 notice();paint(performance.now(),0);
}
function studioHTML(){
 if(state.draft)return editorHTML();
 const ids=J.templatesFor(selectedType);if(!ids.includes(template))template='oval';if(!J.available(state,selectedMetal))selectedMetal='copper';
 return sceneHTML()+`<section class="studio-start"><div class="section-line"><h1>Новое изделие</h1>${btn('inventory',icon('grid'),'icon-button ghost','aria-label="Запасы материалов"')}</div>
 <h3 class="label">Вид</h3><div class="type-grid">${J.TYPES.map(t=>{const open=J.typeAvailable(state,t.id);return btn('select-type',`<img src="${typeIcon(t.id)}" alt=""><span>${t.short}</span>${open?'':icon('lock','corner')}`,`type-card${selectedType===t.id?' active':''}${open?'':' locked'}`,`data-type="${t.id}" aria-pressed="${selectedType===t.id}"${open?'':` aria-label="${t.short}: нужна техника «Оружейные оправы»"`}`);}).join('')}</div>
 <h3 class="label">Основа</h3><div class="rail template-row" aria-label="Базовые заготовки">${ids.map(id=>{const src=templateIcon(id);return btn('template',`${src?`<img src="${src}" alt="">`:`<span class="free-shape">${icon('shape')}</span>`}<span>${J.TEMPLATES.find(t=>t.id===id).name}</span>`,`template-card${id===template?' active':''}`,`data-template="${id}" aria-pressed="${id===template}"`);}).join('')}</div>
 <h3 class="label">Металл</h3><div class="metal-row">${Object.entries(J.METALS).map(([id,m])=>{const open=J.available(state,id);return btn('metal',`<img src="${metalURL(id,48)}" alt=""><span>${m.name}<small>${open?'в запасе '+state.materials[id]:'закрыто'}</small></span>`,`metal-chip${selectedMetal===id?' active':''}`,`data-metal="${id}" aria-pressed="${selectedMetal===id}" ${open?'':'disabled'}`);}).join('')}</div>
 ${btn('start-design',`${icon('studio')}<span>Начать работу</span>`,'primary big')}<p class="fine-print center">Материалы списываются только при завершении</p></section>
 ${state.library.length?`<div class="section-line"><h2>Мои модели</h2><small>${state.library.length}/40</small></div><div class="rail library">${state.library.map(m=>btn('load-model',`<img src="${jewelURL(m.design,112)}" alt=""><span>${esc(m.design.name)}</span>`,'library-card',`data-model="${m.id}"`)).join('')}</div>`:''}`;
}
function editorHTML(){const d=state.draft.design;
 return `<div class="editor-heading"><input id="jewel-name" maxlength="48" value="${esc(d.name)}" aria-label="Название изделия">${btn('undo',icon('undo'),'icon-button','aria-label="Отменить действие"')}${btn('redo',icon('redo'),'icon-button','aria-label="Повторить действие"')}${btn('editor-help',icon('help'),'icon-button','aria-label="Как создавать украшение"')}</div><div id="editor-metrics" class="editor-metrics"></div>
 <div class="editor-stage"><canvas id="jewel-canvas" aria-label="Редактор изделия. Рисуй пальцем, перетаскивай контур и камни; два пальца меняют масштаб." tabindex="0"></canvas><span id="editor-hint" class="editor-hint"></span><div class="zoom-controls">${btn('zoom-in',icon('plus'),'','aria-label="Увеличить масштаб"')}${btn('zoom-reset',icon('fit'),'','aria-label="Сбросить масштаб"')}${btn('zoom-out',icon('minus'),'','aria-label="Уменьшить масштаб"')}</div><span id="zoom-level" class="zoom-level">100%</span><canvas id="artist-scene" class="artist-inset" width="480" height="260" aria-label="Ювелир работает за столом" role="img"></canvas></div>
 <div class="tools" role="toolbar" aria-label="Инструменты">${TOOLSET.map(([id,text])=>btn('editor-tool',`${icon(id)}<span>${text}</span>`,editorOptions.tool===id?'active':'',`data-tool="${id}" title="${text}" aria-pressed="${editorOptions.tool===id}"`)).join('')}</div><div id="tool-options" class="tool-options"></div>
 <div class="editor-bottom">${btn('material-picker',`<img id="metal-badge" src="${metalURL(d.metal,40)}" alt="">`,'secondary','aria-label="Сменить металл и посмотреть расход"')}${btn('finish-design','Готово','primary','id="finish-design"')}${btn('remember',icon('bookmark'),'secondary','aria-label="Сохранить модель"')}${btn('discard',icon('close'),'secondary danger','aria-label="Убрать заготовку"')}</div>`;
}
function updateEditor(metrics){if(!state.draft||!$('#editor-metrics'))return;const d=editor?.design||state.draft.design,e=metrics||J.evaluate(d);
 $('#editor-metrics').innerHTML=`<span class="meter craft" style="--p:${e.craft}%" title="Мастерство умножает цену: ×${mult(e)}"><em>Ремесло</em><b>${e.craft}<small aria-label="к цене ×${mult(e)}">×${mult(e)}</small></b></span><span><em>Стиль</em><b>${e.label}</b></span><span class="${e.magic?'magic':''}"><em>Магия</em><b>${magicOf(e)}</b></span><span class="meter" style="--p:${e.polish}%"><em>Блеск</em><b>${e.polish}%</b></span>`;
 const tool=editor?.tool||editorOptions.tool,hints={shape:'Потяни точку или нарисуй новый контур',pattern:'Выбери узор: он ляжет по форме. Нажми ещё раз — другой вариант',engrave:'Нанеси свой узор по металлу',stone:'Поставь камень; потяни, чтобы переместить',rune:'Проведи руну к камню: он пробудится',polish:`Полируй: мастерство ×${mult(e)} к цене`,hole:'Обведи вырез внутри металлической основы',move:'Перемещай поле; два пальца — масштаб',erase:'Коснись камня, линии или выреза'};$('#editor-hint').textContent=hints[tool];
 $('#zoom-level').textContent=Math.round((editor?.zoom||1)*100)+'%';
 const a=$('[data-action="undo"]'),b=$('[data-action="redo"]');a.disabled=!state.draft.undo.length;b.disabled=!state.draft.redo.length;
 const badge=$('#metal-badge');if(badge&&!badge.src.endsWith(metalURL(d.metal,40)))badge.src=metalURL(d.metal,40);
 // A missing material does not block «Готово»: the button turns into the list of what is short and opens a way to get it.
 const c=J.costs(d),short=J.shortfall(state,d),afford=!short.length&&state.gold>=c.coins,button=$('#finish-design'),ready=d.outline.length>=3&&J.hasHandwork(d),lack=short.map(v=>`${matName(v.id)} ×${v.need-v.have}`).join(' · ')||`${c.coins} мон. за основу`;
 button.dataset.action=ready&&!afford?'shortfall':'finish-design';button.classList.toggle('short',ready&&!afford);
 button.innerHTML=!J.hasHandwork(d)?'Оформи заготовку':!afford?`<span>Не хватает</span><small>${lack}</small>`:`<span>Готово</span><small>${J.METALS[d.metal].name} ×${c.resources[d.metal]}${d.gems.length?' · камней '+d.gems.length:''}${c.coins?' · '+c.coins+' мон.':''}</small>`;
 button.title=costText(d);button.setAttribute('aria-label',afford?'Завершить изделие. '+costText(d):'Не хватает: '+lack+'. Докупить или сменить металл');button.disabled=!ready;
 const opts=$('#tool-options'),key=tool+':'+(editor?.selected??-1)+':'+(tool==='pattern'?JSON.stringify(state.draft.design.outline)+state.draft.design.holes.length+state.draft.design.gems.length:'');if(opts.dataset.key!==key){opts.dataset.key=key;renderToolOptions();}
 for(const el of document.querySelectorAll('[data-action="editor-tool"]')){el.classList.toggle('active',el.dataset.tool===tool);el.setAttribute('aria-pressed',el.dataset.tool===tool?'true':'false');}
}
function symmetryButton(){return btn('symmetry',icon('symmetry'),'icon-button'+(editor?.symmetry?' active':''),`id="symmetry" aria-label="Зеркальная симметрия" aria-pressed="${!!editor?.symmetry}"`);}
function renderToolOptions(){const tool=editor?.tool||editorOptions.tool,w=editor?.width||editorOptions.width,facets=state.skills.includes('facets'),el=$('#tool-options');el.dataset.tool=tool;
 const slider=(label,max)=>`<label class="slider"><span>${label}</span><input id="brush-width" aria-label="${label}" type="range" min="0.5" max="${max}" step="0.5" value="${w}"></label>`;
 if(tool==='pattern'){const gem=editor?.gem||'garnet',lines=patternMode==='lines';el.innerHTML=`<div class="option-row"><div class="segmented" role="tablist">${btn('pattern-mode','Гравировка',lines?'active':'',`data-mode="lines" role="tab" aria-selected="${lines}"`)}${btn('pattern-mode','Камни',lines?'':'active',`data-mode="gems" role="tab" aria-selected="${!lines}"`)}</div>${lines?`<label class="slider compact"><span>Линия</span><input id="brush-width" aria-label="Толщина линий узора" type="range" min="0.5" max="2.5" step="0.5" value="${w}"></label>`:btn('cycle-gem',`<img src="${gemURL(gem,40)}" alt=""><span>${J.GEMS[gem].name}<small>×${state.materials[gem]}</small></span>`,'gem-chip',`aria-label="Камень для раскладки: ${J.GEMS[gem].name}. Сменить"`)}</div>
  ${lines?`<div class="rail pattern-rail" aria-label="Узоры">${PATTERNS.map(p=>{const open=patternUnlocked(state,p.id),src=patternThumb(p.id);return btn('pattern',`${src?`<img src="${src}" alt="">`:`<span class="thumb-empty">${icon('pattern')}</span>`}<span>${p.name}</span>${open?'':icon('lock','corner')}`,`pattern-card${open?'':' locked'}`,`data-pattern="${p.id}" title="${p.hint}"${open?'':` aria-label="${p.name}: откроется после ${p.need} изделий"`}`);}).join('')}</div>`:`<div class="rail pattern-rail" aria-label="Раскладка камней">${LAYOUTS.map(l=>btn('layout',`<img src="${layoutThumb(l.id)}" alt=""><span>${l.name}</span>`,'pattern-card',`data-layout="${l.id}"`)).join('')}</div>`}`;return;}
 if(tool==='stone'){el.innerHTML=`<div class="rail gem-rail" aria-label="Камень">${Object.entries(J.GEMS).filter(([id])=>J.available(state,id)).map(([id,g])=>btn('gem-kind',`<img src="${gemURL(id,40)}" alt=""><span>${g.name}<small>×${state.materials[id]}</small></span>`,'gem-chip'+(editor?.gem===id?' active':''),`data-gem="${id}" aria-pressed="${editor?.gem===id}"`)).join('')}</div>
  <div class="option-row">${slider('Размер',facets?5.5:3)}${facets?`<select id="gem-cut" aria-label="Огранка">${[['round','Круг'],['oval','Овал'],['pear','Капля']].map(([id,name])=>`<option value="${id}" ${editor?.cut===id?'selected':''}>${name}</option>`).join('')}</select>`:''}${symmetryButton()}</div>`;return;}
 el.innerHTML=`<div class="option-row">${['move','erase'].includes(tool)?`<p class="muted">${tool==='move'?'Два пальца — масштаб, один — перемещение поля.':'Касание удаляет камень, вырез или линию под пальцем.'}</p>`:slider(tool==='shape'?'Контур':tool==='polish'?'Кисть':'Толщина',5.5)}${['shape','engrave','rune','stone'].includes(tool)?symmetryButton():''}</div>`;}
function reaction(person,buyer,item,q){
 if(!item)return person.line;const d=item.design,e=J.evaluate(d),bits=[];
 if(q.demand.remaining)return 'Такое я уже видел у соседей. Нет ли чего-то нового?';
 if(buyer.want===d.type)bits.push(`Я как раз ищу ${TYPE_WANT[d.type]}.`);
 const taste=e.style[person.style]||0;if(taste>=60)bits.push(PRAISE[person.style]);else if(taste<30)bits.push(DOUBT[person.style]);
 if(person.metal===d.metal)bits.push(`${J.METALS[d.metal].name} — мой металл.`);
 if(e.effects[person.element])bits.push(`Чувствую ${J.ELEMENTS[person.element].toLowerCase()} в этих рунах.`);
 if(!bits.length)bits.push(q.fit>=55?'Хорошая работа. Подумаю о цене.':'Красиво, но это не совсем мой вкус.');
 return bits.slice(0,2).join(' ');
}
function shopHTML(){
 const {guests,buyer,person,fits,list,item,quotes,q,demand}=showcase(state,{buyerId,itemId,sort:sortMode,policy}),eye=state.skills.includes('eye');if(buyer)buyerId=buyer.id;if(item)itemId=item.id;
 let html=sceneHTML(true)+`<div class="rail buyers" aria-label="Покупатели">${guests.map(c=>{const p=client(c.client);return btn('buyer',`<img src="${portrait(p)}" alt=""><span><b>${p.name}</b><small>ищет ${TYPE_WANT[c.want]||'украшение'}</small></span>`,`buyer-card${buyer?.id===c.id?' active':''}`,`data-buyer="${c.id}" aria-pressed="${buyer?.id===c.id}"`);}).join('')}${!guests.length?`<div class="closed-note">${icon('sun')}<span>Покупатели на сегодня ушли</span>${btn('next-day','Открыть лавку завтра','primary')}</div>`:''}</div>`;
 if(person)html+=`<section class="buyer-panel"><img class="portrait" src="${portrait(person)}" alt=""><div><div class="buyer-name"><b>${person.name}</b><small>${person.role||''}</small></div><p class="speech">${esc(reaction(person,buyer,item,q||{demand:{},fit:0}))}</p>
  <div class="tags"><span>${icon('heart')}${STYLE[person.style]}</span><span><img src="${metalURL(person.metal,32)}" alt="">${J.METALS[person.metal].name}</span><span>${icon(ELEMENT_ICON[person.element])}${J.ELEMENTS[person.element]}</span><span>${icon('coin')}${eye?buyer.budget:'≈'+Math.round(buyer.budget/50)*50}</span></div></div></section>`;
 if(!item)return html+`<div class="card empty"><img src="${typeIcon('pendant')}" alt=""><h2>Витрина ждёт твою работу</h2><p class="muted">Форма, узор и камни сохранятся точно такими, какими ты их создал.</p>${btn('navigate','Создать украшение','primary big','data-view="studio"')}</div>`;
 const d=item.design,e=J.evaluate(d),position=list.indexOf(item)+1;
 html+=`<section class="feature"><div class="tray">${btn('previous',icon('left'),'icon-button ghost','aria-label="Предыдущее изделие"')}<img src="${jewelURL(d,320,{background:false})}" alt="${esc(d.name)}: авторская форма, рисунок и камни">${btn('next',icon('right'),'icon-button ghost','aria-label="Следующее изделие"')}${q?`<span class="fit-badge ${q.fit>=70?'hi':q.fit>=50?'mid':'lo'}" title="Совпадение со вкусом">${icon('heart')}${q.fit}%</span>`:''}</div>
 <div class="feature-title"><h2>${esc(d.name)}</h2><small>${typeName(d.type)} · ${position}/${list.length}</small></div>
 <div class="metrics"><span class="meter" style="--p:${e.craft}%"><em>Мастерство</em><b>${e.craft}</b></span><span><em>Стиль</em><b>${e.label}</b></span><span class="${e.magic?'magic':''}"><em>Магия</em><b>${magicOf(e)}</b></span></div>
 <div class="market-status${demand.remaining?' cool':''}"><span>${demand.remaining?`Спрос −75% · ещё ${demand.remaining} торг. дн.`:'Продажи по полной цене'}</span><span class="demand-dots${demand.remaining?' cool':''}" aria-label="${demand.sales}${demand.soft?' с половиной':''} из 4">${Array.from({length:4},(_,i)=>`<i class="${i<demand.sales?'on':i===demand.sales&&demand.soft?'half':''}"></i>`).join('')}</span>${btn('demand-info',icon('info'),'icon-button ghost small','aria-label="Как работает спрос"')}</div>`;
 if(q){
  html+=`<div class="price-row" role="radiogroup" aria-label="Цена">${[['low','Скидка'],['fair','Полная'],['high','Дороже']].map(([id,name])=>btn('policy',`<span>${name}</span><b>${quotes[id].price}</b>${eye?`<i>${quotes[id].accepted?'возьмёт':'откажет'}</i>`:''}`,`${id===policy?'active':''}${eye&&!quotes[id].accepted?' refused':''}`,`data-policy="${id}" role="radio" aria-checked="${id===policy}"`)).join('')}</div>`;
  html+=q.accepted?btn('sell',`<span>Продать</span>${coins(q.price)}`,'primary big sell-button',`data-item="${item.id}"`):`<div class="counter"><p>${esc(q.reason)}${q.offer?` Предлагаю <b>${q.offer}</b>.`:''}</p>${q.offer?btn('sell-counter',`<span>Согласиться</span>${coins(q.offer)}`,'primary',`data-item="${item.id}"`):''}</div>`;}
 else html+=btn('next-day',`${icon('sun')}<span>Открыть лавку завтра</span>`,'primary big');
 html+=`<div class="detail-actions">${btn('item-info',`${icon('scale')}<span>Оценка</span>`,'ghost',`data-item="${item.id}"`)}${btn('save-item-model',`${icon('bookmark')}<span>В модели</span>`,'ghost',`data-item="${item.id}"`)}${btn('recycle',`${icon('recycle')}<span>Переплавить</span>`,'ghost danger',`data-item="${item.id}"`)}</div></section>`;
 html+=`<div class="section-line"><h2>Витрина <small>${state.stock.length}/${J.MAX_STOCK}</small></h2>${buyer?btn('sort',sortMode==='fit'?`${icon('heart')}По вкусу`:`${icon('grid')}Новые`,'chip',`aria-label="Порядок: ${sortMode==='fit'?'по вкусу покупателя':'сначала новые'}"`):''}</div><div class="gallery">${list.map(i=>{const fit=buyer?fits.get(i.id):null;return btn('pick-item',`<img src="${jewelURL(i.design,112,{background:false})}" alt="">${fit!==null?`<span class="fit ${fit>=70?'hi':fit>=50?'mid':'lo'}">${fit}%</span>`:''}`,'gallery-item'+(i.id===item.id?' active':''),`data-item="${i.id}" aria-label="${esc(i.design.name)}${fit!==null?', вкус '+fit+'%':''}" aria-pressed="${i.id===item.id}"`);}).join('')}</div>`;
 return html;
}
function suppliesHTML(){let html=`<div class="section-line"><h1>Материалы</h1>${btn('inventory',icon('grid'),'icon-button ghost','aria-label="Запасы"')}</div><div class="tabs" role="tablist">${btn('supply-tab',`${icon('coin')}Поставщик`,supplyTab==='buy'?'active':'',`data-tab="buy" role="tab" aria-selected="${supplyTab==='buy'}"`)}${btn('supply-tab',`${icon('pin')}Места находок`,supplyTab==='map'?'active':'',`data-tab="map" role="tab" aria-selected="${supplyTab==='map'}"`)}</div>`;
 if(supplyTab==='map')return html+`<div class="scene-wrap map-stage"><canvas id="map" width="480" height="260" aria-label="Карта мест находок: берег, сад аббатства и лунный кряж"></canvas>${J.AREAS.map(a=>{const open=state.crafted>=a.need;return btn('gather',`${icon(open?'pin':'lock')}${a.name}`,`map-pin${state.daily.areas.includes(a.id)?' done':''}`,`data-area="${a.id}" style="left:${a.x/480*100}%;top:${a.y/260*100}%" ${state.energy<=0||state.daily.areas.includes(a.id)||!open?'disabled':''}`);}).join('')}</div>
  <div class="card"><div class="section-line tight"><h2>Находки</h2><span class="energy" aria-label="Силы: ${state.energy} из 4">${Array.from({length:4},(_,i)=>`<i class="${i<state.energy?'on':''}"></i>`).join('')}</span></div><p class="muted">В каждом месте можно искать раз в день. Сад откроется после 3 изделий, кряж — после 8. Находки помогают продолжить даже с пустым кошельком.</p>${btn('next-day',`${icon('sun')}<span>Следующий день</span>`,'big')}</div>`;
 return html+`<div class="supply-grid">${Object.entries({...J.METALS,...J.GEMS}).map(([id,m])=>{const gem=!!J.GEMS[id],count=gem?1:5,open=J.available(state,id);return `<article class="supply${open?'':' locked'}"><img src="${gem?gemURL(id,56):metalURL(id,56)}" alt=""><div class="copy"><b>${m.name}</b><small>В запасе ${state.materials[id]}</small><small>${m.price} за ${gem?'камень':'слиток'}${gem?' · '+J.ELEMENTS[m.element]:''}</small></div>${open?btn('buy',`+${count}<small>${m.price*count}</small>`,'buy',`data-material="${id}" data-count="${count}" aria-label="Купить ${m.name} ×${count} за ${m.price*count} монет" ${state.gold<m.price*count?'disabled':''}`):btn('locked-material',icon('lock'),'icon-button ghost',`data-material="${id}" aria-label="Как открыть: ${m.name}"`)}</article>`;}).join('')}</div>`;
}
function ordersHTML(){const pieces=orderPieces(state),list=state.requests.map(r=>{const p=client(r.client),item=pieces.get(r.id);
  return `<article class="card order-card${r.done?' done':''}"><img class="portrait" src="${portrait(p)}" alt="${p.name}"><div class="order-copy"><h2>${esc(r.title)}</h2><p class="meta">${p.name} · ${typeName(r.type)}</p><div class="tags"><span>${icon('heart')}${STYLE[r.style]} ≥ ${r.min}</span><span>${icon('studio')}Ремесло ≥ 50</span>${r.minMagic?`<span>${icon('rune')}Магия ≥ ${r.minMagic}</span>`:''}</div><small>${r.done?`${icon('check')}Заказ выполнен`:`До дня ${r.until} · свежий дизайн · +15% к цене`}</small>${!r.done?(item?btn('deliver',`<img src="${jewelURL(item.design,64)}" alt=""><span>Передать «${esc(item.design.name)}»</span>`,'primary',`data-request="${r.id}" data-item="${item.id}"`):btn('prepare-order',`${icon('studio')}<span>Создать для заказа</span>`,'',`data-type="${r.type}"`)):''}</div></article>`;}).join('');
 return `<div class="section-line"><h1>Личные заказы</h1><small>По вкусу жителей</small></div>${list||`<div class="card empty">${icon('orders','big-icon')}<h2>Заказов пока нет</h2><p class="muted">Жители оставят новые просьбы завтра.</p></div>`}`;}
function developHTML(){const level=Math.floor(state.xp/35)+1,opened=PATTERNS.filter(p=>patternUnlocked(state,p.id)).length,next=PATTERNS.filter(p=>!patternUnlocked(state,p.id)).sort((a,b)=>a.need-b.need)[0];
 return `<div class="section-line"><h1>Искусство ювелира</h1></div><div class="card xp-card">${icon('spark','big-icon')}<div><b>Уровень ${level}</b><small>Опыт ${state.xp} · до следующего уровня ${35-state.xp%35}</small><i class="bar" style="--p:${(state.xp%35)/35*100}%"></i></div></div>
 <div class="tree">${[J.TOOLS.slice(0,3),['signature','mounts','alchemy'].map(id=>J.TOOLS.find(t=>t.id===id))].map(row=>`<div class="tree-row">${row.map(t=>{const learned=state.skills.includes(t.id),ready=t.parents.every(p=>state.skills.includes(p)),affordable=state.gold>=t.cost&&state.xp>=t.xp;return btn('skill',`${icon(SKILL_ICON[t.id])}<b>${t.name}</b><small>${learned?'Изучено':ready?`${t.cost} мон. · ${t.xp} оп.`:'Нужна предыдущая'}</small>`,`skill${learned?' unlocked':ready?(affordable?' ready':''):' locked'}`,`data-skill="${t.id}"`);}).join('')}</div>`).join('')}</div>
 <div class="card note"><h3>Узоры мастерской · ${opened}/${PATTERNS.length}</h3><div class="pattern-list">${PATTERNS.map(p=>`<span class="${patternUnlocked(state,p.id)?'':'locked'}">${p.name}</span>`).join('')}</div><p class="muted">${next?`Новые узоры откроются после ${next.need} изделий (сделано ${state.crafted}).`:'Все узоры открыты.'} Опыт даётся за создание, продажу и заказы.</p></div>`;}
function paint(time,dt){
 editor?.paint(still()?0:time);
 const inset=$('#artist-scene'),room=$('#scene'),map=$('#map');
 if(inset&&editor)scene.paint(inset.getContext('2d'),state,{design:editor.operation?editor.preview():state.draft.design,rev:editor.rev,working:!!editor.operation,tool:editor.tool,time:still()?0:time,dt});
 if(room)scene.paint(room.getContext('2d'),state,{shop:view==='shop',design:view==='shop'?currentItem()?.design:null,stock:view==='shop'?state.stock.slice(0,5).map(i=>i.design):[],buyerId,time:still()?0:time,dt});
 if(map)paintMap(map.getContext('2d'),state,still()?0:time);
}
function frame(time){requestAnimationFrame(frame);if(document.hidden||time-lastFrame<50)return;const dt=Math.min(.1,(time-lastFrame)/1000);lastFrame=time;paint(time,dt);}
// Coins fly from the sale to the purse; skipped when motion is reduced.
function coinBurst(a){const to=$('#hud-gold');if(still()||!a||!to)return;const b=to.getBoundingClientRect();for(let i=0;i<9;i++){const el=document.createElement('span');el.className='flying-coin';el.innerHTML=icon('coin');document.body.append(el);const x=a.left+a.width/2+(i-4)*9,y=a.top+a.height/2;el.animate([{transform:`translate(${x}px,${y}px) scale(.6)`,opacity:0},{transform:`translate(${x+(i-4)*6}px,${y-40-i*3}px) scale(1)`,opacity:1,offset:.35},{transform:`translate(${b.left+b.width/2}px,${b.top+b.height/2}px) scale(.5)`,opacity:.2}],{duration:720+i*45,easing:'cubic-bezier(.5,0,.2,1)'}).onfinish=()=>el.remove();}setTimeout(()=>{$('#hud-gold')?.parentElement.classList.add('pulse');},700);}
function editorHelp(){modal('Твоя работа — твой рисунок',`<div class="help-grid"><b>${icon('shape')}</b><span>Потяни точки заготовки или нарисуй свой замкнутый контур. «Вырез» убирает металл внутри основы.</span><b>${icon('pattern')}</b><span>«Узоры» кладут готовую гравировку по форме изделия и раскладывают камни. Повторное нажатие даёт другой вариант, ${icon('undo','inline')} отменяет.</span><b>${icon('engrave')}</b><span>Рисуй узор по металлу сам. ${icon('symmetry','inline')} повторяет линию зеркально.</span><b>${icon('stone')}</b><span>Поставь камни и передвинь их пальцем. Камень должен держаться на металле.</span><b>${icon('rune')}</b><span>Проведи руну рядом с камнем: его свойство пробудится.</span><b>${icon('polish')}</b><span>Полируй поверхность движениями пальца. Обработанные участки блестят.</span><b>${icon('fit')}</b><span>Масштаб — двумя пальцами или кнопками. «Сдвиг» передвигает поле.</span></div><p class="fine-print">Рисунок и название не теряются при переходе между разделами. Материалы расходуются только после «Готово».</p>`);}
function showInventory(){modal('Мои материалы',`<div class="inventory-grid">${Object.entries({...J.METALS,...J.GEMS}).map(([id,m])=>`<span><img src="${J.GEMS[id]?gemURL(id,40):metalURL(id,40)}" alt="">${m.name}<b>×${state.materials[id]}</b></span>`).join('')}</div>${btn('go-supplier','К поставщику','primary')}`);}
function showMaterials(){editor?.finish();const d=state.draft.design;modal('Металл и расход',`<p>${esc(costText(d))}${J.costs(d).coins?' (готовая основа оружия)':''}</p><div class="inventory-grid">${Object.entries(J.METALS).map(([id,m])=>btn('apply-metal',`<img src="${metalURL(id,40)}" alt=""><span>${m.name}<small>Запас ${state.materials[id]}</small></span>`,'metal-chip'+(d.metal===id?' active':''),`data-metal="${id}" ${J.available(state,id)?'':'disabled'}`)).join('')}</div><p class="fine-print">Расход зависит от площади контура. Можно вернуться к рисунку и уменьшить оправу.</p>`);}
// Coins of a weapon base are paid at completion, so «Докупить и завершить» needs them on top of the materials.
function showShortfall(){editor?.finish();const d=state.draft.design,list=J.shortfall(state,d),base=J.costs(d).coins,sum=list.reduce((n,v)=>n+v.price,0),locked=list.filter(v=>!J.available(state,v.id)),row=(name,value,cls='')=>`<div class="score-row ${cls}"><span>${name}</span><b>${value}</b></div>`;
 modal(list.length?'Не хватает материалов':'Не хватает монет',`<div class="shortfall">${list.map(v=>row(`<img src="${J.GEMS[v.id]?gemURL(v.id,40):metalURL(v.id,40)}" alt="">${matName(v.id)}: нужно ${v.need}, есть ${v.have}`,J.available(state,v.id)?v.price+' мон.':'закрыто')).join('')}${base?row(`Готовая основа ${d.type==='sword'?'меча':'посоха'}`,base+' мон.'):''}${row('Всего',(sum+base)+' мон.','sum')}${row('В кошельке',state.gold+' мон.')}</div>
 ${locked.length?`<p class="fine-print">${locked.map(v=>matName(v.id)).join(', ')} у поставщика пока закрыто: нужна техника из «Развития».</p>`:''}${btn('buy-finish',`<span>${list.length?'Докупить и завершить':'Завершить'}</span>${coins(sum+base)}`,'primary big',state.gold<sum+base||locked.length?'disabled':'')}
 <div class="row fill">${btn('buy-shortfall',`Только докупить · ${sum}`,'',state.gold<sum||locked.length||!list.length?'disabled':'')}${btn('material-picker','Сменить металл')}</div>${btn('shortfall-gather',`${icon('pin')}<span>Искать находки</span>`,'ghost big')}<p class="fine-print">Цены поставщика. Находки на берегу ничего не стоят, но отнимают силы.</p>`);}
const bar=(name,value,max=100)=>`<div class="score-row"><span>${name}</span><b>${value}</b><i class="bar" style="--p:${Math.min(100,value/max*100)}%"></i></div>`;
function showAssessment(item,completed=false){const d=item.design,e=J.evaluate(d),effects=Object.entries(e.effects).map(([id,power])=>`<span>${icon(ELEMENT_ICON[id])}${J.ELEMENTS[id]} +${Math.round(power*(state.skills.includes('alchemy')?1.25:1))}</span>`).join('');
 modal(completed?'Украшение готово':'Оценка работы',`<div class="hero-jewel${completed?' reveal':''}"><img src="${jewelURL(d,320,{background:false})}" alt="${esc(d.name)}"></div><h2 class="center">${esc(d.name)}</h2><p class="center muted">${typeName(d.type)} · ${J.METALS[d.metal].name} · стиль «${e.label}»</p>${bar(`Мастерство · ×${mult(e)} к цене`,e.craft)}${bar('Магия',magicOf(e),60)}${effects?`<div class="tags">${effects}</div>`:''}
 ${state.skills.includes('eye')?`<h3 class="label">Разбор стиля</h3>${Object.entries(e.style).map(([id,n])=>bar(STYLE[id],n)).join('')}<p class="fine-print">Обработано ${e.polish}% металла, связанных камней: ${e.connections}. Мастерство зависит от контура, оправ, гравировки и обработки. У жителей разные вкусы.</p>`:`<p class="fine-print">Полировка и устойчивые оправы повышают мастерство. «Глаз мастера» открывает подробный разбор.</p>`}${completed?`<div class="row fill">${btn('completed-studio','Ещё изделие')}${btn('completed-shop','На витрину','primary')}</div>`:''}`,true,completed?'celebrate':'');}
function showDemand(){modal('Спрос любит новые работы',`<p>После <b>4 продаж одного дизайна по полной или высокой цене</b> цена следующих экземпляров падает на <b>75%</b>.</p><p>Скидка и встречная цена ниже 95% от полной считаются <b>половиной продажи</b>: две такие продажи — как одна полная.</p><p>Спрос восстанавливается через <b>7 торговых дней с продажами</b>. Дни без продаж этот срок не сокращают.</p><p>Для порта дизайн остаётся новым до первой продажи по полной цене.</p><p>Название, цвет металла и небольшие правки не делают старый рисунок новым. Меняй форму, узор и расположение камней — готовые узоры на другой форме тоже дают новый дизайн.</p><p class="fine-print">Личные заказы учитываются так же. Заказчики не принимают дизайн, спрос на который уже насыщен.</p>`);}
function showSkill(id){const t=J.TOOLS.find(t=>t.id===id);if(!t)return;const learned=state.skills.includes(id),parents=t.parents.filter(p=>!state.skills.includes(p));modal(t.name,`<div class="skill-hero">${icon(SKILL_ICON[id],'big-icon')}<p>${t.desc}</p></div>${parents.length?`<p>Сначала: ${parents.map(id=>J.TOOLS.find(t=>t.id===id).name).join(', ')}.</p>`:''}<div class="score-row"><span>Стоимость</span><b>${t.cost} мон.</b></div><div class="score-row"><span>Нужный опыт</span><b>${Math.min(state.xp,t.xp)} / ${t.xp}</b><i class="bar" style="--p:${Math.min(100,state.xp/t.xp*100)}%"></i></div><p class="fine-print">Опыт не тратится при изучении.</p>${btn('learn',learned?'Изучено':'Изучить','primary',`data-skill="${id}" ${learned||parents.length||state.gold<t.cost||state.xp<t.xp?'disabled':''}`)}`);}
function download(raw,filename){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function menu(){editor?.finish();modal('Мастерская «Сияние»',`<div class="settings">${btn('toggle-sound',`${icon('sound')}<span>Эффекты</span><em>${state.sound?'вкл':'выкл'}</em>`,state.sound?'on':'')}${btn('toggle-music',`${icon('music')}<span>Музыка</span><em>${state.music?'вкл':'выкл'}</em>`,state.music?'on':'')}<label class="slider">Громкость <input id="volume" aria-label="Громкость" type="range" min="0" max="1" step="0.05" value="${state.volume}"></label>${btn('toggle-large',`${icon('text')}<span>Крупный текст</span><em>${state.prefs?.large?'вкл':'выкл'}</em>`,state.prefs?.large?'on':'',`aria-pressed="${!!state.prefs?.large}"`)}${btn('toggle-calm',`${icon('calm')}<span>Меньше анимаций</span><em>${state.prefs?.calm||reduced.matches?'вкл':'выкл'}</em>`,state.prefs?.calm||reduced.matches?'on':'',`aria-pressed="${!!state.prefs?.calm}"`)}${btn('export',`${icon('download')}<span>Скачать сохранение</span>`)}${btn('import',`${icon('upload')}<span>Загрузить сохранение</span>`)}${backupMeta?btn('restore-backup',`${icon('undo')}<span>Вернуть прежнюю мастерскую</span><em>день ${backupMeta.day}</em>`):''}${state.legacy?btn('legacy-export',`${icon('download')}<span>Архив прежней игры</span>`):''}${updateReady?btn('reload-app',`${icon('download')}<span>Обновить до новой версии</span>`):''}${loadError?btn('reset-recovery','Начать заново','danger'):''}</div><p class="fine-print">Изделия и история действий сохраняются на этом устройстве. Для переноса на другой телефон скачай файл. ${reduced.matches?'Анимации уменьшены настройкой системы. ':''}Веленский порт, 1740 год.</p>${state.legacy?'<p class="fine-print">Монеты и запасы перенесены. Прежние товары обменены на 65% их стоимости; оригинальное сохранение доступно в архиве.</p>':''}`);}
function welcome(){const d=J.makeDesign('pendant','drop','gold');try{d.gems=layoutGems(d,'halo',{kind:'sapphire',size:3.6});d.strokes=patternStrokes(d,'beads',{});}catch{}
 modal('Добро пожаловать в «Сияние»',`<div class="welcome"><img src="${jewelURL(d,240,{background:false})}" alt="Золотой кулон-капля с сапфирами"><p>Твоя ювелирная мастерская в Веленском порту, 1740 год.</p></div><div class="help-grid"><b>${icon('pattern')}</b><span>Придумай форму, нанеси свой узор или выбери готовый — он ляжет точно по контуру.</span><b>${icon('stone')}</b><span>Поставь камни, пробуди их рунами, отполируй оправу.</span><b>${icon('shop')}</b><span>Выставляй работы и ищи покупателя по вкусу. Повторяющиеся дизайны теряют спрос.</span></div>${state.legacy?'<p class="fine-print">Твой прежний прогресс перенесён, исходное сохранение лежит в архиве.</p>':''}<h3 class="label center">Открыть мастерскую</h3><div class="row fill welcome-start">${btn('welcome-start',`${icon('mute')}<span>Тихо</span>`,'','data-sound="0"')}${btn('welcome-start',`${icon('sound')}<span>Со звуком</span>`,'primary','data-sound="1"')}</div><p class="fine-print center">Музыку и эффекты можно сменить в меню.</p>`,false,'welcome-dialog');}
// Ending the day sends the waiting guests away, so it asks first while one of them could still buy.
function dayReasons(){const guests=state.customers.filter(c=>!c.served),n=guests.length;return n&&state.stock.length?[`${n} ${plural(n,'покупатель','покупателя','покупателей')} ещё в лавке и ${n===1?'уйдёт':'уйдут'}: ${guests.map(c=>client(c.client).name).join(', ')}.`]:[];}
function nextDay(confirmed=false){editor?.finish();const reasons=confirmed?[]:dayReasons();
 if(reasons.length){modal('Закончить день?',`<ul class="reasons">${reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p class="fine-print">Черновик, запасы и витрина останутся до завтра.</p><div class="row fill">${btn('stay-in-shop','Остаться в лавке')}${btn('confirm-next-day','Закончить день','primary')}</div>`);return;}
 const day=state.day;let daily;try{forgetRecycled();daily=P.nextDay(state);}catch(e){toast(e.message,true);return;}scheduleSave();render();audio.play('good');
 const guests=state.customers.map(c=>client(c.client));
 queueModal(()=>modal(`Итоги дня ${day}`,`<div class="summary"><span><b>${daily.made||0}</b><small>создано</small></span><span><b>${daily.sales}</b><small>продано</small></span><span><b>${daily.income||0}</b><small>выручка</small></span></div><h3 class="label">Утро дня ${state.day}: в лавку заглянут</h3><div class="guest-row">${guests.map(p=>`<span><img src="${portrait(p)}" alt="">${p.name}</span>`).join('')}</div><p class="fine-print">Силы восстановлены. Черновик и история действий сохранены.</p>${btn('close','Начать день','primary')}`),'morning');}
function resetEditor(){editorOptions={tool:'shape',width:1,symmetry:false,gem:'garnet',cut:'round',zoom:1,pan:{x:0,y:0}};lastPattern={id:null,n:0};}
function editAndRefresh(fn){try{editor?.finish();const d=J.clone(state.draft.design);fn(d);J.edit(state,d);scheduleSave();editor.dirty=true;editor.metrics=J.evaluate(d);updateEditor();}catch(e){toast(e.message,true);}}
function sell(b,which){const name=currentItem()?.design.name,from=b.getBoundingClientRect();const q=action(()=>P.sell(state,b.dataset.item,currentBuyer()?.id,which),q=>q.saturated?`«${name}» продано за ${q.price}. Спрос на этот дизайн насыщен.`:`«${name}» продано за ${q.price}`);if(q){audio.play('coin');coinBurst(from);itemId=null;render();}}
// The workshop being replaced by an import or a fresh start is put aside first, so the menu can bring it back.
async function putAside(){editor?.finish();const raw=loadError?sourceRaw:J.serialize(state);if(!raw)return false;const meta={day:loadError?0:state.day,gold:loadError?0:state.gold,stock:loadError?0:state.stock.length,damaged:loadError,at:Date.now()};
 try{await Promise.race([saveBackup(raw,meta),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),4000))]);backupMeta=meta;return true;}catch{return false;}}
function replaceWorkshop(next,welcomed=true){editor?.destroy();editor=null;state=next;loadError=false;sourceRaw=null;if(welcomed)state.welcomed=true;view='studio';buyerId=null;itemId=null;forgetRecycled();resetEditor();scheduleSave();render();warmShowcase();}
function showBackup(){const m=backupMeta;if(!m)return;modal('Прежняя мастерская',m.damaged?`<p>Перед загрузкой здесь было повреждённое сохранение. Его можно скачать файлом и попробовать восстановить.</p>${btn('download-backup',`${icon('download')}<span>Скачать файл</span>`,'primary big')}`:`<p>День ${m.day} · ${m.gold} мон. · изделий на витрине: ${m.stock}.</p><p class="fine-print">Текущая мастерская встанет на её место, и её тоже можно будет вернуть отсюда.</p><div class="row fill">${btn('download-backup',`${icon('download')}<span>Скачать</span>`)}${btn('confirm-restore','Вернуть','primary')}</div>`);}
// A finished piece opens its assessment; the first one also asks the browser to keep the save.
function finish(fn){const done=action(fn);if(done){itemId=done.item.id;showAssessment(done.item,true);audio.play('magic');if(!persistAsked){persistAsked=true;navigator.storage?.persist?.().catch(()=>{});}}}
let pendingImport=null;
document.addEventListener('pointerdown',()=>{audio.unlock();},{passive:true});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(e.target.closest('#toast'))nextToast();if(!b||b.disabled)return;const id=b.dataset.action;
 switch(id){
 case'close':close();break;
 case'welcome-start':state.welcomed=true;state.sound=state.music=b.dataset.sound==='1';audio.setOptions(state);scheduleSave();close();render();if(state.sound)audio.unlock().then(()=>audio.play('magic'));break;
 case'navigate':editor?.finish();view=b.dataset.view;render();$('#panel').scrollTop=0;break;
 case'go-supplier':view='supplies';supplyTab='buy';close();render();break;
 case'select-type':if(!J.typeAvailable(state,b.dataset.type)){showSkill('mounts');break;}selectedType=b.dataset.type;template='oval';render();break;
 case'template':template=b.dataset.template;render();break;
 case'metal':selectedMetal=b.dataset.metal;render();break;
 case'start-design':resetEditor();action(()=>J.startDesign(state,selectedType,template,selectedMetal));break;
 case'editor-tool':editor.setTool(b.dataset.tool);editorOptions.tool=editor.tool;updateEditor();break;
 case'zoom-in':editor.changeZoom(editor.zoom*1.3);break;
 case'zoom-out':editor.changeZoom(editor.zoom/1.3);break;
 case'zoom-reset':editor.resetZoom();break;
 case'symmetry':editor.symmetry=!editor.symmetry;editorOptions.symmetry=editor.symmetry;editor.dirty=true;b.classList.toggle('active',editor.symmetry);b.setAttribute('aria-pressed',editor.symmetry);break;
 case'pattern':{const p=PATTERNS.find(p=>p.id===b.dataset.pattern);if(!patternUnlocked(state,p.id)){toast(`«${p.name}» откроется после ${p.need} готовых изделий.`);break;}const n=lastPattern.id===p.id?lastPattern.n+1:0;try{editor.addPattern(p.id,n);lastPattern={id:p.id,n};toast(n?`${p.name}: вариант ${n%3+1}. Отмена вернёт прежний вид.`:`${p.name}: ${p.hint.toLowerCase()}.`);}catch(err){toast(err.message,true);audio.play('error');}break;}
 case'layout':try{const n=editor.addLayout(b.dataset.layout),need=state.draft.design.gems.filter(g=>g.kind===editor.gem).length,have=state.materials[editor.gem];toast(need>have?`Камней добавлено: ${n}. В запасе только ${have} — докупи у поставщика или отмени.`:`Камней добавлено: ${n}. Их можно передвинуть инструментом «Камни».`,need>have);}catch(err){toast(err.message,true);audio.play('error');}break;
 case'pattern-mode':patternMode=b.dataset.mode;renderToolOptions();break;
 case'cycle-gem':{const open=Object.keys(J.GEMS).filter(id=>J.available(state,id)),i=open.indexOf(editor.gem);editor.gem=open[(i+1)%open.length];editorOptions.gem=editor.gem;renderToolOptions();break;}
 case'gem-kind':editor.gem=b.dataset.gem;editorOptions.gem=editor.gem;editor.changeStone({kind:editor.gem});renderToolOptions();break;
 case'undo':case'redo':editor.finish();J.undo(state,id==='redo');editor.syncSelection();scheduleSave();editor.dirty=true;editor.metrics=J.evaluate(state.draft.design);updateEditor();$('#jewel-name').value=state.draft.design.name;break;
 case'editor-help':editorHelp();break;
 case'material-picker':showMaterials();break;
 case'apply-metal':editAndRefresh(d=>{d.metal=b.dataset.metal;});close();break;
 case'remember':try{editor.finish();J.remember(state);scheduleSave();toast('Модель сохранена. Можно создать новый экземпляр.');}catch(err){toast(err.message,true);}break;
 case'finish-design':finish(()=>P.complete(state));break;
 case'shortfall':showShortfall();break;
 case'buy-shortfall':close();action(()=>P.buyShortfall(state),'Материалы докуплены.');break;
 case'buy-finish':close();finish(()=>P.buyAndComplete(state));break;
 case'shortfall-gather':view='supplies';supplyTab='map';close();render();break;
 case'completed-shop':view='shop';close();render();break;
 case'completed-studio':view='studio';close();render();break;
 case'discard':modal('Убрать заготовку?',`<p>Рисунок текущей заготовки будет удалён. Материалы ещё не потрачены.</p>${btn('confirm-discard','Убрать заготовку','primary danger')}`);break;
 case'confirm-discard':action(()=>{state.draft=null;});close();break;
 case'load-model':action(()=>{J.restoreModel(state,b.dataset.model);view='studio';resetEditor();});break;
 case'inventory':showInventory();break;
 case'buyer':buyerId=b.dataset.buyer;policy='fair';render();break;
 case'policy':policy=b.dataset.policy;render();break;
 case'sort':sortMode=sortMode==='fit'?'new':'fit';render();break;
 case'pick-item':itemId=b.dataset.item;render();$('.feature')?.scrollIntoView({block:'nearest',behavior:still()?'auto':'smooth'});break;
 case'previous':case'next':{const {list,item}=showcase(state,{buyerId,itemId,sort:sortMode}),i=list.indexOf(item);itemId=list[(i+(id==='next'?1:-1)+list.length)%list.length].id;render();break;}
 case'sell':sell(b,policy);break;
 case'sell-counter':sell(b,'counter');break;
 case'demand-info':showDemand();break;
 case'item-info':{const item=state.stock.find(i=>i.id===b.dataset.item);if(item)showAssessment(item);break;}
 case'save-item-model':action(()=>J.rememberItem(state,b.dataset.item),'Модель сохранена.');break;
 case'recycle':modal('Разобрать изделие?',`<p>Все камни и 70% металла вернутся в запасы. Готовая оправа и работа будут разобраны.</p>${btn('confirm-recycle','Разобрать','primary danger',`data-item="${b.dataset.item}"`)}`);break;
 case'confirm-recycle':{const undo=action(()=>P.recycle(state,b.dataset.item));close();if(undo){recycled=undo;itemId=null;render();toast('Изделие разобрано, материалы в запасе.',{action:{action:'unrecycle',label:'Вернуть',icon:'recycle'}});}break;}
 case'unrecycle':{const undo=recycled;if(!undo){toast('Изделие уже не вернуть: после разборки было другое действие.',true);break;}if(action(()=>P.unrecycle(state,undo))){itemId=undo.item.id;view='shop';render();toast(`«${undo.item.design.name}» снова на витрине.`);}break;}
 case'supply-tab':supplyTab=b.dataset.tab;render();break;
 case'buy':action(()=>P.buy(state,b.dataset.material,Number(b.dataset.count)),'Материалы в запасе.');break;
 case'locked-material':showSkill(['gold','diamond'].includes(b.dataset.material)?'gold':'alchemy');break;
 case'gather':action(()=>P.gather(state,b.dataset.area),r=>`Найдено: ${J.GEMS[r.gem].name} и ${J.METALS[r.metal].name} ×3`);break;
 case'next-day':nextDay();break;
 case'confirm-next-day':close();nextDay(true);break;
 case'stay-in-shop':close();if(view!=='shop'){view='shop';render();}break;
 case'prepare-order':if(state.draft){view='studio';render();toast('Сначала закончи или убери текущую заготовку.');}else{selectedType=b.dataset.type;resetEditor();action(()=>{J.startDesign(state,selectedType,'oval','copper');view='studio';});}break;
 case'deliver':{const from=b.getBoundingClientRect();if(action(()=>P.deliver(state,b.dataset.request,b.dataset.item),r=>`Заказ выполнен · ${r.reward} монет · +16 опыта`)){audio.play('coin');coinBurst(from);}break;}
 case'skill':showSkill(b.dataset.skill);break;
 case'learn':action(()=>P.learn(state,b.dataset.skill),'Новая техника изучена.');close();break;
 case'toggle-sound':state.sound=!state.sound;audio.setOptions(state);audio.unlock();scheduleSave();menu();break;
 case'toggle-music':state.music=!state.music;audio.setOptions(state);audio.unlock();scheduleSave();menu();break;
 case'toggle-large':state.prefs.large=!state.prefs.large;applyPrefs();scheduleSave();menu();break;
 case'toggle-calm':state.prefs.calm=!state.prefs.calm;applyPrefs();scheduleSave();menu();break;
 case'export':editor?.finish();download(loadError?sourceRaw:J.serialize(state),`siyanie-day-${state.day}.json`);break;
 case'legacy-export':download(JSON.stringify(state.legacy),'pix-original-archive.json');break;
 case'import':$('#import-file').click();break;
 case'confirm-import':{const next=pendingImport;pendingImport=null;if(!next)break;close();putAside().then(kept=>{replaceWorkshop(next);toast(kept?'Сохранение загружено. Прежнюю мастерскую можно вернуть в меню.':'Сохранение загружено.');});break;}
 case'restore-backup':showBackup();break;
 case'confirm-restore':close();loadBackup().then(async v=>{if(!v?.raw)throw new J.AtelierError('Прежняя мастерская не найдена.');const next=P.load(v.raw);await putAside();replaceWorkshop(next);toast(`Возвращена мастерская дня ${next.day}. Прежнюю можно вернуть из меню.`);}).catch(err=>toast(err instanceof J.AtelierError?err.message:'Прежнюю мастерскую не удалось прочитать.',true));break;
 case'download-backup':loadBackup().then(v=>{if(v?.raw)download(v.raw,`siyanie-before-import-day-${v.meta.day}.json`);}).catch(()=>toast('Файл не удалось прочитать.',true));break;
 case'reload-app':reload();break;
 case'reset-recovery':modal('Новое сохранение',`<p>Сначала скачай повреждённый исходный файл через меню. Новый прогресс заменит его на этом устройстве.</p>${btn('confirm-reset','Создать новое сохранение','primary danger')}`);break;
 case'confirm-reset':close();putAside().then(()=>{replaceWorkshop(P.newGame(Date.now()>>>0),false);queueModal(welcome,'welcome');});break;
 }
});
document.addEventListener('input',e=>{
 if(e.target.id==='brush-width'&&editor)editor.setWidth(e.target.value);
 if(e.target.id==='volume'){state.volume=Number(e.target.value);audio.setOptions(state);scheduleSave();}
});
document.addEventListener('change',e=>{
 if(e.target.id==='brush-width'&&editor&&editor.tool==='stone')editor.changeStone({size:editor.stoneSize()});
 if(e.target.id==='gem-cut'&&editor){editor.cut=e.target.value;editor.changeStone({cut:editor.cut});}
 if(e.target.id==='jewel-name'&&editor)editAndRefresh(d=>{d.name=e.target.value.trim().slice(0,48)||typeName(d.type);});
});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>64000000)throw new J.AtelierError('Файл слишком большой.');pendingImport=P.load(await file.text());modal('Загрузить эту мастерскую?',`<p>День ${pendingImport.day} · ${pendingImport.gold} монет · ${pendingImport.stock.length} изделий · ${pendingImport.library.length} моделей.</p><p class="fine-print">Текущий прогресс на устройстве будет заменён. Можно предварительно скачать его через меню.</p>${btn('confirm-import','Загрузить','primary')}`);}catch(error){toast(error.message,true);}e.target.value='';});
$('#menu-button').addEventListener('click',menu);
$('#end-day').addEventListener('click',()=>nextDay());
dialog.addEventListener('cancel',e=>{if(conflict||!modalClosable)e.preventDefault();});
document.addEventListener('keydown',e=>{if(!editor||dialog.open||e.target.matches('input,select,textarea'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();const b=$(`[data-action="${e.shiftKey?'redo':'undo'}"]`);b?.click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushSave(true);audio.pause();}else{lastFrame=performance.now();audio.resume();if(editor)editor.dirty=true;otherWrite(readStamp());}});
document.addEventListener('animationend',e=>e.target.classList?.remove('pulse'));
window.addEventListener('pagehide',()=>{flushSave(true);audio.pause();});
window.addEventListener('pageshow',e=>{if(e.persisted)otherWrite(readStamp());});
// A long game has a hundred pieces to appraise and draw once; idle moments do it before the first visit to the showcase.
function warmShowcase(from=0){const idle=globalThis.requestIdleCallback||(fn=>setTimeout(()=>{const end=performance.now()+12;fn({timeRemaining:()=>end-performance.now()});},80));idle(deadline=>{let i=from;const stock=state.stock;while(i<stock.length&&!editor?.operation&&deadline.timeRemaining()>6){const d=stock[i++].design;J.evaluate(d);jewelURL(d,112,{background:false});}if(i<stock.length&&stock===state.stock)warmShowcase(i);});}
render();requestAnimationFrame(frame);if(!state.welcomed&&!loadError)queueModal(welcome,'welcome');warmShowcase();loadBackup(false).then(v=>{backupMeta=v?.meta||null;}).catch(()=>{});
// The first install also fires controllerchange; only a page that already had a worker is out of date.
if('serviceWorker'in navigator){const controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!controlled||updateReady)return;updateReady=true;toast('Доступна новая версия',false,{action:'reload-app',label:'Обновить',icon:'download'});});navigator.serviceWorker.register('./sw.js').catch(()=>{});}
