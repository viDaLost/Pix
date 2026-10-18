import test from 'node:test';
import assert from 'node:assert/strict';
import {hash32,mix32,roll,pick,weighted} from '../src/rng.js';
import {P,L,game,snap,place,clear,know} from './bestiary-helpers.mjs';

test('a roll is a pure function of the seed and its keys, in [0,1)',()=>{
 assert.equal(hash32('abc'),hash32('abc'));assert.notEqual(hash32('abc'),hash32('abd'));assert.ok(Number.isInteger(mix32(5))&&mix32(5)>=0);
 for(let i=0;i<2000;i++){const v=roll(i,'hunt','c-'+i);assert.ok(v>=0&&v<1);assert.equal(v,roll(i,'hunt','c-'+i));}
 assert.notEqual(roll(1,'hunt','c-2'),roll(1,'hunt','c-3'));assert.notEqual(roll(1,'hunt','c-2'),roll(2,'hunt','c-2'));
 // There is no hidden state: rolling other keys in between changes nothing.
 const a=roll(9,'obs','c-4','werewolf.silver');for(let i=0;i<100;i++)roll(9,'noise',i);assert.equal(roll(9,'obs','c-4','werewolf.silver'),a);
});
test('rolls are uniform: χ² over 10 bins of 10 000 values',()=>{
 const bins=new Array(10).fill(0),N=10000;for(let i=0;i<N;i++)bins[Math.floor(roll(42,'chi',i)*10)]++;
 const chi=bins.reduce((x,n)=>x+(n-N/10)**2/(N/10),0);assert.ok(chi<21.67,`χ²=${chi.toFixed(2)} (9 degrees of freedom, p=0.01)`);
 // Neighbouring seeds and consecutive keys are not correlated.
 let same=0;for(let i=0;i<N;i++)if(Math.abs(roll(i,'x')-roll(i+1,'x'))<.01)same++;assert.ok(same<N*.03,`${same}`);
});
test('pick is uniform and weighted follows its weights, never choosing a zero weight',()=>{
 const list=['a','b','c','d'],count={};for(let i=0;i<8000;i++){const x=pick(3,['p',i],list);count[x]=(count[x]||0)+1;}for(const x of list)assert.ok(count[x]>1800&&count[x]<2200,`${x} ${count[x]}`);
 const w={},pairs=[['myth',3],['true',2],['harmful',2],['zero',0]];for(let i=0;i<9000;i++){const x=weighted(5,['w',i],pairs);w[x]=(w[x]||0)+1;}
 assert.equal(w.zero,undefined);assert.ok(Math.abs(w.myth/9000-3/7)<.03&&Math.abs(w.true/9000-2/7)<.03,JSON.stringify(w));
 assert.equal(weighted(1,['e'],[]),undefined);assert.equal(weighted(1,['e'],[['only',1]]),'only');
});
test('the roll of a hunt is fixed by the id of its case: better advice can never turn a win into a loss',()=>{
 const s=game(21);clear(s);const c=place(s,{monster:'werewolf'}),base=JSON.parse(snap(s));
 const sheets=[['werewolf.silver','werewolf.aconite','werewolf.crossroads'],['werewolf.silver','werewolf.garlic','werewolf.dawn'],['werewolf.silver','werewolf.aconite','werewolf.dawn']];
 const results=sheets.map(ids=>{const x=P.load(JSON.stringify(base));assert.ok(P.advise(x,c.id,ids).ok);const p=P.truthChance(x,{...c},ids);const r=P.endDay(x).reports[0];return {p,win:r.win};});
 const u=roll(s.worldSeed,'hunt',c.id);for(const r of results)assert.equal(r.win,100*u<r.p);
 for(const a of results)for(const b of results)if(a.p>=b.p&&b.win)assert.ok(a.win,'a better sheet keeps the win');
});
test('the order of actions within a day does not change the night',()=>{
 const s=game(5);P.endDay(s);clear(s);
 const a=place(s,{hunter:'gordey',monster:'werewolf'}),b=place(s,{hunter:'agata',monster:'kikimora'}),base=snap(s),sa=['werewolf.silver','werewolf.aconite','werewolf.crossroads'];
 const sheet=(x,c)=>{const out=[];for(const k of P.cards(x,c.id))if(k.usable&&!out.some(o=>o.cat===k.cat))out.push(k);return out.slice(0,3).map(k=>k.id);};
 const one=P.load(base),two=P.load(base);
 assert.ok(P.advise(one,a.id,sa).ok);assert.ok(P.advise(one,b.id,sheet(one,b)).ok);
 assert.ok(P.advise(two,b.id,sheet(two,b)).ok);assert.ok(P.advise(two,a.id,sa).ok);
 P.endDay(one);P.endDay(two);assert.equal(snap(one),snap(two));
});
test('guests of a morning carry different rumours, so the order they are heard in changes nothing',()=>{
 let tried=0;const strip=t=>{const o=JSON.parse(t),k={};for(const id of Object.keys(o.know).sort())k[id]={...o.know[id],v:0};o.know=k;o.kv=0;return JSON.stringify(o);};
 for(let seed=1;seed<=30;seed++){const s=game(seed);for(let d=1;d<=21;d++){P.endDay(s);const rum=s.visitors.map(v=>v.rumour).filter(Boolean);assert.equal(new Set(rum).size,rum.length);if(rum.length<2)continue;
  const base=snap(s),x=P.load(base),y=P.load(base),ids=s.visitors.filter(v=>v.rumour).map(v=>v.id);for(const id of ids)P.listen(x,id);for(const id of[...ids].reverse())P.listen(y,id);
  assert.equal(strip(snap(x)),strip(snap(y)));tried++;}}
 assert.ok(tried>10,`${tried} mornings with several rumours`);
});
