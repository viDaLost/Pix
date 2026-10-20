// The advice of the day («Сегодня») and the morning card (GDD 9.2, 10.9). No DOM and no changes to the game: the
// interface only shows what these functions decide. Даро's lessons and his one-off tips come with Г5.
import * as P from './progress.js';
import * as L from './lore.js';
import {townMorningWords} from './ambience.js';
export const plural=L.plural;
const name=id=>L.HUNTER.get(id)?.short||L.VISITOR.get(id)?.short||L.TOWN_TYPE.get(id)?.label||'';
// «Агата», «Агата и Гордей», «Агата, Гордей и Ведана».
export const and=list=>list.length>1?list.slice(0,-1).join(', ')+' и '+list.at(-1):list[0]||'';
const LAB=['substance','ward'];
// Who is the guest of a visit, in the nominative: «Агата», «Вдова с посада», «Ведана».
export const guestName=v=>v.kind==='hunter'||v.kind==='town'?name(v.who):name(v.kind);
// Who told a rumour, as its stamp says it («Янек», «Тетрадь Даро», the title of a book) and as the margin of the page says
// it in the genitive («слух — от Янека», «слух — из Тетради Даро») (GDD 2.4, 10.5).
const SRC={start:'Тетрадь Даро',shop:'Янек',vedana:'Ведана',nikodim:'о. Никодим',town:'горожане',tale:'рассказ охотника',rummage:'летописи',archive:'летописи',story:'предание',hunt:'охота',lab:'опыт',trophy:'трофей'};
const SRC_FROM={start:'из Тетради Даро',shop:'от Янека',vedana:'от Веданы',nikodim:'от о. Никодима',town:'от горожан',tale:'из рассказа охотника',rummage:'из летописей',archive:'из летописей',story:'из предания',hunt:'с охоты',lab:'из опыта',trophy:'с трофея'};
export const rumourSource=k=>k?.src==='book'&&L.BOOK.has(k.by)?`«${L.BOOK.get(k.by).title}»`:SRC[k?.src]||'';
const rumourFrom=k=>k?.src==='book'&&L.BOOK.has(k.by)?`из книги «${L.BOOK.get(k.by).title}»`:SRC_FROM[k?.src]||'';
// The note in the keeper's hand on the margin of a record, built from its state: «верно — проверено трижды», «пустое»,
// «НИ В КОЕМ СЛУЧАЕ», «верно лишь: лишь молодого», «слух — от Янека».
export function marginNote(k,f){if(k.rev)return `верно лишь: ${f.condTag}`;
 if(k.st==='confirmed')return k.ok>=3?'верно — проверено трижды':k.ok?'верно — проверено делом':k.src==='lab'||k.src==='trophy'?'верно — проверено опытом':k.src==='archive'?'верно — сошлось в летописях':'верно — так записано';
 if(k.st==='refuted')return 'пустое';if(k.st==='dangerous')return 'НИ В КОЕМ СЛУЧАЕ';const from=rumourFrom(k);return from?`слух — ${from}`:'слух';}
// The draft of a sheet lives in the interface until the day ends (GDD 10.3). A tap on a slip takes it out of the sheet
// when it is there — always, even a slip that turned dangerous since it was written in — writes it into a free slot, or
// replaces the slip of its category; a dangerous slip and a fourth one are refused. Returns the new list of facts and
// what happened: {facts, removed|added|replaced|refused}.
export function draftTap(d,card){const facts=d.facts||[];if(!card)return {facts,refused:'missing'};
 if(facts.includes(card.id))return {facts:facts.filter(x=>x!==card.id),removed:card.id};
 if(!card.usable)return {facts,refused:'dangerous'};
 const j=facts.findIndex(x=>L.FACT.get(x)?.cat===card.cat);if(j>=0){const next=[...facts];next[j]=card.id;return {facts:next,replaced:facts[j]};}
 if(facts.length>=3)return {facts,refused:'full'};return {facts:[...facts,card.id],added:card.id};}
