import {C,px,polygon,oval,shade,pixelLine,sparkle,canvas} from './pixel.js';
export const ITEM_TYPES=['knife','sword','axe','pickaxe','hammer','lantern','shield','amulet','ring','staff','key','goblet','horseshoe','shears','compass','bell'];
const sprites=new Map();
export function paintItemSprite(c,type,color=C.gold){if(!ITEM_TYPES.includes(type))return false;const key=type+'-'+color;let image=sprites.get(key);if(!image){image=canvas(28,28);paintItem(image.getContext('2d'),type,color);sprites.set(key,image);if(sprites.size>192)sprites.delete(sprites.keys().next().value);}c.imageSmoothingEnabled=false;c.drawImage(image,0,0);return true;}
export function paintItem(c,type,color=C.gold){
  if(!ITEM_TYPES.includes(type))return false;
  const mid=color,bright=shade(color,44),dark=shade(color,-55),r=(x,y,w,h,k=mid)=>px(c,x,y,w,h,k),p=(a,k=mid)=>polygon(c,a,k);
  if(type==='sword'){
    p([[20,1],[23,2],[22,8],[19,14],[15,18],[11,20],[9,17],[14,15],[17,10],[19,5]],C.ink);
    p([[20,2],[21,3],[20,8],[18,13],[14,17],[11,18],[10,17],[14,15],[17,9],[19,4]],mid);pixelLine(c,20,3,18,11,bright);pixelLine(c,18,11,12,17,bright);
    pixelLine(c,9,18,6,24,C.ink,3);pixelLine(c,10,18,7,24,'#aa7950',2);r(7,24,3,2,C.gold);
    p([[10,17],[16,18],[17,22],[14,26],[9,27],[5,25],[5,22],[7,23],[7,25],[11,25],[14,23],[14,20],[9,19]],C.ink);
    pixelLine(c,12,18,15,21,C.gold);pixelLine(c,15,21,13,24,bright);pixelLine(c,13,24,8,25,C.gold);r(7,18,8,1,bright);
  }else if(type==='knife'){
    const tip=type==='knife'?7:1;p([[13,tip],[17,tip+5],[16,18],[10,18],[11,tip+5]],C.ink);p([[13,tip+1],[15,tip+5],[14,18],[11,18],[12,tip+5]],mid);
    pixelLine(c,13,tip+2,12,16,bright);r(14,tip+5,1,11,dark);r(7,17,13,3,C.ink);r(8,17,11,1,C.gold);r(10,18,7,1,'#bc834c');r(12,20,3,5,'#654137');r(12,21,2,1,'#d5a267');r(12,23,2,1,'#b98052');r(11,25,5,2,C.ink);r(12,25,3,1,C.gold);
  }else if(type==='pickaxe'){
    pixelLine(c,9,26,15,7,C.ink,3);pixelLine(c,10,25,16,7,'#ad774f',2);pixelLine(c,10,23,16,8,'#e7ba77');
    p([[3,13],[5,7],[12,4],[18,5],[24,10],[25,15],[21,11],[16,9],[11,9],[6,11]],C.ink);p([[4,12],[6,8],[12,5],[18,6],[22,10],[23,13],[19,10],[15,8],[10,8],[6,10]],mid);pixelLine(c,7,8,12,6,bright);pixelLine(c,12,6,18,7,bright);r(15,6,2,3,dark);
  }else if(type==='axe'||type==='hammer'){
    r(12,6,4,21,C.ink);r(13,7,2,18,'#a97951');r(13,8,1,15,'#e5b37a');r(12,23,4,2,'#6c433b');
    if(type==='axe'){p([[5,4],[13,4],[14,10],[12,15],[7,17],[3,14],[3,7]],C.ink);p([[5,5],[11,5],[12,10],[10,14],[6,15],[4,13],[4,8]],mid);r(5,6,5,2,bright);pixelLine(c,4,9,4,13,bright);r(11,7,2,5,dark);r(16,7,5,3,C.ink);r(16,7,4,1,bright);}
    else{p([[3,4],[22,4],[25,7],[24,13],[4,13],[2,10]],C.ink);r(4,5,19,6,mid);r(5,5,16,1,bright);r(5,6,2,4,bright);r(20,7,3,4,dark);r(11,5,5,7,shade(mid,-20));r(12,5,3,1,bright);}
  }else if(type==='lantern'){
    r(11,1,6,2,C.ink);r(9,3,10,2,C.ink);r(11,2,5,1,bright);p([[9,4],[19,4],[23,8],[22,24],[6,24],[5,8]],C.ink);p([[9,5],[18,5],[21,8],[6,8]],mid);r(8,8,12,15,'#3e5660');r(9,9,10,11,'#688e85');r(12,9,5,12,'#eca85b');r(13,11,3,9,'#fff0b7');r(14,12,1,6,'#fffcec');r(7,8,2,15,mid);r(19,8,2,15,dark);r(7,8,1,13,bright);r(10,10,1,9,'#b5e2c6');r(6,22,16,2,mid);r(5,24,18,2,C.ink);r(7,24,14,1,bright);r(10,5,6,1,bright);
  }else if(type==='shield'){
    p([[4,4],[23,4],[23,17],[19,23],[14,27],[8,23],[4,17]],C.ink);p([[5,5],[22,5],[21,17],[18,22],[14,25],[9,21],[6,17]],mid);
    p([[7,8],[20,8],[19,17],[15,22],[10,19],[8,16]],'#845344');r(8,9,1,7,'#b9895b');r(11,8,1,12,'#4f3540');r(16,8,1,12,'#4f3540');r(6,5,15,2,bright);pixelLine(c,6,7,7,17,bright);pixelLine(c,21,8,20,17,dark);r(12,11,5,6,C.ink);r(13,11,3,4,C.gold);r(13,12,1,2,C.cream);for(const [x,y]of[[8,6],[19,6],[8,17],[18,17],[13,23]])r(x,y,1,1,C.cream);
  }else if(type==='amulet'){
    pixelLine(c,6,3,7,12,C.ink,2);pixelLine(c,21,3,20,12,C.ink,2);pixelLine(c,7,3,8,12,mid);pixelLine(c,20,3,19,12,bright);p([[8,12],[19,12],[22,16],[20,23],[14,27],[7,23],[5,17]],C.ink);p([[9,13],[18,13],[20,17],[18,22],[14,25],[9,22],[7,17]],mid);p([[11,15],[16,14],[18,18],[16,22],[12,23],[9,19]],'#547f98');p([[11,16],[15,15],[17,18],[15,21],[12,22],[10,19]],C.cyan);pixelLine(c,11,17,12,21,'#d3fae6');r(8,16,1,2,bright);r(18,21,1,1,bright);r(13,11,2,2,C.gold);
  }else if(type==='ring'){
    for(let y=-8;y<=8;y++){const w=Math.floor(9*Math.sqrt(Math.max(0,1-y*y/64))),inner=Math.floor(6*Math.sqrt(Math.max(0,1-y*y/49)));if(Math.abs(y)>6)r(14-w,17+y,w*2+1,1,y<0?bright:dark);else{r(14-w,17+y,Math.max(2,w-inner),1,y<1?mid:dark);r(14+inner,17+y,Math.max(2,w-inner),1,y<1?bright:mid);}}
    p([[9,8],[11,3],[17,3],[20,8],[17,12],[11,12]],C.ink);p([[10,8],[12,4],[16,4],[18,8],[16,10],[12,10]],C.cyan);p([[12,4],[15,4],[14,8],[10,8]],'#c8f8e4');r(12,10,5,1,bright);r(10,7,1,2,mid);r(18,7,1,2,mid);
  }else if(type==='staff'){
    pixelLine(c,10,27,15,10,C.ink,4);pixelLine(c,11,26,16,10,'#a97751',2);pixelLine(c,11,25,16,11,'#dbb177');p([[9,3],[17,1],[21,5],[19,11],[14,14],[8,10],[7,6]],C.ink);p([[10,3],[16,2],[20,5],[18,10],[14,12],[9,9],[8,6]],mid);p([[11,4],[15,3],[17,6],[15,10],[11,9],[10,6]],C.purple);r(11,5,2,3,'#e5caff');r(12,14,6,2,C.gold);r(12,19,4,1,C.gold);r(12,15,2,1,C.cream);
  }else if(type==='key'){
    p([[8,2],[17,2],[21,5],[21,11],[18,14],[15,14],[15,26],[10,26],[10,14],[7,13],[4,9],[5,5]],C.ink);p([[8,3],[17,3],[20,6],[20,10],[17,13],[13,13],[13,25],[11,25],[11,13],[8,12],[5,9],[6,6]],mid);r(9,5,8,5,C.ink);r(10,6,6,3,'#535269');r(8,4,9,1,bright);r(6,6,1,3,bright);r(11,15,1,8,bright);r(13,19,6,2,dark);r(13,23,7,2,mid);r(14,23,5,1,bright);
  }else if(type==='horseshoe'){
    p([[6,3],[9,3],[9,17],[11,21],[17,21],[19,17],[19,3],[23,3],[24,17],[21,24],[17,27],[10,27],[6,24],[3,17],[4,5]],C.ink);
    p([[6,4],[8,4],[8,17],[11,23],[17,23],[21,17],[21,4],[22,4],[23,16],[20,23],[16,25],[11,25],[7,22],[5,16]],mid);
    pixelLine(c,6,5,6,16,bright);pixelLine(c,7,20,11,24,bright);pixelLine(c,12,24,16,24,bright);pixelLine(c,21,5,21,16,dark);
    for(const x of[7,21])for(const y of[8,12,17]){r(x,y,1,2,C.ink);r(x-1,y,1,1,bright);}
  }else if(type==='shears'){
    pixelLine(c,11,16,7,2,C.ink,4);pixelLine(c,12,15,21,2,C.ink,4);pixelLine(c,11,14,8,3,mid,2);pixelLine(c,13,14,20,3,mid,2);pixelLine(c,8,4,11,12,bright);pixelLine(c,19,4,14,12,bright);
    for(const [x,y]of[[8,22],[20,22]]){oval(c,x,y,6,5,C.ink);oval(c,x,y,5,4,mid);oval(c,x,y,3,2,'#3b4556');r(x-3,y-3,3,1,bright);}
    pixelLine(c,11,15,9,20,mid,3);pixelLine(c,14,15,18,20,dark,3);r(11,13,4,4,C.ink);r(12,14,2,2,C.gold);r(12,14,1,1,C.cream);
  }else if(type==='compass'){
    oval(c,14,15,12,11,C.ink);oval(c,14,15,11,10,dark);oval(c,14,14,10,9,mid);oval(c,14,14,8,7,'#dfd8b7');oval(c,14,14,6,5,'#b5bcb2');
    r(11,0,6,3,C.ink);r(12,1,4,1,bright);r(13,3,2,2,mid);pixelLine(c,6,7,10,5,bright);pixelLine(c,20,6,23,12,bright);
    for(const [x,y]of[[14,7],[21,14],[14,21],[7,14]])r(x,y,1,2,'#577177');
    p([[12,16],[17,9],[15,16]],'#ae6558');p([[12,16],[9,20],[15,16]],'#46657a');r(13,14,2,2,C.gold);r(13,14,1,1,C.cream);r(8,9,3,1,'#fff2cf');r(7,11,1,3,'#fff2cf');
  }else if(type==='bell'){
    r(11,1,6,4,C.ink);r(12,2,4,1,bright);r(12,5,4,2,mid);
    p([[9,6],[19,6],[21,10],[21,17],[25,22],[25,25],[3,25],[3,22],[7,17],[7,10]],C.ink);
    p([[10,7],[18,7],[19,10],[19,18],[23,22],[23,23],[5,23],[9,18],[9,10]],mid);pixelLine(c,11,8,11,18,bright);pixelLine(c,10,18,8,21,bright);pixelLine(c,18,10,18,18,dark);r(8,20,14,1,dark);r(5,23,18,1,bright);r(12,25,4,2,C.ink);r(13,25,2,1,C.gold);
  }else if(type==='goblet'){
    p([[4,3],[24,3],[23,12],[20,17],[16,19],[16,23],[22,24],[23,27],[5,27],[6,24],[12,23],[12,19],[8,17],[5,12]],C.ink);p([[5,4],[23,4],[22,11],[19,16],[15,18],[15,24],[21,25],[21,26],[7,26],[7,25],[13,24],[13,18],[9,16],[6,11]],mid);r(6,4,15,2,bright);r(7,6,2,6,bright);r(8,11,2,3,bright);r(20,6,2,7,dark);r(19,13,2,2,dark);r(13,19,1,5,bright);r(9,25,10,1,bright);r(11,8,7,1,shade(mid,-20));r(12,10,5,3,C.ink);r(13,10,3,2,C.red);r(13,10,1,1,'#ffd5ab');
  }
  return true;
}
export function paintRune(c,rune,x,y,time=0){if(!rune||rune==='none')return;const color=rune==='frost'?'#b7f7f3':rune==='guard'?'#bbaaff':'#fff1a5';c.save();c.globalAlpha=.65+.3*Math.sin(time*3);sparkle(c,x,y,color,2);px(c,x-4,y-3,1,1,color);px(c,x+4,y+3,1,1,color);c.restore();}
