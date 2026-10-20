// The engravings of the bestiary (GDD 11.5, art.md 5): brown-black ink on parchment, drawn from the primitives of
// plates.js. The light always falls from the upper left; a shadow is hatched in the crescent that is left when the figure,
// shifted toward the light, is cut out of itself, so no normal is ever computed. Every cut of the burin is a thin band
// that swells and tapers: a hatch line is full where the shadow is deep and comes to a point toward the light, the
// contour is a hairline on the lit side and swells on the shaded one. A page fills in with knowledge: stage 0 is a
// pencil sketch from hearsay, 1 the first contours and shadows, 2 fur, teeth and scales, 3 the whole plate with stipple,
// sky, ground and frame, 4 (a treatise) a watercolour wash and gilt. An unknown monster is a smudged silhouette.
// Geometry (outlines, crescents, bands, stipple) is pure, computed once per plate and checked in node; painting is a few
// fills per figure into an offscreen canvas, kept in an LRU cache by id, stage, width and dpr (10 plates, 28 thumbnails).
import {noise} from './pixel.js';
import {PLATES,PROPS} from './plates.js';
import {MONSTERS} from './content-data.js';
export const PW=240,PH=160,INK='#2b2018',PENCIL='#6e6250',PAPER='#e9dbb9',GILT='#b8893a',GLOW='#e8c04a';
export const KINDS=['ell','limb','poly','line','fur','spikes','scales','wing','hair','folds','eye','water','sky','moon','ground','prop'];
export const STAGES=['набросок со слов','первые штрихи','тени и шерсть','полная гравюра','трактат с подкраской'];
// What each stage shows: the deepest level of primitives and the darkest tone (art.md 5.4).
const LEVEL=[0,1,2,3,3],TONE=[0,1,3,4,4];
const WASH=new Map(MONSTERS.map(m=>[m.id,m.plate?.wash]));
const hashOf=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0)%99991;};
const nz=(a,b,s)=>noise(Math.round(a),Math.round(b),Math.round(s));
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
// Where the segment a→b runs inside a polygon (even-odd), as sorted intervals of its parameter in [0, 1]; out says that a
// is known to lie outside (a hatch line starts beyond the box of its figure), which spares the test of the first point.
export function runs(a,b,poly,out=false){const dx=b[0]-a[0],dy=b[1]-a[1],ts=[];for(let i=0,j=poly.length-1;i<poly.length;j=i++){const x1=poly[j][0],y1=poly[j][1],ex=poly[i][0]-x1,ey=poly[i][1]-y1,den=dx*ey-dy*ex;if(den>-1e-12&&den<1e-12)continue;
  const t=((x1-a[0])*ey-(y1-a[1])*ex)/den;if(t<0||t>1)continue;const u=((x1-a[0])*dy-(y1-a[1])*dx)/den;if(u>=0&&u<1)ts.push(t);}
 ts.sort((p,q)=>p-q);let ins=out?false:inside(poly,a[0],a[1]),s=0;const res=[];for(const t of ts){if(ins){if(t-s>1e-9)res.push([s,t]);ins=false;}else{s=t;ins=true;}}if(ins&&1-s>1e-9)res.push([s,1]);return res;}
// The intervals of R not covered by Q; an end cut by Q is soft (it meets the light), the ends of R are hard.
function minus(R,Q){const out=[];for(const [a,b] of R){let parts=[{a,b,sa:0,sb:0}];for(const [c,d] of Q){const next=[];for(const p of parts){if(d<=p.a||c>=p.b){next.push(p);continue;}if(c>p.a)next.push({a:p.a,b:c,sa:p.sa,sb:1});if(d<p.b)next.push({a:d,b:p.b,sa:1,sb:p.sb});}parts=next;}for(const p of parts)out.push({...p,lo:a,hi:b});}return out;}
const unit=(x,y)=>{const l=Math.hypot(x,y)||1;return [x/l,y/l];};
const normals=sp=>sp.map((_,i)=>{const a=sp[Math.max(0,i-1)],b=sp[Math.min(sp.length-1,i+1)];const [ux,uy]=unit(b[0]-a[0],b[1]-a[1]);return [-uy,ux,ux,uy];});
const areaOf=p=>{let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return a/2;};
const perimOf=p=>{let l=0;for(let i=0,j=p.length-1;i<p.length;j=i++)l+=Math.hypot(p[i][0]-p[j][0],p[i][1]-p[j][1]);return l;};
// The main axis of a figure (the angle of its longest spread) and how elongated it is, from the moments of its outline.
function axisOf(p){let cx=0,cy=0;for(const [x,y] of p){cx+=x;cy+=y;}cx/=p.length;cy/=p.length;let xx=0,yy=0,xy=0;for(const [x,y] of p){xx+=(x-cx)**2;yy+=(y-cy)**2;xy+=(x-cx)*(y-cy);}
 const tr=xx+yy,det=xx*yy-xy*xy,l1=tr/2+Math.sqrt(Math.max(0,tr*tr/4-det)),l2=tr/2-Math.sqrt(Math.max(0,tr*tr/4-det));return {cx,cy,angle:Math.atan2(l1-xx,xy||1e-9)*180/Math.PI,ratio:Math.sqrt(l1/Math.max(1e-6,l2))};}
