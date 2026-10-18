// Progress of the bestiary (GDD 6, 7, 12): normalize, reputation and ranks, the story «Чёрная зима», the arcs of the
// hunters, the order of the night and every wrapper P.* the interface calls. The interface changes the game only here.
// The name is temporary: progress.js still serves the workshop «Сияние» until the switch (GDD 13, Г2).
import * as L from './lore.js';
import * as R from './rules.js';
import * as B from './bestiary.js';
import {hash32,pick} from './rng.js';
import {season,WEATHER} from './ambience.js';
export {BestiaryError,LEGACY_TEXT,SAVE_KEY,VERSION,serialize,deserialize,seasonOf,weatherOf,ctxOf,free,openList,hasUnknown,brewCost,editionPrice,treatises} from './bestiary.js';
export {outcome,chance,estimate,believed,usable,rankOf,candleMax,candlesLeft,pageStats,pageDone,academyOffer,academyOpen,shelfTier,skillBonus,perception,maxTier,level,potionBonus,potionFits,leafletValue,academyMax} from './rules.js';
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const num=(v,a,b,d)=>int(v,a,b)?v:d;
const guard=fn=>{try{fn();}catch{}};
const list=(v,ok,max)=>Array.isArray(v)?[...new Set(v.filter(ok))].slice(0,max):[];
const idNum=id=>Number(String(id).split('-')[1]);
const TIP_IDS=Object.keys(L.VISITOR.get('daro').lines.tips),STEP_IDS=L.LINES.tutorial.map(t=>t.id),KINDS=['hunter','town','personal','story'];
const VISITOR_KINDS=['hunter','town',...L.VISITORS.filter(v=>v.visits&&v.role!=='townsfolk'&&v.role!=='council'&&v.role!=='apprentice').map(v=>v.id)];
export {TIP_IDS,STEP_IDS};

// ---- the story (GDD 7)
function needMet(s,n){if(n.any)return n.any.some(x=>needMet(s,x));return Object.entries(n).every(([k,v])=>k==='wins'?s.stats.wins>=v:k==='rank'?R.rankOf(s.rep)>=v:k==='pagesSold'?s.stats.pagesSold>=v:k==='resolved'?s.stats.resolved>=v:false);}
// An event comes on the first morning its day, its predecessor and its need allow; after the fallback day the need is
// forgiven, so the story never sticks.
export function storyReady(s,ev){const seen=s.story.seen;if(ev.on||seen.includes(ev.id)||s.day<(ev.day||1)||ev.after&&!seen.includes(ev.after))return false;return !ev.need||needMet(s,ev.need)||!!ev.fallback&&s.day>=ev.fallback;}
export function applyStory(s,ev){if(s.story.seen.includes(ev.id))return null;const e=ev.effect||{};s.story.seen.push(ev.id);s.story.days[ev.id]=s.day;
 for(const id of e.books||[])B.addBook(s,id);
 for(const id of e.open||[])B.openMonster(s,id);if(e.page)B.openMonster(s,e.page);
 for(const id of e.hunters||[])B.joinHunter(s,id);
 for(const [id,n] of Object.entries(e.potions||{}))s.potions[id]=Math.min(R.LIMITS.doses,(s.potions[id]||0)+n);
 for(const id of e.rumours||[])B.addRumour(s,L.FACT.get(id),'story');
 for(const id of e.recipes||[])if(L.POT.has(id)&&!s.recipes.includes(id))s.recipes.push(id);
 for(const [id,n] of Object.entries(e.materials||{}))B.addStock(s,id,n);
 if(e.holdWinter)s.story.hold=true;if(e.releaseWinter)s.story.hold=false;if(e.thaw)s.story.thaw=e.thaw;
 if(e.coins)B.earn(s,e.coins);if(e.rep)B.gain(s,e.rep);
 if(e.completePage)for(const f of L.MON.get(e.completePage).facts){if(f.truth==='conditional')B.reveal(s,f,'story');else B.resolve(s,f,R.STATE_OF[R.outcome(f,B.LAB_CTX)],'story');}
 if(e.treatise){const mon=s.monsters[e.treatise];if(mon&&!mon.treatise){mon.treatise=s.day;s.stats.treatises++;B.gain(s,10);}}
 if(e.printed&&!s.printed)s.printed=s.day;
 if(ev.id!=='S11')B.note(s,L.say(L.LINES.log.story,L.words({day:s.day,story:ev.title})),'story');
 return {id:ev.id,title:ev.title,who:ev.who,text:Array.isArray(ev.text)?ev.text:[]};}
// One event a morning; the thaw follows the night the sorcerer fell before anything else.
export function storyStep(s){const seen=s.story.seen;if(s.story.koldun&&!seen.includes('S12'))return applyStory(s,L.STORY.get('S12'));
 for(const ev of L.EVENTS)if(storyReady(s,ev))return applyStory(s,ev);return null;}

