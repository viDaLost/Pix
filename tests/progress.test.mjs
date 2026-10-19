import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {P,L,R,B,roll,game,snap,place,clear,know,ctx,join} from './bestiary-helpers.mjs';
import {play} from '../scripts/bot.mjs';
const src=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');

test('every wrapper of GDD 12.5 is there',()=>{
 const names=['newGame','load','serialize','normalize','endDay','listen','preview','advise','defer','decline','assign','heal','claim','askAgain','readReport','labTest','studyTrophy','crossCheck','rummage','brew',
  'buy','sell','buyRumour','buyBook','buyCandle','copyPage','writeTreatise','leaflet','upgrade','equip','buyDecor','printBestiary','seePage','seeDots','setKeeper','tutor','restartTutorial','skipTutorial','seeHint','markBackup','truthChance','buyEdition'];
 for(const n of names)assert.equal(typeof P[n],'function',n);
});
test('the new modules keep their borders: no DOM in the rules, the content only through lore.js',()=>{
 for(const f of['rng.js','rules.js','bestiary.js','progress.js','lore.js','content-data.js']){const t=src(f);assert.ok(!/\b(document|window|navigator|globalThis)\.|\b(localStorage|indexedDB)\b/.test(t),`${f} touches the DOM`);assert.ok(!/Math\.random/.test(t)||f==='bestiary.js','no hidden randomness');}
 for(const f of['rules.js','bestiary.js','progress.js'])assert.ok(!/content-data\.js/.test(src(f)),`${f} reads the content only through lore.js`);
 assert.equal((src('bestiary.js').match(/Math\.random/g)||[]).length,1,'only a new world without a seed draws one');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');for(const f of['content-data.js','lore.js','rng.js','rules.js','bestiary.js','progress.js'])assert.ok(sw.includes(`'./src/${f}'`),`${f} in sw.js FILES`);
});
// Arguments a careless interface could pass: real ids, ids of other things and nonsense.
function pools(s){const ids=x=>x.map(v=>v.id);return {
 contract:[...ids(s.contracts),'c-999',null],visitor:[...ids(s.visitors),'v-999'],report:[...ids(s.reports),'r-999'],hunter:[...ids(L.HUNTERS),'ghost'],monster:[...ids(L.MONSTERS),'nope'],
 fact:[...L.FACT.keys(),'werewolf.nope'],material:[...ids(L.MATERIALS),'gold'],potion:[...ids(L.POTIONS),'nope'],book:[...ids(L.BOOKS),'nope'],upgrade:[...ids(L.UPGRADES),'nope'],gear:[...ids(L.GEAR),'nope'],
 decor:[...ids(L.DECOR),'nope'],variant:['young','grown','ancient','huge'],choice:['coins','loot','know','all'],n:[1,2,0,-1,1.5,1000],slot:[0,1,2]};}
const pickOf=(seed,i,k,list)=>list[Math.floor(roll(seed,'fuzz',i,k)*list.length)];
function call(s,seed,i){const p=pools(s),g=k=>pickOf(seed,i,k,p[k]),facts=n=>Array.from({length:n},(_,j)=>pickOf(seed,i,'f'+j,p.fact)),own=c=>{const x=s.contracts.find(x=>x.id===c);return x?L.MON.get(x.monster).facts.map(f=>f.id):p.fact;};
 const c=g('contract'),mine=own(c),sheet=Array.from({length:pickOf(seed,i,'len',[2,3,3,3,4])},(_,j)=>pickOf(seed,i,'s'+j,mine)),pots=Array.from({length:pickOf(seed,i,'pl',[0,1,2,3])},(_,j)=>pickOf(seed,i,'p'+j,p.potion));
 const acts=[()=>P.listen(s,g('visitor')),()=>P.advise(s,c,sheet,pots),()=>P.defer(s,c),()=>P.decline(s,c),()=>P.assign(s,c,g('hunter')),()=>P.heal(s,g('hunter')),
  ()=>P.claim(s,g('report'),g('choice')),()=>P.askAgain(s,g('report')),()=>P.readReport(s,g('report')),()=>P.labTest(s,facts(pickOf(seed,i,'lf',[1,2,3])),pickOf(seed,i,'part',[undefined,...p.material])),
  ()=>P.studyTrophy(s,g('monster'),g('variant'),pickOf(seed,i,'tf',[null,...p.fact])),()=>P.crossCheck(s,g('fact')),()=>P.rummage(s,g('monster')),()=>P.brew(s,g('potion'),{buyMissing:roll(seed,'bm',i)<.5}),
  ()=>P.buy(s,g('material'),g('n')),()=>P.sell(s,g('material'),g('n')),()=>P.buyRumour(s,g('slot')),()=>P.buyBook(s,g('book')),()=>P.buyCandle(s),()=>P.copyPage(s,g('monster')),()=>P.writeTreatise(s,g('monster')),
  ()=>P.leaflet(s,g('monster')),()=>P.upgrade(s,g('upgrade')),()=>P.equip(s,g('hunter'),g('gear')),()=>P.buyDecor(s,g('decor')),()=>P.buyEdition(s,g('monster')),()=>P.printBestiary(s),()=>P.setKeeper(s,pickOf(seed,i,'k',['keeper_a','keeper_b','nobody']))];
 return pickOf(seed,i,'act',acts)();}
