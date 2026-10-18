// The scriptorium of the keeper (art.md 4.1–4.2, GDD 11.2) on a 480×260 pixel canvas: the limestone wall, the arched door,
// the bookcase with the shelf of treatises, the pointed window with the sky of the hour, the wall of trophies, the ledge of
// candles (as many as the day has, the burnt ones as stubs), the table with the open bestiary, the alchemy corner, and the
// people: the keeper behind the table, the chosen guest at it and two more by the door. What changes only with the state
// is drawn once into a cached background; a frame draws the sky, the flames and the people over it.
import {px,polygon,panel,texture,pixelLine,canvas,shade,noise} from './pixel.js';
import {paintCharacter} from './characters.js';
import {createActor,moveActor,updateActor} from './motion.js';
import {ambience,sky,mix,HILLS,dayHash} from './ambience.js';
import * as L from './lore.js';
import * as P from './progress.js';
export const W=480,H=260;
const OUTFITS=new Set(['smith','miner','farmer','officer','gentleman','rider','surveyor','merchant','apothecary']),HATS=new Set(['tricorn','felt','bonnet']);
// A look from the content, with the fallback for clothes the people of characters.js cannot wear yet (the cassock and
// the skufia come with Г3).
// characters.js fills what a look leaves out from its old «smith» (bearded); a person of the content says it all itself.
export function personOf(id,look,fallback){let p={beard:false,female:false,mature:false,cap:false,carry:false,...look,id};if(!OUTFITS.has(p.outfit))p={...p,...(fallback||{}),outfit:OUTFITS.has(fallback?.outfit)?fallback.outfit:'surveyor'};if(p.hat&&!HATS.has(p.hat))p.hat=HATS.has(fallback?.hat)?fallback.hat:undefined;return p;}
// The person who stands for a guest of the day: a hunter, a townsperson or one of the visitors.
export function guestPerson(v){if(v.kind==='hunter'){const h=L.HUNTER.get(v.who);return personOf(h.id,h.look,h.lookFallback);}if(v.kind==='town'){const t=L.TOWN_TYPE.get(v.who);return personOf('town-'+t.id,t.look);}
 const x=L.VISITOR.get(v.kind);return personOf(x.id,x.look,x.lookFallback);}
