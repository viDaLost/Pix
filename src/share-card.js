// A card of a finished piece to show to friends: the piece on the showcase velvet in a brass frame, its name, kind,
// metal and style, three readings and the name of the workshop. Rendered ahead of the tap (a phone allows the share
// sheet only right after it), then kept as a PNG blob and the canvas let go.
import {TYPES,METALS} from './jewelry.js';
import {drawJewel,drawVelvet,velvetTone} from './jewel-art.js';
export const CARD={w:1080,h:1350};
// The words of the card, apart from the drawing, so they are checked in node.
export function cardText(design,e,{magic=e.magic}={}){const type=TYPES.find(t=>t.id===design.type)?.name||'',metal=METALS[design.metal]?.name||'';
 return {title:design.name,subtitle:`${type} · ${metal} · стиль «${e.label}»`,plates:[['Мастерство',String(e.craft)],['Магия',String(magic)],['Блеск',e.polish+'%']],footer:'Сияние · Веленский порт, 1740'};}
// The text is set in the game's own fonts; a font that does not come in time leaves the card in the fallback serif.
async function fonts(){try{await Promise.race([Promise.all(['600 76px "Cormorant Garamond"','600 32px Manrope','700 40px Manrope'].map(f=>document.fonts?.load?.(f))),new Promise(r=>setTimeout(r,1500))]);}catch{}}
function frame(c,inset,width){const g=c.createLinearGradient(0,0,CARD.w,CARD.h);g.addColorStop(0,'#8f6c3a');g.addColorStop(.5,'#f2d69a');g.addColorStop(1,'#d6ad66');c.strokeStyle=g;c.lineWidth=width;c.strokeRect(inset,inset,CARD.w-inset*2,CARD.h-inset*2);}
const fit=(c,text,max)=>{let t=text;while(t.length>4&&c.measureText(t).width>max)t=t.slice(0,-2)+'…';return t;};
// Draws the card on a new canvas; the caller takes the blob and frees the canvas.
export function shareCard(design,{e,title=design.name,subtitle,velvet=velvetTone(),magic}={}){const text=cardText({...design,name:title},e,{magic}),c=document.createElement('canvas');c.width=CARD.w;c.height=CARD.h;const g=c.getContext('2d');
 drawVelvet(g,CARD.w,CARD.h,{tone:velvet});frame(g,36,6);frame(g,48,2);
 g.save();g.translate(90,140);drawJewel(g,design,{size:900,background:false,assessment:e});g.restore();
 g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle='#f2d69a';g.font='600 76px "Cormorant Garamond", Georgia, serif';g.fillText(fit(g,text.title,900),CARD.w/2,1082);
 g.fillStyle='#b8ad96';g.font='600 32px Manrope, system-ui, sans-serif';g.fillText(fit(g,subtitle||text.subtitle,940),CARD.w/2,1128);
 text.plates.forEach(([name,value],i)=>{const x=150+i*270,y=1150;g.fillStyle='rgba(10,14,16,.55)';g.strokeStyle='rgba(226,194,138,.45)';g.lineWidth=2;g.beginPath();if(g.roundRect)g.roundRect(x,y,240,84,18);else g.rect(x,y,240,84);g.fill();g.stroke();
  g.fillStyle='#8d8573';g.font='600 22px Manrope, system-ui, sans-serif';g.fillText(name.toUpperCase(),x+120,y+30);g.fillStyle='#efe5d0';g.font='700 40px Manrope, system-ui, sans-serif';g.fillText(value,x+120,y+72);});
 g.fillStyle='#d6ad66';g.font='600 26px Manrope, system-ui, sans-serif';g.fillText(text.footer,CARD.w/2,1276);return c;}
// The PNG of a card, ready before the tap.
export async function cardBlob(design,options){await fonts();const c=shareCard(design,options);try{return await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('Открытка не нарисовалась.')),'image/png'));}finally{c.width=c.height=0;}}
