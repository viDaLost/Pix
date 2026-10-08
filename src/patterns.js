// Ready-made engravings and stone layouts. They follow the player's own contour, so the same
// pattern on a different silhouette becomes a different design for the demand ledger.
import {AtelierError,GEMS,onMetal,support,inside,distance} from './jewelry.js';
const TAU=Math.PI*2,r2=n=>Math.round(n*100)/100;
export const PATTERNS=[
 {id:'beads',name:'Бисер',need:0,hint:'Зернь по краю оправы'},
 {id:'rope',name:'Шнур',need:0,hint:'Витая кайма вдоль контура'},
 {id:'rays',name:'Сияние',need:0,hint:'Лучи от центра'},
 {id:'lattice',name:'Сетка',need:0,hint:'Ромбическая решётка'},
 {id:'waves',name:'Волны',need:0,hint:'Морская рябь'},
 {id:'runes',name:'Рунный круг',need:0,hint:'Руна вокруг каждого камня',kind:'rune'},
 {id:'vine',name:'Лоза',need:2,hint:'Стебель с листьями по краю'},
 {id:'zigzag',name:'Ёлочка',need:2,hint:'Зубчатая кайма'},
 {id:'scales',name:'Чешуя',need:2,hint:'Ряды полукружий'},
 {id:'filigree',name:'Филигрань',need:5,hint:'Зеркальные завитки'},
 {id:'meander',name:'Меандр',need:5,hint:'Греческий ключ'},
 {id:'rosette',name:'Розетка',need:5,hint:'Лепестки вокруг центра'},
 {id:'stars',name:'Звёзды',need:5,hint:'Россыпь звёзд'}
];
export const LAYOUTS=[
 {id:'solo',name:'Центр'},{id:'pair',name:'Пара'},{id:'trio',name:'Триада'},{id:'cross',name:'Крест'},{id:'halo',name:'Ореол'},{id:'column',name:'Столбик'}
];
export const patternUnlocked=(s,id)=>(s.crafted||0)>=(PATTERNS.find(p=>p.id===id)?.need??99);
function signedArea(points){let n=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];n+=a.x*b.y-a.y*b.x;}return n/2;}
// Evenly spaced samples along a closed contour.
function resample(points,step){
 const loop=[...points,points[0]],out=[];let carry=0;
 for(let i=1;i<loop.length;i++){const a=loop[i-1],b=loop[i],length=distance(a,b);let t=carry;while(t<length){out.push({x:a.x+(b.x-a.x)*t/length,y:a.y+(b.y-a.y)*t/length});t+=step;}carry=t-length;}
 return out;
}
// A strip that runs along a contour: u is the distance along it, v the distance into the metal.
function track(points,dir=1){
 const pts=resample(points,1),n=pts.length,sign=(Math.sign(signedArea(points))||1)*dir;
 const normals=pts.map((p,i)=>{const a=pts[(i-3+n)%n],b=pts[(i+3)%n],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return {x:-dy/l*sign,y:dx/l*sign};});
 return {length:n,at(u,v){const w=((u%n)+n)%n,i=Math.floor(w),j=(i+1)%n,t=w-i,p={x:pts[i].x+(pts[j].x-pts[i].x)*t,y:pts[i].y+(pts[j].y-pts[i].y)*t},m={x:normals[i].x+(normals[j].x-normals[i].x)*t,y:normals[i].y+(normals[j].y-normals[i].y)*t},l=Math.hypot(m.x,m.y)||1;return {x:p.x+m.x/l*v,y:p.y+m.y/l*v};}};
}
function bounds(d){const xs=d.outline.map(p=>p.x),ys=d.outline.map(p=>p.y);return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};}
// The visual middle of the metal: the centroid, or the top band of a ring.
export function anchor(d){
 const b=bounds(d);let a=0,x=0,y=0;for(let i=0;i<d.outline.length;i++){const p=d.outline[i],q=d.outline[(i+1)%d.outline.length],k=p.x*q.y-q.x*p.y;a+=k;x+=(p.x+q.x)*k;y+=(p.y+q.y)*k;}
 const c=a?{x:x/(3*a),y:y/(3*a)}:{x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2};if(onMetal(c,d))return c;
 let start=null;for(let yy=b.y0;yy<=c.y;yy+=.5){const on=onMetal({x:c.x,y:yy},d);if(on&&start===null)start=yy;if(!on&&start!==null)return {x:c.x,y:(start+yy)/2};}
 return start===null?c:{x:c.x,y:(start+c.y)/2};
}
const loop=(cx,cy,rx,ry=rx,n=10)=>Array.from({length:n+1},(_,i)=>({x:cx+Math.cos(i*TAU/n)*rx,y:cy+Math.sin(i*TAU/n)*ry}));
const contours=d=>[{points:d.outline,dir:1},...d.holes.filter(h=>h.length>=3&&resample(h,1).length>36).map(points=>({points,dir:-1}))];
function along(d,fn){const out=[];for(const c of contours(d)){const t=track(c.points,c.dir);out.push(...fn(t,c.dir));}return out;}
const strip=(t,from,to,step,f)=>{const pts=[];for(let u=from;u<=to;u+=step)pts.push(t.at(u,f(u)));return pts;};
const mirror=(lines,cx)=>[...lines,...lines.map(l=>l.map(p=>({x:2*cx-p.x,y:p.y})))];
function rand(seed){let n=seed>>>0||1;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const GENERATORS={
 beads:(d,v)=>along(d,t=>{const gap=[4.2,3.4,5.4][v%3],inset=[2.6,3.4,2.2][v%3],count=Math.floor(t.length/gap);return Array.from({length:count},(_,i)=>{const c=t.at(i*t.length/count,inset);return loop(c.x,c.y,[.8,.65,1.05][v%3],undefined,8);});}),
 rope:(d,v)=>along(d,t=>{const period=[5,3.8,6.5][v%3],w=[2.4,1.8,3][v%3],inset=2.2;return [0,Math.PI].map(phase=>strip(t,0,t.length,.6,u=>inset+w/2+w/2*Math.sin(u*TAU/period+phase)));}),
 zigzag:(d,v)=>along(d,t=>{const period=[4,3,5.5][v%3],h=[3,2.4,3.8][v%3],pts=[];for(let u=0;u<=t.length;u+=period/2)pts.push(t.at(u,2+(Math.round(u/(period/2))%2?h:0)));return [pts,strip(t,0,t.length,1,()=>2+h+1.4)];}),
 meander:(d,v)=>along(d,t=>{const w=[6,5,7.5][v%3],h=w*.66,base=2,cells=Math.floor(t.length/w),out=[strip(t,0,t.length,1,()=>base)];
  for(let i=0;i<cells;i++){const u=i*t.length/cells,k=t.length/cells/w,line=[[0,0],[0,h],[.72*w*k,h],[.72*w*k,h*.32],[.36*w*k,h*.32],[.36*w*k,h*.66]];const pts=[];for(let j=1;j<line.length;j++){const [a,b]=[line[j-1],line[j]];for(let s=0;s<=6;s++)pts.push(t.at(u+a[0]+(b[0]-a[0])*s/6,base+a[1]+(b[1]-a[1])*s/6));}out.push(pts);}return out;}),
 vine:(d,v)=>along(d,t=>{const period=[9,7,12][v%3],amp=1.3,mid=3.6,out=[strip(t,0,t.length,.7,u=>mid+amp*Math.sin(u*TAU/period))],count=Math.floor(t.length/period)*2;
  for(let i=0;i<count;i++){const u=(i+.25)*t.length/count,side=i%2?1:-1,len=[3.4,2.8,4.2][v%3],base=mid+amp*Math.sin(u*TAU/period),ax={u:.72,v:side*.7},px={u:-ax.v,v:ax.u},pts=[];
   for(let s=0;s<=20;s++){const k=s<=10?s/10:(20-s)/10,w=(s<=10?1:-1)*len*.3*Math.sin(Math.PI*k);pts.push(t.at(u+ax.u*len*k+px.u*w,base+ax.v*len*k+px.v*w));}out.push(pts);}return out;}),
 rays:(d,v)=>{const c=anchor(d),n=[16,24,12][v%3],inner=[5,3.5,7][v%3];return Array.from({length:n},(_,i)=>{const a=i*TAU/n+(v>2?TAU/n/2:0),len=i%2?28:70;return [{x:c.x+Math.cos(a)*inner,y:c.y+Math.sin(a)*inner},{x:c.x+Math.cos(a)*len,y:c.y+Math.sin(a)*len}];});},
 lattice:(d,v)=>{const gap=[7,5.5,9][v%3],out=[];for(let k=-100;k<=200;k+=gap){out.push([{x:k,y:0},{x:k-100,y:100}]);out.push([{x:k-100,y:0},{x:k,y:100}]);}return out;},
 waves:(d,v)=>{const gap=[6,4.8,7.5][v%3],amp=[1.4,1,2][v%3],period=[10,8,13][v%3],b=bounds(d),out=[];for(let y=b.y0+gap/2;y<b.y1;y+=gap){const pts=[];for(let x=b.x0-2;x<=b.x1+2;x+=.7)pts.push({x,y:y+amp*Math.sin(x*TAU/period+y)});out.push(pts);}return out;},
 scales:(d,v)=>{const r=[3.6,2.8,4.6][v%3],b=bounds(d),out=[];let row=0;for(let y=b.y0+r;y<b.y1+r;y+=r*1.1,row++)for(let x=b.x0-r+(row%2?r:0);x<b.x1+r;x+=r*2){const pts=[];for(let s=0;s<=10;s++){const a=Math.PI+s*Math.PI/10;pts.push({x:x+Math.cos(a)*r,y:y-Math.sin(a)*r*.9});}out.push(pts);}return out;},
 filigree:(d,v)=>{const c=anchor(d),b=bounds(d),w=b.x1-b.x0,h=b.y1-b.y0,rows=[[-.26,.17],[0,.26],[.26,.17]],size=Math.min(w,h)*[.11,.09,.13][v%3],out=[];
  for(const [dy,dx] of rows){const cx=c.x-w*dx,cy=c.y+h*dy,turn=(dy+1)*2,pts=[];for(let s=0;s<=60;s++){const k=s/60,r=size*(1-k*.85),a=turn+k*TAU*1.3;pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r});}out.push(pts);}
  out.push(Array.from({length:30},(_,i)=>({x:c.x-w*.06*Math.sin(i/29*TAU),y:b.y0+h*(.15+.7*i/29)})));
  return mirror(out,c.x);},
 rosette:(d,v)=>{const c=anchor(d),b=bounds(d),n=[8,6,12][v%3],R=Math.min(b.x1-b.x0,b.y1-b.y0)*[.3,.34,.26][v%3],out=[loop(c.x,c.y,1.8,undefined,12)];
  for(let i=0;i<n;i++){const a=i*TAU/n,pts=[];for(let s=0;s<=20;s++){const k=s<=10?s/10:(20-s)/10,side=s<=10?1:-1,r=2.4+(R-2.4)*k,off=side*Math.sin(Math.PI*k)*.28;pts.push({x:c.x+Math.cos(a+off)*r,y:c.y+Math.sin(a+off)*r});}out.push(pts);}return out;},
 stars:(d,v)=>{const b=bounds(d),next=rand(97+v*31),stars=[];for(let i=0;i<400&&stars.length<22;i++){const p={x:b.x0+next()*(b.x1-b.x0),y:b.y0+next()*(b.y1-b.y0)};if(onMetal(p,d)&&stars.every(q=>distance(p,q)>7.5))stars.push(p);}
  return stars.map((p,i)=>{const R=[2.2,1.7,2.8][(i+v)%3];return Array.from({length:9},(_,k)=>{const a=-Math.PI/2+k*Math.PI/4,r=k%2?R*.38:R;return {x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};});});},
 runes:(d,v)=>{if(!d.gems.length)throw new AtelierError('Сначала поставь камни: руна обвивает оправу.');return d.gems.flatMap(g=>{const ry=g.cut==='round'?1:g.cut==='pear'?1.35:1.4,r=g.size+2+(v%3)*.6,out=[loop(g.x,g.y,r,r*ry,28)];for(let k=0;k<3;k++){const a=-Math.PI/2+k*TAU/3+v*.4;out.push([{x:g.x+Math.cos(a)*r,y:g.y+Math.sin(a)*r*ry},{x:g.x+Math.cos(a)*(r+2),y:g.y+Math.sin(a)*(r+2)*ry},{x:g.x+Math.cos(a+.25)*(r+2.6),y:g.y+Math.sin(a+.25)*(r+2.6)*ry}]);}return out;});}
};
// Lines are cut to the metal and spaced like hand engraving, so nothing hides outside the jewel.
function clip(d,line){
 const dense=[];for(let i=0;i<line.length;i++){const p=line[i];if(i){const q=line[i-1],steps=Math.ceil(distance(p,q)/.8);for(let s=1;s<steps;s++)dense.push({x:q.x+(p.x-q.x)*s/steps,y:q.y+(p.y-q.y)*s/steps});}dense.push(p);}
 const runs=[];let run=[];const flush=()=>{if(run.length>=2&&run.some(p=>distance(p,run[0])>.5))for(let i=0;i<run.length;i+=480)runs.push(run.slice(Math.max(0,i-1),i+480));run=[];};
 for(const p of dense){const q={x:r2(p.x),y:r2(p.y)};if(q.x>=0&&q.x<=100&&q.y>=0&&q.y<=100&&onMetal(q,d)){if(!run.length||distance(q,run.at(-1))>=.55)run.push(q);}else flush();}
 flush();return runs.filter(r=>r.length>=2);
}
export function patternStrokes(d,id,{variant=0,width=.9}={}){
 const pattern=PATTERNS.find(p=>p.id===id),make=GENERATORS[id];if(!pattern||!make)throw new AtelierError('Неизвестный узор.');
 if(d.outline.length<3)throw new AtelierError('Сначала замкни контур изделия.');
 const kind=pattern.kind||'engrave',lines=make(d,variant).filter(l=>l.length>=2),strokes=[];let points=d.strokes.reduce((n,s)=>n+s.points.length,0),room=156-d.strokes.length;
 for(const line of lines)for(const run of clip(d,line)){if(room<=0||points+run.length>7800)break;strokes.push({kind,width:Math.max(.5,Math.min(2.5,width)),points:run});room--;points+=run.length;}
 if(!strokes.length)throw new AtelierError(room<=0||points>7700?'Для узора нет места: убери часть гравировки.':'Узор не помещается на эту форму.');
 return strokes;
}
// Stones are placed only where the metal can hold them and they do not crowd each other.
export function layoutGems(d,id,{kind='garnet',size=3,cut='round'}={}){
 if(!GEMS[kind])throw new AtelierError('Неизвестный камень.');if(d.outline.length<3)throw new AtelierError('Сначала замкни контур изделия.');
 const c=anchor(d),b=bounds(d),w=b.x1-b.x0,h=b.y1-b.y0,small=Math.max(1.5,size*.55),gap=size*2.2+1;let spots=[];
 if(id==='solo')spots=[{x:c.x,y:c.y,size}];
 if(id==='pair')spots=[-1,1].map(k=>({x:c.x+k*Math.max(gap*.55,w*.18),y:c.y,size}));
 if(id==='trio')spots=[{x:c.x,y:c.y-gap*.55,size},{x:c.x-gap*.6,y:c.y+gap*.45,size:size*.8},{x:c.x+gap*.6,y:c.y+gap*.45,size:size*.8}];
 if(id==='cross')spots=[{x:c.x,y:c.y,size},...[[0,-1],[1,0],[0,1],[-1,0]].map(([x,y])=>({x:c.x+x*gap*.8,y:c.y+y*gap*.8,size:small}))];
 if(id==='halo'){const R=size+small+1.6;spots=[{x:c.x,y:c.y,size},...Array.from({length:8},(_,i)=>({x:c.x+Math.cos(i*TAU/8)*R,y:c.y+Math.sin(i*TAU/8)*R*(cut==='round'?1:1.35),size:small}))];}
 if(id==='column')spots=[-1,0,1].map(k=>({x:c.x,y:c.y+k*Math.max(gap*.75,h*.22),size:k?size*.75:size}));
 if(!spots.length)throw new AtelierError('Неизвестная раскладка.');
 const gems=[...d.gems],added=[],ratio=(g,q)=>((g.cut==='round'?1:1.4)+(q.cut==='round'?1:1.4))/2;
 for(const s of spots){if(gems.length>=16)break;const g={kind,x:r2(Math.max(1,Math.min(99,s.x))),y:r2(Math.max(1,Math.min(99,s.y))),size:r2(Math.max(1.5,Math.min(7,s.size))),cut:s.size<size?'round':cut};
  if(support(g,d)>.75&&gems.every(q=>Math.hypot(g.x-q.x,(g.y-q.y)/ratio(g,q))>(g.size+q.size)*.85)&&!d.holes.some(hole=>inside(g,hole))){gems.push(g);added.push(g);}}
 if(!added.length)throw new AtelierError('Камни не помещаются: уменьши размер или расширь оправу.');
 return added;
}
