import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {dayPhase,season,weatherFor,sky,ambience,skyWords,morningWords,SEASONS,WEATHER,WEATHER_ICON} from '../src/ambience.js';

test('the weather of a day depends only on the world seed and the day; snow falls only in winter',()=>{
 for(const seed of[0,1,77,4294967295])for(let day=1;day<=60;day++)assert.equal(weatherFor(seed,day),weatherFor(seed,day));
 const seen=new Set();for(const seed of[3,1234,987654321])for(let day=1;day<=400;day++){const w=weatherFor(seed,day),k=season(day);seen.add(w);assert.ok(w in WEATHER,w);if(w==='snow')assert.equal(k,1,`snow on day ${day}`);if(k===3)assert.ok(['clear','rain'].includes(w));if(k===2)assert.notEqual(w,'fog');}
 assert.deepEqual([...seen].sort(),['clear','fog','rain','snow']);
 assert.equal(season(1),0,'the story begins in autumn');assert.equal(season(12),0);assert.equal(season(13),1);assert.equal(season(25),2);assert.equal(season(37),3);assert.equal(season(49),0);
 // About a third of autumn days are rainy and consecutive days do not share their weather by construction.
 let rain=0,autumn=0,same=0;for(let seed=1;seed<=200;seed++)for(let day=1;day<=12;day++){autumn++;if(weatherFor(seed,day)==='rain')rain++;if(day>1&&weatherFor(seed,day)===weatherFor(seed,day-1))same++;}
 assert.ok(rain/autumn>.28&&rain/autumn<.42,`autumn rain ${rain/autumn}`);assert.ok(same/(200*11)<.6,`repeats ${same}`);
});
test('the weather does not change within a day: finds, sales and guests do not move the world seed',()=>{
 const s=P.newGame(42),seed=s.worldSeed,today=weatherFor(s.worldSeed,s.day);assert.ok(Number.isInteger(seed));
 P.gather(s,'shore');assert.equal(s.worldSeed,seed);assert.equal(ambience(s).weather,today);assert.notEqual(s.seed,42,'the random generator did move');
 s.draft={design:(d=>{d.gems=[{kind:'garnet',x:50,y:50,size:3,cut:'round'}];return d;})(J.makeDesign('pendant','oval','copper')),undo:[],redo:[]};const item=P.complete(s).item;
 const buyer=s.customers.find(c=>J.quote(s,item,c,'counter').accepted);if(buyer)P.sell(s,item.id,buyer.id,'counter');assert.equal(ambience(s).weather,today);
 P.nextDay(s);assert.equal(s.worldSeed,seed,'the seed stays across days');assert.equal(ambience(s).weather,weatherFor(seed,2));
 // An older save gets a world seed once, from what it already has, and keeps it.
 const raw=JSON.parse(J.serialize(s));delete raw.worldSeed;const a=P.load(JSON.stringify(raw)),b=P.load(JSON.stringify(raw));assert.equal(a.worldSeed,b.worldSeed);P.gather(a,'shore');assert.equal(P.load(J.serialize(a)).worldSeed,b.worldSeed);
 raw.worldSeed=-3;assert.ok(Number.isInteger(P.load(JSON.stringify(raw)).worldSeed));
});
test('the day turns to evening with the work done, never past 0.8, and every sky is a colour',()=>{
 const base={daily:{sales:0,made:0,areas:[]}},phase=d=>dayPhase({daily:{...base.daily,...d}});assert.equal(phase({}),.12);
 for(const [k,max]of[['sales',10],['made',10]])for(let n=0;n<max;n++)assert.ok(phase({[k]:n+1})>=phase({[k]:n}),`${k} ${n}`);
 assert.ok(phase({areas:['shore','garden']})>=phase({areas:['shore']}));assert.equal(phase({sales:9,made:9,areas:['shore','garden','ridge']}),.8);assert.equal(dayPhase({}),.12);assert.equal(dayPhase(null),.12);
 for(let i=0;i<=20;i++)for(const w of Object.keys(WEATHER)){const k=sky(i/20,w);for(const key of['top','bottom','hill','tint','shaft','candle'])assert.match(k[key],/^#[0-9a-f]{6}$/,`${i/20} ${w} ${key}`);}
 assert.equal(sky(.35,'clear').tint,'#ffffff','a clear noon does not tint the room');assert.equal(sky(1,'clear').tint,'#5a6690','the night tint is the darkest');
 const lum=h=>[1,3,5].reduce((n,i)=>n+parseInt(h.slice(i,i+2),16),0);for(let i=0;i<=20;i++)for(const w of Object.keys(WEATHER))assert.ok(lum(sky(i/20,w).tint)>=lum('#5a6690'),'never darker than the night key');
});
test('words and icons of the weather',()=>{
 for(const w of Object.keys(WEATHER))assert.ok(WEATHER_ICON[w]);assert.equal(SEASONS.length,4);
 assert.equal(skyWords({season:0,weather:'rain'}),'осень, дождь');assert.equal(morningWords({season:1,weather:'snow'}),'Зима, гавань в снегу');assert.equal(morningWords({season:2,weather:'clear'}),'Весна, ясное утро над гаванью');
 const s=P.newGame(9);const r=P.morningReport(s,P.nextDay(s));assert.equal(r.amb.day,s.day);assert.equal(r.amb.weather,weatherFor(s.worldSeed,s.day));
});
