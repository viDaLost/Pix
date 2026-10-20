import * as P from './progress.js';
import * as L from './lore.js';
import * as G from './guide.js';
import {ScriptoriumScene,guestPerson as scenePerson,keeperPerson,personOf,hunterPerson as huntPerson,visitorPerson,lineup,doseLevel,THRESHOLD} from './scriptorium-scene.js';
import {itemURL,flaskURL,trophyURL,pixelImg} from './item-art.js';
import {paintPortrait} from './characters.js';
import {GameAudio,reportSounds,vibrate} from './audio.js';
import {openStore,readLegacy,StaleTabError} from './store.js';
import {icon,EMBLEM_ICON} from './icons.js';
import {ToastQueue,ModalQueue,toastSpec,toastDuration} from './notices.js';
import * as A from './ambience.js';
import {reportPlan,playReport} from './report-reveal.js';
import {plateCanvas,renderPlate,revealStep,thumbURL,stageOf,anchorsOf,STAGES} from './engraving.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,text,cls='',attrs='')=>`<button type="button" data-action="${action}" class="${cls}" ${attrs}>${text}</button>`;
const SAVE=P.SAVE_KEY,SAVED_AT=SAVE+':at',TAB=Math.random().toString(36).slice(2),portraits=new Map(),scene=new ScriptoriumScene(),audio=new GameAudio(),store=openStore('pix-bestiary');
let state=P.newGame(Date.now()>>>0),sourceRaw=null,loadError=false,storageOK=true,diskOK=true,known=0,conflict=false,dirty=false,saveTimer=0,writing=Promise.resolve(),lastCrash=0,updateReady=false,persistAsked=false,backupMeta=null,legacy=null;
// Any uncaught failure keeps the progress reachable: a toast with the save file, and a recovery card instead of a blank panel.
addEventListener('error',e=>{if(!e.error&&/ResizeObserver/.test(e.message))return;crash(e.error||new Error(e.message||'Ошибка сценария'));});addEventListener('unhandledrejection',e=>crash(e.reason));
const readStamp=()=>{try{const v=JSON.parse(localStorage.getItem(SAVED_AT)||'null');return Number.isFinite(v?.at)?v:null;}catch{return null;}};
try{let local=null;try{local=localStorage.getItem(SAVE);}catch{}let disk=null;try{disk=await store.load();}catch{}const stamp=raw=>{try{return JSON.parse(raw)?.savedAt||0;}catch{return -1;}};sourceRaw=disk?.raw&&(!local||stamp(disk.raw)>=stamp(local))?disk.raw:local;
 // Writes this tab has already seen are not conflicts, even when one of them never reached the disk.
 known=Math.max(sourceRaw?stamp(sourceRaw):0,disk?.stamp?.at||0,readStamp()?.at||0);if(sourceRaw)state=P.load(sourceRaw);}catch{loadError=true;storageOK=false;}