// ---- the arcs of the hunters (GDD 7.3)
function arcMet(s,hid,w,ctx){if(w.any)return w.any.some(x=>arcMet(s,hid,x,ctx));const h=s.hunters[hid],p=s.personal[hid];
 return Object.entries(w).every(([k,v])=>{switch(k){
  case 'first':return !!h;case 'wins':return h.wins>=v;case 'hunts':return h.hunts>=v;case 'harmfulSeen':return !!h.harmSeen;case 'failSeen':return !!h.failSeen;
  case 'huntsOf':return Object.entries(v).every(([id,n])=>(s.hunters[id]?.hunts||0)>=n);case 'day':return s.day>=v;case 'story':return s.story.seen.includes(v);
  case 'arc':return s.arcs.includes(v);case 'opened':return !!s.monsters[v];case 'beaten':return (s.monsters[v]?.wins||0)>0;
  case 'known':return Object.entries(v).every(([m,n])=>(L.MON.get(m)?.facts.filter(f=>s.know[f.id]).length||0)>=n);
  case 'refuted':return [...L.FACT.keys()].some(id=>id.endsWith('.'+v)&&s.know[id]?.st==='refuted');
  case 'contractOn':return s.contracts.some(c=>c.hunter===hid&&c.monster===v);
  case 'personal':return v==='won'?p?.state==='won':v==='lost'?ctx.personal?.[hid]==='lost':v==='done'?(p?.tries||0)>0:false;
  default:return false;}});}
function arcEffect(s,hid,e){const h=s.hunters[hid];if(!e)return;
 if(e.trust)h.trust=Math.min(R.TRUST.max,h.trust+e.trust);if(e.skill)h.skill=Math.min(3,h.skill+e.skill);
 if(e.skillOf)for(const [id,n] of Object.entries(e.skillOf))if(s.hunters[id])s.hunters[id].skill=Math.min(3,s.hunters[id].skill+n);
 if(e.recipe&&L.POT.has(e.recipe)&&!s.recipes.includes(e.recipe))s.recipes.push(e.recipe);if(e.book)B.addBook(s,e.book);
 if(e.personal&&!s.personal[hid])s.personal[hid]={monster:e.personal.monster,variant:e.personal.variant,since:s.day,state:'open',tries:0};}
// Every step fires once, when its condition holds; a «repeat» step speaks at every lost personal hunt.
export function arcStep(s,ctx={}){const out=[];
 for(const hd of L.HUNTERS){if(!s.hunters[hd.id])continue;for(const a of hd.arc){const repeat=!!a.effect?.repeat;if(!repeat&&s.arcs.includes(a.id)||repeat&&(ctx.said||[]).includes(a.id))continue;if(!arcMet(s,hd.id,a.when,ctx))continue;
  if(!repeat){if(s.arcs.length>=R.LIMITS.arcs)continue;s.arcs.push(a.id);}else(ctx.said||(ctx.said=[])).push(a.id);
  arcEffect(s,hd.id,a.effect);B.mark(s,'arc:'+a.id);B.note(s,`День ${s.day}: ${hd.short} — «${a.text.length>150?a.text.slice(0,149)+'…':a.text}»`,'arc');out.push({id:a.id,hunter:hd.id,text:a.text});}}
 return out;}
// Hunters come on their day or with their event (GDD 6.4).
export function joinHunters(s){const joined=[];for(const h of L.HUNTERS){if(s.hunters[h.id])continue;const j=h.joins;if(j.day?s.day>=j.day:s.story.seen.includes(j.story)){B.joinHunter(s,h.id);joined.push(h.id);}}return joined;}

// ---- normalize (GDD 12.3): never throws; each field in its own guard; a broken field falls back to its default.
const STATE_OK=(f,st)=>f.truth==='true'?st==='confirmed':f.truth==='myth'?st==='refuted':f.truth==='harmful'?st==='dangerous':st==='confirmed'||st===(f.otherwise==='myth'?'refuted':'dangerous');
const ctxOk=c=>obj(c)&&L.VARIANTS.includes(c.variant)&&c.weather in WEATHER&&int(c.season,0,3);
function contractOk(s,c,past){if(!obj(c)||typeof c.id!=='string'||!/^c-[1-9][0-9]*$/.test(c.id)||!KINDS.includes(c.kind))return false;const m=L.MON.get(c.monster);
 if(!m||!s.monsters[m.id]||!m.variants.some(v=>v.id===c.variant)||!m.places.includes(c.place)||c.tier!==m.tier||!int(c.day,1,s.day)||![0,1].includes(c.deferred)||!int(c.fee,0,100)||!int(c.bounty,0,1000))return false;
 if(c.kind==='town')return c.hunter===null&&L.TOWN_TYPE.has(c.town);if(c.town!==null)return false;
 if(c.kind==='story')return m.tier===4&&(c.hunter===null||!!s.hunters[c.hunter]);return m.tier<4&&!!s.hunters[c.hunter]&&(past||c.kind!=='personal'||s.personal[c.hunter]?.state==='open');}
