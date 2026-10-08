import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import {PATTERNS,LAYOUTS,patternStrokes,layoutGems,patternUnlocked} from '../src/patterns.js';

const shapes=[['pendant','oval'],['ring','oval'],['ring','flower'],['brooch','crescent'],['pendant','star'],['amulet','drop'],['pendant','shield'],['sword','oval'],['staff','oval']];
test('every template is a valid closed blank for the jewelry types that offer it',()=>{
 for(const type of J.TYPES.map(t=>t.id))for(const id of J.templatesFor(type)){if(id==='free')continue;const d=J.makeDesign(type,id,'silver');d.polish=[0];assert.doesNotThrow(()=>J.validateDesign(d,true),`${type}/${id}`);}
});
test('every pattern follows the contour, stays on metal and keeps a completable design',()=>{
 for(const [type,template] of shapes){const d=J.makeDesign(type,template,'silver');d.gems=layoutGems(d,'solo',{kind:'garnet',size:3});
  for(const p of PATTERNS)for(const variant of[0,1,2]){const strokes=patternStrokes(d,p.id,{variant});assert.ok(strokes.length>0,`${type}/${template}/${p.id}`);
   assert.ok(strokes.every(s=>s.points.every(q=>J.onMetal(q,d))),`${p.id} leaves the metal`);const next=J.clone(d);next.strokes.push(...strokes);assert.doesNotThrow(()=>J.validateDesign(next,true),`${type}/${template}/${p.id}`);}}
});
test('a pattern is one undoable edit and respects the engraving budget',()=>{
 const s=J.newGame(3);J.startDesign(s,'pendant','oval','silver');const d=J.clone(s.draft.design);d.strokes.push(...patternStrokes(d,'lattice'));J.edit(s,d);assert.ok(s.draft.design.strokes.length>10);J.undo(s);assert.equal(s.draft.design.strokes.length,0);
 const full=J.clone(d);for(let i=0;i<8;i++){try{full.strokes.push(...patternStrokes(full,'scales',{variant:i}));}catch(e){assert.ok(e instanceof J.AtelierError);break;}}
 assert.ok(full.strokes.length<=160&&full.strokes.reduce((n,s)=>n+s.points.length,0)<=8000);assert.doesNotThrow(()=>J.validateDesign(full,true));
});
test('rune circles awaken stones; stone layouts only use supported, non-overlapping spots',()=>{
 const d=J.makeDesign('amulet','oval','silver');assert.throws(()=>patternStrokes(d,'runes'),J.AtelierError);
 for(const l of LAYOUTS){const g=J.makeDesign('pendant','oval','silver');g.gems=layoutGems(g,l.id,{kind:'amethyst',size:3});assert.doesNotThrow(()=>J.validateDesign(g,true),l.id);}
 d.gems=layoutGems(d,'pair',{kind:'amethyst',size:3});d.strokes=patternStrokes(d,'runes');assert.equal(J.evaluate(d).connections,2);assert.ok(J.evaluate(d).magic>0);
});
test('advanced patterns unlock with finished pieces',()=>{const s=J.newGame(1);assert.ok(patternUnlocked(s,'beads'));assert.ok(!patternUnlocked(s,'filigree'));s.crafted=5;assert.ok(patternUnlocked(s,'filigree'));});
test('buyers have wishes, counter-offers never exceed their purse, and days keep a summary',()=>{
 const s=J.newGame(5);assert.ok(s.customers.every(c=>J.TYPES.some(t=>t.id===c.want)));
 const d=J.makeDesign('pendant','oval','silver');d.gems=layoutGems(d,'solo',{kind:'garnet',size:3});d.polish=[60,61,62];const item={id:'x',design:d};
 const buyer={id:'buyer-1',client:'mira',budget:40,served:false,want:'pendant'};const fair=J.quote(s,item,buyer,'fair'),counter=J.quote(s,item,buyer,'counter');
 assert.ok(!fair.accepted);assert.ok(counter.price<=40);assert.equal(counter.accepted,counter.offer>0);
 const plain={...buyer,want:'ring',budget:9999};assert.ok(J.quote(s,item,{...plain,want:'pendant'}).fit>=J.quote(s,item,plain).fit);
 J.startDesign(s,'pendant','oval','copper');s.draft.design.polish=[66];J.complete(s);assert.equal(s.daily.made,1);const c=s.customers[0],q=J.quote(s,s.stock[0],c,'counter');
 if(q.accepted){J.sell(s,s.stock[0].id,c.id,'counter');assert.equal(s.daily.income,q.price);}
 const back=J.deserialize(J.serialize(s));assert.equal(back.daily.made,1);J.nextDay(back);assert.deepEqual([back.daily.made,back.daily.income],[0,0]);
});
