// Progress beyond the core rules. Every optional field added after save version 3 is repaired here and
// nowhere else, and every game action of the interface goes through these wrappers so no progress is skipped.
import * as J from './jewelry.js';
import * as B from './book.js';
import * as H from './people.js';
import * as G from './guild.js';
export {CHAPTERS,VELVETS,DECOR,MARKS,catalogKeys,chapterKeys,keyName,bookTotal,bookCount,chapterDone} from './book.js';
export {LETTERS,LETTER_IDS,letter,PRIVILEGES,NAMED,MEMORY,TYPE_PHRASE,OF,bondName,memoryLine,lastLine} from './people.js';
export {THEMES,themeOf,themeOfWeek,weekOf,daysLeft,judge,medalOf,medalWithin,prizeGem,MEDALS,RIBBONS,MEDAL_REP,TRIES,PARTS,VERDICT} from './guild.js';
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const count=v=>Number.isInteger(v)&&v>=0&&v<=1e9?v:0;
const day=v=>Number.isInteger(v)&&v>=0&&v<=1e9;
const list=(v,ok,max)=>Array.isArray(v)?[...new Set(v.filter(ok))].slice(0,max):[];
const BOOK_KEY=/^[a-z]+:[a-z0-9.+]{1,40}$/,THEME_IDS=G.THEMES.map(t=>t.id),TYPE_IDS=J.TYPES.map(t=>t.id),CLIENT_IDS=J.CLIENTS.map(p=>p.id),MARK_IDS=B.MARKS.map(m=>m.id),CHAPTER_IDS=B.CHAPTERS.map(c=>c.id),VELVET_IDS=B.VELVETS.map(v=>v.id),DECOR_IDS=B.DECOR.map(v=>v.id);
const guard=fn=>{try{fn();}catch{}};
// Every entry the book can hold; anything else in a file is dropped, so a forged key can never block real ones.
const ENTRIES=new Set(B.CHAPTERS.filter(c=>c.id!=='marks').flatMap(c=>B.chapterKeys(c.id)));
// A workshop from before the book: what is on the showcase and in the models is written in with day 0 («до книги»),
// without rewards. Old pieces have no pattern marks, so their patterns count as own engraving.
function bookFrom(s){const e={};for(const i of[...(Array.isArray(s.stock)?s.stock:[]),...(Array.isArray(s.library)?s.library:[])])guard(()=>{for(const k of B.catalogKeys(i.design))if(!(k in e))e[k]=0;});
 const book={e,m:count(s.crafted)>=1?{'first-piece':0}:{},pages:[]};book.pages=CHAPTER_IDS.filter(id=>B.chapterDone(book,id));return book;}
