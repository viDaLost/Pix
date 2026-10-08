import {METALS,GEMS,evaluate,onMetal} from './jewelry.js';
const path=(c,points,scale)=>{if(!points.length)return;c.moveTo(points[0].x*scale,points[0].y*scale);for(const p of points.slice(1))c.lineTo(p.x*scale,p.y*scale);c.closePath();};
function outline(c,d,s){c.beginPath();path(c,d.outline,s);for(const h of d.holes)path(c,h,s);}
const palette=(hex,n)=>{const v=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(k=>Math.max(0,Math.min(255,((v>>k)&255)+n)).toString(16).padStart(2,'0')).join('');};
export function drawJewel(c,d,{size=256,time=0,handles=false,selected=-1,background=true,assessment=null}={}){
  const s=size/100,metal=METALS[d.metal],e=assessment||evaluate(d);c.save();c.imageSmoothingEnabled=false;
  if(background){c.fillStyle='#203f4b';c.fillRect(0,0,size,size);for(let y=0;y<size;y+=8)for(let x=0;x<size;x+=8){c.fillStyle=((x+y)%24)?'#244550':'#294a55';c.fillRect(x,y,1,1);}c.strokeStyle='#507680';c.lineWidth=1;c.strokeRect(4,4,size-8,size-8);}
  if(d.type==='sword'){c.fillStyle='#24303c';c.beginPath();path(c,[{x:50,y:3},{x:58,y:15},{x:56,y:58},{x:44,y:58},{x:42,y:15}],s);c.fill();c.fillStyle='#9fbec7';c.beginPath();path(c,[{x:50,y:5},{x:56,y:16},{x:54,y:59},{x:46,y:59},{x:44,y:16}],s);c.fill();c.fillStyle='#e4f0dd';c.fillRect(49*s,13*s,2*s,46*s);}
  if(d.type==='staff'){c.fillStyle='#352d31';c.fillRect(45*s,42*s,10*s,56*s);c.fillStyle='#95653e';c.fillRect(47*s,43*s,6*s,55*s);c.fillStyle='#c19055';c.fillRect(47*s,44*s,2*s,53*s);}
  if(d.outline.length>=3){
    c.save();c.translate(1*s,2*s);outline(c,d,s);c.fillStyle='#102b34';c.fill('evenodd');c.restore();
    outline(c,d,s);const grad=c.createLinearGradient(15*s,12*s,85*s,90*s);grad.addColorStop(0,palette(metal.color,-10));grad.addColorStop(.22,metal.light);grad.addColorStop(.4,metal.color);grad.addColorStop(.62,palette(metal.color,-35));grad.addColorStop(.8,palette(metal.color,8));grad.addColorStop(1,metal.light);c.fillStyle=grad;c.fill('evenodd');
    c.strokeStyle='#253841';c.lineWidth=1.8*s;c.stroke();c.strokeStyle=metal.light;c.lineWidth=.6*s;c.stroke();
    c.save();outline(c,d,s);c.clip('evenodd');
    c.fillStyle='rgba(32,47,56,.2)';for(let y=0;y<12;y++)for(let x=0;x<12;x++)if(!d.polish.includes(y*12+x))c.fillRect(x*size/12,y*size/12,size/12+1,size/12+1);
    for(const stroke of d.strokes){
      const glow=stroke.kind==='rune';c.beginPath();for(const [i,p]of stroke.points.entries())i?c.lineTo(p.x*s,p.y*s):c.moveTo(p.x*s,p.y*s);c.lineJoin='round';c.lineCap='round';c.lineWidth=(stroke.width+.55)*s;c.strokeStyle=glow?'#476589':palette(metal.color,-58);c.stroke();c.lineWidth=stroke.width*s;c.strokeStyle=glow?(e.magic?'#a5f1e0':'#839eb5'):palette(metal.color,-24);c.stroke();
      if(glow&&e.magic){c.globalAlpha=.4+.2*Math.sin(time*2);c.lineWidth=Math.max(.3,stroke.width*.35)*s;c.strokeStyle='#f0ffec';c.stroke();c.globalAlpha=1;}
    }
    c.restore();
  }
  if(d.type==='pendant'||d.type==='amulet'){const top=d.outline.length?Math.min(...d.outline.map(p=>p.y)):17;c.strokeStyle=metal.color;c.lineWidth=2*s;c.beginPath();c.ellipse(50*s,(top-2)*s,3*s,4*s,0,0,Math.PI*2);c.stroke();c.strokeStyle=metal.light;c.lineWidth=.6*s;c.stroke();}
  for(const [index,g]of d.gems.entries()){
    const gem=GEMS[g.kind],x=g.x*s,y=g.y*s,r=g.size*s,ry=r*(g.cut==='round'?1:g.cut==='pear'?1.35:1.4);
    c.save();c.translate(x,y);c.fillStyle='#1d303b';c.beginPath();c.ellipse(0,s,r+1.4*s,ry+1.4*s,0,0,Math.PI*2);c.fill();
    c.fillStyle=metal.light;c.beginPath();c.ellipse(0,0,r+.8*s,ry+.8*s,0,0,Math.PI*2);c.fill();
    const facets=8,points=Array.from({length:facets},(_,i)=>({x:Math.cos(i*Math.PI/4)*r,y:Math.sin(i*Math.PI/4)*ry}));
    for(let i=0;i<facets;i++){const a=points[i],b=points[(i+1)%facets];c.fillStyle=i<3?gem.light:i<5?gem.color:palette(gem.color,-38);c.beginPath();c.moveTo(0,-ry*.12);c.lineTo(a.x,a.y);c.lineTo(b.x,b.y);c.closePath();c.fill();}
    c.fillStyle=palette(gem.color,16);c.beginPath();c.moveTo(-r*.4,-ry*.4);c.lineTo(r*.4,-ry*.4);c.lineTo(r*.4,ry*.3);c.lineTo(-r*.4,ry*.3);c.fill();c.fillStyle='#fff4dd';c.fillRect(-r*.4,-ry*.5,Math.max(1,r*.4),Math.max(1,ry*.2));
    if(g.cut==='pear'){c.fillStyle=gem.light;c.beginPath();c.moveTo(0,-ry*1.3);c.lineTo(-r*.55,-ry*.6);c.lineTo(r*.55,-ry*.6);c.fill();}
    c.strokeStyle=metal.light;c.lineWidth=.75*s;for(let i=0;i<4;i++){const a=i*Math.PI/2;c.beginPath();c.moveTo(Math.cos(a)*r*1.05,Math.sin(a)*ry*1.05);c.lineTo(Math.cos(a)*r*.72,Math.sin(a)*ry*.72);c.stroke();}
    if(index===selected){c.strokeStyle='#99f3db';c.lineWidth=s;c.setLineDash([2*s,2*s]);c.beginPath();c.ellipse(0,0,r+3*s,ry+3*s,0,0,Math.PI*2);c.stroke();}
    c.restore();
  }
  if(handles)for(const p of d.outline){c.fillStyle='#1d424e';c.fillRect(p.x*s-2*s,p.y*s-2*s,4*s,4*s);c.fillStyle='#a7ecdc';c.fillRect(p.x*s-s,p.y*s-s,2*s,2*s);}
  if(e.magic){c.fillStyle='#d8ffe9';for(let i=0;i<5;i++){const x=(50+Math.cos(time*.6+i*1.3)*38)*s,y=(50+Math.sin(time*.8+i*1.1)*39)*s;c.fillRect(x-1,y,3,1);c.fillRect(x,y-1,1,3);}}
  if(!d.outline.length){c.fillStyle='#b4d0cf';c.textAlign='center';c.font=`${Math.max(10,size/27)}px sans-serif`;c.fillText('Нарисуй замкнутый контур',size/2,size/2);}
  c.restore();
}
const thumbnails=new Map();
export function jewelURL(d,size=160){const key=size+':'+JSON.stringify(d);if(thumbnails.has(key))return thumbnails.get(key);const c=document.createElement('canvas');c.width=c.height=size;drawJewel(c.getContext('2d'),d,{size});const url=c.toDataURL();thumbnails.set(key,url);if(thumbnails.size>150)thumbnails.delete(thumbnails.keys().next().value);return url;}
export function addPolish(d,points,radius=6){const result=new Set(d.polish);for(let i=0;i<144;i++){const p={x:(i%12+.5)*100/12,y:(Math.floor(i/12)+.5)*100/12};if(onMetal(p,d)&&points.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<=radius))result.add(i);}d.polish=[...result];}
