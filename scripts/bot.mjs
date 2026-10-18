// The balance bot of the bestiary (GDD 12.6). It plays only through the wrappers P.*, like the interface, and reads the
// content only through lore.js; after every day the state goes through P.load(P.serialize(s)). Five strategies:
// naive, careful, learning, random, merchant. The reference of its behaviour is pix-tools/bestiary/gdd-sim.mjs.
import * as P from '../src/progress.js';
import * as L from '../src/lore.js';
import {roll} from '../src/rng.js';

const SMART=new Set(['careful','learning']),LAB=['substance','ward'];
const UPGRADE_ORDER=['candle1','still','lens','infirmary','dovecote','hall','candle2','press'];
const BREW={smart:['aconite_oil','thistle_brew','thursday_salt','courage','wormwood_water','dawn_tincture'],merchant:['courage']};
const ok=r=>{if(r&&r.ok===false)throw new Error('bot: refused action: '+r.why);return r;};
// Every triple of usable cards in three different categories, in the order of the content.
function combos(cards,strict){const list=cards.filter(c=>c.usable&&(!strict||c.st!=='rumour'||c.rev)),out=[];
 for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++)for(let d=b+1;d<list.length;d++){const x=[list[a],list[b],list[d]];if(new Set(x.map(c=>c.cat)).size===3)out.push(x);}return out;}
function potionsFor(s,strat,m){if(strat==='naive'||strat==='random')return [];const pots=[];
 const fam=L.POTIONS.filter(p=>p.kind==='family'&&(s.potions[p.id]||0)>0&&p.target.some(t=>m.tags.includes(t))).sort((a,b)=>b.bonus-a.bonus)[0];if(fam)pots.push(fam.id);
 if((s.potions.courage||0)>0)pots.push('courage');return pots;}
function value(strat,e){return strat==='learning'?e.mid+(e.mid>=66?7:2)*e.r:strat==='merchant'?e.mid-e.r:e.mid-.5*e.r;}
const resolvedFact=(s,f)=>{const k=s.know[f.id];return !!k&&k.st!=='rumour'&&(f.truth!=='conditional'||k.rev===1);};
// The reward after a win (GDD 12.6): knowledge while the page is not full, loot when a sample is missing, else coins.
function choose(s,strat,r){if(strat==='random')return ['coins','loot','know'][Math.floor(roll(s.worldSeed,'ch',r.contract.id)*3)];if(!SMART.has(strat))return 'coins';
 const m=L.MON.get(r.contract.monster),unknown=m.facts.some(f=>!s.know[f.id]),rumLab=m.facts.some(f=>s.know[f.id]?.st==='rumour'&&LAB.includes(f.cat));
 if(!P.pageDone(s,m.id)&&(unknown||(s.notes[m.id]||0)<2||m.facts.some(f=>!LAB.includes(f.cat)&&s.know[f.id]&&!resolvedFact(s,f))))return 'know';
 return rumLab&&!((s.stock[m.loot.common]||0)>0)?'loot':'coins';}
function purchases(s,strat,ledger){
 const rank=P.rankOf(s.rep);
 for(const id of UPGRADE_ORDER){const u=L.UPGRADE.get(id);if(!s.upgrades.includes(id)&&u.rank<=rank&&s.gold>=u.price+80)ok(P.upgrade(s,id));}
 const shelf=P.shelfTier(s);
 // Reliable books only: careful buys the book of a tier II–III page, learning every reliable book about an open page.
 for(const b of L.BOOKS){if(s.books.includes(b.id)||b.seller==='gift'||!b.reliable||b.tier>shelf)continue;
  const mons=[...new Set(Object.keys(b.sets).map(id=>id.split('.')[0]))].filter(id=>s.monsters[id]);const needs=mons.some(id=>L.MON.get(id).tier>=2)||strat==='learning'&&mons.length>0;
  if(needs&&s.gold>=b.price+25)ok(P.buyBook(s,b.id));}
 if(strat==='learning')s.trader.rumours.forEach((x,slot)=>{if(!x.sold&&s.gold>60&&P.hasUnknown(s,L.MON.get(x.monster))){ledger.sheets+=x.price;ok(P.buyRumour(s,slot));}});
 const hunters=L.HUNTERS.filter(h=>s.hunters[h.id]).sort((a,b)=>s.hunters[b.id].hunts-s.hunters[a.id].hunts).slice(0,4);
 for(const h of hunters)for(const g of L.GEAR)if(rank>=g.rank&&!s.hunters[h.id].gear.includes(g.id)&&s.gold>=g.price+150)ok(P.equip(s,h.id,g.id));
 // Decision D3: the cosmetic sinks only from a purse far above everything useful and the price of the seal.
 for(const d of L.DECOR)if(!s.decor.includes(d.id)&&s.gold>=d.price+1500)ok(P.buyDecor(s,d.id));
 for(const m of L.MONSTERS)if(s.monsters[m.id]?.treatise&&!s.editions.includes(m.id)&&s.gold>=P.editionPrice(m.id)+1500)ok(P.buyEdition(s,m.id));}