// Never throws: a broken optional field falls back to its default instead of blocking the whole save.
export function normalize(s){
 if(!obj(s))return s;
 guard(()=>{if(!(Number.isInteger(s.worldSeed)&&s.worldSeed>=0&&s.worldSeed<=4294967295))s.worldSeed=J.hash32(['world',s.stock?.[0]?.id,s.nextId,s.day].join(':'));});
 guard(()=>{if(!obj(s.daily))s.daily={sales:0,areas:[],income:0,made:0};const d=s.daily;for(const key of['sales','income','made','rep'])d[key]=count(d[key]);d.areas=list(d.areas,id=>J.AREAS.some(a=>a.id===id),3);d.firsts=list(d.firsts,k=>typeof k==='string'&&BOOK_KEY.test(k),40);d.types=list(d.types,id=>TYPE_IDS.includes(id),6);});
 guard(()=>{const old=obj(s.stats)?s.stats:{},clients={};if(obj(old.clients))for(const id of CLIENT_IDS)if(count(old.clients[id]))clients[id]=count(old.clients[id]);s.stats={...old,clients,orders:count(old.orders),gathers:count(old.gathers)};});
 guard(()=>{s.log=Array.isArray(s.log)?s.log.map(J.logEntry).filter(Boolean).slice(0,J.LOG_LIMIT):[];});
 // Half sales and the first full sale of a design family; a missing flag keeps the meaning it had in older saves.
 guard(()=>{if(Array.isArray(s.demand))for(const f of s.demand)if(obj(f)){if('soft'in f&&f.soft!==0&&f.soft!==1)delete f.soft;if('full'in f&&typeof f.full!=='boolean')delete f.full;}});
 guard(()=>{const p=obj(s.prefs)?s.prefs:{};s.prefs={...p,large:p.large===true,calm:p.calm===true};});
 guard(()=>{if(!obj(s.book)){s.book=bookFrom(s);return;}const old=s.book,e={},m={};
  if(obj(old.e))for(const k of Object.keys(old.e))if(ENTRIES.has(k)&&day(old.e[k])&&Object.keys(e).length<400)e[k]=old.e[k];
  if(obj(old.m))for(const k of Object.keys(old.m))if(MARK_IDS.includes(k)&&day(old.m[k]))m[k]=old.m[k];
  s.book={e,m,pages:list(old.pages,id=>CHAPTER_IDS.includes(id),CHAPTER_IDS.length)};});
 // A workshop that predates reputation is credited with its work, up to the step below «Старшина цеха», and is
 // told so once («Мастерская обновилась»). A damaged value is credited the same way, without the notice.
 guard(()=>{if(!(Number.isInteger(s.rep)&&s.rep>=0&&s.rep<=1e9)){const before=!('rep'in s);s.rep=Math.min(239,2*count(s.crafted)+count(s.sold)+Object.keys(s.book?.e||{}).length);if(before&&count(s.crafted)>0)s.upgraded=true;}if('upgraded'in s&&s.upgraded!==true)delete s.upgraded;});
 guard(()=>{const rank=J.rankOf(s);s.rankSeen=Number.isInteger(s.rankSeen)&&s.rankSeen>=0?Math.min(s.rankSeen,rank):rank;});
 // What the book and the rank have opened is never lost, even from a damaged list.
 guard(()=>{const c=obj(s.cosmetics)?s.cosmetics:{},owned=new Set(['teal',...list(c.owned,id=>VELVET_IDS.includes(id),VELVET_IDS.length)]),rank=J.rankOf(s);
  for(const v of B.VELVETS)if(v.chapter&&s.book.pages.includes(v.chapter)||v.rank&&rank>=v.rank)owned.add(v.id);
  s.cosmetics={velvet:owned.has(c.velvet)?c.velvet:'teal',owned:VELVET_IDS.filter(id=>owned.has(id)),decor:DECOR_IDS.filter(id=>list(c.decor,v=>DECOR_IDS.includes(v),DECOR_IDS.length).includes(id))};});
 guard(()=>{if(Array.isArray(s.customers))for(const c of s.customers)if(obj(c)&&'novel'in c&&typeof c.novel!=='boolean')delete c.novel;});
 // Friendship of known residents only. The step already rewarded never exceeds the step of the points, and a file
 // without it owes no rewards: nothing is handed out twice.
 guard(()=>{const old=obj(s.bonds)?s.bonds:{},bonds={};for(const id of CLIENT_IDS){const b=old[id];if(!obj(b))continue;const p=count(b.p),top=J.levelFor(p),v={p,lv:Number.isInteger(b.lv)&&b.lv>=0?Math.min(b.lv,top):top,last:lastOf(b.last)};if(b.pending===true&&v.lv>=4)v.pending=true;bonds[id]=v;}s.bonds=bonds;});
 guard(()=>{const seen=new Set();s.mail=(Array.isArray(s.mail)?s.mail:[]).filter(m=>obj(m)&&H.LETTER_IDS.includes(m.id)&&!seen.has(m.id)&&seen.add(m.id)).slice(0,MAIL_LIMIT).map(m=>({id:m.id,day:day(m.day)?m.day:0,read:m.read===true}));});
 // Orders: the flags of named orders, one ordinary and one named order per resident, never more than eight (finished
 // ones go first, then ordinary ones), so the core check of a save always passes.
 guard(()=>{if(!Array.isArray(s.requests))return;const seen=new Set(),list=[];
  for(const r of s.requests){if(!obj(r))continue;if('keep'in r&&typeof r.keep!=='boolean')delete r.keep;if('bond'in r&&(r.keep!==true||!CLIENT_IDS.includes(r.bond)))delete r.bond;if('reward'in r)r.reward=r.keep===true&&r.reward===1.6?1.6:1.15;const k=r.client+(r.keep===true?':named':'');if(seen.has(k))continue;seen.add(k);list.push(r);}
  while(list.length>8){let i=list.findIndex(r=>r.done===true);if(i<0)i=list.findLastIndex(r=>r.keep!==true);list.splice(i<0?list.length-1:i,1);}s.requests=list;});
 // The guild review: a week from the past is closed into the history; a ribbon must name a medal and a week.
 guard(()=>{const g=obj(s.guild)?s.guild:{},w=G.weekOf(count(s.day)||1),entry=h=>obj(h)&&day(h.w)&&THEME_IDS.includes(h.theme)&&[0,1,2,3].includes(h.medal)&&Number.isInteger(h.score)&&h.score>=0&&h.score<=100&&typeof h.name==='string'?{w:h.w,theme:h.theme,medal:h.medal,score:h.score,name:h.name.slice(0,48)}:null;
  s.guild={week:day(g.week)&&g.week<=w?g.week:w,best:[0,1,2,3].includes(g.best)?g.best:0,tried:list(g.tried,id=>typeof id==='string'&&/^jewel-[1-9][0-9]*$/.test(id),G.TRIES),score:Number.isInteger(g.score)&&g.score>=0&&g.score<=100?g.score:0,name:typeof g.name==='string'?g.name.slice(0,48):'',seen:g.seen===true,history:(Array.isArray(g.history)?g.history:[]).map(entry).filter(Boolean).slice(0,52)};rollWeek(s);});
 guard(()=>{if(Array.isArray(s.stock))for(const i of s.stock)if(obj(i)&&'ribbon'in i){if(obj(i.ribbon)&&[1,2,3].includes(i.ribbon.medal)&&day(i.ribbon.w))i.ribbon={w:i.ribbon.w,medal:i.ribbon.medal};else delete i.ribbon;}});
 return s;
}
const MAIL_LIMIT=64;
const lastOf=v=>obj(v)&&TYPE_IDS.includes(v.type)&&typeof v.name==='string'&&v.name.length<=48&&day(v.day)?{type:v.type,name:v.name,day:v.day}:null;
// The week turns: its best result goes into the history if anything was entered, and the new week starts empty.
function rollWeek(s){const g=s.guild,w=G.weekOf(s.day);if(g.week===w)return null;const done=g.tried.length?{w:g.week,theme:G.themeOfWeek(g.week).id,medal:g.best,score:g.score,name:g.name}:null;
 if(done){g.history.unshift(done);if(g.history.length>52)g.history.length=52;}Object.assign(g,{week:w,best:0,tried:[],score:0,name:'',seen:false});return done;}
