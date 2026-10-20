// The engravings of the bestiary (GDD 11.5, art.md 5): brown-black ink on parchment, drawn from the primitives of
// plates.js. The light always falls from the upper left; a shadow is hatched in the crescent that is left when the figure,
// shifted toward the light, is cut out of itself, so no normal is ever computed. A page fills in with knowledge: stage 0 is
// a pencil sketch from hearsay, 1 the first contours and shadows, 2 fur, teeth and scales, 3 the whole plate with stipple,
// sky, ground and frame, 4 (a treatise) a watercolour wash and gilt. An unknown monster is a smudged silhouette.
// Geometry (outlines, hatching, stipple) is pure, computed once per plate and checked in node; painting is a few paths
// per figure into an offscreen canvas, kept in an LRU cache by id, stage, width and dpr (10 plates, 28 thumbnails).
import {noise} from './pixel.js';
import {PLATES,PROPS} from './plates.js';
export const PW=240,PH=160,INK='#2b2018',PENCIL='#6e6250',PAPER='#e9dbb9',GILT='#b8893a',GLOW='#e8c04a';
export const KINDS=['ell','limb','poly','line','fur','spikes','scales','wing','hair','folds','eye','water','sky','moon','ground','prop'];
export const STAGES=['набросок со слов','первые штрихи','тени и шерсть','полная гравюра','трактат с подкраской'];
// What each stage shows: the deepest level of primitives and the darkest tone (art.md 5.4).
const LEVEL=[0,1,2,3,3],TONE=[0,1,3,4,4];
const hashOf=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0)%99991;};
export const parsePts=s=>String(s).trim().split(/\s+/).map(p=>p.split(',').map(Number));
// The stage of a page by the share of settled records r = (confirmed + refuted + dangerous) / all; a treatise is stage 4.
export function stageOf(stats,treatise=false){if(!stats)return null;if(treatise)return 4;const r=stats.total?stats.resolved/stats.total:0;return r<.2?0:r<.45?1:r<.7?2:3;}
// Parallel hatching across a box: straight lines at an angle and a step, each drawn as three points whose middle bows by
// bend·len/40 (a stroke that wraps a round form) with a little noise; 6 % of the lines are left out, as a hand would.
export function hatchLines(box,angle,spacing,phase=0,{bend=0,seed=0,jitter=.4,skip=.06}={}){const [x0,y0,x1,y1]=box,a=angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx,cx=(x0+x1)/2,cy=(y0+y1)/2,out=[];
 const proj=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(([x,y])=>(x-cx)*nx+(y-cy)*ny),lo=Math.min(...proj),hi=Math.max(...proj);
 let i=0;for(let t=lo+((phase%spacing)+spacing)%spacing;t<=hi+1e-9;t+=spacing,i++){const px=cx+nx*t,py=cy+ny*t;let u0=-1e9,u1=1e9;
  for(const [p,d,a0,a1] of[[px,dx,x0,x1],[py,dy,y0,y1]]){if(Math.abs(d)<1e-9){if(p<a0||p>a1)u1=u0-1;continue;}let s=(a0-p)/d,e=(a1-p)/d;if(s>e)[s,e]=[e,s];u0=Math.max(u0,s);u1=Math.min(u1,e);}
  const len=u1-u0;if(!(len>=1.5)||skip&&noise(i,7,seed)<skip)continue;const s=[px+dx*u0,py+dy*u0],e=[px+dx*u1,py+dy*u1],off=bend*len/40+(jitter?(noise(i,3,seed)-.5)*2*jitter:0);
  out.push([s,[(s[0]+e[0])/2+nx*off,(s[1]+e[1])/2+ny*off],e]);}
 return out;}
// Catmull-Rom through the points (any number of coordinates each, so a limb carries its width along).
export function spline(p,closed=false,steps=6){const n=p.length;if(n<3)return p.map(q=>q.slice());const out=[],d=p[0].length,at=i=>closed?p[((i%n)+n)%n]:p[Math.max(0,Math.min(n-1,i))];
 for(let i=0;i<(closed?n:n-1);i++){const a=at(i-1),b=at(i),c=at(i+1),e=at(i+2);for(let k=0;k<steps;k++){const t=k/steps,t2=t*t,t3=t2*t,q=[];for(let j=0;j<d;j++)q.push(.5*(2*b[j]+(c[j]-a[j])*t+(2*a[j]-5*b[j]+4*c[j]-e[j])*t2+(3*b[j]-a[j]-3*c[j]+e[j])*t3));out.push(q);}}
 if(!closed)out.push(p[n-1].slice());return out;}
