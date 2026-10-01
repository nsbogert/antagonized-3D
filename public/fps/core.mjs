import {CHAPTERS} from './chapters.mjs';
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const distanceXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const MAX_AMMO = 3;
export const MAX_BAITS = 1;
export const GRAVITY = 22;
export const JUMP_SPEED = 10.8;

// Test crossing the ant's back, not merely overlapping it while airborne.
export function canStomp(previousFeet, feet, velocityY, player, ant) {
  const top = ant.y + (ant.type === 'soldier' ? 1.05 : 0.48);
  const radius = ant.type === 'soldier' ? 1.9 : 1.65;
  return ant.state === 'alive' && ant.type !== 'flyer' && velocityY < 0 &&
    previousFeet >= top - 0.14 && feet <= top + 0.12 && distanceXZ(player, ant) < radius;
}

// Pick a reachable ant in front of the jump, independent of camera pitch.
export function stompTarget(player, ants, yaw) {
  return ants.filter(a => a.state === 'alive' && a.type !== 'flyer' &&
    (a.type !== 'soldier' || a.foam > 0) && Math.abs(a.y-player.y)<1.3 &&
    distanceXZ(player,a)<3.6 && ((a.x-player.x)*Math.sin(yaw)+(a.z-player.z)*Math.cos(yaw)>-.4))
    .sort((a,b)=>distanceXZ(player,a)-distanceXZ(player,b))[0] || null;
}

export const SPRAY = { damage:.38, range:8.5, cone:.82, interval:.09, cost:.7 };
export const RELOAD_TIME = 1.35;
export function beginReload(state) {
  if (!state.gear || state.tank >= 100 || state.reloadRemaining > 0) return false;
  state.reloadRemaining = RELOAD_TIME;
  return true;
}
export function updateTank(state, dt, attacking) {
  if (!state.gear) return false;
  if (state.reloadRemaining > 0) {
    state.reloadRemaining = Math.max(0,state.reloadRemaining-dt);
    if (!state.reloadRemaining) { state.tank=100; state.tankIdle=0; return true; }
  } else {
    state.tankIdle=attacking?0:(state.tankIdle||0)+dt;
    if (state.tank<1 || (state.tank<100 && state.tankIdle>=1.1)) beginReload(state);
  }
  return false;
}

export function collectGear(state) {
  const first=!state.gear;
  state.gear=true; state.tank=100; state.reloadRemaining=0; state.tankIdle=0;
  if(first) state.weapon=1;
  return first;
}

export function segmentHitsSphere(start, end, center, radius) {
  const d = { x: end.x-start.x, y: end.y-start.y, z: end.z-start.z };
  const len2 = d.x*d.x+d.y*d.y+d.z*d.z;
  const t = len2 ? clamp(((center.x-start.x)*d.x+(center.y-start.y)*d.y+(center.z-start.z)*d.z)/len2,0,1) : 0;
  return Math.hypot(start.x+d.x*t-center.x,start.y+d.y*t-center.y,start.z+d.z*t-center.z) <= radius;
}

export const SOLDIER_FOAM_SECONDS = 14;
export function applyFoam(ant) {
  if (ant.state !== 'alive') return 'ignored';
  ant.foam = Math.max(ant.foam || 0, ant.type === 'soldier' ? SOLDIER_FOAM_SECONDS : 7);
  return 'foamed';
}
export function foamMovementScale(ant) {
  return ant.foam>0 ? (ant.type==='soldier'?0:.18) : 1;
}

export function damageAnt(ant, amount, kind) {
  if (ant.state !== 'alive') return 'ignored';
  if (kind === 'foam') return applyFoam(ant);
  if (ant.type === 'soldier') {
    if ((kind === 'stomp' || kind === 'carcass' || kind === 'egg') && ant.foam > 0) {
      ant.state = 'subdued'; ant.subdued = 22; return 'subdued';
    }
    // An unprepared soldier cannot be accidentally killed and block the climbing route.
    return 'armored';
  }
  ant.hp -= amount;
  if (ant.hp <= 0) { ant.state = 'dead'; ant.hp = 0; return 'killed'; }
  return 'hit';
}

