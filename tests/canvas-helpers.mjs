// A canvas for node: a 2D context that records what is painted (rectangles in canvas pixels after translate and scale,
// images, compositing), and a document whose createElement('canvas') returns one. Enough for pixel.js, characters.js,
// item-art.js and the scene to draw in tests, so their output can be checked without a browser.
export function fakeCanvas(width=300,height=150){
 const cv={width,height,ops:[],cells:new Map(),toDataURL(){return 'data:image/png;base64,'+(++fakeCanvas.n).toString(36);}};
 let m=[1,0,0,1,0,0];const stack=[];
 const ctx={canvas:cv,fillStyle:'#000',strokeStyle:'#000',globalAlpha:1,globalCompositeOperation:'source-over',imageSmoothingEnabled:true,
  save(){stack.push({m:[...m],fillStyle:this.fillStyle,globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation});},
  restore(){const s=stack.pop();if(s){m=s.m;this.fillStyle=s.fillStyle;this.globalAlpha=s.globalAlpha;this.globalCompositeOperation=s.globalCompositeOperation;}},
  translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},
  scale(a,d){m[0]*=a;m[1]*=a;m[2]*=d;m[3]*=d;},
  setTransform(a=1,b=0,c=0,d=1,e=0,f=0){m=[a,b,c,d,e,f];},
  fillRect(x,y,w,h){const x0=m[0]*x+m[4],y0=m[3]*y+m[5],x1=m[0]*(x+w)+m[4],y1=m[3]*(y+h)+m[5],r={x:Math.min(x0,x1),y:Math.min(y0,y1),w:Math.abs(x1-x0),h:Math.abs(y1-y0),color:String(this.fillStyle),alpha:this.globalAlpha,op:this.globalCompositeOperation};
   cv.ops.push({kind:'rect',...r});if(r.w*r.h<=4096)for(let yy=Math.floor(r.y);yy<Math.ceil(r.y+r.h);yy++)for(let xx=Math.floor(r.x);xx<Math.ceil(r.x+r.w);xx++)cv.cells.set(xx+','+yy,r.color);},
  clearRect(x,y,w,h){cv.ops.push({kind:'clear',x,y,w,h});cv.cells.clear();},
  drawImage(img,...a){cv.ops.push({kind:'image',img,args:a,alpha:this.globalAlpha,op:this.globalCompositeOperation});},
  createRadialGradient(){cv.ops.push({kind:'gradient'});return {addColorStop(){}};},createLinearGradient(){cv.ops.push({kind:'gradient'});return {addColorStop(){}};},
  beginPath(){},closePath(){},moveTo(){},lineTo(){},rect(){},arc(){},clip(){cv.ops.push({kind:'clip'});},fill(){cv.ops.push({kind:'fill',color:String(this.fillStyle)});},stroke(){},
  getImageData(){throw new Error('getImageData is not used in a frame');},
 };
 cv.getContext=()=>ctx;return cv;
}
fakeCanvas.n=0;
export function installDocument(){globalThis.document={createElement:tag=>{if(tag!=='canvas')throw new Error('only canvases');return fakeCanvas();}};}
// The colours painted by a canvas, and its painted cells inside a box.
export const colors=cv=>new Set(cv.ops.filter(o=>o.kind==='rect').map(o=>o.color));
export const inside=(cv,w,h)=>cv.ops.filter(o=>o.kind==='rect').every(o=>o.x>=-.01&&o.y>=-.01&&o.x+o.w<=w+.01&&o.y+o.h<=h+.01);
