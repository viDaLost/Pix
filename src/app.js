import * as J from './jewelry.js';
import * as P from './progress.js';
import {showcase,deliverable,orderPieces,freshMarks,contestList,contestHint} from './market.js';
import {JewelEditor} from './jewel-editor.js';
import {jewelURL,gemURL,metalURL,setVelvet} from './jewel-art.js';
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
let patternMode='lines',developTab='skills',chapter='forms',rankQueued=false,velvetsOpen=false,ordersTab='orders',contestPick=null;
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
 el.innerHTML=`${icon(t.action?.icon||(t.kind==='error'?'info':t.kind==='mark'?'seal':t.kind==='hint'?'help':'check'))}<span>${esc(t.text)}</span>${t.action?btn(t.action.action,t.action.label,'toast-action'):''}`;
 // The live region of index.html is polite, and an explicit aria-live outranks the role, so an error says so itself.
 el.setAttribute('role',t.kind==='error'?'alert':'status');el.setAttribute('aria-live',t.kind==='error'?'assertive':'polite');el.className='toast '+t.kind+(t.action?' actionable':'');raiseToast();void el.offsetWidth;el.classList.add('show');
 toastTimer=setTimeout(nextToast,toastDuration(t));}
// A modal dialog makes the rest of the page inert, so the toast moves into it; as a popover it is drawn above the
// dialog, and a browser without popovers still shows it as a fixed layer inside the dialog.
function raiseToast(){if(!toasts.now)return;const el=toastEl,host=dialog.open?dialog:document.body;if(el.parentElement!==host)host.append(el);try{if(el.matches(':popover-open'))el.hidePopover();el.showPopover?.();}catch{}}
function crash(e){if(e instanceof J.AtelierError){toast(e.message,true);return;}console.error(e);const now=Date.now();if(now-lastCrash<1500)return;lastCrash=now;
 toast('Что-то пошло не так. Сохранение можно скачать.',true,{action:'export',label:'Скачать'});
 const panel=$('#panel');if(panel&&(!panel.children.length||panel.querySelector('.splash')))panel.innerHTML=`<div class="card empty recovery">${icon('info','big-icon')}<h2>Раздел не открылся</h2><p class="muted">Скачай сохранение, чтобы ничего не потерять, и перезагрузи страницу.</p>${btn('export',`${icon('download')}<span>Скачать сохранение</span>`,'primary big')}${btn('reload-app','Перезагрузить','big')}</div>`;}
// The piece taken apart can come back only until the next action.
const forgetRecycled=()=>{recycled=null;withdrawToast('unrecycle');};
function action(fn,message){try{editor?.finish();const result=fn();forgetRecycled();scheduleSave();render();audio.play('good');if(message)toast(typeof message==='function'?message(result):message);queueMicrotask(checkRank);return result;}catch(e){audio.play('error');if(e instanceof J.AtelierError)toast(e.message,true);else crash(e);}}
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
// Friendship as hearts: only the steps reached, or all five with the empty ones dimmed.
const hearts=(level,all=false)=>`<span class="hearts" aria-hidden="true">${Array.from({length:all?5:level},(_,i)=>icon('heart',i<level?'on':'')).join('')}</span>`;
const ribbonBadge=item=>{const m=J.ribbonOf(item);return m?`<span class="ribbon-badge m${m}" title="${P.RIBBONS[m]}" aria-hidden="true"></span>`:'';};
const bondOf=id=>{const p=client(id),level=J.bondLevel(state,id),points=J.bondPoints(state,id),next=J.BOND_LEVELS[level+1]??null;return {p,level,points,next,name:P.bondName(p,level)};};
const matName=id=>(J.METALS[id]||J.GEMS[id]).name,mult=e=>J.craftMultiplier(e).toFixed(2).replace('.',',');
// Soft hyphens between Russian syllables, so a long word wraps in a narrow tile instead of splitting at any letter.
const VOWEL=/[аеёиоуыэюя]/i,hyph=t=>t.replace(/[А-ЯЁа-яё]{7,}/g,w=>{const v=[...w].map((c,i)=>VOWEL.test(c)?i:-1).filter(i=>i>=0),cut=new Set();for(let k=1;k<v.length;k++){const a=v[k-1],gap=v[k]-a-1;let i=gap<2?a+1+(gap&&/[йьъ]/i.test(w[a+1])?1:0):a+2+(/[йьъ]/i.test(w[a+2])?1:0);if(i>=2&&w.length-i>=2)cut.add(i);}return [...w].map((c,i)=>(cut.has(i)?'­':'')+c).join('');});
const plural=(n,one,few,many)=>{const a=n%10,b=n%100;return a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many;};
function typeIcon(type){const d=J.makeDesign(type,'oval','gold');if(!['sword','staff','ring'].includes(type))d.gems.push({kind:'amethyst',x:50,y:47,size:6,cut:'round'});return jewelURL(d,128,{background:false});}
function templateIcon(id){return id==='free'?null:jewelURL(J.makeDesign(selectedType,id,J.available(state,selectedMetal)?selectedMetal:'copper'),96,{background:false});}
// Thumbnails scale the current silhouette to fill the tile, so fine patterns stay readable.
function fill(d){if(d.outline.length<3)return d;const xs=d.outline.map(p=>p.x),ys=d.outline.map(p=>p.y),x0=Math.min(...xs),y0=Math.min(...ys),k=84/Math.max(Math.max(...xs)-x0,Math.max(...ys)-y0,1),ox=50-(Math.max(...xs)+x0)/2*k,oy=50-(Math.max(...ys)+y0)/2*k+3,m=p=>({...p,x:p.x*k+ox,y:p.y*k+oy});return {...d,outline:d.outline.map(m),holes:d.holes.map(h=>h.map(m)),strokes:d.strokes.map(s=>({...s,width:Math.min(6,s.width*k),points:s.points.map(m)})),gems:d.gems.map(g=>({...m(g),size:Math.min(7,g.size*k)})),polish:[]};}
function patternThumb(id){const base=J.clone(state.draft.design);base.strokes=[];if(id==='runes'&&!base.gems.length)try{base.gems=layoutGems(base,'solo',{kind:'sapphire',size:3});}catch{}try{base.strokes=patternStrokes(base,id,{width:1.6});}catch{return null;}base.polish=[];return jewelURL(fill(base),80,{background:false});}
function layoutThumb(id){const d=J.makeDesign('pendant','circle','silver');try{d.gems=layoutGems(d,id,{kind:editor?.gem||'garnet',size:5});}catch{}return jewelURL(d,80,{background:false});}
function sceneHTML(shop=false){return `<div class="scene-wrap${shop?'':' studio-scene'}"><canvas id="scene" width="480" height="260" aria-label="${shop?'Лавка: прилавок с изделиями и покупатели':'Ювелирная мастерская: стол гравировки, камни, оправы и ювелир'}" role="img"></canvas><span class="scene-caption">${shop?'Лавка авторских украшений':'Веленский порт · 1740'}</span></div>`;}
// Larger text and calmer motion are this player's choices on top of the system setting.
function applyPrefs(){const root=document.documentElement;root.classList.toggle('large-text',!!state.prefs?.large);root.classList.toggle('calm',!!state.prefs?.calm);
 // The chosen velvet lines the trays of the page and every picture drawn on velvet.
 const v=P.VELVETS.find(v=>v.id===state.cosmetics?.velvet)||P.VELVETS[0];setVelvet(v);root.style.setProperty('--velvet-hi',v.hi);root.style.setProperty('--velvet',v.mid);root.style.setProperty('--velvet-lo',v.lo);}
