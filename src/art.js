// Original pixel artwork. No network assets, image generators, or rendering libraries.
const P = { ink: '#293534', dark: '#1c292b', stone: '#58675e', stoneLight: '#6b7869', wall: '#81917a', wallLight: '#a6aa86', wood: '#775345', woodLight: '#ae8059', woodDark: '#4d3939', gold: '#e6ba73', cream: '#f5e4b6', orange: '#ec9459', red: '#a15f52', green: '#6d9476', cyan: '#8fd3c5', purple: '#b09bc7' };
const cache = new Map();
const sprites = {
  person: [
    '.....hhhhhh.....','....hhhhhhhh....','....hhsssssh....','....hss.s.sh....','.....ssssss.....','......ssss......','....cccccccc....','...cccllcccc....','...scccllccs....','...scccllccs....','....cccccccc....','.....bbbbbb.....','.....bb..bb.....','.....bb..bb.....','....ddd..ddd....',
  ],
};
function pixelSprite(ctx, rows, colors, x, y, scale = 2) { rows.forEach((row, iy) => [...row].forEach((ch, ix) => { if (colors[ch]) { ctx.fillStyle = colors[ch]; ctx.fillRect(x + ix * scale, y + iy * scale, scale, scale); } })); }
function rect(ctx, x,y,w,h,c) { ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h); }
function circle(ctx,x,y,r,c) { ctx.fillStyle=c;for(let dy=-r;dy<=r;dy+=2){const w=Math.floor(Math.sqrt(r*r-dy*dy));ctx.fillRect(x-w,y+dy,w*2,2);} }
function character(ctx,x,y,color='#9c7659',hair='#503d37',phase=0,scale=2){
  rect(ctx,x+6*scale,y+15*scale,6*scale,scale,'#34463b');
  pixelSprite(ctx,sprites.person,{h:hair,s:'#e3b28a',c:color,l:'#e1c7a0',b:'#394743',d:'#342e30','.':null},x,y+Math.round(Math.sin(phase)*.8),scale);
}
function shelf(ctx,x,y,w,level=0){
  rect(ctx,x,y,w,45,P.woodDark);rect(ctx,x+3,y+3,w-6,39,'#4b5142');
  for(let row=0;row<2;row++){
    rect(ctx,x,y+19+row*22,w,4,P.woodLight);rect(ctx,x+2,y+23+row*22,w-4,2,P.wood);
    for(let col=0;col<Math.floor(w/15);col++){
      const cx=x+8+col*15,cy=y+7+row*21;
      if(col%3===0){rect(ctx,cx,cy,7,12,'#b89d73');rect(ctx,cx+2,cy-2,3,2,P.gold);rect(ctx,cx+1,cy+4,5,2,P.cream);}
      else if(col%3===1){rect(ctx,cx,cy+2,6,10,level?'#8fbcb4':'#b66a54');rect(ctx,cx+2,cy,2,3,P.cream);rect(ctx,cx+1,cy+4,2,3,'#d4e2bd');}
      else{rect(ctx,cx,cy+2,7,10,P.purple);rect(ctx,cx+2,cy,3,2,P.gold);rect(ctx,cx+1,cy+3,1,6,'#e4d7e3');}
    }
  }
  rect(ctx,x,y,3,47,P.woodLight);rect(ctx,x+w-3,y,3,47,P.woodLight);
}
function windowView(ctx,x,y,w,h,night){
  rect(ctx,x-3,y-3,w+6,h+6,P.woodDark);rect(ctx,x,y,w,h,night?'#455f77':'#b7c9ae');
  rect(ctx,x+2,y+2,w-4,h-4,night?'#5b7190':'#d3d6b0');
  circle(ctx,x+w-14,y+10,5,night?'#efdfbc':'#f5dea0');
  for(let i=0;i<3;i++){rect(ctx,x+i*20,y+h-12-i*3,25,12+i*3,night?'#5e7e80':'#8baf92');rect(ctx,x+i*20+4,y+h-16-i*3,12,4,'#849d8e');}
  rect(ctx,x+w/2-2,y,4,h,P.wood);rect(ctx,x,y+h/2-1,w,3,P.wood);
}
function workshop(ctx,state,view,t){
  const night=state.day%4===0;
  rect(ctx,0,0,384,220,P.dark);rect(ctx,5,5,374,205,'#9e9e78');
  rect(ctx,10,9,364,93,P.wall);
  for(let y=14;y<100;y+=15)for(let x=10+(y%30===14?0:13);x<374;x+=28){rect(ctx,x,y,26,13,((x+y)%4)?'#84937c':'#8e9a81');rect(ctx,x+1,y+1,24,1,'#96a28a');}
  rect(ctx,10,101,364,102,P.wood);
  for(let y=101;y<207;y+=14){rect(ctx,10,y,364,1,'#493e36');rect(ctx,10,y+1,364,2,'#967051');for(let x=15+(y%3)*19;x<374;x+=58){rect(ctx,x,y+3,1,10,'#5c463b');rect(ctx,x+8,y+9,19,1,'#805941');}}
  rect(ctx,8,8,368,6,P.woodDark);rect(ctx,8,14,368,3,P.woodLight);
  for(const x of [10,121,268,367]){rect(ctx,x,14,7,88,P.wood);rect(ctx,x+1,14,2,86,P.woodLight);}
  windowView(ctx,136,29,60,47,night);windowView(ctx,28,25,56,34,night);
  shelf(ctx,28,68,77,state.upgrades.shelves);shelf(ctx,289,27,61,state.upgrades.shelves);
  // Chimney, raised hearth and moving pixel flame.
  const f=state.upgrades.furnace;
  rect(ctx,217,14,30,20,'#69746b');rect(ctx,209,30,47,7,f?'#a48768':'#67766b');rect(ctx,206,37,53,9,f?'#c0a076':'#788171');
  rect(ctx,210,45,45,48,'#454e45');rect(ctx,205,46,7,48,'#a5a087');rect(ctx,253,46,7,48,'#a5a087');
  rect(ctx,213,49,39,39,'#302f30');rect(ctx,213,72,39,15,'#865e46');
  for(let i=0;i<6;i++){const x=215+i*6,ht=12+((Math.floor(t*6)+i*7)%15);rect(ctx,x,87-ht,5,ht,P.orange);rect(ctx,x+1,89-ht/2,3,ht/2,'#f6ca73');}
  rect(ctx,201,92,64,10,'#787b65');rect(ctx,203,93,60,3,'#b9ad87');
  for(let i=0;i<3;i++){const sy=64-((t*16+i*21)%44);rect(ctx,226+(i*9)%20,sy,2,2,'#ecc47b');}
  // Workshop furniture.
  rect(ctx,26,117,82,13,P.woodDark);rect(ctx,24,111,86,9,'#b58b60');rect(ctx,26,112,80,2,'#debc81');
  rect(ctx,31,128,7,25,P.woodDark);rect(ctx,97,128,7,25,P.woodDark);
  rect(ctx,39,106,20,6,'#85979b');rect(ctx,44,103,14,3,'#b9c1b4');
  rect(ctx,75,102,12,8,P.gold);rect(ctx,78,99,6,3,P.cream);
  if(state.upgrades.bench){rect(ctx,53,100,15,9,'#6a5869');rect(ctx,55,100,11,2,'#c7b3a1');rect(ctx,62,104,2,3,P.cyan);}
  rect(ctx,122,165,116,28,'#9c5f50');rect(ctx,125,168,110,22,'#bf7b60');
  for(let x=128;x<235;x+=8){rect(ctx,x,173,4,2,'#e2b48a');rect(ctx,x,184,4,2,'#e2b48a');}
  rect(ctx,160,146,38,13,P.woodDark);rect(ctx,168,130,22,17,'#444b4b');
  rect(ctx,155,121,48,10,'#93a29f');rect(ctx,160,119,37,4,'#bcc7b5');rect(ctx,178,131,11,6,'#6c7f7a');
  rect(ctx,156,127,10,3,'#758984');rect(ctx,150,122,8,4,'#b5c4b4');
  character(ctx,133,117,'#977758','#543b36',t*3);
  const swing=Math.sin(t*5)>0?3:0;rect(ctx,155,117+swing,3,10,P.woodLight);rect(ctx,151,113+swing,12,5,'#acb6ae');
  if(view==='forge'&&Math.sin(t*5)>.85){rect(ctx,167,120,2,2,P.gold);rect(ctx,173,115,2,2,P.orange);}
  // Shop counter, coins, paper and hanging lamp.
  rect(ctx,274,122,87,36,P.woodDark);rect(ctx,270,116,95,11,'#aa7a52');rect(ctx,272,117,91,2,'#d5a66b');
  rect(ctx,280,129,29,22,'#81523f');rect(ctx,312,129,43,22,'#8a5c42');rect(ctx,309,130,2,19,'#b9895d');
  rect(ctx,319,110,21,5,'#e8d4a2');rect(ctx,321,111,16,1,'#8d7962');rect(ctx,283,109,7,6,P.gold);rect(ctx,283,109,7,1,'#f7d58e');
  character(ctx,302,85,'#88a091','#544744',t*2);
  character(ctx,277,156,'#b77b66','#604137',t*1.5);
  if(state.upgrades.apprentice)character(ctx,69,141,'#7ca8a0','#805340',t*2.5,2);
  rect(ctx,193,15,1,10,P.woodDark);rect(ctx,188,23,11,5,P.gold);rect(ctx,189,28,9,12,'#f2c176');rect(ctx,190,29,7,9,'#fae4a3');rect(ctx,188,40,11,2,P.gold);
  // Plants and sacks soften the corners.
  rect(ctx,17,174,15,14,'#ad7754');rect(ctx,15,171,19,5,'#c49263');
  rect(ctx,23,152,3,19,'#517651');rect(ctx,16,157,9,4,'#80a47d');rect(ctx,25,160,9,4,'#91ae80');rect(ctx,20,150,8,5,'#789b72');
  rect(ctx,337,175,21,17,'#b5a27a');rect(ctx,340,170,15,6,'#c5b48c');rect(ctx,346,173,3,16,'#8c795c');
  rect(ctx,5,207,374,7,P.woodDark);rect(ctx,11,207,361,2,P.woodLight);
}
function outdoors(ctx,state,t){
  rect(ctx,0,0,384,220,'#b7cbb6');rect(ctx,0,0,384,63,'#c3d3c3');
  for(let i=0;i<4;i++){const x=(i*99+t*3)%440-45;rect(ctx,x,17+i%2*10,48,8,'#e3e4ca');rect(ctx,x+10,12+i%2*10,24,7,'#e3e4ca');}
  for(let i=0;i<10;i++){const x=i*43-10;rect(ctx,x,60,45,40,'#7e9b89');rect(ctx,x+8,48,29,12,'#7e9b89');rect(ctx,x+16,41,13,7,'#7e9b89');}
  rect(ctx,0,96,384,124,'#88a075');
  for(let i=0;i<45;i++){const x=(i*71)%384,y=103+(i*31)%117;rect(ctx,x,y,3,2,i%2?'#adbb84':'#6f8d67');}
  for(let y=90;y<220;y+=4){const x=170+Math.round(Math.sin(y/44)*24);rect(ctx,x,y,46+(y-90)/4,4,'#c3ac80');rect(ctx,x,y,3,4,'#ac986f');}
  rect(ctx,274,125,110,53,'#658c89');for(let i=0;i<16;i++){rect(ctx,280+(i*19)%100,132+(i*13)%37,8,2,'#a4c1a8');}
  for(const [x,y,r] of [[29,106,28],[65,132,22],[327,101,28],[350,185,20],[15,185,23]]){
    rect(ctx,x-5,y-6,10,43,'#6e5646');rect(ctx,x-3,y,3,31,'#997458');circle(ctx,x,y-7,r,'#4d745b');circle(ctx,x-7,y-16,r-8,'#6b9267');circle(ctx,x+7,y-13,r-10,'#84a36f');
  }
  rect(ctx,204,76,87,45,'#687c73');rect(ctx,215,65,66,11,'#778a7b');rect(ctx,228,59,38,7,'#859882');
  rect(ctx,233,83,27,38,'#303c3c');rect(ctx,229,86,5,34,'#a6a993');rect(ctx,260,86,5,34,'#a6a993');rect(ctx,237,90,18,30,'#3f4a46');
  rect(ctx,187,132,4,35,P.wood);rect(ctx,177,132,26,13,P.woodLight);rect(ctx,180,136,19,2,P.cream);
  character(ctx,188,165,'#bc9061','#594339',t*3);
  for(let i=0;i<7;i++){const x=98+(i*27)%80,y=149+i*7;rect(ctx,x,y,3,4,'#d4bc87');rect(ctx,x-1,y-2,5,2,'#ece0b0');}
  rect(ctx,0,213,384,7,'#587359');
}
export function drawScene(canvas,state,view='forge',t=0){
  t /= 1000;
  if(canvas.width!==384){canvas.width=384;canvas.height=220;}
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  if(view==='explore')outdoors(ctx,state,t);else workshop(ctx,state,view,t);
}
function drawItem(ctx,type,color=P.gold){
  const r=(x,y,w,h,c=color)=>rect(ctx,x,y,w,h,c),line=(x,y,w,h)=>r(x,y,w,h,P.cream);
  switch(type){
    case 'sword':case 'knife':r(11,3,3,type==='knife'?11:15,'#b6c5bf');line(11,3,1,11);r(7,15,11,2,P.gold);r(11,17,3,5,P.woodLight);r(10,22,5,2,P.gold);break;
    case 'pickaxe':r(11,8,3,15,P.woodLight);r(5,5,15,4,'#8faaa5');r(2,8,4,3,'#8faaa5');r(19,8,3,3,'#8faaa5');line(5,5,15,1);break;
    case 'axe':case 'hammer':r(11,6,3,17,P.woodLight);r(5,4,type==='axe'?8:15,8,'#a1b4b0');line(5,4,9,2);if(type==='axe')r(3,6,3,6,'#a1b4b0');break;
    case 'lantern':r(8,3,9,3,P.gold);r(6,6,13,16,P.gold);r(8,8,9,11,'#354b45');r(11,9,4,8,'#f3c675');line(11,10,2,5);r(10,1,5,2,P.gold);r(5,22,15,2,P.woodLight);break;
    case 'shield':r(5,4,15,14,'#ae805b');r(7,18,11,3,'#ae805b');r(10,21,5,2,'#ae805b');r(6,5,13,2,'#b5c4b8');r(6,7,2,10,'#b5c4b8');r(17,7,2,10,'#b5c4b8');r(11,9,3,8,P.gold);break;
    case 'amulet':r(6,2,2,9,P.gold);r(17,2,2,9,P.gold);r(8,9,9,2,P.gold);r(9,11,7,9,'#89c9bb');line(10,13,2,4);r(11,20,3,2,P.gold);break;
    case 'ring':r(7,7,11,3,P.gold);r(5,10,3,9,P.gold);r(17,10,3,9,P.gold);r(8,19,9,3,P.gold);r(10,4,5,5,P.cyan);line(11,4,2,2);break;
    case 'staff':r(11,7,3,17,P.woodLight);r(8,3,9,7,P.gold);r(10,2,5,7,P.purple);line(11,2,2,3);r(8,12,3,2,P.gold);break;
    case 'key':r(7,2,10,3,P.gold);r(5,5,3,7,P.gold);r(16,5,3,7,P.gold);r(8,10,8,3,P.gold);r(11,13,3,10,P.gold);r(14,18,4,2,P.gold);r(14,22,5,2,P.gold);break;
    case 'goblet':r(6,3,13,3,P.gold);r(7,6,11,7,P.gold);r(9,13,7,3,P.gold);r(11,16,3,5,P.gold);r(7,21,11,3,P.gold);line(8,6,2,5);break;
    case 'crystal':case 'moon':r(9,2,6,3,type==='moon'?P.purple:P.cyan);r(6,5,12,12,type==='moon'?P.purple:P.cyan);r(9,17,6,5,type==='moon'?P.purple:P.cyan);line(9,5,2,10);break;
    case 'wood':r(4,7,17,11,P.woodLight);r(4,6,16,3,'#b28b63');r(4,15,17,3,P.wood);line(5,9,2,5);r(9,8,10,1,P.wood);break;
    case 'iron':case 'copper':case 'bronze':r(5,8,15,11,color);r(8,5,9,3,color);line(8,6,8,2);r(6,16,13,3,'#657e77');break;
    case 'coal':r(6,8,14,11,'#5c6371');r(9,4,7,5,'#5c6371');r(7,8,6,3,'#858598');r(5,16,17,3,'#414954');break;
    case 'forge':r(5,3,15,4,P.woodLight);r(4,7,17,16,P.stone);r(7,10,11,12,P.dark);r(10,14,5,7,P.orange);r(12,11,2,8,P.gold);break;
    case 'shop':r(4,6,17,5,P.gold);r(5,11,15,11,P.woodLight);r(8,13,4,5,P.dark);r(14,13,4,9,P.dark);r(5,4,15,2,P.red);break;
    case 'orders':r(5,3,15,20,P.cream);r(7,7,11,2,P.woodLight);r(7,11,8,2,P.woodLight);r(7,15,10,2,P.woodLight);r(16,19,3,3,P.orange);break;
    case 'explore':r(11,2,3,10,P.gold);r(7,9,11,9,P.green);r(4,16,17,7,P.green);r(11,18,3,6,P.woodLight);break;
    case 'develop':r(4,4,16,18,P.woodLight);r(6,5,12,15,P.cream);r(12,5,1,16,P.wood);r(7,8,4,1,P.woodLight);r(14,8,3,1,P.woodLight);r(7,11,4,1,P.woodLight);break;
    case 'coin':r(7,3,11,3,P.gold);r(4,6,17,13,P.gold);r(7,19,11,3,P.gold);line(7,6,2,11);r(12,8,3,9,'#b78443');break;
    case 'energy':r(12,2,6,3,P.gold);r(9,5,7,5,P.gold);r(6,10,12,3,P.gold);r(11,13,4,5,P.gold);r(9,18,4,4,P.gold);break;
    case 'star':r(11,2,3,6,P.gold);r(3,9,19,4,P.gold);r(7,6,11,10,P.gold);r(7,15,4,6,P.gold);r(14,15,4,6,P.gold);break;
    case 'relic':r(5,5,15,15,P.purple);r(8,3,9,3,P.gold);r(8,20,9,2,P.gold);r(11,8,4,3,P.cream);r(13,11,2,3,P.cream);r(11,14,3,2,P.cream);r(11,18,3,2,P.cream);break;
    default:r(5,5,15,15,color);line(7,7,3,8);
  }
}
export function iconURL(type,color=P.gold){
  const key=type+color;if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=28;c.height=28;const ctx=c.getContext('2d');drawItem(ctx,type,color);
  const url=c.toDataURL('image/png');cache.set(key,url);return url;
}
export function portraitURL(client){
  const key='portrait-'+client.id;if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=40;c.height=40;const ctx=c.getContext('2d');
  rect(ctx,0,0,40,40,'#e1d6b9');rect(ctx,3,3,34,34,'#cbcaae');character(ctx,4,5,client.color,client.hair,0,2);
  const url=c.toDataURL('image/png');cache.set(key,url);return url;
}
