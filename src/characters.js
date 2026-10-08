import {C,px,px as rasterPx,polygon,polygon as rasterPolygon,oval,shade,pixelLine,pixelLine as rasterLine,canvas} from './pixel.js';
import {characterRig} from './character-rig.js';

const SIZE=80,BASELINE=78,CENTER=40,CACHE_LIMIT=384;
const frames=new Map(),INK='#292733',LINEN='#eadbb8';
const LOOKS={
  smith:{outfit:'smith',color:'#527e89',hair:'#51382e',skin:'#d9a17b',beard:true,eyes:'#674833'},
  apprentice:{outfit:'smith',color:'#76947f',hair:'#985d3e',skin:'#e8b895',cap:true,eyes:'#58776b'},
  mira:{outfit:'miner',color:'#b68a54',hair:'#4b332e',skin:'#dca988',female:true,cap:true,eyes:'#6c4e33'},
  bren:{outfit:'officer',color:'#4a6a98',hair:'#574137',skin:'#d5a181',hat:'tricorn',eyes:'#577f87'},
  ada:{outfit:'merchant',color:'#ba777d',hair:'#52363b',skin:'#d6a08c',female:true,hat:'bonnet',eyes:'#654c39'},
  elin:{outfit:'surveyor',color:'#4e8c9a',hair:'#bc8648',skin:'#e9b995',female:true,hat:'tricorn',eyes:'#59858e'},
  rowan:{outfit:'farmer',color:'#899052',hair:'#735139',skin:'#c99470',hat:'felt',beard:true,eyes:'#66533b'},
  sera:{outfit:'apothecary',color:'#9a7ca5',hair:'#d0b891',skin:'#efc5a8',female:true,hat:'bonnet',eyes:'#6b9896'},
  nora:{outfit:'rider',color:'#49806d',hair:'#9d583b',skin:'#dca587',female:true,hat:'felt',eyes:'#507d67'},
  daro:{outfit:'gentleman',color:'#ad8056',hair:'#bfb9a4',skin:'#dcb18e',hat:'tricorn',mature:true,eyes:'#6a6258'},
};
function look(person){const base=LOOKS[person.id||'smith']||LOOKS.smith;return {...base,...person,color:person.color||base.color,hair:person.hair||base.hair};}

