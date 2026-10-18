import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8'),app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const root=css.match(/:root\{([^}]*)\}/)[1];
const token=name=>(root.match(new RegExp(`--${name}:([^;]+);`))||[])[1]?.trim();

test('the palette of art.md 1.2: soot and oak around parchment and ink, the seals in their checked colours',()=>{
 const want={bg:'#120e0b',surface:'#1d1712','surface-3':'#30261c',text:'#f1e6cf','text-3':'#a3967e',brass:'#d6ad66','on-brass':'#22180b',parch:'#ecdfbf','parch-2':'#e0cfa6',ink:'#2b2018','ink-3':'#665340',
  'st-ok':'#2d5f52','st-rumour':'#76480c','st-refuted':'#5f584c','st-danger':'#a3301c','st-cond':'#33447a','on-wax':'#fbeee0',ok:'#8fcab4',rumour:'#e6bb6a',refuted:'#aaa190',danger:'#f08f7e',cond:'#a9b8f0',candle:'#ffcf7a'};
 for(const [k,v] of Object.entries(want))assert.equal(token(k),v,`--${k}`);
 assert.match(token('display'),/^'Cormorant Garamond'/);assert.match(token('ui'),/^'Manrope'/);assert.match(token('hand'),/^'Marck Script'/);
 assert.doesNotMatch(css,/rumor(?!u)/,'«rumour» is spelt so everywhere (GDD 11, item 2)');
});
test('the components of art.md 1.5 are there and the jewellery of the previous game is gone',()=>{
 for(const sel of['.stamp.ok','.stamp.rumour','.stamp.refuted','.stamp.danger','.stamp.cond','.stamp.unseen','.mini.ok','.trust i.on','.claws','.sheet{','dialog.sheet-dialog','.slots-row','ol.slots','.meter{','.seg.ok','.seg.rumour','.seg.refuted','.seg.empty','.seg.plus','button.slip','.slip-side','.tokens','.threshold','.sticky-actions','.folio','.toc{','.recipes','.trophy-grid','.night-veil','.toast','dialog>.toast'])assert.ok(css.includes(sel),sel);
 for(const old of['.editor','.gem-','.velvet-','.contest','.ceremony','.jewel','.showcase','.buyer','.resident','.guild','.ribbon','.tools{'])assert.ok(!css.includes(old),`a block of the atelier left: ${old}`);
 // The four segments of the bar share the grid of the slots above them: three thirds and the column of potions.
 assert.match(css,/\.meter\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\) 52px/);assert.match(css,/\.slots-row\{display:grid;grid-template-columns:minmax\(0,1fr\) 52px/);
 // Every label stays at 11 px or more, the hand at 15 px or more (art.md 6.3).
 for(const m of css.matchAll(/font(?:-size)?:[^;{}]*?calc\((\d+(?:\.\d+)?)px\*var\(--fs\)\)/g))assert.ok(Number(m[1])>=11,`a label of ${m[1]}px`);
 for(const m of css.matchAll(/(?<![\w-])font-size:(\d+(?:\.\d+)?)px/g))assert.ok(Number(m[1])>=11,`a fixed label of ${m[1]}px`);
});
test('the layout rules of the four sizes: short phones, the shortest, the landscape spread and large text',()=>{
 assert.match(css,/@media\(max-height:700px\)\{/);assert.match(css,/@media\(max-height:600px\)\{/);assert.match(css,/@media\(orientation:landscape\) and \(max-height:500px\)\{/);
 assert.match(css,/:root\.large-text\{--fs:1\.12\}/);assert.match(css,/\.calm \*,\.calm \*::before,\.calm \*::after\{[^}]*animation:none!important/);
 // The sheet of the landscape keeps its list on the left and the parchment on the right (art.md 3.2).
 assert.match(css,/\.panel\.sheet-panel\{display:grid;grid-template-columns:minmax\(0,1fr\) 320px/);
 // Dialogs scroll inside 88 % of the screen; the app shell never scrolls the document.
 assert.match(css,/dialog\{[^}]*max-height:88dvh;overflow:auto/);assert.match(css,/\.app-shell\{[^}]*height:100svh/);assert.match(css,/main\{[^}]*overflow:hidden/);
 assert.match(app,/document\.body\.classList\.toggle\('in-sheet'/,'the sheet is a mode of the reception');
 // A page of the bestiary is two leaves; on a landscape phone the left one (name, plate, fullness) stays while the right
 // one scrolls (art.md 2.2).
 assert.match(app,/<div class="leaf left">[\s\S]*<div class="leaf right">/);assert.match(css,/\.folio>\.leaf\.left\{position:sticky;top:0\}/);
 // The line under the name keeps the rank on a phone; the town and the year return where there is room.
 assert.match(app,/<span class=\\?"where\\?">Велен · 1740 · <\/span>\$\{esc\(rankName\(\)\)\}/);assert.match(css,/\.brand \.where\{display:none\}@media\(min-width:430px\)\{\.brand \.where\{display:inline\}\}/);
 // The reception of a landscape phone: the scene, the segments and the guests on the left, the card on the right.
 assert.match(app,/<div class="reception"><div class="reception-side">\$\{sceneHTML\(\)\}[^`]*<\/div><div class="reception-main">/);assert.match(css,/\.reception\{display:grid;grid-template-columns:minmax\(0,44%\) minmax\(0,1fr\)/);
 // The variant of a case is shown openly on its plate and in the sheet (decision D1).
 assert.match(app,/<em class="tier \$\{c\.variant\}">/);assert.match(app,/<p class="circ">\$\{VARIANT\[c\.variant\]\} облик · /);
});
// Found in the review of Г2: no size lets a dialog grow past 88 % of the screen; the stamp of a record in «Опыты» has the
// width of its card under the name (at 320 px «Опровергнуто» was cut to «ОПРОВ»); a long word in a slot of the sheet
// breaks inside its slot instead of running into the next; a town case says what the town pays, not the bounty.
test('review of Г2: dialogs within 88dvh everywhere, whole stamps in «Опыты», slots that keep their words, the town pay',()=>{
 for(const m of css.matchAll(/max-height:(\d+)dvh/g))assert.ok(Number(m[1])<=88,`a max-height of ${m[1]}dvh`);
 assert.match(css,/\.lab-card>\.stamp\{grid-column:2\/4;/);assert.match(css,/\.lab-card>button\{grid-column:3;grid-row:1;/);
 assert.match(css,/@media\(max-width:359px\)\{\.lab-card>\.lab-main\{grid-column:2\/4\}\.lab-card>button\{grid-column:2\/4;grid-row:3;/);
 assert.match(css,/\.slot\{[^}]*overflow:hidden;/);assert.match(css,/\.slot \.hand\{[^}]*overflow-wrap:anywhere;hyphens:auto/);assert.match(css,/\.slot \.hand\.longword\{font-size:calc\(14px\*var\(--fs\)\)\}/);assert.match(app,/<span class="hand\$\{Math\.max\(/);
 assert.match(app,/c\.kind==='town'\?`плата \$\{c\.fee\} · при победе \$\{P\.TOWN\.pay\*c\.tier\}`/);
});
