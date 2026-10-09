// Даро's lessons, the hints that come once, the advice of the day and the morning report. No DOM and no changes to
// the game here: progress.js writes down and rewards, the interface only shows what these functions decide.
import * as J from './jewelry.js';
import * as G from './guild.js';
import * as H from './people.js';
import * as B from './book.js';
import {PATTERNS} from './patterns.js';
import {orderPieces} from './market.js';
export const plural=(n,one,few,many)=>{const a=n%10,b=n%100;return a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many;};
const client=id=>J.CLIENTS.find(p=>p.id===id);
const safe=fn=>{try{return !!fn();}catch{return false;}};
const START={crafted:0,sold:0,gathers:0,day:1};
// Nine steps from the first blank to the first morning, each under 42 letters. The editor steps look at the draft; the
// others at the work done since the lessons began, so lessons started again from the menu ask for new work.
export const TUTORIAL=[
 {id:'start',text:'Кулон → Капля → Начать работу',view:'studio',done:(s,c)=>!!s.draft||s.crafted>c.from.crafted},
 {id:'pattern',text:'Узоры → коснись «Бисер»',tool:'pattern',done:(s,c)=>!!c.d?.strokes.some(p=>p.m)},
 {id:'stone',text:'Камни → коснись металла в центре',tool:'stone',done:(s,c)=>c.d?.gems.length>0},
 {id:'rune',text:'Руны → проведи линию от камня',tool:'rune',done:(s,c)=>!!c.d&&c.e().connections>=1},
 {id:'polish',text:'Блеск → потри металл до 30%',tool:'polish',done:(s,c)=>!!c.d&&c.e().polish>=30},
 {id:'finish',text:'Нажми «Готово»',view:'studio',done:(s,c)=>s.crafted>c.from.crafted},
 {id:'sell',text:'Витрина → продай тому, кому нравится',view:'shop',done:(s,c)=>s.sold>c.from.sold},
 {id:'gather',text:'Материалы → Места находок → Берег',view:'supplies',tab:'map',done:(s,c)=>(s.stats?.gathers||0)>c.from.gathers},
 {id:'day',text:'Заверши день — солнце вверху',done:(s,c)=>s.day>c.from.day}
];
export const STEP_IDS=TUTORIAL.map(t=>t.id);
// A piece finished without a pattern or a stone can never go back for them, so the gift asks only for these five.
export const REQUIRED=['start','finish','sell','gather','day'];
export const GIFT={materials:{sapphire:1,silver:4},rep:5};
const CRAFT=['pattern','stone','rune','polish','finish'];
export const coaching=s=>!!s?.tutorial&&!s.tutorial.finished&&!s.tutorial.skipped;
// An editor step is passed by doing it or a later step of the same piece; the five others only by doing them.
const passed=(t,id)=>t.done.includes(id)||id!=='finish'&&CRAFT.includes(id)&&CRAFT.slice(CRAFT.indexOf(id)+1).some(x=>t.done.includes(x));
export const tutorialStep=s=>coaching(s)?TUTORIAL.findIndex(x=>!passed(s.tutorial,x.id)):-1;
export function stepState(s,i){const t=s.tutorial,id=TUTORIAL[i].id;return t.done.includes(id)?'done':passed(t,id)?'skip':i===tutorialStep(s)?'now':'next';}
// The steps the game shows as done right now; the draft is assessed only when a step asks for it.
export function stepsDone(s,ctx={}){const d=ctx.design||s.draft?.design||null;let e=ctx.e||null;const c={from:s.tutorial?.from||START,d,e:()=>e||=J.evaluate(d)};return TUTORIAL.filter(x=>safe(()=>x.done(s,c))).map(x=>x.id);}