function huntOk(s,h){if(!obj(h)||!contractOk(s,h.contract,true)||h.contract.kind==='story'&&!h.contract.hunter||!ctxOk(h.ctx)||h.ctx.variant!==h.contract.variant)return false;
 const ids=h.advice;if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3)return false;const facts=ids.map(id=>L.FACT.get(id));
 if(facts.some(f=>!f||!f.id.startsWith(h.contract.monster+'.'))||new Set(facts.map(f=>f.cat)).size!==3)return false;
 const pots=h.potions;if(!Array.isArray(pots)||pots.length>2||new Set(pots).size!==pots.length||pots.some(p=>!L.POT.has(p)))return false;
 const kinds=pots.map(p=>L.POT.get(p).kind);if(kinds.filter(k=>k==='general').length>1||kinds.filter(k=>k==='family').length>1)return false;
 if(!obj(h.shown))h.shown={low:0,mid:0,high:0};for(const k of['low','mid','high'])h.shown[k]=num(h.shown[k],0,100,0);h.day=num(h.day,1,s.day,s.day);return true;}
function reportOk(s,r){if(!obj(r)||typeof r.id!=='string'||!/^r-[1-9][0-9]*$/.test(r.id)||!obj(r.contract)||!int(r.day,1,s.day))return false;const c=r.contract,m=L.MON.get(c.monster);
 if(!m||!KINDS.includes(c.kind)||!m.variants.some(v=>v.id===c.variant)||!(c.weather in WEATHER)||!int(c.season,0,3)||typeof c.id!=='string')return false;
 if(r.hunter!==null&&!L.HUNTER.has(r.hunter)||r.town!==null&&!L.TOWN_TYPE.has(r.town)||(r.hunter===null)===(r.town===null))return false;
 if(!Array.isArray(r.items)||r.items.length!==3||r.items.some(x=>!obj(x)||!L.FACT.get(x.f)?.id.startsWith(m.id+'.')||!L.OUTCOMES.includes(x.o)||typeof x.seen!=='boolean'))return false;
 for(const x of r.items){if(x.from!==null&&!L.STATES.includes(x.from))x.from=null;if(x.to!==null&&!L.STATES.includes(x.to))x.to=x.from;x.rev=x.rev===1?1:0;}
 if(typeof r.win!=='boolean')return false;if(!obj(r.shown))r.shown={low:0,mid:0,high:0};for(const k of['low','mid','high'])r.shown[k]=num(r.shown[k],0,100,0);
 r.injury=num(r.injury,0,4,0);r.rag=num(r.rag,0,3,0);r.trust=num(r.trust,-1,1,0);r.xp=num(r.xp,0,3,0);r.see=Number.isFinite(r.see)?Math.max(0,Math.min(1,r.see)):.55;r.potions=list(r.potions,p=>L.POT.has(p),2);
 if(r.offer!==null){const o=r.offer;if(!obj(o)||!int(o.coins,0,10000)||!Array.isArray(o.loot)||o.loot.some(x=>!obj(x)||L.MAT.get(x.id)?.of!==m.id||!int(x.n,1,9))||o.tale!==null&&!L.FACT.get(o.tale)?.id.startsWith(m.id+'.'))r.offer=null;else{o.sure=o.sure===true;o.notes=num(o.notes,0,1,1);}}
 if(r.gift!==null&&!(obj(r.gift)&&(r.gift.id==='notes'||L.MAT.has(r.gift.id))&&int(r.gift.n,1,9)))r.gift=null;
 if(r.trophy!==null&&!m.variants.some(v=>v.id===r.trophy))r.trophy=null;
 if(!(r.choice===null||['coins','loot','know'].includes(r.choice))||r.choice&&!r.offer)r.choice=null;r.asked=r.asked===true;r.read=r.read===true;if(r.sulk!==undefined&&!int(r.sulk,1,5))delete r.sulk;if(r.paid!==undefined&&!int(r.paid,0,1000))delete r.paid;return true;}
