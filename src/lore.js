// The only door to the content of the bestiary (GDD 8): indices over content-data.js and the text helpers. Every other
// module reads the data through here. No DOM, no state.
import * as D from './content-data.js';
import {pick} from './rng.js';
export * from './content-data.js';
const index=list=>new Map(list.map(v=>[v.id,v]));
export const MON=index(D.MONSTERS),FACT=new Map(D.MONSTERS.flatMap(m=>m.facts.map(f=>[f.id,f]))),FACTS_OF=new Map(D.MONSTERS.map(m=>[m.id,m.facts]));
export const BOOK=index(D.BOOKS),POT=index(D.POTIONS),MAT=index(D.MATERIALS),HUNTER=index(D.HUNTERS),VISITOR=index(D.VISITORS),STORY=index(D.STORY),PLACE=index(D.PLACES);
// STORY is the index of the events by id (GDD 8); EVENTS is the same list in its order, for the story to walk.
export const EVENTS=D.STORY;
export const RANK=index(D.RANKS),CAT=index(D.CATEGORIES),UPGRADE=index(D.UPGRADES),GEAR_OF=index(D.GEAR),DECOR_OF=index(D.DECOR),KEEPER=index(D.KEEPER_LOOKS);
export const TOWN_TYPES=D.VISITORS.find(v=>v.id==='townsfolk').types,TOWN_TYPE=index(TOWN_TYPES);
export const ARC=new Map(D.HUNTERS.flatMap(h=>h.arc.map(a=>[a.id,{...a,hunter:h.id}])));
export const PARTS=D.MATERIALS.filter(m=>m.of),BOUGHT=D.MATERIALS.filter(m=>m.buy);
export const START=D.MONSTERS.filter(m=>m.opens==='S0').map(m=>m.id);
export const monsterOf=factId=>MON.get(String(factId).split('.')[0]);
export const plural=(n,one,few,many)=>{const a=Math.abs(n)%10,b=Math.abs(n)%100;return a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many;};
export const coins=n=>`${n} ${plural(n,'монета','монеты','монет')}`;
export const days=n=>`${n} ${plural(n,'день','дня','дней')}`;
export const lowerFirst=t=>t?t[0].toLowerCase()+t.slice(1):t,upperFirst=t=>t?t[0].toUpperCase()+t.slice(1):t;
// Percent the player sees: 66⅔ → 66.
export const pct=x=>Math.floor(x+1e-9);
// Whether the speaker is a woman: a hunter or visitor id, a town type, a look, or a boolean.
export function female(who){if(typeof who==='boolean')return who;if(typeof who==='string'){const x=HUNTER.get(who)||VISITOR.get(who)||TOWN_TYPE.get(who)||KEEPER.get(who);return !!x?.look?.female;}return !!(who?.female??who?.look?.female);}
// {м|ж} by the speaker, then {key} from vars (GDD 8.5). An unknown placeholder stays visible, so tests catch it.
export function say(text,vars={},who){const f=female(who);return String(text).replace(/\{([^{}|]*)\|([^{}|]*)\}/g,(_,m,w)=>f?w:m).replace(/\{([A-Za-z]+)\}/g,(all,k)=>k in vars&&vars[k]!=null?String(vars[k]):all);}
// The words of a line about a monster, a place, a fact, a hunter and numbers.
export function words({monster,place,fact,hunter,variant,fee,coins:c,days:d,n,day,loot,trophy,book,story,stage,stamp}={}){
 const m=typeof monster==='string'?MON.get(monster):monster,f=typeof fact==='string'?FACT.get(fact):fact,h=typeof hunter==='string'?HUNTER.get(hunter):hunter,v={};
 if(m)Object.assign(v,{monster:lowerFirst(m.name),Monster:upperFirst(m.name),monsterAcc:m.acc,monsterAbout:m.about});
 if(m&&variant){const x=m.variants.find(x=>x.id===variant);if(x)v.sign=x.signs[0];}
 if(place)v.where=PLACE.get(place)?.where;
 if(f)Object.assign(v,{title:f.title,advice:f.advice,condText:f.condText||''});
 if(h)Object.assign(v,{hunter:h.short,hunterAcc:h.acc});
 if(Number.isFinite(fee))v.fee=coins(fee);if(Number.isFinite(c))v.coins=coins(c);if(Number.isFinite(d))v.days=days(d);if(Number.isFinite(n))v.n=n;if(Number.isFinite(day))v.d=day;
 if(loot)v.loot=loot;if(trophy)v.trophy=trophy;if(book)v.book=book;if(story)v.storyTitle=story;if(stage!=null)v.stage=stage;if(stamp)v.stamp=stamp;return v;}
// One line of a list, fixed by an id and a key so a reopened window says the same thing.
export const line=(seed,id,key,list)=>Array.isArray(list)?pick(seed,['line',id,key],list):list;
// The genitive of a monster («у кикиморы болотной», «у волколака»): an animate masculine noun takes it from the accusative,
// a feminine one turns «-у/-ую» of the accusative into «-ы/-ой».
export const genOf=m=>{const x=typeof m==='string'?MON.get(m):m;return x?x.acc.split(' ').map(w=>w.endsWith('ую')?w.slice(0,-2)+'ой':w.endsWith('у')?w.slice(0,-1)+(/[кгхжшщч]$/.test(w.slice(0,-1))?'и':'ы'):w).join(' '):'';};
export const variantName=(monster,variant)=>MON.get(monster)?.variants.find(v=>v.id===variant)?.name||MON.get(monster)?.name||'';
export const partName=id=>MAT.get(id)?.name||id;
