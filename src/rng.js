// The dice of the bestiary (GDD 3.6): no state and no DOM. Every event takes one value from the world seed and its own
// key, so a result never depends on the order of the player's actions, a reload changes nothing, and the roll of a hunt is
// fixed by the id of its contract — better advice can never turn a win into a loss.
export const hash32=v=>{let h=2166136261;for(const c of String(v))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
export const mix32=n=>{n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);n^=n>>>16;return n>>>0;};
// A number in [0,1) for a seed and a list of keys.
export const roll=(seed,...keys)=>mix32(hash32(seed+':'+keys.join(':')))/4294967296;
export const pick=(seed,keys,list)=>list[Math.floor(roll(seed,...keys)*list.length)];
// [[item, weight], …] → item; weights ≤ 0 never win; an empty list gives undefined.
export function weighted(seed,keys,pairs){let total=0;for(const [,w] of pairs)if(w>0)total+=w;if(!(total>0))return pairs[0]?.[0];
 let u=roll(seed,...keys)*total;for(const [item,w] of pairs)if(w>0&&(u-=w)<0)return item;return pairs.findLast(([,w])=>w>0)[0];}
