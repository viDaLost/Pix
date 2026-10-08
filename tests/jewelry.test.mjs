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
