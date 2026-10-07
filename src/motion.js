export function createActor(x,y,facing='right') { return {x,y,facing,pose:'idle',path:[],phase:0,workUntil:0,after:null}; }
export function moveActor(actor,x,y,room='forge') {
  actor.path=[];
  const corridor=room==='shop'?278:286;
  if(Math.abs(x-actor.x)>80 && Math.min(actor.y,y)<260)actor.path.push({x:actor.x,y:corridor},{x,y:corridor});
  actor.path.push({x,y}); actor.after=null;
}
export function updateActor(actor,dt,now) {
  if(actor.path.length){
    const target=actor.path[0],dx=target.x-actor.x,dy=target.y-actor.y,distance=Math.hypot(dx,dy),step=145*Math.min(dt,.05);
    actor.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    actor.pose='walk'; actor.phase+=dt*9;
    if(distance<=step){actor.x=target.x;actor.y=target.y;actor.path.shift();}
    else {actor.x+=dx/distance*step;actor.y+=dy/distance*step;}
    if(!actor.path.length){actor.pose='idle';if(actor.after){const done=actor.after;actor.after=null;done();}}
  }else if(actor.workUntil && now>=actor.workUntil){actor.pose='idle';actor.workUntil=0;}
}
