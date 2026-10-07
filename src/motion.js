export function createActor(x,y,facing='right') {
  return {x,y,facing,pose:'idle',path:[],phase:0,speed:0,workUntil:0,poseStarted:0,after:null};
}
// Round the corridor's corners instead of turning in a single frame.
function roundRoute(points) {
  const route=[];
  for(let i=1;i<points.length-1;i++) {
    const a=points[i-1],b=points[i],c=points[i+1];
    const before=Math.hypot(b.x-a.x,b.y-a.y),after=Math.hypot(c.x-b.x,c.y-b.y);
    if(before<1||after<1)continue;
    const radius=Math.min(15,before/3,after/3);
    const start={x:b.x+(a.x-b.x)*radius/before,y:b.y+(a.y-b.y)*radius/before};
    const end={x:b.x+(c.x-b.x)*radius/after,y:b.y+(c.y-b.y)*radius/after};
    route.push(start);
    for(let j=1;j<=5;j++){const t=j/5,u=1-t;route.push({x:u*u*start.x+2*u*t*b.x+t*t*end.x,y:u*u*start.y+2*u*t*b.y+t*t*end.y});}
  }
  route.push(points.at(-1));return route;
}
export function moveActor(actor,x,y,room='forge') {
  const points=[{x:actor.x,y:actor.y}],corridor=room==='shop'?278:286;
  if(Math.abs(x-actor.x)>80&&Math.min(actor.y,y)<260)points.push({x:actor.x,y:corridor},{x,y:corridor});
  points.push({x,y});actor.path=roundRoute(points);actor.after=null;actor.workUntil=0;
}
export function updateActor(actor,dt,now) {
  const elapsed=Math.max(0,Math.min(dt,.05));
  if(actor.path.length) {
    const target=actor.path[0],dx=target.x-actor.x,dy=target.y-actor.y,distance=Math.hypot(dx,dy);
    const desired=actor.path.length===1?Math.min(155,Math.max(24,Math.sqrt(distance*750))):155,change=720*elapsed;
    actor.speed=Math.max(0,actor.speed+Math.max(-change,Math.min(change,desired-actor.speed)));
    const step=actor.speed*elapsed;
    if(distance>.1)actor.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    actor.pose='walk';actor.phase+=Math.min(distance,step)/17;
    if(distance<=Math.max(.5,step)){actor.x=target.x;actor.y=target.y;actor.path.shift();}
    else {actor.x+=dx/distance*step;actor.y+=dy/distance*step;}
    if(!actor.path.length){actor.pose='idle';actor.speed=0;if(actor.after){const done=actor.after;actor.after=null;done();}}
  } else if(actor.workUntil&&now>=actor.workUntil){actor.pose='idle';actor.workUntil=0;}
}
