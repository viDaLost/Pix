import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,EFFECTS,SCORES,SCENES,playMusicTick} from '../src/audio.js';

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
  assert.equal(a.scene,'scriptorium','the scriptorium plays by default');a.setScene('lab');assert.equal(a.scene,'lab');assert.ok(oldMusic.every(v=>v.source.stopped));assert.ok(a.timer);a.setScene('unexpected');assert.equal(a.scene,'scriptorium');await a.destroy();
  const none=new GameAudio({contextFactory:()=>null});none.setOptions({sound:true,music:true,volume:.6});assert.equal(await none.unlock(),false);assert.equal(none.play('hit'),false);await none.destroy();
  const denied=new GameAudio({contextFactory:()=>{throw Error('Blocked');}});denied.setOptions({sound:true});assert.equal(await denied.unlock(),false);await denied.destroy();
});
test('the ceremony sounds start and stop their sources; a run of chimes is never cut as a repeat',async()=>{
  const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:false,music:false,volume:.6});assert.equal(a.play('chime',{step:0}),false,'no context, no sound');
  a.setOptions({sound:true,music:false,volume:.6});await a.unlock();
  for(const kind of['chime','stamp','whoosh','bell']){const before=ctx.sources.length;assert.equal(a.play(kind),true,kind);const made=ctx.sources.slice(before);assert.ok(made.length>=1,kind);assert.ok(made.every(s=>s.started&&s.stopped),`${kind} sources are scheduled to stop`);}
  for(let step=0;step<12;step++)assert.equal(a.play('chime',{step}),true,`note ${step} at the same moment`);
  a.setOptions({sound:false,music:false,volume:.6});assert.equal(a.play('bell'),false,'sound off');await a.destroy();
});
test('rain outside is a loop of its own: it stops in the background, with the sound and with the weather, and never takes a voice',async()=>{
  const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:false,volume:.6});a.setAmbience({rain:true});assert.equal(a.ambient,null,'nothing before the first touch');
  await a.unlock();assert.ok(a.ambient);const rain=a.ambient.source;assert.ok(rain.started&&rain.loop);assert.equal(a.voices.size,0,'rain is not a voice');
  for(let i=0;i<60;i++){ctx.currentTime+=.05;a.play('hit');}assert.ok(a.voices.size<=40);assert.ok(!rain.stopped,'forty voices of effects do not cut the rain');assert.equal(a.ambient.source,rain);
  a.pause();assert.equal(a.ambient,null);assert.ok(rain.stopped);await a.resume();assert.ok(a.ambient,'back with the page');
  const again=a.ambient.source;a.setOptions({sound:false,music:false,volume:.6});assert.equal(a.ambient,null);assert.ok(again.stopped,'stops with the sound');
  a.setOptions({sound:true,music:false,volume:.6});await a.unlock();assert.ok(a.ambient);const third=a.ambient.source;a.setAmbience({rain:false});assert.equal(a.ambient,null);assert.ok(third.stopped,'stops when the rain ends');
  a.setAmbience({rain:true});const fourth=a.ambient.source;a.setAmbience({rain:true});assert.equal(a.ambient.source,fourth,'the same rain the next day goes on');await a.destroy();
});

