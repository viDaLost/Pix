// All shapes are rasterized on the same integer pixel grid.
export const C={ink:'#202233',deep:'#191c2c',night:'#252b42',slate:'#405369',steel:'#718fa0',silver:'#aed4d5',light:'#e7f4db',wood:'#956144',woodDark:'#4c3540',woodLight:'#d5a166',gold:'#f5c165',cream:'#fff1c7',orange:'#f89845',red:'#bc5b52',green:'#78bb8b',cyan:'#74d4d0',purple:'#b998df'};
export function px(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
export function oval(c,x,y,rx,ry,color){for(let y0=-Math.ceil(ry);y0<=ry;y0++){const width=Math.floor(rx*Math.sqrt(Math.max(0,1-y0*y0/(ry*ry))));px(c,x-width,y+y0,width*2+1,1,color);}}
export function polygon(c,points,color){
  const lo=Math.ceil(Math.min(...points.map(p=>p[1]))),hi=Math.floor(Math.max(...points.map(p=>p[1])));
  for(let y=lo;y<hi;y++){const edges=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))edges.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}edges.sort((a,b)=>a-b);for(let i=0;i+1<edges.length;i+=2)px(c,Math.ceil(edges[i]),y,Math.floor(edges[i+1])-Math.ceil(edges[i])+1,1,color);}
}
export function shade(hex,amount){const n=parseInt(hex.slice(1),16),part=i=>Math.max(0,Math.min(255,((n>>i)&255)+amount));return `#${[part(16),part(8),part(0)].map(v=>v.toString(16).padStart(2,'0')).join('')}`;}
export function noise(x,y,seed=0){let n=Math.imul(x+seed,374761393)^Math.imul(y-seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;}
export function texture(c,x,y,w,h,colors,density=.12,seed=3){for(let yy=y;yy<y+h;yy+=2)for(let xx=x;xx<x+w;xx+=2){const n=noise(xx,yy,seed);if(n<density)px(c,xx,yy,n<density/3?2:1,1,colors[Math.floor(n/density*colors.length)]);}}
export function panel(c,x,y,w,h,color=C.wood){px(c,x,y,w,h,C.ink);px(c,x+1,y+1,w-2,h-2,shade(color,-28));px(c,x+2,y+2,w-4,h-4,color);px(c,x+3,y+2,w-6,1,shade(color,45));px(c,x+2,y+3,1,h-6,shade(color,22));px(c,x+w-3,y+4,1,h-6,shade(color,-30));}
export function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function sparkle(c,x,y,color=C.light,size=2){px(c,x-size,y,size*2+1,1,color);px(c,x,y-size,1,size*2+1,color);}
export function pixelLine(c,x0,y0,x1,y1,color,width=1){let x=Math.round(x0),y=Math.round(y0);const tx=Math.round(x1),ty=Math.round(y1),dx=Math.abs(tx-x),sx=x<tx?1:-1,dy=-Math.abs(ty-y),sy=y<ty?1:-1;let error=dx+dy;for(;;){px(c,x,y,width,width,color);if(x===tx&&y===ty)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}}
