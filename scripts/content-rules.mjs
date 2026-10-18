// The rules of the content (GDD 8.7, the same checks as pix-tools/bestiary/gdd-check.mjs) plus the decisions D3 and D5.
// Used by tests/lore.test.mjs and by the balance bot (check A1). Returns a list of errors; empty means the content is OK.
import * as D from '../src/content-data.js';

export const PLACEHOLDERS=new Set(['monster','Monster','monsterAcc','monsterAbout','where','sign','fee','coins','days','title','advice','hunter','loot','trophy','n','d','book','stamp','storyTitle','condText','stage','hunterAcc']);
export const EFFECTS=['books','open','hunters','potions','mentor','academy','apprentice','page','rumours','holdWinter','recipes','materials','contract','releaseWinter','thaw','coins','rep','completePage','treatise','epilogue','printed','freePlay'];
export const OUTFITS=['apothecary','farmer','gentleman','merchant','miner','officer','rider','smith','surveyor','cassock'],HATS=['bonnet','felt','tricorn','skufia'];
export const GEARS=['fusil','crossbow','hammer','rifle','staff','harpoon','bow','rapier'];
const STATE={confirmed:'c',refuted:'f',dangerous:'d',rumour:'r'},WEATHER=['clear','rain','fog','snow'];
export const outcome=(f,ctx)=>{if(f.truth==='true')return 'ok';if(f.truth==='myth')return 'none';if(f.truth==='harmful')return 'worse';
 const c=f.cond,hit=(!c.variant||c.variant.includes(ctx.variant))&&(!c.weather||c.weather.includes(ctx.weather))&&(!c.season||c.season.includes(ctx.season));return hit?'ok':f.otherwise==='harmful'?'worse':'none';};
// The best number of confirmed facts among «safe» sheets: three categories, only confirmed/refuted records.
export function safeBest(known,facts){const usable=facts.filter(f=>known[f.id]==='c'||known[f.id]==='f');let best=-1;
 for(let a=0;a<usable.length;a++)for(let b=a+1;b<usable.length;b++)for(let c=b+1;c<usable.length;c++){const x=[usable[a],usable[b],usable[c]];if(new Set(x.map(f=>f.cat)).size<3)continue;best=Math.max(best,x.filter(f=>known[f.id]==='c').length);}return best;}
