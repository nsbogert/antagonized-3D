import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHASE_DISTANCE,chaseCamera,directionFor,crosshairPoint,rayBoxDistance} from './camera-core.mjs';
test('third-person camera stays behind Marin, turns with look, and follows vertical movement',()=>{
 const p={x:0,y:0,z:10},r={x:.08,y:Math.PI};const pose=chaseCamera(p,r,[],{snap:true});
 assert.ok(Math.abs(pose.z-p.z-CHASE_DISTANCE*Math.cos(r.x))<.01);assert.ok(pose.y>1.2);assert.equal(pose.visibility,1);
 const side=chaseCamera(p,{x:0,y:Math.PI/2},[],{snap:true});assert.ok(Math.abs(side.x-p.x+CHASE_DISTANCE)<.01);
 const jump=chaseCamera({...p,y:3},r,[],{snap:true});assert.ok(Math.abs(jump.y-pose.y-3)<1e-6);
 const ride=chaseCamera(p,r,[],{snap:true,riding:true});assert.ok(ride.y>pose.y+.7);
});
test('camera pulls in before walls and corners, then eases outward without passing through them',()=>{
 const p={x:0,y:0,z:0},r={x:0,y:0},wall={x:-5,z:-3,w:10,d:.5,bottom:0,top:6};
 const blocked=chaseCamera(p,r,[wall],{previousDistance:CHASE_DISTANCE,dt:.02});assert.ok(blocked.z>-2.3);assert.ok(blocked.distance<2.4);
 const freed=chaseCamera(p,r,[],{previousDistance:blocked.distance,dt:.02});assert.ok(freed.distance>blocked.distance&&freed.distance<CHASE_DISTANCE);
 const near=chaseCamera(p,r,[{...wall,z:-.6}],{snap:true});assert.ok(near.visibility<1,'tight corners fade Marin instead of obscuring the view');
});
test('third-person crosshair aims at the closest enemy or wall from the camera',()=>{
 const origin={x:0,y:1,z:0},dir=directionFor({x:0,y:0});
 const enemy={x:0,y:1,z:10,radius:1};assert.equal(crosshairPoint(origin,dir,[],[enemy]).z,9);
 const wall={x:-2,z:5,w:4,d:1,bottom:0,top:3};assert.equal(crosshairPoint(origin,dir,[wall],[enemy]).z,5);
 assert.equal(rayBoxDistance(origin,{x:1,y:0,z:0},wall,50),null);
 assert.equal(crosshairPoint(origin,dir,[],[]).z,60);
});
