import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
const pt=(x,y)=>({x,y});
function design(type='pendant',template='oval',metal='copper'){const d=J.makeDesign(type,template,metal);if(type!=='ring')d.gems.push({kind:'amethyst',x:50,y:49,size:3,cut:'round'});d.strokes.push({kind:'engrave',width:1,points:type==='ring'?[pt(40,27),pt(50,23),pt(60,27)]:[pt(39,38),pt(42,52),pt(48,60)]});return d;}
const rich=s=>{s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;};
const make=(s,d=design())=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s).item;};
const guest=s=>{if(!s.customers.some(c=>!c.served))P.nextDay(s);return s.customers.find(c=>!c.served);};
// A save as the version 3 code wrote it: none of the optional fields of the new version.
function v3(seed=3){const s=rich(J.newGame(seed));for(let i=0;i<3;i++){s.draft={design:design(J.TYPES[i].id==='ring'?'ring':'pendant'),undo:[],redo:[]};J.complete(s);}for(let i=0;i<2;i++){const c=s.customers.find(c=>!c.served);J.sell(s,s.stock[0].id,c.id,'low');}delete s.worldSeed;delete s.stats;s.log=s.log.map(e=>e.t);return JSON.parse(J.serialize(s));}
const ID=/^[a-z]+:[a-z0-9.+]{1,40}$/;
function valid(s){
 assert.ok(Number.isInteger(s.worldSeed)&&s.worldSeed>=0&&s.worldSeed<=4294967295,'world seed');
 const d=s.daily;for(const k of['sales','income','made','rep'])assert.ok(Number.isInteger(d[k])&&d[k]>=0,'daily.'+k);
 assert.ok(Array.isArray(d.areas)&&d.areas.length<=3&&d.areas.every(id=>J.AREAS.some(a=>a.id===id)));
 assert.ok(Array.isArray(d.firsts)&&d.firsts.length<=40&&d.firsts.every(k=>ID.test(k))&&new Set(d.firsts).size===d.firsts.length);
 assert.ok(Array.isArray(d.types)&&d.types.length<=6&&d.types.every(t=>J.TYPES.some(x=>x.id===t))&&new Set(d.types).size===d.types.length);
 assert.ok(s.stats&&typeof s.stats.clients==='object'&&!Array.isArray(s.stats.clients));for(const[id,n]of Object.entries(s.stats.clients))assert.ok(J.CLIENTS.some(p=>p.id===id)&&Number.isInteger(n)&&n>0);
 for(const k of['orders','gathers'])assert.ok(Number.isInteger(s.stats[k])&&s.stats[k]>=0);
 assert.ok(Array.isArray(s.log)&&s.log.length<=J.LOG_LIMIT&&s.log.every(e=>typeof e.t==='string'&&(e.d===null||Number.isInteger(e.d))&&typeof e.k==='string'));
}

