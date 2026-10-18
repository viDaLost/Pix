// The core of the bestiary (GDD 1–5, 12): the state, strict loading, the knowledge of the player, the guests and cases of
// a day, the night of the hunts and the reports, and every action of the scriptorium. No DOM. Every action checks all it
// needs first and changes nothing when it refuses: it returns {ok:false, why} with a Russian reason for a toast.
// Story, arcs, normalize and the order of the night live in progress.js; the interface goes only through P.*.
import * as L from './lore.js';
import * as R from './rules.js';
import {roll,pick,weighted} from './rng.js';
import {season,weatherFor} from './ambience.js';

export class BestiaryError extends Error{}
export const VERSION=1,SAVE_KEY='pix-bestiary-save-v1',SAVE_LIMIT=4e6;
export const LEGACY_TEXT='Это сохранение прежней игры «Сияние». Его можно скачать в меню; в бестиарий оно не переносится.';
export const STATS=['hunts','wins','fails','harmful','resolved','revealed','treatises','earned','spent','academy','pagesSold','town'];
export const SOURCES=['start','book','shop','vedana','nikodim','town','tale','hunt','lab','trophy','archive','rummage','story'];
export const LAB_CTX={variant:'grown',weather:'clear',season:0};
const check=(ok,msg)=>{if(!ok)throw new BestiaryError(msg);};
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const fail=why=>({ok:false,why});
export const freshDaily=()=>({candles:0,extra:false,talks:0,income:0,spent:0,rep:0,copied:false,firsts:[]});

export function newState(seed){
 const worldSeed=Number.isInteger(seed)&&seed>=0&&seed<=4294967295?seed:Math.floor(Math.random()*4294967296);
 return {world:'bestiary',version:VERSION,contentVersion:L.CONTENT_VERSION,savedAt:0,worldSeed,day:1,gold:40,rep:0,rankSeen:0,nextId:1,kv:0,
  daily:freshDaily(),know:{},monsters:{},stock:{},notes:{},potions:{},recipes:[],books:[],upgrades:[],decor:[],editions:[],
  hunters:{},arcs:[],personal:{},visitors:[],contracts:[],hunts:[],reports:[],trader:{day:0,rumours:[]},
  story:{seen:[],days:{},hold:false,thaw:0,koldun:0},chronicle:[],stats:Object.fromEntries(STATS.map(k=>[k,0])),
  printed:0,keeper:'keeper_a',tutorial:{done:[],skipped:false,finished:false},hintsSeen:[],
  prefs:{large:false,calm:false},haptics:true,sound:false,music:false,volume:.35,welcomed:false,legacySeen:false,backup:1};}
export const serialize=s=>JSON.stringify(s);
// Strict reading (GDD 12.3): only what would make the game meaningless is refused; the rest is for normalize.
export function deserialize(raw){
 check(typeof raw==='string'&&raw.length<=SAVE_LIMIT,'Файл слишком большой для сохранения бестиария.');let s;
 try{s=JSON.parse(raw);}catch{throw new BestiaryError('Файл сохранения повреждён.');}
 check(obj(s),'Файл сохранения повреждён.');
 if(s.world!=='bestiary'){check(!(s.world==='jewel'||obj(s.resources)&&Array.isArray(s.technologies)),LEGACY_TEXT);throw new BestiaryError('Это не сохранение бестиария. Исходный файл не изменён.');}
 check(s.version===VERSION,'Эта версия сохранения бестиария не поддерживается.');
 check(Number.isInteger(s.worldSeed)&&s.worldSeed>=0&&s.worldSeed<=4294967295,'Повреждено зерно мира.');
 check(Number.isInteger(s.day)&&s.day>=1&&s.day<=100000,'Повреждён календарь.');
 for(const k of['gold','rep','nextId'])check(Number.isInteger(s[k])&&s[k]>=0&&s[k]<=1e9,'Повреждён прогресс.');
 check(obj(s.know)&&obj(s.monsters),'Повреждены записи бестиария.');
 return s;}

// ---- small helpers
export const newId=(s,p)=>`${p}-${s.nextId++}`;
export const seasonOf=s=>s.story.hold?1:season(s.day);
export const weatherOf=s=>weatherFor(s.worldSeed,s.day,seasonOf(s));
export const ctxOf=(s,c)=>({variant:c.variant,weather:weatherOf(s),season:seasonOf(s)});
export const opened=(s,id)=>!!s.monsters[id];
export const openList=s=>L.MONSTERS.filter(m=>s.monsters[m.id]);
export const hasUnknown=(s,m)=>m.facts.some(f=>!s.know[f.id]);
export const onHunt=(s,id)=>s.hunts.some(x=>x.contract.hunter===id);
export const free=(s,id)=>{const h=s.hunters[id];return !!h&&h.out===0&&h.sulk===0&&!onHunt(s,id);};
export const candlesLeft=R.candlesLeft;
const cap=(n,max)=>Math.max(0,Math.min(max,n));
export function earn(s,n){if(!(n>0))return;s.gold+=n;s.daily.income+=n;s.stats.earned+=n;}
export function spend(s,n){if(!(n>0))return;s.gold-=n;s.daily.spent+=n;s.stats.spent+=n;}
export function gain(s,n){s.rep+=n;s.daily.rep+=n;}
export function addStock(s,id,n){s.stock[id]=cap((s.stock[id]||0)+n,R.LIMITS.stock);}
export function addNotes(s,id,n){s.notes[id]=cap((s.notes[id]||0)+n,R.LIMITS.notes);}
export function note(s,t,k='note'){s.chronicle.unshift({d:s.day,t:String(t).slice(0,200),k});if(s.chronicle.length>R.LIMITS.chronicle)s.chronicle.length=R.LIMITS.chronicle;}
// What happened for the first time today: a tip of Даро ('tip:first_rumour') or a step of an arc ('arc:gordey.2').
export function mark(s,id){const f=s.daily.firsts;if(!f.includes(id)&&f.length<R.LIMITS.firsts)f.push(id);}
const tip=(s,id)=>{if(!s.hintsSeen.includes(id))mark(s,'tip:'+id);};
const useCandles=(s,n)=>{s.daily.candles+=n;};