// Soft hyphens in long Russian words, so a title keeps to its narrow slot of the sheet on every phone, with or without
// a hyphenation dictionary in the browser: a break after a vowel before a consonant and a vowel («Пе-ре»), between two
// consonants after a vowel («Пас-мур»), after «ь», «ъ» or «й» («уберечь-ся»); never before them, and each part keeps a
// vowel and at least two letters («Пе|рек|рёс|ток»). Only words of nine letters and more get them: a shorter word fits
// its slot whole, and a soft hyphen in it would only tempt the line to break «Волчий ко-рень».
const VOW=/[аеёиоуыэюя]/i,SOFT=/[йьъ]/i;
export const hyphenate=text=>String(text).replace(/[А-Яа-яЁё]{9,}/g,w=>{let out=w.slice(0,2);
 for(let i=2;i<w.length;i++){const a=w[i-1],b=w[i],c=w[i+1]||'';const room=i<=w.length-2&&VOW.test(w.slice(0,i))&&VOW.test(w.slice(i))&&!SOFT.test(b)&&!VOW.test(b)&&VOW.test(c);
  out+=(room&&(VOW.test(a)||SOFT.test(a)||VOW.test(w[i-2]))?'\u00ad':'')+b;}return out;});
// What of a draft can still go: a potion given to another hunter today has left the shelf, so it leaves the draft too
// rather than lock the sheet with «Нет снадобья».
export const liveDraft=(s,d)=>({facts:(d.facts||[]).filter(id=>s.know[id]),potions:(d.potions||[]).filter(id=>(s.potions[id]||0)>0)});
// The guests in the queue of the reception: a hunter or a townsperson while the case is on the table; Ведана, о. Никодим,
// Янек, Даро and a townsperson with a rumour until they are heard; the Magister stays the day — his window of the Academy.
export function queueOf(s){return s.visitors.filter(v=>v.contract?s.contracts.some(c=>c.id===v.contract):v.kind==='hunter'?false:v.kind==='otto'||!v.heard);}
// The cases without a guest: personal cases of the hunters and the case of the sorcerer wait on the table without a term.
export const standing=s=>s.contracts.filter(c=>c.kind==='personal'||c.kind==='story');
// One to three steps that would move the bestiary on, without reproach. Each leads to its place: a view and its tab,
// a report, a monster, or the end of the day.
export function nextSteps(s){const out=[],add=x=>{if(out.length<3)out.push(x);};
 const waiting=s.visitors.filter(v=>v.contract&&!v.heard&&s.contracts.some(c=>c.id===v.contract)),told=s.visitors.filter(v=>!v.contract&&!v.heard&&v.kind!=='hunter');
 if(waiting.length)add({id:'guests',icon:'door',text:waiting.length===1?`${guestName(waiting[0])} ждёт у стола`:`Ждут у стола: ${and(waiting.slice(0,3).map(guestName))}`,view:'reception'});
 const r=s.reports.find(r=>r.day===s.day&&r.offer&&!r.choice);if(r)add({id:'reward',icon:'coin',text:`${name(r.hunter)} ждёт, какую награду взять`,report:r.id});
 if(told.length)add({id:'listen',icon:'door',text:`${guestName(told[0])} ${L.female(told[0].kind==='town'?told[0].who:told[0].kind)?'зашла':'зашёл'} — выслушай`,view:'reception'});
 const left=P.candlesLeft(s);
 if(left>0){const m=P.openList(s).find(m=>m.facts.filter(f=>LAB.includes(f.cat)&&s.know[f.id]?.st==='rumour').length&&[m.loot.common,m.loot.rare].some(p=>(s.stock[p]||0)>0));
  if(m){const n=m.facts.filter(f=>LAB.includes(f.cat)&&s.know[f.id]?.st==='rumour').length;add({id:'lab',icon:'mortar',text:`У ${L.genOf(m)} ${n} ${plural(n,'слух','слуха','слухов')} — их можно проверить на образце`,view:'lab',tab:'samples',monster:m.id});}}
 if(P.academyOpen(s)){const best=P.openList(s).map(m=>({m,o:P.academyOffer(s,m.id)})).filter(x=>x.o.n>=P.ACADEMY.need).sort((a,b)=>b.o.coins-a.o.coins)[0];
  if(best)add({id:'academy',icon:'scale',text:`Магистр в городе: ${best.o.n} ${plural(best.o.n,'запись','записи','записей')} на продажу`,view:'shop',tab:'academy'});}
 const full=P.openList(s).find(m=>m.tier<4&&!s.monsters[m.id].treatise&&P.pageDone(s,m.id));if(full)add({id:'treatise',icon:'book',text:`Страница ${L.genOf(full)} полна — можно писать трактат`,view:'shop',tab:'academy'});
 add(left>0?{id:'candles',icon:'candle',text:`Свечей осталось: ${left}`,end:!waiting.length&&!told.length}:{id:'night',icon:'snuff',text:'Свечи догорели — можно задуть свечу',end:true});
 return out;}
