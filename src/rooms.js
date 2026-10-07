import {C,px,oval,polygon,shade,noise,texture,panel,canvas,pixelLine,sparkle} from './pixel.js';
import {paintItem} from './items.js';
const rooms=new Map(),lights=new Map(),fires=new Map();
function timber(c,x,y,w,h,base='#885d4b'){
  panel(c,x,y,w,h,base);for(let yy=y+5;yy<y+h-3;yy+=5){const start=4+noise(x,yy)*9;px(c,x+start,yy,Math.min(w-start-3,11+noise(yy,x)*19),1,shade(base,noise(x+3,yy)> .5?20:-22));}for(const xx of[x+3,x+w-4]){px(c,xx,y+3,1,1,C.cream);px(c,xx,y+h-4,1,1,C.deep);}
}
function brick(c,x,y,w,h,base){px(c,x,y,w,h,shade(base,-26));px(c,x+1,y+1,w-2,h-2,base);px(c,x+2,y+1,w-5,1,shade(base,30));px(c,x+1,y+2,1,h-5,shade(base,15));texture(c,x+3,y+3,w-6,h-6,[shade(base,-13),shade(base,14)],.1,x+y);}
function window(c,x,y,w,h,night=false,curtain=false){
  px(c,x-7,y-6,w+14,h+19,'#293443');panel(c,x-5,y-4,w+10,h+12,'#a67954');px(c,x,y,w,h,night?'#4a6596':'#8ccddd');
  for(let j=0;j<4;j++)px(c,x+1,y+j*8,w-2,8,night?['#344666','#42577c','#576d8f','#7186a4'][j]:['#78b9d1','#94d3db','#b0e3dd','#d1eedb'][j]);
  if(night){px(c,x+w-15,y+9,5,2,C.cream);px(c,x+w-17,y+11,6,5,C.cream);px(c,x+w-14,y+9,4,6,night?'#576d8f':C.cream);for(let i=0;i<7;i++)px(c,x+7+i*19%(w-10),y+4+i*7%20,1,1,'#c6d3e5');}
  else{oval(c,x+w-15,y+12,6,6,'#f5d882');px(c,x+8,y+6,13,2,'#e5f1de');px(c,x+6,y+8,22,2,'#e5f1de');px(c,x+29,y+22,13,2,'#d5ebdf');}
  polygon(c,[[x,y+h],[x,y+h-21],[x+12,y+h-31],[x+26,y+h-20],[x+37,y+h-29],[x+w,y+h-18],[x+w,y+h]],night?'#2b5262':'#537e81');
  for(let i=0;i<5;i++){const xx=x+i*15;polygon(c,[[xx,y+h],[xx-6,y+h-13],[xx+3,y+h-25],[xx+13,y+h-16],[xx+17,y+h]],night?'#325761':'#619586');px(c,xx+3,y+h-19,2,9,night?'#3f6e6e':'#8ebb8d');}
  px(c,x+3,y+3,2,h-5,'#d2eee7');px(c,x+6,y+3,1,15,'#bbdedc');px(c,x+w/2-2,y,4,h,'#725346');px(c,x+w/2-2,y,1,h,'#c99867');px(c,x,y+h/2,w,3,'#725346');px(c,x,y+h/2,Math.floor(w/2)-3,1,'#d3ae75');
  timber(c,x-8,y+h+3,w+16,9,'#b98559');px(c,x-9,y+h+3,w+18,2,'#ecc489');px(c,x-6,y+h+12,w+12,3,'#332938');
  if(curtain){for(const xx of[x-7,x+w-2]){polygon(c,[[xx,y-4],[xx+11,y-4],[xx+8,y+31],[xx+3,y+36],[xx,y+17]],'#b57a52');px(c,xx+3,y+1,2,26,'#e4b07a');px(c,xx+7,y+6,1,24,'#835447');px(c,xx+1,y+30,8,2,'#e3c36d');}}
}
function shell(c,s,shop){
  px(c,0,0,480,320,'#29273b');px(c,8,20,464,291,'#343549');
  px(c,14,27,452,124,shop?'#6b8e92':'#819f98');
  for(let y=30;y<151;y+=16){for(let x=16+(y%32===14?16:0);x<466;x+=34)brick(c,x,y,32,15,shop?(noise(x,y)>.6?'#769b9a':'#638991'):(noise(x,y)>.6?'#92aca0':'#77968f'));}
  px(c,15,142,450,17,'#3f4149');px(c,15,143,450,3,'#be9b69');px(c,15,154,450,3,'#1e2938');
  px(c,14,158,452,146,'#735248');
  for(let row=0;row<8;row++){const y=158+row*18;for(let x=14-(row%3)*31;x<466;x+=91){const w=Math.min(90,466-Math.max(14,x)),start=Math.max(14,x),base=['#996b4d','#a77650','#8f614b','#a17051'][Math.floor(noise(x,y)*4)];px(c,start,y,w,17,base);px(c,start+1,y+1,w-2,1,shade(base,34));px(c,start+1,y+15,w-2,1,shade(base,-26));if(x>=14)px(c,x,y,1,17,'#503b40');for(let i=0;i<5;i++){const gx=start+6+noise(x+i,y)*Math.max(1,w-24),gy=y+4+i*2;px(c,gx,gy,4+noise(i,y)*15,1,i%2?shade(base,-11):shade(base,12));}if(w>34){px(c,start+5,y+4,1,1,'#493543');px(c,start+w-8,y+12,1,1,'#493543');}}}
  // The room frame has thickness and braces; it is part of the world.
  for(const x of[9,116,337,456]){timber(c,x,26,12,126,'#6c4a42');px(c,x+2,30,2,116,'#c19562');px(c,x+8,38,2,90,'#473440');for(const y of[42,109]){px(c,x+2,y,8,3,'#374352');px(c,x+3,y,1,1,'#adab91');px(c,x+8,y,1,1,'#adab91');}}
  timber(c,7,15,466,13,'#67483f');px(c,12,17,456,2,'#cba576');px(c,11,28,458,4,'#3c3945');
  window(c,31,47,67,62,s.day%4===0,shop);window(c,375,45,63,62,s.day%4===0,shop);
  timber(c,8,304,464,11,'#655044');px(c,16,305,448,1,'#d3ac76');px(c,15,315,450,3,'#1c2636');
  for(const x of[110,335]){pixelLine(c,x,28,x,47,C.deep);panel(c,x-5,48,12,19,'#947056');px(c,x-3,51,8,13,'#f6cd7c');px(c,x-2,52,3,10,'#fff1b4');px(c,x+2,52,1,10,'#aa7849');px(c,x-6,67,14,2,'#413548');}
}
function forge(c,s){
  // Heat-proof masonry under the furnace and the hearth's stone arch.
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)brick(c,123+col*24-(row%2?5:0),176+row*10,22,9,['#55576a','#616378','#6e6f7f'][row%3]);
  polygon(c,[[139,28],[191,28],[191,80],[207,94],[206,179],[126,179],[126,96],[139,80]],'#283444');
  for(let y=31;y<91;y+=11)for(let x=140+(y%22===9?0:-4);x<192;x+=19)brick(c,x,y,18,10,'#858c89');
  polygon(c,[[130,98],[145,80],[187,80],[203,98],[203,168],[130,168]],'#959a8e');
  for(let y=100;y<167;y+=14)for(const x of[131,190])brick(c,x,y,12,13,'#9b9d8e');
  for(const [x,y]of[[135,92],[146,84],[160,81],[174,84],[185,92]])brick(c,x,y,13,12,'#b5b5a0');
  polygon(c,[[145,107],[153,96],[179,96],[190,108],[190,158],[144,158]],'#242937');px(c,148,110,38,43,'#3b2c39');
  px(c,145,153,45,5,'#574138');px(c,147,153,41,1,'#e7a45a');for(let i=0;i<8;i++)px(c,147+i*5,156,3,4,i%2?'#f2bc66':'#ad633d');
  panel(c,127,167,77,12,'#778382');px(c,130,168,70,2,'#bbc5aa');timber(c,121,179,88,9,'#526573');
  if(s.upgrades.furnace){for(const x of[130,195]){px(c,x,100,4,63,'#725544');px(c,x+1,102,2,56,'#d0a56b');for(let y=107;y<162;y+=15)px(c,x+1,y,1,1,C.light);}px(c,143,95,47,2,C.gold);}
  timber(c,214,151,27,30,'#774d40');for(let i=0;i<6;i++)px(c,217,155+i*4,20,1,'#352d37');timber(c,212,146,31,5,s.equipment.bellows?'#c99964':'#aa8055');px(c,241,155,11,3,'#718b95');px(c,242,155,8,1,'#c7d7c1');px(c,222,141,12,4,'#483339');
  // Stock cabinet: open boxes, folded cloth, bars and a coal bucket.
  timber(c,27,197,80,58,'#81553f');timber(c,24,189,86,9,'#b28556');px(c,29,201,76,20,'#443c43');px(c,29,225,76,22,'#49373f');
  for(let i=0;i<5;i++){panel(c,33+i*13,201,11,7,i%2?'#9aaeb0':'#b88b5b');px(c,35+i*13,201,7,1,'#e6dcc2');}timber(c,28,220,77,5,'#bd905f');
  for(let i=0;i<3;i++)timber(c,35+i*21,233,19,9,'#a4784f');panel(c,32,168,27,20,'#b8a577');px(c,35,171,5,13,'#e2d8aa');px(c,46,171,2,13,'#736b5c');timber(c,65,176,22,12,'#987659');
  oval(c,103,275,10,4,'#292738');panel(c,92,260,20,14,'#4c5864');oval(c,102,260,9,3,'#313243');for(let i=0;i<7;i++)px(c,95+i*7%14,259+i%3,3,2,i%2?'#676a7a':'#8b7c84');pixelLine(c,93,259,96,253,'#a09a94');pixelLine(c,108,259,107,253,'#a09a94');pixelLine(c,96,253,107,253,'#a09a94');
  timber(c,117,264,37,28,'#a47950');timber(c,114,260,43,6,'#bd965e');for(let i=0;i<3;i++){panel(c,121+i*10,269,9,7,i%2?'#b48467':'#86a3af');px(c,122+i*10,269,6,1,'#e2dcc2');}
  // Peg board: each tool has its own silhouette, leather loops and a shadow.
  timber(c,259,59,70,79,'#856648');px(c,263,63,62,70,'#534d49');texture(c,266,65,57,66,['#615e55','#474449'],.13,15);
  for(let i=0;i<4;i++){const x=269+i*15;px(c,x+3,74,1,3,'#c9af74');pixelLine(c,x+4,80,x+3,113,'#2d303d',2);px(c,x+3,80,2,30,'#bca272');px(c,x+4,81,1,20,'#e3c591');px(c,x-1,80,10,i%2?4:6,'#3b4c5c');px(c,x,80,8,2,'#b7c8c1');px(c,x,82,2,2,'#6d8fa0');}timber(c,265,123,59,4,'#ae895b');panel(c,270,114,12,6,'#9bb5a3');panel(c,289,113,9,7,'#947aa2');
  for(let y=45;y<140;y+=5){px(c,234,y,2,4,'#273845');px(c,235,y,1,2,'#a5b3a7');}px(c,231,139,8,5,'#463b3c');px(c,232,139,6,2,'#d3a666');
  // A substantial bench with two drawers and visible joinery.
  timber(c,355,170,94,41,'#845842');for(const x of[358,439])timber(c,x,207,7,20,'#66473d');
  timber(c,350,162,106,10,'#c19a64');px(c,352,163,100,1,'#f0d49b');polygon(c,[[356,172],[448,172],[445,179],[359,179]],'#4b3840');
  for(const x of[362,401]){timber(c,x,182,36,20,'#a1754d');px(c,x+15,189,7,3,'#373642');px(c,x+16,189,5,1,'#e3bd75');}
  panel(c,374,151,25,9,'#dac798');px(c,377,154,17,1,'#a69273');px(c,377,157,9,1,'#a69273');panel(c,405,150,15,11,'#75969b');px(c,407,151,9,2,'#c1d9c1');pixelLine(c,424,160,443,158,'#a9c9c7',2);px(c,439,156,3,6,'#dca86b');
  if(s.equipment.engraver){panel(c,412,145,22,5,'#96759d');px(c,421,140,3,10,C.gold);px(c,421,140,1,5,C.cream);}
  // Anvil: beveled horn, cast steel body, mounting bolts and dark timber block.
  oval(c,287,297,43,6,'#493941');timber(c,266,273,51,23,'#8d6550');for(let x=272;x<313;x+=7){px(c,x,279,1,15,'#5b423e');px(c,x+1,279,1,8,'#b18b5c');}px(c,269,291,46,3,'#3b434d');
  polygon(c,[[273,272],[275,263],[281,259],[281,255],[303,255],[303,260],[310,263],[312,272]],'#354351');px(c,280,260,25,5,'#607b89');px(c,282,262,2,6,'#7d9da5');
  polygon(c,[[247,248],[253,245],[317,245],[320,249],[331,250],[326,255],[315,256],[315,262],[263,262],[254,258],[243,255]],C.ink);
  polygon(c,[[250,248],[255,247],[314,247],[317,251],[325,251],[321,254],[313,254],[311,258],[264,258],[258,254],[248,253]],s.equipment.anvil?'#a6c0c3':'#8eabba');px(c,255,247,57,2,'#d1e0d4');px(c,263,249,41,1,'#b4d1d0');px(c,265,256,47,2,'#567786');px(c,310,250,5,3,'#638b9b');
  for(const x of[272,310]){px(c,x,271,3,2,'#283e4e');px(c,x+1,271,1,1,'#d4c2a0');}
  if(s.equipment.grindstone){timber(c,333,261,25,31,'#75574a');timber(c,337,259,5,35,'#b78758');oval(c,345,247,17,17,C.ink);oval(c,345,247,14,14,'#879ba1');oval(c,342,244,11,11,'#b1bdb5');oval(c,345,247,5,5,'#718792');px(c,344,245,3,4,'#dab36f');pixelLine(c,344,249,360,252,'#b98c5b',2);}
  // Oval water surface, staves, metal bands and individual rivets.
  oval(c,413,282,25,5,'#493740');polygon(c,[[389,234],[437,234],[434,279],[395,279]],'#5d4342');for(let i=0;i<5;i++){timber(c,393+i*8,237,7,38,i%2?'#a87c52':'#926647');}oval(c,413,232,25,6,'#c69b63');oval(c,413,231,21,4,'#344a5f');oval(c,413,231,19,3,'#668f96');px(c,399,230,11,1,'#bbdaca');for(const y of[246,271]){px(c,391,y,44,4,'#35465b');px(c,394,y,36,1,'#849d9e');for(const x of[397,429])px(c,x,y+1,1,1,'#c9ceba');}
  if(s.equipment.barrel){panel(c,445,256,14,24,'#8a5b43');px(c,449,252,6,4,'#d5ad68');px(c,448,260,4,13,'#e2b05e');px(c,451,261,1,9,'#775841');}
  // Small props build a lived-in room without covering the walking corridor.
  timber(c,26,279,22,18,'#a56e4b');oval(c,37,278,13,4,'#6b4f42');pixelLine(c,37,278,35,252,'#596b52',2);polygon(c,[[35,264],[25,259],[26,255],[33,256],[37,265]],'#81a776');polygon(c,[[36,262],[42,251],[49,254],[43,261]],'#afc581');px(c,34,250,4,6,'#71a06d');
  timber(c,445,280,18,17,'#a18058');panel(c,448,271,11,17,'#baa56f');px(c,451,274,3,11,'#ede0a4');px(c,454,276,2,10,'#806b4f');
}
function bottle(c,x,y,color){
  px(c,x+3,y,5,3,'#524238');px(c,x+4,y,3,1,'#d8b982');polygon(c,[[x+2,y+3],[x+9,y+3],[x+11,y+6],[x+10,y+17],[x+1,y+17],[x,y+6]],'#26384a');px(c,x+2,y+5,7,10,shade(color,-20));px(c,x+3,y+6,5,8,color);px(c,x+2,y+5,2,8,shade(color,49));px(c,x+3,y+12,6,3,'#d6c5a0');px(c,x+5,y+13,2,1,'#8b7a6b');px(c,x+7,y+6,1,3,shade(color,30));px(c,x+2,y+16,7,1,'#6b827f');
}
function cabinet(c,x,y){
  timber(c,x,y,94,100,'#765542');px(c,x+5,y+6,84,88,'#303444');for(let row=0;row<3;row++){const yy=y+8+row*28;for(let col=0;col<5;col++)bottle(c,x+9+col*15,yy,['#729a96','#ad7184','#8c81b0','#b7a773','#84a688'][(col+row)%5]);timber(c,x+4,yy+18,86,5,'#b58e5d');px(c,x+6,yy+23,82,2,'#262d3b');}px(c,x+3,y+5,2,90,'#c6a779');px(c,x+89,y+6,1,88,'#4f3c40');
}
function counter(c,front=false){
  if(!front){timber(c,170,113,165,14,'#c09968');px(c,173,114,158,2,'#f1d7a0');polygon(c,[[174,107],[323,107],[334,113],[171,113]],'#ab8e64');px(c,190,108,27,2,'#e8d7ac');panel(c,306,108,14,5,'#c7ac77');return;}
  timber(c,176,127,153,51,'#845b46');for(const x of[183,255]){panel(c,x,133,65,37,'#a57c50');panel(c,x+5,137,55,29,'#b68b5c');px(c,x+8,139,48,1,'#d1ac75');}px(c,179,175,148,3,'#413741');px(c,181,128,144,2,'#d2aa78');
}
function shop(c,s){
  cabinet(c,143,46);cabinet(c,255,46);
  for(let i=0;i<3;i++){const x=42+i*129;oval(c,x+48,224,54,6,'#523d43');timber(c,x,190,96,32,'#89614a');panel(c,x+7,195,81,18,'#ae8255');px(c,x+9,197,77,1,'#d9b480');timber(c,x-4,181,104,9,'#c5a477');px(c,x-2,183,98,1,'#eee0b1');px(c,x+1,190,91,2,'#473b43');}
  counter(c);counter(c,true);
  // Tall shop door, iron fittings and a small stained-glass transom.
  panel(c,24,110,65,82,'#684d46');timber(c,30,116,53,75,'#997957');for(const x of[34,43,52,62,73])px(c,x,121,1,65,'#665044');panel(c,35,121,42,21,'#465e70');px(c,38,124,15,15,'#83b6ba');px(c,55,124,18,15,'#9aa986');px(c,37,130,38,2,'#bdaa79');px(c,52,123,2,17,'#ccb589');px(c,68,163,5,4,C.gold);px(c,69,163,2,1,C.cream);for(const y of[147,179]){px(c,31,y,15,3,'#354355');px(c,34,y,1,1,'#a4aa9c');}
  // Woven rug: a quiet contrasting area for the visitors' silhouettes.
  panel(c,179,249,146,42,'#9a5960');px(c,184,253,136,33,'#b7796d');for(let i=0;i<22;i++){px(c,184+i*6,253,3,2,'#edc196');px(c,184+i*6,284,3,2,'#edc196');}for(let x=199;x<312;x+=25){polygon(c,[[x,268],[x+5,262],[x+11,268],[x+5,274]],'#d5a486');px(c,x+5,265,1,7,'#966064');}texture(c,189,258,126,20,['#bc806f','#a56963'],.1,41);
  panel(c,382,120,49,30,'#8b704e');panel(c,386,123,41,23,'#d7c695');px(c,390,128,25,1,'#a59170');px(c,390,132,30,1,'#a59170');px(c,391,136,17,1,'#a59170');px(c,418,137,4,4,'#b06a54');
  if(s.upgrades.shelves){timber(c,373,155,71,52,'#709b97');panel(c,378,159,61,42,'#364c63');for(let i=0;i<3;i++)bottle(c,384+i*16,170,['#ac90bf','#89b5a3','#d3b272'][i]);px(c,380,161,2,31,'#abc5b6');px(c,381,161,49,1,'#719598');}
  // Herbs, bundled scrolls, a hanging sign and the shopkeeper's ledgers.
  for(let i=0;i<4;i++){pixelLine(c,239+i*7,28,238+i*7,45,'#705a49');polygon(c,[[236+i*7,38],[241+i*7,36],[243+i*7,49],[235+i*7,51]],['#798f6b','#9a9a76','#6f967b','#baa87b'][i]);px(c,237+i*7,40,2,7,'#b9c390');}
  timber(c,356,276,26,20,'#a17f50');for(let i=0;i<3;i++){panel(c,359+i*7,269-i%2*4,6,20,'#d9c695');px(c,361+i*7,270-i%2*4,1,17,'#fbefc2');px(c,359+i*7,282,6,2,'#97734b');}
  timber(c,26,281,22,16,'#a67752');polygon(c,[[36,282],[29,268],[29,261],[34,266],[40,279]],'#749775');polygon(c,[[37,280],[38,257],[44,261],[42,269]],'#9eb98a');px(c,37,262,3,5,'#9d799f');
}
export function paintRoom(c,s,view){
  const key=[view,s.day%4===0,...Object.values(s.equipment),...Object.values(s.upgrades)].join('|');let image=rooms.get(key);
  if(!image){image=canvas(480,320);const ctx=image.getContext('2d');shell(ctx,s,view==='shop');if(view==='shop')shop(ctx,s);else forge(ctx,s);rooms.set(key,image);if(rooms.size>20)rooms.delete(rooms.keys().next().value);}
  c.drawImage(image,0,0);
}
function flame(frame){let image=fires.get(frame);if(image)return image;image=canvas(54,58);const c=image.getContext('2d');for(let i=0;i<10;i++){const x=2+i*5,h=17+Math.floor(noise(i,frame,25)*31);polygon(c,[[x,56],[x-1,55-h/3],[x+1,55-h],[x+4,52-h/2],[x+5,56]],'#c35741');polygon(c,[[x+1,56],[x,53-h/3],[x+2,55-h*.8],[x+5,53-h*.25],[x+5,56]],'#f29a49');polygon(c,[[x+2,56],[x+1,55-h*.3],[x+3,55-h*.5],[x+4,56]],'#ffe5a0');if(i%3===0)px(c,x+2,42-h,1,2,'#f4c56f');}fires.set(frame,image);return image;}
export function paintRoomLife(c,s,view,t){
  if(view==='forge'){c.drawImage(flame(Math.floor(t*9)%8),143,101);if(s.work?.step===1){c.save();c.globalAlpha=.25;oval(c,169,157,23,5,'#ffc675');c.restore();}if(s.equipment.grindstone){const a=t*4;pixelLine(c,345,247,345+Math.cos(a)*12,247+Math.sin(a)*12,'#6d838c');px(c,344,245,2,3,'#ebc179');}}
  else{const day=Math.floor(t*3)%8;for(const [x,y]of[[173,79],[292,50],[316,103]])if(day%3===0)sparkle(c,x,y,'#d7e1c1',1);}
  // Just six quiet motes in the light. They do not allocate particles.
  c.save();for(let i=0;i<6;i++){c.globalAlpha=.12+(i%3)*.04;const x=48+i*41+Math.sin(t*.3+i)*5,y=45+(t*5+i*33)%127;px(c,x,y,1,1,'#fff1c7');}c.restore();
}
export function paintCounterFront(c){counter(c,true);}
export function paintLighting(c,s,view,t){
  const night=s.day%4===0,key=`${view}-${night}`;let image=lights.get(key);
  if(!image){image=canvas(480,320);const ctx=image.getContext('2d');for(let y=0;y<320;y+=4)for(let x=0;x<480;x+=4){const edge=Math.max(0,Math.hypot((x-240)/300,(y-170)/230)-.45),a=(night?.12:.025)+edge*.16;px(ctx,x,y,4,4,`rgba(31,29,55,${Math.min(.38,a)})`);}if(!night){ctx.globalAlpha=.085;polygon(ctx,[[32,89],[88,89],[197,260],[104,275]],'#ffedb4');ctx.globalAlpha=.06;polygon(ctx,[[375,81],[432,81],[407,227],[337,216]],'#daf6e3');ctx.globalAlpha=1;}lights.set(key,image);}
  c.drawImage(image,0,0);
  if(view==='forge'){c.save();for(let i=5;i>0;i--){c.globalAlpha=(.012+(5-i)*.004)*(s.day%4===0?1.5:1)*(1+Math.sin(t*7)*.08);oval(c,169,162,12+i*14,8+i*12,'#ffc06c');}c.restore();}
}