export const keeperPerson=s=>{const k=L.KEEPER.get(s.keeper)||L.KEEPER_LOOKS[0];return personOf(k.id,k.look);};
// The best variant beaten of each monster, for the plaque of the wall: wood, brass, silver.
const BEST=['young','grown','ancient'],PLAQUE={young:'#8a5e3c',grown:'#c9a050',ancient:'#c9d2d6'};
const bestOf=(s,id)=>{const t=s.monsters[id]?.troph||[];return BEST.filter(v=>t.includes(v)).at(-1)||null;};
const SPINE={beast:'#6b2f2a',undead:'#4a5a4a',spirit:'#3a4a6a',serpent:'#2f5a5a',water:'#2f4a6a',cursed:'#2a2228'};
// The pointed arch of the window: springing at y 69 from two centres 12 px either side of the middle (art.md 4.3).
const GLASS={x:168,y:28,w:62,h:82},ARCH={c:199,d:12,r:43,spring:69};
function archEdges(y){if(y>=ARCH.spring)return [GLASS.x,GLASS.x+GLASS.w];const t=Math.sqrt(Math.max(0,ARCH.r*ARCH.r-(ARCH.spring-y)**2));return [ARCH.c+ARCH.d-t,ARCH.c-ARCH.d+t];}
function archClip(c,ox=0,oy=0){c.beginPath();for(let y=GLASS.y;y<=GLASS.y+GLASS.h;y++){const [a,b]=archEdges(y);if(b<=a)continue;c.rect(a-ox,y-oy,b-a,1);}c.clip();}
function background(s,key){const c=canvas(W,H),g=c.getContext('2d'),up=new Set(s.upgrades);
 px(g,0,0,W,H,'#120e0b');px(g,8,8,W-16,H-16,'#3e3229');
 // Limestone blocks, the oak panelling and the floor boards.
 for(let y=12,row=0;y<110;y+=22,row++)for(let x=12-(row%2?17:0);x<468;x+=35){const x0=Math.max(12,x),w=Math.min(x+34,468)-x0;if(w<=2)continue;px(g,x0,y,w,21,'#5a4b3e');px(g,x0,y,w,1,'#7a6856');px(g,x0,y+20,w,1,'#3e3229');texture(g,x0+1,y+2,w-2,17,['#665546','#4f4136'],.12,row*7+x);}
 px(g,12,110,456,40,'#4a3426');px(g,12,110,456,3,'#7a5a3c');for(let x=18;x<462;x+=48){px(g,x,117,40,27,'#5e4330');px(g,x+1,118,38,1,'#6e5038');px(g,x,143,40,1,'#3e2b20');}
 for(let y=150,row=0;y<246;y+=18,row++){px(g,12,y,456,17,row%2?'#6b4a33':'#5e412d');px(g,12,y+17,456,1,'#3e2b20');for(let x=12+(row%2?30:0);x<468;x+=74){pixelLine(g,x,y,x,y+16,'#3e2b20');px(g,x+6,y+3,40,1,'#8a6446');}texture(g,12,y+2,456,13,['#57402d','#7a5a40'],.04,row+11);}
 px(g,12,246,456,6,'#2e221a');
 // The arched door with iron straps and rivets.
 const door=(x0,x1,top,bottom)=>{const cx=(x0+x1)/2,r=(x1-x0)/2;for(let y=top;y<bottom;y++){const dy=top+r-y,w=dy>0?Math.sqrt(Math.max(0,r*r-dy*dy)):r;px(g,Math.round(cx-w),y,Math.round(2*w),1,'#5a3d2a');}};
 door(14,62,64,234);door(18,58,68,232);for(let x=24;x<56;x+=8)pixelLine(g,x,78,x,230,'#4a3222');for(const y of[96,150,204]){px(g,18,y,40,3,'#3a3634');for(let x=21;x<56;x+=9)px(g,x,y+1,1,1,'#9a8f80');}px(g,50,150,3,6,'#9a8f80');
 // The bookcase: shelves, spines, the shelf of treatises at the top (a gilt spine for every treatise) and the ladder.
 panel(g,66,16,84,190,'#4a3222');const spines=['#6b2f2a','#2f4a3a','#5a4630','#3a3a52','#7a5a2a'];
 for(const [i,y] of[30,62,94,126,158,190].entries()){px(g,70,y,76,3,'#7a5a3c');if(i===0)continue;for(let x=71,k=i*5;x<142;k++){const w=3+Math.floor(noise(k,i,9)*4),h=18+Math.floor(noise(i,k,4)*10);if(x+w>142)break;px(g,x,y-h,w,h,spines[k%5]);px(g,x,y-h+3,w,1,'#c9a050');x+=w+1;}}
 L.MONSTERS.forEach((m,i)=>{const x=72+i*5;if(s.monsters[m.id]?.treatise){const col=SPINE[m.tags.find(t=>SPINE[t])]||'#5a4630';px(g,x,20,4,10,col);px(g,x,22,4,1,'#e8c56a');px(g,x,27,4,1,'#e8c56a');if(s.editions?.includes(m.id))px(g,x+1,24,2,2,'#f2d69a');}else px(g,x,22,4,8,'#2a1d16');});
 pixelLine(g,140,20,152,204,'#7a5a3c',2);pixelLine(g,150,20,162,204,'#7a5a3c',2);for(let y=36;y<200;y+=18)pixelLine(g,141+(y-20)/16,y,152+(y-20)/16,y,'#8a6a48');
 // The window frame and its sill; the glass itself is drawn every frame.
 for(let y=GLASS.y-3;y<=GLASS.y+GLASS.h;y++){const [a,b]=y<GLASS.y?archEdges(GLASS.y):archEdges(y);px(g,Math.round(a)-4,y,Math.round(b-a)+8,1,'#7a5a3c');}
 px(g,162,110,74,8,'#7a5a3c');px(g,162,110,74,1,'#9a7a54');px(g,164,118,70,2,'#3e2b20');
 // Jars of rare parts on the sill (up to five kinds), a basket of scrolls below.
 L.PARTS.filter(p=>p.kind==='rare'&&(s.stock[p.id]||0)>0).slice(0,5).forEach((p,i)=>{const x=172+i*11;px(g,x,98,9,12,'rgba(200,230,210,.35)');px(g,x+1,104,7,5,L.MAT.get(p.id).look?.c?.[0]||'#8a7a6a');px(g,x,97,9,2,'#6b4a33');});
 panel(g,172,152,52,34,'#6b4a33');for(let i=0;i<5;i++){px(g,176+i*9,146,7,8,'#d9c8a0');px(g,177+i*9,147,5,1,'#efe2c2');}
 // The wall of trophies: 7×2 plaques, the best variant beaten of every monster; an empty place is a hook.
 if(up.has('hall')){px(g,242,16,130,46,'#5a1f22');px(g,242,16,130,2,'#7a2f30');}
 L.MONSTERS.forEach((m,i)=>{const x=248+(i%7)*18,y=20+Math.floor(i/7)*22,best=bestOf(s,m.id);if(!best){px(g,x+7,y+2,2,3,'#9a8f80');return;}
  const col=PLAQUE[best];px(g,x,y,16,16,shade(col,-40));px(g,x+1,y+1,14,14,col);px(g,x+1,y+1,14,1,shade(col,40));const t=m.trophy.look?.c||['#cfcfd0'];polygon(g,[[x+5,y+3],[x+11,y+4],[x+12,y+10],[x+8,y+13],[x+4,y+10]],t[0]);if(t[1])px(g,x+7,y+8,3,3,t[1]);if(best==='ancient')px(g,x+13,y+2,1,1,'#ffffff');});
 // The ledge of the candles; the candles themselves burn in the frame.
 px(g,258,80,90,4,'#5e4330');px(g,258,80,90,1,'#7a5a3c');px(g,262,84,2,4,'#3e2b20');px(g,342,84,2,4,'#3e2b20');
 if(up.has('candle2')){px(g,238,72,8,22,'#6a6a72');for(const x of[236,240,244])px(g,x,66,3,7,'#e8dcc0');}
 // The alchemy corner: two shelves of flasks (filled by the doses in store), the hearth and the cauldron on its tripod.
 for(const y of[74,96]){px(g,378,y,88,3,'#7a5a3c');px(g,378,y+3,88,1,'#3e2b20');}
 L.POTIONS.forEach((p,i)=>{const x=382+(i%5)*17,y=i<5?62:84,n=s.potions[p.id]||0;px(g,x,y,7,12,'rgba(210,225,220,.28)');px(g,x+2,y-2,3,2,'#6b4a33');if(n>0){const h=Math.max(2,Math.round(10*n/P.LIMITS.doses));px(g,x+1,y+11-h,5,h,p.look?.liquid||'#4a5a3a');}});
 for(let y=120;y<206;y++){const dy=y-120,w=y<150?Math.sqrt(Math.max(0,43*43-(43-dy-13)**2)):43;px(g,Math.round(423-w),y,Math.round(2*w),1,'#4a4038');}
 for(let y=130;y<206;y++){const dy=y-130,w=y<158?Math.sqrt(Math.max(0,34*34-(34-dy-6)**2)):34;px(g,Math.round(423-w),y,Math.round(2*w),1,'#1a1410');}
 for(let y=124;y<206;y+=9)for(let x=381+(y%18?0:6);x<465;x+=13){px(g,x,y,12,1,'#3a322c');}
 polygon(g,[[398,170],[448,170],[444,196],[402,196]],'#2a2622');px(g,398,170,50,3,'#4a4440');pixelLine(g,404,196,398,206,'#3a3634',2);pixelLine(g,442,196,448,206,'#3a3634',2);
 if(up.has('still')){panel(g,448,140,18,28,'#a86a3a');pixelLine(g,457,140,452,128,'#c9883a',2);}
 // The table with the open bestiary, the inkwell and the candlestick; a great volume once the bestiary is printed.
 px(g,238,168,118,8,'#7a5a3c');px(g,238,168,118,1,'#9a7a54');px(g,240,176,114,36,'#5e4330');for(let x=246;x<350;x+=36){px(g,x,181,30,26,'#6b4a36');px(g,x,181,30,1,'#7e5a40');}
 if(s.printed){panel(g,258,154,48,16,'#2a1d18');px(g,262,156,40,2,'#c9a050');px(g,280,154,4,16,'#c9a050');}
 else{polygon(g,[[262,170],[282,166],[302,170],[302,172],[262,172]],'#ecdfbf');px(g,282,165,1,7,'#a88d5f');px(g,265,168,14,1,'#a88d5f');px(g,286,168,13,1,'#a88d5f');}
 px(g,308,163,6,6,'#2a2420');pixelLine(g,311,163,318,152,'#fff1c7');px(g,328,166,10,3,'#c9a050');px(g,331,154,4,12,'#e8dcc0');
 if(up.has('candle1')){px(g,242,164,8,4,'#a87a3a');px(g,244,152,4,12,'#e8dcc0');}
 if(up.has('lens')){pixelLine(g,346,168,346,156,'#a87a3a');px(g,342,151,9,9,'#a87a3a');px(g,343,152,7,7,'#cfe3e8');}
 if(up.has('press')){panel(g,356,196,22,40,'#5a4630');px(g,358,204,18,3,'#3a2a20');}
 if(up.has('infirmary')){px(g,60,150,6,82,'#d9d0bc');px(g,60,150,6,2,'#8a7a6a');}
 if(up.has('dovecote')){px(g,226,22,8,6,'#cfcfd0');px(g,233,23,2,2,'#cfcfd0');px(g,231,22,1,1,'#2a2420');}
 return c;}
