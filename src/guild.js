// The guild review of the week: a theme every seven game days, a judge that explains its score, medals and ribbons.
// Days pass only when the player ends one, so a theme never runs out while the game is closed.
import * as J from './jewelry.js';
// A fixed order; the first two weeks ask for the stones every workshop starts with (amethysts, a sapphire).
export const THEMES=[
 {id:'guard',name:'Смотр караула',host:'bren',types:['ring','amulet','sword'],style:'symmetry',element:'ward'},
 {id:'sea',name:'Праздник моря',host:'elin',types:['pendant','amulet','staff'],style:'organic',element:'tide'},
 {id:'harvest',name:'Ярмарка урожая',host:'rowan',types:['ring','brooch','pendant'],style:'minimal',element:'growth'},
 {id:'ball',name:'Купеческий бал',host:'ada',types:['brooch','pendant','ring'],style:'ornate',element:'ember'},
 {id:'apothecary',name:'Аптекарская выставка',host:'sera',types:['amulet','brooch'],style:'contrast',element:'growth'},
 {id:'lanterns',name:'Ночь фонарей',host:'nora',types:['pendant','amulet','staff'],style:'organic',element:'light'},
 {id:'curiosities',name:'Кабинет редкостей',host:'daro',types:['brooch','ring','sword'],style:'ornate',element:'focus'},
 {id:'moon',name:'Лунный вечер',host:'mira',types:['pendant','ring'],style:'minimal',element:'light'}
];
export const weekOf=day=>Math.max(0,Math.floor((day-1)/7));
export const themeOf=day=>THEMES[weekOf(day)%THEMES.length];
export const themeOfWeek=w=>THEMES[w%THEMES.length];
export const daysLeft=day=>7-((day-1)%7);
export const MEDALS=['','Бронза','Серебро','Золото'],RIBBONS=['','бронзовая лента','серебряная лента','золотая лента'];
// Reputation for the best medal of a week; a better medal later in the week adds only the difference.
export const MEDAL_REP=[0,5,10,16],TRIES=3;
export const medalOf=score=>score>=87?3:score>=75?2:score>=62?1:0;
// The weight of craft is small on purpose: a polished piece almost always has 91–98.
export const PARTS=[['style','Стиль',40],['craft','Ремесло',20],['element','Руна',15],['fresh','Свежесть',15],['type','Вид',10]];
function known(s,d,theme){const e=J.evaluate(d),power=(e.effects[theme.element]||0)*(s.skills.includes('alchemy')?1.25:1);return {style:Math.round(.4*(e.style[theme.style]||0)),craft:Math.round(.2*e.craft),element:Math.round(.15*Math.min(100,4*power)),type:theme.types.includes(d.type)?10:0};}
// The score is the sum of its five rounded parts, so the breakdown always adds up to it.
export function judge(s,d,theme=themeOf(s.day)){const p=known(s,d,theme),fresh=J.isFresh(s,d)?100:J.demandInfo(s,d).factor===1?50:0,parts={style:p.style,craft:p.craft,element:p.element,fresh:Math.round(.15*fresh),type:p.type};
 return {score:Object.values(parts).reduce((a,b)=>a+b,0),parts};}
// Whether a piece could win a medal at all, asking the port's ledger only when its freshness decides it.
export function medalWithin(s,d,theme=themeOf(s.day)){const p=known(s,d,theme),base=p.style+p.craft+p.element+p.type;return base>=62||base+15>=62&&judge(s,d,theme).score>=62;}
// The stones of the theme's element; amethyst while that stone is not open at the supplier yet.
export function prizeGem(s,theme){const gem=Object.keys(J.GEMS).find(k=>J.GEMS[k].element===theme.element);return gem&&J.available(s,gem)?gem:'amethyst';}
// What the host says of the result.
export const VERDICT=['Похвальный отзыв. Посмотри, чего не хватило.','Достойно цеха.','Почти совершенство.','Лучшая работа смотра!'];
