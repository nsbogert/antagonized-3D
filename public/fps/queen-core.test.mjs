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
 stepQueen(q,1,p,2);assert.equal(q.armor,3.3);
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
test('charge has a locked lane, swept collision, and a long final-phase recovery',()=>{
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
