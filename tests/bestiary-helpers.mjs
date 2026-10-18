// Helpers for the tests of the bestiary: scenarios are built on a real new game, then cases are placed on the table with
// ids chosen so that the seeded roll of the hunt falls where a test needs it.
import * as P from '../src/progress.js';
import * as L from '../src/lore.js';
import * as R from '../src/rules.js';
import * as B from '../src/bestiary.js';
import {roll} from '../src/rng.js';
export {P,L,R,B,roll};
export const game=(seed=7)=>P.newGame(seed);
export const snap=s=>P.serialize(s);
// A case on the table. `u` picks a contract id whose roll of the hunt is below (true) or above (false) a threshold.
export function place(s,{kind='hunter',hunter='gordey',town=null,monster='werewolf',variant='grown',place,fee,bounty,win,at=50,id}={}){
 const m=L.MON.get(monster);if(!s.monsters[monster])P.applyStory(s,L.EVENTS.find(e=>(e.effect.open||[]).includes(monster)||e.effect.page===monster));
 if(kind!=='town'&&hunter&&!s.hunters[hunter])throw new Error('hunter not joined: '+hunter);
 let n=id??s.nextId;if(win!==undefined&&id===undefined)while(win!==(100*roll(s.worldSeed,'hunt','c-'+n)<at))n++;s.nextId=Math.max(s.nextId,n+1);
 if(s.monsters[monster].u>=s.day)s.monsters[monster].u=Math.max(1,s.day-1);
 const c={id:'c-'+n,kind,hunter:kind==='town'?null:hunter,town:kind==='town'?town||'widow':null,monster,variant,place:place||m.places[0],tier:m.tier,day:s.day,deferred:0,fee:fee??(kind==='town'?3:R.FEE[m.tier]),bounty:bounty??(kind==='story'?0:m.bounty)};
 if(kind==='story')c.hunter=hunter||null;s.contracts.push(c);return c;}
// Clears the table of the morning so a test sees only its own cases.
export function clear(s){s.contracts=[];s.visitors=[];s.hunts=[];return s;}
export function know(s,id,st,rev=0){const k=s.know[id]||{st,rev:0,src:'start',d:s.day,v:++s.kv,ok:0,none:0,worse:0,last:null};k.st=st;k.rev=rev;s.know[id]=k;return k;}
export const facts=(monster,pred=()=>true)=>L.MON.get(monster).facts.filter(pred);
export const ctx=(variant='grown',weather='clear',season=0)=>({variant,weather,season});
export function join(s,...ids){for(const id of ids)if(!s.hunters[id])s.hunters[id]={joined:s.day,xp:0,trust:L.HUNTER.get(id).trust,out:0,sulk:0,rag:0,gear:[],hunts:0,wins:0,fails:0,skill:0,doc:0,harmSeen:0,failSeen:0};return s;}
// An id for which the observation of a fact in a case is (seen=true) or is not (seen=false) noticed at chance p.
export function obsId(s,factIds,seen,p,from=s.nextId){let n=from;while(!factIds.every(f=>(roll(s.worldSeed,'obs','c-'+n,f)<p)===seen))n++;return n;}