// The current rank, the next one and the way to it.
function standing(){const rank=J.rankOf(state),now=J.RANKS[rank],next=J.RANKS[rank+1]||null;return {rank,now,next,left:next?next.rep-state.rep:0,p:next?Math.round((state.rep-now.rep)/(next.rep-now.rep)*100):100};}
function render(){
 if(editor){editorOptions={tool:editor.tool,width:editor.width,symmetry:editor.symmetry,gem:editor.gem,cut:editor.cut,zoom:editor.zoom,pan:{...editor.pan}};editor.destroy();editor=null;}
applyPrefs();audio.setOptions(state);audio.setScene(view==='shop'||view==='orders'?'shop':view==='supplies'&&supplyTab==='map'?'explore':'forge');
 const {rank,now,next,p}=standing(),guests=state.customers.filter(c=>!c.served).length,ready=deliverable(state);
 // The crest shows only the step of the rank; its name and the way on are in «Путь мастера».
 $('#hud').innerHTML=`<span class="stat" title="Монеты">${icon('coin')}<b id="hud-gold">${state.gold}</b></span>${btn('rank-path',`${icon('crest')}<b>${rank+1}</b><i class="xp" style="--p:${p}%"></i>`,'stat rank',`title="${now.name} · репутация ${state.rep}" aria-label="Звание «${now.name}», ступень ${rank+1} из ${J.RANKS.length}${next?`, до следующего звания ещё ${next.rep-state.rep} репутации`:''}. Путь мастера"`)}<span class="stat" title="Изделий на витрине">${icon('box')}<b>${state.stock.length}</b></span><span class="stat day">День <b>${state.day}</b></span>`;
 $('#navigation').innerHTML=[['studio','studio','Мастерская'],['shop','shop','Витрина',guests&&state.stock.length],['supplies','supplies','Материалы'],['orders','orders','Заказы',ready||P.unread(state)>0||!state.guild.seen&&contestHint(state,state.skills.includes('eye'))],['develop','develop','Развитие',J.TOOLS.some(t=>!state.skills.includes(t.id)&&t.parents.every(p=>state.skills.includes(p))&&state.gold>=t.cost&&state.xp>=t.xp)]].map(([id,ic,text,dot])=>btn('navigate',`${icon(ic)}<span>${text}</span>${dot?'<i class="dot" aria-hidden="true"></i>':''}`,view===id?'active':'',`data-view="${id}" ${view===id?'aria-current="page"':''}`)).join('');
 $('#panel').className='panel view-'+view+(view==='studio'&&state.draft?' editor-panel':'');$('#panel').innerHTML=({studio:studioHTML,shop:shopHTML,supplies:suppliesHTML,orders:ordersHTML,develop:developHTML}[view])();
 if(view==='studio'&&state.draft){editor=new JewelEditor($('#jewel-canvas'),state,{onChange:updateEditor,onCommit:()=>{scheduleSave();audio.play(editor?.tool==='rune'?'magic':editor?.tool==='polish'?'polish':'rivet');updateEditor();},onError:text=>toast(text,true)});Object.assign(editor,editorOptions);editor.setWidth(editor.width);if(!state.skills.includes('facets'))editor.cut='round';if(!J.available(state,editor.gem))editor.gem='garnet';editor.pan={...editorOptions.pan};editor.dirty=true;updateEditor();}
 if(view==='shop'){const a=$('.buyer-card.active');if(a)a.parentElement.scrollLeft=a.offsetLeft-a.parentElement.offsetLeft-8;}
 // The invitation of the week's review is answered by a look at it.
 if(view==='orders'&&ordersTab==='guild'&&!state.guild.seen){state.guild.seen=true;scheduleSave();$('#navigation [data-view="orders"] .dot')?.remove();}
 if(view==='develop'){const a=$('.chapter-tabs .active');if(a)a.parentElement.scrollLeft=a.offsetLeft-a.parentElement.offsetLeft-(a.parentElement.clientWidth-a.offsetWidth)/2;}
 notice();paint(performance.now(),0);
}
function studioHTML(){
 if(state.draft)return editorHTML();
 const ids=J.templatesFor(selectedType);if(!ids.includes(template)||!J.templateOpen(state,template))template='oval';if(!J.available(state,selectedMetal))selectedMetal='copper';
 return sceneHTML()+`<section class="studio-start"><div class="section-line"><h1>Новое изделие</h1>${btn('inventory',icon('grid'),'icon-button ghost','aria-label="Запасы материалов"')}</div>
 <h3 class="label">Вид</h3><div class="type-grid">${J.TYPES.map(t=>{const open=J.typeAvailable(state,t.id);return btn('select-type',`<img src="${typeIcon(t.id)}" alt=""><span>${t.short}</span>${open?'':icon('lock','corner')}`,`type-card${selectedType===t.id?' active':''}${open?'':' locked'}`,`data-type="${t.id}" aria-pressed="${selectedType===t.id}"${open?'':` aria-label="${t.short}: нужна техника «Оружейные оправы»"`}`);}).join('')}</div>
 <h3 class="label">Основа</h3><div class="rail template-row" aria-label="Базовые заготовки">${ids.map(id=>{const src=templateIcon(id),t=J.TEMPLATES.find(t=>t.id===id),open=J.templateOpen(state,id),rank=J.RANKS[t.rank||0].name;return btn('template',`${src?`<img src="${src}" alt="">`:`<span class="free-shape">${icon('shape')}</span>`}<span>${t.name}</span>${open?'':`<small>${rank}</small>${icon('lock','corner')}`}`,`template-card${id===template?' active':''}${open?'':' locked'}`,`data-template="${id}" aria-pressed="${id===template}"${open?'':` aria-label="${t.name}: откроется со званием «${rank}»"`}`);}).join('')}</div>
 <h3 class="label">Металл</h3><div class="metal-row">${Object.entries(J.METALS).map(([id,m])=>{const open=J.available(state,id);return btn('metal',`<img src="${metalURL(id,48)}" alt=""><span>${m.name}<small>${open?'в запасе '+state.materials[id]:'закрыто'}</small></span>`,`metal-chip${selectedMetal===id?' active':''}`,`data-metal="${id}" aria-pressed="${selectedMetal===id}" ${open?'':'disabled'}`);}).join('')}</div>
 ${btn('start-design',`${icon('studio')}<span>Начать работу</span>`,'primary big')}<p class="fine-print center">Материалы списываются только при завершении</p></section>
 ${state.library.length?`<div class="section-line"><h2>Мои модели</h2><small>${state.library.length}/${J.libraryLimit(state)}</small></div><div class="rail library">${state.library.map(m=>btn('load-model',`<img src="${jewelURL(m.design,112)}" alt=""><span>${esc(m.design.name)}</span>`,'library-card',`data-model="${m.id}"`)).join('')}</div>`:''}`;
}
function editorHTML(){const d=state.draft.design;
 return `<div class="editor-heading"><input id="jewel-name" maxlength="48" value="${esc(d.name)}" aria-label="Название изделия">${btn('undo',icon('undo'),'icon-button','aria-label="Отменить действие"')}${btn('redo',icon('redo'),'icon-button','aria-label="Повторить действие"')}${btn('editor-help',icon('help'),'icon-button','aria-label="Как создавать украшение"')}</div><div id="editor-metrics" class="editor-metrics"></div>
 <div class="editor-stage"><canvas id="jewel-canvas" aria-label="Редактор изделия. Рисуй пальцем, перетаскивай контур и камни; два пальца меняют масштаб." tabindex="0"></canvas><span id="editor-hint" class="editor-hint"></span><div class="zoom-controls">${btn('zoom-in',icon('plus'),'','aria-label="Увеличить масштаб"')}${btn('zoom-reset',icon('fit'),'','aria-label="Сбросить масштаб"')}${btn('zoom-out',icon('minus'),'','aria-label="Уменьшить масштаб"')}</div><span id="zoom-level" class="zoom-level">100%</span><canvas id="artist-scene" class="artist-inset" width="480" height="260" aria-label="Ювелир работает за столом" role="img"></canvas></div>
 <div class="tools" role="toolbar" aria-label="Инструменты">${TOOLSET.map(([id,text])=>btn('editor-tool',`${icon(id)}<span>${text}</span>`,editorOptions.tool===id?'active':'',`data-tool="${id}" title="${text}" aria-pressed="${editorOptions.tool===id}"`)).join('')}</div><div id="tool-options" class="tool-options"></div>
 <div class="editor-bottom">${btn('material-picker',`<img id="metal-badge" src="${metalURL(d.metal,40)}" alt="">`,'secondary','aria-label="Сменить металл и посмотреть расход"')}${btn('finish-design','Готово','primary','id="finish-design"')}${btn('remember',icon('bookmark'),'secondary','aria-label="Сохранить модель"')}${btn('discard',icon('close'),'secondary danger','aria-label="Убрать заготовку"')}</div>`;
}
function updateEditor(metrics){if(!state.draft||!$('#editor-metrics'))return;const d=editor?.design||state.draft.design,e=metrics||J.evaluate(d);
 // The price multiplier lives in the assessment, the polish hint and the «Готово» button, so the strip stays four short readings.
 $('#editor-metrics').innerHTML=`<span class="meter craft" style="--p:${e.craft}%" title="Мастерство умножает цену: ×${mult(e)}"><em>Ремесло</em><b>${e.craft}</b></span><span><em>Стиль</em><b>${e.label}</b></span><span class="${e.magic?'magic':''}"><em>Магия</em><b>${magicOf(e)}</b></span><span class="meter" style="--p:${e.polish}%"><em>Блеск</em><b>${e.polish}%</b></span>`;
 const tool=editor?.tool||editorOptions.tool,hints={shape:'Потяни точку или нарисуй новый контур',pattern:'Выбери узор: он ляжет по форме. Нажми ещё раз — другой вариант',engrave:'Нанеси свой узор по металлу',stone:'Поставь камень; потяни, чтобы переместить',rune:'Проведи руну к камню: он пробудится',polish:`Полируй: мастерство ×${mult(e)} к цене`,hole:'Обведи вырез внутри металлической основы',move:'Перемещай поле; два пальца — масштаб',erase:'Коснись камня, линии или выреза'};$('#editor-hint').textContent=hints[tool];
 $('#zoom-level').textContent=Math.round((editor?.zoom||1)*100)+'%';
 const a=$('[data-action="undo"]'),b=$('[data-action="redo"]');a.disabled=!state.draft.undo.length;b.disabled=!state.draft.redo.length;
 const badge=$('#metal-badge');if(badge&&!badge.src.endsWith(metalURL(d.metal,40)))badge.src=metalURL(d.metal,40);
 // A missing material does not block «Готово»: the button turns into the list of what is short and opens a way to get it.
 const c=J.costs(d),short=J.shortfall(state,d),afford=!short.length&&state.gold>=c.coins,button=$('#finish-design'),ready=d.outline.length>=3&&J.hasHandwork(d),lack=short.map(v=>`${matName(v.id)} ×${v.need-v.have}`).join(' · ')||`${c.coins} мон. за основу`;
 button.dataset.action=ready&&!afford?'shortfall':'finish-design';button.classList.toggle('short',ready&&!afford);
 // What the piece would add to the master's book shows on the button itself, so it is seen on the shortest screen.
 const novel=ready?P.novelKeys(state,d,e).length:0,more=novel?` Новое для книги мастера: ${novel}.`:'';
 button.innerHTML=(!J.hasHandwork(d)?'Оформи заготовку':!afford?`<span>Не хватает</span><small>${lack}</small>`:`<span>Готово</span><small>${J.METALS[d.metal].name} ×${c.resources[d.metal]}${d.gems.length?' · камней '+d.gems.length:''}${c.coins?' · '+c.coins+' мон.':''}</small>`)+(novel?`<i class="novel-badge" aria-hidden="true">✦${novel}</i>`:'');
 button.title=`Мастерство ×${mult(e)} к цене.${more} ${costText(d)}`;button.setAttribute('aria-label',(afford?'Завершить изделие. '+costText(d):'Не хватает: '+lack+'. Докупить или сменить металл')+`. Мастерство ×${mult(e)} к цене.${more}`);button.disabled=!ready;
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
// The connoisseur of the day speaks of novelty first; a design the port has seen gets his refusal in the price box.
// Then comes what the guest thinks of the piece; a word of their own life follows only when the piece pleases them.
function reaction(person,buyer,item,q){
 const novel=buyer?.novel===true;if(novel&&(!item||!J.isFresh(state,item.design)))return 'Хочу то, чего в порту ещё не видели.';
 if(!item)return person.line;const d=item.design,e=J.evaluate(d),bits=novel?['Такого в порту ещё не было.']:[];
 if(q.demand.remaining)return `Такое я уже ${person.female?'видела':'видел'} у соседей. Нет ли чего-то нового?`;
 if(buyer.want===d.type)bits.push(`Я как раз ищу ${TYPE_WANT[d.type]}.`);
 const taste=e.style[person.style]||0;if(taste>=60)bits.push(PRAISE[person.style]);else if(taste<30)bits.push(DOUBT[person.style]);
 if(person.metal===d.metal)bits.push(`${J.METALS[d.metal].name} — мой металл.`);
 if(e.effects[person.element])bits.push(`Чувствую ${J.ELEMENTS[person.element].toLowerCase()} в этих рунах.`);
 if(!bits.length)bits.push(q.fit>=55?'Хорошая работа. Подумаю о цене.':'Красиво, но это не совсем мой вкус.');
 const own=q.fit>=55?P.memoryLine(state,person.id):null;return [...bits.slice(0,2),...(own?[own]:[])].join(' ');
}
function shopHTML(){
 const {guests,buyer,person,fits,list,item,quotes,q,demand}=showcase(state,{buyerId,itemId,sort:sortMode,policy}),eye=state.skills.includes('eye'),fresh=freshMarks(state,buyer);if(buyer)buyerId=buyer.id;if(item)itemId=item.id;
 let html=sceneHTML(true)+`<div class="rail buyers" aria-label="Покупатели">${guests.map(c=>{const p=client(c.client);const level=J.bondLevel(state,p.id);return btn('buyer',`<img src="${portrait(p)}" alt=""><span><b>${p.name}${c.novel?' <i class="novel-mark-inline" aria-hidden="true">✦</i>':''}${level?hearts(level):''}</b><small>${c.novel?'знаток · ':''}ищет ${TYPE_WANT[c.want]||'украшение'}</small></span>`,`buyer-card${buyer?.id===c.id?' active':''}${c.novel?' novel':''}`,`data-buyer="${c.id}" aria-pressed="${buyer?.id===c.id}" aria-label="${p.name}${c.novel?', знаток дня: ищет новое для порта':`, ищет ${TYPE_WANT[c.want]||'украшение'}`}${level?`, дружба ${level} из 5`:''}"`);}).join('')}${!guests.length?`<div class="closed-note">${icon('sun')}<span>Покупатели на сегодня ушли</span>${btn('next-day','Открыть лавку завтра','primary')}</div>`:''}</div>`;
 const bond=person?bondOf(person.id):null;
 if(person)html+=`<section class="buyer-panel"><img class="portrait" src="${portrait(person)}" alt=""><div><div class="buyer-name"><b>${person.name}</b><small>${person.role||''}</small>${btn('resident',`${hearts(bond.level,true)}<span>${bond.name}${bond.next?` · ${bond.points}/${bond.next}`:''}</span>`,'bond-line',`data-id="${person.id}" aria-label="${person.name}: ${bond.name}, дружба ${bond.points}${bond.next?` из ${bond.next}`:''}. Подробнее"`)}</div><p class="speech">${esc(reaction(person,buyer,item,q||{demand:{},fit:0}))}</p>
  <div class="tags">${buyer.novel?`<span class="novel-tag">${icon('spark')}Знаток дня · новое ×1,2</span>`:''}<span>${icon('heart')}${STYLE[person.style]}</span><span><img src="${metalURL(person.metal,32)}" alt="">${J.METALS[person.metal].name}</span><span>${icon(ELEMENT_ICON[person.element])}${J.ELEMENTS[person.element]}</span><span>${icon('coin')}${eye?buyer.budget:'≈'+Math.round(buyer.budget/50)*50}</span></div></div></section>`;
 if(!item)return html+`<div class="card empty"><img src="${typeIcon('pendant')}" alt=""><h2>Витрина ждёт твою работу</h2><p class="muted">Форма, узор и камни сохранятся точно такими, какими ты их создал.</p>${btn('navigate','Создать украшение','primary big','data-view="studio"')}</div>`;
 const d=item.design,e=J.evaluate(d),position=list.indexOf(item)+1;
 html+=`<section class="feature"><div class="tray">${btn('previous',icon('left'),'icon-button ghost','aria-label="Предыдущее изделие"')}<img src="${jewelURL(d,320,{background:false})}" alt="${esc(d.name)}: авторская форма, рисунок и камни">${btn('next',icon('right'),'icon-button ghost','aria-label="Следующее изделие"')}${J.ribbonOf(item)?`<span class="ribbon-tag m${J.ribbonOf(item)}">${icon('ribbon')}+${J.ribbonOf(item)*5}%</span>`:''}${q?`<span class="fit-badge ${q.fit>=70?'hi':q.fit>=50?'mid':'lo'}" title="Совпадение со вкусом">${icon('heart')}${q.fit}%</span>`:''}</div>
 <div class="feature-title"><h2>${esc(d.name)}</h2><small>${typeName(d.type)} · ${position}/${list.length}</small></div>
 <div class="metrics"><span class="meter" style="--p:${e.craft}%"><em>Мастерство</em><b>${e.craft}</b></span><span><em>Стиль</em><b>${e.label}</b></span><span class="${e.magic?'magic':''}"><em>Магия</em><b>${magicOf(e)}</b></span></div>
 <div class="market-status${demand.remaining?' cool':''}"><span>${demand.remaining?`Спрос −75% · ещё ${demand.remaining} торг. дн.`:'Продажи по полной цене'}</span><span class="demand-dots${demand.remaining?' cool':''}" aria-label="${demand.sales}${demand.soft?' с половиной':''} из 4">${Array.from({length:4},(_,i)=>`<i class="${i<demand.sales?'on':i===demand.sales&&demand.soft?'half':''}"></i>`).join('')}</span>${btn('demand-info',icon('info'),'icon-button ghost small','aria-label="Как работает спрос"')}</div>`;
 if(q){
  html+=`<div class="price-row" role="radiogroup" aria-label="Цена">${[['low','Скидка'],['fair','Полная'],['high','Дороже']].map(([id,name])=>btn('policy',`<span>${name}</span><b>${quotes[id].price}</b>${eye?`<i>${quotes[id].accepted?'возьмёт':'откажет'}</i>`:''}`,`${id===policy?'active':''}${eye&&!quotes[id].accepted?' refused':''}`,`data-policy="${id}" role="radio" aria-checked="${id===policy}"`)).join('')}</div>`;
  html+=q.accepted?btn('sell',`<span>Продать</span>${coins(q.price)}`,'primary big sell-button',`data-item="${item.id}"`):`<div class="counter"><p>${esc(q.reason)}${q.offer?` Предлагаю <b>${q.offer}</b>.`:''}</p>${q.offer?btn('sell-counter',`<span>Согласиться</span>${coins(q.offer)}`,'primary',`data-item="${item.id}"`):''}</div>`;}
 else html+=btn('next-day',`${icon('sun')}<span>Открыть лавку завтра</span>`,'primary big');
 html+=`<div class="detail-actions">${btn('item-info',`${icon('scale')}<span>Оценка</span>`,'ghost',`data-item="${item.id}"`)}${btn('save-item-model',`${icon('bookmark')}<span>В модели</span>`,'ghost',`data-item="${item.id}"`)}${btn('recycle',`${icon('recycle')}<span>Переплавить</span>`,'ghost danger',`data-item="${item.id}"`)}</div></section>`;
 html+=`<div class="section-line"><h2>Витрина <small>${state.stock.length}/${J.MAX_STOCK}</small></h2>${buyer?btn('sort',sortMode==='fit'?`${icon('heart')}По вкусу`:`${icon('grid')}Новые`,'chip',`aria-label="Порядок: ${sortMode==='fit'?'по вкусу покупателя':'сначала новые'}"`):''}</div><div class="gallery">${list.map(i=>{const fit=buyer?fits.get(i.id):null;const novel=fresh?.has(i.id);return btn('pick-item',`<img src="${jewelURL(i.design,112,{background:false})}" alt="">${fit!==null?`<span class="fit ${fit>=70?'hi':fit>=50?'mid':'lo'}">${fit}%</span>`:''}${novel?'<span class="novel-mark" aria-hidden="true">✦</span>':''}${ribbonBadge(i)}`,'gallery-item'+(i.id===item.id?' active':''),`data-item="${i.id}" aria-label="${esc(i.design.name)}${fit!==null?', вкус '+fit+'%':''}${novel?', новое для порта':''}${J.ribbonOf(i)?', '+P.RIBBONS[J.ribbonOf(i)]:''}" aria-pressed="${i.id===item.id}"`);}).join('')}</div>`;
 return html;
}
function suppliesHTML(){let html=`<div class="section-line"><h1>Материалы</h1>${btn('inventory',icon('grid'),'icon-button ghost','aria-label="Запасы"')}</div><div class="tabs" role="tablist">${btn('supply-tab',`${icon('coin')}Поставщик`,supplyTab==='buy'?'active':'',`data-tab="buy" role="tab" aria-selected="${supplyTab==='buy'}"`)}${btn('supply-tab',`${icon('pin')}Места находок`,supplyTab==='map'?'active':'',`data-tab="map" role="tab" aria-selected="${supplyTab==='map'}"`)}</div>`;
 if(supplyTab==='map')return html+`<div class="scene-wrap map-stage"><canvas id="map" width="480" height="260" aria-label="Карта мест находок: берег, сад аббатства и лунный кряж"></canvas>${J.AREAS.map(a=>{const open=state.crafted>=a.need;return btn('gather',`${icon(open?'pin':'lock')}${a.name}`,`map-pin${state.daily.areas.includes(a.id)?' done':''}`,`data-area="${a.id}" style="left:${a.x/480*100}%;top:${a.y/260*100}%" ${state.energy<=0||state.daily.areas.includes(a.id)||!open?'disabled':''}`);}).join('')}</div>
  <div class="card"><div class="section-line tight"><h2>Находки</h2><span class="energy" aria-label="Силы: ${state.energy} из 4">${Array.from({length:4},(_,i)=>`<i class="${i<state.energy?'on':''}"></i>`).join('')}</span></div><p class="muted">В каждом месте можно искать раз в день. Сад откроется после 3 изделий, кряж — после 8. Находки помогают продолжить даже с пустым кошельком.</p>${btn('next-day',`${icon('sun')}<span>Следующий день</span>`,'big')}</div>`;
 return html+`<div class="supply-grid">${Object.entries({...J.METALS,...J.GEMS}).map(([id,m])=>{const gem=!!J.GEMS[id],count=gem?1:5,open=J.available(state,id),cost=J.buyCost(state,id,count);return `<article class="supply${open?'':' locked'}"><img src="${gem?gemURL(id,56):metalURL(id,56)}" alt=""><div class="copy"><b>${m.name}</b><small>В запасе ${state.materials[id]}</small><small>${String(+(m.price*(J.discountOf(state,id)?.k||1)).toFixed(2)).replace('.',',')} за ${gem?'камень':'слиток'}${gem?' · '+J.ELEMENTS[m.element]:''}</small>${(d=>d?`<small class="deal">${icon('heart')}${client(d.by).name}: −${Math.round((1-d.k)*100)}%</small>`:'')(J.discountOf(state,id))}</div>${open?btn('buy',`+${count}<small>${cost}</small>`,'buy',`data-material="${id}" data-count="${count}" aria-label="Купить ${m.name} ×${count} за ${cost} монет" ${state.gold<cost?'disabled':''}`):btn('locked-material',icon('lock'),'icon-button ghost',`data-material="${id}" aria-label="Как открыть: ${m.name}"`)}</article>`;}).join('')}</div>`;
}
// «Заказы»: personal orders, the guild review of the week and the letters of the residents.
function ordersHTML(){const unread=P.unread(state),hint=contestHint(state,state.skills.includes('eye')),ready=deliverable(state);
 const tabs=`<div class="tabs three orders-tabs" role="tablist">${[['orders','orders','Заказы',ready],['guild','ribbon','Цех',hint],['mail','letter','Письма',unread]].map(([id,ic,name,dot])=>btn('orders-tab',`${icon(ic)}<span>${name}</span>${dot?'<i class="dot" aria-hidden="true"></i>':''}`,ordersTab===id?'active':'',`data-tab="${id}" role="tab" aria-selected="${ordersTab===id}"${id==='mail'&&unread?` aria-label="Письма, непрочитанных: ${unread}"`:''}`)).join('')}</div>`;
 return ordersTab==='guild'?guildHTML(tabs):ordersTab==='mail'?mailHTML(tabs):requestsHTML(tabs);}
function requestsHTML(tabs){const pieces=orderPieces(state),list=[...state.requests].sort((a,b)=>(b.keep===true)-(a.keep===true)).map(r=>{const p=client(r.client),item=pieces.get(r.id),named=r.keep===true;
  return `<article class="card order-card${r.done?' done':''}${named?' named':''}"><img class="portrait" src="${portrait(p)}" alt="${p.name}"><div class="order-copy">${named?`<p class="kicker">${hearts(J.bondLevel(state,p.id),true)}Именной заказ</p>`:''}<h2>${esc(r.title)}</h2><p class="meta">${p.name} · ${typeName(r.type)}</p><div class="tags"><span>${icon('heart')}${STYLE[r.style]} ≥ ${r.min}</span><span>${icon('studio')}Ремесло ≥ 50</span>${r.minMagic?`<span>${icon('rune')}Магия ≥ ${r.minMagic}</span>`:''}</div><small>${r.done?`${icon('check')}Заказ выполнен`:named?'Без срока · свежий дизайн · +60% к цене':`До дня ${r.until} · свежий дизайн · +15% к цене`}</small>${!r.done?(item?btn('deliver',`<img src="${jewelURL(item.design,64)}" alt=""><span>Передать «${esc(item.design.name)}»</span>`,'primary',`data-request="${r.id}" data-item="${item.id}"`):btn('prepare-order',`${icon('studio')}<span>Создать для заказа</span>`,'',`data-type="${r.type}"`)):''}</div></article>`;}).join('');
 // A named order that found no room waits on the friend's side and comes the first morning there is room.
 const waiting=J.CLIENTS.filter(p=>state.bonds[p.id]?.pending).map(p=>`<p class="fine-print waiting">${icon('heart')}<span>${p.name} ${p.female?'готова':'готов'} сделать именной заказ «${P.NAMED[p.id].title}». Он появится, когда в списке освободится место.</span></p>`).join('');
 return `<div class="section-line"><h1>Личные заказы</h1><small>По вкусу жителей</small></div>${tabs}${list||`<div class="card empty">${icon('orders','big-icon')}<h2>Заказов пока нет</h2><p class="muted">Жители оставят новые просьбы завтра.</p></div>`}${waiting}`;}
// The theme of the week, how the judge scores, the best medal so far and the reviews of past weeks.
function guildHTML(tabs){const theme=P.themeOf(state.day),host=client(theme.host),g=state.guild,left=P.daysLeft(state.day),eye=state.skills.includes('eye'),tries=g.tried.length,full=tries>=P.TRIES;
 const past=g.history.slice(0,6).map(h=>{const t=P.THEMES.find(t=>t.id===h.theme);return `<li><span class="ribbon-badge inline m${h.medal}" aria-hidden="true"></span><span><b>${t.name}</b><small>Неделя ${h.w+1} · «${esc(h.name)}» · ${h.medal?P.MEDALS[h.medal].toLowerCase():'похвальный отзыв'}, ${h.score}</small></span></li>`;}).join('');
 return `<div class="section-line"><h1>Цеховой смотр</h1><small>Неделя ${g.week+1}</small></div>${tabs}
 <section class="card theme-card"><div class="theme-head"><img class="portrait" src="${portrait(host)}" alt=""><div><p class="kicker">Тема недели · ведёт ${host.name}</p><h2>${theme.name}</h2><small>${left>1?`До смены темы ${left} ${plural(left,'день','дня','дней')}`:'Сегодня последний день темы'}</small></div></div>
 <div class="tags"><span>${icon('heart')}Стиль: ${STYLE[theme.style]}</span><span>${icon(ELEMENT_ICON[theme.element])}Руна: ${J.ELEMENTS[theme.element]}</span><span>${icon('studio')}Вид: ${theme.types.map(t=>TYPE_WANT[t]).join(', ')}</span><span>${icon('spark')}Свежесть</span></div>
 <div class="theme-status">${g.best?`<span class="medal-chip m${g.best}">${icon('ribbon')}${P.MEDALS[g.best]} · ${g.score}</span>`:tries?`<span class="medal-chip">${icon('ribbon')}Пока отзыв · ${g.score}</span>`:''}<span>Работ подано: ${tries} из ${P.TRIES}</span></div>
 ${btn('contest-open',`${icon('ribbon')}<span>${full?'Три работы уже поданы':'Подать работу'}</span>`,'primary big',full||!state.stock.length?'disabled':'')}
 ${!state.stock.length?'<p class="fine-print">На витрине пока нечего подать: сначала закончи изделие.</p>':!tries&&!eye?'<p class="fine-print">Тема недели: попробуй подать работу. Прогноз судьи откроет «Глаз мастера».</p>':''}</section>
 <div class="card note judge-note"><h3>Как судит цех</h3>${[['Стиль темы',40],['Ремесло',20],['Сила руны темы',15],['Свежесть для порта',15],['Вид из темы',10]].map(([t,n])=>`<div class="score-row"><span>${t}</span><b>до ${n}</b></div>`).join('')}<p class="fine-print">Бронза — от 62 баллов, серебро — от 75, золото — от 87. В неделю можно подать три работы, каждую по разу; работа остаётся на витрине. Награда — за лучшую медаль недели: репутация, камни стихии темы и дружба ведущего. Лента остаётся на вещи и прибавляет к цене 5% за ступень медали.</p></div>
 ${past?`<h3 class="label">Прошлые смотры</h3><ul class="past-reviews">${past}</ul>`:''}`;}
// The residents with their steps of friendship, and the letters, newest first.
function mailHTML(tabs){const unread=P.unread(state);
 const people=J.CLIENTS.map(p=>{const b=bondOf(p.id);return btn('resident',`<img src="${portrait(p)}" alt=""><span><b>${p.name}</b>${hearts(b.level,true)}<small>${b.name}</small></span>`,'resident-chip',`data-id="${p.id}" aria-label="${p.name}: ${b.name}, дружба ${b.level} из 5"`);}).join('');
 const letters=state.mail.map(m=>{const l=P.letter(m.id),p=client(l.from);return btn('letter',`<img class="portrait" src="${portrait(p)}" alt=""><span><b>${p.name}${m.read?'':'<i class="dot" aria-hidden="true"></i>'}</b><small>День ${m.day||'—'}</small><em>${esc(l.text)}</em></span>`,'letter-card'+(m.read?'':' unread'),`data-id="${m.id}" aria-label="Письмо от ${P.OF[p.id]}, день ${m.day}${m.read?'':', не прочитано'}"`);}).join('');
 return `<div class="section-line"><h1>Письма</h1><small>${unread?`${unread} ${plural(unread,'новое','новых','новых')}`:'Жители порта'}</small></div>${tabs}
 <div class="residents">${people}</div>
 ${letters?`<h3 class="label">Письма жителей</h3><div class="letters">${letters}</div>`:`<div class="card empty">${icon('letter','big-icon')}<h2>Писем пока нет</h2><p class="muted">Жители пишут, когда дружба крепнет: на второй, третьей и пятой ступени. Дружба растёт за покупки по вкусу, заказы и медали смотра.</p></div>`}`;}
// «Развитие»: techniques bought with coins and experience, and the master's book of everything made once.
function developHTML(){const tabs=`<div class="tabs develop-tabs" role="tablist">${[['skills','develop','Техники'],['book','book','Книга']].map(([id,ic,name])=>btn('develop-tab',`${icon(ic)}${name}`,developTab===id?'active':'',`data-tab="${id}" role="tab" aria-selected="${developTab===id}"`)).join('')}</div>`;return developTab==='book'?bookHTML(tabs):skillsHTML(tabs);}
function skillsHTML(tabs){const {now,next,p}=standing(),opened=PATTERNS.filter(p=>patternUnlocked(state,p.id)).length,soon=PATTERNS.filter(p=>!patternUnlocked(state,p.id)).sort((a,b)=>a.need-b.need)[0];
 return `<div class="section-line"><h1>Искусство ювелира</h1></div>${tabs}${btn('rank-path',`${icon('crest','big-icon')}<span><b>${now.name}</b><small>Репутация ${state.rep}${next?` · до звания «${next.name}» ещё ${next.rep-state.rep}`:' · высшее звание цеха'}</small><i class="bar" style="--p:${p}%"></i></span>`,'card rank-card',`aria-label="Путь мастера: ${now.name}, репутация ${state.rep}"`)}
 <div class="tree">${[J.TOOLS.slice(0,3),['signature','mounts','alchemy'].map(id=>J.TOOLS.find(t=>t.id===id))].map(row=>`<div class="tree-row">${row.map(t=>{const learned=state.skills.includes(t.id),ready=t.parents.every(p=>state.skills.includes(p)),affordable=state.gold>=t.cost&&state.xp>=t.xp;return btn('skill',`${icon(SKILL_ICON[t.id])}<b>${t.name}</b><small>${learned?'Изучено':ready?`${t.cost} мон. · ${t.xp} оп.`:'Нужна предыдущая'}</small>`,`skill${learned?' unlocked':ready?(affordable?' ready':''):' locked'}`,`data-skill="${t.id}"`);}).join('')}</div>`).join('')}</div>
 <div class="card note"><h3>Узоры мастерской · ${opened}/${PATTERNS.length}</h3><div class="pattern-list">${PATTERNS.map(p=>`<span class="${patternUnlocked(state,p.id)?'':'locked'}">${p.name}</span>`).join('')}</div><p class="muted">${soon?`Новые узоры откроются после ${soon.need} изделий (сделано ${state.crafted}).`:'Все узоры открыты.'} Опыт мастера — ${state.xp}: он даётся за создание, продажу и заказы и при изучении техник не тратится.</p></div>`;}
// Pictures of the book are drawn once per page visit of the game; none of them sits on velvet.
const bookArt=new Map(),art=(key,make)=>{if(!bookArt.has(key))bookArt.set(key,make());return bookArt.get(key);};
const DECOR_ICON={lamp:'lamp',flowers:'vase',map:'frame'};
function bookThumb(key){const [kind,rest='']=key.split(':'),[a,b]=rest.split(/[.+]/),img=src=>`<img src="${src}" alt="">`;
 if(kind==='form')return b==='free'?icon('shape'):img(art(key,()=>jewelURL(J.makeDesign(a,b,'silver'),64,{background:false})));
 if(kind==='motif')return rest==='hand'?icon('engrave'):img(art(key,()=>{const d=J.makeDesign('pendant','circle','silver');try{if(rest==='runes')d.gems=layoutGems(d,'solo',{kind:'sapphire',size:3});d.strokes=patternStrokes(d,rest,{width:1.4});}catch{}return jewelURL(d,64,{background:false});}));
 if(kind==='stone')return img(gemURL(a,48,b));
 if(kind==='layout')return img(art(key,()=>{const d=J.makeDesign('pendant','circle','silver');try{d.gems=layoutGems(d,rest,{kind:'garnet',size:5});}catch{}return jewelURL(d,64,{background:false});}));
 if(kind==='rune')return icon(ELEMENT_ICON[rest]);
 if(kind==='pair')return `<span class="pair">${icon(ELEMENT_ICON[a])}${icon(ELEMENT_ICON[b])}</span>`;
 if(kind==='metal')return img(metalURL(a,48));
 return icon('seal');}
// What a page of the book says about one entry: found on a day, still to find, locked, or a hidden mark.
function entry(key,id){const mark=id==='marks'?P.MARKS.find(m=>m.id===key):null,day=(mark?state.book.m:state.book.e)[key],found=day!==undefined,[kind,rest]=key.split(':'),[type,tpl]=kind==='form'?rest.split('.'):[];
 const lock=!found&&kind==='form'?(!J.typeAvailable(state,type)?'нужна техника «Оружейные оправы»':!J.templateOpen(state,tpl)?`нужно звание «${J.RANKS[J.TEMPLATES.find(t=>t.id===tpl).rank].name}»`:''):'';
 return {mark,day,found,lock,name:mark&&mark.hidden&&!found?'???':mark?mark.name:P.keyName(key)};}
function bookHTML(tabs){const book=state.book,count=P.bookCount(book),total=P.bookTotal(),keys=P.chapterKeys(chapter),cos=state.cosmetics,v=P.VELVETS.find(v=>v.id===cos.velvet)||P.VELVETS[0];
 const how=v=>v.price?`${v.price} мон.`:v.chapter?`глава «${P.CHAPTERS.find(c=>c.id===v.chapter).name}»`:v.rank?`звание «${J.RANKS[v.rank].name}»`:'';
 return `<div class="section-line"><h1>Книга мастера</h1><small>${count}/${total}</small></div>${tabs}<i class="bar book-bar" style="--p:${count/total*100}%"></i>
 <details class="card velvets"${velvetsOpen?' open':''}><summary><i class="swatch" style="--a:${v.hi};--b:${v.lo}"></i><span><b>Бархат витрины: ${v.name}</b><small>Бархатов ${cos.owned.length}/${P.VELVETS.length} · убранство лавки ${cos.decor.length}/${P.DECOR.length}</small></span></summary>
  <div class="velvet-grid">${P.VELVETS.map(x=>{const own=cos.owned.includes(x.id),cur=x.id===cos.velvet;return btn('velvet',`<i class="swatch" style="--a:${x.hi};--b:${x.lo}"></i><span>${x.name}<small>${cur?'на витрине':own?'застелить':how(x)}</small></span>`,`velvet-chip${cur?' active':''}${own?'':' locked'}`,`data-velvet="${x.id}" aria-pressed="${cur}"`);}).join('')}</div>
  <h3 class="label">Убранство лавки</h3>${P.DECOR.map(f=>{const own=cos.decor.includes(f.id);return `<div class="decor-row">${icon(DECOR_ICON[f.id])}<span><b>${f.name}</b><small>${f.desc}</small></span>${own?`<em>${icon('check','inline')}в лавке</em>`:btn('buy-cosmetic',coins(f.price),'chip',`data-id="${f.id}" aria-label="Купить: ${f.name} за ${f.price} монет"`)}</div>`;}).join('')}<p class="fine-print">Бархат и убранство только украшают лавку и мастерскую: на цены они не влияют.</p></details>
 <div class="rail chapter-tabs" role="tablist" aria-label="Главы книги">${P.CHAPTERS.map(c=>{const ks=P.chapterKeys(c.id),n=ks.filter(k=>entry(k,c.id).found).length,done=book.pages.includes(c.id);return btn('chapter',`${done?icon('check'):''}${c.name}<small>${n}/${ks.length}</small>`,`chip${chapter===c.id?' active':''}${done?' done':''}`,`data-chapter="${c.id}" role="tab" aria-selected="${chapter===c.id}"`);}).join('')}</div>
 <div class="book-grid">${keys.map(k=>{const e=entry(k,chapter),when=e.found?(e.day?`день ${e.day}`:'до книги'):e.lock?'закрыто':'ещё нет';return btn('book-entry',`<span class="thumb">${e.lock?icon('lock'):bookThumb(k)}${e.found||e.lock?'':'<i>?</i>'}</span><b>${hyph(esc(e.name))}</b><small>${when}</small>`,`book-tile${e.found?' found':''}${e.lock?' locked':''}`,`data-key="${k}" aria-label="${esc(e.name)}: ${when}"`);}).join('')}</div>
 ${chapter==='motifs'&&Object.values(book.e).includes(0)?'<p class="fine-print">Вещи, сделанные до книги, не помнят готовых узоров: их гравировка записана как своя.</p>':''}<p class="fine-print">Книга считает формы, узоры и камни по названию. Для порта новизна другая: покупатели смотрят на всю вещь целиком, и знакомый рисунок на новой основе может показаться им уже виденным.</p>`;}
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
// A finished piece shows what it wrote into the book right in its dialog, not as toasts behind it.
function bookNews(done){if(!done)return '';const {fresh=[],marks=[],chapters=[],rep=0}=done,velvet=c=>P.VELVETS.find(v=>v.chapter===c.id);if(!fresh.length&&!marks.length&&!chapters.length&&!rep)return '';
 return `<div class="book-news">${fresh.length?`<h3 class="label">Впервые в книге</h3><div class="tags seals">${fresh.map(k=>`<span>${icon('seal')}${esc(P.keyName(k))}</span>`).join('')}</div>`:''}${marks.length?`<h3 class="label">${marks.length>1?'Клейма':'Клеймо'} мастерской</h3><div class="tags seals marks">${marks.map(m=>`<span>${icon('seal')}${esc(m.name)}</span>`).join('')}</div>`:''}${chapters.map(c=>`<p class="chapter-done">${icon('book')}<span>Глава «${c.name}» собрана${velvet(c)?`: открыт бархат «${velvet(c).name}»`:''}</span></p>`).join('')}${rep?`<p class="rep-gain">${icon('crest')}Репутация +${rep}</p>`:''}</div>`;}
function showAssessment(item,completed=false,done=null){const d=item.design,e=J.evaluate(d),effects=Object.entries(e.effects).map(([id,power])=>`<span>${icon(ELEMENT_ICON[id])}${J.ELEMENTS[id]} +${Math.round(power*(state.skills.includes('alchemy')?1.25:1))}</span>`).join('');
 modal(completed?'Украшение готово':'Оценка работы',`<div class="hero-jewel${completed?' reveal':''}"><img src="${jewelURL(d,320,{background:false})}" alt="${esc(d.name)}"></div><h2 class="center">${esc(d.name)}</h2><p class="center muted">${typeName(d.type)} · ${J.METALS[d.metal].name} · стиль «${e.label}»</p>${J.ribbonOf(item)?`<p class="center ribbon-line"><span class="ribbon-badge inline m${J.ribbonOf(item)}" aria-hidden="true"></span>${P.RIBBONS[J.ribbonOf(item)][0].toUpperCase()+P.RIBBONS[J.ribbonOf(item)].slice(1)} смотра «${P.themeOfWeek(item.ribbon.w).name}» · +${J.ribbonOf(item)*5}% к цене</p>`:''}${completed?bookNews(done):''}${bar(`Мастерство · ×${mult(e)} к цене`,e.craft)}${bar('Магия',magicOf(e),60)}${effects?`<div class="tags">${effects}</div>`:''}
 ${state.skills.includes('eye')?`<h3 class="label">Разбор стиля</h3>${Object.entries(e.style).map(([id,n])=>bar(STYLE[id],n)).join('')}<p class="fine-print">Обработано ${e.polish}% металла, связанных камней: ${e.connections}. Мастерство зависит от контура, оправ, гравировки и обработки. У жителей разные вкусы.</p>`:`<p class="fine-print">Полировка и устойчивые оправы повышают мастерство. «Глаз мастера» открывает подробный разбор.</p>`}${completed?`<div class="row fill">${btn('completed-studio','Ещё изделие')}${btn('completed-shop','На витрину','primary')}</div>`:''}`,true,completed?'celebrate':'');}
const REP_SOURCES=[['Продажа по полной цене','+1'],['Вкус покупателя от 70%','+1'],['Дизайн, новый для порта','+2'],['Первая полная продажа жителю','+2'],['Продажа знатоку дня','+2'],['Личный заказ','+4'],['Новая запись в книге','+1, до 4 за вещь'],['Клеймо мастерской','+3'],['Собранная глава книги','+10']];
function showPath(){const {rank,now,next,p}=standing();
 modal('Путь мастера',`<div class="rank-now">${icon('crest','big-icon')}<div><b>${now.name}</b><small>Репутация ${state.rep}${next?` · до звания «${next.name}» ещё ${next.rep-state.rep}`:' · высшее звание цеха'}</small><i class="bar" style="--p:${p}%"></i></div></div>
 <ol class="rank-steps">${J.RANKS.map((r,i)=>`<li class="${i<rank?'done':i===rank?'now':''}"><span class="step">${i<rank?icon('check'):i+1}</span><div><b>${r.name}</b><small>${r.rep?`от ${r.rep} репутации`:'начало пути'}${r.budget?` · кошельки гостей +${r.budget}`:''}</small>${r.unlocks.map(u=>`<p>${u}</p>`).join('')}</div></li>`).join('')}</ol>
 <h3 class="label">Как растёт репутация</h3>${REP_SOURCES.map(([t,n])=>`<div class="score-row"><span>${t}</span><b>${n}</b></div>`).join('')}<p class="fine-print">Скидки, встречные цены ниже 95% от полной и продажи насыщенного дизайна репутации не дают. Репутация никогда не убывает.</p>`);}
// A new rank is announced once, after the dialog that is open; several ranks at once share one announcement.
function checkRank(){if(loadError||rankQueued||J.rankOf(state)<=(state.rankSeen??0))return;rankQueued=true;queueModal(()=>{rankQueued=false;showRank();},'rank');}
function showRank(){const rank=J.rankOf(state),from=state.rankSeen??0;if(rank<=from){modals.next()?.();return;}state.rankSeen=rank;scheduleSave();const opened=J.RANKS.slice(from+1,rank+1).flatMap(r=>r.unlocks);
 modal(`Звание «${J.RANKS[rank].name}»`,`<div class="rank-hero">${icon('crest','big-icon')}<p>Цех признал твою работу: репутация ${state.rep}.${rank===J.RANKS.length-1?' Выше звания в цехе нет.':''}</p></div><ul class="unlocks">${opened.map(u=>`<li>${u}</li>`).join('')}<li>${from?`Кошельки гостей полнее: +${J.RANKS[rank].budget} монет вместо +${J.RANKS[from].budget}`:`Кошельки гостей полнее на ${J.RANKS[rank].budget} монет`}</li></ul>${from<1?'<p class="fine-print">Гости сегодняшнего дня уже пришли: первый знаток заглянет в лавку завтра.</p>':''}${btn('close','Продолжить','primary')}`,true,'celebrate');audio.play('magic');}
// An older workshop meets the book and the ranks once: its work is already counted.
function showUpdate(){delete state.upgraded;scheduleSave();const {rank,now,next}=standing(),work=`${state.crafted} ${plural(state.crafted,'изделие','изделия','изделий')} и ${state.sold} ${plural(state.sold,'продажу','продажи','продаж')}`;
 // A workshop that has made only a few pieces stays an apprentice: it hears how close the first rank is instead.
 modal('Мастерская обновилась',`<div class="rank-hero">${icon('crest','big-icon')}<p>${rank?`Тебе присвоено звание <b>«${now.name}»</b>: цех учёл ${work}.`:`Цех учёл ${work}: репутация ${state.rep}. До звания <b>«${next.name}»</b> ещё ${next.rep-state.rep}.`}</p></div><div class="help-grid"><b>${icon('book')}</b><span>Книга мастера в «Развитии» хранит формы, узоры, камни, раскладки, руны, металлы и клейма. Работы с витрины и из моделей уже вписаны.</span><b>${icon('crest')}</b><span>Репутация растёт за полные продажи, заказы, новые записи в книге и клейма. Звания открывают новые основы, кошельки гостей побогаче и знатока дня.</span><b>${icon('spark')}</b><span>Знаток дня ищет то, чего в порту ещё не видели, и платит за это дороже.</span></div>${btn('close','К работе','primary')}`);}
function pickVelvet(id){const v=P.VELVETS.find(v=>v.id===id);if(!v)return;if(state.cosmetics.owned.includes(id)){if(state.cosmetics.velvet!==id)action(()=>P.useVelvet(state,id),`Витрина застелена бархатом «${v.name}».`);return;}
 if(v.price){confirmCosmetic(id);return;}toast(v.chapter?`«${v.name}» откроется, когда будет собрана глава «${P.CHAPTERS.find(c=>c.id===v.chapter).name}».`:`«${v.name}» откроется со званием «${J.RANKS[v.rank].name}».`,{kind:'hint'});}
function confirmCosmetic(id){const v=P.VELVETS.find(v=>v.id===id)||P.DECOR.find(v=>v.id===id);if(!v?.price)return;const velvet=P.VELVETS.includes(v);
 modal(velvet?'Новый бархат':'Убранство лавки',`<div class="rank-hero">${velvet?`<i class="swatch big" style="--a:${v.hi};--b:${v.lo}"></i>`:icon(DECOR_ICON[id],'big-icon')}<p><b>${v.name}</b>${velvet?'. Им застелют витрину, поднос и стол мастерской.':`. ${v.desc}.`}</p></div><div class="score-row"><span>Цена</span><b>${v.price} мон.</b></div><div class="score-row"><span>В кошельке</span><b>${state.gold} мон.</b></div>${btn('confirm-cosmetic',`<span>Купить</span>${coins(v.price)}`,'primary big',`data-id="${id}" ${state.gold<v.price?'disabled':''}`)}<p class="fine-print">Покупка только для красоты: на цены и покупателей она не влияет.</p>`);}
function showEntry(key){const id=P.MARKS.some(m=>m.id===key)?'marks':chapter,e=entry(key,id);
 toast(e.mark?(e.mark.hidden&&!e.found?'Тайное клеймо: оно найдётся само.':`Клеймо «${e.mark.name}». ${e.mark.desc}.${e.found?(e.day?` Получено в день ${e.day}.`:' Получено до книги.'):''}`):e.found?`${e.name}: ${e.day?`записано в день ${e.day}`:'записано до книги'}.`:e.lock?`${e.name}: ${e.lock}.`:`${e.name}: ещё не встречалось в твоих работах.`,{kind:e.found?e.mark?'mark':'info':'hint'});}
function showDemand(){modal('Спрос любит новые работы',`<p>После <b>4 продаж одного дизайна по полной или высокой цене</b> цена следующих экземпляров падает на <b>75%</b>.</p><p>Скидка и встречная цена ниже 95% от полной считаются <b>половиной продажи</b>: две такие продажи — как одна полная.</p><p>Спрос восстанавливается через <b>7 торговых дней с продажами</b>. Дни без продаж этот срок не сокращают.</p><p>Для порта дизайн остаётся новым до первой продажи по полной цене.</p><p>Название, цвет металла и небольшие правки не делают старый рисунок новым. Меняй форму, узор и расположение камней — готовые узоры на другой форме тоже дают новый дизайн.</p><p class="fine-print">Личные заказы учитываются так же. Заказчики не принимают дизайн, спрос на который уже насыщен.</p>`);}
function showSkill(id){const t=J.TOOLS.find(t=>t.id===id);if(!t)return;const learned=state.skills.includes(id),parents=t.parents.filter(p=>!state.skills.includes(p));modal(t.name,`<div class="skill-hero">${icon(SKILL_ICON[id],'big-icon')}<p>${t.desc}</p></div>${parents.length?`<p>Сначала: ${parents.map(id=>J.TOOLS.find(t=>t.id===id).name).join(', ')}.</p>`:''}<div class="score-row"><span>Стоимость</span><b>${t.cost} мон.</b></div><div class="score-row"><span>Нужный опыт</span><b>${Math.min(state.xp,t.xp)} / ${t.xp}</b><i class="bar" style="--p:${Math.min(100,state.xp/t.xp*100)}%"></i></div><p class="fine-print">Опыт не тратится при изучении.</p>${btn('learn',learned?'Изучено':'Изучить','primary',`data-skill="${id}" ${learned||parents.length||state.gold<t.cost||state.xp<t.xp?'disabled':''}`)}`);}
function download(raw,filename){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function menu(){editor?.finish();modal('Мастерская «Сияние»',`<div class="settings">${btn('toggle-sound',`${icon('sound')}<span>Эффекты</span><em>${state.sound?'вкл':'выкл'}</em>`,state.sound?'on':'')}${btn('toggle-music',`${icon('music')}<span>Музыка</span><em>${state.music?'вкл':'выкл'}</em>`,state.music?'on':'')}<label class="slider">Громкость <input id="volume" aria-label="Громкость" type="range" min="0" max="1" step="0.05" value="${state.volume}"></label>${btn('toggle-large',`${icon('text')}<span>Крупный текст</span><em>${state.prefs?.large?'вкл':'выкл'}</em>`,state.prefs?.large?'on':'',`aria-pressed="${!!state.prefs?.large}"`)}${btn('toggle-calm',`${icon('calm')}<span>Меньше анимаций</span><em>${state.prefs?.calm||reduced.matches?'вкл':'выкл'}</em>`,state.prefs?.calm||reduced.matches?'on':'',`aria-pressed="${!!state.prefs?.calm}"`)}${btn('export',`${icon('download')}<span>Скачать сохранение</span>`)}${btn('import',`${icon('upload')}<span>Загрузить сохранение</span>`)}${backupMeta?btn('restore-backup',`${icon('undo')}<span>Вернуть прежнюю мастерскую</span><em>день ${backupMeta.day}</em>`):''}${state.legacy?btn('legacy-export',`${icon('download')}<span>Архив прежней игры</span>`):''}${updateReady?btn('reload-app',`${icon('download')}<span>Обновить до новой версии</span>`):''}${loadError?btn('reset-recovery','Начать заново','danger'):''}</div><p class="fine-print">Изделия и история действий сохраняются на этом устройстве. Для переноса на другой телефон скачай файл. ${reduced.matches?'Анимации уменьшены настройкой системы. ':''}Веленский порт, 1740 год.</p>${state.legacy?'<p class="fine-print">Монеты и запасы перенесены. Прежние товары обменены на 65% их стоимости; оригинальное сохранение доступно в архиве.</p>':''}`);}
function welcome(){const d=J.makeDesign('pendant','drop','gold');try{d.gems=layoutGems(d,'halo',{kind:'sapphire',size:3.6});d.strokes=patternStrokes(d,'beads',{});}catch{}
 modal('Добро пожаловать в «Сияние»',`<div class="welcome"><img src="${jewelURL(d,240,{background:false})}" alt="Золотой кулон-капля с сапфирами"><p>Твоя ювелирная мастерская в Веленском порту, 1740 год.</p></div><div class="help-grid"><b>${icon('pattern')}</b><span>Придумай форму, нанеси свой узор или выбери готовый — он ляжет точно по контуру.</span><b>${icon('stone')}</b><span>Поставь камни, пробуди их рунами, отполируй оправу.</span><b>${icon('shop')}</b><span>Выставляй работы и ищи покупателя по вкусу. Повторяющиеся дизайны теряют спрос.</span></div>${state.legacy?'<p class="fine-print">Твой прежний прогресс перенесён, исходное сохранение лежит в архиве.</p>':''}<h3 class="label center">Открыть мастерскую</h3><div class="row fill welcome-start">${btn('welcome-start',`${icon('mute')}<span>Тихо</span>`,'','data-sound="0"')}${btn('welcome-start',`${icon('sound')}<span>Со звуком</span>`,'primary','data-sound="1"')}</div><p class="fine-print center">Музыку и эффекты можно сменить в меню.</p>`,false,'welcome-dialog');}
// Ending the day sends the waiting guests away, so it asks first while one of them could still buy.
// The last day of a guild theme with nothing entered is a reason too: the next morning brings another theme.
function dayReasons(){const guests=state.customers.filter(c=>!c.served),n=guests.length,theme=P.themeEnding(state);return [...n&&state.stock.length?[`${n} ${plural(n,'покупатель','покупателя','покупателей')} ещё в лавке и ${n===1?'уйдёт':'уйдут'}: ${guests.map(c=>client(c.client).name).join(', ')}.`]:[],...theme?[`Сегодня последний день темы «${theme.name}», а на смотр ещё ничего не подано.`]:[]];}
function nextDay(confirmed=false){editor?.finish();const reasons=confirmed?[]:dayReasons();
 if(reasons.length){modal('Закончить день?',`<ul class="reasons">${reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p class="fine-print">Черновик, запасы и витрина останутся до завтра.</p><div class="row fill">${btn('stay-in-shop','Остаться в лавке')}${btn('confirm-next-day','Закончить день','primary')}</div>`);return;}
 const day=state.day;let daily;try{forgetRecycled();daily=P.nextDay(state);}catch(e){toast(e.message,true);return;}scheduleSave();render();audio.play('good');warmShowcase();
 const guests=state.customers.map(c=>({...client(c.client),novel:c.novel===true})),novel=guests.find(p=>p.novel);
 queueModal(()=>modal(`Итоги дня ${day}`,`<div class="summary"><span><b>${daily.made||0}</b><small>создано</small></span><span><b>${daily.sales}</b><small>продано</small></span><span><b>${daily.income||0}</b><small>выручка</small></span></div><h3 class="label">Утро дня ${state.day}: в лавку заглянут</h3><div class="guest-row">${guests.map(p=>`<span><img src="${portrait(p)}" alt="">${p.name}${p.novel?' ✦':''}</span>`).join('')}</div>${morning(daily)}<p class="fine-print">${novel?`✦ ${novel.name} сегодня знаток: ищет то, чего порт ещё не видел. `:''}Силы восстановлены. Черновик и история действий сохранены.</p>${btn('close','Начать день','primary')}`),'morning');}
// What the night brought: a friend's stone at the door, named orders that found room, the result and the new theme of the guild.
function morning(d){const lines=[];if(d.gift)lines.push([icon('heart'),`${client(d.gift.by).name} ${client(d.gift.by).female?'оставила':'оставил'} у двери ${matName(d.gift.id).toLowerCase()}.`]);
 for(const r of d.named||[])lines.push([icon('orders'),`Именной заказ от ${P.OF[r.client]}: «${esc(r.title)}».`]);
 if(d.week)lines.push([icon('ribbon'),`Итог смотра «${P.themeOfWeek(d.week.w).name}»: ${d.week.medal?P.MEDALS[d.week.medal].toLowerCase():'похвальный отзыв'}, ${d.week.score} ${plural(d.week.score,'балл','балла','баллов')}.`]);
 if(d.theme)lines.push([icon('crest'),`Новая тема цеха: «${d.theme.name}», ведёт ${client(d.theme.host).name}.`]);
 return lines.length?`<ul class="morning-news">${lines.map(([i,t])=>`<li>${i}<span>${t}</span></li>`).join('')}</ul>`:'';}
function resetEditor(){editorOptions={tool:'shape',width:1,symmetry:false,gem:'garnet',cut:'round',zoom:1,pan:{x:0,y:0}};lastPattern={id:null,n:0};}
function editAndRefresh(fn){try{editor?.finish();const d=J.clone(state.draft.design);fn(d);J.edit(state,d);scheduleSave();editor.dirty=true;editor.metrics=J.evaluate(d);updateEditor();}catch(e){toast(e.message,true);}}
// Marks and chapters earned outside the ceremony come as toasts of their own, after the message of the action.
// A step of friendship without a letter is a toast too; letters wait for the rank announcement, then open one by one.
function rewards(r){for(const m of r?.marks||[])toast(`Клеймо «${m.name}» · репутация +3`,{kind:'mark'});for(const c of r?.chapters||[])toast(`Глава «${c.name}» собрана · репутация +10`,{kind:'mark'});
 for(const st of r?.steps||[])if(st.level===1)toast(`${client(st.id).name}: «${P.bondName(client(st.id),1)}» · дружба 1 из 5`,{kind:'mark'});
 for(const n of r?.named||[])toast(`Именной заказ от ${P.OF[n.client]}: «${n.title}». Без срока, +60% к цене.`,{kind:'mark'});
 for(const id of r?.waiting||[])toast(`${client(id).name} ${client(id).female?'готова':'готов'} сделать именной заказ: он появится, когда освободится место.`,{kind:'hint'});
 queueLetters(r);}
function queueLetters(r){if(!r?.letters?.length)return;checkRank();for(const id of r.letters)queueModal(()=>showLetter(id),'letter');}
// A letter opens as a sheet of paper; the third one names the friend's help, the fifth what the friendship brought.
function showLetter(id){const l=P.readLetter(state,id);if(!l){modals.next()?.();return;}scheduleSave();const p=client(l.from),m=state.mail.find(m=>m.id===id);
 modal(`Письмо от ${P.OF[p.id]}`,`<article class="letter"><header><img class="portrait" src="${portrait(p)}" alt=""><span><b>${p.name}</b><small>${p.role} · день ${m?.day||state.day}</small></span></header><p>${esc(l.text)}</p><p class="sign">${esc(l.sign)}</p></article>
 ${l.level===3?`<p class="privilege">${icon('heart')}<span><b>Помощь друга</b>${P.PRIVILEGES[p.id]}</span></p>`:l.level===5?`<p class="privilege">${icon('crest')}<span><b>Пятая ступень дружбы</b>Репутация +10</span></p>`:''}${btn('close','Сложить письмо','primary')}`,true,'letter-dialog');
 audio.play('magic');render();}
// What a resident is to the workshop: the step of friendship, their taste and what each step brings.
function showResident(id){const b=bondOf(id),p=b.p,last=state.bonds[id]?.last,theme=P.THEMES.find(t=>t.host===id),named=state.requests.find(r=>r.keep===true&&r.client===id);
 const steps=[[1,'Узнаёт мастерскую и помнит покупки'],[2,'Письмо'],[3,`Письмо и помощь: ${P.PRIVILEGES[id].toLowerCase()}`],[4,`Именной заказ «${P.NAMED[id].title}»: без срока, +60% к цене`],[5,`Письмо и репутация +10${'friend'in state.book.m?'':', а с первым близким другом — клеймо «Близкий друг»'}`]];
 modal(p.name,`<div class="resident-hero"><img class="portrait" src="${portrait(p)}" alt=""><div><b>${b.name}</b><small>${p.role}</small>${hearts(b.level,true)}${b.next?`<i class="bar" style="--p:${Math.round((b.points-J.BOND_LEVELS[b.level])/(b.next-J.BOND_LEVELS[b.level])*100)}%"></i><small>Дружба ${b.points}, до ступени «${P.bondName(p,b.level+1)}» ещё ${b.next-b.points}</small>`:'<small>Высшая ступень дружбы</small>'}</div></div>
 <p class="speech">${esc(p.line)}</p><div class="tags"><span>${icon('heart')}${STYLE[p.style]}</span><span><img src="${metalURL(p.metal,32)}" alt="">${J.METALS[p.metal].name}</span><span>${icon(ELEMENT_ICON[p.element])}${J.ELEMENTS[p.element]}</span><span>${icon('studio')}${p.wants.map(t=>TYPE_WANT[t]).join(', ')}</span></div>
 <h3 class="label">Ступени дружбы</h3><ol class="rank-steps bond-steps">${steps.map(([n,t])=>`<li class="${n<=b.level?'done':n===b.level+1?'now':''}"><span class="step">${n<=b.level?icon('check'):n}</span><div><b>${P.bondName(p,n)}</b><p>${t}</p></div></li>`).join('')}</ol>
 ${named?`<p class="fine-print">Именной заказ «${named.title}» ${named.done?'выполнен':'ждёт в «Заказах»'}.</p>`:''}${last?`<p class="fine-print">Последняя покупка: ${typeName(last.type).toLowerCase()} «${esc(last.name)}», день ${last.day}.</p>`:''}
 <p class="fine-print">Дружба растёт за полные продажи по вкусу (+1 от 60%, +2 от 80%), за скидку тому, кому не хватает денег (+2), за заказы (+3) и за медали смотра «${theme.name}». Она никогда не убывает.</p>`);}
// The guild review: the pieces of the showcase as the judge sees them; one is chosen, then entered with its own button.
function showContest(){editor?.finish();const eye=state.skills.includes('eye'),g=state.guild,theme=P.themeOf(state.day),list=contestList(state);contestPick=null;
 modal(`Смотр «${theme.name}»`,`<p class="fine-print">Выбери работу с витрины. Осталось попыток на этой неделе: ${P.TRIES-g.tried.length}.${eye?' Число на вещи — прогноз судьи.':' Прогноз судьи откроет «Глаз мастера».'}</p>
 <div class="contest-grid">${list.map(({item,score})=>{const tried=g.tried.includes(item.id),m=P.medalOf(score);return btn('contest-pick',`<img src="${jewelURL(item.design,112,{background:false})}" alt="">${ribbonBadge(item)}${tried?'<span class="tried-note">подана</span>':eye?`<span class="score m${m}">${score}</span>`:''}`,'gallery-item'+(tried?' tried':''),`data-item="${item.id}" aria-pressed="false" aria-label="${esc(item.design.name)}${eye?`, прогноз ${score}`:''}${tried?', уже подана':''}" ${tried?'disabled':''}`);}).join('')}</div>
 <div class="contest-submit">${btn('contest-enter','Выбери работу','primary big','id="contest-enter" disabled')}</div>`,true,'contest-dialog');}
function pickContest(b){contestPick=b.dataset.item;const item=state.stock.find(i=>i.id===contestPick);for(const el of document.querySelectorAll('[data-action="contest-pick"]')){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b?'true':'false');}
 const go=$('#contest-enter');if(go&&item){go.disabled=false;go.textContent=`Подать «${item.design.name}»`;}}
// The verdict: the five parts of the score, the host's word, and what the week's best medal brought, marks included.
function showVerdict(r){const host=client(r.theme.host),m=r.medal,gains=[r.improved&&r.rep?`Репутация +${r.rep}`:'',...r.gems.map(g=>`${matName(g.id)} ×${g.n}`),r.improved?`${host.name}: дружба +${m-r.prev}`:'',...r.marks.map(k=>`Клеймо «${k.name}»`)].filter(Boolean);
 modal(m?`${P.MEDALS[m]} смотра`:'Похвальный отзыв',`<div class="hero-jewel verdict"><img src="${jewelURL(r.item.design,240,{background:false})}" alt="${esc(r.item.design.name)}">${m?`<span class="ribbon-badge big m${m}" aria-hidden="true"></span>`:''}</div>
 <h2 class="center">${esc(r.item.design.name)}</h2><p class="center score-total"><b>${r.score}</b> из 100${m?` · ${P.RIBBONS[m]}`:''}</p>
 <div class="host-line"><img class="portrait" src="${portrait(host)}" alt=""><p class="speech">${P.VERDICT[m]}</p></div>
 ${P.PARTS.map(([k,name,max])=>`<div class="score-row"><span>${name}</span><b>${r.parts[k]} / ${max}</b><i class="bar" style="--p:${r.parts[k]/max*100}%"></i></div>`).join('')}
 ${gains.length?`<div class="tags seals">${gains.map(t=>`<span>${icon('seal')}${t}</span>`).join('')}</div>`:m?`<p class="fine-print">Медаль недели уже не ниже этой: награда за неё не повторяется.</p>`:''}${r.ribbon?`<p class="fine-print">Лента остаётся на вещи: +${m*5}% к её цене.</p>`:''}
 ${btn('close','Продолжить','primary')}`,true,m?'celebrate':'');audio.play(m?'magic':'good');}
function sell(b,which){const name=currentItem()?.design.name,from=b.getBoundingClientRect();const q=action(()=>P.sell(state,b.dataset.item,currentBuyer()?.id,which),q=>`«${name}» продано за ${q.price}${q.rep?` · репутация +${q.rep}`:''}${q.bond.points?` · дружба +${q.bond.points}`:''}${q.saturated?'. Спрос на этот дизайн насыщен.':''}`);if(q){audio.play('coin');coinBurst(from);itemId=null;render();rewards(q);}}
// The workshop being replaced by an import or a fresh start is put aside first, so the menu can bring it back.
async function putAside(){editor?.finish();const raw=loadError?sourceRaw:J.serialize(state);if(!raw)return false;const meta={day:loadError?0:state.day,gold:loadError?0:state.gold,stock:loadError?0:state.stock.length,damaged:loadError,at:Date.now()};
 try{await Promise.race([saveBackup(raw,meta),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),4000))]);backupMeta=meta;return true;}catch{return false;}}
