const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const PITCH_LIMIT=1.52;
export function rotateLook(rotation,dx,dy,sensitivity=1){
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  rotation.y+=dx*.0025*sensitivity;
  rotation.x=clamp(rotation.x+dy*.0025*sensitivity,-PITCH_LIMIT,PITCH_LIMIT);
}
export function keyboardLook(rotation,keys,dt,sensitivity=1){
  const yaw=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
  const pitch=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
  rotation.y+=yaw*1.75*dt*sensitivity;
  rotation.x=clamp(rotation.x+pitch*1.4*dt*sensitivity,-PITCH_LIMIT,PITCH_LIMIT);
}
// Works in embedded browsers without Pointer Lock. A drag must never also fire.
export class LookGesture {
  constructor(){this.clear();}
  clear(){this.active=false;this.dragged=false;this.fired=false;this.button=0;this.x=0;this.y=0;this.distance=0;}
  begin(x,y,button=0,time=0){this.clear();this.active=true;this.x=x;this.y=y;this.button=button;this.started=time;}
  move(x,y){if(!this.active)return null;const dx=x-this.x,dy=y-this.y;this.x=x;this.y=y;this.distance+=Math.hypot(dx,dy);if(this.distance>4)this.dragged=true;return this.dragged?{dx,dy}:null;}
  shouldHoldFire(time){if(!this.active||this.dragged||this.button!==0||time-this.started<220)return false;this.fired=true;return true;}
  end(){const click=this.active&&!this.dragged&&!this.fired&&this.button===0;this.clear();return click;}
}

export const ATTACK_KEYS=new Set(["ShiftLeft","ShiftRight","KeyF"]);
export const SPRINT_KEY="KeyC";
export const attackHeld=keys=>[...ATTACK_KEYS].some(key=>keys.has(key));
