import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import {addPolish} from '../src/jewel-art.js';
import * as Forge from '../src/game.js';
const pt=(x,y)=>({x,y});
const gem=(kind='amethyst',x=50,y=49)=>({kind,x,y,size:3,cut:'round'});
function design(type='pendant',template='oval',metal='copper'){
 const d=J.makeDesign(type,template,metal);if(type!=='ring')d.gems.push(gem());
 d.strokes.push({kind:'engrave',width:1,points:type==='ring'?[pt(40,27),pt(50,23),pt(60,27)]:[pt(39,38),pt(42,52),pt(48,60)]});return d;
}
function stock(s,d=design()){s.draft={design:J.clone(d),undo:[],redo:[]};return J.complete(s);}
function sellOne(s,d=design(),policy='fair'){if(!s.customers.some(c=>!c.served))J.nextDay(s);const item=stock(s,d),buyer=s.customers.find(c=>!c.served);return J.sell(s,item.id,buyer.id,policy);}
function rich(s){s.gold=100000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;}

test('free contour, cutouts, engraving and stones survive completion and a JSON roundtrip exactly',()=>{
 const s=J.newGame(4);J.startDesign(s,'amulet','free','silver');const d=s.draft.design;d.name='Мой морской амулет';d.outline=[pt(30,20),pt(64,24),pt(72,59),pt(52,79),pt(25,52)];d.holes=[[pt(44,62),pt(51,62),pt(49,69)]];d.gems=[gem('garnet',45,42)];d.strokes=[{kind:'rune',width:1.5,points:[pt(34,32),pt(42,37),pt(45,42)]}];addPolish(d,[pt(40,40),pt(46,46)],11);
 const expected=J.clone(d),before=J.clone(s.materials),cost=J.costs(d);const item=J.complete(s),restored=J.deserialize(J.serialize(s));assert.deepEqual(item.design,expected);assert.deepEqual(restored.stock[0].design,expected);assert.equal(restored.draft,null);for(const[id,n]of Object.entries(cost.resources))assert.equal(s.materials[id],before[id]-n);assert.ok(J.evaluate(restored.stock[0].design).magic>0);
});
test('undo and redo restore strokes, contours and stones after reload without spending materials',()=>{
 const s=J.newGame(5);J.startDesign(s);const before=J.clone(s.materials),base=J.clone(s.draft.design),d=design();J.edit(s,d);const edited=J.clone(s.draft.design);const reloaded=J.deserialize(J.serialize(s));J.undo(reloaded);assert.deepEqual(reloaded.draft.design,base);J.undo(reloaded,true);assert.deepEqual(reloaded.draft.design,edited);assert.deepEqual(reloaded.materials,before);
});
test('failed completion is atomic for self intersections, overlapping stones and resources',()=>{
 for(const mutate of [d=>{d.outline=[pt(20,20),pt(80,80),pt(20,80),pt(80,20)];},d=>d.gems.push(gem(),gem()),d=>{d.gems=[gem('diamond')];}]){const s=J.newGame();J.startDesign(s);mutate(s.draft.design);const raw=J.serialize(s);assert.throws(()=>J.complete(s),J.AtelierError);assert.equal(J.serialize(s),raw);}
 const s=J.newGame();J.startDesign(s);s.draft.design.gems=[gem()];s.materials.copper=0;const raw=J.serialize(s);assert.throws(()=>J.complete(s),/материалов/);assert.equal(J.serialize(s),raw);
});
test('a cutout may not cross the outside edge or another cutout',()=>{
 const d=design();d.holes=[[pt(10,20),pt(60,20),pt(50,60)]];assert.throws(()=>J.validateDesign(d,true),/Вырез/);d.holes=[[pt(40,40),pt(55,40),pt(48,56)],[pt(41,42),pt(56,42),pt(49,58)]];assert.throws(()=>J.validateDesign(d,true),/Вырезы/);
});
test('a gem in empty space cannot be completed or awaken a rune',()=>{
 const d=design();d.gems=[gem('amethyst',12,12)];d.strokes=[{kind:'rune',width:1,points:[pt(10,10),pt(12,12),pt(13,13)]}];assert.equal(J.evaluate(d).magic,0);assert.throws(()=>J.validateDesign(d,true),/Камень/);
});
test('magic requires a supported gem connected to a rune, rather than plain engraving',()=>{
 const d=design();assert.equal(J.evaluate(d).magic,0);d.strokes.push({kind:'rune',width:1,points:[pt(32,30),pt(40,36),pt(48,46)]});assert.ok(J.evaluate(d).magic>0);assert.equal(J.evaluate(d).effects.ward,12);d.strokes[1].kind='engrave';assert.equal(J.evaluate(d).magic,0);
});
test('polishing actual metal improves craftsmanship and cutouts cannot inflate coverage',()=>{
 const d=design('ring');const original=J.evaluate(d);addPolish(d,[pt(50,50)],7);assert.equal(J.evaluate(d).polish,0);addPolish(d,[pt(50,50)],60);const e=J.evaluate(d);assert.equal(e.polish,100);assert.equal(e.craft-original.craft,28);
});
test('adding redundant contour vertices does not fake an organic artistic style',()=>{
 const d=J.makeDesign('pendant','diamond');const score=J.evaluate(d).style.organic;const out=[];for(let i=0;i<d.outline.length;i++){const a=d.outline[i],b=d.outline[(i+1)%d.outline.length];for(let j=0;j<12;j++)out.push(pt(a.x+(b.x-a.x)*j/12,a.y+(b.y-a.y)*j/12));}d.outline=out;assert.equal(J.evaluate(d).style.organic,score);assert.ok(J.evaluate(J.makeDesign('pendant','leaf')).style.organic>score);
});
test('buyers value their own artistic style and materials',()=>{
 const d=J.makeDesign('pendant','oval','silver'),minimal=J.CLIENTS.find(p=>p.id==='mira'),ornate=J.CLIENTS.find(p=>p.id==='ada');assert.ok(J.affinity(d,minimal)>J.affinity(d,ornate));const silver=J.affinity(d,minimal);d.metal='gold';assert.ok(J.affinity(d,minimal)<silver);
});
test('four full-price sales are followed by a 75% demand penalty on the fifth',()=>{
 const s=rich(J.newGame(13)),d=design();for(let i=0;i<3;i++){const q=sellOne(s,d);assert.equal(q.demand.factor,1);assert.equal(J.demandInfo(s,d).sales,i+1);assert.equal(J.demandInfo(s,d).remaining,0);}const q4=sellOne(s,d);assert.equal(q4.demand.factor,1);assert.equal(q4.saturated,true);const info=J.demandInfo(s,d);assert.equal(info.factor,.25);assert.equal(info.remaining,7);const q5=sellOne(s,d);assert.equal(q5.demand.factor,.25);assert.equal(q5.price,Math.round(q5.fair*.25));
});
test('discount sales do not consume a full-price sale; a rejected price spends nothing',()=>{
 const s=rich(J.newGame(4)),d=design();sellOne(s,d,'low');assert.equal(J.demandInfo(s,d).sales,0);const i=stock(s,d),buyer=s.customers.find(c=>!c.served);buyer.budget=0;const raw=J.serialize(s);assert.throws(()=>J.sell(s,i.id,buyer.id,'high'));assert.equal(J.serialize(s),raw);
});
test('rename, metal, color, tiny edits and reflected or scaled copies retain saturated demand',()=>{
 const s=rich(J.newGame(9)),d=design();for(let i=0;i<4;i++)sellOne(s,d);const variants=[];
 const rename=J.clone(d);rename.name='Абсолютно новое название';rename.metal='silver';rename.gems[0].kind='garnet';rename.polish=[0,1,2];rename.strokes[0].width=4;variants.push(rename);
 const tiny=J.clone(d);tiny.outline[0].x+=.2;tiny.strokes[0].points[0].x+=.1;variants.push(tiny);
 for(const transform of [p=>({...p,x:100-p.x}),p=>({...p,x:p.x*.8+5,y:p.y*.8+4})]){const v=J.clone(d);v.outline=v.outline.map(transform);v.holes=v.holes.map(h=>h.map(transform));v.gems=v.gems.map(transform);v.strokes=v.strokes.map(l=>({...l,points:l.points.map(transform)}));variants.push(v);}
 for(const v of variants)assert.equal(J.demandInfo(s,v).factor,.25);
 const reloaded=J.deserialize(J.serialize(s));assert.equal(J.demandInfo(reloaded,rename).factor,.25);
});
test('a substantially different shape or composition receives fresh demand',()=>{
 const s=rich(J.newGame()),d=design();for(let i=0;i<4;i++)sellOne(s,d);assert.equal(J.demandInfo(s,design('ring')).factor,1);const fresh=design('pendant','diamond');fresh.gems=[gem('garnet',50,23),gem('garnet',50,72)];fresh.strokes[0].points=[pt(50,34),pt(63,49),pt(50,64)];assert.ok(J.similarity(J.fingerprint(d),J.fingerprint(fresh))<.9);assert.equal(J.demandInfo(s,fresh).factor,1);
});
test('cooldown survives seven idle days and recovers after seven actual trading days',()=>{
 const s=rich(J.newGame(18)),d=design();for(let i=0;i<4;i++)sellOne(s,d);J.nextDay(s);assert.equal(J.demandInfo(s,d).remaining,6);for(let i=0;i<7;i++)J.nextDay(s);assert.equal(J.demandInfo(s,d).remaining,6);for(let i=0;i<6;i++){sellOne(s,design('ring'));J.nextDay(s);}assert.equal(J.demandInfo(s,d).factor,1);assert.equal(J.demandInfo(s,d).sales,0);sellOne(s,d);assert.equal(J.demandInfo(s,d).sales,1);
});
test('personal orders share the same demand ledger and cannot bypass saturation',()=>{
 const s=rich(J.newGame()),d=design(),r={id:'request-'+s.nextId++,client:'nora',type:'pendant',style:'organic',min:45,minMagic:0,title:'Капля',until:s.day+3,done:false};s.requests.push(r);for(let i=0;i<3;i++)sellOne(s,d);const i=stock(s,d);assert.equal(J.matches(d,r),true);J.deliver(s,r.id,i.id);assert.equal(J.demandInfo(s,d).factor,.25);const item=stock(s,d);r.done=false;const raw=J.serialize(s);assert.throws(()=>J.deliver(s,r.id,item.id),/перенасыщен/);assert.equal(J.serialize(s),raw);
});
test('model library preserves independent designs and restoring creates an editable copy',()=>{
 const s=J.newGame();const item=stock(s),m=J.rememberItem(s,item.id);J.restoreModel(s,m.id);const next=J.clone(s.draft.design);next.name='Другой рисунок';J.edit(s,next);assert.notEqual(s.library[0].design.name,s.draft.design.name);assert.deepEqual(s.library[0].design,item.design);
});
test('skill progression consumes coins but retains experience and protects gated forms',()=>{
 const s=J.newGame();assert.throws(()=>J.startDesign(s,'sword'));s.xp=100;J.learn(s,'gold');assert.equal(s.xp,100);assert.equal(s.gold,115);J.learn(s,'mounts');J.startDesign(s,'sword');assert.equal(s.draft.design.type,'sword');assert.throws(()=>J.buy(s,'moonstone'));
});
test('large and fancy gemstones need the facets skill regardless of editor width',()=>{
 const s=rich(J.newGame());J.startDesign(s);s.draft.design.gems=[{...gem(),cut:'pear'}];assert.throws(()=>J.complete(s),/огранки/);s.skills.push('facets');assert.doesNotThrow(()=>J.complete(s));
});
test('empty purse can recover through gathering and map unlocks advance with creations',()=>{
 const s=J.newGame();s.gold=0;for(const id of Object.keys(s.materials))s.materials[id]=0;const found=J.gather(s,'shore');assert.equal(s.materials[found.gem],1);assert.equal(s.materials.copper,3);assert.throws(()=>J.gather(s,'shore'));assert.throws(()=>J.gather(s,'garden'));J.startDesign(s,'pendant','diamond');s.draft.design.outline=[pt(43,41),pt(57,41),pt(57,59),pt(43,59)];const item=J.complete(s);assert.equal(J.costs(item.design).resources.copper,1);assert.ok(J.sell(s,item.id,s.customers[0].id).price>0);J.nextDay(s);assert.equal(s.energy,4);
});
test('corrupt imported state cannot introduce duplicate stock or malformed drawing history',()=>{
 const s=J.newGame();stock(s);const duplicate=J.clone(s);duplicate.stock.push(J.clone(duplicate.stock[0]));assert.throws(()=>J.deserialize(J.serialize(duplicate)),/Повторяющиеся/);J.startDesign(s);s.draft.undo=[{outline:null}];assert.throws(()=>J.deserialize(J.serialize(s)));assert.throws(()=>J.deserialize('{broken'));
});
test('import normalizes stale item counters to avoid generating duplicate ids',()=>{
 const s=J.newGame();stock(s);s.nextId=1;const imported=J.deserialize(J.serialize(s)),first=imported.stock[0].id,second=stock(imported).id;assert.notEqual(first,second);assert.doesNotThrow(()=>J.deserialize(J.serialize(imported)));
});
test('forge migration preserves the original archive, coins, materials and unfinished work',()=>{
 const old=Forge.newGame(4);old.gold=100;old.resources.iron=30;old.resources.copper=12;old.resources.crystal=4;old.resources.moon=2;Forge.beginWork(old,'lantern');const raw=Forge.serialize(old),s=J.deserialize(raw);assert.deepEqual(s.legacy,JSON.parse(raw));assert.equal(s.world,'jewel');assert.equal(s.materials.copper,50+30+12);assert.equal(s.materials.amethyst,2+4);assert.equal(s.materials.silver,16+4);assert.equal(s.gold,100);assert.doesNotThrow(()=>J.deserialize(J.serialize(s)));
});
test('collecting several sets of stock, models and edits cannot share mutable geometry',()=>{
 const s=rich(J.newGame());const i=stock(s),model=J.rememberItem(s,i.id);J.restoreModel(s,model.id);s.draft.design.outline[0].x=88;assert.notEqual(i.design.outline[0].x,88);assert.notEqual(model.design.outline[0].x,88);
});
test('unchanged blanks and renamed blanks cannot be sold as handcrafted work',()=>{
 const s=J.newGame();J.startDesign(s);s.draft.design.name='Мастерская работа';const raw=J.serialize(s);assert.equal(J.hasHandwork(s.draft.design),false);assert.throws(()=>J.complete(s),/заготовка/);assert.equal(J.serialize(s),raw);s.draft.design.outline[0].x+=1;assert.equal(J.hasHandwork(s.draft.design),true);assert.doesNotThrow(()=>J.complete(s));
});
test('all eight residents can request accessible jewelry, with magic shown as a real requirement',()=>{
 const people=new Set();let magicOrders=0;for(let seed=1;seed<=40;seed++){const s=J.newGame(seed);assert.equal(s.requests.length,3);assert.equal(new Set(s.requests.map(r=>r.client)).size,3);for(const r of s.requests){people.add(r.client);assert.equal(J.typeAvailable(s,r.type),true);if(r.minMagic)magicOrders++;}assert.doesNotThrow(()=>J.deserialize(J.serialize(s)));}assert.equal(people.size,8);assert.ok(magicOrders>0);
});
test('an otherwise suitable amulet cannot complete a magical order without an awakened gem',()=>{
 const d=design('amulet','oval','silver'),r={type:'amulet',style:'contrast',min:35,minMagic:8};assert.equal(J.matches(d,r),false);d.strokes.push({kind:'rune',width:1,points:[pt(35,35),pt(43,43),pt(48,48)]});assert.equal(J.matches(d,r),true);
});
test('hidden engraving outside the current metal shape cannot inflate artistic style or craftsmanship',()=>{
 const s=J.newGame();J.startDesign(s);const d=s.draft.design,before=J.evaluate(d);d.strokes=[{kind:'engrave',width:3,points:[pt(1,2),pt(3,90),pt(8,1)]}];assert.equal(J.evaluate(d).style.ornate,before.style.ornate);assert.equal(J.evaluate(d).craft,before.craft);assert.equal(J.hasHandwork(d),false);assert.throws(()=>J.complete(s),/заготовка/);
});
test('finished designs are frozen; assessment and fingerprint match an unfrozen copy',()=>{
 const s=rich(J.newGame(31)),item=stock(s);assert.ok(Object.isFrozen(item.design)&&Object.isFrozen(item.design.outline[0])&&Object.isFrozen(item.design.strokes[0].points)&&Object.isFrozen(item.design.gems[0])&&Object.isFrozen(item.design.polish));
 assert.throws(()=>{item.design.outline[0].x=1;},TypeError);assert.throws(()=>{item.design.gems.push(gem());},TypeError);
 const copy=J.clone(item.design);assert.equal(Object.isFrozen(copy),false);assert.deepEqual(J.evaluate(item.design),J.evaluate(copy));assert.deepEqual(J.fingerprint(item.design),J.fingerprint(copy));
 assert.equal(J.evaluate(item.design),J.evaluate(item.design),'cached by identity');assert.ok(Object.isFrozen(J.evaluate(item.design).style));
 const model=J.rememberItem(s,item.id);assert.ok(Object.isFrozen(model.design));J.restoreModel(s,model.id);assert.equal(Object.isFrozen(s.draft.design),false,'drafts stay editable');
 const before=J.tally.evaluate;for(let i=0;i<20;i++){J.evaluate(item.design);J.affinity(item.design,J.CLIENTS[i%8]);}assert.equal(J.tally.evaluate,before);
});
test('loading freezes showcase and library designs but not the draft and its history',()=>{
 const s=rich(J.newGame(32));const item=stock(s);J.rememberItem(s,item.id);J.startDesign(s);J.edit(s,design());const back=J.deserialize(J.serialize(s));
 assert.ok(Object.isFrozen(back.stock[0].design)&&Object.isFrozen(back.library[0].design));assert.equal(Object.isFrozen(back.draft.design),false);assert.equal(Object.isFrozen(back.draft.undo[0]),false);
 assert.doesNotThrow(()=>{back.draft.design.outline[0].x+=1;});
});
test('a design is fresh until its family is first sold; the first sale reports a new family',()=>{
 const s=rich(J.newGame(33)),d=design(),a=stock(s,d),b=stock(s,d),other=design('pendant','diamond');other.gems=[gem('garnet',50,23),gem('garnet',50,72)];other.strokes[0].points=[pt(50,34),pt(63,49),pt(50,64)];const c=stock(s,other);
 assert.equal(J.isFresh(s,a.design),true);const buyer=()=>{if(!s.customers.some(c=>!c.served))J.nextDay(s);return s.customers.find(c=>!c.served).id;};
 assert.equal(J.sell(s,a.id,buyer()).freshFamily,true);assert.equal(J.isFresh(s,b.design),false);assert.equal(J.isFresh(s,c.design),true,'a different shape is still fresh');
 assert.equal(J.sell(s,b.id,buyer()).freshFamily,false);assert.equal(J.sell(s,c.id,buyer()).freshFamily,true);
});
test('all price policies from one appraisal equal separate quotes',()=>{
 const s=rich(J.newGame(34));s.skills.push('eye');const item=stock(s);for(const c of s.customers){const all=J.quotes(s,item,c);for(const p of J.POLICIES)assert.deepEqual(all[p],J.quote(s,item,c,p));}
 s.demand.push({signature:J.fingerprint(item.design),sales:4,until:s.tradeDay+7});const c=s.customers[0];assert.deepEqual(J.quotes(s,item,c).fair,J.quote(s,item,c,'fair'));assert.equal(J.quotes(s,item,c).low.demand.factor,.25);
});
test('the demand family of a finished design is cached and compares only new ledger entries',()=>{
 const s=rich(J.newGame(35)),item=stock(s),fp=J.fingerprint(item.design);const filler=n=>Array.from({length:n},(_,i)=>({signature:{...fp,shape:fp.shape.map((v,k)=>(k*7+i)%3?v:1-v)},sales:0,until:0}));
 s.demand.push(...filler(50));let n=J.tally.similarity;J.demandInfo(s,item.design);assert.equal(J.tally.similarity-n,50);
 n=J.tally.similarity;J.demandInfo(s,item.design);J.isFresh(s,item.design);assert.equal(J.tally.similarity,n,'nothing new to compare');
 s.demand.push(...filler(3));n=J.tally.similarity;J.demandInfo(s,item.design);assert.equal(J.tally.similarity-n,3,'only the new entries');
 s.demand.push({signature:J.clone(fp),sales:4,until:s.tradeDay+7});assert.equal(J.demandInfo(s,item.design).factor,.25);
 s.demand=s.demand.filter(f=>f.until===0);assert.equal(J.demandInfo(s,item.design).factor,1,'a removed family is noticed');
 s.demand.push({signature:{...fp,type:'ring'},sales:0,until:0});n=J.tally.similarity;J.demandInfo(s,item.design);assert.equal(J.tally.similarity,n,'other kinds are skipped without comparison');
});
test('cached demand answers match a full scan through a long random game',()=>{
 const s=rich(J.newGame(36));let seed=5;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
 const shapes=['oval','leaf','heart','diamond','drop','shield'].map((t,i)=>{const d=J.makeDesign(['pendant','brooch','amulet'][i%3],t,'copper');d.gems=[gem('garnet',50,48)];d.strokes=[{kind:'engrave',width:1,points:[pt(42,40+i),pt(50,52),pt(58,40+i)]}];return d;});
 for(let step=0;step<160;step++){
  const roll=rnd();if(roll<.55){const d=J.clone(shapes[Math.floor(rnd()*shapes.length)]);if(!s.customers.some(c=>!c.served))J.nextDay(s);const item=stock(s,d);J.sell(s,item.id,s.customers.find(c=>!c.served).id,rnd()<.8?'fair':'low');}
  else if(roll<.8)J.nextDay(s);else stock(s,J.clone(shapes[Math.floor(rnd()*shapes.length)]));
  for(const i of s.stock.slice(0,6))assert.deepEqual(J.demandInfo(s,i.design),J.demandInfo(s,J.clone(i.design)),'step '+step);
 }
});
// The design-family comparison as originally written; the packed version must give the very same numbers.
function referenceSimilarity(a,b){
 if(a.type!==b.type)return 0;let best=0;
 for(const [flipX,flipY]of[[false,false],[true,false],[false,true],[true,true]]){let score=1;for(const [key,weight,floor]of[['shape',.45,20],['ink',.25,20],['gems',.25,4],['runes',.05,15]]){
  let diff=0,union=0;const size=Math.sqrt(a[key].length),left=a[key],right=b[key].map((_,i)=>{const x=i%size,y=Math.floor(i/size);return b[key][(flipY?size-1-y:y)*size+(flipX?size-1-x:x)];});
  const near=(cells,i)=>{const x=i%size,y=Math.floor(i/size);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<size&&y+dy>=0&&y+dy<size&&cells[(y+dy)*size+x+dx])return true;return false;};
  for(let i=0;i<left.length;i++){union+=left[i]||right[i]?1:0;if(key==='shape')diff+=left[i]!==right[i]?1:0;else diff+=(left[i]&&!near(right,i)?1:0)+(right[i]&&!near(left,i)?1:0);}
  score-=weight*diff/Math.max(floor,union);}best=Math.max(best,score);}return best;
}
test('the packed design comparison equals the original one exactly',async()=>{
 const {readFileSync}=await import('node:fs'),{gunzipSync}=await import('node:zlib');
 const s=J.deserialize(gunzipSync(readFileSync(new URL('./fixtures/v3-dense.json.gz',import.meta.url))).toString());let same=0;
 for(const i of s.stock.slice(0,24)){const fp=J.fingerprint(i.design);for(const f of s.demand){if(f.signature.type===fp.type)same++;assert.equal(J.similarity(fp,f.signature),referenceSimilarity(fp,f.signature));}}assert.ok(same>500);
 let seed=17;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
 const random=()=>{const density=[.02,.1,.3,.6,.95][Math.floor(rnd()*5)],cells=n=>Array.from({length:n},(_,i)=>rnd()<density||(i%17===0&&rnd()<.5)?1:0);return {type:'ring',shape:cells(256),ink:cells(144),runes:cells(144),gems:cells(144)};};
 const mirror=f=>{const m=(cells,size)=>cells.map((_,i)=>cells[Math.floor(i/size)*size+size-1-i%size]);return {...f,shape:m(f.shape,16),ink:m(f.ink,12),runes:m(f.runes,12),gems:m(f.gems,12)};};
 for(let i=0;i<400;i++){const a=random(),b=rnd()<.2?mirror(a):random();assert.equal(J.similarity(a,b),referenceSimilarity(a,b));assert.equal(J.similarity(b,a),referenceSimilarity(b,a));}
 const a=random();assert.equal(J.similarity(a,mirror(a)),1);assert.equal(J.similarity(a,{...a,type:'pendant'}),0);
});
test('craftsmanship multiplies the price: polishing a gold pendant with a diamond from craft 62 to 90 adds at least a fifth',()=>{
 const s=J.newGame(40);s.skills.push('gold','signature');const rough=J.makeDesign('pendant','oval','gold');rough.gems.push(gem('diamond'));const fine=J.clone(rough);addPolish(fine,Array.from({length:144},(_,i)=>pt((i%12+.5)*100/12,(Math.floor(i/12)+.5)*100/12)),.1);
 assert.equal(J.evaluate(rough).craft,62);assert.equal(J.evaluate(fine).craft,90);assert.ok(J.value(s,fine)>=J.value(s,rough)*1.2,`${J.value(s,rough)} → ${J.value(s,fine)}`);
 assert.equal(J.craftMultiplier({craft:0}),.7);assert.equal(J.craftMultiplier({craft:50}),1);assert.ok(Math.abs(J.craftMultiplier({craft:75})-1.15)<1e-9);
});
test('two sales below 95% of the fair price count as one full sale and the half survives a reload',()=>{
 const s=rich(J.newGame(41)),d=design();sellOne(s,d,'low');assert.deepEqual([J.demandInfo(s,d).sales,J.demandInfo(s,d).soft],[0,1]);
 const back=J.deserialize(J.serialize(s));assert.equal(J.demandInfo(back,d).soft,1);
 sellOne(back,d,'low');assert.deepEqual([J.demandInfo(back,d).sales,J.demandInfo(back,d).soft],[1,0]);
 for(let i=0;i<6;i++)sellOne(back,d,'low');assert.equal(J.demandInfo(back,d).factor,.25,'eight discounted sales saturate like four full ones');
});
test('a design stays new to the port until its first full sale',()=>{
 const s=rich(J.newGame(42)),d=design();const cheap=sellOne(s,d,'low');assert.equal(cheap.freshFamily,false);assert.equal(J.isFresh(s,d),true,'a discount keeps the novelty');
 const full=sellOne(s,d,'fair');assert.equal(full.freshFamily,true);assert.equal(J.isFresh(s,d),false);assert.equal(sellOne(s,d,'fair').freshFamily,false);
 const old=rich(J.newGame(43)),fp=J.fingerprint(d);old.demand.push({signature:fp,sales:1,until:0});assert.equal(J.isFresh(old,d),false,'an old entry with a counted sale was a full sale');
 old.demand[0]={signature:fp,sales:0,until:0};assert.equal(J.isFresh(old,d),true,'an old entry without counted sales was a discount');
});
test('the shortfall lists missing metal and stones at the supplier price, without the coins of a weapon base',()=>{
 const s=J.newGame(44);s.skills.push('gold','mounts');const d=design('pendant','oval','silver');d.gems.push(gem('garnet',50,30),gem('garnet',50,68));const c=J.costs(d);
 for(const id of Object.keys(s.materials))s.materials[id]=1000;assert.deepEqual(J.shortfall(s,d),[]);
 s.materials.silver=2;s.materials.garnet=0;s.materials.amethyst=1;assert.deepEqual(J.shortfall(s,d),[{id:'silver',need:c.resources.silver,have:2,price:(c.resources.silver-2)*5},{id:'garnet',need:2,have:0,price:14}]);
 const sword=J.makeDesign('sword','oval','gold');sword.gems.push(gem('garnet',50,75));s.materials.gold=0;const list=J.shortfall(s,sword);assert.equal(J.costs(sword).coins,25);
 assert.deepEqual(list.map(v=>v.id),['gold','garnet']);assert.equal(list.reduce((n,v)=>n+v.price,0),J.costs(sword).resources.gold*11+7,'coins of the base are not in the sum');
});
test('buying the shortfall is all or nothing and then covers the costs exactly',()=>{
 const s=J.newGame(45),d=design('pendant','oval','silver');d.gems.push(gem('garnet',50,30));s.materials.silver=1;s.materials.garnet=0;s.materials.amethyst=0;
 const sum=J.shortfall(s,d).reduce((n,v)=>n+v.price,0);s.gold=sum-1;const raw=J.serialize(s);assert.throws(()=>J.buyShortfall(s,d),J.AtelierError);assert.equal(J.serialize(s),raw);
 s.gold=sum+3;const r=J.buyShortfall(s,d);assert.equal(r.sum,sum);assert.equal(s.gold,3);for(const[id,n]of Object.entries(J.costs(d).resources))assert.equal(s.materials[id],n);assert.deepEqual(J.shortfall(s,d),[]);
 const gold=J.makeDesign('pendant','oval','gold');s.materials.gold=0;s.gold=1000;const before=J.serialize(s);assert.throws(()=>J.buyShortfall(s,gold),/ремесло/);assert.equal(J.serialize(s),before,'locked materials are not bought');
});
