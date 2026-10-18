import test from 'node:test';
import assert from 'node:assert/strict';
import {P,L,R,B,roll,game,snap,place,clear,know,ctx,join} from './bestiary-helpers.mjs';
const LESSON=['werewolf.silver','werewolf.aconite','werewolf.crossroads'],OWNER=['werewolf.silver','werewolf.garlic','werewolf.dawn'];
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,`${msg||''} ${a} ≠ ${b}`);
// Moves a game on by whole days with nobody sent anywhere.
const pass=(s,n=1)=>{for(let i=0;i<n;i++)P.endDay(s);return s;};

test('a new bestiary: the keys of Даро, five pages, two hunters, three doses and one lesson at the table (GDD 5, 9.1)',()=>{
 const s=game(1);assert.deepEqual([s.day,s.gold,s.rep,R.candleMax(s),R.candlesLeft(s)],[1,40,0,3,3]);
 assert.deepEqual(Object.keys(s.monsters),L.START);assert.deepEqual(Object.keys(s.hunters),['gordey','agata']);assert.deepEqual(s.books,['daro_notes']);
 assert.deepEqual(s.potions,{aconite_oil:1,thistle_brew:1,thursday_salt:1});assert.deepEqual(s.recipes.sort(),['aconite_oil','thistle_brew','thursday_salt']);assert.deepEqual(s.story.seen,['S0']);
 assert.equal(s.contracts.length,1);const c=s.contracts[0];assert.deepEqual([c.id,c.kind,c.hunter,c.monster,c.variant,c.place,c.fee,c.bounty],['c-1','hunter','gordey','werewolf','grown','zarechye',5,44]);
 assert.deepEqual(s.visitors.map(v=>[v.kind,v.who,v.contract]),[['hunter','gordey','c-1']],'only Гордей waits on day 1');
 assert.ok(s.arcs.includes('gordey.1')&&s.arcs.includes('agata.1'),'the first words of the first hunters');
});
test('the owner’s example on day 1: silver, garlic, dawn — 16⅓%, the roll 0.40 loses, the ragged hunter tells of every advice',()=>{
 const s=game(2),c=s.contracts[0];const pv=P.preview(s,c.id,OWNER);close(P.truthChance(s,c.id,OWNER),16+1/3);assert.deepEqual([pv.low,pv.mid,pv.high],[0,41,100]);
 const gold=s.gold;assert.ok(P.advise(s,c.id,OWNER).ok);assert.equal(s.gold,gold+5,'the fee is paid when the sheet goes, whatever comes');
 const res=P.endDay(s),r=res.reports[0];assert.equal(r.win,false);assert.equal(r.day,2);assert.deepEqual(r.shown,{low:0,mid:41,high:100});
 assert.deepEqual(r.items.map(x=>[x.f,x.o,x.seen,x.from,x.to]),[['werewolf.silver','ok',true,'confirmed','confirmed'],['werewolf.garlic','none',true,'rumour','refuted'],['werewolf.dawn','worse',true,'rumour','dangerous']],'the lesson sees all three');
 // Wound: 1 + one harm + P < 34 = 3 days; ragged to the third step; trust −1 for what did not help.
 assert.deepEqual([r.injury,r.rag,r.trust],[3,3,-1]);assert.deepEqual([s.hunters.gordey.out,s.hunters.gordey.rag,s.hunters.gordey.trust],[3,3,1]);
 const t=P.reportText(s,r.id);assert.equal(t.title,'Отчёт · Гордей Лапин · день 2');assert.ok(L.HUNTER.get('gordey').lines.ragged.includes(t.greet));assert.ok(L.MON.get('werewolf').rout.includes(t.first));
 assert.equal(t.items[2].text,'Вышли на восходе, как в листе стояло. А после того как я встретился с ним утром, он стал ещё сильнее! На заре он не слабеет — бесится.');
 assert.deepEqual(t.items.map(x=>x.stamp),[L.STAMPS.ok,L.STAMPS.none,L.STAMPS.worse]);assert.equal(t.items[1].text,L.FACT.get('werewolf.garlic').lines.none);
 assert.match(t.after[0],/3 дня/,'the wound is told with its days');assert.equal(r.offer,null);
 assert.deepEqual(res.morning.returns,[{report:r.id,hunter:'gordey',town:null,win:false,injury:3,rag:3}]);
 // The seals of the bestiary changed by themselves.
 assert.equal(s.know['werewolf.garlic'].st,'refuted');assert.equal(s.know['werewolf.dawn'].st,'dangerous');assert.ok(P.freshInk(s,'werewolf').includes('werewolf.dawn'));
});
test('the lesson with two confirmed cards wins whatever the third: 74⅔% with the crossroads, 49⅔% even with the dawn',()=>{
 const a=game(3);assert.ok(P.advise(a,'c-1',LESSON).ok);close(P.truthChance(a,a.hunts[0].contract,LESSON),74+2/3);const r=P.endDay(a).reports[0];
 assert.equal(r.win,true);assert.deepEqual([r.rag,r.trust],[0,1]);assert.ok(r.offer);assert.equal(r.trophy,'grown');assert.equal(a.hunters.gordey.trust,3);
 const b=game(3),third=['werewolf.silver','werewolf.aconite','werewolf.dawn'];close(P.truthChance(b,'c-1',third),49+2/3);assert.ok(P.advise(b,'c-1',third).ok);const q=P.endDay(b).reports[0];
 assert.equal(q.win,true);assert.equal(q.rag,1,'a win with harm: the hunter comes back battered');assert.equal(q.trust,0);assert.equal(b.know['werewolf.dawn'].st,'dangerous');
 assert.match(P.reportText(b,q.id).items[2].text,/он стал ещё сильнее!/);
 // With the wolfsbane oil the lesson is 84⅔%.
 const c=game(3);close(P.truthChance(c,'c-1',LESSON,['aconite_oil']),84+2/3);assert.ok(P.advise(c,'c-1',LESSON,['aconite_oil']).ok);assert.equal(c.potions.aconite_oil,0,'the potion is spent');
});
test('a win offers coins, loot or knowledge; the trophy, the fee and the gift of trust come on top (GDD 5.2)',()=>{
 const s=game(4);assert.ok(P.advise(s,'c-1',LESSON).ok);const r=P.endDay(s).reports[0],rep=s.rep;
 // Trust 3 after the win: 44 × 1 × 32% = 14; one part of tier I; a tale and one field note.
 assert.equal(r.offer.coins,R.coinsOffer(44,'grown',3));assert.equal(r.offer.coins,14);assert.equal(r.offer.loot.reduce((n,x)=>n+x.n,0),1);assert.equal(r.offer.notes,1);
 const gold=s.gold;assert.ok(P.claim(s,r.id,'coins').ok);assert.equal(s.gold,gold+14);assert.match(P.claim(s,r.id,'loot').why,/уже выбрана/);
 const text=P.reportText(s,r.id);assert.ok(text.after.some(t=>t.includes('14 монет')));assert.ok(text.after.some(t=>t.includes(L.MON.get('werewolf').trophy.name)));assert.equal(text.offer,null);
 assert.ok(s.monsters.werewolf.troph.includes('grown'));assert.equal(s.rep,rep);
 // Loot puts the parts in stock; an unchosen reward becomes coins at the next night.
 const t=game(4);assert.ok(P.advise(t,'c-1',LESSON).ok);const q=P.endDay(t).reports[0];const loot=q.offer.loot[0];assert.ok(P.claim(t,q.id,'loot').ok);assert.equal(t.stock[loot.id],loot.n);
 const u=game(4);assert.ok(P.advise(u,'c-1',LESSON).ok);const w=P.endDay(u).reports[0],g=u.gold;P.endDay(u);assert.equal(w.choice,'coins');assert.equal(u.gold,g+w.offer.coins);assert.equal(w.read,true);
 assert.match(P.claim(u,w.id,'know').why,/уже выбрана/);assert.match(P.claim(u,'r-999','coins').why,/не найден/);
});
test('rewards of a win: the first victory over a monster +5, every new variant +2, a gift at trust 4 (GDD 4.5, 5.3, 6.1)',()=>{
 const s=game(5);clear(s);s.hunters.agata.trust=3;const c=place(s,{monster:'kikimora',hunter:'agata',win:true,at:66}),sheet=['kikimora.henstone','kikimora.silence','kikimora.salt'],rep=s.rep;
 assert.ok(P.advise(s,c.id,sheet).ok);const r=P.endDay(s).reports[0];assert.equal(r.win,true);
 const resolved=r.items.filter(x=>x.seen&&x.from!==x.to).length;assert.equal(s.rep-rep,1+5+2+2*resolved,'win, first victory, new trophy');
 assert.equal(s.hunters.agata.trust,4);assert.ok(r.gift,'trust 4 after the win: a gift');assert.ok(r.gift.id==='notes'?s.notes.kikimora===1:s.stock[r.gift.id]===1);
 // A second win over the same variant brings no trophy.
 clear(s);const d=place(s,{monster:'kikimora',hunter:'agata',win:true,at:66}),rep2=s.rep;assert.ok(P.advise(s,d.id,sheet).ok);const q=P.endDay(s).reports[0];assert.equal(q.trophy,null);assert.equal(s.rep-rep2,1);
});
test('wounds keep a hunter away N days counting the day of the report; the doctor shortens them (GDD 4.4)',()=>{
 const s=game(6);clear(s);P.endDay(s);clear(s);
 // Агата against a grown kikimora with one harmful card and a loss: 1 + 1 harm = 2 days (P ≥ 34).
 know(s,'kikimora.dusk','rumour');const c=place(s,{monster:'kikimora',hunter:'agata',win:false,at:41.7}),sheet=['kikimora.henstone','kikimora.silence','kikimora.dusk'];
 assert.ok(P.advise(s,c.id,sheet).ok);const r=P.endDay(s).reports[0];assert.equal(r.win,false);assert.equal(r.injury,2);assert.equal(r.rag,2);
 const day=s.day;assert.equal(s.hunters.agata.out,2);assert.equal(P.free(s,'agata'),false,'the day of the report is the first day of the wound');
 assert.ok(!s.contracts.some(c=>c.hunter==='agata'));P.endDay(s);assert.equal(s.hunters.agata.out,1);assert.equal(P.free(s,'agata'),false);
 P.endDay(s);assert.equal(s.day,day+2);assert.equal(s.hunters.agata.out,0);assert.equal(s.hunters.agata.rag,0);assert.equal(P.free(s,'agata'),true,'two days of wound, back on the third');
 // The doctor: 8 coins a day, +1 trust once a wound.
 const t=game(7);t.hunters.gordey.out=3;t.hunters.gordey.rag=3;t.hunters.gordey.doc=0;t.gold=30;const trust=t.hunters.gordey.trust;
 let h=P.heal(t,'gordey');assert.deepEqual([h.ok,h.out,h.trust],[true,2,1]);assert.equal(t.gold,22);h=P.heal(t,'gordey');assert.equal(h.trust,0);assert.equal(t.hunters.gordey.trust,trust+1);
 h=P.heal(t,'gordey');assert.equal(h.out,0);assert.equal(t.hunters.gordey.rag,0,'healed: whole again');assert.match(P.heal(t,'gordey').why,/здоров/);
 t.hunters.gordey.out=1;t.gold=7;const before=snap(t);assert.match(P.heal(t,'gordey').why,/8 монет/);assert.equal(snap(t),before);
});
test('a hunter whose trust falls to zero sulks five days and comes back with trust 1; nobody is ever lost (GDD 4.5, D8)',()=>{
 const s=game(8);clear(s);P.endDay(s);clear(s);s.hunters.agata.trust=1;
 const c=place(s,{monster:'kikimora',hunter:'agata',win:false,at:100/3}),sheet=['kikimora.henstone','kikimora.salt','kikimora.dusk'];know(s,'kikimora.dusk','rumour');
 assert.ok(P.advise(s,c.id,sheet).ok);const r=P.endDay(s).reports[0];assert.equal(r.win,false);assert.equal(r.trust,-1);assert.equal(r.sulk,5);
 assert.deepEqual([s.hunters.agata.trust,s.hunters.agata.sulk],[0,5]);assert.ok(P.morning(s).sulking.some(x=>x.hunter==='agata'));
 let back=null;for(let i=0;i<5;i++){const res=P.endDay(s);if(res.morning.forgiven.includes('agata'))back=s.day;}
 assert.ok(back);assert.deepEqual([s.hunters.agata.sulk,s.hunters.agata.trust],[0,1]);assert.equal(P.free(s,'agata')||s.hunters.agata.out>0,true);assert.ok(s.hunters.agata,'still in the guild');
});
test('a failure where everything noticed helped is «не твоя вина»: trust stays; with the balm only harm costs trust',()=>{
 const s=game(9);clear(s);P.endDay(s);clear(s);
 // Two confirmed cards and a rumour Гордей does not notice; a loss. Trust stays.
 know(s,'werewolf.name','rumour');let n=s.nextId;const p=R.observeChance(1,false);while(!(roll(s.worldSeed,'obs','c-'+n,'werewolf.name')>=p&&100*roll(s.worldSeed,'hunt','c-'+n)>=74.67))n++;
 const c=place(s,{monster:'werewolf',id:n}),trust=s.hunters.gordey.trust;assert.ok(P.advise(s,c.id,['werewolf.silver','werewolf.aconite','werewolf.name']).ok);const r=P.endDay(s).reports[0];
 assert.equal(r.win,false);assert.equal(r.items.every(x=>!x.seen||x.o==='ok'),true);assert.equal(r.trust,0);assert.equal(s.hunters.gordey.trust,trust);
 // The balm: a wound two days shorter (not under 1), ragged a step lighter; a useless card costs no trust.
 const t=game(10);clear(t);P.endDay(t);clear(t);t.potions.life_balm=1;know(t,'kikimora.dusk','rumour');
 const d=place(t,{monster:'kikimora',hunter:'agata',win:false,at:41.7}),tr=t.hunters.agata.trust;assert.ok(P.advise(t,d.id,['kikimora.henstone','kikimora.silence','kikimora.dusk'],['life_balm']).ok);const q=P.endDay(t).reports[0];
 assert.equal(q.win,false);assert.equal(q.injury,1,'2 − 2, at least 1');assert.equal(q.rag,1);assert.equal(q.trust,-1,'the dusk harmed: trust still falls');assert.equal(t.hunters.agata.trust,tr-1);
});
test('a deferred case comes back first tomorrow with the same monster, variant and place, under tomorrow’s sky — once (GDD 1.3)',()=>{
 let s;for(let seed=1;seed<99;seed++){s=game(seed);P.endDay(s);if(s.contracts.some(c=>c.kind==='hunter'))break;}
 const c=s.contracts.find(c=>c.kind==='hunter'),copy={monster:c.monster,variant:c.variant,place:c.place,hunter:c.hunter,id:c.id};
 assert.ok(P.defer(s,c.id).ok);assert.match(P.defer(s,c.id).why,/уже откладывали/);
 const others=s.contracts.filter(x=>x.id!==c.id).map(x=>x.id);P.endDay(s);
 const d=s.contracts[0];assert.deepEqual({monster:d.monster,variant:d.variant,place:d.place,hunter:d.hunter,id:d.id},copy,'the same case, first on the table');
 assert.equal(d.deferred,1);assert.deepEqual(P.cases(s)[0].ctx.weather,P.weatherOf(s));for(const id of others)assert.ok(!s.contracts.some(x=>x.id===id),'cases without a sheet close at night');
 assert.equal(s.visitors[0].contract,d.id);assert.match(P.defer(s,d.id).why,/второй раз нельзя/);
 // Hunters a day: the deferred case is counted in.
 assert.ok(s.contracts.filter(x=>x.kind==='hunter').length<=R.GUESTS[R.rankOf(s.rep)]);
 // Declining is free and the hunter leaves the queue.
 const e=s.contracts.find(x=>x.kind==='hunter');assert.ok(P.decline(s,e.id).ok);assert.ok(!s.contracts.includes(e));
});
test('hunters a day: two up to rank 1, three from rank 2, one fewer on a quiet day; a hunter takes one case a day',()=>{
 for(let seed=1;seed<=40;seed++){const s=game(seed);s.rep=90;for(const h of L.HUNTERS)if(!s.hunters[h.id]&&h.joins.day)join(s,h.id);P.endDay(s);const d=s.day,quiet=roll(s.worldSeed,'day',d,'quiet')<R.QUIET;
  const n=s.contracts.filter(c=>c.kind==='hunter').length;assert.equal(n,Math.max(1,3-(quiet?1:0)),`seed ${seed}`);
  const who=s.contracts.filter(c=>c.kind==='hunter').map(c=>c.hunter);assert.equal(new Set(who).size,who.length);
  for(const c of s.contracts.filter(c=>c.kind==='hunter')){const m=L.MON.get(c.monster);assert.ok(m.tier<=R.maxTier(c.hunter,s.hunters[c.hunter]));assert.ok(m.tier<4);assert.ok(s.monsters[m.id].u<d);assert.equal(c.fee,R.FEE[m.tier]);assert.ok(['young','grown'].includes(c.variant),'no ancient before rank 3');}}
 const s=game(11);P.endDay(s);const n=s.contracts.filter(c=>c.kind==='hunter').length,q=roll(s.worldSeed,'day',2,'quiet')<R.QUIET;assert.equal(n,q?1:2);
});
test('ancient variants appear from rank 3 against monsters already beaten (GDD 1.3)',()=>{
 let ancient=0,total=0;for(let seed=1;seed<=60;seed++){const s=game(seed);s.rep=220;for(const id of L.START)s.monsters[id].troph.push('grown');for(const h of L.HUNTERS)if(h.joins.day)join(s,h.id);
  P.endDay(s);for(const c of s.contracts.filter(c=>c.kind==='hunter')){total++;if(c.variant==='ancient')ancient++;}}
 assert.ok(ancient/total>.1&&ancient/total<.3,`${ancient}/${total}`);
});
test('townsfolk from rank 1: half bring a case of their own, half a free rumour; the petitioner sees at 2 and pays 12 × tier',()=>{
 let cases=0,rumours=0;
 for(let seed=1;seed<=120;seed++){const s=game(seed);s.rep=20;P.endDay(s);const d=s.day,came=roll(s.worldSeed,'town',d)<R.TOWN.chance,kind=roll(s.worldSeed,'town',d,'kind')<R.TOWN.share;
  const c=s.contracts.find(c=>c.kind==='town'),v=s.visitors.find(v=>v.kind==='town');
  if(!came){assert.ok(!c&&!v);continue;}
  if(kind){assert.ok(c,`seed ${seed}`);cases++;assert.equal(c.fee,3);assert.equal(c.hunter,null);assert.ok(L.TOWN_TYPE.has(c.town));assert.ok(L.MON.get(c.monster).tier<=2);assert.equal(v.contract,c.id);}
  else{assert.ok(v&&v.rumour&&!c);rumours++;const r=P.listen(s,v.id);assert.equal(s.know[r.fact].src,'town');}}
 assert.ok(cases>5&&rumours>5,`${cases} cases, ${rumours} rumours`);
 // A town case: no wounds, no trust, no choice of reward; a win pays 12 × tier and gives a trophy.
 const s=game(12);s.rep=20;clear(s);const c=place(s,{kind:'town',town:'widow',monster:'zlyden',variant:'young',win:true,at:71.67}),gold=s.gold;
 const sheet=['zlyden.thistle','zlyden.stove','zlyden.night_watch'];close(P.truthChance(s,c.id,sheet),200/3+5,'a townsperson has no skill; the young +5');
 assert.ok(P.advise(s,c.id,sheet).ok);assert.equal(s.gold,gold+3);const r=P.endDay(s).reports[0];assert.equal(r.win,true);assert.equal(r.offer,null);assert.equal(r.paid,12);assert.equal(s.gold,gold+3+12);
 assert.equal(r.trophy,'young');assert.equal(r.see,R.observeChance(2,true));assert.deepEqual([r.injury,r.trust],[0,0]);assert.equal(P.reportText(s,r.id).name,L.TOWN_TYPE.get('widow').label);
 // The owner example of the townsperson: the offering harms the young злыдень, 46⅔%.
 know(s,'zlyden.offering','confirmed',1);clear(s);const d=place(s,{kind:'town',monster:'zlyden',variant:'young'});
 close(P.truthChance(s,d.id,['zlyden.thistle','zlyden.stove','zlyden.offering']),46+2/3);assert.match(P.advise(s,d.id,['zlyden.thistle','zlyden.stove','zlyden.offering']).why,/сейчас опасно/);
});
test('guests come on their days: Ведана on even days, Янек on odd days from the 3rd, о. Никодим every 7th, the Magister every 3rd after S1',()=>{
 const s=game(13);const seen={};for(let d=2;d<=21;d++){P.endDay(s);for(const v of s.visitors)if(v.kind!=='hunter'&&v.kind!=='town')(seen[v.kind]||(seen[v.kind]=[])).push(s.day);}
 assert.deepEqual(seen.vedana,[2,4,6,8,10,12,14,16,18,20]);assert.deepEqual(seen.yanek,[3,5,7,9,11,13,15,17,19,21]);assert.deepEqual(seen.nikodim,[7,14,21]);assert.deepEqual(seen.daro,[2,3,4]);
 assert.ok((seen.otto||[]).every(d=>d%3===0&&d>=s.story.days.S1));
 // A guest heard: talks +1 and the rumour is written; heard twice — nothing more.
 const t=game(14);P.endDay(t);const v=t.visitors.find(v=>v.kind==='vedana');assert.ok(v);const r=P.listen(t,v.id);assert.equal(t.daily.talks,1);if(v.rumour){assert.ok(r.fact);assert.equal(t.know[r.fact].src,'vedana');assert.ok(L.monsterOf(r.fact).tags.some(x=>['spirit','water','field'].includes(x)));}
 const again=P.listen(t,v.id);assert.equal(again.again,true);assert.equal(t.daily.talks,1);assert.match(P.listen(t,'v-999').why,/ушёл/);
});
test('decision D5: a guest who was not heard leaves the rumour as a note on the table for the morning',()=>{
 let s,v;for(let seed=1;seed<=50&&!v;seed++){s=game(seed);P.endDay(s);v=s.visitors.find(v=>v.kind==='vedana'&&v.rumour);}
 assert.ok(v);const fact=v.rumour;assert.equal(s.know[fact],undefined);const res=P.endDay(s);
 assert.equal(s.know[fact].st,'rumour');assert.equal(s.know[fact].src,'vedana');
 const n=res.morning.notes.find(n=>n.fact===fact);assert.ok(n);assert.equal(n.kind,'vedana');
 const m=L.monsterOf(fact);assert.equal(n.text,`Ведана не дождалась и оставила на столе записку ${m.about}: «${L.FACT.get(fact).advice}»`);
 // A heard guest leaves no note; a rumour already known by then is replaced by another unknown of the same monster.
 const t=game(15);P.endDay(t);for(const x of t.visitors)P.listen(t,x.id);assert.deepEqual(P.endDay(t).morning.notes,[]);
});
test('the order of the night (GDD 1.4): counters first, then the hunts, then the closing cases, the new day and its guests',()=>{
 const s=game(16);s.hunters.agata.out=1;s.hunters.agata.rag=2;s.hunters.gordey.sulk=1;s.hunters.gordey.trust=0;
 assert.ok(P.advise(s,'c-1',LESSON).ok===false,'a sulking hunter cannot go');
 const res=P.endDay(s);assert.deepEqual(res.morning.back,['agata']);assert.deepEqual(res.morning.forgiven,['gordey']);assert.equal(s.hunters.gordey.trust,1);assert.equal(s.hunters.agata.rag,0);
 assert.equal(s.day,2);assert.deepEqual(s.daily,{candles:0,extra:false,talks:0,income:0,spent:0,rep:0,copied:false,firsts:s.daily.firsts});assert.equal(s.trader.day,2);
 assert.deepEqual(Object.keys(res).sort(),['arcs','morning','rank','reports','story']);assert.equal(res.morning.day,2);assert.equal(res.morning.weather,P.weatherOf(s));
 // The story event of this morning came before the cases: S1 needs a win, so on day 2 there was none.
 assert.equal(res.story,null);
});
test('a personal case waits for its own hunter without a deadline and stays after a loss (GDD 1.3, 7.3)',()=>{
 const s=game(17);for(let i=0;i<3;i++)P.endDay(s);join(s,'marta');s.monsters.werewolf.wins=1;for(const f of L.MON.get('werewolf').facts.slice(0,6))if(!s.know[f.id])know(s,f.id,'rumour');
 const arcs=P.arcStep(s);assert.ok(arcs.some(a=>a.id==='marta.2'));assert.deepEqual(s.personal.marta,{monster:'werewolf',variant:'ancient',since:s.day,state:'open',tries:0});
 B.makeDay(s);const c=s.contracts.find(c=>c.kind==='personal');assert.ok(c);assert.deepEqual([c.hunter,c.monster,c.variant],['marta','werewolf','ancient']);
 assert.match(P.decline(s,c.id).why,/без срока/);assert.match(P.defer(s,c.id).why,/без срока/);assert.ok(!s.visitors.some(v=>v.contract===c.id),'a standing card, not a guest in the queue');
 // A loss: the card stays for tomorrow, the repeat line speaks.
 clear(s);const d=place(s,{kind:'personal',hunter:'marta',monster:'werewolf',variant:'ancient',win:false,at:56.67});
 assert.ok(P.advise(s,d.id,['werewolf.silver','werewolf.aconite','werewolf.crossroads']).ok);const res=P.endDay(s);assert.equal(res.reports[0].win,false);assert.equal(s.personal.marta.state,'open');assert.equal(s.personal.marta.tries,1);
 assert.ok(res.arcs.some(a=>a.id==='marta.3b'),'the repeat line after a lost personal hunt');assert.ok(!s.arcs.includes('marta.3b'));
 while(s.hunters.marta.out)P.endDay(s);assert.ok(s.contracts.some(c=>c.kind==='personal'&&c.hunter==='marta'),'the card is back when Марта is well');
 // A win closes it and fires the next step of the arc.
 clear(s);const e=place(s,{kind:'personal',hunter:'marta',monster:'werewolf',variant:'ancient',win:true,at:56.67});assert.ok(P.advise(s,e.id,['werewolf.silver','werewolf.aconite','werewolf.crossroads']).ok);
 const won=P.endDay(s);assert.equal(won.reports[0].win,true);assert.equal(s.personal.marta.state,'won');assert.ok(won.arcs.some(a=>a.id==='marta.3'));assert.equal(s.hunters.marta.trust,5);
 assert.ok(!s.contracts.some(c=>c.kind==='personal'&&c.hunter==='marta'));
});
test('the case of the sorcerer: a standing card after S10, the keeper picks the hunter, fee 0; a loss leaves it, a win brings S12',()=>{
 const s=game(18);for(const id of['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'])P.applyStory(s,L.STORY.get(id));P.joinHunters(s);B.makeDay(s);
 const c=s.contracts.find(c=>c.kind==='story');assert.ok(c);assert.deepEqual([c.monster,c.variant,c.place,c.fee,c.hunter],['koldun','grown','black_barrow',0,null]);
 const sheet=['koldun.aspen','koldun.facedown','koldun.holy_water'];assert.match(P.advise(s,c.id,sheet).why,/выбери охотника/);assert.match(P.decline(s,c.id).why,/без срока/);
 assert.match(P.assign(s,c.id,'nobody').why,/нет/);assert.ok(P.assign(s,c.id,'erofey').ok);assert.equal(c.hunter,'erofey');
 // A loss: the card is back tomorrow, the report has the text of S11.
 clear(s);const d=place(s,{kind:'story',hunter:'erofey',monster:'koldun',variant:'grown',win:false,at:200/3+6});
 assert.ok(P.advise(s,d.id,sheet).ok);let res=P.endDay(s);const r=res.reports[0];assert.equal(r.win,false);assert.equal(r.offer,null);
 assert.ok(L.STORY.get('S11').text.lose.includes(P.reportText(s,r.id).greet));assert.equal(P.reportText(s,r.id).first,'');assert.ok(s.contracts.some(c=>c.kind==='story'));assert.ok(s.story.seen.includes('S11'));
 // A win: the next morning is the thaw.
 clear(s);const e=place(s,{kind:'story',hunter:'gordey',monster:'koldun',variant:'grown',win:true,at:200/3+8});assert.ok(P.free(s,'gordey'));
 const gold=s.gold;assert.ok(P.advise(s,e.id,sheet).ok);res=P.endDay(s);assert.equal(res.reports[0].win,true);assert.equal(res.story.id,'S12');assert.equal(s.story.koldun,s.day-1);
 assert.equal(s.story.hold,false);assert.equal(s.story.thaw,3);assert.equal(s.gold,gold+300);assert.ok(s.monsters.koldun.treatise);assert.ok(!s.contracts.some(c=>c.kind==='story'));
 assert.ok(res.arcs.some(a=>a.id==='gordey.end'),'the epilogues of the hunters');
});
test('the morning card: weather and season, who came back, who heals and sulks, new books, the Magister (GDD 10.9)',()=>{
 const s=game(19);assert.ok(P.advise(s,'c-1',OWNER).ok);const m=P.endDay(s).morning;
 assert.deepEqual([m.day,m.season,m.hold],[2,0,false]);assert.ok(m.weather in{clear:1,rain:1,fog:1,snow:1});assert.equal(m.returns.length,1);assert.deepEqual(m.healing,[{hunter:'gordey',days:3}]);
 assert.ok(L.LINES.morning.returns.includes(m.line));const q=P.endDay(s).morning;assert.ok(L.LINES.morning.none.includes(q.line));
});
// Review of G1: the words of a report must never contradict its seals.
test('a hunter says «три из трёх» (lines.full) only when all three pieces of advice helped',()=>{
 let full=0;const FULL=['werewolf.silver','werewolf.aconite','werewolf.moonrise'];
 for(let seed=1;seed<=24;seed++)for(const sheet of[LESSON,FULL]){const s=game(seed);clear(s);P.endDay(s);clear(s);know(s,'werewolf.moonrise','confirmed');
  const hunter=seed%2?'gordey':'agata',h=L.HUNTER.get(hunter),c=place(s,{monster:'werewolf',hunter,win:true,at:60});assert.ok(P.advise(s,c.id,sheet).ok);
  const r=P.endDay(s).reports[0];assert.equal(r.win,true);const greet=P.reportText(s,r.id).greet,said=list=>list.some(t=>L.say(t,{},hunter)===greet);
  if(sheet===FULL&&r.items.every(x=>x.seen)){assert.ok(said([...h.lines.thanks,...h.lines.full]),greet);if(said(h.lines.full))full++;}
  else assert.ok(said(h.lines.thanks),`${hunter}: «${greet}» after a win where not all three were seen to help`);}
 assert.ok(full>0,'the lines of a full win are heard');
 for(const h of L.HUNTERS){assert.ok(h.lines.thanks.length>0,h.id);for(const t of h.lines.full||[])assert.ok(!h.lines.thanks.includes(t),t);}
});
test('the tale of a keen eye is told as it was seen: a helping, an empty and a harmful tale each match the new seal',()=>{
 for(const [left,o,key] of[['werewolf.moonrise','ok','factSure'],['werewolf.torch','none','factNone'],['werewolf.dawn','worse','factWorse']]){
  const s=game(44);clear(s);P.endDay(s);clear(s);for(const f of L.MON.get('werewolf').facts)if(!s.know[f.id])know(s,f.id,'rumour');delete s.know[left];
  const c=place(s,{monster:'werewolf',hunter:'agata',win:true,at:60});assert.ok(P.advise(s,c.id,LESSON).ok);const r=P.endDay(s).reports[0];
  assert.deepEqual([r.win,r.offer.tale,r.offer.sure],[true,left,true]);assert.ok(P.claim(s,r.id,'know').ok);assert.equal(s.know[left].st,R.STATE_OF[o]);
  assert.equal(P.reportText(s,r.id).after[0],L.say(L.LINES.reward[key][0],L.words({fact:left}),'agata'),`${left}: the line follows «${o}»`);}
});
