import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/audio.js';

function context(){
  const sources=[],parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node=()=>({gain:parameter(),frequency:parameter(),Q:parameter(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}});
  return {state:'suspended',currentTime:0,sampleRate:1000,destination:node(),sources,
    createGain:node,createBiquadFilter:node,createOscillator(){const n=node();sources.push(n);return n;},createBufferSource(){const n=node();sources.push(n);return n;},
    createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};},
    async resume(){this.state='running';},async suspend(){this.state='suspended';},async close(){this.state='closed';},
  };
}
test('audio waits for an explicit gesture and reuses one context instead of autostarting',async()=>{
  let creates=0;const ctx=context(),a=new GameAudio({contextFactory:()=>{creates++;return ctx;}});
  a.setOptions({sound:false,music:false,volume:.6});assert.equal(await a.unlock(),false);assert.equal(creates,0);
  a.setOptions({sound:true,music:true,volume:.6});assert.equal(creates,0);assert.equal(a.timer,null);assert.equal(a.play('hit'),false);
  assert.equal(await a.unlock(),true);assert.equal(creates,1);assert.ok(a.timer);assert.equal(await a.unlock(),true);assert.equal(creates,1);await a.destroy();
});
test('muting, volume zero and background pause stop scheduling and suspend audio',async()=>{
  const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:true,volume:1});await a.unlock();assert.ok(a.timer);
  a.pause();assert.equal(ctx.state,'suspended');assert.equal(a.timer,null);assert.equal(a.play('hit'),false);assert.equal(await a.unlock(),false);
  await a.resume();assert.equal(ctx.state,'running');assert.ok(a.timer);
  a.setOptions({sound:false,music:false,volume:1});assert.equal(a.timer,null);assert.equal(ctx.state,'suspended');
  a.setOptions({sound:true,music:true,volume:0});assert.equal(await a.unlock(),false);assert.equal(ctx.state,'suspended');assert.equal(a.timer,null);await a.destroy();
});
test('rapid effect input is throttled and active sources stay bounded',async()=>{
  const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:false,volume:.6});await a.unlock();
  assert.equal(a.play('hit'),true);assert.equal(a.play('hit'),false);
  ctx.currentTime+=.05;assert.equal(a.play('hit'),true);
  for(let i=0;i<200;i++){ctx.currentTime+=.05;a.play('hit');assert.ok(a.voices.size<=40);}
  assert.ok(ctx.sources.some(s=>s.disconnected));for(const s of ctx.sources)s.onended?.();assert.equal(a.voices.size,0);await a.destroy();
});
test('scene changes replace the score; silent or unsupported browsers keep the game running',async()=>{
  const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:true,volume:.4});await a.unlock();const oldMusic=[...a.voices].filter(v=>v.group==='music');
  a.setScene('explore');assert.equal(a.scene,'explore');assert.ok(oldMusic.every(v=>v.source.stopped));assert.ok(a.timer);a.setScene('unexpected');assert.equal(a.scene,'forge');await a.destroy();
  const none=new GameAudio({contextFactory:()=>null});none.setOptions({sound:true,music:true,volume:.6});assert.equal(await none.unlock(),false);assert.equal(none.play('hit'),false);await none.destroy();
  const denied=new GameAudio({contextFactory:()=>{throw Error('Blocked');}});denied.setOptions({sound:true});assert.equal(await denied.unlock(),false);await denied.destroy();
});
