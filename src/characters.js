import {C,px,px as rasterPx,polygon,polygon as rasterPolygon,oval,shade,pixelLine,pixelLine as rasterLine,canvas,noise} from './pixel.js';
import {characterRig} from './character-rig.js';

const SIZE=80,BASELINE=78,CENTER=40,CACHE_LIMIT=480;
const frames=new Map(),INK='#292733',LINEN='#eadbb8',LINEN_SHADE='#c1b59a',BLOOD='#9a2418',MUD='#5b4a35',DUST='#7b6a55';
const LOOKS={
  smith:{outfit:'smith',color:'#527e89',hair:'#51382e',skin:'#d9a17b',beard:true,eyes:'#674833'},
  daro:{outfit:'gentleman',color:'#ad8056',hair:'#bfb9a4',skin:'#dcb18e',hat:'tricorn',mature:true,eyes:'#6a6258'},
};
// What the people of the bestiary can wear and carry (art.md 4.8): the outfits and hats of the content, the eight weapons
// of the hunters, and the personal marks a beaten hunter brings back (HUNTERS[].marks, from rag 1 and rag 2).
export const OUTFITS=['smith','miner','farmer','officer','gentleman','rider','surveyor','merchant','apothecary','cassock'];
export const HATS=['tricorn','felt','bonnet','skufia'];
export const WEAPONS=['fusil','crossbow','hammer','rifle','staff','harpoon','bow','rapier'];
export const MARKS=['cuffTorn','mudHigh','bandageHead','hatOnBarrel','hatLost','braidLoose','burrs','apronBurn','capAskew','bruise','cloakStrips','muddyBarrel','scratches','hemTorn','noSkufia','staffCrutch','wet','seaweed','shirtTorn','soot','jacketTear','bowBroken','wigAskew','cuffSoot','coatRags'];
function look(person){const base=LOOKS[person.id]||LOOKS.smith;return {...base,...person,color:person.color||base.color,hair:person.hair||base.hair};}
const mixHex=(a,b,k)=>{const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),ch=s=>Math.round(((x>>s)&255)+(((y>>s)&255)-((x>>s)&255))*k);return '#'+[16,8,0].map(s=>ch(s).toString(16).padStart(2,'0')).join('');};
// The look of a person as it is drawn today: the rag of a beaten hunter (0 whole … 3 badly wounded) dusts the clothes and
// adds the common overlays, and his own marks of rag 1 and rag 2 come on top (art.md 4.8). A list of marks is taken as is.
export function dress(person={}){
 if(person.dressed)return person;const p=look(person),rag=Math.max(0,Math.min(3,Math.floor(Number(person.rag)||0))),m=person.marks||{};
 const listed=Array.isArray(m)?m:[...(rag>=1&&Array.isArray(m.rag1)?m.rag1:[]),...(rag>=2&&Array.isArray(m.rag2)?m.rag2:[])];
 const marks=[...new Set(listed.filter(x=>MARKS.includes(x)))].sort(),has=x=>marks.includes(x);
 const q={...p,rag,marks,gear:WEAPONS.includes(p.gear)?p.gear:null};
 if(rag)q.color=mixHex(p.color,DUST,rag>=2?.25:.12);if(has('wet'))q.color=shade(q.color,-20);
 if(rag>=3||has('hatLost')||has('hatOnBarrel')||has('noSkufia')&&p.hat==='skufia')q.hat=null;if(rag>=3)q.cap=false;
 q.bandageHead=rag>=3||has('bandageHead');q.sling=rag>=2;q.crutch=rag>=3;q.staffCrutch=q.crutch&&q.gear==='staff';q.dressed=true;
 return q;}
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
const GRIP=['hammer','heat','quench','cut','polish','write','stir'];
function arm(c,p,bone,far=false,pose='idle'){
  const {shoulder:a,elbow:b,wrist:d}=bone,rolled=['smith','miner'].includes(p.outfit),narrow=p.outfit==='cassock';
  const shirts=rolled||p.outfit==='farmer',cloth=shirts?LINEN:p.color,skin=shade(p.skin,far?-15:0);
  const base=shade(cloth,far?-25:0),light=shade(base,24),dark=shade(base,-29);
  if(rolled){
    ribbon(c,a,b,d,[8,7,5],INK);ribbon(c,a,b,d,[6,5,3],skin);
    const cuff=midway(b,d,.28);
    ribbon(c,a,midway(a,b,.65),cuff,[9,8,6],INK);ribbon(c,a,midway(a,b,.65),cuff,[7,6,4],base);
    pixelLine(c,a[0]-1,a[1],b[0]-1,b[1]-1,light,2);
    px(c,b[0]-2,b[1]-1,3,1,dark);px(c,cuff[0]-2,cuff[1]-1,4,2,'#b5ad94');px(c,cuff[0]-2,cuff[1]-1,4,1,'#f8e9c5');
  }else{
    ribbon(c,a,b,d,narrow?[8,6,5]:[9,7,5],INK);ribbon(c,a,b,d,narrow?[6,4,3]:[7,5,3],base);
    pixelLine(c,a[0]-1,a[1]+1,b[0]-1,b[1],light,2);pixelLine(c,b[0]+1,b[1]+1,d[0]+1,d[1]-2,dark);
    px(c,b[0]-2,b[1]-1,3,1,dark);px(c,d[0]-2,d[1]-2,4,2,shirts?LINEN_SHADE:shade(base,25));px(c,d[0]-1,d[1]-2,2,1,narrow?shade(base,18):LINEN);
  }
  // The near cuff of a beaten hunter: torn off down to the shirt, or its lace black with soot.
  if(!far&&p.marks.includes('cuffTorn')){px(c,d[0]-2,d[1]-3,4,2,LINEN);px(c,d[0]-2,d[1]-1,1,1,LINEN);px(c,d[0]+1,d[1]-3,1,1,LINEN_SHADE);}
  if(p.marks.includes('cuffSoot'))px(c,d[0]-2,d[1]-2,4,1,'#6a625a');
  hand(c,d,skin,GRIP.includes(pose));
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
// Mud of a beaten hunter on the boots and stockings, up to the knees for Гордей (art.md 4.8, rag 1).
function mud(c,p,ankle,i,side){
  const x=Math.round(ankle[0]),y=Math.round(ankle[1]),toe=side?4:3,high=p.marks.includes('mudHigh')?4:0;
  px(c,x-3,y,6+toe,2,MUD);px(c,x-2,y-2,4,2,MUD);
  for(let k=0;k<3;k++){const h=3+Math.floor(noise(k,i,p.id?.length||3)*(6+high));px(c,x-2+((k*2+i)%4),y-h,1,1,'#6e5a40');}
  if(high)px(c,x-2,y-9,4,1,MUD);
}
function legs(c,p,rig,pose,frame){
  const {side,swing,bob}=rig,walk=pose==='walk',sit=pose==='sit';
  // The planted foot stays at the baseline; the other rolls forward and lifts. Sitting, the thighs go forward and the
  // shins down to the floor.
  for(let i=0;i<2;i++){
    const sign=i?1:-1,advance=walk?swing*sign:0,lift=walk?Math.max(0,advance)*.6:0;
    const hip=[side?(i?35:29):(i?37:27),44+bob];
    const knee=sit?(side?[hip[0]+9,hip[1]+1]:[hip[0]+(i?1:-1),hip[1]+6]):[hip[0]+(side?advance*.48:advance*.15)+(i?0:-1),59-lift*.4];
    const ankle=sit?(side?[hip[0]+10,73]:[hip[0]+(i?1:-1),73]):[hip[0]+(side?advance:advance*.25)+(i?1:-1),73-lift];
    leg(c,p,hip,knee,ankle,i===0,side);if(p.rag)mud(c,p,ankle,i,side);
  }
}
const bodyY=y=>y<23?y:23+Math.round((y-23)*1.35);
function clothes(c,p,rig,pose,frame){
  const px=(c,x,y,w,h,color)=>rasterPx(c,x,bodyY(y),w,bodyY(y+h)-bodyY(y),color);
  const polygon=(c,points,color)=>rasterPolygon(c,points.map(([x,y])=>[x,bodyY(y)]),color);
  const pixelLine=(c,x,y,tx,ty,color,width=1)=>rasterLine(c,x,bodyY(y),tx,bodyY(ty),color,width);
  const {side,back,lean}=rig,color=p.color,light=shade(color,35),dark=shade(color,-32);
  const skirt=['merchant','apothecary'].includes(p.outfit),cassock=p.outfit==='cassock',coat=['officer','surveyor','rider','gentleman'].includes(p.outfit);
  c.save();c.translate(lean,0);
  const hem=pose==='walk'?[0,1,1,0,0,-1,-1,0][frame%8]:0;
  if(skirt){
    polygon(c,[[27,35],[37,35],[42+hem,53],[41+hem,57],[23+hem,57],[21+hem,53]],INK);
    polygon(c,[[28,36],[36,36],[40+hem,53],[39+hem,56],[25+hem,56],[23+hem,53]],shade(color,-8));
    polygon(c,[[28,37],[30,37],[28+hem,55],[25+hem,55]],light);polygon(c,[[34,38],[36,37],[39+hem,55],[36+hem,55]],dark);px(c,26+hem,54,10,1,shade(color,17));
    if(p.outfit==='apothecary'&&!back){polygon(c,[[29,37],[35,37],[38+hem,53],[37+hem,55],[27+hem,55]],'#d3ccb3');px(c,29+hem,40,2,13,'#f6e8c9');px(c,33+hem,44,4,3,'#a39d8b');px(c,33+hem,44,4,1,'#eee1bf');}
  }
  // The cassock of a priest (о. Никодим, Илларион): a straight robe to the ankles, so only the toes of the boots show.
  if(cassock){
    polygon(c,[[26,33],[38,33],[41+hem,56],[40+hem,59],[24+hem,59],[22+hem,56]],INK);
    polygon(c,[[27,34],[37,34],[40+hem,56],[39+hem,58],[25+hem,58],[23+hem,56]],shade(color,-6));
    pixelLine(c,29,37,26+hem,57,light);pixelLine(c,35,37,38+hem,57,dark);pixelLine(c,32,40,32+hem,57,shade(color,-14));px(c,25+hem,57,14,1,shade(color,14));
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
    if(cassock){px(c,collarX-4,23,7,1,LINEN);for(const y of[25,32,39,46,53]){const x=side?37+Math.round((y-25)*.1):32;px(c,x,y,1,1,'#c9a050');px(c,x+1,y,1,1,dark);}}
    else{polygon(c,[[collarX-4,23],[collarX,24],[collarX+3,23],[collarX+2,27],[collarX,29],[collarX-2,27]],LINEN);px(c,collarX,25,2,2,'#fff0d0');px(c,collarX,28,1,2,'#b0a488');
     for(let y=31;y<38;y+=3){px(c,side?36:32,y,1,1,'#e5c480');px(c,(side?36:32)+1,y,1,1,dark);}}
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
  if(p.rag&&!back)wear(c,p,{px,polygon,pixelLine},{side,skirt,cassock,coat,frame});
  c.restore();
}
// What a lost hunt leaves on the clothes (art.md 4.8): from rag 1 the hem of a coat, a skirt or a cassock hangs in teeth
// with two loose threads, then the personal marks of the hunter. Drawn in the coordinates of the body (bodyY).
function wear(c,p,{px,polygon,pixelLine},{side,skirt,cassock,coat,frame}){
  const tear=shade(p.color,-32),hole='#2a1d18',has=x=>p.marks.includes(x);
  const hy=cassock?58:skirt?56:coat?46:39,[x0,x1]=cassock||skirt?[24,40]:coat?[side?27:23,42]:[side?27:24,side?39:40];
  for(let x=x0+(p.id?.length||0)%3;x<x1;x+=3){px(c,x,hy,2,1,tear);px(c,x,hy+1,1,1,tear);}
  px(c,x0+4,hy+1,1,2,tear);px(c,x1-5,hy+1,1,3,tear);
  if(has('burrs'))for(const [x,y] of[[x0+2,hy-2],[x0+7,hy-1],[x1-6,hy-2],[x1-3,hy-1]]){px(c,x,y,2,1,'#6b5a2a');px(c,x,y-1,1,1,'#8a7a3a');}
  if(has('apronBurn')){const x=side?33:29;for(const [hx,y] of[[x+1,32],[x-3,40]]){px(c,hx-1,y-1,4,4,'#a36a43');px(c,hx,y,2,2,hole);}}
  if(has('cloakStrips'))for(const x of side?[28,33,39]:[24,30,38]){pixelLine(c,x,40,x,47,INK);px(c,x+1,44,1,2,tear);}
  if(has('coatRags'))for(const [x,y] of side?[[29,42],[37,40]]:[[25,41],[37,42]]){px(c,x-1,y-1,4,3,shade(p.color,20));px(c,x,y,2,2,hole);}
  if(has('jacketTear')){const x=side?31:29;px(c,x-1,32,4,3,shade(p.color,24));px(c,x,33,2,2,hole);}
  if(has('shirtTorn')){const x=side?35:31;px(c,x-1,27,5,3,INK);px(c,x,27,3,2,p.skin);}
  if(has('hemTorn'))polygon(c,[[x0+5,hy+1],[x0+9,hy+1],[x0+7,hy-4]],INK);
  if(has('wet'))for(let i=0;i<3;i++)px(c,x0+3+i*5,hy+3+((frame+i)%2)*2,1,1,'#9fc2d6');
}
function hairBehind(c,p,rig,pose,frame){
  if(!p.female&&!p.mature)return;
  const {side,back,lean}=rig,sway=pose==='walk'?Math.round(rig.swing/3):['wave','browse'].includes(pose)?frame%2:0;
  c.save();c.translate(lean,0);const hair=p.hair,shadow=shade(hair,-26),light=shade(hair,25);
  if(side||back){
    polygon(c,[[24,9],[31,8],[33,18],[29,22],[28+sway,29],[25+sway,32],[23+sway,29],[24,21],[22,17]],INK);polygon(c,[[25,11],[30,11],[31,18],[27,22],[27+sway,29],[25+sway,30],[25,20],[23,17]],hair);pixelLine(c,25,17,26+sway,28,light);px(c,26,20,4,2,'#6a5145');px(c,27,21,1,1,'#d1ae70');
  }else{polygon(c,[[25,9],[39,9],[40,20],[37,26],[34,26],[35,18],[27,18],[28,25],[24,24],[23,18]],shadow);pixelLine(c,25,14,25,23,light);pixelLine(c,38,14,37,23,hair,2);}
  // A braid come loose in the wood: three strands stand out of it (Агата).
  if(p.marks.includes('braidLoose')){if(side||back){pixelLine(c,24,14,21,17,hair);pixelLine(c,25+sway,24,22+sway,27,hair);pixelLine(c,26+sway,30,24+sway,34,light);}else{pixelLine(c,24,12,21,15,hair);pixelLine(c,39,13,42,17,hair);pixelLine(c,25,22,23,26,light);}}
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
  // Face marks of a beaten hunter: a bruise under the near eye, scratches on the cheek, soot on the face.
  if(!back){const has=x=>p.marks.includes(x);
    if(has('bruise'))px(c,side?35:34,16,2,1,'#5e4660');
    if(has('scratches')){pixelLine(c,side?32:35,16,side?34:37,18,'#a8504a');pixelLine(c,side?34:34,15,side?36:36,17,'#a8504a');}
    if(has('soot')){c.save();c.globalAlpha=.8;for(const [x,y] of side?[[31,11],[34,17],[32,19],[36,12]]:[[29,11],[35,17],[27,18],[33,12]])px(c,x,y,1,1,'#3a302a');c.restore();}
  }
  // Hair clusters leave a clear brow line and never paint over the eyes. A wig knocked askew sits a pixel off, one curl out.
  const askew=p.marks.includes('wigAskew');if(askew){c.save();c.translate(1,0);}
  polygon(c,side?[[27,14],[25,10],[26,6],[29,3],[35,3],[39,6],[39,11],[36,9],[34,8],[30,9],[29,14]]:[[24,14],[23,10],[25,6],[28,3],[35,3],[39,6],[40,10],[38,13],[37,10],[34,8],[31,9],[28,8],[26,10],[26,14]],INK);
  polygon(c,side?[[27,12],[26,9],[28,6],[30,4],[35,4],[38,7],[38,10],[34,7],[30,8],[28,12]]:[[25,12],[24,9],[26,6],[29,4],[35,4],[38,7],[38,10],[35,7],[31,8],[28,7],[26,9]],hair);px(c,29,5,5,1,hairLight);px(c,27,7,2,1,hairLight);px(c,36,7,1,2,shade(hair,-22));
  if(back){
    polygon(c,[[25,8],[38,8],[39,14],[36,21],[29,22],[25,18],[23,13]],hair);polygon(c,[[27,9],[31,8],[31,17],[28,18],[26,15]],hairLight);pixelLine(c,35,10,34,20,shade(hair,-26),2);if(p.female||p.mature){px(c,30,19,5,3,shade(hair,-18));px(c,30,21,5,1,'#59433a');}
  }else if(p.beard){
    if(side){polygon(c,[[30,19],[33,21],[37,20],[37,22],[34,24],[31,22]],hair);px(c,34,20,3,1,shade(hair,10));px(c,33,23,2,1,hairLight);}else{polygon(c,[[26,19],[29,20],[30,21],[34,21],[36,19],[36,22],[34,24],[29,24],[27,22]],hair);px(c,30,19,4,1,shade(hair,-12));px(c,29,22,2,1,hairLight);px(c,32,23,2,1,shade(hair,12));}
  }
  if(askew){c.restore();px(c,side?25:23,15,2,2,INK);px(c,side?25:23,15,1,1,hair);}
  if(!back&&p.beard&&p.marks.includes('seaweed')){px(c,side?33:29,22,1,2,'#4f7a3a');px(c,side?35:33,21,1,3,'#4f7a3a');}
  // A bandage round the brow of the badly wounded, knotted at the back with two tails, a spot of blood on it.
  if(p.bandageHead){
    if(side){polygon(c,[[26,8],[39,8],[40,11],[26,11]],INK);px(c,27,9,12,2,LINEN);px(c,27,10,12,1,LINEN_SHADE);px(c,24,8,3,3,LINEN);pixelLine(c,24,11,22,14,LINEN);pixelLine(c,25,11,24,15,LINEN_SHADE);px(c,35,9,2,1,BLOOD);}
    else{polygon(c,[[23,8],[40,8],[40,11],[23,11]],INK);px(c,24,9,16,2,LINEN);px(c,24,10,16,1,LINEN_SHADE);px(c,33,9,2,1,BLOOD);}
  }else{
  // Hats; a cap knocked askew sits a pixel right and up.
  const askewCap=p.cap&&p.marks.includes('capAskew');if(askewCap){c.save();c.translate(1,-1);}
  if(p.cap){
    polygon(c,[[23,10],[24,6],[28,2],[35,2],[39,6],[40,10]],'#49413b');polygon(c,[[25,8],[26,5],[29,3],[35,3],[38,7],[38,9]],'#ab9368');px(c,27,5,7,1,'#d1b982');px(c,24,10,16,2,'#6e5d46');px(c,25,10,14,1,'#dcc495');
  }else if(p.hat==='tricorn'){
    polygon(c,[[19,8],[24,7],[25,4],[31,2],[36,3],[39,7],[44,8],[41,11],[22,11]],'#252734');polygon(c,[[21,8],[25,8],[26,5],[31,3],[36,5],[38,9],[42,9],[40,10],[23,10]],'#4a4853');pixelLine(c,22,9,31,6,'#c1ae7b');pixelLine(c,31,6,40,9,'#e0c896');px(c,37,7,2,2,p.outfit==='officer'?'#d57464':'#cdb589');px(c,38,7,1,1,'#ffe3aa');
  }else if(p.hat==='felt'){
    polygon(c,[[21,9],[25,8],[26,3],[35,3],[39,8],[44,9],[41,11],[23,11]],'#4b3d32');polygon(c,[[27,4],[35,4],[37,8],[26,8]],'#bc9860');px(c,28,4,5,1,'#e0bd7b');px(c,26,8,12,1,'#796046');px(c,22,10,20,1,'#d2b57f');
  }else if(p.hat==='skufia'){
    polygon(c,[[24,10],[25,5],[28,2],[36,2],[39,5],[40,10]],'#101117');polygon(c,[[25,9],[26,5],[29,3],[35,3],[38,6],[39,9]],'#22232b');px(c,29,3,5,1,'#4a4a5c');px(c,26,6,2,2,'#3a3a48');px(c,25,9,14,1,'#3a3a48');
  }else if(p.hat==='bonnet'){
    polygon(c,[[23,14],[22,8],[25,4],[29,2],[35,3],[39,6],[41,11],[38,14],[37,9],[34,6],[28,6],[26,10],[26,14]],'#978c7d');polygon(c,[[24,12],[24,8],[26,5],[29,3],[34,4],[37,6],[39,11],[38,12],[36,8],[33,6],[29,6],[26,8],[25,12]],'#eee3c8');px(c,27,4,6,1,'#fff1d4');px(c,24,9,1,4,'#c2bba2');px(c,side?29:26,20,2,4,'#dfcfab');px(c,side?31:28,23,3,1,'#fff0ca');
  }
  if(askewCap)c.restore();
  }
  // The keeper's spectacles on the line of the eyes, and a quill behind the ear.
  if(p.spectacles&&!back){
    if(side){px(c,34,13,5,4,INK);px(c,35,14,3,2,'#cfe3e8');if(!blink)px(c,37,15,1,1,p.eyes);pixelLine(c,33,14,29,13,INK);}
    else{for(const x of[26,33]){px(c,x,13,5,4,INK);px(c,x+1,14,3,2,'#cfe3e8');if(!blink)px(c,x+2,15,1,1,p.eyes);}px(c,31,14,2,1,INK);}
  }
  if(p.quill&&!back){if(side){pixelLine(c,30,13,25,4,'#fff1c7');px(c,24,3,1,1,'#fff1c7');px(c,26,6,1,1,'#d9c8a0');}else{pixelLine(c,38,13,42,5,'#fff1c7');px(c,41,7,1,1,'#d9c8a0');}}
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
  // The keeper's work: the quill on the page, the ladle in the cauldron, a book held open in both hands.
  else if(pose==='write'){const q=[Math.round(w[0])+5,Math.round(w[1])-6];pixelLine(c,w[0],w[1]+2,...q,'#fff1c7');px(c,q[0]-1,q[1]+1,2,1,'#d9c8a0');px(c,Math.round(w[0]),Math.round(w[1])+2,1,1,INK);hand(c,w,p.skin,true);}
  else if(pose==='stir'){const q=[Math.round(w[0])+4,Math.round(w[1])+13];pixelLine(c,w[0]-1,w[1],q[0]-1,q[1],INK,3);pixelLine(c,w[0],w[1],...q,'#7a5a3a');px(c,q[0]-2,q[1],5,2,'#5a4030');hand(c,w,p.skin,true);}
  else if(pose==='read'){polygon(c,[[29,36],[37,37],[44,36],[44,43],[37,44],[29,43]],INK);polygon(c,[[30,37],[37,38],[43,37],[43,42],[37,43],[30,42]],'#ecdfbf');px(c,36,38,1,5,'#a88d5f');pixelLine(c,31,39,35,39,'#a88d5f');pixelLine(c,38,39,42,39,'#a88d5f');pixelLine(c,31,41,34,41,'#a88d5f');hand(c,rig.far.wrist,p.skin);hand(c,rig.near.wrist,p.skin);}
  // A hunter's own things in the near hand: Тимофей's hammer (at the belt while the arm is in a sling), Илларион's
  // censer on its chain, and after a first win over a variant, its trophy.
  if(p.gear==='hammer'&&!p.sling&&!['hammer','write','stir','read','inspect'].includes(pose)){const x=Math.round(w[0]),y=Math.round(w[1]);pixelLine(c,x,y,x+3,y+9,INK,3);pixelLine(c,x+1,y,x+4,y+9,'#c4925f');polygon(c,[[x+1,y+8],[x+7,y+7],[x+8,y+10],[x+2,y+12]],INK);px(c,x+2,y+9,5,2,'#90adbc');px(c,x+2,y+9,4,1,'#e0eacb');hand(c,w,p.skin,true);}
  if(p.gear==='staff'&&!p.staffCrutch){const x=Math.round(w[0]),y=Math.round(w[1]),sw=[0,1,0,-1][frame%4];pixelLine(c,x,y+1,x+sw,y+4,'#8a7a5a');px(c,x-2+sw,y+4,5,5,INK);px(c,x-1+sw,y+5,3,3,'#c9a35e');px(c,x-1+sw,y+5,2,1,'#f2d69a');}
  if(p.trophy){const t=p.trophy,x=Math.round(w[0])+1,y=Math.round(w[1])-6;px(c,x-1,y-1,6,7,INK);px(c,x,y,4,5,t[0]);px(c,x,y,4,1,shade(t[0],30));if(t[1])px(c,x+1,y+2,2,2,t[1]);hand(c,w,p.skin,true);}
  if(p.carry){const far=rig.far.wrist,x=Math.round(far[0])-3,y=Math.round(far[1])+2;pixelLine(c,x+1,y-3,x+5,y-3,'#d2ae79');px(c,x,y,8,9,'#46352e');px(c,x+1,y+1,6,7,'#b78350');px(c,x+2,y+1,4,1,'#eac181');px(c,x+5,y+3,1,4,'#855b3b');}
}
// The staff stands on the floor in the far hand; on a day of rag 3 it is the crutch, or a plain crutch goes under the far
// arm (art.md 4.8). Drawn before the legs and outside the bob, so their feet stay on the floor.
function gearGround(c,p,rig){
  const {side,bob}=rig,f=rig.far.wrist;
  if(p.staffCrutch){pixelLine(c,side?25:20,14+bob,side?22:17,74,INK,3);pixelLine(c,side?26:21,14+bob,side?23:18,76,'#7a5a3a');px(c,side?24:19,12+bob,3,3,'#5a4030');return;}
  if(p.crutch){const top=[side?26:21,30+bob],foot=[side?22:17,76];pixelLine(c,top[0]-1,top[1],foot[0]-1,foot[1]-2,INK,3);pixelLine(c,...top,...foot,'#7b5b3c');px(c,top[0]-3,top[1]-1,7,3,INK);px(c,top[0]-2,top[1],5,1,'#9a7a54');px(c,foot[0]-1,75,3,2,'#3e2b20');}
  // In profile the far hand is behind the body, so the staff stands just behind it and shows above the head and below.
  if(p.gear==='staff'&&!p.staffCrutch){const x=side?21+Math.round(f[0]-26):Math.round(f[0]);pixelLine(c,x-1,2,x-1,74,INK,3);pixelLine(c,x,2,x,76,'#7a5a3a');px(c,x-1,0,3,3,'#5a4030');px(c,x,0,1,1,'#9a7a54');}
}
// Long weapons slung across the back (art.md 4.8): drawn before the hair and the body, so only their ends show.
function gearBehind(c,p,rig){
  const g=p.gear,has=x=>p.marks.includes(x);
  if(g==='fusil'||g==='rifle'){const [a,b]=g==='fusil'?[[20,9],[42,57]]:[[21,12],[40,51]],m=midway(a,b,.55),barrel=g==='fusil'?'#8a96a0':'#5d6670';
    pixelLine(c,...a,...m,INK,2);pixelLine(c,m[0]-1,m[1]-1,...b,INK,4);pixelLine(c,...m,...b,'#4a3526',2);pixelLine(c,a[0]+1,a[1],m[0]+1,m[1],barrel);pixelLine(c,...a,...m,g==='rifle'?'#9aa3ab':shade(barrel,-30));
    if(g==='fusil'){pixelLine(c,a[0],a[1],a[0]-1,a[1]-4,'#c9d2d6');px(c,a[0]-1,a[1]-5,1,1,'#eef2f2');}
    if(has('muddyBarrel'))px(c,a[0],a[1],3,3,MUD);
    if(has('hatOnBarrel')){polygon(c,[[a[0]-5,a[1]-1],[a[0]-2,a[1]-4],[a[0]+3,a[1]-4],[a[0]+5,a[1]-1],[a[0],a[1]+1]],'#252734');pixelLine(c,a[0]-4,a[1]-1,a[0]+4,a[1]-1,'#c1ae7b');}
  }else if(g==='crossbow'){pixelLine(c,25,16,23,43,INK,3);pixelLine(c,26,16,24,43,'#6b4a33');
    for(const [a,b] of[[[18,23],[21,19]],[[21,19],[26,17]],[[26,17],[31,19]],[[31,19],[34,23]]]){pixelLine(c,...a,...b,INK,3);pixelLine(c,a[0]+1,a[1]+1,b[0]+1,b[1]+1,'#8a6a48');}pixelLine(c,19,24,34,24,'#d9c8a0');}
  else if(g==='harpoon'){pixelLine(c,22,7,42,62,INK,3);pixelLine(c,23,7,43,62,'#7a5a3a');polygon(c,[[21,0],[25,6],[22,8],[19,5]],INK);px(c,21,2,2,4,'#9aa3a8');px(c,19,5,2,1,'#9aa3a8');px(c,24,5,2,1,'#9aa3a8');}
  else if(g==='bow'){const pts=[[25,11],[22,17],[21,28],[22,39],[25,46]];for(let i=0;i<4;i++){pixelLine(c,...pts[i],...pts[i+1],INK,3);pixelLine(c,pts[i][0]+1,pts[i][1],pts[i+1][0]+1,pts[i+1][1],'#6b4a33');}
    if(has('bowBroken'))pixelLine(c,26,12,28,20,'#e8dcc0');else pixelLine(c,26,12,26,46,'#e8dcc0');
    polygon(c,[[27,17],[31,15],[34,33],[30,35]],INK);polygon(c,[[28,18],[31,16],[33,32],[30,34]],'#6b4a33');for(const x of[28,30,32])px(c,x,12+(x%3),2,4,'#e8dcc0');}
  else if(g==='rapier'){pixelLine(c,25,42,14,57,INK,2);pixelLine(c,25,41,14,56,'#c9d2d6');px(c,23,39,4,3,INK);px(c,24,40,2,1,'#c9a050');}
}
// What hangs over the front of the clothes: Ерофей's coil of rope on the shoulder, Зоряна's knife, Арман's pistol, a
// hammer at the belt when the arm is in a sling.
function gearFront(c,p,rig){
  const g=p.gear,{side}=rig;if(rig.back)return;
  if(g==='harpoon'){const x=side?36:39,y=26;px(c,x-4,y-2,9,6,INK);px(c,x-3,y-1,7,4,'#b8a07a');px(c,x-1,y,3,2,INK);px(c,x-3,y-1,7,1,'#d9c8a0');}
  if(g==='bow')px(c,side?37:33,40,4,1,'#c9d2d6');
  if(g==='rapier'){px(c,side?37:33,39,4,3,INK);px(c,side?38:34,40,2,1,'#5a4636');}
  if(g==='hammer'&&p.sling){const x=side?31:27;pixelLine(c,x,40,x,50,INK,2);px(c,x,40,1,10,'#c4925f');px(c,x-3,49,7,4,INK);px(c,x-2,50,5,2,'#90adbc');}
}
// The wounds on the near arm: the elbow of the sleeve torn (rag 1), then a bandage on the forearm and the arm in a sling
// (rag 2): the cloth under the forearm and a strap round the neck.
function bandages(c,p,rig){
  if(!p.rag||rig.back)return;const {elbow:e,wrist:w}=rig.near;
  if(p.rag<2){const x=Math.round(e[0]),y=Math.round(e[1]);px(c,x-1,y-1,3,1,INK);px(c,x-1,y,2,1,p.skin);px(c,x+1,y,1,1,INK);return;}
  const m=midway(e,w,.5),neck=[rig.side?33:30,23],wx=Math.round(w[0]),wy=Math.round(w[1]);
  pixelLine(c,wx-1,wy-2,neck[0],neck[1],LINEN_SHADE);pixelLine(c,wx,wy-2,neck[0]+1,neck[1],LINEN);
  polygon(c,[[e[0]-1,e[1]-1],[w[0]+2,w[1]-1],[w[0]+1,w[1]+4],[m[0],m[1]+5]],INK);polygon(c,[[e[0],e[1]],[w[0]+1,w[1]],[w[0],w[1]+3],[m[0],m[1]+4]],LINEN);
  pixelLine(c,e[0]+1,e[1]+1,m[0],m[1]+3,LINEN_SHADE);px(c,Math.round(m[0]),Math.round(m[1])+1,1,1,BLOOD);hand(c,w,p.skin);
}
function sprite(p,facing,pose,frame,blink,breath,temper){
  const image=canvas(SIZE,SIZE),c=image.getContext('2d'),rig=characterRig(facing,pose,frame,temper,breath,{sling:p.sling,crutch:p.crutch,limp:p.crutch});c.save();c.translate(8,2);
  gearGround(c,p,rig);legs(c,p,rig,pose,frame);c.save();c.translate(0,rig.bob);
  gearBehind(c,p,rig);hairBehind(c,p,rig,pose,frame);arm(c,p,rig.far,true,pose);clothes(c,p,rig,pose,frame);head(c,p,rig,blink);gearFront(c,p,rig);arm(c,p,rig.near,false,pose);bandages(c,p,rig);equipment(c,p,rig,pose,frame,temper);
  if(rig.back)px(c,rig.near.shoulder[0]-1,rig.near.shoulder[1]-2,3,2,shade(p.color,14));
  c.restore();c.restore();
  if(facing==='left'){const mirrored=canvas(SIZE,SIZE),ctx=mirrored.getContext('2d');ctx.translate(SIZE,0);ctx.scale(-1,1);ctx.drawImage(image,0,0);return mirrored;}
  return image;
}
// Everything that changes the picture is in the key: the look, the weapon, the rag and the marks, the keeper's
// spectacles and quill, a trophy in the hand. A frame is drawn once; a beaten hunter costs nothing more per frame.
function frameImage(p,facing,pose,frame,blink=false,breath=0,temper='water'){
  const key=[p.id,p.outfit,p.color,p.hair,p.skin,p.eyes,p.female,p.hat,p.cap,p.beard,p.mature,p.carry,p.gear,p.rag,p.marks.join(','),p.spectacles,p.quill,p.trophy,facing,pose,frame,blink,breath,temper].join('|');
  let image=frames.get(key);if(!image){image=sprite(p,facing,pose,frame,blink,breath,temper);frames.set(key,image);if(frames.size>CACHE_LIMIT)frames.delete(frames.keys().next().value);}return image;
}
const CYCLE={heat:85,polish:85,cut:85,chat:85,wave:85,browse:85,inspect:200,write:120,stir:110};
// a.pose is what the person does; a badly wounded one slumps instead of standing idle and limps on a crutch.
export function paintCharacter(c,a,person={},time=0,scale=2){
  const p=dress(person),pose=a.pose==='idle'&&p.crutch?'slump':a.pose||'idle',seed=[...(p.id||'smith')].reduce((n,v)=>n+v.charCodeAt(0),0),elapsed=Math.max(0,time*1000-(a.poseStarted||0));
  const frame=pose==='walk'?Math.floor((a.phase||0)*2)%8:pose==='hammer'?Math.min(6,Math.floor(elapsed/60)):pose==='quench'?Math.min(5,Math.floor(elapsed/100)):pose==='bow'?Math.min(4,Math.floor(elapsed/110)):CYCLE[pose]?Math.floor(elapsed/CYCLE[pose])%6:0;
  const still=['idle','slump','sit','read'].includes(pose),blink=still&&(time+seed*.13)%5<.13,breath=pose==='idle'&&Math.sin(time*2+seed)>.7?-1:0,size=scale*.8;
  const image=frameImage(p,a.facing||'right',pose,frame,blink,breath,pose==='quench'?a.temper||'water':'water');
  if(a.shadow!==false){c.save();c.globalAlpha=.22;oval(c,a.x,a.y+1,17,3,C.deep);c.restore();}c.imageSmoothingEnabled=false;
  c.drawImage(image,Math.round(a.x-CENTER*size),Math.round(a.y-BASELINE*size),SIZE*size,SIZE*size);
}
// The portrait takes the same frame as the scene, so a beaten hunter looks beaten in the line of guests, in the artel and
// in the report.
export function paintPortrait(c,person,size=64){
  const p=dress(person),image=frameImage(p,'down','idle',0);c.imageSmoothingEnabled=false;
  px(c,0,0,size,size,'#2a211c');px(c,2,2,size-4,size-4,'#b08a4f');px(c,4,4,size-8,size-8,'#2f4448');px(c,4,size-22,size-8,18,'#283a3e');c.drawImage(image,27,3,27,31,5,4,size-10,size-8);
}
// For tests and tools: the sprite of a person in a pose, through the same cache as the scene.
export const spriteOf=(person,facing='right',pose='idle',frame=0)=>frameImage(dress(person),facing,pose,frame);