function replaceWorkshop(next,welcomed=true){editor?.destroy();editor=null;state=next;loadError=false;sourceRaw=null;if(welcomed)state.welcomed=true;view='studio';buyerId=null;itemId=null;forgetRecycled();resetEditor();scheduleSave();render();warmShowcase();if(state.upgraded)queueModal(showUpdate,'update');checkRank();}
function showBackup(){const m=backupMeta;if(!m)return;modal('Прежняя мастерская',m.damaged?`<p>Перед загрузкой здесь было повреждённое сохранение. Его можно скачать файлом и попробовать восстановить.</p>${btn('download-backup',`${icon('download')}<span>Скачать файл</span>`,'primary big')}`:`<p>День ${m.day} · ${m.gold} мон. · изделий на витрине: ${m.stock}.</p><p class="fine-print">Текущая мастерская встанет на её место, и её тоже можно будет вернуть отсюда.</p><div class="row fill">${btn('download-backup',`${icon('download')}<span>Скачать</span>`)}${btn('confirm-restore','Вернуть','primary')}</div>`);}
// A finished piece opens its assessment; the first one also asks the browser to keep the save.
function finish(fn){const done=action(fn);if(done){itemId=done.item.id;showAssessment(done.item,true,done);queueLetters(done);audio.play('magic');if(!persistAsked){persistAsked=true;navigator.storage?.persist?.().catch(()=>{});}}}
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
 case'template':{const t=J.TEMPLATES.find(t=>t.id===b.dataset.template);if(!J.templateOpen(state,t.id)){toast(`«${t.name}» откроется со званием «${J.RANKS[t.rank].name}».`,{kind:'hint'});break;}template=t.id;render();break;}
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
 case'gather':action(()=>P.gather(state,b.dataset.area),r=>`Найдено: ${J.GEMS[r.gem].name} и ${J.METALS[r.metal].name} ×3${r.extra.map(x=>`. ${client(x.by).name}: ещё ${matName(x.id).toLowerCase()} ×${x.n}`).join('')}`);break;
 case'next-day':nextDay();break;
 case'confirm-next-day':close();nextDay(true);break;
 case'stay-in-shop':close();if(view!=='shop'){view='shop';render();}break;
 case'prepare-order':if(state.draft){view='studio';render();toast('Сначала закончи или убери текущую заготовку.');}else{selectedType=b.dataset.type;resetEditor();action(()=>{J.startDesign(state,selectedType,'oval','copper');view='studio';});}break;
 case'deliver':{const from=b.getBoundingClientRect();const r=action(()=>P.deliver(state,b.dataset.request,b.dataset.item),r=>`Заказ выполнен · ${r.reward} ${plural(r.reward,'монета','монеты','монет')} · репутация +${r.rep} · дружба +3`);if(r){audio.play('coin');coinBurst(from);rewards(r);}break;}
 case'skill':showSkill(b.dataset.skill);break;
 case'orders-tab':ordersTab=b.dataset.tab;render();$('#panel').scrollTop=0;break;
 case'resident':showResident(b.dataset.id);break;
 case'letter':showLetter(b.dataset.id);break;
 case'contest-open':showContest();break;
 case'contest-pick':pickContest(b);break;
 case'contest-enter':{const id=contestPick;if(!id)break;close();const r=action(()=>P.enterContest(state,id));if(r){showVerdict(r);rewards({...r,marks:[],chapters:[]});}break;}
 case'rank-path':showPath();break;
 case'develop-tab':developTab=b.dataset.tab;render();$('#panel').scrollTop=0;break;
 case'chapter':{const top=$('#panel').scrollTop;chapter=b.dataset.chapter;render();$('#panel').scrollTop=top;break;}
 case'book-entry':showEntry(b.dataset.key);break;
 case'velvet':pickVelvet(b.dataset.velvet);break;
 case'buy-cosmetic':confirmCosmetic(b.dataset.id);break;
 case'confirm-cosmetic':close();action(()=>P.buyCosmetic(state,b.dataset.id),v=>P.VELVETS.includes(v)?`Куплен бархат «${v.name}»: им застелена витрина.`:`«${v.name}» теперь в лавке.`);break;
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
 case'confirm-restore':close();loadBackup().then(async v=>{if(!v?.raw)throw new J.AtelierError('Прежняя мастерская не найдена.');const next=P.load(v.raw);if(!await putAside())throw new J.AtelierError('Текущую мастерскую не удалось отложить. Скачай её файлом и попробуй снова.');replaceWorkshop(next);toast(`Возвращена мастерская дня ${next.day}. Прежнюю можно вернуть из меню.`);}).catch(err=>toast(err instanceof J.AtelierError?err.message:'Прежнюю мастерскую не удалось прочитать.',true));break;
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
// The velvet panel of the book stays as the player left it while the page is redrawn after a purchase.
document.addEventListener('toggle',e=>{if(e.target.classList?.contains('velvets'))velvetsOpen=e.target.open;},true);
window.addEventListener('pagehide',()=>{flushSave(true);audio.pause();});
window.addEventListener('pageshow',e=>{if(e.persisted)otherWrite(readStamp());});
// A long game has a hundred pieces to appraise and draw once; idle moments do it before the first visit to the showcase.
// They also compare each piece with the port's ledger once: the connoisseur's ✦ marks and the judge of the guild review
// ask for it, and afterwards each piece compares itself with new ledger entries only.
function warmShowcase(from=0){const idle=globalThis.requestIdleCallback||(fn=>setTimeout(()=>{const end=performance.now()+12;fn({timeRemaining:()=>end-performance.now()});},80));idle(deadline=>{let i=from;const stock=state.stock;while(i<stock.length&&!editor?.operation&&deadline.timeRemaining()>6){const d=stock[i++].design;J.evaluate(d);jewelURL(d,112,{background:false});J.isFresh(state,d);}if(i<stock.length&&stock===state.stock)warmShowcase(i);});}
render();requestAnimationFrame(frame);if(!state.welcomed&&!loadError)queueModal(welcome,'welcome');if(state.upgraded&&!loadError)queueModal(showUpdate,'update');checkRank();warmShowcase();loadBackup(false).then(v=>{backupMeta=v?.meta||null;}).catch(()=>{});
// The first install also fires controllerchange; only a page that already had a worker is out of date.
if('serviceWorker'in navigator){const controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!controlled||updateReady)return;updateReady=true;toast('Доступна новая версия',false,{action:'reload-app',label:'Обновить',icon:'download'});});navigator.serviceWorker.register('./sw.js').catch(()=>{});}
