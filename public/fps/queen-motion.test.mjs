import test from 'node:test';
import assert from 'node:assert/strict';
import {createQueenMotion,stepQueenMotion} from './queen-motion.mjs';
import {createQueen,stepQueen} from './queen-core.mjs';
test('stationary queen keeps six feet planted while her body breathes',()=>{
 const q=createQueen(),m=createQueenMotion();stepQueenMotion(m,q,.02,0);const feet=m.feet.map(f=>[f.x,f.y,f.z]);
 for(let i=1;i<200;i++)stepQueenMotion(m,q,.02,i*.02);
 assert.deepEqual(m.feet.map(f=>[f.x,f.y,f.z]),feet);assert.ok(Math.abs(m.height)>.001);
});
test('walking and turning alternate three-leg support with no underground feet or invalid joints',()=>{
 const q=createQueen(),m=createQueenMotion();q.mode='idle';q.timer=100;
 stepQueenMotion(m,q,.02,0);let steps=0;
 for(let i=0;i<800;i++){
  const planted=m.feet.filter(f=>f.progress===1).map(f=>({f,x:f.x,z:f.z}));
  stepQueen(q,.02,{x:Math.sin(i*.005)*10,y:0,z:8});stepQueenMotion(m,q,.02,i*.02);
  const airborne=m.feet.filter(f=>f.progress<1);assert.ok(airborne.length<=3);
  if(airborne.length){assert.equal(new Set(airborne.map(f=>f.group)).size,1);steps++;}
  for(const {f,x,z} of planted)if(f.progress===1){assert.equal(f.x,x);assert.equal(f.z,z);}
  for(const f of m.feet){assert.ok(f.y>=.079);for(const part of [f.hip,f.knee,f.ankle])for(const n of Object.values(part))assert.ok(Number.isFinite(n));}
 }
 assert.ok(steps>100,'feet actually step');
});
test('pausing freezes the rig and restarting creates a fresh stance',()=>{
 const q=createQueen(),m=createQueenMotion();q.mode='idle';q.timer=100;
 for(let i=0;i<30;i++){stepQueen(q,.02,{x:8,y:0,z:10});stepQueenMotion(m,q,.02,i*.02);}
 const before=JSON.stringify(m);for(let i=0;i<30;i++)stepQueenMotion(m,q,0,.58);assert.equal(JSON.stringify(m),before);
 const fresh=createQueenMotion();stepQueenMotion(fresh,createQueen(),.02,0);assert.ok(fresh.feet.every(f=>f.progress===1));
});
test('a full-arena charge keeps each leg within its joint reach at normal and slow frame rates',()=>{
 for(const dt of [.016,.04]){
  const q=createQueen(),m=createQueenMotion();q.mode='charge';q.x=-11;q.z=-7;q.from={x:-11,z:-7};q.target={x:12,z:12};q.timer=1.35;q.yaw=Math.atan2(23,19);
  for(let t=0;t<2;t+=dt){
   stepQueen(q,dt,{x:30,y:0,z:30});stepQueenMotion(m,q,dt,t);
   for(const f of m.feet)assert.ok(Math.hypot(f.hip.x-f.ankle.x,f.hip.y-f.ankle.y,f.hip.z-f.ankle.z)<6,'leg stays within two-bone reach');
  }
 }
});
test('slam raises both forelegs, strikes before the ripple arrives, and can be interrupted',()=>{
 const q=createQueen(),m=createQueenMotion();Object.assign(q,{mode:'warn',attack:'slam',timer:1.8});
 let peak=0;
 for(let t=0;t<1.79;t+=.02){q.timer=1.8-t;stepQueenMotion(m,q,.02,t);for(const f of m.feet.filter(f=>f.i===0))peak=Math.max(peak,f.ankle.y);}
 assert.ok(peak>4,'forelegs clearly raised above her head');
 assert.ok(m.feet.filter(f=>f.i===0).every(f=>f.ankle.y<.2),'feet strike before target damage');
 q.timer=.7;stepQueenMotion(m,q,.02,2);q.mode='recover';q.foam=3;stepQueenMotion(m,q,.02,2.02);
 assert.ok(m.feet.every(f=>f.ankle.y<.2),'interrupt removes the attack pose');
});
