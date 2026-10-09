// Progress beyond the core rules. Every optional field added after save version 3 is repaired here and
// nowhere else, and every game action of the interface goes through these wrappers so no progress is skipped.
import * as J from './jewelry.js';
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const count=v=>Number.isInteger(v)&&v>=0&&v<=1e9?v:0;
const list=(v,ok,max)=>Array.isArray(v)?[...new Set(v.filter(ok))].slice(0,max):[];
const BOOK_KEY=/^[a-z]+:[a-z0-9.+]{1,40}$/,TYPE_IDS=J.TYPES.map(t=>t.id),CLIENT_IDS=J.CLIENTS.map(p=>p.id);
const guard=fn=>{try{fn();}catch{}};
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
 return s;
}
const ready=s=>{if(!obj(s.stats)||!obj(s.daily)||!Array.isArray(s.daily.types))normalize(s);return s;};
const soldType=(s,type)=>{if(!s.daily.types.includes(type)&&s.daily.types.length<6)s.daily.types.push(type);};
export const newGame=seed=>normalize(J.newGame(seed));
// A file with an odd structure (null where a record should be) reads as damaged, never as a raw script error.
export function load(raw){try{return normalize(J.deserialize(raw));}catch(e){throw e instanceof J.AtelierError?e:new J.AtelierError('Файл сохранения повреждён.');}}
export function complete(s){ready(s);const item=J.complete(s);return {item};}
// A full sale is one that counts toward demand: fresh design and at least 95% of the fair price.
export function sell(s,id,buyerId,policy='fair'){ready(s);const item=s.stock.find(i=>i.id===id),buyer=s.customers.find(c=>c.id===buyerId),q=J.sell(s,id,buyerId,policy),full=q.demand.factor===1&&q.price>=q.fair*.95;soldType(s,item.design.type);if(full)s.stats.clients[buyer.client]=(s.stats.clients[buyer.client]||0)+1;return {...q,full,client:buyer.client};}
export function deliver(s,id,itemId){ready(s);const r=s.requests.find(r=>r.id===id),item=s.stock.find(i=>i.id===itemId),reward=J.deliver(s,id,itemId);s.stats.orders++;soldType(s,item.design.type);J.note(s,`Заказ «${r.title}» выполнен: ${reward} монет`,'order');return {reward,request:r};}
export function gather(s,id){ready(s);const found=J.gather(s,id);s.stats.gathers++;return found;}
// The core day reset knows only the original counters; the extras start afresh here.
export function nextDay(s){ready(s);const prev={...s.daily,areas:[...s.daily.areas],firsts:[...s.daily.firsts],types:[...s.daily.types]};J.nextDay(s);Object.assign(s.daily,{rep:0,firsts:[],types:[]});return prev;}
export function buy(s,id,n=1){ready(s);return J.buy(s,id,n);}
export function learn(s,id){ready(s);return J.learn(s,id);}
// What was taken apart and what it gave back: the interface keeps it until the next action to offer «Вернуть».
export function recycle(s,id){ready(s);const at=s.stock.findIndex(i=>i.id===id),item=s.stock[at],before={...s.materials};J.recycle(s,id);return {item,at,returned:Object.fromEntries(Object.keys(s.materials).filter(k=>s.materials[k]!==before[k]).map(k=>[k,s.materials[k]-before[k]]))};}
export function unrecycle(s,undo){ready(s);const ok=undo?.item&&!s.stock.some(i=>i.id===undo.item.id)&&s.stock.length<J.MAX_STOCK&&Object.entries(undo.returned||{}).every(([k,n])=>s.materials[k]>=n);if(!ok)throw new J.AtelierError('Это изделие уже не вернуть.');for(const[k,n]of Object.entries(undo.returned))s.materials[k]-=n;s.stock.splice(Math.min(undo.at,s.stock.length),0,undo.item);return undo.item;}
const needDraft=s=>{if(!s.draft)throw new J.AtelierError('Нет текущего изделия.');return s.draft.design;};
export function buyShortfall(s){ready(s);return J.buyShortfall(s,needDraft(s));}
// Buying what the draft lacks and finishing it is one step: if the piece cannot be finished, coins and stocks come back.
export function buyAndComplete(s){ready(s);const d=needDraft(s),need=J.shortfall(s,d).reduce((n,v)=>n+v.price,0)+J.costs(d).coins;if(s.gold<need)throw new J.AtelierError(`Не хватает монет: нужно ${need}, в кошельке ${s.gold}.`);
 const gold=s.gold,materials={...s.materials};try{const bought=J.buyShortfall(s,d);return {...complete(s),bought};}catch(e){s.gold=gold;s.materials=materials;throw e;}}
