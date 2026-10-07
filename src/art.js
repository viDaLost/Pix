// Original articulated pixel sprites and separate rooms; no smoothing or external assets.
import {drawEffects} from './effects.js';
import {paintCharacter,paintPortrait} from './characters.js';
import {paintItemSprite,paintRune} from './items.js';
import {paintRoom,paintRoomLife,paintCounterFront,paintLighting} from './rooms.js';
import {paintWorld,paintRegion} from './world.js';
import {paintWorkCloseup} from './work-art.js';
export {MAP_POINTS} from './world.js';
export const SCENE_WIDTH=480,SCENE_HEIGHT=320;
export const STATIONS={supplies:{x:129,y:260,facing:'left',label:'Склад',icon:'wood',hotX:13,hotY:68},furnace:{x:230,y:204,facing:'left',label:'Горн',icon:'forge',hotX:35,hotY:32},anvil:{x:245,y:278,facing:'right',label:'Наковальня',icon:'anvil',hotX:60,hotY:68},barrel:{x:367,y:278,facing:'right',label:'Закалка',icon:'barrel',hotX:86,hotY:72},bench:{x:334,y:216,facing:'right',label:'Верстак',icon:'grindstone',hotX:82,hotY:45}};
const P={ink:'#243351',dark:'#152641',stone:'#657b9f',stoneLight:'#cfebe5',wall:'#51b99e',wallLight:'#a6ebc4',wood:'#9d593b',woodLight:'#e6a454',woodDark:'#60383e',gold:'#ffc64b',cream:'#fff4c6',orange:'#ff852f',red:'#e46757',green:'#43b87b',cyan:'#64e6e3',purple:'#ac84f8'};
const cache=new Map();
export const WORK_POINTS=[[88,222],[187,150],[283,246],[414,231],[380,160]];
function rect(c,x,y,w,h,k){c.fillStyle=k;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function circle(c,x,y,r,k){for(let dy=-r;dy<=r;dy++){const w=Math.floor(Math.sqrt(r*r-dy*dy));rect(c,x-w,y+dy,w*2+1,1,k);}}
function box(c,x,y,w,h,k){rect(c,x,y,w,h,P.ink);rect(c,x+2,y+2,w-4,h-4,k);}
function workPiece(c,s,r,t){
  if(!s.work)return;const w=s.work,[x,y]=WORK_POINTS[w.step],task=r.task;if(task?.reheating)return;
  const heat=task?.temperature??.92,color=w.step===1?(task?.position>.65?'#fff1b0':task?.position>.3?'#ffc579':'#e78f61'):w.step===2?(heat>.7?'#ffc47b':heat>.45?'#eaa16a':heat>.3?'#b87560':'#7e7c8d'):w.step===3?'#e9a672':({iron:'#a9c7d0',copper:'#d6a275',bronze:'#dbc17e',moon:'#b8a3da'}[w.material]);
  if(w.step<2){rect(c,x-14,y-4,30,5,color);rect(c,x-12,y-4,23,1,'#fff3c2');for(const mark of task?.cutPositions||[])rect(c,x-14+mark*30,y-5,1,7,'#74c6ba');}
  else if(w.step===2){const hits=task?.hits.length||0;rect(c,x-14-hits,y-4,29+hits*3,Math.max(2,6-hits),color);rect(c,x-12-hits,y-4,23+hits*3,1,'#fff1ab');if(hits>2){c.save();c.translate(x-10,y-16);c.scale(.7,.7);drawItem(c,w.recipe,color);c.restore();}}
  else{c.save();const cooling=w.step===3&&r.actor?.pose==='quench',air=cooling&&r.actor.temper==='air',dip=cooling&&!air?Math.min(9,(t*1000-r.actor.poseStarted)/60):0;c.translate(x-9-(air?23:0),y-15+dip-(air?8:0));c.scale(.65,.65);drawItem(c,w.recipe,color);c.restore();}
}
function workDetail(c,s,r,t){
  if(!s.work)return;const w=s.work,task=r.task,x=w.step<2?345:21,y=35;
  rect(c,x+3,y+4,111,86,'#20223366');box(c,x,y,111,86,'#aa8f66');rect(c,x+3,y+3,105,80,'#3b4559');rect(c,x+4,y+4,103,1,'#dcc59a');
  for(let dy=13;dy<76;dy+=12)rect(c,x+4,y+dy,103,1,'#424d60');
  for(const dx of[4,103])for(const dy of[4,77]){rect(c,x+dx,y+dy,3,3,'#263349');rect(c,x+dx,y+dy,2,1,'#e7c98e');}
  c.save();c.beginPath();c.rect(x+6,y+7,99,71);c.clip();
  if(w.step<2){const heat=task?.position||0;rect(c,x+17,y+36,76,15,w.step===1?(heat>.65?'#fff1b0':heat>.3?'#ffc579':'#e78f61'):'#a9c7d0');rect(c,x+20,y+36,68,3,'#eee2bd');rect(c,x+17,y+49,76,3,'#526783');for(let i=0;i<8;i++)rect(c,x+17+i*10,y+61,i%2?1:2,i%2?4:6,'#91b4b6');if(w.step===0)for(const mark of task?.cutPositions||[]){rect(c,x+17+mark*76,y+32,2,25,'#79c5b5');rect(c,x+15+mark*76,y+30,6,3,'#dcebc4');}if(w.step===1){for(let i=0;i<7;i++)rect(c,x+19+i*10,y+67,7,4,i/7<heat?'#eac783':'#28384c');}}
  else{c.save();c.translate(x+29,y+10);c.scale(2,2);const progress=w.step===2?(task?.hits.length||0)/5:1;c.globalAlpha=.3+.7*progress;drawItem(c,w.recipe,w.step<4?((task?.temperature??.92)<.3?'#7e7c8d':'#e9b577'):({iron:'#a9c7d0',copper:'#d6a275',bronze:'#dbc17e',moon:'#b8a3da'}[w.material]));c.restore();if(w.step===2){for(let i=0;i<5;i++)rect(c,x+21+i*15,y+69,10,4,i<(task?.hits.length||0)?'#d5b374':'#28384c');}if(w.step===4){for(let i=0;i<3;i++)rect(c,x+34+i*17,y+66,4,4,(task?.rivets||[]).includes(i)?'#a4d4b4':'#8194a8');}}
  if(r.actor?.pose==='cut'||r.actor?.pose==='polish'){rect(c,x+27+Math.sin(t*15)*22,y+37,24,5,'#fff3d7');rect(c,x+43+Math.sin(t*15)*22,y+28,4,14,'#deaa73');}
  c.restore();
}
export function drawWorkCloseup(canvas,s,r,time=0){paintWorkCloseup(canvas,s,r,time);}
export function drawCharacter(c,a,p={},t=0,scale=2){paintCharacter(c,a,p,t,scale);}
function forgeRoom(c,s,t,r){paintRoom(c,s,'forge');paintRoomLife(c,s,'forge',t);workPiece(c,s,r,t);drawCharacter(c,r.actor||{x:222,y:279,facing:'right',pose:'idle'},{},t);if(s.upgrades.apprentice)drawCharacter(c,{x:73,y:171,pose:'cut',facing:'right',poseStarted:0},{id:'apprentice',color:'#75ae99',hair:'#905334',style:'cape'},t,2);paintLighting(c,s,'forge',t);}
function shopRoom(c,s,t,r){paintRoom(c,s,'shop');paintRoomLife(c,s,'shop',t);for(let i=0;i<3;i++){const item=s.stock[(r.selectedItem||0)+i];if(item){c.save();c.translate(74+i*129,151);drawItem(c,item.recipe,({iron:'#aac9d0',moon:'#b9a2de',copper:'#dcaa76',bronze:'#d6ba76'}[item.material]));paintRune(c,item.rune,14,13,t);c.restore();}}const actors=[...(r.npcs||[]).map(a=>({a,p:a.person})),{a:r.actor||{x:307,y:176,pose:'idle',facing:'down'},p:{}}].sort((a,b)=>a.a.y-b.a.y);for(const {a,p}of actors.filter(v=>v.a.y<182))drawCharacter(c,a,p,t);paintCounterFront(c);for(const {a,p}of actors.filter(v=>v.a.y>=182))drawCharacter(c,a,p,t);paintLighting(c,s,'shop',t);}
export function drawScene(canvas,s,view='forge',time=0,r={}){
  if(canvas.width!==480||canvas.height!==320){canvas.width=480;canvas.height=320;}
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const t=time/1000,cam=r.camera||{x:240,y:160,zoom:1};
  c.fillStyle='#173b57';c.fillRect(0,0,480,320);c.save();
  if(view==='forge'){const shake=!r.reduced&&r.effects?.shake?Math.sin(time*.11)*r.effects.shake*8:0;c.translate(240-cam.x*cam.zoom+shake,160-cam.y*cam.zoom);c.scale(cam.zoom,cam.zoom);}
  if(view==='explore'){if(s.trip)paintRegion(c,s,r,t);else paintWorld(c,s,t);}else if(view==='shop')shopRoom(c,s,t,r);else forgeRoom(c,s,t,r);
  drawEffects(c,r.effects,time,r.reduced);c.restore();if(view==='forge'&&s.work)workDetail(c,s,r,t);
}
export function portraitURL(p){const key='portrait-v5-'+p.id;if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=64;c.height=64;paintPortrait(c.getContext('2d'),p);const url=c.toDataURL();cache.set(key,url);return url;}
function drawItem(ctx,type,color=P.gold){
  if(paintItemSprite(ctx,type,color))return;
  const r=(x,y,w,h,c=color)=>rect(ctx,x,y,w,h,c),line=(x,y,w,h)=>r(x,y,w,h,P.cream);
  switch(type){
    case 'sword':case 'knife':r(10,2,5,type==='knife'?13:16,P.ink);r(11,3,3,type==='knife'?11:15,color);line(11,3,1,11);r(7,15,11,2,P.gold);r(11,17,3,5,P.woodLight);r(10,22,5,2,P.gold);break;
    case 'pickaxe':r(11,8,3,15,P.woodLight);r(5,5,15,4,'#8faaa5');r(2,8,4,3,'#8faaa5');r(19,8,3,3,'#8faaa5');line(5,5,15,1);break;
    case 'axe':case 'hammer':r(11,6,3,17,P.woodLight);r(5,4,type==='axe'?8:15,8,'#a1b4b0');line(5,4,9,2);if(type==='axe')r(3,6,3,6,'#a1b4b0');break;
    case 'lantern':r(8,3,9,3,P.gold);r(6,6,13,16,P.gold);r(8,8,9,11,'#354b45');r(11,9,4,8,'#f3c675');line(11,10,2,5);r(10,1,5,2,P.gold);r(5,22,15,2,P.woodLight);break;
    case 'shield':r(5,4,15,14,'#ae805b');r(7,18,11,3,'#ae805b');r(10,21,5,2,'#ae805b');r(6,5,13,2,'#b5c4b8');r(6,7,2,10,'#b5c4b8');r(17,7,2,10,'#b5c4b8');r(11,9,3,8,P.gold);break;
    case 'amulet':r(6,2,2,9,P.gold);r(17,2,2,9,P.gold);r(8,9,9,2,P.gold);r(9,11,7,9,'#89c9bb');line(10,13,2,4);r(11,20,3,2,P.gold);break;
    case 'ring':r(7,7,11,3,P.gold);r(5,10,3,9,P.gold);r(17,10,3,9,P.gold);r(8,19,9,3,P.gold);r(10,4,5,5,P.cyan);line(11,4,2,2);break;
    case 'staff':r(11,7,3,17,P.woodLight);r(8,3,9,7,P.gold);r(10,2,5,7,P.purple);line(11,2,2,3);r(8,12,3,2,P.gold);break;
    case 'key':r(7,2,10,3,P.gold);r(5,5,3,7,P.gold);r(16,5,3,7,P.gold);r(8,10,8,3,P.gold);r(11,13,3,10,P.gold);r(14,18,4,2,P.gold);r(14,22,5,2,P.gold);break;
    case 'goblet':r(6,3,13,3,P.gold);r(7,6,11,7,P.gold);r(9,13,7,3,P.gold);r(11,16,3,5,P.gold);r(7,21,11,3,P.gold);line(8,6,2,5);break;
    case 'crystal':case 'moon':r(9,2,6,3,type==='moon'?P.purple:P.cyan);r(6,5,12,12,type==='moon'?P.purple:P.cyan);r(9,17,6,5,type==='moon'?P.purple:P.cyan);line(9,5,2,10);break;
    case 'wood':r(4,7,17,11,P.woodLight);r(4,6,16,3,'#b28b63');r(4,15,17,3,P.wood);line(5,9,2,5);r(9,8,10,1,P.wood);break;
    case 'iron':case 'copper':case 'bronze':r(5,8,15,11,color);r(8,5,9,3,color);line(8,6,8,2);r(6,16,13,3,'#657e77');break;
    case 'coal':r(6,8,14,11,'#5c6371');r(9,4,7,5,'#5c6371');r(7,8,6,3,'#858598');r(5,16,17,3,'#414954');break;
    case 'forge':r(5,3,15,4,P.woodLight);r(4,7,17,16,P.stone);r(7,10,11,12,P.dark);r(10,14,5,7,P.orange);r(12,11,2,8,P.gold);break;
    case 'shop':r(4,6,17,5,P.gold);r(5,11,15,11,P.woodLight);r(8,13,4,5,P.dark);r(14,13,4,9,P.dark);r(5,4,15,2,P.red);break;
    case 'orders':r(5,3,15,20,P.cream);r(7,7,11,2,P.woodLight);r(7,11,8,2,P.woodLight);r(7,15,10,2,P.woodLight);r(16,19,3,3,P.orange);break;
    case 'explore':r(11,2,3,10,P.gold);r(7,9,11,9,P.green);r(4,16,17,7,P.green);r(11,18,3,6,P.woodLight);break;
    case 'develop':r(4,4,16,18,P.woodLight);r(6,5,12,15,P.cream);r(12,5,1,16,P.wood);r(7,8,4,1,P.woodLight);r(14,8,3,1,P.woodLight);r(7,11,4,1,P.woodLight);break;
    case 'coin':r(7,3,11,3,P.gold);r(4,6,17,13,P.gold);r(7,19,11,3,P.gold);line(7,6,2,11);r(12,8,3,9,'#b78443');break;
    case 'energy':r(12,2,6,3,P.gold);r(9,5,7,5,P.gold);r(6,10,12,3,P.gold);r(11,13,4,5,P.gold);r(9,18,4,4,P.gold);break;
    case 'wind':r(3,8,17,2,P.cyan);r(18,5,5,5,P.cyan);r(21,6,2,2,P.cream);r(5,13,18,2,P.cyan);r(16,16,6,2,P.cyan);r(3,18,15,2,P.cyan);r(17,19,4,3,P.cyan);break;
    case 'fire':r(11,2,4,7,'#ffbc47');r(8,7,10,6,'#ffbd45');r(5,12,17,9,'#ef7433');r(8,21,11,3,'#ffa543');r(11,12,5,10,'#ffe78b');r(13,9,3,13,'#fff3bc');break;
    case 'star':r(11,2,3,6,P.gold);r(3,9,19,4,P.gold);r(7,6,11,10,P.gold);r(7,15,4,6,P.gold);r(14,15,4,6,P.gold);break;
    case 'relic':r(5,5,15,15,P.purple);r(8,3,9,3,P.gold);r(8,20,9,2,P.gold);r(11,8,4,3,P.cream);r(13,11,2,3,P.cream);r(11,14,3,2,P.cream);r(11,18,3,2,P.cream);break;
    case 'anvil':r(3,8,21,4,'#96b2b3');r(1,9,5,2,'#c6d1b9');r(8,12,11,4,'#536f77');r(10,16,6,4,'#7e9897');r(6,21,16,3,'#435d64');line(5,8,17,1);break;
    case 'barrel':r(5,6,17,18,'#a1784d');r(4,4,19,4,'#d9b478');r(7,4,13,2,'#83bfbd');r(4,11,19,3,'#516a70');r(4,20,19,3,'#516a70');r(9,8,1,13,'#e6c18b');r(17,8,1,13,'#4f3f34');break;
    case 'bellows':r(5,7,17,14,'#80523f');r(4,4,19,4,'#c19761');r(4,20,19,3,'#c19761');for(let y=10;y<20;y+=3)r(6,y,14,1,'#d8a675');r(21,10,5,3,'#bcc7b1');break;
    case 'grindstone':r(5,20,17,4,'#826246');r(8,16,3,6,'#6c5740');r(18,13,3,9,'#6c5740');r(5,5,16,13,'#8caaa8');r(7,3,12,3,'#bccbbe');r(8,8,10,7,'#506f74');r(12,10,3,3,P.gold);line(7,6,2,8);break;
    case 'map':r(3,5,7,17,'#e3cc94');r(10,3,7,17,'#f4e1b1');r(17,5,7,17,'#b8c4a0');r(7,10,4,2,'#699a90');r(10,12,8,2,'#699a90');r(17,10,3,4,'#699a90');r(7,7,2,2,P.red);break;
    case 'backpack':r(5,7,17,16,'#bd8c58');r(9,3,9,4,'#71513d');r(6,9,15,2,'#e3bb77');r(10,14,9,7,'#8d6246');r(7,4,3,19,'#695746');r(20,8,3,15,'#695746');r(13,14,3,2,P.gold);break;
    case 'handshake':r(3,9,6,9,'#88b3a0');r(20,9,5,9,'#bea273');r(8,11,13,8,'#e5b382');r(10,9,9,3,'#f2c68a');r(12,17,6,4,'#bd7e55');r(12,12,2,6,'#9f694f');break;
    case 'crown':r(4,6,4,13,P.gold);r(11,3,4,16,P.gold);r(19,6,4,13,P.gold);r(4,13,19,8,P.gold);r(5,20,17,3,'#8e683d');r(7,16,3,3,P.red);r(16,16,3,3,P.cyan);break;
    default:r(5,5,15,15,color);line(7,7,3,8);
  }
}
export function iconURL(type,color=P.gold){
  const key=type+color;if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=28;c.height=28;const ctx=c.getContext('2d');drawItem(ctx,type,color);
  const url=c.toDataURL('image/png');cache.set(key,url);return url;
}
export function itemIconURL(item){
  const key=`item-v4-${item.recipe}-${item.material}-${item.rune}-${item.mark}-${item.quality>=95}`;if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');
  if(item.quality>=95){for(const[x,y]of[[1,1],[27,1],[1,27],[27,27]]){rect(ctx,x,y,4,1,'#d9ae68');rect(ctx,x,y,1,4,'#d9ae68');}}
  ctx.save();ctx.translate(2,2);drawItem(ctx,item.recipe,({iron:'#a9c7d0',copper:'#d6a275',bronze:'#dbc17e',moon:'#b8a3da'}[item.material]));paintRune(ctx,item.rune,15,12,0);ctx.restore();
  if(item.mark&&item.mark!=='none'){rect(ctx,23,23,8,8,'#2f344b');rect(ctx,24,24,6,6,'#e8ca88');rect(ctx,26,25,2,4,item.mark==='leaf'?'#56866f':item.mark==='star'?'#8065ac':'#b96d45');rect(ctx,25,26,4,1,'#fff3ce');}
  const url=c.toDataURL();cache.set(key,url);return url;
}