const channel='BroadcastChannel'in globalThis?new BroadcastChannel('pix-bestiary'):null;
// What the player looks at; none of it is part of the save.
let view='reception',receptionTab='queue',labTab='samples',shopTab='trader',chronicleTab='path',chosen=null,sheet=null,page=null,labMonster=null,lastFrame=0,welcomeSound=false,welcomeKeeper=null,swap=null,pendingImport=null,rankQueued=false;
const drafts=new Map(),labPick=new Set();let draftDay=state.day;
const dialog=$('#dialog'),toastEl=$('#toast'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const still=()=>reduced.matches||!!state.prefs?.calm;
// ---- words and small pieces
const plural=L.plural,mon=id=>L.MON.get(id),fact=id=>L.FACT.get(id),hunterOf=id=>L.HUNTER.get(id),CAT=new Map(L.CATEGORIES.map(c=>[c.id,c]));
const ROMAN=['I','II','III','IV','V','VI'],VARIANT={young:'молодой',grown:'матёрый',ancient:'древний'},STATE_WORD={rumour:'слух',confirmed:'подтверждено',refuted:'опровергнуто',dangerous:'опасно'};
const source=G.rumourSource;
const coins=n=>`<span class="coins">${icon('coin')}${n}</span>`,cost=n=>`<span class="cost" aria-label="${n} ${plural(n,'свеча','свечи','свечей')}">${icon('candle')}${n}</span>`;
const trust=n=>`<span class="trust" role="img" aria-label="Доверие ${n} из 5">${[0,1,2,3,4].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;
const eyes=n=>`<span class="eyes" role="img" aria-label="Зоркость ${n} из 5">${icon('eye')}<b>${n}</b></span>`;
const claws=n=>`<span class="claws" role="img" aria-label="Опасность: ${L.DANGER[n]} (${n} из 5)">${icon('claw').repeat(n)}</span>`;
const chip=(ic,text)=>`<span class="chip-tag">${icon(ic)}<span>${esc(text)}</span></span>`;
const female=who=>L.female(who),gendered=(who,m,f)=>female(who)?f:m,townName=id=>L.TOWN_TYPE.get(id)?.label||'Проситель';
// Stamps differ by form, mark and word (art.md 1.5); the colour only helps.
const STAMP_LOOK={confirmed:['ok','check'],rumour:['rumour','question'],refuted:['refuted','close'],dangerous:['danger','warn'],cond:['cond','approx'],ok:['ok','check'],none:['refuted','ring'],worse:['danger','up'],unseen:['unseen','dots']};
const stamp=(key,extra='',word=L.STAMPS[key])=>{const [cls,ic]=STAMP_LOOK[key];return `<span class="stamp ${cls}">${icon(ic)}<span>${word}</span>${extra?`<small>${esc(extra)}</small>`:''}</span>`;};
const mini=key=>{const [cls,ic]=STAMP_LOOK[key];return `<i class="mini ${cls}" role="img" aria-label="${L.STAMPS[key]}">${icon(ic)}</i>`;};
const knowKey=k=>k.rev?'cond':k.st;
// A portrait is the same frame as the scene, so it is kept per look and per rag: a beaten hunter looks beaten in the line,
// the artel and the report (art.md 4.8).
function portrait(person){const key=`${person.id}|${person.rag||0}`;if(portraits.has(key))return portraits.get(key);const c=document.createElement('canvas');c.width=c.height=64;paintPortrait(c.getContext('2d'),person,64);const url=c.toDataURL();portraits.set(key,url);return url;}
const hunterPerson=id=>huntPerson(state,id),guestPerson=v=>scenePerson(v,state);
const face=(person,rag=0,cls='portrait')=>`<span class="face ${cls}${rag?' rag'+rag:''}"><img src="${portrait(person)}" alt=""></span>`;
// Vibration (audio.js HAPTICS, art.md 6.2), when the player keeps it on and motion is not reduced.
const buzz=kind=>vibrate(kind,{on:state.haptics!==false,calm:still()});
// The pixel things of the content: a part, a herb or a good (item-art.js), a flask of a potion, a trophy.
const thing=(id,size=32)=>pixelImg(itemURL(L.MAT.get(id)?.look),size);
const flaskImg=(id,size=24,level=1)=>pixelImg(flaskURL(L.POT.get(id)?.look,level),size);
const contractOf=id=>state.contracts.find(c=>c.id===id)||null;
const ragOf=id=>state.hunters[id]?.rag||0;
function notice(){const el=$('#storage-warning');el.hidden=storageOK;el.textContent=loadError?'Сохранение повреждено. Скачай исходный файл в меню или загрузи другой.':'Автосохранение недоступно. Скачай бестиарий через меню.';}
// ---- saving: one batch after a short pause; leaving the page writes at once.
function scheduleSave(){dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,400);}
// A page that is being left cannot wait for IndexedDB, so then a large save goes to the synchronous mirror too.
// Otherwise a large save drops the mirror, so an older copy is never loaded in place of a newer one.
function save(leaving=false){clearTimeout(saveTimer);saveTimer=0;if(loadError)return;if(conflict){lockTab();return;}const other=readStamp();if(other&&other.tab!==TAB&&other.at>known){lockTab();return;}
 const since=known;state.savedAt=known=Math.max(Date.now(),known+1);dirty=false;const raw=P.serialize(state);let localOK=false;
 try{localStorage.setItem(SAVED_AT,JSON.stringify({at:known,tab:TAB}));if(raw.length<1500000||!diskOK||leaving){localStorage.setItem(SAVE,raw);localOK=true;}}catch{}if(!localOK&&diskOK)try{localStorage.removeItem(SAVE);}catch{}channel?.postMessage({at:known,tab:TAB});
 writing=store.save(raw,{at:state.savedAt,tab:TAB,since}).then(()=>{diskOK=storageOK=true;notice();}).catch(e=>{if(e instanceof StaleTabError){try{localStorage.setItem(SAVED_AT,JSON.stringify(e.stamp));if(localOK)localStorage.removeItem(SAVE);}catch{}lockTab();return;}diskOK=false;if(!localOK)try{localStorage.setItem(SAVE,raw);localOK=true;}catch{}storageOK=localOK;notice();});
 storageOK=localOK||diskOK;notice();}
const flushSave=(leaving=false)=>{if(dirty)save(leaving);};
// Reloading cuts off a write in progress, so the page waits for it (but never for long).
function reload(){try{if(!conflict)flushSave(true);}catch(e){console.error(e);}Promise.race([writing,new Promise(r=>setTimeout(r,3000))]).then(()=>location.reload());}
// A second tab, or an old one left open, never overwrites newer progress: it stops writing and asks for a reload.
// The browser may still force a dialog shut (repeated Escape, the back gesture), so the notice comes back on close.
function lockTab(){conflict=true;clearTimeout(saveTimer);if(dialog.open&&dialog.classList.contains('lock-dialog'))return;modal('Бестиарий открыт в другой вкладке',`<p>В другой вкладке или окне бестиарий уже сохранил более новые записи. Эта вкладка больше ничего не записывает, чтобы их не стереть.</p><p class="fine-print">Перезагрузи страницу, чтобы продолжить с последнего сохранения. Состояние этой вкладки можно скачать файлом.</p><div class="row fill">${btn('export',`${icon('download')}<span>Скачать</span>`)}${btn('reload-app','Перезагрузить','primary')}</div>`,false,'lock-dialog');}
const otherWrite=v=>{if(v&&v.tab!==TAB&&v.at>known)lockTab();};
channel?.addEventListener('message',e=>otherWrite(e.data));
// Storage events come only from other tabs.
addEventListener('storage',e=>{if(e.key===SAVED_AT){try{otherWrite(JSON.parse(e.newValue));}catch{}}else if(e.key===SAVE&&e.newValue)lockTab();});
// ---- toasts live in the top layer, so a reward or an error is seen above an open dialog; the queue rules are in notices.js.
const toasts=new ToastQueue();let toastTimer=0,heldHints=[];
function toast(text,opt=false,act=null){if(toasts.add(toastSpec(text,opt,act)))showToast();}
// A one-off hint steps aside while a dialog is open and comes back once the last dialog has closed.
const isHint=t=>t.action?.action==='hint-ok';
function holdHints(){const now=toasts.now,held=toasts.take(isHint);if(!held.length)return;heldHints.push(...held);if(toasts.now!==now)showToast();}
function releaseHints(){const held=heldHints;heldHints=[];for(const t of held)toast(t.text,t);}
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
function crash(e){if(e instanceof P.BestiaryError){toast(e.message,true);return;}console.error(e);const now=Date.now();if(now-lastCrash<1500)return;lastCrash=now;
 toast('Что-то пошло не так. Сохранение можно скачать.',true,{action:'export',label:'Скачать'});
 const panel=$('#panel');if(panel&&(!panel.children.length||panel.querySelector('.splash')))panel.innerHTML=`<div class="card empty recovery">${icon('info','big-icon')}<h2>Раздел не открылся</h2><p class="muted">Скачай сохранение, чтобы ничего не потерять, и перезагрузи страницу.</p>${btn('export',`${icon('download')}<span>Скачать сохранение</span>`,'primary big')}${btn('reload-app','Перезагрузить','big')}</div>`;}
// Every change of the game goes through one wrapper P.*: a refusal changes nothing and says why in a toast.
function act(fn,message,sound='good'){let r;try{r=fn();}catch(e){audio.play('error');crash(e);return null;}
 if(!r||r.ok===false){audio.play('error');toast(r?.why||'Не получилось.',true);return null;}
 withdrawToast('undo-swap');scheduleSave();render();audio.play(sound);if(message)toast(typeof message==='function'?message(r):message);queueMicrotask(checkRank);return r;}
// One dialog at a time. modal() shows at once, replacing what is open; queueModal() waits until the open one closes,
// and dialogs that wait together open in a fixed order. close() is immediate.
const modals=new ModalQueue();let modalClosable=true,ignorePop=false;
let stopReveal=null;
function modal(title,body,closable=true,cls=''){stopReveal?.();stopReveal=null;delete dialog.dataset.report;$('#dialog-body').innerHTML=`<div class="modal-title"><h2 id="dialog-title">${title}</h2>${closable?btn('close',icon('close'),'icon-button ghost','aria-label="Закрыть"'):''}</div><div class="modal-body">${body}</div>`;dialog.className=cls;modalClosable=closable;
// The dialog itself takes the focus, so a long one opens at its title rather than scrolled to its first button.
 if(!dialog.open){holdHints();dialog.showModal();dialog.focus({preventScroll:true});if(!ignorePop&&!history.state?.modal)history.pushState({modal:1},'');}dialog.scrollTop=0;raiseToast();}
function queueModal(fn,kind){modals.add(fn,kind);if(!dialog.open&&!night)modals.next()();}
function close(){dialog.close();}
// Only a tap on the dimmed backdrop closes a dialog; its own padding belongs to the dialog.
dialog.addEventListener('click',e=>{if(e.target!==dialog||!modalClosable||conflict)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
// The close event comes after close() has returned. History follows the dialog: the entry added on open is taken back
// whatever closed it (a button, Escape, the system back gesture), unless another dialog has opened in the meantime.
// A welcome closed by the browser itself is a quiet start with the first look; a report closed so is read.
dialog.addEventListener('close',()=>{if(dialog.open)return;const was=dialog.className;if(conflict){lockTab();return;}if(history.state?.modal){ignorePop=true;history.back();}
 if(was.includes('welcome-dialog')&&!state.welcomed)startGame();if(was.includes('report-dialog')&&dialog.dataset.report){P.readReport(state,dialog.dataset.report);scheduleSave();render();}
 raiseToast();if(!night)modals.next()?.();if(!dialog.open)releaseHints();});
// «Назад» closes an open dialog, then leaves the sheet of advice, instead of leaving the game.
// After a dialog has taken back its entry, the sheet keeps exactly one of its own: one is added for a sheet opened from
// a dialog (the hunter for the sorcerer), and the entry of a sheet left from a dialog goes too.
addEventListener('popstate',()=>{if(ignorePop){ignorePop=false;if(dialog.open)history.pushState({modal:1},'');else if(sheet&&!history.state?.sheet)history.pushState({sheet:1},'');else if(!sheet&&history.state?.sheet){ignorePop=true;history.back();}return;}if(dialog.open){if(modalClosable&&!conflict)close();else history.pushState({modal:1},'');return;}if(sheet){sheet=null;render();}});
// ---- the shell
function applyPrefs(){const root=document.documentElement;root.classList.toggle('large-text',!!state.prefs?.large);root.classList.toggle('calm',!!state.prefs?.calm);}
const rankName=()=>L.RANKS[P.rankOf(state.rep)].name;
let candlesSeen=null,candlesDay=0,spendAt=0;
function render(){
 applyPrefs();audio.setOptions(state);const amb=A.ambience(state);audio.setScene(view==='lab'?'lab':'scriptorium');audio.setAmbience({rain:amb.weather==='rain',lab:view==='lab'});
 // A candle spent goes out with a puff on the HUD and in the scene (art.md 1.5, 4.4).
 const left=P.candlesLeft(state);if(candlesSeen!==null&&left<candlesSeen&&state.day===candlesDay){audio.play('snuff');spendAt=performance.now();}candlesSeen=left;candlesDay=state.day;
 if(draftDay!==state.day){drafts.clear();labPick.clear();draftDay=state.day;swap=null;}
 if(sheet&&!contractOf(sheet)){sheet=null;}
 seeTab();$('#brand-sub').innerHTML=`<span class="where">Велен · 1740 · </span>${esc(rankName())}`;$('#hud').innerHTML=hudHTML(amb);$('#navigation').innerHTML=navHTML();
 const panel=$('#panel'),keep=[...panel.querySelectorAll('[data-scroll]')].map(el=>[el.dataset.scroll,el.scrollTop]);
 panel.className='panel view-'+view+(view==='reception'&&sheet?' sheet-panel':'');document.body.classList.toggle('in-sheet',view==='reception'&&!!sheet);panel.innerHTML=({reception:receptionHTML,bestiary:bestiaryHTML,lab:labHTML,shop:shopHTML,chronicle:chronicleHTML}[view])();
 for(const [k,top] of keep){const el=panel.querySelector(`[data-scroll="${k}"]`);if(el)el.scrollTop=top;}
 if(view==='reception'&&sheet)fitSlots(panel);
 // A page looked at loses its fresh ink (the dot of «Бестиарий» goes out with the last one).
 if(view==='bestiary'&&page&&state.monsters[page]&&P.seePage(state,page)){scheduleSave();$('#navigation').innerHTML=navHTML();}
 for(const a of panel.querySelectorAll('.rail .active'))a.parentElement.scrollLeft=a.offsetLeft-a.parentElement.offsetLeft-8;
 if(view==='bestiary')mountPlates(panel);
 notice();paint(performance.now(),0,true);}
function hudHTML(amb){const r=P.rankOf(state.rep),now=L.RANKS[r],next=L.RANKS[r+1],p=next?Math.round((state.rep-now.rep)/(next.rep-now.rep)*100):100,left=P.candlesLeft(state),max=P.candleMax(state),sky=A.skyWords(amb);
 return `<span class="stat" title="Монеты" aria-label="Монеты: ${state.gold}">${icon('coin')}<b id="hud-gold">${state.gold}</b></span><span class="stat candles${left?'':' out'}${performance.now()-spendAt<400&&!still()?' spend':''}" title="Свечи дня" aria-label="Свечей осталось ${left} из ${max}">${icon('candle')}<b>${left}</b><small>/${max}</small></span>${btn('rank-path',`${icon(EMBLEM_ICON[now.emblem]||'crest')}<b>${r+1}</b><i class="xp" style="--p:${p}%"></i>`,'stat rank',`title="${now.name} · репутация ${state.rep}" aria-label="Звание «${now.name}», ступень ${r+1} из ${L.RANKS.length}${next?`, до следующего ещё ${next.rep-state.rep} репутации`:''}. Путь"`)}${btn('sky',`${icon(A.WEATHER_ICON[amb.weather])}<span><span class="long">День </span><b>${state.day}</b></span>`,'stat day',`title="${sky}" aria-label="День ${state.day}, ${sky}. Небо дня"`)}`;}
const TABS=[['reception','door','Приёмная'],['bestiary','book','Бестиарий'],['lab','flask','Опыты','Лаборатория'],['shop','scale','Лавка'],['chronicle','scroll','Летопись']];
// The dots of the tabs say why in their labels: guests wait, fresh ink, the Magister in town or new books, a new rank.
const UI_KEY='pix-bestiary-ui';let ui={};try{ui=JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{};}catch{ui={};}
const keepUI=()=>{try{localStorage.setItem(UI_KEY,JSON.stringify(ui));}catch{}};
const trophyCount=()=>Object.values(state.monsters).reduce((n,m)=>n+m.troph.length,0);
const chronMark=()=>{const e=state.chronicle.find(e=>['rank','arc','story'].includes(e.k));return e?`${e.d}|${e.t}`:'';};
// What a visit to a tab has seen: the recipes of «Опыты», the shelf of «Лавка», the ranks, arcs, story and trophies of «Летопись».
function seeTab(){let changed=false;const set=(k,v)=>{if(ui[k]!==v){ui[k]=v;changed=true;}};
 if(ui.recipes===undefined)set('recipes',state.recipes.length);if(ui.shelf===undefined)set('shelf',P.shelfTier(state));if(ui.troph===undefined)set('troph',trophyCount());if(ui.chron===undefined)set('chron',chronMark());
 if(view==='lab'&&labTab==='alchemy')set('recipes',state.recipes.length);if(view==='shop'&&shopTab==='trader')set('shelf',P.shelfTier(state));if(view==='chronicle'){set('troph',trophyCount());set('chron',chronMark());}
 if(changed)keepUI();}
function dots(){const d={},guests=G.queueOf(state).filter(v=>!v.heard).length;if(guests)d.reception=`ждут гости: ${guests}`;
 if(P.openList(state).some(m=>P.freshInk(state,m.id).length))d.bestiary='свежие чернила';
 if(state.recipes.length>(ui.recipes??state.recipes.length))d.lab='новый рецепт';
 const books=P.shelfTier(state)>(ui.shelf??P.shelfTier(state)),academy=P.academyOpen(state)&&P.openList(state).some(m=>P.academyOffer(state,m.id).n>=P.ACADEMY.need);
 if(academy||books)d.shop=[academy?'Магистр в городе':'',books?'новые книги на полке':''].filter(Boolean).join(', ');
 if(trophyCount()>(ui.troph??trophyCount())||chronMark()!==(ui.chron??chronMark()))d.chronicle='новое в летописи';
 return d;}
function navHTML(){const d=dots();return TABS.map(([id,ic,text,long])=>btn('navigate',`${icon(ic)}<span>${long?`<span class="short">${text}</span><span class="long">${long}</span>`:text}</span>${d[id]?'<i class="dot" aria-hidden="true"></i>':''}`,view===id?'active':'',`data-view="${id}" ${view===id?'aria-current="page"':''} aria-label="${long||text}${d[id]?', '+d[id]:''}"`)).join('');}
const segments=(action,list,current)=>`<div class="tabs${list.length===3?' three':''}" role="tablist">${list.map(([id,name,n,ic])=>btn(action,`${ic?icon(ic):''}<span>${name}</span>${n?`<small>${n}</small>`:''}`,current===id?'active':'',`data-tab="${id}" role="tab" aria-selected="${current===id}"`)).join('')}</div>`;
// ---- Приёмная (GDD 10.2)
// The live description of the scene (art.md 4.6): who is at the table and how they look, who waits, who else is in the
// room, the wall, the candles and the window.
const WOUND=[0,['потрёпанный','потрёпанная'],['с рукой на перевязи','с рукой на перевязи'],['на костыле, с повязкой на голове','на костыле, с повязкой на голове']];
const looks=v=>{if(v.kind!=='hunter')return G.guestName(v);const r=ragOf(v.who);return G.guestName(v)+(v.back?gendered(v.who,' вернулся',' вернулась'):'')+(r?', '+WOUND[r][female(v.who)?1:0]:'');};
// The words follow the same lineup as the picture (scriptorium-scene.js), so nobody is described who is not drawn.
function sceneLabel(amb){const u=lineup(state,G.queueOf(state),chosen),troph=L.MONSTERS.filter(m=>state.monsters[m.id]?.troph.length).length;
 const others=[u.daro?'Даро в кресле':'',u.otto?'Магистр у окна':'',u.fedya?'Федя у полок':''].filter(Boolean);
 return `Скрипторий: ${u.table?`у стола ${looks(u.table)}`:'у стола никого'}${u.line.length?`; у двери ${u.line.map(looks).join('; ')}`:''}${others.length?`; ${others.join(', ')}`:''}; на стене ${troph} ${plural(troph,'трофей','трофея','трофеев')}; ${plural(P.candlesLeft(state),'горит','горят','горят')} ${P.candlesLeft(state)} ${plural(P.candlesLeft(state),'свеча','свечи','свечей')} из ${P.candleMax(state)}; за окном ${A.WEATHER[amb.weather]}${state.story.hold?', Чёрная зима':state.story.thaw?', оттепель':''}`;}
function sceneHTML(){const amb=A.ambience(state);return `<div class="scene-wrap"><canvas id="scene" width="480" height="260" role="img" aria-label="${esc(sceneLabel(amb))}"></canvas><span class="scene-caption">Скрипторий · ${A.skyWords(amb)}</span></div>`;}
// The side (the scene, the segments, the line of guests) and the main card; a landscape phone sets them side by side.
function receptionHTML(){if(sheet)return sheetHTML();const n=G.queueOf(state).length+G.standing(state).length,q=receptionTab==='artel'?{rail:'',main:artelHTML()}:queueHTML();
 return `<div class="reception"><div class="reception-side">${sceneHTML()}${segments('reception-tab',[['queue','Очередь',n,'door'],['artel','Артель',0,'people']],receptionTab)}${q.rail}</div><div class="reception-main">${q.main}</div></div>`;}
function items(){return [...G.queueOf(state).map(v=>({id:v.id,v,c:v.contract?contractOf(v.contract):null})),...G.standing(state).map(c=>({id:c.id,c}))];}
function queueHTML(){const list=items(),today=state.reports.filter(r=>r.day===state.day);let back='';
 if(today.length)back=`<div class="returns"><span class="label">Вернулись</span>${today.map(r=>btn('open-report',`${r.win?icon('check'):icon('bandage')}<span>${esc(r.hunter?hunterOf(r.hunter).short:L.TOWN_TYPE.get(r.town).label)}</span>${r.offer&&!r.choice?'<i class="dot" aria-hidden="true"></i>':''}`,'chip'+(r.win?' won':' lost'),`data-id="${r.id}" aria-label="Отчёт: ${r.hunter?hunterOf(r.hunter).name:L.TOWN_TYPE.get(r.town).label}, ${r.win?'победа':'неудача'}${r.offer&&!r.choice?', награда не выбрана':''}"`)).join('')}</div>`;
 if(!list.length)return {rail:'',main:`<section class="card empty-day">${icon('candle','big-icon')}<h2>Сегодня никого не ждёт</h2><p class="muted">Свечей осталось: ${P.candlesLeft(state)}. Можно заняться бестиарием и опытами — или задуть свечу.</p><div class="row fill">${btn('go',`${icon('book')}<span>Бестиарий</span>`,'','data-view="bestiary"')}${btn('go',`${icon('flask')}<span>Опыты</span>`,'','data-view="lab"')}</div></section>`+back+todayHTML()};
 const pick=list.find(x=>x.id===chosen)||list[0];chosen=pick.id;
 return {rail:`<div class="rail guests" data-scroll="guests" aria-label="Гости и дела">${list.map(x=>guestChip(x,x===pick)).join('')}</div>`,main:(pick.c?caseCard(pick.c,pick.v):guestCard(pick.v))+back+todayHTML()};}
function guestChip(x,active){const {v,c}=x;let person,name,sub;
 if(c&&c.kind==='story'){person=c.hunter?hunterPerson(c.hunter):visitorPerson('zolde');name='Колдун';sub=c.hunter?hunterOf(c.hunter).short:'без охотника';}
 else if(c&&!v){person=hunterPerson(c.hunter);name=hunterOf(c.hunter).short;sub='личное дело';}
 else{person=guestPerson(v);name=G.guestName(v);sub=c?(c.deferred&&c.day<state.day?'со вчера':c.deferred?'до завтра':c.kind==='town'?'просьба':L.MON.get(c.monster).name):v.kind==='otto'?'Академия':v.rumour?'слух':gendered(v.kind==='town'?v.who:v.kind,'зашёл','зашла');}
 return btn('guest',`${face(person,c?.hunter?ragOf(c.hunter):0,'portrait small')}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span>`,'guest-chip'+(active?' active':''),`data-id="${x.id}" aria-pressed="${active}" aria-label="${esc(name)}: ${esc(sub)}"`);}
function requestLine(c){const m=mon(c.monster),w=L.words({monster:m,place:c.place,fee:c.fee});
 if(c.kind==='town')return L.say(L.line(state.worldSeed,c.id,'request',L.VISITOR.get('townsfolk').lines.contract),w,c.town);
 if(c.kind==='story')return L.STORY.get('S10').text[0];const h=hunterOf(c.hunter);return L.say(L.line(state.worldSeed,c.id,'request',h.lines.request),w,h.id);}
function caseCard(c,v){const m=mon(c.monster),cs=P.cases(state).find(x=>x.id===c.id),ctx=cs.ctx,h=c.hunter&&hunterOf(c.hunter),who=c.kind==='town'?L.TOWN_TYPE.get(c.town):null,reward=Math.round(c.bounty*(P.VMUL[c.variant]||1));
 const head=c.kind==='personal'?`Личное дело · ${h.short}`:c.kind==='story'?`Дело ратуши · ${L.PLACE.get(c.place).name}`:h?h.name:who.label;
 const arcs=h?state.daily.firsts.filter(x=>x.startsWith('arc:')).map(x=>L.ARC.get(x.slice(4))).filter(a=>a?.hunter===h.id&&!a.id.endsWith('.end')):[];
 const free=!h||P.free(state,h.id),terms=c.kind==='story'?'без платы · город заплатит после':c.kind==='town'?`плата ${c.fee} · при победе ${P.TOWN.pay*c.tier}`:`плата ${c.fee} · награда до ${reward}`;
 let actions;
 if(c.kind==='story')actions=c.hunter&&free?`${btn('open-sheet',`${icon('quill')}<span>Открыть лист</span>`,'primary big',`data-contract="${c.id}"`)}<div class="row fill">${btn('pick-hunter',`${icon('people')}<span>Сменить охотника</span>`,'',`data-contract="${c.id}"`)}</div>`:btn('pick-hunter',`${icon('people')}<span>Выбрать охотника</span>`,'primary big',`data-contract="${c.id}"`);
 else if(!free)actions=`<p class="fine-print">${esc(h.short)} сейчас не может пойти на дело — дело подождёт.</p>`;
 else actions=`${btn('open-sheet',`${icon('quill')}<span>Открыть лист</span>`,'primary big',`data-contract="${c.id}"`)}${c.kind==='hunter'||c.kind==='town'?`<div class="row fill">${btn('defer',`${icon('hourglass')}<span>${c.deferred?'Отложено':'Отложить'}</span>`,'',`data-contract="${c.id}" ${c.deferred?'disabled':''}`)}${btn('decline',`${icon('close')}<span>Отказать</span>`,'',`data-contract="${c.id}"`)}</div>`:'<p class="fine-print center">Это дело ждёт без срока.</p>'}`;
 return `<section class="card case"><div class="case-head"><span class="plate-thumb" aria-hidden="true"><b>${m.plate.table}</b><em class="tier ${c.variant}">${VARIANT[c.variant]}</em></span><div><small>${esc(head)}</small><h2>${esc(L.variantName(c.monster,c.variant))}<span class="sr">, ${VARIANT[c.variant]} облик</span></h2></div>${claws(m.danger)}</div>
 <div class="chips">${chip('pin',L.PLACE.get(c.place).name)}${chip(A.WEATHER_ICON[ctx.weather],A.WEATHER[ctx.weather])}${chip('leaf',A.SEASONS[ctx.season])}</div>
 <p class="quote">«${esc(requestLine(c))}»</p>${cs.sign?`<p class="sign">${icon('eye')}<span>${esc(cs.sign)}</span></p>`:''}
 <p class="terms"><span>${terms}</span>${h&&state.hunters[h.id]?trust(state.hunters[h.id].trust):''}</p>
 ${actions}${arcs.map(a=>`<p class="arc-line">${icon('quill')}<span>${esc(h.short)} хочет сказать: «${esc(a.text)}»</span></p>`).join('')}</section>`;}
const RUMOUR_LINE={vedana:'rumour',nikodim:'rumour'};
function guestCard(v){const p=guestPerson(v),name=G.guestName(v),x=v.kind==='town'?L.VISITOR.get('townsfolk'):L.VISITOR.get(v.kind),who=v.kind==='town'?v.who:v.kind;
 const greet=x.lines.greet?L.say(L.line(state.worldSeed,v.id,'greet',x.lines.greet),{},who):v.kind==='daro'?L.line(state.worldSeed,v.id,'evening',x.lines.evening):'Есть что рассказать, летописец.';
 const told=v.heard&&v.rumour&&state.know[v.rumour]?L.say(v.kind==='town'?L.line(state.worldSeed,v.id,'rumour',x.lines.rumour):x.lines[RUMOUR_LINE[v.kind]]||'',L.words({monster:L.monsterOf(v.rumour),fact:v.rumour,place:L.monsterOf(v.rumour).places[0]}),who):'';
 const role={vedana:'травница',nikodim:'священник посада',yanek:'коробейник из Вильны',otto:'Академия',daro:'прежний хранитель бестиария'}[v.kind]||gendered(who,'горожанин','горожанка');
 let actions=v.heard?'':btn('listen',`${icon('door')}<span>Выслушать</span>`,'primary big',`data-id="${v.id}"`);
 if(v.kind==='otto')actions=`${v.heard?'':btn('listen',`${icon('door')}<span>Выслушать</span>`,'big',`data-id="${v.id}"`)}${btn('go',`${icon('scale')}<span>К Академии</span>`,'primary big','data-view="shop" data-tab="academy"')}`;
 if(v.kind==='yanek'&&v.heard)actions=btn('go',`${icon('book')}<span>К книжной полке</span>`,'primary big','data-view="shop" data-tab="trader"');
 return `<section class="card guest"><div class="case-head">${face(p,0,'portrait')}<div><small>${esc(role)}</small><h2>${esc(name)}</h2></div></div><p class="quote">«${esc(greet)}»</p>${told?`<p class="quote told">«${esc(told)}»</p>`:''}${v.rumour&&!v.heard?`<p class="fine-print">${esc(name)} ${gendered(who,'принёс','принесла')} слух — выслушай, и он ляжет в бестиарий.</p>`:''}${actions}</section>`;}
function todayHTML(){const steps=G.nextSteps(state);return steps.length?`<section class="card today"><h3 class="label">Сегодня</h3>${steps.map(stepButton).join('')}</section>`:'';}
const stepButton=x=>btn('go',`${icon(x.icon)}<span>${esc(x.text)}</span>${icon('right','go-chev')}`,'today-step',['view','tab','monster','report'].filter(k=>x[k]).map(k=>`data-${k}="${esc(x[k])}"`).join(' ')+(x.end?' data-end="1"':''));
function hunterState(id){const x=state.hunters[id],hunt=state.hunts.find(h=>h.contract.hunter===id);
 if(x.out>0)return {cls:'hurt',icon:'bandage',text:`лечится · ещё ${L.days(x.out)}`};if(x.sulk>0)return {cls:'sulk',icon:'info',text:`${gendered(id,'обиделся','обиделась')} · вернётся через ${L.days(x.sulk)}`};
 if(hunt)return {cls:'away',icon:'pin',text:`на охоте · ${L.PLACE.get(hunt.contract.place).name}`};return {cls:'ready',icon:'check',text:'в строю'};}
function artelHTML(){const rows=L.HUNTERS.filter(h=>state.hunters[h.id]).map(h=>{const x=state.hunters[h.id],st=hunterState(h.id),gear=x.gear.map(g=>L.GEAR_OF.get(g).name).join(', ');
  return `<div class="artel-row">${btn('hunter',`${face(hunterPerson(h.id),x.rag,'portrait')}<span class="who"><b>${esc(h.name)}</b><small>ур. ${ROMAN[P.level(x.xp)]} · мастерство&nbsp;+${P.skillBonus(h.id,x)}</small><span class="marks">${eyes(P.perception(h.id,x))}${trust(x.trust)}</span></span><span class="state ${st.cls}">${icon(st.icon)}<span>${esc(st.text)}</span></span>`,'artel-main',`data-id="${h.id}" aria-label="${esc(h.name)}: ${esc(st.text)}${gear?', снаряжение: '+gear:''}"`)}${x.out>0?btn('heal',`${icon('bandage')}<span>Лекарь · ${P.PRICE.doctor} мон.</span>`,'chip',`data-id="${h.id}" ${state.gold<P.PRICE.doctor?'disabled':''}`):''}</div>`;}).join('');
 const soon=L.HUNTERS.filter(h=>!state.hunters[h.id]).map(h=>h.joins.day?`${h.short} — с ${h.joins.day}-го дня`:`${h.short} — позже`);
 return `<div class="artel">${rows}</div>${soon.length?`<p class="fine-print">Ещё придут: ${esc(soon.join(', '))}.</p>`:''}`;}
// ---- the sheet of advice (GDD 3.2–3.4, 10.3): three slots, one card a category, up to two potions, the bar of the estimate
function draft(cid){if(!drafts.has(cid))drafts.set(cid,{facts:[],potions:[]});const d=drafts.get(cid);Object.assign(d,G.liveDraft(state,d));return d;}
const ORDER={confirmed:0,cond:1,rumour:2,refuted:3,dangerous:4};
const byState=k=>ORDER[k.rev?'cond':k.st];
function slipHTML(card,d,ctx){const f=fact(card.id),k=state.know[card.id],slot=d.facts.indexOf(card.id),other=d.facts.find(id=>id!==card.id&&fact(id).cat===f.cat);
 const now=k.rev?P.outcome(f,ctx):null,badge=now?`<em class="now ${now}">сейчас — ${now==='ok'?'верно':now==='none'?'пустое':'опасно'}</em>`:'';
 const line=!card.usable?'Опасно — так советовать нельзя':k.rev?`верно лишь: ${f.condTag}`:k.st==='confirmed'?`помогло ${k.ok} · без толку ${k.none}`:k.st==='rumour'?f.advice:k.st==='refuted'?'ничего не даст и не навредит':f.advice;
 const corner=slot>=0?`<em class="in">в листе · ${slot+1}</em>`:other?`<em class="swap">↔ заменит «${esc(fact(other).title)}»</em>`:'';
 return `<div class="slip-wrap">${btn('slip',`<span class="slip-icon">${icon(CAT.get(f.cat).icon)}</span><span class="slip-main"><b>${esc(f.title)}</b><small>${esc(line)}</small></span><span class="slip-side">${stamp(knowKey(k),k.st==='rumour'?source(k):k.rev?f.condTag:'')}${mini(knowKey(k))}${badge}${corner}</span>`,`slip on-dark ${k.rev?'cond':k.st}${slot>=0?' picked':''}`,`data-fact="${card.id}" data-cat="${f.cat}" aria-pressed="${slot>=0}" ${card.usable?'':'aria-disabled="true"'}`)}${btn('fact-info',icon('info'),'icon-button ghost small info',`data-fact="${card.id}" aria-label="${esc(f.title)}: подробнее"`)}</div>`;}
const SEG={ok:'ok',rumour:'rumour',none:'refuted',worse:'dangerous',empty:'empty'};
function potionChip(p,d,m,pv){const on=d.potions.includes(p.id),fits=P.potionFits(m,p.id),kinds=d.potions.map(id=>L.POT.get(id).kind);
 const block=on?'':d.potions.length>=2?'уже два снадобья':p.kind==='general'&&kinds.includes('general')?'уже есть общее снадобье':p.kind==='family'&&kinds.includes('family')?'уже есть снадобье против рода':'';
 const what=p.bonus?(fits?`+${p.bonus}`:`не против ${L.genOf(m)}`):{owl_drops:'видит всё',life_balm:'раны легче',ward_tincture:'прощает вред'}[p.id]||'эффект';
 return btn('potion',`${flaskImg(p.id,24)}<span><b>${esc(p.short)}</b><small>${esc(block||what)} · осталось ${state.potions[p.id]}</small></span>`,`potion-chip${on?' active':''}${p.bonus&&!fits?' unfit':''}`,`data-potion="${p.id}" aria-pressed="${on}" ${block?'disabled':''} aria-label="${esc(p.name)}: ${esc(block||p.effectText)}"`);}
function sheetHTML(){const c=contractOf(sheet),m=mon(c.monster),d=draft(c.id),cards=P.cards(state,c.id),pv=P.preview(state,c.id,d.facts,d.potions),ctx=pv.ctx,h=c.hunter?hunterOf(c.hunter):null;
 const cats=new Set(cards.filter(x=>x.usable).map(x=>x.cat)),missing=Math.max(0,3-cats.size),unknown=m.facts.filter(f=>!state.know[f.id]).length;
 const slots=[0,1,2].map(i=>{const id=d.facts[i];if(id){const f=fact(id),seg=pv.segments[i];return `<li>${btn('slot',`<em>${esc(CAT.get(f.cat).slot)}</em><span class="entry${Math.max(...f.title.split(/[\s-]/).map(w=>w.length))>=9?' longword':''}">${esc(G.hyphenate(f.title))}${mini(seg.kind==='rumour'?'rumour':seg.kind==='ok'?'confirmed':seg.kind==='worse'?'dangerous':'refuted')}</span>`,'slot filled',`data-fact="${id}" aria-label="Указание ${i+1} из 3: ${esc(f.title)}, ${STATE_WORD[state.know[id].st]}, ${esc(CAT.get(f.cat).slot.toLowerCase())}. Убрать"`)}</li>`;}
  return `<li><span class="slot empty${i>=cats.size?' none':''}"><em>Указание ${i+1}</em><span>${i>=cats.size?'Нет сведений ещё одного рода':'＋'}</span></span></li>`;}).join('');
 const full=pv.k===3,need=3-d.facts.length,low=pv.low<pv.mid;
 // Three right pieces of advice need no potion: the column says so, though a potion of effect still does its work.
 const potCol=`<span class="pot-col" aria-label="Снадобья: ${d.potions.length} из 2${full?', не нужны':''}"><em>Снад.</em>${d.potions.map(id=>`<i title="${esc(L.POT.get(id).name)}">${icon('flask')}</i>`).join('')||(full?'<i class="none small">не нужно</i>':'<i class="none">—</i>')}</span>`;
 const meter=`<div class="meter${full?' full':''}" data-action="how-counted" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pv.mid}" aria-valuetext="Надёжно ${pv.mid} процентов, от ${pv.low} до ${pv.high}. Верных по листу ${pv.k} из 3${pv.potion?', снадобья плюс '+pv.potion:''}">${pv.segments.map(s=>`<i class="seg ${SEG[s.kind]}"></i>`).join('')}<i class="seg plus"><i style="width:${Math.min(100,pv.plus/P.BONUS_CAP*100)}%"></i>${pv.minus?'<em class="vmod">−10</em>':''}<small>+${pv.plus}</small></i></div>`;
 const caption=`<div class="estimate">${full?stamp('ok','','Верное дело'):''}<b>Надёжно ${pv.mid}%</b><span>${low?`<em class="low" title="Слух может оказаться вредным">${icon('warn')}от ${pv.low}</em>`:`от ${pv.low}`} · до ${pv.high}</span>${btn('how-counted',icon('help'),'icon-button ghost small','aria-label="Как считается"')}</div>`;
 const groups=L.CATEGORIES.map(cat=>{const list=cards.filter(x=>x.cat===cat.id).sort((a,b)=>byState(state.know[a.id])-byState(state.know[b.id]));if(!list.length)return '';
  return `<h3 class="cat-head">${icon(cat.icon)}<span>${cat.name} · ${cat.slot.toLowerCase()}</span><small>${list.length}</small></h3>${list.map(x=>slipHTML(x,d,ctx)).join('')}`;}).join('');
 const pots=L.POTIONS.filter(p=>(state.potions[p.id]||0)>0);
 const label=c.kind==='town'?'Отдать лист просителю':h?`Отправить ${h.acc}`:'Выбрать охотника',err=pv.errors.find(e=>!/^Нужно ещё/.test(e));
 const send=c.kind==='story'&&!c.hunter?btn('pick-hunter',`<span>Выбрать охотника</span><small>колдун ждёт без срока</small>`,'primary send',`data-contract="${c.id}"`):btn('send',`<span>${need>0?`Нужно ещё ${need} ${plural(need,'указание','указания','указаний')}`:esc(err||label)}</span><small>${need>0?'по одному на род: чем, когда, где, как':`«${esc(L.LINES.estimate[pv.line])}» · ${c.fee?'плата '+L.coins(c.fee):'без платы'}`}</small>`,'primary send',`data-contract="${c.id}" ${pv.errors.length?'disabled':''}`);
 const notes=missing?`<div class="missing">${icon('info')}<span>Нет сведений ещё одного рода — ищи в книгах и в архиве.</span><div class="row">${btn('go','Книги в лавке','chip','data-view="shop" data-tab="trader"')}${btn('go','Порыться в архиве','chip',`data-view="lab" data-tab="archive" data-monster="${m.id}"`)}${c.kind==='hunter'||c.kind==='town'?btn('defer','Отложить','chip',`data-contract="${c.id}" ${c.deferred?'disabled':''}`)+btn('decline','Отказать','chip',`data-contract="${c.id}"`):''}</div></div>`:'';
 return `<div class="sheet-head">${btn('sheet-back',icon('left'),'icon-button ghost','aria-label="Назад в приёмную"')}<h1><small>Лист совета</small><span>${esc(L.variantName(c.monster,c.variant))}</span></h1>${h?btn('hunter',face(hunterPerson(h.id),ragOf(h.id),'portrait small'),'icon-button portrait-button',`data-id="${h.id}" aria-label="${esc(h.name)}: об охотнике"`):''}</div>
 <section class="sheet"><p class="circ">${VARIANT[c.variant]} облик · ${esc(L.PLACE.get(c.place).name)} · ${A.WEATHER[ctx.weather]} · ${A.SEASONS[ctx.season]}${h?' · '+esc(h.short)+(P.skillBonus(h.id,state.hunters[h.id])?` +${P.skillBonus(h.id,state.hunters[h.id])}`:''):''}</p><div class="slots-row"><ol class="slots" aria-label="Лист совета">${slots}</ol>${potCol}</div>${meter}${caption}</section>
 <div class="slips" data-scroll="slips">${notes}${groups}${unknown?btn('how-learn',`<span class="unknown-bar" aria-hidden="true">▒▒▒</span><span>ещё ${unknown} ${plural(unknown,'неизвестное','неизвестных','неизвестных')} · Как узнать?</span>`,'unknown',`data-monster="${m.id}"`):''}</div>
 <div class="sheet-foot"><div class="potion-row"><span class="label">Снадобья ${d.potions.length}/2${full?' · верное дело, можно без них':''}</span><div class="rail chips" data-scroll="pots">${pots.map(p=>potionChip(p,d,m,pv)).join('')||btn('go',`${icon('cauldron')}<span>Снадобий нет · Сварить</span>`,'chip','data-view="lab" data-tab="alchemy"')}</div></div>${send}</div>`;}
