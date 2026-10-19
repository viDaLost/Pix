import test from 'node:test';
import assert from 'node:assert/strict';
import {installDocument} from './canvas-helpers.mjs';
installDocument();
const I=await import('../src/item-art.js'),L=await import('../src/lore.js');
const hex=/^#[0-9a-f]{6}$/i,filled=g=>g.g.filter(Boolean).length,colorsOf=g=>new Set(g.g.filter(Boolean));
// GDD 11.4, art.md 4.9: every thing of the content has a look of a known shape and checked colours.
test('every material, potion and trophy has a look of a known template with #rrggbb colours',()=>{
 for(const m of L.MATERIALS){assert.ok(I.TEMPLATES.includes(m.look?.tpl),`${m.id}: ${m.look?.tpl}`);assert.ok(m.look.c.length>=1&&m.look.c.every(c=>hex.test(c)),m.id);}
 for(const p of L.POTIONS){assert.ok(I.FLASKS.includes(p.look?.tpl),`${p.id}: ${p.look?.tpl}`);assert.match(p.look.liquid,hex,p.id);}
 for(const m of L.MONSTERS){assert.ok(I.TROPHIES.includes(m.id),m.id);assert.ok(m.trophy.look.c.length>=1&&m.trophy.look.c.every(c=>hex.test(c)),m.id);}
 // Every template is used by the content, and every flask by a potion.
 for(const t of I.TEMPLATES)assert.ok(L.MATERIALS.some(m=>m.look.tpl===t),`${t} is used`);for(const t of I.FLASKS)assert.ok(L.POTIONS.some(p=>p.look.tpl===t),`${t} is used`);
});
test('each thing is a real picture: filled, in its own colour, outlined in ink, and no two shapes alike',()=>{
 const seen=new Map();
 for(const tpl of I.TEMPLATES){const g=I.itemGrid({tpl,c:['#8a6a4a','#4a5a8a']});assert.equal(g.n,16);assert.equal(g.g.length,256);assert.ok(filled(g)>=30,`${tpl}: ${filled(g)} cells`);assert.ok(colorsOf(g).has(I.INK),tpl+' has an outline');
  const key=g.g.map(c=>c?1:0).join('');assert.ok(!seen.has(key),`${tpl} looks like ${seen.get(key)}`);seen.set(key,tpl);}
 for(const m of L.MATERIALS)assert.ok(colorsOf(I.itemGrid(m.look)).has(m.look.c[0])||m.look.tpl==='jarL'||m.look.tpl==='root',`${m.id} shows its colour`);
 // An unknown look still draws something rather than throwing.
 assert.ok(filled(I.itemGrid({tpl:'nothing',c:['bad']}))>20);assert.ok(filled(I.itemGrid())>20);
});
test('a flask shows its liquid up to the level of the doses; the trophies of the wall are fourteen different shapes',()=>{
 for(const p of L.POTIONS){const full=I.flaskGrid(p.look,1),half=I.flaskGrid(p.look,.5),empty=I.flaskGrid(p.look,0),liq=g=>g.g.filter(c=>c===p.look.liquid).length;
  assert.ok(liq(full)>liq(half)&&liq(half)>0,`${p.id}: full > half > 0`);assert.equal(liq(empty),0,`${p.id}: an empty flask`);assert.ok(colorsOf(full).has(I.INK));}
 const shapes=new Set();for(const m of L.MONSTERS){const g=I.trophyGrid(m.id,m.trophy.look);assert.equal(g.n,12);assert.ok(filled(g)>=14,m.id);assert.ok(colorsOf(g).has(m.trophy.look.c[0]),m.id);shapes.add(g.g.map(c=>c?1:0).join(''));}
 assert.equal(shapes.size,L.MONSTERS.length);
});
test('pictures become data-URLs once and are kept; paintGrid paints only the filled cells at whole steps',()=>{
 const look=L.MAT.get('werewolf_fur').look,a=I.itemURL(look),b=I.itemURL(look);assert.equal(a,b);assert.match(a,/^data:image\/png/);
 assert.notEqual(I.flaskURL(L.POT.get('courage').look,1),I.flaskURL(L.POT.get('courage').look,.25));assert.equal(I.trophyURL('werewolf',L.MON.get('werewolf').trophy.look),I.trophyURL('werewolf',L.MON.get('werewolf').trophy.look));
 const rects=[],ctx={fillStyle:'',fillRect(x,y,w,h){rects.push([x,y,w,h,this.fillStyle]);}},g=I.itemGrid(look);I.paintGrid(ctx,g,10,20,2);
 assert.equal(rects.length,filled(g));assert.ok(rects.every(([x,y,w,h])=>w===2&&h===2&&x>=10&&x<42&&y>=20&&y<52));
 assert.match(I.pixelImg(a,24),/<img class="pix" src="data:[^"]+" width="24" height="24" alt="" aria-hidden="true">/);
});
test('the interface shows the things: goods, ingredients, flasks of the sheet and of recipes, the loot of a report, trophies',async()=>{
 const {readFileSync}=await import('node:fs'),app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/function goodsRow\(mt\)\{const have=state\.stock\[mt\.id\]\|\|0;return `<div class="goods">\$\{thing\(mt\.id\)\}/);
 assert.match(app,/\$\{thing\(id,16\)\}<span>\$\{esc\(L\.partName\(id\)\)\}<\/span>/);assert.match(app,/<div class="recipe-head">\$\{flaskImg\(p\.id,32,/);assert.match(app,/btn\('potion',`\$\{flaskImg\(p\.id,24\)\}/);
 assert.match(app,/thing\(r\.offer\.loot\[0\]\.id,24\)/);assert.match(app,/pixelImg\(trophyURL\(m\.id,m\.trophy\.look\),24\)/);
});