const ready=s=>{if(!obj(s.stats)||!obj(s.daily)||!Array.isArray(s.daily.types)||!obj(s.book)||!obj(s.cosmetics)||!Number.isInteger(s.rep)||!obj(s.bonds)||!Array.isArray(s.mail)||!obj(s.guild))normalize(s);return s;};
const soldType=(s,type)=>{if(!s.daily.types.includes(type)&&s.daily.types.length<6)s.daily.types.push(type);};
const gain=(s,n)=>{s.rep+=n;s.daily.rep+=n;return n;};
// Marks are earned once each; checking again changes nothing.
export function checkMarks(s,event,ctx={}){const won=[];for(const m of B.MARKS){if(m.soon||m.event!==event||m.id in s.book.m||Object.keys(s.book.m).length>=64)continue;let ok=false;try{ok=!!m.test(s,ctx);}catch{}if(ok){s.book.m[m.id]=s.day;gain(s,3);won.push(m);}}return won;}
// After any gain: whole chapters (+10 and their velvet), the next mark chapter, and what a new rank opens.
function settle(s,before,result){const marks=[...(result.marks||[]),...checkMarks(s,'book'),...checkMarks(s,'bond')],chapters=[],letters=[...(result.letters||[])];
 for(const c of B.CHAPTERS)if(!s.book.pages.includes(c.id)&&B.chapterDone(s.book,c.id)){s.book.pages.push(c.id);gain(s,10);chapters.push(c);const v=B.VELVETS.find(v=>v.chapter===c.id);if(v&&!s.cosmetics.owned.includes(v.id))s.cosmetics.owned.push(v.id);}
 const rank=J.rankOf(s);for(const v of B.VELVETS)if(v.rank&&rank>=v.rank&&!s.cosmetics.owned.includes(v.id))s.cosmetics.owned.push(v.id);
 // The lighthouse of the highest rank is lit with a letter from Элин.
 if(rank>=J.RANKS.length-1)send(s,'elin-epilogue',letters);
 return {...result,marks,chapters,letters,rep:s.rep-before.rep,rank,rankUp:rank>before.rank};}
