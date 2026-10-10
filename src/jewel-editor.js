import {clone,distance,onMetal,inside,area,edit,evaluate} from './jewelry.js';
import {drawJewel,drawVelvet,addPolish} from './jewel-art.js';
import {patternStrokes,layoutGems} from './patterns.js';
const clamp=n=>Math.max(2,Math.min(98,n));
const clean=points=>points.filter((p,i)=>!i||distance(p,points[i-1])>.55).slice(0,300);
export class JewelEditor{
  constructor(canvas,state,{onChange,onCommit,onError}={}){
    this.canvas=canvas;this.state=state;this.changed=onChange||(()=>{});this.committed=onCommit||(()=>{});this.error=onError||(()=>{});this.tool='shape';this.width=1;this.symmetry=false;this.gem='garnet';this.cut='round';this.selected=-1;this.zoom=1;this.pan={x:0,y:0};this.pointers=new Map();this.working=null;this.operation=null;this.pinch=null;this.dirty=true;this.rev=0;this.metrics=evaluate(state.draft.design);
    this.abort=new AbortController();const options={signal:this.abort.signal};
    for(const type of['pointerdown','pointermove','pointerup','pointercancel'])canvas.addEventListener(type,e=>this[type](e),options);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.changeZoom(this.zoom*Math.exp(-e.deltaY*.002),this.local(e));},{...options,passive:false});
    this.resize=new ResizeObserver(()=>{this.dirty=true;});this.resize.observe(canvas);
  }
  get design(){return this.working||this.state.draft.design;}
  local(e){const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  geometry(){const r=this.canvas.getBoundingClientRect();return {w:r.width,h:r.height,base:Math.max(1,Math.min(r.width,r.height)-12)};}
  point(p){const {w,h,base}=this.geometry();return {x:Math.round(clamp(50+(p.x-w/2-this.pan.x)/(base*this.zoom)*100)*4)/4,y:Math.round(clamp(50+(p.y-h/2-this.pan.y)/(base*this.zoom)*100)*4)/4};}
  setTool(tool){this.finish();this.tool=tool;this.setWidth(this.width);this.selected=-1;this.dirty=true;}
  setWidth(width){this.width=Math.max(.5,Math.min(this.tool==='stone'&&!this.state.skills.includes('facets')?3:5.5,Number(width)||1));}
  syncSelection(){const g=this.state.draft.design.gems[this.selected];if(this.tool==='stone'&&g){this.gem=g.kind;this.cut=g.cut;this.setWidth(g.size-1.5);}}
  stoneSize(){return Math.max(1.5,Math.min(this.state.skills.includes('facets')?7:4.5,this.width+1.5));}
  // Ready-made patterns and stone layouts are a single undoable step, like a hand-drawn line.
  addPattern(id,variant=0){this.finish();const d=clone(this.state.draft.design);d.strokes.push(...patternStrokes(d,id,{variant,width:this.width}));if(edit(this.state,d))this.committed();this.refresh();}
  addLayout(id){this.finish();const d=clone(this.state.draft.design),cut=this.state.skills.includes('facets')?this.cut:'round',added=layoutGems(d,id,{kind:this.gem,size:this.stoneSize(),cut});d.gems.push(...added);if(edit(this.state,d))this.committed();this.refresh();return added.length;}
  changeStone(properties){if(this.tool!=='stone'||this.selected<0||!this.state.draft.design.gems[this.selected])return;this.finish();const d=clone(this.state.draft.design),g=d.gems[this.selected],mirror=this.symmetry?d.gems.findIndex((p,i)=>i!==this.selected&&p.kind===g.kind&&distance(p,{x:100-g.x,y:g.y})<2):-1;d.gems[this.selected]={...g,...properties};if(mirror>=0)d.gems[mirror]={...d.gems[mirror],...properties};if(edit(this.state,d))this.committed();this.refresh();}
  changeZoom(n,anchor){const {w,h}=this.geometry(),next=Math.max(.65,Math.min(4,n));anchor||={x:w/2,y:h/2};const ratio=next/this.zoom;this.pan={x:anchor.x-w/2-(anchor.x-w/2-this.pan.x)*ratio,y:anchor.y-h/2-(anchor.y-h/2-this.pan.y)*ratio};this.zoom=next;this.boundPan();this.dirty=true;this.changed(this.metrics);}
  boundPan(){const {base}=this.geometry(),max=base*this.zoom*.48;this.pan.x=Math.max(-max,Math.min(max,this.pan.x));this.pan.y=Math.max(-max,Math.min(max,this.pan.y));}
  resetZoom(){this.zoom=1;this.pan={x:0,y:0};this.dirty=true;this.changed(this.metrics);}
  pointerdown(e){
    if(e.button&&e.button!==0)return;e.preventDefault();this.canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,this.local(e));
    if(this.pointers.size===2){this.finish();const [a,b]=[...this.pointers.values()];this.pinch={distance:distance(a,b),zoom:this.zoom,mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},pan:{...this.pan}};return;}
    if(this.pinch)return;
    const screen=this.local(e),p=this.point(screen),d=clone(this.state.draft.design);this.working=d;this.startTime=performance.now();
    if(this.tool==='move'||this.tool==='pattern'){this.operation={kind:'pan',screen,pan:{...this.pan}};return;}
    if(this.tool==='shape'){
      let index=-1,best=7/this.zoom;d.outline.forEach((node,i)=>{const v=distance(node,p);if(v<best){best=v;index=i;}});
      this.operation=index>=0?{kind:'node',index,mirror:d.outline.findIndex(q=>distance(q,{x:100-d.outline[index].x,y:d.outline[index].y})<2)}:{kind:'shape',points:[p]};
    }else if(this.tool==='hole'){this.operation={kind:'hole',points:[p]};}
    else if(this.tool==='stone'){
      const index=d.gems.findIndex(g=>distance(g,p)<g.size+3/this.zoom);
      if(index>=0){this.selected=index;this.gem=d.gems[index].kind;this.cut=d.gems[index].cut;this.setWidth(d.gems[index].size-1.5);this.operation={kind:'gem',index};if(this.symmetry){const mirror=d.gems.findIndex((g,i)=>i!==index&&g.kind===d.gems[index].kind&&distance(g,{x:100-d.gems[index].x,y:d.gems[index].y})<2);if(mirror>=0)this.operation.mirror=mirror;}}
      else{if(d.gems.length>=16){this.working=null;this.error('На изделии уже 16 камней.');return;}const size=this.stoneSize(),g={kind:this.gem,x:p.x,y:p.y,size,cut:this.cut};d.gems.push(g);this.selected=d.gems.length-1;this.operation={kind:'gem',index:this.selected,added:true};if(this.symmetry&&Math.abs(p.x-50)>size*2&&d.gems.length<16){d.gems.push({...g,x:100-p.x});this.operation.mirror=d.gems.length-1;}}
    }else if(this.tool==='erase'){
      const index=d.gems.findIndex(g=>distance(g,p)<g.size+2);if(index>=0)d.gems.splice(index,1);else{const hole=d.holes.findIndex(h=>inside(p,h));if(hole>=0)d.holes.splice(hole,1);else{const index=d.strokes.findLastIndex(s=>s.points.some(q=>distance(p,q)<s.width+3));if(index>=0)d.strokes.splice(index,1);}}this.operation={kind:'erase'};
    }else if(this.tool==='polish'){this.operation={kind:'polish',points:[p]};addPolish(d,[p],this.width+5);}
    else{
      if(d.strokes.length>=156||d.strokes.reduce((n,s)=>n+s.points.length,0)>7500){this.working=null;this.error('Для новых линий убери часть гравировки или сохрани модель.');return;}
      this.operation={kind:'ink',segments:[],current:[],mirror:[],stroke:this.tool==='rune'?'rune':'engrave'};this.addInk(p);
    }
    this.refresh();
  }
  addInk(p){const op=this.operation,d=this.working;if(!onMetal(p,d)){op.current=[];op.mirror=[];return;}if(op.current.length&&distance(p,op.current.at(-1))<.55)return;if(!op.current.length){op.current=[p,{...p}];op.segments.push({points:op.current,width:this.width,kind:op.stroke});}else if(op.current.length<500)op.current.push(p);
    const m={x:100-p.x,y:p.y};if(this.symmetry&&Math.abs(p.x-50)>.75&&onMetal(m,d)){if(!op.mirror.length){op.mirror=[m,{...m}];op.segments.push({points:op.mirror,width:this.width,kind:op.stroke});}else if(op.mirror.length<500)op.mirror.push(m);}else op.mirror=[];
  }
  pointermove(e){if(!this.pointers.has(e.pointerId))return;e.preventDefault();const screen=this.local(e);this.pointers.set(e.pointerId,screen);
    if(this.pinch){if(this.pointers.size<2)return;const [a,b]=[...this.pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},next=Math.max(.65,Math.min(4,this.pinch.zoom*distance(a,b)/Math.max(5,this.pinch.distance))),ratio=next/this.pinch.zoom,{w,h}=this.geometry();this.pan={x:mid.x-w/2-(this.pinch.mid.x-w/2-this.pinch.pan.x)*ratio,y:mid.y-h/2-(this.pinch.mid.y-h/2-this.pinch.pan.y)*ratio};this.zoom=next;this.boundPan();this.dirty=true;this.changed(this.metrics);return;}
    const op=this.operation,d=this.working;if(!op||!d)return;const p=this.point(screen);
    if(op.kind==='pan'){this.pan={x:op.pan.x+screen.x-op.screen.x,y:op.pan.y+screen.y-op.screen.y};this.boundPan();this.dirty=true;return;}
    if(op.kind==='node'){d.outline[op.index]=p;if(this.symmetry&&op.mirror>=0&&op.mirror!==op.index)d.outline[op.mirror]={x:100-p.x,y:p.y};}
    else if(['shape','hole'].includes(op.kind)){if(op.points.length<300&&distance(p,op.points.at(-1))>.7)op.points.push(p);}
    else if(op.kind==='gem'){d.gems[op.index]={...d.gems[op.index],...p};if(op.mirror!==undefined)d.gems[op.mirror]={...d.gems[op.mirror],x:100-p.x,y:p.y};}
    else if(op.kind==='ink')this.addInk(p);
    else if(op.kind==='polish'){op.points.push(p);if(op.points.length>200)op.points.shift();addPolish(d,[p],this.width+5);}
    this.refresh();
  }
  pointerup(e){this.pointers.delete(e.pointerId);if(this.pinch){if(!this.pointers.size)this.pinch=null;return;}this.finish();}
  pointercancel(e){this.pointerup(e);}
  refresh(){this.rev++;const preview=this.preview();this.metrics=evaluate(preview);this.dirty=true;this.changed(this.metrics);}
  // Only a line or contour in progress needs a separate copy; it is rebuilt once per revision. Callers only read it.
  preview(){const op=this.operation,base=this.design;if(op?.kind!=='ink'&&!(op?.kind==='shape'&&op.points.length>2))return base;if(this.shown?.rev===this.rev&&this.shown.base===base)return this.shown.d;
    const d=clone(base);if(op.kind==='ink')d.strokes.push(...op.segments.slice(0,160-d.strokes.length));else{d.outline=clean(op.points);d.holes=[];}this.shown={rev:this.rev,base,d};return d;}
  finish(){
    if(!this.operation||!this.working)return;
    const op=this.operation,d=this.working;
    if(op.kind==='ink')d.strokes.push(...op.segments.filter(s=>s.points.length>=2&&s.points.some(p=>distance(p,s.points[0])>.5)).slice(0,160-d.strokes.length));
    if(op.kind==='shape'&&op.points.length>2&&area(op.points)>50){d.outline=clean(op.points);d.holes=[];d.template='free';}
    if(op.kind==='hole'&&op.points.length>2&&area(op.points)>10&&d.holes.length<12){d.holes.push(clean(op.points));}
    this.operation=null;this.working=null;this.rev++;
    try{if(op.kind!=='pan'&&edit(this.state,d))this.committed();}catch(e){this.error(e.message);}
    this.metrics=evaluate(this.state.draft.design);this.dirty=true;this.changed(this.metrics);
  }
  paint(time=0){
    if(!this.dirty&&!(time&&(this.metrics.magic||this.design.gems.length||this.metrics.polish>25)))return;const d=this.preview();
    const {w,h,base}=this.geometry(),ratio=Math.min(2,devicePixelRatio||1),cw=Math.round(w*ratio),ch=Math.round(h*ratio);if(cw<1||ch<1)return;if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
    const c=this.canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);drawVelvet(c,w,h);const size=base*this.zoom,left=(w-size)/2+this.pan.x,top=(h-size)/2+this.pan.y;
    if(this.symmetry){c.save();c.strokeStyle='rgba(243,215,156,.35)';c.setLineDash([4,5]);c.lineWidth=1;c.beginPath();c.moveTo(left+size/2,Math.max(0,top));c.lineTo(left+size/2,Math.min(h,top+size));c.stroke();c.restore();}
    c.save();c.translate(left,top);drawJewel(c,d,{size,time:time/1000,handles:this.tool==='shape',selected:this.tool==='stone'?this.selected:-1,background:false,assessment:this.metrics,rev:this.rev});c.restore();
    if(this.operation?.kind==='hole'||this.operation?.kind==='shape'){c.save();c.strokeStyle='#f3d79c';c.setLineDash([5,4]);c.lineWidth=1.5;c.beginPath();this.operation.points.forEach((p,i)=>{const x=left+p.x/100*size,y=top+p.y/100*size;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.restore();}
    this.dirty=false;
  }
  destroy(){this.finish();this.abort.abort();this.resize.disconnect();this.pointers.clear();}
}