// A cut of the burin: a path filled as a thin band whose width follows wf(u) along it (0 at a pointed end). Flat [x,y,…].
export function band(path,wf){const n=path.length;if(n<2)return null;const len=[0];for(let i=1;i<n;i++)len.push(len[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));const L=len[n-1];if(!(L>.25))return null;
 const left=[],right=[];for(let i=0;i<n;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(n-1,i+1)],[ux,uy]=unit(b[0]-a[0],b[1]-a[1]),h=Math.max(0,wf(len[i]/L))/2;left.push(path[i][0]-uy*h,path[i][1]+ux*h);right.push(path[i][0]+uy*h,path[i][1]-ux*h);}
 for(let i=n-1;i>=0;i--)left.push(right[2*i],right[2*i+1]);return left;}
const lens=(W,p=.6)=>u=>W*Math.pow(Math.max(0,Math.sin(Math.PI*u)),p);
const root=(W,p=.8)=>u=>W*Math.pow(1-u,p);
const bands=(paths,wf)=>paths.map(p=>band(p,wf)).filter(Boolean);
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
// A shaggy edge ('j3' in the flags of a poly or a limb): the outline broken into tufts that lean along it, each a short
// curve out and a quick return, as an engraver cuts fur at the edge of a form.
function shag(poly,amt,seed){const a=areaOf(poly),sg=a>0?1:-1,n=poly.length,out=[];
 for(let i=0;i<n;i++){const p=poly[i],q=poly[(i+1)%n],[tx,ty]=unit(q[0]-p[0],q[1]-p[1]),ox=sg*ty,oy=-sg*tx,l=Math.hypot(q[0]-p[0],q[1]-p[1]);out.push(p);if(l<1.2)continue;
  const tufts=Math.max(1,Math.round(l/3.2));for(let k=0;k<tufts;k++){const u=(k+.62)/tufts,h=amt*(.55+.7*nz(i*7+k,21,seed)),bx=p[0]+(q[0]-p[0])*u,by=p[1]+(q[1]-p[1])*u,back=Math.min(l/tufts*.55,2.2);
   out.push([bx+ox*h+tx*h*.55,by+oy*h+ty*h*.55],[bx+tx*back*.2-ox*h*.08,by+ty*back*.2-oy*h*.08]);}}
 return out;}
const jag=fl=>{const m=/j(\d+(?:\.\d+)?)/.exec(String(fl||''));return m?+m[1]:0;};
const refOf=s=>s[0]==='scales'||s[0]==='folds'?s[3]:null;
const closedKind=s=>s[0]==='ell'||s[0]==='limb'||s[0]==='wing'||s[0]==='poly'&&!String(s[4]||'').includes('o');
// The primitives of a plate with its props unfolded; a reference (-1 = the closed figure just before) becomes an index.
export function expand(shapes){const out=[],map=[];shapes.forEach((s,i)=>{if(s[0]==='prop'){const [,lvl,tone,name,x,y,k=1]=s,local=[];let last=out.length-1;
  for(const [j,c] of (PROPS[name]||[]).entries()){const t=place(c,x,y,k);t[1]=lvl;t[2]=Math.max(0,Math.min(4,t[2]+(tone-1)));if(t[0]==='line')t[2]=c[2];const r=refOf(t);local.push(out.length);out.push({s:t,ref:r==null?null:local[j+r]});if(closedKind(t))last=out.length-1;}map[i]=last;}
 else{const r=refOf(s);out.push({s,ref:r==null?null:map[i+r]});map[i]=closedKind(s)?out.length-1:map[i-1]??out.length-1;}});return out;}
const along=(sp,n,fn)=>{const len=[0];for(let i=1;i<sp.length;i++)len.push(len[i-1]+Math.hypot(sp[i][0]-sp[i-1][0],sp[i][1]-sp[i-1][1]));const total=len.at(-1)||1,nm=normals(sp);
 for(let i=0;i<n;i++){const at=(i+.5)/n*total;let j=1;while(j<sp.length-1&&len[j]<at)j++;const u=(at-len[j-1])/((len[j]-len[j-1])||1),p=[sp[j-1][0]+(sp[j][0]-sp[j-1][0])*u,sp[j-1][1]+(sp[j][1]-sp[j-1][1])*u];fn(p,nm[j],i);}};