const ellPts=(cx,cy,rx,ry,rot=0,n=36)=>{const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),out=[];for(let i=0;i<n;i++){const t=i/n*2*Math.PI,x=Math.cos(t)*rx,y=Math.sin(t)*ry;out.push([cx+x*c-y*s,cy+x*s+y*c]);}return out;};
const boxOf=p=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [x,y] of p){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}return [x0,y0,x1,y1];};
export function inside(poly,x,y){let r=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)r=!r;}return r;}
const unit=(x,y)=>{const l=Math.hypot(x,y)||1;return [x/l,y/l];};
const normals=sp=>sp.map((_,i)=>{const a=sp[Math.max(0,i-1)],b=sp[Math.min(sp.length-1,i+1)];const [ux,uy]=unit(b[0]-a[0],b[1]-a[1]);return [-uy,ux,ux,uy];});
// A limb is a ribbon whose width follows its points (the math of ribbon() in characters.js), with round ends.
function limbPts(spec){const sp=spline(parsePts(spec),false,5),nm=normals(sp),L=[],R=[];sp.forEach((p,i)=>{const h=(p[2]||1)/2;L.push([p[0]+nm[i][0]*h,p[1]+nm[i][1]*h]);R.push([p[0]-nm[i][0]*h,p[1]-nm[i][1]*h]);});
 const cap=(i,sgn)=>{const p=sp[i],[nx,ny,tx,ty]=nm[i],h=(p[2]||1)/2,out=[];for(let k=1;k<6;k++){const t=k/6*Math.PI;out.push([p[0]+sgn*(nx*h*Math.cos(t)+tx*h*Math.sin(t)),p[1]+sgn*(ny*h*Math.cos(t)+ty*h*Math.sin(t))]);}return out;};
 return [...L,...cap(sp.length-1,1),...R.reverse(),...cap(0,-1)];}
// A wing: ribs from the root to the tips, the membrane between neighbouring tips scooped toward the root.
function wingPts(root,tips){const r=parsePts(root)[0],t=parsePts(tips),poly=[r],ribs=[];t.forEach((p,i)=>{poly.push(p);ribs.push([r,[(r[0]+p[0])/2+(p[1]-r[1])*.06,(r[1]+p[1])/2-(p[0]-r[0])*.06],p]);const q=t[i+1];if(q){const m=[(p[0]+q[0])/2,(p[1]+q[1])/2],c=[m[0]+(r[0]-m[0])*.3,m[1]+(r[1]-m[1])*.3];for(let k=1;k<6;k++){const u=k/6,v=1-u;poly.push([v*v*p[0]+2*u*v*c[0]+u*u*q[0],v*v*p[1]+2*u*v*c[1]+u*u*q[1]]);}}});return {poly,ribs};}
// A prop of the common library is placed by its foot point and a scale (negative mirrors it).
function place(s,x0,y0,k){const f=Math.sign(k)||1,a=Math.abs(k),pt=str=>parsePts(str).map(p=>p.map((v,i)=>+(i===0?x0+v*k:i===1?y0+v*a:v*a).toFixed(2)).join(',')).join(' '),[kind,lvl,tone,...d]=s;
 switch(kind){case'ell':return [kind,lvl,tone,x0+d[0]*k,y0+d[1]*a,d[2]*a,d[3]*a,(d[4]||0)*f];case'limb':case'poly':case'line':return [kind,lvl,tone,pt(d[0]),...d.slice(1)];
  case'fur':return [kind,lvl,tone,pt(d[0]),d[1],d[2]*a,(d[3]??1)*f];case'spikes':return [kind,lvl,tone,pt(d[0]),d[1],d[2]*a*f];case'scales':return [kind,lvl,tone,d[0],d[1]*a];
  case'wing':return [kind,lvl,tone,pt(d[0]),pt(d[1])];case'hair':return [kind,lvl,tone,pt(d[0]),d[1],d[2]*a,(d[3]||0)*a];case'eye':return [kind,lvl,tone,x0+d[0]*k,y0+d[1]*a,d[2]*a,d[3]||0];default:return s.slice();}}
// A shaggy edge ('j3' in the flags of a poly or a limb): every third point of the outline pushed out into a tuft.
function shag(poly,amt,seed){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}const sg=a>0?1:-1,n=poly.length;
 return poly.map((p,i)=>{const b=poly[(i+1)%n],c=poly[(i+n-1)%n],[tx,ty]=unit(b[0]-c[0],b[1]-c[1]),k=i%3===1?amt*(.55+.6*noise(i,21,seed)):i%3===2?-amt*.2:0;return [p[0]+sg*ty*k+tx*k*.35,p[1]-sg*tx*k+ty*k*.35];});}
const jag=fl=>{const m=/j(\d+(?:\.\d+)?)/.exec(String(fl||''));return m?+m[1]:0;};
const refOf=s=>s[0]==='scales'||s[0]==='folds'?s[3]:null;
const closedKind=s=>s[0]==='ell'||s[0]==='limb'||s[0]==='wing'||s[0]==='poly'&&!String(s[4]||'').includes('o');
// The primitives of a plate with its props unfolded; a reference (-1 = the closed figure just before) becomes an index.
export function expand(shapes){const out=[],map=[];shapes.forEach((s,i)=>{if(s[0]==='prop'){const [,lvl,tone,name,x,y,k=1]=s,local=[];let last=out.length-1;
  for(const [j,c] of (PROPS[name]||[]).entries()){const t=place(c,x,y,k);t[1]=lvl;t[2]=Math.max(0,Math.min(4,t[2]+(tone-1)));const r=refOf(t);local.push(out.length);out.push({s:t,ref:r==null?null:local[j+r]});if(closedKind(t))last=out.length-1;}map[i]=last;}
 else{const r=refOf(s);out.push({s,ref:r==null?null:map[i+r]});map[i]=closedKind(s)?out.length-1:map[i-1]??out.length-1;}});return out;}
