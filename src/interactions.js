export function createWorkInput(work,now=0) {
  return {step:work.step,day:work.day,started:now,holding:false,position:0,hits:[],lastHit:-1000,finishMethod:'plain',rivets:[],rubDistance:0,dragging:false};
}
export function finishProgress(input) {
  return input.finishMethod==='plain'?input.rivets.length/3:Math.min(1,input.rubDistance/260);
}
export function placeRivet(input,index) {
  if(input.finishMethod!=='plain'||!Number.isInteger(index)||index<0||index>2)return false;
  if(!input.rivets.includes(index))input.rivets.push(index);return finishProgress(input)>=1;
}
export function rubSurface(input,dx,dy) {
  if(input.finishMethod==='plain'||!Number.isFinite(dx)||!Number.isFinite(dy))return false;
  const distance=Math.hypot(dx,dy);if(distance>=3)input.rubDistance+=Math.min(32,distance);return finishProgress(input)>=1;
}