const wave=(x0,x1,y,amp,seed,step=4)=>{const p=[];for(let x=x0;x<=x1+.01;x+=step)p.push([x,y+amp*Math.sin(x*.21+seed)*(.6+.4*nz(x,y,seed))]);return p;};
// The burin across a figure: lines of a set inside the polygon, minus the polygon shifted toward the light by s (the
// crescent), each a band that is full at the shadowed edge and comes to a point where it meets the light, running a
// little on into it by chance (feather); bowed toward the middle of the figure so it seems to wrap the form.
function cuts(it,angle,spacing,shift,W,seed,{bow=.04,feather=.45,taper=.62,over=null,dots=null}={}){const P=it.poly,[sx,sy]=it.sh,Q=shift?P.map(([x,y])=>[x-sx*shift,y-sy*shift]):null,[x0,y0,x1,y1]=it.box,m=shift+1.5,out=[];
 for(const [s,,e] of hatchLines([x0-m,y0-m,x1+m,y1+m],angle,spacing,nz(it.src,angle,seed)*spacing,{seed,jitter:0})){const len=Math.hypot(e[0]-s[0],e[1]-s[1]),R=runs(s,e,P,true);if(!R.length)continue;const pieces=Q?minus(R,runs(s,e,Q,true)):R.map(([a,b])=>({a,b,sa:1,sb:1,lo:a,hi:b}));
  pieces.forEach((p,k)=>{const f=feather*shift/len*(.25+.75*nz(k*13+p.a*97,5,seed));let a=p.sa&&Q?Math.max(p.lo,p.a-f):p.a,b=p.sb&&Q?Math.min(p.hi,p.b+f):p.b;if((b-a)*len<1.1)return;
   const A=[s[0]+(e[0]-s[0])*a,s[1]+(e[1]-s[1])*a],B=[s[0]+(e[0]-s[0])*b,s[1]+(e[1]-s[1])*b],mid=[(A[0]+B[0])/2,(A[1]+B[1])/2],[nx,ny]=unit(-(B[1]-A[1]),B[0]-A[0]),sg=Math.sign(nx*(it.cx-mid[0])+ny*(it.cy-mid[1]))||1,l=(b-a)*len,off=sg*bow*l,pts=[];
   for(let j=0;j<=4;j++){const u=j/4;pts.push([A[0]+(B[0]-A[0])*u+nx*off*4*u*(1-u),A[1]+(B[1]-A[1])*u+ny*off*4*u*(1-u)]);}
   const sa=Q?p.sa:1,sb=Q?p.sb:1,wf=over||(sa&&sb?lens(W,.55):sa?u=>W*Math.pow(Math.min(1,u/taper),.7):u=>W*Math.pow(Math.min(1,(1-u)/taper),.7));const r=band(pts,wf);if(r)out.push(r);
   // Stipple where the cut gives out: a few dots further on into the light, still inside the figure (art.md 5.3 step 4).
   if(dots&&Q)for(const [soft,t0,dir,lim] of[[p.sa,a,-1,p.lo],[p.sb,b,1,p.hi]]){if(!soft)continue;for(let q=0;q<3;q++){const t=t0+dir*(.7+q*1.1+nz(k*7+q,t0*131,seed)*1.2)/len;if(dir<0?t<=lim:t>=lim)break;if(nz(k*5+q,t0*71,seed)<.25+q*.2)continue;dots.push([s[0]+(e[0]-s[0])*t,s[1]+(e[1]-s[1])*t,(.3+nz(q,k,seed)*.24)*W/.62]);}}});}
 return out;}
