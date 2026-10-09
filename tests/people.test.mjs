import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {layoutGems,patternStrokes} from '../src/patterns.js';
import {addPolish} from '../src/jewel-art.js';
const pt=(x,y)=>({x,y});
const rich=s=>{s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;};
const make=(s,d)=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s).item;};
const all=d=>Array.from({length:144},(_,i)=>pt((i%12+.5)*100/12,(Math.floor(i/12)+.5)*100/12)).filter(p=>J.onMetal(p,d));
// One guest with a known taste and purse, so a single sale tests a single rule.
const buyer=(s,client,extra={})=>{const c={id:'buyer-'+s.nextId++,client,budget:100000,served:false,want:'ring',...extra};s.customers=[c];return c;};
const befriended=(s,id,p)=>{s.bonds[id]={p,lv:J.levelFor(p),last:null};return s;};
// A design of its own blank and kind for each number, so a run of sales never saturates one design.
const OPEN=J.TEMPLATES.filter(t=>!t.rank&&t.id!=='free').map(t=>t.id);
function piece(i=0,type=null,metal='silver'){const kind=type||['pendant','brooch','amulet'][Math.floor(i/OPEN.length)%3],blanks=type==='ring'?['oval','octagon','flower']:OPEN,d=J.makeDesign(kind,blanks[i%blanks.length],metal);
 d.gems=layoutGems(d,'solo',{kind:'amethyst',size:3});if(kind!=='ring')d.strokes=[{kind:'engrave',width:1,points:[pt(44,40),pt(48,44)]}];return d;}