export function normalize(s){
 if(!obj(s))return s;
 guard(()=>{s.world='bestiary';s.version=B.VERSION;s.contentVersion=L.CONTENT_VERSION;if(!Number.isFinite(s.savedAt))s.savedAt=0;});
 guard(()=>{if(!int(s.worldSeed,0,4294967295))s.worldSeed=hash32(['world',s.day,s.gold,s.nextId].join(':'));});
 guard(()=>{s.day=num(s.day,1,100000,1);for(const k of['gold','rep','nextId','kv'])s[k]=num(s[k],0,1e9,k==='nextId'?1:0);});
 guard(()=>{const d=obj(s.daily)?s.daily:{};s.daily={candles:num(d.candles,0,R.CANDLE_LIMIT,0),extra:d.extra===true,talks:num(d.talks,0,1e6,0),income:num(d.income,0,1e9,0),spent:num(d.spent,0,1e9,0),rep:num(d.rep,0,1e9,0),copied:d.copied===true,firsts:list(d.firsts,x=>typeof x==='string'&&/^(tip|arc):[a-z_.0-9]{1,40}$/.test(x),R.LIMITS.firsts)};});
 guard(()=>{const o=obj(s.stats)?s.stats:{};s.stats=Object.fromEntries(B.STATS.map(k=>[k,num(o[k],0,1e9,0)]));});
 // The story: only known events, closed by «after»; the winter holds exactly between S5 and S12.
 guard(()=>{const o=obj(s.story)?s.story:{};let seen=list(o.seen,id=>L.STORY.has(id),L.STORY.length);if(!seen.includes('S0'))seen.unshift('S0');
  for(let changed=true;changed;){changed=false;for(const id of seen){const a=L.STORY.get(id).after;if(a&&!seen.includes(a)){seen=seen.filter(x=>x!==id);changed=true;break;}}}
  if(seen.includes('S12')&&!seen.includes('S10'))seen=seen.filter(x=>x!=='S12'&&x!=='S13');if(seen.includes('S13')&&!seen.includes('S12'))seen=seen.filter(x=>x!=='S13');
  const days={};for(const id of seen)days[id]=num(o.days?.[id],1,s.day,id==='S0'?1:s.day);
  const koldun=seen.includes('S10')?num(o.koldun,0,s.day,0):0;
  s.story={seen:L.EVENTS.filter(e=>seen.includes(e.id)).map(e=>e.id),days,hold:seen.includes('S5')&&!seen.includes('S12'),thaw:seen.includes('S12')?num(o.thaw,0,3,0):0,koldun:koldun||(seen.includes('S12')?days.S12:0)};});
 // Pages: what is open is never lost; missing start records are written in, nothing is overwritten.
 guard(()=>{const o=obj(s.monsters)?s.monsters:{},mons={},storyOpen=new Map();
  for(const id of s.story.seen){const e=L.STORY.get(id).effect;for(const m of[...(e.open||[]),...(e.page?[e.page]:[])])storyOpen.set(m,s.story.days[id]||1);}
  for(const m of[...Object.keys(o),...storyOpen.keys()].filter(id=>L.MON.has(id)).filter((id,i,a)=>a.indexOf(id)===i).map(id=>L.MON.get(id))){const x=o[m.id];if(!obj(x)&&!storyOpen.has(m.id))continue;const v=obj(x)?x:{},vids=m.variants.map(v=>v.id);
   const troph=list(v.troph,id=>vids.includes(id),3),keyOk=k=>{if(k.startsWith('troph:'))return troph.includes(k.slice(6));const [f,st,rev]=k.split(':');return L.FACT.get(f)?.id.startsWith(m.id+'.')&&L.STATES.includes(st)&&st!=='rumour'&&(rev==='0'||rev==='1');};
   mons[m.id]={u:num(v.u,1,s.day,storyOpen.get(m.id)||1),troph,studied:list(v.studied,id=>troph.includes(id),3),sold:list(v.sold,k=>typeof k==='string'&&keyOk(k),R.LIMITS.sold),
    treatise:m.tier<4||s.story.seen.includes('S12')?num(v.treatise,0,s.day,0):0,leaflet:m.tier<4?num(v.leaflet,0,s.day,0):0,rummage:num(v.rummage,0,R.RUMMAGE.sure-1,0),hunts:num(v.hunts,0,1e6,0),wins:num(v.wins,0,1e6,0),seen:num(v.seen,0,1e9,0)};}
  s.monsters=mons;});
 // Knowledge: known facts only; a state that the content no longer allows falls back to a rumour, so a change of truth
 // in a new version of the content never leaves a false seal.
 guard(()=>{const o=obj(s.know)?s.know:{},know={};let kv=s.kv;
  for(const id of Object.keys(o)){const f=L.FACT.get(id),k=o[id];if(!f||!obj(k))continue;let st=L.STATES.includes(k.st)?k.st:'rumour',rev=k.rev===1&&f.truth==='conditional'&&st!=='rumour'?1:0;
   if(st!=='rumour'&&!STATE_OK(f,st)){st='rumour';rev=0;}if(rev)st='confirmed';
   const last=obj(k.last)&&L.VARIANTS.includes(k.last.v)&&k.last.w in WEATHER&&int(k.last.k,0,3)?{v:k.last.v,w:k.last.w,k:k.last.k}:null;
   const e={st,rev,src:B.SOURCES.includes(k.src)?k.src:'start',d:num(k.d,0,s.day,0),v:num(k.v,0,1e9,0),ok:num(k.ok,0,999,0),none:num(k.none,0,999,0),worse:num(k.worse,0,999,0),last};
   if(typeof k.by==='string'&&L.BOOK.has(k.by))e.by=k.by;kv=Math.max(kv,e.v);know[id]=e;}
  for(const id of Object.keys(s.monsters))for(const f of L.MON.get(id).facts)if(f.start&&!know[f.id])know[f.id]={st:f.start,rev:0,src:'start',d:s.day,v:++kv,ok:0,none:0,worse:0,last:null};
  s.know=know;s.kv=kv;});
 guard(()=>{s.books=list(s.books,x=>L.BOOK.has(x),99);if(!s.books.includes('daro_notes'))s.books.unshift('daro_notes');});
 guard(()=>{const r=new Set(list(s.recipes,id=>L.POT.has(id),99));for(const b of s.books)for(const x of L.BOOK.get(b).recipes)r.add(x);for(const id of s.story.seen)for(const x of L.STORY.get(id).effect.recipes||[])r.add(x);s.recipes=[...r];});
 guard(()=>{s.upgrades=list(s.upgrades,x=>L.UPGRADE.has(x),99);});
 guard(()=>{s.decor=list(s.decor,x=>L.DECOR_OF.has(x),99);});
 guard(()=>{s.editions=list(s.editions,id=>!!s.monsters[id]?.treatise,99);});
 guard(()=>{const pick=(v,ok,max)=>{const out={};if(obj(v))for(const [k,n] of Object.entries(v))if(ok(k)&&int(n,0,max))out[k]=n;return out;};
  s.stock=pick(s.stock,k=>L.MAT.has(k),R.LIMITS.stock);s.potions=pick(s.potions,k=>L.POT.has(k),R.LIMITS.doses);s.notes=pick(s.notes,k=>L.MON.has(k),R.LIMITS.notes);});
 // Hunters: known ids that have come by their «joins»; numbers within their bounds; gear once.
 guard(()=>{const o=obj(s.hunters)?s.hunters:{},out={};for(const hd of[...Object.keys(o).filter(id=>L.HUNTER.has(id)),...L.HUNTERS.map(h=>h.id).filter(id=>!(id in o))].map(id=>L.HUNTER.get(id))){const j=hd.joins,may=j.day?s.day>=j.day:s.story.seen.includes(j.story);if(!may)continue;const h=obj(o[hd.id])?o[hd.id]:null;
   if(!h){out[hd.id]={joined:s.day,xp:0,trust:hd.trust,out:0,sulk:0,rag:0,gear:[],hunts:0,wins:0,fails:0,skill:0,doc:0,harmSeen:0,failSeen:0};continue;}
   const x={joined:num(h.joined,1,s.day,s.day),xp:num(h.xp,0,1e6,0),trust:num(h.trust,0,R.TRUST.max,hd.trust),out:num(h.out,0,R.WOUND.max,0),sulk:num(h.sulk,0,R.TRUST.sulk,0),rag:num(h.rag,0,3,0),
    gear:list(h.gear,g=>L.GEAR_OF.has(g),3),hunts:num(h.hunts,0,1e6,0),wins:num(h.wins,0,1e6,0),fails:num(h.fails,0,1e6,0),skill:num(h.skill,0,3,0),doc:h.doc===1?1:0,harmSeen:h.harmSeen===1?1:0,failSeen:h.failSeen===1?1:0};
   if(x.trust===0&&!x.sulk)x.trust=1;x.wins=Math.min(x.wins,x.hunts);x.fails=Math.min(x.fails,x.hunts-x.wins);out[hd.id]=x;}s.hunters=out;});
 // Arcs: known steps of hunters who came; a personal case only by its fired step.
 guard(()=>{s.arcs=list(s.arcs,id=>L.ARC.has(id)&&!!s.hunters[L.ARC.get(id).hunter]&&!L.ARC.get(id).effect?.repeat,R.LIMITS.arcs);const o=obj(s.personal)?s.personal:{},out={};
  for(const id of s.arcs){const a=L.ARC.get(id),p=a.effect?.personal;if(!p)continue;const x=obj(o[a.hunter])?o[a.hunter]:{};
   out[a.hunter]={monster:p.monster,variant:p.variant,since:num(x.since,1,s.day,s.day),state:x.state==='won'?'won':'open',tries:num(x.tries,0,1e6,0)};}s.personal=out;});
 // Cases, hunts and reports: anything pointing at what does not exist is dropped; a hunt that breaks the rules of the
 // sheet is cancelled (the hunter simply comes back without a report); a hunter has one hunt and one case of a kind.
 guard(()=>{const hunts=[],busy=new Set();for(const h of Array.isArray(s.hunts)?s.hunts:[])guard(()=>{const id=h.contract.hunter||'town:'+h.contract.id;if(hunts.length<R.LIMITS.hunts&&!busy.has(id)&&huntOk(s,h)){busy.add(id);hunts.push(h);}});s.hunts=hunts;});
 guard(()=>{const out=[],seen=new Set(),ids=new Set(s.hunts.map(h=>h.contract.id));for(const c of Array.isArray(s.contracts)?s.contracts:[])guard(()=>{if(out.length>=R.LIMITS.contracts||!contractOk(s,c,false)||ids.has(c.id))return;
   if(c.kind==='story'&&c.hunter&&s.hunts.some(h=>h.contract.hunter===c.hunter))c.hunter=null;const key=c.kind==='story'?'story':c.kind==='town'?'town:'+c.id:c.hunter+':'+c.kind;
   if(seen.has(key)||c.kind!=='story'&&c.hunter&&s.hunts.some(h=>h.contract.hunter===c.hunter))return;seen.add(key);ids.add(c.id);out.push(c);});s.contracts=out;});
 guard(()=>{const out=[],ids=new Set();for(const r of Array.isArray(s.reports)?s.reports:[])guard(()=>{if(out.length<R.LIMITS.reports&&!ids.has(r.id)&&reportOk(s,r)){ids.add(r.id);out.push(r);}});s.reports=out;});
 guard(()=>{const out=[],ids=new Set();for(const v of Array.isArray(s.visitors)?s.visitors:[])guard(()=>{if(!obj(v)||typeof v.id!=='string'||!/^v-[1-9][0-9]*$/.test(v.id)||ids.has(v.id)||!VISITOR_KINDS.includes(v.kind)||out.length>=R.LIMITS.visitors)return;
   const who=v.kind==='hunter'?!!s.hunters[v.who]:v.kind==='town'?L.TOWN_TYPE.has(v.who):v.who===v.kind;if(!who)return;
   ids.add(v.id);out.push({id:v.id,kind:v.kind,who:v.who,contract:typeof v.contract==='string'&&(s.contracts.some(c=>c.id===v.contract)||s.hunts.some(h=>h.contract.id===v.contract))?v.contract:null,rumour:L.FACT.has(v.rumour)&&s.monsters[L.monsterOf(v.rumour).id]?v.rumour:null,heard:v.heard===true});});s.visitors=out;});
 guard(()=>{const t=obj(s.trader)?s.trader:{};s.trader={day:num(t.day,0,s.day,0),rumours:(Array.isArray(t.rumours)?t.rumours:[]).filter(x=>obj(x)&&s.monsters[x.monster]&&L.MON.get(x.monster).tier<4).slice(0,2).map(x=>({monster:x.monster,price:R.RUMOUR_PRICE[L.MON.get(x.monster).tier],sold:x.sold===true}))};});
 guard(()=>{s.chronicle=(Array.isArray(s.chronicle)?s.chronicle:[]).filter(e=>obj(e)&&typeof e.t==='string').slice(0,R.LIMITS.chronicle).map(e=>({d:num(e.d,0,s.day,0),t:e.t.slice(0,200),k:typeof e.k==='string'&&/^[a-z-]{1,16}$/.test(e.k)?e.k:'note'}));});
 guard(()=>{s.daily.candles=Math.min(s.daily.candles,R.candleMax(s));s.rankSeen=num(s.rankSeen,0,R.rankOf(s.rep),R.rankOf(s.rep));});
 guard(()=>{const ids=[...s.contracts,...s.visitors,...s.reports,...s.hunts.map(h=>h.contract)].map(x=>idNum(x.id)).filter(Number.isSafeInteger);s.nextId=Math.max(s.nextId,1,...ids.map(n=>n+1));});
 guard(()=>{s.printed=s.story.seen.includes('S13')?num(s.printed,1,s.day,s.day):0;s.keeper=L.KEEPER.has(s.keeper)?s.keeper:'keeper_a';});
 guard(()=>{const t=obj(s.tutorial)?s.tutorial:{};s.tutorial={done:list(t.done,id=>STEP_IDS.includes(id),STEP_IDS.length),skipped:t.skipped===true,finished:typeof t.finished==='boolean'?t.finished:s.day>1};});
 guard(()=>{s.hintsSeen=list(s.hintsSeen,id=>TIP_IDS.includes(id),64);});
 guard(()=>{const p=obj(s.prefs)?s.prefs:{};s.prefs={large:p.large===true,calm:p.calm===true};if(typeof s.haptics!=='boolean')s.haptics=true;s.sound=s.sound===true;s.music=s.music===true;s.volume=Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.35;
  s.welcomed=s.welcomed===true;s.legacySeen=s.legacySeen===true;s.backup=num(s.backup,1,s.day,s.day);});
 return s;}
