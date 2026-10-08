// Real v3 saves written by the code of commit 00d1421, not by the current rules.
// Regenerate: git worktree add /tmp/pix-v3 00d1421 && node tests/fixtures/make-v3.mjs /tmp/pix-v3 tests/fixtures
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
const [root,out]=process.argv.slice(2),load=file=>import(pathToFileURL(`${root}/src/${file}`).href);
const J=await load('jewelry.js'),Forge=await load('game.js'),{PATTERNS,patternStrokes,layoutGems}=await load('patterns.js'),{addPolish}=await load('jewel-art.js');
let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const rich=s=>{s.gold=1000000;for(const k of Object.keys(s.materials))s.materials[k]=100000;s.xp=5000;return s;};
const save=(name,s,at)=>{s.savedAt=at;const raw=J.serialize(s);J.deserialize(raw);writeFileSync(`${out}/${name}`,name.endsWith('.gz')?gzipSync(raw,{level:9}):raw);console.log(name,raw.length,'bytes');};
// A star-shaped contour is always simple; random radii give each piece its own silhouette.
function randomDesign(s,{dense=false,diverse=false}={}){
 const types=J.TYPES.map(t=>t.id).filter(t=>J.typeAvailable(s,t)),type=pick(types),metals=Object.keys(J.METALS).filter(m=>J.available(s,m)),metal=pick(metals);
 let d;if(type==='ring'||type==='sword'||type==='staff')d=J.makeDesign(type,pick(J.templatesFor(type).filter(t=>t!=='free')),metal);
 else{d=J.makeDesign(type,'free',metal);const n=6+Math.floor(rnd()*7),turn=rnd()*Math.PI;d.outline=Array.from({length:n},(_,i)=>{const a=turn+i*2*Math.PI/n,r=18+rnd()*17;return {x:Math.round((50+Math.cos(a)*r)*100)/100,y:Math.round((50+Math.sin(a)*r)*100)/100};});}
 d.name=pick(['Морская капля','Тихий свет','Печать караула','Роза ветров','Лунная тропа','Брошь для Ады','Знак порта','Волна'])+' '+Math.floor(rnd()*900+100);
 const open=PATTERNS.filter(p=>p.id!=='runes'&&(s.crafted||0)>=p.need).map(p=>p.id),patterns=dense?['lattice','beads']:diverse&&rnd()<.6?[]:[pick(open)];
 // Free-hand lines make each piece of a long game its own family in the demand ledger.
 if(diverse)for(let k=0;k<2+Math.floor(rnd()*4);k++){let p={x:25+rnd()*50,y:25+rnd()*50};const pts=[];for(let i=0;i<8+rnd()*20;i++){p={x:Math.max(1,Math.min(99,p.x+(rnd()-.5)*9)),y:Math.max(1,Math.min(99,p.y+(rnd()-.5)*9))};if(J.onMetal(p,d))pts.push({x:Math.round(p.x*4)/4,y:Math.round(p.y*4)/4});}if(pts.length>=2)d.strokes.push({kind:'engrave',width:.5+Math.floor(rnd()*4)*.5,points:pts});}
 for(const id of patterns){try{d.strokes.push(...patternStrokes(d,id,{variant:Math.floor(rnd()*3),width:.5+Math.floor(rnd()*3)*.5}));}catch{}}
 const gems=Object.keys(J.GEMS).filter(g=>J.available(s,g)),cut=s.skills.includes('facets')?pick(['round','oval','pear']):'round';
 if(diverse&&rnd()<.6){for(let k=0;k<1+Math.floor(rnd()*4);k++){const g={kind:pick(gems),x:Math.round((20+rnd()*60)*4)/4,y:Math.round((20+rnd()*60)*4)/4,size:2+Math.floor(rnd()*5)*.5,cut:'round'};if(J.support(g,d)>.75&&d.gems.every(h=>Math.hypot(g.x-h.x,g.y-h.y)>(g.size+h.size)*1.5))d.gems.push(g);}}
 else try{d.gems=layoutGems(d,pick(['solo','pair','trio','cross','halo','column']),{kind:pick(gems),size:s.skills.includes('facets')?2+rnd()*3:2+rnd()*2,cut});}catch{d.gems=[];}
 if(rnd()<.5&&d.gems.length){try{d.strokes.push(...patternStrokes(d,'runes',{width:1}));}catch{}}
 if(d.strokes.length>160)d.strokes=d.strokes.slice(0,160);
 const cells=Array.from({length:144},(_,i)=>({x:(i%12+.5)*100/12,y:(Math.floor(i/12)+.5)*100/12})).filter(p=>J.onMetal(p,d));addPolish(d,cells.slice(0,Math.floor(cells.length*rnd())),.1);
 return d;
}
function make(s,opts){for(let tries=0;tries<40;tries++){const d=randomDesign(s,opts);s.draft={design:d,undo:[],redo:[]};try{return J.complete(s);}catch{s.draft=null;}}throw new Error('no valid design');}
function sellAny(s,item){for(let day=0;day<6;day++){for(const policy of['fair','low','counter']){const c=s.customers.find(c=>!c.served&&J.quote(s,item,c,policy).accepted);if(c)return J.sell(s,item.id,c.id,policy);}J.nextDay(s);}return null;}