// ---- knowledge (GDD 2.5)
const record=(s,st,src,by)=>{const k={st,rev:0,src,d:s.day,v:++s.kv,ok:0,none:0,worse:0,last:null};if(by)k.by=by;return k;};
// A rumour is written only where there is no record yet.
export function addRumour(s,f,src,by){if(!f||s.know[f.id])return false;s.know[f.id]=record(s,'rumour',src,by);tip(s,'first_rumour');return true;}
// Resolution: from no record or a rumour into an exact state; +2 reputation, once a fact (exact never goes back).
export function resolve(s,f,st,src,by){const k=s.know[f.id];if(k&&k.st!=='rumour')return false;
 const e=k||(s.know[f.id]=record(s,st,src,by));e.st=st;e.src=src;if(by)e.by=by;else delete e.by;e.d=s.day;e.v=++s.kv;gain(s,2);s.stats.resolved++;if(st==='dangerous')tip(s,'first_harmful');return true;}
// Revelation of a condition: rev:1 and «confirmed»; +2 reputation, once (a rumour is resolved first).
export function reveal(s,f,src){if(f.truth!=='conditional')return false;const k=s.know[f.id];if(k?.rev)return false;
 if(!k||k.st==='rumour')resolve(s,f,'confirmed',src);const e=s.know[f.id];e.st='confirmed';e.rev=1;e.src=src;delete e.by;e.d=s.day;e.v=++s.kv;gain(s,2);s.stats.revealed++;tip(s,'first_condition');return true;}
// A noticed outcome of a hunt: the exact table of GDD 2.5. Returns {from, to, rev} for the report.
export function observe(s,f,o,ctx,src='hunt'){
 const k=s.know[f.id],from=k?k.st:null;let rev=0;
 if(!k||k.st==='rumour')resolve(s,f,R.STATE_OF[o],src);
 else if(!k.rev&&k.st!==R.STATE_OF[o]&&reveal(s,f,src))rev=1;
 const e=s.know[f.id];e[o]=Math.min(999,(e[o]||0)+1);e.last={v:ctx.variant,w:ctx.weather,k:ctx.season};
 return {from,to:e.st,rev};}
// A test in the laboratory or the archive: a rumour becomes exact; a condition is revealed; an exact record of an
// ordinary fact is only confirmed again («Опыт подтвердил запись»), without rewards.
export function test(s,f,src){const k=s.know[f.id],from=k?k.st:null;
 if(f.truth==='conditional'){if(k?.rev)return {f:f.id,from,to:k.st,rev:0,same:true};reveal(s,f,src);return {f:f.id,from,to:'confirmed',rev:1,same:false};}
 if(k&&k.st!=='rumour')return {f:f.id,from,to:k.st,rev:0,same:true};
 resolve(s,f,R.STATE_OF[R.outcome(f,LAB_CTX)],src);return {f:f.id,from,to:s.know[f.id].st,rev:0,same:false};}
// A book writes its entries for open pages; entries about a page not open yet wait in the book (GDD 2.5, 5.6).
export function applyBook(s,b,only){if(!b)return;for(const [id,st] of Object.entries(b.sets)){const mid=id.split('.')[0],f=L.FACT.get(id);if(!f||!s.monsters[mid]||only&&mid!==only)continue;
 if(st==='rumour'||f.truth==='conditional'||!b.reliable)addRumour(s,f,'book',b.id);else resolve(s,f,st,'book',b.id);}}
export function addBook(s,id){const b=L.BOOK.get(id);if(!b||s.books.includes(id))return false;s.books.push(id);applyBook(s,b);for(const r of b.recipes)if(L.POT.has(r)&&!s.recipes.includes(r))s.recipes.push(r);return true;}
// A page opens with its start states (never over a record), then the books already bought write what waited for it.
export function openMonster(s,id){if(s.monsters[id]||!L.MON.has(id))return false;const m=L.MON.get(id);
 s.monsters[id]={u:s.day,troph:[],studied:[],sold:[],treatise:0,leaflet:0,rummage:0,hunts:0,wins:0,seen:0};
 for(const f of m.facts)if(f.start&&!s.know[f.id])s.know[f.id]=record(s,f.start,'start');
 for(const b of s.books)applyBook(s,L.BOOK.get(b),id);return true;}
// One unknown fact of a monster, weighted towards myths (GDD 2.5), optionally of some categories.
export function pickUnknown(s,m,keys,cats,skip){const pool=m.facts.filter(f=>!s.know[f.id]&&(!cats||cats.includes(f.cat))&&!skip?.includes(f.id));
 return pool.length?weighted(s.worldSeed,keys,pool.map(f=>[f,L.RUMOUR_WEIGHTS[f.truth]])):null;}
export function joinHunter(s,id){if(s.hunters[id]||!L.HUNTER.has(id))return false;
 s.hunters[id]={joined:s.day,xp:0,trust:L.HUNTER.get(id).trust,out:0,sulk:0,rag:0,gear:[],hunts:0,wins:0,fails:0,skill:0,doc:0,harmSeen:0,failSeen:0};return true;}

// ---- the guests and cases of a day (GDD 1.3)
function contract(s,o){const m=L.MON.get(o.monster);return {id:newId(s,'c'),kind:o.kind,hunter:o.hunter??null,town:o.town??null,monster:m.id,variant:o.variant,place:o.place,tier:m.tier,day:s.day,deferred:0,fee:o.fee??R.FEE[m.tier],bounty:o.bounty??m.bounty};}
const visits=(s,v)=>{const x=v.visits||{};if(x.evenings)return x.evenings.includes(s.day);if(!x.every)return false;
 if(x.after&&!s.story.seen.includes(x.after))return false;return s.day>=(x.from||1)&&(x.from?(s.day-x.from)%x.every===0:s.day%x.every===0);};
