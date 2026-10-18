// The balance check of the bestiary (GDD 12.6): 60 seeds × 5 strategies × 90 days, plus careful and learning × 150 days,
// on worker threads. Every check A1–I2 is an assertion; `--write` regenerates docs/BALANCE.md. The bot plays only
// through P.* (scripts/bot.mjs). Reference numbers are the calibration of pix-tools/bestiary/gdd-sim.mjs (GDD 12.7).
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {play} from './bot.mjs';
import * as P from '../src/progress-next.js';
import * as L from '../src/lore.js';
import * as R from '../src/rules.js';
import {roll} from '../src/rng.js';
import {contentErrors} from './content-rules.mjs';

const STRATS=['naive','careful','learning','random','merchant'],SEEDS=+process.env.SEEDS||60,DAYS=90,LONG=150;
const EPS=1e-9,MAX_P=200/3+R.BONUS_CAP;
// Checks that watch every hunt, day and hunter of a run; a violation is kept as text.
function watcher(strat){const bad=[],b1={n:0,ok:0},say=t=>{if(bad.length<20)bad.push(t);};
 return {bad,b1,hunt({s,c,ids,pots,pv,truth,K}){
   if(K===3&&truth!==100)say(`H3 ${c.id}: three helping but P=${truth}`);if(K<3&&(truth<0||truth>MAX_P+EPS))say(`H3 ${c.id}: P=${truth} without the third`);if(pv.potion>R.POTION_CAP)say(`H3 ${c.id}: potion bonus ${pv.potion}`);
   if(P.pageDone(s,c.monster)&&Math.abs(pv.raw.mid-truth)>EPS)say(`H5 ${c.id}: full page but mid ${pv.raw.mid} ≠ ${truth}`);
   if(strat==='naive'&&s.day<=10){b1.n++;if(pv.raw.mid>=200/3-EPS&&truth>=pv.raw.mid-EPS)b1.ok++;else say(`B1 day ${s.day} ${c.id}: shown ${pv.raw.mid} true ${truth}`);}},
  day(s){if(!(Number.isInteger(s.gold)&&s.gold>=0))say(`G1 day ${s.day}: gold ${s.gold}`);
   for(const [k,v] of Object.entries(s.stock))if(!(v>=0&&v<=R.LIMITS.stock))say(`G1 day ${s.day}: stock ${k}=${v}`);
   for(const [k,v] of Object.entries(s.potions))if(!(v>=0&&v<=R.LIMITS.doses))say(`G1 day ${s.day}: potion ${k}=${v}`);
   for(const [k,v] of Object.entries(s.notes))if(!(v>=0&&v<=R.LIMITS.notes))say(`G1 day ${s.day}: notes ${k}=${v}`);
   if(s.daily.candles>R.candleMax(s))say(`G1 day ${s.day}: candles ${s.daily.candles}/${R.candleMax(s)}`);
   for(const id of Object.keys(s.monsters)){const o=P.academyOffer(s,id);if(o.keys.some(k=>s.monsters[id].sold.includes(k)))say(`G5 day ${s.day}: ${id} offers a sold record`);}},
  hunter(id,h,away){if(h.out>R.WOUND.max||h.sulk>R.TRUST.sulk||h.trust<0||h.trust>R.TRUST.max||h.rag>3)say(`H4 ${id}: out ${h.out} sulk ${h.sulk} trust ${h.trust}`);if(away>10)say(`H4 ${id}: away ${away} days`);}};}
function run({seed,strat,days}){const w=watcher(strat),r=play(seed,strat,days,{checks:w}),pool=(a,b)=>{const x=r.series.filter(v=>v.day>=a&&v.day<=b);return [x.filter(v=>v.win).length,x.length,x.filter(v=>v.full).length];};
 return {seed,strat,days,bad:w.bad,b1:w.b1,w1:r.w1,w2:r.w2,w3:r.w3,all:r.all,full2:r.full2,full3:r.full3,p1:pool(1,10),p2:pool(11,30),p3:pool(31,60),pa:pool(1,days),p21:pool(21,40),p41:pool(41,days),
  rankDay:r.rankDay,gold:r.gold,low:r.low,windows:r.windows,s3:r.s3,s5:r.s5,s10:r.s10,koldun:r.koldun,doneDay:r.doneDay,printed:r.printed,start100:r.start100,earned:r.earned,spent:r.spent,academy:r.academy,
  rank:r.rank,hunts:r.hunts,fails:r.fails,injury:r.injury,sulks:r.sulks,cosmetic:r.cosmetic,ledger:r.ledger,rep:r.rep[days]??r.state.rep,firstFail:r.firstFail,firstWorse:r.firstWorse};}

