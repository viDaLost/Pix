import {C,px,polygon,oval,shade,pixelLine,canvas} from './pixel.js';

const SIZE=64,BASELINE=60,CENTER=32,CACHE_LIMIT=320;
const frames=new Map();
const LOOKS={
  smith:{outfit:'smith',color:'#496f78',hair:'#624537',skin:'#d4a27e',beard:true},
  apprentice:{outfit:'smith',color:'#819079',hair:'#83553b',skin:'#e0b395',cap:true},
  mira:{outfit:'miner',color:'#9b7652',hair:'#593d32',skin:'#deb28d',female:true,cap:true},
  bren:{outfit:'officer',color:'#435b7b',hair:'#634637',skin:'#cea07e',hat:'tricorn'},
  ada:{outfit:'merchant',color:'#9b6261',hair:'#543b32',skin:'#c99478',female:true,hat:'bonnet'},
  elin:{outfit:'surveyor',color:'#547b8a',hair:'#8e683f',skin:'#e0b598',female:true,hat:'tricorn'},
  rowan:{outfit:'farmer',color:'#7c8153',hair:'#6a4a34',skin:'#c99573',hat:'felt',beard:true},
  sera:{outfit:'apothecary',color:'#82718c',hair:'#af9471',skin:'#e3b99e',female:true,hat:'bonnet'},
  nora:{outfit:'rider',color:'#567967',hair:'#92593a',skin:'#d9aa84',female:true,hat:'felt'},
  daro:{outfit:'gentleman',color:'#916948',hair:'#b5ac94',skin:'#d4a98e',hat:'tricorn',mature:true},
};
function look(person){const base=LOOKS[person.id||'smith']||LOOKS.smith;return {...base,...person,color:person.color||base.color,hair:person.hair||base.hair};}
function limb(c,start,joint,end,cloth,skin,rolled=false){
  pixelLine(c,...start,...joint,C.ink,4);pixelLine(c,...joint,...end,C.ink,4);
  pixelLine(c,start[0]+1,start[1],joint[0]+1,joint[1],cloth,2);
  pixelLine(c,joint[0]+1,joint[1],end[0]+1,end[1],rolled?skin:cloth,2);
  px(c,joint[0]+1,joint[1]-1,2,2,shade(cloth,34));
  if(!rolled)px(c,end[0],end[1]-2,4,2,'#e4d9ba');
  px(c,end[0],end[1],4,3,shade(skin,-17));px(c,end[0]+1,end[1],2,2,shade(skin,21));
}
function elbowFor(start,end){
  // Keep both arm segments the same length throughout work and walking poses.
  const dx=end[0]-start[0],dy=end[1]-start[1],distance=Math.max(.01,Math.hypot(dx,dy));
  const along=Math.min(13.95,distance)/2,bend=Math.sqrt(49-along*along),sign=dy<0?1:-1;
  return [Math.round(start[0]+dx/distance*along-sign*dy/distance*bend),Math.round(start[1]+dy/distance*along+sign*dx/distance*bend)];
}
function legs(c,p,pose,frame,side){
  const walk=pose==='walk',swing=walk?[0,1,2,1,0,-1,-2,-1][frame%8]:0;
  const boots=['miner','rider','surveyor'].includes(p.outfit),breeches=p.outfit==='officer'?'#c4b48d':p.outfit==='gentleman'?'#766046':'#58626a';
  for(const [i,hip]of[27,35].entries()){
    const advance=(i?1:-1)*swing,knee=hip+advance,ankle=hip+Math.round(advance*.8),lift=walk?Math.max(0,(i?1:-1)*swing):0;
    const dark=side&&i===0;
    polygon(c,[[hip-2,35],[hip+3,35],[knee+3,43-lift],[knee-2,43-lift]],C.ink);
    polygon(c,[[hip-1,36],[hip+2,36],[knee+2,42-lift],[knee-1,42-lift]],shade(breeches,dark?-24:0));
    px(c,knee-1,41-lift,3,2,shade(breeches,25));
    pixelLine(c,knee-1,44-lift,ankle-1,56-lift,C.ink,5);
    const stocking=boots?'#725646':p.outfit==='smith'?'#9b9d8b':'#c8c4aa';
    pixelLine(c,knee,44-lift,ankle,55-lift,shade(stocking,dark?-25:0),3);
    px(c,knee,44-lift,2,1,boots?'#b58b5f':'#e4d9b8');
    px(c,ankle-2,56-lift,7,4,'#3b3335');px(c,ankle-1,56-lift,5,2,'#695346');px(c,ankle-2,59-lift,8,1,C.ink);
    px(c,ankle+2,57-lift,2,1,boots?'#b48b61':'#cdb681');
  }
}
function clothes(c,p,side,back,pose){
  const color=p.color,light=shade(color,37),dark=shade(color,-25),linen='#e6d8b5';
  const skirt=p.outfit==='merchant'||p.outfit==='apothecary',coat=['officer','surveyor','rider','gentleman'].includes(p.outfit);
  if(skirt){
    polygon(c,[[26,31],[36,31],[42,54],[39,57],[22,57],[20,54]],C.ink);
    polygon(c,[[27,32],[35,32],[40,54],[38,56],[23,56],[22,53]],shade(color,-13));
    for(const [x,h]of[[25,17],[29,22],[34,19],[37,12]])pixelLine(c,x,35,x-1,35+h,x%2?light:dark,1);
    px(c,23,54,16,1,light);
    if(p.outfit==='apothecary'){polygon(c,[[26,34],[35,34],[38,54],[25,54]],'#cec5a6');px(c,27,36,1,16,'#eee2bd');px(c,35,38,1,14,'#a99f8c');}
  }
  if(coat){
    polygon(c,[[24,28],[39,28],[42,43],[35,46],[32,41],[27,45],[21,43]],C.ink);
    polygon(c,[[25,29],[38,29],[40,42],[35,44],[32,39],[27,43],[23,42]],color);
    pixelLine(c,24,32,23,41,dark,2);pixelLine(c,37,32,39,41,light,1);
    px(c,25,35,4,2,'#a39c7b');px(c,36,35,3,2,'#bfb387');
  }
  polygon(c,[[26,18],[35,18],[40,22],[38,32],[35,36],[26,36],[23,31],[23,22]],C.ink);
  polygon(c,[[27,19],[34,19],[38,22],[36,33],[34,35],[27,35],[25,31],[25,22]],coat?'#c4ad7d':color);
  px(c,26,22,2,9,coat?'#eee0b7':light);px(c,35,22,2,10,coat?'#9b866b':dark);
  if(back){px(c,31,21,1,12,dark);pixelLine(c,27,21,29,24,light);}
  else{
    polygon(c,[[28,18],[33,18],[34,21],[31,24],[28,21]],linen);
    if(p.female&&skirt){polygon(c,[[25,19],[29,18],[31,22],[34,18],[38,20],[32,26]],linen);px(c,31,23,1,3,'#b1a58a');}
    for(let y=24;y<34;y+=4){px(c,31,y,1,1,coat?'#e7c78a':'#cab07d');px(c,32,y,1,1,dark);}
    if(coat){polygon(c,[[25,19],[28,20],[27,33],[24,32]],color);polygon(c,[[34,20],[38,21],[37,33],[34,33]],color);px(c,25,22,1,7,light);px(c,36,25,1,6,dark);}
  }
  if(p.outfit==='smith'){
    polygon(c,[[28,21],[34,21],[34,29],[38,43],[25,43],[26,29]],'#5e433a');
    polygon(c,[[29,22],[33,22],[33,30],[36,42],[26,42],[28,30]],'#a06c48');
    px(c,29,23,3,1,'#d8a66e');px(c,28,29,6,1,'#c99a62');px(c,28,32,6,4,'#79503b');px(c,28,32,6,1,'#d4a674');px(c,33,34,1,1,'#dfbc7c');
    pixelLine(c,28,19,28,24,'#c29665');pixelLine(c,34,19,34,24,'#d0a26c');px(c,27,40,7,1,'#bf8c59');
  }
  if(['surveyor','rider','merchant'].includes(p.outfit)){pixelLine(c,25,20,37,35,'#664b3c',2);pixelLine(c,25,20,37,35,'#ac8357');px(c,34,32,6,7,'#5f493f');px(c,35,33,4,5,'#aa8054');px(c,37,34,1,1,'#dbc48c');}
  if(p.outfit==='officer'){pixelLine(c,25,22,36,34,'#d4c7a3',2);px(c,25,34,13,2,'#7a6852');px(c,31,34,3,2,'#ccb274');}
  if(p.outfit==='surveyor'&&!back){px(c,29,29,3,7,'#e3c99a');px(c,30,30,1,5,'#b5a483');}
}
function head(c,p,side,back,blink){
  const skin=p.skin||'#d4a27e',light=shade(skin,23),shadow=shade(skin,-23),hair=p.hair,hairLight=shade(hair,23);
  px(c,29,15,5,5,shadow);px(c,30,16,3,4,skin);
  // Hair behind the head; a visible neck keeps the jaw clear of the collar.
  if(p.female){px(c,26,7,10,11,shade(hair,-13));if(back||side){px(c,25,12,3,7,hair);px(c,25,18,2,5,hairLight);px(c,25,21,3,2,'#665a54');}}
  if(side){
    polygon(c,[[29,6],[33,6],[35,8],[35,10],[36,12],[37,12],[37,13],[35,14],[35,16],[32,17],[28,15],[27,11]],C.ink);
    polygon(c,[[29,7],[33,7],[34,9],[34,11],[35,12],[36,12],[36,13],[34,14],[34,16],[31,16],[28,14],[28,10]],skin);
    px(c,29,8,4,2,light);px(c,31,10,2,4,shade(skin,9));px(c,33,14,2,1,shadow);
    px(c,28,11,2,3,shadow);px(c,29,11,1,2,light);
    if(!back){px(c,33,11,1,1,blink?shadow:'#493b35');px(c,32,10,2,1,shade(hair,8));px(c,35,13,1,1,shadow);px(c,34,15,1,1,'#9e6959');}
  }else{
    polygon(c,[[29,6],[33,6],[36,9],[35,14],[33,17],[29,17],[26,14],[26,9]],C.ink);
    polygon(c,[[29,7],[33,7],[35,9],[34,14],[32,16],[29,16],[27,13],[27,10]],skin);
    px(c,28,8,5,2,light);px(c,28,10,2,4,shade(skin,8));px(c,34,10,1,4,shadow);px(c,26,11,1,2,skin);px(c,35,11,1,2,shadow);
    if(!back){
      // One dark pixel per eye: no separated white pixels or misaligned pupils.
      px(c,28,11,1,1,blink?shadow:'#493b35');px(c,33,11,1,1,blink?shadow:'#493b35');
      px(c,31,12,1,2,shadow);px(c,31,12,1,1,light);px(c,30,15,3,1,'#aa7660');
      if(p.mature){px(c,27,12,1,1,shadow);px(c,34,12,1,1,shadow);}
    }
  }
  polygon(c,[[27,9],[26,7],[28,4],[34,4],[36,7],[35,9],[33,6],[29,6],[28,10]],hair);
  px(c,29,5,4,1,hairLight);px(c,27,7,1,4,hair);px(c,34,6,2,2,hairLight);
  if(back){polygon(c,[[27,7],[35,7],[36,11],[34,15],[28,15],[26,11]],hair);px(c,28,8,5,1,hairLight);px(c,28,14,6,1,shade(hair,-22));px(c,30,15,3,2,hair);}
  else if(p.beard){
    if(side){px(c,32,14,2,3,shade(hair,8));px(c,34,14,1,2,hair);px(c,32,16,2,1,hairLight);}
    else{px(c,28,14,2,2,hair);px(c,32,14,2,2,hair);px(c,29,16,4,1,shade(hair,15));}
  }
  if(p.cap){polygon(c,[[25,8],[26,5],[29,3],[34,4],[37,7],[37,9]],'#655442');px(c,27,5,7,2,'#a89169');px(c,26,8,11,1,'#d2bd8b');px(c,25,9,2,2,'#806346');}
  if(p.hat==='tricorn'){
    polygon(c,[[20,7],[25,6],[25,3],[31,2],[37,4],[38,7],[43,7],[39,10],[24,10]],'#282b35');
    polygon(c,[[22,7],[26,7],[26,4],[31,3],[36,5],[37,8],[41,8],[38,9],[25,9]],'#48454a');
    pixelLine(c,23,8,31,5,'#a59977');pixelLine(c,31,5,39,8,'#c3b68b');px(c,36,6,2,2,p.outfit==='officer'?'#b76f58':'#cab080');
  }else if(p.hat==='felt'){
    polygon(c,[[22,8],[26,7],[27,3],[34,3],[37,7],[41,8],[39,10],[23,10]],'#594b3c');
    px(c,28,4,6,3,'#aa8c56');px(c,27,7,9,1,'#d1b97e');px(c,23,9,16,1,'#b39e70');
  }else if(p.hat==='bonnet'){
    polygon(c,[[25,11],[24,7],[27,3],[34,3],[38,7],[37,12],[35,11],[35,7],[28,6],[27,11]],'#b4ac96');
    pixelLine(c,25,8,28,4,'#eee2be',2);pixelLine(c,28,4,34,4,'#f5eacf',2);pixelLine(c,35,5,36,10,'#e8dcc0',2);
    px(c,26,13,1,4,'#e1d2af');px(c,35,14,1,4,'#d3c4a3');px(c,27,17,3,1,'#c6b995');
  }
}
function armAndTool(c,p,pose,frame,temper){
  const smith=p.outfit==='smith'||p.outfit==='miner',cloth=smith?'#d9cdaa':p.color,skin=p.skin||'#d4a27e';
  let wrist=[42,34],tool;
  if(pose==='walk'){const swing=[0,1,2,1,0,-1,-2,-1][frame%8];wrist=[42-swing,34-Math.abs(swing)/2];}
  else if(pose==='hammer'){
    wrist=[[47,25],[45,17],[43,14],[48,26],[45,32],[46,33],[47,29]][frame];tool=[[51,13],[46,6],[43,4],[54,18],[55,39],[56,40],[53,24]][frame];
  }else if(pose==='cut'){wrist=[44,34+frame%2];}
  else if(pose==='polish'){wrist=[45+frame%3,28];}
  else if(pose==='heat'){wrist=[44,28+frame%2];}
  else if(pose==='quench'){wrist=temper==='air'?[42,26]:[46,28+[0,1,2,3,4,3][frame]];}
  else if(pose==='chat'){wrist=[43+frame%2,25-frame%2];}
  limb(c,[39,21],elbowFor([39,21],wrist),wrist,cloth,skin,smith);
  if(pose==='hammer'){
    pixelLine(c,...wrist,...tool,'#47383b',3);pixelLine(c,wrist[0]+1,wrist[1],tool[0]+1,tool[1],'#bb8e5e',1);
    polygon(c,[[tool[0]-6,tool[1]-3],[tool[0]+5,tool[1]-3],[tool[0]+7,tool[1]],[tool[0]+5,tool[1]+3],[tool[0]-6,tool[1]+3]],C.ink);
    px(c,tool[0]-5,tool[1]-2,10,3,'#92abb6');px(c,tool[0]-4,tool[1]-2,7,1,'#dde3c9');px(c,tool[0]+3,tool[1],3,2,'#526c81');
  }else if(pose==='heat'||pose==='quench'){
    const tip=pose==='heat'?[55,wrist[1]+2]:temper==='air'?[46,24]:[59,wrist[1]+2];
    pixelLine(c,wrist[0]+2,wrist[1]+1,tip[0],tip[1],'#546e7b',2);pixelLine(c,wrist[0]+2,wrist[1],tip[0],tip[1]-1,'#adc3be');px(c,tip[0],tip[1]-2,4,3,'#efb57c');px(c,tip[0]+1,tip[1]-2,2,1,'#ffe0a5');
  }else if(pose==='cut'){
    pixelLine(c,wrist[0]+1,wrist[1]+1,53,wrist[1]+3,'#a38763',2);px(c,52,wrist[1]+2,4,3,'#a8c5c7');px(c,54,wrist[1]+3,1,2,'#e1dfc2');
  }else if(pose==='polish'){px(c,wrist[0]+3,wrist[1]-1,9,4,'#b4ab8d');px(c,wrist[0]+4,wrist[1]-1,7,1,'#eee3c0');}
  if(p.carry){px(c,19,28,7,10,'#564039');px(c,20,29,5,8,'#b0875a');px(c,21,30,3,1,'#e1c286');px(c,23,31,1,5,'#775444');}
}
function sprite(p,facing,pose,frame,blink,breath,temper){
  const image=canvas(SIZE,SIZE),c=image.getContext('2d'),side=facing==='left'||facing==='right',back=facing==='up';
  legs(c,p,pose,frame,side);
  const bob=pose==='walk'&&frame%4===2?-1:breath;c.save();c.translate(0,bob);
  const cloth=p.outfit==='smith'||p.outfit==='miner'?'#c7bea4':shade(p.color,-22);
  const swing=pose==='walk'?[0,1,2,1,0,-1,-2,-1][frame%8]:0;
  limb(c,[24,21],[22,28],[22+swing,34],cloth,p.skin,p.outfit==='smith');
  clothes(c,p,side,back,pose);head(c,p,side,back,blink);armAndTool(c,p,pose,frame,temper);c.restore();
  if(facing==='left'){const mirrored=canvas(SIZE,SIZE),ctx=mirrored.getContext('2d');ctx.translate(SIZE,0);ctx.scale(-1,1);ctx.drawImage(image,0,0);return mirrored;}
  return image;
}
function frameImage(p,facing,pose,frame,blink=false,breath=0,temper='water'){
  const key=[p.id,p.outfit,p.color,p.hair,p.skin,p.female,p.hat,p.cap,p.beard,p.mature,p.carry,facing,pose,frame,blink,breath,temper].join('|');
  let image=frames.get(key);if(!image){image=sprite(p,facing,pose,frame,blink,breath,temper);frames.set(key,image);if(frames.size>CACHE_LIMIT)frames.delete(frames.keys().next().value);}return image;
}
export function paintCharacter(c,a,person={},time=0,scale=2){
  const p=look(person),pose=a.pose||'idle',seed=[...(p.id||'smith')].reduce((n,v)=>n+v.charCodeAt(0),0),elapsed=Math.max(0,time*1000-(a.poseStarted||0));
  const frame=pose==='walk'?Math.floor((a.phase||0)*2)%8:pose==='hammer'?Math.min(6,Math.floor(elapsed/60)):pose==='quench'?Math.min(5,Math.floor(elapsed/100)):['heat','polish','cut','chat'].includes(pose)?Math.floor(elapsed/85)%6:0;
  const blink=pose==='idle'&&(time+seed*.13)%5<.13,breath=pose==='idle'&&Math.sin(time*2+seed)>.7?-1:0,size=scale*.875;
  const image=frameImage(p,a.facing||'right',pose,frame,blink,breath,pose==='quench'?a.temper||'water':'water');
  c.save();c.globalAlpha=.25;oval(c,a.x,a.y+1,15,3,C.deep);c.restore();c.imageSmoothingEnabled=false;
  c.drawImage(image,Math.round(a.x-CENTER*size),Math.round(a.y-BASELINE*size),SIZE*size,SIZE*size);
}
export function paintPortrait(c,person,size=64){
  const p=look(person),image=frameImage(p,'down','idle',0);c.imageSmoothingEnabled=false;
  px(c,0,0,size,size,'#465669');px(c,2,2,size-4,size-4,'#c8b18b');px(c,4,4,size-8,size-8,'#e6d4ac');
  c.drawImage(image,18,0,28,31,5,4,size-10,size-8);
}