const along=(sp,n,fn)=>{const len=[0];for(let i=1;i<sp.length;i++)len.push(len[i-1]+Math.hypot(sp[i][0]-sp[i-1][0],sp[i][1]-sp[i-1][1]));const total=len.at(-1)||1,nm=normals(sp);
 for(let i=0;i<n;i++){const at=(i+.5)/n*total;let j=1;while(j<sp.length-1&&len[j]<at)j++;const u=(at-len[j-1])/((len[j]-len[j-1])||1),p=[sp[j-1][0]+(sp[j][0]-sp[j-1][0])*u,sp[j-1][1]+(sp[j][1]-sp[j-1][1])*u];fn(p,nm[j],i);}};
const wave=(x0,x1,y,amp,seed,step=4)=>{const p=[];for(let x=x0;x<=x1+.01;x+=step)p.push([x,y+amp*Math.sin(x*.21+seed)*(.6+.4*noise(Math.round(x),Math.round(y),seed))]);return p;};
// Everything of a plate that does not depend on its size: outlines, hatching, stipple, lines of fur, sky and water.
const compiled=new Map();
export function compile(id){if(compiled.has(id))return compiled.get(id);const P=PLATES[id];if(!P)return null;const seed=hashOf(id),[lx,ly]=unit(...(P.light||[-1,-1])),sh=[-lx,-ly],prims=expand(P.shapes),items=[],moons=[];
 const shape=(poly,s,n,extra={})=>({type:'shape',lvl:s[1],tone:s[2],poly,box:boxOf(poly),src:n,...extra});
 prims.forEach(({s,ref},n)=>{const [kind,lvl,tone,...d]=s,sd=seed+n*13;let it=null;
  if(kind==='ell')it=shape(ellPts(...d.slice(0,5)),s,n,{round:1});
  else if(kind==='limb'){const j=jag(d[1]);it=shape(j?shag(limbPts(d[0]),j,sd):limbPts(d[0]),s,n,{round:1});}
  else if(kind==='poly'){const fl=String(d[1]||''),open=fl.includes('o'),j=jag(fl);let p=parsePts(d[0]);if(fl.includes('s'))p=spline(p,!open,6);it=open?{type:'lines',lvl,tone,paths:[p],w:.6+tone*.15}:shape(j?shag(p,j,sd):p,s,n);}
  else if(kind==='line')it={type:'lines',lvl,tone:0,paths:[spline(parsePts(d[0]),false,6)],w:tone};
  else if(kind==='wing'){const w=wingPts(d[0],d[1]);it=shape(w.poly,s,n,{ribs:w.ribs});}
  else if(kind==='fur'){const [p,cnt,len,side=1]=d,sp=spline(parsePts(p),false,6),paths=[];along(sp,cnt,(q,[nx,ny,tx,ty],i)=>{const l=len*(i%2?.6:1)*(.85+.3*noise(i,5,sd)),dx=nx*side*.62+tx*.78,dy=ny*side*.62+ty*.78;paths.push([q,[q[0]+dx*l*.5-tx*l*.12,q[1]+dy*l*.5-ty*l*.12],[q[0]+dx*l,q[1]+dy*l]]);});it={type:'lines',lvl,tone,paths,w:.42+tone*.1};}
  else if(kind==='spikes'){const [a,b]=parsePts(d[0]),cnt=d[1],len=d[2],[ux,uy]=unit(b[0]-a[0],b[1]-a[1]),polys=[];for(let i=0;i<cnt;i++){const p=[a[0]+(b[0]-a[0])*i/cnt,a[1]+(b[1]-a[1])*i/cnt],q=[a[0]+(b[0]-a[0])*(i+1)/cnt,a[1]+(b[1]-a[1])*(i+1)/cnt],m=[(p[0]+q[0])/2,(p[1]+q[1])/2],l=len*(.8+.4*noise(i,9,sd));polys.push([p,[m[0]-uy*l+ux*l*.18,m[1]+ux*l+uy*l*.18],q]);}it={type:'teeth',lvl,tone,polys};}
  else if(kind==='scales'||kind==='folds'){const host=items[ref];if(!host||host.type!=='shape')return items.push(null);const [x0,y0,x1,y1]=host.box,paths=[];
   if(kind==='scales'){const r=d[1];for(let y=y0,row=0;y<y1+r;y+=r*1.15,row++)for(let x=x0-(row%2)*r;x<x1+r;x+=2*r){const a=[];for(let k=0;k<=6;k++){const t=k/6*Math.PI;a.push([x+Math.cos(t)*r,y+Math.sin(t)*r*.8]);}paths.push(a);}}
   else{const cnt=d[1],cx=(x0+x1)/2;for(let i=1;i<=cnt;i++){const x=x0+(x1-x0)*i/(cnt+1),top=[cx+(x-cx)*.35,y0+1],bot=[x+(noise(i,4,sd)-.5)*4,y1];paths.push([top,[(top[0]+bot[0])/2+(noise(i,6,sd)-.5)*5,(top[1]+bot[1])/2],bot]);}}
   it={type:'lines',lvl,tone,paths,w:kind==='scales'?.5:.6,clip:host.poly};}
  else if(kind==='hair'){const [p,cnt,spread,wv=1.5]=d,sp=spline(parsePts(p),false,6),nm=normals(sp),paths=[];for(let i=0;i<cnt;i++){const o=spread*(cnt>1?i/(cnt-1)*2-1:0),end=Math.max(3,Math.round(sp.length*(.62+.38*noise(i,2,sd)))),path=[];
    for(let j=0;j<end;j++){const u=j/(sp.length-1),w=(noise(i*31+j,8,sd)-.5)*2*wv*u;path.push([sp[j][0]+nm[j][0]*(o*(.35+.65*u)+w),sp[j][1]+nm[j][1]*(o*(.35+.65*u)+w)]);}paths.push(path);}it={type:'lines',lvl,tone,paths,w:.45+tone*.1};}
  else if(kind==='eye')it={type:'eye',lvl,tone,x:d[0],y:d[1],r:d[2],glow:d[3]||0};
  else if(kind==='water'){const [y0,y1,amp,x0=7,x1=233]=d,top=wave(x0,x1,y0,amp,sd),paths=[];let gap=5.5,row=0;for(let y=y0;y<=y1;y+=gap,gap=Math.max(2.1,gap*.86),row++){const line=wave(x0,x1,y,amp*(1-.3*row/12),sd+row*3);let seg=[];line.forEach((q,j)=>{if(noise(j,row,sd)<.12&&seg.length>1){paths.push(seg);seg=[];}else seg.push(q);});if(seg.length>1)paths.push(seg);}
   it={type:'water',lvl,tone,cover:[...top,[x1,y1+2],[x0,y1+2]],paths};}
  else if(kind==='moon'){const [x,y,r,phase='full']=d;let poly;if(phase==='full')poly=ellPts(x,y,r,r);else{const sg=phase==='wane'?-1:1,o=[];for(let k=0;k<=18;k++){const t=-Math.PI/2+k/18*Math.PI;o.push([x+sg*Math.cos(t)*r,y+Math.sin(t)*r]);}for(let k=17;k>0;k--){const t=-Math.PI/2+k/18*Math.PI;o.push([x+sg*Math.cos(t)*r*.35,y+Math.sin(t)*r*.92]);}poly=o;}moons.push([x,y,r]);it=shape(poly,s,n,{moon:1});}
  else if(kind==='ground'){const [y,tufts=6,cx,rx]=d,line=wave(8,232,y,.5,sd,6),paths=[line],tex=[];for(let i=0;i<tufts;i++){const x=14+noise(i,1,sd)*212,h=3+noise(i,2,sd)*4;for(let j=-2;j<=2;j++)paths.push([[x+j*.8,y],[x+j*1.6,y-h*(1-Math.abs(j)*.18)]]);}
   for(let i=0;i<16;i++){const x=10+noise(i,3,sd)*214,yy=y+2.5+noise(i,4,sd)*(PH-y-6);if(yy<PH-7)tex.push([[x,yy],[x+5+noise(i,5,sd)*14,yy]]);}
   it={type:'ground',lvl,tone,paths,tex,y,cx,rx};}
  else if(kind==='sky')it={type:'sky',lvl,tone,sky:d[0],at:d.slice(1),sd};
  items.push(it);});
 // The ground shadow lies under the figure: by default the width of the figures of level 0 above the ground.
 const figs=items.filter(it=>it?.type==='shape'&&it.lvl===0&&!it.moon);
 for(const it of items.filter(it=>it?.type==='ground')){const b=boxOf(figs.flatMap(f=>f.poly)),cx=it.cx??(b[0]+b[2])/2,rx=it.rx??Math.max(20,(b[2]-b[0])*.42),poly=ellPts(cx,it.y+1,rx,Math.max(2.2,rx*.09));it.shadow={poly,paths:hatchLines(boxOf(poly),0,1.3,0,{seed})};}
 for(const it of items.filter(it=>it?.type==='sky'))skyLines(it,moons,seed);
 for(const it of items)if(it?.type==='shape')shade(it,seed,sh);
 const cp={id,items,sh,wash:P.wash||['#7d6650','#9aa36b'],anchors:P.anchors,figs};compiled.set(id,cp);return cp;}