async function main(){
 const t0=Date.now(),jobs=[];for(const strat of STRATS)for(let seed=1;seed<=SEEDS;seed++)jobs.push({seed,strat,days:DAYS});for(const strat of['careful','learning'])for(let seed=1;seed<=SEEDS;seed++)jobs.push({seed,strat,days:LONG});
 const n=Math.max(1,Math.min(8,availableParallelism())),parts=Array.from({length:n},(_,i)=>jobs.filter((_,j)=>j%n===i));
 const results=(await Promise.all(parts.map(part=>new Promise((ok,no)=>{const w=new Worker(new URL(import.meta.url),{workerData:{jobs:part}});w.once('message',ok);w.once('error',no);})))).flat();
 const ms=Date.now()-t0,of=(strat,days=DAYS)=>results.filter(r=>r.strat===strat&&r.days===days).sort((a,b)=>a.seed-b.seed);
 const q=(v,p)=>{const x=v.filter(Number.isFinite).sort((a,b)=>a-b);return x[Math.min(x.length-1,Math.floor(x.length*p))];},med=v=>q(v,.5),min=v=>Math.min(...v.filter(Number.isFinite)),max=v=>Math.max(...v.filter(Number.isFinite));
 const pooled=(rs,k)=>{const w=rs.reduce((n,r)=>n+r[k][0],0),t=rs.reduce((n,r)=>n+r[k][1],0);return t?w/t:NaN;},fullPooled=(rs,k)=>{const f=rs.reduce((n,r)=>n+r[k][2],0),t=rs.reduce((n,r)=>n+r[k][1],0);return t?f/t:NaN;};
 const share=(rs,fn)=>rs.filter(fn).length/rs.length,rankAt=(r,k)=>r.rankDay[k]??999;
 const checks=[],check=(id,what,pass,value)=>{checks.push({id,what,pass:!!pass,value});};
 // A1–A3: the content and the safe two thirds from the start.
 const errors=contentErrors();check('A1','Правила содержания 8.7 (+ D3, D5)',!errors.length,errors.length?errors.slice(0,3).join('; '):'все');
 const a2=L.START.map(id=>safeStart(id)),a3=L.MONSTERS.filter(m=>m.tier>=2).map(m=>safeWithBook(m.id));
 check('A2','Ярус I, день 1: проверенный набор, истинный P = показанному ≥ 66⅔',a2.every(Boolean),`${a2.filter(Boolean).length} из ${a2.length}`);
 check('A3','Ярусы II–IV: старт (+ сюжет) + надёжная книга → ≥ 66⅔',a3.every(Boolean),`${a3.filter(Boolean).length} из ${a3.length}`);
 const naive=of('naive'),careful=of('careful'),learning=of('learning'),random=of('random'),merchant=of('merchant');
 const b1n=naive.reduce((n,r)=>n+r.b1.n,0),b1ok=naive.reduce((n,r)=>n+r.b1.ok,0);
 check('B1','naive, дни 1–10: показано ≥ 66 и истинный P ≥ показанного',b1n>0&&b1ok===b1n,`${b1ok} из ${b1n}`);
 check('B2','naive: доля побед дней 1–10 ≥ 0,66',pooled(naive,'p1')>=.66,fix(pooled(naive,'p1')));
 check('C1','careful: доля побед дней 1–10 ≥ 0,80 / 11–30 ≥ 0,90',pooled(careful,'p1')>=.8&&pooled(careful,'p2')>=.9,`${fix(pooled(careful,'p1'))} / ${fix(pooled(careful,'p2'))}`);
 check('C2','careful: звание 5 к дню 60 у ≥ 90% сидов',share(careful,r=>rankAt(r,5)<=60)>=.9,pc(share(careful,r=>rankAt(r,5)<=60)));
 check('D1','learning: доля побед дней 11–30 ≥ 0,90',pooled(learning,'p2')>=.9,fix(pooled(learning,'p2')));
 check('D2','learning: три верных, дни 21–40 ≥ 0,85 / 41–90 ≥ 0,95',fullPooled(learning,'p21')>=.85&&fullPooled(learning,'p41')>=.95,`${fix(fullPooled(learning,'p21'))} / ${fix(fullPooled(learning,'p41'))}`);
 check('D3','learning: звание 1 ≤ дня 4 (100%), звание 5 ≤ дня 50 (≥ 90%)',share(learning,r=>rankAt(r,1)<=4)===1&&share(learning,r=>rankAt(r,5)<=50)>=.9,`${pc(share(learning,r=>rankAt(r,1)<=4))} / ${pc(share(learning,r=>rankAt(r,5)<=50))}`);
 check('D4','learning: 14 трактатов к дню 60 (≥ 90%) / к дню 90 (100%)',share(learning,r=>r.doneDay<=60)>=.9&&share(learning,r=>r.doneDay<=90)===1,`${pc(share(learning,r=>r.doneDay<=60))} / ${pc(share(learning,r=>r.doneDay<=90))}`);
 const rAll=pooled(random,'pa'),lAll=pooled(learning,'pa');
 check('E1','random: побед за 90 дней ≤ 0,66 и ≤ learning − 0,30; дни 1–10 ≤ 0,55',rAll<=.66&&rAll<=lAll-.3&&pooled(random,'p1')<=.55,`${fix(rAll)} (learning ${fix(lAll)}) / ${fix(pooled(random,'p1'))}`);
 check('E2','random: звание 1 ≤ дня 8 у ≥ 90% сидов',share(random,r=>rankAt(r,1)<=8)>=.9,pc(share(random,r=>rankAt(r,1)<=8)));
 const mAll=pooled(merchant,'pa');check('F1','merchant: доля побед 0,60–0,85',mAll>=.6&&mAll<=.85,fix(mAll));
 check('F2','merchant: звание ≤ 3 на 90-й день у ≥ 90% сидов',share(merchant,r=>r.rank<=3)>=.9,pc(share(merchant,r=>r.rank<=3)));
 const bad=results.flatMap(r=>r.bad.map(t=>`${r.strat}#${r.seed}/${r.days}: ${t}`));
 check('G1','Монеты ≥ 0, запасы ≥ 0, поля в пределах 12.2 (все стратегии, 90 и 150 дней)',!bad.some(t=>/ G1 /.test(t))&&results.every(r=>r.low>=0),`мин. монет ${min(results.map(r=>r.low))}`);
 const win=[...careful,...learning,...merchant].flatMap(r=>r.windows);check('G2','careful/learning/merchant: доход − травы − листки − свечи − лекарь > 0 в каждом 10-дневном окне с 11-го дня',win.every(v=>v>0),`${win.filter(v=>v>0).length} из ${win.length}, мин. ${min(win)}`);
 const g30=[...careful,...learning].map(r=>r.gold[30]);check('G3','careful/learning: монет на 30-й день — медиана ≥ 150, каждый сид ≥ 50',med(careful.map(r=>r.gold[30]))>=150&&med(learning.map(r=>r.gold[30]))>=150&&min(g30)>=50,`медианы ${med(careful.map(r=>r.gold[30]))} / ${med(learning.map(r=>r.gold[30]))}, мин. ${min(g30)}`);
 check('G4','learning: потрачено к 90-му дню ≥ 25% заработанного (медиана)',med(learning.map(r=>r.spent/r.earned))>=.25,pc(med(learning.map(r=>r.spent/r.earned))));
 const amax=R.academyMax();check('G5',`Доход Академии ≤ ACADEMY_MAX (${amax}); второй лист тех же записей = 0`,amax===2390&&results.every(r=>r.academy<=amax)&&!bad.some(t=>/ G5 /.test(t))&&secondSheetZero(),`макс. ${max(results.map(r=>r.academy))}`);
 check('H1','Детерминизм: два прогона одного сида = одинаковый serialize на 30-й день; load(serialize) каждый день = без него',determinism(),'15 сидов × 5 стратегий');
 const h2=monotone(2000);check('H2','Монотонность: замена «без толку»/«во вред» на «помогло» не уменьшает P и не превращает победу в провал',h2.bad===0,`${h2.n} пар`);
 check('H3','K = 3 → 100 при любом облике; иначе 0 ≤ P ≤ 91⅔; P-бонус снадобий ≤ 20',!bad.some(t=>/ H3 /.test(t))&&h2.h3,'все охоты бота и 2000 пар');
 check('H4','Охотники: out ≤ 4, sulk ≤ 5, возвращаются не позже чем через 10 дней',!bad.some(t=>/ H4 /.test(t)),'все');
 check('H5','Полностью разрешённая страница: «Надёжно» = истинный P',!bad.some(t=>/ H5 /.test(t)),'все');
 const story=results.filter(r=>r.days===DAYS);check('I1','Сюжет: S3 ≤ 10, S5 ≤ 18, S10 ≤ 30 у всех стратегий',story.every(r=>r.s3<=10&&r.s5<=18&&r.s10<=30),`макс. ${max(story.map(r=>r.s3))} / ${max(story.map(r=>r.s5))} / ${max(story.map(r=>r.s10))}`);
 check('I2','learning: колдун ≤ дня 40, «Великий бестиарий» ≤ дня 60 у ≥ 90% сидов',share(learning,r=>r.koldun<=40)>=.9&&share(learning,r=>r.printed<=60)>=.9,`${pc(share(learning,r=>r.koldun<=40))} / ${pc(share(learning,r=>r.printed<=60))}`);
 // The reference: pooled rates of gdd-sim.mjs on the same 60 seeds (asserted within 3 points) and the medians of its table
 // in GDD 12.7 (reported). A median of ~13 hunts a seed moves in steps of 7–8 points, so the pooled rate is the check.
 const REF={naive:{w1:.726,w2:.733,w3:.738,all:.735,full2:0},careful:{w1:.908,w2:.962,w3:.999,all:.984,full2:.926},learning:{w1:.878,w2:.987,w3:1,all:.987,full2:.997},random:{w1:.464,w2:.576,w3:.614,all:.606,full2:.13},merchant:{w1:.748,w2:.731,w3:.734,all:.736,full2:0}};
 const MEDIAN={naive:{w1:.71,w2:.72,w3:.75,all:.74,full2:0},careful:{w1:.92,w2:.97,w3:1,all:.98,full2:.93},learning:{w1:.88,w2:.98,w3:1,all:.99,full2:1},random:{w1:.44,w2:.58,w3:.61,all:.61,full2:.13},merchant:{w1:.73,w2:.73,w3:.74,all:.74,full2:0}};
 const POOL={w1:'p1',w2:'p2',w3:'p3',all:'pa',full2:'p21'};
 const drift=STRATS.flatMap(st=>['w1','w2','w3','all','full2'].map(k=>{const rs=of(st),got=k==='full2'?fullPooled(rs,POOL[k]):pooled(rs,POOL[k]);return {st,k,ref:REF[st][k],got,d:Math.abs(got-REF[st][k]),med:med(rs.map(r=>r[k])),refMed:MEDIAN[st][k]};}));
 const worst=drift.reduce((a,b)=>b.d>a.d?b:a);check('Э','Доли побед и трёх верных (по всем охотам 60 сидов) в пределах 3 п. от gdd-sim.mjs',worst.d<=.03+EPS,`наибольшее расхождение ${(worst.d*100).toFixed(1).replace('.',',')} п. (${worst.st} ${worst.k})`);
 check('T','Прогон 90 дней × 5 стратегий × 60 сидов (+ 2 × 150 дней) ≤ 60 с',SEEDS<60||ms<=60000,`${(ms/1000).toFixed(1)} с, потоков ${n}`);
 const report=writeReport({results,of,q,med,min,max,pooled,fullPooled,share,rankAt,checks,drift,ms,n});
 if(process.argv.includes('--write')){await mkdir(new URL('../docs/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/BALANCE.md',import.meta.url),report);}
 for(const c of checks)console.log(`${c.pass?'ok  ':'FAIL'} ${c.id.padEnd(2)} ${c.what} — ${c.value}`);
 if(bad.length)console.log(bad.slice(0,20).join('\n'));
 assert.ok(checks.every(c=>c.pass),'balance checks failed: '+checks.filter(c=>!c.pass).map(c=>c.id).join(', '));
 console.log(`All ${checks.length} balance checks passed in ${(ms/1000).toFixed(1)} s.`);}
