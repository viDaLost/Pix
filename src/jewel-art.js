import {METALS,GEMS,evaluate,onMetal} from './jewelry.js';
const TAU=Math.PI*2;
const path=(c,points,scale)=>{if(!points.length)return;c.moveTo(points[0].x*scale,points[0].y*scale);for(const p of points.slice(1))c.lineTo(p.x*scale,p.y*scale);c.closePath();};
function outline(c,d,s){c.beginPath();path(c,d.outline,s);for(const h of d.holes)path(c,h,s);}
const palette=(hex,n)=>{const v=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(k=>Math.max(0,Math.min(255,((v>>k)&255)+n)).toString(16).padStart(2,'0')).join('');};
const alpha=(hex,a)=>{const v=parseInt(hex.slice(1),16);return `rgba(${v>>16&255},${v>>8&255},${v&255},${a})`;};
const AURA={ember:'#ff9f6e',ward:'#b9a2ff',growth:'#86e6ad',tide:'#86bfff',focus:'#eaf8ff',light:'#f6e8ff'};
let pile=null;
// Velvet pile: a fixed, seeded speckle so every tray looks like the same cloth.
function velvetPattern(c){if(!pile){pile=document.createElement('canvas');pile.width=pile.height=64;const g=pile.getContext('2d');let n=7;for(let i=0;i<520;i++){n=(Math.imul(n,1664525)+1013904223)>>>0;const x=n%64;n=(Math.imul(n,1664525)+1013904223)>>>0;const y=n%64;g.fillStyle=i%3?'rgba(255,236,200,.035)':'rgba(0,0,0,.18)';g.fillRect(x,y,1,i%5?1:2);}}return c.createPattern(pile,'repeat');}
// The velvet chosen for the showcase. Pictures drawn on velvet keep its id in their cache key, so a new choice redraws them.
let tone={id:'teal',hi:'#2b3a3f',mid:'#1a2529',lo:'#0c1215'};
export function setVelvet(next){if(next?.id&&next.id!==tone.id)tone={id:next.id,hi:next.hi,mid:next.mid,lo:next.lo};return tone;}
export const velvetTone=()=>tone;
export function drawVelvet(c,w,h,{light=1,tone:t=tone}={}){
  const g=c.createRadialGradient(w*.5,h*.42,0,w*.5,h*.5,Math.max(w,h)*.72);g.addColorStop(0,t.hi);g.addColorStop(.55,t.mid);g.addColorStop(1,t.lo);c.fillStyle=g;c.fillRect(0,0,w,h);
  const p=velvetPattern(c);if(p){c.fillStyle=p;c.fillRect(0,0,w,h);}
  if(light){const spot=c.createRadialGradient(w*.5,h*.3,0,w*.5,h*.38,Math.max(w,h)*.5);spot.addColorStop(0,`rgba(255,226,170,${.11*light})`);spot.addColorStop(1,'rgba(255,226,170,0)');c.fillStyle=spot;c.fillRect(0,0,w,h);}
}
function metalFill(c,metal,s,x0=15,y0=8,x1=85,y1=94){const g=c.createLinearGradient(x0*s,y0*s,x1*s,y1*s);g.addColorStop(0,metal.light);g.addColorStop(.16,palette(metal.color,14));g.addColorStop(.42,palette(metal.color,-30));g.addColorStop(.58,metal.color);g.addColorStop(.74,metal.light);g.addColorStop(.88,palette(metal.color,-12));g.addColorStop(1,palette(metal.color,-48));return g;}
function gemPath(c,r,ry,cut){c.beginPath();if(cut==='pear'){const cy=ry-r,ang=Math.acos(r/(ry+cy));c.moveTo(0,-ry);c.lineTo(Math.cos(-Math.PI/2+ang)*r,cy+Math.sin(-Math.PI/2+ang)*r);c.arc(0,cy,r,-Math.PI/2+ang,Math.PI*1.5-ang);c.closePath();}else c.ellipse(0,0,r,ry,0,0,TAU);}
function twinkle(c,x,y,size,color='#ffffff'){c.save();c.fillStyle=color;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?size*.18:size;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();c.fill();c.restore();}
// A faceted stone in a collet with claws: girdle, table, star facets and a moving glint.
export function drawGem(c,g,s,metal,{time=0,index=0,selected=false}={}){
  const gem=GEMS[g.kind],r=g.size*s,ry=r*(g.cut==='round'?1:g.cut==='pear'?1.35:1.4);
  c.save();c.translate(g.x*s,g.y*s);
  c.fillStyle='rgba(6,10,12,.5)';c.beginPath();c.ellipse(0,.7*s,r+1.6*s,ry+1.6*s,0,0,TAU);c.fill();
  const collar=c.createLinearGradient(-r,-ry,r,ry);collar.addColorStop(0,metal.light);collar.addColorStop(.5,metal.color);collar.addColorStop(1,palette(metal.color,-55));c.fillStyle=collar;c.beginPath();c.ellipse(0,0,r+.95*s,ry+.95*s,0,0,TAU);c.fill();
  c.strokeStyle=alpha(palette(metal.color,-80),.7);c.lineWidth=.35*s;c.stroke();
  gemPath(c,r,ry,g.cut);const body=c.createRadialGradient(-r*.3,-ry*.35,r*.05,0,0,Math.max(r,ry)*1.05);body.addColorStop(0,gem.light);body.addColorStop(.42,gem.color);body.addColorStop(1,palette(gem.color,-70));c.fillStyle=body;c.fill();
  c.save();gemPath(c,r,ry,g.cut);c.clip();
  const n=8,table=Array.from({length:n},(_,i)=>({x:Math.cos(i*TAU/n+Math.PI/8)*r*.5,y:Math.sin(i*TAU/n+Math.PI/8)*ry*.5})),girdle=Array.from({length:n*2},(_,i)=>({x:Math.cos(i*TAU/(n*2))*r*1.15,y:Math.sin(i*TAU/(n*2))*ry*1.15}));
  for(let i=0;i<n*2;i++){const a=girdle[i],b=girdle[(i+1)%(n*2)],t=table[Math.floor(i/2)%n];c.fillStyle=(i+index)%3===0?'rgba(255,255,255,.2)':(i%3===1?'rgba(0,0,0,.2)':'rgba(255,255,255,.05)');c.beginPath();c.moveTo(t.x,t.y);c.lineTo(a.x,a.y);c.lineTo(b.x,b.y);c.closePath();c.fill();}
  c.beginPath();table.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();const top=c.createLinearGradient(-r*.5,-ry*.5,r*.5,ry*.5);top.addColorStop(0,'rgba(255,255,255,.42)');top.addColorStop(.6,alpha(gem.light,.12));top.addColorStop(1,'rgba(255,255,255,.02)');c.fillStyle=top;c.fill();
  c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=Math.max(.5,.18*s);c.stroke();for(let i=0;i<n;i++){c.beginPath();c.moveTo(table[i].x,table[i].y);c.lineTo(girdle[i*2].x,girdle[i*2].y);c.stroke();}
  c.restore();
  c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.ellipse(-r*.38,-ry*.42,r*.2,ry*.11,-.6,0,TAU);c.fill();
  c.fillStyle=metal.light;c.strokeStyle=palette(metal.color,-70);c.lineWidth=.25*s;const claws=g.size>3.5?6:4;
  for(let i=0;i<claws;i++){const a=i*TAU/claws+(claws===4?Math.PI/4:0);c.beginPath();c.arc(Math.cos(a)*(r+.2*s),Math.sin(a)*(ry+.2*s),Math.max(.6*s,r*.17),0,TAU);c.fill();c.stroke();}
  const phase=((time*.8+index*1.37)%3.2);if(time&&phase<.7)twinkle(c,r*.28,-ry*.3,r*1.1*Math.sin(phase/.7*Math.PI));
  if(selected){c.strokeStyle='#f3d79c';c.lineWidth=.6*s;c.setLineDash([1.6*s,1.4*s]);c.beginPath();c.ellipse(0,0,r+3*s,ry+3*s,0,0,TAU);c.stroke();c.setLineDash([]);}
  c.restore();
}
function blank(c,d,s){
  if(d.type==='sword'){c.save();c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=3*s;c.shadowOffsetY=1.5*s;c.fillStyle='#1b2229';c.beginPath();path(c,[{x:50,y:2},{x:58.5,y:15},{x:56.5,y:59},{x:43.5,y:59},{x:41.5,y:15}],s);c.fill();c.restore();
   const g=c.createLinearGradient(43*s,0,57*s,0);g.addColorStop(0,'#7f9aa5');g.addColorStop(.45,'#e9f3f2');g.addColorStop(.55,'#a9c2c9');g.addColorStop(1,'#5e7680');c.fillStyle=g;c.beginPath();path(c,[{x:50,y:4},{x:57,y:16},{x:55,y:59},{x:45,y:59},{x:43,y:16}],s);c.fill();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=.5*s;c.beginPath();c.moveTo(50*s,8*s);c.lineTo(50*s,58*s);c.stroke();}
  if(d.type==='staff'){const g=c.createLinearGradient(45*s,0,55*s,0);g.addColorStop(0,'#4b3022');g.addColorStop(.35,'#a8784a');g.addColorStop(.6,'#7c5434');g.addColorStop(1,'#3a251b');c.fillStyle=g;c.fillRect(45.5*s,42*s,9*s,57*s);c.strokeStyle='rgba(40,24,16,.6)';c.lineWidth=.4*s;for(let y=48;y<98;y+=7){c.beginPath();c.moveTo(46*s,y*s);c.quadraticCurveTo(50*s,(y+2)*s,54*s,y*s);c.stroke();}}
}
export function drawJewel(c,d,{size=256,time=0,handles=false,selected=-1,background=true,assessment=null}={}){
  const s=size/100,metal=METALS[d.metal],e=assessment||evaluate(d),cell=size/12;c.save();c.imageSmoothingEnabled=true;
  if(background)drawVelvet(c,size,size);
  blank(c,d,s);
  if(e.magic){const top=Object.entries(e.effects).sort((a,b)=>b[1]-a[1])[0]?.[0],color=AURA[top]||'#bff8ec',pulse=.18+.06*Math.sin(time*2),g=c.createRadialGradient(50*s,50*s,4*s,50*s,50*s,48*s);g.addColorStop(0,alpha(color,pulse));g.addColorStop(1,alpha(color,0));c.fillStyle=g;c.fillRect(0,0,size,size);}
  if(d.outline.length>=3){
    c.save();c.shadowColor='rgba(3,7,9,.6)';c.shadowBlur=3.5*s;c.shadowOffsetY=1.8*s;outline(c,d,s);c.fillStyle=palette(metal.color,-60);c.fill('evenodd');c.restore();
    outline(c,d,s);c.fillStyle=metalFill(c,metal,s);c.fill('evenodd');
    c.save();outline(c,d,s);c.clip('evenodd');
    const polished=new Set(d.polish);
    // Raw metal stays matte; every polished cell keeps a soft sheen of its own.
    for(let i=0;i<144;i++){const x=(i%12+.5)*cell,y=(Math.floor(i/12)+.5)*cell;if(!onMetal({x:x/s,y:y/s},d))continue;const g=c.createRadialGradient(x,y,0,x,y,cell*.95);
     if(polished.has(i)){g.addColorStop(0,'rgba(255,252,236,.16)');g.addColorStop(1,'rgba(255,252,236,0)');}else{g.addColorStop(0,'rgba(36,28,24,.24)');g.addColorStop(1,'rgba(36,28,24,0)');}c.fillStyle=g;c.fillRect(x-cell,y-cell,cell*2,cell*2);}
    if(e.polish>25){const k=e.polish/100,pos=((time*.09)%1.6-.3)*100,g=c.createLinearGradient((pos-20)*s,(pos-35)*s,(pos+20)*s,(pos+5)*s);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,`rgba(255,255,250,${.32*k})`);g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,size,size);}
    c.lineJoin='round';c.lineCap='round';
    // Engraving is cut into the metal: a dark groove with its lower lip catching the light.
    for(const stroke of d.strokes){
      const rune=stroke.kind==='rune',w=stroke.width*s;c.beginPath();for(const [i,p]of stroke.points.entries())i?c.lineTo(p.x*s,p.y*s):c.moveTo(p.x*s,p.y*s);
      c.lineWidth=w+.5*s;c.strokeStyle=alpha(palette(metal.color,-95),.75);c.stroke();
      c.lineWidth=w*.7;c.strokeStyle=rune?'#2b3d55':palette(metal.color,-62);c.stroke();
      c.save();c.translate(.32*s,.42*s);c.lineWidth=Math.max(.4*s,w*.38);c.strokeStyle=alpha(metal.light,.55);c.stroke();c.restore();
      if(rune){c.save();if(e.magic){c.shadowColor='#7ff1dc';c.shadowBlur=3.2*s;c.globalAlpha=.75+.25*Math.sin(time*2.2);}c.lineWidth=Math.max(.35*s,w*.42);c.strokeStyle=e.magic?'#d7fff4':'#7c95b0';c.stroke();c.restore();}
    }
    c.lineWidth=2.4*s;c.save();c.translate(.55*s,.75*s);outline(c,d,s);c.strokeStyle=alpha(palette(metal.color,-70),.55);c.stroke();c.restore();
    c.save();c.translate(-.45*s,-.55*s);outline(c,d,s);c.strokeStyle=alpha(metal.light,.65);c.stroke();c.restore();
    c.restore();
    outline(c,d,s);c.lineWidth=.55*s;c.strokeStyle=alpha(palette(metal.color,-100),.85);c.stroke();
  }
  if(d.type==='pendant'||d.type==='amulet'){const top=d.outline.length?Math.min(...d.outline.map(p=>p.y)):17,cx=d.outline.length?d.outline.reduce((n,p)=>p.y<n.y?p:n).x:50;c.lineWidth=2.1*s;c.strokeStyle=palette(metal.color,-70);c.beginPath();c.ellipse(cx*s,(top-2.2)*s,3*s,4.1*s,0,0,TAU);c.stroke();c.lineWidth=1.5*s;c.strokeStyle=metalFill(c,metal,s,cx-4,top-7,cx+4,top+2);c.stroke();c.lineWidth=.45*s;c.strokeStyle=alpha(metal.light,.9);c.beginPath();c.ellipse(cx*s,(top-2.2)*s,2.6*s,3.7*s,0,Math.PI*1.05,Math.PI*1.65);c.stroke();}
  for(const [index,g]of d.gems.entries())drawGem(c,g,s,metal,{time,index,selected:index===selected});
  if(handles)for(const p of d.outline){c.fillStyle='rgba(8,12,14,.85)';c.beginPath();c.arc(p.x*s,p.y*s,Math.min(7.5,Math.max(4,1.9*s)),0,TAU);c.fill();c.fillStyle='#f3d79c';c.beginPath();c.arc(p.x*s,p.y*s,Math.min(4.2,Math.max(2.2,1.05*s)),0,TAU);c.fill();}
  if(e.magic){for(let i=0;i<6;i++){const x=(50+Math.cos(time*.55+i*1.3)*40)*s,y=(50+Math.sin(time*.75+i*1.1)*41)*s,k=.5+.5*Math.sin(time*2+i);twinkle(c,x,y,(1.1+k)*s*.9,`rgba(226,255,244,${.45+.45*k})`);}}
  if(!d.outline.length){c.fillStyle='rgba(243,215,156,.8)';c.textAlign='center';c.font=`600 ${Math.max(11,size/24)}px Manrope, system-ui, sans-serif`;c.fillText('Нарисуй замкнутый контур',size/2,size/2);}
  c.restore();
}
const thumbnails=new Map(),pictures=new WeakMap();
function picture(d,size,background){const c=document.createElement('canvas');c.width=c.height=size;drawJewel(c.getContext('2d'),d,{size,background});return c.toDataURL();}
// Finished designs are frozen, so their pictures are keyed by the object itself instead of its JSON.
export function jewelURL(d,size=160,{background=true}={}){
  const look=size+':'+(background?tone.id:'bare');
  if(Object.isFrozen(d)){let urls=pictures.get(d);if(!urls)pictures.set(d,urls=new Map());if(!urls.has(look))urls.set(look,picture(d,size,background));return urls.get(look);}
  const key=look+':'+JSON.stringify(d);if(thumbnails.has(key))return thumbnails.get(key);const url=picture(d,size,background);thumbnails.set(key,url);if(thumbnails.size>200)thumbnails.delete(thumbnails.keys().next().value);return url;}