// What a step of friendship brought: new steps, letters, named orders placed and those waiting for room.
const story=()=>({steps:[],letters:[],named:[],waiting:[]});
function send(s,id,letters){if(s.mail.some(m=>m.id===id)||!H.letter(id))return;s.mail.unshift({id,day:s.day,read:false});if(s.mail.length>MAIL_LIMIT)s.mail.length=MAIL_LIMIT;letters.push(id);
 J.note(s,`Письмо от ${H.OF[H.letter(id).from]}`,'letter');}
const bondOf=(s,id)=>s.bonds[id]||(s.bonds[id]={p:0,lv:0,last:null});
// A named order goes on the list only while there is room: never more than eight orders and one named order a resident.
function placeNamed(s,id){const b=bondOf(s,id),t=H.NAMED[id];if(!t||s.requests.some(r=>r.keep===true&&r.client===id)){delete b.pending;return null;}
 if(s.requests.length>=8){b.pending=true;return null;}const r={client:id,...t,id:'request-'+s.nextId++,keep:true,bond:id,reward:1.6,until:s.day,done:false};s.requests.unshift(r);delete b.pending;J.note(s,`Именной заказ от ${H.OF[id]}: «${t.title}»`,'order');return r;}
// Friendship only grows. Each new step is rewarded once: letters at the second, third and fifth, a named order at the
// fourth, and at the fifth ten reputation and (through settle) the mark «Близкий друг».
function befriend(s,id,n,news){if(!CLIENT_IDS.includes(id))return;const b=bondOf(s,id);if(n>0)b.p+=n;const top=J.levelFor(b.p);
 while(b.lv<top){b.lv++;news.steps.push({id,level:b.lv});if([2,3,5].includes(b.lv))send(s,`${id}-${b.lv}`,news.letters);if(b.lv===4){const r=placeNamed(s,id);if(r)news.named.push(r);else if(b.pending)news.waiting.push(id);}if(b.lv===5)gain(s,10);}}
// Each sale and order is remembered: the resident may speak of it on a later day.
const keepsake=(s,id,d)=>{bondOf(s,id).last={type:d.type,name:d.name.slice(0,48),day:s.day};};
const snap=s=>({rep:s.rep,rank:J.rankOf(s)});
export const newGame=seed=>normalize(J.newGame(seed));
// A file with an odd structure (null where a record should be) reads as damaged, never as a raw script error.
export function load(raw){try{return normalize(J.deserialize(raw));}catch(e){throw e instanceof J.AtelierError?e:new J.AtelierError('Файл сохранения повреждён.');}}
// The keys of a design that the book does not have yet; cheap enough for every change in the editor.
export const novelKeys=(s,d,e)=>B.catalogKeys(d,e).filter(k=>!(k in s.book.e));
// A finished piece writes what is new to the book: one reputation for each of the first four entries.
export function complete(s){ready(s);const before=snap(s),item=J.complete(s),d=item.design,e=J.evaluate(d),fresh=novelKeys(s,d,e);
 for(const k of fresh){if(Object.keys(s.book.e).length<400)s.book.e[k]=s.day;if(s.daily.firsts.length<40&&!s.daily.firsts.includes(k))s.daily.firsts.push(k);}gain(s,Math.min(4,fresh.length));
 return settle(s,before,{item,fresh,marks:checkMarks(s,'complete',{item,d,e})});}
