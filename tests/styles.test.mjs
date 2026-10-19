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
 // Every label stays at 11 px or more (art.md 6.3); the hand at 16 px or more (decision D6, tested below).
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
 assert.match(css,/\.slot\{[^}]*overflow:hidden;/);assert.match(css,/\.slot \.entry\{[^}]*overflow-wrap:anywhere;hyphens:auto/);assert.match(css,/\.slot \.entry\.longword\{font-size:calc\(14px\*var\(--fs\)\)\}/);assert.match(app,/<span class="entry\$\{Math\.max\(/);
 assert.match(app,/c\.kind==='town'\?`плата \$\{c\.fee\} · при победе \$\{P\.TOWN\.pay\*c\.tier\}`/);
});
// Found in the second review of Г2: the honest mark of a book was cut to «ПРОВЕРЕНО УЧ» at 320 px; a long toast inside a
// dialog made the dialog scroll sideways by a few pixels at 320 px with large text; a swipe on a page could be taken by
// the browser's own gesture; «(−1)» of the trust fell away from its dots; «трактаты 0 / 14» broke before «14».
test('second review of Г2: whole book marks, toasts within their dialog, a swipe that turns pages, words kept together',()=>{
 assert.match(css,/\.book-main \.stamp\{height:auto;[^}]*white-space:normal/);assert.match(css,/\.book-main \.stamp>span\{flex:0 1 auto;min-width:0\}/);
 assert.match(css,/dialog>\.toast\{[^}]*max-width:min\(calc\(100vw - 56px\),500px\)/,'a toast in a dialog is narrower than the narrowest dialog (100vw − 38px) and the plain one (520px)');
 assert.match(css,/\.view-bestiary article\.folio\{touch-action:pan-y pinch-zoom\}/);
 assert.match(css,/\.wound \.trust-change\{[^}]*white-space:nowrap/);assert.match(app,/<span class="trust-change">\$\{trust\(x\.trust\)\}/);
 assert.match(app,/трактаты \$\{n\}&nbsp;\/&nbsp;\$\{L\.MONSTERS\.length\}/);
});
// Found in the second review of Г2: a slot broke an eight-letter word between its letters («Скважин|ы и щели» at 360 px,
// «Курины|й бог» with large text) — the soft hyphens only help words of nine letters. The hand of a slot is now written
// smaller until its longest word fits; the label keeps 11 px with large text on a landscape phone too.
test('second review of Г2: a word of a title keeps whole in its slot, the label of a slot fits in landscape',()=>{
 assert.match(app,/function fitSlots\(root\)\{for\(const el of root\.querySelectorAll\('\.slot \.entry'\)\)\{el\.style\.fontSize='';el\.style\.overflowWrap='normal';/);
 assert.match(app,/while\(el\.scrollWidth>el\.clientWidth\+\.5&&size>11\)/,'down to 11 px, the smallest label of art.md');
 assert.match(app,/if\(view==='reception'&&sheet\)fitSlots\(panel\);/,'every render of the sheet fits its slots');assert.match(app,/document\.fonts\?\.addEventListener\?\.\('loadingdone',refit\);addEventListener\('resize',refit\);/);
 assert.match(css,/@media\(max-width:419px\),\(orientation:landscape\) and \(max-height:500px\)\{\.large-text \.slot em\{font-size:11px\}\}/);
});

// Г3, decision D6: Marck Script (OFL, vendored from @fontsource/marck-script@5.3.0) is the hand of the margins and
// signatures only, never below 16 px and never preloaded; the entries of the slots are main text in Cormorant.
test('decision D6: the hand of the keeper only in the margins, at 16 px or more, the slots in Cormorant',()=>{
 const faces=[...css.matchAll(/@font-face\{font-family:'Marck Script';[^}]*\}/g)].map(m=>m[0]);assert.equal(faces.length,2,'cyrillic and latin');
 for(const f of faces){assert.match(f,/font-display:swap/);assert.match(f,/url\(\.\/assets\/fonts\/marck-script-(cyrillic|latin)-400-normal\.woff2\)/);}
 assert.equal([...css.matchAll(/font-family:var\(--hand\)/g)].length,1,'one rule sets the hand');assert.match(css,/\.hand\{font-family:var\(--hand\);font-size:calc\(16px\*var\(--fs\)\)/);
 for(const m of css.matchAll(/\.hand[^{,]*\{[^}]*font-size:calc\((\d+(?:\.\d+)?)px/g))assert.ok(Number(m[1])>=16,`the hand at ${m[1]}px`);
 assert.match(css,/\.slot \.entry\{font-family:var\(--display\);font-weight:700;/);
 // Found in Г3: «.fact p» (13 px) outweighed «.hand» on a page of the bestiary; the margin of a page says its size itself.
 assert.match(css,/\.fact \.hand\{[^}]*font-size:calc\(16px\*var\(--fs\)\)/);
 assert.equal([...app.matchAll(/class="hand"/g)].length,2,'margin notes of a page and of a record');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/marck/i,'the hand is not preloaded');
});