function brewing(s,strat,ledger){for(const id of strat==='merchant'?BREW.merchant:BREW.smart){if(P.candlesLeft(s)<=1)break;if(!s.recipes.includes(id)||(s.potions[id]||0)>=2)continue;
 const c=P.brewCost(s,id);if(c.need.some(x=>!x.buy)||s.gold<c.coins+30)continue;ledger.herbs+=c.coins;ok(P.brew(s,id,{buyMissing:true}));}}
// The evening of a careful or learning keeper: one experiment a page, then treatises, the Academy, leaflets and the seal.
function evening(s,strat){
 for(const m of P.openList(s)){if(P.candlesLeft(s)<=0)break;const mon=s.monsters[m.id];
  const part=[m.loot.common,m.loot.rare].find(p=>(s.stock[p]||0)>0);
  const lf=m.facts.filter(f=>LAB.includes(f.cat)&&s.know[f.id]&&(s.know[f.id].st==='rumour'||f.truth==='conditional'&&!s.know[f.id].rev));
  if(lf.length&&part){ok(P.labTest(s,lf.slice(0,s.upgrades.includes('lens')?2:1).map(f=>f.id),part));continue;}
  const af=m.facts.find(f=>!LAB.includes(f.cat)&&s.know[f.id]&&(s.know[f.id].st==='rumour'||f.truth==='conditional'&&!s.know[f.id].rev));
  if(af&&(s.notes[m.id]||0)>0&&P.candlesLeft(s)>=2){ok(P.crossCheck(s,af.id));continue;}
  if(P.hasUnknown(s,m)&&P.candlesLeft(s)>2&&m.tier<4){ok(P.rummage(s,m.id));continue;}
  for(const v of mon.troph){if(mon.studied.includes(v)||P.candlesLeft(s)<=0)continue;const f=m.facts.find(f=>LAB.includes(f.cat)&&(!s.know[f.id]||s.know[f.id].st==='rumour'));if(!f)break;
   ok(P.studyTrophy(s,m.id,v,s.know[f.id]?f.id:null));}}
 for(const m of P.openList(s))if(P.candlesLeft(s)>=2&&!s.monsters[m.id].treatise&&m.tier<4&&P.pageDone(s,m.id)&&(s.notes[m.id]||0)>=2)ok(P.writeTreatise(s,m.id));
 if(P.academyOpen(s))for(const m of P.openList(s)){const free=s.story.seen.includes('S2')&&!s.daily.copied;if(P.candlesLeft(s)<=0&&!free)break;if(P.academyOffer(s,m.id).n>=2)ok(P.copyPage(s,m.id));}
 if(P.rankOf(s.rep)>=2)for(const m of P.openList(s)){const mon=s.monsters[m.id],press=s.upgrades.includes('press');if(m.tier>=4||mon.leaflet&&s.day-mon.leaflet<10||!press&&P.candlesLeft(s)<=0)continue;
  const n=m.facts.filter(f=>s.know[f.id]?.st==='confirmed').length;if(P.leafletValue(n,press)>=6)ok(P.leaflet(s,m.id));}
 if(!s.printed&&P.rankOf(s.rep)>=5&&P.treatises(s)===L.MONSTERS.length&&s.gold>=1200&&P.candlesLeft(s)>=3)ok(P.printBestiary(s));}
// The cases of the morning: the best sheet by the strategy's own value; refusals below its threshold.
function advise(s,strat,series,checks){
 const used=new Set(),had=new Set(s.contracts.filter(c=>c.kind!=='story').map(c=>c.hunter).filter(Boolean));
 for(const c of [...s.contracts]){if(!s.contracts.includes(c))continue;const m=L.MON.get(c.monster);
  if(c.kind==='story'){const best=L.HUNTERS.filter(h=>P.free(s,h.id)&&!had.has(h.id)&&!used.has(h.id)).sort((a,b)=>P.skillBonus(b.id,s.hunters[b.id])-P.skillBonus(a.id,s.hunters[a.id]))[0];if(!best)continue;ok(P.assign(s,c.id,best.id));}
  if(c.hunter&&!P.free(s,c.hunter))continue;
  const cards=P.cards(s,c.id),all=combos(cards,strat==='naive'||strat==='careful'||strat==='merchant');if(!all.length)continue;
  let pots=potionsFor(s,strat,m),pick;const base=P.preview(s,c.id,[],pots),b={skill:base.skill,potion:base.potion,vmod:base.vmod,forgive:0};
  const est=x=>P.estimate(x.map(c=>c.believed),b);
  if(strat==='random'){pick=all[Math.floor(roll(s.worldSeed,'rnd',c.id)*all.length)];pots=[];}
  else{let best=null,bv=-Infinity;for(const x of all){const v=value(strat,est(x));if(v>bv){bv=v;best=x;}}pick=best;const e=est(pick);
   if(c.kind==='story'&&e.mid<66||strat!=='learning'&&e.mid<66||strat==='learning'&&e.mid<34){if(c.kind==='hunter'||c.kind==='town')ok(P.decline(s,c.id));continue;}}
  const ids=pick.map(x=>x.id),pv=P.preview(s,c.id,ids,pots),truth=P.truthChance(s,c.id,ids,pots),ctx=P.ctxOf(s,c);
  const K=ids.filter(id=>P.outcome(L.FACT.get(id),ctx)==='ok').length,u=c.id==='c-1'?.4:roll(s.worldSeed,'hunt',c.id);
  checks.hunt({s,c,ids,pots,pv,truth,K,strat});
  ok(P.advise(s,c.id,ids,pots));if(c.hunter)used.add(c.hunter);
  series.push({day:s.day,win:100*u<truth,P:truth,mid:pv.raw.mid,tier:m.tier,full:truth===100,kind:c.kind,np:pots.length});}}