// 1. A draft with undo and redo history, a model and a little trade.
{seed=21;const s=J.newGame(21);s.welcomed=true;s.sound=true;
 for(let i=0;i<3;i++)make(s);sellAny(s,s.stock[0]);sellAny(s,s.stock[0]);J.rememberItem(s,s.stock[0].id);
 J.startDesign(s,'pendant','drop','silver');const step=fn=>{const d=J.clone(s.draft.design);fn(d);J.edit(s,d);};
 step(d=>{d.strokes.push(...patternStrokes(d,'beads',{width:1}));});
 step(d=>{d.gems.push(...layoutGems(d,'trio',{kind:'garnet',size:3}));});
 step(d=>{d.strokes.push(...patternStrokes(d,'runes',{width:1}));});
 step(d=>{addPolish(d,[{x:50,y:50}],14);});
 step(d=>{d.name='Капля для Норы';});
 step(d=>{d.outline[3]={x:d.outline[3].x+2,y:d.outline[3].y};});
 J.undo(s);J.undo(s);
 save('v3-draft.json',s,1759300000000);}

// 2. Saturated demand: one design sold four times at full price and once more at the penalty.
{seed=7;const s=rich(J.newGame(7));s.welcomed=true;s.skills.push('eye','facets');
 const base=J.makeDesign('pendant','leaf','copper');base.name='Лист у причала';base.strokes=patternStrokes(base,'vine',{width:1});base.gems=layoutGems(base,'solo',{kind:'garnet',size:3});let full=0,item=null;
 for(let guard=0;full<5&&guard<200;guard++){if(!item){s.draft={design:J.clone(base),undo:[],redo:[]};item=J.complete(s);}const c=s.customers.find(c=>!c.served&&J.quote(s,item,c,'fair').accepted);if(!c){J.nextDay(s);continue;}J.sell(s,item.id,c.id,'fair');item=null;full++;if(full%2===0)J.nextDay(s);}
 const other=randomDesign(s);for(let i=0;i<2;i++){s.draft={design:J.clone(other),undo:[],redo:[]};const item=J.complete(s);if(!sellAny(s,item))s.stock.shift();}
 s.draft={design:J.clone(base),undo:[],redo:[]};J.complete(s);s.draft={design:J.clone(other),undo:[],redo:[]};J.complete(s);make(s);
 const cool=s.demand.filter(f=>f.until>s.tradeDay);if(!cool.length)throw new Error('expected a saturated family');
 save('v3-saturated.json',s,1759400000000);}

// 3. Personal orders: one delivered, others pending, some buyers already served.
{let s=null;
 for(let k=1;k<200&&!s;k++){seed=1000+k;const t=rich(J.newGame(k));t.welcomed=true;
  for(const r of t.requests){for(let tries=0;tries<60;tries++){const d=randomDesign(t);if(d.type!==r.type)continue;t.draft={design:d,undo:[],redo:[]};let item;try{item=J.complete(t);}catch{t.draft=null;continue;}if(J.matches(item.design,r)){J.deliver(t,r.id,item.id);s=t;break;}}if(s)break;}}
 if(!s)throw new Error('no order fixture');
 make(s);make(s);sellAny(s,s.stock[0]);
 if(!s.requests.some(r=>r.done)||!s.requests.some(r=>!r.done))throw new Error('orders mix');
 save('v3-orders.json',s,1759500000000);}

// 4. A forge save from the previous game, migrated by the atelier and played once.
{seed=4;const old=Forge.newGame(4);old.gold=140;old.resources.iron=30;old.resources.copper=12;old.resources.crystal=4;old.resources.moon=2;
 Forge.beginWork(old,'knife');for(const stage of['prepare','heat','hammer'])Forge.advanceWork(old,stage,.8);Forge.advanceWork(old,'quench','water');Forge.advanceWork(old,'finish','plain');
 Forge.beginWork(old,'lantern');const o=JSON.parse(Forge.serialize(old));o.lastSaved=1700000000000;const raw=JSON.stringify(o);
 const s=J.deserialize(raw);if(!s.legacy)throw new Error('not migrated');s.welcomed=true;make(s);
 save('v3-legacy.json',s,1759600000000);}

// 5. A long game: every skill, ~500 families in the demand ledger, a full showcase and library.
{seed=99;const s=rich(J.newGame(99));s.welcomed=true;for(const t of J.TOOLS)s.skills.push(t.id);
 for(let i=0;s.demand.length<500&&i<3000;i++){const item=make(s,{diverse:true});sellAny(s,item);if(i%100===0)console.log('sold',i,'demand',s.demand.length);}
 while(s.stock.length<J.MAX_STOCK)make(s,{dense:s.stock.length%4===0});
 for(let i=0;i<40;i++)J.rememberItem(s,s.stock[i*3].id);
 s.gold=4321;for(const k of Object.keys(s.materials))s.materials[k]=40+Math.floor(rnd()*60);s.xp=2600;
 console.log('demand',s.demand.length,'stock',s.stock.length,'library',s.library.length,'day',s.day);
 save('v3-dense.json.gz',s,1759700000000);}