// The wound under a report, as it stands now: the doctor paid in the same window shortens it there too (GDD 4.4, 10.4).
// The day of the report is the first day of the wound, so one day left means back tomorrow.
export const woundLine=(injury,out)=>out>1?`Лечится ещё ${L.days(out)}`:out===1?(injury>1?'Завтра снова в деле':'Царапины — завтра снова в деле'):'Лекарь поставил на ноги — снова в строю';
// The words of a hunter's return: «с победой», «потрёпан», «ранен на 2 дня».
function returnWords(x){const f=L.female(x.hunter||x.town);if(x.win)return x.rag?`с победой, но ${f?'потрёпана':'потрёпан'}`:'с победой';
 return x.town?'ни с чем':x.injury>1?`${f?'ранена':'ранен'} на ${L.days(x.injury)}`:f?'потрёпана':'потрёпан';}
// The card «Утро, день N» (GDD 10.9): the sky, who came back, who heals and sulks, who joined, the notes left by guests
// who were not heard (decision D5), the shelf and the Academy, the words of the hunters' arcs. Every row leads somewhere.
export function morningReport(s,res={}){const m=res.morning||P.morning(s),rows=[],row=(icon,text,to={})=>rows.push({icon,text,...to});
 for(const x of m.returns||[])row(x.win?'check':'bandage',`Вернул${L.female(x.hunter||x.town)?'ась':'ся'} ${x.hunter?name(x.hunter):L.TOWN_TYPE.get(x.town)?.label.toLowerCase()} — ${returnWords(x)}`,{report:x.report});
 for(const id of m.back||[])row('people',`Снова в строю: ${name(id)}`,{view:'reception',tab:'artel'});
 for(const id of m.forgiven||[])row('people',`${name(id)} снова ${L.female(id)?'готова':'готов'} к делу: «Кто старое помянет…»`,{view:'reception',tab:'artel'});
 const healing=(m.healing||[]).filter(h=>!(m.returns||[]).some(x=>x.hunter===h.hunter));if(healing.length)row('bandage',`${healing.length>1?'Лечатся':'Лечится'}: ${healing.map(h=>`${name(h.hunter)} (ещё ${L.days(h.days)})`).join(', ')}`,{view:'reception',tab:'artel'});
 for(const h of m.sulking||[])if(!(m.returns||[]).some(x=>x.hunter===h.hunter))row('people',`${name(h.hunter)} ${L.female(h.hunter)?'обиделась':'обиделся'} — вернётся через ${L.days(h.days)}`,{view:'reception',tab:'artel'});
 for(const id of m.joined||[])row('people',`В артели ${L.female(id)?'новая охотница':'новый охотник'}: ${L.HUNTER.get(id).name}`,{view:'reception',tab:'artel'});
 for(const n of m.notes||[])row('letter',n.text,{view:'bestiary',monster:L.monsterOf(n.fact)?.id});
 for(const a of res.arcs||[])if(!a.id.endsWith('.end'))row('quill',`${name(a.hunter)}: «${a.text}»`,{view:'reception',tab:'artel'});
 if(m.books)row('book','Новые книги на полке у Янека',{view:'shop',tab:'trader'});
 if(m.academy)row('scale','Магистр Брандт в Велене: Академия покупает листы',{view:'shop',tab:'academy'});
 row('door',m.guests?`Сегодня ${m.guests===1?'ждёт':'ждут'} ${m.guests} ${plural(m.guests,'гость','гостя','гостей')}`:'Сегодня никого не ждём',{view:'reception',tab:'queue'});
 return {title:`Утро, день ${s.day}`,sky:townMorningWords({season:m.season,weather:m.weather}),line:m.line,hold:m.hold,thaw:m.thaw,rows};}
