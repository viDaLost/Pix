// The atelier has its own transactions and versioned design data; old forge saves are archived.
import {deserialize as readForge, CLIENTS as PEOPLE, itemValue as oldValue} from './game.js';
export const VERSION=3,MAX_STOCK=120,COOLDOWN=7,PREMIUM_LIMIT=4;
export class AtelierError extends Error{}
const check=(v,m)=>{if(!v)throw new AtelierError(m);};
export const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const METALS={copper:{name:'Медь',color:'#c77e55',light:'#ffd7a0',price:2},silver:{name:'Серебро',color:'#a6bdce',light:'#f1f8ed',price:5},gold:{name:'Золото',color:'#deb259',light:'#fff2ae',price:11},lunar:{name:'Лунный сплав',color:'#aa9ccf',light:'#e5e2ff',price:18}};
export const GEMS={garnet:{name:'Гранат',color:'#c95668',light:'#ffbdaf',price:7,element:'ember',power:8},amethyst:{name:'Аметист',color:'#9872cb',light:'#e6c8ff',price:10,element:'ward',power:12},emerald:{name:'Изумруд',color:'#42a68c',light:'#b7f4ba',price:18,element:'growth',power:15},sapphire:{name:'Сапфир',color:'#507dcc',light:'#c5ebff',price:22,element:'tide',power:18},diamond:{name:'Алмаз',color:'#b9d8e2',light:'#ffffff',price:45,element:'focus',power:22},moonstone:{name:'Лунный камень',color:'#b8b2ea',light:'#f6e9ff',price:30,element:'light',power:24}};
export const ELEMENTS={ember:'Тепло',ward:'Защита',growth:'Жизнь',tide:'Спокойствие',focus:'Ясность',light:'Свет'};
export const TYPES=[{id:'pendant',name:'Кулон',short:'Кулон'},{id:'ring',name:'Кольцо',short:'Кольцо'},{id:'brooch',name:'Брошь',short:'Брошь'},{id:'amulet',name:'Магический амулет',short:'Амулет'},{id:'sword',name:'Инкрустация меча',short:'Меч'},{id:'staff',name:'Навершие посоха',short:'Посох'}];
export const TOOLS=[{id:'eye',name:'Глаз мастера',cost:35,xp:10,parents:[],desc:'Показывает причины оценки и точную цену покупателя.'},{id:'gold',name:'Золотое дело',cost:65,xp:20,parents:[],desc:'Золото и алмаз у поставщика.'},{id:'facets',name:'Новые огранки',cost:50,xp:20,parents:[],desc:'Овальная и каплевидная огранка, крупные камни.'},{id:'alchemy',name:'Резонанс рун',cost:75,xp:35,parents:['facets'],desc:'+25% силы связанных рун и доступ к лунным материалам.'},{id:'mounts',name:'Оружейные оправы',cost:80,xp:35,parents:['gold'],desc:'Инкрустация готовых мечей и наверший посохов.'},{id:'signature',name:'Имя мастера',cost:110,xp:65,parents:['eye'],desc:'+10% к цене действительно обработанных изделий.'}];
const tastes={mira:{style:'minimal',metal:'silver',element:'light',wants:['pendant','ring'],line:'Лёгкая оправа и ясный камень. Ценю сдержанность.'},bren:{style:'symmetry',metal:'silver',element:'ward',wants:['ring','amulet'],line:'Строгая симметрия. Защитная руна будет кстати.'},ada:{style:'ornate',metal:'gold',element:'ward',wants:['brooch','pendant'],line:'Люблю богатые узоры и цветные камни.'},elin:{style:'organic',metal:'lunar',element:'focus',wants:['amulet','pendant'],line:'Ищу текучие формы, напоминающие берег и волны.'},rowan:{style:'minimal',metal:'copper',element:'growth',wants:['ring','brooch'],line:'Простой, прочный подарок. Без лишней тяжести.'},sera:{style:'contrast',metal:'silver',element:'growth',wants:['amulet','brooch'],line:'Мне нравятся сочетания разных камней и живые узоры.'},nora:{style:'organic',metal:'copper',element:'light',wants:['pendant','amulet'],line:'Листья, капли, волны — и немного света в пути.'},daro:{style:'ornate',metal:'gold',element:'focus',wants:['brooch','ring'],line:'Собираю выразительные вещи с необычной гравировкой.'}};
export const CLIENTS=PEOPLE.map(p=>({...p,...tastes[p.id]}));
export const AREAS=[{id:'shore',name:'Берег',x:105,y:188,need:0,loot:['garnet','amethyst']},{id:'garden',name:'Сад аббатства',x:264,y:100,need:3,loot:['emerald','sapphire']},{id:'ridge',name:'Лунный кряж',x:395,y:57,need:8,loot:['moonstone','diamond']}];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function area(points){let n=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];n+=a.x*b.y-a.y*b.x;}return Math.abs(n)/2;}
export function inside(p,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
export const onMetal=(p,d)=>inside(p,d.outline)&&!d.holes.some(h=>inside(p,h));
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return distance(p,{x:a.x+t*dx,y:a.y+t*dy});}
function intersects(a,b,c,d){const cross=(u,v,w)=>(v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);return x*y<-.00001&&z*w<-.00001;}
export function simple(points){for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;if(intersects(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))return false;}return true;}
function ellipse(cx,cy,rx,ry,n=24,turn=0){return Array.from({length:n},(_,i)=>({x:cx+Math.cos(turn+i*2*Math.PI/n)*rx,y:cy+Math.sin(turn+i*2*Math.PI/n)*ry}));}
const round2=p=>({x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100});
export const TEMPLATES=[{id:'oval',name:'Овал'},{id:'circle',name:'Круг'},{id:'drop',name:'Капля'},{id:'heart',name:'Сердце'},{id:'leaf',name:'Лист'},{id:'diamond',name:'Ромб'},{id:'shield',name:'Щит'},{id:'octagon',name:'Октагон'},{id:'flower',name:'Цветок'},{id:'star',name:'Звезда'},{id:'crescent',name:'Полумесяц'},{id:'free',name:'Свой контур'}];
// Rings keep a finger opening; weapon mounts are fixed blanks.
export function templatesFor(type){if(type==='ring')return ['oval','octagon','flower','free'];if(['sword','staff'].includes(type))return ['oval','free'];return TEMPLATES.map(t=>t.id);}
function templateOutline(template){
  if(template==='circle')return ellipse(50,50,28,28);
  if(template==='octagon')return ellipse(50,50,29,29,8,Math.PI/8);
  if(template==='flower')return Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,r=25-7*Math.cos(6*a);return {x:50+Math.cos(a)*r,y:50+Math.sin(a)*r};});
  if(template==='star')return Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?16:35;return {x:50+Math.cos(a)*r,y:53+Math.sin(a)*r};});
  if(template==='drop')return Array.from({length:30},(_,i)=>{const t=i*2*Math.PI/30;return {x:50+25*Math.sin(t)*Math.sin(t/2),y:50-34*Math.cos(t)};});
  if(template==='shield')return [{x:50,y:17},{x:63,y:19},{x:73,y:21},{x:73,y:40},{x:69,y:58},{x:60,y:72},{x:50,y:83},{x:40,y:72},{x:31,y:58},{x:27,y:40},{x:27,y:21},{x:37,y:19}];
  if(template==='crescent'){const outer=Array.from({length:19},(_,i)=>{const a=(60+i*240/18)*Math.PI/180;return {x:50+31*Math.cos(a),y:50+31*Math.sin(a)};}),r=Math.hypot(outer[0].x-66,outer[0].y-50),inner=Array.from({length:13},(_,i)=>{const a=Math.atan2(outer[18].y-50,outer[18].x-66)-(i+1)*(Math.atan2(outer[18].y-50,outer[18].x-66)-Math.atan2(outer[0].y-50,outer[0].x-66)+2*Math.PI)/14;return {x:66+r*Math.cos(a),y:50+r*Math.sin(a)};});return [...outer,...inner];}
  return null;
}
export function makeDesign(type='pendant',template='oval',metal='copper'){
  check(TYPES.some(t=>t.id===type)&&METALS[metal],'Неизвестная основа.');
  let outline=ellipse(50,49,24,31),holes=[];
  if(template==='heart')outline=[{x:50,y:25},{x:39,y:17},{x:27,y:20},{x:22,y:32},{x:27,y:45},{x:50,y:78},{x:73,y:45},{x:78,y:32},{x:73,y:20},{x:61,y:17}];
  if(template==='leaf')outline=[{x:50,y:12},{x:63,y:24},{x:73,y:40},{x:69,y:59},{x:57,y:75},{x:45,y:87},{x:33,y:65},{x:27,y:46},{x:34,y:28}];
  if(template==='diamond')outline=[{x:50,y:13},{x:78,y:49},{x:50,y:86},{x:22,y:49}];
  const shaped=templateOutline(template);if(shaped)outline=shaped;
  if(template==='free')outline=[];
  if(type==='ring'&&template!=='free'){outline=template==='octagon'?ellipse(50,50,30,30,8,Math.PI/8):template==='flower'?templateOutline('flower'):ellipse(50,50,30,30);holes=[ellipse(50,50,template==='flower'?17:19,template==='flower'?17:19,24)];}
  if(type==='brooch'&&template==='oval')outline=ellipse(50,50,31,22);
  if(type==='sword'&&template!=='free')outline=[{x:33,y:57},{x:67,y:57},{x:67,y:63},{x:57,y:66},{x:57,y:86},{x:61,y:91},{x:50,y:96},{x:39,y:91},{x:43,y:86},{x:43,y:66},{x:33,y:63}];
  if(type==='staff'&&template!=='free')outline=[{x:50,y:7},{x:67,y:19},{x:65,y:32},{x:57,y:42},{x:57,y:51},{x:43,y:51},{x:43,y:42},{x:35,y:32},{x:33,y:19}];
  return {type,template,metal,name:TYPES.find(t=>t.id===type).name,outline:outline.map(round2),holes:holes.map(h=>h.map(round2)),strokes:[],gems:[],polish:[],revision:0};
}
const pointValid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100;
export function validateDesign(d,finished=false){
  check(d&&TYPES.some(t=>t.id===d.type)&&METALS[d.metal]&&TEMPLATES.some(t=>t.id===d.template)&&typeof d.name==='string'&&d.name.length<=48,'Повреждённое изделие.');
  check(Array.isArray(d.outline)&&d.outline.length<=300&&d.outline.every(pointValid),'Некорректный контур.');
  check(Array.isArray(d.holes)&&d.holes.length<=12&&d.holes.every(h=>Array.isArray(h)&&h.length>=3&&h.length<=160&&h.every(pointValid)),'Некорректные вырезы.');
  check(Array.isArray(d.strokes)&&d.strokes.length<=160&&d.strokes.every(s=>['engrave','rune'].includes(s.kind)&&Number.isFinite(s.width)&&s.width>=.3&&s.width<=6&&Array.isArray(s.points)&&s.points.length>=2&&s.points.length<=500&&s.points.every(pointValid)),'Некорректная гравировка.');
  check(d.strokes.reduce((n,s)=>n+s.points.length,0)<=8000,'Слишком много линий. Убери часть гравировки.');
  check(Array.isArray(d.gems)&&d.gems.length<=16&&d.gems.every(g=>GEMS[g.kind]&&pointValid(g)&&Number.isFinite(g.size)&&g.size>=1.5&&g.size<=7&&['round','oval','pear'].includes(g.cut)),'Некорректные камни.');
  check(Array.isArray(d.polish)&&d.polish.length<=144&&new Set(d.polish).size===d.polish.length&&d.polish.every(n=>Number.isInteger(n)&&n>=0&&n<144),'Некорректная обработка.');
  if(finished){check(d.outline.length>=3&&simple(d.outline),'Замкни контур без пересечений.');check(area(d.outline)>=60,'Основа слишком мала.');check(d.holes.every(h=>simple(h)&&h.every(p=>inside(p,d.outline))&&!h.some((p,i)=>d.outline.some((q,j)=>intersects(p,h[(i+1)%h.length],q,d.outline[(j+1)%d.outline.length])))),'Вырез должен целиком находиться в основе.');check(d.holes.every((h,i)=>d.holes.slice(i+1).every(other=>!h.some(p=>inside(p,other))&&!other.some(p=>inside(p,h))&&!h.some((p,j)=>other.some((q,k)=>intersects(p,h[(j+1)%h.length],q,other[(k+1)%other.length]))))),'Вырезы не должны пересекаться.');check(metalArea(d)>45,'Слишком мало металла для прочной оправы.');check(d.gems.every(g=>support(g,d)>.7),'Камень выходит за край или вырез. Перемести его на металл.');check(d.gems.every((g,i)=>d.gems.slice(i+1).every(h=>Math.hypot(g.x-h.x,(g.y-h.y)/(((g.cut==='round'?1:1.4)+(h.cut==='round'?1:1.4))/2))>(g.size+h.size)*.82)),'Камни перекрывают друг друга. Раздвинь оправы.');}
  return d;
}
export const metalArea=d=>Math.max(0,area(d.outline)-d.holes.reduce((n,h)=>n+area(h),0));
export function support(g,d){return Array.from({length:12},(_,i)=>onMetal({x:g.x+Math.cos(i*Math.PI/6)*g.size*.9,y:g.y+Math.sin(i*Math.PI/6)*g.size*.9*(g.cut==='round'?1:g.cut==='pear'?1.35:1.4)},d)).filter(Boolean).length/12;}
function mask(d,size=16){return Array.from({length:size*size},(_,i)=>onMetal({x:(i%size+.5)*100/size,y:(Math.floor(i/size)+.5)*100/size},d)?1:0);}
function traceMask(d,kind){const cells=new Array(144).fill(0);for(const s of d.strokes.filter(s=>s.kind===kind))for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],steps=Math.ceil(distance(a,b));for(let j=0;j<=steps;j++){const t=j/(steps||1),point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(!onMetal(point,d))continue;const x=clamp(Math.floor(point.x*.12),0,11),y=clamp(Math.floor(point.y*.12),0,11);cells[y*12+x]=1;}}return cells;}
export function fingerprint(d){
  if(d.outline.length){const xs=d.outline.map(p=>p.x),ys=d.outline.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,k=65/Math.max(1,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));const map=p=>({...p,x:clamp(50+(p.x-cx)*k,0,100),y:clamp(50+(p.y-cy)*k,0,100)});d={...d,outline:d.outline.map(map),holes:d.holes.map(h=>h.map(map)),strokes:d.strokes.map(p=>({...p,points:p.points.map(map)})),gems:d.gems.map(map)};}
  const gems=new Array(144).fill(0);for(const g of d.gems)gems[clamp(Math.floor(g.y*.12),0,11)*12+clamp(Math.floor(g.x*.12),0,11)]=1;return {type:d.type,shape:mask(d),ink:traceMask(d,'engrave'),runes:traceMask(d,'rune'),gems};}
