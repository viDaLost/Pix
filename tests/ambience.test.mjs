import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/progress.js';
import {dayPhase,season,weatherFor,moonFor,MOON,sky,ambience,skyWords,townMorningWords,SEASONS,WEATHER,WEATHER_ICON} from '../src/ambience.js';

test('the weather of a day depends only on the world seed and the day; snow falls only in winter',()=>{
 for(const seed of[0,1,77,4294967295])for(let day=1;day<=60;day++)assert.equal(weatherFor(seed,day),weatherFor(seed,day));
 const seen=new Set();for(const seed of[3,1234,987654321])for(let day=1;day<=400;day++){const w=weatherFor(seed,day),k=season(day);seen.add(w);assert.ok(w in WEATHER,w);if(w==='snow')assert.equal(k,1,`snow on day ${day}`);if(k===3)assert.ok(['clear','rain'].includes(w));if(k===2)assert.notEqual(w,'fog');}
 assert.deepEqual([...seen].sort(),['clear','fog','rain','snow']);
 assert.equal(season(1),0,'the story begins in autumn');assert.equal(season(12),0);assert.equal(season(13),1);assert.equal(season(25),2);assert.equal(season(37),3);assert.equal(season(49),0);
 let rain=0,autumn=0,same=0;for(let seed=1;seed<=200;seed++)for(let day=1;day<=12;day++){autumn++;if(weatherFor(seed,day)==='rain')rain++;if(day>1&&weatherFor(seed,day)===weatherFor(seed,day-1))same++;}
 assert.ok(rain/autumn>.28&&rain/autumn<.42,`autumn rain ${rain/autumn}`);assert.ok(same/(200*11)<.6,`repeats ${same}`);
});
test('the weather does not change within a day: guests, sheets and purchases do not move the world seed',()=>{
 const s=P.newGame(42),seed=s.worldSeed,today=ambience(s).weather;assert.equal(seed,42);
 for(const v of s.visitors)P.listen(s,v.id);P.advise(s,'c-1',['werewolf.silver','werewolf.aconite','werewolf.crossroads']);P.buyCandle(s);P.buy(s,'salt',2);
 assert.equal(s.worldSeed,seed);assert.equal(ambience(s).weather,today);assert.equal(P.weatherOf(s),today,'the scene and the rules see the same sky');
 P.endDay(s);assert.equal(s.worldSeed,seed,'the seed stays across days');assert.equal(ambience(s).weather,weatherFor(seed,2));
 // A save without a seed gets one once, from what it already has, and keeps it.
 const raw=JSON.parse(P.serialize(s));delete raw.worldSeed;const a=P.normalize(structuredClone(raw)),b=P.normalize(structuredClone(raw));assert.ok(Number.isInteger(a.worldSeed));assert.equal(a.worldSeed,b.worldSeed);
});
test('the scriptorium turns to evening with the guests heard and the candles burnt, never past 0.8, and every sky is a colour',()=>{
 const lit=d=>dayPhase({daily:d});assert.equal(lit({talks:0,candles:0}),.12);assert.ok(Math.abs(lit({talks:1,candles:1})-.34)<1e-9);assert.equal(lit({talks:3,candles:5}),.8);
 for(let n=0;n<8;n++){assert.ok(lit({talks:n+1,candles:0})>=lit({talks:n,candles:0}));assert.ok(lit({talks:0,candles:n+1})>=lit({talks:0,candles:n}));}
 assert.equal(lit({talks:-2,candles:'x'}),.12);assert.equal(dayPhase({}),.12);assert.equal(dayPhase(null),.12);
 for(let i=0;i<=20;i++)for(const w of Object.keys(WEATHER)){const k=sky(i/20,w);for(const key of['top','bottom','hill','tint','shaft','candle'])assert.match(k[key],/^#[0-9a-f]{6}$/,`${i/20} ${w} ${key}`);}
 assert.equal(sky(.35,'clear').tint,'#ffffff','a clear noon does not tint the room');assert.equal(sky(1,'clear').tint,'#5a6690','the night tint is the darkest');
 const lum=h=>[1,3,5].reduce((n,i)=>n+parseInt(h.slice(i,i+2),16),0);for(let i=0;i<=20;i++)for(const w of Object.keys(WEATHER))assert.ok(lum(sky(i/20,w).tint)>=lum('#5a6690'),'never darker than the night key');
});
test('words and icons of the sky of Velen',()=>{
 for(const w of Object.keys(WEATHER))assert.ok(WEATHER_ICON[w]);assert.equal(SEASONS.length,4);
 assert.equal(skyWords({season:0,weather:'rain'}),'осень, дождь');
 assert.equal(townMorningWords({season:1,weather:'snow'}),'Зима, Велен в снегу');assert.equal(townMorningWords({season:0,weather:'fog'}),'Осень, Велен в тумане');assert.equal(townMorningWords({season:2,weather:'clear'}),'Весна, ясное утро над Веленом');
});
test('the weather by the season of the rules and the moon of the night window (GDD 1.5)',()=>{
 for(const seed of[1,77,4242])for(let day=1;day<=60;day++){assert.equal(weatherFor(seed,day),weatherFor(seed,day,season(day)),'without k the calendar decides');
  assert.ok(['snow','fog','clear'].includes(weatherFor(seed,day,1)),'the winter table');}
 let snow=0;for(let day=25;day<=36;day++)for(let seed=1;seed<=50;seed++)if(weatherFor(seed,day,1)==='snow')snow++;assert.ok(snow/600>.35&&snow/600<.55,`a spring day under the Black Winter snows: ${snow}`);
 for(const seed of[0,9,123456])for(let day=1;day<=40;day++){const m=moonFor(seed,day);assert.ok(Number.isInteger(m)&&m>=0&&m<8);assert.equal(moonFor(seed,day+8),m,'a cycle of eight days');assert.equal(moonFor(seed,day+1),(m+1)%8);}
 assert.equal(MOON.length,8);assert.equal(MOON[4],'полнолуние');
 const s=P.newGame(5);assert.deepEqual(ambience(s),{day:1,season:0,weather:P.weatherOf(s),phase:.12,moon:moonFor(s.worldSeed,1)});
 s.story.hold=true;s.day=30;assert.equal(ambience(s).season,1);assert.equal(ambience(s).weather,P.weatherOf(s),'the Black Winter holds the window and the rules alike');
});