// A word of a title never breaks between its letters in a slot of the sheet («Скважин|ы»): the hand is written smaller,
// half a pixel at a time down to 11 px, until its longest word fits whole (soft hyphens may still part a long one);
// only a word that does not fit even then may break. Fonts that arrive late and a turned phone fit the slots again.
function fitSlots(root){for(const el of root.querySelectorAll('.slot .entry')){el.style.fontSize='';el.style.overflowWrap='normal';let size=parseFloat(getComputedStyle(el).fontSize);
 while(el.scrollWidth>el.clientWidth+.5&&size>11){size=Math.max(11,size-.5);el.style.fontSize=size+'px';}el.style.overflowWrap='';}}
const refit=()=>{if(view==='reception'&&sheet)fitSlots($('#panel'));};document.fonts?.addEventListener?.('loadingdone',refit);addEventListener('resize',refit);
// The sheet is a mode of the reception with its own entry in the history, so «Назад» leaves it before the game.
function openSheet(cid){sheet=cid;chosen=cid;if(!history.state?.sheet&&!history.state?.modal)history.pushState({sheet:1},'');render();$('#panel').scrollTop=0;}
// A sheet already gone (its case was sent, so render() let it go) still takes back its entry in the history.
function leaveSheet(){sheet=null;if(history.state?.sheet&&!dialog.open){ignorePop=true;history.back();}}
// A slip already in the sheet always comes out at a tap, even one that a book or an experiment has since found dangerous.
function tapSlip(id){const c=contractOf(sheet);if(!c)return;const d=draft(c.id),card=P.cards(state,c.id).find(x=>x.id===id);if(!card)return;const r=G.draftTap(d,card);
 if(r.refused==='dangerous'){const el=document.querySelector(`[data-action="slip"][data-fact="${id}"]`);if(el&&!still()){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}toast(state.know[id]?.rev?'Сейчас опасно — так советовать нельзя.':'Опасно — так советовать нельзя.',{kind:'hint'});return;}
 if(r.refused){toast('В листе уже три указания: убери одно касанием.',{kind:'hint'});return;}
 // An offer to bring back a replaced slip is stale once the sheet changes again.
 const before=[...d.facts];if(swap){swap=null;withdrawToast('undo-swap');}d.facts=r.facts;
 if(r.replaced){swap={cid:c.id,facts:before};toast(`${fact(r.replaced).title} → ${fact(id).title}`,{action:{action:'undo-swap',label:'Вернуть',icon:'undo'}});}
 audio.play(r.removed?'step':'quill');render();}
function tapPotion(id){const c=contractOf(sheet);if(!c)return;const d=draft(c.id),i=d.potions.indexOf(id);if(i>=0)d.potions.splice(i,1);else if(d.potions.length<2)d.potions.push(id);render();}
function send(cid){const c=contractOf(cid),d=draft(cid),m=mon(c.monster),h=c.hunter&&hunterOf(c.hunter);
 if(act(()=>P.advise(state,cid,d.facts,d.potions),()=>h?`${h.short} ${gendered(h.id,'ушёл','ушла')} на дело: ${L.lowerFirst(m.name)} ${L.PLACE.get(c.place).where}. Ответ — утром`:`${townName(c.town)} ${gendered(c.town,'ушёл','ушла')} с листом: ${L.lowerFirst(m.name)} ${L.PLACE.get(c.place).where}. Ответ — утром`,'seal')){buzz('seal');drafts.delete(cid);leaveSheet();chosen=null;render();if(!persistAsked){persistAsked=true;navigator.storage?.persist?.().catch(()=>{});}}}
function howCounted(){const c=contractOf(sheet);if(!c)return;const d=draft(c.id),pv=P.preview(state,c.id,d.facts,d.potions),rumours=d.facts.filter(id=>state.know[id]?.st==='rumour'&&!state.know[id].rev);
 const rows=[`Верных по листу: ${pv.k} из 3 (${L.pct(pv.k*100/3)}%)`,...d.potions.map(id=>{const p=L.POT.get(id);return `${p.name} ${p.bonus?(P.potionFits(mon(c.monster),id)?'+'+p.bonus:'+0, не против '+L.genOf(c.monster)):'— '+p.effectText.toLowerCase()}`;}),...pv.skill?[`мастерство охотника +${pv.skill}`]:[],...pv.vmod>0?[`молодой облик +${pv.vmod}`]:[],...pv.minus?[`древний облик ${pv.minus}`]:[],...(pv.skill||pv.potion||pv.vmod>0?[`всё сверху знания — до предела +${P.BONUS_CAP}`]:[]),...rumours.map(id=>`слух «${fact(id).title}»: может добавить 33 или отнять 25`)];
 modal('Как считается',`<ul class="reasons">${rows.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><div class="score-row"><span>Итого по твоим записям</span><b>≈ ${pv.mid}%</b></div><p class="fine-print">Каждое верное указание — треть успеха, три верных — победа наверняка. Вредное отнимает 25. Снадобья и мастерство прибавляют сверху, но не больше 25, и без третьего верного шанс не выше 91%. Слухи считаются пустыми, пока их не проверят: «от» и «до» — что будет, если слух окажется вредным или верным.</p>`);}