// Filled contours make sleeves and calves read as volumes, rather than lines.
function ribbon(c,a,b,d,widths,color){
  const normal=(u,v)=>{const length=Math.max(.1,Math.hypot(v[0]-u[0],v[1]-u[1]));return [-(v[1]-u[1])/length,(v[0]-u[0])/length];};
  const n0=normal(a,b),n1=normal(b,d),n=[n0[0]+n1[0],n0[1]+n1[1]],length=Math.max(.1,Math.hypot(...n));
  const normals=[n0,[n[0]/length,n[1]/length],n1],points=[a,b,d];
  polygon(c,[...points.map((p,i)=>[p[0]+normals[i][0]*widths[i]/2,p[1]+normals[i][1]*widths[i]/2]),...points.map((p,i)=>[p[0]-normals[i][0]*widths[i]/2,p[1]-normals[i][1]*widths[i]/2]).reverse()],color);
}
const midway=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
function hand(c,w,skin,grip=false){
  const x=Math.round(w[0]),y=Math.round(w[1]);
  polygon(c,[[x-2,y-2],[x+1,y-2],[x+3,y],[x+2,y+3],[x-1,y+3],[x-3,y+1]],INK);
  px(c,x-1,y-1,3,3,skin);px(c,x,y-1,2,1,shade(skin,25));px(c,x-2,y+1,2,1,shade(skin,-22));
  if(grip)px(c,x+1,y+1,2,1,shade(skin,-25));
}
function arm(c,p,bone,far=false,pose='idle'){
  const {shoulder:a,elbow:b,wrist:d}=bone,rolled=['smith','miner'].includes(p.outfit);
  const shirts=rolled||p.outfit==='farmer',cloth=shirts?LINEN:p.color,skin=shade(p.skin,far?-15:0);
  const base=shade(cloth,far?-25:0),light=shade(base,24),dark=shade(base,-29);
  if(rolled){
    ribbon(c,a,b,d,[8,7,5],INK);ribbon(c,a,b,d,[6,5,3],skin);
    const cuff=midway(b,d,.28);
    ribbon(c,a,midway(a,b,.65),cuff,[9,8,6],INK);ribbon(c,a,midway(a,b,.65),cuff,[7,6,4],base);
    pixelLine(c,a[0]-1,a[1],b[0]-1,b[1]-1,light,2);
    px(c,b[0]-2,b[1]-1,3,1,dark);px(c,cuff[0]-2,cuff[1]-1,4,2,'#b5ad94');px(c,cuff[0]-2,cuff[1]-1,4,1,'#f8e9c5');
  }else{
    ribbon(c,a,b,d,[9,7,5],INK);ribbon(c,a,b,d,[7,5,3],base);
    pixelLine(c,a[0]-1,a[1]+1,b[0]-1,b[1],light,2);pixelLine(c,b[0]+1,b[1]+1,d[0]+1,d[1]-2,dark);
    px(c,b[0]-2,b[1]-1,3,1,dark);px(c,d[0]-2,d[1]-2,4,2,shirts?'#c1b59a':shade(base,25));px(c,d[0]-1,d[1]-2,2,1,LINEN);
  }
  hand(c,d,skin,['hammer','heat','quench','cut','polish'].includes(pose));
}
function leg(c,p,hip,knee,ankle,far,side){
  const tall=['smith','miner','rider','surveyor'].includes(p.outfit),pants=p.outfit==='officer'?'#7c8290':p.outfit==='gentleman'?'#756353':'#4a535f';
  const base=shade(pants,far?-18:0),stocking=shade(tall?'#745441':'#c9c6a9',far?-23:0);
  ribbon(c,hip,knee,ankle,[9,7,5],INK);
  const hem=midway(knee,ankle,.1);ribbon(c,hip,midway(hip,knee,.55),hem,[7,7,5],base);
  pixelLine(c,hip[0]-2,hip[1]+1,knee[0]-2,knee[1]-1,shade(base,22),2);px(c,knee[0]-2,knee[1]-1,4,1,shade(base,-24));
  ribbon(c,knee,midway(knee,ankle,.5),ankle,[5,5,3],stocking);px(c,knee[0]-2,knee[1],4,1,shade(stocking,21));
  const x=Math.round(ankle[0]),y=Math.round(ankle[1]),boot=tall?'#5a3e34':'#4b3835',toe=side?4:3;
  polygon(c,[[x-3,y-(tall?11:7)],[x+2,y-(tall?11:7)],[x+2,y-1],[x+toe,y],[x+toe+1,y+2],[x-4,y+2],[x-4,y]],INK);
  px(c,x-2,y-(tall?10:6),4,tall?10:6,shade(boot,far?-10:0));px(c,x-2,y-(tall?10:6),1,tall?9:5,shade(boot,26));px(c,x-3,y,6+toe,2,boot);px(c,x-1,y,4+toe,1,shade(boot,26));px(c,x-4,y+2,6+toe,1,INK);px(c,x+1,y-4,1,1,'#ccb276');
}
function legs(c,p,rig,pose,frame){
  const {side,swing,bob}=rig,walk=pose==='walk';
  // The planted foot stays at the baseline; the other rolls forward and lifts.
  for(let i=0;i<2;i++){
    const sign=i?1:-1,advance=walk?swing*sign:0,lift=walk?Math.max(0,advance)*.6:0;
    const hip=[side?(i?35:29):(i?37:27),44+bob],knee=[hip[0]+(side?advance*.48:advance*.15)+(i?0:-1),59-lift*.4],ankle=[hip[0]+(side?advance:advance*.25)+(i?1:-1),73-lift];
    leg(c,p,hip,knee,ankle,i===0,side);
  }
}
const bodyY=y=>y<23?y:23+Math.round((y-23)*1.35);
function clothes(c,p,rig,pose,frame){
  const px=(c,x,y,w,h,color)=>rasterPx(c,x,bodyY(y),w,bodyY(y+h)-bodyY(y),color);
  const polygon=(c,points,color)=>rasterPolygon(c,points.map(([x,y])=>[x,bodyY(y)]),color);
  const pixelLine=(c,x,y,tx,ty,color,width=1)=>rasterLine(c,x,bodyY(y),tx,bodyY(ty),color,width);
  const {side,back,lean}=rig,color=p.color,light=shade(color,35),dark=shade(color,-32);
  const skirt=['merchant','apothecary'].includes(p.outfit),coat=['officer','surveyor','rider','gentleman'].includes(p.outfit);
  c.save();c.translate(lean,0);
  const hem=pose==='walk'?[0,1,1,0,0,-1,-1,0][frame%8]:0;
  if(skirt){
    polygon(c,[[27,35],[37,35],[42+hem,53],[41+hem,57],[23+hem,57],[21+hem,53]],INK);
    polygon(c,[[28,36],[36,36],[40+hem,53],[39+hem,56],[25+hem,56],[23+hem,53]],shade(color,-8));
    polygon(c,[[28,37],[30,37],[28+hem,55],[25+hem,55]],light);polygon(c,[[34,38],[36,37],[39+hem,55],[36+hem,55]],dark);px(c,26+hem,54,10,1,shade(color,17));
    if(p.outfit==='apothecary'&&!back){polygon(c,[[29,37],[35,37],[38+hem,53],[37+hem,55],[27+hem,55]],'#d3ccb3');px(c,29+hem,40,2,13,'#f6e8c9');px(c,33+hem,44,4,3,'#a39d8b');px(c,33+hem,44,4,1,'#eee1bf');}
  }
  if(coat){
    const shift=side?3:0;
    polygon(c,[[23+shift,31],[39,31],[43,46+hem],[36,48+hem],[32,43],[26+shift,47+hem],[21+shift,45]],INK);
    polygon(c,[[25+shift,32],[38,32],[41,45+hem],[36,46+hem],[32,41],[27+shift,45+hem],[23+shift,44]],color);
    pixelLine(c,25+shift,34,24+shift,44,dark,2);pixelLine(c,38,34,40,44,light);px(c,35,38,5,2,shade(color,-17));px(c,35,38,5,1,light);
  }
  const outer=side?[[29,22],[36,22],[40,25],[41,34],[38,39],[26,39],[25,31],[26,25]]:[[27,22],[37,22],[43,25],[42,32],[39,39],[25,39],[21,32],[20,25]];
  const inner=side?[[29,23],[36,23],[39,26],[39,34],[37,38],[28,38],[27,31],[28,25]]:[[27,23],[36,23],[41,26],[40,32],[38,38],[26,38],[23,31],[22,26]];
  polygon(c,outer,INK);polygon(c,inner,color);
  if(back){
    polygon(c,side?[[29,24],[32,24],[31,35],[28,33]]:[[25,25],[28,24],[29,35],[25,33]],light);pixelLine(c,33,27,33,37,dark);px(c,29,25,7,1,shade(color,17));if(coat)px(c,26,38,13,1,dark);
  }else{
    if(coat){
      polygon(c,side?[[32,24],[37,24],[39,30],[38,39],[32,38]]:[[27,24],[36,24],[38,37],[27,38]],'#c4b38b');px(c,side?35:29,27,2,8,'#eddab0');px(c,side?38:35,28,1,9,'#978774');
      polygon(c,side?[[29,24],[32,24],[34,28],[31,32],[29,37],[27,34]]:[[24,24],[28,24],[30,29],[27,31],[26,38],[23,34]],color);pixelLine(c,side?30:26,25,side?32:28,29,light);
      if(!side){polygon(c,[[36,24],[40,26],[38,35],[36,38],[35,30]],dark);pixelLine(c,38,26,37,33,light);}
    }else{polygon(c,side?[[29,25],[31,25],[30,34],[28,34]]:[[25,25],[28,25],[28,35],[25,34]],light);px(c,side?38:37,27,2,9,dark);px(c,side?30:26,35,7,1,shade(color,13));}
    const collarX=side?34:31;
    polygon(c,[[collarX-4,23],[collarX,24],[collarX+3,23],[collarX+2,27],[collarX,29],[collarX-2,27]],LINEN);px(c,collarX,25,2,2,'#fff0d0');px(c,collarX,28,1,2,'#b0a488');
    for(let y=31;y<38;y+=3){px(c,side?36:32,y,1,1,'#e5c480');px(c,(side?36:32)+1,y,1,1,dark);}
  }
  if(p.outfit==='smith'){
    if(back){pixelLine(c,28,24,37,37,'#ca965e',2);pixelLine(c,37,24,28,37,'#986443',2);px(c,26,38,14,2,'#79503d');}
    else{
      const x=side?33:29;
      pixelLine(c,x,23,x,28,'#edbb7e',2);pixelLine(c,x+5,24,x+4,28,'#b18155',2);
      polygon(c,[[x-1,27],[x+6,27],[x+6,34],[x+9,45],[x+7,47],[x-6,47],[x-8,44],[x-3,34]],'#49342f');polygon(c,[[x,28],[x+5,28],[x+4,35],[x+7,44],[x+6,46],[x-5,46],[x-6,44],[x-2,34]],'#a36a43');
      polygon(c,[[x,29],[x+2,29],[x,36],[x-3,43],[x-4,43]],'#d29a60');px(c,x+4,32,1,8,'#754a37');px(c,x-3,37,8,5,'#744a36');px(c,x-3,37,8,1,'#d6a16b');px(c,x+3,39,1,1,'#efc582');px(c,x-4,44,9,1,'#c68f59');px(c,x,29,1,1,'#ffe2a0');
    }
  }else if(p.outfit==='miner'){px(c,27,37,13,2,'#694939');px(c,33,37,3,2,'#d8b37b');px(c,34,37,1,1,'#ffdda0');}
  else if(p.outfit==='farmer'){px(c,27,38,12,2,'#645040');px(c,32,38,3,2,'#d5b974');}
  if(!back&&['surveyor','rider','merchant'].includes(p.outfit)){
    pixelLine(c,side?29:25,24,39,39,'#493b34',3);pixelLine(c,side?30:26,24,40,39,'#b18a5b');px(c,37,36,7,9,'#3d3330');px(c,38,37,5,7,'#996840');px(c,38,37,5,2,'#c2935d');px(c,40,39,1,1,'#e7c685');
  }
  if(p.outfit==='officer'&&!back){pixelLine(c,side?29:24,25,38,37,'#aeaa91',3);pixelLine(c,side?30:25,25,39,37,'#f4e6bd');px(c,26,39,13,2,'#655244');px(c,32,39,3,2,'#d9b56f');}
  if(p.outfit==='surveyor'&&!back){px(c,32,32,3,7,'#ead0a0');px(c,33,33,1,5,'#b19b73');}
  c.restore();
}
function hairBehind(c,p,rig,pose,frame){
  if(!p.female&&!p.mature)return;
  const {side,back,lean}=rig,sway=pose==='walk'?Math.round(rig.swing/3):['wave','browse'].includes(pose)?frame%2:0;
  c.save();c.translate(lean,0);const hair=p.hair,shadow=shade(hair,-26),light=shade(hair,25);
  if(side||back){
    polygon(c,[[24,9],[31,8],[33,18],[29,22],[28+sway,29],[25+sway,32],[23+sway,29],[24,21],[22,17]],INK);polygon(c,[[25,11],[30,11],[31,18],[27,22],[27+sway,29],[25+sway,30],[25,20],[23,17]],hair);pixelLine(c,25,17,26+sway,28,light);px(c,26,20,4,2,'#6a5145');px(c,27,21,1,1,'#d1ae70');
  }else{polygon(c,[[25,9],[39,9],[40,20],[37,26],[34,26],[35,18],[27,18],[28,25],[24,24],[23,18]],shadow);pixelLine(c,25,14,25,23,light);pixelLine(c,38,14,37,23,hair,2);}
  c.restore();
}
function head(c,p,rig,blink){
  const {side,back,lean}=rig,skin=p.skin,light=shade(skin,26),shadow=shade(skin,-28),hair=p.hair,hairLight=shade(hair,25);
  c.save();c.translate(lean,0);px(c,side?32:29,19,6,6,shade(skin,-36));px(c,side?34:30,21,3,3,skin);
  if(side){
    polygon(c,[[28,6],[35,6],[39,9],[40,13],[40,15],[41,16],[41,18],[39,18],[39,20],[36,23],[30,21],[27,17],[26,11]],INK);polygon(c,[[29,7],[35,7],[38,10],[38,14],[39,16],[40,17],[38,18],[38,20],[35,22],[30,20],[28,16],[28,11]],skin);
    polygon(c,[[30,9],[35,9],[37,11],[37,14],[32,15],[29,14]],light);px(c,37,16,2,3,shade(skin,-14));px(c,39,17,1,1,light);px(c,36,20,2,1,shade(skin,-35));px(c,33,21,3,1,shade(skin,8));px(c,28,14,3,4,shadow);px(c,29,15,2,2,skin);px(c,30,15,1,1,light);
    if(!back){
      px(c,34,12,4,1,shade(hair,-10));if(blink)px(c,35,15,3,1,shade(skin,-35));else{px(c,35,14,3,2,INK);px(c,36,14,1,1,'#f9e7c6');px(c,37,15,1,1,p.eyes);}
      px(c,38,19,2,1,p.female?'#a9635a':'#99604d');if(p.female){px(c,29,18,1,2,'#f0c77e');px(c,30,19,1,1,'#ffe2a0');}
    }
  }else{
    polygon(c,[[27,7],[36,7],[40,11],[40,16],[38,20],[35,23],[29,23],[25,20],[23,16],[24,11]],INK);polygon(c,[[27,8],[36,8],[38,11],[38,16],[36,20],[34,22],[29,22],[26,19],[25,15],[25,12]],skin);polygon(c,[[28,9],[34,9],[36,11],[35,13],[29,14],[26,13]],light);px(c,24,14,2,3,shadow);px(c,38,14,2,3,shadow);px(c,25,14,1,2,skin);px(c,36,16,2,3,shade(skin,-16));px(c,27,17,2,2,shade(skin,7));
    if(!back){
      px(c,27,12,3,1,shade(hair,-10));px(c,34,12,3,1,shade(hair,-10));if(blink){px(c,27,15,3,1,shadow);px(c,34,15,3,1,shadow);}else{for(const x of[27,34]){px(c,x,14,3,2,INK);px(c,x,14,1,1,'#f9e7c6');px(c,x+1,15,1,1,p.eyes);}}
      px(c,32,16,1,3,shadow);px(c,31,16,1,2,light);px(c,31,18,2,1,shade(skin,-20));px(c,30,20,4,1,p.female?'#af7067':'#a16c54');px(c,31,21,2,1,shade(skin,13));if(p.mature){px(c,26,17,1,1,shadow);px(c,37,17,1,1,shadow);}
    }
  }
  // Hair clusters leave a clear brow line and never paint over the eyes.
  polygon(c,side?[[27,14],[25,10],[26,6],[29,3],[35,3],[39,6],[39,11],[36,9],[34,8],[30,9],[29,14]]:[[24,14],[23,10],[25,6],[28,3],[35,3],[39,6],[40,10],[38,13],[37,10],[34,8],[31,9],[28,8],[26,10],[26,14]],INK);
  polygon(c,side?[[27,12],[26,9],[28,6],[30,4],[35,4],[38,7],[38,10],[34,7],[30,8],[28,12]]:[[25,12],[24,9],[26,6],[29,4],[35,4],[38,7],[38,10],[35,7],[31,8],[28,7],[26,9]],hair);px(c,29,5,5,1,hairLight);px(c,27,7,2,1,hairLight);px(c,36,7,1,2,shade(hair,-22));
  if(back){
    polygon(c,[[25,8],[38,8],[39,14],[36,21],[29,22],[25,18],[23,13]],hair);polygon(c,[[27,9],[31,8],[31,17],[28,18],[26,15]],hairLight);pixelLine(c,35,10,34,20,shade(hair,-26),2);if(p.female||p.mature){px(c,30,19,5,3,shade(hair,-18));px(c,30,21,5,1,'#59433a');}
  }else if(p.beard){
    if(side){polygon(c,[[30,19],[33,21],[37,20],[37,22],[34,24],[31,22]],hair);px(c,34,20,3,1,shade(hair,10));px(c,33,23,2,1,hairLight);}else{polygon(c,[[26,19],[29,20],[30,21],[34,21],[36,19],[36,22],[34,24],[29,24],[27,22]],hair);px(c,30,19,4,1,shade(hair,-12));px(c,29,22,2,1,hairLight);px(c,32,23,2,1,shade(hair,12));}
  }
  if(p.cap){
    polygon(c,[[23,10],[24,6],[28,2],[35,2],[39,6],[40,10]],'#49413b');polygon(c,[[25,8],[26,5],[29,3],[35,3],[38,7],[38,9]],'#ab9368');px(c,27,5,7,1,'#d1b982');px(c,24,10,16,2,'#6e5d46');px(c,25,10,14,1,'#dcc495');
  }else if(p.hat==='tricorn'){
    polygon(c,[[19,8],[24,7],[25,4],[31,2],[36,3],[39,7],[44,8],[41,11],[22,11]],'#252734');polygon(c,[[21,8],[25,8],[26,5],[31,3],[36,5],[38,9],[42,9],[40,10],[23,10]],'#4a4853');pixelLine(c,22,9,31,6,'#c1ae7b');pixelLine(c,31,6,40,9,'#e0c896');px(c,37,7,2,2,p.outfit==='officer'?'#d57464':'#cdb589');px(c,38,7,1,1,'#ffe3aa');
  }else if(p.hat==='felt'){
    polygon(c,[[21,9],[25,8],[26,3],[35,3],[39,8],[44,9],[41,11],[23,11]],'#4b3d32');polygon(c,[[27,4],[35,4],[37,8],[26,8]],'#bc9860');px(c,28,4,5,1,'#e0bd7b');px(c,26,8,12,1,'#796046');px(c,22,10,20,1,'#d2b57f');
  }else if(p.hat==='bonnet'){
    polygon(c,[[23,14],[22,8],[25,4],[29,2],[35,3],[39,6],[41,11],[38,14],[37,9],[34,6],[28,6],[26,10],[26,14]],'#978c7d');polygon(c,[[24,12],[24,8],[26,5],[29,3],[34,4],[37,6],[39,11],[38,12],[36,8],[33,6],[29,6],[26,8],[25,12]],'#eee3c8');px(c,27,4,6,1,'#fff1d4');px(c,24,9,1,4,'#c2bba2');px(c,side?29:26,20,2,4,'#dfcfab');px(c,side?31:28,23,3,1,'#fff0ca');
  }
  c.restore();
}
function equipment(c,p,rig,pose,frame,temper){
  const w=rig.near.wrist,t=rig.tool;
  if(pose==='hammer'){
    pixelLine(c,...w,...t,'#3d3030',3);pixelLine(c,w[0]+1,w[1],t[0]+1,t[1],'#c4925f');polygon(c,[[t[0]-6,t[1]-3],[t[0]+4,t[1]-3],[t[0]+6,t[1]-1],[t[0]+6,t[1]+2],[t[0]+4,t[1]+3],[t[0]-6,t[1]+3]],INK);px(c,t[0]-5,t[1]-2,9,3,'#90adbc');px(c,t[0]-4,t[1]-2,7,1,'#e0eacb');px(c,t[0]+3,t[1],2,2,'#4d687d');hand(c,w,p.skin,true);
  }else if(pose==='heat'||pose==='quench'){
    pixelLine(c,w[0]+1,w[1],...t,'#43535d',3);pixelLine(c,w[0]+1,w[1]-1,t[0],t[1]-1,'#b4cac4');px(c,t[0]-1,t[1]-1,5,3,pose==='heat'?'#f59a59':'#b89974');px(c,t[0],t[1]-1,3,1,pose==='heat'?'#ffe9aa':'#e6cba0');hand(c,w,p.skin,true);
  }else if(pose==='cut'){
    pixelLine(c,...w,...t,'#684a36',3);pixelLine(c,w[0],w[1]-1,t[0],t[1]-1,'#d1b184');px(c,t[0]-2,t[1]-1,4,3,'#9fb7bc');px(c,t[0],t[1],2,1,'#e9e5c6');hand(c,w,p.skin,true);
  }else if(pose==='polish'){
    px(c,w[0]+1,w[1]-1,10,4,'#847c68');px(c,w[0]+2,w[1]-2,8,4,'#d3c39e');px(c,w[0]+3,w[1]-2,5,1,'#fff0c8');hand(c,w,p.skin,true);
  }else if(pose==='inspect'){
    polygon(c,[[29,39],[37,37],[46,39],[46,45],[38,43],[30,45]],'#443832');polygon(c,[[30,39],[37,38],[45,40],[45,44],[38,42],[31,44]],'#e8cfa1');px(c,37,39,1,4,'#ad855d');pixelLine(c,32,40,35,39,'#a38c6d');pixelLine(c,40,40,43,41,'#a38c6d');hand(c,rig.far.wrist,p.skin);hand(c,rig.near.wrist,p.skin);
  }else if(pose==='wave'){
    px(c,w[0]-1,w[1]-4,1,3,p.skin);px(c,w[0]+1,w[1]-4,1,3,shade(p.skin,18));px(c,w[0]+2,w[1]-3,1,2,p.skin);
  }else if(pose==='browse'){px(c,w[0]+2,w[1]-1,3,1,shade(p.skin,17));}
  if(p.carry){const far=rig.far.wrist,x=Math.round(far[0])-3,y=Math.round(far[1])+2;pixelLine(c,x+1,y-3,x+5,y-3,'#d2ae79');px(c,x,y,8,9,'#46352e');px(c,x+1,y+1,6,7,'#b78350');px(c,x+2,y+1,4,1,'#eac181');px(c,x+5,y+3,1,4,'#855b3b');}
}
function sprite(p,facing,pose,frame,blink,breath,temper){
  const image=canvas(SIZE,SIZE),c=image.getContext('2d'),rig=characterRig(facing,pose,frame,temper,breath);c.save();c.translate(8,2);
  legs(c,p,rig,pose,frame);c.save();c.translate(0,rig.bob);
  hairBehind(c,p,rig,pose,frame);arm(c,p,rig.far,true,pose);clothes(c,p,rig,pose,frame);head(c,p,rig,blink);arm(c,p,rig.near,false,pose);equipment(c,p,rig,pose,frame,temper);
  if(rig.back)px(c,rig.near.shoulder[0]-1,rig.near.shoulder[1]-2,3,2,shade(p.color,14));
  c.restore();c.restore();
  if(facing==='left'){const mirrored=canvas(SIZE,SIZE),ctx=mirrored.getContext('2d');ctx.translate(SIZE,0);ctx.scale(-1,1);ctx.drawImage(image,0,0);return mirrored;}
  return image;
}
function frameImage(p,facing,pose,frame,blink=false,breath=0,temper='water'){
  const key=[p.id,p.outfit,p.color,p.hair,p.skin,p.eyes,p.female,p.hat,p.cap,p.beard,p.mature,p.carry,facing,pose,frame,blink,breath,temper].join('|');
  let image=frames.get(key);if(!image){image=sprite(p,facing,pose,frame,blink,breath,temper);frames.set(key,image);if(frames.size>CACHE_LIMIT)frames.delete(frames.keys().next().value);}return image;
}
export function paintCharacter(c,a,person={},time=0,scale=2){
  const p=look(person),pose=a.pose||'idle',seed=[...(p.id||'smith')].reduce((n,v)=>n+v.charCodeAt(0),0),elapsed=Math.max(0,time*1000-(a.poseStarted||0));
  const frame=pose==='walk'?Math.floor((a.phase||0)*2)%8:pose==='hammer'?Math.min(6,Math.floor(elapsed/60)):pose==='quench'?Math.min(5,Math.floor(elapsed/100)):['heat','polish','cut','chat','wave','inspect','browse'].includes(pose)?Math.floor(elapsed/(pose==='inspect'?200:85))%6:0;
  const blink=pose==='idle'&&(time+seed*.13)%5<.13,breath=pose==='idle'&&Math.sin(time*2+seed)>.7?-1:0,size=scale*.8;
  const image=frameImage(p,a.facing||'right',pose,frame,blink,breath,pose==='quench'?a.temper||'water':'water');
  c.save();c.globalAlpha=.22;oval(c,a.x,a.y+1,17,3,C.deep);c.restore();c.imageSmoothingEnabled=false;
  c.drawImage(image,Math.round(a.x-CENTER*size),Math.round(a.y-BASELINE*size),SIZE*size,SIZE*size);
}
export function paintPortrait(c,person,size=64){
  const p=look(person),image=frameImage(p,'down','idle',0);c.imageSmoothingEnabled=false;
  px(c,0,0,size,size,'#2a211c');px(c,2,2,size-4,size-4,'#b08a4f');px(c,4,4,size-8,size-8,'#2f4448');px(c,4,size-22,size-8,18,'#283a3e');c.drawImage(image,27,3,27,31,5,4,size-10,size-8);
}