export function gemURL(kind,size=64,cut='round'){const key='gem:'+kind+':'+size+':'+cut;if(thumbnails.has(key))return thumbnails.get(key);const c=document.createElement('canvas');c.width=c.height=size;drawGem(c.getContext('2d'),{kind,x:50,y:50,size:cut==='round'?30:23,cut},size/100,METALS.silver);const url=c.toDataURL();thumbnails.set(key,url);return url;}
export function metalURL(id,size=64){const key='metal:'+id+':'+size;if(thumbnails.has(key))return thumbnails.get(key);const c=document.createElement('canvas'),g=c.getContext('2d'),s=size/100,m=METALS[id],bar=[{x:24,y:34},{x:76,y:34},{x:90,y:70},{x:10,y:70}];c.width=c.height=size;
  g.save();g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=4*s;g.shadowOffsetY=3*s;g.beginPath();path(g,bar,s);g.fillStyle=palette(m.color,-50);g.fill();g.restore();
  g.beginPath();path(g,bar,s);g.fillStyle=metalFill(g,m,s,20,30,80,72);g.fill();g.beginPath();path(g,[{x:28,y:38},{x:72,y:38},{x:76,y:48},{x:24,y:48}],s);g.fillStyle=alpha(m.light,.55);g.fill();g.strokeStyle=alpha(palette(m.color,-90),.8);g.lineWidth=1.5*s;g.beginPath();path(g,bar,s);g.stroke();
  const url=c.toDataURL();thumbnails.set(key,url);return url;}
export function addPolish(d,points,radius=6){const result=new Set(d.polish);for(let i=0;i<144;i++){const p={x:(i%12+.5)*100/12,y:(Math.floor(i/12)+.5)*100/12};if(onMetal(p,d)&&points.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<=radius))result.add(i);}d.polish=[...result];}
