import {C,px,oval,polygon,noise,texture,panel,pixelLine,canvas} from './pixel.js';
import {paintCharacter} from './characters.js';
import {routeEvent} from './content.js';
export const MAP_POINTS={forest:{x:77,y:155},mine:{x:202,y:88},ruins:{x:352,y:164},pass:{x:375,y:51},home:{x:205,y:251},beacon:{x:420,y:267}};
const backgrounds=new Map();
function firSprite(c,x,y,scale=1){c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);oval(c,0,6,14,4,'#42655b');px(c,-3,-8,6,20,'#5c4846');px(c,-2,-5,2,14,'#b78b62');polygon(c,[[-18,-3],[-14,-13],[-10,-14],[-13,-17],[-8,-27],[-3,-31],[0,-42],[7,-30],[11,-28],[10,-23],[15,-16],[11,-15],[18,-6],[17,-1]],'#36566a');polygon(c,[[-17,-5],[-12,-15],[-7,-18],[-7,-27],[0,-38],[5,-28],[9,-25],[7,-22],[12,-15],[8,-13],[15,-6],[14,-2],[-7,1]],'#508377');polygon(c,[[-11,-7],[-6,-17],[-3,-17],[-4,-27],[0,-34],[4,-26],[2,-22],[6,-15],[2,-14],[6,-9],[0,-7],[-5,-2]],'#7daa81');px(c,-7,-8,4,1,'#b0c995');px(c,-2,-25,2,1,'#a8c893');px(c,3,-16,3,1,'#aac593');px(c,-1,-4,5,1,'#91b98b');c.restore();}
function treeSprite(c,x,y,scale=1){c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);oval(c,0,8,20,5,'#446861');px(c,-3,-10,6,23,'#624d45');px(c,-2,-6,2,15,'#b18d61');pixelLine(c,-2,-2,-10,-10,'#9a7856',2);pixelLine(c,2,-4,10,-14,'#705449',2);const clusters=[[-12,-16,12,11],[-7,-27,12,11],[7,-29,12,12],[15,-16,11,11],[2,-14,16,12]];for(const [xx,yy,rx,ry]of clusters){oval(c,xx+1,yy+2,rx,ry,'#365b62');oval(c,xx,yy,rx-1,ry-1,'#5e947b');oval(c,xx-3,yy-4,rx-4,ry-4,'#89b580');px(c,xx-6,yy-6,4,1,'#bacb91');px(c,xx+2,yy+6,5,1,'#49796a');}c.restore();}
const vegetation=new Map();
function plant(c,x,y,scale,type){let image=vegetation.get(type);if(!image){image=canvas(64,64);(type==='fir'?firSprite:treeSprite)(image.getContext('2d'),32,48,1);vegetation.set(type,image);}c.imageSmoothingEnabled=false;c.drawImage(image,Math.round(x-32*scale),Math.round(y-48*scale),Math.round(64*scale),Math.round(64*scale));}
function fir(c,x,y,scale=1){plant(c,x,y,scale,'fir');}
function tree(c,x,y,scale=1){plant(c,x,y,scale,'tree');}
function mountain(c,x,y,w,h){polygon(c,[[x-w,y+h],[x-w*.8,y+h*.65],[x-w*.25,y+h*.25],[x,y],[x+w*.25,y+h*.25],[x+w*.85,y+h*.75],[x+w,y+h]],'#4c6779');polygon(c,[[x-w,y+h],[x-w*.6,y+h*.6],[x,y],[x+w*.2,y+h*.45],[x+w*.6,y+h]],'#8ea3a4');polygon(c,[[x,y+1],[x+w*.2,y+h*.45],[x+w*.6,y+h],[x+w,y+h]],'#697e96');polygon(c,[[x-w*.31,y+h*.28],[x,y],[x+w*.25,y+h*.28],[x+w*.1,y+h*.34],[x-w*.02,y+h*.22],[x-w*.12,y+h*.33]],'#d8dfce');pixelLine(c,x,y+h*.35,x-w*.25,y+h*.78,'#9eb2a6',2);pixelLine(c,x+w*.25,y+h*.7,x+w*.4,y+h*.94,'#536d81',2);}
function path(c,points,width=8){for(let i=1;i<points.length;i++){pixelLine(c,...points[i-1],...points[i],'#608878',width+4);pixelLine(c,...points[i-1],...points[i],'#beae84',width);pixelLine(c,...points[i-1],...points[i],'#dbc698',Math.max(1,width-4));}}
function grass(c,w=480,h=320,start=0){texture(c,0,start,w,h-start,['#7aaa79','#b1c58b','#638b74'],.16,22);for(let i=0;i<100;i++){const x=i*71%w,y=start+i*47%(h-start);px(c,x,y,1,3,'#668c6d');px(c,x+2,y+1,1,2,'#bed196');if(i%11===0){px(c,x+5,y+2,2,1,'#edca93');px(c,x+6,y+1,1,3,'#e9b9a1');}}}
function house(c,x,y){oval(c,x+24,y+35,43,7,'#527967');panel(c,x,y+5,58,36,'#b8a77e');px(c,x+3,y+7,2,29,'#e1cc9f');polygon(c,[[x-7,y+9],[x+8,y-12],[x+49,y-12],[x+66,y+9]],'#5b484a');polygon(c,[[x-4,y+6],[x+10,y-10],[x+47,y-10],[x+62,y+6]],'#ae6d55');for(let row=0;row<4;row++){const yy=y-6+row*4;for(let xx=x+8-row*3;xx<x+52+row*3;xx+=7){px(c,xx,yy,6,1,'#dc9d6b');px(c,xx+3,yy+2,6,1,'#8a5350');}}panel(c,x+43,y-15,8,16,'#879494');px(c,x+45,y-14,4,1,'#d3d6bf');panel(c,x+7,y+17,13,12,'#526d6b');px(c,x+9,y+19,9,8,'#f0d791');px(c,x+13,y+18,1,10,'#ab9b79');panel(c,x+34,y+17,15,24,'#66705b');px(c,x+36,y+18,2,20,'#a5a681');px(c,x+45,y+30,1,1,C.gold);px(c,x-4,y+41,65,3,'#6e6257');}
function ruins(c,x,y){oval(c,x+24,y+34,39,7,'#56847a');px(c,x-9,y+31,71,6,'#768b80');for(let i=0;i<3;i++){const xx=x+i*22,yy=y-i%2*7;panel(c,xx,yy,13,34,'#95a59a');px(c,xx+3,yy+3,2,27,'#c0c7ae');px(c,xx+10,yy+6,1,22,'#657e7b');panel(c,xx-3,yy-4,19,7,'#b9c0a5');px(c,xx+4,yy+15,5,1,'#718888');}px(c,x+7,y+35,7,2,'#bbc0a1');px(c,x+26,y+36,8,2,'#a9bba0');}
function worldBase(c,s){
  px(c,0,0,480,320,'#91b584');polygon(c,[[0,67],[70,60],[126,98],[207,79],[262,129],[370,99],[480,144],[480,320],[0,320]],'#86ab7e');polygon(c,[[0,217],[70,197],[123,235],[200,210],[259,276],[393,242],[480,282],[480,320],[0,320]],'#9dbc88');grass(c);
  for(let y=220;y<320;y++){const coast=Math.round(467-(y-220)*.65+Math.sin(y*.1)*2);px(c,coast,y,480-coast,1,'#c9bb92');px(c,coast+5,y,475-coast,1,'#6398ad');px(c,coast+8,y,472-coast,1,'#4d819e');}
  for(let i=0;i<8;i++)mountain(c,165+i*43,6+i%2*11,33+i%3*5,67+i%3*7);
  // The river's banks are stationary; just highlights move after caching.
  for(let y=83;y<320;y++){const x=Math.round(279+Math.sin(y/42)*24);px(c,x-4,y,30,1,'#627e77');px(c,x-1,y,24,1,'#477e9c');px(c,x+2,y,17,1,'#6db3c1');px(c,x+3,y,2,1,'#b2d9ce');}
  path(c,[[201,248],[147,232],[101,202],[74,151]],7);path(c,[[205,243],[234,186],[201,135],[199,86]],6);path(c,[[231,184],[298,201],[350,161]],7);path(c,[[351,163],[395,111],[374,47]],5);path(c,[[304,202],[370,250],[417,264]],6);
  panel(c,252,181,39,21,'#88664e');for(let x=254;x<290;x+=5){px(c,x,183,1,17,'#4d4946');px(c,x+1,184,1,16,'#c8aa75');}pixelLine(c,251,178,291,178,'#473b44',2);pixelLine(c,251,178,251,202,'#4f4246',2);pixelLine(c,290,178,290,203,'#4f4246',2);
  for(const [x,y,scale]of[[20,125,1.1],[52,129,.8],[98,113,.85],[27,186,1.15],[72,203,.9],[109,178,.8],[30,249,.9],[95,265,.9],[140,145,.7],[439,166,.7],[457,210,.8]])tree(c,x,y,scale);
  for(const[x,y,size]of[[57,84,.8],[129,110,.7],[434,124,.8],[404,193,.8],[164,55,.7],[462,86,.9]])fir(c,x,y,size);
  house(c,176,220);
  panel(c,393,280,64,10,'#946c4f');for(let x=396;x<455;x+=6){px(c,x,282,1,6,'#564b48');px(c,x+1,282,3,1,'#d2af7a');}for(const x of[396,434,451]){px(c,x,277,3,15,'#4c4244');px(c,x,278,2,2,'#d6b889');}
  polygon(c,[[445,262],[477,262],[473,269],[451,270]],'#3c4050');px(c,449,263,25,2,'#a17154');pixelLine(c,461,238,461,262,'#7b684e',2);polygon(c,[[459,239],[459,259],[444,258]],'#e3d8b2');polygon(c,[[464,242],[476,258],[464,259]],'#cfcbaa');px(c,459,240,1,15,'#fff0c4');
  oval(c,201,107,34,7,'#697c78');polygon(c,[[177,105],[177,78],[187,70],[213,70],[224,82],[224,105]],'#667d85');polygon(c,[[184,104],[184,84],[190,80],[207,80],[216,89],[216,104]],'#263a51');panel(c,181,77,42,6,'#bc9d68');panel(c,183,83,5,25,'#ab855c');panel(c,212,83,5,25,'#ad865c');px(c,190,103,24,2,'#a9b5a0');panel(c,225,100,20,11,'#946f4e');oval(c,229,112,3,3,C.ink);oval(c,241,112,3,3,C.ink);px(c,228,102,14,1,'#cca36c');
  ruins(c,328,146);polygon(c,[[329,145],[334,137],[343,132],[358,132],[368,140],[373,145]],'#bec5aa');polygon(c,[[336,145],[340,140],[347,137],[356,137],[361,142],[363,145]],'#7c9c8c');px(c,349,131,3,5,'#d8d6b6');
  for(let i=0;i<3;i++){panel(c,358+i*13,57-i%2*5,9,16,'#8d85a0');px(c,360+i*13,59-i%2*5,2,10,'#c7b3df');}
  panel(c,406,224,28,51,'#9daaa1');px(c,408,227,3,43,'#d1d3b8');px(c,427,229,3,39,'#6f8689');panel(c,402,219,35,10,'#637b85');panel(c,411,211,18,9,'#bbaa85');panel(c,414,233,10,14,s.ended?'#e3c67b':'#4c6476');px(c,418,235,2,10,s.ended?'#fff5bd':'#3a506a');px(c,413,272,14,3,'#596e71');
  if(!s.flags.includes('mine')&&!s.upgrades.furnace)px(c,170,65,79,51,'#34354c44');if(!s.flags.includes('ruins')&&!s.technologies.includes('runes')&&!s.skills.includes('ruinlore'))px(c,315,134,80,54,'#34354c55');if(!s.technologies.includes('lunar'))px(c,329,25,93,57,'#34354c55');
  for(let i=0;i<15;i++){const x=18+i*93%450,y=180+i*67%125;if(x>400&&y>276)continue;px(c,x,y,4,2,'#6b8b77');px(c,x+1,y,2,1,'#b4c49d');}
}
export function paintWorld(c,s,time){const key=`map-${s.ended}-${s.flags.join('-')}-${s.technologies.join('-')}-${s.upgrades.furnace}-${s.skills.includes('ruinlore')}`;let image=backgrounds.get(key);if(!image){image=canvas(480,320);worldBase(image.getContext('2d'),s);backgrounds.set(key,image);if(backgrounds.size>32)backgrounds.delete(backgrounds.keys().next().value);}c.drawImage(image,0,0);for(let i=0;i<12;i++){const y=104+i*17,x=279+Math.sin(y/42)*24+5+(Math.floor(time*2+i)%3);px(c,x,y,5,1,'#b5e3db');}for(let i=0;i<3;i++){const x=42+(Math.floor(time*8)+i*54)%165,y=34+i*8+Math.round(Math.sin(time*2+i)*2);pixelLine(c,x-3,y,x,y+1,'#526a79');pixelLine(c,x,y+1,x+3,y,'#526a79');}if(s.ended){c.save();c.globalAlpha=.5+.2*Math.sin(time*2);oval(c,420,218,7,4,'#ffecab');c.restore();}}
function regionBase(c,id){
  px(c,0,0,480,320,id==='pass'?'#a6b6c9':'#9dbc9a');for(let y=0;y<121;y+=8)px(c,0,y,480,8,['#99bfc8','#b1d0ce','#c5dcd0','#d7e4d4'][Math.min(3,Math.floor(y/31))]);
  for(let i=0;i<6;i++)mountain(c,25+i*92,36+i%2*15,70,116-i%3*13);
  polygon(c,[[0,140],[62,124],[142,146],[214,120],[298,142],[402,124],[480,151],[480,320],[0,320]],id==='mine'?'#93938b':id==='ruins'?'#8baba0':id==='pass'?'#b1b8bd':'#89ae87');grass(c,480,320,159);
  path(c,[[225,320],[215,265],[246,222],[247,158]],45);
  for(let i=0;i<12;i++){const x=i*87%480,y=179+i*37%122;oval(c,x+10,y+8,13,3,'#607a72');panel(c,x,y,18,9,'#8b9d8e');px(c,x+2,y,12,1,'#bfcaab');}
  if(id==='forest'){for(const[x,y,k]of[[44,168,2],[118,200,1.5],[434,186,1.8],[355,259,1.5],[27,293,1.6]])tree(c,x,y,k);for(const[x,y,k]of[[20,126,1.6],[382,143,1.5],[148,137,1.1]])fir(c,x,y,k);panel(c,292,205,39,30,'#946c4a');panel(c,289,201,45,8,'#bf9a64');px(c,309,216,4,8,'#513f42');px(c,310,216,2,2,C.gold);}
  if(id==='mine'){polygon(c,[[300,204],[307,129],[330,108],[393,118],[419,142],[429,204]],'#6b7f89');for(let i=0;i<12;i++)panel(c,308+i*39%107,131+i*19%70,17,11,i%2?'#91a29d':'#788b96');polygon(c,[[326,199],[326,148],[338,137],[381,138],[397,155],[398,200]],'#26364c');panel(c,320,139,84,10,'#b19a71');panel(c,325,149,8,57,'#876b58');panel(c,389,148,8,58,'#876b58');for(const x of[328,392])px(c,x,151,1,45,'#d5b784');pixelLine(c,345,197,366,257,'#57616c',2);pixelLine(c,380,197,397,257,'#57616c',2);for(let y=205;y<258;y+=10)pixelLine(c,349+(y-205)*.35,y,383+(y-205)*.28,y,'#a7845d',2);}
  if(id==='ruins'){for(const x of[54,104,362,416]){panel(c,x,132,26,98,'#96ada1');panel(c,x-5,126,36,11,'#c3cbb2');px(c,x+5,140,3,76,'#d0d3b4');px(c,x+20,142,2,74,'#6c8c87');for(let y=145;y<214;y+=14)px(c,x+8,y,10,1,'#75918b');}panel(c,345,235,53,35,'#697787');px(c,349,240,45,5,'#ae8cbd');px(c,349,255,45,1,'#92ae9f');for(let i=0;i<7;i++)fir(c,50+i*59,155+i%2*25,.6);}
  if(id==='pass'){for(let i=0;i<8;i++){const x=29+i*56,y=172+i%3*26;polygon(c,[[x,y+30],[x+1,y+10],[x+11,y],[x+24,y+16],[x+20,y+34]],'#666e94');polygon(c,[[x+4,y+29],[x+5,y+12],[x+11,y+4],[x+19,y+17],[x+15,y+30]],'#a7a2c4');px(c,x+9,y+8,2,16,'#d6ccec');px(c,x+5,y+30,13,1,'#8ca2b2');}for(let i=0;i<35;i++)px(c,i*71%480,159+i*47%154,5,1,'#d8dfd6');}
}
function encounterProps(c,event){
  const x=344,y=262;
  oval(c,x+29,y+4,43,7,'#536d69');
  if(event.region==='forest'||event.region==='mine'){
    for(const xx of[x+8,x+54]){oval(c,xx,y,10,10,'#344653');oval(c,xx,y,7,7,'#a78561');oval(c,xx,y,3,3,'#e0c794');pixelLine(c,xx-6,y-4,xx+6,y+4,'#665246');pixelLine(c,xx-4,y+6,xx+4,y-6,'#665246');}
    panel(c,x,y-29,64,24,event.region==='mine'?'#667e88':'#967449');px(c,x+3,y-28,56,2,'#d8bb86');
    for(let i=0;i<4;i++)px(c,x+5+i*15,y-24,2,15,'#5a5150');px(c,x+2,y-7,60,2,'#3f4750');
    pixelLine(c,x-14,y-10,x+4,y-8,'#9e7751',3);pixelLine(c,x-14,y-10,x+4,y-8,'#cfad78');
    if(event.region==='mine'){for(let i=0;i<4;i++){polygon(c,[[x+4+i*14,y-29],[x+10+i*14,y-40-i%2*3],[x+21+i*14,y-34],[x+18+i*14,y-27]],'#637a8b');px(c,x+10+i*14,y-37,6,1,'#b5c6b4');}}
    else{for(let i=0;i<3;i++){panel(c,x+8+i*14,y-39-i%2*7,12,11,'#b2a17c');px(c,x+12+i*14,y-38-i%2*7,2,10,'#77604a');}}
  }else if(event.region==='ruins'){
    panel(c,x+5,y-48,52,50,'#657d84');panel(c,x+2,y-53,58,8,'#b7b698');px(c,x+10,y-43,42,2,'#c3c7ab');
    for(let i=0;i<3;i++){panel(c,x+11+i*13,y-36,10,21,['#ad805a','#8a7e8c','#83966f'][i]);px(c,x+13+i*13,y-34,2,16,'#dfc597');px(c,x+12+i*13,y-22,7,1,'#ecd6a6');}
    panel(c,x+10,y-10,42,8,'#8d7158');px(c,x+30,y-8,3,3,'#e3bd73');pixelLine(c,x+7,y-39,x+7,y-11,'#c1b993');
  }else{
    polygon(c,[[x-6,y],[x+21,y-49],[x+63,y],[x+44,y],[x+23,y-26],[x+13,y]],'#667c86');
    polygon(c,[[x-3,y-2],[x+21,y-45],[x+21,y-28],[x+12,y-2]],'#c8b991');
    polygon(c,[[x+24,y-43],[x+59,y-2],[x+45,y-2],[x+25,y-28]],'#8fa19b');
    pixelLine(c,x+21,y-46,x+21,y-27,'#eedab1');pixelLine(c,x+23,y-48,x+67,y+3,'#474f5e');
    for(let i=0;i<3;i++)panel(c,x+65+i*5,y-10-i*3,9,5,'#846646');
  }
}
export function paintRegion(c,s,r,time){
  const id=s.trip?.region||'forest',key=`region-${id}`;let image=backgrounds.get(key);
  if(!image){image=canvas(480,320);regionBase(image.getContext('2d'),id);backgrounds.set(key,image);}c.drawImage(image,0,0);
  const event=routeEvent(s.trip?.encounter||s.trip?.encounterResult?.event),hero=r.actor||{x:237,y:282,facing:'up',pose:'idle'};
  if(event){const propKey=`event-${event.id}`;let props=backgrounds.get(propKey);if(!props){props=canvas(480,320);encounterProps(props.getContext('2d'),event);backgrounds.set(propKey,props);}c.drawImage(props,0,0);
    const npc={x:299,y:258,facing:'left',pose:s.trip.encounter?'inspect':'wave',poseStarted:0};
    if(hero.y<258)paintCharacter(c,hero,{},time);paintCharacter(c,npc,{id:event.person},time);if(hero.y>=258)paintCharacter(c,hero,{},time);
  }else paintCharacter(c,hero,{},time);
  if(id==='ruins'||id==='pass'){c.save();c.globalAlpha=.5+.2*Math.sin(time*3);for(let i=0;i<4;i++)px(c,67+i*95,189+i%2*44,2,2,'#c5b7e9');c.restore();}
}