export function makeDay(s){
 const d=s.day,seed=s.worldSeed,rank=R.rankOf(s.rep),k=seasonOf(s),carried=s.contracts.filter(c=>c.deferred===1&&c.day===d-1);
 s.contracts=[];s.visitors=[];
 const guest=(kind,who,o={})=>{if(s.visitors.length<R.LIMITS.visitors)s.visitors.push({id:newId(s,'v'),kind,who,contract:o.contract||null,rumour:o.rumour||null,heard:false});};
 // Guests of one morning never bring the same rumour, so the order they are heard in changes nothing.
 const told=()=>s.visitors.map(v=>v.rumour).filter(Boolean),fresh=m=>m.facts.some(f=>!s.know[f.id]&&!told().includes(f.id));
 const add=(c,queue=true)=>{s.contracts.push(c);if(queue)guest(c.kind==='town'?'town':'hunter',c.kind==='town'?c.town:c.hunter,{contract:c.id});};
 const ready=id=>s.monsters[id]&&s.monsters[id].u<d;
 for(const c of carried)add(c);
 if(d===1)add(contract(s,{kind:'hunter',hunter:'gordey',monster:'werewolf',variant:'grown',place:'zarechye'}));
 else{
  const taken=new Set(carried.map(c=>c.hunter).filter(Boolean)),pool=L.HUNTERS.map(h=>h.id).filter(id=>free(s,id)&&!taken.has(id));
  const n=Math.max(1,R.GUESTS[rank]-(roll(seed,'day',d,'quiet')<R.QUIET?1:0));
  for(let j=carried.filter(c=>c.kind==='hunter').length;j<n&&pool.length;j++){
   const hid=pool.splice(Math.floor(roll(seed,'day',d,'hunter',j)*pool.length),1)[0],h=s.hunters[hid],likes=L.HUNTER.get(hid).likes;
   const list=L.MONSTERS.filter(m=>ready(m.id)&&m.tier<4&&m.tier<=R.maxTier(hid,h)&&m.seasons.includes(k));if(!list.length)continue;
   const m=weighted(seed,['day',d,'monster',j],list.map(m=>{const x=s.monsters[m.id];return [m,(1+2*(x.treatise?0:1)+2*(d-x.u<=5?1:0))*(m.tags.some(t=>likes.includes(t))?2:1)];}));
   const vu=roll(seed,'day',d,'variant',j),variant=rank>=3&&s.monsters[m.id].troph.length?(vu<.35?'young':vu<.8?'grown':'ancient'):(vu<.45?'young':'grown');
   add(contract(s,{kind:'hunter',hunter:hid,monster:m.id,variant,place:pick(seed,['day',d,'place',j],m.places)}));}
  // Townsfolk from rank 1: half bring a case without a hunter, half a free rumour (GDD 1.3).
  if(rank>=1&&roll(seed,'town',d)<R.TOWN.chance){const type=pick(seed,['town',d,'type'],L.TOWN_TYPES).id;
   if(roll(seed,'town',d,'kind')<R.TOWN.share){const list=L.MONSTERS.filter(m=>ready(m.id)&&m.tier<=R.TOWN.maxTier&&m.seasons.includes(k));
    if(list.length){const m=pick(seed,['town',d,'monster'],list);add(contract(s,{kind:'town',town:type,monster:m.id,variant:roll(seed,'town',d,'variant')<.45?'young':'grown',place:pick(seed,['town',d,'place'],m.places),fee:R.TOWN.fee}));}}
   else{const list=openList(s).filter(m=>m.tier<4&&fresh(m));if(list.length){const m=pick(seed,['town',d,'monster'],list);guest('town',type,{rumour:pickUnknown(s,m,['town',d,'fact'],null,told()).id});}}}
 }
 // Personal cases wait without a deadline for their own hunter when he is free (GDD 1.3, 7.3).
 for(const h of L.HUNTERS){const p=s.personal[h.id];if(!p||p.state!=='open'||!free(s,h.id)||d===1)continue;const m=L.MON.get(p.monster);
  if(ready(m.id)&&m.seasons.includes(k))add(contract(s,{kind:'personal',hunter:h.id,monster:m.id,variant:p.variant,place:pick(seed,['day',d,'personal',h.id],m.places)}),false);}
 // The case of the sorcerer after S10, until he is beaten: the player chooses the hunter (GDD 1.3).
 const s10=L.STORY.get('S10').effect.contract;
 if(s.story.seen.includes('S10')&&!s.story.koldun&&s.monsters[s10.monster])add(contract(s,{kind:'story',monster:s10.monster,variant:s10.variant,place:s10.place,fee:s10.fee,bounty:0}),false);
 // Other guests: Ведана and о. Никодим bring a free rumour chosen now and written when they are heard.
 // Day 1 is the lesson: only Гордей waits at the table (GDD 9.1); Даро speaks through the story and from his armchair.
 for(const v of L.VISITORS){if(v.role==='townsfolk'||v.role==='council'||v.role==='apprentice'||!visits(s,v)||d===1)continue;let rumour=null;
  if(v.visits.rumour){const list=openList(s).filter(m=>m.tier<4&&m.tags.some(t=>v.visits.rumour.tags.includes(t))&&fresh(m));if(list.length)rumour=pickUnknown(s,pick(seed,[v.id,d],list),[v.id,d,'fact'],null,told()).id;}
  guest(v.id,v.id,{rumour});}
 // Two sealed rumour sheets of Янек, about open monsters with something unknown; the fact is drawn when one is bought.
 s.trader={day:d,rumours:[]};const pool=openList(s).filter(m=>m.tier<4&&hasUnknown(s,m));
 for(let slot=0;slot<2;slot++){const list=slot&&pool.length>1?pool.filter(m=>m.id!==s.trader.rumours[0]?.monster):pool;if(!list.length)break;const m=pick(seed,['rumour',d,slot],list);s.trader.rumours.push({monster:m.id,price:R.RUMOUR_PRICE[m.tier],sold:false});}
 return s;}

// ---- the sheet: estimate and truth (GDD 3.3)
export const hunterOf=(s,c)=>c.kind==='town'||!c.hunter?null:s.hunters[c.hunter]||null;
export const bonusOf=(s,c,potions)=>R.bonuses(c.hunter,hunterOf(s,c),c.monster,c.variant,potions);
export function truthChance(s,cid,factIds,potionIds=[]){const c=typeof cid==='string'?s.contracts.find(c=>c.id===cid):cid;if(!c)return 0;const ctx=ctxOf(s,c);let K=0,H=0;
 for(const id of factIds){const f=L.FACT.get(id);if(!f)continue;const o=R.outcome(f,ctx);if(o==='ok')K++;else if(o==='worse')H++;}return R.chance(K,H,bonusOf(s,c,potionIds));}