// Г3 (GDD 11.7, art.md 6.2): every sound of the bestiary is synthesised, scheduled and stopped like the others; the two
// scores have their tempo and key; «Опыты» are heard by their hearth, which stops like the rain.
test('every sound of the bestiary starts and stops its sources, and only those of art.md 6.2 are there',async()=>{
 for(const kind of['quill','page','seal','stamp-ok','stamp-none','stamp-worse','learn','roll','door','snuff','bubble','fire','brew','coin','hit','error','step'])assert.ok(EFFECTS.includes(kind),kind);
 for(const gone of['forge','quench','polish','rivet'])assert.ok(!EFFECTS.includes(gone),gone+' of the forge is gone');
 const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:false,volume:.6});await a.unlock();
 for(const kind of EFFECTS){ctx.currentTime+=1;const before=ctx.sources.length;assert.equal(a.play(kind),true,kind);const made=ctx.sources.slice(before);assert.ok(made.length>=1,kind+' makes a sound');assert.ok(made.every(s=>s.started&&s.stopped),`${kind} sources are scheduled to stop`);}
 // A stamp of harm is louder and longer than an empty one; the medal of chance clicks eight times before it lands.
 ctx.currentTime+=1;let before=ctx.sources.length;a.play('stamp-worse');const worse=ctx.sources.length-before;ctx.currentTime+=1;before=ctx.sources.length;a.play('stamp-none');assert.ok(worse>ctx.sources.length-before);
 ctx.currentTime+=1;before=ctx.sources.length;a.play('roll');assert.ok(ctx.sources.length-before>=11,'eight clicks and the landing');
 for(let i=0;i<5;i++){ctx.currentTime+=.1;a.play('door');}assert.ok(a.voices.size<=40);await a.destroy();
});
test('the scriptorium plays at 66 in D dorian, the laboratory at 72 in A minor over a bass ostinato',()=>{
 assert.deepEqual(SCENES.sort(),['lab','scriptorium']);assert.equal(SCORES.scriptorium.bpm,66);assert.equal(SCORES.lab.bpm,72);
 const dorian=new Set([2,4,5,7,9,11,0]),minor=new Set([9,11,0,2,4,5,7,8]);
 for(const n of SCORES.scriptorium.bars.flat().filter(n=>n!=null))assert.ok(dorian.has(n%12),`${n} is in D dorian`);
 for(const n of SCORES.lab.bars.flat().filter(n=>n!=null))assert.ok(minor.has(n%12),`${n} is in A minor`);
 const ctx=context(),notes=scene=>{const before=ctx.sources.length;for(let i=0;i<8;i++)playMusicTick(ctx,ctx.destination,scene,i,i*.2);return ctx.sources.length-before;};
 assert.ok(notes('lab')>notes('scriptorium'),'the ostinato walks on every quarter');
});
test('the hearth of «Опыты» is heard in the laboratory only, and stops in the background, with the sound and on leaving',async()=>{
 const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:false,volume:.6});a.setAmbience({lab:true});assert.equal(a.lab,null,'nothing before the first touch');
 await a.unlock();assert.ok(a.lab);const rumble=a.lab.source;assert.ok(rumble.started&&rumble.loop);
 const before=ctx.sources.length;for(let i=0;i<20;i++){ctx.currentTime+=.1;a.hearthTick();}assert.ok(ctx.sources.length-before>=8,'crackles and bubbles are scheduled');assert.ok(a.voices.size<=40);
 a.pause();assert.equal(a.lab,null);assert.ok(rumble.stopped);await a.resume();assert.ok(a.lab,'back with the page');
 a.setAmbience({lab:false});assert.equal(a.lab,null,'leaving «Опыты» stops the hearth');a.setAmbience({lab:true,rain:true});assert.ok(a.lab&&a.ambient,'rain and hearth together');
 a.setOptions({sound:false,music:false,volume:.6});assert.equal(a.lab,null);assert.equal(a.ambient,null);await a.destroy();
});
// Г3 (art.md 3.9, 6.2): the sounds of a report in time, full ≤ 4.0 s, short ≤ 1.8 s, one «hit» with less motion; the
// vibration of the moments, only when it is on and motion is not reduced.
test('a report is heard in time: door, medal, steps, a stamp for every piece of advice seen, the coin of a reward',async()=>{
 const {reportSounds,EFFECTS}=await import('../src/audio.js');
 const item=(o,seen=true,from='rumour',to=from)=>({o,seen,from,to});
 const lost={win:false,offer:null,items:[item('ok',true,'confirmed'),item('none',false),item('worse',true,'rumour','dangerous')]};
 const full=reportSounds(lost),kinds=full.map(x=>x.kind).filter(Boolean);
 assert.deepEqual(kinds,['door','roll','step','step','stamp-ok','stamp-worse','learn']);assert.ok(full.every(x=>!x.kind||EFFECTS.includes(x.kind)));
 assert.ok(full.at(-1).t<=4000,'the full report sounds within 4 s');assert.deepEqual(full.map(x=>x.t),[...full.map(x=>x.t)].sort((a,b)=>a-b));
 assert.deepEqual(full.filter(x=>x.buzz).map(x=>x.buzz),['fail','worse'],'the verdict with the medal, the harm with its stamp');
 const won=reportSounds({win:true,offer:{coins:9},items:[item('ok'),item('ok'),item('ok',true,'rumour','confirmed')]});assert.equal(won.at(-1).kind,'coin');assert.equal(won.find(x=>x.buzz).buzz,'win');
 assert.equal(won.filter(x=>x.kind==='stamp-ok').length,3);assert.equal(won.filter(x=>x.kind==='learn').length,1,'only a changed fact is learned');
 const short=reportSounds(lost,{short:true});assert.ok(!short.some(x=>x.kind==='door'),'the short report has no door');assert.ok(short.at(-1).t<=1800);assert.equal(short.find(x=>x.kind==='roll').step,1,'a quick medal');
 assert.deepEqual(reportSounds(lost,{reduced:true}),[{t:0,kind:'hit'}]);assert.deepEqual(reportSounds({win:true,items:[]},{reduced:true,short:true}),[{t:0,kind:'hit'}]);
 // The quick medal clicks the same eight times, sooner.
 const ctx=context(),a=new GameAudio({contextFactory:()=>ctx});a.setOptions({sound:true,music:false,volume:.6});await a.unlock();const starts=[];const old=ctx.createBufferSource;ctx.createBufferSource=()=>{const n=old.call(ctx);const start=n.start;n.start=t=>{starts.push(t);start.call(n,t);};return n;};
 a.play('roll');const slow=starts.splice(0).at(-1);ctx.currentTime+=1;a.play('roll',{step:1});const quick=starts.at(-1)-1;assert.ok(quick<slow*.6,`${quick} < ${slow}`);await a.destroy();
});
test('vibration follows the setting and less motion, with the patterns of art.md 6.2, and never throws',async()=>{
 const {vibrate,HAPTICS}=await import('../src/audio.js');assert.deepEqual(HAPTICS,{seal:10,roll:20,worse:[25,40,25],win:[15,30,40],fail:35});
 const calls=[],nav={vibrate:p=>{calls.push(p);return true;}};
 for(const k of Object.keys(HAPTICS))assert.equal(vibrate(k,{nav}),true,k);assert.deepEqual(calls,Object.values(HAPTICS));
 assert.equal(vibrate('seal',{nav,on:false}),false,'off in the menu');assert.equal(vibrate('seal',{nav,calm:true}),false,'less motion');assert.equal(vibrate('nothing',{nav}),false);
 assert.equal(vibrate('seal',{nav:{}}),false,'a phone without vibration');assert.equal(vibrate('seal',{nav:{vibrate(){throw Error('denied');}}}),false);assert.equal(calls.length,5);
 const {readFileSync}=await import('node:fs'),app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/const buzz=kind=>vibrate\(kind,\{on:state\.haptics!==false,calm:still\(\)\}\);/);assert.match(app,/'seal'\)\)\{buzz\('seal'\);/,'the seal of a sent sheet');
 assert.match(app,/reportSounds\(r,\{short:state\.stats\.hunts>=10,reduced:still\(\)\}\)/);assert.match(app,/if\(!dialog\.open\|\|dialog\.dataset\.report!==r\.id\|\|skippedReports\.has\(r\.id\)&&x\.t>0\)return;/,'nothing sounds once the report is closed or its beats skipped');
 assert.match(app,/case'toggle-haptics':state\.haptics=state\.haptics===false;/);
 // Found in the review of Г3: an old report opened again from the chronicle clicked its medal and buzzed once more.
 assert.match(app,/function hearReport\(r\)\{if\(r\.read\|\|heardReports\.has\(r\.id\)\)return;/,'a report already read opens quietly');
});