// ---- the morning report (GDD 4, 10.4)
// The first time a report of the morning opens in a session it is heard (audio.reportSounds): the door, the medal, a
// stamp for every piece of advice the hunter saw, with its vibration; short from the tenth hunt, one sound with less
// motion. A report already written into the bestiary (read) opens quietly, from the chronicle too. A sound still to
// come is dropped once its window is closed or shows something else.
const heardReports=new Set();
const skippedReports=new Set();
function hearReport(r){if(r.read||heardReports.has(r.id))return;heardReports.add(r.id);
 for(const x of reportSounds(r,{short:state.stats.hunts>=10,reduced:still()}))setTimeout(()=>{if(!dialog.open||dialog.dataset.report!==r.id||skippedReports.has(r.id)&&x.t>0)return;if(x.kind)audio.play(x.kind,{step:x.step||0});if(x.buzz)buzz(x.buzz);},x.t);}
function showReport(rid){const r=state.reports.find(r=>r.id===rid);if(!r)return modals.next()?.();const t=P.reportText(state,rid),m=mon(r.contract.monster),h=r.hunter&&hunterOf(r.hunter),x=h&&state.hunters[h.id];
 // The hunter stands in the doorway as he came back: in the rag of this report, with the bag and the trophy of a win.
 const person={...(h?hunterPerson(h.id):guestPerson({kind:'town',who:r.town})),rag:r.rag||0,...(r.win?{carry:true,trophy:r.trophy?m.trophy.look?.c:null}:{})};
 const items=t.items.map((it,i)=>{const change=it.from!==it.to?`<em class="change">${it.from?STATE_WORD[it.from]:'новое'} → ${STATE_WORD[it.to]}</em>`:'';
  return `<li class="${it.seen?it.o:'unseen'}" data-rv="stamp-${i}"><div class="item-head"><b>${'①②③'[i]} ${esc(it.title)}</b>${stamp(it.seen?it.o:'unseen')}</div><p class="quote">«${esc(it.text)}»</p>${change}${it.contradiction?`<p class="contradiction">${icon('approx')}<span>${esc(it.contradiction)}</span></p>`:''}</li>`;}).join('');
 let end='';
 if(!r.win&&h){const wound=r.injury?`${icon('bandage')}<span>${G.woundLine(r.injury,x.out)}</span>`:'',tr=`<span class="trust-change">${trust(x.trust)}${r.trust?`<small>(${r.trust>0?'+':'−'}${Math.abs(r.trust)})</small>`:''}</span>`;
  end=`<p class="wound">${wound}${tr}</p>${r.sulk?`<p class="fine-print">${esc(h.short)} ${gendered(h.id,'обиделся','обиделась')} и не придёт ${L.days(x.sulk)}.</p>`:''}<div class="row fill">${x.out>0?btn('heal',`${icon('bandage')}<span>Лекарь · ${P.PRICE.doctor} мон.</span>`,'',`data-id="${h.id}" ${state.gold<P.PRICE.doctor?'disabled':''}`):''}${r.items.some(i=>!i.seen)&&!r.asked?btn('ask-again',`${icon('candle')}<span>Расспросить · 1</span>`,'',`data-id="${r.id}" ${P.candlesLeft(state)<1?'disabled':''}`):''}</div>`;}
 else{if(r.offer&&!r.choice)end+=`<div class="tokens" role="group" aria-label="Награда: выбери одно">${btn('claim',`${icon('coin')}<b>Монеты</b><small>${r.offer.coins} мон.</small>`,'token',`data-id="${r.id}" data-choice="coins"`)}${btn('claim',`${r.offer.loot[0]?thing(r.offer.loot[0].id,24):icon('fang')}<b>Добыча</b><small>${esc(r.offer.loot.map(l=>L.partName(l.id).toLowerCase()+(l.n>1?' ×'+l.n:'')).join(', '))}</small>`,'token',`data-id="${r.id}" data-choice="loot"`)}${btn('claim',`${icon('quill')}<b>Знание</b><small>${r.offer.tale?'новое сведение и записи':'полевые записи'}</small>`,'token',`data-id="${r.id}" data-choice="know"`)}</div><p class="fine-print center">Возьми одно — не выбранное до ночи станет монетами.</p>`;
  if(r.gift)end+=`<p class="gift">${icon('heart')}<span>Подарок за доверие: ${r.gift.id==='notes'?`полевые записи ${L.genOf(m)}`:esc(L.partName(r.gift.id).toLowerCase())}</span></p>`;
  if(r.trophy){const mx=state.monsters[m.id],rep=2+(state.upgrades.includes('hall')?1:0)+(mx?.troph[0]===r.trophy?5:0);end+=`<p class="gift">${pixelImg(trophyURL(m.id,m.trophy.look),24)}<span>На стену: ${esc(m.trophy.name)} (${VARIANT[r.trophy]}) · +${rep} репутации</span></p>`;}
  if(h&&r.items.some(i=>!i.seen)&&!r.asked)end+=`<div class="row fill">${btn('ask-again',`${icon('candle')}<span>Расспросить · 1</span>`,'',`data-id="${r.id}" ${P.candlesLeft(state)<1?'disabled':''}`)}</div>`;}
 modal(esc(t.title),`<div class="threshold ${r.win?'won':'lost'}"><canvas class="doorway" data-rv="door" width="${THRESHOLD.w}" height="${THRESHOLD.h}" aria-hidden="true"></canvas><div class="verdict"><span class="medal ${r.win?'won':'lost'}" data-rv="roll" aria-hidden="true"><b>Жребий</b><i>${r.win?'✓':'✕'}</i></span><span class="verdict-stamp" data-rv="reveal">${stamp(r.win?'ok':'worse','',r.win?'Добыто':'Ушёл')}</span><small data-rv="reveal">по листу: надёжно ${r.shown.mid}%</small></div></div>
  <p class="quote greet" data-rv="line">«${esc(t.greet)}»${t.first?` «${esc(t.first)}»`:''}</p><ol class="report-items">${items}</ol><div data-rv="end">${t.after.map(a=>`<p class="quote after">«${esc(a)}»</p>`).join('')}${end}</div>
  <div class="sticky-actions" data-rv="final">${btn('report-done',`${icon('quill')}<span>Вписать в бестиарий</span>`,'primary',`data-id="${r.id}"`)}</div>`,true,'report-dialog sheet-dialog');
 dialog.dataset.report=r.id;const door=dialog.querySelector('canvas.doorway'),amb=A.ambience(state);if(door)scene.paintThreshold(door.getContext('2d'),person,{weather:amb.weather,season:amb.season,hold:!!state.story.hold});
 // The first showing of a report plays its beats (GDD 11.6); a tap skips them, and the sounds still to come with them.
 const first=!r.read&&!heardReports.has(r.id);hearReport(r);if(first){const plan=reportPlan(r,{short:state.stats.hunts>=10,reduced:still()});if(plan.length>1)stopReveal=playReport($('#dialog-body'),plan,{onDone:skipped=>{if(skipped)skippedReports.add(r.id);}});}}
function claim(b){const r=state.reports.find(r=>r.id===b.dataset.id),choice=b.dataset.choice,from=b.getBoundingClientRect();
 const res=act(()=>P.claim(state,b.dataset.id,choice),x=>choice==='coins'?`Монеты: +${r.offer.coins}`:choice==='loot'?`Добыча в запасе: ${r.offer.loot.map(l=>L.partName(l.id).toLowerCase()).join(', ')}`:x.fact?`В бестиарий: «${fact(x.fact.f).title}» — ${STATE_WORD[x.fact.to]} · полевые записи +1`:'Полевые записи +1',choice==='coins'?'coin':choice==='know'?'learn':'good');
 if(res){if(choice==='coins')coinBurst(from);showReport(r.id);}}
// ---- Бестиарий (GDD 10.5): contents and pages of text; the engravings come with Г4, a frame stands in their place.
function bestiaryHTML(){if(page&&!mon(page))page=null;return page?pageHTML(page):tocHTML();}
function tocHTML(){const n=P.treatises(state),open=P.openList(state).length;
 return `<div class="section-line"><h1>Бестиарий</h1><small>${open} из ${L.MONSTERS.length} страниц</small></div><div class="toc">${L.MONSTERS.map(m=>{const x=state.monsters[m.id];if(!x)return btn('page',`<span class="plate-thumb silhouette" aria-hidden="true"><img src="${thumbURL(m.id,null)}" alt=""><b>?</b></span><b>Не заведено</b><small>табл. ${m.plate.table}</small>`,'toc-tile locked',`data-monster="${m.id}" aria-label="Таблица ${m.plate.table}: не заведено"`);
  const st=P.pageStats(state,m.id),p=Math.round(st.resolved/st.total*100),fresh=P.freshInk(state,m.id).length;
  return btn('page',`<span class="plate-thumb engraved" aria-hidden="true"><img src="${thumbURL(m.id,plateStage(m.id))}" alt="">${fresh?'<i class="dot"></i>':''}${x.treatise?icon('book','treatise'):''}</span><b>${esc(m.name)}</b><i class="ring" style="--p:${p}%" aria-hidden="true"></i>`,'toc-tile'+(st.done?' done':''),`data-monster="${m.id}" aria-label="${esc(m.name)}: разрешено ${st.resolved} из ${st.total}${fresh?', свежие чернила':''}${x.treatise?', трактат написан':''}"`);}).join('')}
 <div class="toc-tile great">${icon('crown')}<b>Великий бестиарий</b><small>трактаты ${n}&nbsp;/&nbsp;${L.MONSTERS.length}</small></div></div>`;}
const margin=G.marginNote;
function factCard(f,fresh){const k=state.know[f.id],last=k.last?`последний раз: ${VARIANT[k.last.v]}, ${A.WEATHER[k.last.w]}, ${A.SEASONS[k.last.k]}`:'';
 return `<div class="fact ${k.rev?'cond':k.st}${fresh?' fresh':''}"><div class="fact-head">${icon(CAT.get(f.cat).icon)}<b>${esc(f.title)}</b>${stamp(knowKey(k),k.st==='rumour'?source(k):k.rev?f.condTag:'')}</div><p>${esc(f.advice)}</p><p class="hand">${esc(margin(k,f))}</p>${k.ok+k.none+k.worse||last?`<small class="counts">${icon('check')}${k.ok} ${icon('ring')}${k.none} ${icon('up')}${k.worse}${last?' · '+esc(last):''}</small>`:''}</div>`;}
// The plate of a page and its markers (art.md 5.4): a category with no records has none, rumours only a pencil «?», a
// settled record an ink ring, a dangerous one a cinnabar rim; the first settled record of it writes a note in the margin.
const plateStage=id=>{const x=state.monsters[id];return x?stageOf(P.pageStats(state,id),x.treatise):null;};
function plateMark(m,c){const list=m.facts.filter(f=>f.cat===c.id&&state.know[f.id]);if(!list.length)return null;const ks=list.map(f=>state.know[f.id]),rum=ks.filter(k=>k.st==='rumour').length,done=ks.length-rum,kind=ks.some(k=>k.st==='dangerous')?'danger':done?'ink':'rumour';
 const first=list.find(f=>state.know[f.id].st!=='rumour'),parts=[done&&`разрешено ${done}`,rum&&`${rum} ${plural(rum,'слух','слуха','слухов')}`].filter(Boolean).join(', ');
 return [c,kind,`${c.name}: ${parts}`,first?`${c.name} — ${margin(state.know[first.id],first)}`:''];}
// The page turns round its spine (art.md 6.1): the new leaf comes in from 25°, the plate is already drawn.
let turning=0;
function turnPage(dir){const i=L.MONSTERS.findIndex(m=>m.id===page);if(i<0)return;page=L.MONSTERS[(i+(dir>0?1:13))%14].id;turning=dir>0?1:-1;audio.play('page');render();$('#panel').scrollTop=0;}
// Puts the engravings into a page just rendered: from the cache, the neighbours drawn ahead in idle time. A plate that
// has risen a stage since it was last seen draws its new strokes over the old one, 1/12 a frame (0.6 s).
function mountPlates(root){const dpr=Math.min(2,devicePixelRatio||1);
 for(const el of root.querySelectorAll('canvas.plate')){const id=el.dataset.plate,stage=el.dataset.stage==='-'?null:+el.dataset.stage,w=Math.round(el.parentElement.clientWidth)||300,seen=ui.plates?.[id];
  let cv;if(stage!=null&&seen!=null&&seen<stage&&!still()){cv=renderPlate(id,seen,w,dpr);let i=0;const step=()=>{if(!cv.isConnected)return;if(revealStep(cv,id,seen,stage,i++))setTimeout(()=>requestAnimationFrame(step),50);};requestAnimationFrame(step);}
  else cv=plateCanvas(id,stage,w,dpr);
  cv.className='plate';el.replaceWith(cv);if(stage!=null&&seen!==stage){(ui.plates||={})[id]=stage;keepUI();}
  if(page===id){const i=L.MONSTERS.findIndex(m=>m.id===id),idle=window.requestIdleCallback||(f=>setTimeout(f,120));for(const j of[i+1,i+13]){const n=L.MONSTERS[j%14].id;idle(()=>plateCanvas(n,plateStage(n),w,dpr));}}}
 const folio=root.querySelector('article.folio');if(folio&&turning&&!still())folio.classList.add(turning>0?'turn-next':'turn-prev');turning=0;}
function pageHTML(id){const m=mon(id),x=state.monsters[id],i=L.MONSTERS.indexOf(m),nav=`<div class="page-nav">${btn('toc',`${icon('grid')}<span>Оглавление</span>`,'chip')}<span class="page-turn">${btn('page-turn',icon('left'),'icon-button ghost',`data-dir="-1" data-monster="${L.MONSTERS[(i+13)%14].id}" aria-label="Предыдущая страница"`)}<b>${m.plate.table} / XIV</b>${btn('page-turn',icon('right'),'icon-button ghost',`data-dir="1" data-monster="${L.MONSTERS[(i+1)%14].id}" aria-label="Следующая страница"`)}</span></div>`;
 if(!x)return nav+`<article class="folio sheet locked"><div class="plate-frame silhouette" role="img" aria-label="Силуэт неизвестного чудовища"><canvas class="plate" data-plate="${m.id}" data-stage="-"></canvas><b>?</b></div><h2>Не заведено</h2><p>Откроется по письму Академии.</p><p class="plate-title">ТАБЛ. ${m.plate.table}</p></article>`;
 const st=P.pageStats(state,id),fresh=new Set(P.freshInk(state,id)),unknown=m.facts.filter(f=>!state.know[f.id]).length,stage=stageOf(st,x.treatise),anchors=anchorsOf(id)||{},marks=L.CATEGORIES.map(c=>plateMark(m,c)).filter(Boolean);
 const sections=L.CATEGORIES.map(cat=>{const list=m.facts.filter(f=>f.cat===cat.id&&state.know[f.id]).sort((a,b)=>byState(state.know[a.id])-byState(state.know[b.id]));const n=m.facts.filter(f=>f.cat===cat.id&&!state.know[f.id]).length;if(!list.length&&!n)return '';
  return `<section class="cat-section" id="cat-${cat.id}"><h3 class="cat-head">${icon(cat.icon)}<span>${cat.name} · ${cat.slot.toLowerCase()}</span></h3>${list.map(f=>factCard(f,fresh.has(f.id))).join('')}${n?`<p class="unknown-line"><span aria-hidden="true">▒▒▒</span> ещё ${n} ${plural(n,'неизвестное','неизвестных','неизвестных')}</p>`:''}</section>`;}).join('');
 const troph=m.variants.map(v=>`<i class="${x.troph.includes(v.id)?'on':''}" title="${esc(v.name)}"></i>`).join('');
 // Two leaves: on a phone they follow each other, on a landscape phone they lie open as a spread (art.md 2.2).
 return nav+`<article class="folio sheet"><div class="leaf left"><header class="folio-head"><div><h2>${esc(m.name)}</h2><small>${esc(m.alt)} · ${m.tags.filter(t=>['beast','undead','spirit','serpent','water','cursed'].includes(t)).map(t=>L.TAGS[t]).join(' · ')}</small></div>${claws(m.danger)}</header>
 <div class="plate-frame engraved" role="img" aria-label="Гравюра: ${esc(m.name)}, ${STAGES[stage]}"><canvas class="plate" data-plate="${m.id}" data-stage="${stage}"></canvas><div class="markers">${marks.map(([c,k,label])=>btn('marker',k==='rumour'?'?':icon(c.icon),'marker '+k,`data-cat="${c.id}" style="left:${anchors[c.id][0]/2.4}%;top:${anchors[c.id][1]/1.6}%" aria-label="${label}"`)).join('')}</div></div>
 ${marks.some(x=>x[3])?`<ul class="plate-notes">${marks.filter(x=>x[3]).map(([c,k,,note])=>`<li class="${k}">${icon(c.icon)}<span class="hand">${esc(note)}</span></li>`).join('')}</ul>`:''}
 <p class="plate-title">ТАБЛ. ${m.plate.table} · ${esc(m.plate.title)}</p>
 <p class="fullness"><span>Разрешено ${st.resolved} из ${st.total}</span><i class="bar" style="--p:${Math.round(st.resolved/st.total*100)}%"></i><span class="troph" aria-label="Трофеи: ${st.troph} из ${m.variants.length}">трофеи ${troph}</span><span>${x.treatise?'трактат написан':'трактата нет'}</span></p></div>
 <div class="leaf right">${sections}${unknown?btn('how-learn',`${icon('help')}<span>Ещё ${unknown} ${plural(unknown,'неизвестное','неизвестных','неизвестных')} · Как узнать?</span>`,'unknown',`data-monster="${m.id}"`):''}
 <h3 class="label">О чудовище</h3><p class="lore">${esc(m.lore)}</p><p class="fine-print">${esc(m.habitat)}</p>
 <h3 class="label">Приметы обликов</h3><ul class="signs">${m.variants.map(v=>`<li><b>${esc(v.name)}${m.variants.length>1?` <small>· ${VARIANT[v.id]}</small>`:''}</b><span>${esc(v.signs[0])}</span></li>`).join('')}</ul>
 <h3 class="label">Добыча и трофей</h3><p class="fine-print">${esc(L.partName(m.loot.common))} · ${esc(L.partName(m.loot.rare))} (редкое). Трофей: ${esc(m.trophy.name)} — ${esc(m.trophy.text)}</p><p class="page-number">— ${m.plate.table} —</p></div></article>`;}
