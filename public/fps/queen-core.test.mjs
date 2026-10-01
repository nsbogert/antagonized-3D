import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueen,damageQueen,stepQueen,queenProgress,queenHint,QUEEN_PHASES} from './queen-core.mjs';
const p={x:0,y:0,z:10};
function awake(){const q=createQueen();stepQueen(q,.02,p);return q;}
function tick(q,seconds,player=p,repairs=0){const events=[];for(let t=0;t<seconds;t+=.02)events.push(...stepQueen(q,.02,player,repairs));return events;}
test('queen waits for arena entry and cannot be sniped before awakening',()=>{
 const q=createQueen();assert.deepEqual(stepQueen(q,20,{...p,z:20}),[]);assert.equal(q.mode,'dormant');assert.equal(damageQueen(q,100,'egg'),'ignored');
 assert.deepEqual(stepQueen(q,.02,p),['awaken']);assert.equal(q.mode,'idle');
});
test('eggs break resin; spray needs an opening; only nearby undistracted workers repair',()=>{
 const q=awake();assert.equal(damageQueen(q,5,'spray'),'armored');assert.equal(q.hp,24);
 damageQueen(q,3,'egg');assert.equal(q.armor,3);stepQueen(q,1,p,0);assert.equal(q.armor,3);
 tick(q,.5,p,0);stepQueen(q,.02,p,2);assert.equal(q.mode,'repair');
 stepQueen(q,1,p,2);assert.equal(q.armor,3.8);
 damageQueen(q,3,'carcass');assert.equal(damageQueen(q,3,'egg'),'exposed');
 assert.equal(q.open,12);assert.equal(damageQueen(q,2,'spray'),'hit');assert.equal(q.hp,22);
 tick(q,12.2,{...p,x:20});assert.equal(q.armor,6);
});
test('a mounted charge cracks second-phase armor once per cooldown',()=>{
 const q=awake();q.phase=1;q.hp=30;q.armor=9;
 assert.equal(damageQueen(q,1,'charge'),'exposed');assert.equal(q.armor,0);
 assert.equal(damageQueen(q,1,'charge'),'ignored');assert.equal(q.hp,30);
 tick(q,2.6,{...p,x:20});assert.equal(damageQueen(q,1,'charge'),'hit');assert.equal(q.hp,21);
});
test('queen phases advance once, protect intermissions, and finish without cache objectives',()=>{
 const q=awake();let phases=0;
 for(let phase=0;phase<3;phase++){
  assert.equal(q.phase,phase);
  if(q.armor>0)while(q.armor>0)damageQueen(q,3,'egg');else q.open=8;
  const result=damageQueen(q,100,'spray');
  if(phase<2){assert.equal(result,'phase');phases++;assert.equal(q.mode,'intermission');const hp=q.hp;
   assert.equal(damageQueen(q,999,'egg'),'ignored');assert.equal(q.hp,hp);tick(q,6.1);assert.equal(q.mode,'idle');
  }else assert.equal(result,'won');
 }
 assert.equal(phases,2);assert.equal(q.mode,'dead');assert.equal(queenProgress(q),0);assert.equal(damageQueen(q,100,'egg'),'ignored');
});
test('final phase only takes damage during recovery or a foam interruption',()=>{
 const q=awake();q.phase=2;q.hp=36;q.armor=0;
 assert.equal(damageQueen(q,3,'egg'),'armored');assert.equal(damageQueen(q,1,'foam'),'foamed');
 assert.equal(q.open,3);assert.equal(damageQueen(q,3,'egg'),'hit');assert.equal(q.hp,33);
 tick(q,3.1,{...p,x:20});assert.equal(damageQueen(q,3,'egg'),'armored');
});
test('slam target locks during its generous warning; walking out or jumping avoids damage',()=>{
 for(const [escape,expectHit] of [[p,true],[{...p,x:5},false],[{...p,y:1.5},false]]){
  const q=awake();tick(q,3.1);assert.equal(q.mode,'warn');assert.equal(q.attack,'slam');assert.deepEqual(q.target,{x:p.x,z:p.z});
  const events=tick(q,1.9,escape);assert.equal(events.includes('hurt'),expectHit);assert.equal(q.mode,'recover');
  assert.equal(tick(q,1,escape).includes('hurt'),false);
 }
});
test('charge has a locked lane, swept collision, and an eight-second final-phase damage window',()=>{
 const q=awake();q.phase=2;q.armor=0;q.timer=.01;
 stepQueen(q,.02,p);assert.equal(q.mode,'warn');assert.equal(q.attack,'charge');
 const target={...q.target};tick(q,2.02,{...p,x:10});assert.deepEqual(q.target,target);assert.equal(q.mode,'charge');
 const events=tick(q,1.4,{x:0,y:0,z:2});assert.equal(events.filter(e=>e==='hurt').length,1);
 assert.equal(q.mode,'recover');assert.ok(q.open>7.8);assert.match(queenHint(q),/EXPOSED/);
});
test('foam cancels a warned attack but cannot permanently lock the queen',()=>{
 const q=awake();tick(q,3.1);assert.equal(q.mode,'warn');assert.equal(damageQueen(q,1,'foam'),'foamed');
 assert.equal(q.target,null);assert.equal(q.mode,'recover');assert.equal(damageQueen(q,1,'foam'),'resistant');
 assert.equal(tick(q,3.1).includes('hurt'),false);assert.equal(q.foam,0);
 tick(q,7.1,{...p,x:20});assert.equal(damageQueen(q,1,'foam'),'foamed');
});
test('spray can finish a whole exposed health segment before armor returns',()=>{
 for(let phase=0;phase<2;phase++){
  const q=awake();q.phase=phase;q.hp=QUEEN_PHASES[phase].health;q.armor=0;q.open=QUEEN_PHASES[phase].opening;
  let result;
  for(let i=0;i<100&&q.phase===phase;i++){result=damageQueen(q,.38,'spray');stepQueen(q,.09,{...p,x:20});}
  assert.equal(result,'phase');assert.equal(q.phase,phase+1);
 }
});

