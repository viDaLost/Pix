// The time of day, the weather and the seasons of the port. Only pictures and words read them: prices, demand, guests and
// finds never do. The weather of a day comes from the world seed written once into the save, never from the random
// generator of guests and finds, so a search on the shore cannot turn rain into sunshine. No DOM here.
export const SEASONS=['осень','зима','весна','лето'];
export const WEATHER={clear:'ясно',rain:'дождь',fog:'туман',snow:'снег'};
export const WEATHER_ICON={clear:'sun',rain:'rain',fog:'cloud',snow:'snow'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// The day turns to evening as the work of the day is done; night falls only when the day is ended.
export function dayPhase(s){const d=s?.daily||{},n=v=>Number.isFinite(v)&&v>0?v:0;return clamp(.12+n(d.sales)*.12+n(d.made)*.08+(Array.isArray(d.areas)?d.areas.length:0)*.06,0,.8);}
// Twelve days a season; the story begins after the autumn storm.
export const season=day=>Math.floor((Math.max(1,Math.floor(day)||1)-1)/12)%4;
// A well-mixed number in [0,1) for a seed and a day (consecutive days must not share the weather by accident).
export function dayHash(seed,day){let n=(seed^Math.imul(day|0,0x9e3779b9))>>>0;n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return (n>>>0)/4294967296;}
export function weatherFor(seed,day){const h=dayHash(seed>>>0,day),k=season(day);
 if(k===0)return h<.35?'rain':h<.5?'fog':'clear';
 if(k===1)return h<.45?'snow':h<.55?'fog':'clear';
 if(k===2)return h<.25?'rain':'clear';
 return h<.1?'rain':'clear';}
// Everything a scene needs to know about the hour and the sky of the workshop's day.
export function ambience(s){const day=Number.isInteger(s?.day)&&s.day>0?s.day:1,weather=weatherFor(s?.worldSeed>>>0,day);return {day,season:season(day),weather,phase:dayPhase(s)};}
// «осень, дождь»: the caption of a scene and the line of the morning.
export const skyWords=amb=>`${SEASONS[amb.season]}, ${WEATHER[amb.weather]}`;
const MORNING={clear:'ясное утро над гаванью',rain:'над гаванью дождь',fog:'гавань в тумане',snow:'гавань в снегу'};
export const morningWords=amb=>{const t=SEASONS[amb.season];return `${t[0].toUpperCase()+t.slice(1)}, ${MORNING[amb.weather]}`;};
const hex=v=>'#'+v.map(n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0')).join('');
const rgb=h=>[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16));
export const mix=(a,b,k)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*clamp(k,0,1)));};
// Keys of the sky through a day: dawn, noon, sunset and night. The tint of the room never goes darker than the night
// key, so the counter and the pieces on it stay readable.
const KEYS=[[0,{top:'#f2b98a',bottom:'#ffe0b8',tint:'#fff1e4',shaft:'#ffd9a8'}],[.35,{top:'#8bd0cf',bottom:'#cfefdd',tint:'#ffffff',shaft:'#ffecbe'}],[.8,{top:'#e58a5e',bottom:'#f7c68d',tint:'#e2b9a8',shaft:'#ffb27a'}],[1,{top:'#1d2747',bottom:'#3a4670',tint:'#5a6690',shaft:'#9fb6ff'}]];
const GREY={clear:0,rain:.45,fog:.55,snow:.35};
export function sky(phase=.35,weather='clear'){const p=clamp(Number(phase)||0,0,1);let i=0;while(i<KEYS.length-2&&p>KEYS[i+1][0])i++;const [a,x]=KEYS[i],[b,y]=KEYS[i+1],k=(p-a)/(b-a),g=GREY[weather]||0,dull=c=>mix(c,'#8d9aa3',g*(1-p*.6));
 const top=dull(mix(x.top,y.top,k)),bottom=dull(mix(x.bottom,y.bottom,k));
 return {top,bottom,hill:mix(bottom,'#20283a',p>.8?(p-.8)*4:0),tint:mix(mix(x.tint,y.tint,k),'#c8cfd6',g*.5),shaft:mix(x.shaft,y.shaft,k),candle:mix('#ffb860','#ffc47a',p)};}
export const HILLS=['#9a8a52','#dfe8ea','#79a884','#679c84'];