// The hatching of a figure (art.md 5.3): a crescent at 45° (tone 1), a narrower cross crescent (tone 2), a light tone
// over the whole figure (tone 3); stipple at the edge of the shadow for stage 3.
function shade(it,seed,sh){const [x0,y0,x1,y1]=it.box,w=x1-x0,h=y1-y0,m=Math.min(w,h),box=[x0-1,y0-1,x1+1,y1+1],sd=seed+it.src*17,bend=it.round?1.5:0;
 it.sA=Math.max(1.6,m*.34);it.sB=Math.max(1.2,m*.17);
 it.A=hatchLines(box,-45+(noise(it.src,1,seed)-.5)*16,m<14?2:2.5,noise(it.src,2,seed)*3,{bend,seed:sd});
 it.B=hatchLines(box,20+(noise(it.src,3,seed)-.5)*10,m<14?2.3:2.9,noise(it.src,4,seed)*3,{bend:-bend,seed:sd+1});
 it.C=hatchLines(box,-62,3.8,noise(it.src,5,seed)*4,{seed:sd+2});
 const dots=[],cnt=Math.max(10,Math.min(70,Math.round(w*h/26)));for(let j=0;j<cnt*3&&dots.length<cnt;j++){const x=x0+noise(j,11,sd)*w,y=y0+noise(j,13,sd)*h;if(!inside(it.poly,x,y)||!inside(it.poly,x+sh[0]*it.sA,y+sh[1]*it.sA))continue;
  const near=!inside(it.poly,x+sh[0]*it.sA*1.3,y+sh[1]*it.sA*1.3),far=!inside(it.poly,x+sh[0]*it.sA*1.75,y+sh[1]*it.sA*1.75);if(near&&noise(j,15,sd)<.85||!near&&far&&noise(j,15,sd)<.35)dots.push([x,y,.35+noise(j,17,sd)*.28]);}
 it.dots=dots;}