// ---- Опыты (GDD 5.4, 5.7, 10.6)
const LAB=P.LAB_CATS,ARCH=P.ARCHIVE_CATS;
function labRail(){const list=P.openList(state);if(!labMonster||!state.monsters[labMonster])labMonster=list[0]?.id;
 return `<div class="rail monsters" data-scroll="lab-mons" aria-label="Чудовища">${list.map(m=>{const n=(state.stock[m.loot.common]||0)+(state.stock[m.loot.rare]||0),notes=state.notes[m.id]||0;return btn('lab-monster',`<b>${esc(m.name)}</b><small>${labTab==='archive'?`записи ${notes}`:`образцы ${n}`}</small>`,'mon-chip'+(m.id===labMonster?' active':''),`data-monster="${m.id}" aria-pressed="${m.id===labMonster}"`);}).join('')}</div>`;}
// Why a button is off for want of candles (GDD 10.6): none left, or fewer than the work needs.
const noCandles=n=>{const left=P.candlesLeft(state);return left<n?`<p class="why">${icon('candle')}${left?`Нужно ${n} ${plural(n,'свеча','свечи','свечей')} — ${left===1?'осталась одна':`осталось ${left}`}`:'Свечи догорели — завтра'}</p>`:'';};
// The strip «Лаборатория» (art.md 4.7): the alchemy corner close up; the cauldron leads to «Алхимия», the jars to «Образцы».
function labStrip(){const herbs=L.MATERIALS.filter(m=>m.kind==='herb'&&(state.stock[m.id]||0)>0).length,parts=L.PARTS.filter(p=>(state.stock[p.id]||0)>0).length,pots=L.POTIONS.filter(p=>(state.potions[p.id]||0)>0).length;
 return `<div class="lab-strip"><canvas id="lab-scene" width="480" height="150" role="img" aria-label="${esc(`Лаборатория: котёл над огнём, летописец мешает варево; трав на балке: ${herbs}, банок с образцами: ${parts}, склянок со снадобьями: ${pots}`)}"></canvas></div>`;}
function labHTML(){return `<div class="lab-side">${labStrip()}<div class="section-line"><h1>Опыты</h1><small>свечей осталось: ${P.candlesLeft(state)}</small></div>${segments('lab-tab',[['samples','Образцы',0,'mortar'],['alchemy','Алхимия',0,'cauldron'],['archive','Архив',0,'scroll']],labTab)}</div><div class="lab-main">${labTab==='alchemy'?alchemyHTML():labTab==='archive'?labRail()+archiveHTML():labRail()+samplesHTML()}</div>`;}
function samplesHTML(){const m=mon(labMonster);if(!m)return '';const part=[m.loot.common,m.loot.rare].find(p=>(state.stock[p]||0)>0),lens=state.upgrades.includes('lens');
 const list=m.facts.filter(f=>LAB.includes(f.cat)&&state.know[f.id]&&!state.know[f.id].rev).sort((a,b)=>byState(state.know[a.id])-byState(state.know[b.id]));for(const id of[...labPick])if(!list.some(f=>f.id===id))labPick.delete(id);
 const need=`нужно: ${L.partName(m.loot.common).toLowerCase()} или ${L.partName(m.loot.rare).toLowerCase()} ×1 (есть ${(state.stock[m.loot.common]||0)+(state.stock[m.loot.rare]||0)})`;
 const cards=list.map(f=>{const k=state.know[f.id],again=k.st!=='rumour',on=labPick.has(f.id);
  return `<div class="lab-card ${k.st}">${icon(CAT.get(f.cat).icon)}<span class="lab-main"><b>${esc(f.title)}</b><small>${again?'уже записано — перепроверить на образце':'слух — проверить на образце'}</small></span>${stamp(knowKey(k),k.st==='rumour'?source(k):'')}${lens?btn('lab-pick',on?icon('check'):icon('plus'),'icon-button small'+(on?' active':''),`data-fact="${f.id}" aria-pressed="${on}" aria-label="${on?'Убрать из опыта':'Взять в опыт'}: ${esc(f.title)}" ${!on&&labPick.size>=2?'disabled':''}`):btn('lab-test',`<span>Испытать</span>${cost(1)}`,'chip',`data-fact="${f.id}" ${!part||P.candlesLeft(state)<1?'disabled':''}`)}</div>`;}).join('');
 const troph=state.monsters[m.id].troph.filter(v=>!state.monsters[m.id].studied.includes(v)),canStudy=m.facts.some(f=>LAB.includes(f.cat)&&(!state.know[f.id]||!state.know[f.id].rev));
 return `<section class="card lab"><h2>${esc(m.name)}: вещество и оберег</h2><p class="fine-print">${esc(need)}${lens?' · с лупой — до двух сведений за образец':''}</p>${cards||'<p class="muted">Проверять на образце нечего: записей средства и оберега нет или они проверены до конца.</p>'}
 ${lens&&list.length?btn('lab-test',`<span>Испытать выбранное (${labPick.size})</span>${cost(1)}`,'primary big','data-pick="1" '+(!labPick.size||!part||P.candlesLeft(state)<1?'disabled':'')):''}${!part&&list.length?`<p class="why">${icon('info')}Нет образца — его приносят охотники в «Добыче».</p>`:''}${noCandles(1)}</section>
 ${troph.length?`<section class="card lab"><h2>Трофеи</h2>${troph.map(v=>`<div class="lab-card">${icon('crest')}<span class="lab-main"><b>${esc(m.trophy.name)}</b><small>${VARIANT[v]} · изучить один раз</small></span>${btn('study',`<span>Изучить</span>${cost(1)}`,'chip',`data-monster="${m.id}" data-variant="${v}" ${!canStudy||P.candlesLeft(state)<1?'disabled':''}`)}</div>`).join('')}</section>`:''}`;}
function recipeSource(p){const books=p.recipe.filter(r=>L.BOOK.has(r)).map(r=>`по книге «${L.BOOK.get(r).title}»`);return books[0]||(p.recipe.some(r=>L.STORY.has(r))?'откроется по сюжету':'откроется в истории охотников');}
function alchemyHTML(){return `<div class="recipes">${L.POTIONS.map(p=>{const known=state.recipes.includes(p.id),c=P.brewCost(state,p.id),part=c.need.find(x=>!x.buy),doses=state.potions[p.id]||0,full=doses>=P.LIMITS.doses;
  const ing=Object.entries(p.ingredients).map(([id,n])=>{const have=state.stock[id]||0;return `<li class="${have<n?'short':''}">${thing(id,16)}<span>${esc(L.partName(id))}</span><b>${have}/${n}</b></li>`;}).join('');
  const button=!known?`<p class="why">${icon('lock')}${esc(recipeSource(p))}</p>`:full?`<p class="why">Полон запас: ${doses} из ${P.LIMITS.doses}</p>`:part?`<p class="why">Нужно: ${esc(L.partName(part.id).toLowerCase())} — это добывают охотники</p>`:btn('brew',c.coins?`<span>Докупить и сварить</span><small>${c.coins} мон. · ${cost(1)}</small>`:`<span>Сварить</span><small>${cost(1)}</small>`,'chip brew'+(c.coins?'':' ready'),`data-potion="${p.id}" data-buy="${c.coins?1:0}" ${P.candlesLeft(state)<1||state.gold<c.coins?'disabled':''}`);
  return `<article class="recipe${known?'':' locked'}"><div class="recipe-head">${flaskImg(p.id,32,doseLevel(doses)/4)}<b>${esc(p.name)}</b></div><small>${esc(p.effectText)}</small><ul class="ingredients">${ing}</ul><span class="doses" aria-label="Запас: ${doses} из ${P.LIMITS.doses}">${Array.from({length:P.LIMITS.doses},(_,i)=>`<i class="${i<doses?'on':''}"></i>`).join('')}</span>${button}</article>`;}).join('')}</div>${noCandles(1)}<p class="fine-print">Одна варка — одна свеча и две дозы${state.upgrades.includes('still')?' (с перегонным кубом — три)':''}; больше ${P.LIMITS.doses} доз не хранят. Недостающие травы докупаются у Веданы той же кнопкой.</p>`;}
function archiveHTML(){const m=mon(labMonster);if(!m)return '';const x=state.monsters[m.id],notes=state.notes[m.id]||0,unknown=P.hasUnknown(state,m);
 const list=m.facts.filter(f=>ARCH.includes(f.cat)&&state.know[f.id]&&!state.know[f.id].rev).sort((a,b)=>byState(state.know[a.id])-byState(state.know[b.id]));
 return `<section class="card lab"><h2>${esc(m.name)}: время, место, обряд</h2><p class="fine-print">Сверка берёт одну полевую запись и две свечи. Полевые записи ${L.genOf(m)}: ${notes}.</p>${list.map(f=>{const k=state.know[f.id];return `<div class="lab-card ${k.st}">${icon(CAT.get(f.cat).icon)}<span class="lab-main"><b>${esc(f.title)}</b><small>${k.st==='rumour'?'слух — сверить с летописями':'уже записано — сверить ещё раз'}</small></span>${stamp(knowKey(k),k.st==='rumour'?source(k):'')}${btn('cross-check',`<span>Сверить летописи</span>${cost(2)}`,'chip',`data-fact="${f.id}" ${!notes||P.candlesLeft(state)<2?'disabled':''}`)}</div>`;}).join('')||'<p class="muted">Сверять нечего: записей о времени, месте и обряде нет или они проверены до конца.</p>'}${!notes&&list.length?`<p class="why">${icon('info')}Полевые записи приносят охотники — награда «Знание».</p>`:notes&&list.length?noCandles(2):''}</section>
 <section class="card lab"><h2>Порыться в летописях</h2><p class="fine-print">${m.tier>=4?'О колдуне в летописях — только то, что принесёт сюжет.':unknown?`Одно неизвестное сведение ${L.genOf(m)} — слухом. Попытка ${x.rummage+1} из ${P.RUMMAGE.sure}${x.rummage+1>=P.RUMMAGE.sure?' — удастся наверняка':` — третья удастся`}.`:'Про это чудище нового не толкуют.'}</p>${btn('rummage',`<span>Порыться в летописях</span>${cost(1)}`,'big',`data-monster="${m.id}" ${m.tier>=4||!unknown||P.candlesLeft(state)<1?'disabled':''}`)}${noCandles(1)}</section>`;}
// ---- Лавка (GDD 5.5–5.8, 10.7)
function shopHTML(){return `<div class="section-line"><h1>Лавка</h1>${coins(state.gold)}</div>${segments('shop-tab',[['trader','Торговка',0,'coin'],['academy','Академия',0,'scale'],['upgrades','Обустройство',0,'home']],shopTab)}${shopTab==='academy'?academyHTML():shopTab==='upgrades'?upgradesHTML():traderHTML()}`;}
function bookRow(b){const own=state.books.includes(b.id),mark=b.reliable?stamp('confirmed','','Проверено учёными'):stamp('rumour','','Половина — небылицы');
 return `<div class="book-row${own?' own':''}"><span class="cover ${b.reliable?'sure':'lubok'}" aria-hidden="true"></span><span class="book-main"><b>${esc(b.title)}</b><small>${esc(b.by)}</small>${mark}<small class="blurb">${esc(b.blurb)}</small></span>${own?'<em class="own-mark">в библиотеке</em>':btn('buy-book',`<span>Купить</span>${coins(b.price)}`,'chip',`data-id="${b.id}" ${state.gold<b.price?'disabled':''}`)}</div>`;}
function goodsRow(mt){const have=state.stock[mt.id]||0;return `<div class="goods">${thing(mt.id)}<span class="goods-main"><b>${esc(mt.name)}</b><small>${coins(mt.buy)} · есть ${have}</small></span>${btn('buy',`+1`,'chip',`data-id="${mt.id}" data-n="1" aria-label="Купить: ${esc(mt.name)}, 1 за ${mt.buy} мон." ${state.gold<mt.buy?'disabled':''}`)}${btn('buy',`+5`,'chip',`data-id="${mt.id}" data-n="5" aria-label="Купить: ${esc(mt.name)}, 5 за ${mt.buy*5} мон." ${state.gold<mt.buy*5?'disabled':''}`)}</div>`;}
function traderHTML(){const shelf=P.shelfTier(state),books=L.BOOKS.filter(b=>b.seller!=='gift'&&b.tier<=shelf),by=s=>books.filter(b=>b.seller===s).map(bookRow).join(''),goods=s=>L.BOUGHT.filter(m=>m.seller===s).map(goodsRow).join('');
 const sheets=state.trader.day===state.day?state.trader.rumours:[],sell=L.MATERIALS.filter(mt=>(state.stock[mt.id]||0)>0&&mt.sell>0);
 const v=L.VISITOR.get('vedana');
 return `<section class="card stall"><div class="stall-head">${face(visitorPerson('vedana'),0,'portrait small')}<div><h2>Ведана · травы и основы</h2><small>«${esc(v.lines.sell)}»</small></div></div><div class="goods-grid">${goods('vedana')}</div>${by('vedana')}</section>
 <section class="card stall"><div class="stall-head">${face(visitorPerson('yanek'),0,'portrait small')}<div><h2>Янек · книги и слухи</h2><small>Полка книг яруса ${ROMAN[shelf-1]} и ниже</small></div></div>
 <h3 class="label">Слухи дня</h3><div class="rumour-sheets">${sheets.map((x,i)=>{const m=mon(x.monster);return x.sold?`<span class="rumour-sheet sold">${icon('check')}<span>Слух ${esc(m.about)} — куплен</span></span>`:btn('buy-rumour',`${icon('seal')}<span>Слух ${esc(m.about)}</span>${coins(x.price)}`,'rumour-sheet',`data-slot="${i}" ${state.gold<x.price||!P.hasUnknown(state,m)?'disabled':''}`);}).join('')||'<p class="muted">Сегодня Янеку нечего шепнуть.</p>'}</div>
 <h3 class="label">Книжная полка</h3>${by('yanek')}<div class="goods-grid">${goods('yanek')}</div></section>
 <section class="card stall"><div class="stall-head">${face(visitorPerson('nikodim'),0,'portrait small')}<div><h2>о. Никодим</h2><small>«${esc(L.VISITOR.get('nikodim').lines.water)}»</small></div></div><div class="goods-grid">${goods('nikodim')}</div>${by('nikodim')}</section>
 <section class="card stall"><h2>Свечи</h2><div class="goods"><span class="goods-main"><b>Лишняя свеча</b><small>одна в день · ${coins(P.PRICE.candle)}</small></span>${btn('buy-candle',`<span>${state.daily.extra?'Куплена':'Купить'}</span>`,'chip',`${state.daily.extra||state.gold<P.PRICE.candle||P.candleMax(state)>=P.CANDLE_LIMIT?'disabled':''}`)}</div></section>
 <section class="card stall"><h2>Продать</h2>${sell.map(mt=>{const n=state.stock[mt.id];return `<div class="goods">${thing(mt.id)}<span class="goods-main"><b>${esc(mt.name)}</b><small>×${n} · по ${mt.sell} мон.</small></span>${btn('sell',`Продать · ${mt.sell}`,'chip',`data-id="${mt.id}" data-n="1"`)}${n>1?btn('sell',`Все · ${mt.sell*n}`,'chip',`data-id="${mt.id}" data-n="${n}"`):''}</div>`;}).join('')||'<p class="muted">Продать пока нечего: части чудовищ приносят охотники.</p>'}</section>`;}
function academyBanner(){if(!state.story.seen.includes('S1'))return 'Академия ещё не знает о бестиарии.';if(state.upgrades.includes('dovecote'))return 'Листы Магистру — почтой, в любой день.';if(P.academyOpen(state))return 'Сегодня в Велене Магистр Брандт.';
 const n=3-state.day%3;return n===1?'Магистр будет завтра.':`Магистр будет через ${L.days(n)}.`;}