// The contour of a figure swells on its shaded side: the outline pushed out along its normals by as much as it faces
// away from the light; the ink between the two is left when the figure is filled with paper over it.
function swellOf(poly,sh,amt){const sg=areaOf(poly)>0?1:-1,n=poly.length;return poly.map((p,i)=>{const a=poly[(i+n-1)%n],b=poly[(i+1)%n],[tx,ty]=unit(b[0]-a[0],b[1]-a[1]),nx=sg*ty,ny=-sg*tx,d=Math.max(0,nx*sh[0]+ny*sh[1]),o=amt*Math.pow(d,.8);return [p[0]+nx*o,p[1]+ny*o];});}
// Everything of a plate that does not depend on its size: outlines, crescents, bands of fur, sky and water. weight
// thickens every cut (a thumbnail is drawn small and reduced, so its lines must be heavier to survive).
const compiled=new Map();
export function compile(id,weight=1){const key=id+'|'+weight;if(compiled.has(key))return compiled.get(key);const P=PLATES[id];if(!P)return null;const seed=hashOf(id),[lx,ly]=unit(...(P.light||[-1,-1])),sh=[-lx,-ly],prims=expand(P.shapes),items=[],moons=[],k=weight;
 const shape=(poly,s,n,extra={})=>({type:'shape',lvl:s[1],tone:s[2],poly,box:boxOf(poly),src:n,...extra});
 prims.forEach(({s,ref},n)=>{const [kind,lvl,tone,...d]=s,sd=seed+n*13;let it=null;
  if(kind==='ell')it=shape(ellPts(...d.slice(0,5)),s,n,{round:1});
  else if(kind==='limb'){const j=jag(d[1]);it=shape(j?shag(limbPts(d[0]),j,sd):limbPts(d[0]),s,n,{round:1,limb:1});}
  else if(kind==='poly'){const fl=String(d[1]||''),open=fl.includes('o'),j=jag(fl);let p=parsePts(d[0]);if(fl.includes('s'))p=spline(p,!open,6);it=open?{type:'lines',lvl,tone,rib:bands([p],lens((.55+tone*.14)*k,.5))}:shape(j?shag(p,j,sd):p,s,n);}
  else if(kind==='line')it={type:'lines',lvl,tone:0,rib:bands([spline(parsePts(d[0]),false,6)],lens(tone*k,.45))};
  else if(kind==='wing'){const w=wingPts(d[0],d[1]);it=shape(w.poly,s,n,{ribs:bands(w.ribs.map(r=>spline(r,false,4)),u=>(1.1-.8*u)*k)});}
  else if(kind==='fur'){const [p,cnt,len,side=1]=d,sp=spline(parsePts(p),false,6),paths=[];along(sp,cnt,(q,[nx,ny,tx,ty],i)=>{const l=len*(i%2?.6:1)*(.85+.3*nz(i,5,sd)),dx=nx*side*.62+tx*.78,dy=ny*side*.62+ty*.78;paths.push([q,[q[0]+dx*l*.5-tx*l*.12,q[1]+dy*l*.5-ty*l*.12],[q[0]+dx*l,q[1]+dy*l]]);});it={type:'lines',lvl,tone,rib:bands(paths.map(p=>spline(p,false,3)),root((.62+tone*.12)*k,.9))};}
  else if(kind==='spikes'){const [a,b]=parsePts(d[0]),cnt=d[1],len=d[2],[ux,uy]=unit(b[0]-a[0],b[1]-a[1]),polys=[];for(let i=0;i<cnt;i++){const p=[a[0]+(b[0]-a[0])*i/cnt,a[1]+(b[1]-a[1])*i/cnt],q=[a[0]+(b[0]-a[0])*(i+1)/cnt,a[1]+(b[1]-a[1])*(i+1)/cnt],m=[(p[0]+q[0])/2,(p[1]+q[1])/2],l=len*(.8+.4*nz(i,9,sd));polys.push([p,[m[0]-uy*l+ux*l*.18,m[1]+ux*l+uy*l*.18],q]);}it={type:'teeth',lvl,tone,polys,box:boxOf(polys.flat())};}
  else if(kind==='scales'||kind==='folds'){const host=items[ref];if(!host||host.type!=='shape')return items.push(null);const [x0,y0,x1,y1]=host.box,paths=[];
   if(kind==='scales'){const r=d[1];for(let y=y0,row=0;y<y1+r;y+=r*1.15,row++)for(let x=x0-(row%2)*r;x<x1+r;x+=2*r){const a=[];for(let q=0;q<=6;q++){const t=q/6*Math.PI;a.push([x+Math.cos(t)*r,y+Math.sin(t)*r*.8]);}if(a.some(([u,v])=>inside(host.poly,u,v)))paths.push(a);}}
   else{const cnt=d[1],cx=(x0+x1)/2;for(let i=1;i<=cnt;i++){const x=x0+(x1-x0)*i/(cnt+1),top=[cx+(x-cx)*.35,y0+1],bot=[x+(nz(i,4,sd)-.5)*4,y1];paths.push(spline([top,[(top[0]+bot[0])/2+(nz(i,6,sd)-.5)*5,(top[1]+bot[1])/2],bot],false,4));}}
   it={type:'lines',lvl,tone,rib:bands(paths,kind==='scales'?lens(.62*k,.5):u=>(.75-.55*u)*k),clip:host.poly};}
  else if(kind==='hair'){const [p,cnt,spread,wv=1.5]=d,sp=spline(parsePts(p),false,6),nm=normals(sp),paths=[];for(let i=0;i<cnt;i++){const o=spread*(cnt>1?i/(cnt-1)*2-1:0),end=Math.max(3,Math.round(sp.length*(.62+.38*nz(i,2,sd)))),path=[];
    for(let j=0;j<end;j++){const u=j/(sp.length-1),w=(nz(i*31+j,8,sd)-.5)*2*wv*u;path.push([sp[j][0]+nm[j][0]*(o*(.35+.65*u)+w),sp[j][1]+nm[j][1]*(o*(.35+.65*u)+w)]);}paths.push(path);}
   it={type:'lines',lvl,tone,rib:bands(paths,u=>(.5+tone*.12)*k*Math.pow(Math.max(0,1-u),.6)*Math.min(1,.4+u*4))};}
  else if(kind==='eye')it={type:'eye',lvl,tone,x:d[0],y:d[1],r:d[2],glow:d[3]||0};
  else if(kind==='water'){const [y0,y1,amp,x0=7,x1=233]=d,top=wave(x0,x1,y0,amp,sd),paths=[];let gap=5.5,row=0;for(let y=y0;y<=y1;y+=gap,gap=Math.max(2,gap*.86),row++){const line=wave(x0,x1,y,amp*(1-.3*row/12),sd+row*3,3);let seg=[];line.forEach((q,j)=>{if(nz(j,row,sd)<.1&&seg.length>2){paths.push(seg);seg=[];}else seg.push(q);});if(seg.length>2)paths.push(seg);}
   it={type:'water',lvl,tone,cover:[...top,[x1,y1+2],[x0,y1+2]],rib:paths.map((p,i)=>band(p,lens((.42+.3*Math.min(1,i/14))*k,.4))).filter(Boolean)};}
  else if(kind==='moon'){const [x,y,r,phase='full']=d;let poly;if(phase==='full')poly=ellPts(x,y,r,r);else{const sg=phase==='wane'?-1:1,o=[];for(let q=0;q<=18;q++){const t=-Math.PI/2+q/18*Math.PI;o.push([x+sg*Math.cos(t)*r,y+Math.sin(t)*r]);}for(let q=17;q>0;q--){const t=-Math.PI/2+q/18*Math.PI;o.push([x+sg*Math.cos(t)*r*.35,y+Math.sin(t)*r*.92]);}poly=o;}moons.push([x,y,r]);it=shape(poly,s,n,{moon:1});}
  else if(kind==='ground'){const [y,tufts=6,cx,rx]=d,line=wave(8,232,y,.5,sd,6),grass=[];for(let i=0;i<tufts;i++){const x=14+nz(i,1,sd)*212,h=3+nz(i,2,sd)*4;for(let j=-2;j<=2;j++)grass.push([[x+j*.8,y+.3],[x+j*1.2+(j*.3),y-h*.55*(1-Math.abs(j)*.18)],[x+j*1.7,y-h*(1-Math.abs(j)*.18)]]);}
   it={type:'ground',lvl,tone,line:band(line,u=>(1.05-.25*Math.sin(u*9))*k),grass:bands(grass,root(.62*k,.7)),y,cx,rx,sd};}
  else if(kind==='sky')it={type:'sky',lvl,tone,sky:d[0],at:d.slice(1),sd};
  items.push(it);});
 // The ground shadow lies under the figure: by default the width of the figures of level 0 above the ground; under it
 // the ground itself is cut in short level strokes, thick near the figure and thinning toward the edges of the plate.
 const figs=items.filter(it=>it?.type==='shape'&&it.lvl===0&&!it.moon);
 for(const it of items.filter(it=>it?.type==='ground')){const b=boxOf(figs.flatMap(f=>f.poly)),cx=it.cx??(b[0]+b[2])/2,rx=it.rx??Math.max(20,(b[2]-b[0])*.42),ry=Math.max(2.2,rx*.09),y=it.y,tex=[],shadow=[];
  for(let row=0,yy=y+2.2;yy<PH-7.5;row++,yy+=1.9+row*.45)for(let i=0;i<9;i++){const x=10+nz(i*5+row,3,it.sd)*218,l=(5+nz(i,row+5,it.sd)*16)*(1-row*.07),near=Math.max(0,1-Math.abs(x-cx)/(rx*2.6));if(l<2||nz(i,row+9,it.sd)>.35+.6*near)continue;tex.push(band([[x,yy],[x+l/2,yy+(nz(i,row,it.sd)-.5)*.6],[x+l,yy]],lens((.38+.3*near)*k,.6)));}
  for(let yy=y-ry+.9;yy<y+ry*1.6;yy+=1.05){const dy=(yy-y-ry*.3)/(ry*1.3),half=rx*Math.sqrt(Math.max(0,1-dy*dy));if(half<2)continue;const j=(nz(Math.round(yy*10),2,it.sd)-.5)*rx*.15;shadow.push(band([[cx-half+j,yy],[cx+j*.5,yy],[cx+half*.94+j,yy]],lens(.55*k,.35)));}
  it.tex=tex.filter(Boolean);it.shadow=shadow.filter(Boolean);it.box=[6,y-8,PW-6,PH-6];}
 for(const it of items.filter(it=>it?.type==='sky'))skyLines(it,moons,k);
 for(const it of items)if(it?.type==='shape')shade(it,seed,sh,k);
 const cp={id,items,sh,wash:WASH.get(id)||P.wash||['#7d6650','#9aa36b'],anchors:P.anchors,figs};compiled.set(key,cp);return cp;}
