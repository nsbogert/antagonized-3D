import test from 'node:test';
import assert from 'node:assert/strict';
import {VICTORY_DURATION,CROWN_ON,DANCE_START,victoryBeat,crownDrop,crownRoll,crownCoronation,victoryCaption} from './victory-core.mjs';
test('victory tells every story beat before revealing the ending',()=>{
 assert.deepEqual([0,4,7,10.5,13.5,15.5,17,VICTORY_DURATION].map(t=>victoryBeat(t).stage),['fall','scatter','approach','pickup','crown','ready','celebrate','complete']);
 assert.equal(victoryBeat(VICTORY_DURATION-.01).done,false);assert.equal(victoryBeat(VICTORY_DURATION).done,true);
 for(const t of [0,4,7,10.5,13.5,15.5,17,VICTORY_DURATION])assert.ok(victoryCaption(victoryBeat(t).stage));
});
test('crown starts on the queen and finishes at a stable reachable floor position',()=>{
 const start={x:4,y:4,z:-2},end={x:1,y:.25,z:4};assert.deepEqual(crownDrop(0,start,end),start);
 assert.deepEqual(crownDrop(5,start,end),end);assert.deepEqual(crownDrop(100,start,end),end);
 for(let t=0;t<5;t+=.02){const p=crownDrop(t,start,end);assert.ok(p.y>=end.y);for(const value of Object.values(p))assert.ok(Number.isFinite(value));}
});
test('pickup and crown placement finish before the celebration',()=>{
 assert.ok(victoryBeat(10).bend<1e-8);assert.ok(Math.abs(victoryBeat(13).bend)<1e-8);
 assert.equal(victoryBeat(CROWN_ON).crown,1);assert.equal(victoryBeat(DANCE_START).cheer,0);assert.equal(victoryBeat(DANCE_START+1).cheer,1);
});

test('small crown waits on the ground, rises clear, crosses above Marin, then settles',()=>{
 const ground={x:-3,y:.25,z:5},head={x:-3,y:3,z:7.6},size=.115;
 const at=t=>crownCoronation(t,ground,head,size);
 assert.equal(at(10).scale,size);assert.equal(at(10.5).y,.25);
 assert.ok(Math.abs(at(11).scale-size)<1e-9);assert.equal(at(11).y,.25);
 assert.equal(at(11.5).z,ground.z);assert.ok(at(12).y>head.y+.6);
 assert.equal(at(13).z,head.z);assert.ok(at(13).y>head.y+.6);
 assert.ok(Math.abs(at(14).y-head.y)<1e-9);
 for(const boundary of [10,11,12,13,14]){
  const a=at(boundary-.00001),b=at(boundary+.00001);
  for(const key of ['x','y','z','scale'])assert.ok(Math.abs(a[key]-b[key])<.0001,'continuous '+key+' at '+boundary);
 }
});

test('rolling crown shrinks smoothly, stays above ground, and comes to rest at the feet',()=>{
 const start={x:0,y:1.44,z:3.5},end={x:0,y:.1833,z:6.85};
 let prior=crownRoll(3.4,start,end,.115);
 assert.equal(prior.scale,1);assert.equal(prior.angle,0);
 for(let t=3.42;t<=9.4;t+=.02){
  const p=crownRoll(t,start,end,.115);
  assert.ok(p.scale<=prior.scale);assert.ok(p.z>=prior.z);
  assert.ok(p.y>=.02);assert.ok(Math.abs(p.y-prior.y)<.1,'roll stays continuous');
  prior=p;
 }
 const stopped=crownRoll(10,start,end,.115);
 assert.ok(Math.abs(stopped.y-end.y)<1e-8);assert.equal(stopped.z,end.z);
 assert.ok(Math.abs(stopped.scale-.115)<1e-8);
 assert.deepEqual(crownRoll(100,start,end,.115),stopped);
});

test('imported crown retains its queen size until it begins rolling',()=>{
 const start={x:0,y:.02+1.42*.6,z:3.5},end={x:0,y:.1833,z:6.85};
 const first=crownRoll(3.4,start,end,.115,.6),last=crownRoll(9.4,start,end,.115,.6);
 assert.equal(first.scale,.6);assert.equal(first.y,start.y);
 assert.ok(Math.abs(last.scale-.115)<1e-8);assert.ok(Math.abs(last.y-end.y)<1e-8);
});
