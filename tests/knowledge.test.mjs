import test from 'node:test';
import assert from 'node:assert/strict';
import {P,L,R,B,roll,game,snap,place,clear,know,ctx,join} from './bestiary-helpers.mjs';
const F=id=>L.FACT.get(id);
// The state of a record after one noticed outcome, starting from a given record (null — no record).
function after(id,from,o,c=ctx()){const s=game(31);delete s.know[id];if(from)know(s,id,from.st,from.rev||0);const rep=s.rep,res=B.observe(s,F(id),o,c);return {k:s.know[id],res,rep:s.rep-rep,s};}

test('a noticed outcome resolves a rumour or an empty record into its exact state, +2 reputation once (GDD 2.5)',()=>{
 for(const from of[null,{st:'rumour'}])for(const [id,o,st] of[['werewolf.silver','ok','confirmed'],['werewolf.garlic','none','refuted'],['werewolf.dawn','worse','dangerous']]){
  const x=after(id,from,o);assert.equal(x.k.st,st,`${id} from ${from?.st||'nothing'}`);assert.equal(x.k.rev,0);assert.equal(x.rep,2);assert.equal(x.k[o],1);assert.equal(x.k.src,'hunt');
  assert.deepEqual(x.res,{from:from?.st??null,to:st,rev:0});assert.deepEqual(x.k.last,{v:'grown',w:'clear',k:0},'the last circumstances are kept for the page');}
 // A second identical outcome only counts; no reputation the second time.
 const x=after('werewolf.garlic',{st:'rumour'},'none'),rep=x.s.rep;B.observe(x.s,F('werewolf.garlic'),'none',ctx('young','fog',1));assert.equal(x.s.rep,rep);assert.equal(x.s.know['werewolf.garlic'].none,2);assert.deepEqual(x.s.know['werewolf.garlic'].last,{v:'young',w:'fog',k:1});
});
test('every cell of the table: counters where the record agrees, a contradiction where it does not',()=>{
 // confirmed, rev 0
 let x=after('werewolf.silver',{st:'confirmed'},'ok');assert.equal(x.k.st,'confirmed');assert.equal(x.k.ok,1);assert.equal(x.rep,0);
 x=after('werewolf.name',{st:'confirmed'},'none',ctx('grown'));assert.deepEqual([x.k.st,x.k.rev,x.rep,x.res.rev],['confirmed',1,2,1],'a conditional fact contradicted: the condition is revealed');
 x=after('zlyden.offering',{st:'confirmed'},'worse',ctx('young'));assert.deepEqual([x.k.st,x.k.rev,x.rep],['confirmed',1,2]);
 // refuted, rev 0
 x=after('werewolf.crossroads',{st:'refuted'},'none');assert.deepEqual([x.k.st,x.k.none,x.rep],['refuted',1,0]);
 x=after('werewolf.name',{st:'refuted'},'ok',ctx('young'));assert.deepEqual([x.k.st,x.k.rev,x.rep],['confirmed',1,2],'refuted but it helped the young: revealed');
 x=after('zlyden.offering',{st:'refuted'},'worse',ctx('young'));assert.deepEqual([x.k.st,x.k.rev],['confirmed',1],'the protective branch: a conditional is revealed');
 // dangerous, rev 0
 x=after('werewolf.dawn',{st:'dangerous'},'worse');assert.deepEqual([x.k.st,x.k.worse,x.rep],['dangerous',1,0]);
 x=after('zlyden.offering',{st:'dangerous'},'ok',ctx('grown'));assert.deepEqual([x.k.st,x.k.rev,x.rep],['confirmed',1,2]);
 x=after('kikimora.frost',{st:'dangerous'},'none',ctx('grown','clear',0));assert.deepEqual([x.k.st,x.k.rev],['confirmed',1]);
 // rev 1: only counters, whatever the outcome
 for(const o of['ok','none','worse']){x=after('zlyden.offering',{st:'confirmed',rev:1},o,ctx(o==='ok'?'grown':'young'));assert.deepEqual([x.k.st,x.k.rev,x.k[o],x.rep],['confirmed',1,1,0],o);}
 // The protective branch for ordinary facts: nothing changes but nothing breaks either.
 x=after('werewolf.silver',{st:'confirmed'},'none');assert.deepEqual([x.k.st,x.k.rev,x.rep],['confirmed',0,0]);
 x=after('werewolf.crossroads',{st:'refuted'},'ok');assert.deepEqual([x.k.st,x.k.rev,x.rep],['refuted',0,0]);
});
test('a contradiction in a report reveals the condition and says so in the line of LINES.contradiction',()=>{
 const s=game(32);clear(s);know(s,'werewolf.name','confirmed');
 const c=place(s,{monster:'werewolf',variant:'grown',hunter:'agata'});
 // Агата (perception 5) notices almost everything; the owl drops make it certain.
 s.potions.owl_drops=1;assert.ok(P.advise(s,c.id,['werewolf.silver','werewolf.aconite','werewolf.name'],['owl_drops']).ok);
 const r=P.endDay(s).reports[0],item=r.items.find(x=>x.f==='werewolf.name');assert.deepEqual([item.o,item.seen,item.from,item.to,item.rev],['none',true,'confirmed','confirmed',1]);
 assert.equal(s.know['werewolf.name'].rev,1);assert.equal(s.stats.revealed,1);
 const t=P.reportText(s,r.id).items.find(x=>x.f==='werewolf.name');assert.equal(t.contradiction,`Выходит, «Окликнуть по имени» верно не всегда: ${F('werewolf.name').condText}`);
 assert.ok(s.daily.firsts.includes('tip:first_condition'));
});
test('an unnoticed outcome changes nothing; harm is always noticed',()=>{
 const s=game(33);clear(s);const p=R.observeChance(R.perception('gordey',s.hunters.gordey),false);
 // A case where Гордей misses what the garlic did and loses (16⅓%): the dawn is noticed anyway.
 let n=s.nextId;while(!(roll(s.worldSeed,'obs','c-'+n,'werewolf.garlic')>=p&&100*roll(s.worldSeed,'hunt','c-'+n)>=17))n++;
 const c=place(s,{monster:'werewolf',id:n}),before={...s.know['werewolf.garlic']};
 assert.ok(P.advise(s,c.id,['werewolf.silver','werewolf.garlic','werewolf.dawn']).ok);const r=P.endDay(s).reports[0];
 const g=r.items.find(x=>x.f==='werewolf.garlic'),d=r.items.find(x=>x.f==='werewolf.dawn');
 assert.equal(g.seen,false);assert.deepEqual([g.from,g.to],['rumour','rumour']);assert.deepEqual({...s.know['werewolf.garlic']},before);
 assert.deepEqual([d.o,d.seen,d.to],['worse',true,'dangerous']);assert.equal(r.win,false);
 assert.match(P.reportText(s,r.id).items.find(x=>x.f==='werewolf.garlic').text,/Чеснок/,'«Не приметил» names the advice');
 assert.equal(P.reportText(s,r.id).items.find(x=>x.f==='werewolf.garlic').stamp,L.STAMPS.unseen);
});
test('opening a page writes its start states and then what the books already bought said about it',()=>{
 const s=game(34);assert.ok(!s.monsters.leshy);
 // «Записки землемера» is on the shelf only from tier II; put it there by hand to buy it before the page opens.
 B.addBook(s,'sukhov_notes');for(const id of Object.keys(L.BOOK.get('sukhov_notes').sets))assert.equal(s.know[id],undefined,'the entries wait in the book');
 B.addBook(s,'lubok_wonders');assert.equal(s.know['leshy.bell'],undefined);
 const rep=s.rep;B.openMonster(s,'leshy');
 assert.equal(s.know['leshy.inside_out'].st,'confirmed');assert.equal(s.know['leshy.inside_out'].src,'start');
 assert.equal(s.know['leshy.edge'].st,'confirmed');assert.equal(s.know['leshy.edge'].src,'book');assert.equal(s.know['leshy.edge'].by,'sukhov_notes');
 assert.equal(s.know['leshy.whistle'].st,'dangerous','the rumour of the start resolved by the reliable book');assert.equal(s.know['leshy.silver'].st,'refuted');
 assert.equal(s.know['leshy.bell'].st,'rumour','an unreliable book writes rumours only');assert.equal(s.rep-rep,6,'three records resolved by the book: +2 each');
 assert.equal(B.openMonster(s,'leshy'),false,'a page opens once');
});
test('books: a rumour only where nothing is written, exact states only from a reliable book, conditions only as rumours',()=>{
 const s=game(35);know(s,'werewolf.torch','confirmed');// a wrong exact record is never touched by a book
 B.addBook(s,'vilna_werewolves');
 assert.equal(s.know['werewolf.garlic'].st,'refuted');assert.equal(s.know['werewolf.dawn'].st,'dangerous');assert.equal(s.know['werewolf.moonrise'].st,'rumour');assert.equal(s.know['werewolf.torch'].st,'confirmed');
 B.addBook(s,'upyr_tale');assert.equal(s.know['upyr.heart'].st,'rumour','a book never gives a condition more than a rumour');
 const t=game(36);B.addBook(t,'agata_notebook');assert.equal(t.know['kikimora.frost'].st,'rumour','even a reliable book: a conditional only as a rumour');assert.equal(t.know['kikimora.dusk'].st,'dangerous');
 assert.equal(B.addBook(t,'agata_notebook'),false,'a book once');
 // Books never give a monster a third confirmed true fact (GDD 5.6).
 const all=game(37);for(const b of L.BOOKS)B.addBook(all,b.id);for(const m of L.MONSTERS){if(!all.monsters[m.id])B.openMonster(all,m.id);const n=m.facts.filter(f=>all.know[f.id]?.st==='confirmed').length;assert.ok(n<=2,`${m.id}: ${n}`);}
});
test('rumours of the guests, the sheets of Янек and the archive take one unknown fact, weighted towards myths',()=>{
 const count={};for(let seed=1;seed<=400;seed++){const s=game(seed),f=B.pickUnknown(s,L.MON.get('werewolf'),['test',seed]);count[f.truth]=(count[f.truth]||0)+1;assert.equal(s.know[f.id],undefined);}
 // Unknown werewolf facts: moonrise, clothes (true), name (conditional), torch (myth).
 const n=400,w=L.RUMOUR_WEIGHTS,total=2*w.true+w.conditional+w.myth;assert.ok(Math.abs(count.myth/n-w.myth/total)<.07,JSON.stringify(count));assert.ok(Math.abs(count.true/n-2*w.true/total)<.08);
 const s=game(38);for(const f of L.MON.get('werewolf').facts)if(!s.know[f.id])know(s,f.id,'rumour');assert.equal(B.pickUnknown(s,L.MON.get('werewolf'),['x']),null,'nothing unknown: no rumour');
 s.trader={day:s.day,rumours:[{monster:'werewolf',price:5,sold:false}]};s.gold=50;const before=snap(s);const r=P.buyRumour(s,0);assert.equal(r.ok,false);assert.match(r.why,/нового не толкуют/);assert.equal(snap(s),before);
});
test('the tale of a hunter: a rumour, or a seen outcome for a keen eye, and field notes',()=>{
 const s=game(39);clear(s);P.endDay(s);clear(s);
 const sheet=['werewolf.silver','werewolf.aconite','werewolf.crossroads'];
 // Агата sees at 5 (≥ 4): her tale is written as a seen outcome.
 const c=place(s,{monster:'werewolf',hunter:'agata',win:true,at:74});assert.ok(P.advise(s,c.id,sheet).ok);const r=P.endDay(s).reports[0];assert.equal(r.win,true);
 assert.ok(r.offer.tale);assert.equal(r.offer.sure,true);const f=F(r.offer.tale),rep=s.rep,notes=s.notes.werewolf||0;
 const got=P.claim(s,r.id,'know');assert.ok(got.ok);assert.equal(s.know[f.id].st,R.STATE_OF[R.outcome(f,r.contract)]);assert.equal(s.know[f.id].src,'tale');assert.equal(s.rep-rep,2,'resolved once');assert.equal(s.notes.werewolf,notes+1);
 // Гордей sees at 1: his tale is only a rumour.
 const t=game(40);clear(t);P.endDay(t);clear(t);const d=place(t,{monster:'werewolf',hunter:'gordey',win:true,at:74});assert.ok(P.advise(t,d.id,sheet).ok);const q=P.endDay(t).reports[0];
 assert.equal(q.offer.sure,false);assert.ok(P.claim(t,q.id,'know').ok);assert.equal(t.know[q.offer.tale].st,'rumour');assert.equal(t.know[q.offer.tale].src,'tale');assert.equal(t.notes.werewolf,1);
});
test('the laboratory: one fact a sample (two with the lens), exact for the grown in clear autumn, conditions revealed',()=>{
 const s=game(41);s.stock.werewolf_fur=3;const rep=s.rep;
 let r=P.labTest(s,['werewolf.garlic']);assert.ok(r.ok);assert.equal(r.part,'werewolf_fur');assert.deepEqual(r.results[0],{f:'werewolf.garlic',from:'rumour',to:'refuted',rev:0,same:false});
 assert.equal(s.know['werewolf.garlic'].src,'lab');assert.equal(s.rep-rep,2);assert.equal(s.stock.werewolf_fur,2);assert.equal(s.daily.candles,1);
 // An exact record of an ordinary fact: «Опыт подтвердил запись», no reward.
 r=P.labTest(s,['werewolf.silver']);assert.ok(r.ok);assert.equal(r.results[0].same,true);assert.equal(s.rep-rep,2);
 // A conditional record is revealed even if it was confirmed: rev 1, +2.
 const k=game(42);know(k,'kikimora.yarn','rumour');const rp=k.rep;
 const id=L.MON.get('kikimora').loot.common;k.stock[id]=1;r=P.labTest(k,['kikimora.yarn'],id);assert.ok(r.ok,r.why);assert.deepEqual([k.know['kikimora.yarn'].st,k.know['kikimora.yarn'].rev],['confirmed',1]);assert.equal(k.rep-rp,4,'resolved and revealed');
 assert.match(P.labTest(k,['kikimora.yarn'],id).why||'',/проверено до конца|образ/);
 // Time, place and ritual are not tested in a flask; two facts need the lens.
 s.stock.werewolf_fur=3;assert.match(P.labTest(s,['werewolf.dawn']).why,/в колбе не проверить/);assert.match(P.labTest(s,['werewolf.garlic','werewolf.torch']).why,/с лупой/);
 s.upgrades.push('lens');know(s,'werewolf.torch','rumour');s.daily.candles=0;r=P.labTest(s,['werewolf.torch','werewolf.aconite']);assert.ok(r.ok);assert.equal(r.results.length,2);assert.equal(s.know['werewolf.torch'].st,'refuted');
 s.stock.werewolf_fur=0;s.stock.werewolf_fang=0;know(s,'werewolf.torch','rumour');assert.match(P.labTest(s,['werewolf.garlic']).why||'',/образец/,'no sample of a monster without its parts');
});
test('a trophy is studied once: a rumour or one unknown fact becomes exact; the archive checks time, place and ritual',()=>{
 const s=game(43);s.monsters.werewolf.troph.push('grown');
 let r=P.studyTrophy(s,'werewolf','grown',null);assert.ok(r.ok);assert.equal(r.result.same,false);assert.ok(R.LAB_CATS.includes(F(r.result.f).cat));assert.notEqual(s.know[r.result.f].st,'rumour');assert.equal(s.know[r.result.f].src,'trophy');
 assert.match(P.studyTrophy(s,'werewolf','grown',null).why,/уже изучен/);assert.match(P.studyTrophy(s,'werewolf','young',null).why,/нет/);
 s.monsters.werewolf.troph.push('young');r=P.studyTrophy(s,'werewolf','young','werewolf.garlic');assert.ok(r.ok);assert.equal(s.know['werewolf.garlic'].st,'refuted');
 // The archive: a rumour of time, place or ritual with field notes of this monster, two candles.
 const t=game(44);assert.match(P.crossCheck(t,'werewolf.dawn').why,/полевые записи о волколаке/);t.notes.werewolf=1;
 r=P.crossCheck(t,'werewolf.dawn');assert.ok(r.ok);assert.equal(t.know['werewolf.dawn'].st,'dangerous');assert.equal(t.know['werewolf.dawn'].src,'archive');assert.equal(t.notes.werewolf,0);assert.equal(t.daily.candles,2);
 assert.match(P.crossCheck(t,'werewolf.garlic').why,/на образце/);
});
test('rummaging in the chronicles: 40%, the third attempt in a row always finds; never for the sorcerer',()=>{
 for(let seed=1;seed<=20;seed++){const s=game(seed);s.upgrades.push('candle1','candle2');s.rep=600;let found=0,tries=0;
  for(let i=0;i<3&&!found;i++){const r=P.rummage(s,'werewolf');assert.ok(r.ok,r.why);tries++;if(r.found){found=1;assert.equal(s.know[r.found].st,'rumour');assert.equal(s.know[r.found].src,'rummage');}}
  assert.equal(found,1,`seed ${seed}: found within three tries`);assert.ok(tries<=3);assert.equal(s.monsters.werewolf.rummage,0);}
 const s=game(2);P.applyStory(s,L.STORY.get('S4'));assert.match(P.rummage(s,'koldun').why,/сюжет/);
});
test('the reputation of knowledge is paid once a fact; nothing ever rolls an exact record back',()=>{
 const s=game(45),f=F('werewolf.garlic');assert.equal(B.resolve(s,f,'refuted','lab'),true);const rep=s.rep;
 assert.equal(B.resolve(s,f,'confirmed','lab'),false);assert.equal(B.addRumour(s,f,'shop'),false);assert.equal(s.know[f.id].st,'refuted');assert.equal(s.rep,rep);
 B.addBook(s,'vilna_werewolves');assert.equal(s.rep,rep+4,'the dawn (a rumour) and the torch (unknown); the garlic was already exact');
 const n=F('werewolf.name');B.reveal(s,n,'lab');const r2=s.rep;assert.equal(B.reveal(s,n,'lab'),false);assert.equal(s.rep,r2);
 assert.equal(B.reveal(s,F('werewolf.silver'),'lab'),false,'only conditional facts have a condition to reveal');
});
test('S12 resolves and reveals the whole page of the sorcerer',()=>{
 const s=game(46);P.applyStory(s,L.STORY.get('S4'));s.story.koldun=s.day;const ev=P.storyStep(s);assert.equal(ev.id,'S12');
 for(const f of L.MON.get('koldun').facts){const k=s.know[f.id];assert.ok(k&&k.st!=='rumour',f.id);if(f.truth==='conditional')assert.equal(k.rev,1);}
 assert.ok(P.pageStats(s,'koldun').resolved===8);
});
