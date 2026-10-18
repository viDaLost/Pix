import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {P,L,B,game,place,clear,know,join} from './bestiary-helpers.mjs';
import * as G from '../src/guide.js';
import {play} from '../scripts/bot.mjs';
// Every step of «Сегодня» and every row of the morning leads somewhere the interface knows.
const VIEWS=['reception','bestiary','lab','shop','chronicle'];
const leads=x=>VIEWS.includes(x.view)||typeof x.report==='string'||x.end!==undefined;

test('the queue of the reception: a guest with a case while it is on the table, a guest with news until heard, the Magister the whole day',()=>{
 const s=game(11);assert.deepEqual(G.queueOf(s).map(G.guestName),['Гордей'],'day 1 is the lesson: only Гордей');assert.deepEqual(G.standing(s),[]);
 assert.ok(P.advise(s,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads']).ok);assert.deepEqual(G.queueOf(s),[],'a hunter sent on his way leaves the queue');
 P.endDay(s);const q=G.queueOf(s);assert.ok(q.some(v=>v.kind==='vedana'));const ved=q.find(v=>v.kind==='vedana');
 assert.equal(G.guestName(ved),'Ведана');P.listen(s,ved.id);assert.ok(!G.queueOf(s).includes(ved),'heard — gone');
 clear(s);s.visitors.push({id:'v-90',kind:'otto',who:'otto',contract:null,rumour:null,heard:true});assert.deepEqual(G.queueOf(s).map(v=>v.kind),['otto'],'the Magister waits for his pages all day');
 // Personal cases and the sorcerer wait on the table without a guest.
 const t=game(12);clear(t);join(t,'marta');t.personal.marta={monster:'werewolf',variant:'ancient',since:1,state:'open',tries:0};const c=place(t,{kind:'personal',hunter:'marta',variant:'ancient'});
 assert.deepEqual(G.standing(t).map(x=>x.id),[c.id]);
});
test('«Сегодня» gives one to three steps without reproach, and each leads to its place',()=>{
 const s=game(11),first=G.nextSteps(s);assert.equal(first[0].text,'Гордей ждёт у стола');assert.ok(first.length>=1&&first.length<=3);
 P.advise(s,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads']);assert.deepEqual(G.nextSteps(s).map(x=>x.id),['candles']);assert.equal(G.nextSteps(s)[0].end,true,'nobody waits: the day may end');
 s.daily.candles=P.candleMax(s);assert.deepEqual(G.nextSteps(s).map(x=>[x.id,x.text]),[['night','Свечи догорели — можно задуть свечу']]);
 P.endDay(s);const two=G.nextSteps(s);assert.ok(two.some(x=>x.text==='Даро зашёл — выслушай'||x.text==='Ведана зашла — выслушай'),JSON.stringify(two));
 // A rumour of a substance and a sample in store; the Magister in town; a full page.
 const t=game(13);clear(t);t.stock.werewolf_fur=1;const lab=G.nextSteps(t).find(x=>x.id==='lab');assert.ok(lab,'two rumours of the werewolf can go to the bench');assert.match(lab.text,/^У волколака \d слух/);assert.equal(lab.monster,'werewolf');
 P.applyStory(t,L.STORY.get('S1'));t.day=3;assert.ok(P.academyOpen(t));assert.ok(G.nextSteps(t).some(x=>x.id==='academy'&&/^Магистр в городе: \d+ запис/.test(x.text)));
 for(const f of L.MON.get('zlyden').facts){if(f.truth==='conditional')know(t,f.id,'confirmed',1);else know(t,f.id,f.truth==='true'?'confirmed':f.truth==='myth'?'refuted':'dangerous');}t.monsters.zlyden.troph=['young','grown'];
 assert.ok(G.nextSteps(t).some(x=>x.id==='treatise'&&x.text==='Страница злыдня полна — можно писать трактат')||G.nextSteps(t).length===3);
 for(const st of[s,t])for(const x of G.nextSteps(st))assert.ok(leads(x),JSON.stringify(x));
 // Days a bot played: never more than three steps, never a placeholder left in the words.
 for(const [seed,day] of[[1,9],[2,24],[3,40]]){const x=P.load(play(seed,'learning',day,{stopAt:day}).state),steps=G.nextSteps(x);assert.ok(steps.length>=1&&steps.length<=3);for(const st of steps){assert.ok(leads(st));assert.doesNotMatch(st.text,/\{|\}|undefined/);}}
});
test('the morning card: who came back and how, who heals, who joined, the notes left by guests nobody heard (D5)',()=>{
 const s=game(11);P.advise(s,'c-1',['werewolf.silver','werewolf.garlic','werewolf.dawn']);const r=P.endDay(s),m=G.morningReport(s,r);
 assert.equal(m.title,'Утро, день 2');assert.match(m.sky,/^Осень, /);assert.ok(m.line.length>3);
 const back=m.rows.find(x=>x.report);assert.match(back.text,/^Вернулся Гордей — (ранен на \d дн(я|ей)|потрёпан)$/,'the owner\'s example: silver, garlic and the dawn lose');assert.equal(back.icon,'bandage');
 assert.equal(m.rows.at(-1).text,`Сегодня ждут ${s.visitors.length} ${s.visitors.length<5?'гостя':'гостей'}`);
 // Nobody listened to Ведана: in the morning her note lies on the table, the rumour already in the bestiary.
 const ved=s.visitors.find(v=>v.kind==='vedana'&&v.rumour),r2=P.endDay(s),m2=G.morningReport(s,r2),note=m2.rows.find(x=>x.icon==='letter');
 assert.ok(ved&&note,'a note of the morning');assert.match(note.text,/^Ведана не дождалась и оставила на столе записку о /);assert.equal(note.view,'bestiary');assert.ok(s.know[r2.morning.notes[0].fact]);
 assert.ok(m2.rows.some(x=>x.text==='В артели новый охотник: Тимофей Скворцов'));assert.ok(m2.rows.some(x=>/^Лечится: Гордей \(ещё \d дн/.test(x.text))||s.hunters.gordey.out===0);
 for(const x of[...m.rows,...m2.rows])assert.ok(leads(x),JSON.stringify(x));
 // A woman comes back in her own words.
 const t=game(21);clear(t);join(t,'agata');const c=place(t,{hunter:'agata',win:true,at:60});P.advise(t,c.id,['werewolf.silver','werewolf.aconite','werewolf.crossroads']);const mt=G.morningReport(t,P.endDay(t));
 assert.ok(mt.rows.some(x=>x.text==='Вернулась Агата — с победой'),JSON.stringify(mt.rows));
});
test('the morning words stay whole through a long game: no placeholder, every row leads somewhere',()=>{
 for(const seed of[4,5]){let s=P.newGame(seed);for(let d=1;d<=30;d++){for(const c of[...s.contracts]){const cards=P.cards(s,c.id).filter(x=>x.usable);const pick=[];for(const x of cards)if(!pick.some(y=>y.cat===x.cat)&&pick.length<3)pick.push(x);
   if(c.kind==='story'&&!c.hunter){const h=L.HUNTERS.find(h=>P.free(s,h.id));if(h)P.assign(s,c.id,h.id);}if(pick.length===3)P.advise(s,c.id,pick.map(x=>x.id));}
  const m=G.morningReport(s,P.endDay(s));assert.match(m.title,/^Утро, день \d+$/);for(const x of m.rows){assert.doesNotMatch(x.text,/\{|\}|undefined|NaN/,x.text);assert.ok(leads(x),JSON.stringify(x));}}}
});
test('the margin of a record speaks from its state, and a rumour names its teller in the right case (GDD 2.4, 10.5)',()=>{
 const s=game(41),f=id=>L.FACT.get(id),k=(id,x)=>({st:'rumour',rev:0,src:'start',ok:0,none:0,worse:0,...x});
 assert.equal(G.marginNote(k('werewolf.garlic'),f('werewolf.garlic')),'слух — из Тетради Даро');
 const told={shop:'от Янека',vedana:'от Веданы',nikodim:'от о. Никодима',town:'от горожан',tale:'из рассказа охотника',rummage:'из летописей',story:'из предания'};
 for(const [src,from] of Object.entries(told))assert.equal(G.marginNote(k('werewolf.garlic',{src}),f('werewolf.garlic')),`слух — ${from}`);
 assert.equal(G.marginNote(k('werewolf.dawn',{src:'book',by:'lubok_wonders'}),f('werewolf.dawn')),`слух — из книги «${L.BOOK.get('lubok_wonders').title}»`);
 assert.equal(G.rumourSource(k('werewolf.dawn',{src:'shop'})),'Янек','the stamp keeps the nominative');assert.equal(G.rumourSource(k('werewolf.dawn',{src:'book',by:'lubok_wonders'})),`«${L.BOOK.get('lubok_wonders').title}»`);
 assert.equal(G.marginNote(k('werewolf.silver',{st:'confirmed',ok:3}),f('werewolf.silver')),'верно — проверено трижды');
 assert.equal(G.marginNote(k('werewolf.silver',{st:'confirmed',ok:1}),f('werewolf.silver')),'верно — проверено делом');
 assert.equal(G.marginNote(k('werewolf.silver',{st:'confirmed',src:'lab'}),f('werewolf.silver')),'верно — проверено опытом');
 assert.equal(G.marginNote(k('werewolf.crossroads',{st:'refuted'}),f('werewolf.crossroads')),'пустое');
 assert.equal(G.marginNote(k('werewolf.dawn',{st:'dangerous'}),f('werewolf.dawn')),'НИ В КОЕМ СЛУЧАЕ');
 assert.equal(G.marginNote(k('werewolf.name',{st:'confirmed',rev:1}),f('werewolf.name')),`верно лишь: ${f('werewolf.name').condTag}`);
 // Every record of a long game reads as a whole phrase.
 const x=P.load(play(5,'learning',30,{stopAt:30}).state);for(const [id,r] of Object.entries(x.know)){const t=G.marginNote(r,f(id));assert.match(t,/^(верно|пустое|НИ В КОЕМ СЛУЧАЕ|слух — (из|от|с) )/,`${id}: ${t}`);assert.doesNotMatch(t,/undefined|\{/);}
 assert.ok(s.know['werewolf.garlic'],'a new game starts with the rumours of Даро');
});
test('the guide changes nothing in the game: it only reads',()=>{
 const s=game(31);P.endDay(s);const before=P.serialize(s);G.nextSteps(s);G.morningReport(s);G.queueOf(s);G.standing(s);assert.equal(P.serialize(s),before);
 const src=readFileSync(new URL('../src/guide.js',import.meta.url),'utf8');assert.doesNotMatch(src,/\b(document|window|localStorage)\.|\bnavigator\b/,'no DOM');
 assert.doesNotMatch(src,/P\.(advise|listen|endDay|claim|buy|sell|brew|labTest|copyPage|writeTreatise|upgrade|equip)\(/,'no actions');
});
// The draft of a sheet (GDD 10.3): a slip in the sheet always comes out at a tap, even one a book or an experiment has
// since found dangerous; a slip of a taken category replaces the other one; a dangerous slip and a fourth are refused;
// a potion given to another hunter the same day leaves the draft instead of locking the sheet.
test('the draft of a sheet: a slip comes out at a tap even when it turned dangerous, and a potion that is gone leaves it',()=>{
 const s=game(23),cid=s.contracts[0].id,card=id=>P.cards(s,cid).find(x=>x.id===id);
 const four=L.MON.get('werewolf').facts.filter(f=>s.know[f.id]&&P.cards(s,cid).find(x=>x.id===f.id).usable);const cats=[...new Set(four.map(f=>f.cat))];assert.ok(cats.length>=4);
 const three=cats.slice(0,3).map(c=>four.find(f=>f.cat===c).id),fourth=four.find(f=>f.cat===cats[3]).id;
 assert.equal(G.draftTap({facts:three,potions:[]},card(fourth)).refused,'full','a fourth slip is refused');
 let d={facts:['werewolf.silver','werewolf.aconite','werewolf.dawn'],potions:['aconite_oil']};
 know(s,'werewolf.dawn','dangerous');assert.equal(card('werewolf.dawn').usable,false,'the book made «На восходе» dangerous');
 assert.deepEqual(G.draftTap(d,card('werewolf.dawn')),{facts:['werewolf.silver','werewolf.aconite'],removed:'werewolf.dawn'},'it still comes out of the sheet');
 d={facts:['werewolf.silver'],potions:[]};assert.equal(G.draftTap(d,card('werewolf.dawn')).refused,'dangerous','but it is never written in');assert.deepEqual(d.facts,['werewolf.silver']);
 d={facts:['werewolf.silver','werewolf.aconite'],potions:[]};const r=G.draftTap(d,card('werewolf.garlic'));
 assert.deepEqual(r,{facts:['werewolf.silver','werewolf.garlic'],replaced:'werewolf.aconite'},'one slip a category: «Чеснок» takes the place of «Волчий корень»');
 assert.deepEqual(G.draftTap({facts:['werewolf.silver'],potions:[]},card('werewolf.crossroads')),{facts:['werewolf.silver','werewolf.crossroads'],added:'werewolf.crossroads'});
 s.potions.aconite_oil=0;assert.deepEqual(G.liveDraft(s,{facts:['werewolf.silver'],potions:['aconite_oil','thistle_brew']}),{facts:['werewolf.silver'],potions:['thistle_brew']},'the potion given away leaves the draft');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');assert.match(app,/G\.draftTap\(d,card\)/,'the sheet taps through G.draftTap');assert.match(app,/G\.liveDraft\(state,d\)/,'and keeps only what can still go');
});
// The slots of the sheet are narrow on a phone: long titles carry soft hyphens of their own, so «Перекрёсток» breaks as
// «Перекрёс-ток», never «Перекрёсто-к», even in a browser without a hyphenation dictionary.
test('soft hyphens keep a long title in its slot: every part has a vowel and two letters, never before ь, ъ, й',()=>{
 const parts=w=>G.hyphenate(w).split('\u00ad');
 assert.deepEqual(parts('Перекрёсток'),['Пе','рек','рёс','ток']);assert.deepEqual(parts('уберечься'),['убе','речь','ся']);assert.deepEqual(parts('Можжевельник'),['Мож','же','вель','ник']);
 assert.equal(G.hyphenate('Волчий корень'),'Волчий корень','words under nine letters stay whole, so a line never breaks «ко-рень»');assert.equal(G.hyphenate('Серебро'),'Серебро');
 for(const f of L.MONSTERS.flatMap(m=>m.facts))for(const w of G.hyphenate(f.title).split(/[\s-]/)){const p=w.split('\u00ad');assert.equal(p.join(''),w.replace(/\u00ad/g,''));
  if(p.length>1)for(const x of p){assert.ok(x.replace(/[^А-Яа-яЁё]/g,'').length>=2,`${f.title}: «${x}»`);assert.match(x,/[аеёиоуыэюя]/i,`${f.title}: «${x}» without a vowel`);}
  for(const x of p.slice(1))assert.doesNotMatch(x,/^[йьъ]/i,`${f.title}: a part begins with ь, ъ or й`);}
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');assert.match(app,/esc\(G\.hyphenate\(f\.title\)\)/,'the slot writes the title with its soft hyphens');
});
