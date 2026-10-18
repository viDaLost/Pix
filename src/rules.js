// The pure mathematics of the bestiary (GDD 3–6): what a piece of advice does under the circumstances of a hunt, the
// chance of the hunt, the estimate the player sees, observation, wounds, ranks, candles, the fullness of a page and the
// offer of the Academy. Nothing here changes a state; every function reads only what it is given.
import {MON,FACT,POT,HUNTER,RANKS,UPGRADES,CAT,MAT} from './lore.js';
export const FEE=[0,5,8,12,0],LOOT_N=[0,1,2,2,0],RUMOUR_PRICE=[0,5,7,9,11],TREATISE=[0,40,80,120,0];
export const VMOD={young:5,grown:0,ancient:-10},VMUL={young:.8,grown:1,ancient:1.5};
export const HARM=25,POTION_CAP=20,BONUS_CAP=25,P_CAP=95,THIRD=100/3;
export const SKILL_BASE=[0,0,2,4,6,8],LEVELS=[0,4,10,18,30],SEE=[0,.55,.65,.75,.85,.95],SEE_WIN=.1;
export const CANDLES=[3,3,4,4,5,5],CANDLE_LIMIT=8,GUESTS=[2,2,3,3,3,3],QUIET=.2;
export const TOWN={chance:.3,share:.5,fee:3,pay:12,see:2,maxTier:2};
export const PRICE={candle:6,doctor:8,print:1200,blade:2};
export const ACADEMY={confirmed:4,refuted:2,dangerous:3,rev:6,troph:5,need:2};
export const LEAFLET={per:2,cap:12,press:1.5,pressCap:18,every:10,need:3};
export const RUMMAGE={chance:.4,sure:3},TRUST={max:5,sulk:5,share:20,per:4,gift:4},WOUND={min:1,max:4};
export const LIMITS={stock:999,notes:99,doses:9,sold:60,reports:16,chronicle:200,visitors:10,contracts:10,hunts:10,arcs:64,firsts:40};
export const LAB_CATS=['substance','ward'],ARCHIVE_CATS=['time','place','ritual'];
export const STATE_OF={ok:'confirmed',none:'refuted',worse:'dangerous'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// What one fact does under the circumstances {variant, weather, season} (GDD 2.2).
export function outcome(f,ctx){
 if(f.truth==='true')return 'ok';if(f.truth==='myth')return 'none';if(f.truth==='harmful')return 'worse';
 const c=f.cond||{},hit=(!c.variant||c.variant.includes(ctx.variant))&&(!c.weather||c.weather.includes(ctx.weather))&&(!c.season||c.season.includes(ctx.season));
 return hit?'ok':f.otherwise==='harmful'?'worse':'none';}
// The chance of a hunt with K helping and H harmful pieces of advice (GDD 3.1). Three helping — exactly 100, always.
export function chance(K,H,{skill=0,potion=0,vmod=0,forgive=0}={}){
 if(K>=3)return 100;
 const harm=HARM*Math.max(0,H-forgive),plus=Math.min(BONUS_CAP,skill+Math.min(POTION_CAP,potion)+Math.max(0,vmod));
 return clamp(K*THIRD-harm+plus+Math.min(0,vmod),0,P_CAP);}
// Hunters: level by experience, skill and perception with gear and arcs, the tiers they may take (GDD 4.1, 4.6).
export const level=xp=>LEVELS.filter(x=>(xp||0)>=x).length-1;
export const skillOf=(id,h)=>Math.min(5,(HUNTER.get(id)?.skill||1)+(h?.skill||0));
export const skillBonus=(id,h)=>h?SKILL_BASE[skillOf(id,h)]+level(h.xp)+(h.gear?.includes('blade')?PRICE.blade:0):0;
export const perception=(id,h)=>h?Math.min(5,(HUNTER.get(id)?.perception||1)+(level(h.xp)>=2)+(level(h.xp)>=4)+(h.gear?.includes('spyglass')?1:0)):TOWN.see;
export const maxTier=(id,h)=>Math.min(3,1+level(h?.xp)+(skillOf(id,h)>=4?1:0));
// The sum of the P-bonuses of the potions given against this monster; the cap of 20 is applied in chance().
export function potionBonus(monster,ids){const m=typeof monster==='string'?MON.get(monster):monster;let p=0;
 for(const id of ids||[]){const x=POT.get(id);if(x?.bonus&&(x.target.includes('all')||x.target.some(t=>m.tags.includes(t))))p+=x.bonus;}return p;}
export const potionFits=(monster,id)=>{const m=typeof monster==='string'?MON.get(monster):monster,x=POT.get(id);return !!x&&(x.target.includes('all')||x.target.some(t=>m.tags.includes(t)));};
export const forgives=ids=>(ids||[]).includes('ward_tincture')?1:0;
// The bonuses of a hunter (or of a townsperson: skill 0) against a monster in a variant with these potions.
export function bonuses(hunterId,h,monster,variant,potions){return {skill:skillBonus(hunterId,h),potion:potionBonus(monster,potions),vmod:VMOD[variant]||0,forgive:forgives(potions)};}
// What the player believes a card does: confirmed → ok, refuted → none, dangerous → worse, a revealed condition → the
// exact outcome, a rumour → null (unknown), no record → undefined (GDD 3.3).
export function believed(k,f,ctx){if(!k)return undefined;if(k.rev)return outcome(f,ctx);return k.st==='confirmed'?'ok':k.st==='refuted'?'none':k.st==='dangerous'?'worse':null;}
// The estimate of the sheet by the player's own records, three times: rumours as none (mid), as ok (high), as worse (low).
export function estimate(beliefs,b){let K=0,H=0,R=0;for(const x of beliefs){if(x==='ok')K++;else if(x==='worse')H++;else if(x===null)R++;}
 return {low:chance(K,H+R,b),mid:chance(K,H,b),high:chance(K+R,H,b),k:K,r:R,h:H};}
export const estimateLine=mid=>mid>=100?'sure':mid>=66?'good':mid>=34?'risky':'grim';
// The chance to notice what one piece of advice did (GDD 4.1); harm is always noticed elsewhere.
export const observeChance=(perc,win,sure=false)=>sure?1:Math.min(1,SEE[clamp(perc,1,5)]+(win?SEE_WIN:0));
// Days of a wound, counting the day of the report (GDD 4.4), and the look of the hunter after it.
export function woundDays({harm=0,P=0,variant='grown',danger=1,balm=false,theriac=false,infirmary=false,cuirass=false}){
 return clamp(1+harm+(P<34?1:0)+(variant==='ancient'?1:0)+(danger>=4?1:0)-(balm?2:0)-(theriac?1:0)-(infirmary?1:0)-(cuirass?1:0),WOUND.min,WOUND.max);}
export const ragFor=(days,balm=false)=>{const r=days<=1?1:days===2?2:3;return balm?Math.max(1,r-1):r;};
export const share=trust=>TRUST.share+TRUST.per*clamp(trust,0,TRUST.max);
export const coinsOffer=(bounty,variant,trust)=>Math.round(bounty*(VMUL[variant]||1)*share(trust)/100);
// The rules of the sheet (GDD 3.2): exactly three different facts of this monster, at most one a category, none
// dangerous and none a revealed condition that harms now. Returns Russian reasons; empty means the sheet may go.
export function adviceErrors(know,monster,ctx,ids){const out=[],m=typeof monster==='string'?MON.get(monster):monster,list=Array.isArray(ids)?ids:[];
 if(list.length<3){const n=3-list.length;out.push(`Нужно ещё ${n} ${n===1?'указание':'указания'}.`);}
 if(list.length>3)out.push('Указаний в листе — ровно три.');
 if(new Set(list).size!==list.length)out.push('Одно указание дважды не пишут.');
 const cats=new Set();
 for(const id of list){const f=FACT.get(id);if(!f||!m||!id.startsWith(m.id+'.')){out.push('Это сведение не о том чудовище.');continue;}
  const k=know?.[id];if(!k){out.push('Этого в бестиарии ещё нет.');continue;}
  if(!k.rev&&k.st==='dangerous')out.push(`«${f.title}» — опасно: так советовать нельзя.`);
  else if(k.rev&&outcome(f,ctx)==='worse')out.push(`«${f.title}» сейчас опасно: так советовать нельзя.`);
  if(cats.has(f.cat))out.push(`Не больше одного указания на род «${CAT.get(f.cat).name}».`);cats.add(f.cat);}
 return [...new Set(out)];}
// May this card be written into the sheet at all (GDD 2.4).
export const usable=(k,f,ctx)=>!!k&&(k.rev?outcome(f,ctx)!=='worse':k.st!=='dangerous');
// Potions of a hunt (GDD 3.4): at most two, different, one general and one family at most, all in the stock.
export function potionErrors(stock,ids){const out=[],list=Array.isArray(ids)?ids:[];
 if(list.length>2)out.push('Не больше двух снадобий на охоту.');
 if(new Set(list).size!==list.length)out.push('Два одинаковых снадобья не дают.');
 let general=0,family=0;
 for(const id of list){const p=POT.get(id);if(!p){out.push('Такого снадобья нет.');continue;}if(!((stock?.[id]||0)>0))out.push(`Нет снадобья «${p.name}».`);if(p.kind==='general')general++;if(p.kind==='family')family++;}
 if(general>1)out.push('Общее снадобье — только одно.');if(family>1)out.push('Снадобье против семейства — только одно.');
 return [...new Set(out)];}
// Ranks by reputation and candles a day by rank and furniture (GDD 1.2, 6.2).
export const rankOf=rep=>RANKS.filter(r=>(rep||0)>=r.rep).length-1;
export const candleMax=s=>Math.min(CANDLE_LIMIT,CANDLES[rankOf(s.rep)]+(s.upgrades.includes('candle1')?1:0)+(s.upgrades.includes('candle2')?1:0)+(s.daily.extra?1:0));
export const candlesLeft=s=>Math.max(0,candleMax(s)-s.daily.candles);
export const guestsOf=rank=>GUESTS[rank];
// The page of a monster (GDD 2.6): resolved = a record that is not a rumour; full = every fact resolved, every condition
// revealed and trophies of min(2, variants) variants.
export function pageStats(s,monsterId){const m=MON.get(monsterId),mon=s.monsters[monsterId],n=m.facts.length;let resolved=0,unrevealed=0,unknown=0,rumours=0;
 for(const f of m.facts){const k=s.know[f.id];if(!k){unknown++;continue;}if(k.st==='rumour'){rumours++;continue;}resolved++;if(f.truth==='conditional'&&!k.rev)unrevealed++;}
 const need=Math.min(2,m.variants.length),troph=mon?mon.troph.length:0;
 return {total:n,resolved,unknown,rumours,unrevealed,troph,need,done:resolved===n&&unrevealed===0&&troph>=need};}
export const pageDone=(s,monsterId)=>!!s.monsters[monsterId]&&pageStats(s,monsterId).done;
// The records of a page the Academy has not bought yet (GDD 5.5): key `${fact}:${st}:${rev}` or `troph:${variant}`.
export function academyOffer(s,monsterId){const m=MON.get(monsterId),mon=s.monsters[monsterId];if(!m||!mon)return {keys:[],coins:0,n:0};const keys=[];let coins=0;
 for(const f of m.facts){const k=s.know[f.id];if(!k||k.st==='rumour')continue;const key=`${f.id}:${k.st}:${k.rev?1:0}`;if(mon.sold.includes(key))continue;keys.push(key);coins+=(k.rev?ACADEMY.rev:ACADEMY[k.st])*m.tier;}
 for(const v of mon.troph){const key=`troph:${v}`;if(!mon.sold.includes(key)){keys.push(key);coins+=ACADEMY.troph*m.tier;}}
 return {keys,coins,n:keys.length};}
// The ceiling of the Academy over a whole game, from the content (GDD 5.5): every record once, every treatise once.
export function academyMax(){let sum=0;for(const m of MON.values()){const c=t=>m.facts.filter(f=>f.truth===t).length;
 sum+=m.tier*(4*c('true')+2*c('myth')+3*c('harmful')+10*c('conditional')+5*m.variants.length);if(m.tier<4)sum+=TREATISE[m.tier];}return sum;}
// A leaflet for the printer (GDD 5.5): 2 coins per confirmed fact, at least 3, capped; the press pays half again.
export const leafletValue=(confirmed,press)=>confirmed<LEAFLET.need?0:Math.min(press?LEAFLET.pressCap:LEAFLET.cap,Math.round(LEAFLET.per*confirmed*(press?LEAFLET.press:1)));
// The shelf of books: the highest tier among open monsters of tiers I–III (GDD 5.6).
export const shelfTier=s=>Math.max(1,...Object.keys(s.monsters).map(id=>MON.get(id)?.tier||1).filter(t=>t<4));
// The Academy buys pages after S1 on days divisible by three, every day with rank 3 or the dovecote (GDD 5.5).
export const academyOpen=s=>s.story.seen.includes('S1')&&(s.day%3===0||rankOf(s.rep)>=3||s.upgrades.includes('dovecote'));
export const upgradePrice=id=>UPGRADES.find(u=>u.id===id)?.price;
export const sellPrice=id=>MAT.get(id)?.sell||0;
