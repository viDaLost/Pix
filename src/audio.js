// Original chamber-like music and procedural sounds of the scriptorium. No network assets.
const noiseBuffers=new WeakMap();
const hz=n=>440*2**((n-69)/12);
// The music of the scriptorium (art.md 6.2): «scriptorium» — 66 beats a minute in D dorian, long harpsichord-like notes;
// «lab» — 72 in A minor over an ostinato in the bass. Eight eighths a bar, null holds the note before.
export const SCORES={
  scriptorium:{bpm:66,len:.62,roots:[50,48,43,50,41,48,43,50],bars:[
    [62,null,65,null,69,null,67,null],[64,null,67,null,72,null,71,null],
    [71,null,69,null,67,null,64,null],[65,null,64,null,62,null,null,null],
    [65,null,69,null,72,null,74,null],[72,null,71,null,69,null,67,null],
    [67,null,71,null,69,null,65,null],[64,null,62,null,null,null,null,null],
  ]},
  lab:{bpm:72,len:.4,ostinato:true,roots:[45,43,41,40,45,43,41,40],bars:[
    [69,null,null,72,null,71,69,null],[null,null,64,null,65,null,64,null],
    [69,null,null,72,null,74,76,null],[null,null,74,null,72,null,71,null],
    [72,null,null,71,null,69,68,null],[null,null,69,null,71,null,72,null],
    [76,null,null,74,null,72,71,null],[69,null,null,null,null,null,null,null],
  ]},
};
export const SCENES=Object.keys(SCORES);
function finishVoice(source,nodes,group,track){
  const voice={source,nodes,group};const release=track?.(voice);
  source.onended=()=>{for(const node of nodes)try{node.disconnect();}catch{}release?.();};
  return voice;
}
function tone(ctx,out,frequency,time,duration,amplitude,type='sine',track,group='effect'){
  const source=ctx.createOscillator(),gain=ctx.createGain();source.type=type;source.frequency.setValueAtTime(frequency,time);
  gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(amplitude,time+.006);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(gain);gain.connect(out);finishVoice(source,[source,gain],group,track);source.start(time);source.stop(time+duration+.015);
}
function noiseBuffer(ctx){let buffer=noiseBuffers.get(ctx);if(!buffer){buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=buffer.getChannelData(0);let seed=98731;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}noiseBuffers.set(ctx,buffer);}return buffer;}
function noise(ctx,out,time,duration,amplitude,frequency,type,track,{q=.65,attack=0}={}){
  const buffer=noiseBuffer(ctx),source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
  if(attack){gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(amplitude,time+attack);}else gain.gain.setValueAtTime(amplitude,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(gain);gain.connect(out);finishVoice(source,[source,filter,gain],'effect',track);source.start(time);source.stop(time+duration+.015);
}
// An oscillator through a filter, its pitch gliding from one frequency to another: the creak of the door, the beat of a
// harmful stamp, a bubble rising in the cauldron.
function glide(ctx,out,time,duration,amplitude,from,to,type,track,{filter=null,cutoff=1000,q=1}={}){
  const source=ctx.createOscillator(),gain=ctx.createGain(),nodes=[source,gain];source.type=type;source.frequency.setValueAtTime(from,time);source.frequency.linearRampToValueAtTime(to,time+duration*.8);
  gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(amplitude,time+.01);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  if(filter){const f=ctx.createBiquadFilter();f.type=filter;f.frequency.value=cutoff;f.Q.value=q;source.connect(f);f.connect(gain);nodes.push(f);}else source.connect(gain);
  gain.connect(out);finishVoice(source,nodes,'effect',track);source.start(time);source.stop(time+duration+.015);
}
// A small deterministic noise for the scatter of the quill and the bubbles (no Math.random in sound either).
let scatter=2463534242;const rnd=()=>{scatter^=scatter<<13;scatter^=scatter>>>17;scatter^=scatter<<5;return (scatter>>>0)/4294967296;};
// The sounds of the bestiary (art.md 6.2): the quill, the page, the seals and stamps of the report, a fact learned, the
// medal of chance, the door, a candle snuffed, the cauldron and its fire, a potion brewed.
function seal(ctx,out,time,track,k=1){noise(ctx,out,time,.09,.14*k,260,'lowpass',track);tone(ctx,out,98,time,.11,.06*k,'triangle',track);}
export const EFFECTS=['hit','step','coin','magic','error','chime','stamp','whoosh','bell','quill','page','seal','stamp-ok','stamp-none','stamp-worse','learn','roll','door','snuff','bubble','fire','brew'];
// The stones of a finished piece ring up a pentatonic run from D5, one note a stone.
export const CHIME=[74,76,79,81,83,86,88,91,93,95,98,100];
export function playEffect(ctx,out,kind='good',time=ctx.currentTime,track,{step=0}={}){
  if(kind==='hit'){
    for(const [i,f]of[220,690,1100,1770,2900].entries())tone(ctx,out,f,time,[.12,.18,.11,.08,.065][i],[.22,.13,.07,.03,.018][i],'sine',track);
    noise(ctx,out,time,.04,.08,1800,'bandpass',track);
  }
  else if(kind==='step'){noise(ctx,out,time,.065,.045,220,'lowpass',track);tone(ctx,out,92,time,.05,.025,'sine',track);}
  else if(kind==='coin')for(const [i,f]of[1046.5,1568,2093].entries())tone(ctx,out,f,time+i*.055,.17,.065,'sine',track);
  else if(kind==='magic')for(const [i,n]of[74,77,81].entries())tone(ctx,out,hz(n),time+i*.09,.4,.045,'triangle',track);
  else if(kind==='error')tone(ctx,out,130,time,.13,.06,'triangle',track);
  else if(kind==='chime'){const f=hz(CHIME[Math.abs(step|0)%CHIME.length]);tone(ctx,out,f,time,.5,.05,'sine',track);tone(ctx,out,f*2,time,.22,.012,'sine',track);}
  else if(kind==='stamp'){noise(ctx,out,time,.09,.14,400,'lowpass',track);tone(ctx,out,90,time,.12,.09,'triangle',track);}
  else if(kind==='whoosh')noise(ctx,out,time,.35,.05,900,'highpass',track);
  else if(kind==='bell'){tone(ctx,out,1320,time,.6,.04,'sine',track);tone(ctx,out,1980,time,.6,.02,'sine',track);}
  else if(kind==='quill')for(let i=0;i<3;i++)noise(ctx,out,time+i*.045,.035,.05,2600+rnd()*1200,'bandpass',track,{q:1.2});
  else if(kind==='page'){noise(ctx,out,time,.32,.06,700,'highpass',track,{attack:.06});noise(ctx,out,time+.26,.06,.06,180,'lowpass',track);}
  else if(kind==='seal')seal(ctx,out,time,track);
  else if(kind==='stamp-ok'){seal(ctx,out,time,track);tone(ctx,out,hz(79),time+.06,.22,.04,'sine',track);tone(ctx,out,hz(84),time+.15,.22,.04,'sine',track);}
  else if(kind==='stamp-none')seal(ctx,out,time,track,.65);
  else if(kind==='stamp-worse'){seal(ctx,out,time,track);for(const f of[92,97.5])glide(ctx,out,time,.42,.05,f,f,'sawtooth',track,{filter:'lowpass',cutoff:600});}
  else if(kind==='learn')for(const [i,n] of[74,78,81].entries())tone(ctx,out,hz(n),time+i*.07,.3,.035,'triangle',track);
  // The medal of chance: eight clicks slowing down, then it lands; step 1 is the quick roll of the short report.
  else if(kind==='roll'){let at=time;const k=step?.42:1;for(const gap of[.06,.07,.085,.1,.12,.15,.19,.24]){noise(ctx,out,at,.018,.05,2400,'bandpass',track,{q:2});at+=gap*k;}
    for(const [i,f] of[220,690,1100].entries())tone(ctx,out,f,at,[.12,.18,.11][i],[.13,.08,.04][i],'sine',track);}
  else if(kind==='door'){glide(ctx,out,time,.38,.03,110,150,'sawtooth',track,{filter:'bandpass',cutoff:900,q:4});for(const d of[.42,.66]){noise(ctx,out,time+d,.065,.045,220,'lowpass',track);tone(ctx,out,92,time+d,.05,.025,'sine',track);}}
  else if(kind==='snuff')noise(ctx,out,time,.12,.06,1500,'highpass',track);
  else if(kind==='bubble'){const f=220+rnd()*220;glide(ctx,out,time,.07,.018,f,f*1.3,'sine',track);}
  else if(kind==='fire')noise(ctx,out,time,.025,.02,1800,'bandpass',track,{q:1.5});
  else if(kind==='brew'){for(const [i,n] of[74,77,81].entries())tone(ctx,out,hz(n),time+i*.09,.4,.045,'triangle',track);for(let i=0;i<5;i++){const f=220+rnd()*220;glide(ctx,out,time+.3+i*.11,.07,.018,f,f*1.3,'sine',track);}}
  else{tone(ctx,out,440,time,.18,.045,'triangle',track);tone(ctx,out,660,time+.08,.2,.035,'sine',track);}
}
// The sounds of a morning report in time (art.md 3.9, 6.2), for the window that shows it: the door, the medal of chance
// that lands with the verdict, two steps of the hunter, then a stamp for every piece of advice he saw (none for what he
// did not notice) and «learn» where the bestiary changed, the coin of a reward. The plan is short from the tenth report
// (no door, a quick medal, stamps every 220 ms) and with less motion only one «hit», without vibration. buzz is the
// vibration of the moment: the verdict with the medal, the triple beat of a harmful stamp.
export function reportSounds(r,{short=false,reduced=false}={}){
 if(reduced)return [{t:0,kind:'hit'}];
 const out=[],land=short?450:1300,first=short?750:2150,gap=short?220:550,worse=(r.items||[]).some(i=>i.seen&&i.o==='worse');
 if(!short)out.push({t:0,kind:'door'});out.push({t:short?0:400,kind:'roll',step:short?1:0},{t:land,kind:null,buzz:r.win?'win':'fail'});
 if(!short)out.push({t:1300,kind:'step'},{t:1500,kind:'step'});
 (r.items||[]).forEach((it,i)=>{if(!it.seen)return;const t=first+gap*i;out.push({t,kind:'stamp-'+(it.o==='ok'?'ok':it.o==='worse'?'worse':'none'),...(it.o==='worse'?{buzz:'worse'}:{})});if(it.from!==it.to)out.push({t:t+150,kind:'learn'});});
 if(r.win&&r.offer)out.push({t:short?1400:3550,kind:'coin'});
 return out.sort((a,b)=>a.t-b.t);}
// Vibration (art.md 6.2), when the player keeps it on and motion is not reduced: a seal 10 ms, the medal landing 20 ms,
// «Во вред» a triple beat, a victory a rising one, a loss one long pulse. Returns whether the phone was asked.
export const HAPTICS={seal:10,roll:20,worse:[25,40,25],win:[15,30,40],fail:35};
export function vibrate(kind,{on=true,calm=false,nav=globalThis.navigator}={}){const p=HAPTICS[kind];if(!on||calm||p==null||typeof nav?.vibrate!=='function')return false;try{return nav.vibrate(p)!==false;}catch{return false;}}
export function playMusicTick(ctx,out,scene,index,time,track){
  const score=SCORES[scene]||SCORES.scriptorium,bar=Math.floor(index/8)%8,beat=index%8,secondPass=Math.floor(index/64)%2,root=score.roots[bar];
  const raw=score.bars[bar][beat];
  if(raw!=null){const note=raw+(secondPass&&beat===6&&bar%2?12:0);tone(ctx,out,hz(note),time,score.len,.05,'triangle',track,'music');tone(ctx,out,hz(note)*2,time,score.len*.4,.009,'sine',track,'music');}
  // The scriptorium holds a long root under each bar; the laboratory walks an ostinato on every quarter.
  if(score.ostinato){if(beat%2===0)tone(ctx,out,hz(root+[0,7,12,7][beat/2]),time,.36,.05,'triangle',track,'music');}
  else{if(beat===0)tone(ctx,out,hz(root),time,1.6,.06,'triangle',track,'music');if(beat===4)tone(ctx,out,hz(root+7),time,.9,.022,'triangle',track,'music');}
}
export class GameAudio{
  constructor({contextFactory}={}){
    this.contextFactory=contextFactory||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio():null;});
    this.context=null;this.options={sound:false,music:false,volume:.6};this.scene='scriptorium';this.visible=true;this.voices=new Set();this.timer=null;this.index=0;this.nextTime=0;this.lastEffects=new Map();this.weather={rain:false,lab:false};this.ambient=null;this.lab=null;
  }
  setOptions(options){
    this.options={sound:Boolean(options.sound),music:Boolean(options.music),volume:Number.isFinite(options.volume)?Math.max(0,Math.min(1,options.volume)):.6};
    if(!this.context)return;
    const now=this.context.currentTime;this.master.gain.setTargetAtTime(this.options.volume*.55,now,.02);this.effects.gain.setTargetAtTime(this.options.sound?1:0,now,.015);
    this.music.gain.setTargetAtTime(this.options.music?1:0,now,.04);
    if(!this.options.music||this.options.volume===0)this.stopMusic();else this.startMusic();
    if((!this.options.sound&&!this.options.music||this.options.volume===0)&&this.context.state==='running')this.context.suspend().catch(()=>{});
    this.syncAmbience();
  }
  // Rain outside the windows: a quiet loop of filtered noise on a node of its own. It is not a voice, so the limit of
  // forty voices never cuts it and it never pushes an effect out. It plays with the effects on and stops with them,
  // in the background and when the weather changes. In «Опыты» the hearth is heard the same way: a low rumble of the
  // fire, its crackle three to six times a second and a bubble of the cauldron every 0.3–0.9 s (art.md 6.2).
  setAmbience({rain=false,lab=false}={}){this.weather={rain:!!rain,lab:!!lab};this.syncAmbience();}
  syncAmbience(){const ctx=this.context,live=this.visible&&this.options.sound&&this.options.volume>0&&ctx?.state==='running',on=this.weather.rain&&live;
    if(on&&!this.ambient){const now=ctx.currentTime,source=ctx.createBufferSource(),high=ctx.createBiquadFilter(),low=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noiseBuffer(ctx);source.loop=true;high.type='highpass';high.frequency.value=300;low.type='lowpass';low.frequency.value=1200;
      gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.025,now+1.5);source.connect(high);high.connect(low);low.connect(gain);gain.connect(this.master);source.start(now);this.ambient={source,nodes:[source,high,low,gain]};}
    else if(!on&&this.ambient)this.stopAmbience();
    const hearth=this.weather.lab&&live;
    if(hearth&&!this.lab){const now=ctx.currentTime,source=ctx.createBufferSource(),low=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noiseBuffer(ctx);source.loop=true;low.type='lowpass';low.frequency.value=200;gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.01,now+1);
      source.connect(low);low.connect(gain);gain.connect(this.master);source.start(now);this.lab={source,nodes:[source,low,gain],next:{fire:now+.2,bubble:now+.4},timer:setInterval(()=>this.hearthTick(),100)};}
    else if(!hearth&&this.lab)this.stopHearth();}
  hearthTick(){const ctx=this.context,h=this.lab;if(!ctx||!h||ctx.state!=='running')return;const now=ctx.currentTime,until=now+.25;
    while(h.next.fire<until){if(h.next.fire>=now-.1)playEffect(ctx,this.effects,'fire',h.next.fire,v=>this.track(v));h.next.fire+=1/(3+rnd()*3);}
    while(h.next.bubble<until){if(h.next.bubble>=now-.1)playEffect(ctx,this.effects,'bubble',h.next.bubble,v=>this.track(v));h.next.bubble+=.28+rnd()*.62;}}
  stopHearth(){const h=this.lab;this.lab=null;if(!h)return;clearInterval(h.timer);try{h.source.stop();}catch{}for(const node of h.nodes)try{node.disconnect();}catch{}}
  stopAmbience(){const a=this.ambient;this.ambient=null;if(!a)return;try{a.source.stop();}catch{}for(const node of a.nodes)try{node.disconnect();}catch{}}
  async unlock(){
    if(!this.visible||(!this.options.sound&&!this.options.music)||this.options.volume===0)return false;
    try{
      if(!this.context){
        this.context=this.contextFactory();if(!this.context)return false;
        this.master=this.context.createGain();this.effects=this.context.createGain();this.music=this.context.createGain();
        this.master.connect(this.context.destination);this.effects.connect(this.master);this.music.connect(this.master);this.setOptions(this.options);
      }
      await this.context.resume();this.startMusic();this.syncAmbience();return this.context.state==='running';
    }catch{return false;}
  }
  track(voice){
    this.voices.add(voice);
    if(this.voices.size>40){const oldest=this.voices.values().next().value;try{oldest.source.stop();}catch{}for(const node of oldest.nodes)try{node.disconnect();}catch{}this.voices.delete(oldest);}
    return ()=>this.voices.delete(voice);
  }
  // A chime is a note of a run, so notes that follow closely are never dropped as repeats.
  play(kind='good',{step=0}={}){
    const ctx=this.context;if(!ctx||ctx.state!=='running'||!this.visible||!this.options.sound||this.options.volume===0)return false;
    const gap=kind==='chime'?0:kind==='step'?.19:kind==='door'?.5:kind==='quill'?.08:.035;
    if(gap&&ctx.currentTime-(this.lastEffects.get(kind)??-100)<gap)return false;
    this.lastEffects.set(kind,ctx.currentTime);playEffect(ctx,this.effects,kind,ctx.currentTime,v=>this.track(v),{step});return true;
  }
  setScene(scene){scene=SCORES[scene]?scene:'scriptorium';if(scene===this.scene)return;this.scene=scene;this.stopMusic();this.startMusic();}
  startMusic(){
    if(this.timer||!this.context||this.context.state!=='running'||!this.visible||!this.options.music||this.options.volume===0)return;
    this.nextTime=this.context.currentTime+.08;this.index=0;this.schedule();this.timer=setInterval(()=>this.schedule(),100);
  }
  schedule(){
    if(!this.context||this.context.state!=='running'||!this.visible)return;
    const now=this.context.currentTime;if(this.nextTime<now-.2)this.nextTime=now+.05;
    while(this.nextTime<now+.28){playMusicTick(this.context,this.music,this.scene,this.index++,this.nextTime,v=>this.track(v));this.nextTime+=30/SCORES[this.scene].bpm;}
  }
  stopMusic(){
    if(this.timer){clearInterval(this.timer);this.timer=null;}
    if(!this.context)return;
    for(const voice of this.voices)if(voice.group==='music'){const gain=voice.nodes[1];try{gain.gain.cancelScheduledValues(this.context.currentTime);gain.gain.setTargetAtTime(.0001,this.context.currentTime,.01);voice.source.stop(this.context.currentTime+.035);}catch{}}
  }
  pause(){this.visible=false;this.stopMusic();this.stopAmbience();this.stopHearth();if(this.context)this.context.suspend().catch(()=>{});}
  resume(){this.visible=true;if(this.context)return this.unlock();return Promise.resolve(false);}
  async destroy(){this.pause();if(this.context)await this.context.close().catch(()=>{});this.voices.clear();}
}
