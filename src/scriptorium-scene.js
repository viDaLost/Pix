// The scriptorium of the keeper (art.md 4.1–4.7, GDD 11.2) on a 480×260 pixel canvas. The world shows the state of the
// bestiary: a plaque on the wall for the best variant beaten of each monster, a gilt spine on the top shelf for every
// treatise, flasks filled to the doses in store, jars of rare parts on the sill, the candles of the day on their ledge,
// every upgrade and piece of décor in its own place, the great volume once printed. The window has the sky of the hour,
// the weather, the grey snow of the Black Winter and the drip of the thaw. People: the keeper behind the table writing or
// talking, the chosen guest at the table, two more by the door, Даро in his chair on his evenings, the Magister at the
// window on his days, Федя on the ladder after S2; a beaten hunter comes in ragged and slow.
// What changes only with the state is drawn once into a cached background and a cached front of the table; a frame draws
// the sky, the door, the flames, the hearth, the people and the light, with light from ready sprites (no gradient, blur or
// filter in a frame). paintLab draws the alchemy corner as a strip for «Опыты», paintThreshold the doorway of a report.
import {px,polygon,panel,texture,pixelLine,canvas,shade,noise,oval} from './pixel.js';
import {paintCharacter,OUTFITS,HATS} from './characters.js';
import {createActor,moveActor,updateActor} from './motion.js';
import {ambience,sky,mix,HILLS,dayHash} from './ambience.js';
import {trophyGrid,flaskGrid,itemGrid,paintGrid} from './item-art.js';
import * as L from './lore.js';
import * as P from './progress.js';
export const W=480,H=260,LAB={w:480,h:150},THRESHOLD={w:240,h:80};
// A look from the content; a look characters.js cannot wear falls back to lookFallback (none is needed since Г3).
// characters.js fills what a look leaves out from its old «smith» (bearded); a person of the content says it all itself.
export function personOf(id,look,fallback){let p={beard:false,female:false,mature:false,cap:false,carry:false,...look,id};if(!OUTFITS.includes(p.outfit))p={...p,...(fallback||{}),outfit:OUTFITS.includes(fallback?.outfit)?fallback.outfit:'surveyor'};if(p.hat&&!HATS.includes(p.hat))p.hat=HATS.includes(fallback?.hat)?fallback.hat:undefined;return p;}
// A hunter as he is today: his rag after a lost hunt and his own marks (art.md 4.8), so the scene, the portraits of the
// line and the artel, and the doorway of the report all show the same beaten man.
// Back from a win this morning he carries his bag, and the trophy of a first win over a variant in his hand.
export function hunterPerson(s,id,extra={}){const h=L.HUNTER.get(id);if(!h)return personOf(id,{});const r=s?.reports?.find(r=>r.hunter===id&&r.day===s.day&&r.win),won=r?{carry:true,...(r.trophy?{trophy:L.MON.get(r.contract.monster)?.trophy.look.c}:{})}:{};
 return {...personOf(h.id,h.look,h.lookFallback),marks:h.marks,rag:s?.hunters?.[id]?.rag||0,...won,...extra};}
// The person who stands for a guest of the day: a hunter, a townsperson or one of the visitors.
export function guestPerson(v,s){if(v.kind==='hunter')return hunterPerson(s,v.who);if(v.kind==='town'){const t=L.TOWN_TYPE.get(v.who);return personOf('town-'+t.id,t.look);}
 const x=L.VISITOR.get(v.kind);return personOf(x.id,x.look,x.lookFallback);}
export const visitorPerson=id=>{const x=L.VISITOR.get(id);return personOf(x.id,x.look,x.lookFallback);};
export const keeperPerson=s=>{const k=L.KEEPER.get(s.keeper)||L.KEEPER_LOOKS[0];return personOf(k.id,k.look);};
// The best variant beaten of each monster, for the plaque of the wall: wood, brass, silver with a star.
const BEST=['young','grown','ancient'],PLAQUE={young:'#8a5e3c',grown:'#c9a050',ancient:'#c9d2d6'};
export const bestOf=(s,id)=>{const t=s.monsters[id]?.troph||[];return BEST.filter(v=>t.includes(v)).at(-1)||null;};
const SPINE={beast:'#6b2f2a',undead:'#4a5a4a',spirit:'#3a4a6a',serpent:'#2f5a5a',water:'#2f4a6a',cursed:'#2a2228'};
// A flask on a shelf is filled in five steps of the doses in store: empty, a quarter for one to three doses … full at
// eight and nine, so a single dose is never an empty flask (the same steps in «Алхимия»).
export const doseLevel=n=>{n=Math.max(0,Math.min(P.LIMITS.doses,Math.floor(n||0)));return n?Math.min(4,1+Math.floor((n-1)*4/P.LIMITS.doses)):0;};
const rareJars=s=>L.PARTS.filter(p=>p.kind==='rare'&&(s.stock[p.id]||0)>0).slice(0,5);
// Who is in the room besides the guests of the line: Даро on his evenings and in his events, the Magister on the days he
// comes, Федя from the day he was taken on (S2).
export function residents(s,guests=[]){const daro=guests.some(v=>v.kind==='daro')||['S0','S8','S12'].some(e=>s.story?.days?.[e]===s.day&&s.story.seen.includes(e));
 return {daro,otto:guests.some(v=>v.kind==='otto'),fedya:!!s.story?.seen?.includes('S2')};}
// The hunters back from a hunt this morning wait in the line in the rag they came back in (art.md 4.6), unless a new
// case already brings them to it.
export function returned(s,guests=[]){const seen=new Set(guests.filter(v=>v.kind==='hunter').map(v=>v.who)),out=[];
 for(const r of s.reports||[])if(r.hunter&&r.day===s.day&&!seen.has(r.hunter)&&L.HUNTER.has(r.hunter)){seen.add(r.hunter);out.push({id:'back-'+r.hunter,kind:'hunter',who:r.hunter,back:true});}return out;}
// Who stands where (art.md 4.6): the chosen guest at the table and up to two more in the line, then Даро in his chair,
// the Magister by the window and Федя on the ladder. No more than four people besides Федя: with Даро and the Magister
// both in the room one place of the line is left. Hunters back this morning wait in the line, never at the table.
export function lineup(s,guests=[],chosen=null){const r=residents(s,guests),line=guests.filter(v=>v.kind!=='daro'&&v.kind!=='otto'),table=line.find(v=>v.id===chosen)||line[0]||null;
 return {...r,table,line:[...line.filter(v=>v!==table),...returned(s,guests)].slice(0,r.daro&&r.otto?1:2)};}
// The pointed arch of the window: springing at y 69 from two centres 12 px either side of the middle (art.md 4.3).
const GLASS={x:168,y:28,w:62,h:82},ARCH={c:199,d:12,r:43,spring:69};
function archEdges(y){if(y>=ARCH.spring)return [GLASS.x,GLASS.x+GLASS.w];const t=Math.sqrt(Math.max(0,ARCH.r*ARCH.r-(ARCH.spring-y)**2));return [ARCH.c+ARCH.d-t,ARCH.c-ARCH.d+t];}
function archClip(c,ox=0,oy=0){c.beginPath();for(let y=GLASS.y;y<=GLASS.y+GLASS.h;y++){const [a,b]=archEdges(y);if(b<=a)continue;c.rect(a-ox,y-oy,b-a,1);}c.clip();}
// A chair by the bookcase: plain oak for Даро's evenings, the leather one with brass nails once bought (décor).
function chair(g,fine){const wood=fine?'#6b2f2a':'#5e4330',edge=fine?'#4a1e1c':'#3e2b20';
 px(g,97,194,8,46,edge);px(g,98,195,6,44,wood);px(g,97,213,38,6,edge);px(g,98,214,36,4,wood);px(g,98,214,36,1,shade(wood,30));px(g,131,218,3,22,edge);px(g,99,218,3,22,edge);
 if(fine){for(let y=198;y<236;y+=6)px(g,100,y,1,1,'#c9a050');for(let x=101;x<133;x+=5)px(g,x,215,1,1,'#c9a050');px(g,96,190,10,5,edge);px(g,97,191,8,3,wood);}}