function fix(v){return Number.isFinite(v)?v.toFixed(2).replace('.',','):'—';}
function pc(v){return Number.isFinite(v)?Math.round(v*100)+'%':'—';}
// A2: on day 1, a grown monster of tier I, skill 0 and no potions: a sheet of confirmed/refuted cards whose true chance
// equals the shown one and is at least two thirds.
function safeStart(id){const s=P.newGame(11),m=L.MON.get(id),ctx={variant:'grown',weather:'clear',season:0};return bestVerified(s,m,ctx);}
function bestVerified(s,m,ctx){const cards=m.facts.filter(f=>s.know[f.id]&&s.know[f.id].st!=='rumour'&&P.usable(s.know[f.id],f,ctx));let best=false;
 for(let a=0;a<cards.length;a++)for(let b=a+1;b<cards.length;b++)for(let c=b+1;c<cards.length;c++){const x=[cards[a],cards[b],cards[c]];if(new Set(x.map(f=>f.cat)).size<3)continue;
  const shown=P.estimate(x.map(f=>P.believed(s.know[f.id],f,ctx)),{}).mid,K=x.filter(f=>P.outcome(f,ctx)==='ok').length,H=x.filter(f=>P.outcome(f,ctx)==='worse').length,truth=P.chance(K,H,{});
  if(shown>=200/3-EPS&&Math.abs(shown-truth)<EPS)best=true;}return best;}