// A full sale is one that counts toward demand: fresh design and at least 95% of the fair price. Only a full sale
// earns reputation: +1, +1 for a fit of 70, +2 for a design new to the port, +2 for this resident's first, +2 for the connoisseur.
// Friendship grows in steps, not sums: a full sale gives 1 from a fit of 60 and 2 from 80, and a discount to a guest
// whose purse is short of the fair price gives 2 («по-доброму»). A saturated design gives nothing.
export function sell(s,id,buyerId,policy='fair'){ready(s);const before=snap(s),gold=s.gold,item=s.stock.find(i=>i.id===id),buyer=s.customers.find(c=>c.id===buyerId),q=J.sell(s,id,buyerId,policy),full=q.demand.factor===1&&q.price>=q.fair*.95;soldType(s,item.design.type);
 if(full){const first=!s.stats.clients[buyer.client];s.stats.clients[buyer.client]=(s.stats.clients[buyer.client]||0)+1;gain(s,1+(q.fit>=70?1:0)+(q.freshFamily?2:0)+(first?2:0)+(buyer.novel===true?2:0));}
 const kind=!full&&q.demand.factor===1&&q.price<q.fair&&buyer.budget<q.fair,points=full?(q.fit>=80?2:q.fit>=60?1:0):kind?2:0,news=story();keepsake(s,buyer.client,item.design);befriend(s,buyer.client,points,news);
 return {...q,...settle(s,before,{...news,bond:{id:buyer.client,points,kind},marks:checkMarks(s,'sell',{item,q,buyer,before:gold})}),full,client:buyer.client,novel:buyer.novel===true};}
export function deliver(s,id,itemId){ready(s);const before=snap(s),r=s.requests.find(r=>r.id===id),item=s.stock.find(i=>i.id===itemId),reward=J.deliver(s,id,itemId),news=story();s.stats.orders++;soldType(s,item.design.type);J.note(s,`Заказ «${r.title}» выполнен: ${reward} мон.`,'order');gain(s,4);
 keepsake(s,r.client,item.design);befriend(s,r.client,3,news);
 return settle(s,before,{...news,bond:{id:r.client,points:3},reward,request:r,marks:checkMarks(s,'deliver',{item,request:r})});}
// Friends of the third step add to a search: Брен on the ridge, Элин on the shore, Рован in the abbey garden.
export function gather(s,id){ready(s);const found=J.gather(s,id),extra=[];s.stats.gathers++;
 const add=(by,mat,n)=>{s.materials[mat]+=n;extra.push({by,id:mat,n});};
 if(id==='ridge'&&J.privileged(s,'bren'))add('bren','silver',2);if(id==='shore'&&J.privileged(s,'elin'))add('elin',found.gem,1);if(id==='garden'&&J.privileged(s,'rowan'))add('rowan','copper',2);
 return {...found,extra};}
// The core day reset knows only the original counters; the extras start afresh here.
// Named orders that waited for room are placed before the ordinary ones fill the list; Мира as a friend leaves a stone
// at the door every third day; a new week closes the guild review of the old one.
export function nextDay(s){ready(s);const prev={...s.daily,areas:[...s.daily.areas],firsts:[...s.daily.firsts],types:[...s.daily.types]},named=[];
 J.nextDay(s,()=>{for(const id of CLIENT_IDS)if(s.bonds[id]?.pending){const r=placeNamed(s,id);if(r)named.push(r);}});Object.assign(s.daily,{rep:0,firsts:[],types:[]});
 let gift=null;if(J.privileged(s,'mira')&&s.day%3===0){gift={by:'mira',id:s.day%2===0?'garnet':'amethyst',n:1};s.materials[gift.id]++;}
 const week=rollWeek(s);return Object.assign(prev,{named,gift,week,theme:week||s.day%7===1?G.themeOf(s.day):null});}
export function buy(s,id,n=1){ready(s);return J.buy(s,id,n);}
export function learn(s,id){ready(s);return J.learn(s,id);}
// Velvets and shop furnishings: the default, chapter and rank velvets are opened by play, the rest bought once for coins.
export function buyCosmetic(s,id){ready(s);const v=B.VELVETS.find(v=>v.id===id),f=B.DECOR.find(v=>v.id===id),item=v||f,have=v?s.cosmetics.owned:s.cosmetics.decor;
 if(!item?.price)throw new J.AtelierError('Это не продаётся: бархат открывается главой книги или званием.');if(have.includes(id))throw new J.AtelierError('Это уже есть в лавке.');if(s.gold<item.price)throw new J.AtelierError(`Не хватает монет: нужно ${item.price}.`);
 s.gold-=item.price;have.push(id);if(v)s.cosmetics.velvet=id;J.note(s,`Куплено для лавки: ${item.name}`,'shop');return item;}