// Small things of the wall and shelves.
function jar(g,x,y,part){px(g,x,y,10,14,'rgba(200,230,210,.32)');px(g,x,y+1,1,12,'rgba(230,245,240,.5)');px(g,x+1,y+5,8,8,mix(part.look?.c?.[0]||'#8a7a6a','#4a5a3a',.45));
 const it=itemGrid(part.look);for(let j=0;j<6;j++)for(let i=0;i<6;i++){const col=it.g[(3+j*2)*16+3+i*2];if(col&&col!=='#241c17')px(g,x+2+i,y+5+j,1,1,col);}px(g,x-1,y-1,12,2,'#6b4a33');px(g,x,y-2,10,1,'#8a6a48');}
function background(s){const c=canvas(W,H),g=c.getContext('2d'),up=new Set(s.upgrades),decor=new Set(s.decor||[]);
 px(g,0,0,W,H,'#120e0b');px(g,8,8,W-16,H-16,'#3e3229');
 // Limestone blocks, the oak panelling and the floor boards.
 for(let y=12,row=0;y<110;y+=22,row++)for(let x=12-(row%2?17:0);x<468;x+=35){const x0=Math.max(12,x),w=Math.min(x+34,468)-x0;if(w<=2)continue;px(g,x0,y,w,21,'#5a4b3e');px(g,x0,y,w,1,'#7a6856');px(g,x0,y+20,w,1,'#3e3229');texture(g,x0+1,y+2,w-2,17,['#665546','#4f4136'],.12,row*7+x);}
 px(g,12,110,456,40,'#4a3426');px(g,12,110,456,3,'#7a5a3c');for(let x=18;x<462;x+=48){px(g,x,117,40,27,'#5e4330');px(g,x+1,118,38,1,'#6e5038');px(g,x,143,40,1,'#3e2b20');}
 for(let y=150,row=0;y<246;y+=18,row++){px(g,12,y,456,17,row%2?'#6b4a33':'#5e412d');px(g,12,y+17,456,1,'#3e2b20');for(let x=12+(row%2?30:0);x<468;x+=74){pixelLine(g,x,y,x,y+16,'#3e2b20');px(g,x+6,y+3,40,1,'#8a6446');}texture(g,12,y+2,456,13,['#57402d','#7a5a40'],.04,row+11);}
 px(g,12,246,456,6,'#2e221a');
 // The door frame of stone; the door itself (closed, ajar or open) is drawn in the frame.
 for(let y=60;y<236;y++){const dy=86-y,w=dy>0?Math.sqrt(Math.max(0,26*26-dy*dy)):26;px(g,Math.round(38-w),y,Math.round(2*w),1,'#2a221c');}
 for(let y=60;y<236;y+=7){px(g,10,y,4,6,'#6a5a4c');px(g,62,y,4,6,'#6a5a4c');}
 // Two more rows of shelves over the door, by the bookcase (décor).
 if(decor.has('shelves'))for(const y of[30,52]){px(g,14,y,48,3,'#7a5a3c');px(g,14,y+3,48,1,'#3e2b20');for(let x=16,k=y;x<58;k++){const w=3+Math.floor(noise(k,y,5)*3),h=10+Math.floor(noise(y,k,7)*7);if(x+w>58)break;px(g,x,y-h,w,h,['#6b2f2a','#2f4a3a','#5a4630','#3a3a52','#7a5a2a'][k%5]);px(g,x,y-h+2,w,1,'#c9a050');x+=w+1;}}
 // The bookcase: shelves, spines, the shelf of treatises at the top (a gilt spine for every treatise, a gold-tooled one
 // for a second edition) and the ladder.
 panel(g,66,16,84,190,'#4a3222');const spines=['#6b2f2a','#2f4a3a','#5a4630','#3a3a52','#7a5a2a'];
 for(const [i,y] of[30,62,94,126,158,190].entries()){px(g,70,y,76,3,'#7a5a3c');if(i===0)continue;for(let x=71,k=i*5;x<142;k++){const w=3+Math.floor(noise(k,i,9)*4),h=18+Math.floor(noise(i,k,4)*10);if(x+w>142)break;px(g,x,y-h,w,h,spines[k%5]);px(g,x,y-h+3,w,1,'#c9a050');x+=w+1;}}
 L.MONSTERS.forEach((m,i)=>{const x=72+i*5;if(s.monsters[m.id]?.treatise){const col=SPINE[m.tags.find(t=>SPINE[t])]||'#5a4630';px(g,x,19,4,11,col);px(g,x,21,4,1,'#e8c56a');px(g,x,27,4,1,'#e8c56a');if(s.editions?.includes(m.id)){px(g,x,19,4,1,'#f2d69a');px(g,x+1,23,2,3,'#f2d69a');}}else px(g,x,22,4,8,'#2a1d16');});
 if(up.has('infirmary')){px(g,120,150,14,8,'#eadbb8');px(g,120,150,14,1,'#ffffff');oval(g,127,154,2,2,'#c1b59a');}
 pixelLine(g,140,20,152,204,'#7a5a3c',2);pixelLine(g,150,20,162,204,'#7a5a3c',2);for(let y=36;y<200;y+=18)pixelLine(g,141+(y-20)/16,y,152+(y-20)/16,y,'#8a6a48');
 // A linen screen for the wounded, at the edge of the door (upgrade «Комната для раненых»).
 if(up.has('infirmary')){for(let i=0;i<2;i++){const x=56+i*6;px(g,x,146,6,90,'#5e4330');px(g,x+1,148,4,84,'#d9d0bc');px(g,x+1,148,1,84,'#eadbb8');px(g,x+4,148,1,84,'#b8ad96');px(g,x,234,1,3,'#3e2b20');px(g,x+5,234,1,3,'#3e2b20');}px(g,57,168,10,2,'#eadbb8');px(g,58,170,3,6,'#eadbb8');px(g,63,170,2,4,'#c1b59a');}
 // The window frame and its sill; the glass itself is drawn every frame.
 for(let y=GLASS.y-3;y<=GLASS.y+GLASS.h;y++){const [a,b]=y<GLASS.y?archEdges(GLASS.y):archEdges(y);px(g,Math.round(a)-4,y,Math.round(b-a)+8,1,'#7a5a3c');}
 px(g,162,110,74,8,'#7a5a3c');px(g,162,110,74,1,'#9a7a54');px(g,164,118,70,2,'#3e2b20');
 // A basket of scrolls under the window: rolls of three heights, one tied with a red cord, in wicker.
 for(const [i,h] of[11,7,9,6,10].entries()){const x=175+i*9,y=152-h;px(g,x,y+1,7,h+2,'#d9c8a0');px(g,x+1,y,5,1,'#efe2c2');px(g,x+1,y+1,1,h,'#efe2c2');px(g,x+6,y+1,1,h+1,'#b8a77f');if(i===2)px(g,x,y+4,7,1,'#a3301c');}
 panel(g,172,152,52,34,'#6b4a33');for(let y=156;y<184;y+=4)px(g,174,y,48,1,'#5a3e2b');for(let x=178;x<222;x+=8)px(g,x,153,1,32,'#7a5a3c');
 // The wall of trophies: 7×2 plaques, the best variant beaten of every monster; an empty place is a hook. The hall of
 // trophies hangs a cloth under them with brass labels; the showcase (décor) puts them behind glass.
 if(up.has('hall')){px(g,242,16,130,46,'#5a1f22');px(g,242,16,130,2,'#7a2f30');for(let x=244;x<370;x+=8)px(g,x,14,5,4,'#6a2a2c');}
 L.MONSTERS.forEach((m,i)=>{const x=248+(i%7)*18,y=20+Math.floor(i/7)*22,best=bestOf(s,m.id);if(up.has('hall'))px(g,x+4,y+17,8,1,'#c9a050');if(!best){px(g,x+7,y+2,2,3,'#9a8f80');return;}
  const col=PLAQUE[best];px(g,x,y,16,16,shade(col,-40));px(g,x+1,y+1,14,14,col);px(g,x+1,y+1,14,1,shade(col,40));paintGrid(g,trophyGrid(m.id,m.trophy.look),x+2,y+2);if(best==='ancient'){px(g,x+13,y+2,1,1,'#ffffff');px(g,x+12,y+2,3,1,'rgba(255,255,255,.5)');}});
 if(decor.has('showcase')){px(g,241,15,132,1,'#c9a050');px(g,241,62,132,2,'#8f6c3a');px(g,241,15,2,48,'#c9a050');px(g,371,15,2,48,'#c9a050');g.fillStyle='rgba(220,240,240,.10)';g.fillRect(243,16,128,46);for(const x of[256,300,340])pixelLine(g,x,17,x-10,60,'rgba(255,255,255,.22)');}
 // The ledge of the candles; the candles themselves burn in the frame. The silver candelabrum is a sconce on the wall.
 px(g,258,80,90,4,'#5e4330');px(g,258,80,90,1,'#7a5a3c');px(g,262,84,2,4,'#3e2b20');px(g,342,84,2,4,'#3e2b20');
 if(up.has('candle2')){px(g,240,76,4,18,'#8a8a92');px(g,234,74,16,2,'#c9d2d6');for(const x of[234,240,246]){px(g,x,70,4,4,'#c9d2d6');px(g,x,62,3,8,'#e8dcc0');}}
 // The alchemy corner: two shelves of flasks (filled by the doses in store), the hearth and the cauldron on its tripod.
 for(const y of[74,96]){px(g,378,y,88,3,'#7a5a3c');px(g,378,y+3,88,1,'#3e2b20');}
 L.POTIONS.forEach((p,i)=>{const x=378+(i%5)*17,y=i<5?58:80,n=s.potions[p.id]||0;if(!n&&!s.recipes.includes(p.id)){px(g,x+6,y+14,4,2,'#3e3229');return;}paintGrid(g,flaskGrid(p.look,doseLevel(n)/4),x,y);});
 px(g,456,98,8,8,'#8a8a82');oval(g,460,101,3,2,'#a9a9a0');pixelLine(g,458,96,466,90,'#6b4a33',2);
 for(let y=120;y<206;y++){const dy=y-120,w=y<150?Math.sqrt(Math.max(0,43*43-(43-dy-13)**2)):43;px(g,Math.round(423-w),y,Math.round(2*w),1,'#4a4038');}
 for(let y=130;y<206;y++){const dy=y-130,w=y<158?Math.sqrt(Math.max(0,34*34-(34-dy-6)**2)):34;px(g,Math.round(423-w),y,Math.round(2*w),1,'#1a1410');}
 for(let y=124;y<206;y+=9)for(let x=381+(y%18?0:6);x<465;x+=13){px(g,x,y,12,1,'#3a322c');}
 polygon(g,[[398,170],[448,170],[444,196],[402,196]],'#2a2622');px(g,398,170,50,3,'#4a4440');px(g,400,175,2,16,'#3a3632');pixelLine(g,404,196,398,206,'#3a3634',2);pixelLine(g,442,196,448,206,'#3a3634',2);
 if(up.has('still')){panel(g,448,140,18,28,'#a86a3a');oval(g,457,138,6,4,'#c9883a');pixelLine(g,457,134,450,124,'#c9883a',2);pixelLine(g,450,124,446,128,'#c9883a');px(g,450,150,14,1,'#e0a060');}
 // The celestial globe by the alchemy corner (décor).
 if(decor.has('globe')){pixelLine(g,460,226,460,244,'#6b4a33',2);px(g,454,243,13,2,'#5e4330');oval(g,460,216,8,8,'#3a5a7a');oval(g,460,216,8,8,'#3a5a7a');pixelLine(g,452,216,468,216,'#c9a050');pixelLine(g,460,208,460,224,'#c9a050');px(g,456,212,3,2,'#c9b06a');px(g,462,218,2,2,'#c9b06a');oval(g,460,216,9,9,'rgba(0,0,0,0)');for(let a=0;a<12;a++){const t=a/12*Math.PI*2;px(g,460+Math.round(Math.cos(t)*9),216+Math.round(Math.sin(t)*9),1,1,'#8f6c3a');}}
 // Даро's chair stands by the bookcase; the printing press between the table and the hearth.
 chair(g,decor.has('armchair'));
 if(up.has('press')){panel(g,356,196,22,40,'#5a4630');px(g,358,204,18,3,'#3a2a20');pixelLine(g,360,198,374,198,'#8a8a92');px(g,362,214,14,8,'#d9c8a0');}
 return c;}
