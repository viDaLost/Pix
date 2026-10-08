import * as G from './game.js';
import {portraitURL} from './art.js';

export function tripView(state,{ordinary=false},{btn,icon,esc}){
  const t=state.trip,event=G.routeEvent(t.encounter),place=G.REGIONS.find(r=>r.id===t.region);
  let alternative='';
  let html=`<div class="trip-heading"><strong>${place.name}</strong><span>${t.step+1}/2</span></div>`;
  if(event&&!ordinary){
    const p=G.CLIENTS.find(p=>p.id===event.person);
    html+=`<article class="encounter-card"><div class="encounter-heading"><img src="${portraitURL(p)}" alt="${p.name}"><div><h2>${event.title}</h2><small>${p.name} · ${p.role}</small></div></div><p>${event.text}</p><div class="encounter-choices">`;
    for(const choice of event.choices){
      const costs=Object.entries(choice.costs).map(([id,n])=>`${icon(id)}${n}`).join(' '),loot=Object.entries(choice.loot).map(([id,n])=>`${icon(id)}+${n}`).join(' ');
      const bonus=`${choice.gold?`${icon('coin')}+${choice.gold}`:''}${choice.blueprint?icon('orders'):''}${choice.relic?icon('relic'):''}`;
      const description=Object.entries(choice.costs).map(([id,n])=>`${G.MATERIALS[id].name} ${n}`).join(', ')||'Без затрат';
      html+=btn('encounter-choice',`<b>${choice.name}</b><small><span>${costs||'Без затрат'}</span><i>→</i><span>${loot} ${bonus}</span></small>`,'encounter-choice',`data-choice="${choice.id}" aria-label="${esc(choice.name+': '+description)}" ${G.canAfford(state,choice.costs)?'':'disabled'}`);
    }
    html+=`</div><small class="trip-note">Награды — после возвращения домой.</small></article>`;
    alternative=btn('trip-ordinary','Свой маршрут','secondary trip-alternative');
  }else{
    html+=`<div class="trip-actions"><h2>${t.step?'Вторая остановка':'Первая остановка'}</h2>${G.TRIP_CHOICES.map(c=>btn('trip-action',`${icon(c.icon)}<span>${c.name}<small>${c.desc}</small></span>`,'choice-button',`data-choice="${c.id}"`)).join('')}</div>`;
    if(event)alternative=btn('trip-event','Вернуться к встрече','secondary trip-alternative');
    if(t.step)html+=`<div class="trip-findings">${Object.entries(t.found).map(([id,n])=>`<span>${icon(id)}+${n}</span>`).join('')}${t.gold?`<span>${icon('coin')}+${t.gold}</span>`:''}${t.blueprint?`<span>${icon('orders')}Чертёж</span>`:''}</div>`;
  }
  return html+`<div class="trip-navigation">${alternative}${btn('retreat-ask','Вернуться без находок','secondary danger trip-retreat')}</div>`;
}
