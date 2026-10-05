import test from 'node:test';
import assert from 'node:assert/strict';
import {findMountTarget,SupplyVisits,jumpIntent} from './interaction-core.mjs';
const p={x:0,y:0,z:0,grounded:true},soldier={type:'soldier',state:'alive',foam:14,x:1,y:0,z:0};
test('jump deliberately mounts foamed or subdued soldiers, with distance and floor limits',()=>{
 assert.equal(findMountTarget(p,[soldier]),soldier);
 assert.equal(findMountTarget(p,[{...soldier,foam:0}]),null);
 assert.equal(findMountTarget(p,[{...soldier,type:'worker'}]),null);
 assert.equal(findMountTarget(p,[{...soldier,x:4}]),null);
 assert.equal(findMountTarget(p,[{...soldier,y:3}]),null);
 assert.equal(findMountTarget(p,[{...soldier,state:'dead'}]),null);
 const subdued={...soldier,state:'subdued',foam:0,subdued:10};assert.equal(findMountTarget(p,[subdued]),subdued);
 assert.equal(jumpIntent({},p,soldier),'mount');assert.equal(jumpIntent({},p,null),'jump');
 assert.equal(jumpIntent({}, {...p,grounded:false},soldier),'none');
 assert.equal(jumpIntent({ride:soldier},{...p,grounded:false},null),'dismount');
});
test('refill is once per entry, independently for each station and reset on replay',()=>{
 const visits=new SupplyVisits(),a={},b={};
 visits.update([a]);assert.equal(visits.enter(a),true);assert.equal(visits.enter(a),false);
 visits.update([a,b]);assert.equal(visits.enter(a),false);assert.equal(visits.enter(b),true);
 visits.update([b]);assert.equal(visits.enter(b),false);
 visits.update([a]);assert.equal(visits.enter(a),true);
 visits.reset();assert.equal(visits.enter(a),true);
});
