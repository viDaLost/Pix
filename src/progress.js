// Progress beyond the core rules. Every optional field added after save version 3 is repaired here and
// nowhere else, and every game action of the interface goes through these wrappers so no progress is skipped.
import * as J from './jewelry.js';
import * as B from './book.js';
export {CHAPTERS,VELVETS,DECOR,MARKS,catalogKeys,chapterKeys,keyName,bookTotal,bookCount,chapterDone} from './book.js';
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const count=v=>Number.isInteger(v)&&v>=0&&v<=1e9?v:0;
const day=v=>Number.isInteger(v)&&v>=0&&v<=1e9;
const list=(v,ok,max)=>Array.isArray(v)?[...new Set(v.filter(ok))].slice(0,max):[];
const BOOK_KEY=/^[a-z]+:[a-z0-9.+]{1,40}$/,TYPE_IDS=J.TYPES.map(t=>t.id),CLIENT_IDS=J.CLIENTS.map(p=>p.id),MARK_IDS=B.MARKS.map(m=>m.id),CHAPTER_IDS=B.CHAPTERS.map(c=>c.id),VELVET_IDS=B.VELVETS.map(v=>v.id),DECOR_IDS=B.DECOR.map(v=>v.id);
const guard=fn=>{try{fn();}catch{}};
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
  if(obj(old.e))for(const k of Object.keys(old.e))if(BOOK_KEY.test(k)&&day(old.e[k])&&Object.keys(e).length<400)e[k]=old.e[k];
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
 return s;
}
const ready=s=>{if(!obj(s.stats)||!obj(s.daily)||!Array.isArray(s.daily.types)||!obj(s.book)||!obj(s.cosmetics)||!Number.isInteger(s.rep))normalize(s);return s;};
const soldType=(s,type)=>{if(!s.daily.types.includes(type)&&s.daily.types.length<6)s.daily.types.push(type);};
const gain=(s,n)=>{s.rep+=n;s.daily.rep+=n;return n;};
// Marks are earned once each; checking again changes nothing.
export function checkMarks(s,event,ctx={}){const won=[];for(const m of B.MARKS){if(m.soon||m.event!==event||m.id in s.book.m||Object.keys(s.book.m).length>=64)continue;let ok=false;try{ok=!!m.test(s,ctx);}catch{}if(ok){s.book.m[m.id]=s.day;gain(s,3);won.push(m);}}return won;}
// After any gain: whole chapters (+10 and their velvet), the next mark chapter, and what a new rank opens.
function settle(s,before,result){const marks=[...(result.marks||[]),...checkMarks(s,'book')],chapters=[];
 for(const c of B.CHAPTERS)if(!s.book.pages.includes(c.id)&&B.chapterDone(s.book,c.id)){s.book.pages.push(c.id);gain(s,10);chapters.push(c);const v=B.VELVETS.find(v=>v.chapter===c.id);if(v&&!s.cosmetics.owned.includes(v.id))s.cosmetics.owned.push(v.id);}
 const rank=J.rankOf(s);for(const v of B.VELVETS)if(v.rank&&rank>=v.rank&&!s.cosmetics.owned.includes(v.id))s.cosmetics.owned.push(v.id);
 return {...result,marks,chapters,rep:s.rep-before.rep,rank,rankUp:rank>before.rank};}
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
export function sell(s,id,buyerId,policy='fair'){ready(s);const before=snap(s),gold=s.gold,item=s.stock.find(i=>i.id===id),buyer=s.customers.find(c=>c.id===buyerId),q=J.sell(s,id,buyerId,policy),full=q.demand.factor===1&&q.price>=q.fair*.95;soldType(s,item.design.type);
 if(full){const first=!s.stats.clients[buyer.client];s.stats.clients[buyer.client]=(s.stats.clients[buyer.client]||0)+1;gain(s,1+(q.fit>=70?1:0)+(q.freshFamily?2:0)+(first?2:0)+(buyer.novel===true?2:0));}
 return {...q,...settle(s,before,{marks:checkMarks(s,'sell',{item,q,buyer,before:gold})}),full,client:buyer.client,novel:buyer.novel===true};}
export function deliver(s,id,itemId){ready(s);const before=snap(s),r=s.requests.find(r=>r.id===id),item=s.stock.find(i=>i.id===itemId),reward=J.deliver(s,id,itemId);s.stats.orders++;soldType(s,item.design.type);J.note(s,`Заказ «${r.title}» выполнен: ${reward} мон.`,'order');gain(s,4);
 return settle(s,before,{reward,request:r,marks:checkMarks(s,'deliver',{item,request:r})});}
export function gather(s,id){ready(s);const found=J.gather(s,id);s.stats.gathers++;return found;}
// The core day reset knows only the original counters; the extras start afresh here.
export function nextDay(s){ready(s);const prev={...s.daily,areas:[...s.daily.areas],firsts:[...s.daily.firsts],types:[...s.daily.types]};J.nextDay(s);Object.assign(s.daily,{rep:0,firsts:[],types:[]});return prev;}
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