export function similarity(a,b){
 if(a.type!==b.type)return 0;let best=0;
 for(const [flipX,flipY]of[[false,false],[true,false],[false,true],[true,true]]){
  let score=1;for(const [key,weight,floor]of[['shape',.45,20],['ink',.25,20],['gems',.25,4],['runes',.05,15]]){
   let diff=0,union=0;const size=Math.sqrt(a[key].length),left=a[key],right=b[key].map((_,i)=>{const x=i%size,y=Math.floor(i/size);return b[key][(flipY?size-1-y:y)*size+(flipX?size-1-x:x)];});
   const near=(cells,i)=>{const x=i%size,y=Math.floor(i/size);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<size&&y+dy>=0&&y+dy<size&&cells[(y+dy)*size+x+dx])return true;return false;};
   for(let i=0;i<left.length;i++){union+=left[i]||right[i]?1:0;if(key==='shape')diff+=left[i]!==right[i]?1:0;else diff+=(left[i]&&!near(right,i)?1:0)+(right[i]&&!near(left,i)?1:0);}
   score-=weight*diff/Math.max(floor,union);
  }best=Math.max(best,score);
 }return best;
}
function family(s,d){const fp=fingerprint(d);let winner=null,best=.90;for(const f of s.demand){const sim=similarity(fp,f.signature);if(sim>=best){winner=f;best=sim;}}return winner;}
function marketFamily(s,d){let f=family(s,d);if(!f){if(s.demand.length>=2000){const oldest=s.demand.findIndex(v=>v.until<=s.tradeDay);if(oldest>=0)s.demand.splice(oldest,1);}f={signature:fingerprint(d),sales:0,until:0};s.demand.push(f);}if(f.until&&f.until<=s.tradeDay){f.sales=0;f.until=0;}return f;}
export function demandInfo(s,d){const f=family(s,d),cool=Boolean(f&&f.until>s.tradeDay);return {factor:cool?.25:1,sales:cool?4:f&&f.until<=s.tradeDay&&f.until>0?0:f?.sales||0,remaining:cool?f.until-s.tradeDay:0};}
function organicShape(points){
 if(points.length<3)return 0;const perimeter=points.reduce((n,p,i)=>n+distance(p,points[(i+1)%points.length]),0);if(!perimeter)return 0;const samples=[];
 for(let i=0;i<40;i++){let target=perimeter*i/40;for(let j=0;j<points.length;j++){const a=points[j],b=points[(j+1)%points.length],length=distance(a,b);if(target<=length&&length>0){const t=target/length;samples.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});break;}target-=length;}}
 if(samples.length!==40)return 0;const variance=samples.reduce((n,p,i)=>{const a=samples[(i+39)%40],b=samples[(i+1)%40],dot=((p.x-a.x)*(b.x-p.x)+(p.y-a.y)*(b.y-p.y))/(distance(a,p)*distance(p,b)||1),angle=Math.acos(clamp(dot,-1,1));return n+angle*angle;},0)/40;return Math.round(100*clamp(1-variance/.3,0,1));
}
export function evaluate(d){
  const cells=mask(d,12),count=cells.filter(Boolean).length||1,polished=d.polish.filter(i=>cells[i]).length/count;
  const stable=d.gems.length?d.gems.reduce((n,g)=>n+support(g,d),0)/d.gems.length:1;
  const symmetry=(()=>{const m=mask(d),ink=traceMask(d,'engrave');let diff=0,total=0;for(let i=0;i<256;i++){diff+=Math.abs(m[i]-m[Math.floor(i/16)*16+15-i%16]);total+=m[i];}for(const g of d.gems){const partner=d.gems.some(h=>Math.abs(h.x-(100-g.x))<3&&Math.abs(h.y-g.y)<3);if(!partner)diff+=12;total+=12;}for(let i=0;i<144;i++)if(ink[i]){total+=1;if(!ink[Math.floor(i/12)*12+11-i%12])diff+=1;}return Math.round(100*clamp(1-diff/Math.max(1,total),0,1));})();
  const detail=traceMask(d,'engrave').filter(Boolean).length,gemKinds=new Set(d.gems.map(g=>g.kind)).size;
  const ornate=clamp(detail*2+d.gems.length*8,0,100),organic=organicShape(d.outline),contrast=clamp(gemKinds*28+(d.metal==='silver'?12:5),0,100);
  const valid=d.outline.length>=3&&simple(d.outline),craft=Math.round(clamp((valid?45:15)+stable*17+polished*28+Math.min(10,detail/5),0,100));
  const effects={};let connections=0;
  for(const g of d.gems){if(support(g,d)<.7)continue;const linked=d.strokes.filter(p=>p.kind==='rune'&&p.points.length>=3).some(path=>path.points.some((p,i)=>i&&segmentDistance(g,path.points[i-1],p)<g.size+3));if(linked){effects[GEMS[g.kind].element]=(effects[GEMS[g.kind].element]||0)+GEMS[g.kind].power;connections++;}}
  const magic=Math.round(Object.values(effects).reduce((a,b)=>a+b,0)*(.55+craft/220));
  const style={symmetry,ornate,minimal:100-ornate,organic,contrast};
  return {craft,polish:Math.round(polished*100),style,label:ornate>65?'Богатый':organic>60?'Растительный':symmetry>80?'Геометрический':'Свободный',magic,connections,effects};
}
export function costs(d){const units=Math.max(1,Math.ceil(metalArea(d)/260)),resources={[d.metal]:units};for(const g of d.gems)resources[g.kind]=(resources[g.kind]||0)+1;const coins=d.type==='sword'?25:d.type==='staff'?15:0;return {resources,coins};}
export function rawValue(d){const c=costs(d);return Object.entries(c.resources).reduce((n,[id,v])=>n+(METALS[id]||GEMS[id]).price*v,c.coins);}
export function value(s,d){const e=evaluate(d);return Math.round(rawValue(d)*1.8+e.craft*.13+Math.min(25,e.style.ornate*.2)+(e.magic*(s.skills.includes('alchemy')?1.25:1))*.5)*(s.skills.includes('signature')&&e.polish>=50?1.1:1);}
export function affinity(d,person,want=null){const e=evaluate(d),taste=e.style[person.style]||0;return Math.round(clamp(25+taste*.45+(person.metal===d.metal?14:0)+(e.effects[person.element]?12:0)+e.craft*.09+(want&&want===d.type?10:0),0,100));}
export function quote(s,item,customer,policy='fair'){
  check(['low','fair','high','counter'].includes(policy),'Неизвестная цена.');const d=item.design,p=CLIENTS.find(p=>p.id===customer.client),fit=affinity(d,p,customer.want),fair=Math.round(value(s,d)*(.7+fit*.006)),demand=demandInfo(s,d),ceiling=Math.round(fair*(1.02+fit/200)*demand.factor),floor=Math.max(1,Math.round(fair*.75*demand.factor));
  // The counter-offer is the most this buyer will pay today: their taste ceiling or their purse.
  const offer=Math.min(customer.budget,ceiling),price=policy==='counter'?Math.max(1,offer):Math.max(1,Math.round(fair*{low:.75,fair:1,high:1.25}[policy]*demand.factor));
  return {price,fair,fit,demand,offer:offer>=floor?offer:0,accepted:policy==='counter'?offer>=floor:price<=Math.min(customer.budget,ceiling),reason:policy==='counter'&&offer<floor?'Мне это пока не по карману.':price>customer.budget?'Не хватает бюджета.':price>ceiling?'Цена выше, чем я готов платить за этот стиль.':'Мне подходит эта работа.'};
}
function rng(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function makeCustomers(s){if(s.customers.length)return;const ids=[...CLIENTS];for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng(s)*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}s.customers=ids.slice(0,4).map((p,i)=>({id:'buyer-'+s.nextId++,client:p.id,budget:150+Math.floor(rng(s)*170)+s.crafted*8,served:false,want:p.wants[(s.day+i)%p.wants.length]}));}
export function newGame(seed=1){const s={version:VERSION,world:'jewel',seed:seed>>>0,day:1,tradeDay:1,gold:180,xp:0,energy:4,crafted:0,sold:0,nextId:1,materials:{copper:50,silver:16,gold:0,lunar:0,garnet:3,amethyst:2,emerald:0,sapphire:1,diamond:0,moonstone:0},skills:[],draft:null,stock:[],library:[],customers:[],demand:[],requests:[],daily:{sales:0,areas:[],income:0,made:0},log:[],welcomed:false,sound:false,music:false,volume:.35,legacy:null};makeCustomers(s);makeRequests(s);return s;}
export function accessible(s,id){return !['gold','diamond'].includes(id)||s.skills.includes('gold');}
export function available(s,id){return accessible(s,id)&&(!['lunar','moonstone'].includes(id)||s.skills.includes('alchemy'));}
export function typeAvailable(s,id){return !['sword','staff'].includes(id)||s.skills.includes('mounts');}
export function startDesign(s,type='pendant',template='oval',metal='copper'){check(typeAvailable(s,type)&&available(s,metal),'Сначала изучи нужное ремесло.');s.draft={design:makeDesign(type,template,metal),undo:[],redo:[]};return s.draft;}
export function edit(s,next){validateDesign(next);check(s.draft,'Нет текущего изделия.');const prev=s.draft.design;if(JSON.stringify(prev)===JSON.stringify(next))return false;s.draft.undo.push(clone(prev));s.draft.undo=s.draft.undo.slice(-35);s.draft.redo=[];s.draft.design=clone(next);s.draft.design.revision=(prev.revision||0)+1;return true;}
export function undo(s,redo=false){check(s.draft,'Нет текущего изделия.');const from=redo?s.draft.redo:s.draft.undo,to=redo?s.draft.undo:s.draft.redo;if(!from.length)return false;to.push(clone(s.draft.design));s.draft.design=from.pop();return true;}
function storeModel(s,design){const d=clone(design);validateDesign(d,true);const item={id:'model-'+s.nextId++,design:d};s.library.unshift(item);s.library=s.library.slice(0,40);return item;}
export function remember(s){check(s.draft,'Нет текущего изделия.');return storeModel(s,s.draft.design);}
export function rememberItem(s,id){const item=s.stock.find(i=>i.id===id);check(item,'Изделие не найдено.');return storeModel(s,item.design);}
export function hasHandwork(d){if(d.gems.length||d.strokes.some(s=>s.points.some(p=>onMetal(p,d)))||d.polish.some(i=>onMetal({x:(i%12+.5)*100/12,y:(Math.floor(i/12)+.5)*100/12},d)))return true;const base=makeDesign(d.type,d.template,d.metal);return JSON.stringify(d.outline)!==JSON.stringify(base.outline)||JSON.stringify(d.holes)!==JSON.stringify(base.holes);}
export function restoreModel(s,id){const model=s.library.find(i=>i.id===id);check(model,'Модель не найдена.');s.draft={design:clone(model.design),undo:[],redo:[]};return s.draft;}
export function complete(s){check(s.draft,'Нет текущего изделия.');const d=clone(s.draft.design);validateDesign(d,true);check(hasHandwork(d),'Это ещё заготовка. Измени форму, нанеси узор, поставь камень или отполируй металл.');check(typeAvailable(s,d.type)&&available(s,d.metal)&&d.gems.every(g=>available(s,g.kind)),'Материал или оправа ещё не изучены.');check(s.skills.includes('facets')||d.gems.every(g=>g.cut==='round'&&g.size<=4.5),'Крупные камни и новые огранки открываются в развитии.');check(s.stock.length<MAX_STOCK,'Витрина заполнена. Продай или переплавь изделия.');const c=costs(d);check(s.gold>=c.coins&&Object.entries(c.resources).every(([id,n])=>s.materials[id]>=n),'Не хватает материалов. Загляни к поставщику.');for(const[id,n]of Object.entries(c.resources))s.materials[id]-=n;s.gold-=c.coins;const item={id:'jewel-'+s.nextId++,design:d,made:s.day};s.stock.unshift(item);s.crafted++;s.daily.made=(s.daily.made||0)+1;s.xp+=10;s.draft=null;s.log.unshift('Создано: '+d.name);s.log=s.log.slice(0,24);return item;}
export function buy(s,id,count=1){check((METALS[id]||GEMS[id])&&available(s,id)&&Number.isInteger(count)&&count>0&&count<=100,'Материал недоступен.');const amount=(METALS[id]||GEMS[id]).price*count;check(s.gold>=amount,'Не хватает монет.');s.gold-=amount;s.materials[id]+=count;}
export function sell(s,id,buyerId,policy='fair'){const item=s.stock.find(i=>i.id===id),buyer=s.customers.find(c=>c.id===buyerId&&!c.served);check(item&&buyer,'Изделие или покупатель уже недоступны.');const q=quote(s,item,buyer,policy);check(q.accepted,q.reason);const f=marketFamily(s,item.design);if(q.price>=q.fair*.95&&q.demand.factor===1){f.sales++;if(f.sales>=PREMIUM_LIMIT)f.until=s.tradeDay+COOLDOWN;}
  s.gold+=q.price;s.sold++;s.xp+=6;s.daily.sales++;s.daily.income=(s.daily.income||0)+q.price;buyer.served=true;s.stock.splice(s.stock.indexOf(item),1);s.log.unshift(`${item.design.name}: ${q.price} монет`);s.log=s.log.slice(0,24);return {...q,saturated:f.until>s.tradeDay};}
