import test from 'node:test';
import assert from 'node:assert/strict';
import {P,L,R,B,roll,game,snap,place,clear,know,ctx,join} from './bestiary-helpers.mjs';
// Every fact of a page in its exact state, conditions revealed; trophies of two variants.
function fullPage(s,mid,troph=['young','grown']){for(const f of L.MON.get(mid).facts){if(f.truth==='conditional')know(s,f.id,'confirmed',1);else know(s,f.id,R.STATE_OF[R.outcome(f,B.LAB_CTX)]);}s.monsters[mid].troph=[...troph];}
const academy=s=>{if(!s.story.seen.includes('S1'))s.story.seen.push('S1');s.day=Math.ceil(s.day/3)*3;return s;};

test('the numbers of the tiers (GDD 5.1)',()=>{
 assert.deepEqual(R.FEE,[0,5,8,12,0]);assert.deepEqual(R.LOOT_N,[0,1,2,2,0]);assert.deepEqual(R.RUMOUR_PRICE,[0,5,7,9,11]);assert.deepEqual(R.TREATISE,[0,40,80,120,0]);
 for(const m of L.MONSTERS){const c=L.MAT.get(m.loot.common),r=L.MAT.get(m.loot.rare);assert.deepEqual([c.sell,r.sell],m.tier===4?[0,0]:[[4,12],[6,18],[9,27]][m.tier-1],m.id);
  if(m.tier<4)assert.ok(m.bounty>=[30,52,84][m.tier-1]&&m.bounty<=[46,66,110][m.tier-1],m.id);}
 assert.deepEqual([R.VMUL.young,R.VMUL.grown,R.VMUL.ancient],[.8,1,1.5]);assert.equal(R.coinsOffer(44,'grown',2),12,'GDD 5.2: 44 × 1 × 28% = 12');
 assert.equal(R.academyMax(),2390,'ACADEMY_MAX from the content');assert.equal(L.MATERIALS.filter(m=>m.buy).length,12);
});
test('a sheet for the Academy pays each record once, needs two new ones, never buys rumours (GDD 5.5)',()=>{
 const s=academy(game(51));s.monsters.werewolf.troph.push('grown');
 // Start: silver and wolfsbane confirmed (4 each), the crossroads refuted (2), a trophy (5); garlic and dawn are rumours.
 const offer=P.academyOffer(s,'werewolf');assert.equal(offer.coins,4+4+2+5);assert.equal(offer.n,4);assert.ok(!offer.keys.some(k=>k.startsWith('werewolf.garlic')));
 const gold=s.gold;let r=P.copyPage(s,'werewolf');assert.ok(r.ok);assert.deepEqual([r.coins,r.n,r.free],[15,4,false]);assert.equal(s.gold,gold+15);assert.equal(s.daily.candles,1);assert.equal(s.stats.pagesSold,1);assert.equal(s.stats.academy,15);
 let before=snap(s);r=P.copyPage(s,'werewolf');assert.equal(r.ok,false);assert.match(r.why,/уже есть/);assert.equal(snap(s),before);assert.equal(P.academyOffer(s,'werewolf').coins,0,'the second sheet of the same records is worth 0');
 // One new record is not enough; two are.
 know(s,'werewolf.garlic','refuted');assert.match(P.copyPage(s,'werewolf').why,/две новые/);know(s,'werewolf.dawn','dangerous');r=P.copyPage(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,2+3);
 // A revealed condition is a new record (6 × tier) even if the plain one was sold.
 know(s,'werewolf.name','confirmed');s.monsters.werewolf.troph.push('young');r=P.copyPage(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,4+5);
 know(s,'werewolf.name','confirmed',1);know(s,'werewolf.torch','refuted');s.daily.candles=0;r=P.copyPage(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,6+2);
 // Tier multiplies: a page of tier II pays double.
 P.applyStory(s,L.STORY.get('S3'));const t=P.academyOffer(s,'leshy');assert.equal(t.coins,4*2,'one confirmed record of tier II');
});
test('the Academy keeps its days: after S1, every third day, or every day with rank 3 or the dovecote; Федя copies the first sheet for free after S2',()=>{
 const s=game(52);s.day=3;assert.match(P.copyPage(s,'werewolf').why,/не знает/);s.story.seen.push('S1');s.day=4;assert.match(P.copyPage(s,'werewolf').why,/нет в Велене/);
 s.upgrades.push('dovecote');assert.equal(P.academyOpen(s),true);s.upgrades=[];s.rep=220;assert.equal(P.academyOpen(s),true);s.rep=0;s.day=6;assert.equal(P.academyOpen(s),true);
 s.story.seen.push('S2');s.daily.candles=R.candleMax(s);let r=P.copyPage(s,'werewolf');assert.ok(r.ok,r.why);assert.equal(r.free,true);assert.equal(s.daily.copied,true);
 r=P.copyPage(s,'upyr');assert.match(r.why,/Свечи догорели/,'the second sheet of the day needs a candle');
});
test('a treatise once a page, when the page is full: 40 × tier, +10 reputation, two notes, two candles (GDD 2.6, 5.5)',()=>{
 const s=game(53);fullPage(s,'werewolf',['grown']);assert.match(P.writeTreatise(s,'werewolf').why,/трофеи двух обликов/);
 s.monsters.werewolf.troph.push('young');know(s,'werewolf.name','confirmed',0);assert.match(P.writeTreatise(s,'werewolf').why,/Магистр сомневается/);know(s,'werewolf.name','confirmed',1);
 assert.match(P.writeTreatise(s,'werewolf').why,/две полевые записи/);s.notes.werewolf=2;
 delete s.know['werewolf.torch'];assert.match(P.writeTreatise(s,'werewolf').why,/разрешено 8 из 9/);know(s,'werewolf.torch','refuted');
 const gold=s.gold,rep=s.rep,before=snap(s);s.daily.candles=2;assert.match(P.writeTreatise(s,'werewolf').why,/две свечи/);s.daily.candles=0;
 const r=P.writeTreatise(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,40);assert.equal(s.gold,gold+40);assert.equal(s.rep,rep+10);assert.equal(s.notes.werewolf,0);assert.equal(s.daily.candles,2);assert.equal(s.monsters.werewolf.treatise,s.day);
 assert.match(P.writeTreatise(s,'werewolf').why,/уже написан/);assert.equal(P.treatises(s),1);
 P.applyStory(s,L.STORY.get('S4'));assert.match(P.writeTreatise(s,'koldun').why,/напишется сам/);
});
test('a leaflet for the printer: rank 2, three confirmed facts, once in ten days; the press pays half again and needs no candle',()=>{
 const s=game(54);know(s,'werewolf.moonrise','confirmed');assert.match(P.leaflet(s,'werewolf').why,/Знаток нечисти/);s.rep=90;
 let r=P.leaflet(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,6);assert.equal(s.daily.candles,1);assert.match(P.leaflet(s,'werewolf').why,/через 10 дней/);
 s.day+=9;assert.match(P.leaflet(s,'werewolf').why,/через 1 день/);s.day+=1;s.upgrades.push('press');const c=s.daily.candles;r=P.leaflet(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,9);assert.equal(s.daily.candles,c);
 assert.match(P.leaflet(s,'upyr').why,/три подтверждённых/);
 assert.deepEqual([3,4,5,6,9].map(n=>R.leafletValue(n,false)),[6,8,10,12,12]);assert.deepEqual([3,4,6,9].map(n=>R.leafletValue(n,true)),[9,12,18,18]);
});
test('brewing: one candle, two doses (three with the still), nine at most; «Докупить и сварить» buys only the herbs (GDD 5.7)',()=>{
 const s=game(55);let r=P.brew(s,'aconite_oil');assert.match(r.why,/Не хватает: волчий корень ×2, лампадное масло ×1/);
 const cost=P.brewCost(s,'aconite_oil');assert.equal(cost.coins,10);const gold=s.gold;r=P.brew(s,'aconite_oil',{buyMissing:true});assert.ok(r.ok);assert.deepEqual([r.made,r.coins],[2,10]);
 assert.equal(s.gold,gold-10);assert.equal(s.potions.aconite_oil,3);assert.equal(s.daily.candles,1);assert.equal(s.stock.herb_aconite||0,0);
 s.upgrades.push('still');s.stock.herb_thistle=2;s.stock.honey=1;r=P.brew(s,'thistle_brew');assert.ok(r.ok);assert.equal(r.made,3);assert.equal(s.potions.thistle_brew,4);assert.equal(r.coins,0);
 assert.match(P.brew(s,'courage').why,/Рецепта/);s.recipes.push('theriac');assert.match(P.brew(s,'theriac',{buyMissing:true}).why,/добывают охотники/);
 s.potions.thistle_brew=9;assert.match(P.brew(s,'thistle_brew',{buyMissing:true}).why,/Больше 9/);s.potions.thistle_brew=8;s.daily.candles=0;r=P.brew(s,'thistle_brew',{buyMissing:true});assert.equal(r.made,1,'up to nine doses');
 s.gold=3;const before=snap(s);s.potions.aconite_oil=0;const b2=snap(s);assert.match(P.brew(s,'aconite_oil',{buyMissing:true}).why,/монет/);assert.equal(snap(s),b2);assert.notEqual(before,b2);
});
test('the shop: herbs and silver for coins, parts and herbs sold back, one extra candle a day, never more than eight (GDD 1.2, 5.6)',()=>{
 const s=game(56);let r=P.buy(s,'silver_dust',2);assert.ok(r.ok);assert.equal(s.gold,40-24);assert.match(P.buy(s,'werewolf_fur').why,/не продают/);assert.match(P.buy(s,'silver_dust',2).why,/нужно 24/);
 r=P.sell(s,'silver_dust',1);assert.ok(r.ok);assert.equal(r.coins,6);s.stock.werewolf_fang=2;r=P.sell(s,'werewolf_fang',2);assert.equal(r.coins,24);assert.match(P.sell(s,'werewolf_fang',1).why,/нет/);
 s.stock.salt=3;assert.match(P.sell(s,'salt',1).why,/не продаётся/);
 const max=R.candleMax(s);r=P.buyCandle(s);assert.ok(r.ok);assert.equal(R.candleMax(s),max+1);assert.match(P.buyCandle(s).why,/одна в день/);P.endDay(s);assert.equal(R.candleMax(s),max,'the extra candle is for one day');
 s.rep=600;s.upgrades.push('candle1','candle2');assert.equal(R.candleMax(s),7);s.gold=50;assert.ok(P.buyCandle(s).ok);assert.equal(R.candleMax(s),8);
});
test('books: on the shelf by the tiers that are open, bought once, gifts never sold; the rumour sheets of Янек',()=>{
 const s=game(57);s.gold=200;assert.match(P.buyBook(s,'sukhov_notes').why,/нет на полке/);assert.match(P.buyBook(s,'agata_notebook').why,/дарят/);
 let r=P.buyBook(s,'vilna_werewolves');assert.ok(r.ok);assert.equal(s.gold,170);assert.ok(r.changed>0);assert.match(P.buyBook(s,'vilna_werewolves').why,/уже в библиотеке/);
 r=P.buyBook(s,'luzhki_herbal');assert.ok(r.ok);assert.ok(s.recipes.includes('courage')&&s.recipes.includes('wormwood_water'),'a book teaches its recipes');
 P.applyStory(s,L.STORY.get('S3'));assert.equal(R.shelfTier(s),2);assert.ok(P.buyBook(s,'sukhov_notes').ok);P.applyStory(s,L.STORY.get('S4'));assert.equal(R.shelfTier(s),2,'the page of the sorcerer does not move the shelf');
 // Two sealed rumour sheets a day about open pages with something unknown; the fact is drawn when one is bought.
 const t=game(58);P.endDay(t);assert.equal(t.trader.day,t.day);assert.equal(t.trader.rumours.length,2);assert.notEqual(t.trader.rumours[0].monster,t.trader.rumours[1].monster);
 const x=t.trader.rumours[0];assert.equal(x.price,R.RUMOUR_PRICE[L.MON.get(x.monster).tier]);const gold=t.gold;r=P.buyRumour(t,0);assert.ok(r.ok);assert.equal(t.gold,gold-x.price);assert.equal(t.know[r.fact].st,'rumour');assert.equal(t.know[r.fact].src,'shop');
 assert.ok(r.fact.startsWith(x.monster+'.'));assert.match(P.buyRumour(t,0).why,/уже куплен/);assert.match(P.buyRumour(t,5).why,/нет/);
});
test('furniture and gear: by rank and price, once; the gear counts in the cap of the bonuses (GDD 4.6, 5.8)',()=>{
 const s=game(59);s.gold=1000;assert.match(P.upgrade(s,'candle1').why,/Летописец/);s.rep=20;let r=P.upgrade(s,'candle1');assert.ok(r.ok);assert.equal(s.gold,920);assert.equal(R.candleMax(s),4);assert.match(P.upgrade(s,'candle1').why,/уже есть/);
 assert.match(P.upgrade(s,'lens').why,/Знаток/);assert.match(P.upgrade(s,'nope').why,/нет/);
 r=P.equip(s,'gordey','blade');assert.ok(r.ok);assert.equal(s.gold,770);assert.equal(R.skillBonus('gordey',s.hunters.gordey),10);assert.match(P.equip(s,'gordey','blade').why,/уже есть/);
 assert.ok(P.equip(s,'agata','spyglass').ok);assert.equal(R.perception('agata',s.hunters.agata),5,'never above five');assert.ok(P.equip(s,'gordey','cuirass').ok);
 s.gold=10;const before=snap(s);assert.match(P.equip(s,'agata','blade').why,/нужно 150/);assert.equal(snap(s),before);
});
test('decision D3: the decor of the scriptorium and the second edition are only to look at — no price, chance or income changes',()=>{
 const s=game(60);s.gold=5000;const keep=x=>JSON.stringify({candles:R.candleMax(x),pv:P.preview(x,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads']),offer:P.academyOffer(x,'werewolf'),cost:P.brewCost(x,'aconite_oil'),rank:R.rankOf(x.rep),rep:x.rep});
 const base=keep(s);for(const d of L.DECOR){const r=P.buyDecor(s,d.id);assert.ok(r.ok,d.id);}assert.equal(s.gold,5000-L.DECOR.reduce((n,d)=>n+d.price,0));assert.equal(keep(s),base);
 assert.match(P.buyDecor(s,'lamp').why,/уже стоит/);assert.match(P.buyDecor(s,'rug').why,/нет/);
 assert.match(P.buyEdition(s,'werewolf').why,/трактат ещё не написан/);s.monsters.werewolf.treatise=1;const g=s.gold,r=P.buyEdition(s,'werewolf');assert.ok(r.ok);assert.equal(r.coins,L.EDITION.price[1]);assert.equal(s.gold,g-90);
 assert.match(P.buyEdition(s,'werewolf').why,/уже на полке/);assert.equal(keep(s),base);
 // The bot buys them only from a purse far above everything useful: the decor never comes before the seal.
 const t=game(61);t.gold=100;const before=snap(t);assert.match(P.buyDecor(t,'lamp').why,/нужно 150/);assert.equal(snap(t),before);
});
test('the seal of «Великий бестиарий»: rank 5, fourteen treatises, 1200 coins, three candles → S13; the game goes on',()=>{
 const s=game(62);for(const id of['S1','S2','S3','S4','S5','S6'])P.applyStory(s,L.STORY.get(id));s.gold=1300;assert.match(P.printBestiary(s).why,/Составитель/);s.rep=600;
 for(const m of L.MONSTERS)s.monsters[m.id].treatise=1;delete s.monsters.koldun.treatise;s.monsters.koldun.treatise=0;assert.match(P.printBestiary(s).why,/готово 13/);s.monsters.koldun.treatise=1;
 s.daily.candles=R.candleMax(s)-2;assert.match(P.printBestiary(s).why,/три свечи/);s.daily.candles=0;const r=P.printBestiary(s);assert.ok(r.ok);assert.equal(r.story.id,'S13');assert.equal(s.printed,s.day);assert.equal(s.gold,100);
 assert.match(P.printBestiary(s).why,/уже напечатан/);P.endDay(s);assert.ok(s.contracts.length>0,'free play: cases keep coming');
});