test('every action checks first and changes nothing when it refuses (GDD 12.4): 6000 careless calls on played states',()=>{
 let refused=0,done=0;
 for(let seed=1;seed<=12;seed++){const s=game(seed);if(seed%2)s.gold=400;
  for(let i=0;i<500;i++){const before=snap(s),r=call(s,seed,i);assert.ok(r&&typeof r.ok==='boolean',`action ${i} returned ${JSON.stringify(r)}`);
   if(!r.ok){refused++;assert.equal(typeof r.why,'string');assert.ok(r.why.length>3&&/[а-яё]/i.test(r.why),r.why);assert.equal(snap(s),before,`seed ${seed} call ${i}: refused («${r.why}») but changed the state`);}else done++;
   if(i%60===59){P.endDay(s);assert.equal(snap(P.load(snap(s))),snap(s),'the state stays loadable');}
   assert.ok(s.gold>=0&&Object.values(s.stock).every(n=>n>=0)&&Object.values(s.potions).every(n=>n>=0&&n<=9)&&s.daily.candles<=R.candleMax(s));}}
 assert.ok(refused>2000&&done>300,`${refused} refused, ${done} done`);
});
// Review of G1: the same careless calls on late states — the sorcerer's case, the Academy, the press, the seal.
test('every action stays atomic late in the game: 2400 careless calls on states the bot played to days 26–70',()=>{
 let refused=0,done=0;
 for(const [seed,at] of[[1,26],[2,45],[3,70]]){const s=P.load(play(seed,'learning',at,{stopAt:at}).state);s.gold+=2000;
  for(let i=0;i<800;i++){const before=snap(s),r=call(s,seed*1000+at,i);assert.ok(r&&typeof r.ok==='boolean');
   if(!r.ok){refused++;assert.equal(snap(s),before,`day ${at} call ${i}: refused («${r.why}») but changed the state`);}else done++;if(i%100===99)P.endDay(s);}}
 assert.ok(refused>1000&&done>200,`${refused} refused, ${done} done`);
});
test('the wrappers repair a state that lacks a field before they act, then do one thing',()=>{
 const s=game(91);delete s.trader;delete s.editions;const r=P.buyCandle(s);assert.ok(r.ok);assert.ok(s.trader&&Array.isArray(s.editions));
 const t=game(92);const before=snap(t);P.preview(t,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads'],['aconite_oil']);P.truthChance(t,'c-1',['werewolf.silver']);P.cases(t);P.cards(t,'c-1');P.skyToday(t);P.reportText(t,'r-1');P.morning(t);
 assert.equal(snap(t),before,'what only reads never writes');
});
test('preview is the bar of GDD 3.3: low/mid/high, three segments, potions, errors and the line of the hunter',()=>{
 const s=game(93),pv=P.preview(s,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads'],['aconite_oil']);
 assert.deepEqual([pv.low,pv.mid,pv.high,pv.k,pv.potion,pv.skill,pv.plus,pv.minus,pv.line],[84,84,84,2,10,8,18,0,'good']);assert.deepEqual(pv.segments.map(x=>x.kind),['ok','ok','none']);assert.deepEqual(pv.errors,[]);
 assert.equal(P.preview(s,'c-404',[],[]),null);const e=P.preview(s,'c-1',['werewolf.silver','werewolf.silver'],['nope']);assert.ok(e.errors.length>=2);
 // The lines of the hunter by the shown estimate (GDD 3.2).
 assert.deepEqual([100,74,41,16].map(R.estimateLine),['sure','good','risky','grim']);for(const k of['sure','good','risky','grim'])assert.ok(L.LINES.estimate[k],k);
});
test('the reception helpers: cases with their sky and sign, the cards of a sheet, «Небо дня» with revealed weather conditions',()=>{
 const s=game(94),[c]=P.cases(s);assert.equal(c.id,'c-1');assert.deepEqual(c.ctx,{variant:'grown',weather:P.weatherOf(s),season:0});assert.ok(L.MON.get('werewolf').variants.find(v=>v.id==='grown').signs.includes(c.sign));assert.equal(c.visitor,s.visitors[0].id);
 const cards=P.cards(s,'c-1');assert.deepEqual(cards.map(x=>x.id).sort(),Object.keys(s.know).filter(id=>id.startsWith('werewolf.')).sort());assert.equal(cards.find(x=>x.id==='werewolf.silver').believed,'ok');assert.equal(cards.find(x=>x.id==='werewolf.garlic').believed,null);
 P.applyStory(s,L.STORY.get('S3'));P.applyStory(s,L.STORY.get('S4'));P.applyStory(s,L.STORY.get('S5'));know(s,'basilisk.fog','confirmed',1);know(s,'wyvern.rain','confirmed',1);
 const sky=P.skyToday(s);assert.deepEqual(sky.facts.map(x=>x.id).sort(),['basilisk.fog','wyvern.rain']);for(const x of sky.facts)assert.equal(x.outcome,R.outcome(L.FACT.get(x.id),{variant:'grown',weather:sky.weather,season:sky.season}));
});
test('fresh ink, the tutorial steps, hints, the keeper and the backup mark',()=>{
 const s=game(95);assert.ok(P.freshInk(s,'werewolf').length>0);assert.equal(P.seePage(s,'werewolf'),true);assert.deepEqual(P.freshInk(s,'werewolf'),[]);assert.equal(P.seePage(s,'werewolf'),false);
 B.resolve(s,L.FACT.get('werewolf.garlic'),'refuted','lab');assert.deepEqual(P.freshInk(s,'werewolf'),['werewolf.garlic']);assert.equal(P.seeDots(s),true);assert.deepEqual(P.freshInk(s,'upyr'),[]);
 const steps=L.LINES.tutorial.map(t=>t.id);assert.equal(P.tutor(s,steps[0]),true);assert.equal(P.tutor(s,steps[0]),false);for(const id of steps)P.tutor(s,id);assert.equal(s.tutorial.finished,true);
 P.restartTutorial(s);assert.deepEqual(s.tutorial,{done:[],skipped:false,finished:false});P.skipTutorial(s);assert.equal(s.tutorial.skipped,true);assert.equal(P.tutor(s,steps[1]),false);
 assert.equal(P.seeHint(s,'first_rumour'),true);assert.equal(P.seeHint(s,'first_rumour'),false);assert.equal(P.seeHint(s,'nope'),false);
 assert.ok(P.setKeeper(s,'keeper_b').ok);assert.equal(s.keeper,'keeper_b');assert.equal(P.setKeeper(s,'x').ok,false);s.day=7;P.markBackup(s);assert.equal(s.backup,7);
});
test('a tip of Даро is marked once a day for the interface, and only until it was seen',()=>{
 const s=game(96);B.addRumour(s,L.FACT.get('werewolf.torch'),'shop');assert.ok(s.daily.firsts.includes('tip:first_rumour'));P.seeHint(s,'first_rumour');s.daily.firsts=[];
 B.addRumour(s,L.FACT.get('werewolf.moonrise'),'shop');assert.ok(!s.daily.firsts.includes('tip:first_rumour'));
 // A failure at night marks its tip for the morning that tells of it.
 const t=game(97);assert.ok(P.advise(t,'c-1',['werewolf.silver','werewolf.garlic','werewolf.dawn']).ok);P.endDay(t);assert.ok(t.daily.firsts.includes('tip:first_failure'));assert.ok(t.daily.firsts.includes('tip:first_harmful'));
});
// The interface changes the game only through P.* (GDD 12.4): no core, rules or raw content in app.js, and the only
// fields it writes itself are the player's settings.
test('the interface reaches the game only through P.*, the content only through lore.js',async()=>{
 const app=src('app.js'),imports=[...app.matchAll(/^import[^;]*from '\.\/([^']+)'/gm)].map(m=>m[1]);
 for(const f of['rules.js','bestiary.js','content-data.js','rng.js'])assert.ok(!imports.includes(f),`app.js imports ${f}`);
 assert.doesNotMatch(app,/\b[BR]\.[a-zA-Z]+\(/,'no call of the core or the rules');
 const writes=[...app.matchAll(/state\.([A-Za-z]+)(?:\.[A-Za-z]+)*(?:=(?!=)|\+\+|--|\.(?:push|splice|pop|shift|unshift)\()/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(writes)].filter(k=>!['welcomed','legacySeen','sound','music','volume','haptics','prefs','savedAt'].includes(k)),[],'only settings are written outside P.*');
 const mods={P,L,G:await import('../src/guide.js'),A:await import('../src/ambience.js')};
 for(const [name,mod] of Object.entries(mods))for(const k of new Set([...app.matchAll(new RegExp(`\\b${name}\\.([A-Za-z_]+)`,'g'))].map(m=>m[1])))assert.ok(k in mod,`app.js uses ${name}.${k}, which does not exist`);
});
test('every button of the interface has its handler and every icon it draws exists',async()=>{
 const app=src('app.js'),{ICONS}=await import('../src/icons.js');
 const actions=new Set([...app.matchAll(/btn\('([a-z-]+)'/g),...app.matchAll(/data-action="([a-z-]+)"/g),...app.matchAll(/dataset\.action='([a-z-]+)'/g)].map(m=>m[1]));
 const cases=new Set([...app.matchAll(/case'([a-z-]+)'/g)].map(m=>m[1]));
 assert.deepEqual([...actions].filter(a=>!cases.has(a)),[],'an action without a handler');assert.ok(actions.size>60,`${actions.size} actions`);
 const icons=new Set([...app.matchAll(/icon\('([a-z-]+)'/g)].map(m=>m[1]));for(const i of icons)assert.ok(ICONS.includes(i),`icon «${i}» is not drawn`);
 for(const i of['door','book','flask','scale','scroll','candle','snuff','quill','cauldron','mortar','hourglass','bandage','fang','blade','amulet','hand','claw','people','pin'])assert.ok(ICONS.includes(i),`art.md 1.6: ${i}`);
 for(const c of L.CATEGORIES)assert.ok(ICONS.includes(c.icon),c.icon);
});
// The screens and words of GDD 10 are all in the interface: the five tabs, the HUD, the segments of every screen, the
// labels of the actions (10.9), the welcome and the window of the previous game word for word, the menu of 10.1.
test('the interface carries every screen, segment and label of GDD 10',()=>{
 const app=src('app.js');
 for(const t of['Приёмная','Бестиарий','Опыты','Лаборатория','Лавка','Летопись','Очередь','Артель','Образцы','Алхимия','Архив','Торговка','Академия','Обустройство','Путь','Трофеи','Дни'])assert.ok(app.includes(`'${t}'`),`a tab or segment «${t}»`);
 for(const t of['Выслушать','Открыть лист','Отложить','Отказать','Отдать лист просителю','Вписать в бестиарий','Расспросить','Лекарь','Испытать','Изучить','Сверить летописи','Порыться в летописях','Сварить','Докупить и сварить','Купить','Продать','Продать лист','Написать трактат','Листок для печатни','Напечатать Великий бестиарий','Выбрать охотника','К Академии'])assert.ok(app.includes(t),`the label «${t}» (GDD 10.9)`);
 assert.match(app,/`Отправить \$\{h\.acc\}`/,'«Отправить Гордея»: the hunter in the accusative');
 for(const t of['Тебе приходят за советом: какое чудище, где и как его взять.','Пиши три указания — каждое верное даёт треть успеха, три верных — победу.','Ошибёшься — охотник вернётся побитым и расскажет, что было не так.'])assert.ok(app.includes(t),`the welcome: ${t}`);
 assert.ok(app.includes('Здесь была ювелирная мастерская «Сияние». Её сохранение не тронуто — его можно скачать в меню. В бестиарий оно не переносится.'),'the window of the previous game');
 for(const t of['Справочник','Звук','Музыка','Громкость','Крупный текст','Меньше анимаций','Вибрация','Облик летописца','Скачать сохранение','Загрузить сохранение','Скачать сохранение прежней игры','Вернуть прежний бестиарий','Начать заново','На главный экран'])assert.ok(app.includes(t),`the menu: ${t}`);
 for(const t of['Сегодня никого не ждёт','Нет сведений ещё одного рода','Книги в лавке','Порыться в архиве','Как считается','Как узнать?','Этот лист у Магистра уже есть','Магистр сомневается: какая-то запись верна не всегда','Не заведено','Откроется по письму Академии.','Великий бестиарий','Свечи догорели — завтра','Опасно — так советовать нельзя','не нужно'])assert.ok(app.includes(t),`a line of GDD 10: ${t}`);
 // The bar of the estimate: three segments under the slots and the fourth of potions, «Надёжно N%», «от», «до».
 assert.match(app,/pv\.segments\.map\(s=>`<i class="seg \$\{SEG\[s\.kind\]\}"><\/i>`\)/);assert.match(app,/<i class="seg plus">/);assert.match(app,/<b>Надёжно \$\{pv\.mid\}%<\/b>/);assert.match(app,/role="meter"/);
 // The report: a stamp for every piece of advice, the medal of the lot with the estimate shown at the time, never the truth.
 assert.match(app,/stamp\(it\.seen\?it\.o:'unseen'\)/);assert.match(app,/по листу: надёжно \$\{r\.shown\.mid\}%/);assert.doesNotMatch(app,/truthChance/,'the interface never shows the true chance');
 // The morning windows come in the order of GDD 1.1.
 for(const k of['welcome','legacy','report','rank','story','morning'])assert.match(app,new RegExp(`queueModal\\([^;]*,'${k}'\\)`),k);
});
// Found in the second review of Г2: a huntress deferred her case «первым»; the scene called Агата «побитый»; the rank pill
// left the sheet's entry in the history, so «Назад» did nothing once; a button off for want of candles said nothing in the
// archive and the Academy, and «осталась одна» was written whatever was left.
test('second review of Г2: words in the right gender, one history entry, a reason for every button off for want of candles',()=>{
 const app=src('app.js');
 assert.match(app,/придёт завтра \$\{gendered\(c\.hunter,'первым','первой'\)\}/);assert.match(app,/gendered\(first\.who,', побитый',', побитая'\)/);
 assert.match(app,/case'rank-path':view='chronicle';chronicleTab='path';leaveSheet\(\);/);assert.equal(app.match(/[^.]sheet=null;render\(\)/g).length,1,'only «Назад» itself drops the sheet without leaveSheet(): its entry is already gone');
 assert.match(app,/const noCandles=n=>\{const left=P\.candlesLeft\(state\);/);assert.match(app,/осталась одна':`осталось \$\{left\}`/);
 assert.match(app,/notes&&list\.length\?noCandles\(2\):''/,'«Сверить летописи» needs two candles and says so');
 assert.match(app,/'страница полна — для трактата нужны 2 свечи'/);assert.match(app,/\$\{rows\}\$\{open\?noCandles\(1\):''\}/);
 assert.match(app,/Лекарь заплачен\. \$\{hunterOf\(d\.id\)\.short\} \$\{r\.out\?`лечится ещё/);
});
