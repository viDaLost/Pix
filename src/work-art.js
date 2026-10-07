import {C,px,oval,polygon,texture,panel,pixelLine,canvas} from './pixel.js';
import {paintItemSprite,paintRune} from './items.js';
import {drawEffects} from './effects.js';
import {targetZone} from './crafting.js';
const tables=new Map(),ZONE_X=[104,180,256];
function surface(step){let image=tables.get(step);if(image)return image;image=canvas(360,150);const c=image.getContext('2d');px(c,0,0,360,150,'#303447');
  if(step===0){for(let y=0;y<150;y+=19){panel(c,0,y,360,19,y%38?'#876550':'#99765a');texture(c,3,y+3,354,12,['#785445','#b18b63'],.11,14);}panel(c,27,30,306,96,'#8b967d');px(c,31,33,297,86,'#d1c39d');texture(c,34,35,290,81,['#dacaab','#bcaf91'],.06,7);px(c,33,35,290,1,'#ebe0bd');
  }else if(step===1){for(let y=1;y<150;y+=19)for(let x=(y%38?0:-14);x<360;x+=30)panel(c,x,y,29,18,y<80?'#717981':'#5a6374');panel(c,63,22,243,107,'#999b8b');polygon(c,[[72,117],[72,42],[89,31],[280,31],[296,42],[296,117]],'#282634');px(c,75,45,218,69,'#3a2d39');
  }else{px(c,0,0,360,150,'#3b4559');for(let x=3;x<360;x+=16){px(c,x,0,1,150,'#424d60');px(c,x+2,0,1,150,'#30384c');}texture(c,0,0,360,150,['#546175','#303b50'],.07,12);}
  for(const x of[7,350])for(const y of[7,140]){px(c,x,y,3,3,'#161f34');px(c,x,y,2,1,'#c1ab7c');}tables.set(step,image);return image;
}
function blank(c,work,task,color,step){
  const hits=step===2?task.hits.length:0,z=task.zoneHits||[0,0,0],kind=task.profile.kind,thick=work.design==='sturdy'?2:work.design==='light'?-2:0;
  c.save();
  if(step!==2){panel(c,62,58,235,22,color);px(c,66,60,224,3,'#efead1');px(c,67,77,222,1,'#6a8190');}
  else if(kind==='disc'){oval(c,180,73,65+hits*3,17+thick,'#25354a');oval(c,180,71,64+hits*3,15+thick,color);oval(c,177,65,51+hits*2,5,'#ffe0a0');px(c,143,80,72,1,'#c97746');for(let i=0;i<3;i++)if(z[i])pixelLine(c,ZONE_X[i]-8,73,ZONE_X[i]+11,71,'#ffcd7c',2);}
  else if(kind==='ring'){const rx=65-hits*2;oval(c,180,73,rx,17+thick,'#28364b');oval(c,180,71,rx-1,15+thick,color);oval(c,180,70,rx-10,7,'#3b4559');pixelLine(c,180-rx+13,61,180+rx-14,61,'#ffe5ab',2);pixelLine(c,180-rx+9,80,180+rx-8,80,'#e6a365',2);}
  else if(kind==='frame'){const left=80+z[0]*4,right=280-z[2]*4,drop=8+hits*2;polygon(c,[[left,60],[right,60],[right,77+drop],[right-11,81+drop],[right-11,70],[left+11,70],[left+11,81+drop],[left,77+drop]],'#26344a');polygon(c,[[left+2,62],[right-2,62],[right-2,76+drop],[right-9,79+drop],[right-9,68],[left+9,68],[left+9,79+drop],[left+2,76+drop]],color);px(c,left+4,62,right-left-8,2,'#ffe6a7');px(c,left+2,67,2,drop+8,'#ffe6a7');}
  else if(kind==='head'){polygon(c,[[94+z[0]*2,60],[262-z[2]*2,60],[283-z[2]*3,76],[262,86],[102,85],[81+z[0]*3,74]],'#263549');polygon(c,[[95+z[0]*2,62],[260-z[2]*2,62],[279-z[2]*3,75],[259,82],[104,81],[85+z[0]*3,73]],color);px(c,106,64,145,2,'#ffe5a8');panel(c,168,67,24,13,'#5c5761');px(c,170,68,18,2,'#e8ae72');}
  else{polygon(c,[[69,62+z[0]],[132,61+z[1]],[267,60+z[2]],[303,70],[267,84-z[2]],[132,84-z[1]],[69,84-z[0]]],'#25354b');polygon(c,[[71,64+z[0]],[133,63+z[1]],[266,62+z[2]],[299,70],[266,81-z[2]],[133,81-z[1]],[71,81-z[0]]],color);pixelLine(c,75,66+z[0],264,65+z[2],'#ffe0a6',2);pixelLine(c,140,77,273,74,'#e99d61');}
  c.restore();
}
export function paintWorkCloseup(canvasEl,s,r,time=0){
  if(!canvasEl||!s.work||s.work.step>2)return;const c=canvasEl.getContext('2d'),w=s.work,t=r.task,step=w.step,now=time/1000;if(!t)return;c.imageSmoothingEnabled=false;c.drawImage(surface(step),0,0);
  if(step===0){
    blank(c,w,t,'#a0b9bf',step);panel(c,60,100,239,12,'#bd9c68');for(let i=0;i<24;i++){px(c,62+i*10,101,1,i%5?3:6,'#76583f');if(i%5===0)px(c,65+i*10,103,2,1,'#ece0bc');}
    for(let i=0;i<2;i++){const x=62+t.profile.marks[i]*235;polygon(c,[[x-4,87],[x+4,87],[x,91]],i<t.hits.length?'#e3b461':'#73ba98');}
    for(const mark of t.cutPositions||[]){const x=62+mark*235;pixelLine(c,x,57,x,80,'#3c707b');pixelLine(c,x+1,59,x+1,78,'#dbf2dd');}
    const x=62+t.position*235,cut=r.actor.pose==='cut'?[0,2,4,1][Math.floor(now*10)%4]:0;panel(c,x-3,30+cut,8,19,'#b58c5b');px(c,x-2,47+cut,6,9,'#adc8ca');px(c,x,51+cut,1,7,'#e7edd5');
  }else if(step===1){
    const hot=t.position>.78?'#fff1b0':t.position>.45?'#ffc579':'#e78f61';
    for(let i=0;i<18;i++){const x=80+i*12,h=5+(Math.floor(now*9)+i*7)%20;px(c,x,113-h,6,h,i%3?'#da6946':'#f6b16a');px(c,x+2,115-h*.6,2,h*.6,'#ffe4a0');px(c,x+1,108,7,4,'#a36a4b');}
    blank(c,w,t,hot,step);const by=74+Math.round(t.holding?Math.sin(now*12)*2:0);panel(c,16,by,42,42,'#59404a');panel(c,19,by+4,35,32,'#956142');for(let y=11;y<36;y+=6)px(c,22,by+y,28,2,'#c09462');px(c,52,by+17,10,6,'#a1b7b6');px(c,54,by+18,7,1,'#e0d5b9');
    for(let i=0;i<14;i++)px(c,89+i*14,127,9,6,i/14<t.position?'#ecc784':'#434354');
  }else{
    oval(c,180,137,115,7,'#283448');panel(c,157,98,52,39,'#5e5d61');polygon(c,[[147,125],[159,114],[160,99],[204,99],[205,114],[218,125],[217,131],[148,131]],'#41566b');px(c,165,106,8,16,'#75959f');px(c,152,126,61,2,'#738d97');
    polygon(c,[[46,88],[62,81],[292,81],[299,85],[319,85],[310,95],[297,96],[293,108],[95,108],[78,101],[45,99]],'#24334a');polygon(c,[[50,88],[64,84],[290,84],[298,88],[312,88],[305,93],[294,93],[289,102],[96,102],[81,97],[48,96]],'#8daeb7');px(c,66,84,221,3,'#c6d7c7');px(c,97,98,192,3,'#527489');for(let i=0;i<10;i++)px(c,89+i*17,91+i%3,6,1,i%2?'#a9c4bd':'#71919e');
    const hot=t.temperature>.7?'#ffc47b':t.temperature>.45?'#eaa16a':t.temperature>.3?'#b87560':'#7e7c8d';blank(c,w,t,hot,step);
    const zone=targetZone(t);for(let i=0;i<3;i++){const x=ZONE_X[i];px(c,x-5,117,11,1,i===zone?'#9bd3a4':'#798992');px(c,x,113,1,9,i===zone?'#eff2b3':'#718292');if(i===zone){px(c,x-2,115,5,5,'#99c39b');px(c,x-1,116,3,3,'#f4efc2');}}
    const elapsed=Math.max(0,time-(r.actor.poseStarted||0)),moving=r.actor.pose==='hammer',frame=moving?Math.min(6,Math.floor(elapsed/60)):0,hy=[15,3,0,4,51,54,36][frame],x=ZONE_X[moving?(t.lastZone??zone):zone];
    if(moving&&frame===4){c.save();c.globalAlpha=.16;pixelLine(c,x-6,16,x+10,51,'#e6d9bc',3);pixelLine(c,x+7,18,x+15,48,'#e6d9bc',2);c.restore();}
    panel(c,x+1,hy+10,6,34,'#bd8d5b');polygon(c,[[x-19,hy],[x+19,hy],[x+24,hy+5],[x+20,hy+14],[x-19,hy+14],[x-24,hy+8]],'#243349');px(c,x-18,hy+2,35,8,'#92b1bf');px(c,x-17,hy+2,31,2,'#d2dfcf');px(c,x+13,hy+5,8,6,'#536f87');px(c,x-19,hy+3,3,7,'#bccdc6');
    if(t.hits.length>2){c.save();c.globalAlpha=.34;c.translate(304,14);c.scale(1.4,1.4);paintItemSprite(c,w.recipe,'#d6c799');c.restore();}
  }
  c.save();const point=[[88,222],[187,150],[283,246]][step];c.translate(180-point[0],76-point[1]);drawEffects(c,r.effects,time,r.reduced);c.restore();paintRune(c,w.rune,315,32,now);
}