export function useVelvet(s,id){ready(s);if(!s.cosmetics.owned.includes(id))throw new J.AtelierError('Этот бархат ещё не открыт.');s.cosmetics.velvet=id;return B.VELVETS.find(v=>v.id===id);}
// What was taken apart and what it gave back: the interface keeps it until the next action to offer «Вернуть».
export function recycle(s,id){ready(s);const at=s.stock.findIndex(i=>i.id===id),item=s.stock[at],before={...s.materials};J.recycle(s,id);return {item,at,returned:Object.fromEntries(Object.keys(s.materials).filter(k=>s.materials[k]!==before[k]).map(k=>[k,s.materials[k]-before[k]]))};}
export function unrecycle(s,undo){ready(s);const ok=undo?.item&&!s.stock.some(i=>i.id===undo.item.id)&&s.stock.length<J.MAX_STOCK&&Object.entries(undo.returned||{}).every(([k,n])=>s.materials[k]>=n);if(!ok)throw new J.AtelierError('Это изделие уже не вернуть.');for(const[k,n]of Object.entries(undo.returned))s.materials[k]-=n;s.stock.splice(Math.min(undo.at,s.stock.length),0,undo.item);return undo.item;}
const needDraft=s=>{if(!s.draft)throw new J.AtelierError('Нет текущего изделия.');return s.draft.design;};
export function buyShortfall(s){ready(s);return J.buyShortfall(s,needDraft(s));}
// Buying what the draft lacks and finishing it is one step: if the piece cannot be finished, coins and stocks come back.
export function buyAndComplete(s){ready(s);const d=needDraft(s),need=J.shortfall(s,d).reduce((n,v)=>n+v.price,0)+J.costs(d).coins;if(s.gold<need)throw new J.AtelierError(`Не хватает монет: нужно ${need}, в кошельке ${s.gold}.`);
 const gold=s.gold,materials={...s.materials};try{const bought=J.buyShortfall(s,d);return {...complete(s),bought};}catch(e){s.gold=gold;s.materials=materials;throw e;}}
// The guild review: up to three pieces of the showcase a week, each once; a piece stays on the showcase. Only a better
// medal of the week is rewarded: the difference of reputation, the stones of each step reached for the first time, and
// the friendship of the theme's host. Any medal ribbons the piece if it is better than its ribbon. Everything is checked
// before anything changes.
export function enterContest(s,itemId){ready(s);rollWeek(s);const g=s.guild,item=s.stock.find(i=>i.id===itemId),theme=G.themeOf(s.day);
 if(!item)throw new J.AtelierError('Этой работы уже нет на витрине.');if(g.tried.includes(itemId))throw new J.AtelierError('Эта работа уже была на смотре этой недели.');if(g.tried.length>=G.TRIES)throw new J.AtelierError('На этой неделе цех уже принял три работы.');
 const before=snap(s),{score,parts}=G.judge(s,item.design,theme),medal=G.medalOf(score),prev=g.best,gems=[],news=story();
 g.tried.push(itemId);if(score>g.score||!g.name){g.score=score;g.name=item.design.name.slice(0,48);}
 if(medal>prev){gain(s,G.MEDAL_REP[medal]-G.MEDAL_REP[prev]);const gem=G.prizeGem(s,theme),k=J.rankOf(s)>=4?2:1;for(let m=prev+1;m<=medal;m++){s.materials[gem]+=m*k;gems.push({id:gem,n:m*k});}g.best=medal;befriend(s,theme.host,medal-prev,news);}
 const ribbon=medal>J.ribbonOf(item);if(ribbon)item.ribbon={w:g.week,medal};
 J.note(s,`Смотр «${theme.name}»: «${item.design.name}» — ${medal?G.MEDALS[medal].toLowerCase():'похвальный отзыв'}, ${score}`,'guild');
 return settle(s,before,{...news,score,parts,medal,prev,improved:medal>prev,gems,theme,item,ribbon,marks:checkMarks(s,'contest',{medal,item})});}
// A reason to think twice before ending the day: the theme closes tonight and nothing has been entered yet.
export const themeEnding=s=>s.day%7===0&&!s.guild?.tried?.length&&s.stock.length>0?G.themeOf(s.day):null;
// A letter is read once it has been opened.
export function readLetter(s,id){ready(s);const m=s.mail.find(m=>m.id===id);if(m)m.read=true;return H.letter(id);}
export const unread=s=>Array.isArray(s.mail)?s.mail.filter(m=>!m.read).length:0;