// A3: tiers II–IV — the start of the page (and the rumours of the story for the sorcerer) with its reliable book.
function safeWithBook(id){const s=P.newGame(12),m=L.MON.get(id),ctx={variant:'grown',weather:'clear',season:1};
 for(const ev of L.EVENTS){const e=ev.effect;if((e.open||[]).includes(id)||e.page===id||m.tier===4&&['S7','S8'].includes(ev.id))P.applyStory(s,ev);}
 s.gold=1000;for(const b of L.BOOKS)if(b.reliable&&b.seller!=='gift'&&Object.keys(b.sets).some(f=>f.startsWith(id+'.')))assert.ok(P.buyBook(s,b.id).ok,b.id);
 return bestVerified(s,m,ctx);}
function secondSheetZero(){const s=P.newGame(5);s.story.seen.push('S1');s.day=3;s.monsters.werewolf.troph.push('grown');const a=P.copyPage(s,'werewolf'),b=P.copyPage(s,'werewolf');return a.ok&&a.coins>0&&!b.ok&&P.academyOffer(s,'werewolf').coins===0;}
function determinism(){for(let seed=1;seed<=15;seed++)for(const strat of STRATS){const a=play(seed,strat,31,{stopAt:31}).state,b=play(seed,strat,31,{stopAt:31}).state,c=play(seed,strat,31,{stopAt:31,reload:false}).state;if(a!==b||a!==c)return false;}return true;}
// H2/H3 on the rules themselves: random facts, circumstances and bonuses; one helping card in place of a useless or harmful
// one never lowers the chance, and with the roll of the case a win stays a win.
function monotone(n){let bad=0,h3=true;const facts=[...L.FACT.values()],W=['clear','rain','fog','snow'];
 for(let i=0;i<n;i++){const m=L.MONSTERS[Math.floor(roll(1,'m',i)*L.MONSTERS.length)],v=m.variants[Math.floor(roll(1,'v',i)*m.variants.length)].id,ctx={variant:v,weather:W[Math.floor(roll(1,'w',i)*4)],season:Math.floor(roll(1,'k',i)*4)};
  const b={skill:Math.floor(roll(1,'s',i)*15),potion:[0,5,10,15,20][Math.floor(roll(1,'p',i)*5)],vmod:R.VMOD[v],forgive:roll(1,'f',i)<.2?1:0};
  const cats=new Map();for(const f of m.facts){const o=P.outcome(f,ctx);(cats.get(f.cat)||cats.set(f.cat,[]).get(f.cat)).push({f,o});}
  const keys=[...cats.keys()];if(keys.length<3)continue;const pickC=keys.sort((a,b)=>roll(1,'c',i,a)-roll(1,'c',i,b)).slice(0,3),sheet=pickC.map((c,j)=>{const l=cats.get(c);return l[Math.floor(roll(1,'x',i,j)*l.length)];});
  const P0=chanceOf(sheet,b),u=roll(1,'u',i),K=sheet.filter(x=>x.o==='ok').length;if(K===3&&P0!==100||K<3&&(P0<0||P0>MAX_P+EPS))h3=false;
  for(let j=0;j<3;j++){if(sheet[j].o==='ok')continue;const better=cats.get(sheet[j].f.cat).find(x=>x.o==='ok');if(!better)continue;const next=sheet.map((x,k)=>k===j?better:x),P1=chanceOf(next,b);if(P1<P0-EPS||100*u<P0&&!(100*u<P1))bad++;}}
 for(const v of L.VARIANTS)if(P.chance(3,0,{skill:0,potion:0,vmod:R.VMOD[v]})!==100)h3=false;return {n,bad,h3};}