const ready=s=>{if(!obj(s.daily)||!Array.isArray(s.daily.firsts)||!obj(s.stats)||!obj(s.story)||!Array.isArray(s.story.seen)||!obj(s.hunters)||!obj(s.personal)||!Array.isArray(s.contracts)||!Array.isArray(s.hunts)||!Array.isArray(s.reports)||!Array.isArray(s.visitors)||!obj(s.trader)||!Array.isArray(s.editions)||!Array.isArray(s.decor)||!Array.isArray(s.chronicle)||!obj(s.tutorial))normalize(s);return s;};

// ---- the game
// A new bestiary: the keys of Даро (S0), the first hunters and their first words, and the lesson of day 1 (GDD 9.1).
export function newGame(seed){const s=B.newState(seed);applyStory(s,L.STORY.get('S0'));joinHunters(s);arcStep(s);B.makeDay(s);arcStep(s);return s;}
export function load(raw){try{return normalize(B.deserialize(raw));}catch(e){throw e instanceof B.BestiaryError?e:new B.BestiaryError('Файл сохранения повреждён.');}}
// The night and the morning (GDD 1.4): steps 1–5 in the core, then the story (one event), arcs, new hunters, the guests
// and cases of the day; returns what the morning windows show.
export function endDay(s){ready(s);
 const night=B.night(s),personal={};
 for(const r of night.reports){if(r.contract.kind==='personal'&&s.personal[r.hunter]){const p=s.personal[r.hunter];p.tries++;if(r.win)p.state='won';personal[r.hunter]=r.win?'won':'lost';}
  if(r.contract.kind==='story')applyStory(s,L.STORY.get('S11'));
  const m=L.MON.get(r.contract.monster),who=r.hunter||r.town;B.note(s,L.say(r.win?L.LINES.log.win:L.LINES.log.lose,{...L.words({monster:m,place:r.contract.place,day:s.day-1}),hunter:r.hunter?L.HUNTER.get(r.hunter).short:L.TOWN_TYPE.get(r.town).label},who),'hunt');}
 const shelf=R.shelfTier(s),joined=joinHunters(s),story=storyStep(s);joined.push(...joinHunters(s));const ctx={personal};const arcs=arcStep(s,ctx);
 B.makeDay(s);arcs.push(...arcStep(s,ctx));
 const rank=R.rankOf(s.rep);let rankUp=null;if(rank>s.rankSeen){rankUp={rank,from:s.rankSeen,name:L.RANKS[rank].name,opens:L.RANKS[rank].opens};s.rankSeen=rank;B.note(s,`День ${s.day}: звание «${L.RANKS[rank].name}».`,'rank');}
 return {reports:night.reports,rank:rankUp,story,arcs,morning:morning(s,night,joined,shelf)};}