function academyHTML(){const open=P.academyOpen(state),free=state.story.seen.includes('S2')&&!state.daily.copied,n=P.treatises(state),rank=P.rankOf(state.rep),press=state.upgrades.includes('press');
 const rows=P.openList(state).map(m=>{const x=state.monsters[m.id],o=P.academyOffer(state,m.id),st=P.pageStats(state,m.id),notes=state.notes[m.id]||0,confirmed=m.facts.filter(f=>state.know[f.id]?.st==='confirmed').length,lv=P.leafletValue(confirmed,press);
  // A page the Magister already has is said so in place of the button (GDD 10.7).
  const sell=!o.n&&x.sold.length?`<em class="done">${icon('check')}Этот лист у Магистра уже есть</em>`:btn('copy-page',`<span>Продать лист · ${o.n} ${plural(o.n,'новая запись','новые записи','новых записей')} · ${o.coins} мон.</span>${free?'<small>перепишет Федя</small>':cost(1)}`,'chip',`data-monster="${m.id}" ${!open||o.n<P.ACADEMY.need||!free&&P.candlesLeft(state)<1?'disabled':''}`);
  const treat=m.tier>=4?'':x.treatise?`<em class="done">${icon('book')}трактат написан</em>`:btn('treatise',`<span>Написать трактат · ${P.TREATISE[m.tier]} мон.</span>${cost(2)}`,'chip',`data-monster="${m.id}" ${!st.done||notes<2||P.candlesLeft(state)<2?'disabled':''}`);
  const why=m.tier>=4||x.treatise?'':st.done?notes<2?`для трактата нужны 2 полевые записи (есть ${notes})`:P.candlesLeft(state)<2?'страница полна — для трактата нужны 2 свечи':'страница полна':st.resolved===st.total&&st.unrevealed?'Магистр сомневается: какая-то запись верна не всегда':st.troph<st.need?`трактат: нужны трофеи двух обликов (есть ${st.troph})`:`трактат: разрешено ${st.resolved} из ${st.total}`;
  const leaf=rank>=2&&m.tier<4?btn('leaflet',`<span>Листок для печатни · ${lv} мон.</span>${press?'':cost(1)}`,'chip',`data-monster="${m.id}" ${!lv||x.leaflet&&state.day-x.leaflet<P.LEAFLET.every||!press&&P.candlesLeft(state)<1?'disabled':''}`):'';
  return `<div class="academy-row"><b>${esc(m.name)}</b>${o.n&&o.n<P.ACADEMY.need?'<small>нужно хотя бы две новые записи</small>':''}<div class="row wrap">${sell}${treat}${leaf}</div>${why?`<small>${esc(why)}</small>`:''}</div>`;}).join('');
 return `<section class="card banner">${face(visitorPerson('otto'),0,'portrait small')}<div><b>${esc(academyBanner())}</b><small>«${esc(L.VISITOR.get('otto').lines.rumours)}» Каждую запись Академия покупает один раз.</small></div></section>
 <section class="card">${rows}${open?noCandles(1):''}</section>
 <section class="card great">${icon('crown','big-icon')}<div><h2>Великий бестиарий</h2><p class="muted">Трактаты ${n} / ${L.MONSTERS.length} · звание «${esc(L.RANKS[5].name)}» · печать ${P.PRICE.print} мон. и три свечи.</p>${state.printed?`<p class="done">${icon('check')}Напечатан в день ${state.printed}</p>`:btn('print',`<span>Напечатать Великий бестиарий</span>${cost(3)}`,'primary big',`${rank<5||n<L.MONSTERS.length||state.gold<P.PRICE.print||P.candlesLeft(state)<3?'disabled':''}`)}</div></section>`;}
function upgradesHTML(){const rank=P.rankOf(state.rep);
 const up=L.UPGRADES.map(u=>{const own=state.upgrades.includes(u.id);return `<div class="goods"><span class="goods-main"><b>${esc(u.name)}</b><small>${esc(u.text)}${rank<u.rank?` · со звания «${esc(L.RANKS[u.rank].name)}»`:''}</small></span>${own?'<em class="own-mark">есть</em>':btn('upgrade',`<span>${u.price}</span>${icon('coin')}`,'chip',`data-id="${u.id}" aria-label="${esc(u.name)}: купить за ${u.price} мон." ${rank<u.rank||state.gold<u.price?'disabled':''}`)}</div>`;}).join('');
 const gear=L.HUNTERS.filter(h=>state.hunters[h.id]).map(h=>`<div class="gear-row"><b>${esc(h.short)}</b><div class="row wrap">${L.GEAR.map(g=>state.hunters[h.id].gear.includes(g.id)?`<em class="own-mark">${esc(g.name)}</em>`:btn('equip',`<span>${esc(g.name)}</span>${coins(g.price)}`,'chip',`data-hunter="${h.id}" data-gear="${g.id}" aria-label="${esc(h.short)}: ${esc(g.name)}, ${esc(g.text)}, ${g.price} мон." ${rank<g.rank||state.gold<g.price?'disabled':''}`)).join('')}</div></div>`).join('');
 const decor=L.DECOR.map(x=>`<div class="goods"><span class="goods-main"><b>${esc(x.name)}</b><small>${esc(x.text)}</small></span>${state.decor.includes(x.id)?'<em class="own-mark">стоит</em>':btn('decor',`<span>${x.price}</span>${icon('coin')}`,'chip',`data-id="${x.id}" aria-label="${esc(x.name)}: ${x.price} мон." ${state.gold<x.price?'disabled':''}`)}</div>`).join('');
 const eds=L.MONSTERS.filter(m=>state.monsters[m.id]?.treatise).map(m=>`<div class="goods"><span class="goods-main"><b>${esc(m.name)}</b><small>${esc(L.EDITION.name)} трактата</small></span>${state.editions.includes(m.id)?'<em class="own-mark">на полке</em>':btn('edition',`<span>${P.editionPrice(m.id)}</span>${icon('coin')}`,'chip',`data-monster="${m.id}" aria-label="${esc(L.EDITION.name)}: ${esc(m.name)}, ${P.editionPrice(m.id)} мон." ${state.gold<P.editionPrice(m.id)?'disabled':''}`)}</div>`).join('');
 return `<section class="card"><h2>Скрипторий</h2>${up}</section><section class="card"><h2>Снаряжение охотников</h2><p class="fine-print">${L.GEAR.map(g=>`${g.name}: ${g.text.toLowerCase()}`).join('; ')}. Со звания «${esc(L.RANKS[1].name)}», раз на охотника.</p>${gear}</section>
 <section class="card"><h2>Убранство</h2><p class="fine-print">Только для вида: на шансы, цены и доход не влияет.</p>${decor}</section>${eds?`<section class="card"><h2>${esc(L.EDITION.name)}</h2><p class="fine-print">${esc(L.EDITION.text)}</p>${eds}</section>`:''}`;}
// ---- Летопись (GDD 10.8)
function chronicleHTML(){return `<div class="section-line"><h1>Летопись</h1></div>${segments('chronicle-tab',[['path','Путь',0,'crest'],['trophies','Трофеи',0,'fang'],['days','Дни',0,'scroll']],chronicleTab)}${chronicleTab==='trophies'?trophiesHTML():chronicleTab==='days'?daysHTML():pathHTML()}`;}
function pathHTML(){const r=P.rankOf(state.rep),now=L.RANKS[r],next=L.RANKS[r+1],p=next?Math.round((state.rep-now.rep)/(next.rep-now.rep)*100):100,s=state.story.seen,n=P.treatises(state);
 const steps=[[state.stats.wins>0,'Первая победа по твоему листу'],[r>=1,`Звание «${L.RANKS[1].name}»`],[s.includes('S3'),'Ерофеев день: страницы яруса II'],[s.includes('S5'),'Чёрная зима'],[s.includes('S10'),'Совет в ратуше: дело колдуна'],[!!state.story.koldun,'Колдун Мартын побеждён'],[n>=L.MONSTERS.length,`Все ${L.MONSTERS.length} трактатов`],[!!state.printed,'Великий бестиарий напечатан']];
 return `<section class="card rank-card"><span class="rank-seal" aria-hidden="true">${icon(EMBLEM_ICON[now.emblem]||'crest')}</span><div><small>Звание ${r+1} из ${L.RANKS.length}</small><h2>${esc(now.name)}</h2><i class="bar" style="--p:${p}%"></i><small>репутация ${state.rep}${next?` · до «${esc(next.name)}» ещё ${next.rep-state.rep}`:''}</small></div></section>
 ${next?`<section class="card"><h3 class="label first">Откроет «${esc(next.name)}»</h3><p class="muted">${esc(next.opens)}</p></section>`:''}
 <section class="card"><h3 class="label first">Вехи</h3><ul class="steps">${steps.map(([done,t])=>`<li class="${done?'done':''}">${icon(done?'check':'ring')}<span>${esc(t)}</span></li>`).join('')}</ul><p class="fine-print">Великий бестиарий: трактаты ${n} / ${L.MONSTERS.length}.</p></section>`;}
function trophiesHTML(){return `<div class="trophy-grid">${L.MONSTERS.map(m=>{const x=state.monsters[m.id];return `<div class="trophy-card${x?'':' locked'}"><b>${x?esc(m.name):'Не заведено'}</b><div class="slots3">${['young','grown','ancient'].map(v=>{const has=x?.troph.includes(v),ok=m.variants.some(z=>z.id===v);return ok?btn('trophy',`<i class="plaque ${v}${has?' on':''}">${has?pixelImg(trophyURL(m.id,m.trophy.look),24):''}</i><small>${VARIANT[v]}</small>`,'plaque-button',`data-monster="${m.id}" data-variant="${v}" ${x?'':'disabled'} aria-label="${esc(m.name)}, ${VARIANT[v]}: ${has?esc(m.trophy.name):'пустой крюк'}"`):'<span class="plaque-button none"></span>';}).join('')}</div></div>`;}).join('')}</div>`;}
const LOG_ICON={hunt:'door',story:'scroll',arc:'quill',rank:'crest',book:'book',sale:'scale',treatise:'book',print:'crown',note:'info'};
function daysHTML(){const days=new Map();for(const e of state.chronicle){if(!days.has(e.d))days.set(e.d,[]);days.get(e.d).push(e);}
 return [...days].map(([d,list])=>`<h3 class="label">День ${d}</h3><ul class="chronicle">${list.map(e=>`<li>${icon(LOG_ICON[e.k]||'info')}<span>${esc(e.t.startsWith(`День ${d}: `)?L.upperFirst(e.t.slice(`День ${d}: `.length)):e.t)}</span></li>`).join('')}</ul>`).join('')||'<p class="fine-print">Здесь появятся охоты, книги, листы Академии и вести.</p>';}
// ---- dialogs
function showHunter(id){const h=hunterOf(id),x=state.hunters[id];if(!h||!x)return;const st=hunterState(id),rank=P.rankOf(state.rep),arcs=h.arc.filter(a=>state.arcs.includes(a.id));
 modal(esc(h.name),`<div class="hero-row">${face(hunterPerson(id),x.rag,'portrait big')}<p>${esc(h.about)}</p></div>
 <div class="score-row"><span>Мастерство</span><b>+${P.skillBonus(id,x)}</b></div><div class="score-row"><span>Зоркость</span><b>${P.perception(id,x)} из 5</b></div><div class="score-row"><span>Доверие</span>${trust(x.trust)}</div><div class="score-row"><span>Уровень</span><b>${ROMAN[P.level(x.xp)]} · охот ${x.hunts}, побед ${x.wins}</b></div><div class="score-row"><span>Ярусы дел</span><b>до ${ROMAN[P.maxTier(id,x)-1]}</b></div>
 <p class="muted">Любит дела: ${h.likes.map(t=>L.TAGS[t]).join(', ')||'любые'}. Снаряжение: ${esc(h.gearText)}.</p><p class="state-line ${st.cls}">${icon(st.icon)}<span>${esc(st.text)}</span></p>
 ${x.out>0?btn('heal',`${icon('bandage')}<span>Позвать лекаря · ${P.PRICE.doctor} мон.</span>`,'big',`data-id="${id}" ${state.gold<P.PRICE.doctor?'disabled':''}`):''}
 <h3 class="label">Снаряжение</h3><div class="row wrap">${L.GEAR.map(g=>x.gear.includes(g.id)?`<em class="own-mark">${esc(g.name)}</em>`:btn('equip',`<span>${esc(g.name)}</span>${coins(g.price)}`,'chip',`data-hunter="${id}" data-gear="${g.id}" ${rank<g.rank||state.gold<g.price?'disabled':''}`)).join('')}</div>
 <h3 class="label">История · ${arcs.length} из ${h.arc.length}</h3>${arcs.length?`<ul class="arc-list">${arcs.map(a=>`<li>«${esc(a.text)}»</li>`).join('')}</ul>`:`<p class="fine-print">${gendered(id,'Охотник ещё мало говорил','Охотница ещё мало говорила')} о себе.</p>`}`);}
function showFact(id){const f=fact(id),k=state.know[id];if(!f||!k)return;const m=L.monsterOf(id);
 modal(esc(f.title),`<div class="fact-dialog">${stamp(knowKey(k),k.st==='rumour'?source(k):k.rev?f.condTag:'')}<p class="quote">${esc(f.advice)}</p><p class="muted">${esc(CAT.get(f.cat).full)} · ${esc(m.name)}</p>${k.rev?`<p class="muted">${esc(f.condText)}</p>`:''}<p class="hand">${esc(margin(k,f))}</p><div class="score-row"><span>Помогло · без толку · во вред</span><b>${k.ok} · ${k.none} · ${k.worse}</b></div>${k.last?`<p class="fine-print">Последний раз: ${VARIANT[k.last.v]}, ${A.WEATHER[k.last.w]}, ${A.SEASONS[k.last.k]}.</p>`:''}</div>${btn('go',`${icon('book')}<span>Открыть страницу</span>`,'big',`data-view="bestiary" data-monster="${m.id}"`)}`);}
function howLearn(mid){const m=mon(mid);modal('Как узнать?',`<div class="help-grid"><b>${icon('mortar')}</b><span>Средство и оберег проверяют на образце в «Опытах»: часть ${L.genOf(m)} из «Добычи» и одна свеча.</span><b>${icon('scroll')}</b><span>Время, место и обряд сверяют в архиве по полевым записям, а неизвестное ищут, роясь в летописях.</span><b>${icon('book')}</b><span>Книги в лавке ставят печати сразу: надёжные — точные, лубки — только слухи.</span><b>${icon('door')}</b><span>Отчёт охотника по каждому указанию меняет печати сам.</span></div><div class="row fill">${btn('go','Опыты','',`data-view="lab" data-tab="samples" data-monster="${mid}"`)}${btn('go','Архив','',`data-view="lab" data-tab="archive" data-monster="${mid}"`)}${btn('go','Книги','','data-view="shop" data-tab="trader"')}</div>`);}
function showSky(){const t=P.skyToday(state),words=A.skyWords({season:t.season,weather:t.weather});
 modal(`День ${t.day}`,`<p class="sky-line">${icon(A.WEATHER_ICON[t.weather])}<span>${esc(L.upperFirst(words))}${t.hold?' — Чёрная зима':''}</span></p>${t.facts.length?`<h3 class="label">Сегодня по раскрытым условиям</h3><ul class="reasons">${t.facts.map(x=>`<li>«${esc(fact(x.id).title)}» (${esc(L.lowerFirst(mon(x.monster).name))}) — ${x.outcome==='ok'?'верно':x.outcome==='none'?'пустое':'опасно'}</li>`).join('')}</ul>`:'<p class="muted">Погода и сезон меняют только условные сведения. Когда условие раскроется, здесь будет видно, что верно сегодня.</p>'}<p class="fine-print">Погода дня видна на карточке дела заранее. Отложенное дело придёт завтра — с завтрашней погодой.</p>`);}
function pickHunter(cid){const list=L.HUNTERS.filter(h=>state.hunters[h.id]);
 modal('Кого послать на колдуна?',`<p class="muted">Дело ратуши ждёт без срока. Ярусный предел здесь не действует.</p><div class="artel">${list.map(h=>{const x=state.hunters[h.id],ok=P.free(state,h.id),st=hunterState(h.id);return btn('assign',`${face(hunterPerson(h.id),x.rag,'portrait')}<span class="who"><b>${esc(h.name)}</b><small>мастерство +${P.skillBonus(h.id,x)} · зоркость ${P.perception(h.id,x)}</small></span><span class="state ${st.cls}">${esc(st.text)}</span>`,'artel-main',`data-contract="${cid}" data-hunter="${h.id}" ${ok?'':'disabled'}`);}).join('')}</div>`);}
function studyDialog(mid,v){const m=mon(mid),list=m.facts.filter(f=>LAB.includes(f.cat)&&state.know[f.id]&&!state.know[f.id].rev),unknown=m.facts.some(f=>LAB.includes(f.cat)&&!state.know[f.id]);
 modal(`Изучить: ${esc(m.trophy.name)}`,`<p class="muted">${esc(m.trophy.text)} Трофей (${VARIANT[v]}) расскажет об одном веществе или обереге — один раз.</p><div class="choice-list">${unknown?btn('study-fact',`${icon('help')}<span>Неизвестное сведение</span>${cost(1)}`,'',`data-monster="${mid}" data-variant="${v}" data-fact=""`):''}${list.map(f=>btn('study-fact',`${icon(CAT.get(f.cat).icon)}<span>${esc(f.title)} · ${STATE_WORD[state.know[f.id].st]}</span>${cost(1)}`,'',`data-monster="${mid}" data-variant="${v}" data-fact="${f.id}"`)).join('')}</div>${noCandles(1)}`);}
function showTrophy(mid,v){const m=mon(mid),x=state.monsters[mid];if(!x)return;const has=x.troph.includes(v);
 modal(has?esc(m.trophy.name):'Пустой крюк',`<p class="muted">${has?esc(m.trophy.text):`Трофей «${esc(L.variantName(mid,v))}» появится после первой победы над этим обликом.`}</p>${has&&!x.studied.includes(v)?btn('go',`${icon('mortar')}<span>Изучить · в «Опытах»</span>`,'big',`data-view="lab" data-tab="samples" data-monster="${mid}"`):has?'<p class="fine-print">Трофей уже изучен.</p>':''}`);}