// The sky: night is horizontal hatching over the upper 60 % broken around the moon; a sun has wedge rays (and a face),
// a storm is a soot sky with dots of snow, mist a few long broken lines, dusk a low half sun over level lines.
function skyLines(it,moons,seed){const paths=[],polys=[],dots=[],sd=it.sd,cut=(y,x0,x1,holes)=>{let segs=[[x0,x1]];for(const [hx,hy,hr] of holes){const dy=y-hy;if(Math.abs(dy)>=hr)continue;const dx=Math.sqrt(hr*hr-dy*dy);segs=segs.flatMap(([a,b])=>hx-dx>b||hx+dx<a?[[a,b]]:[[a,hx-dx],[hx+dx,b]].filter(([p,q])=>q-p>2));}return segs;};
 const level=(y0,y1,step,holes=[],skip=.05)=>{let row=0;for(let y=y0;y<=y1;y+=step,row++)for(const [a,b] of cut(y,8,232,holes)){if(noise(row,Math.round(a),sd)<skip)continue;const w=(noise(row,1,sd)-.5)*.8;paths.push([[a,y],[(a+b)/2,y+w],[b,y]]);}};
 const holes=moons.map(([x,y,r])=>[x,y,r+4]);
 if(it.sky==='night')level(7,96,2.6,holes);
 else if(it.sky==='storm'){level(7,112,2,holes,.02);for(let i=0;i<150;i++)dots.push([8+noise(i,1,sd)*224,7+noise(i,2,sd)*140,.45+noise(i,3,sd)*.5]);for(let i=0;i<14;i++){const x=10+noise(i,4,sd)*200,y=10+noise(i,5,sd)*120;paths.push([[x,y],[x+14,y+3],[x+28,y+5]]);}}
 else if(it.sky==='mist'){for(let y=34,row=0;y<150;y+=7,row++){let x=8+noise(row,1,sd)*30;while(x<220){const l=20+noise(row,Math.round(x),sd)*50;paths.push([[x,y],[x+l/2,y+(noise(row,2,sd)-.5)],[Math.min(232,x+l),y]]);x+=l+12+noise(row,Math.round(x)+1,sd)*30;}}}
 else if(it.sky==='sun'||it.sky==='dusk'){const [x,y,r]=it.at.length?it.at:[200,34,12],low=it.sky==='dusk';level(7,low?y:70,low?2.4:3.4,[[x,y,r*2.1]],.08);
  const disk=low?(()=>{const o=[];for(let k=0;k<=18;k++){const t=Math.PI+k/18*Math.PI;o.push([x+Math.cos(t)*r,y+Math.sin(t)*r]);}return o;})():ellPts(x,y,r,r);polys.push(disk);
  const rays=low?9:16;for(let i=0;i<rays;i++){const t=low?Math.PI+(i+.5)/rays*Math.PI:i/rays*2*Math.PI,l=r*(i%2?1.45:1.9),wd=.09;polys.push([[x+Math.cos(t-wd)*r*1.15,y+Math.sin(t-wd)*r*1.15],[x+Math.cos(t)*l,y+Math.sin(t)*l],[x+Math.cos(t+wd)*r*1.15,y+Math.sin(t+wd)*r*1.15]]);}
  if(!low&&it.at[3]){const e=r*.3;paths.push([[x-e*1.5,y-e*.5],[x-e,y-e*.8],[x-e*.4,y-e*.5]],[[x+e*.4,y-e*.5],[x+e,y-e*.8],[x+e*1.5,y-e*.5]],[[x,y-e*.2],[x+e*.2,y+e*.6],[x-e*.1,y+e*.8]],[[x-e*1.2,y+e*1.4],[x,y+e*1.8],[x+e*1.2,y+e*1.4]]);}}
 it.paths=paths;it.polys=polys;it.dots=dots;}