// The cheapest piece (a plain copper ring) and whether the workshop can make or buy it at all.
const LEAST=J.costs(J.makeDesign('ring','oval','copper')).resources.copper;
export const broke=s=>Object.keys(J.METALS).every(m=>!J.available(s,m)||s.materials[m]<LEAST)&&s.gold<J.buyCost(s,'copper',LEAST-s.materials.copper);
const names=list=>list.length>1?list.slice(0,-1).map(n=>`«${n}»`).join(', ')+` и «${list.at(-1)}»`:`«${list[0]}»`;
const tier=n=>names(PATTERNS.filter(p=>p.need===n).map(p=>p.name));
// One-off hints, at most one per render. A hint with a dot keeps its dot until its place is opened (the pattern rail,
// the map) and is written down only then. later: waits until the lessons are over. past: an older workshop that already
// shows this has met it and is not told again.
export const HINTS=[
 {id:'counter',text:'Встречная цена — столько гость готов дать сам. Ниже 95% от полной она идёт как скидка.',when:(s,c)=>!!c.counter,past:s=>s.sold>0},
 {id:'patterns-2',text:`Открылись узоры ${tier(2)}: они в «Узорах» редактора.`,dot:'pattern',when:s=>s.crafted>=2,past:s=>s.crafted>=2},
 {id:'patterns-5',text:`Открылись узоры ${tier(5)}.`,dot:'pattern',when:s=>s.crafted>=5,past:s=>s.crafted>=5},
 {id:'garden',text:'Открыт Сад аббатства: там находят изумруды и сапфиры.',dot:'map',when:s=>s.crafted>=3,past:s=>s.crafted>=3},
 {id:'ridge',text:'Открыт Лунный кряж: там находят алмазы, лунный камень и серебро.',dot:'map',when:s=>s.crafted>=8,past:s=>s.crafted>=8},
 {id:'broke',text:'Нет ни металла, ни монет — на Берегу медь ×3 даром.',when:broke},
 {id:'order-ready',text:'Для личного заказа есть подходящая вещь: «Заказы» → «Передать».',later:true,when:s=>s.requests.some(r=>!r.done&&s.stock.some(i=>J.matches(i.design,r))),past:s=>s.sold>0},
 {id:'connoisseur',text:'✦ Знаток дня платит на пятую часть дороже за вещь, какой порт ещё не видел.',when:s=>s.customers.some(c=>c.novel===true&&!c.served),past:s=>J.rankOf(s)>=1},
 {id:'contest',text:'Цех ждёт работу на смотр недели: «Заказы» → «Цех».',later:true,when:s=>s.stock.length>0&&!s.guild?.tried?.length,past:s=>s.guild?.history?.length>0||s.guild?.tried?.length>0},
 {id:'book',text:'Книга мастера помнит всё, что впервые вышло из твоих рук: «Развитие» → «Книга».',later:true,when:s=>Object.keys(s.book?.e||{}).length>0,past:s=>s.crafted>0}
];
// 'install' is the one-off offer to put the game on the home screen, shown in the morning report.
export const HINT_IDS=[...HINTS.map(h=>h.id),'install'];
const unseen=(s,h)=>!(s.hintsSeen||[]).includes(h.id);
export const nextHint=(s,ctx={})=>HINTS.find(h=>unseen(s,h)&&!ctx.shown?.has(h.id)&&!(h.later&&coaching(s))&&safe(()=>h.when(s,ctx)))||null;
export const dotHints=(s,place)=>HINTS.filter(h=>h.dot===place&&unseen(s,h)&&safe(()=>h.when(s,{}))).map(h=>h.id);
export const dotPending=(s,place)=>dotHints(s,place).length>0;
// The hardest rule of the market, said one sale before it bites. Two sales below 95% count as one full sale.
export function demandWarning(d){if(!d||d.remaining||d.sales!==J.PREMIUM_LIMIT-1)return null;return `${d.soft?'Ещё одна продажа, даже со скидкой,':'Ещё одна полная продажа или две со скидкой'} — и спрос упадёт на 75% на ${J.COOLDOWN} ${plural(J.COOLDOWN,'торговый день','торговых дня','торговых дней')}`;}
// A copy of the workshop is suggested once in fourteen game days; days pass only when the player ends one.
export const BACKUP_EVERY=14;
export const backupDue=s=>Number.isInteger(s?.backup)&&s.day-s.backup>=BACKUP_EVERY;