export function contentErrors(){
 const errors=[],fail=(where,msg)=>errors.push(`${where}: ${msg}`),CATS=D.CATEGORIES.map(c=>c.id),TRUTHS=new Set(D.TRUTHS),ids=new Set(),dup=id=>{if(ids.has(id))fail(id,'duplicate id');ids.add(id);};
 const FACT=new Map(),MON=new Map(D.MONSTERS.map(m=>[m.id,m])),MAT=new Map(D.MATERIALS.map(m=>[m.id,m])),PLACE=new Set(D.PLACES.map(p=>p.id)),BOOK=new Map(D.BOOKS.map(b=>[b.id,b])),POT=new Map(D.POTIONS.map(p=>[p.id,p]));
 const STORY=new Map(D.STORY.map(s=>[s.id,s])),HUNTER=new Map(D.HUNTERS.map(h=>[h.id,h]));
 const len=(where,s,max)=>{if(typeof s!=='string'||!s.length)fail(where,'empty text');else if([...s].length>max)fail(where,`${[...s].length} > ${max} chars: ${s}`);};
 const placeholders=(where,s)=>{const plain=s.replace(/\{[^{}|]*\|[^{}|]*\}/g,'');for(const m of plain.matchAll(/\{([^{}]*)\}/g))if(!PLACEHOLDERS.has(m[1]))fail(where,`unknown placeholder {${m[1]}}`);if(/[{}]/.test(plain.replace(/\{[A-Za-z]+\}/g,'')))fail(where,`unbalanced braces: ${s}`);};
 const walk=(where,v,max)=>{if(typeof v==='string'){placeholders(where,v);if(max)len(where,v,max);}else if(Array.isArray(v))v.forEach((x,i)=>walk(`${where}[${i}]`,x,max));else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v))walk(`${where}.${k}`,x,max);};
 for(const m of D.MONSTERS){
  dup(m.id);if(!/^[a-z][a-z_]{1,15}$/.test(m.id))fail(m.id,'bad monster id');if(![1,2,3,4].includes(m.tier))fail(m.id,'bad tier');
  for(const p of m.places)if(!PLACE.has(p))fail(m.id,`unknown place ${p}`);for(const t of m.tags)if(!(t in D.TAGS))fail(m.id,`unknown tag ${t}`);
  if(!STORY.has(m.opens))fail(m.id,`unknown opening story ${m.opens}`);if(MAT.get(m.loot.common)?.of!==m.id||MAT.get(m.loot.rare)?.of!==m.id)fail(m.id,'loot not of this monster');
  const vids=m.variants.map(v=>v.id);if(m.tier<4&&vids.join()!=='young,grown,ancient')fail(m.id,'variants must be young,grown,ancient');if(m.tier===4&&vids.join()!=='grown')fail(m.id,'final monster has one variant grown');
  for(const v of m.variants)v.signs.forEach((s,i)=>len(`${m.id}.${v.id}.sign${i}`,s,80));
  const F=m.facts,count=t=>F.filter(f=>f.truth===t).length,trueCats=new Set(F.filter(f=>f.truth==='true').map(f=>f.cat));
  if(F.length<7||F.length>10)fail(m.id,`${F.length} facts`);if(count('true')<3||trueCats.size<3)fail(m.id,'needs >=3 true facts in >=3 categories');
  if(count('myth')<2)fail(m.id,'needs >=2 myths');if(count('harmful')<1)fail(m.id,'needs >=1 harmful');if(count('conditional')>3)fail(m.id,'too many conditionals');
  for(const f of F){dup(f.id);FACT.set(f.id,f);
   if(!f.id.startsWith(m.id+'.')||!/^[a-z][a-z_]*\.[a-z][a-z0-9_]{1,23}$/.test(f.id))fail(f.id,'bad fact id');if(!CATS.includes(f.cat))fail(f.id,'bad category');if(!TRUTHS.has(f.truth))fail(f.id,'bad truth');
   if(![null,'confirmed','refuted','rumour'].includes(f.start))fail(f.id,`bad start ${f.start}`);if(f.start==='confirmed'&&f.truth!=='true')fail(f.id,'only true facts start confirmed');if(f.start==='refuted'&&f.truth!=='myth')fail(f.id,'only myths start refuted');
   len(f.id+'.title',f.title,18);len(f.id+'.advice',f.advice,72);for(const o of['ok','none','worse']){len(`${f.id}.${o}`,f.lines?.[o],170);placeholders(`${f.id}.${o}`,f.lines?.[o]||'');}
   if(f.truth==='conditional'){const c=f.cond||{};
    if(!Object.keys(c).length||Object.keys(c).some(k=>!['variant','weather','season'].includes(k)))fail(f.id,'bad cond keys');if(c.variant&&c.variant.some(v=>!vids.includes(v)))fail(f.id,'cond variant not of monster');
    if(c.weather&&c.weather.some(w=>!WEATHER.includes(w)))fail(f.id,'cond weather');if(c.season&&c.season.some(s=>![0,1,2,3].includes(s)))fail(f.id,'cond season');if(c.season&&!c.season.some(s=>m.seasons.includes(s)))fail(f.id,'cond season never happens');
    if(!['myth','harmful'].includes(f.otherwise))fail(f.id,'otherwise must be myth|harmful');len(f.id+'.condText',f.condText,90);len(f.id+'.condTag',f.condTag,22);if(f.start==='confirmed')fail(f.id,'conditional never starts confirmed');}
   else if('cond' in f||'otherwise' in f||'condTag' in f)fail(f.id,'cond fields on non-conditional');}
  const start=Object.fromEntries(F.filter(f=>f.start).map(f=>[f.id,STATE[f.start]])),startCats=new Set(F.filter(f=>f.start).map(f=>f.cat));
  if(m.tier===1){const c=F.filter(f=>f.start==='confirmed'),r=F.filter(f=>f.start==='rumour'),ref=F.filter(f=>f.start==='refuted');
   if(c.length!==2||new Set(c.map(f=>f.cat)).size!==2)fail(m.id,'tier 1: exactly 2 confirmed in 2 categories');if(ref.length!==1||c.some(f=>f.cat===ref[0].cat))fail(m.id,'tier 1: one refuted myth in a third category');
   if(r.length<2||r.length>3)fail(m.id,'tier 1: 2-3 rumours');if(!r.some(f=>f.truth==='harmful'||f.truth==='conditional'&&f.otherwise==='harmful'))fail(m.id,'tier 1: a harmful rumour');
   const covered=new Set(c.map(f=>f.cat));if(r.some(f=>f.truth==='true'&&!covered.has(f.cat)))fail(m.id,'tier 1: the third true category must not lie in the rumours');if(safeBest(start,F)!==2)fail(m.id,'tier 1: safe 66% on day 1 not available');}
  else if(m.tier<=3){const c=F.filter(f=>f.start==='confirmed'),r=F.filter(f=>f.start==='rumour');if(c.length!==1)fail(m.id,`tier ${m.tier}: exactly 1 confirmed`);if(r.length<2||r.length>4)fail(m.id,`tier ${m.tier}: 2-4 rumours`);if(startCats.size<3)fail(m.id,`tier ${m.tier}: start covers ${startCats.size} categories`);}
  else if(F.some(f=>f.start))fail(m.id,'final monster opens by the story only');
  if(m.tier>=2){const known={...start},books=D.BOOKS.filter(b=>b.reliable&&Object.keys(b.sets).some(id=>id.startsWith(m.id+'.')));if(!books.length)fail(m.id,'no reliable book for a tier 2-4 monster');
   for(const b of books)for(const [id,st] of Object.entries(b.sets))if(id.startsWith(m.id+'.')){const cur=known[id];if(!cur||cur==='r'||st!=='rumour')known[id]=STATE[st];}
   if(m.tier===4)for(const s of D.STORY)for(const id of s.effect.rumours||[])known[id]??='r';if(safeBest(known,F)<2)fail(m.id,'start + its reliable book: no safe 66%');}
  const conf=new Set(F.filter(f=>f.start==='confirmed').map(f=>f.id));for(const b of D.BOOKS)for(const [id,st] of Object.entries(b.sets))if(id.startsWith(m.id+'.')&&st==='confirmed')conf.add(id);if(conf.size>2)fail(m.id,`books confirm ${conf.size} true facts`);
  len(m.id+'.lore',m.lore,400);walk(m.id+'.victory',m.victory,170);walk(m.id+'.rout',m.rout,170);len(m.id+'.trophy',m.trophy.name,30);}
 for(const b of D.BOOKS){dup(b.id);if(!['yanek','vedana','nikodim','gift'].includes(b.seller))fail(b.id,'bad seller');
  for(const [id,st] of Object.entries(b.sets)){const f=FACT.get(id);if(!f){fail(b.id,`unknown fact ${id}`);continue;}if(!['confirmed','refuted','dangerous','rumour'].includes(st))fail(b.id,`bad state ${st}`);if(!b.reliable&&st!=='rumour')fail(b.id,'unreliable books set rumours only');
   if(st==='confirmed'&&f.truth!=='true'||st==='refuted'&&f.truth!=='myth'||st==='dangerous'&&f.truth!=='harmful')fail(b.id,`${id}: ${st} but ${f.truth}`);}
  for(const r of b.recipes)if(!POT.has(r))fail(b.id,`unknown recipe ${r}`);}
 for(const p of D.POTIONS){dup(p.id);for(const [id,n] of Object.entries(p.ingredients))if(!MAT.has(id)||!(n>0))fail(p.id,`bad ingredient ${id}`);for(const t of p.target)if(t!=='all'&&!(t in D.TAGS))fail(p.id,`bad target ${t}`);
  for(const r of p.recipe)if(!BOOK.has(r)&&!STORY.has(r)&&!D.HUNTERS.some(h=>h.arc.some(a=>a.id===r)))fail(p.id,`bad recipe source ${r}`);if(!['general','family','effect'].includes(p.kind))fail(p.id,'bad kind');if(p.kind==='effect'&&p.bonus)fail(p.id,'effect potions have no bonus');}
 const gen=D.POTIONS.filter(p=>p.kind==='general').map(p=>p.bonus),fam=D.POTIONS.filter(p=>p.kind==='family').map(p=>p.bonus);if(Math.max(...gen)+Math.max(...fam)>20)fail('potions','best general + best family > 20');
 for(const mt of D.MATERIALS){dup(mt.id);if(!/^#[0-9a-f]{6}$/.test(mt.look.c[0]))fail(mt.id,'bad look colour');if(mt.of&&!MON.has(mt.of))fail(mt.id,'unknown monster');}
 for(const h of D.HUNTERS){dup(h.id);if(!(h.skill>=1&&h.skill<=5&&h.perception>=1&&h.perception<=5))fail(h.id,'skill/perception 1..5');if(h.joins.story&&!STORY.has(h.joins.story))fail(h.id,'bad joins');walk(h.id+'.lines',h.lines,140);
  for(const a of h.arc){len(a.id,a.text,260);placeholders(a.id,a.text);const e=a.effect||{};if(e.book&&!BOOK.has(e.book))fail(a.id,'unknown book');if(e.recipe&&!POT.has(e.recipe))fail(a.id,'unknown recipe');
   if(e.personal&&!MON.get(e.personal.monster)?.variants.some(v=>v.id===e.personal.variant))fail(a.id,'bad personal');if(a.when.story&&!STORY.has(a.when.story))fail(a.id,'bad when.story');if(a.when.opened&&!MON.has(a.when.opened))fail(a.id,'bad when.opened');}}
 for(const v of D.VISITORS){dup(v.id);walk(v.id,v.lines,260);}
 for(const s of D.STORY){dup(s.id);for(const t of Array.isArray(s.text)?s.text:Object.values(s.text).flat())len(s.id,t,260);const e=s.effect;
  for(const id of e.open||[])if(!MON.has(id))fail(s.id,`unknown monster ${id}`);for(const id of e.rumours||[])if(!FACT.has(id))fail(s.id,`unknown fact ${id}`);for(const id of e.books||[])if(!BOOK.has(id))fail(s.id,`unknown book ${id}`);
  for(const id of e.hunters||[])if(!HUNTER.has(id))fail(s.id,`unknown hunter ${id}`);for(const id of Object.keys(e.materials||{}))if(!MAT.has(id))fail(s.id,`unknown material ${id}`);for(const id of Object.keys(e.potions||{}))if(!POT.has(id))fail(s.id,`unknown potion ${id}`);
  if(s.after&&!STORY.has(s.after))fail(s.id,'bad after');for(const k of Object.keys(e))if(!EFFECTS.includes(k))fail(s.id,`unknown effect ${k}`);}
 for(const t of D.LINES.tutorial)len('tutorial.'+t.id,t.text,42);
 if(D.STATES.join()!=='rumour,confirmed,refuted,dangerous')fail('STATES','must be rumour,confirmed,refuted,dangerous');
 for(const k of['ok','none','worse','unseen','confirmed','rumour','refuted','dangerous','cond'])if(!D.STAMPS[k])fail('STAMPS',`missing ${k}`);
 const looks=[...D.HUNTERS.map(h=>[h.id,h.look]),...D.VISITORS.filter(v=>v.look).map(v=>[v.id,v.look]),...D.VISITORS.flatMap(v=>(v.types||[]).map(t=>[t.id,t.look])),...D.KEEPER_LOOKS.map(k=>[k.id,k.look])];
 for(const [id,l] of looks){if(!OUTFITS.includes(l.outfit))fail(id,`unknown outfit ${l.outfit}`);if(l.hat&&!HATS.includes(l.hat))fail(id,`unknown hat ${l.hat}`);if(l.gear&&!GEARS.includes(l.gear))fail(id,`unknown gear ${l.gear}`);for(const k of['color','hair','skin','eyes'])if(l[k]&&!/^#[0-9a-f]{6}$/.test(l[k]))fail(id,`bad colour ${k}`);}
 for(const h of D.HUNTERS)if(!h.look.gear)fail(h.id,'hunter without gear');
 walk('RUMOURS',D.RUMOURS.map(r=>r.line),140);walk('LINES',D.LINES);
 for(const m of D.MONSTERS){const by=D.STORY.filter(s=>(s.effect.open||[]).includes(m.id)||s.effect.page===m.id);if(by.length!==1||by[0].id!==m.opens)fail(m.id,'opening event mismatch');}
 // Decision D3: six pieces of decor between 150 and 900 coins, a second edition priced for every tier.
 if(D.DECOR.length!==6||D.DECOR.some(x=>!(x.price>=150&&x.price<=900)||!x.text.startsWith('Только для вида')))fail('DECOR','D3: six decor pieces for 150–900 coins, only to look at');
 for(const x of D.DECOR)dup('decor:'+x.id);
 if(!(D.EDITION&&D.EDITION.price.length===5&&D.EDITION.price.slice(1).every(p=>p>0)))fail('EDITION','D3: a price of the second edition for each tier');
 // Decision D5: the note of a guest who was not heard.
 if(typeof D.LINES.note!=='string'||!D.LINES.note.includes('{advice}'))fail('LINES.note','D5: the note of an unheard guest');
 return errors;}