// The hatching of a figure (art.md 5.3): a crescent following its form (tone 1), a narrower crossing crescent (tone 2), a
// light tone over the whole figure (tone 3); stipple at the edge of the shadow for stage 3; the swell of the contour.
function shade(it,seed,sh,k){const ax=axisOf(it.poly),[x0,y0,x1,y1]=it.box,w=x1-x0,h=y1-y0,thick=Math.max(1,Math.min(Math.min(w,h),2*Math.abs(areaOf(it.poly))/Math.max(1,perimOf(it.poly)))),sd=seed+it.src*17;
 Object.assign(it,{cx:ax.cx,cy:ax.cy,sh});it.sA=Math.max(1.4,thick*.62);it.sB=Math.max(1,thick*.3);
 // Long forms (limbs, tails, necks) are cut across, so the lines go round them; round ones at the diagonal of the light.
 const across=ax.ratio>1.9?ax.angle+90:-45,a=across+(nz(it.src,1,seed)-.5)*14,small=thick<5,step=small?1.55:1.85;
 const dots=[];it.A=cuts(it,a,step,it.sA,(small?.5:.62)*k,sd,{bow:it.round?.07:.03,dots:thick>3?dots:null});
 it.B=cuts(it,a+58+(nz(it.src,3,seed)-.5)*10,step*1.15,it.sB,.5*k,sd+1,{bow:it.round?-.05:0,feather:.3});
 it.C=cuts(it,a-28,3.1,0,.34*k,sd+2,{bow:.02,over:lens(.34*k,.5)});
 it.dots=dots;it.swell=thick>2.2&&!it.moon?swellOf(it.poly,sh,(it.lvl?.75:1.05)*k*Math.min(1,thick/6+.4)):null;}
