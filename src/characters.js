import {C,px,oval,polygon,shade,canvas,pixelLine} from './pixel.js';
const frames=new Map(),LIMIT=320;
const CLOTH={smith:['#397b88','#75c5c3'],cap:['#8c775b','#dab482'],helmet:['#5b7896','#bbd7df'],scarf:['#a05567','#edb084'],hood:['#706398','#bfa2da'],cape:['#4b8078','#91c2a2'],hat:['#9d7646','#e1bd6c']};
function sprite(p,facing,pose,frame,blink){
  const image=canvas(48,48),c=image.getContext('2d'),style=p.style||({mira:'cap',bren:'helmet',ada:'scarf',elin:'hood',rowan:'hat'}[p.id])||'smith';
  const [base,light]=CLOTH[style]||CLOTH.smith,cloth=p.color||base,hair=p.hair||'#4d3238',skin='#d49a74',skinLight='#f2c39a',skinShade='#a96859',back=facing==='up',side=facing==='left'||facing==='right';
  const walk=pose==='walk',stride=walk?[-2,-1,0,1,2,1,0,-1][frame%8]:0,bob=walk&&(frame%4===0)?-1:0;
  const r=(x,y,w,h,k)=>px(c,x+7,y+4+bob,w,h,k),poly=(a,k)=>polygon(c,a.map(([x,y])=>[x+7,y+4+bob]),k);
  // Separate soles, boots, trouser folds and forward/backward leg frames.
  r(10,29,5,8,C.ink);r(17,29,5,8,C.ink);r(11,29,3,7,'#405268');r(18,29,3,7,'#405268');
  r(10-stride,35-Math.max(0,stride),5,5,'#372c38');r(17+stride,35-Math.max(0,-stride),5,5,'#372c38');
  r(9-stride,39-Math.max(0,stride),7,2,C.ink);r(16+stride,39-Math.max(0,-stride),8,2,C.ink);
  r(10-stride,37-Math.max(0,stride),4,1,'#a48366');r(17+stride,37-Math.max(0,-stride),4,1,'#a48366');r(12,30,1,4,'#73828d');
  // Shaped shoulders and layered clothing, rather than one rectangular body.
  poly([[9,17],[13,15],[20,15],[24,18],[24,27],[21,31],[10,31],[8,26]],C.ink);
  poly([[10,17],[14,16],[20,16],[23,18],[22,27],[20,30],[11,30],[9,25]],cloth);
  r(10,18,3,8,shade(cloth,28));r(11,18,1,6,light);r(20,19,2,9,shade(cloth,-24));r(13,17,6,1,shade(cloth,42));r(12,25,8,1,shade(cloth,-10));
  if(style==='smith'){
    poly([[13,17],[20,17],[20,22],[22,29],[11,29],[12,22]],'#713f37');poly([[14,18],[19,18],[19,22],[21,28],[12,28],[13,22]],'#b86d43');
    r(14,18,4,2,'#e7a76b');r(13,22,7,1,'#d79254');r(14,24,5,3,'#80453b');r(14,24,5,1,'#e2a865');r(17,25,1,1,C.gold);r(13,18,1,7,'#efb475');r(20,26,1,2,'#683b37');
    r(12,16,1,4,'#c79562');r(20,16,1,4,'#c79562');r(12,17,1,1,C.cream);r(20,17,1,1,C.cream);
  }else if(style==='cape'||style==='hood'){
    poly([[9,17],[7,20],[7,29],[11,33],[12,25],[12,17]],shade(cloth,-30));poly([[22,17],[25,20],[25,31],[21,33],[20,24],[20,17]],shade(cloth,-38));r(8,21,1,8,shade(cloth,20));r(23,22,1,6,shade(cloth,16));
  }else if(style==='helmet'){
    r(12,18,8,10,'#617c91');r(13,19,6,7,'#9abec6');r(13,19,5,1,'#e5edce');r(15,20,1,6,'#d4d7bf');r(13,25,6,1,'#496275');
  }else{r(14,17,1,11,shade(cloth,-32));r(15,18,1,1,C.gold);r(15,22,1,1,C.gold);r(11,24,3,3,shade(cloth,-20));r(11,24,3,1,light);}
  r(10,29,12,2,'#47343b');r(15,29,3,2,C.gold);r(16,29,1,1,C.cream);
  // Neck, individually shaded face, nose, brow, ears and hairstyle.
  r(14,13,5,4,skinShade);r(14,14,4,2,skin);poly([[12,4],[20,4],[23,7],[22,13],[19,16],[13,15],[10,11],[10,7]],C.ink);
  poly([[12,5],[20,5],[22,7],[21,12],[19,14],[14,14],[11,11],[11,7]],skin);
  r(12,6,7,3,skinLight);r(12,9,3,3,'#e6b087');r(19,9,2,3,skinShade);r(10,9,2,3,skin);r(22,9,1,2,skinShade);r(14,13,5,1,'#b97a64');
  poly([[11,6],[10,5],[12,2],[20,2],[22,4],[23,7],[21,8],[19,5],[13,5],[12,8]],hair);r(12,3,6,1,shade(hair,38));r(17,4,3,1,shade(hair,20));r(10,6,2,3,hair);r(21,5,2,4,hair);
  if(back){r(11,5,11,7,hair);r(12,11,9,2,shade(hair,-20));r(12,5,6,1,shade(hair,30));r(19,6,2,4,shade(hair,-12));}
  else{
    r(side?16:13,9,2,1,'#402d36');r(20,9,1,1,'#402d36');if(!blink){r(side?17:14,9,1,1,'#f7eed1');r(20,9,1,1,'#f7eed1');r(side?17:14,10,1,1,'#3c4654');r(20,10,1,1,'#3c4654');}
    r(18,10,1,2,'#bd805f');r(18,10,1,1,'#ffd6a3');r(16,13,3,1,'#875746');r(13,11,1,1,'#dc9074');
    if(style==='smith'||p.id==='rowan'||p.id==='daro'){r(13,12,7,2,hair);r(15,14,4,2,hair);r(14,12,2,1,shade(hair,25));r(17,13,2,1,skinShade);}
  }
  if(style==='hat'){r(9,5,16,2,'#614334');poly([[12,4],[12,1],[20,0],[22,4]],'#b78b4e');r(13,1,6,1,'#e2bd74');r(12,4,10,1,'#4f3b37');r(22,5,4,1,'#ddb577');}
  if(style==='cap'){poly([[10,6],[11,2],[14,0],[20,0],[23,4],[23,6]],'#755143');r(12,2,9,3,'#b38956');r(13,1,6,1,'#e6c387');r(16,4,5,1,C.ink);r(18,2,3,3,'#e0c36c');r(19,2,1,1,'#fff1bd');}
  if(style==='helmet'){poly([[10,9],[10,4],[13,1],[20,1],[24,5],[23,9],[21,7],[21,4],[13,4],[12,9]],'#536f86');r(13,2,7,1,'#b8d5d3');r(12,4,11,2,'#8caabd');r(17,1,2,6,C.gold);r(10,8,2,4,'#688d9d');r(22,8,2,4,'#688d9d');}
  if(style==='hood'){poly([[10,12],[8,10],[9,5],[12,1],[20,1],[24,6],[24,12],[22,14],[21,7],[19,4],[13,4],[11,8]],shade(cloth,-14));r(12,2,7,1,light);r(10,5,1,5,shade(cloth,18));r(23,7,1,5,shade(cloth,-38));}
  if(style==='scarf'){r(11,15,12,3,'#dba86d');r(12,15,9,1,'#f2d49e');r(20,17,3,7,'#b57857');r(21,18,1,5,'#ecc48a');r(11,4,2,10,hair);r(23,5,1,9,hair);}
  // The moving working arm is independently posed and carries the proper tool.
  let armY=19,wristX=25,wristY=26;
  if(walk){armY=19-stride;wristY=26-stride;}
  if(pose==='hammer'){armY=[17,13,11,14,22,23,21][frame%7];wristY=[18,12,8,12,33,32,24][frame%7];wristX=[26,27,27,28,29,29,27][frame%7];}
  if(pose==='cut'||pose==='polish'){armY=20;wristX=26+[0,1,2,1,0,-1][frame%6];wristY=26;}
  if(pose==='heat'){armY=19;wristX=27;wristY=24+frame%2;}
  if(pose==='quench'){armY=20;wristX=29;wristY=26+frame%2;}
  if(pose==='chat'){armY=18;wristX=26;wristY=18+frame%3;}
  r(7,19+stride,3,8,shade(cloth,-18));r(8,25+stride,2,3,skin);r(9,26+stride,1,1,skinLight);
  r(23,armY,3,5,cloth);r(23,armY,2,1,light);pixelLine(c,32,armY+7,wristX+7,wristY+5,skinShade,3);r(wristX,wristY,3,3,skin);r(wristX,wristY,2,1,skinLight);
  if(pose==='hammer'){r(wristX+1,wristY-11,2,13,'#b18352');r(wristX+2,wristY-10,1,9,'#ebbf7c');r(wristX-4,wristY-13,12,5,C.ink);r(wristX-3,wristY-13,10,3,'#8caec0');r(wristX-2,wristY-13,6,1,'#e7f4df');r(wristX+5,wristY-12,2,2,'#46607a');}
  if(pose==='heat'||pose==='quench'){r(wristX+1,wristY,9,1,'#708b9d');r(wristX+2,wristY+2,8,1,'#b0c9ca');r(wristX+9,wristY-1,3,4,pose==='heat'?'#ffb961':'#e0b06b');}
  if(pose==='polish'||pose==='cut'){r(wristX+1,wristY+1,5,2,pose==='cut'?'#b8dce1':'#ecd7a3');r(wristX+2,wristY+1,2,1,C.cream);}
  if(p.carry){r(7,22,9,8,'#6e4b3f');r(8,22,7,1,'#dbaa6b');r(9,23,6,5,'#b88655');r(12,23,1,5,'#48383b');}
  if(facing==='left'){const mirrored=canvas(48,48),ctx=mirrored.getContext('2d');ctx.translate(48,0);ctx.scale(-1,1);ctx.drawImage(image,0,0);return mirrored;}
  return image;
}
export function paintCharacter(c,a,p={},t=0,scale=2){
  const pose=a.pose||'idle',id=p.id||'smith',seed=[...id].reduce((n,v)=>n+v.charCodeAt(0),0),elapsed=Math.max(0,t*1000-(a.poseStarted||0));
  const frame=pose==='walk'?Math.floor((a.phase||0)*2)%8:pose==='hammer'?Math.min(6,Math.floor(elapsed/60)):['heat','polish','cut','quench','chat'].includes(pose)?Math.floor(elapsed/85)%6:0;
  const blink=pose!=='hammer'&&(t+seed*.1)%5<.12,key=[id,p.color,p.hair,p.style,p.carry,a.facing,pose,frame,blink].join('|');
  let image=frames.get(key);if(!image){image=sprite(p,a.facing||'right',pose,frame,blink);frames.set(key,image);if(frames.size>LIMIT)frames.delete(frames.keys().next().value);}
  c.save();c.globalAlpha=.28;oval(c,a.x,a.y+1,19,3,C.deep);c.restore();
  const breathe=pose==='idle'?Math.round(Math.sin(t*2+seed)*.7):0;
  c.imageSmoothingEnabled=false;c.drawImage(image,Math.round(a.x-23*scale),Math.round(a.y-45*scale+breathe),48*scale,48*scale);
}