// Keep the count used by the HUD, with a FIFO queue for the actual carried objects.
// Old saves only have a count, so their rounds remain worker carcasses.
export function ammoKinds(state) {
  return Array.from({length:state.ammo},(_,i)=>state.ammoKinds?.[i]==='egg'?'egg':'carcass');
}
export function collectAmmo(state,kind='carcass') {
  if (state.ammo >= (state.cannon ? MAX_AMMO : 1)) return false;
  state.ammoKinds=ammoKinds(state);
  state.ammoKinds.push(kind==='egg'?'egg':'carcass');
  state.ammo++; return true;
}
export function collectWorker(state) { return collectAmmo(state,'carcass'); }
export function consumeAmmo(state) {
  if (!state.ammo) return null;
  state.ammoKinds=ammoKinds(state);
  const kind=state.ammoKinds.shift();state.ammo--;
  return kind;
}

export function canAutoCollect(state,player,ant) {
  const available=(ant.state==='dead'&&ant.type==='worker')||(ant.state==='available'&&ant.type==='egg');
  return !state.ride && state.weapon===0 && available &&
    state.ammo<(state.cannon?MAX_AMMO:1) && distanceXZ(player,ant)<1.6 && Math.abs(player.y-ant.y)<1.2;
}

// Include decorative paving as well as collision platforms when settling corpses.
export function surfaceHeightAt(point,surfaces) {
  let height=0;
  for(const s of surfaces){
    if(s.top>point.y+.18)continue;
    let inside;
    if(s.rx){const dx=point.x-s.x,dz=point.z-s.z,c=Math.cos(s.angle||0),n=Math.sin(s.angle||0);inside=((dx*c-dz*n)/s.rx)**2+((dx*n+dz*c)/s.rz)**2<=1;}
    else inside=point.x>=s.x&&point.x<=s.x+s.w&&point.z>=s.z&&point.z<=s.z+s.d;
    if(inside)height=Math.max(height,s.top);
  }
  return height;
}

export function cacheIsClear(cache, ants) {
  return !ants.some(a => a.type === 'worker' && a.state === 'alive' && distanceXZ(a, cache) < 3.5 && Math.abs((a.y||0)-(cache.y||0))<1.5);
}

export function nearestBait(ant, baits) {
  if (ant.type === 'flyer') return null;
  const reach = ant.type === 'soldier' ? 4.5 : 13;
  return baits.filter(b => b.life > 0 && distanceXZ(ant,b) < reach && Math.abs((ant.y||0)-(b.y||0))<1.5)
    .sort((a,b) => distanceXZ(ant,a)-distanceXZ(ant,b))[0] || null;
}

export function objectiveFor(state) {
  const level=CHAPTERS[state.chapter]||CHAPTERS[1];
  if(state.chapter===4){
    const q=state.queen;
    if(!q||q.mode==='dormant')return {title:'Face the queen',detail:'Stock up on eggs. Enter the chamber to begin.',stage:1};
    return {title:['Break the crown','Turn the guard','Finish the queen'][q.phase],detail:q.phase===0?'Bait workers away. Throw eggs or ants to break armor.':q.phase===1?'Soldier charges crack armor. Cannon shots work too.':'Dodge the red warnings. Attack during her recovery.',stage:q.phase+1};
  }
  if (state.secured < 3) return { title:state.chapter===3?'Starve the colony':'Cut off the food supply', detail:`${state.chapter===3?'Seal the three colony stores':'Secure the three food caches'} · ${state.secured}/3`, stage:1 };
  if (!state.clue) return { title:state.chapter===3?'Find the queen’s signal':'Follow the colony', detail:level.climb, stage:2 };
  return { title:state.chapter===3?'The royal seal':state.chapter===2?'Into the walls':'The trail leads inside', detail:level.exitDetail, stage:3 };
}
