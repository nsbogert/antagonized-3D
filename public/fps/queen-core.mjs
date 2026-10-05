// Queen encounter rules are independent of rendering, input and frame rate.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const QUEEN_PHASES=[
  {name:'BREAK THE CROWN',health:24,armor:6,opening:12},
  {name:'TURN THE GUARD',health:30,armor:9,opening:14},
  {name:'THE LAST CHARGE',health:36,armor:0,opening:8},
];
export function createQueen(){return {x:0,z:-3,yaw:0,phase:0,hp:24,armor:6,mode:'dormant',timer:0,open:0,foam:0,foamCooldown:0,attackCount:0,vx:0,vz:0,motionTime:0,stagger:0,staggerCooldown:0,repairCooldown:0,target:null,from:null,chargeHit:false,chargeCooldown:0,hitFlash:0};}
export function queenCenter(q){return {x:q.x,y:1.8,z:q.z};}
export function queenProgress(q){return q.mode==='dead'?0:((2-q.phase)+q.hp/QUEEN_PHASES[q.phase].health)/3;}
export function queenCanTakeDamage(q){return !['dormant','intermission','dead'].includes(q.mode);}
// A continuous stream of spray must not pin her permanently in place.
function staggerQueen(q){
  if(q.staggerCooldown>0||q.foam>0)return;
  q.stagger=1.35;q.staggerCooldown=5;q.vx=0;q.vz=0;
  q.mode='recover';q.timer=1.35;q.target=null;
}
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
    q.armor=Math.max(0,q.armor-amount);q.hitFlash=.18;staggerQueen(q);
    if(q.armor===0){q.open=QUEEN_PHASES[q.phase].opening;return 'exposed';}
    return 'cracked';
  }
  if(q.phase===2&&q.open<=0)return 'armored';
  q.hp=Math.max(0,q.hp-amount);q.hitFlash=.18;staggerQueen(q);
  if(q.hp>0)return 'hit';
  if(q.phase===2){q.mode='dead';q.target=null;q.foam=0;return 'won';}
  q.phase++;const p=QUEEN_PHASES[q.phase];q.hp=p.health;q.armor=p.armor;
  q.mode='intermission';q.timer=6;q.open=0;q.target=null;q.foam=0;q.foamCooldown=0;
  q.vx=0;q.vz=0;q.stagger=0;return 'phase';
}
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function turnQueen(q,x,z,dt){
  if(Math.hypot(x-q.x,z-q.z)<.01)return;
  q.yaw+=clamp(angleDelta(q.yaw,Math.atan2(x-q.x,z-q.z)),-2.2*dt,2.2*dt);
}
function roamQueen(q,dt,player,speed=1){
  // Orbit when close, close the gap when far away, and steer away from the edges.
  const dx=player.x-q.x,dz=player.z-q.z,d=Math.hypot(dx,dz)||1;
  const radial=clamp((d-8)*.28,-.7,1),orbit=.75*Math.cos(q.phase*Math.PI);
  let vx=(dx/d*radial+dz/d*orbit)*speed,vz=(dz/d*radial-dx/d*orbit)*speed;
  vx+=clamp(-q.x/10,-1,1)*Math.max(0,Math.abs(q.x)-8)*.9;
  vz+=clamp((2-q.z)/9,-1,1)*Math.max(0,Math.abs(q.z-2)-6)*.9;
  const blend=1-Math.exp(-dt*4);
  q.vx+=(vx-q.vx)*blend;q.vz+=(vz-q.vz)*blend;
  const oldX=q.x,oldZ=q.z;
  q.x=clamp(q.x+q.vx*dt,-12,12);q.z=clamp(q.z+q.vz*dt,-7,12);
  q.vx=(q.x-oldX)/dt;q.vz=(q.z-oldZ)/dt;
  turnQueen(q,player.x,player.z,dt);
}
// Returns discrete events; callers apply health loss and audiovisual feedback once.
export function stepQueen(q,dt,player,repairWorkers=0){
  const events=[];if(dt<=0||q.mode==='dead')return events;
  q.motionTime+=dt;
  if(q.mode==='dormant'){
    if(player.z<13){q.mode='idle';q.timer=3;events.push('awaken');}
    return events;
  }
  for(const key of ['foam','foamCooldown','chargeCooldown','hitFlash','stagger','staggerCooldown','repairCooldown'])q[key]=Math.max(0,q[key]-dt);
  if(q.mode==='intermission'){
    q.timer-=dt;if(q.timer<=0){q.mode='idle';q.timer=3;events.push('resume');}return events;
  }
  if(q.open>0){q.open=Math.max(0,q.open-dt);if(q.open===0&&q.phase<2){q.armor=QUEEN_PHASES[q.phase].armor;events.push('sealed');}}
  q.timer-=dt;
  if(q.mode==='charge'){
    const old={x:q.x,z:q.z},t=clamp(1-q.timer/1.35,0,1),travel=t*t*(3-2*t);
    q.x=q.from.x+(q.target.x-q.from.x)*travel;q.z=q.from.z+(q.target.z-q.from.z)*travel;
    q.vx=(q.x-old.x)/dt;q.vz=(q.z-old.z)/dt;
    turnQueen(q,q.target.x,q.target.z,dt);
    if(!q.chargeHit&&player.y<2.4&&segmentDistance(player,old,q)<3.2){q.chargeHit=true;events.push('hurt');}
    if(q.timer<=0){q.mode='recover';q.timer=1.5;q.vx=0;q.vz=0;if(q.phase===2)q.open=8;q.target=null;events.push('opening');}
    return events;
  }
  if(q.mode==='warn'){
    if(q.attack==='slam')roamQueen(q,dt,q.target,.8);
    else{
      turnQueen(q,q.target.x,q.target.z,dt);
      // Creep into the fixed warning lane, then launch from the actual position.
      const dx=q.target.x-q.x,dz=q.target.z-q.z,d=Math.hypot(dx,dz)||1,speed=Math.min(.4,d*.3);
      q.vx=dx/d*speed;q.vz=dz/d*speed;q.x+=q.vx*dt;q.z+=q.vz*dt;
    }
    if(q.timer<=0){
      if(q.attack==='slam'){
        if(player.y<1.15&&Math.hypot(player.x-q.target.x,player.z-q.target.z)<4)events.push('hurt');
        events.push('slam');q.mode='recover';q.timer=1.5;q.vx=0;q.vz=0;if(q.phase===2)q.open=8;q.target=null;
      }else{q.from={x:q.x,z:q.z};q.mode='charge';q.timer=1.35;q.chargeHit=false;events.push('charge');}
    }
    return events;
  }
  if(q.mode==='recover'){
    q.vx=0;q.vz=0;
    if(q.timer<=0){q.mode='idle';q.timer=2.5;}
    return events;
  }
  if(q.mode==='repair'){
    q.vx=0;q.vz=0;
    q.armor=Math.min(QUEEN_PHASES[q.phase].armor,q.armor+Math.min(repairWorkers,3)*.4*dt);
    if(q.timer<=0||repairWorkers===0||q.armor>=QUEEN_PHASES[q.phase].armor){q.mode='idle';q.timer=1.5;}
    return events;
  }
  if(q.armor>0&&q.armor<QUEEN_PHASES[q.phase].armor&&repairWorkers>0&&q.repairCooldown<=0){
    q.mode='repair';q.timer=3;q.repairCooldown=10;q.vx=0;q.vz=0;events.push('repair');return events;
  }
  roamQueen(q,dt,player,1.8+q.phase*.35);
  if(q.timer<=0&&(q.phase!==2||q.open<=0)){
    q.attack=(q.phase>0&&q.attackCount%2===0)?'charge':'slam';q.attackCount++;
    q.from={x:q.x,z:q.z};q.target=q.attack==='charge'?{x:clamp(player.x,-12,12),z:clamp(player.z,-7,12)}:{x:player.x,z:player.z};
    q.mode='warn';q.timer=q.attack==='charge'?2:1.8;
    events.push('warning');
  }
  return events;
}
export function queenHint(q){
  if(q.mode==='dead')return 'THE COLONY IS SILENT';
  if(q.mode==='dormant')return 'Approach the queen to begin';
  if(q.mode==='intermission')return 'Catch your breath · visit supplies to refill';
  if(q.mode==='repair')return 'REPAIRING RESIN · spray or foam the workers';
  if(q.stagger>0)return 'STAGGERED · keep attacking';
  if(q.mode==='warn')return q.attack==='slam'?'GROUND SLAM · leave the red circle or jump':'CHARGE · move out of the red lane';
  if(q.mode==='charge')return 'KEEP CLEAR OF HER CHARGE';
  if(q.armor>0)return q.phase===0?'Throw ants or eggs to break the resin armor':'Charge on a soldier, or blast armor with ants / eggs';
  if(q.open>0)return `EXPOSED · ${Math.ceil(q.open)}s · SPRAY OR THROW`;
  return 'Dodge her attack, then strike while she recovers';
}