// ---- the lesson of day 1 on the werewolf of Гордей (GDD 9.1). Each step of `LINES.tutorial` knows when it is done
// from the state and from what the interface reports in `c` ({view, sheet, facts, potions, event}), and which element
// the ring of the coach points at. A lesson case declined, deferred or lost on the way never holds the lesson up.
export const LESSON_CASE='c-1';
const SURE=['werewolf.silver','werewolf.aconite'],BAIT=['werewolf.dawn','werewolf.garlic','werewolf.crossroads'];
const sent=s=>s.day>1||s.hunts.some(h=>h.contract.id===LESSON_CASE);
const gone=s=>sent(s)||!s.contracts.some(c=>c.id===LESSON_CASE);
const heard=s=>s.day>2||s.reports.some(r=>r.contract.id===LESSON_CASE&&r.read)||s.day>1&&!s.reports.some(r=>r.contract.id===LESSON_CASE);
const inSheet=c=>c.sheet===LESSON_CASE,ev=(c,...list)=>list.includes(c.event);
const STEP={
 greet:{ring:'.guest-chip',done:(s,c)=>gone(s)||inSheet(c)||ev(c,'guest','open-sheet')},
 book:{ring:`[data-action="open-sheet"][data-contract="${LESSON_CASE}"]`,done:(s,c)=>gone(s)||inSheet(c)},
 pick:{ring:(s,c)=>{const next=SURE.find(id=>!(c.facts||[]).includes(id));return next?`.slip[data-fact="${next}"]`:'';},done:(s,c)=>gone(s)||inSheet(c)&&(c.facts||[]).length>=3},
 stamp:{ring:`.slip[data-fact="${SURE[0]}"] .stamp`,next:true,done:(s,c)=>gone(s)||ev(c,'coach-next','potion','send','fact-info','how-counted')},
 potion:{ring:'.potion-chip[data-potion="aconite_oil"]',next:true,done:(s,c)=>gone(s)||ev(c,'coach-next','potion','send')},
 send:{ring:`[data-action="send"][data-contract="${LESSON_CASE}"]`,done:s=>gone(s)},
 night:{ring:'#end-day',done:s=>s.day>1},
 report:{ring:'[data-action="open-report"]',done:s=>heard(s)},
 ledger:{ring:'[data-action="navigate"][data-view="bestiary"]',next:true,done:(s,c)=>s.day>2||c.view==='bestiary'||ev(c,'coach-next')}};
const lessonOpen=s=>!!s.tutorial&&!s.tutorial.finished&&!s.tutorial.skipped;
// The step the coach shows now, or null: {id, text, ring (a selector or ''), next (a «Понятно» button), marks (slips
// to underline without picking them)}. For the third slip Даро says the fourth line of his intro.
export function lessonStep(s,c={}){if(!lessonOpen(s))return null;const t=L.LINES.tutorial.find(x=>!s.tutorial.done.includes(x.id));if(!t)return null;const x=STEP[t.id];
 const ring=typeof x.ring==='function'?x.ring(s,c):x.ring,third=t.id==='pick'&&!ring;
 return {id:t.id,text:third?L.VISITOR.get('daro').lines.intro[3]:t.text,ring,next:!!x.next,marks:third?BAIT.filter(id=>s.know[id]&&!(c.facts||[]).includes(id)):[]};}
// Marks every step that is done now, in order, and returns their ids; the event of `c` counts for one step only.
export function lessonAdvance(s,c={}){const out=[];let ctx=c;for(let t=lessonStep(s,ctx);t&&STEP[t.id].done(s,ctx);t=lessonStep(s,ctx)){P.tutor(s,t.id);out.push(t.id);ctx={...ctx,event:null};}return out;}
// ---- Даро's one-off tips (GDD 9.2): each once, at its moment. The interface passes what is on screen in `c`
// ({view, tab}); the first tip due that was not seen is returned, or null, one at a time.
const kn=s=>Object.values(s.know);
const TIP={
 first_rumour:s=>kn(s).some(k=>k.st==='rumour'&&k.src!=='start'),
 first_failure:s=>s.reports.some(r=>!r.win&&r.read),
 first_harmful:s=>kn(s).some(k=>k.st==='dangerous'),
 first_condition:s=>kn(s).some(k=>k.rev),
 first_potion:s=>s.hunts.some(h=>h.potions?.length)||s.reports.some(r=>r.potions?.length),
 first_lab:(s,c)=>c.view==='lab',
 first_sale:(s,c)=>c.view==='shop'&&c.tab==='academy'&&P.academyOpen(s),
 first_full:s=>s.reports.some(r=>r.win&&r.read&&r.items.length===3&&r.items.every(x=>x.o==='ok'))};
export function tipDue(s,c={}){const seen=s.hintsSeen||[];for(const id of Object.keys(TIP))if(!seen.includes(id)&&TIP[id](s,c))return id;return null;}
export const tipText=id=>L.VISITOR.get('daro').lines.tips[id]||'';
