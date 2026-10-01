// Queen encounter rules are independent of rendering, input and frame rate.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const QUEEN_PHASES=[
  {name:'BREAK THE CROWN',health:24,armor:6,opening:12},
  {name:'TURN THE GUARD',health:30,armor:9,opening:14},
  {name:'THE LAST CHARGE',health:36,armor:0,opening:8},
];
export function createQueen(){return {x:0,z:-3,yaw:0,phase:0,hp:24,armor:6,mode:'dormant',timer:0,open:0,foam:0,foamCooldown:0,attackCount:0,target:null,from:null,chargeHit:false,chargeCooldown:0,hitFlash:0};}
export function queenCenter(q){return {x:q.x,y:1.8,z:q.z};}
export function queenProgress(q){return q.mode==='dead'?0:((2-q.phase)+q.hp/QUEEN_PHASES[q.phase].health)/3;}
export function queenCanTakeDamage(q){return !['dormant','intermission','dead'].includes(q.mode);}
export function damageQueen(q,amount,kind){
  if(!queenCanTakeDamage(q))return 'ignored';
  if(kind==='foam'){
    if(q.foamCooldown>0)return 'resistant';
    q.foam=3;q.foamCooldown=10;q.mode='recover';q.timer=3;q.target=null;
    if(q.phase===2)q.open=Math.max(q.open,3);
    return 'foamed';
  }
  if(kind==='charge'){
    if(q.chargeCooldown>0)return 'ignored';
    q.chargeCooldown=2.5;amount=9;
  }
  if(q.armor>0){
    if(!['carcass','egg','charge','stomp'].includes(kind))return 'armored';
    q.armor=Math.max(0,q.armor-amount);q.hitFlash=.18;
    if(q.armor===0){q.open=QUEEN_PHASES[q.phase].opening;return 'exposed';}
    return 'cracked';
  }
  if(q.phase===2&&q.open<=0)return 'armored';
  q.hp=Math.max(0,q.hp-amount);q.hitFlash=.18;
  if(q.hp>0)return 'hit';
  if(q.phase===2){q.mode='dead';q.target=null;q.foam=0;return 'won';}
  q.phase++;const p=QUEEN_PHASES[q.phase];q.hp=p.health;q.armor=p.armor;
  q.mode='intermission';q.timer=6;q.open=0;q.target=null;q.foam=0;q.foamCooldown=0;
  q.x=0;q.z=-3;return 'phase';
}
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
// Returns discrete events; callers apply health loss and audiovisual feedback once.
export function stepQueen(q,dt,player,repairWorkers=0){
  const events=[];
  if(q.mode==='dead')return events;
  if(q.mode==='dormant'){
    if(player.z<13){q.mode='idle';q.timer=3;events.push('awaken');}
    return events;
  }
  for(const key of ['foam','foamCooldown','chargeCooldown','hitFlash'])q[key]=Math.max(0,q[key]-dt);
  if(q.mode==='intermission'){
    q.timer-=dt;if(q.timer<=0){q.mode='idle';q.timer=3;events.push('resume');}return events;
  }
  if(q.open>0){q.open=Math.max(0,q.open-dt);if(q.open===0&&q.phase<2){q.armor=QUEEN_PHASES[q.phase].armor;events.push('sealed');}}
  if(q.armor>0&&q.phase<2)q.armor=Math.min(QUEEN_PHASES[q.phase].armor,q.armor+Math.min(repairWorkers,3)*.15*dt);
  q.timer-=dt;
  if(q.mode==='charge'){
    const old={x:q.x,z:q.z};const t=clamp(1-q.timer/1.35,0,1);
    q.x=q.from.x+(q.target.x-q.from.x)*t;q.z=q.from.z+(q.target.z-q.from.z)*t;
    if(!q.chargeHit&&player.y<2.4&&segmentDistance(player,old,q)<3.2){q.chargeHit=true;events.push('hurt');}
    if(q.timer<=0){q.mode='recover';q.timer=q.phase===2?8:5;if(q.phase===2)q.open=8;q.target=null;events.push('opening');}
    return events;
  }
  if(q.mode==='warn'){
    if(q.timer<=0){
      if(q.attack==='slam'){
        if(player.y<1.15&&Math.hypot(player.x-q.target.x,player.z-q.target.z)<4)events.push('hurt');
        events.push('slam');q.mode='recover';q.timer=q.phase===2?8:4;if(q.phase===2)q.open=8;q.target=null;
      }else{q.mode='charge';q.timer=1.35;q.chargeHit=false;events.push('charge');}
    }
    return events;
  }
  if(q.mode==='recover'){if(q.timer<=0){q.mode='idle';q.timer=2.5;}return events;}
  if(q.phase===2&&q.open<=0){
    const dx=player.x-q.x,dz=player.z-q.z,d=Math.hypot(dx,dz);
    if(d>6){q.x=clamp(q.x+dx/d*dt*.9,-11,11);q.z=clamp(q.z+dz/d*dt*.9,-7,11);}
  }
  q.yaw=Math.atan2(player.x-q.x,player.z-q.z);
  if(q.timer<=0){
    q.attack=(q.phase>0&&q.attackCount%2===0)?'charge':'slam';q.attackCount++;
    q.from={x:q.x,z:q.z};q.target=q.attack==='charge'?{x:clamp(player.x,-12,12),z:clamp(player.z,-7,12)}:{x:player.x,z:player.z};
    q.mode='warn';q.timer=q.attack==='charge'?2:1.8;
    if(q.attack==='charge')q.yaw=Math.atan2(q.target.x-q.x,q.target.z-q.z);
    events.push('warning');
  }
  return events;
}
export function queenHint(q){
  if(q.mode==='dead')return 'THE COLONY IS SILENT';
  if(q.mode==='dormant')return 'Approach the queen to begin';
  if(q.mode==='intermission')return 'Catch your breath · health, tank and bait restored';
  if(q.mode==='warn')return q.attack==='slam'?'GROUND SLAM · leave the red circle or jump':'CHARGE · move out of the red lane';
  if(q.mode==='charge')return 'KEEP CLEAR OF HER CHARGE';
  if(q.armor>0)return q.phase===0?'Throw ants or eggs to break the resin armor':'Charge on a soldier, or blast armor with ants / eggs';
  if(q.open>0)return `EXPOSED · ${Math.ceil(q.open)}s · SPRAY OR THROW`;
  return 'Dodge her attack, then strike while she recovers';
}