// The sky: night is level cuts over the upper 60 %, closer and heavier toward the top, broken around the moon and by the
// odd cloud; a sun has wedge rays (and a face), a storm is a soot sky with dots of snow, mist a few long broken lines,
// dusk a low half sun over level lines.
function skyLines(it,moons,k){const rib=[],polys=[],dots=[],sd=it.sd,cut=(y,x0,x1,holes)=>{let segs=[[x0,x1,0,0]];for(const [hx,hy,hr] of holes){const dy=y-hy;if(Math.abs(dy)>=hr)continue;const dx=Math.sqrt(hr*hr-dy*dy);segs=segs.flatMap(([a,b,ta,tb])=>hx-dx>b||hx+dx<a?[[a,b,ta,tb]]:[[a,hx-dx,ta,1],[hx+dx,b,1,tb]].filter(([p,q])=>q-p>2));}return segs;};
 const level=(y0,y1,step0,step1,holes=[],skip=.05,w0=.52,w1=.24)=>{let row=0;for(let y=y0;y<=y1;row++){const u=(y-y0)/Math.max(1,y1-y0),clouds=[];for(let c=0;c<2;c++){const cx=20+nz(row>>2,c+40,sd)*200,cw=10+nz(row>>3,c+44,sd)*40;if(nz(row,c+50,sd)<.22+u*.5)clouds.push([cx-cw/2,cx+cw/2]);}
   for(const [a0,b0,ta,tb] of cut(y,9.5,230.5,holes))for(const [a,b,sa,sb] of clouds.reduce((segs,[c0,c1])=>segs.flatMap(([a,b,sa,sb])=>c1<a||c0>b?[[a,b,sa,sb]]:[[a,c0,sa,1],[c1,b,1,sb]].filter(([p,q])=>q-p>3)),[[a0,b0,ta,tb]])){if(nz(row,Math.round(a),sd)<skip)continue;
    const W=(w0+(w1-w0)*u)*k,wv=(nz(row,1,sd)-.5)*.7,pts=[];for(let j=0;j<=6;j++){const v=j/6;pts.push([a+(b-a)*v,y+wv*Math.sin(v*Math.PI)]);}const r=band(pts,v=>W*Math.min(1,sa?Math.pow(v/.2,.7):1,sb?Math.pow((1-v)/.2,.7):1));if(r)rib.push(r);}
   y+=step0+(step1-step0)*u;}};
 const holes=moons.map(([x,y,r])=>[x,y,r+4]);
 if(it.sky==='night')level(10.5,98,1.9,3.6,holes);
 else if(it.sky==='storm'){level(10.5,116,1.6,2.6,holes,.02,.62,.4);for(let i=0;i<170;i++)dots.push([10+nz(i,1,sd)*220,10+nz(i,2,sd)*136,(.45+nz(i,3,sd)*.55)*k]);for(let i=0;i<18;i++){const x=10+nz(i,4,sd)*196,y=12+nz(i,5,sd)*120;rib.push(band([[x,y],[x+14,y+3],[x+30,y+5]],lens(.55*k,.6)));}}
 else if(it.sky==='mist'){for(let y=30,row=0;y<146;y+=6.5,row++){let x=10+nz(row,1,sd)*30;while(x<220){const l=20+nz(row,Math.round(x),sd)*50,b=Math.min(230,x+l),pts=[];for(let j=0;j<=4;j++)pts.push([x+(b-x)*j/4,y+(nz(row,j,sd)-.5)*.8]);rib.push(band(pts,lens(.42*k,.7)));x+=l+12+nz(row,Math.round(x)+1,sd)*30;}}}
 else if(it.sky==='sun'||it.sky==='dusk'){const [x,y,r]=it.at.length?it.at:[200,34,12],low=it.sky==='dusk';level(10.5,low?y:72,low?1.9:2.4,low?3:4.2,[[x,y,r*2.1]],.08);
  const disk=low?(()=>{const o=[];for(let q=0;q<=18;q++){const t=Math.PI+q/18*Math.PI;o.push([x+Math.cos(t)*r,y+Math.sin(t)*r]);}return o;})():ellPts(x,y,r,r);polys.push(disk);
  const rays=low?11:16;for(let i=0;i<rays;i++){const t=low?Math.PI+(i+.5)/rays*Math.PI:i/rays*2*Math.PI,l=r*(i%2?1.45:1.9),wd=.09;polys.push([[x+Math.cos(t-wd)*r*1.15,y+Math.sin(t-wd)*r*1.15],[x+Math.cos(t)*l,y+Math.sin(t)*l],[x+Math.cos(t+wd)*r*1.15,y+Math.sin(t+wd)*r*1.15]]);}
  if(!low&&it.at[3]){const e=r*.3;for(const p of[[[x-e*1.5,y-e*.5],[x-e,y-e*.8],[x-e*.4,y-e*.5]],[[x+e*.4,y-e*.5],[x+e,y-e*.8],[x+e*1.5,y-e*.5]],[[x,y-e*.2],[x+e*.2,y+e*.6],[x-e*.1,y+e*.8]],[[x-e*1.2,y+e*1.4],[x,y+e*1.8],[x+e*1.2,y+e*1.4]]])rib.push(band(spline(p,false,3),lens(.7*k,.5)));}}
 it.rib=rib.filter(Boolean);it.polys=polys;it.dots=dots;}
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
const flat=(c,list)=>{for(const r of list){c.moveTo(r[0],r[1]);for(let i=2;i<r.length;i+=2)c.lineTo(r[i],r[i+1]);c.closePath();}};
const circles=(c,list)=>{for(const [x,y,r] of list){c.moveTo(x+r,y);c.arc(x,y,r,0,2*Math.PI);}};
// Paints a plate at a stage on a context already scaled to the field 240×160. fill is what hides what lies behind a
// figure (a pattern of the paper, or its colour). weight thickens the cuts of small copies; only (a set of items) paints
// just those, for the new strokes of a stage. Returns the number of stroke and fill calls, cuts and figures (art.md 5.5).
export function drawPlate(c,id,stage=3,{fill=PAPER,weight=1,only=null}={}){const cp=compile(id,weight);if(!cp)return null;const lv=LEVEL[stage],tm=TONE[stage],[sx,sy]=cp.sh,n={strokes:0,fills:0,hatch:0,shapes:0};
 c.lineCap=c.lineJoin='round';c.globalAlpha=1;
 const ink=(list,col=INK)=>{if(!list?.length)return;c.beginPath();flat(c,list);c.fillStyle=col;c.fill();n.fills++;n.hatch+=list.length;};
 if(stage===0){c.beginPath();for(const it of cp.items){if(!it||it.lvl>0)continue;if(it.type==='shape'){trace(c,it.poly,.5,-.4);trace(c,it.poly,-.5,.4);}else if(it.type==='eye')circles(c,[[it.x,it.y,it.r]]);}c.lineWidth=.75*weight;c.strokeStyle=PENCIL;c.globalAlpha=.8;c.stroke();n.strokes++;
  c.beginPath();for(const it of cp.items)if(it&&!it.lvl&&(it.type==='lines'||it.type==='ground'))flat(c,it.type==='ground'?[it.line]:it.rib);c.fillStyle=PENCIL;c.fill();n.fills++;c.globalAlpha=1;return n;}
 for(const it of cp.items){if(!it||it.lvl>lv||only&&!only.has(it))continue;const tone=Math.min(it.tone,tm);
  if(it.type==='shape'){n.shapes++;if(it.swell&&tone<4){c.beginPath();trace(c,it.swell);c.fillStyle=INK;c.fill();n.fills++;}c.beginPath();trace(c,it.poly);c.fillStyle=fill;c.fill();n.fills++;
   if(tone>=4){c.fillStyle=INK;c.fill();c.save();c.clip();c.beginPath();trace(c,it.poly,sx*1.3,sy*1.3);c.lineWidth=.8*weight;c.strokeStyle=fill;c.stroke();n.strokes++;c.restore();}
   else if(tone>=1){const sets=[it.A,...tone>=2?[it.B]:[],...tone>=3?[it.C]:[]];ink(sets.flat());if(stage>=3&&tone>=2&&it.dots.length){c.beginPath();circles(c,it.dots);c.fillStyle=INK;c.fill();n.fills++;}}
   c.beginPath();trace(c,it.poly);c.lineWidth=(it.lvl?.42:.5)*weight;c.strokeStyle=INK;c.stroke();n.strokes++;if(it.ribs)ink(it.ribs);}
  else if(it.type==='lines'){if(it.clip){c.save();c.beginPath();trace(c,it.clip);c.clip();ink(it.rib);c.restore();}else ink(it.rib);}
  else if(it.type==='teeth'){c.beginPath();for(const p of it.polys)trace(c,p);c.fillStyle=tone>=3?INK:fill;c.fill();n.fills++;if(tone<3){c.lineWidth=.45*weight;c.strokeStyle=INK;c.stroke();n.strokes++;}}
  else if(it.type==='eye'){c.beginPath();circles(c,[[it.x,it.y,it.r]]);if(tone>=3||it.tone>=3){c.fillStyle=INK;c.fill();c.beginPath();circles(c,[[it.x-it.r*.35,it.y-it.r*.35,Math.max(.35,it.r*.3)]]);c.fillStyle=fill;c.fill();n.fills+=2;}else{c.fillStyle=fill;c.fill();c.lineWidth=.45*weight;c.strokeStyle=INK;c.stroke();n.strokes++;c.beginPath();circles(c,[[it.x,it.y,it.r*.38]]);c.fillStyle=INK;c.fill();n.fills+=2;}}
  else if(it.type==='water'){c.beginPath();trace(c,it.cover);c.fillStyle=fill;c.fill();n.fills++;ink(it.rib);}
  else if(it.type==='ground'){ink([it.line,...it.grass]);if(stage>=3){ink(it.tex);ink(it.shadow);}}
  else if(it.type==='sky'){c.globalAlpha=.92;ink(it.rib);c.globalAlpha=1;if(it.polys.length){c.beginPath();for(const p of it.polys)trace(c,p);c.fillStyle=fill;c.fill();c.lineWidth=.6*weight;c.strokeStyle=INK;c.stroke();n.strokes++;n.fills++;}if(it.dots.length){c.beginPath();circles(c,it.dots);c.fillStyle=fill;c.fill();n.fills++;}}}
 c.globalAlpha=1;
 // The watercolour of a treatise: the ground and the sky in one tone, the figure in another, glowing eyes (art.md 5.3).
 if(stage>=4){c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.2;c.fillStyle=cp.wash[1];c.fillRect(6,6,PW-12,PH-12);c.globalAlpha=.3;c.fillStyle=cp.wash[0];c.beginPath();for(const f of cp.figs)trace(c,f.poly);c.fill('nonzero');
  c.globalAlpha=.6;c.fillStyle=GLOW;c.beginPath();circles(c,cp.items.filter(it=>it?.type==='eye'&&it.glow).map(it=>[it.x,it.y,it.r*1.9]));c.fill();c.restore();n.fills+=3;}
 if(stage>=3&&!only)frame(c,stage>=4?GILT:INK,weight,n);
 return n;}