export function preview(s,cid,factIds=[],potionIds=[]){const c=s.contracts.find(c=>c.id===cid);if(!c)return null;const ctx=ctxOf(s,c),ids=Array.isArray(factIds)?factIds:[],pots=Array.isArray(potionIds)?potionIds:[];
 const beliefs=ids.map(id=>{const f=L.FACT.get(id);return f?R.believed(s.know[id],f,ctx):undefined;}),b=bonusOf(s,c,pots),e=R.estimate(beliefs,b);
 const segments=[0,1,2].map(i=>({kind:i>=beliefs.length||beliefs[i]===undefined?'empty':beliefs[i]===null?'rumour':beliefs[i]==='ok'?'ok':beliefs[i]==='worse'?'worse':'none',fact:ids[i]||null}));
 const errors=[...R.adviceErrors(s.know,c.monster,ctx,ids),...R.potionErrors(s.potions,pots)],potion=Math.min(R.POTION_CAP,b.potion);
 return {low:L.pct(e.low),mid:L.pct(e.mid),high:L.pct(e.high),raw:{low:e.low,mid:e.mid,high:e.high},k:e.k,r:e.r,segments,potion,skill:b.skill,vmod:b.vmod,
  plus:Math.min(R.BONUS_CAP,b.skill+potion+Math.max(0,b.vmod)),minus:Math.min(0,b.vmod),errors,line:R.estimateLine(L.pct(e.mid)),ctx};}

// ---- the reception (GDD 1.3, 3.2): listen, advise, defer, decline, assign, heal
export function listen(s,vid){const v=s.visitors.find(v=>v.id===vid);if(!v)return fail('Этот гость уже ушёл.');if(v.heard)return {ok:true,visitor:v,fact:null,again:true};
 v.heard=true;s.daily.talks++;let fact=null;
 if(v.rumour){let f=L.FACT.get(v.rumour);if(s.know[f.id]){f=pickUnknown(s,L.monsterOf(f.id),[v.kind,s.day,'again']);}if(f&&addRumour(s,f,v.kind==='town'?'town':v.kind))fact=f.id;}
 return {ok:true,visitor:v,fact};}
export function advise(s,cid,factIds,potionIds=[]){
 const c=s.contracts.find(c=>c.id===cid);if(!c)return fail('Этого дела уже нет на столе.');
 if(c.kind!=='town'){if(!c.hunter)return fail('Сначала выбери охотника.');if(!free(s,c.hunter))return fail(`${L.HUNTER.get(c.hunter).short} сейчас не может пойти на дело.`);}
 const ids=Array.isArray(factIds)?factIds:[],pots=Array.isArray(potionIds)?potionIds:[],ctx=ctxOf(s,c);
 const errors=[...R.adviceErrors(s.know,c.monster,ctx,ids),...R.potionErrors(s.potions,pots)];if(errors.length)return fail(errors[0]);
 const shown=preview(s,cid,ids,pots);
 for(const p of pots)s.potions[p]--;earn(s,c.fee);
 const hunt={contract:{...c},advice:[...ids],potions:[...pots],ctx,shown:{low:shown.low,mid:shown.mid,high:shown.high},day:s.day};s.hunts.push(hunt);
 // A hunter takes one case a day: his other cases close without consequences; the sorcerer's card loses him.
 s.contracts=s.contracts.filter(x=>x.id!==cid&&!(c.hunter&&x.hunter===c.hunter&&x.kind!=='story'));for(const x of s.contracts)if(x.kind==='story'&&c.hunter&&x.hunter===c.hunter)x.hunter=null;
 for(const v of s.visitors)if(v.contract===cid||c.hunter&&v.kind==='hunter'&&v.who===c.hunter){if(!v.heard){v.heard=true;s.daily.talks++;}v.contract=v.contract===cid?cid:null;}
 if(pots.length)tip(s,'first_potion');
 return {ok:true,hunt,shown:hunt.shown};}
export function defer(s,cid){const c=s.contracts.find(c=>c.id===cid);if(!c)return fail('Этого дела уже нет на столе.');
 if(c.kind!=='hunter'&&c.kind!=='town')return fail('Это дело и так ждёт без срока.');if(c.deferred)return fail('Это дело уже откладывали — второй раз нельзя.');
 c.deferred=1;const v=s.visitors.find(v=>v.contract===cid);if(v&&!v.heard){v.heard=true;s.daily.talks++;}return {ok:true,contract:c};}
export function decline(s,cid){const c=s.contracts.find(c=>c.id===cid);if(!c)return fail('Этого дела уже нет на столе.');if(c.kind==='personal'||c.kind==='story')return fail('Это дело ждёт без срока — его можно просто не брать.');
 s.contracts=s.contracts.filter(x=>x.id!==cid);const v=s.visitors.find(v=>v.contract===cid);if(v){if(!v.heard){v.heard=true;s.daily.talks++;}v.contract=null;}return {ok:true};}
export function assign(s,cid,hid){const c=s.contracts.find(c=>c.id===cid);if(!c)return fail('Этого дела уже нет на столе.');if(c.kind!=='story')return fail('На это дело охотник уже назначен.');
 if(!s.hunters[hid])return fail('Такого охотника в артели нет.');if(!free(s,hid))return fail(`${L.HUNTER.get(hid).short} сейчас не может пойти на дело.`);c.hunter=hid;return {ok:true,contract:c};}
export function heal(s,hid){const h=s.hunters[hid];if(!h)return fail('Такого охотника в артели нет.');if(!(h.out>0))return fail('Охотник здоров.');if(s.gold<R.PRICE.doctor)return fail(`Лекарь берёт ${L.coins(R.PRICE.doctor)}.`);
 spend(s,R.PRICE.doctor);h.out--;let trust=0;if(!h.doc){h.doc=1;if(h.trust<R.TRUST.max){h.trust++;trust=1;}}if(!h.out)h.rag=0;return {ok:true,out:h.out,trust};}

