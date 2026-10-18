import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/rules.js';
import {P,L,game,place,clear,know,ctx} from './bestiary-helpers.mjs';
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,`${msg||''} ${a} ≠ ${b}`);
const F=id=>L.FACT.get(id);

test('what a fact does: true helps, a myth is useless, harm hurts, a condition depends on the case',()=>{
 assert.equal(R.outcome(F('werewolf.silver'),ctx()),'ok');assert.equal(R.outcome(F('werewolf.garlic'),ctx()),'none');assert.equal(R.outcome(F('werewolf.dawn'),ctx()),'worse');
 const name=F('werewolf.name');assert.equal(R.outcome(name,ctx('young')),'ok');assert.equal(R.outcome(name,ctx('grown')),'none');assert.equal(R.outcome(name,ctx('ancient')),'none');
 const offering=F('zlyden.offering');assert.equal(offering.otherwise,'harmful');assert.notEqual(R.outcome(offering,ctx('grown')),'none');
 const fog=F('basilisk.fog');assert.equal(R.outcome(fog,ctx('grown','fog')),'ok');assert.equal(R.outcome(fog,ctx('grown','clear')),fog.otherwise==='harmful'?'worse':'none');
 const frost=F('kikimora.frost');assert.equal(R.outcome(frost,ctx('grown','snow',1)),'ok');assert.equal(R.outcome(frost,ctx('grown','clear',0)),'worse');
});
test('the owner rule: each correct piece of advice is a third, three correct is a sure win (GDD 3.1)',()=>{
 close(R.chance(0,0),0);close(R.chance(1,0),100/3);close(R.chance(2,0),200/3);assert.equal(R.chance(3,0),100);
 for(const v of['young','grown','ancient'])for(const skill of[0,8,14])for(const potion of[0,20])assert.equal(R.chance(3,0,{skill,potion,vmod:R.VMOD[v]}),100,'K = 3 is exactly 100 whatever the variant and bonuses');
 // Without the third correct piece the chance never passes 91⅔, and it is always within [0, 95].
 let top=0;for(let K=0;K<3;K++)for(let H=0;H<=3-K;H++)for(const skill of[0,4,8,14,30])for(const potion of[0,10,20,40])for(const vmod of[5,0,-10])for(const forgive of[0,1]){const p=R.chance(K,H,{skill,potion,vmod,forgive});assert.ok(p>=0&&p<=95);top=Math.max(top,p);}
 close(top,200/3+25,'91⅔ at most');
 close(R.chance(2,1),200/3-25,'two correct and one harmful: 41⅔');
 // Bonuses: potions at most 20, all bonuses that are not knowledge at most 25; the ancient −10 always counts.
 close(R.chance(2,0,{potion:35}),200/3+20);close(R.chance(2,0,{skill:14,potion:20}),200/3+25);close(R.chance(2,0,{skill:14,potion:20,vmod:-10}),200/3+15);close(R.chance(1,0,{vmod:5}),100/3+5);
 // The thorn tincture forgives one harmful piece of advice.
 close(R.chance(2,1,{forgive:1}),200/3);close(R.chance(1,2,{forgive:1}),100/3-25);
});
test('every example of GDD 3.7',()=>{
 const gordey={xp:0,skill:0,gear:[]},b=(id,h,variant,pots=[])=>R.bonuses(id,h,'werewolf',variant,pots);
 assert.equal(R.skillBonus('gordey',gordey),8);
 close(R.chance(2,0,b('gordey',gordey,'grown')),74+2/3,'the lesson: silver, wolfsbane, crossroads');close(R.chance(2,0,b('gordey',gordey,'grown',['aconite_oil'])),84+2/3,'with the wolfsbane oil');
 close(R.chance(1,1,b('gordey',gordey,'grown')),16+1/3,'the owner example: silver, garlic, dawn');
 close(R.chance(2,1,b('gordey',gordey,'grown')),49+2/3,'silver, wolfsbane, dawn');
 const marta={xp:10,skill:0,gear:[]};assert.equal(R.level(marta.xp),2);assert.equal(R.skillBonus('marta',marta),9);
 close(R.chance(2,0,b('marta',marta,'ancient',['dawn_tincture','courage'])),81+2/3,'the grey werewolf with Marta');
 assert.equal(R.chance(3,0,b('marta',marta,'ancient',['dawn_tincture','courage'])),100);
 close(R.chance(2,1,R.bonuses(null,null,'zlyden','young',[])),46+2/3,'a townsperson, the young zlyden');
});
test('the estimate counts rumours as useless (mid), helping (high) and harmful (low)',()=>{
 const e=R.estimate(['ok',null,null],{skill:8});close(e.mid,100/3+8);assert.equal(e.high,100);close(e.low,0);assert.equal(e.k,1);assert.equal(e.r,2);
 const sure=R.estimate(['ok','ok','none'],{skill:8});close(sure.low,sure.mid);close(sure.high,sure.mid);
 assert.equal(R.estimate(['ok','ok','ok'],{}).mid,100);assert.deepEqual([100,66,34,33].map(R.estimateLine),['sure','good','risky','grim']);
 assert.equal(R.believed(null,F('werewolf.silver'),ctx()),undefined);assert.equal(R.believed({st:'rumour',rev:0},F('werewolf.garlic'),ctx()),null);
 assert.equal(R.believed({st:'confirmed',rev:0},F('werewolf.name'),ctx('grown')),'ok','unrevealed: the player believes the seal');assert.equal(R.believed({st:'confirmed',rev:1},F('werewolf.name'),ctx('grown')),'none','revealed: the exact outcome');
});
test('the sheet: exactly three different cards of this monster, one a category, never a dangerous one (GDD 3.2)',()=>{
 const s=game(3),err=ids=>R.adviceErrors(s.know,'werewolf',ctx('grown'),ids);
 assert.deepEqual(err(['werewolf.silver','werewolf.aconite','werewolf.crossroads']),[]);
 assert.match(err(['werewolf.silver']).join(),/Нужно ещё 2 указания/);assert.match(err(['werewolf.silver','werewolf.aconite']).join(),/Нужно ещё 1 указание/);
 assert.match(err(['werewolf.silver','werewolf.aconite','werewolf.crossroads','werewolf.garlic']).join(),/ровно три/);
 assert.match(err(['werewolf.silver','werewolf.silver','werewolf.aconite']).join(),/дважды/);
 assert.match(err(['werewolf.silver','werewolf.aconite','upyr.aspen']).join(),/не о том чудовище/);
 assert.match(err(['werewolf.silver','werewolf.aconite','werewolf.moonrise']).join(),/ещё нет/);
 assert.match(err(['werewolf.silver','werewolf.aconite','werewolf.garlic']).join(),/одного указания на род «Оберег»/);
 know(s,'werewolf.dawn','dangerous');assert.match(err(['werewolf.silver','werewolf.aconite','werewolf.dawn']).join(),/опасно: так советовать нельзя/);
 // A revealed condition that harms in these circumstances is refused; where it helps, it may go.
 know(s,'zlyden.offering','confirmed',1);const z=ids=>R.adviceErrors(s.know,'zlyden',ctx('grown'),ids),ok=L.MON.get('zlyden').facts.find(f=>f.id!=='zlyden.offering'&&f.cat!==F('zlyden.offering').cat&&s.know[f.id]?.st==='confirmed');
 const why=z(['zlyden.offering']).join();assert.match(why,/сейчас опасно/);
 assert.equal(R.usable(s.know['zlyden.offering'],F('zlyden.offering'),ctx('grown')),R.outcome(F('zlyden.offering'),ctx('grown'))!=='worse');assert.ok(ok);
 assert.equal(R.usable({st:'dangerous',rev:0},F('werewolf.dawn'),ctx()),false);assert.equal(R.usable({st:'refuted',rev:0},F('werewolf.crossroads'),ctx()),true,'a refuted myth is a safe third card');
});
test('potions: at most two, different, one general and one against a family; the sum of their P-bonus stops at 20 (GDD 3.4)',()=>{
 const have={courage:2,aconite_oil:2,thistle_brew:1,owl_drops:1,life_balm:1,ward_tincture:1};
 assert.deepEqual(R.potionErrors(have,['courage','aconite_oil']),[]);assert.deepEqual(R.potionErrors(have,['owl_drops','life_balm']),[],'effects are free within two');
 assert.match(R.potionErrors(have,['courage','aconite_oil','owl_drops']).join(),/двух/);assert.match(R.potionErrors(have,['courage','courage']).join(),/одинаковых/);
 assert.match(R.potionErrors(have,['aconite_oil','thistle_brew']).join(),/семейства — только одно/);assert.match(R.potionErrors(have,['theriac']).join(),/Нет снадобья «Терьяк»/);assert.match(R.potionErrors(have,['nope']).join(),/нет/);
 assert.equal(R.potionBonus('werewolf',['aconite_oil','courage']),15);assert.equal(R.potionBonus('werewolf',['thistle_brew']),0,'not against this family: +0');assert.equal(R.potionBonus('koldun',['dawn_tincture','courage']),20);
 assert.equal(R.potionFits('kikimora','aconite_oil'),false);assert.equal(R.forgives(['ward_tincture']),1);
 const gen=Math.max(...L.POTIONS.filter(p=>p.kind==='general').map(p=>p.bonus)),fam=Math.max(...L.POTIONS.filter(p=>p.kind==='family').map(p=>p.bonus));assert.ok(gen+fam<=20);
});
test('observation, wounds, look, trust share (GDD 4.1, 4.4, 4.5)',()=>{
 assert.deepEqual([1,2,3,4,5].map(p=>R.observeChance(p,false)),[.55,.65,.75,.85,.95]);assert.equal(R.observeChance(5,true),1);close(R.observeChance(1,true),.65);assert.equal(R.observeChance(1,false,true),1);
 assert.equal(R.woundDays({harm:0,P:70}),1);assert.equal(R.woundDays({harm:1,P:20,variant:'ancient',danger:4}),4);assert.equal(R.woundDays({harm:3,P:0,variant:'ancient',danger:5}),4,'never more than 4');
 assert.equal(R.woundDays({harm:0,P:70,balm:true}),1,'never less than 1');assert.equal(R.woundDays({harm:1,P:40,infirmary:true,cuirass:true}),1);assert.equal(R.woundDays({harm:1,P:40,theriac:true}),1);
 assert.deepEqual([1,2,3,4].map(d=>R.ragFor(d)),[1,2,3,3]);assert.deepEqual([1,2,3].map(d=>R.ragFor(d,true)),[1,1,2]);
 assert.equal(R.share(2),28);assert.equal(R.coinsOffer(44,'grown',2),12,'44 × 1 × 28% = 12');assert.equal(R.coinsOffer(44,'ancient',5),26);assert.equal(R.coinsOffer(44,'young',0),7);
});
test('hunters grow by experience; the tiers they may take; skill comes only from arcs and the blade',()=>{
 assert.deepEqual([0,3,4,9,10,17,18,29,30,99].map(R.level),[0,0,1,1,2,2,3,3,4,4]);
 const t={xp:0,skill:0,gear:[]};assert.equal(R.skillBonus('timofey',t),0);assert.equal(R.skillBonus('timofey',{...t,skill:3}),6);assert.equal(R.skillBonus('gordey',{xp:30,skill:0,gear:['blade']}),14,'8 + 4 + 2: the most');
 assert.equal(R.perception('gordey',t),1);assert.equal(R.perception('gordey',{xp:10,skill:0,gear:['spyglass']}),3);assert.equal(R.perception('agata',{xp:30,skill:0,gear:['spyglass']}),5,'never above 5');assert.equal(R.perception(null,null),2,'a townsperson sees at 2');
 assert.equal(R.maxTier('agata',t),1);assert.equal(R.maxTier('gordey',t),2,'skill ≥ 4 opens a tier');assert.equal(R.maxTier('gordey',{xp:30,skill:0,gear:[]}),3,'never above III');
});
test('ranks, candles, the Academy ceiling and the leaflet',()=>{
 assert.deepEqual([0,19,20,89,90,219,220,399,400,599,600,5000].map(R.rankOf),[0,0,1,1,2,2,3,3,4,4,5,5]);
 const s={rep:0,upgrades:[],daily:{extra:false}};assert.equal(R.candleMax(s),3);assert.equal(R.candleMax({...s,rep:90}),4);assert.equal(R.candleMax({...s,rep:400}),5);
 assert.equal(R.candleMax({rep:600,upgrades:['candle1','candle2'],daily:{extra:true}}),8,'five, two from furniture, one bought: eight at most');assert.equal(R.candleMax({rep:20,upgrades:['candle1'],daily:{extra:true}}),5);
 assert.equal(R.academyMax(),2390);assert.deepEqual([2,3,4,6,8].map(n=>R.leafletValue(n,false)),[0,6,8,12,12]);assert.deepEqual([3,6,8].map(n=>R.leafletValue(n,true)),[9,18,18]);
 assert.deepEqual(R.FEE,[0,5,8,12,0]);assert.deepEqual(R.RUMOUR_PRICE,[0,5,7,9,11]);assert.deepEqual(R.TREATISE,[0,40,80,120,0]);assert.deepEqual(R.LOOT_N,[0,1,2,2,0]);
});
test('preview: the bar of the sheet from the player’s records, never the truth',()=>{
 const s=game(4),c=s.contracts[0];
 const a=P.preview(s,c.id,['werewolf.silver','werewolf.aconite','werewolf.crossroads'],[]);assert.deepEqual([a.low,a.mid,a.high,a.k,a.line],[74,74,74,2,'good']);assert.deepEqual(a.errors,[]);
 assert.deepEqual(a.segments.map(x=>x.kind),['ok','ok','none']);
 const b=P.preview(s,c.id,['werewolf.silver','werewolf.garlic','werewolf.dawn'],[]);assert.deepEqual([b.low,b.mid,b.high],[0,41,100]);assert.deepEqual(b.segments.map(x=>x.kind),['ok','rumour','rumour']);
 const d=P.preview(s,c.id,['werewolf.silver'],['aconite_oil']);assert.deepEqual(d.segments.map(x=>x.kind),['ok','empty','empty']);assert.equal(d.potion,10);assert.match(d.errors[0],/Нужно ещё 2/);
 // The truth of the owner's example is 16⅓; the bar showed 41 — the difference is what the rumours hide.
 close(P.truthChance(s,c.id,['werewolf.silver','werewolf.garlic','werewolf.dawn']),16+1/3);
});
