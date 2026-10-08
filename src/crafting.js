// Different shapes need different marking points and hammering sequences.
const SHAPES={
  knife:{kind:'blade',name:'Клинок',marks:[.24,.79],zones:[1,0,2,1,2]},
  sword:{kind:'blade',name:'Клинок',marks:[.18,.84],zones:[0,1,2,1,2]},
  axe:{kind:'head',name:'Лезвие',marks:[.29,.67],zones:[0,0,1,2,1]},
  pickaxe:{kind:'head',name:'Головка',marks:[.2,.8],zones:[0,2,0,2,1]},
  hammer:{kind:'head',name:'Головка',marks:[.32,.69],zones:[1,0,2,0,2]},
  lantern:{kind:'frame',name:'Каркас',marks:[.28,.72],zones:[0,1,2,0,2]},
  shield:{kind:'disc',name:'Окантовка',marks:[.19,.76],zones:[1,0,2,0,2]},
  ring:{kind:'ring',name:'Обод',marks:[.37,.67],zones:[0,2,1,0,2]},
  amulet:{kind:'disc',name:'Оправа',marks:[.29,.73],zones:[1,2,0,1,2]},
  goblet:{kind:'disc',name:'Чаша',marks:[.24,.76],zones:[1,0,2,1,1]},
  key:{kind:'blade',name:'Механизм',marks:[.31,.82],zones:[0,1,0,2,2]},
  staff:{kind:'ring',name:'Навершие',marks:[.23,.69],zones:[1,2,0,1,2]},
  horseshoe:{kind:'horseshoe',name:'Зацеп и ветви',marks:[.21,.78],zones:[1,0,2,0,2]},
  shears:{kind:'shears',name:'Две створки',marks:[.26,.74],zones:[0,2,1,0,2]},
  compass:{kind:'disc',name:'Оправа',marks:[.32,.68],zones:[0,2,1,2,0]},
  bell:{kind:'bell',name:'Стенки и ушко',marks:[.17,.83],zones:[0,2,1,0,2]},
};
export function workProfile(work){return {...(SHAPES[work.recipe]||SHAPES.knife),heat:({iron:.68,copper:.6,bronze:.72,moon:.81}[work.material]||.68)};}
export function targetZone(input){return input.profile.zones[Math.min(4,input.hits.length)];}
export function timingTarget(input){return input.step===0?input.profile.marks[Math.min(1,input.hits.length)]:input.step===1?input.profile.heat:.68;}
export function pointAccuracy(position,target,width=.4){return Math.max(0,Math.min(1,1-Math.abs(position-target)/width));}
export function advanceTemperature(input,dt){if(input.step!==2||input.reheating)return;input.temperature=Math.max(.18,input.temperature-Math.max(0,Math.min(.1,dt))*.045);}
export function strike(input,zone,now){
  if(input.step!==2||!Number.isInteger(zone)||zone<0||zone>2||input.hits.length>=5||input.reheating||now-input.lastHit<280)return null;
  if(input.temperature<.3)return {cold:true};
  const matching=zone===targetZone(input),thermal=input.temperature>=.5?1:.6+(input.temperature-.3)*2;
  const score=pointAccuracy(input.position,.68)*(matching?1:.35)*thermal;
  input.lastHit=now;input.lastZone=zone;input.hits.push(score);input.zoneHits[zone]++;input.combo=matching&&score>=.78?input.combo+1:0;input.bestCombo=Math.max(input.bestCombo,input.combo);
  return {score,matching,combo:input.combo,done:input.hits.length===5};
}
export function reheat(input){if(input.step!==2||input.hits.length>=5)return false;input.temperature=.94;input.reheats=Math.min(15,input.reheats+1);input.reheating=false;return true;}
export function craftsmanship(input){return {combo:input.bestCombo,reheats:input.reheats,zones:[...input.zoneHits]};}