export function morning(s,night={reports:[],back:[],forgiven:[],notes:[]},joined=[],shelf=R.shelfTier(s)){
 const amb={day:s.day,season:B.seasonOf(s),weather:B.weatherOf(s)};
 return {...amb,hold:s.story.hold,thaw:s.story.thaw,
  returns:night.reports.map(r=>({report:r.id,hunter:r.hunter,town:r.town,win:r.win,injury:r.injury,rag:r.rag})),
  healing:L.HUNTERS.filter(h=>s.hunters[h.id]?.out>0).map(h=>({hunter:h.id,days:s.hunters[h.id].out})),
  sulking:L.HUNTERS.filter(h=>s.hunters[h.id]?.sulk>0).map(h=>({hunter:h.id,days:s.hunters[h.id].sulk})),
  back:night.back||[],forgiven:night.forgiven||[],joined,
  notes:(night.notes||[]).map(n=>({...n,text:noteText(n)})),
  books:R.shelfTier(s)>shelf||s.visitors.some(v=>v.kind==='yanek')&&L.BOOKS.some(b=>b.seller!=='gift'&&b.tier<=R.shelfTier(s)&&!s.books.includes(b.id)),
  academy:R.academyOpen(s),guests:s.visitors.length,line:L.line(s.worldSeed,'m'+s.day,'morning',s.story.hold?L.LINES.morning.black_winter:night.reports?.length?L.LINES.morning.returns:L.LINES.morning.none)};}
