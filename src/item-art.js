// The pixel things of the bestiary (art.md 4.9, GDD 11.4): herbs, parts of monsters and bought goods on a 16×16 grid, the
// flasks of the potions with their liquid, and the trophies of the wall on 12×12. Every picture is first drawn into a grid
// of colours (no canvas needed, so the tests see exactly what is drawn), outlined in ink, and only then painted or turned
// into a cached data-URL for the interface. The look of a thing comes from the content: MATERIALS[].look {tpl, c},
// POTIONS[].look {tpl, liquid}, MONSTERS[].trophy.look {c}.
import {px,polygon,oval,pixelLine,shade} from './pixel.js';
export const INK='#241c17';
export const TEMPLATES=['sprig','root','pouch','cake','jarL','vial','tuft','fang','cloth','drop','pearl','scale','hide','bark','ear','spindle','knot','silt','ice','book','comb'];
export const FLASKS=['flaskRound','vialTall','jar','dropper','bottle','flacon'];
export const TROPHIES=['werewolf','upyr','kikimora','drowner','zlyden','leshy','poludnitsa','ghoul','mara','banshee','basilisk','wyvern','sea_serpent','koldun'];
const GLASS='#9fb8bc',GLASS_DARK='#3a4a4e',CORK='#a87a4a';
// A grid that pixel.js can draw into: fillStyle and fillRect are all its shapes use.
export function grid(n=16){const g=new Array(n*n).fill(null);return {n,g,fillStyle:'#000',fillRect(x,y,w,h){for(let yy=Math.max(0,y);yy<Math.min(n,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(n,x+w);xx++)g[yy*n+xx]=this.fillStyle;}};}
// The ink outline round everything drawn: an empty cell next to a filled one turns ink.
function outline(c){const {n,g}=c,out=g.slice();for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(g[y*n+x])continue;if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const X=x+dx,Y=y+dy;return X>=0&&Y>=0&&X<n&&Y<n&&g[Y*n+X]&&g[Y*n+X]!==INK;}))out[y*n+x]=INK;}c.g=out;return c;}
const tones=(c0,c1)=>({m:c0,l:shade(c0,38),d:shade(c0,-42),x:c1||shade(c0,-70),two:!!c1});
// The twenty-one shapes of art.md 4.9, each in the main colour of the thing, with its light and dark.
const DRAW={
 sprig(c,t){pixelLine(c,8,14,7,3,shade(t.m,-30));for(const [x,y,s] of[[5,11,-1],[10,9,1],[4,7,-1],[10,5,1],[6,4,-1]]){oval(c,x,y,2,1,t.m);px(c,x+s,y,1,1,t.l);}oval(c,7,2,1,1,t.l);if(t.two)for(const [x,y] of[[9,7],[5,9],[8,4],[11,11]])px(c,x,y,2,2,t.x);},
 root(c,t){const root=t.x;polygon(c,[[6,8],[10,8],[11,11],[9,14],[7,14],[5,11]],root);pixelLine(c,7,14,5,15,root);pixelLine(c,9,13,12,15,root);px(c,7,9,1,3,shade(root,40));for(const [x,y] of[[6,5],[9,4],[11,6],[7,2]]){pixelLine(c,8,8,x,y,'#5a7a3a');oval(c,x,y,1,1,t.m);}px(c,7,2,1,1,t.l);},
 pouch(c,t){oval(c,8,10,5,4,t.m);polygon(c,[[6,6],[10,6],[11,8],[5,8]],t.m);px(c,5,5,6,1,t.l);px(c,6,7,4,1,t.d);px(c,4,10,1,3,t.l);px(c,9,12,4,1,t.d);px(c,7,3,2,2,t.d);},
 cake(c,t){px(c,3,6,10,7,t.m);polygon(c,[[3,6],[6,3],[15,3],[13,6]],t.l);polygon(c,[[13,6],[15,3],[15,10],[13,13]],t.d);px(c,5,8,1,3,t.l);px(c,8,9,3,1,t.d);},
 jarL(c,t){oval(c,8,10,5,4,'#8a5a3a');px(c,4,5,8,4,'#8a5a3a');px(c,3,4,10,2,t.d);px(c,4,3,8,1,'#e8dcc0');px(c,5,6,6,2,t.m);px(c,6,8,1,3,t.m);px(c,4,9,1,3,'#a87a50');px(c,10,11,3,1,'#5a3a24');},
 vial(c,t){px(c,6,2,4,2,CORK);px(c,7,4,2,2,GLASS);oval(c,8,10,4,4,GLASS);oval(c,8,11,3,3,t.m);px(c,6,8,1,2,'#e8f2f2');px(c,9,12,2,1,t.d);},
 tuft(c,t){for(const [a,b,d] of[[[4,13],[6,4],[3,2]],[[7,14],[9,3],[8,1]],[[10,13],[11,5],[13,3]],[[6,14],[12,9],[14,8]]]){pixelLine(c,...a,...b,t.m,2);pixelLine(c,...b,...d,t.m);}pixelLine(c,7,12,9,4,t.l);pixelLine(c,5,12,6,6,t.d);px(c,4,13,8,2,t.d);},
 fang(c,t){polygon(c,[[4,3],[11,3],[12,6],[10,10],[7,14],[6,11],[4,7]],t.m);px(c,4,3,8,2,t.d);pixelLine(c,6,6,7,12,t.l);px(c,10,6,1,3,t.d);if(t.two)px(c,7,14,2,2,t.x);},
 cloth(c,t){polygon(c,[[2,5],[7,3],[13,4],[14,10],[11,14],[6,12],[3,13]],t.m);pixelLine(c,5,5,6,11,t.d);pixelLine(c,9,5,10,12,t.d);px(c,3,6,3,1,t.l);px(c,11,5,2,1,t.l);for(const x of[4,8,12])px(c,x,13,1,2,t.d);},
 drop(c,t){px(c,7,1,2,2,CORK);px(c,7,3,2,2,GLASS);oval(c,8,10,5,4,GLASS);oval(c,8,11,4,3,t.m);polygon(c,[[8,6],[10,9],[9,11],[7,11],[6,9]],shade(t.m,18));px(c,5,8,1,2,'#e8f2f2');},
 pearl(c,t){oval(c,8,9,5,5,t.m);oval(c,9,10,3,3,t.d);oval(c,8,9,3,3,t.m);px(c,6,6,2,2,t.l);px(c,6,6,1,1,'#ffffff');px(c,4,14,9,1,shade(t.m,-60));},
 scale(c,t){polygon(c,[[8,2],[13,6],[12,11],[8,14],[4,11],[3,6]],t.m);pixelLine(c,8,3,8,13,t.d);pixelLine(c,5,6,8,9,t.d);pixelLine(c,11,6,8,9,t.d);px(c,5,4,2,1,t.l);px(c,10,4,2,1,shade(t.l,20));px(c,11,8,1,2,t.l);},
 hide(c,t){polygon(c,[[2,4],[6,2],[12,3],[14,7],[13,13],[8,14],[3,12]],t.m);for(let y=5;y<13;y+=3)for(let x=4+(y%2);x<13;x+=3)px(c,x,y,2,1,t.d);px(c,4,4,3,1,t.l);pixelLine(c,13,8,12,12,t.d);},
 bark(c,t){polygon(c,[[3,3],[12,2],[13,13],[4,14]],t.m);for(const x of[5,8,11])pixelLine(c,x,3,x-1,13,t.d);px(c,6,4,1,8,t.l);if(t.two){oval(c,6,3,3,1,t.x);px(c,10,3,2,2,t.x);}},
 ear(c,t){pixelLine(c,8,15,8,6,shade(t.m,-30));for(let y=3;y<11;y+=2){oval(c,6,y,1,1,t.m);oval(c,10,y,1,1,t.m);px(c,6,y,1,1,t.l);}oval(c,8,2,1,1,t.m);pixelLine(c,8,2,8,0,t.l);pixelLine(c,5,3,3,1,t.l);pixelLine(c,11,3,13,1,t.l);},
 spindle(c,t){pixelLine(c,8,1,8,15,t.m,2);oval(c,8,8,3,4,t.two?t.x:t.l);for(let y=5;y<12;y+=2)pixelLine(c,6,y,11,y+1,shade(t.two?t.x:t.l,-28));oval(c,8,13,3,1,t.d);},
 knot(c,t){for(const [x,y,r] of[[6,6,3],[10,7,3],[8,10,3]]){oval(c,x,y,r,r,t.m);oval(c,x,y,r-2,r-2,t.d);}pixelLine(c,3,12,6,14,t.m);pixelLine(c,12,11,14,14,t.m);px(c,5,4,2,1,t.l);px(c,10,5,2,1,t.l);},
 silt(c,t){oval(c,8,9,6,4,t.m);oval(c,7,6,3,2,t.m);px(c,4,13,1,2,t.m);px(c,11,13,1,3,t.m);for(const [x,y] of[[5,9],[9,7],[11,10],[7,11]])px(c,x,y,2,1,t.d);px(c,5,6,2,1,t.l);px(c,9,8,1,1,t.l);},
 ice(c,t){const hl=t.two?t.x:t.l;polygon(c,[[8,1],[12,5],[11,13],[5,14],[3,7]],t.m);pixelLine(c,8,2,7,13,hl);pixelLine(c,4,7,11,6,shade(hl,-40));px(c,9,3,1,3,hl);px(c,10,10,1,2,hl);},
 book(c,t){const clasp=t.two?t.x:'#c9a050';px(c,3,2,10,12,t.m);px(c,4,3,1,10,shade(t.m,30));px(c,13,3,1,10,'#d9c8a0');px(c,6,5,5,4,shade(t.m,20));px(c,7,6,3,2,clasp);px(c,12,7,2,2,clasp);},
 comb(c,t){px(c,2,4,12,3,t.m);px(c,2,4,12,1,t.l);for(let x=2;x<14;x+=2)px(c,x,7,1,6,t.m);oval(c,8,4,2,1,t.l);px(c,7,3,2,1,'#ffffff');},
};
// The six flasks: glass in a pale outline, the liquid of the potion up to its level (0…1).
const FLASK={
 flaskRound(c,l,k){px(c,7,1,2,2,CORK);px(c,7,3,2,4,GLASS);oval(c,8,11,5,4,GLASS);oval(c,8,11,4,3,GLASS_DARK);fill(c,k,8,14,(y)=>{const dy=y-11,w=Math.round(3.4*Math.sqrt(Math.max(0,1-dy*dy/12.25)));return [8-w,8+w];},l);px(c,5,9,1,2,'#e8f2f2');},
 vialTall(c,l,k){px(c,6,1,4,2,CORK);px(c,6,3,4,1,GLASS);px(c,5,4,6,11,GLASS);px(c,6,4,4,10,GLASS_DARK);fill(c,k,4,14,()=>[6,9],l);px(c,6,5,1,6,'#e8f2f2');},
 jar(c,l,k){px(c,3,3,10,2,'#6b4a33');px(c,4,2,8,1,'#8a6a48');px(c,3,5,10,10,GLASS);px(c,4,5,8,9,GLASS_DARK);fill(c,k,5,14,()=>[4,11],l);px(c,4,6,1,6,'#e8f2f2');},
 dropper(c,l,k){oval(c,8,2,2,1,'#a3301c');px(c,7,3,2,3,'#5a4a3a');px(c,5,6,6,9,GLASS);px(c,6,7,4,7,GLASS_DARK);fill(c,k,7,14,()=>[6,9],l);px(c,6,8,1,4,'#e8f2f2');},
 bottle(c,l,k){px(c,7,1,2,2,CORK);px(c,7,3,2,3,GLASS);polygon(c,[[6,6],[10,6],[12,8],[12,15],[4,15],[4,8]],GLASS);px(c,5,8,6,6,GLASS_DARK);fill(c,k,7,14,(y)=>y<8?[6,9]:[5,10],l);px(c,5,9,1,4,'#e8f2f2');},
 flacon(c,l,k){oval(c,8,2,2,2,'#c9a050');px(c,8,1,1,1,'#f2d69a');px(c,7,4,2,2,GLASS);polygon(c,[[8,6],[13,10],[8,15],[3,10]],GLASS);polygon(c,[[8,7],[12,10],[8,14],[4,10]],GLASS_DARK);fill(c,k,7,14,(y)=>{const w=4-Math.abs(y-10);return [8-w+1,8+w-1];},l);px(c,5,10,1,1,'#e8f2f2');},
};
// The liquid fills a flask from the bottom up to the level k of its inner rows [top, bottom].
function fill(c,k,top,bottom,span,liquid){const rows=bottom-top+1,n=Math.round(Math.max(0,Math.min(1,k))*rows);for(let i=0;i<n;i++){const y=bottom-i,[a,b]=span(y);if(b>=a)px(c,a,y,b-a+1,1,i===n-1?shade(liquid,30):liquid);}}
// The trophies of the wall (art.md 4.9), one shape for each monster on 12×12.
const TROPHY={
 werewolf(c,[a]){for(let i=0;i<9;i++){const x=2+i,y=9-Math.round(5*Math.sin(i/8*Math.PI));px(c,x,y,2,2+(i<5?1:0),a);}px(c,9,3,2,1,'#ffffff');px(c,2,10,2,1,shade(a,-40));},
 upyr(c,[a,b]){pixelLine(c,2,10,9,3,a,2);polygon(c,[[9,2],[11,1],[10,4]],a);pixelLine(c,2,10,5,7,b||'#4a1e1e',2);px(c,6,6,1,1,shade(a,40));},
 kikimora(c,[a,b]){pixelLine(c,6,1,6,11,a);px(c,4,10,5,2,a);px(c,3,2,6,1,a);oval(c,6,5,2,2,b||'#6f8a4a');px(c,7,4,1,1,shade(b||'#6f8a4a',40));},
 drowner(c,[a,b]){px(c,5,1,2,10,a);px(c,2,4,8,2,a);px(c,5,1,1,10,shade(a,30));px(c,6,7,1,2,b||'#4f7a6a');px(c,8,4,1,1,b||'#4f7a6a');},
 zlyden(c,[a]){polygon(c,[[2,6],[9,4],[11,6],[10,9],[3,10]],a);for(let x=3;x<10;x+=2)pixelLine(c,x,5,x+1,9,shade(a,-35));px(c,9,5,2,1,shade(a,30));},
 leshy(c,[a,b]){pixelLine(c,6,11,6,4,a,2);pixelLine(c,6,5,2,1,a);pixelLine(c,7,5,10,1,a);pixelLine(c,6,7,9,5,a);if(b){px(c,2,1,2,1,b);px(c,9,1,2,2,b);px(c,6,9,2,1,b);}},
 poludnitsa(c,[a]){for(let i=0;i<8;i++){const t=i/7*Math.PI*.9,x=6+Math.round(4*Math.cos(t+1)),y=6-Math.round(4*Math.sin(t+1));px(c,x,y,2,1,a);}pixelLine(c,3,9,5,11,'#6b4a33',2);px(c,8,2,1,1,'#ffffff');},
 ghoul(c,[a,b]){oval(c,6,7,4,3,a);px(c,4,7,2,2,INK);px(c,7,7,2,2,INK);px(c,5,10,3,1,a);polygon(c,[[1,5],[3,2],[9,2],[11,5]],b||'#5a5a52');px(c,3,3,6,1,shade(b||'#5a5a52',30));},
 mara(c,[a]){polygon(c,[[6,2],[9,5],[10,9],[2,9],[3,5]],a);px(c,5,10,2,2,shade(a,-40));px(c,4,4,1,3,shade(a,40));px(c,5,1,2,1,shade(a,-30));},
 banshee(c,[a]){polygon(c,[[1,2],[11,2],[9,8],[6,11],[3,8]],a);pixelLine(c,4,3,6,9,shade(a,-30));pixelLine(c,8,3,7,8,shade(a,-30));px(c,9,10,1,2,'#bcd8e8');},
 basilisk(c,[a]){polygon(c,[[1,10],[3,4],[5,6],[6,2],[8,5],[10,3],[11,10]],a);px(c,4,7,1,2,shade(a,30));px(c,7,6,1,3,shade(a,-35));},
 wyvern(c,[a]){polygon(c,[[2,10],[5,4],[9,2],[11,1],[8,5],[5,11]],a);px(c,10,2,1,1,'#c9d2d6');px(c,11,0,1,2,'#6a9a3a');px(c,4,7,2,1,shade(a,40));},
 sea_serpent(c,[a]){oval(c,6,7,4,3,a);px(c,5,2,2,4,a);px(c,1,6,2,2,a);px(c,10,6,2,2,a);oval(c,6,7,1,1,shade(a,-50));px(c,4,5,2,1,shade(a,30));},
 koldun(c,[a,b]){pixelLine(c,5,1,7,10,a,2);polygon(c,[[6,10],[8,10],[7,12]],a);if(b){px(c,5,2,2,1,b);px(c,6,5,2,1,b);px(c,4,1,1,1,b);px(c,8,7,1,1,b);}},
};
const valid=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
// The grid of a thing (16×16), of a flask with its level, of a trophy (12×12). Unknown looks fall back to a plain pouch.
export function itemGrid(look={}){const c=grid(16),cs=Array.isArray(look.c)?look.c.filter(valid):[],t=tones(cs[0]||'#8a7a6a',cs[1]);(DRAW[look.tpl]||DRAW.pouch)(c,t);return outline(c);}
export function flaskGrid(look={},level=1){const c=grid(16);(FLASK[look.tpl]||FLASK.vialTall)(c,valid(look.liquid)?look.liquid:'#4a5a3a',level);return outline(c);}
export function trophyGrid(monster,look={}){const c=grid(12),cs=Array.isArray(look.c)?look.c.filter(valid):[];(TROPHY[monster]||TROPHY.drowner)(c,cs.length?cs:['#cfcfd0']);return outline(c);}
// Paints a grid into a 2D context at (x, y), one cell a scale of pixels; null cells stay transparent.
export function paintGrid(ctx,{n,g},x=0,y=0,scale=1){for(let i=0;i<n*n;i++){const col=g[i];if(!col)continue;ctx.fillStyle=col;ctx.fillRect(x+(i%n)*scale,y+Math.floor(i/n)*scale,scale,scale);}}
// Data-URLs for the interface, drawn once per thing and kept (the grids are tiny, the list is bounded by the content).
const urls=new Map();
function urlOf(key,make){let u=urls.get(key);if(u)return u;const g=make(),cv=document.createElement('canvas');cv.width=cv.height=g.n;paintGrid(cv.getContext('2d'),g);u=cv.toDataURL();urls.set(key,u);return u;}
export const itemURL=look=>urlOf('i|'+look?.tpl+'|'+(look?.c||[]).join(','),()=>itemGrid(look));
export const flaskURL=(look,level=1)=>urlOf('f|'+look?.tpl+'|'+look?.liquid+'|'+Math.round(level*4),()=>flaskGrid(look,Math.round(level*4)/4));
export const trophyURL=(monster,look)=>urlOf('t|'+monster+'|'+(look?.c||[]).join(','),()=>trophyGrid(monster,look));
// An <img> of a thing for the HTML of the interface: 32 px in lists, 24 px in chips (×2 and ×1.5 of the grid).
export const pixelImg=(url,size=32,alt='')=>`<img class="pix" src="${url}" width="${size}" height="${size}" alt="${alt}" ${alt?'':'aria-hidden="true"'}>`;
