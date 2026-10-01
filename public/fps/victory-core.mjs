export const VICTORY_DURATION=18;
export const clamp01=v=>Math.max(0,Math.min(1,v));
export const ease=v=>{v=clamp01(v);return v*v*(3-2*v);};
export function victoryBeat(time){
 const t=Math.max(0,time);
 return {time:t,stage:t<3.4?'fall':t<6?'scatter':t<10?'approach':t<12?'pickup':t<14?'crown':t<18?'celebrate':'complete',
  roll:ease((t-.6)/2.6),walk:ease((t-6)/4),bend:Math.sin(clamp01((t-10)/2)*Math.PI)*.85,
  crown:ease((t-12)/2),cheer:ease((t-14)/.8),done:t>=VICTORY_DURATION};
}
export function crownDrop(t,start,end){
 const p=clamp01((t-1.3)/2.1),e=ease(p),bounce=p<.66?Math.sin(p/.66*Math.PI)*1.3:Math.abs(Math.sin((p-.66)/.34*Math.PI*2))*.35*(1-p)/.34;
 return {x:start.x+(end.x-start.x)*e,y:start.y+(end.y-start.y)*e+bounce,z:start.z+(end.z-start.z)*e};
}
export function victoryCaption(stage){return ({fall:'The queen has fallen.',scatter:'No queen. No courage.',approach:'One last thing…',pickup:'Finders keepers.',crown:'A crown well earned.',celebrate:'Long live Marin.',complete:'Her home. Her rules.'})[stage];}