// What stands on the sill, in front of the glass (the sky is painted over the window every frame): jars of rare parts
// (up to five kinds) and, with the pigeon post (upgrade «Голубятня»), a letter sealed for the Academy and a dish of grain.
function sill(g,s,up){rareJars(s).forEach((p,i)=>jar(g,172+i*11,96,p));
 if(up.has('dovecote')){px(g,163,107,8,3,'#d9c8a0');px(g,163,107,8,1,'#efe2c2');px(g,166,108,2,2,'#a3301c');px(g,228,108,6,2,'#8a6a48');px(g,229,107,4,1,'#c9b06a');}}
// The front of the table with what lies on it, drawn over the keeper so he shows from the waist up; the sill too.
function tableFront(s){const c=canvas(W,H),g=c.getContext('2d'),up=new Set(s.upgrades),decor=new Set(s.decor||[]);sill(g,s,up);
 px(g,238,168,118,8,'#7a5a3c');px(g,238,168,118,1,'#9a7a54');px(g,240,176,114,36,'#5e4330');for(let x=246;x<350;x+=36){px(g,x,181,30,26,'#6b4a36');px(g,x,181,30,1,'#7e5a40');}px(g,240,210,114,2,'#3e2b20');
 // The open bestiary, or the great volume with brass clasps once it is printed.
 if(s.printed){px(g,256,152,52,18,'#1c1412');px(g,257,153,50,15,'#2e211c');px(g,259,155,46,2,'#c9a050');px(g,259,164,46,1,'#8f6c3a');px(g,280,152,4,18,'#c9a050');px(g,254,157,3,6,'#c9a050');px(g,307,157,3,6,'#c9a050');px(g,270,158,24,4,'#4a2a22');}
 else{polygon(g,[[262,170],[282,166],[302,170],[302,172],[262,172]],'#ecdfbf');px(g,282,165,1,7,'#a88d5f');px(g,265,168,14,1,'#a88d5f');px(g,286,168,13,1,'#a88d5f');px(g,268,169,6,2,'#5b4733');px(g,288,169,9,1,'#a88d5f');}
 px(g,308,163,6,6,'#2a2420');px(g,309,163,4,1,'#4a4440');px(g,328,166,10,3,'#c9a050');px(g,331,154,4,12,'#e8dcc0');
 if(up.has('candle1')){px(g,240,164,10,4,'#a87a3a');px(g,243,158,4,6,'#a87a3a');px(g,244,150,3,8,'#e8dcc0');}
 if(decor.has('lamp')){px(g,252,162,8,6,'#a8703a');px(g,253,156,6,6,'#c98a4a');px(g,250,152,3,10,'#d9a060');px(g,255,154,2,2,'#ffe0a0');}
 if(up.has('lens')){pixelLine(g,346,168,346,158,'#a87a3a');px(g,342,151,9,9,'#a87a3a');px(g,343,152,7,7,'#cfe3e8');px(g,344,153,2,2,'#ffffff');}
 return c;}