// The sky and hills behind the glass, cached for 24 steps of the day × weather × season (the twelve latest kept).
const skies=new Map();
function skyPane(amb){const step=Math.round(amb.phase*23),key=`${step}|${amb.weather}|${amb.season}`;let pane=skies.get(key);if(pane){skies.delete(key);skies.set(key,pane);return pane;}
 pane=canvas(GLASS.w,GLASS.h);const g=pane.getContext('2d'),k=sky(step/23,amb.weather);
 for(let y=0;y<GLASS.h;y+=4)px(g,0,y,GLASS.w,4,mix(k.top,k.bottom,y/66));
 const hill=mix(HILLS[amb.season],k.hill,.25+.5*Math.max(0,Math.min(1,(step/23-.8)*5)));polygon(g,[[0,58],[18,44],[36,54],[62,40],[62,82],[0,82]],hill);
 // The roofs of Velen below: a spire and a few gables.
 const roof=shade(hill,-26);polygon(g,[[0,70],[8,64],[14,68],[22,60],[30,66],[40,62],[48,67],[62,63],[62,82],[0,82]],roof);px(g,37,50,2,13,roof);polygon(g,[[36,51],[38,44],[40,51]],roof);
 if(amb.season===1){px(g,0,70,62,1,'#e6eaec');}
 skies.set(key,pane);if(skies.size>12)skies.delete(skies.keys().next().value);return pane;}