// «Ведана не дождалась и оставила на столе записку о кикиморе: «…»» (decision D5).
export function noteText(n){const f=L.FACT.get(n.fact),m=L.monsterOf(n.fact),name=n.kind==='town'?L.TOWN_TYPE.get(n.who)?.label:L.VISITOR.get(n.kind)?.name;return `${name} ${L.say(L.LINES.note,L.words({monster:m,fact:f}),n.kind==='town'?n.who:n.kind)}`;}

// ---- the text of a report (GDD 4.2): greeting, the first phrase, a line for every piece of advice, the contradiction,
// the wound or the reward.
export function reportText(s,rid){const r=s.reports.find(r=>r.id===rid);if(!r)return null;const seed=s.worldSeed,m=L.MON.get(r.contract.monster),hd=r.hunter&&L.HUNTER.get(r.hunter),who=r.hunter||r.town;
 const w=x=>({...L.words({monster:m,place:r.contract.place,hunter:hd,variant:r.contract.variant,...x})}),say=(t,x={})=>L.say(t,w(x),who),one=(k,list,x)=>say(L.line(seed,r.id,k,list),x);
 const story=r.contract.kind==='story'?L.STORY.get('S11').text:null,name=hd?hd.name:L.TOWN_TYPE.get(r.town).label;
 const greet=story?one('greet',r.win?story.win:story.lose):hd?one('greet',r.win?hd.lines.thanks:hd.lines.ragged):one('greet',L.VISITOR.get('townsfolk').lines.thanks);
 const first=story?'':one('first',r.win?m.victory:m.rout);
 const items=r.items.map((x,i)=>{const f=L.FACT.get(x.f);return {f:x.f,title:f.title,o:x.o,seen:x.seen,stamp:L.STAMPS[x.seen?x.o:'unseen'],from:x.from,to:x.to,rev:x.rev,
  text:x.seen?say(f.lines[x.o]):say(L.line(seed,r.id,'unseen'+i,L.LINES.unseen),{fact:f}),contradiction:x.rev?say(L.LINES.contradiction,{fact:f}):null};});
 const after=[];
 if(!r.win){if(hd&&r.injury)after.push(one('wound',r.injury<=1?L.LINES.wound.light:hd.lines.injured?.length?hd.lines.injured:L.LINES.wound.heavy,{days:r.injury}));}
 else{if(r.offer){const o=r.offer;if(r.choice==='coins')after.push(one('coins',L.LINES.reward.coins,{coins:o.coins}));else if(r.choice==='loot')after.push(one('loot',L.LINES.reward.loot,{loot:o.loot.map(x=>L.partName(x.id).toLowerCase()+(x.n>1?' ×'+x.n:'')).join(', ')}));
   else if(r.choice==='know'&&o.tale)after.push(one('fact',o.sure?L.LINES.reward.factSure:L.LINES.reward.fact,{fact:o.tale}));}
  if(r.paid)after.push(one('coins',L.LINES.reward.coins,{coins:r.paid}));if(r.trophy)after.push(one('trophy',L.LINES.reward.trophy,{trophy:m.trophy.name}));}
 return {title:`Отчёт · ${name} · день ${r.day}`,name,win:r.win,greet,first,items,after,shown:r.shown,
  offer:r.offer&&!r.choice?{coins:`Монеты · ${r.offer.coins}`,loot:`Добыча · ${r.offer.loot.map(x=>L.partName(x.id).toLowerCase()+(x.n>1?' ×'+x.n:'')).join(', ')}`,know:r.offer.tale?'Знание · новое сведение и записи':'Знание · полевые записи'}:null};}