// The sky and hills behind the glass, cached for 24 steps of the day × weather × season (the twelve latest kept).
const skies=new Map();
function skyPane(amb,w=GLASS.w,h=GLASS.h){const step=Math.round(amb.phase*23),key=`${step}|${amb.weather}|${amb.season}|${w}x${h}`;let pane=skies.get(key);if(pane){skies.delete(key);skies.set(key,pane);return pane;}
 pane=canvas(w,h);const g=pane.getContext('2d'),k=sky(step/23,amb.weather);
 for(let y=0;y<h;y+=4)px(g,0,y,w,4,mix(k.top,k.bottom,y/(h*.8)));
 const hill=mix(HILLS[amb.season],k.hill,.25+.5*Math.max(0,Math.min(1,(step/23-.8)*5))),sx=w/62,sy=h/82;polygon(g,[[0,58*sy],[18*sx,44*sy],[36*sx,54*sy],[w,40*sy],[w,h],[0,h]],hill);
 // The roofs of Velen below: a spire and a few gables.
 const roof=shade(hill,-26);polygon(g,[[0,70*sy],[8*sx,64*sy],[14*sx,68*sy],[22*sx,60*sy],[30*sx,66*sy],[40*sx,62*sy],[48*sx,67*sy],[w,63*sy],[w,h],[0,h]],roof);px(g,37*sx,50*sy,2,13*sy,roof);polygon(g,[[36*sx,51*sy],[38*sx,44*sy],[40*sx,51*sy]],roof);
 if(amb.season===1)px(g,0,70*sy,w,1,'#e6eaec');
 skies.set(key,pane);if(skies.size>12)skies.delete(skies.keys().next().value);return pane;}
let lead=null,stained=null;
// The leaded diamonds over the glass: lines every 8 px in both diagonals, drawn once.
function leadPane(){if(lead)return lead;lead=canvas(W,H);const g=lead.getContext('2d');g.save();archClip(g);g.fillStyle='rgba(207,227,208,.12)';g.fillRect(GLASS.x,GLASS.y,GLASS.w,GLASS.h);
 for(let k=-GLASS.h;k<GLASS.w+GLASS.h;k+=8){pixelLine(g,GLASS.x+k,GLASS.y,GLASS.x+k+GLASS.h,GLASS.y+GLASS.h,'rgba(42,36,32,.8)');pixelLine(g,GLASS.x+k,GLASS.y,GLASS.x+k-GLASS.h,GLASS.y+GLASS.h,'rgba(42,36,32,.8)');}
 for(const [x,y] of[[180,50],[214,72],[190,94],[205,40]])px(g,x,y,1,1,'rgba(255,255,255,.35)');g.restore();return lead;}
// Coloured glass in the upper arch of the window (décor «Витраж»): diamonds of four colours, drawn once.
function stainedPane(){if(stained)return stained;stained=canvas(W,H);const g=stained.getContext('2d'),cols=['rgba(163,48,28,.55)','rgba(51,68,122,.55)','rgba(201,160,80,.55)','rgba(45,95,82,.55)'];g.save();archClip(g);
 for(let y=GLASS.y;y<62;y+=8)for(let x=GLASS.x-4+((y/8)%2?4:0);x<GLASS.x+GLASS.w;x+=8)polygon(g,[[x+4,y],[x+8,y+4],[x+4,y+8],[x,y+4]],cols[(Math.floor(x/8)+Math.floor(y/8))%4]);
 px(g,GLASS.x,61,GLASS.w,2,'rgba(42,36,32,.9)');g.restore();return stained;}
// The window is alive over the cached room: sky of the hour, clouds, rain (drops crawl down the glass), snow (grey under
// the Black Winter) or fog, the drip of the thaw, stars and the moon of the day at night, the pigeon of the dovecote.
export function paintWindow(c,amb,time=0,{hold=false,thaw=false,dove=false,stain=false,calm=false}={}){const dark=Math.max(0,Math.min(1,(amb.phase-.8)*5)),wet=amb.weather!=='clear',gx=GLASS.x,gy=GLASS.y;
 c.save();archClip(c);c.drawImage(skyPane(amb),gx,gy);
 if(dark>0){for(let i=0;i<8;i++){const sx=gx+2+Math.floor(dayHash(31+i,7)*58),sy=gy+4+Math.floor(dayHash(i,3)*34);c.globalAlpha=dark*(.55+.45*Math.sin(time*.003+i*2.1));px(c,sx,sy,1,1,'#fff6d8');}
  const m=amb.moon??4,mx=gx+46,my=gy+14;c.globalAlpha=dark*(m===0?.25:1);if(m===4){c.globalAlpha=dark*.25;px(c,mx-5,my-5,11,11,'#fff6d8');c.globalAlpha=dark;}
  if(m===0){px(c,mx-3,my-3,7,1,'#fff6d8');px(c,mx-3,my+3,7,1,'#fff6d8');px(c,mx-3,my-3,1,7,'#fff6d8');px(c,mx+3,my-3,1,7,'#fff6d8');}
  else{px(c,mx-3,my-3,7,7,'#fff6d8');if(m!==4){c.fillStyle=sky(1,amb.weather).top;c.fillRect(m<4?mx-3:mx+1,my-3,3,7);}}c.globalAlpha=1;}
 for(let i=0;i<2;i++){const cx=gx-24+((i*47+time*.002)%100),cy=gy+12+i*10+(wet?3:0),col=dark>.5?'rgba(58,68,102,.55)':wet?'rgba(150,160,170,.85)':'rgba(255,255,255,.7)';px(c,cx,cy,20,4,col);px(c,cx+5,cy-3,10,3,col);}
 if(amb.weather==='rain'){for(let i=0;i<12;i++){const ry=gy-6+((i*37+time*.12)%88),rx=gx+((i*23)%60)+Math.floor((ry-gy)*.2);px(c,rx,ry,1,4,'rgba(205,222,240,.6)');}
  for(let i=0;i<3;i++){const y=gy+20+((Math.floor(time/200)+i*23)%62);px(c,gx+12+i*17,y,1,2,'rgba(225,238,248,.8)');}}
 if(amb.weather==='snow'){const flake=hold?'rgba(170,172,170,.9)':'rgba(255,255,255,.9)';for(let i=0;i<12;i++){const sy=gy-2+((i*29+time*.016)%84),sx=gx+((i*31)%60)+Math.round(Math.sin(time*.0012+i)*2);px(c,sx,sy,i%3?1:2,i%3?1:2,flake);}}
 if(amb.weather==='fog'){const drift=Math.sin(time*.0004)*4;px(c,gx,gy+40+drift,GLASS.w,9,'rgba(226,231,234,.4)');px(c,gx,gy+56-drift,GLASS.w,12,'rgba(226,231,234,.32)');}
 // The thaw after the Black Winter: icicles under the eaves outside and drops falling past the glass.
 if(thaw){for(const [x,h] of[[184,6],[193,9],[203,5],[212,8]]){px(c,x,gy+2,2,h,'rgba(220,235,245,.85)');px(c,x,gy+2+h,1,1,'rgba(240,250,255,.9)');}
  if(!calm)for(let i=0;i<4;i++){const p=((time/900+i*.27)%1);px(c,[184,193,203,212][i],gy+12+Math.round(p*84),1,2,'rgba(210,230,245,.8)');}}
 // The pigeon of the dovecote on the outer ledge, nodding once in two seconds.
 if(dove){const nod=calm?0:Math.floor(time/2000)%2&&time%2000<300?1:0;px(c,208,103,8,5,'#9a9aa2');px(c,209,104,6,2,'#c8c8d0');px(c,214+nod,100+nod,3,3,'#8a8a92');px(c,216+nod,101+nod,1,1,'#2a2420');px(c,217+nod,102+nod,1,1,'#c9a050');px(c,209,108,1,2,'#c9a050');px(c,212,108,1,2,'#c9a050');}
 c.restore();const [wx,wy,ww,wh]=[GLASS.x-1,GLASS.y-1,GLASS.w+2,GLASS.h+2];if(stain)c.drawImage(stainedPane(),wx,wy,ww,wh,wx,wy,ww,wh);c.drawImage(leadPane(),wx,wy,ww,wh,wx,wy,ww,wh);
 if(amb.season===1){px(c,164,108,70,2,hold?'#a9aaa8':'#f4f8fa');if(hold)for(const x of[170,186,207,224])px(c,x,107,3,1,'#8f908e');}
 if(thaw){px(c,164,109,70,1,'rgba(150,180,200,.6)');px(c,196,110,1,3,'rgba(150,180,200,.6)');}}
