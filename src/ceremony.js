// The ceremony of a finished piece: the velvet cloth is drawn off, a flash, the stones ring one by one from left to right,
// the runes wake and the brass mark is struck. The plan is a pure function (tested in node); Reveal paints it on a canvas
// and tells the interface when a beat starts, so sound, vibration and the DOM parts (cloth, mark, bars) follow it.
import {drawJewel,drawVelvet} from './jewel-art.js';
import {CHIME} from './audio.js';
// The stones ring by their place from left to right (then top to bottom), whatever order they were set in.
export const ringOrder=design=>design.gems.map((g,index)=>({index,x:g.x,y:g.y})).sort((a,b)=>a.x-b.x||a.y-b.y).slice(0,CHIME.length);
// Beats in milliseconds. The full ceremony takes at most 3.2 s; from the tenth piece on (short) there is no cloth and no
// flash and it takes at most 1.2 s; with less motion it is a single final beat.
export function revealPlan(design,e,{short=false,reduced=false}={}){
 if(reduced)return [{t:0,kind:'final'}];
 const plan=[],step=short?60:110,start=short?0:1300,stones=ringOrder(design);
 if(!short)plan.push({t:0,until:600,kind:'cloth'},{t:650,until:1250,kind:'flash'});
 stones.forEach((g,i)=>plan.push({t:start+i*step,until:start+i*step+320,kind:'gem',index:g.index,step:i,x:g.x,y:g.y}));
 let t=start+stones.length*step;
 // The aura needs 500 ms to rise (300 in the short ceremony); the mark is struck while it settles.
 if(e.magic){plan.push({t,until:t+(short?300:500),kind:'magic'});t+=short?300:400;}
 plan.push({t,until:t+180,kind:'stamp'},{t:t+180,kind:'final'});return plan;}
export const planLength=plan=>Math.max(0,...plan.map(b=>b.until??b.t));
const ease=k=>1-(1-k)**3;
export class Reveal{
 // onBeat(beat,late) is called once for every beat as its time comes, late by how many ms it was noticed (a page that
 // was in the background); a skipped ceremony calls it only for the final one.
 // still: with less motion the piece rests (no twinkle, no drifting aura) once it is shown.
 constructor(canvas,design,e,plan,{onBeat=()=>{},still=false}={}){this.canvas=canvas;this.design=design;this.e=e;this.plan=plan;this.onBeat=onBeat;this.still=still;this.start=null;this.next=0;this.done=false;this.end=planLength(plan);}
 // The piece is drawn finished at once and the remaining beats are dropped.
 skip(){if(this.done)return;this.next=this.plan.length;this.done=true;this.skipped=true;this.onBeat({kind:'final',t:this.end,skipped:true});}
 elapsed(now){if(this.start===null)this.start=now;return now-this.start;}
 paint(now){const c=this.canvas;if(!c?.isConnected)return false;const t=this.elapsed(now);
  while(this.next<this.plan.length&&this.plan[this.next].t<=t){const beat=this.plan[this.next++];if(beat.kind==='final')this.done=true;this.onBeat(beat,t-beat.t);}
  const r=c.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),w=Math.round(r.width*ratio);if(w<2)return true;
  // A piece at rest with less motion is drawn once, and again only when the stage changes size.
  if(this.done&&this.still&&this.rested===w)return true;this.rested=this.done?w:0;if(c.width!==w||c.height!==w){c.width=c.height=w;}
  const g=c.getContext('2d'),size=r.width,magic=this.plan.find(b=>b.kind==='magic'),glow=!magic||this.done?1:ease(Math.min(1,Math.max(0,(t-magic.t)/(magic.until-magic.t))));
  g.setTransform(ratio,0,0,ratio,0,0);drawVelvet(g,size,size);drawJewel(g,this.design,{size,time:this.still?0:now/1000,background:false,assessment:this.e,glow});
  if(!this.done)for(const beat of this.plan){if(t<beat.t||t>beat.until)continue;const k=(t-beat.t)/(beat.until-beat.t);
   // The flash washes the tray white and fades; each stone flares as its note sounds.
   if(beat.kind==='flash'){g.save();g.globalCompositeOperation='lighter';const light=g.createRadialGradient(size/2,size*.45,0,size/2,size*.45,size*.7);light.addColorStop(0,`rgba(255,246,220,${.6*(1-k)})`);light.addColorStop(1,'rgba(255,246,220,0)');g.fillStyle=light;g.fillRect(0,0,size,size);g.restore();}
   if(beat.kind==='gem'){const x=beat.x/100*size,y=beat.y/100*size,n=Math.sin(k*Math.PI)*size*.09;g.save();g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,250,235,${.9*(1-k)})`;g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?n*.2:n;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();g.restore();}}
  return true;}
}