// The double rule of the plate with four corner flourishes; gilt on a treatise.
function frame(c,col,weight,n){c.globalAlpha=1;c.strokeStyle=col;c.lineWidth=1.2*weight;c.beginPath();c.rect(6,6,PW-12,PH-12);c.stroke();c.lineWidth=.45*weight;c.beginPath();c.rect(8.5,8.5,PW-17,PH-17);
 for(const [x,y,fx,fy] of[[8.5,8.5,1,1],[PW-8.5,8.5,-1,1],[8.5,PH-8.5,1,-1],[PW-8.5,PH-8.5,-1,-1]]){c.moveTo(x,y+10*fy);c.bezierCurveTo(x+6*fx,y+8*fy,x+2*fx,y+3*fy,x+6*fx,y+3*fy);c.moveTo(x+10*fx,y);c.bezierCurveTo(x+8*fx,y+6*fy,x+3*fx,y+2*fy,x+3*fx,y+6*fy);}c.stroke();n.strokes+=2;}
// An unknown monster: its figures of level 0 smudged in ink (art.md 5.4); the «?» over it is HTML.
export function drawSilhouette(c,id){const cp=compile(id);if(!cp)return;c.fillStyle='#5b4733';for(const [a,dx] of[[.3,1],[.9,0]]){c.globalAlpha=a;c.beginPath();for(const f of cp.figs)trace(c,f.poly,dx,dx*.5);c.fill('nonzero');}c.globalAlpha=1;}
const fillOf=(c,pap,k)=>{try{const p=c.createPattern(pap,'no-repeat');if(p&&p.setTransform&&typeof DOMMatrix==='function'){p.setTransform(new DOMMatrix([1/k,0,0,1/k,0,0]));return p;}}catch{}return PAPER;};
// A plate as a canvas of w×(w·2/3) css pixels at dpr (≤ 2); stage null is the silhouette.
export function renderPlate(id,stage,w,dpr=1,{weight=1}={}){w=Math.max(32,Math.round(w));dpr=Math.max(1,Math.min(2,dpr||1));const W=Math.round(w*dpr),H=Math.round(w*2/3*dpr),cv=mk(W,H),c=cv.getContext('2d'),pap=paper(W,H),k=W/PW;
 c.drawImage(pap,0,0);c.setTransform(k,0,0,H/PH,0,0);if(stage==null)drawSilhouette(c,id);else drawPlate(c,id,stage,{fill:fillOf(c,pap,k),weight});c.setTransform(1,0,0,1,0,0);return cv;}
