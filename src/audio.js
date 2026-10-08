// Original chamber-like music and procedural workshop sounds. No network assets.
const noiseBuffers=new WeakMap();
const hz=n=>440*2**((n-69)/12);
const SCORES={
  forge:{bpm:84,roots:[50,46,53,48,55,45,46,50],bars:[
    [62,65,69,65,67,65,64,62],[58,62,65,62,64,62,60,58],
    [65,69,72,69,70,69,67,65],[60,64,67,64,65,64,62,60],
    [67,70,74,70,72,70,69,67],[64,61,64,69,67,65,64,61],
    [65,62,58,62,64,65,67,64],[62,69,65,62,64,65,61,62],
  ]},
  shop:{bpm:98,roots:[55,52,48,50,55,52,50,55],bars:[
    [67,71,74,71,69,67,66,69],[64,67,71,67,69,71,67,64],
    [60,64,67,64,62,60,59,62],[62,66,69,66,67,69,66,62],
    [71,74,79,74,76,74,71,69],[67,71,76,71,69,67,66,64],
    [69,66,62,66,67,69,71,66],[67,71,74,71,69,66,69,67],
  ]},
  explore:{bpm:76,roots:[45,48,41,43,45,41,40,45],bars:[
    [69,72,76,72,71,69,67,64],[72,76,79,76,74,72,71,67],
    [65,69,72,69,67,65,64,60],[67,71,74,71,72,71,69,67],
    [72,71,69,64,67,69,71,72],[69,65,60,65,67,69,72,69],
    [68,71,76,71,69,68,64,68],[69,72,76,72,71,69,68,69],
  ]},
};
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
function noise(ctx,out,time,duration,amplitude,frequency,type,track){
  let buffer=noiseBuffers.get(ctx);if(!buffer){buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=buffer.getChannelData(0);let seed=98731;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}noiseBuffers.set(ctx,buffer);}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.65;
  gain.gain.setValueAtTime(amplitude,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(gain);gain.connect(out);finishVoice(source,[source,filter,gain],'effect',track);source.start(time);source.stop(time+duration+.015);
}
export function playEffect(ctx,out,kind='good',time=ctx.currentTime,track){
  if(kind==='hit'){
    for(const [i,f]of[220,690,1100,1770,2900].entries())tone(ctx,out,f,time,[.12,.18,.11,.08,.065][i],[.22,.13,.07,.03,.018][i],'sine',track);
    noise(ctx,out,time,.04,.08,1800,'bandpass',track);
  }else if(kind==='forge'){
    noise(ctx,out,time,.48,.16,420,'lowpass',track);tone(ctx,out,72,time,.18,.035,'triangle',track);
  }else if(kind==='quench')noise(ctx,out,time,.65,.18,1300,'highpass',track);
  else if(kind==='polish')noise(ctx,out,time,.13,.12,2200,'bandpass',track);
  else if(kind==='rivet'){tone(ctx,out,380,time,.1,.11,'sine',track);noise(ctx,out,time,.035,.1,850,'bandpass',track);}
  else if(kind==='step'){noise(ctx,out,time,.065,.045,220,'lowpass',track);tone(ctx,out,92,time,.05,.025,'sine',track);}
  else if(kind==='coin')for(const [i,f]of[1046.5,1568,2093].entries())tone(ctx,out,f,time+i*.055,.17,.065,'sine',track);
  else if(kind==='magic')for(const [i,n]of[74,77,81].entries())tone(ctx,out,hz(n),time+i*.09,.4,.045,'triangle',track);
  else if(kind==='error')tone(ctx,out,130,time,.13,.06,'triangle',track);
  else{tone(ctx,out,440,time,.18,.045,'triangle',track);tone(ctx,out,660,time+.08,.2,.035,'sine',track);}
}
export function playMusicTick(ctx,out,scene,index,time,track){
  const score=SCORES[scene]||SCORES.forge,bar=Math.floor(index/8)%8,beat=index%8,secondPass=Math.floor(index/64)%2;
  const note=score.bars[bar][beat]+(secondPass&&beat===7?12:0);
  tone(ctx,out,hz(note),time,.32,.052,'triangle',track,'music');tone(ctx,out,hz(note)*2,time,.17,.01,'sine',track,'music');
  if(beat===0||beat===4){const bass=score.roots[bar]-(scene==='explore'?0:12);tone(ctx,out,hz(bass),time,.72,.065,'triangle',track,'music');}
  if(beat===2||beat===6)tone(ctx,out,hz(score.roots[bar]+7),time,.4,.025,'triangle',track,'music');
}
export class GameAudio{
  constructor({contextFactory}={}){
    this.contextFactory=contextFactory||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio():null;});
    this.context=null;this.options={sound:false,music:false,volume:.6};this.scene='forge';this.visible=true;this.voices=new Set();this.timer=null;this.index=0;this.nextTime=0;this.lastEffects=new Map();
  }
  setOptions(options){
    this.options={sound:Boolean(options.sound),music:Boolean(options.music),volume:Number.isFinite(options.volume)?Math.max(0,Math.min(1,options.volume)):.6};
    if(!this.context)return;
    const now=this.context.currentTime;this.master.gain.setTargetAtTime(this.options.volume*.55,now,.02);this.effects.gain.setTargetAtTime(this.options.sound?1:0,now,.015);
    this.music.gain.setTargetAtTime(this.options.music?1:0,now,.04);
    if(!this.options.music||this.options.volume===0)this.stopMusic();else this.startMusic();
    if((!this.options.sound&&!this.options.music||this.options.volume===0)&&this.context.state==='running')this.context.suspend().catch(()=>{});
  }
  async unlock(){
    if(!this.visible||(!this.options.sound&&!this.options.music)||this.options.volume===0)return false;
    try{
      if(!this.context){
        this.context=this.contextFactory();if(!this.context)return false;
        this.master=this.context.createGain();this.effects=this.context.createGain();this.music=this.context.createGain();
        this.master.connect(this.context.destination);this.effects.connect(this.master);this.music.connect(this.master);this.setOptions(this.options);
      }
      await this.context.resume();this.startMusic();return this.context.state==='running';
    }catch{return false;}
  }
  track(voice){
    this.voices.add(voice);
    if(this.voices.size>40){const oldest=this.voices.values().next().value;try{oldest.source.stop();}catch{}for(const node of oldest.nodes)try{node.disconnect();}catch{}this.voices.delete(oldest);}
    return ()=>this.voices.delete(voice);
  }
  play(kind='good'){
    const ctx=this.context;if(!ctx||ctx.state!=='running'||!this.visible||!this.options.sound||this.options.volume===0)return false;
    const gap=kind==='step'?.19:kind==='polish'?.1:kind==='forge'?.4:.035;
    if(ctx.currentTime-(this.lastEffects.get(kind)??-100)<gap)return false;
    this.lastEffects.set(kind,ctx.currentTime);playEffect(ctx,this.effects,kind,ctx.currentTime,v=>this.track(v));return true;
  }
  setScene(scene){scene=SCORES[scene]?scene:'forge';if(scene===this.scene)return;this.scene=scene;this.stopMusic();this.startMusic();}
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
  pause(){this.visible=false;this.stopMusic();if(this.context)this.context.suspend().catch(()=>{});}
  resume(){this.visible=true;if(this.context)return this.unlock();return Promise.resolve(false);}
  async destroy(){this.pause();if(this.context)await this.context.close().catch(()=>{});this.voices.clear();}
}