const listenAll=s=>{for(const v of s.visitors)if(!v.heard)ok(P.listen(s,v.id));};
function sellParts(s,strat){const keep=SMART.has(strat)?1:0;for(const mt of L.PARTS){const n=(s.stock[mt.id]||0)-keep;if(n>0&&mt.sell>0)ok(P.sell(s,mt.id,n));}}
export function play(seed,strat,days=90,{reload=true,stopAt=0,checks=noChecks}={}){
 let s=P.newGame(seed);const series=[],rankDay=[1],gold={},rep={},windows=[],ledger={herbs:0,sheets:0,candles:0,doctor:0};let low=s.gold,koldun=0,doneDay=0,start100=0,injury=0,sulks=0,firstFail=0,firstWorse=0;
 const unavailable={};let winIncome=0,winCost=0;
 for(;s.day<=days;){
  if(stopAt&&s.day===stopAt)return {state:P.serialize(s)};
  for(const r of s.reports)if(r.offer&&!r.choice)ok(P.claim(s,r.id,choose(s,strat,r)));
  sellParts(s,strat);
  const before={herbs:ledger.herbs,sheets:ledger.sheets},earnedBefore=s.stats.earned;
  if(SMART.has(strat)){purchases(s,strat,ledger);brewing(s,strat,ledger);}else if(strat==='merchant')brewing(s,strat,ledger);
  listenAll(s);advise(s,strat,series,checks);
  if(SMART.has(strat))evening(s,strat);
  checks.day(s,strat);
  // Operating balance of a day: what came in, minus herbs, rumour sheets, candles and the doctor.
  winIncome+=s.stats.earned-earnedBefore;winCost+=ledger.herbs-before.herbs+ledger.sheets-before.sheets;
  if(s.day>=11&&(s.day-10)%10===0){windows.push(winIncome-winCost);}if(s.day%10===0){winIncome=0;winCost=0;}
  gold[s.day]=s.gold;rep[s.day]=s.rep;low=Math.min(low,s.gold);
  for(const h of L.HUNTERS){const x=s.hunters[h.id];if(!x)continue;unavailable[h.id]=x.out>0||x.sulk>0?(unavailable[h.id]||0)+1:0;checks.hunter(h.id,x,unavailable[h.id]);}
  const day=s.day,res=P.endDay(s);for(const r of res.reports){if(!r.win){injury+=r.injury;if(!firstFail)firstFail=day+1;}if(r.sulk)sulks++;if(!firstWorse&&r.items.some(x=>x.o==='worse'))firstWorse=day+1;}
  if(reload)s=P.load(P.serialize(s));
  const r=P.rankOf(s.rep);while(rankDay.length<=r)rankDay.push(day);
  if(!koldun&&s.story.koldun)koldun=s.story.koldun;if(!doneDay&&P.treatises(s)===L.MONSTERS.length)doneDay=day;
  if(!start100&&L.START.every(id=>{const ctx={variant:'grown',weather:'clear',season:0},cats=new Set(L.MON.get(id).facts.filter(f=>P.believed(s.know[f.id],f,ctx)==='ok').map(f=>f.cat));return cats.size>=3;}))start100=day;}
 const sel=(a,b)=>series.filter(v=>v.day>=a&&v.day<=b),rate=x=>x.length?x.filter(v=>v.win).length/x.length:NaN,full=x=>x.length?x.filter(v=>v.full).length/x.length:NaN;
 return {seed,strat,days,series,rankDay,gold,rep,low,windows,ledger,state:s,w1:rate(sel(1,10)),w2:rate(sel(11,30)),w3:rate(sel(31,60)),all:rate(sel(1,days)),full2:full(sel(21,40)),full3:full(sel(41,days)),
  hunts:series.length,treat:P.treatises(s),doneDay:doneDay||999,printed:s.printed||999,koldun:koldun||999,s3:s.story.days.S3||999,s5:s.story.days.S5||999,s10:s.story.days.S10||999,start100:start100||999,
  earned:s.stats.earned,spent:s.stats.spent,academy:s.stats.academy,rank:P.rankOf(s.rep),fails:s.stats.fails,cosmetic:s.decor.length+s.editions.length,injury,sulks,firstFail:firstFail||999,firstWorse:firstWorse||999};}
const noChecks={hunt(){},day(){},hunter(){}};
