import {px,polygon,panel,texture,pixelLine,canvas,sparkle} from './pixel.js';
import {paintCharacter} from './characters.js';
import {drawJewel} from './jewel-art.js';
import {CLIENTS,AREAS,METALS,GEMS} from './jewelry.js';
import {createActor,moveActor,updateActor} from './motion.js';
const backgrounds=new Map(),jeweler={id:'smith',outfit:'gentleman',color:'#527f91',hair:'#51382e',skin:'#d9a17b',beard:true};
function base(shop){const c=canvas(480,260),g=c.getContext('2d');px(g,0,0,480,260,'#1d2a33');px(g,8,8,464,244,'#6d4f3a');
 for(let y=12;y<137;y+=23)for(let x=12;x<468;x+=35){panel(g,x+(y%46?0:-15),y,34,22,'#40656a');texture(g,x,y,33,21,['#7fa197','#2f5257'],.1,4);}
 for(let y=138;y<250;y+=18){px(g,12,y,456,17,y%36?'#97693f':'#865b37');for(let x=12+(y%36?24:0);x<468;x+=69){pixelLine(g,x,y,x,y+15,'#654a3c');px(g,x+5,y+3,42,1,'#c99867');texture(g,x+2,y+2,65,12,['#78513c','#ba8f61'],.05,7);}}
 for(const x of[18,160,453]){panel(g,x,10,9,236,'#825b45');px(g,x+2,12,2,230,'#c19569');}
 for(const x of[35,334]){panel(g,x,26,104,91,'#a47b50');px(g,x+7,32,90,77,'#8bd0cf');polygon(g,[[x+7,80],[x+35,59],[x+62,79],[x+91,63],[x+97,108],[x+7,108]],'#679c84');px(g,x+51,31,4,80,'#e5bb76');px(g,x+6,67,91,4,'#e5bb76');px(g,x+14,38,27,3,'#cfefdd');panel(g,x-3,111,110,7,'#c19661');}
 panel(g,181,21,126,109,'#74583f');for(let y=30;y<119;y+=25){px(g,187,y,114,19,'#243a47');px(g,186,y+18,116,3,'#d7b579');for(let i=0;i<6;i++){const color=Object.values(GEMS)[i].color;panel(g,192+i*18,y+7,11,11,'#9b8054');polygon(g,[[198+i*18,y+8],[202+i*18,y+12],[198+i*18,y+16],[194+i*18,y+12]],color);px(g,197+i*18,y+9,2,2,'#f8e6bc');}}
 panel(g,32,131,101,44,'#997151');for(let i=0;i<4;i++){panel(g,35+i*24,135,21,18,'#b28a5b');px(g,44+i*24,143,4,2,'#f2c475');}px(g,37,153,86,2,'#674a3b');
 if(shop){panel(g,161,128,170,16,'#d3ad79');panel(g,170,145,151,49,'#906b4b');panel(g,177,150,137,35,'#b78b58');panel(g,191,150,109,34,'#4a7679');panel(g,38,184,118,29,'#ae895c');panel(g,337,184,112,29,'#ae895c');panel(g,150,218,178,28,'#6e6262');for(let x=158;x<319;x+=12)px(g,x,221,5,2,'#dbc4a4');}
 else{panel(g,253,187,151,12,'#cfac77');panel(g,261,199,134,39,'#99724e');panel(g,267,204,50,27,'#b59462');panel(g,327,204,62,27,'#ae8555');px(g,292,216,5,2,'#f5d798');px(g,352,217,5,2,'#f5d798');panel(g,321,178,73,7,'#897053');for(let i=0;i<5;i++){polygon(g,[[330+i*12,171],[334+i*12,176],[330+i*12,181],[326+i*12,176]],Object.values(GEMS)[i].color);px(g,329+i*12,172,2,1,'#d8ffea');}pixelLine(g,362,156,359,169,'#d2cda7',2);pixelLine(g,368,156,365,169,'#b8c6c1',2);px(g,360,154,12,3,'#745445');panel(g,393,173,10,14,'#d7b572');px(g,396,169,4,11,'#fff4c5');px(g,397,166,2,4,'#ffc764');}
 // Fine tools, velvet trays, scale and framed drawings belong to the new craft.
 panel(g,184,137,31,26,'#aa8358');px(g,188,141,23,18,'#e8d4a8');pixelLine(g,192,156,204,146,'#847057');sparkle(g,204,146,'#bf9463',3);
 pixelLine(g,222,136,222,159,'#d4b979',2);pixelLine(g,212,143,232,143,'#d4b979',2);pixelLine(g,213,143,213,153,'#9e8a60');pixelLine(g,231,143,231,153,'#9e8a60');px(g,208,154,12,2,'#dec891');px(g,226,154,12,2,'#dec891');
 panel(g,40,212,31,24,'#6f7556');polygon(g,[[54,215],[43,196],[52,204],[55,185],[60,208],[66,200],[59,218]],'#92bf78');
 panel(g,12,247,456,6,'#ac8556');return c;
}
// Window shafts, a candle and drifting dust give the rooms one consistent light source.
function light(c,shop,time){
 c.save();c.globalCompositeOperation='lighter';
 for(const x of[35,334]){const g=c.createLinearGradient(x,30,x+120,250);g.addColorStop(0,'rgba(255,236,190,.16)');g.addColorStop(1,'rgba(255,236,190,0)');c.fillStyle=g;c.beginPath();c.moveTo(x+7,32);c.lineTo(x+97,32);c.lineTo(x+170,250);c.lineTo(x+60,250);c.closePath();c.fill();}
 const candle=shop?[291,150]:[398,168],flicker=.85+.15*Math.sin(time*.011)*Math.sin(time*.0037),glow=c.createRadialGradient(candle[0],candle[1],2,candle[0],candle[1],90);glow.addColorStop(0,`rgba(255,184,96,${.3*flicker})`);glow.addColorStop(1,'rgba(255,184,96,0)');c.fillStyle=glow;c.fillRect(0,0,480,260);
 for(let i=0;i<14;i++){const x=(60+i*29+Math.sin(time*.0004+i)*14)%460+10,y=(40+((time*.008+i*37)%190));c.fillStyle=`rgba(255,240,200,${.25+.2*Math.sin(time*.003+i)})`;c.fillRect(Math.round(x),Math.round(y),1,1);}
 c.restore();
 const v=c.createRadialGradient(240,140,90,240,140,300);v.addColorStop(0,'rgba(8,10,16,0)');v.addColorStop(1,'rgba(8,10,16,.55)');c.fillStyle=v;c.fillRect(0,0,480,260);
}
export class AtelierScene{
 constructor(){this.thumbs=new Map();this.actors=new Map();this.time=0;this.main=createActor(236,228);this.lastBuyer=null;this.art=canvas(160,160);this.artKey=null;}
 artwork(design){const key=JSON.stringify(design);if(key!==this.artKey){this.art.getContext('2d').clearRect(0,0,160,160);drawJewel(this.art.getContext('2d'),design,{size:160});this.artKey=key;}return this.art;}
 paint(c,state,{shop=false,design=null,stock=[],working=false,tool='engrave',buyerId=null,time=0,dt=.03}={}){
  if(!backgrounds.has(shop))backgrounds.set(shop,base(shop));c.clearRect(0,0,480,260);c.drawImage(backgrounds.get(shop),0,0);
  if(shop){
   const guests=state.customers.filter(b=>!b.served),chosen=guests.find(b=>b.id===buyerId)||guests[0],ids=new Set(guests.slice(0,3).map(b=>b.id));if(chosen)ids.add(chosen.id);
   for(const [id,a]of this.actors)if(!ids.has(id))this.actors.delete(id);
   const visible=[];let slot=0,entry=0;for(const buyer of guests.filter(b=>ids.has(b.id)).slice(0,4)){let a=this.actors.get(buyer.id);if(!a){a=createActor(44,229,'right');a.person=CLIENTS.find(p=>p.id===buyer.client);a.enterAt=time+entry*220;this.actors.set(buyer.id,a);}entry++;const selected=buyer===chosen,pos=selected?[210,240]:[[78,232],[389,234],[130,244]][slot++];if(a.homeX!==pos[0]){moveActor(a,...pos,'atelier-shop');a.homeX=pos[0];}if(time<a.enterAt)continue;updateActor(a,dt,time);if(!a.path.length){a.facing=selected?'right':'down';a.pose=selected?'browse':Math.floor(time/3400)%2?'inspect':'idle';a.poseStarted=Math.floor(time/3400)*3400;}visible.push(a);}
   paintCharacter(c,{x:291,y:168,facing:'down',pose:'idle'},jeweler,time/1000,1.3);
   panel(c,169,144,153,43,'#97754e');panel(c,176,150,139,30,'#bc9362');
   // The glass counter shows the newest pieces; the chosen one rests on the side table.
   px(c,181,152,129,25,'#1e2c31');px(c,182,153,127,1,'#5f8a8c');c.imageSmoothingEnabled=false;
   stock.slice(0,5).forEach((d,i)=>{c.drawImage(this.thumb(d),184+i*25,154,22,22);});
   px(c,182,153,127,3,'rgba(220,245,240,.18)');for(let i=0;i<4;i++)px(c,190+i*32,156,2,18,'rgba(220,245,240,.1)');
   if(design){panel(c,343,172,48,12,'#5a3a2e');px(c,346,173,42,9,'#2a3a3f');c.drawImage(this.artwork(design),351,150,32,32);sparkle(c,382,153+Math.sin(time*.004)*1.5,'#fff4cf',Math.floor(time/300)%2+1);}
   for(const a of visible.sort((a,b)=>a.y-b.y))paintCharacter(c,a,a.person,time/1000,1.45);
  }else{
   const pose=working?(tool==='polish'?'polish':tool==='stone'?'inspect':'cut'):'idle';paintCharacter(c,{x:236,y:228,facing:'right',pose,poseStarted:Math.floor(time/850)*850},jeweler,time/1000,1.4);
   if(design){c.imageSmoothingEnabled=false;c.drawImage(this.artwork(design),261,178,43,27);}
   if(working){sparkle(c,268+Math.sin(time*.016)*5,186,tool==='rune'?'#a9e9df':'#f8dc8e',Math.floor(time/120)%2+1);}
  }
  light(c,shop,time);
 }
 thumb(design){const key=JSON.stringify(design);let art=this.thumbs.get(key);if(!art){art=canvas(64,64);drawJewel(art.getContext('2d'),design,{size:64,background:false});this.thumbs.set(key,art);if(this.thumbs.size>24)this.thumbs.delete(this.thumbs.keys().next().value);}return art;}
}
export function paintMap(c,state,time=0){
 px(c,0,0,480,260,'#8eb9bc');polygon(c,[[0,0],[397,0],[427,53],[423,120],[367,151],[321,174],[278,233],[192,260],[0,260]],'#80a77d');
 for(let y=8;y<250;y+=23)for(let x=8;x<410;x+=31){if(x>330&&y>155)continue;px(c,x,y,2,1,'#a9c390');if((x+y)%3===0){polygon(c,[[x,y-7],[x-8,y+9],[x+8,y+9]],'#5b8f73');px(c,x,y+6,2,8,'#896b4c');}}
 pixelLine(c,61,212,144,154,'#d8c497',6);pixelLine(c,143,155,266,100,'#d8c497',6);pixelLine(c,265,100,395,58,'#d8c497',6);
 // Harbour, abbey garden and quarry have their own small landmarks.
 for(let y=168;y<256;y+=17)for(let x=318+(y%34?11:0);x<470;x+=27)if(x>370||y>218)px(c,x+Math.sin(time*.0006+x)*2,y,11,1,'#b6d6cf');
 panel(c,249,59,41,35,'#adbaa0');polygon(c,[[245,61],[270,44],[295,61]],'#758c85');panel(c,274,48,12,38,'#9bad95');px(c,278,51,4,8,'#3e6972');px(c,263,74,10,19,'#557876');px(c,252,66,5,7,'#e3d9b2');
 panel(c,243,101,60,33,'#b4be88');for(let row=0;row<3;row++){px(c,250,108+row*7,45,4,'#849264');for(let x=253;x<295;x+=8){px(c,x,107+row*7,3,4,'#527d63');px(c,x+1,106+row*7,1,1,row%2?'#e4c886':'#c792aa');}}
 polygon(c,[[371,74],[379,42],[400,35],[420,73]],'#6c8386');polygon(c,[[384,74],[386,54],[393,49],[402,58],[405,74]],'#304c60');for(const[x,y]of[[381,65],[411,62],[396,74]]){polygon(c,[[x,y-9],[x+4,y-3],[x+3,y+3],[x-3,y+1]],'#bcb3e3');px(c,x,y-6,1,5,'#e8dbf2');}
 for(const[x,y]of[[130,182],[174,118],[327,87],[212,191],[302,174]]){polygon(c,[[x,y-3],[x+5,y],[x+3,y+4],[x-4,y+3]],'#9cab89');px(c,x-2,y,4,1,'#cfccb0');}
 for(const[x,y]of[[165,171],[88,130],[223,146],[318,118],[134,233]]){px(c,x,y,2,2,'#ebd79a');px(c,x+4,y+3,1,2,'#d18b88');px(c,x-3,y+2,1,2,'#dae7b0');}
 for(const [x,y]of[[356,17],[383,9],[413,18]]){polygon(c,[[x-31,y+60],[x,y],[x+37,y+60]],'#779b9e');polygon(c,[[x-10,y+20],[x,y],[x+15,y+24]],'#dae5cf');}
 panel(c,35,192,48,35,'#956e4e');polygon(c,[[29,192],[59,168],[90,192]],'#476879');px(c,52,207,13,20,'#dfbd83');sparkle(c,60,183,'#ffebac',4);
 for(const a of AREAS){sparkle(c,a.x,a.y,state.crafted>=a.need?'#ffe2a0':'#59777a',6);}
 px(c,376,204,51,4,'#875d43');polygon(c,[[402,201],[402,169],[423,200]],'#eedeb1');pixelLine(c,402,170,402,209,'#715d4b',2);sparkle(c,443,130+Math.sin(time*.002)*2,'#d1eeea',2);
}
