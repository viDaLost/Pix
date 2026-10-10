import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import {patinaDots,addPolish} from '../src/jewel-art.js';

test('the picture module loads without a page and its patina is fixed for every metal and variant',()=>{
 assert.equal(typeof document,'undefined','node has no DOM, the canvases are made only when something is drawn');
 for(const metal of Object.keys(J.METALS))for(let v=0;v<4;v++){const a=patinaDots(metal,v);assert.deepEqual(patinaDots(metal,v),a,`${metal} ${v} is the same on every call`);
  for(const p of a){for(const k of['x','y','r','a'])assert.ok(p[k]>=0&&p[k]<=1,`${metal} ${v} ${k}=${p[k]}`);assert.match(p.color,/^#[0-9a-f]{6}$/);}}
 assert.deepEqual(patinaDots('gold',0),[],'gold does not tarnish');assert.equal(patinaDots('copper',0).length,4,'three green spots and one dark one');
 assert.ok(patinaDots('silver',1).every(p=>p.color==='#6f6a80'&&p.a===.25));assert.ok(patinaDots('lunar',2).every(p=>p.a===.12));
 assert.notDeepEqual(patinaDots('copper',0),patinaDots('copper',1),'the variants of a cell differ');assert.deepEqual(patinaDots('unknown',0),[]);
});
test('polishing still marks the cells under the strokes and only on metal',()=>{
 const d=J.makeDesign('pendant','circle','copper');addPolish(d,[{x:50,y:50}],6);const cells=d.polish.slice().sort((a,b)=>a-b);assert.ok(cells.length>=4&&cells.includes(78),cells.join());
 addPolish(d,[{x:2,y:2}],3);assert.deepEqual(d.polish.slice().sort((a,b)=>a-b),cells,'empty corners are never polished');
});