// The new strokes of a stage drawn in over the old one (art.md 5.4): the items a new stage adds or darkens, in the order
// of drawing. A player paints them over the old plate, 1/12 of the list a frame (0.6 s at 20 fps), then the whole new
// plate once, so nothing is left half done.
export function revealItems(id,from,to){const cp=compile(id);if(!cp||from==null||to==null||to<=from)return [];
 return cp.items.filter(it=>{if(!it||it.lvl>LEVEL[to])return false;if(from===0||it.lvl>LEVEL[from])return true;if(to>=3&&from<3&&(it.type==='ground'||it.type==='sky'||it.dots?.length))return true;return Math.min(it.tone,TONE[from])!==Math.min(it.tone,TONE[to]);});}
// The same as boxes in the field 240×160 (the frame of a stage 3 and the wash of a stage 4 cover the whole plate).
export function revealBoxes(id,from,to){const list=revealItems(id,from,to);if(!list.length)return [];const out=list.map(it=>it.box||(it.type==='sky'?[6,6,PW-6,PH*.75]:it.type==='eye'?[it.x-it.r-1,it.y-it.r-1,it.x+it.r+1,it.y+it.r+1]:boxOf((it.rib||[]).flatMap(r=>{const p=[];for(let i=0;i<r.length;i+=2)p.push([r[i],r[i+1]]);return p;})))).filter(b=>b[0]<b[2]);
 if(to>=3)out.push([0,0,PW,8],[0,PH-8,PW,PH],[0,0,8,PH],[PW-8,0,PW,PH]);if(to>=4)out.push([0,0,PW,PH]);return out;}
// Draws the new strokes of a stage over a canvas that shows the old one: step i of 12 paints its share of the items.
export function revealStep(cv,id,from,to,i,steps=12){const list=revealItems(id,from,to),c=cv.getContext('2d'),k=cv.width/PW,pap=paper(cv.width,cv.height);if(!list.length)return false;
 const part=new Set(list.slice(Math.floor(list.length*i/steps),Math.floor(list.length*(i+1)/steps)));c.setTransform(k,0,0,cv.height/PH,0,0);drawPlate(c,id,to,{fill:fillOf(c,pap,k),only:part});c.setTransform(1,0,0,1,0,0);return i+1<steps;}
// The caches (art.md 5.5): ten whole plates and twenty-eight thumbnails, the least recently used going first.
const plates=new Map(),thumbs=new Map();
function lru(map,key,limit,make){if(map.has(key)){const v=map.get(key);map.delete(key);map.set(key,v);return v;}const v=make();map.set(key,v);while(map.size>limit)map.delete(map.keys().next().value);return v;}
export const LIMITS={plates:10,thumbs:28};
export const plateKey=(id,stage,w,dpr)=>`${id}|${stage??'?'}|${Math.round(w)}|${Math.max(1,Math.min(2,dpr||1))}`;
export function plateCanvas(id,stage,w,dpr=1){return lru(plates,plateKey(id,stage,w,dpr),LIMITS.plates,()=>renderPlate(id,stage,w,dpr));}
export const hasPlate=(id,stage,w,dpr=1)=>plates.has(plateKey(id,stage,w,dpr));
export const dropPlate=(id,stage,w,dpr=1)=>plates.delete(plateKey(id,stage,w,dpr));
// A thumbnail of 64×48 (drawn at 128×96): the plate cut to 4:3 from its middle, its lines a little heavier.
export function thumbURL(id,stage){return lru(thumbs,`${id}|${stage??'?'}`,LIMITS.thumbs,()=>{const big=renderPlate(id,stage,180,1,{weight:1.6}),t=mk(128,96),g=t.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const sw=big.height*4/3;g.drawImage(big,(big.width-sw)/2,0,sw,big.height,0,0,128,96);return t.toDataURL();});}
export const hasThumb=(id,stage)=>thumbs.has(`${id}|${stage??'?'}`);
export const cacheSizes=()=>({plates:plates.size,thumbs:thumbs.size});
// The categories of a plate where its markers stand, in the field 240×160.
export const anchorsOf=id=>PLATES[id]?.anchors||null;