test('friendship levels are steps of 3, 8, 15, 25 and 40 points, and their names agree with the resident',()=>{
 for(const [p,l]of[[0,0],[2,0],[3,1],[7,1],[8,2],[14,2],[15,3],[24,3],[25,4],[39,4],[40,5],[400,5]])assert.equal(J.levelFor(p),l,String(p));
 const s=P.newGame(1);assert.equal(J.bondLevel(s,'mira'),0);befriended(s,'mira',15);assert.equal(J.bondLevel(s,'mira'),3);assert.ok(J.privileged(s,'mira'));assert.ok(!J.privileged(s,'bren'));
 const mira=J.CLIENTS.find(p=>p.id==='mira'),bren=J.CLIENTS.find(p=>p.id==='bren');
 assert.deepEqual([0,1,2,5].map(l=>P.bondName(mira,l)),['Незнакомка','Знакомая','Постоянная гостья','Близкая подруга']);assert.deepEqual([0,1,2,5].map(l=>P.bondName(bren,l)),['Незнакомец','Знакомый','Постоянный гость','Близкий друг']);
});
test('a full sale gives one point from a fit of 60 and two from 80, a kind discount two, an order three; points never fall',()=>{
 const s=rich(P.newGame(2));let i=0;const sale=(client,policy,extra={})=>{const item=make(s,piece(i++)),c=buyer(s,client,extra),before=J.bondPoints(s,client),q=P.sell(s,item.id,c.id,policy);assert.ok(J.bondPoints(s,client)>=before,'never less');return {q,gained:J.bondPoints(s,client)-before};};
 const fits=[];for(const id of['mira','bren','ada','elin','rowan','sera','nora','daro','mira','bren']){const {q,gained}=sale(id,'fair');assert.ok(q.full);fits.push(q.fit);assert.equal(gained,q.fit>=80?2:q.fit>=60?1:0,`${id} fit ${q.fit}`);assert.equal(q.bond.points,gained);}
 assert.ok(fits.some(f=>f<60)&&fits.some(f=>f>=60),`both sides of the step are tested: ${fits}`);
 // A discount to a guest who cannot pay the fair price: two points «по-доброму»; to a rich guest: nothing.
 const kind=make(s,piece(i++)),poor=buyer(s,'sera');poor.budget=J.quote(s,kind,poor,'fair').fair-1;const before=J.bondPoints(s,'sera'),q=P.sell(s,kind.id,poor.id,'low');
 assert.equal(q.full,false);assert.equal(J.bondPoints(s,'sera')-before,2);assert.equal(q.bond.kind,true);
 const r=sale('sera','low');assert.equal(r.gained,0,'a discount to a full purse is not a kindness');
 // An order: three points and the memory of the piece.
 const req={id:'request-'+s.nextId++,client:'nora',type:'pendant',style:'symmetry',min:0,minMagic:0,title:'Подвеска',until:s.day+3,done:false};s.requests=[req];const done=make(s,piece(i++,'pendant'));
 const nora=J.bondPoints(s,'nora');P.deliver(s,req.id,done.id);assert.equal(J.bondPoints(s,'nora')-nora,3);assert.deepEqual(s.bonds.nora.last,{type:'pendant',name:done.design.name,day:s.day});
 // A saturated design brings nothing.
 const d=piece(60);for(let k=0;k<4;k++){const item=make(s,d),c=buyer(s,'daro');P.sell(s,item.id,c.id,'fair');}const tired=make(s,d),c=buyer(s,'bren'),b=J.bondPoints(s,'bren');assert.equal(P.sell(s,tired.id,c.id,'fair').demand.factor,.25);assert.equal(J.bondPoints(s,'bren'),b);
 assert.doesNotThrow(()=>P.load(J.serialize(s)));
});
test('each step is rewarded once: letters at 2, 3 and 5, a named order at 4, ten reputation and the mark at 5',()=>{
 const s=rich(P.newGame(3));let i=0;s.bonds.rowan={p:39,lv:0,last:null};const item=make(s,piece(i++,'ring')),c=buyer(s,'rowan',{want:'ring'}),rep=s.rep;
 const q=P.sell(s,item.id,c.id,'low');assert.equal(q.bond.points,0);
 // The points of a jump are rewarded step by step, even when several come at once.
 assert.deepEqual(q.steps.map(v=>v.level),[1,2,3,4]);assert.deepEqual(q.letters,['rowan-2','rowan-3']);assert.equal(q.named.length,1);assert.equal(s.bonds.rowan.lv,4);
 assert.deepEqual(s.mail.map(m=>m.id),['rowan-3','rowan-2']);assert.ok(s.mail.every(m=>m.read===false&&m.day===s.day));assert.equal(P.unread(s),2);
 const named=s.requests.find(r=>r.keep);assert.deepEqual({client:named.client,bond:named.bond,reward:named.reward,title:named.title,type:named.type},{client:'rowan',bond:'rowan',reward:1.6,title:'Кольцо для Лиды',type:'ring'});
 // The fifth step.
 const next=make(s,piece(i++,'ring')),d=buyer(s,'rowan',{want:'ring',budget:1});s.bonds.rowan.p=39;const fair=J.quote(s,next,d,'low');assert.ok(fair.price>1);
 d.budget=fair.fair-1;const r=P.sell(s,next.id,d.id,'low');assert.deepEqual(r.letters,['rowan-5']);assert.ok(r.marks.some(m=>m.id==='friend'));assert.equal(s.book.m.friend,s.day);assert.ok(r.rep>=10+3,'ten for the friend and three for the mark');
 assert.ok(s.rep-rep>=13);
 // Never twice: more points, a reload, and nothing new comes.
 for(let k=0;k<3;k++){const again=make(s,piece(i++,'ring')),e=buyer(s,'rowan',{want:'ring',budget:1});e.budget=J.quote(s,again,e,'low').fair-1;const x=P.sell(s,again.id,e.id,'low');assert.deepEqual([x.letters,x.steps,x.named],[[],[],[]]);}
 const back=P.load(J.serialize(s));assert.equal(back.mail.length,3);assert.equal(back.requests.filter(r=>r.keep).length,1);assert.equal(back.bonds.rowan.lv,5);
 assert.equal(P.readLetter(back,'rowan-2').sign,'Рован');assert.equal(back.mail.find(m=>m.id==='rowan-2').read,true);assert.equal(P.unread(back),2);
});
test('a named order has no deadline, takes no ordinary place, pays 60% over the fair price and survives a reload',()=>{
 const s=rich(P.newGame(4));s.bonds.mira={p:24,lv:3,last:null};const first=make(s,piece(0)),c=buyer(s,'mira',{want:'pendant',budget:1});c.budget=J.quote(s,first,c,'low').fair-1;
 const r=P.sell(s,first.id,c.id,'low');assert.equal(r.named.length,1);const named=r.named[0];assert.equal(named.title,'Кулон для брата Яна');
 for(let k=0;k<10;k++){P.nextDay(s);assert.ok(s.requests.some(r=>r.id===named.id),'day '+k);assert.ok(s.requests.filter(r=>!r.keep).length<=3);assert.equal(s.requests.filter(r=>!r.keep).length,s.requests.length-1);}
 assert.ok(s.requests.every(r=>r.keep||r.until>=s.day));const back=P.load(J.serialize(s));assert.deepEqual(back.requests,s.requests);
 // Мира's named pendant: restrained, with an awakened stone.
 const d=J.makeDesign('pendant','oval','silver');d.gems=layoutGems(d,'solo',{kind:'moonstone',size:3});d.strokes=patternStrokes(d,'runes');addPolish(d,all(d),.1);s.skills.push('alchemy');
 const item=make(s,d);assert.ok(J.matches(item.design,named),JSON.stringify(J.evaluate(item.design).style));const fair=J.quote(s,item,{id:'order',client:'mira',budget:100000,served:false}).fair,gold=s.gold;
 const done=P.deliver(s,named.id,item.id);assert.equal(done.reward,Math.round(fair*1.6));assert.equal(s.gold-gold,done.reward);assert.ok(s.requests.find(r=>r.id===named.id).done);
 P.nextDay(s);assert.ok(!s.requests.some(r=>r.id===named.id),'a finished named order leaves with the day');assert.ok(!s.requests.some(r=>r.keep),'and never comes again');
});
test('privileges only add: Ада and Сера at the supplier, Мира at the door, Элин, Брен and Рован on searches, Нора an order',()=>{
 const s=P.newGame(5);const plain=id=>(J.METALS[id]||J.GEMS[id]).price;
 for(const id of['copper','silver','gold','lunar','garnet','emerald','sapphire'])assert.equal(J.buyCost(s,id,10),plain(id)*10);
 befriended(s,'ada',15);for(const id of Object.keys(J.METALS))assert.equal(J.buyCost(s,id,10),Math.round(plain(id)*10*.9),id);for(const id of Object.keys(J.GEMS))assert.equal(J.buyCost(s,id,10),plain(id)*10,id);
 befriended(s,'sera',15);for(const id of Object.keys(J.GEMS))assert.equal(J.buyCost(s,id,10),Math.round(plain(id)*10*(['emerald','sapphire'].includes(id)?.85:1)),id);
 s.gold=1000;const gold=s.gold;P.buy(s,'silver',10);assert.equal(gold-s.gold,45,'the shop charges the discounted price');
 const d=J.makeDesign('pendant','oval','silver');d.gems=[{kind:'sapphire',x:50,y:49,size:3,cut:'round'}];s.materials.silver=0;s.materials.sapphire=0;
 assert.deepEqual(J.shortfall(s,d).map(v=>v.price),[J.buyCost(s,'silver',J.costs(d).resources.silver),J.buyCost(s,'sapphire',1)]);
 // Мира leaves a stone on every third morning: a garnet on even days, an amethyst on odd ones.
 const m=P.newGame(6);for(let k=0;k<12;k++){const before={...m.materials};assert.equal(P.nextDay(m).gift,null);assert.deepEqual(m.materials,before,'no gift before the third step');}
 befriended(m,'mira',15);for(let k=0;k<12;k++){const g=m.materials.garnet,a=m.materials.amethyst,prev=P.nextDay(m);const third=m.day%3===0;assert.equal(!!prev.gift,third,'day '+m.day);
  assert.equal(m.materials.garnet-g,third&&m.day%2===0?1:0);assert.equal(m.materials.amethyst-a,third&&m.day%2===1?1:0);}
 // Searches.
 const g=P.newGame(7);g.crafted=10;const before={...g.materials},shore=P.gather(g,'shore');assert.deepEqual(shore.extra,[]);assert.equal(g.materials[shore.gem]-before[shore.gem],1);
 const f=P.newGame(7);f.crafted=10;for(const id of['elin','bren','rowan'])befriended(f,id,15);const b2={...f.materials},sh=P.gather(f,'shore');assert.equal(f.materials[sh.gem]-b2[sh.gem],2,'Элин doubles the stone of the shore');assert.deepEqual(sh.extra,[{by:'elin',id:sh.gem,n:1}]);
 let b3={...f.materials};const ridge=P.gather(f,'ridge');assert.equal(f.materials.silver-b3.silver,3+2,'Брен: two more silver on the ridge');assert.deepEqual(ridge.extra,[{by:'bren',id:'silver',n:2}]);
 b3={...f.materials};P.gather(f,'garden');assert.equal(f.materials.copper-b3.copper,3+2,'Рован: two more copper in the garden');
 // Order places: three, four from «Старшина цеха», five with Нора.
 const o=P.newGame(8);o.requests=[];J.makeRequests(o);assert.equal(o.requests.length,3);befriended(o,'nora',15);o.requests=[];J.makeRequests(o);assert.equal(o.requests.length,4);o.rep=240;o.requests=[];J.makeRequests(o);assert.equal(o.requests.length,5);
 // Даро as a friend pays 15% more for a rich pattern or a ribbon, within the common ceiling.
 const r=rich(P.newGame(9)),brooch=J.makeDesign('brooch','oval','silver');brooch.gems=layoutGems(brooch,'halo',{kind:'garnet',size:3});brooch.strokes=patternStrokes(brooch,'filigree');
 const item=make(r,brooch);assert.ok(J.evaluate(item.design).style.ornate>=70);const daro={client:'daro',budget:100000,want:'brooch'},ada={...daro,client:'ada'},was=[J.quote(r,item,daro).fair,J.quote(r,item,ada).fair];befriended(r,'daro',15);
 assert.ok(Math.abs(J.quote(r,item,daro).fair-was[0]*1.15)<=1);assert.equal(J.quote(r,item,ada).fair,was[1],'only Даро pays more');
 const plainItem=make(r,piece(3));const p0=J.quote(r,plainItem,daro).fair;plainItem.ribbon={w:0,medal:1};assert.ok(Math.abs(J.quote(r,plainItem,daro).fair-p0*1.05*1.15)<=1,'a ribbon opens his purse too');
});
test('orders never pass eight: one ordinary and one named order a resident, two hundred random days and deliveries',()=>{
 const s=rich(P.newGame(10));s.rep=240;s.skills.push('mounts','gold');for(const p of J.CLIENTS)s.bonds[p.id]={p:24,lv:3,last:null};
 let seed=11;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
 const check=label=>{assert.ok(s.requests.length<=8,label);const per=new Map();for(const r of s.requests){const k=r.client+(r.keep?'+':'');per.set(k,(per.get(k)||0)+1);}assert.ok([...per.values()].every(n=>n===1),label+': one of each kind a resident');assert.ok(s.requests.filter(r=>!r.keep).length<=5,label);assert.doesNotThrow(()=>J.deserialize(J.serialize(s)),label);};
 // A kind discount on a blank of its own lifts a resident to the fourth step: the named order is placed or waits for room.
 const BLANKS=['oval','circle','drop','heart','leaf','diamond','shield','octagon'];
 const lift=k=>{const id=J.CLIENTS[k].id,d=J.makeDesign('pendant',BLANKS[k],'silver');d.gems=[{kind:'garnet',x:50,y:50,size:3,cut:'round'}];const item=make(s,d),g=buyer(s,id,{budget:1});g.budget=J.quote(s,item,g,'low').fair-1;P.sell(s,item.id,g.id,'low');};
 let delivered=0,waited=0;
 for(let step=0;step<200;step++){
  if(rnd()<.3){const k=Math.floor(rnd()*8);if(s.bonds[J.CLIENTS[k].id].lv<4){lift(k);if(s.bonds[J.CLIENTS[k].id].pending)waited++;}}
  const open=s.requests.filter(r=>!r.done);
  if(open.length&&rnd()<.4){const req=open[Math.floor(rnd()*open.length)];req.min=0;req.minMagic=0;const d=J.makeDesign(req.type,'oval','silver'),weapon=['sword','staff'].includes(req.type);if(weapon)d.gems=[{kind:'garnet',x:50,y:req.type==='sword'?75:24,size:2.5,cut:'round'}];else d.strokes=[{kind:'engrave',width:1,points:Array.from({length:6},(_,i)=>pt(30+i*(2+step%5),35+((i*7+step)%30)))}];
   const item=make(s,d);if(J.matches(item.design,req)&&J.demandInfo(s,item.design).factor===1){P.deliver(s,req.id,item.id);delivered++;}else J.recycle(s,item.id);}
  else P.nextDay(s);
  check('step '+step);}
 assert.ok(J.CLIENTS.every(p=>s.bonds[p.id].lv>=4),'everyone reached the fourth step');assert.ok(delivered>=20,`delivered ${delivered}`);assert.ok(waited>0,'some named orders had to wait for room');
 assert.ok(!J.CLIENTS.some(p=>s.bonds[p.id].pending)||s.requests.length===8,'a waiting order waits only for a full list');
});
test('normalize keeps friendship, letters and orders sound and never hands a reward twice',()=>{
 const s=P.newGame(12),raw=JSON.parse(J.serialize(s));
 raw.bonds={mira:{p:16,lv:9,last:{type:'ring',name:'Кольцо',day:3}},bren:{p:-4,last:{type:'nope',name:'x',day:1}},ghost:{p:40},ada:'x',elin:{p:30,pending:true,last:{type:'pendant',name:'x'.repeat(60),day:2}},sera:{p:26,lv:2,pending:'yes'}};
 raw.mail=[{id:'rowan-2',day:4,read:true},{id:'rowan-2',day:5},{id:'ghost-2',day:1},null,{id:'elin-epilogue',day:'x',read:1}];
 const back=P.load(JSON.stringify(raw));
 assert.deepEqual(back.bonds,{mira:{p:16,lv:3,last:{type:'ring',name:'Кольцо',day:3}},bren:{p:0,lv:0,last:null},elin:{p:30,lv:4,last:null,pending:true},sera:{p:26,lv:2,last:null}});
 assert.deepEqual(back.mail,[{id:'rowan-2',day:4,read:true},{id:'elin-epilogue',day:0,read:false}]);assert.deepEqual(P.normalize(J.clone(back)),back,'repair is idempotent');
 // A named order already on the list is not waited for a second time.
 const w=JSON.parse(J.serialize(P.newGame(16)));w.bonds={nora:{p:30,lv:4,last:null,pending:true},ada:{p:30,lv:4,last:null,pending:true}};w.requests=[{client:'nora',...P.NAMED.nora,id:'request-950',keep:true,bond:'nora',reward:1.6,until:w.day,done:false}];
 const wb=P.load(JSON.stringify(w));assert.equal('pending'in wb.bonds.nora,false);assert.equal(wb.bonds.ada.pending,true);
 // A file with too many orders: finished ones go first, a resident keeps one ordinary and one named order.
 const o=P.newGame(13),base={client:'mira',type:'pendant',style:'minimal',min:10,minMagic:0,title:'Заказ',until:o.day+3,done:false};let n=900;const req=extra=>({...base,id:'request-'+n++,...extra});
 o.requests=[req({client:'mira'}),req({client:'mira'}),req({client:'mira',keep:true,bond:'mira',reward:1.6}),req({client:'mira',keep:true,bond:'mira',reward:1.6}),req({client:'bren',done:true}),req({client:'ada'}),req({client:'elin',keep:'x',reward:1000}),req({client:'rowan',keep:false,bond:'rowan',reward:1.6}),
  req({client:'sera'}),req({client:'nora'}),req({client:'daro'}),req({client:'bren',keep:true,bond:'ghost',reward:1.6}),req({client:'ada',keep:true,bond:'ada',reward:1.6})];
 P.normalize(o);assert.equal(o.requests.length,8);assert.ok(!o.requests.some(r=>r.done),'the finished order went first');
 assert.equal(o.requests.filter(r=>r.client==='mira').length,2);assert.deepEqual(o.requests.find(r=>r.client==='elin'),{...base,client:'elin',id:o.requests.find(r=>r.client==='elin').id,reward:1.15});
 const named=o.requests.filter(r=>r.keep);assert.ok(named.every(r=>r.reward===1.6));assert.equal('bond'in(o.requests.find(r=>r.client==='bren'&&r.keep)||{}),false);
 assert.doesNotThrow(()=>J.deserialize(J.serialize(o)));assert.deepEqual(P.normalize(J.clone(o)),o);
});
test('twenty-four letters, Даро\'s first and Элин\'s epilogue: two to four sentences of the port, without modern words',()=>{
 assert.equal(P.LETTER_IDS.length,26);for(const p of J.CLIENTS)for(const l of[2,3,5])assert.ok(P.letter(`${p.id}-${l}`),`${p.id}-${l}`);assert.ok(P.letter('daro-0')&&P.letter('elin-epilogue'));assert.equal(P.letter('nope-2'),null);
 for(const id of P.LETTER_IDS){const {text,sign}=P.letter(id),n=text.split(/(?<=[.?…])\s+/).length;assert.ok(n>=2&&n<=4,`${id}: ${n} sentences`);assert.ok(sign.length>1&&sign.length<=40);assert.doesNotMatch(text,/!|окей|проблем|ресурс|бонус|шанс/i,id);}
 assert.equal(P.letter('rowan-2').text,'Не смейся, мастер. Третий год хожу мимо мельницы и не решаюсь. Лида любит, когда металл тёплый. Если однажды сделаешь простое кольцо — я пойму, что пора.');
 // The help of a search names its place as the map does, with a capital letter.
 for(const [id,place]of[['bren','Лунном кряже'],['elin','Берегу'],['rowan','Саду аббатства']])assert.ok(P.PRIVILEGES[id].includes(place),id);
 for(const p of J.CLIENTS){assert.ok(P.PRIVILEGES[p.id]&&P.NAMED[p.id]&&P.MEMORY[p.id].length===2,p.id);const t=P.NAMED[p.id];assert.ok(J.TYPES.some(x=>x.id===t.type)&&t.title.length<=80&&t.min>=0&&t.min<=100);}
});
test('residents remember a piece with the right gender and speak of themselves only from the second step',()=>{
 assert.deepEqual(P.TYPE_PHRASE,{pendant:'Тот кулон',ring:'То кольцо',brooch:'Та брошь',amulet:'Тот амулет',sword:'Та сабля',staff:'То навершие'});
 assert.equal(P.lastLine({type:'ring',name:'Тихий свет',day:12}),'То кольцо «Тихий свет» со мной с 12-го дня.');assert.equal(P.lastLine({type:'brooch',name:'Брошь',day:3}),'Та брошь со мной с 3-го дня.');
 assert.equal(P.lastLine({type:'amulet',name:'Магический амулет',day:5}),'Тот амулет со мной с 5-го дня.');
 const s=P.newGame(14);s.day=10;assert.equal(P.memoryLine(s,'mira'),null,'a stranger says nothing of their own');
 s.bonds.mira={p:3,lv:1,last:{type:'ring',name:'Луч',day:10}};assert.equal(P.memoryLine(s,'mira'),null,'not on the day of the purchase');s.day=11;assert.equal(P.memoryLine(s,'mira'),'То кольцо «Луч» со мной с 10-го дня.');
 s.bonds.mira.p=8;const lines=new Set();for(let d=11;d<23;d++){s.day=d;lines.add(P.memoryLine(s,'mira'));}assert.ok(P.MEMORY.mira.every(l=>lines.has(l)),'both phrases of her own come on their days');assert.ok(lines.has('То кольцо «Луч» со мной с 10-го дня.'));
});
test('the highest rank lights the lighthouse with Элин\'s letter, once',()=>{
 const s=rich(P.newGame(15)),item=make(s,piece(0));s.rep=749;s.rankSeen=4;const c=buyer(s,'ada'),r=P.sell(s,item.id,c.id,'fair');
 assert.ok(r.rankUp&&J.rankOf(s)===5);assert.ok(r.letters.includes('elin-epilogue'));assert.equal(P.letter('elin-epilogue').from,'elin');
 const again=P.sell(s,make(s,piece(1)).id,buyer(s,'ada').id,'fair');assert.ok(!again.letters.includes('elin-epilogue'));assert.equal(s.mail.filter(m=>m.id==='elin-epilogue').length,1);
});