test('queen roams in every combat phase and turns without snapping',()=>{
 for(let phase=0;phase<3;phase++){
  const q=awake();q.phase=phase;q.timer=100;const start={x:q.x,z:q.z};let previous=q.yaw;
  for(let i=0;i<100;i++){stepQueen(q,.02,{x:10,y:0,z:0});assert.ok(Math.abs(q.yaw-previous)<=2.2*.02+1e-8);previous=q.yaw;}
  assert.ok(Math.hypot(q.x-start.x,q.z-start.z)>1.5,'phase '+phase+' moves');
 }
});
test('hits stagger briefly, sustained fire cannot pin her, and phase changes do not teleport',()=>{
 const q=awake();q.timer=100;q.armor=0;q.open=12;
 damageQueen(q,.1,'spray');const start={x:q.x,z:q.z};
 for(let i=0;i<50;i++){damageQueen(q,.1,'spray');stepQueen(q,.02,p);}
 assert.deepEqual({x:q.x,z:q.z},start);assert.ok(q.stagger<.36);
 tick(q,1.5);assert.ok(Math.hypot(q.x-start.x,q.z-start.z)>.5);
 const before={x:q.x,z:q.z};assert.equal(damageQueen(q,100,'spray'),'phase');assert.deepEqual({x:q.x,z:q.z},before);
});
test('repair stops need nearby workers and end when bait pulls them away',()=>{
 const q=awake();q.armor=3;q.timer=100;
 tick(q,.5,p,0);assert.equal(q.mode,'idle');assert.equal(q.armor,3);
 stepQueen(q,.02,p,2);assert.equal(q.mode,'repair');const start={x:q.x,z:q.z};
 tick(q,1,p,2);assert.deepEqual({x:q.x,z:q.z},start);assert.ok(q.armor>3);
 stepQueen(q,.02,p,0);assert.equal(q.mode,'idle');const armor=q.armor;tick(q,.6,p,0);assert.equal(q.armor,armor);assert.ok(Math.hypot(q.x-start.x,q.z-start.z)>.1);
});
test('queen resumes pursuit after a brief recovery while final-phase opening stays active',()=>{
 const q=awake();q.phase=2;q.armor=0;q.mode='recover';q.timer=1.5;q.open=8;
 const start={x:q.x,z:q.z};tick(q,2.1);assert.equal(q.mode,'idle');assert.ok(q.open>5.8);assert.ok(Math.hypot(q.x-start.x,q.z-start.z)>.3);
});
test('charge accelerates and brakes, lands at its target, and stays inside the arena',()=>{
 const q=awake();q.mode='charge';q.from={x:0,z:-3};q.target={x:0,z:10};q.timer=1.35;
 const distances=[];let old=q.z;
 for(let i=0;i<27;i++){stepQueen(q,.05,{x:20,y:0,z:20});distances.push(q.z-old);old=q.z;}
 assert.ok(distances[0]<distances[13]/4);assert.ok(distances[26]<distances[13]/4);assert.equal(q.z,10);
 tick(q,120,{x:30,y:0,z:30});assert.ok(q.x<=12&&q.x>=-12&&q.z<=12&&q.z>=-7);
});

test('moving during final-phase vulnerability does not chain into permanent exposure',()=>{
 const q=awake();q.phase=2;q.armor=0;q.mode='recover';q.timer=1.5;q.open=8;
 tick(q,7.8,{x:20,y:0,z:20});assert.equal(q.mode,'idle');assert.ok(q.open>0);
 tick(q,.4,{x:20,y:0,z:20});assert.equal(q.open,0);assert.equal(q.mode,'warn');assert.equal(damageQueen(q,3,'egg'),'armored');
});