function showRank(r){if(!r){modals.next()?.();return;}modal(`Звание «${esc(r.name)}»`,`<div class="rank-hero"><span class="rank-seal big" aria-hidden="true">${icon(EMBLEM_ICON[r.emblem]||'crest')}</span><p>Репутация ${state.rep}. ${esc(r.opens)}</p></div>${btn('close','Продолжить','primary')}`,true,'celebrate');audio.play('magic');}
function checkRank(){if(loadError||rankQueued||P.rankOf(state.rep)<=(state.rankSeen??0))return;rankQueued=true;queueModal(()=>{rankQueued=false;const r=P.seeRank(state);scheduleSave();render();showRank(r);},'rank');}
function showStory(ev,arcs=[]){const who=ev.who&&L.VISITOR.has(ev.who)?visitorPerson(ev.who):ev.who&&L.HUNTER.has(ev.who)?hunterPerson(ev.who):null,ends=arcs.filter(a=>a.id.endsWith('.end'));
 modal(esc(ev.title),`<div class="story">${who?face(who,0,'portrait big'):''}<div>${ev.text.map(t=>`<p class="quote">«${esc(t)}»</p>`).join('')}</div></div>${ends.length?`<h3 class="label">Эпилоги</h3><ul class="arc-list">${ends.map(a=>`<li><b>${esc(hunterOf(a.hunter).short)}:</b> «${esc(a.text)}»</li>`).join('')}</ul>`:''}${btn('close','Дальше','primary')}`,true,'story-dialog sheet-dialog');}
function showMorning(res){const m=G.morningReport(state,res);
 modal(esc(m.title),`<p class="sky-line">${icon(A.WEATHER_ICON[res.morning?.weather||'clear'])}<span>${esc(m.sky)}${m.hold?' · Чёрная зима':m.thaw?' · оттепель':''}</span></p><p class="quote">${esc(m.line)}</p><div class="morning-rows">${m.rows.map(r=>btn('go',`${icon(r.icon)}<span>${esc(r.text)}</span>${icon('right','go-chev')}`,'morning-row',['view','tab','monster','report'].filter(k=>r[k]).map(k=>`data-${k}="${esc(r[k])}"`).join(' '))).join('')}</div>${btn('close','Начать день','primary')}`,true,'morning-dialog sheet-dialog');}
// The first choice of the game: the look of the keeper and the sound; the tap that starts also wakes the sound.
function welcome(){const keepers=L.KEEPER_LOOKS.map(k=>btn('welcome-keeper',`${face(personOf(k.id,k.look),0,'portrait')}<span>${k.id==='keeper_a'?'Летописец':'Летописица'}</span>`,'keeper-pick'+((welcomeKeeper||state.keeper)===k.id?' active':''),`data-id="${k.id}" aria-pressed="${(welcomeKeeper||state.keeper)===k.id}"`)).join('');
 const sound=(on,ic,text)=>btn('welcome-sound',`${icon(ic)}<span>${text}</span>`,welcomeSound===on?'active':'',`data-sound="${on?1:0}" aria-pressed="${welcomeSound===on}"`);
 modal('Бестиарий Велена',`<div class="welcome"><div class="plate-frame small" role="img" aria-label="Таблица I: волколак"><b>I</b></div><p class="lead">Летопись чудовищ, 1740</p></div><ul class="welcome-lines"><li>Тебе приходят за советом: какое чудище, где и как его взять.</li><li>Пиши три указания — каждое верное даёт треть успеха, три верных — победу.</li><li>Ошибёшься — охотник вернётся побитым и расскажет, что было не так.</li></ul>
 <h3 class="label">Облик летописца</h3><div class="keepers">${keepers}</div><div class="segmented" role="group" aria-label="Звук">${sound(false,'mute','Тихо')}${sound(true,'sound','Со звуком')}</div><div class="sticky-actions">${btn('welcome-start','Начать','primary big')}</div>`,false,'welcome-dialog sheet-dialog');}
function startGame(){state.welcomed=true;if(welcomeKeeper)P.setKeeper(state,welcomeKeeper);state.sound=state.music=welcomeSound;audio.setOptions(state);scheduleSave();render();
 const s0=L.STORY.get('S0');if(state.day===1)queueModal(()=>showStory(s0),'story');}
function showLegacy(){state.legacySeen=true;scheduleSave();modal('Прежняя игра',`<p>Здесь была ювелирная мастерская «Сияние». Её сохранение не тронуто — его можно скачать в меню. В бестиарий оно не переносится.</p><div class="row fill">${btn('legacy-export',`${icon('download')}<span>Скачать сохранение прежней игры</span>`)}${btn('close','Понятно','primary')}</div>`);}
function download(raw,filename,type='application/json'){const url=URL.createObjectURL(raw instanceof Blob?raw:new Blob([raw],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function menu(){modal('Бестиарий Велена',`<div class="row fill menu-top">${btn('reference',`${icon('help')}<span>Справочник</span>`)}${btn('keeper',`${icon('quill')}<span>Облик летописца</span>`)}</div><div class="settings">${btn('toggle-sound',`${icon('sound')}<span>Звук</span><em>${state.sound?'вкл':'выкл'}</em>`,state.sound?'on':'',`aria-pressed="${state.sound}"`)}${btn('toggle-music',`${icon('music')}<span>Музыка</span><em>${state.music?'вкл':'выкл'}</em>`,state.music?'on':'',`aria-pressed="${state.music}"`)}<label class="slider">Громкость <input id="volume" aria-label="Громкость" type="range" min="0" max="1" step="0.05" value="${state.volume}"></label>${btn('toggle-large',`${icon('text')}<span>Крупный текст</span><em>${state.prefs?.large?'вкл':'выкл'}</em>`,state.prefs?.large?'on':'',`aria-pressed="${!!state.prefs?.large}"`)}${btn('toggle-calm',`${icon('calm')}<span>Меньше анимаций</span><em>${state.prefs?.calm||reduced.matches?'вкл':'выкл'}</em>`,state.prefs?.calm||reduced.matches?'on':'',`aria-pressed="${!!state.prefs?.calm}"`)}${'vibrate'in navigator?btn('toggle-haptics',`${icon('vibrate')}<span>Вибрация</span><em>${state.haptics!==false?'вкл':'выкл'}</em>`,state.haptics!==false?'on':'',`aria-pressed="${state.haptics!==false}"`):''}
 ${btn('export',`${icon('download')}<span>Скачать сохранение</span>`)}${btn('import',`${icon('upload')}<span>Загрузить сохранение</span>`)}${legacy?btn('legacy-export',`${icon('download')}<span>Скачать сохранение прежней игры</span>`):''}${backupMeta?btn('restore-backup',`${icon('undo')}<span>Вернуть прежний бестиарий</span><em>день ${backupMeta.day}</em>`):''}${installable()?btn('install',`${icon('home')}<span>На главный экран</span>`):''}${updateReady?btn('reload-app',`${icon('download')}<span>Обновить до новой версии</span>`):''}${btn(loadError?'reset-recovery':'reset-game',`${icon('close')}<span>Начать заново</span>`,'danger')}</div><p class="fine-print">Бестиарий хранится на этом устройстве. Для переноса на другой телефон скачай файл. ${reduced.matches?'Анимации уменьшены настройкой системы. ':''}Велен, 1740 год.</p>`);}
function keeperDialog(){modal('Облик летописца',`<div class="keepers">${L.KEEPER_LOOKS.map(k=>btn('set-keeper',`${face(personOf(k.id,k.look),0,'portrait')}<span>${k.id==='keeper_a'?'Летописец':'Летописица'}</span>`,'keeper-pick'+(state.keeper===k.id?' active':''),`data-id="${k.id}" aria-pressed="${state.keeper===k.id}"`)).join('')}</div><p class="fine-print">Облик виден в скриптории за столом; тексты игры от него не меняются.</p>`);}
const REFERENCE=[['advice','Лист совета'],['stamps','Печати'],['potions','Снадобья'],['report','Отчёт'],['lab','Опыты'],['academy','Академия'],['ranks','Звания']];
function showReference(){const text={advice:'<p>Охотник просит совета против одного чудовища. В лист пишут ровно три указания из бестиария, не больше одного на род: чем бить, чем уберечься, когда, где, как. Каждое верное указание — треть успеха; три верных — победа наверняка. Вредное отнимает 25. Ночью исход решает жребий.</p>',
 stamps:`<p>${stamp('confirmed')} проверено делом или опытом. ${stamp('rumour')} — болтовня, пока не проверишь. ${stamp('refuted')} — пустое: ничего не даст и не навредит. ${stamp('dangerous')} — так советовать нельзя. ${stamp('cond')} — верно лишь при условии: облик, погода или сезон.</p>`,
 potions:`<p>До двух разных снадобий на охоту: одно общее, одно против рода чудовища, остальные — по действию. Снадобья и мастерство прибавляют сверху, но не больше ${P.BONUS_CAP}: главное — знание.</p>`,
 report:'<p>Утром охотник рассказывает по каждому указанию: «Помогло», «Без толку», «Во вред» или «Не приметил». Печати в бестиарии меняются сами. После победы выбери награду: монеты, добычу (части чудовища для опытов) или знание (новое сведение и полевые записи). Охотники не гибнут: раненый лечится до четырёх дней.</p>',
 lab:'<p>Средство и оберег проверяют на образце, время, место и обряд — по полевым запискам в архиве. Порыться в летописях — найти новый слух. Варка — одна свеча, две дозы.</p>',
 academy:'<p>Магистр покупает каждую проверенную запись страницы один раз; слухи — нет. Полная страница — все сведения разрешены, условия раскрыты и есть трофеи двух обликов — даёт трактат. Четырнадцать трактатов и звание «Составитель» — печать «Великого бестиария».</p>',
 ranks:`<p>Репутация растёт за победы, разрешённые сведения, трофеи, трактаты и сюжет и никогда не убывает. Звания: ${L.RANKS.map(r=>`${r.name}${r.rep?` — от ${r.rep}`:''}`).join(', ')}.</p>`};
 modal('Справочник',`<div class="ref-index">${REFERENCE.map(([id,name])=>btn('ref-jump',name,'chip',`data-id="ref-${id}"`)).join('')}</div>${REFERENCE.map(([id,name])=>`<section class="ref" id="ref-${id}"><h3 class="label">${name}</h3>${text[id]}</section>`).join('')}`);}
// The game kept on the home screen opens offline and is safer from a browser that clears sites unvisited for a week.
let installEvent=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});addEventListener('appinstalled',()=>{installEvent=null;});
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const apple=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
const installable=()=>!standalone()&&(!!installEvent||apple());
function install(){const e=installEvent;if(e){installEvent=null;close();e.prompt();e.userChoice?.catch(()=>{});return;}
 modal('На главный экран',`<p>В Safari нажми «Поделиться» внизу экрана и выбери «На экран „Домой“». Бестиарий будет открываться без браузерной строки и без сети.</p>${btn('close','Понятно','primary')}`);}
// ---- the end of the day and the night between days (GDD 1.1, art.md 3.8)
function dayReasons(){const waiting=G.queueOf(state).filter(v=>v.contract&&!contractOf(v.contract)?.deferred||!v.contract&&!v.heard&&v.kind!=='otto'),left=P.candlesLeft(state),out=[];
 if(waiting.length)out.push(`Ещё ${waiting.length===1?'ждёт':'ждут'} ${G.and(waiting.map(G.guestName))}.`);if(left)out.push(`Свечей осталось ${left}.`);return out;}
function endDay(confirmed=false){if(night)return;const reasons=confirmed?[]:dayReasons();
 if(reasons.length){modal('Задуть свечу?',`<p>${reasons.map(esc).join(' ')} Задуть свечу и закончить день?</p><p class="fine-print">Не взятые сегодня дела закроются без последствий; отложенные придут завтра.</p><div class="row fill">${btn('close','Остаться')}${btn('confirm-end',`${icon('snuff')}<span>Задуть свечу</span>`,'primary')}</div>`);return;}
 const from=A.ambience(state),lines=state.hunts.map(h=>`${h.contract.hunter?hunterOf(h.contract.hunter).short:L.TOWN_TYPE.get(h.contract.town).label} — ${L.PLACE.get(h.contract.place).where}`);let res;
 try{res=P.endDay(state);}catch(e){crash(e);return;}
 // The notes of the day are done with at night: «ушёл на дело… ответ — утром» does not cover the report of the morning.
 if(toasts.drop(t=>t.kind!=='error'))showToast();drafts.clear();leaveSheet();chosen=null;swap=null;labPick.clear();scheduleSave();render();audio.play('step');
 const morning=()=>{for(const r of res.reports)queueModal(()=>showReport(r.id),'report');if(res.rank)queueModal(()=>showRank(res.rank),'rank');if(res.story)queueModal(()=>showStory(res.story,res.arcs),'story');queueModal(()=>showMorning(res),'morning');};
 if(!still()&&!dialog.open)startNight(from,lines.length?lines:[L.LINES.night.wait],morning);else morning();}
let night=null;
function startNight(from,lines,then){const veil=document.createElement('button');veil.type='button';veil.className='night-veil';veil.dataset.action='skip-night';veil.setAttribute('aria-label','Ночь над Веленом. Коснись, чтобы встретить утро');
 veil.innerHTML=`<span class="night-title">${icon('moon')}Ночь над Веленом</span>${lines.slice(0,5).map((t,i)=>`<span class="night-line" style="animation-delay:${300+i*200}ms">${esc(t)}</span>`).join('')}`;document.body.append(veil);night={start:null,from,to:A.ambience(state),then,veil};}
// Evening deepens into night in 0.35 s, the night holds, and the new day dawns in the last 0.45 s.
function nightSky(time){const n=night;if(n.start===null)n.start=time;const t=time-n.start,k=t<350?t/350:t<1150?1:Math.max(0,1-(t-1150)/450),amb=t<750?n.from:n.to;return {...amb,phase:amb.phase+(1-amb.phase)*k};}
function nightTick(time){const n=night;if(n.start===null)n.start=time;if(time-n.start>=1600)endNight();}
function endNight(){const n=night;if(!n)return;night=null;n.veil.remove();lastFrame=0;n.then();}
// ---- the picture
// With less motion the picture stands still: it is painted only when the game changes (render), never by the frame.
function paint(time,dt,force=false){if(dialog.open&&!force||still()&&!force&&!night)return;const t=still()?0:time,amb=night?nightSky(time):A.ambience(state),c=$('#scene'),lab=$('#lab-scene');
 if(c)scene.paint(c.getContext('2d'),state,{guests:G.queueOf(state),chosen,time:t,dt,amb,calm:still(),covered:dialog.open});if(lab)scene.paintLab(lab.getContext('2d'),state,{time:t,dt,amb,calm:still()});}
// The point of a canvas under a tap in its own pixels, also where CSS crops it (object-fit:cover on short screens).
function canvasPoint(el,e){const r=el.getBoundingClientRect(),k=Math.max(r.width/el.width,r.height/el.height),[ox,oy]=(getComputedStyle(el).objectPosition||'').split(' ').map(v=>{const n=parseFloat(v)/100;return Number.isFinite(n)?n:.5;});
 return [(e.clientX-r.left-(r.width-el.width*k)*(ox??.5))/k,(e.clientY-r.top-(r.height-el.height*k)*(oy??.5))/k];}
// A guest coming in or going out opens the door with its creak.
scene.onDoor=()=>audio.play('door');
// ?fps in the address shows the average time of a painted frame over the last forty, for checks on a slow phone.
const fps=/[?&]fps\b/.test(location.search)?{n:0,sum:0,el:null}:null;
function meter(ms){fps.sum+=ms;if(++fps.n<40)return;if(!fps.el){fps.el=document.createElement('div');fps.el.className='fps-meter';fps.el.setAttribute('aria-hidden','true');}const host=dialog.open?dialog:document.body;if(fps.el.parentElement!==host)host.append(fps.el);fps.el.textContent=`${(fps.sum/fps.n).toFixed(1)} мс · кадр`;fps.n=fps.sum=0;}
// The scene at twenty frames a second; nothing is drawn while the tab is hidden.
function frame(time){requestAnimationFrame(frame);if(document.hidden)return;const t0=fps?performance.now():0;if(night)nightTick(time);if(time-lastFrame<50)return;const dt=Math.min(.1,(time-lastFrame)/1000);lastFrame=time;paint(time,dt);if(fps)meter(performance.now()-t0);}
// Coins fly from the reward to the purse; skipped when motion is reduced.
function coinBurst(a){const to=$('#hud-gold');if(still()||!a||!to)return;const b=to.getBoundingClientRect();for(let i=0;i<7;i++){const el=document.createElement('span');el.className='flying-coin';el.innerHTML=icon('coin');document.body.append(el);const x=a.left+a.width/2+(i-3)*9,y=a.top+a.height/2;el.animate([{transform:`translate(${x}px,${y}px) scale(.6)`,opacity:0},{transform:`translate(${x+(i-3)*6}px,${y-40-i*3}px) scale(1)`,opacity:1,offset:.35},{transform:`translate(${b.left+b.width/2}px,${b.top+b.height/2}px) scale(.5)`,opacity:.2}],{duration:720+i*45,easing:'cubic-bezier(.5,0,.2,1)'}).onfinish=()=>el.remove();}}
// ---- leaving, importing and starting again
// The bestiary being replaced by an import or a fresh start is put aside first, so the menu can bring it back.
async function putAside(){const raw=loadError?sourceRaw:P.serialize(state);if(!raw)return false;const meta={day:loadError?0:state.day,gold:loadError?0:state.gold,rep:loadError?0:state.rep,damaged:loadError,at:Date.now()};
 try{await Promise.race([store.saveBackup(raw,meta),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),4000))]);backupMeta=meta;return true;}catch{return false;}}