// The best piece of the showcase for a guest: the connoisseur looks only at what is new to the port, and a saturated
// design is no advice. Taste is cheap and asked of every piece; the port's ledger only from the best fit down, so a long
// game does not compare its whole showcase with the ledger to give one advice.
const picks=s=>c=>{const p=client(c.client);return s.stock.map(item=>({item,fit:J.affinity(item.design,p,c.want)})).sort((a,b)=>b.fit-a.fit).find(({item})=>!J.demandInfo(s,item.design).remaining&&(c.novel!==true||J.isFresh(s,item.design)))||null;};
// What would move the workshop on now, most useful first, at most three: {p,icon,text} and where a tap leads
// (view and tab, a guest and a piece of the showcase, a letter, or the end of the day).
export function nextSteps(s,{view='studio'}={}){const out=[],add=(p,v)=>out.push({p,...v}),guests=s.customers.filter(c=>!c.served);
 if(s.draft&&view!=='studio')add(100,{icon:'studio',text:`Доделать «${s.draft.design.name}»`,view:'studio'});
 const m=(s.mail||[]).find(m=>!m.read),l=m&&H.letter(m.id);if(l)add(95,{icon:'letter',text:`Прочитать письмо от ${H.OF[l.from]}`,letter:m.id});
 const pieces=orderPieces(s),ready=s.requests.find(r=>pieces.get(r.id));if(ready)add(90,{icon:'orders',text:`Передать «${pieces.get(ready.id).design.name}» — ${client(ready.client).name}`,view:'orders',tab:'orders'});
 const ending=s.requests.find(r=>!r.done&&r.keep!==true&&r.until===s.day&&r!==ready);if(ending)add(85,{icon:'orders',text:`Заказ «${ending.title}» ждёт только сегодня`,view:'orders',tab:'orders'});
 if(guests.length&&s.stock.length){const best=picks(s);let top=null;for(const c of guests){const b=best(c);if(b&&(!top||b.fit>top.fit))top={...b,buyer:c.id,name:client(c.client).name};}
  if(top)add(80,{icon:'heart',text:`${top.name} оценит «${top.item.design.name}» на ${top.fit}%`,view:'shop',buyer:top.buyer,item:top.item.id});}
 // With «Глаз мастера» the review is advised for a piece that could win a medal (the ledger is asked only when its
// freshness decides); without it the forecast is hidden, so it only invites to try.
 if(s.stock.length&&!s.guild?.tried?.length){const theme=G.themeOf(s.day);if(!s.skills.includes('eye'))add(70,{icon:'ribbon',text:`Тема недели «${theme.name}»: попробуй подать работу`,view:'orders',tab:'guild'});else{const item=s.stock.find(i=>G.medalWithin(s,i.design)),score=item&&G.judge(s,item.design,theme).score;if(score>=62)add(70,{icon:'ribbon',text:`На смотр «${theme.name}»: «${item.design.name}», прогноз ${score}`,view:'orders',tab:'guild'});}}
 const skill=J.TOOLS.find(t=>!s.skills.includes(t.id)&&t.parents.every(p=>s.skills.includes(p))&&s.gold>=t.cost&&s.xp>=t.xp);if(skill)add(60,{icon:'develop',text:`Можно изучить «${skill.name}»`,view:'develop',tab:'skills'});
 const poor=broke(s),area=s.energy>0&&J.AREAS.find(a=>s.crafted>=a.need&&!s.daily.areas.includes(a.id));
 if(poor)add(40,area?.id==='shore'?{icon:'pin',text:'Кошелёк пуст — на Берегу медь даром',view:'supplies',tab:'map'}:{icon:'sun',text:'Кошелёк пуст — завтра на Берегу снова медь',end:true});
 if(area&&!(poor&&area.id==='shore'))add(50,{icon:'pin',text:`Поискать находки: ${area.name}`,view:'supplies',tab:'map'});
 const next=Math.min(...[...PATTERNS,...J.AREAS].map(v=>v.need).filter(n=>n>s.crafted)),left=next-s.crafted;
 if(Number.isFinite(next)){const what=[...PATTERNS.filter(p=>p.need===next),...J.AREAS.filter(a=>a.need===next)].map(v=>v.name);add(30,{icon:'spark',text:`Ещё ${left} ${plural(left,'изделие','изделия','изделий')} → ${what.slice(0,2).join(', ')}${what.length>2?'…':''}`,view:'studio'});}
 else{const r=J.rankOf(s),rank=J.RANKS[r+1];if(rank)add(30,{icon:'crest',text:`Ещё ${rank.rep-s.rep} репутации → «${rank.name}»`,view:'develop',tab:'skills'});}
 if(s.customers.length&&!guests.length)add(10,{icon:'sun',text:'Все гости обслужены — можно завершить день',end:true});
 return out.sort((a,b)=>b.p-a.p).slice(0,3);}
// The morning between two days, from the counters of the day that ended (P.nextDay returns them): yesterday in one
// line, what went into the book, letters at the door, today's guests with their best piece, the guild, and one advice
// that is not a letter (the letters are listed already).
export function morningReport(s,prev={},{view='studio'}={}){const y=s.day-1,firsts=Array.isArray(prev.firsts)?prev.firsts:[],best=picks(s);
 return {yesterday:{day:y,made:prev.made||0,sales:prev.sales||0,income:prev.income||0,rep:prev.rep||0},
  book:firsts.slice(0,6).map(k=>B.keyName(k)),more:Math.max(0,firsts.length-6),marks:B.MARKS.filter(m=>s.book?.m?.[m.id]===y).map(m=>m.name),
  letters:(s.mail||[]).filter(m=>!m.read&&H.letter(m.id)).slice(0,3).map(m=>({id:m.id,from:H.letter(m.id).from})),
  guests:s.customers.map(c=>({id:c.id,client:c.client,novel:c.novel===true,want:c.want,best:best(c)})),
  theme:G.themeOf(s.day),left:G.daysLeft(s.day),news:{gift:prev.gift||null,named:prev.named||[],week:prev.week||null,theme:prev.theme||null},
  advice:nextSteps(s,{view}).find(x=>!x.letter)||null,backup:backupDue(s)};}
