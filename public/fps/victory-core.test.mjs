import test from 'node:test';
import assert from 'node:assert/strict';
import {VICTORY_DURATION,victoryBeat,crownDrop,victoryCaption} from './victory-core.mjs';
test('victory tells every story beat before revealing the ending',()=>{
 assert.deepEqual([0,4,7,10.5,12.5,15,18].map(t=>victoryBeat(t).stage),['fall','scatter','approach','pickup','crown','celebrate','complete']);
 assert.equal(victoryBeat(VICTORY_DURATION-.01).done,false);assert.equal(victoryBeat(VICTORY_DURATION).done,true);
 for(const t of [0,4,7,10.5,12.5,15,18])assert.ok(victoryCaption(victoryBeat(t).stage));
});
test('crown starts on the queen and finishes at a stable reachable floor position',()=>{
 const start={x:4,y:4,z:-2},end={x:1,y:.25,z:4};assert.deepEqual(crownDrop(0,start,end),start);
 assert.deepEqual(crownDrop(5,start,end),end);assert.deepEqual(crownDrop(100,start,end),end);
 for(let t=0;t<5;t+=.02){const p=crownDrop(t,start,end);assert.ok(p.y>=end.y);for(const value of Object.values(p))assert.ok(Number.isFinite(value));}
});
test('poses are continuous at the pickup and coronation boundaries',()=>{
 assert.ok(victoryBeat(10).bend<1e-8);assert.ok(Math.abs(victoryBeat(12).bend)<1e-8);
 assert.equal(victoryBeat(14).crown,1);assert.equal(victoryBeat(14).cheer,0);assert.equal(victoryBeat(16).cheer,1);
});