function replaceGame(next,welcomed=true){state=next;ui={};keepUI();loadError=false;sourceRaw=null;if(welcomed)state.welcomed=true;view='reception';receptionTab='queue';sheet=null;chosen=null;page=null;drafts.clear();labPick.clear();draftDay=state.day;scheduleSave();render();checkRank();}
function showBackup(){const m=backupMeta;if(!m)return;modal('Прежний бестиарий',m.damaged?`<p>Перед загрузкой здесь было повреждённое сохранение. Его можно скачать файлом и попробовать восстановить.</p>${btn('download-backup',`${icon('download')}<span>Скачать файл</span>`,'primary big')}`:`<p>День ${m.day} · ${m.gold} мон. · репутация ${m.rep??0}.</p><p class="fine-print">Текущий бестиарий встанет на его место, и его тоже можно будет вернуть отсюда.</p><div class="row fill">${btn('download-backup',`${icon('download')}<span>Скачать</span>`)}${btn('confirm-restore','Вернуть','primary')}</div>`);}
function goTo(d){if(dialog.open)close();if(d.report){showReport(d.report);return;}if(d.end){endDay();return;}if(!d.view)return;view=d.view;leaveSheet();
 if(d.tab)({reception:()=>{receptionTab=d.tab;},lab:()=>{labTab=d.tab;},shop:()=>{shopTab=d.tab;},chronicle:()=>{chronicleTab=d.tab;}})[view]?.();
 if(d.monster){if(view==='bestiary')page=d.monster;if(view==='lab')labMonster=d.monster;}render();$('#panel').scrollTop=0;}
document.addEventListener('pointerdown',e=>{audio.unlock();swipe=view==='bestiary'&&page&&e.target.closest('.folio')?{x:e.clientX,y:e.clientY}:null;},{passive:true});
let swipe=null;
document.addEventListener('pointerup',e=>{const s=swipe;swipe=null;if(!s||view!=='bestiary'||!page||dialog.open)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*.6)return;
 turnPage(dx<0?1:-1);},{passive:true});
document.addEventListener('click',e=>{
 // A tap on the strip of the laboratory: the cauldron and the potions open «Алхимия», the jars «Образцы».
 if(e.target.id==='lab-scene'){const tab=ScriptoriumScene.labTarget(...canvasPoint(e.target,e));if(tab&&tab!==labTab){labTab=tab;audio.play('step');render();}return;}
 const b=e.target.closest('[data-action]');if(e.target.closest('#toast'))nextToast();if(!b||b.disabled)return;const id=b.dataset.action,d=b.dataset;
 switch(id){
 case'close':close();break;
 case'welcome-sound':welcomeSound=d.sound==='1';for(const el of document.querySelectorAll('[data-action="welcome-sound"]')){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);}if(welcomeSound)audio.unlock();break;
 case'welcome-keeper':welcomeKeeper=d.id;for(const el of document.querySelectorAll('[data-action="welcome-keeper"]')){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);}break;
 case'welcome-start':startGame();close();if(state.sound)audio.unlock().then(()=>audio.play('magic'));break;
 case'hint-ok':break;
 case'navigate':if(view===d.view&&view==='bestiary')page=null;view=d.view;leaveSheet();render();$('#panel').scrollTop=0;break;
 case'go':goTo(d);break;
 case'reception-tab':receptionTab=d.tab;render();break;
 case'guest':chosen=d.id;render();break;
 case'listen':{const v=state.visitors.find(v=>v.id===d.id),name=v&&G.guestName(v);act(()=>P.listen(state,d.id),r=>r.fact?`Новый слух ${L.monsterOf(r.fact).about}: «${fact(r.fact).title}»`:v.kind==='otto'?'Магистр ждёт листы: Лавка › Академия.':`${name} ${gendered(v.kind==='town'?v.who:v.kind,'рассказал','рассказала')} новости города.`);break;}
 case'open-sheet':openSheet(d.contract);break;
 case'sheet-back':leaveSheet();render();break;
 case'defer':{const c=contractOf(d.contract);if(act(()=>P.defer(state,d.contract),c?.hunter?`${hunterOf(c.hunter).short} придёт завтра ${gendered(c.hunter,'первым','первой')} — с тем же делом, но с завтрашней погодой.`:`${townName(c.town)} зайдёт завтра с тем же делом.`)){leaveSheet();render();}break;}
 case'decline':{const c=contractOf(d.contract);if(act(()=>P.decline(state,d.contract),c?.hunter?`${hunterOf(c.hunter).short} ${gendered(c.hunter,'ушёл','ушла')} без совета. Без обид.`:`${townName(c.town)} ${gendered(c.town,'ушёл','ушла')} без совета.`)){leaveSheet();chosen=null;render();}break;}
 case'pick-hunter':pickHunter(d.contract);break;
 case'assign':close();if(act(()=>P.assign(state,d.contract,d.hunter),`На колдуна пойдёт ${hunterOf(d.hunter).short}.`))openSheet(d.contract);break;
 case'hunter':showHunter(d.id);break;
 case'heal':{const r=act(()=>P.heal(state,d.id),r=>`Лекарь заплачен. ${hunterOf(d.id).short} ${r.out?`лечится ещё ${L.days(r.out)}`:'снова в строю'}${r.trust?' · доверие +1':''}`,'coin');if(r&&dialog.open){if(dialog.dataset.report)showReport(dialog.dataset.report);else showHunter(d.id);}break;}
 case'slot':case'slip':tapSlip(d.fact);break;
 case'fact-info':showFact(d.fact);break;
 case'potion':tapPotion(d.potion);break;
 case'undo-swap':{const s=swap;swap=null;withdrawToast('undo-swap');if(s&&drafts.has(s.cid)){drafts.get(s.cid).facts=s.facts;render();}break;}
 case'send':send(d.contract);break;
 case'how-counted':howCounted();break;
 case'how-learn':howLearn(d.monster);break;
 case'open-report':showReport(d.id);break;
 case'claim':claim(b);break;
 case'ask-again':{const who=state.reports.find(r=>r.id===d.id)?.hunter,name=who?hunterOf(who).short:'',said=gendered(who,'вспомнил','вспомнила');if(act(()=>P.askAgain(state,d.id),r=>r.changed.length?`${name} ${said} ${r.changed.length===1?'ещё одно':'ещё '+r.changed.length}: печати поменялись.`:`${name} больше ничего не ${said}.`))showReport(d.id);break;}
 case'report-done':P.readReport(state,d.id);scheduleSave();delete dialog.dataset.report;close();render();break;
 case'page':page=d.monster;render();$('#panel').scrollTop=0;break;
 case'page-turn':turnPage(+d.dir);break;
 case'toc':page=null;render();$('#panel').scrollTop=0;break;
 case'marker':document.getElementById('cat-'+d.cat)?.scrollIntoView({block:'start',behavior:still()?'auto':'smooth'});break;
 case'lab-tab':labTab=d.tab;render();break;
 case'lab-monster':labMonster=d.monster;labPick.clear();render();break;
 case'lab-pick':if(labPick.has(d.fact))labPick.delete(d.fact);else if(labPick.size<2)labPick.add(d.fact);render();break;
 case'lab-test':{const ids=d.pick?[...labPick]:[d.fact];const r=act(()=>P.labTest(state,ids),r=>r.results.map(x=>L.say(x.same?L.LINES.labSame:L.LINES.labOk,{title:fact(x.f).title,stamp:x.rev?`условно: ${fact(x.f).condTag}`:STATE_WORD[x.to]})).join(' '),'learn');if(r)labPick.clear();break;}
 case'study':studyDialog(d.monster,d.variant);break;
 case'study-fact':close();act(()=>P.studyTrophy(state,d.monster,d.variant,d.fact||null),r=>L.say(L.LINES.labOk,{title:fact(r.result.f).title,stamp:r.result.rev?`условно: ${fact(r.result.f).condTag}`:STATE_WORD[r.result.to]}),'learn');break;
 case'brew':if(act(()=>P.brew(state,d.potion,{buyMissing:d.buy==='1'}),r=>`Сварено: ${L.POT.get(d.potion).name} ×${r.made}${r.coins?` · докуплено на ${r.coins} мон.`:''}`,'brew'))scene.brew(d.potion,performance.now());break;
 case'cross-check':act(()=>P.crossCheck(state,d.fact),r=>L.say(L.LINES.archiveOk,{title:fact(r.result.f).title,stamp:r.result.rev?`условно: ${fact(r.result.f).condTag}`:STATE_WORD[r.result.to]}),'learn');break;
 case'rummage':act(()=>P.rummage(state,d.monster),r=>r.found?`В старой летописи на полях: «${fact(r.found).advice}» — записано слухом.`:L.LINES.dust,'page');break;
 case'shop-tab':shopTab=d.tab;render();break;
 case'buy':act(()=>P.buy(state,d.id,Number(d.n)),r=>`${L.partName(d.id)} ×${d.n} · −${r.coins} мон.`,'coin');break;
 case'sell':{const from=b.getBoundingClientRect();if(act(()=>P.sell(state,d.id,Number(d.n)),r=>`Продано: ${L.partName(d.id).toLowerCase()} ×${d.n} · +${r.coins} мон.`,'coin'))coinBurst(from);break;}
 case'buy-rumour':act(()=>P.buyRumour(state,Number(d.slot)),r=>`Новый слух ${L.monsterOf(r.fact).about}: «${fact(r.fact).title}»`,'seal');break;
 case'buy-book':act(()=>P.buyBook(state,d.id),r=>`Книга «${L.BOOK.get(d.id).title}» в библиотеке${r.changed?` · записей в бестиарии: ${r.changed}`:''}`,'page');break;
 case'buy-candle':act(()=>P.buyCandle(state),'Лишняя свеча на карнизе.','coin');break;
 case'copy-page':{const from=b.getBoundingClientRect();if(act(()=>P.copyPage(state,d.monster),r=>`Магистр заплатил ${L.coins(r.coins)}${r.free?' · переписал Федя':''}`,'coin'))coinBurst(from);break;}
 case'treatise':act(()=>P.writeTreatise(state,d.monster),r=>`Трактат ${mon(d.monster).about} написан · ${L.coins(r.coins)} · репутация +10`,'quill');break;
 case'leaflet':act(()=>P.leaflet(state,d.monster),r=>`Печатня заплатила ${L.coins(r.coins)}`,'coin');break;
 case'print':{const r=act(()=>P.printBestiary(state),'«Великий бестиарий» напечатан!','magic');if(r?.story)queueModal(()=>showStory(r.story),'story');break;}
 case'upgrade':act(()=>P.upgrade(state,d.id),`${L.UPGRADE.get(d.id).name} — в скриптории.`,'coin');break;
 case'equip':{const r=act(()=>P.equip(state,d.hunter,d.gear),`${hunterOf(d.hunter).short}: ${L.GEAR_OF.get(d.gear).name.toLowerCase()}.`,'coin');if(r&&dialog.open)showHunter(d.hunter);break;}
 case'decor':act(()=>P.buyDecor(state,d.id),`${L.DECOR_OF.get(d.id).name} — в скриптории.`,'coin');break;
 case'edition':act(()=>P.buyEdition(state,d.monster),`${L.EDITION.name} трактата ${mon(d.monster).about} — на полке.`,'coin');break;
 case'chronicle-tab':chronicleTab=d.tab;render();break;
 case'trophy':showTrophy(d.monster,d.variant);break;
 case'rank-path':view='chronicle';chronicleTab='path';leaveSheet();render();$('#panel').scrollTop=0;break;
 case'sky':showSky();break;
 case'reference':showReference();break;
 case'ref-jump':document.getElementById(d.id)?.scrollIntoView({block:'start',behavior:still()?'auto':'smooth'});break;
 case'keeper':keeperDialog();break;
 case'set-keeper':P.setKeeper(state,d.id);scheduleSave();keeperDialog();render();break;
 case'install':install();break;
 case'skip-night':endNight();break;
 case'confirm-end':close();endDay(true);break;
 case'toggle-sound':state.sound=!state.sound;audio.setOptions(state);audio.unlock();scheduleSave();menu();break;
 case'toggle-music':state.music=!state.music;audio.setOptions(state);audio.unlock();scheduleSave();menu();break;
 case'toggle-haptics':state.haptics=state.haptics===false;scheduleSave();menu();break;
 case'toggle-large':state.prefs.large=!state.prefs.large;applyPrefs();scheduleSave();menu();break;
 case'toggle-calm':state.prefs.calm=!state.prefs.calm;applyPrefs();scheduleSave();menu();break;
 case'export':download(loadError?sourceRaw:P.serialize(state),`bestiary-day-${state.day}.json`);if(!loadError&&!conflict){P.markBackup(state);scheduleSave();}break;
 case'legacy-export':if(legacy)download(new Blob([legacy.raw],{type:'application/json'}),legacy.file);break;
 case'import':$('#import-file').click();break;
 case'confirm-import':{const next=pendingImport;pendingImport=null;if(!next)break;close();putAside().then(kept=>{replaceGame(next);toast(kept?'Сохранение загружено. Прежний бестиарий можно вернуть в меню.':'Сохранение загружено.');});break;}
 case'restore-backup':showBackup();break;
 case'confirm-restore':close();store.loadBackup().then(async v=>{if(!v?.raw)throw new P.BestiaryError('Прежний бестиарий не найден.');const next=P.load(v.raw);if(!await putAside())throw new P.BestiaryError('Текущий бестиарий не удалось отложить. Скачай его файлом и попробуй снова.');replaceGame(next);toast(`Возвращён бестиарий дня ${next.day}. Прежний можно вернуть из меню.`);}).catch(err=>toast(err instanceof P.BestiaryError?err.message:'Прежний бестиарий не удалось прочитать.',true));break;
 case'download-backup':store.loadBackup().then(v=>{if(v?.raw)download(v.raw,`bestiary-before-import-day-${v.meta.day}.json`);}).catch(()=>toast('Файл не удалось прочитать.',true));break;
 case'reload-app':reload();break;
 case'reset-game':modal('Начать заново?',`<p>Новый бестиарий начнётся с первого дня. Нынешний отложится — его можно будет вернуть из меню, пока не начнёшь заново ещё раз.</p>${btn('confirm-reset','Начать заново','primary danger')}`);break;
 case'reset-recovery':modal('Новое сохранение',`<p>Сначала скачай повреждённый исходный файл через меню. Новый бестиарий заменит его на этом устройстве.</p>${btn('confirm-reset','Начать заново','primary danger')}`);break;
 case'confirm-reset':close();putAside().then(()=>{replaceGame(P.newGame(Date.now()>>>0),false);queueModal(welcome,'welcome');});break;
 }
});
document.addEventListener('input',e=>{if(e.target.id==='volume'){state.volume=Number(e.target.value);audio.setOptions(state);scheduleSave();}});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>4000000)throw new P.BestiaryError('Файл слишком большой для сохранения бестиария.');pendingImport=P.load(await file.text());
 modal('Загрузить этот бестиарий?',`<p>День ${pendingImport.day} · ${pendingImport.gold} мон. · репутация ${pendingImport.rep} · страниц ${Object.keys(pendingImport.monsters).length}.</p><p class="fine-print">Текущий бестиарий на устройстве будет заменён; его можно будет вернуть из меню.</p>${btn('confirm-import','Загрузить','primary')}`);}catch(error){toast(error.message,true);}e.target.value='';});
$('#menu-button').addEventListener('click',menu);
$('#end-day').addEventListener('click',()=>endDay());
dialog.addEventListener('cancel',e=>{if(conflict||!modalClosable)e.preventDefault();});
document.addEventListener('keydown',e=>{if(dialog.open||e.target.matches('input,select,textarea'))return;if(view==='bestiary'&&page&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))turnPage(e.key==='ArrowRight'?1:-1);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushSave(true);audio.pause();}else{lastFrame=performance.now();audio.resume();otherWrite(readStamp());}});
window.addEventListener('pagehide',()=>{flushSave(true);audio.pause();});
window.addEventListener('pageshow',e=>{if(e.persisted)otherWrite(readStamp());});
render();requestAnimationFrame(frame);if(!state.welcomed&&!loadError)queueModal(welcome,'welcome');
// A reload in the middle of a morning shows the reports not read yet.
if(state.welcomed&&!loadError)for(const r of state.reports.filter(r=>r.day===state.day&&!r.read))queueModal(()=>showReport(r.id),'report');
readLegacy().then(v=>{legacy=v;if(v&&!state.legacySeen&&!loadError)queueModal(showLegacy,'legacy');}).catch(()=>{});
store.loadBackup(false).then(v=>{backupMeta=v?.meta||null;}).catch(()=>{});
// The first install also fires controllerchange; only a page that already had a worker is out of date.
if('serviceWorker'in navigator){const controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!controlled||updateReady)return;updateReady=true;toast('Доступна новая версия',false,{action:'reload-app',label:'Обновить',icon:'download'});});navigator.serviceWorker.register('./sw.js').catch(()=>{});}
