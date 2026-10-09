// The master's book: everything the workshop has made at least once. It is a collection of its own, apart from the
// port's demand: the book counts a form, a pattern or a stone by its id, the market compares the look of the whole piece.
import * as J from './jewelry.js';
import {PATTERNS,LAYOUTS} from './patterns.js';
export const CHAPTERS=[{id:'forms',name:'Формы'},{id:'motifs',name:'Узоры'},{id:'stones',name:'Камни'},{id:'layouts',name:'Раскладки'},{id:'runes',name:'Руны'},{id:'metals',name:'Металлы'},{id:'marks',name:'Клейма'}];
const CUT_NAME={round:'круг',oval:'овал',pear:'капля'},ELEMENT_IDS=Object.keys(J.ELEMENTS).sort();
// Velvet for the showcase tray: the default, one for each finished chapter, one for a rank and four for coins.
export const VELVETS=[
 {id:'teal',name:'Морская волна',hi:'#2b3a3f',mid:'#1a2529',lo:'#0c1215'},
 {id:'burgundy',name:'Бордо',hi:'#45232a',mid:'#2a1418',lo:'#140a0c',chapter:'forms'},
 {id:'indigo',name:'Индиго',hi:'#262c4a',mid:'#171b30',lo:'#0b0d18',chapter:'motifs'},
 {id:'emerald',name:'Изумруд',hi:'#1f3d31',mid:'#13261e',lo:'#09130f',chapter:'stones'},
 {id:'plum',name:'Слива',hi:'#3a2540',mid:'#231628',lo:'#110b14',chapter:'layouts'},
 {id:'midnight',name:'Полночь',hi:'#1d2433',mid:'#121722',lo:'#080a10',chapter:'runes'},
 {id:'graphite',name:'Графит',hi:'#34363a',mid:'#202225',lo:'#0f1012',chapter:'metals'},
 {id:'brocade',name:'Парча',hi:'#4a3a22',mid:'#2c2214',lo:'#15100a',chapter:'marks'},
 {id:'brass',name:'Латунь',hi:'#3f3a2a',mid:'#26231a',lo:'#12110c',rank:3},
 {id:'sand',name:'Песок',hi:'#4d4433',mid:'#302a1f',lo:'#17140e',price:120},
 {id:'cinnamon',name:'Корица',hi:'#4a2c1c',mid:'#2d1a10',lo:'#160d08',price:200},
 {id:'cobalt',name:'Кобальт',hi:'#1f3350',mid:'#132034',lo:'#090f1a',price:320},
 {id:'purple',name:'Пурпур',hi:'#4a1c3c',mid:'#2e1025',lo:'#170812',price:480}
];
// Things for the shop itself, bought once for coins; they only change how the shop looks.
export const DECOR=[{id:'lamp',name:'Латунная лампа',desc:'Тёплый свет над прилавком',price:180},{id:'flowers',name:'Цветы в кувшине',desc:'Букет на столике у окна',price:260},{id:'map',name:'Карта порта в раме',desc:'Старая карта Велена на стене лавки',price:400}];
// Marks of the workshop, each earned once. hidden: shown as «???» until earned. soon: belongs to a part of the game
// still to come and is neither shown nor counted yet (none at the moment).
export const MARKS=[
 {id:'first-piece',name:'Первая работа',desc:'Закончить первое изделие',event:'complete',test:s=>s.crafted>=1},
 {id:'awakened',name:'Пробуждённый камень',desc:'Пробудить руной хотя бы один камень',event:'complete',test:(s,c)=>c.e.connections>=1},
 {id:'three-elements',name:'Три стихии',desc:'Пробудить три разные стихии в одной вещи',event:'complete',test:(s,c)=>Object.keys(c.e.effects).length>=3},
 {id:'six-elements',name:'Шесть стихий',desc:'Записать в книгу все шесть рун',event:'book',test:s=>ELEMENT_IDS.every(k=>'rune:'+k in s.book.e)},
 {id:'own-contour',name:'Свой контур',desc:'Закончить вещь на собственном контуре',event:'complete',test:(s,c)=>c.d.template==='free'},
 {id:'openwork',name:'Ажур',desc:'Три выреза при мастерстве не ниже 85',event:'complete',test:(s,c)=>c.d.holes.length>=3&&c.e.craft>=85},
 {id:'mirror',name:'Зеркало',desc:'Симметрия 98 при мастерстве 90',event:'complete',test:(s,c)=>c.e.style.symmetry>=98&&c.e.craft>=90},
 {id:'silence',name:'Тишина',desc:'Вещь без камней: сдержанность 90 и мастерство 90',event:'complete',test:(s,c)=>!c.d.gems.length&&c.e.style.minimal>=90&&c.e.craft>=90},
 {id:'full-shine',name:'Зеркальный блеск',desc:'Отполировать весь металл',event:'complete',test:(s,c)=>c.e.polish>=100},
 {id:'diamond-halo',name:'Ореол алмазов',desc:'Ореол из девяти алмазов',event:'complete',test:(s,c)=>{const h=c.d.gems.filter(g=>g.l==='halo');return h.length>=9&&h.every(g=>g.kind==='diamond');}},
 {id:'moon-night',name:'Лунная ночь',desc:'Лунный сплав, лунный камень и пробуждённый свет',event:'complete',test:(s,c)=>c.d.metal==='lunar'&&c.d.gems.some(g=>g.kind==='moonstone')&&!!c.e.effects.light},
 {id:'heart-fit',name:'В самое сердце',desc:'Продать вещь, которая пришлась покупателю по вкусу целиком',event:'sell',test:(s,c)=>c.q.fit>=100},
 {id:'whole-port',name:'Весь порт',desc:'Продать по полной цене каждому из восьми жителей',event:'sell',test:s=>J.CLIENTS.every(p=>s.stats.clients[p.id]>0)},
 {id:'motley-day',name:'Пёстрый день',desc:'Продать за один день четыре разных вида',event:'sell',test:s=>s.daily.types.length>=4},
 {id:'comeback',name:'Снова в деле',desc:'Продать вещь, когда в кошельке меньше 10 монет',event:'sell',test:(s,c)=>c.before<10},
 {id:'trusted',name:'Доверие жителей',desc:'Выполнить пять личных заказов',event:'deliver',test:s=>s.stats.orders>=5},
 {id:'gold-ribbon',name:'Золотая лента',desc:'Получить золото на цеховом смотре',event:'contest',test:(s,c)=>c.medal===3},
 {id:'collector-1',name:'Собиратель',desc:'Двадцать пять записей в книге',event:'book',test:s=>Object.keys(s.book.e).length>=25},
 {id:'collector-2',name:'Летописец',desc:'Семьдесят пять записей в книге',event:'book',test:s=>Object.keys(s.book.e).length>=75},
 {id:'friend',name:'Близкий друг',desc:'Дойти до пятой ступени дружбы с кем-то из жителей',event:'bond',test:s=>J.CLIENTS.some(p=>J.bondLevel(s,p.id)>=5)},
 {id:'cartographer',name:'Сердце картографа',desc:'Элин купила сердце из лунного сплава, которое пришлось ей по душе',hidden:true,event:'sell',test:(s,c)=>c.buyer.client==='elin'&&c.item.design.template==='heart'&&c.item.design.metal==='lunar'&&c.q.fit>=90}
];
export const activeMarks=()=>MARKS.filter(m=>!m.soon);
// The full list a chapter expects, built from the game data so a new pattern or blank joins its chapter by itself.
export function chapterKeys(id){
 if(id==='forms')return J.TYPES.flatMap(t=>J.templatesFor(t.id).map(x=>`form:${t.id}.${x}`));
 if(id==='motifs')return [...PATTERNS.map(p=>'motif:'+p.id),'motif:hand'];
 if(id==='stones')return Object.keys(J.GEMS).flatMap(k=>Object.keys(CUT_NAME).map(c=>`stone:${k}.${c}`));
 if(id==='layouts')return LAYOUTS.map(l=>'layout:'+l.id);
 if(id==='runes')return [...ELEMENT_IDS.map(e=>'rune:'+e),...ELEMENT_IDS.flatMap((a,i)=>ELEMENT_IDS.slice(i+1).map(b=>`pair:${a}+${b}`))];
 if(id==='metals')return Object.keys(J.METALS).flatMap(m=>J.TYPES.map(t=>`metal:${m}.${t.id}`));
 if(id==='marks')return activeMarks().map(m=>m.id);
 return [];
}
export const bookTotal=()=>CHAPTERS.reduce((n,c)=>n+chapterKeys(c.id).length,0);
const found=(book,key,chapter)=>chapter==='marks'?key in book.m:key in book.e;
export const chapterDone=(book,id)=>chapterKeys(id).every(k=>found(book,k,id));
export const bookCount=book=>CHAPTERS.reduce((n,c)=>n+chapterKeys(c.id).filter(k=>found(book,k,c.id)).length,0);
// What a design adds to the book. A pattern counts from 24 points of its strokes, own engraving from 20,
// a layout from half of its stones; every stone, awakened element and pair of them counts on its own.
export function catalogKeys(d,e=J.evaluate(d)){
 const keys=[];if(J.templatesFor(d.type).includes(d.template))keys.push(`form:${d.type}.${d.template}`);
 const ink={};let hand=0;for(const s of d.strokes){if(s.m)ink[s.m]=(ink[s.m]||0)+s.points.length;else if(s.kind==='engrave')hand+=s.points.length;}
 for(const p of PATTERNS)if((ink[p.id]||0)>=24)keys.push('motif:'+p.id);if(hand>=20)keys.push('motif:hand');
 const laid={};for(const g of d.gems){const k=`stone:${g.kind}.${g.cut}`;if(!keys.includes(k))keys.push(k);if(g.l)laid[g.l]=(laid[g.l]||0)+1;}
 for(const l of LAYOUTS)if((laid[l.id]||0)>=Math.ceil(l.spots/2))keys.push('layout:'+l.id);
 const woke=Object.keys(e.effects).sort();for(const a of woke)keys.push('rune:'+a);woke.forEach((a,i)=>{for(const b of woke.slice(i+1))keys.push(`pair:${a}+${b}`);});
 keys.push(`metal:${d.metal}.${d.type}`);return keys;
}
const typeShort=id=>(J.TYPES.find(t=>t.id===id)?.short||id).toLowerCase();
// A short name for a key: «Полумесяц · брошь», «Сапфир · капля», «Тепло и Ясность».
export function keyName(key){
 const [kind,rest]=key.split(':');
 if(kind==='form'){const [type,tpl]=rest.split('.');return `${['sword','staff'].includes(type)&&tpl==='oval'?'Готовая оправа':J.TEMPLATES.find(t=>t.id===tpl)?.name||tpl} · ${typeShort(type)}`;}
 if(kind==='motif')return rest==='hand'?'Своя гравировка':PATTERNS.find(p=>p.id===rest)?.name||rest;
 if(kind==='stone'){const [gem,cut]=rest.split('.');return `${J.GEMS[gem]?.name||gem} · ${CUT_NAME[cut]||cut}`;}
 if(kind==='layout')return LAYOUTS.find(l=>l.id===rest)?.name||rest;
 if(kind==='rune')return J.ELEMENTS[rest]||rest;
 if(kind==='pair'){const [a,b]=rest.split('+');return `${J.ELEMENTS[a]} и ${J.ELEMENTS[b]?.toLowerCase()}`;}
 if(kind==='metal'){const [m,type]=rest.split('.');return `${J.METALS[m]?.name||m} · ${typeShort(type)}`;}
 return MARKS.find(m=>m.id===key)?.name||key;
}
