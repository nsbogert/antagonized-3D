export const CROWN_ON=15, DANCE_START=16.5;
export const VICTORY_DURATION=DANCE_START+23;
export const clamp01=v=>Math.max(0,Math.min(1,v));
export const ease=v=>{v=clamp01(v);return v*v*(3-2*v);};
export function victoryBeat(time){
 const t=Math.max(0,time);
 return {time:t,stage:t<3.4?'fall':t<6?'scatter':t<10?'approach':t<13?'pickup':t<CROWN_ON?'crown':t<DANCE_START?'ready':t<VICTORY_DURATION?'celebrate':'complete',
  roll:ease((t-.6)/2.6),walk:ease((t-6)/4),bend:Math.sin(clamp01((t-10)/3)*Math.PI)*.65,
  crown:ease((t-13)/2),cheer:ease((t-DANCE_START)/.8),done:t>=VICTORY_DURATION};
}
export function crownDrop(t,start,end){
 const p=clamp01((t-1.3)/2.1),e=ease(p),bounce=p<.66?Math.sin(p/.66*Math.PI)*1.3:Math.abs(Math.sin((p-.66)/.34*Math.PI*2))*.35*(1-p)/.34;
 return {x:start.x+(end.x-start.x)*e,y:start.y+(end.y-start.y)*e+bounce,z:start.z+(end.z-start.z)*e};
}
// Roll on the circular band with the crown's points facing sideways.
// The band stays vertical; shrinking lowers its axle smoothly toward the floor.
export function crownRoll(t,start,end,wearScale,startScale=1){
 const p=ease((t-3.4)/6),angle=p*Math.PI*2,scale=startScale+(wearScale-startScale)*p;
 return {x:start.x+(end.x-start.x)*p,y:.02+1.42*scale,z:start.z+(end.z-start.z)*p,scale,angle};
}
// Once it has stopped at her feet, rise clear, drift over and settle.

export function crownCoronation(t,ground,head,scale){
 const rise=ease(t-11),drift=ease(t-12),settle=ease(t-13);
 const hover=head.y+.65;
 return {x:ground.x+(head.x-ground.x)*drift,z:ground.z+(head.z-ground.z)*drift,
  y:ground.y+(hover-ground.y)*rise-.65*settle,scale,turn:drift};
}
export function victoryCaption(stage){return ({fall:'The queen has fallen.',scatter:'No queen. No courage.',approach:'One last thing…',pickup:'Finders keepers.',ready:'A perfect fit.',crown:'A crown well earned.',celebrate:'Long live Marin.',complete:'Her home. Her rules.'})[stage];}