// ---- the night: one roll a hunt, observation, knowledge, wounds, trust, reward (GDD 3.6, 4, 5.2)
function trophy(s,m,variant,r){const mon=s.monsters[m.id];if(mon.troph.includes(variant))return;if(!mon.troph.length)gain(s,5);mon.troph.push(variant);gain(s,2+(s.upgrades.includes('hall')?1:0));r.trophy=variant;}
export function resolveHunt(s,hunt){
 const c=hunt.contract,m=L.MON.get(c.monster),ctx=hunt.ctx,seed=s.worldSeed,town=c.kind==='town',h=town?null:s.hunters[c.hunter],mon=s.monsters[m.id];
 const facts=hunt.advice.map(id=>L.FACT.get(id)),outs=facts.map(f=>R.outcome(f,ctx));let K=0,H=0;for(const o of outs){if(o==='ok')K++;else if(o==='worse')H++;}
 const pots=hunt.potions,P=R.chance(K,H,R.bonuses(c.hunter,h,m,c.variant,pots)),u=c.id==='c-1'?.4:roll(seed,'hunt',c.id),win=100*u<P;
 const see=R.observeChance(R.perception(c.hunter,h),win,c.id==='c-1'||pots.includes('owl_drops'));
 const items=facts.map((f,i)=>{const o=outs[i];if(o!=='worse'&&!(roll(seed,'obs',c.id,f.id)<see)){const st=s.know[f.id]?.st??null;return {f:f.id,o,seen:false,from:st,to:st,rev:0};}return {f:f.id,o,seen:true,...observe(s,f,o,ctx)};});
 const r={id:newId(s,'r'),day:s.day+1,contract:{...c,weather:ctx.weather,season:ctx.season},hunter:c.hunter,town:c.town,win,shown:hunt.shown,items,potions:[...pots],see,
  injury:0,rag:0,trust:0,xp:0,offer:null,gift:null,trophy:null,choice:null,asked:false,read:false};
 s.stats.hunts++;s.stats.harmful+=H;mon.hunts++;if(K===3&&win)tip(s,'first_full');
 if(town){s.stats.town++;if(win){s.stats.wins++;mon.wins++;gain(s,1);earn(s,R.TOWN.pay*m.tier);r.paid=R.TOWN.pay*m.tier;trophy(s,m,c.variant,r);}else s.stats.fails++;return r;}
 h.hunts++;r.xp=(win?2:1)+(m.tier>=3?1:0);h.xp+=r.xp;if(H)h.harmSeen=1;
 if(win){s.stats.wins++;h.wins++;mon.wins++;gain(s,1);if(!H&&h.trust<R.TRUST.max){h.trust++;r.trust=1;}r.rag=h.rag=H?1:0;trophy(s,m,c.variant,r);
  if(c.kind==='story'){s.story.koldun=s.day;return r;}
  if(h.trust>=R.TRUST.gift){const g=roll(seed,'gift',c.id)<.5?{id:'notes',n:1}:{id:m.loot.common,n:1};if(g.id==='notes')addNotes(s,m.id,1);else addStock(s,g.id,1);r.gift=g;}
  const ancient=c.variant==='ancient',loot={};for(let j=0;j<R.LOOT_N[m.tier]+(ancient?1:0);j++){const id=roll(seed,'loot',c.id,j)<(ancient?.5:.25)?m.loot.rare:m.loot.common;loot[id]=(loot[id]||0)+1;}
  let tale=pickUnknown(s,m,['tale',c.id]),sure=!!tale&&R.perception(c.hunter,h)>=4;if(!tale){tale=m.facts.find(f=>s.know[f.id]?.st==='rumour')||null;sure=!!tale;}
  r.offer={coins:R.coinsOffer(c.bounty,c.variant,h.trust),loot:Object.entries(loot).map(([id,n])=>({id,n})),tale:tale?.id||null,sure,notes:1};}
 else{s.stats.fails++;h.fails++;h.failSeen=1;const balm=pots.includes('life_balm');
  r.injury=h.out=R.woundDays({harm:Math.max(0,H-R.forgives(pots)),P,variant:c.variant,danger:m.danger,balm,theriac:pots.includes('theriac')&&m.tags.includes('serpent'),infirmary:s.upgrades.includes('infirmary'),cuirass:h.gear.includes('cuirass')});
  r.rag=h.rag=R.ragFor(r.injury,balm);h.doc=0;
  if(balm?H>0:items.some(x=>x.seen&&x.o!=='ok')){h.trust--;r.trust=-1;if(h.trust<=0){h.trust=0;h.sulk=R.TRUST.sulk;r.sulk=R.TRUST.sulk;}}
  tip(s,'first_failure');}
 return r;}
// Steps 1–5 of the night (GDD 1.4): rewards left unchosen become coins, wounds and sulks count down, every hunt is rolled
// and reported, the cases not deferred close, the day turns. A guest who was not heard leaves his rumour as a note on the
// table for the morning (decision D5). Story, arcs and the new day are the next steps (progress.js).
export function night(s){
 for(const r of s.reports){if(r.offer&&!r.choice)claim(s,r.id,'coins');r.read=true;}
 const back=[],forgiven=[],marked=s.daily.firsts.length;
 for(const h of L.HUNTERS){const x=s.hunters[h.id];if(!x)continue;if(x.out>0){x.out--;if(!x.out)back.push(h.id);}if(!x.out)x.rag=0;if(x.sulk>0){x.sulk--;if(!x.sulk){x.trust=Math.max(1,x.trust);forgiven.push(h.id);}}}
 // Hunts are rolled in the order of their cases, so the order the sheets were sent in changes nothing.
 const num=h=>Number(h.contract.id.slice(2)),reports=[...s.hunts].sort((a,b)=>num(a)-num(b)).map(h=>resolveHunt(s,h));s.hunts=[];
 const unheard=s.visitors.filter(v=>v.rumour&&!v.heard);
 s.contracts=s.contracts.filter(c=>c.deferred===1&&c.day===s.day&&(c.kind==='hunter'||c.kind==='town'));s.visitors=[];
 // The firsts of the night (a failure, a harm, a condition) belong to the morning that tells of them.
 const firsts=s.daily.firsts.slice(marked);s.day++;s.daily=freshDaily();s.daily.firsts.push(...firsts);if(s.story.thaw>0)s.story.thaw--;
 const notes=[];for(const v of unheard){let f=L.FACT.get(v.rumour);if(s.know[f.id])f=pickUnknown(s,L.monsterOf(f.id),[v.kind,s.day-1,'again']);const src=v.kind==='town'?'town':v.kind;if(f&&addRumour(s,f,src))notes.push({who:v.who,kind:v.kind,fact:f.id});}
 s.reports=[...reports,...s.reports].slice(0,R.LIMITS.reports);
 return {reports,back,forgiven,notes};}