// Light sprites, drawn once: the glow of a flame and of the hearth (no gradient is made in a frame).
const glows=new Map();
function glow(color,r){const key=color+r;let g=glows.get(key);if(g)return g;g=canvas(r*2,r*2);const x=g.getContext('2d'),grad=x.createRadialGradient(r,r,1,r,r,r);grad.addColorStop(0,color);grad.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=grad;x.fillRect(0,0,r*2,r*2);glows.set(key,g);return g;}
const vignettes=new Map();
function vignettePane(w=W,h=H){const key=w+'x'+h;let v=vignettes.get(key);if(v)return v;v=canvas(w,h);const g=v.getContext('2d'),r=g.createRadialGradient(w/2,h*.54,h*.35,w/2,h*.54,w*.62);r.addColorStop(0,'rgba(8,6,4,0)');r.addColorStop(1,'rgba(8,6,4,.6)');g.fillStyle=r;g.fillRect(0,0,w,h);vignettes.set(key,v);return v;}
// Three frames of a flame (art.md 4.4): core, middle and edge; the frame is picked by noise, not by a sine.
const FLAME=[['#fff1c7','#ffcf7a','#f08a3c'],['#fff1c7','#ffcf7a','#e8742c'],['#ffe7a8','#ffcf7a','#f08a3c']];
export function flame(c,x,y,f,size=1){const [a,b,d]=FLAME[f%3];if(size<1){px(c,x+1,y-3,1,3,d);px(c,x+1,y-2,1,1,b);return;}px(c,x,y-6,3,6,d);px(c,x,y-5,3,4,b);px(c,x+1,y-4+(f%2),1,2,a);if(f===2)px(c,x+1,y-7,1,1,d);}
// The fire of a hearth: three frames of tongues over embers (one sprite 30×14 drawn as rectangles).
// Each tongue narrows upwards (edge, middle, core) over a bed of flame and embers.
function fire(c,x,y,w,t,calm){const n=Math.floor(w/8),f=calm?0:Math.floor(t/120);px(c,x-1,y-4,n*8,3,'#f08a3c');
 for(let i=0;i<n;i++){const h=7+Math.round(noise(f,i)*6),x0=x+i*8+(i%2),lean=Math.round(noise(f,i,5)*2)-1;px(c,x0,y-Math.round(h*.5),6,Math.round(h*.5),'#f08a3c');px(c,x0+1+lean,y-Math.round(h*.8),4,Math.round(h*.3),'#f08a3c');px(c,x0+2+lean,y-h,2,Math.round(h*.2)+1,'#ffcf7a');
  px(c,x0+1,y-Math.round(h*.5),4,Math.round(h*.5)-1,'#ffcf7a');px(c,x0+2,y-Math.round(h*.4),2,Math.round(h*.4)-1,'#fff1c7');}px(c,x-2,y-2,n*8+2,2,'#a3301c');for(let i=0;i<n;i++)px(c,x+i*8+3,y-2,2,1,'#e8742c');}
// The cauldron: a surface of the colour of the last potion brewed, bubbles, steam; brewing flares it with sparks (art.md 4.4).
function cauldron(c,cx,cy,rx,t,calm,liquid,brewing){const flare=brewing&&!calm?Math.max(0,1-(t-brewing.at)/3000):0;
 oval(c,cx,cy,rx,3,flare?mix(liquid,'#ffffff',flare*.45):liquid);px(c,cx-rx+4,cy-1,6,1,shade(liquid,40));px(c,cx+4,cy+1,4,1,shade(liquid,-30));
 if(calm)return;const n=flare?6:3;for(let i=0;i<n;i++){const p=((t*.001+i*.37)%1);px(c,cx-rx+6+((i*13)%(rx*2-10)),cy-Math.round(p*4),1+(i%2),1,'rgba(220,240,200,.6)');}
 for(let i=0;i<3;i++){const p=((t*.0004+i*.33)%1),x=cx-12+i*12+Math.round(Math.sin(t*.002+i)*3);c.fillStyle=`rgba(230,220,200,${(.18*(1-p)).toFixed(3)})`;c.fillRect(x,cy-8-Math.round(p*30),3,6);}
 if(flare)for(let i=0;i<12;i++){const p=((t-brewing.at)/3000*2+i/12)%1;px(c,cx-rx+4+((i*17)%(rx*2-8)),cy-4-Math.round(p*30),1,1,i%2?'#fff1c7':shade(liquid,60));}}
// The door: closed, ajar, or open on the sky of the hour and the street, with a wedge of light on the floor.
const doorArch=y=>{const dy=86-y;return dy>0?Math.sqrt(Math.max(0,22*22-dy*dy)):22;};
// The three frames of the door are drawn once each (an open one per step of the sky and weather) and kept.
const doors=new Map();
function doorImage(state,amb){const key=state?`${state}|${Math.round(Math.min(.8,amb.phase)*23)}|${amb.weather}`:'0';let im=doors.get(key);if(im)return im;
 im=canvas(64,176);const g=im.getContext('2d');g.translate(0,-60);door(g,state,state?{phase:Math.round(Math.min(.8,amb.phase)*23)/23,weather:amb.weather}:amb);doors.set(key,im);if(doors.size>8)doors.delete(doors.keys().next().value);return im;}
function door(c,state,amb){
 if(state>0){const k=sky(Math.min(.8,amb.phase),amb.weather);for(let y=64;y<232;y++){const w=doorArch(y);px(c,Math.round(38-w),y,Math.round(2*w),1,y<196?mix(k.top,k.bottom,(y-64)/132):y<200?'#4a423c':'#6b6058');}
  for(let y=204;y<232;y+=7)for(let x=18+(y%14?0:4);x<58;x+=9)px(c,x,y,6,1,'#5a524a');
}
 // The leaf fills the arch when closed, leaves a gap when ajar and stands against the wall when open.
 let right=60;for(let y=64;y<232;y++){const w=doorArch(y),a=Math.round(38-w),b=Math.round(38+w),r=state>=1?a+7:state>0?b-8:b;px(c,a,y,r-a,1,'#5a3d2a');if(state>0)px(c,r,y,1,1,'#2a1c14');if(y===150)right=r;}
 if(state<1){for(let x=24;x<right-3;x+=8)pixelLine(c,x,78,x,230,'#4a3222');for(const y of[96,150,204]){px(c,18,y,right-20,3,'#3a3634');for(let x=21;x<right-3;x+=9)px(c,x,y+1,1,1,'#9a8f80');}px(c,right-9,148,3,6,'#9a8f80');}
 else px(c,22,70,1,160,'#3a2a20');}
