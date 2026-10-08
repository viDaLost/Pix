// Artwork feet at (32, 76); renderer adds an (8, 2) pixel border.
// Unreachable targets move the wrist, never stretch a bone.
export function solveArm(shoulder,target,bend=1,upper=10,lower=9){
  const dx=target[0]-shoulder[0],dy=target[1]-shoulder[1],raw=Math.hypot(dx,dy);
  const distance=Math.max(Math.abs(upper-lower)+.01,Math.min(upper+lower-.01,raw));
  const ux=raw>.001?dx/raw:0,uy=raw>.001?dy/raw:1;
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return {shoulder:[...shoulder],elbow:[shoulder[0]+ux*along-uy*height*bend,shoulder[1]+uy*along+ux*height*bend],wrist:[shoulder[0]+ux*distance,shoulder[1]+uy*distance]};
}
export const POSES=['idle','walk','hammer','cut','heat','quench','polish','chat','wave','inspect','browse'];
const SWING=[0,3,5,3,0,-3,-5,-3],DIP=[0,-1,-2,-1,0,-1,-2,-1];
export function characterRig(facing='right',pose='idle',frame=0,temper='water',breath=0){
  frame=Math.max(0,Math.floor(frame));
  const side=facing==='right'||facing==='left',swing=pose==='walk'?SWING[frame%8]:0,bob=pose==='walk'?DIP[frame%8]:breath;
  const lean=pose==='hammer'?[0,-1,-1,1,2,1,0][Math.min(6,frame)]:pose==='polish'?frame%2:0;
  const nearShoulder=[(side?37:41)+lean,28],farShoulder=[(side?28:23)+lean,28];
  let near=[side?43:44,46],far=[side?26:21,46],tool=null;
  if(pose==='walk'){near=[(side?41:44)-swing,44-Math.abs(swing)/3];far=[(side?29:21)+swing,44-Math.abs(swing)/3];}
  if(pose==='hammer'){
    const f=Math.min(6,frame);near=[[44,28],[41,20],[40,17],[46,32],[46,43],[47,44],[44,34]][f];
    tool=[[51,15],[45,8],[40,5],[55,23],[55,56],[56,57],[52,27]][f];far=[37,44];
  }else if(pose==='cut'){near=[45,42+frame%2];far=[38,44];tool=[55,47+frame%2];}
  else if(pose==='heat'){near=[44,35+frame%2];far=[29,44];tool=[57,34+frame%2];}
  else if(pose==='quench'){
    const dip=[0,1,2,3,4,3][Math.min(5,frame)];near=temper==='air'?[43,32]:[45,34+dip];tool=temper==='air'?[55,31]:[59,36+dip];far=[29,44];
  }else if(pose==='polish'){near=[46+[0,1,2,1,0,-1][frame%6],36];far=[39,40];tool=[58,35];}
  else if(pose==='chat'){near=[44+frame%2,36-frame%2];}
  else if(pose==='wave'){near=[43+[0,1,2,1,0,-1][frame%6],20+[0,1,0,-1,0,1][frame%6]];}
  else if(pose==='inspect'){near=[45,43+frame%2];far=[30,43];}
  else if(pose==='browse'){near=[46+[0,1,2,1,0,-1][frame%6],34+frame%2];}
  return {side,back:facing==='up',bob,lean,swing,near:solveArm(nearShoulder,near,1),far:solveArm(farShoulder,far,-1),tool};
}
