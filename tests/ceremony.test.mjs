import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../src/jewelry.js';
import * as P from '../src/progress.js';
import {revealPlan,planLength,ringOrder,Reveal} from '../src/ceremony.js';
import {cardText} from '../src/share-card.js';
const gem=(x,y,kind='garnet')=>({kind,x,y,size:3,cut:'round'});
const runic=n=>{const d=J.makeDesign('amulet','oval','silver');d.gems=Array.from({length:n},(_,i)=>gem(36+(i*7)%28,40+(i*5)%20));d.strokes=[{kind:'rune',width:1,points:[{x:45,y:50},{x:55,y:50}]}];return d;};
const kinds=plan=>plan.map(b=>b.kind);

test('the ceremony plays cloth, flash, the stones from left to right, the aura and the mark within 3.2 s',()=>{
 const d=runic(14),plan=revealPlan(d,{magic:12});const first=k=>kinds(plan).indexOf(k),last=k=>kinds(plan).lastIndexOf(k);
 assert.ok(first('cloth')<first('flash')&&last('flash')<first('gem')&&last('gem')<first('magic')&&first('magic')<first('stamp')&&first('stamp')<first('final'),kinds(plan).join());
 assert.ok(plan.every((b,i)=>!i||b.t>=plan[i-1].t),'beats come in time order');
 const stones=plan.filter(b=>b.kind==='gem');assert.equal(stones.length,12,'at most twelve stones ring');assert.ok(stones.every((b,i)=>!i||b.x>=stones[i-1].x),'from left to right');
 assert.deepEqual(stones.map(b=>b.step),[...Array(12).keys()]);assert.ok(stones.every(b=>d.gems[b.index].x===b.x));assert.equal(stones[1].t-stones[0].t,110);
 assert.ok(planLength(plan)<=3200,`full ${planLength(plan)}`);assert.equal(plan.find(b=>b.kind==='cloth').until,600);assert.equal(plan.find(b=>b.kind==='stamp').until-plan.find(b=>b.kind==='stamp').t,180);
 const short=revealPlan(d,{magic:12},{short:true});assert.ok(!kinds(short).includes('cloth')&&!kinds(short).includes('flash'));assert.ok(planLength(short)<=1200,`short ${planLength(short)}`);assert.equal(short.filter(b=>b.kind==='gem')[1].t,60);
 assert.deepEqual(revealPlan(d,{magic:12},{reduced:true}),[{t:0,kind:'final'}],'less motion: one final beat');
 const plain=revealPlan(J.makeDesign('ring','oval','copper'),{magic:0});assert.deepEqual(kinds(plain),['cloth','flash','stamp','final'],'no stones and no magic: the mark follows the flash');
 assert.deepEqual(ringOrder({gems:[gem(60,20),gem(40,70),gem(40,30)]}).map(g=>g.index),[2,1,0],'equal places ring top first');
});
test('Reveal calls every beat once in order, and a skipped ceremony only its final one',()=>{
 const canvas={isConnected:true,getBoundingClientRect:()=>({width:0}),width:0,height:0};globalThis.devicePixelRatio=1;
 const d=runic(3),plan=revealPlan(d,{magic:8}),heard=[],r=new Reveal(canvas,d,{magic:8},plan,{onBeat:b=>heard.push(b.kind)});
 r.paint(1000);assert.deepEqual(heard,['cloth']);r.paint(1000+1300);assert.deepEqual(heard,['cloth','flash','gem']);r.paint(1000+5000);assert.deepEqual(heard,kinds(plan));assert.ok(r.done);r.paint(9000);assert.equal(heard.length,plan.length,'nothing twice');
 const skipped=[],s=new Reveal(canvas,d,{magic:8},plan,{onBeat:b=>skipped.push(b.kind)});s.paint(0);s.skip();s.skip();s.paint(4000);assert.deepEqual(skipped,['cloth','final']);
 assert.equal(new Reveal({isConnected:false},d,{magic:0},plan).paint(0),false,'a stage taken out of the page stops the ceremony');
});
test('records: the first piece of a kind, the best work, and no false record after an update',()=>{
 const s=P.newGame(3);s.gold=1e5;for(const k of Object.keys(s.materials))s.materials[k]=1e4;s.skills.push('facets');
 const make=d=>{s.draft={design:J.clone(d),undo:[],redo:[]};return P.complete(s);};
 const first=make(runic(1));assert.deepEqual(first.records,{firstType:'amulet'},'the very first piece is the first amulet, not the best work');
 const ring=J.makeDesign('ring','oval','silver');ring.gems=[gem(50,25.5)];const r=make(ring);assert.equal(r.records.firstType,'ring');
 const plain=make(runic(1));assert.equal(plain.records.firstType,undefined);assert.ok(!plain.records.craft,'the same piece again is no record');
 const better=runic(1);better.polish=Array.from({length:144},(_,i)=>i);better.gems[0].size=4;const b=make(better);assert.ok(b.records.craft&&b.records.craft.to>b.records.craft.from,JSON.stringify(b.records));
 assert.deepEqual(s.records.types,['amulet','ring']);assert.equal(s.records.craft,J.evaluate(s.stock[0].design).craft);
 // A workshop from before the records counts its showcase and the forms of its book; its next ring is no first ring.
 const old=JSON.parse(J.serialize(s));delete old.records;const back=P.load(JSON.stringify(old));assert.deepEqual(back.records.types.slice().sort(),['amulet','ring']);assert.equal(back.records.craft,s.records.craft);
 back.stock=back.stock.filter(i=>i.design.type!=='ring');back.book.e['form:brooch.oval']=2;delete back.records;P.normalize(back);assert.ok(back.records.types.includes('ring')&&back.records.types.includes('brooch'),'the book remembers kinds no longer on the showcase');
 const again=J.makeDesign('ring','oval','silver');again.gems=[gem(50,25.5)];back.draft={design:again,undo:[],redo:[]};const done=P.complete(back);assert.deepEqual(done.records,{},'no false record after the update');
 const bad=P.load(JSON.stringify({...old,records:{craft:-4,magic:'x',value:1.5,types:['ring','sabre','ring']}}));assert.deepEqual(bad.records,{craft:0,magic:0,value:0,types:['ring']});
});
test('haptics are on unless turned off, and the card has its words',()=>{
 const s=P.newGame(4);assert.equal(s.haptics,true);const raw=JSON.parse(J.serialize(s));raw.haptics=false;assert.equal(P.load(JSON.stringify(raw)).haptics,false);raw.haptics='no';assert.equal(P.load(JSON.stringify(raw)).haptics,true);
 const d=J.makeDesign('pendant','oval','silver');d.name='Роса';const e={...J.evaluate(d),label:'Сдержанность',craft:71,polish:40,magic:6};
 assert.deepEqual(cardText(d,e),{title:'Роса',subtitle:'Кулон · Серебро · стиль «Сдержанность»',plates:[['Мастерство','71'],['Магия','6'],['Блеск','40%']],footer:'Сияние · Веленский порт, 1740'});
 assert.equal(cardText(d,e,{magic:8}).plates[1][1],'8','the magic shown is the one the workshop reads');
});