// Where people stand (art.md 4.1, 4.6): the chosen guest at the table, the line by the door, Даро's chair, the Magister
// by the window, Федя on the ladder, the keeper behind the table, the door everyone comes in by.
export const SPOTS={table:[226,238],line:[[110,240],[160,246],[194,247]],chair:[114,240],window:[194,246],ladder:[156,180],keeper:[296,194],door:[38,232]};
export class ScriptoriumScene{
 constructor(){this.bg=new Map();this.actors=new Map();this.keeper=createActor(...SPOTS.keeper,'down');this.door=0;this.best=null;this.flash=[];this.left=null;this.spent=null;this.brewing=null;this.liquid='#4a5a3a';this.labBg=new Map();this.thresholds=new Map();}
 key(s){return [s.upgrades.join(','),(s.decor||[]).join(','),L.MONSTERS.map(m=>bestOf(s,m.id)?.[0]||'-').join(''),L.MONSTERS.map(m=>s.monsters[m.id]?.treatise?1:0).join(''),(s.editions||[]).join(','),s.printed?1:0,
  L.POTIONS.map(p=>doseLevel(s.potions[p.id])+(s.recipes.includes(p.id)?'r':'')).join(''),rareJars(s).map(p=>p.id).join(',')].join('|');}
 layers(s){const key=this.key(s);let l=this.bg.get(key);if(!l){l={bg:background(s),front:tableFront(s)};this.bg.set(key,l);if(this.bg.size>4)this.bg.delete(this.bg.keys().next().value);}return l;}
 // A potion brewed in «Опыты»: the cauldron flares in its colour for three seconds and keeps it.
 brew(potion,time){const p=L.POT.get(potion);if(!p)return;this.liquid=p.look?.liquid||this.liquid;this.brewing={at:time};}
 // Everyone to draw with their place and pose; actors keep their walk between frames.
 people(s,guests,chosen,time,dt,calm){const r=lineup(s,guests,chosen),want=new Map();
  // Даро sits in front of the first place of the line, the Magister stands at the third.
  const free=SPOTS.line.filter((_,i)=>!(i===0&&r.daro)&&!(i===2&&r.otto));
  if(r.table)want.set(r.table.id,{person:guestPerson(r.table,s),spot:SPOTS.table,pose:'chat',table:true});
  r.line.forEach((v,i)=>want.set(v.id,{person:guestPerson(v,s),spot:free[i],pose:'idle'}));
  if(r.daro)want.set('#daro',{person:visitorPerson('daro'),spot:SPOTS.chair,pose:'sit',fixed:true});
  if(r.otto)want.set('#otto',{person:visitorPerson('otto'),spot:SPOTS.window,pose:'browse',walk:true});
  if(r.fedya)want.set('#fedya',{person:visitorPerson('fedya'),spot:SPOTS.ladder,pose:'browse',facing:'left',fixed:true,scale:1.15});
  for(const [id,a] of this.actors)if(!want.has(id)){if(calm||a.fixed){this.actors.delete(id);continue;}if(!a.leaving){a.leaving=true;a.table=false;moveActor(a,...SPOTS.door,'scriptorium');}}
  for(const [id,w] of want){let a=this.actors.get(id);const start=calm||w.fixed||!this.seen?w.spot:SPOTS.door;
   if(!a||a.leaving){a=createActor(...start,w.facing||'right');const placed=start===w.spot;a.homeX=placed?w.spot[0]:null;a.homeY=placed?w.spot[1]:null;a.arrived=placed?time-1e4:null;a.enterAt=time+(placed?0:this.actors.size*260);this.actors.set(id,a);}
   Object.assign(a,{person:w.person,fixed:!!w.fixed,scale:w.scale||1.45,slow:(w.person.rag||0)>=3?.6:1,table:!!w.table});
   if(a.homeX!==w.spot[0]||a.homeY!==w.spot[1]){if(calm){a.x=w.spot[0];a.y=w.spot[1];a.path=[];}else moveActor(a,...w.spot,'scriptorium');a.homeX=w.spot[0];a.homeY=w.spot[1];a.arrived=null;}
   a.want=w;}
  const shown=[];
  for(const [id,a] of this.actors){if(time<a.enterAt&&!calm)continue;if(calm){a.path=[];}else updateActor(a,dt,time);
   if(a.leaving){if(!a.path.length){this.actors.delete(id);continue;}shown.push(a);continue;}
   if(!a.path.length){const w=a.want;a.facing=w.facing||'right';if(a.arrived==null)a.arrived=time;
    // A guest bows at the table on arrival, then talks; the others wait, Даро sits, the Magister leafs his book.
    if(a.table&&!calm&&time-a.arrived<560&&this.seen){a.pose='bow';a.poseStarted=a.arrived;}else{a.pose=w.pose;if(a.pose!=='bow')a.poseStarted=Math.floor(time/3400)*3400;}}
   shown.push(a);}
  this.seen=true;return shown;}
 paint(c,s,{guests=[],chosen=null,time=0,dt=.05,amb=ambience(s),calm=false,covered=false}={}){
  const {bg,front}=this.layers(s),t=calm?0:time,f=calm?0:Math.floor(noise(Math.floor(t/120),3)*3),max=P.candleMax(s),left=P.candlesLeft(s),up=s.upgrades,decor=s.decor||[];
  // A new trophy flashes on its plaque; a candle just spent shrinks and smokes (art.md 4.4, 6.1). A frame painted under
  // a dialog (the report of the morning) keeps the news for the first frame that is seen.
  const best=L.MONSTERS.map(m=>bestOf(s,m.id)||'-').join(',');if(this.best===null||!covered){if(this.best!==null&&best!==this.best&&!calm){const was=this.best.split(',');best.split(',').forEach((b,i)=>{if(b!==was[i]&&b!=='-')this.flash.push({i,at:time});});}this.best=best;
   if(this.left!==null&&left<this.left&&!calm)this.spent={i:left,at:time};this.left=left;}
  c.clearRect(0,0,W,H);c.imageSmoothingEnabled=false;c.drawImage(bg,0,0);
  paintWindow(c,amb,t,{hold:!!s.story?.hold,thaw:(s.story?.thaw||0)>0,dove:up.includes('dovecote'),stain:decor.includes('stained'),calm});
  // The candles of the day on the ledge: burning ones, the one just spent going out, stubs with a curl of smoke.
  for(let i=0;i<max;i++){const x=266+i*10,sp=this.spent?.i===i?t-this.spent.at:Infinity;
   if(i<left){px(c,x,68,4,12,'#e8dcc0');px(c,x,68,4,1,'#fff6e0');flame(c,x,68,(f+i)%3);}
   else if(sp<150){px(c,x,68+Math.round(sp/150*9),4,12-Math.round(sp/150*9),'#e8dcc0');flame(c,x,68+Math.round(sp/150*9),f,sp<75?1:.5);}
   else{px(c,x,77,4,3,'#cfc2a4');px(c,x+1,76,2,1,'#2a2420');if(sp<2150&&!calm){const k=(sp-150)/2000;c.globalAlpha=.4*(1-k);px(c,x+1+Math.round(Math.sin(sp*.01)*1.5),72-Math.round(k*12),1,4,'#c8c8c8');c.globalAlpha=1;}}}
  if(up.includes('candle2'))for(const [i,x] of[234,240,246].entries())flame(c,x,62,(f+i+1)%3);
  // The hearth and the cauldron.
  fire(c,404,206,42,t,calm);cauldron(c,423,171,22,t,calm,this.liquid,this.brewing);
  // Dust in the shaft of the window.
  const dark=Math.max(0,Math.min(1,(amb.phase-.8)*5));if(!calm&&dark<1){c.globalAlpha=.5*(1-dark);for(let i=0;i<12;i++){const p=((t*.00004+i*.083)%1),x=180+Math.round(i*9+p*40+Math.sin(t*.0007+i)*4),y=70+Math.round(((i*37)%150)+p*20)%170;px(c,x,y,1,1,'#fff1c7');}c.globalAlpha=1;}
  // People: the guests come in by the door; the keeper writes when nobody is there and talks when a guest is chosen.
  const shown=this.people(s,guests,chosen,time,dt,calm),inDoor=shown.some(a=>a.path.length&&a.x<110),target=inDoor?1:0;
  if(target&&!this.opening&&!calm)this.onDoor?.();this.opening=!!target;this.door=calm?0:Math.max(0,Math.min(1,this.door+(target?1:-1)*dt*5));c.drawImage(doorImage(this.door>.66?1:this.door>.2?.5:0,amb),0,60);
  // An open door lets a wedge of daylight onto the floor.
  if(this.door>.66){c.save();c.globalAlpha=.22;polygon(c,[[17,233],[59,233],[120,252],[28,252]],'#ffe7b0');c.restore();}
  const k=this.keeper,talk=shown.some(a=>a.table&&!a.leaving);k.pose=talk?'chat':'write';k.facing='down';k.poseStarted=talk?Math.floor(time/3400)*3400:0;paintCharacter(c,{...k,shadow:false},keeperPerson(s),t/1000,1.35);
  c.drawImage(front,0,0);flame(c,332,154,f);if(up.includes('candle1'))flame(c,244,150,(f+1)%3);if(decor.includes('lamp')&&!calm)px(c,255,153,2,3,f%2?'#ffe0a0':'#fff1c7');
  for(const a of shown.sort((a,b)=>a.y-b.y))paintCharacter(c,a,a.person,t/1000,a.scale);
  // A new trophy arrives on the wall: the plaque flares and sparks for 300 ms.
  this.flash=this.flash.filter(x=>time-x.at<300);for(const x of this.flash){const px0=248+(x.i%7)*18,py=20+Math.floor(x.i/7)*22,p=(time-x.at)/300;c.globalAlpha=1-p;px(c,px0-1,py-1,18,18,'#fff1c7');for(let j=0;j<6;j++)px(c,px0+8+Math.round(Math.cos(j)*12*p),py+8+Math.round(Math.sin(j)*12*p),1,1,'#ffcf7a');c.globalAlpha=1;}
  // Light: the tint of the hour, then the flames, the hearth and the window through «lighter», then the vignette.
  const k2=sky(amb.phase,amb.weather),flick=calm?1:.85+.15*Math.sin(t*.011)*Math.sin(t*.0037),night=1+.5*dark;
  if(k2.tint!=='#ffffff'){c.save();c.globalCompositeOperation='multiply';c.fillStyle=k2.tint;c.fillRect(0,0,W,H);c.restore();}
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.32*flick*night;c.drawImage(glow('rgba(255,207,122,.9)',90),332-90,150-90);
  c.globalAlpha=.22*flick*night;c.drawImage(glow('rgba(240,138,60,.9)',70),423-70,196-70);c.globalAlpha=.14*(left/Math.max(1,max))*night;c.drawImage(glow('rgba(255,207,122,.9)',50),305-50,72-50);
  if(up.includes('candle2')){c.globalAlpha=.16*flick*night;c.drawImage(glow('rgba(255,207,122,.9)',40),242-40,62-40);}
  if(up.includes('candle1')||decor.includes('lamp')){c.globalAlpha=.14*flick*night;c.drawImage(glow('rgba(255,200,110,.9)',40),250-40,152-40);}
  if(this.brewing&&!calm&&time-this.brewing.at<3000){c.globalAlpha=.3*(1-(time-this.brewing.at)/3000);c.drawImage(glow(this.liquid,60),423-60,170-60);}
  if(this.door>.66&&!calm){c.globalAlpha=.18*(1-dark*.6);c.drawImage(glow('rgba(255,236,190,.9)',50),38-50,200-50);}
  const shaft=.14*(1-.7*amb.phase)*(amb.weather==='clear'?1:.6)*(1-dark)+.05*dark,col=k2.shaft;c.globalAlpha=1;c.fillStyle=`rgba(${parseInt(col.slice(1,3),16)},${parseInt(col.slice(3,5),16)},${parseInt(col.slice(5,7),16)},${shaft.toFixed(3)})`;c.beginPath();c.moveTo(168,60);c.lineTo(230,60);c.lineTo(300,246);c.lineTo(200,246);c.closePath();c.fill();
  c.restore();c.drawImage(vignettePane(),0,0);}
 // ---- the strip «Лаборатория» (art.md 4.7): the alchemy corner close up for «Опыты», 480×150.
 labKey(s){return [s.upgrades.includes('still')?1:0,L.MATERIALS.filter(m=>m.kind==='herb'&&(s.stock[m.id]||0)>0).map(m=>m.id).join(','),L.PARTS.filter(p=>(s.stock[p.id]||0)>0).map(p=>p.id).slice(0,12).join(','),L.POTIONS.map(p=>doseLevel(s.potions[p.id])+(s.recipes.includes(p.id)?'r':'')).join('')].join('|');}
 paintLab(c,s,{time=0,dt=.05,amb=ambience(s),calm=false}={}){const key=this.labKey(s);let bg=this.labBg.get(key);if(!bg){bg=labBackground(s);this.labBg.set(key,bg);if(this.labBg.size>3)this.labBg.delete(this.labBg.keys().next().value);}
  const t=calm?0:time,f=calm?0:Math.floor(noise(Math.floor(t/120),5)*3),dark=Math.max(0,Math.min(1,(amb.phase-.8)*5));c.clearRect(0,0,LAB.w,LAB.h);c.imageSmoothingEnabled=false;c.drawImage(bg,0,0);
  // The keeper stands at the pot and stirs: his ladle goes in over the rim and the front of the pot hides it.
  fire(c,214,140,56,t,calm);cauldron(c,242,100,34,t,calm,this.liquid,this.brewing);flame(c,330,40,f);
  paintCharacter(c,{x:294,y:146,facing:'left',pose:'stir',poseStarted:calm?0:Math.floor(t/660)*660,shadow:true},keeperPerson(s),t/1000,1.55);c.drawImage(potFront(),0,0);
  const k2=sky(amb.phase,amb.weather),flick=calm?1:.85+.15*Math.sin(t*.011)*Math.sin(t*.0037);
  if(k2.tint!=='#ffffff'){c.save();c.globalCompositeOperation='multiply';c.fillStyle=k2.tint;c.fillRect(0,0,LAB.w,LAB.h);c.restore();}
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.32*flick*(1+.5*dark);c.drawImage(glow('rgba(240,138,60,.9)',90),242-90,132-90);c.globalAlpha=.2*flick;c.drawImage(glow('rgba(255,207,122,.9)',50),331-50,36-50);
  if(this.brewing&&!calm&&time-this.brewing.at<3000){c.globalAlpha=.4*(1-(time-this.brewing.at)/3000);c.drawImage(glow(this.liquid,70),242-70,100-70);}
  c.restore();c.drawImage(vignettePane(LAB.w,LAB.h),0,0);}
 // ---- «Порог» of the morning report (art.md 3.9): the hunter in the doorway against the morning sky, 240×80.
 paintThreshold(c,person,{weather='clear',season=0}={}){const key=weather+'|'+season;let bg=this.thresholds.get(key);if(!bg){bg=thresholdBackground(weather,season);this.thresholds.set(key,bg);}
  c.clearRect(0,0,THRESHOLD.w,THRESHOLD.h);c.imageSmoothingEnabled=false;c.drawImage(bg,0,0);paintCharacter(c,{x:120,y:77,facing:'down',pose:'idle',poseStarted:0},person,0,1.05);
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.16;c.drawImage(glow('rgba(255,236,190,.9)',60),120-60,40-60);c.restore();c.drawImage(vignettePane(THRESHOLD.w,THRESHOLD.h),0,0);}
 // What a tap on the strip of the laboratory means: the cauldron and the potions lead to «Алхимия», the jars to «Образцы».
 static labTarget(x,y){if(x>=180&&x<=300&&y>=40)return 'alchemy';if(x>=318&&y<=80)return 'alchemy';if(x<=170)return 'samples';return null;}
}
// The background of the strip «Лаборатория»: a beam of herbs (the herbs in store), shelves of jars (the parts in store),
// the hearth with the cauldron, the shelf of potions and the still.
function labBackground(s){const c=canvas(LAB.w,LAB.h),g=c.getContext('2d');px(g,0,0,LAB.w,LAB.h,'#3e3229');
 for(let y=0,row=0;y<120;y+=20,row++)for(let x=-(row%2?16:0);x<LAB.w;x+=32){const x0=Math.max(0,x),w=Math.min(x+31,LAB.w)-x0;if(w<=2)continue;px(g,x0,y,w,19,'#5a4b3e');px(g,x0,y,w,1,'#7a6856');px(g,x0,y+18,w,1,'#3e3229');texture(g,x0+1,y+2,w-2,15,['#665546','#4f4136'],.12,row*5+x);}
 for(let y=120,row=0;y<LAB.h;y+=15,row++){px(g,0,y,LAB.w,14,row%2?'#6b4a33':'#5e412d');px(g,0,y+14,LAB.w,1,'#3e2b20');}
 // The beam with bunches of the herbs in store (up to eight).
 px(g,4,10,176,6,'#5e4330');px(g,4,10,176,1,'#7a5a3c');px(g,4,16,176,1,'#3e2b20');
 L.MATERIALS.filter(m=>m.kind==='herb'&&(s.stock[m.id]||0)>0).slice(0,8).forEach((m,i)=>{const x=12+i*21,col=m.look?.c?.[0]||'#6f8a4a',c2=m.look?.c?.[1];pixelLine(g,x+4,16,x+4,22,'#d9c8a0');polygon(g,[[x+1,22],[x+8,22],[x+9,36],[x+5,40],[x,36]],shade(col,-30));polygon(g,[[x+2,23],[x+7,23],[x+8,35],[x+5,38],[x+1,35]],col);px(g,x+3,25,1,9,shade(col,35));px(g,x+1,22,8,2,'#a87a4a');if(c2)for(const [dx,dy] of[[2,28],[6,31],[4,34]])px(g,x+dx,dy,2,2,c2);});
 // Shelves of jars with the parts in store.
 for(const y of[70,108]){px(g,8,y,164,3,'#7a5a3c');px(g,8,y+3,164,1,'#3e2b20');px(g,12,y+4,2,6,'#3e2b20');px(g,166,y+4,2,6,'#3e2b20');}
 L.PARTS.filter(p=>(s.stock[p.id]||0)>0).slice(0,12).forEach((p,i)=>{const x=14+(i%6)*26,y=i<6?52:90;px(g,x,y,18,18,'rgba(200,230,210,.25)');px(g,x,y,1,18,'rgba(230,245,240,.45)');paintGrid(g,itemGrid(p.look),x+1,y+2);px(g,x-1,y-2,20,3,'#6b4a33');});
 // The hearth with the cauldron on its tripod.
 for(let y=20;y<138;y++){const dy=y-20,w=y<60?Math.sqrt(Math.max(0,62*62-(62-dy-22)**2)):62;px(g,Math.round(240-w),y,Math.round(2*w),1,'#4a4038');}
 for(let y=30;y<138;y++){const dy=y-30,w=y<64?Math.sqrt(Math.max(0,50*50-(50-dy-16)**2)):50;px(g,Math.round(240-w),y,Math.round(2*w),1,'#1a1410');}
 for(let y=26;y<138;y+=10)for(let x=180+(y%20?0:7);x<300;x+=14){px(g,x,y,13,1,'#3a322c');}
 // The back of the pot and the far leg of its tripod; the front is drawn over the keeper's ladle (potFront).
 polygon(g,[[206,98],[278,98],[278,104],[206,104]],'#2a2622');pixelLine(g,242,126,242,142,'#2a2622',2);
 // The shelf of potions and a candle on it; the still when there is one.
 px(g,316,56,152,3,'#7a5a3c');px(g,316,59,152,1,'#3e2b20');px(g,326,40,8,16,'#e8dcc0');px(g,324,54,12,2,'#c9a050');
 L.POTIONS.forEach((p,i)=>{const x=338+i*13,n=s.potions[p.id]||0;if(!n&&!s.recipes.includes(p.id))return;paintGrid(g,flaskGrid(p.look,doseLevel(n)/4),x,40);});
 if(s.upgrades.includes('still')){panel(g,430,82,26,38,'#a86a3a');oval(g,443,80,9,5,'#c9883a');pixelLine(g,443,75,420,62,'#c9883a',2);px(g,432,96,22,1,'#e0a060');px(g,434,120,4,18,'#5e4330');px(g,448,120,4,18,'#5e4330');}
 px(g,316,104,60,4,'#5e4330');px(g,320,108,3,30,'#3e2b20');px(g,368,108,3,30,'#3e2b20');oval(g,334,100,6,4,'#8a8a82');pixelLine(g,334,96,344,88,'#6b4a33',2);
 return c;}
