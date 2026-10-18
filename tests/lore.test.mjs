import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/lore.js';
import * as D from '../src/content-data.js';
import {contentErrors,PLACEHOLDERS} from '../scripts/content-rules.mjs';

test('the content follows the rules of GDD 8.7 and the decisions D3 and D5',()=>{
 assert.deepEqual(contentErrors(),[]);
 const facts=D.MONSTERS.flatMap(m=>m.facts);
 assert.equal(D.MONSTERS.length,14);assert.equal(facts.length,109);assert.equal(facts.filter(f=>f.truth==='conditional').length,19);
 assert.equal(D.HUNTERS.length,8);assert.equal(D.POTIONS.length,10);assert.equal(D.MATERIALS.length,40);assert.equal(D.BOOKS.length,17);assert.equal(D.STORY.length,14);
 assert.equal(D.CONTENT_VERSION,1);assert.deepEqual(D.STATES,['rumour','confirmed','refuted','dangerous']);
 assert.deepEqual(D.MONSTERS.filter(m=>m.tier===1).map(m=>m.id),['werewolf','upyr','kikimora','drowner','zlyden']);
 // D3: six pieces of decor for 150–900 coins, only to look at, and a second edition for every tier.
 assert.equal(D.DECOR.length,6);assert.ok(D.DECOR.every(d=>d.price>=150&&d.price<=900));assert.deepEqual(D.DECOR.map(d=>d.id).sort(),['armchair','globe','lamp','shelves','showcase','stained']);
 assert.equal(D.EDITION.name,'Второе издание');
});
test('the indices of lore.js cover the whole content and are the only door to it',()=>{
 assert.equal(L.MON.size,14);assert.equal(L.FACT.size,109);assert.equal(L.FACTS_OF.get('werewolf').length,9);assert.equal(L.BOOK.size,17);assert.equal(L.POT.size,10);assert.equal(L.MAT.size,40);
 assert.equal(L.HUNTER.size,8);assert.equal(L.VISITOR.size,8);assert.equal(L.STORY.size,14);assert.equal(L.PLACE.size,24);assert.equal(L.RANK.size,6);
 assert.deepEqual(L.EVENTS.map(e=>e.id),['S0','S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13']);
 assert.equal(L.monsterOf('werewolf.dawn').id,'werewolf');assert.equal(L.TOWN_TYPES.length,6);assert.equal(L.ARC.get('marta.2').hunter,'marta');
 assert.equal(L.PARTS.length,28);assert.equal(L.BOUGHT.length,12);assert.deepEqual(L.START,['werewolf','upyr','kikimora','drowner','zlyden']);
});
test('plural forms and the numbers with their word',()=>{
 const f=n=>L.plural(n,'монета','монеты','монет');
 assert.deepEqual([1,2,4,5,11,12,14,21,22,25,101,111,112].map(f),['монета','монеты','монеты','монет','монет','монет','монет','монета','монеты','монет','монета','монет','монет']);
 assert.equal(L.coins(5),'5 монет');assert.equal(L.coins(21),'21 монета');assert.equal(L.days(1),'1 день');assert.equal(L.days(3),'3 дня');assert.equal(L.days(5),'5 дней');
 assert.equal(L.pct(200/3),66);assert.equal(L.pct(100/3),33);assert.equal(L.pct(74+2/3),74);assert.equal(L.pct(100),100);
});
test('say: the gender of the speaker and the words of the case (GDD 8.5)',()=>{
 const dawn=L.FACT.get('werewolf.dawn').lines.worse;
 assert.match(L.say(dawn,{},'gordey'),/после того как я встретился с ним утром, он стал ещё сильнее!/);
 assert.match(L.say(dawn,{},'agata'),/после того как я встретилась с ним утром, он стал ещё сильнее!/);
 const w=L.words({monster:'koldun',place:'black_barrow',fee:5,hunter:'gordey',coins:12,days:2});
 assert.equal(w.monster,'колдун Мартын');assert.equal(w.Monster,'Колдун Мартын');assert.equal(w.where,'на Чёрном кургане');assert.equal(w.fee,'5 монет');assert.equal(w.hunterAcc,'Гордея');assert.equal(w.days,'2 дня');
 assert.equal(L.say('{hunter} {ушёл|ушла} на дело: {monster} {where}. Ответ — утром',L.words({hunter:'agata',monster:'kikimora',place:'rotten_marsh'}),'agata'),'Агата ушла на дело: кикимора болотная на Гнилых топях. Ответ — утром');
 assert.equal(L.say('{unknown} и {Сам|Сама}',{},'agata'),'{unknown} и Сама','an unknown placeholder stays visible');
 assert.equal(L.female('vedana'),true);assert.equal(L.female('nikodim'),false);assert.equal(L.female('widow'),true);assert.equal(L.female({look:{female:true}}),true);
});
test('every line of hunters, guests and facts renders without a placeholder left',()=>{
 const left=t=>/\{[^}]*\}/.test(t);
 for(const h of D.HUNTERS)for(const m of D.MONSTERS.slice(0,3)){const v=L.words({monster:m,place:m.places[0],fee:5,hunter:h,coins:12,days:2,day:3,n:2});
  for(const t of Object.values(h.lines).flat())assert.ok(!left(L.say(t,v,h.id)),`${h.id}: ${L.say(t,v,h.id)}`);for(const a of h.arc)assert.ok(!left(L.say(a.text,v,h.id)),a.id);}
 for(const m of D.MONSTERS)for(const f of m.facts)for(const o of['ok','none','worse'])for(const who of['gordey','agata'])assert.ok(!left(L.say(f.lines[o],{},who)),f.id);
 for(const list of Object.values(D.LINES.reward))for(const t of list)assert.ok(!left(L.say(t,L.words({coins:12,loot:'шерсть',fact:'werewolf.torch',trophy:'Седой хвост'}),'agata')),t);
 for(const t of D.LINES.unseen)assert.ok(!left(L.say(t,L.words({fact:'werewolf.torch'}),'gordey')));
 assert.equal(L.say(D.LINES.note,L.words({monster:'kikimora',fact:'kikimora.yarn'}),'vedana'),`не дождалась и оставила на столе записку о кикиморе болотной: «${L.FACT.get('kikimora.yarn').advice}»`);
 for(const k of['monster','where','advice','coins','days','hunterAcc'])assert.ok(PLACEHOLDERS.has(k));
});