let lead=null;
// The leaded diamonds over the glass: lines every 8 px in both diagonals, drawn once.
function leadPane(){if(lead)return lead;lead=canvas(W,H);const g=lead.getContext('2d');g.save();archClip(g);g.fillStyle='rgba(207,227,208,.12)';g.fillRect(GLASS.x,GLASS.y,GLASS.w,GLASS.h);
 for(let k=-GLASS.h;k<GLASS.w+GLASS.h;k+=8){pixelLine(g,GLASS.x+k,GLASS.y,GLASS.x+k+GLASS.h,GLASS.y+GLASS.h,'rgba(42,36,32,.8)');pixelLine(g,GLASS.x+k,GLASS.y,GLASS.x+k-GLASS.h,GLASS.y+GLASS.h,'rgba(42,36,32,.8)');}
 for(const [x,y] of[[180,50],[214,72],[190,94],[205,40]])px(g,x,y,1,1,'rgba(255,255,255,.35)');g.restore();return lead;}
// The window is alive over the cached room: sky of the hour, clouds, rain, snow (grey under the Black Winter) or fog,
// stars and the moon of the day at night.
export function paintWindow(c,amb,time=0,{hold=false}={}){const dark=Math.max(0,Math.min(1,(amb.phase-.8)*5)),wet=amb.weather!=='clear',gx=GLASS.x,gy=GLASS.y;
 c.save();archClip(c);c.drawImage(skyPane(amb),gx,gy);
 if(dark>0){for(let i=0;i<8;i++){const sx=gx+2+Math.floor(dayHash(31+i,7)*58),sy=gy+4+Math.floor(dayHash(i,3)*34);c.globalAlpha=dark*(.55+.45*Math.sin(time*.003+i*2.1));px(c,sx,sy,1,1,'#fff6d8');}
  c.globalAlpha=dark;const m=amb.moon??4,mx=gx+46,my=gy+14;if(m===0){c.globalAlpha=dark*.25;}px(c,mx-3,my-3,7,7,'#fff6d8');if(m!==4&&m!==0){c.fillStyle=sky(1,amb.weather).top;c.fillRect(m<4?mx-3:mx+1,my-3,3,7);}c.globalAlpha=1;}
 for(let i=0;i<2;i++){const cx=gx-24+((i*47+time*.002)%100),cy=gy+12+i*10+(wet?3:0),col=dark>.5?'rgba(58,68,102,.55)':wet?'rgba(150,160,170,.85)':'rgba(255,255,255,.7)';px(c,cx,cy,20,4,col);px(c,cx+5,cy-3,10,3,col);}
 if(amb.weather==='rain')for(let i=0;i<12;i++){const ry=gy-6+((i*37+time*.12)%88),rx=gx+((i*23)%60)+Math.floor((ry-gy)*.2);px(c,rx,ry,1,4,'rgba(205,222,240,.6)');}
 if(amb.weather==='snow'){const flake=hold?'rgba(170,172,170,.9)':'rgba(255,255,255,.9)';for(let i=0;i<12;i++){const sy=gy-2+((i*29+time*.016)%84),sx=gx+((i*31)%60)+Math.round(Math.sin(time*.0012+i)*2);px(c,sx,sy,i%3?1:2,i%3?1:2,flake);}}
 if(amb.weather==='fog'){const drift=Math.sin(time*.0004)*4;px(c,gx,gy+40+drift,GLASS.w,9,'rgba(226,231,234,.4)');px(c,gx,gy+56-drift,GLASS.w,12,'rgba(226,231,234,.32)');}
 c.restore();c.drawImage(leadPane(),0,0);
 if(amb.season===1)px(c,164,108,70,2,hold?'#a9aaa8':'#f4f8fa');}