const chanceOf=(sheet,b)=>P.chance(sheet.filter(x=>x.o==='ok').length,sheet.filter(x=>x.o==='worse').length,b);
function writeReport({of,q,med,min,max,pooled,fullPooled,share,rankAt,checks,drift,ms,n}){
 const t3=v=>`${fix(min(v))} / ${fix(med(v))} / ${fix(max(v))}`,rk=rs=>[1,2,3,4,5].map(k=>{const v=rs.map(r=>rankAt(r,k));const a=med(v),b=q(v,.9);return `${a>=999?'—':a}/${b>=999?'—':b}`;}).join(' · ');
 const dd=v=>{const x=med(v);return x>=999?'—':x;},p90=v=>{const x=q(v,.9);return x>=999?'—':x;};
 const rows=STRATS.map(st=>{const rs=of(st);return `| ${st} | ${t3(rs.map(r=>r.w1))} | ${t3(rs.map(r=>r.w2))} | ${t3(rs.map(r=>r.w3))} | ${t3(rs.map(r=>r.all))} | ${t3(rs.map(r=>r.full2))} | ${rk(rs)} |`;}).join('\n');
 const money=STRATS.map(st=>{const rs=of(st);return `| ${st} | ${med(rs.map(r=>r.gold[10]))} | ${med(rs.map(r=>r.gold[30]))} | ${med(rs.map(r=>r.gold[60]))} | ${med(rs.map(r=>r.gold[90]))} | ${med(rs.map(r=>r.earned))} / ${med(rs.map(r=>r.spent))} | ${med(rs.map(r=>r.academy))} | ${med(rs.map(r=>r.cosmetic))} |`;}).join('\n');
 const long=['careful','learning'].map(st=>{const rs=of(st,LONG);return `| ${st} | ${med(rs.map(r=>r.gold[90]))} | ${med(rs.map(r=>r.gold[150]))} | ${med(rs.map(r=>r.earned))} / ${med(rs.map(r=>r.spent))} | ${med(rs.map(r=>r.cosmetic))} из ${L.DECOR.length+L.MONSTERS.length} | ${fix(med(rs.map(r=>r.all)))} |`;}).join('\n');
 const pace=STRATS.map(st=>{const rs=of(st);return `| ${st} | ${dd(rs.map(r=>r.s3))} | ${dd(rs.map(r=>r.s5))} | ${dd(rs.map(r=>r.s10))} | ${dd(rs.map(r=>r.koldun))} / ${p90(rs.map(r=>r.koldun))} | ${dd(rs.map(r=>r.doneDay))} / ${p90(rs.map(r=>r.doneDay))} | ${dd(rs.map(r=>r.printed))} / ${p90(rs.map(r=>r.printed))} | ${dd(rs.map(r=>r.start100))} | ${med(rs.map(r=>r.hunts))} | ${fix(med(rs.map(r=>r.fails?r.injury/r.fails:0)))} | ${med(rs.map(r=>r.sulks))} |`;}).join('\n');
 const cmp=STRATS.map(st=>`| ${st} | ${['w1','w2','w3','all','full2'].map(k=>{const x=drift.find(d=>d.st===st&&d.k===k);return `${fix(x.got)} (${fix(x.ref)}) · медиана ${fix(x.med)} (${fix(x.refMed)})`;}).join(' | ')} |`).join('\n');
 const list=checks.map(c=>`| ${c.id} | ${c.what} | ${c.value} | ${c.pass?'да':'**нет**'} |`).join('\n');
 return `# Баланс «Бестиария Велена»

Команда: \`npm run balance\` (проверка; \`-- --write\` пересобирает этот файл). Бот играет только через обёртки \`P.*\`
(\`src/progress-next.js\`), как интерфейс, и после каждого дня перечитывает сохранение: \`P.load(P.serialize(s))\`.
Прогон: ${SEEDS} сидов × 5 стратегий × ${DAYS} дней и careful/learning × ${LONG} дней — ${(ms/1000).toFixed(1)} с на ${n} потоках.
Эталон поведения — \`pix-tools/bestiary/gdd-sim.mjs\` (GDD 12.7); правила — GDD 3–7 и решения D3, D5.

Стратегии (GDD 12.6): **naive** — только проверенное, лучший по «Надёжно», отказ ниже 66, ничего не исследует и не
покупает, награда — монеты; **careful** — так же советует, но вечером исследует (образцы, трофеи, архив, «порыться»),
покупает надёжные книги, варит снадобья, продаёт листы и листки, пишет трактаты, обустраивается и снаряжает охотников;
**learning** — как careful, но рискует слухами (ценность \`mid + (mid ≥ 66 ? 7 : 2) × слухов\`, отказ ниже 34), покупает
листки Янека и все книги и печатает «Великий бестиарий»; **random** — случайный допустимый лист без снадобий и
исследований, награда наугад; **merchant** — проверенный совет без слухов, никогда не исследует, берёт монеты, продаёт
все части. Бот перепроверяет в опытах только условные записи — живой игрок узнаёт их по противоречиям в отчётах и строке
«последний раз»; поэтому его темп — верхняя граница, живой игрок ожидаемо в 1,5–2 раза медленнее.

## Победы и звания (${DAYS} дней; мин / медиана / макс)

| Стратегия | Победы д. 1–10 | д. 11–30 | д. 31–60 | за ${DAYS} дней | 3 верных д. 21–40 | Звания 1/2/3/4/5 (медиана / 90%) |
|---|---|---|---|---|---|---|
${rows}

Сравнение с эталоном \`gdd-sim.mjs\` (в скобках): доля по всем охотам 60 сидов — проверка «в пределах 3 п.», и медиана по
сидам — как в таблице GDD 12.7 (у медианы из ~13 охот сида шаг 7–8 п., поэтому она только для сведения):

| Стратегия | д. 1–10 | д. 11–30 | д. 31–60 | за ${DAYS} дней | 3 верных д. 21–40 |
|---|---|---|---|---|---|
${cmp}

## Сюжет и темп (медиана / 90%)

| Стратегия | S3 | S5 | S10 | Колдун побеждён | 14 трактатов | Печать | 5 стартовых на 100% | Охот | Рана при неудаче, дней | Обид |
|---|---|---|---|---|---|---|---|---|---|---|
${pace}

## Деньги (медианы)

| Стратегия | Монеты д. 10 | д. 30 | д. 60 | д. 90 | Заработано / потрачено | Академия и трактаты | Убранство и вторые издания |
|---|---|---|---|---|---|---|---|
${money}

Поздние деньги уходят в чисто косметический сток (решение D3): «Убранство скриптория» — ${L.DECOR.map(d=>`${d.name.toLowerCase()} ${d.price}`).join(', ')} —
и «Второе издание» трактата (${L.EDITION.price.slice(1).join(' / ')} монет по ярусам I–IV). Бот careful/learning покупает их, только
когда в кошельке остаётся больше 1500 монет сверх цены, поэтому они не задерживают ни обустройства, ни печати. Цены,
шансы и доход от этих вещей не меняются. Невыслушанный гость не теряет слух (D5): утром он лежит запиской на столе.

| Стратегия (${LONG} дней) | Монеты д. 90 | д. ${LONG} | Заработано / потрачено | Убранство и издания | Победы за ${LONG} дней |
|---|---|---|---|---|---|
${long}

## Проверки

| # | Что | Значение | Выполнено |
|---|---|---|---|
${list}

Лист Академии платит за каждую запись один раз (ключ \`факт:состояние:условие\` или \`troph:облик\`); трактат пишется один
раз, листок печатни — раз в 10 дней; слухи не продаются. Потолок науки за игру ACADEMY_MAX = ${R.academyMax()} монет
выведен из контента. Звание растёт только от знания, побед и трофеев: купец к 90-му дню не выше звания 3.
`;}

if(!isMainThread)parentPort.postMessage(workerData.jobs.map(run));
else await main();