// ---- the wrappers P.*: every one repairs a state that lacks a field, then runs one atomic action of the core.
const act=fn=>(s,...a)=>{ready(s);return fn(s,...a);};
export const listen=act(B.listen),advise=act(B.advise),defer=act(B.defer),decline=act(B.decline),assign=act(B.assign),heal=act(B.heal);
export const preview=act(B.preview),truthChance=act(B.truthChance);
export const claim=act(B.claim),askAgain=act(B.askAgain),readReport=act(B.readReport);
export const labTest=act(B.labTest),studyTrophy=act(B.studyTrophy),crossCheck=act(B.crossCheck),rummage=act(B.rummage),brew=act(B.brew);
export const buy=act(B.buy),sell=act(B.sell),buyRumour=act(B.buyRumour),buyBook=act(B.buyBook),buyCandle=act(B.buyCandle),copyPage=act(B.copyPage),writeTreatise=act(B.writeTreatise);
export const leaflet=act(B.leaflet),upgrade=act(B.upgrade),equip=act(B.equip),buyDecor=act(B.buyDecor),buyEdition=act(B.buyEdition);
// The seal of «Великий бестиарий» is the last event of the story (S13); the game goes on.
export function printBestiary(s){ready(s);const r=B.printBestiary(s);if(!r.ok)return r;B.note(s,`День ${s.day}: напечатан «Великий бестиарий».`,'print');return {...r,story:applyStory(s,L.STORY.get('S13'))};}
// Fresh ink on a page: records changed since it was last looked at.
export function freshInk(s,mid){ready(s);const mon=s.monsters[mid];return mon?L.MON.get(mid).facts.filter(f=>(s.know[f.id]?.v||0)>mon.seen).map(f=>f.id):[];}
export function seePage(s,mid){ready(s);const mon=s.monsters[mid];if(!mon)return false;const was=mon.seen;mon.seen=s.kv;return was!==s.kv;}
export function seeDots(s){ready(s);let changed=false;for(const id of Object.keys(s.monsters))changed=seePage(s,id)||changed;return changed;}
export function setKeeper(s,id){ready(s);if(!L.KEEPER.has(id))return B.fail('Такого облика нет.');s.keeper=id;return {ok:true};}
export function tutor(s,id){ready(s);const t=s.tutorial;if(t.finished||t.skipped||!STEP_IDS.includes(id)||t.done.includes(id))return false;t.done.push(id);if(STEP_IDS.every(x=>t.done.includes(x)))t.finished=true;return true;}
export function restartTutorial(s){ready(s);s.tutorial={done:[],skipped:false,finished:false};return s.tutorial;}
export function skipTutorial(s){ready(s);s.tutorial.skipped=true;return s.tutorial;}
export function seeHint(s,id){ready(s);if(!TIP_IDS.includes(id)||s.hintsSeen.includes(id)||s.hintsSeen.length>=64)return false;s.hintsSeen.push(id);return true;}
export function markBackup(s){ready(s);s.backup=s.day;}
// What the reception shows: the cases on the table with their guest, hunter and circumstances.
// One sign of the variant is shown on the card, fixed by the id of the case (GDD 3.5).
export function cases(s){ready(s);return s.contracts.map(c=>({...c,ctx:B.ctxOf(s,c),sign:L.line(s.worldSeed,c.id,'sign',L.MON.get(c.monster).variants.find(v=>v.id===c.variant)?.signs||[])||'',visitor:s.visitors.find(v=>v.contract===c.id)?.id||null}));}
// «Небо дня» (GDD 3.5): the weather and season of the rules, and the revealed conditions of open pages that hold or are
// empty today (variant conditions depend on the case and are shown on its card instead).
export function skyToday(s){ready(s);const ctx={weather:B.weatherOf(s),season:B.seasonOf(s)},facts=[];
 for(const m of B.openList(s))for(const f of m.facts){const k=s.know[f.id];if(!k?.rev||f.cond.variant)continue;const o=R.outcome(f,{...ctx,variant:'grown'});facts.push({id:f.id,monster:m.id,outcome:o});}
 return {...ctx,day:s.day,hold:s.story.hold,facts};}
// The cards that may go into the sheet of a case, by category, with what the player believes they do now.
export function cards(s,cid){ready(s);const c=s.contracts.find(c=>c.id===cid);if(!c)return [];const ctx=B.ctxOf(s,c);
 return L.MON.get(c.monster).facts.filter(f=>s.know[f.id]).map(f=>{const k=s.know[f.id];return {id:f.id,cat:f.cat,st:k.st,rev:k.rev,believed:R.believed(k,f,ctx),usable:R.usable(k,f,ctx)};});}