test('normalize adds the defaults of the new version to a version 3 save, which still loads',()=>{
 const old=v3(),s=P.normalize(J.clone(old));valid(s);
 assert.equal(s.version,3);assert.deepEqual(s.stats,{clients:{},orders:0,gathers:0});assert.deepEqual([s.daily.rep,s.daily.firsts,s.daily.types],[0,[],[]]);
 assert.ok(s.log.every(e=>e.d===null&&e.k==='note'),'old string entries keep no day');assert.deepEqual(s.log.map(e=>e.t),old.log);
 for(const key of['gold','day','stock','library','demand','customers','requests','materials','skills','draft'])assert.deepEqual(s[key],old[key]);
 const again=J.deserialize(J.serialize(s));assert.deepEqual(P.normalize(again),JSON.parse(J.serialize(s)),'normalize is stable after a roundtrip');
});
test('two hundred corruptions of optional fields never throw and always repair to valid values',()=>{
 const junk=[null,undefined,'x','',-1,-7.5,1.5,1e12,NaN,Infinity,[],[1,2],[null],{}, {a:1},true,['pendant','pendant','ring','nope'],['form:pendant.oval','BAD KEY',7,'form:pendant.oval'],{mira:3,ghost:9,bren:-1,ada:'2'}];
 let seed=7;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
 const paths=[s=>s.worldSeed=pick(junk),s=>s.stats=pick(junk),s=>s.stats={...s.stats,clients:pick(junk)},s=>s.stats={clients:{},orders:pick(junk),gathers:pick(junk)},s=>s.daily.rep=pick(junk),s=>s.daily.firsts=pick(junk),s=>s.daily.types=pick(junk),s=>s.daily.income=pick(junk),s=>s.daily.made=pick(junk),s=>s.log=pick(junk),s=>s.log=[pick(junk),'строка',{d:pick(junk),t:pick(junk),k:pick(junk)},{d:3,t:'Создано',k:'make'}],s=>s.daily=pick(junk)];
 const base=P.normalize(v3(11));
 for(let i=0;i<200;i++){const s=J.clone(base);for(let k=0;k<1+Math.floor(rnd()*4);k++)try{pick(paths)(s);}catch{/* a field of a replaced primitive cannot be set */}assert.doesNotThrow(()=>P.normalize(s));valid(s);assert.deepEqual(P.normalize(J.clone(s)),s,'repair is idempotent');}
 assert.doesNotThrow(()=>P.normalize(null));assert.doesNotThrow(()=>P.normalize('save'));
});
test('the world seed is set once and does not change with gathering, trade or the next day',()=>{
 const s=rich(P.newGame(5)),seed=s.worldSeed;assert.ok(Number.isInteger(seed));assert.notEqual(seed,P.newGame(6).worldSeed);
 P.gather(s,'shore');const item=make(s);P.sell(s,item.id,guest(s).id,'low');assert.equal(s.worldSeed,seed);P.nextDay(s);assert.equal(s.worldSeed,seed);assert.equal(P.load(J.serialize(s)).worldSeed,seed);
 const old=v3(9),a=P.normalize(J.clone(old)),b=P.normalize(J.clone(old));assert.equal(a.worldSeed,b.worldSeed,'an old save gets a deterministic seed');const kept=a.worldSeed;P.gather(a,'shore');assert.equal(P.normalize(a).worldSeed,kept);
});
test('the wrappers keep statistics, the types sold today and the chronicle of orders',()=>{
 const s=rich(P.newGame(13));const first=make(s),c=guest(s),q=P.sell(s,first.id,c.id,'fair');
 assert.equal(q.full,q.demand.factor===1&&q.price>=q.fair*.95);if(q.full)assert.equal(s.stats.clients[c.client],1);assert.deepEqual(s.daily.types,['pendant']);
 const cheap=make(s),d=guest(s),before=s.stats.clients[d.client]||0;assert.equal(P.sell(s,cheap.id,d.id,'low').full,false);assert.equal(s.stats.clients[d.client]||0,before,'a discount does not count as a full sale');
 P.gather(s,'shore');assert.equal(s.stats.gathers,1);
 const r={id:'request-'+s.nextId++,client:'nora',type:'ring',style:'symmetry',min:0,minMagic:0,title:'Простое кольцо',until:s.day+3,done:false};s.requests=[r];const ring=make(s,design('ring','oval','silver'));
 const done=P.deliver(s,r.id,ring.id);assert.ok(done.reward>0);assert.equal(s.stats.orders,1);assert.deepEqual(s.daily.types,['pendant','ring']);assert.deepEqual(s.log[0],{d:s.day,t:`Заказ «Простое кольцо» выполнен: ${done.reward} монет`,k:'order'});
 const prev=P.nextDay(s);assert.deepEqual(prev.types,['pendant','ring']);assert.ok(prev.sales>=2);assert.deepEqual([s.daily.rep,s.daily.firsts,s.daily.types,s.daily.sales],[0,[],[],0]);valid(s);
 assert.doesNotThrow(()=>J.deserialize(J.serialize(s)));
});
test('a failed action through a wrapper changes nothing',()=>{
 const s=rich(P.newGame(2)),raw=J.serialize(s);assert.throws(()=>P.sell(s,'jewel-999',s.customers[0].id));assert.throws(()=>P.deliver(s,'request-999','jewel-1'));assert.throws(()=>P.gather(s,'ridge'));assert.throws(()=>P.learn(s,'signature'));assert.throws(()=>P.recycle(s,'jewel-5'));assert.equal(J.serialize(s),raw);
});
test('the interface changes the game only through the progress wrappers',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/J\.(sell|deliver|gather|complete|nextDay|buy|learn|recycle)\(/,'use P.* so progress is never skipped');
 assert.doesNotMatch(app,/J\.(deserialize|newGame)\(/,'loaded and new games must pass through normalize');
});
test('the chronicle keeps sixty dated entries and reads older string entries',()=>{
 const s=rich(P.newGame(21));for(let i=0;i<100;i++){const item=make(s);P.sell(s,item.id,guest(s).id,'low');}
 assert.equal(s.log.length,60);assert.ok(s.log.every(e=>Number.isInteger(e.d)&&['make','sell'].includes(e.k)));assert.equal(s.log[0].k,'sell');assert.equal(s.log[0].d,s.day);
 const raw=JSON.parse(J.serialize(s));raw.log=[...Array.from({length:70},(_,i)=>'Запись '+i),{d:2,t:'Новая',k:'make'},{t:5},null];const back=J.deserialize(JSON.stringify(raw));
 assert.equal(back.log.length,60);assert.deepEqual(back.log[0],{d:null,t:'Запись 0',k:'note'});
 raw.log=['Старая',{d:4,t:'Создано: Капля',k:'make'},{d:'x',t:'Без дня',k:'BAD'},7];assert.deepEqual(J.deserialize(JSON.stringify(raw)).log,[{d:null,t:'Старая',k:'note'},{d:4,t:'Создано: Капля',k:'make'},{d:null,t:'Без дня',k:'note'}]);
});
test('a file with an odd structure is reported as damaged, never as a script error',()=>{
 const base=JSON.parse(J.serialize(P.newGame(4)));
 for(const [key,value]of[['stock',[null]],['customers',[null]],['requests',[7]],['demand',[null]],['library',[null]]])assert.throws(()=>P.load(JSON.stringify({...base,[key]:value})),e=>e instanceof J.AtelierError&&/повреж/i.test(e.message),key);
 assert.throws(()=>P.load('{'),J.AtelierError);assert.equal(P.load(JSON.stringify(base)).gold,base.gold);
});