// Light sprites, drawn once: the glow of a flame and of the hearth (no gradient is made in a frame).
const glows=new Map();
function glow(color,r){const key=color+r;let g=glows.get(key);if(g)return g;g=canvas(r*2,r*2);const x=g.getContext('2d'),grad=x.createRadialGradient(r,r,1,r,r,r);grad.addColorStop(0,color);grad.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=grad;x.fillRect(0,0,r*2,r*2);glows.set(key,g);return g;}
let vignette=null;
function vignettePane(){if(vignette)return vignette;vignette=canvas(W,H);const g=vignette.getContext('2d'),v=g.createRadialGradient(240,140,90,240,140,300);v.addColorStop(0,'rgba(8,6,4,0)');v.addColorStop(1,'rgba(8,6,4,.6)');g.fillStyle=v;g.fillRect(0,0,W,H);return vignette;}
const FLAME=[['#fff1c7','#ffcf7a','#f08a3c'],['#fff1c7','#ffcf7a','#e8742c'],['#ffe7a8','#ffcf7a','#f08a3c']];
function flame(c,x,y,f){const [a,b,d]=FLAME[f%3];px(c,x,y-6,3,6,d);px(c,x,y-5,3,4,b);px(c,x+1,y-4+(f%2),1,2,a);if(f===2)px(c,x+1,y-7,1,1,d);}
// Where the guests stand: the chosen one at the table, two more waiting by the door, coming in from the door.
const SPOTS={table:[226,238],queue:[[110,240],[160,246]],door:[38,232]};
export class ScriptoriumScene{
 constructor(){this.bg=new Map();this.actors=new Map();this.keeper=createActor(296,186,'down');}
 key(s){return [s.upgrades.join(','),L.MONSTERS.map(m=>bestOf(s,m.id)?.[0]||'-').join(''),L.MONSTERS.map(m=>s.monsters[m.id]?.treatise?1:0).join(''),(s.editions||[]).length,s.printed?1:0,
  L.POTIONS.map(p=>s.potions[p.id]||0).join(''),L.PARTS.filter(p=>p.kind==='rare'&&(s.stock[p.id]||0)>0).map(p=>p.id).slice(0,5).join(',')].join('|');}
 // The guests in view: the chosen one at the table, then up to two more of the queue by the door.
 cast(list,chosen){const first=list.find(v=>v.id===chosen)||list[0];return first?[first,...list.filter(v=>v!==first).slice(0,2)]:[];}
 paint(c,s,{guests=[],chosen=null,time=0,dt=.05,amb=ambience(s),calm=false}={}){
  const key=this.key(s);let bg=this.bg.get(key);if(!bg){bg=background(s,key);this.bg.set(key,bg);if(this.bg.size>4)this.bg.delete(this.bg.keys().next().value);}
  c.clearRect(0,0,W,H);c.imageSmoothingEnabled=false;c.drawImage(bg,0,0);paintWindow(c,amb,time,{hold:!!s.story?.hold});
  const t=calm?0:time,f=calm?0:Math.floor(noise(Math.floor(t/120),3)*3),max=P.candleMax(s),left=P.candlesLeft(s);
  for(let i=0;i<max;i++){const x=266+i*10;if(i<left){px(c,x,68,4,12,'#e8dcc0');px(c,x,68,4,1,'#fff6e0');flame(c,x,68,(f+i)%3);}else{px(c,x,77,4,3,'#cfc2a4');if(!calm&&i===left)px(c,x+1+Math.round(Math.sin(t*.004)),72,1,3,'rgba(200,200,200,.35)');}}
  flame(c,332,154,f);if(s.upgrades.includes('candle1'))flame(c,244,152,(f+1)%3);
  // The hearth: three frames of fire under the cauldron and a few bubbles.
  for(let i=0;i<5;i++){const h=6+Math.round(noise(Math.floor(t/120),i)*6);px(c,404+i*8,206-h,6,h,i%2?'#f08a3c':'#ffcf7a');}px(c,402,204,42,2,'#a3301c');
  if(!calm)for(let i=0;i<3;i++){const p=((t*.001+i*.37)%1);px(c,410+i*12,171-Math.round(p*4),1,1,'rgba(220,240,200,.6)');}
  // People: the guests walk in from the door; the keeper stands behind the table and writes when nobody is there.
  const cast=this.cast(guests,chosen),ids=new Set(cast.map(v=>v.id));for(const id of[...this.actors.keys()])if(!ids.has(id))this.actors.delete(id);
  const shown=[];cast.forEach((v,i)=>{let a=this.actors.get(v.id);const spot=i===0?SPOTS.table:SPOTS.queue[i-1];
   if(!a){a=createActor(...(calm?spot:SPOTS.door),'right');a.person=guestPerson(v);a.homeX=calm?spot[0]:null;a.enterAt=time+i*260;this.actors.set(v.id,a);}
   if(a.homeX!==spot[0]){moveActor(a,spot[0],spot[1],'scriptorium');a.homeX=spot[0];}
   if(calm){a.x=spot[0];a.y=spot[1];a.path=[];}else if(time<a.enterAt)return;else updateActor(a,dt,time);
   if(!a.path.length){a.facing='right';a.pose=i===0?'chat':'idle';a.poseStarted=Math.floor(time/3400)*3400;}shown.push(a);});
  const k=this.keeper;k.pose=cast.length?'chat':'idle';k.facing='down';paintCharacter(c,k,keeperPerson(s),t/1000,1.35);
  // The front of the table hides the keeper below the waist.
  px(c,238,168,118,8,'#7a5a3c');px(c,238,168,118,1,'#9a7a54');px(c,240,176,114,36,'#5e4330');for(let x=246;x<350;x+=36){px(c,x,181,30,26,'#6b4a36');px(c,x,181,30,1,'#7e5a40');}
  if(s.printed){panel(c,258,154,48,16,'#2a1d18');px(c,262,156,40,2,'#c9a050');}else{polygon(c,[[262,170],[282,166],[302,170],[302,172],[262,172]],'#ecdfbf');px(c,282,165,1,7,'#a88d5f');}
  px(c,308,163,6,6,'#2a2420');px(c,328,166,10,3,'#c9a050');px(c,331,154,4,12,'#e8dcc0');flame(c,332,154,f);
  for(const a of shown.sort((a,b)=>a.y-b.y))paintCharacter(c,a,a.person,t/1000,1.45);
  // Light: the tint of the hour, then the flames, the hearth and the window through «lighter», then the vignette.
  const k2=sky(amb.phase,amb.weather),dark=Math.max(0,Math.min(1,(amb.phase-.8)*5)),flick=calm?1:.85+.15*Math.sin(t*.011)*Math.sin(t*.0037);
  if(k2.tint!=='#ffffff'){c.save();c.globalCompositeOperation='multiply';c.fillStyle=k2.tint;c.fillRect(0,0,W,H);c.restore();}
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.32*flick*(1+.5*dark);c.drawImage(glow('rgba(255,207,122,.9)',90),332-90,150-90);
  c.globalAlpha=.22*flick*(1+.5*dark);c.drawImage(glow('rgba(240,138,60,.9)',70),423-70,196-70);c.globalAlpha=.12*(1+dark);c.drawImage(glow('rgba(255,207,122,.9)',50),305-50,72-50);
  const shaft=.14*(1-.7*amb.phase)*(amb.weather==='clear'?1:.6)*(1-dark)+.05*dark;c.globalAlpha=1;c.fillStyle=`rgba(255,236,190,${shaft.toFixed(3)})`;c.beginPath();c.moveTo(168,60);c.lineTo(230,60);c.lineTo(300,246);c.lineTo(200,246);c.closePath();c.fill();
  c.restore();c.drawImage(vignettePane(),0,0);}
}
