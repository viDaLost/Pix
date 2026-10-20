// The beats of a morning report (GDD 11.6, art.md 3.9): the door opens, the medal «Жребий» rolls and lands, the hunter is
// seen, his first line, a stamp for every advice one by one, the wound or the reward, the final. From the tenth report on
// the plan is short; with less motion it is one beat. Pure: the plan is checked in node, the player only adds classes.
export const FULL={door:0,roll:400,reveal:1300,line:1600,stamp:1900,gap:550,end:3550,final:3800,tail:200};
export const SHORT={door:0,roll:0,reveal:450,line:600,stamp:750,gap:220,end:1400,final:1600,tail:150};
export function reportPlan(r,{short=false,reduced=false}={}){if(reduced)return [{t:0,beat:'final'}];const P=short?SHORT:FULL,out=[];
 if(!short)out.push({t:P.door,beat:'door'});out.push({t:P.roll,beat:'roll'},{t:P.reveal,beat:'reveal'},{t:P.line,beat:'line'});
 (r?.items||[]).forEach((it,i)=>out.push({t:P.stamp+P.gap*i,beat:'stamp',i,o:it.seen?it.o:'unseen'}));
 out.push({t:P.end,beat:r?.win?'reward':'wound'},{t:P.final,beat:'final'});return out;}
// How long a plan runs, its last beat with the settling of its stamp.
export const planDuration=(plan,short=false)=>plan.length<2?0:plan.at(-1).t+(short?SHORT:FULL).tail;
// Plays a plan over a dialog: an element with data-rv="door|roll|reveal|line|stamp-0…|end|final" gets the class «on» at
// its beat (the end of a report answers both wound and reward). A tap anywhere skips to the end; returns a stop function.
export function playReport(root,plan,{onBeat=null,onDone=null}={}){const timers=[],at=b=>b.beat==='stamp'?'stamp-'+b.i:b.beat==='wound'||b.beat==='reward'?'end':b.beat;let done=false;
 const show=b=>{for(const el of root.querySelectorAll(`[data-rv="${at(b)}"]`))el.classList.add('on');if(b.beat==='final')for(const el of root.querySelectorAll('[data-rv]'))el.classList.add('on');onBeat?.(b);};
 const finish=(skipped=false)=>{if(done)return;done=true;timers.forEach(clearTimeout);for(const el of root.querySelectorAll('[data-rv]'))el.classList.add('on');root.classList.remove('revealing');root.removeEventListener('pointerdown',skip,true);onDone?.(skipped);};
 // The tap that skips does not also press what lies under it.
 const eat=e=>{e.stopPropagation();e.preventDefault();},skip=e=>{if(done)return;eat(e);root.addEventListener('click',eat,true);finish(true);setTimeout(()=>root.removeEventListener('click',eat,true),400);};
 root.classList.add('revealing');root.addEventListener('pointerdown',skip,true);
 for(const b of plan)timers.push(setTimeout(()=>{if(!done)show(b);if(b.beat==='final')finish(false);},b.t));return ()=>finish(true);}