// ---- painting
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
// The parchment (art.md 5.3 step 1), kept by size: spots, fibres, foxing and darker edges. It is also what a figure is
// filled with, so the lines behind it vanish with no seam.
const papers=new Map();
export function paper(w,h,seed=7){const key=w+'x'+h+'|'+seed;let c=papers.get(key);if(c)return c;c=mk(w,h);const g=c.getContext('2d'),k=w/PW;g.fillStyle=PAPER;g.fillRect(0,0,w,h);
 for(let i=0;i<18;i++){const x=noise(i,1,seed)*w,y=noise(i,2,seed)*h,r=(14+noise(i,3,seed)*40)*k,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(201,176,124,${(.05+noise(i,4,seed)*.07).toFixed(3)})`);gr.addColorStop(1,'rgba(201,176,124,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}
 g.strokeStyle='rgba(138,111,69,.07)';g.lineWidth=Math.max(.5,.4*k);g.beginPath();for(let i=0;i<220;i++){const x=noise(i,5,seed)*w,y=noise(i,6,seed)*h,l=(3+noise(i,7,seed)*6)*k,a=noise(i,8,seed)*Math.PI;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);}g.stroke();
 g.fillStyle='rgba(168,116,60,.25)';for(let i=0;i<8;i++){g.beginPath();g.arc(noise(i,9,seed)*w,noise(i,10,seed)*h,(1+noise(i,11,seed)*2)*k*.6,0,7);g.fill();}
 const e=12*k;for(const [x0,y0,x1,y1,rx,ry,rw,rh] of[[0,0,e,0,0,0,e,h],[w,0,w-e,0,w-e,0,e,h],[0,0,0,e,0,0,w,e],[0,h,0,h-e,0,h-e,w,e]]){const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(138,106,60,.35)');gr.addColorStop(1,'rgba(138,106,60,0)');g.fillStyle=gr;g.fillRect(rx,ry,rw,rh);}
 papers.set(key,c);if(papers.size>6)papers.delete(papers.keys().next().value);return c;}
const trace=(c,poly,dx=0,dy=0)=>{c.moveTo(poly[0][0]+dx,poly[0][1]+dy);for(let i=1;i<poly.length;i++)c.lineTo(poly[i][0]+dx,poly[i][1]+dy);c.closePath();};
const lines=(c,list)=>{for(const l of list){c.moveTo(l[0][0],l[0][1]);if(l.length===3)c.quadraticCurveTo(2*l[1][0]-(l[0][0]+l[2][0])/2,2*l[1][1]-(l[0][1]+l[2][1])/2,l[2][0],l[2][1]);else for(let i=1;i<l.length;i++)c.lineTo(l[i][0],l[i][1]);}};
const circles=(c,list)=>{for(const [x,y,r] of list){c.moveTo(x+r,y);c.arc(x,y,r,0,2*Math.PI);}};
// Paints a plate at a stage on a context already scaled to the field 240×160. fill is what hides what lies behind a
// figure (a pattern of the paper, or its colour). weight thickens the lines of small copies. Returns the number of
// stroke calls and hatch lines, for the budget of art.md 5.5.
export function drawPlate(c,id,stage=3,{fill=PAPER,weight=1,only=null}={}){const cp=compile(id);if(!cp)return null;const lv=LEVEL[stage],tm=TONE[stage],[sx,sy]=cp.sh,n={strokes:0,hatch:0,shapes:0};
 c.lineCap=c.lineJoin='round';let pen='';const flush=()=>{if(pen){c.stroke();n.strokes++;pen='';}},use=(w,col=INK,a=1)=>{const key=w+'|'+col+'|'+a;if(pen===key)return;flush();c.beginPath();c.lineWidth=w*weight;c.strokeStyle=col;c.globalAlpha=a;pen=key;};
 const hatch=(it,set,s,w)=>{c.save();c.beginPath();const [x0,y0,x1,y1]=it.box;c.rect(x0-20,y0-20,x1-x0+40,y1-y0+40);trace(c,it.poly,-sx*s,-sy*s);c.clip('evenodd');c.beginPath();lines(c,set);c.lineWidth=w*weight;c.strokeStyle=INK;c.stroke();n.strokes++;n.hatch+=set.length;c.restore();};
 if(stage===0){use(.8,PENCIL,.85);for(const it of cp.items){if(!it||it.lvl>0)continue;if(it.type==='shape'){trace(c,it.poly,.5,-.4);trace(c,it.poly,-.5,.4);}else if(it.type==='lines'||it.type==='ground')lines(c,it.paths);else if(it.type==='eye')circles(c,[[it.x,it.y,it.r]]);}flush();c.globalAlpha=1;return n;}
 for(const it of cp.items){if(!it||it.lvl>lv||only&&!only.has(it))continue;const tone=Math.min(it.tone,tm);
  if(it.type==='shape'){flush();n.shapes++;c.globalAlpha=1;c.beginPath();trace(c,it.poly);c.fillStyle=fill;c.fill();
   if(tone>=4){c.fillStyle=INK;c.fill();c.save();c.clip();c.beginPath();trace(c,it.poly,sx*1.3,sy*1.3);c.lineWidth=.7*weight;c.strokeStyle=fill;c.stroke();n.strokes++;c.restore();}
   else if(tone>=1){c.save();c.clip();hatch(it,it.A,it.sA,.42);if(tone>=2)hatch(it,it.B,it.sB,.38);if(tone>=3){c.beginPath();lines(c,it.C);c.lineWidth=.32*weight;c.stroke();n.strokes++;n.hatch+=it.C.length;}if(stage>=3&&tone>=2&&it.dots.length){c.beginPath();circles(c,it.dots);c.fillStyle=INK;c.fill();}c.restore();}
   c.beginPath();trace(c,it.poly);trace(c,it.poly,sx*.5,sy*.5);if(it.ribs)lines(c,it.ribs);c.lineWidth=(it.lvl?.75:1.1)*weight;c.strokeStyle=INK;c.stroke();n.strokes++;}
  else if(it.type==='lines'){if(it.clip){flush();c.save();c.beginPath();trace(c,it.clip);c.clip();use(it.w);lines(c,it.paths);flush();c.restore();}else{use(it.w);lines(c,it.paths);}}
  else if(it.type==='teeth'){flush();c.beginPath();for(const p of it.polys)trace(c,p);c.fillStyle=tone>=3?INK:fill;c.fill();if(tone<3){c.lineWidth=.55*weight;c.strokeStyle=INK;c.stroke();n.strokes++;}}
  else if(it.type==='eye'){flush();c.beginPath();circles(c,[[it.x,it.y,it.r]]);if(tone>=3||it.tone>=3){c.fillStyle=INK;c.fill();c.beginPath();circles(c,[[it.x-it.r*.35,it.y-it.r*.35,Math.max(.35,it.r*.3)]]);c.fillStyle=fill;c.fill();}else{c.fillStyle=fill;c.fill();c.lineWidth=.5*weight;c.strokeStyle=INK;c.stroke();n.strokes++;c.beginPath();circles(c,[[it.x,it.y,it.r*.38]]);c.fillStyle=INK;c.fill();}}
  else if(it.type==='water'){flush();c.beginPath();trace(c,it.cover);c.fillStyle=fill;c.fill();use(.45);lines(c,it.paths);n.hatch+=it.paths.length;}
  else if(it.type==='ground'){use(.8);lines(c,it.paths);if(stage>=3){use(.42);lines(c,it.tex);flush();c.save();c.beginPath();trace(c,it.shadow.poly);c.clip();use(.6);lines(c,it.shadow.paths);flush();c.restore();}}
  else if(it.type==='sky'){use(.34,INK,.9);lines(c,it.paths);n.hatch+=it.paths.length;if(it.polys.length){flush();c.globalAlpha=1;c.beginPath();for(const p of it.polys)trace(c,p);c.fillStyle=fill;c.fill();c.lineWidth=.8*weight;c.strokeStyle=INK;c.stroke();n.strokes++;}if(it.dots.length){flush();c.globalAlpha=1;c.beginPath();circles(c,it.dots);c.fillStyle=fill;c.fill();}}}
 flush();c.globalAlpha=1;
 // The watercolour of a treatise: the ground and the sky in one tone, the figure in another, glowing eyes (art.md 5.3).
 if(stage>=4){c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.2;c.fillStyle=cp.wash[1];c.fillRect(6,6,PW-12,PH-12);c.globalAlpha=.28;c.fillStyle=cp.wash[0];c.beginPath();for(const f of cp.figs)trace(c,f.poly);c.fill('nonzero');
  c.globalAlpha=.6;c.fillStyle=GLOW;c.beginPath();circles(c,cp.items.filter(it=>it?.type==='eye'&&it.glow).map(it=>[it.x,it.y,it.r*1.9]));c.fill();c.restore();}
 if(stage>=3)frame(c,stage>=4?GILT:INK,weight,n);
 return n;}
// The double rule of the plate with four corner flourishes; gilt on a treatise.
function frame(c,col,weight,n){c.globalAlpha=1;c.strokeStyle=col;c.lineWidth=1.2*weight;c.beginPath();c.rect(6,6,PW-12,PH-12);c.stroke();c.lineWidth=.5*weight;c.beginPath();c.rect(8.5,8.5,PW-17,PH-17);
 for(const [x,y,fx,fy] of[[8.5,8.5,1,1],[PW-8.5,8.5,-1,1],[8.5,PH-8.5,1,-1],[PW-8.5,PH-8.5,-1,-1]]){c.moveTo(x,y+10*fy);c.bezierCurveTo(x+6*fx,y+8*fy,x+2*fx,y+3*fy,x+6*fx,y+3*fy);c.moveTo(x+10*fx,y);c.bezierCurveTo(x+8*fx,y+6*fy,x+3*fx,y+2*fy,x+3*fx,y+6*fy);}c.stroke();n.strokes+=2;}
// An unknown monster: its figures of level 0 smudged in ink (art.md 5.4); the «?» over it is HTML.
export function drawSilhouette(c,id){const cp=compile(id);if(!cp)return;c.fillStyle='#5b4733';for(const [a,dx] of[[.3,1],[.9,0]]){c.globalAlpha=a;c.beginPath();for(const f of cp.figs)trace(c,f.poly,dx,dx*.5);c.fill('nonzero');}c.globalAlpha=1;}
const fillOf=(c,pap,k)=>{try{const p=c.createPattern(pap,'no-repeat');if(p&&p.setTransform&&typeof DOMMatrix==='function'){p.setTransform(new DOMMatrix([1/k,0,0,1/k,0,0]));return p;}}catch{}return PAPER;};
// A plate as a canvas of w×(w·2/3) css pixels at dpr (≤ 2); stage null is the silhouette.
export function renderPlate(id,stage,w,dpr=1,{weight=1}={}){w=Math.max(32,Math.round(w));dpr=Math.max(1,Math.min(2,dpr||1));const W=Math.round(w*dpr),H=Math.round(w*2/3*dpr),cv=mk(W,H),c=cv.getContext('2d'),pap=paper(W,H),k=W/PW;
 c.drawImage(pap,0,0);c.setTransform(k,0,0,H/PH,0,0);if(stage==null)drawSilhouette(c,id);else drawPlate(c,id,stage,{fill:fillOf(c,pap,k),weight});c.setTransform(1,0,0,1,0,0);return cv;}
// The caches (art.md 5.5): ten whole plates and twenty-eight thumbnails, the least recently used going first.
const plates=new Map(),thumbs=new Map();
function lru(map,key,limit,make){if(map.has(key)){const v=map.get(key);map.delete(key);map.set(key,v);return v;}const v=make();map.set(key,v);while(map.size>limit)map.delete(map.keys().next().value);return v;}
export const LIMITS={plates:10,thumbs:28};
export const plateKey=(id,stage,w,dpr)=>`${id}|${stage??'?'}|${Math.round(w)}|${Math.max(1,Math.min(2,dpr||1))}`;
export function plateCanvas(id,stage,w,dpr=1){return lru(plates,plateKey(id,stage,w,dpr),LIMITS.plates,()=>renderPlate(id,stage,w,dpr));}
export const hasPlate=(id,stage,w,dpr=1)=>plates.has(plateKey(id,stage,w,dpr));
// A thumbnail of 64×48 (drawn at 128×96): the plate cut to 4:3 from its middle, its lines a little heavier.
export function thumbURL(id,stage){return lru(thumbs,`${id}|${stage??'?'}`,LIMITS.thumbs,()=>{const big=renderPlate(id,stage,180,1,{weight:1.5}),t=mk(128,96),g=t.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const sw=big.height*4/3;g.drawImage(big,(big.width-sw)/2,0,sw,big.height,0,0,128,96);return t.toDataURL();});}
export const hasThumb=(id,stage)=>thumbs.has(`${id}|${stage??'?'}`);
export const cacheSizes=()=>({plates:plates.size,thumbs:thumbs.size});
// The new strokes of a stage drawn in over the old one (art.md 5.4): the boxes of what the new stage adds or darkens, in
// the order of drawing; a player paints the new plate through a clip that grows by 1/12 of them a frame.
export function revealBoxes(id,from,to){const cp=compile(id);if(!cp||from==null||to==null||to<=from)return [];const out=[];
 for(const it of cp.items){if(!it||it.lvl>LEVEL[to])continue;const was=it.lvl<=LEVEL[from]?Math.min(it.tone,TONE[from]):-1,now=Math.min(it.tone,TONE[to]);if(from>0&&was===now&&!(to>=3&&from<3&&(it.type==='ground'||it.type==='sky'||it.dots?.length)))continue;
  const b=it.box||(it.type==='sky'?[6,6,PW-6,PH*.75]:it.type==='ground'?[6,it.y-8,PW-6,PH-6]:it.type==='eye'?[it.x-it.r-1,it.y-it.r-1,it.x+it.r+1,it.y+it.r+1]:boxOf((it.paths||it.polys||[]).flat()));if(b[0]<b[2])out.push(b);}
 if(to>=3)out.push([0,0,PW,8],[0,PH-8,PW,PH],[0,0,8,PH],[PW-8,0,PW,PH]);if(to>=4)out.push([0,0,PW,PH]);return out;}
// The categories of a plate where its markers stand, in the field 240×160.
export const anchorsOf=id=>PLATES[id]?.anchors||null;