// The reward chosen after a win: one of coins, loot, knowledge (GDD 5.2).
export function claim(s,rid,choice){const r=s.reports.find(r=>r.id===rid);if(!r)return fail('Отчёт не найден.');if(!r.offer)return fail('За это дело награду не выбирают.');
 if(r.choice)return fail('Награда уже выбрана.');if(!['coins','loot','know'].includes(choice))return fail('Выбери монеты, добычу или знание.');
 let fact=null;
 if(choice==='coins')earn(s,r.offer.coins);
 else if(choice==='loot')for(const x of r.offer.loot)addStock(s,x.id,x.n);
 else{const m=L.MON.get(r.contract.monster);addNotes(s,m.id,r.offer.notes);const f=r.offer.tale&&L.FACT.get(r.offer.tale);
  if(f){const k=s.know[f.id];if(r.offer.sure&&(!k||k.st==='rumour'||!k.rev)){const res=observe(s,f,R.outcome(f,r.contract),r.contract,'tale');fact={f:f.id,...res};}else if(!k&&addRumour(s,f,'tale'))fact={f:f.id,from:null,to:'rumour',rev:0};}}
 r.choice=choice;return {ok:true,choice,fact};}
// «Расспросить»: once a report, one candle, a second look at every unnoticed piece of advice (GDD 4.1).
export function askAgain(s,rid){const r=s.reports.find(r=>r.id===rid);if(!r)return fail('Отчёт не найден.');if(r.asked)return fail('Уже расспросили — больше охотник не вспомнит.');
 if(!r.items.some(x=>!x.seen))return fail('Охотник и так всё рассказал.');if(R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');
 useCandles(s,1);r.asked=true;const changed=[],ctx={variant:r.contract.variant,weather:r.contract.weather,season:r.contract.season};
 for(const x of r.items){if(x.seen||!(roll(s.worldSeed,'obs2',r.contract.id,x.f)<r.see))continue;Object.assign(x,{seen:true,...observe(s,L.FACT.get(x.f),x.o,ctx)});changed.push(x);}
 return {ok:true,changed};}
export function readReport(s,rid){const r=s.reports.find(r=>r.id===rid);if(!r)return fail('Отчёт не найден.');r.read=true;return {ok:true};}

// ---- experiments (GDD 5.4)
const of=(ids,mid)=>ids.every(id=>id.startsWith(mid+'.'));
export function labTest(s,factIds,partId){const ids=Array.isArray(factIds)?[...new Set(factIds)]:[],f0=L.FACT.get(ids[0]);
 if(!f0)return fail('Выбери сведение для опыта.');const m=L.monsterOf(f0.id),most=s.upgrades.includes('lens')?2:1;
 if(!s.monsters[m.id])return fail('Страница этого чудовища ещё не заведена.');if(ids.length>most)return fail(most===1?'Один образец — одно сведение (с лупой — два).':'Один образец — не больше двух сведений.');
 if(!of(ids,m.id))return fail('Образец проверяет сведения одного чудовища.');
 for(const id of ids){const f=L.FACT.get(id),k=s.know[id];if(!f)return fail('Такого сведения нет.');if(!R.LAB_CATS.includes(f.cat))return fail('Время, место и обряд в колбе не проверить — только охотой или по летописям.');if(!k)return fail('Этого в бестиарии ещё нет.');if(k.rev)return fail(`«${f.title}» уже проверено до конца.`);}
 const part=partId||[m.loot.common,m.loot.rare].find(p=>(s.stock[p]||0)>0);
 if(!part||L.MAT.get(part)?.of!==m.id)return fail(`Нужен образец: ${L.partName(m.loot.common)} или ${L.partName(m.loot.rare)}.`);if(!((s.stock[part]||0)>0))return fail(`Нет образца: ${L.partName(part)}.`);
 if(R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');
 useCandles(s,1);s.stock[part]--;return {ok:true,part,results:ids.map(id=>test(s,L.FACT.get(id),'lab'))};}
export function studyTrophy(s,mid,variant,factId){const m=L.MON.get(mid),mon=s.monsters[mid];if(!m||!mon)return fail('Страница этого чудовища ещё не заведена.');
 if(!mon.troph.includes(variant))return fail('Такого трофея на стене нет.');if(mon.studied.includes(variant))return fail('Этот трофей уже изучен.');
 let f=null;if(factId){f=L.FACT.get(factId);const k=s.know[factId];if(!f||!factId.startsWith(mid+'.'))return fail('Трофей рассказывает только о своём чудовище.');if(!R.LAB_CATS.includes(f.cat))return fail('По трофею проверяют вещество и оберег.');if(!k)return fail('Этого в бестиарии ещё нет.');if(k.rev)return fail(`«${f.title}» уже проверено до конца.`);}
 else if(!m.facts.some(f=>!s.know[f.id]&&R.LAB_CATS.includes(f.cat)))return fail('Неизвестных веществ и оберегов у этого чудовища не осталось.');
 if(R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');
 useCandles(s,1);mon.studied.push(variant);if(!f)f=pickUnknown(s,m,['study',mid,variant],R.LAB_CATS);return {ok:true,result:test(s,f,'trophy')};}
export function crossCheck(s,factId){const f=L.FACT.get(factId),k=s.know[factId];if(!f)return fail('Такого сведения нет.');const m=L.monsterOf(f.id);
 if(!R.ARCHIVE_CATS.includes(f.cat))return fail('Вещество и оберег проверяют на образце.');if(!k)return fail('Этого в бестиарии ещё нет.');if(k.rev)return fail(`«${f.title}» уже проверено до конца.`);
 if(!((s.notes[m.id]||0)>0))return fail(`Нужны полевые записи ${m.about}.`);if(R.candlesLeft(s)<2)return fail('Сверка займёт две свечи.');
 useCandles(s,2);s.notes[m.id]--;return {ok:true,result:test(s,f,'archive')};}
export function rummage(s,mid){const m=L.MON.get(mid),mon=s.monsters[mid];if(!m||!mon)return fail('Страница этого чудовища ещё не заведена.');if(m.tier>=4)return fail('О нём в летописях — только то, что принесёт сюжет.');
 if(!hasUnknown(s,m))return fail('Про это чудище нового не толкуют.');if(R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');
 useCandles(s,1);const attempt=mon.rummage+1,found=attempt>=R.RUMMAGE.sure||roll(s.worldSeed,'rummage',mid,s.day,attempt)<R.RUMMAGE.chance;
 if(!found){mon.rummage=attempt;return {ok:true,found:null,attempt};}
 mon.rummage=0;const f=pickUnknown(s,m,['rummage',mid,s.day,attempt,'fact']);addRumour(s,f,'rummage');return {ok:true,found:f.id,attempt};}
// Brewing: one candle, two doses (three with the still), up to nine; missing herbs can be bought in the same move.
export function brewCost(s,pid){const p=L.POT.get(pid),need=[];let coins=0;if(!p)return null;
 for(const [id,n] of Object.entries(p.ingredients)){const short=Math.max(0,n-(s.stock[id]||0)),mt=L.MAT.get(id);if(!short)continue;if(mt.buy)coins+=mt.buy*short;need.push({id,n:short,buy:!!mt.buy});}return {coins,need};}
export function brew(s,pid,{buyMissing=false}={}){const p=L.POT.get(pid);if(!p)return fail('Такого снадобья нет.');if(!s.recipes.includes(pid))return fail('Рецепта этого снадобья в бестиарии нет.');
 if((s.potions[pid]||0)>=R.LIMITS.doses)return fail(`Больше ${R.LIMITS.doses} доз не хранят.`);const cost=brewCost(s,pid),part=cost.need.find(x=>!x.buy);
 if(part)return fail(`Нужно: ${L.partName(part.id)} — это добывают охотники.`);if(cost.need.length&&!buyMissing)return fail(`Не хватает: ${cost.need.map(x=>`${L.partName(x.id).toLowerCase()} ×${x.n}`).join(', ')}.`);
 if(s.gold<cost.coins)return fail(`Не хватает монет: нужно ${cost.coins}.`);if(R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');
 spend(s,cost.coins);for(const [id,n] of Object.entries(p.ingredients))s.stock[id]=Math.max(0,(s.stock[id]||0)+(cost.need.find(x=>x.id===id)?.n||0)-n);
 useCandles(s,1);const made=Math.min(R.LIMITS.doses-(s.potions[pid]||0),s.upgrades.includes('still')?3:2);s.potions[pid]=(s.potions[pid]||0)+made;return {ok:true,made,coins:cost.coins};}

// ---- the shop and the Academy (GDD 5.5–5.8)
export function buy(s,id,n=1){const mt=L.MAT.get(id);if(!mt?.buy)return fail('Этого в лавке не продают.');if(!(Number.isInteger(n)&&n>=1&&n<=R.LIMITS.stock))return fail('Сколько купить?');
 if((s.stock[id]||0)+n>R.LIMITS.stock)return fail('Столько не поместится.');if(s.gold<mt.buy*n)return fail(`Не хватает монет: нужно ${mt.buy*n}.`);spend(s,mt.buy*n);addStock(s,id,n);return {ok:true,coins:mt.buy*n};}
export function sell(s,id,n=1){const mt=L.MAT.get(id);if(!mt)return fail('Такого товара нет.');if(!(mt.sell>0))return fail('Это не продаётся.');if(!(Number.isInteger(n)&&n>=1))return fail('Сколько продать?');
 if((s.stock[id]||0)<n)return fail('Столько нет.');s.stock[id]-=n;earn(s,mt.sell*n);return {ok:true,coins:mt.sell*n};}
export function buyRumour(s,slot){const x=s.trader.day===s.day?s.trader.rumours[slot]:null;if(!x)return fail('Такого листка сегодня нет.');if(x.sold)return fail('Этот листок уже куплен — завтра будут новые.');
 const m=L.MON.get(x.monster);if(!hasUnknown(s,m))return fail('Про это чудище нового не толкуют.');if(s.gold<x.price)return fail(`Листок стоит ${L.coins(x.price)}.`);
 spend(s,x.price);x.sold=true;const f=pickUnknown(s,m,['rumourFact',s.day,slot]);addRumour(s,f,'shop');return {ok:true,fact:f.id,coins:x.price};}
export function buyBook(s,id){const b=L.BOOK.get(id);if(!b)return fail('Такой книги нет.');if(b.seller==='gift')return fail('Эту книгу не продают — её дарят.');if(s.books.includes(id))return fail('Эта книга уже в библиотеке.');
 if(b.tier>R.shelfTier(s))return fail('Этой книги пока нет на полке.');if(s.gold<b.price)return fail(`Не хватает монет: нужно ${b.price}.`);
 const before=s.kv;spend(s,b.price);addBook(s,id);note(s,L.say(L.LINES.log.book,L.words({book:b.title,day:s.day})),'book');return {ok:true,book:id,changed:s.kv-before};}
export function buyCandle(s){if(s.daily.extra)return fail('Лишняя свеча — одна в день.');if(R.candleMax(s)>=R.CANDLE_LIMIT)return fail('Больше свечей на карнизе не поместится.');if(s.gold<R.PRICE.candle)return fail(`Свеча стоит ${L.coins(R.PRICE.candle)}.`);
 spend(s,R.PRICE.candle);s.daily.extra=true;return {ok:true};}
export function copyPage(s,mid){const m=L.MON.get(mid);if(!m||!s.monsters[mid])return fail('Страница этого чудовища ещё не заведена.');if(!R.academyOpen(s))return fail(s.story.seen.includes('S1')?'Магистра сегодня нет в Велене.':'Академия ещё не знает о бестиарии.');
 const offer=R.academyOffer(s,mid),freeCopy=s.story.seen.includes('S2')&&!s.daily.copied;
 if(!offer.n)return fail('Этот лист у меня уже есть. Принесите новое — куплю.');if(offer.n<R.ACADEMY.need)return fail('Нужно хотя бы две новые проверенные записи. Слухи Магистр не покупает.');
 if(!freeCopy&&R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');
 if(freeCopy)s.daily.copied=true;else useCandles(s,1);const mon=s.monsters[mid];mon.sold.push(...offer.keys);if(mon.sold.length>R.LIMITS.sold)mon.sold.splice(0,mon.sold.length-R.LIMITS.sold);
 earn(s,offer.coins);s.stats.academy+=offer.coins;s.stats.pagesSold++;note(s,L.say(L.LINES.log.sale,L.words({monster:m,day:s.day})),'sale');return {ok:true,coins:offer.coins,n:offer.n,free:freeCopy};}
export function writeTreatise(s,mid){const m=L.MON.get(mid),mon=s.monsters[mid];if(!m||!mon)return fail('Страница этого чудовища ещё не заведена.');if(m.tier>=4)return fail('Трактат о колдуне напишется сам — после его конца.');
 if(mon.treatise)return fail('Трактат об этом чудовище уже написан.');const p=R.pageStats(s,mid);
 if(!p.done)return fail(p.resolved===p.total&&p.unrevealed?'Магистр сомневается: какая-то запись верна не всегда. Проверь её делом или опытом.':p.troph<p.need?`Нужны трофеи двух обликов (есть ${p.troph}).`:`Страница не полна: разрешено ${p.resolved} из ${p.total}.`);
 if((s.notes[mid]||0)<2)return fail('Для трактата нужны две полевые записи.');if(R.candlesLeft(s)<2)return fail('Трактат займёт две свечи.');
 useCandles(s,2);s.notes[mid]-=2;mon.treatise=s.day;const coins=R.TREATISE[m.tier];earn(s,coins);s.stats.academy+=coins;s.stats.treatises++;gain(s,10);note(s,`День ${s.day}: написан трактат ${m.about}.`,'treatise');return {ok:true,coins};}
export function leaflet(s,mid){const m=L.MON.get(mid),mon=s.monsters[mid];if(!m||!mon)return fail('Страница этого чудовища ещё не заведена.');if(R.rankOf(s.rep)<2)return fail('Печатня берёт листки со звания «Знаток нечисти».');
 if(m.tier>=4)return fail('О колдуне печатня листков не берёт.');if(mon.leaflet&&s.day-mon.leaflet<R.LEAFLET.every)return fail(`Новый листок ${m.about} — через ${L.days(R.LEAFLET.every-(s.day-mon.leaflet))}.`);
 const n=m.facts.filter(f=>s.know[f.id]?.st==='confirmed').length,press=s.upgrades.includes('press'),v=R.leafletValue(n,press);if(!v)return fail('Для листка нужно три подтверждённых сведения.');
 if(!press&&R.candlesLeft(s)<1)return fail('Свечи догорели — завтра.');if(!press)useCandles(s,1);mon.leaflet=s.day;earn(s,v);return {ok:true,coins:v};}
export function upgrade(s,id){const u=L.UPGRADE.get(id);if(!u)return fail('Такого обустройства нет.');if(s.upgrades.includes(id))return fail('Это уже есть в скриптории.');if(R.rankOf(s.rep)<u.rank)return fail(`Откроется со званием «${L.RANKS[u.rank].name}».`);
 if(s.gold<u.price)return fail(`Не хватает монет: нужно ${u.price}.`);spend(s,u.price);s.upgrades.push(id);return {ok:true};}
export function equip(s,hid,gid){const h=s.hunters[hid],g=L.GEAR_OF.get(gid);if(!h)return fail('Такого охотника в артели нет.');if(!g)return fail('Такого снаряжения нет.');if(h.gear.includes(gid))return fail('Это у охотника уже есть.');
 if(R.rankOf(s.rep)<g.rank)return fail(`Снаряжение — со звания «${L.RANKS[g.rank].name}».`);if(s.gold<g.price)return fail(`Не хватает монет: нужно ${g.price}.`);spend(s,g.price);h.gear.push(gid);return {ok:true};}
// Decision D3: decor of the scriptorium and the second edition of a treatise — only to look at, nothing else changes.
export function buyDecor(s,id){const x=L.DECOR_OF.get(id);if(!x)return fail('Такого убранства нет.');if(s.decor.includes(id))return fail('Это уже стоит в скриптории.');if(s.gold<x.price)return fail(`Не хватает монет: нужно ${x.price}.`);spend(s,x.price);s.decor.push(id);return {ok:true};}
export const editionPrice=mid=>L.EDITION.price[L.MON.get(mid)?.tier||0]||0;
export function buyEdition(s,mid){const m=L.MON.get(mid),mon=s.monsters[mid];if(!m||!mon)return fail('Страница этого чудовища ещё не заведена.');if(!mon.treatise)return fail('Второе издание — после первого: трактат ещё не написан.');
 if(s.editions.includes(mid))return fail('Второе издание уже на полке.');const price=editionPrice(mid);if(s.gold<price)return fail(`Не хватает монет: нужно ${price}.`);spend(s,price);s.editions.push(mid);return {ok:true,coins:price};}
export const treatises=s=>L.MONSTERS.filter(m=>s.monsters[m.id]?.treatise).length;
export function printBestiary(s){if(s.printed)return fail('«Великий бестиарий» уже напечатан.');if(R.rankOf(s.rep)<5)return fail(`Печать — со званием «${L.RANKS[5].name}».`);const n=treatises(s);
 if(n<L.MONSTERS.length)return fail(`Нужны все ${L.MONSTERS.length} трактатов (готово ${n}).`);if(s.gold<R.PRICE.print)return fail(`Печать стоит ${L.coins(R.PRICE.print)}.`);if(R.candlesLeft(s)<3)return fail('Печать займёт три свечи.');
 spend(s,R.PRICE.print);useCandles(s,3);s.printed=s.day;return {ok:true};}