export function recycle(s,id){const i=s.stock.findIndex(v=>v.id===id);check(i>=0,'Изделие не найдено.');const d=s.stock[i].design,c=costs(d);for(const[key,n]of Object.entries(c.resources))s.materials[key]+=GEMS[key]?n:Math.max(1,Math.floor(n*.7));s.stock.splice(i,1);}
export function learn(s,id){const tool=TOOLS.find(t=>t.id===id);check(tool&&!s.skills.includes(id)&&tool.parents.every(p=>s.skills.includes(p)),'Сначала изучи предыдущую технику.');check(s.gold>=tool.cost&&s.xp>=tool.xp,'Не хватает монет или опыта.');s.gold-=tool.cost;s.skills.push(id);}
export function gather(s,id){const a=AREAS.find(a=>a.id===id);check(a&&s.crafted>=a.need,'Место ещё не открыто.');check(s.energy>0&&!s.daily.areas.includes(id),'Сегодня здесь уже искали.');s.energy--;s.daily.areas.push(id);const gem=a.loot[Math.floor(rng(s)*a.loot.length)],metal=id==='ridge'?'silver':'copper';s.materials[gem]++;s.materials[metal]+=3;s.xp+=3;return {gem,metal};}
export function nextDay(s){s.day++;if(s.daily.sales>0)s.tradeDay++;s.demand=s.demand.filter(f=>!f.until||f.until>s.tradeDay);s.energy=4;s.daily={sales:0,areas:[],income:0,made:0};s.customers=[];makeCustomers(s);s.requests=s.requests.filter(r=>r.until>=s.day&&!r.done);makeRequests(s);}
export function makeRequests(s){
 if(s.requests.length>=3)return;const templates=[
 {client:'nora',type:'pendant',style:'organic',min:45,minMagic:0,title:'Капля для путешествия'},
 {client:'bren',type:'ring',style:'symmetry',min:50,minMagic:6,title:'Печать караула'},
 {client:'ada',type:'brooch',style:'ornate',min:40,minMagic:0,title:'Праздничная брошь'},
 {client:'sera',type:'amulet',style:'contrast',min:35,minMagic:8,title:'Цветной талисман'},
 {client:'mira',type:'pendant',style:'minimal',min:55,minMagic:0,title:'Тихий свет'},
 {client:'elin',type:'amulet',style:'organic',min:45,minMagic:6,title:'Волны на оправе'},
 {client:'rowan',type:'ring',style:'minimal',min:60,minMagic:0,title:'Простой подарок'},
 {client:'daro',type:'brooch',style:'ornate',min:45,minMagic:0,title:'Знак коллекционера'}
 ];
 if(typeAvailable(s,'sword'))templates.push({client:'bren',type:'sword',style:'symmetry',min:45,minMagic:6,title:'Украшение караульной сабли'},{client:'elin',type:'staff',style:'ornate',min:35,minMagic:8,title:'Свет навигатора'});
 for(let i=templates.length-1;i>0;i--){const j=Math.floor(rng(s)*(i+1));[templates[i],templates[j]]=[templates[j],templates[i]];}
 for(const base of templates){if(s.requests.length>=3)break;if(s.requests.some(r=>r.client===base.client))continue;s.requests.push({...base,id:'request-'+s.nextId++,until:s.day+3,done:false});}
}
export function matches(d,r){const e=evaluate(d);return d.type===r.type&&e.craft>=50&&e.style[r.style]>=r.min&&e.magic>=(r.minMagic||0);}
export function deliver(s,id,itemId){const r=s.requests.find(r=>r.id===id&&!r.done),i=s.stock.find(v=>v.id===itemId);check(r&&r.until>=s.day&&i&&matches(i.design,r),'Изделие не соответствует заказу.');const buyer={id:'order',client:r.client,budget:100000,served:false},q=quote(s,i,buyer);const reward=Math.round(q.fair*1.15*q.demand.factor);check(q.demand.factor===1,'Заказчик просит свежий дизайн. Этот образ уже перенасыщен.');const f=marketFamily(s,i.design);f.sales++;if(f.sales>=PREMIUM_LIMIT)f.until=s.tradeDay+COOLDOWN;s.gold+=reward;s.sold++;s.daily.sales++;s.daily.income=(s.daily.income||0)+reward;s.xp+=16;r.done=true;s.stock.splice(s.stock.indexOf(i),1);return reward;}
export function serialize(s){return JSON.stringify(s);}
function validFingerprint(f){return f&&TYPES.some(t=>t.id===f.type)&&[['shape',256],['ink',144],['runes',144],['gems',144]].every(([key,n])=>Array.isArray(f[key])&&f[key].length===n&&f[key].every(v=>v===0||v===1));}
export function deserialize(raw){
  check(typeof raw==='string'&&raw.length<=64000000,'Файл слишком большой.');let s;try{s=JSON.parse(raw);}catch{throw new AtelierError('Файл сохранения повреждён.');}
  if(s?.world!=='jewel')return migrate(raw);
  check(s.version===VERSION,'Версия сохранения не поддерживается.');
  for(const key of['gold','xp','day','tradeDay','crafted','sold','nextId','energy'])check(Number.isInteger(s[key])&&s[key]>=0&&s[key]<=100000000,'Повреждён прогресс.');check(Number.isInteger(s.seed)&&s.seed>=0&&s.seed<=4294967295,'Повреждён генератор мира.');check(s.day>=1&&s.tradeDay>=1&&s.tradeDay<=s.day&&s.nextId>=1&&s.energy<=4,'Повреждён календарь.');
  check(s.materials&&Object.keys({...METALS,...GEMS}).every(k=>Number.isInteger(s.materials[k])&&s.materials[k]>=0&&s.materials[k]<=1000000),'Повреждены запасы.');
  check(Array.isArray(s.skills)&&new Set(s.skills).size===s.skills.length&&s.skills.every(id=>TOOLS.some(t=>t.id===id)),'Повреждены навыки.');
  check(Array.isArray(s.stock)&&s.stock.length<=MAX_STOCK&&Array.isArray(s.library)&&s.library.length<=40,'Повреждена коллекция.');const ids=new Set();for(const i of[...s.stock,...s.library]){check(typeof i.id==='string'&&/^(jewel|model)-[1-9][0-9]*$/.test(i.id)&&!ids.has(i.id),'Повторяющиеся изделия.');ids.add(i.id);validateDesign(i.design,true);}
  if(s.draft){validateDesign(s.draft.design);for(const list of[s.draft.undo,s.draft.redo]){check(Array.isArray(list)&&list.length<=35,'Повреждена история редактора.');list.forEach(d=>validateDesign(d));}}
  check(Array.isArray(s.demand)&&s.demand.length<=2000&&s.demand.every(f=>validFingerprint(f.signature)&&Number.isInteger(f.sales)&&f.sales>=0&&f.sales<=4&&Number.isInteger(f.until)&&f.until>=0),'Повреждён спрос.');
  check(Array.isArray(s.customers)&&s.customers.length<=12&&s.customers.every(c=>typeof c.id==='string'&&/^buyer-[1-9][0-9]*$/.test(c.id)&&CLIENTS.some(p=>p.id===c.client)&&Number.isInteger(c.budget)&&c.budget>=0&&typeof c.served==='boolean'&&(c.want===undefined||TYPES.some(t=>t.id===c.want))),'Повреждены покупатели.');check(new Set(s.customers.map(c=>c.id)).size===s.customers.length,'Покупатели повторяются.');
  check(Array.isArray(s.requests)&&s.requests.length<=8&&s.requests.every(r=>typeof r.id==='string'&&/^request-[1-9][0-9]*$/.test(r.id)&&typeof r.title==='string'&&r.title.length<=80&&CLIENTS.some(p=>p.id===r.client)&&TYPES.some(t=>t.id===r.type)&&['organic','symmetry','ornate','contrast','minimal'].includes(r.style)&&Number.isInteger(r.min)&&r.min>=0&&r.min<=100&&Number.isInteger(r.minMagic??0)&&(r.minMagic??0)>=0&&(r.minMagic??0)<=100&&Number.isInteger(r.until)&&typeof r.done==='boolean'),'Повреждены заказы.');check(new Set(s.requests.map(r=>r.id)).size===s.requests.length,'Заказы повторяются.');
  check(s.daily&&Number.isInteger(s.daily.sales)&&s.daily.sales>=0&&Array.isArray(s.daily.areas)&&s.daily.areas.length<=3&&new Set(s.daily.areas).size===s.daily.areas.length&&s.daily.areas.every(id=>AREAS.some(a=>a.id===id)),'Повреждён текущий день.');
  const allIds=[...s.stock,...s.library,...s.customers,...s.requests].map(i=>Number(i.id.split('-').at(-1))).filter(Number.isSafeInteger);s.nextId=Math.max(s.nextId,...allIds.map(n=>n+1));
  for(const key of['income','made'])s.daily[key]=Number.isInteger(s.daily[key])&&s.daily[key]>=0?s.daily[key]:0;s.welcomed=!!s.welcomed;s.sound=!!s.sound;s.music=!!s.music;s.volume=Number.isFinite(s.volume)?clamp(s.volume,0,1):.35;s.log=Array.isArray(s.log)?s.log.filter(v=>typeof v==='string').slice(0,24):[];return s;
}
export function migrate(raw){let old;try{old=readForge(raw);}catch{throw new AtelierError('Это не сохранение мастерской. Исходный файл не изменён.');}const s=newGame(old.seed);s.day=old.day;s.tradeDay=old.day;s.gold=old.gold;s.xp=old.xp||0;s.crafted=old.crafted||0;s.sold=old.sold||0;s.sound=!!old.sound;s.music=!!old.music;s.volume=old.volume??.35;s.welcomed=false;s.legacy=JSON.parse(raw);
  s.materials.copper+=old.resources.copper+old.resources.iron;s.materials.silver+=old.resources.moon*2;s.materials.amethyst+=old.resources.crystal;s.materials.garnet+=Math.floor(old.resources.coal/3);
  for(const i of old.stock)s.gold+=Math.round(oldValue(i)*.65);
  if(old.work){const r=old.work.reserved||old.work.costs||{};s.materials.copper+=(r.iron||0)+(r.copper||0);s.materials.amethyst+=r.crystal||0;s.materials.silver+=(r.moon||0)*2;s.materials.garnet+=Math.floor((r.coal||0)/3);s.gold+=old.work.fee||0;}
  if(old.technologies.includes('alloys'))s.skills.push('gold');if(old.technologies.includes('runes'))s.skills.push('alchemy','facets');if(old.skills?.includes('mastercraft'))s.skills.push('signature','eye');s.skills=[...new Set(s.skills)];s.customers=[];s.requests=[];makeCustomers(s);makeRequests(s);s.log=['Прежняя мастерская сохранена в архиве. Запасы и выручка перенесены.'];return s;
}
