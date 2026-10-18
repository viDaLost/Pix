// The advice of the day («Сегодня») and the morning card (GDD 9.2, 10.9). No DOM and no changes to the game: the
// interface only shows what these functions decide. Даро's lessons and his one-off tips come with Г5.
import * as P from './progress.js';
import * as L from './lore.js';
import {townMorningWords} from './ambience.js';
export const plural=L.plural;
const name=id=>L.HUNTER.get(id)?.short||L.VISITOR.get(id)?.short||L.TOWN_TYPE.get(id)?.label||'';
const and=list=>list.length>1?list.slice(0,-1).join(', ')+' и '+list.at(-1):list[0]||'';
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
// The words of a hunter's return: «с победой», «потрёпан», «ранен на 2 дня».
function returnWords(x){const f=L.female(x.hunter||x.town);if(x.win)return x.rag?`с победой, но ${f?'потрёпана':'потрёпан'}`:'с победой';
 return x.town?'ни с чем':x.injury>1?`${f?'ранена':'ранен'} на ${L.days(x.injury)}`:f?'потрёпана':'потрёпан';}
// The card «Утро, день N» (GDD 10.9): the sky, who came back, who heals and sulks, who joined, the notes left by guests
// who were not heard (decision D5), the shelf and the Academy, the words of the hunters' arcs. Every row leads somewhere.
export function morningReport(s,res={}){const m=res.morning||P.morning(s),rows=[],row=(icon,text,to={})=>rows.push({icon,text,...to});
 for(const x of m.returns||[])row(x.win?'check':'bandage',`Вернул${L.female(x.hunter||x.town)?'ась':'ся'} ${x.hunter?name(x.hunter):L.TOWN_TYPE.get(x.town)?.label.toLowerCase()} — ${returnWords(x)}`,{report:x.report});
 for(const id of m.back||[])row('people',`Снова в строю: ${name(id)}`,{view:'reception',tab:'artel'});
 for(const id of m.forgiven||[])row('people',`${name(id)} снова ${L.female(id)?'готова':'готов'} к делу: «Кто старое помянет…»`,{view:'reception',tab:'artel'});
 const healing=(m.healing||[]).filter(h=>!(m.returns||[]).some(x=>x.hunter===h.hunter));if(healing.length)row('bandage',`Лечатся: ${healing.map(h=>`${name(h.hunter)} (ещё ${L.days(h.days)})`).join(', ')}`,{view:'reception',tab:'artel'});
 for(const h of m.sulking||[])if(!(m.returns||[]).some(x=>x.hunter===h.hunter))row('people',`${name(h.hunter)} ${L.female(h.hunter)?'обиделась':'обиделся'} — вернётся через ${L.days(h.days)}`,{view:'reception',tab:'artel'});
 for(const id of m.joined||[])row('people',`В артели ${L.female(id)?'новая охотница':'новый охотник'}: ${L.HUNTER.get(id).name}`,{view:'reception',tab:'artel'});
 for(const n of m.notes||[])row('letter',n.text,{view:'bestiary',monster:L.monsterOf(n.fact)?.id});
 for(const a of res.arcs||[])if(!a.id.endsWith('.end'))row('quill',`${name(a.hunter)}: «${a.text}»`,{view:'reception',tab:'artel'});
 if(m.books)row('book','Новые книги на полке у Янека',{view:'shop',tab:'trader'});
 if(m.academy)row('scale','Магистр Брандт в Велене: Академия покупает листы',{view:'shop',tab:'academy'});
 row('door',m.guests?`Сегодня ${m.guests===1?'ждёт':'ждут'} ${m.guests} ${plural(m.guests,'гость','гостя','гостей')}`:'Сегодня никого не ждём',{view:'reception',tab:'queue'});
 return {title:`Утро, день ${s.day}`,sky:townMorningWords({season:m.season,weather:m.weather}),line:m.line,hold:m.hold,thaw:m.thaw,rows};}
