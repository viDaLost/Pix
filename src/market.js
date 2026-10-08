// What the showcase and the orders page need for one render, computed without the DOM so the
// number of appraisals and demand comparisons per render can be held to a budget in tests.
import * as J from './jewelry.js';
export function showcase(s,{buyerId=null,itemId=null,sort='new',policy='fair'}={}){
 const guests=s.customers.filter(c=>!c.served),buyer=guests.find(c=>c.id===buyerId)||guests[0]||null,person=buyer&&J.CLIENTS.find(p=>p.id===buyer.client);
 // One appraisal per piece: the sort, the gallery badges and the arrows share it.
 const fits=new Map(buyer?s.stock.map(i=>[i.id,J.affinity(i.design,person,buyer.want)]):[]),list=sort==='fit'&&buyer?[...s.stock].sort((a,b)=>fits.get(b.id)-fits.get(a.id)):s.stock;
 const item=s.stock.find(i=>i.id===itemId)||s.stock[0]||null,quotes=buyer&&item?J.quotes(s,item,buyer):null;
 return {guests,buyer,person,fits,list,item,quotes,q:quotes?.[policy]||null,demand:item?quotes?.fair.demand||J.demandInfo(s,item.design):null};
}
export const deliverable=s=>s.requests.some(r=>!r.done&&s.stock.some(i=>J.matches(i.design,r)));
// For every open order, the first piece that fits it and is still in fresh demand.
export const orderPieces=s=>new Map(s.requests.map(r=>[r.id,r.done?null:s.stock.find(i=>J.matches(i.design,r)&&!J.demandInfo(s,i.design).remaining)||null]));
