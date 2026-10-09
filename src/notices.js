// Toasts and dialogs that wait their turn. No DOM here, so the order rules are tested in node.
export const TOAST_KINDS=['info','mark','hint','error'];
// toast(text,true) and toast(text,false,{action,label,icon}) from older calls mean {kind:'error'} and {action}.
export function toastSpec(text,opt=false,act=null){const o=opt&&typeof opt==='object'?opt:{kind:opt?'error':'info',action:act};return {text:String(text),kind:TOAST_KINDS.includes(o.kind)?o.kind:'info',action:o.action||null};}
// Long enough to read: 45 ms a letter, never under 3.3 s or over 8 s; a toast with a button waits 9 s for the tap.
export const toastDuration=t=>t.action?9000:Math.min(8000,Math.max(3300,2500+45*t.text.length));
const plain=t=>t?.kind==='info'&&!t.action,weight=t=>plain(t)?0:t.kind==='error'?4:t.action?3:t.kind==='mark'?2:1;
// One toast on screen and at most four waiting. A plain message replaces a plain one at once; rewards, hints and
// messages with a button wait their turn; an error goes first and sends a preempted reward back to the head of the line.
export class ToastQueue{
 constructor(limit=4){this.now=null;this.waiting=[];this.limit=limit;}
 // Returns true when the toast on screen changed (or the same one should be shown again).
 add(t){if(this.now&&this.now.text===t.text&&this.now.kind===t.kind)return true;if(this.waiting.some(v=>v.text===t.text&&v.kind===t.kind))return false;
  if(plain(t))this.waiting=this.waiting.filter(v=>!plain(v));
  if(t.kind==='error'||plain(t)&&(!this.now||plain(this.now))){if(this.now&&!plain(this.now)&&this.now.kind!=='error')this.waiting.unshift(this.now);this.now=t;this.trim();return true;}
  this.waiting.push(t);this.trim();if(this.now)return false;this.now=this.waiting.shift();return true;}
 // When too many wait, the plain note goes first, then the latest hint, mark or offer with a button: a full line
 // turns newcomers away rather than forget what was already promised. Errors stay longest.
 trim(){while(this.waiting.length>this.limit){let i=0;this.waiting.forEach((v,j)=>{if(weight(v)<=weight(this.waiting[i]))i=j;});this.waiting.splice(i,1);}}
 next(){this.now=this.waiting.shift()||null;return this.now;}
 // Takes back toasts that no longer make sense; true when the one on screen was among them.
 drop(test){this.waiting=this.waiting.filter(v=>!test(v));if(this.now&&test(this.now)){this.next();return true;}return false;}
}
// Dialogs that wait for the open one to close come in this order, whatever order they were asked for in.
export const MODAL_ORDER=['welcome','update','ceremony','rank','letter','morning'];
export class ModalQueue{
 constructor(){this.list=[];}
 add(fn,kind){const rank=MODAL_ORDER.includes(kind)?MODAL_ORDER.indexOf(kind):MODAL_ORDER.length;let i=this.list.findIndex(m=>m.rank>rank);if(i<0)i=this.list.length;this.list.splice(i,0,{fn,rank,kind});}
 next(){return this.list.shift()?.fn||null;}
 get size(){return this.list.length;}
}