// The front of the pot of the strip with its rim and two legs of the tripod, drawn once.
let pot=null;
function potFront(){if(pot)return pot;pot=canvas(LAB.w,LAB.h);const g=pot.getContext('2d');
 polygon(g,[[206,102],[278,102],[270,130],[214,130]],'#2a2622');polygon(g,[[209,104],[275,104],[268,127],[216,127]],'#3a3632');px(g,204,99,74,4,'#4a4440');px(g,205,99,72,1,'#6a625a');px(g,212,106,3,18,'#4a4642');px(g,216,127,52,1,'#22201c');
 pixelLine(g,218,130,208,144,'#3a3634',2);pixelLine(g,266,130,276,144,'#3a3634',2);return pot;}
// The doorway of the morning: a stone arch, the morning sky and the street of Velen, the weather of the day.
function thresholdBackground(weather,season){const c=canvas(THRESHOLD.w,THRESHOLD.h),g=c.getContext('2d'),k=sky(.04,weather);
 px(g,0,0,THRESHOLD.w,THRESHOLD.h,'#2e251f');for(let y=0,row=0;y<THRESHOLD.h;y+=12,row++)for(let x=-(row%2?14:0);x<THRESHOLD.w;x+=28){px(g,x+1,y+1,26,10,'#4a3e34');px(g,x+1,y+1,26,1,'#5a4b3e');}
 const edge=y=>{const dy=30-y;return dy>0?Math.sqrt(Math.max(0,38*38-dy*dy))*.92:35;};
 for(let y=4;y<THRESHOLD.h;y++){const w=edge(y);px(g,Math.round(120-w-5),y,Math.round(2*w+10),1,'#6a5a4c');}
 for(let y=6;y<THRESHOLD.h;y++){const w=edge(y);px(g,Math.round(120-w),y,Math.round(2*w),1,y<54?mix(k.top,k.bottom,(y-6)/48):'#6b6058');}
 const hill=shade(mix(HILLS[season],k.hill,.3),-30);polygon(g,[[84,50],[96,42],[104,46],[114,38],[124,44],[136,40],[148,46],[156,44],[156,56],[84,56]],hill);px(g,128,30,2,12,hill);polygon(g,[[127,31],[129,25],[131,31]],hill);
 for(let y=58;y<THRESHOLD.h;y+=5)for(let x=84+(y%10?0:4);x<156;x+=8)px(g,x,y,6,1,'#5a524a');
 if(weather==='rain')for(let i=0;i<14;i++)px(g,90+(i*29)%62,10+(i*17)%44,1,4,'rgba(205,222,240,.55)');
 if(weather==='snow'){for(let i=0;i<16;i++)px(g,88+(i*31)%64,8+(i*13)%46,1,1,'rgba(255,255,255,.9)');px(g,84,56,72,2,'#e8eef0');}
 if(weather==='fog'){g.fillStyle='rgba(226,231,234,.4)';g.fillRect(84,34,72,14);}
 return c;}
