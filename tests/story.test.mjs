import test from 'node:test';
import assert from 'node:assert/strict';
import {P,L,R,B,roll,game,snap,place,clear,know,ctx,join} from './bestiary-helpers.mjs';
const S=id=>L.STORY.get(id);
// A state on a given morning with the story seen up to an event.
function at(day,seen=[],{rep=0,wins=0,pagesSold=0,resolved=0}={}){const s=game(71);for(const id of seen)P.applyStory(s,S(id));s.day=day;s.rep=rep;Object.assign(s.stats,{wins,pagesSold,resolved});return s;}
const ready=(s,id)=>P.storyReady(s,S(id));

test('S1 comes with the first win from day 2, or on day 4 anyway; S2 on day 5',()=>{
 assert.equal(ready(at(2,[],{wins:1}),'S1'),true);assert.equal(ready(at(2),'S1'),false);assert.equal(ready(at(3),'S1'),false);assert.equal(ready(at(4),'S1'),true,'the fallback day');
 assert.equal(ready(at(4,[],{wins:1}),'S2'),false);assert.equal(ready(at(5),'S2'),true);
 // In play: the lesson won, S1 is the event of the morning of day 2 and opens the Academy.
 const s=game(72);assert.ok(P.advise(s,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads']).ok);const res=P.endDay(s);assert.equal(res.story.id,'S1');assert.equal(res.story.title,S('S1').title);
 assert.ok(Array.isArray(res.story.text)&&res.story.text.length);assert.equal(s.story.days.S1,2);assert.ok(s.chronicle.some(e=>e.k==='story'));
});
test('S3 needs rank 1 and three wins from day 6, or comes on day 10; it opens tier II and brings Ерофей',()=>{
 assert.equal(ready(at(6,['S1','S2'],{rep:20,wins:3}),'S3'),true);assert.equal(ready(at(6,['S1','S2'],{rep:19,wins:3}),'S3'),false);assert.equal(ready(at(9,['S1','S2'],{rep:20,wins:2}),'S3'),false);
 assert.equal(ready(at(10,['S1','S2']),'S3'),true);
 const s=at(10,['S1','S2']);const rep=s.rep,ev=P.storyStep(s);assert.equal(ev.id,'S3');for(const id of['leshy','poludnitsa','ghoul','mara'])assert.ok(s.monsters[id],id);assert.equal(s.rep,rep+3);
 P.joinHunters(s);assert.ok(s.hunters.erofey);assert.equal(s.monsters.leshy.u,10,'opened today: no case on it today');
});
test('S4–S10: each after the one before, on its day, with its need or its fallback',()=>{
 const chain=['S1','S2','S3'];assert.equal(ready(at(8,chain),'S4'),false);assert.equal(ready(at(9,chain),'S4'),true);assert.equal(ready(at(20,['S1','S2']),'S4'),false,'never before S3');
 chain.push('S4');assert.equal(ready(at(13,chain,{rep:90}),'S5'),true);assert.equal(ready(at(13,chain,{rep:89}),'S5'),false);assert.equal(ready(at(17,chain),'S5'),false);assert.equal(ready(at(18,chain),'S5'),true);
 chain.push('S5');assert.equal(ready(at(14,chain),'S6'),false);assert.equal(ready(at(15,chain),'S6'),true);chain.push('S6');
 assert.equal(ready(at(18,chain,{pagesSold:3}),'S7'),true);assert.equal(ready(at(18,chain,{resolved:25}),'S7'),true);assert.equal(ready(at(23,chain,{pagesSold:2,resolved:24}),'S7'),false);assert.equal(ready(at(24,chain),'S7'),true);
 chain.push('S7');assert.equal(ready(at(19,chain),'S8'),false);assert.equal(ready(at(20,chain),'S8'),true);chain.push('S8');assert.equal(ready(at(21,chain),'S9'),true);chain.push('S9');
 assert.equal(ready(at(24,chain,{rep:220}),'S10'),true);assert.equal(ready(at(24,chain,{resolved:40}),'S10'),true);assert.equal(ready(at(29,chain,{rep:219,resolved:39}),'S10'),false);assert.equal(ready(at(30,chain),'S10'),true);
 for(const id of['S11','S12','S13'])assert.equal(ready(at(99,chain),id),false,`${id} comes only from its trigger`);
});
test('the effects of the story: the sorcerer’s page with rumours, the chronicle of 1640, the recipe and the ice of the barrow',()=>{
 const s=at(30,['S1','S2','S3']);P.storyStep(s);assert.ok(s.monsters.koldun);for(const id of S('S4').effect.rumours)assert.equal(s.know[id].st,'rumour');assert.equal(s.know['koldun.silver'].src,'story');
 for(const id of['S5','S6','S7'])P.applyStory(s,S(id));assert.equal(s.know['koldun.aspen'].st,'confirmed');assert.equal(s.know['koldun.solstice'].st,'dangerous','the chronicle resolves the rumour of S4');assert.equal(s.know['koldun.holy_water'].st,'refuted');
 P.applyStory(s,S('S8'));assert.ok(s.recipes.includes('dawn_tincture'));assert.equal(s.know['koldun.broom'].st,'rumour');assert.equal(s.know['koldun.water'].st,'rumour');
 P.applyStory(s,S('S9'));assert.equal(s.stock.grave_ice,2);
 // The final riddle: with the ice the broom is tested in the laboratory and the sheet reaches 100%.
 const r=P.labTest(s,['koldun.broom'],'grave_ice');assert.ok(r.ok,r.why);assert.equal(s.know['koldun.broom'].st,'confirmed');
 const cards=['koldun.aspen','koldun.broom','koldun.facedown'],ctx0={variant:'grown',weather:'clear',season:1};assert.equal(P.estimate(cards.map(id=>P.believed(s.know[id],L.FACT.get(id),ctx0)),{}).mid,100);
 assert.equal(P.applyStory(s,S('S8')),null,'an event happens once');
});
test('one event a morning: a keeper far behind gets the story one morning at a time',()=>{
 const s=game(73);s.day=40;s.rep=600;s.stats.wins=50;s.stats.resolved=60;s.stats.pagesSold=9;const got=[];
 for(let i=0;i<12;i++){const ev=P.storyStep(s);if(ev)got.push(ev.id);}assert.deepEqual(got,['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']);
 const t=game(74);t.rep=600;t.stats.wins=50;for(let d=1;d<6;d++){const res=P.endDay(t);assert.ok(!res.story||typeof res.story.id==='string');}assert.ok(t.story.seen.length<=6,'never more than one a morning');
});
test('the Black Winter holds the season of the rules from S5 until the sorcerer falls; then three days of thaw (GDD 1.5, 7.1)',()=>{
 const s=at(13,['S1','S2','S3','S4'],{rep:90});assert.equal(P.seasonOf(s),1,'day 13 is winter by the calendar too');s.day=25;assert.equal(P.seasonOf(s),2);
 P.applyStory(s,S('S5'));assert.equal(s.story.hold,true);assert.equal(P.seasonOf(s),1,'spring by the calendar, winter by the story');
 for(let d=25;d<60;d++){s.day=d;assert.ok(['snow','fog','clear'].includes(P.weatherOf(s)),`${d}: ${P.weatherOf(s)}`);}
 let snow=0;for(let d=1;d<=400;d++){s.day=d;if(P.weatherOf(s)==='snow')snow++;}assert.ok(snow/400>.35&&snow/400<.55,`snow ${snow}`);
 // The winter is a mood, not a punishment: the fee of a case and the prices stay.
 assert.deepEqual(R.FEE,[0,5,8,12,0]);
 s.day=40;for(const id of['S6','S7','S8','S9','S10'])P.applyStory(s,S(id));s.story.koldun=39;const ev=P.storyStep(s);assert.equal(ev.id,'S12');assert.equal(s.story.hold,false);assert.equal(s.story.thaw,3);
 assert.equal(P.seasonOf(s),3,'the calendar again: day 40 is summer');
 P.endDay(s);assert.equal(s.story.thaw,2);P.endDay(s);P.endDay(s);assert.equal(s.story.thaw,0);P.endDay(s);assert.equal(s.story.thaw,0);
});
test('S12 and S13: the thaw comes the morning after the victory before any other event; the seal ends the story, not the game',()=>{
 const s=at(25,['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']);s.story.koldun=24;const gold=s.gold,rep=s.rep,ev=P.storyStep(s);assert.equal(ev.id,'S12');
 assert.equal(s.gold,gold+300);assert.ok(s.rep>=rep+10+10);assert.equal(s.monsters.koldun.treatise,25);assert.equal(s.stock.black_book,1);
 assert.equal(P.storyStep(s),null,'S13 only with the seal');assert.ok(s.story.seen.includes('S12'));
 const out=P.arcStep(s);assert.ok(out.filter(a=>a.id.endsWith('.end')).length>=2,'the epilogues of the hunters who came');
});
test('the arcs of the hunters fire once by the keys of GDD 7.3 and apply their effects at once',()=>{
 const s=game(75);const fire=()=>P.arcStep(s).map(a=>a.id);
 assert.ok(s.arcs.includes('gordey.1')&&s.arcs.includes('agata.1'),'first:true');assert.deepEqual(fire(),[],'nothing twice');
 s.hunters.gordey.wins=3;const t=s.hunters.gordey.trust;assert.ok(fire().includes('gordey.2'));assert.equal(s.hunters.gordey.trust,t+1,'wins:n → trust');
 s.hunters.gordey.harmSeen=1;assert.ok(fire().includes('gordey.3'),'harmfulSeen');
 s.hunters.agata.hunts=2;assert.ok(fire().includes('agata.2'));assert.ok(s.recipes.includes('wormwood_water'),'hunts:n → recipe');
 join(s,'timofey');assert.ok(fire().includes('timofey.1'));s.hunters.timofey.failSeen=1;assert.ok(fire().includes('timofey.2'),'failSeen');
 s.hunters.timofey.hunts=2;const out=fire();assert.ok(out.includes('gordey.4'),'huntsOf');assert.equal(s.hunters.timofey.skill,1,'skillOf');assert.ok(out.includes('timofey.3'),'arc: a step after a step, the same morning');
 s.hunters.timofey.wins=6;fire();assert.equal(s.hunters.timofey.skill,2);s.hunters.timofey.wins=10;fire();assert.equal(s.hunters.timofey.skill,3);assert.equal(R.skillOf('timofey',s.hunters.timofey),4,'Тимофей 1 → 4');
 // opened + hunts: the personal case of Агата.
 s.hunters.agata.hunts=5;assert.ok(!fire().includes('agata.3'));P.applyStory(s,L.STORY.get('S3'));assert.ok(fire().includes('agata.3'));assert.deepEqual([s.personal.agata.monster,s.personal.agata.variant],['poludnitsa','grown']);
 // day: agata.4 on day 30 without the personal win; book → the notebook of Агата, its entries applied.
 s.day=30;assert.ok(fire().includes('agata.4'));assert.ok(s.books.includes('agata_notebook'));assert.equal(s.know['poludnitsa.noon'].st,'dangerous');
 // known + beaten: Марта; refuted: Илларион; contractOn: Зоряна; story: Ерофей; opened: Арман.
 join(s,'marta','illarion','zoryana');fire();for(const f of L.MON.get('werewolf').facts.slice(0,5))if(!s.know[f.id])know(s,f.id,'rumour');assert.ok(!fire().includes('marta.2'));s.monsters.werewolf.wins=1;assert.ok(fire().includes('marta.2'));
 know(s,'zlyden.holy_water','refuted');assert.ok(fire().includes('illarion.2'),'refuted: any *.holy_water');
 s.hunters.illarion.wins=4;assert.ok(fire().includes('illarion.3'));assert.ok(s.books.includes('trebnik'));
 s.contracts.push({id:'c-900',kind:'hunter',hunter:'zoryana',town:null,monster:'leshy',variant:'grown',place:L.MON.get('leshy').places[0],tier:2,day:s.day,deferred:0,fee:8,bounty:66});assert.ok(fire().includes('zoryana.2'),'contractOn');
 P.joinHunters(s);fire();P.applyStory(s,L.STORY.get('S4'));P.applyStory(s,L.STORY.get('S5'));P.applyStory(s,L.STORY.get('S6'));P.joinHunters(s);const o=fire();assert.ok(o.includes('erofey.2'),'story');assert.ok(o.includes('armand.2'),'opened');
 // personal: done (any end) and the day of armand.4 after armand.3.
 s.day=27;s.personal.armand.tries=1;assert.ok(fire().includes('armand.3'));assert.ok(!fire().includes('armand.4'));s.day=28;assert.ok(fire().includes('armand.4'));assert.ok(s.books.includes('armand_memoirs'));
 s.personal.erofey.state='won';assert.ok(fire().includes('erofey.3'),'personal: won');
 assert.ok(s.daily.firsts.some(x=>x.startsWith('arc:')),'a dot on the chronicle');assert.ok(s.chronicle.some(e=>e.k==='arc'));
});
test('marta.3 lifts trust to the top; a «repeat» step speaks at every lost personal hunt and is never stored',()=>{
 const s=game(76);join(s,'marta');s.monsters.werewolf.wins=1;for(const f of L.MON.get('werewolf').facts.slice(0,6))if(!s.know[f.id])know(s,f.id,'rumour');P.arcStep(s);assert.ok(s.personal.marta);
 const a=P.arcStep(s,{personal:{marta:'lost'}}).map(a=>a.id),b=P.arcStep(s,{personal:{marta:'lost'}}).map(a=>a.id);assert.ok(a.includes('marta.3b')&&b.includes('marta.3b'));assert.ok(!s.arcs.includes('marta.3b'));
 const ctx={personal:{marta:'lost'}};P.arcStep(s,ctx);assert.deepEqual(P.arcStep(s,ctx).map(a=>a.id),[],'once a morning');
 s.hunters.marta.trust=1;s.personal.marta.state='won';assert.ok(P.arcStep(s).some(a=>a.id==='marta.3'));assert.equal(s.hunters.marta.trust,5);
});
test('hunters come on their days and with their events; the story never sticks for any player',()=>{
 const s=game(77);const days={};for(let d=1;d<=31;d++){for(const h of L.HUNTERS)if(s.hunters[h.id]&&!days[h.id])days[h.id]=s.day;P.endDay(s);}
 assert.deepEqual([days.gordey,days.agata,days.timofey,days.marta,days.illarion,days.zoryana],[1,1,3,4,5,9]);assert.ok(days.erofey===s.story.days.S3);assert.ok(days.armand===s.story.days.S5);
 assert.ok(s.story.days.S3<=10&&s.story.days.S5<=18&&s.story.days.S10<=30,'the fallback days hold even for a keeper who does nothing');
});
