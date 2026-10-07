const COLORS={spark:['#fff7b0','#ffd54d','#ff862e'],ember:['#ffd54d','#ff862e','#ffbc54'],chip:['#fff3ce','#e7b571','#a87541'],steam:['#ffffff','#baf4fa','#85dfe6'],magic:['#fff0ff','#cba0ff','#6ee9f2'],coin:['#fff4a2','#ffcf42','#ffa744'],good:['#ffffff','#70f6cd','#34cbb1']};
export function createEffects(){return {particles:[],labels:[],shake:0,seed:9271};}
function random(fx){fx.seed=(Math.imul(fx.seed,1664525)+1013904223)>>>0;return fx.seed/4294967296;}
export function emitEffect(fx,type,x,y,now,label='') {
  const colors=COLORS[type]||COLORS.good,count=type==='ember'?5:type==='steam'?20:type==='magic'?22:14;
  for(let i=0;i<count;i++) {
    const angle=-Math.PI+random(fx)*Math.PI,speed=22+random(fx)*83,steam=type==='steam';
    fx.particles.push({x:x+(random(fx)-.5)*12,y,vx:steam?(random(fx)-.5)*23:Math.cos(angle)*speed,vy:steam?-15-random(fx)*26:Math.sin(angle)*speed,gravity:steam?-13:type==='magic'?12:120,life:steam?1.1+random(fx)*.5:.35+random(fx)*.6,size:steam?3+Math.floor(random(fx)*4):1+Math.floor(random(fx)*2),color:colors[i%colors.length],type,born:now});
  }
  fx.particles=fx.particles.slice(-120);
  if(label)fx.labels.push({x,y:y-12,text:label,life:1,color:colors[0]});
  fx.labels=fx.labels.slice(-4);if(type==='spark')fx.shake=.16;
}
export function updateEffects(fx,dt) {
  const step=Math.max(0,Math.min(dt,.05));
  for(const p of fx.particles){p.life-=step;p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=p.gravity*step;}
  fx.particles=fx.particles.filter(p=>p.life>0);
  for(const p of fx.labels){p.life-=step;p.y-=18*step;}
  fx.labels=fx.labels.filter(p=>p.life>0);fx.shake=Math.max(0,fx.shake-step);
}
export function drawEffects(ctx,fx,time=0,reduced=false) {
  if(!fx)return;ctx.save();
  const visible=reduced?fx.particles.slice(0,10):fx.particles;
  for(const p of visible) {
    ctx.globalAlpha=Math.min(1,p.life*2)*(p.type==='steam'?.65:1);ctx.fillStyle=p.color;
    const x=Math.round(p.x),y=Math.round(p.y),size=p.size;ctx.fillRect(x,y,size,size);
    if(p.type==='steam')ctx.fillRect(x-1,y+size,Math.max(1,size-1),2);
    if(p.type==='magic'||p.type==='coin'){ctx.fillRect(x-2,y+1,size+4,1);ctx.fillRect(x+1,y-2,1,size+4);}
  }
  ctx.font='bold 11px sans-serif';ctx.textAlign='center';
  for(const p of fx.labels){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle='#183956';ctx.fillText(p.text,p.x+1,p.y+1);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y);}
  ctx.restore();
}
