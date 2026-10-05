import test from 'node:test';
import assert from 'node:assert/strict';
import {canStomp,segmentHitsSphere,damageAnt,collectWorker,cacheIsClear,objectiveFor,stompTarget,SPRAY,consumeTank,collectGear,canAutoCollect,surfaceHeightAt,applyFoam,foamMovementScale,SOLDIER_FOAM_SECONDS} from './core.mjs';

test('direct hits and patch contact give soldiers the same extended subduing window',()=>{
  for(const coat of [a=>damageAnt(a,1,'foam'),applyFoam]){
    const a={type:'soldier',state:'alive',foam:0,hp:10};
    assert.equal(coat(a),'foamed');assert.equal(a.foam,14);
    a.foam-=8;
    assert.equal(damageAnt(a,3,'carcass'),'subdued');assert.equal(a.subdued,22);
  }
});
test('reapplying foam refreshes time and cannot shorten an existing coating',()=>{
  const a={type:'soldier',state:'alive',foam:2};
  applyFoam(a);assert.equal(a.foam,SOLDIER_FOAM_SECONDS);
  a.foam=20;damageAnt(a,1,'foam');assert.equal(a.foam,20);
  a.state='subdued';a.subdued=10;assert.equal(applyFoam(a),'ignored');assert.equal(a.subdued,10);
});
test('soldiers are immobilized by foam, then recover armor when it expires',()=>{
  const a={type:'soldier',state:'alive',foam:0,hp:10};
  applyFoam(a);assert.equal(foamMovementScale(a),0);
  a.foam=0;assert.equal(foamMovementScale(a),1);assert.equal(damageAnt(a,4,'stomp'),'armored');
});
test('workers and flyers retain their shorter slowing effect',()=>{
  for(const type of ['worker','flyer']){
    const a={type,state:'alive',foam:0};applyFoam(a);assert.equal(a.foam,7);assert.equal(foamMovementScale(a),.18);
  }
});

test('walking over carcasses automatically fills the cannon through its three-ant capacity',()=>{
  const s={weapon:0,cannon:true,ammo:0,ride:null},p={x:0,y:.8,z:0};
  const a={type:'worker',state:'dead',x:1.2,y:0,z:0};
  for(let i=0;i<3;i++){assert.ok(canAutoCollect(s,p,a));assert.ok(collectWorker(s));}
  assert.equal(s.ammo,3);assert.equal(canAutoCollect(s,p,a),false);
  s.ammo=0;s.weapon=1;assert.equal(canAutoCollect(s,p,a),false);
});

test('dead ants settle on stones, paving and platforms, without jumping onto overhead tables',()=>{
  const surfaces=[{x:-10,z:-10,w:20,d:20,top:.035},{x:0,z:0,rx:1.2,rz:.75,top:.105},
    {x:3,z:3,w:2,d:2,top:3.05},{x:-1,z:-1,w:2,d:2,top:1.9}];
  assert.equal(surfaceHeightAt({x:0,y:0,z:0},surfaces),.105);
  assert.equal(surfaceHeightAt({x:2,y:0,z:0},surfaces),.035);
  assert.equal(surfaceHeightAt({x:4,y:3.05,z:4},surfaces),3.05);
  assert.equal(surfaceHeightAt({x:4,y:0,z:4},surfaces),.035);
  assert.equal(surfaceHeightAt({x:12,y:0,z:0},surfaces),0);
});

test('nearby ammo loads only in throw/cannon mode and respects capacity, height, and mount',()=>{
  const s={weapon:0,ammo:0,cannon:false,ride:null},p={x:0,y:0,z:0};
  const a={type:'worker',state:'dead',x:1.2,y:0,z:0};
  assert.ok(canAutoCollect(s,p,a));
  for(const weapon of [1,2])assert.equal(canAutoCollect({...s,weapon},p,a),false);
  assert.equal(canAutoCollect({...s,ammo:1},p,a),false);
  assert.ok(canAutoCollect({...s,cannon:true,ammo:2},p,a));
  assert.equal(canAutoCollect({...s,cannon:true,ammo:3},p,a),false);
  assert.equal(canAutoCollect({...s,ride:{}},p,a),false);
  assert.equal(canAutoCollect(s,{...p,y:3},a),false);
  assert.equal(canAutoCollect(s,p,{...a,x:4}),false);
  assert.equal(canAutoCollect(s,p,{...a,state:'alive'}),false);
  assert.equal(canAutoCollect(s,p,{...a,type:'flyer'}),false);
});

test('forgiving stomp catches the edge but not a distant ant or a walk-through',()=>{
  const ant={type:'worker',state:'alive',x:0,y:0,z:0};
  assert.ok(canStomp(.8,.3,-4,{x:1.6,z:0},ant));
  assert.equal(canStomp(.8,.3,-4,{x:1.8,z:0},ant),false);
  assert.equal(canStomp(0,-.01,-1,{x:0,z:0},ant),false);
});
test('jump assistance prefers nearby workers and prepared soldiers, not flyers or armor',()=>{
  const p={x:0,y:0,z:0},worker={x:0,y:0,z:3,type:'worker',state:'alive'};
  const soldier={...worker,z:1,type:'soldier',foam:0};
  assert.equal(stompTarget(p,[soldier,worker],0),worker);
  assert.equal(stompTarget(p,[{...worker,type:'flyer'},soldier],0),null);
  assert.equal(stompTarget(p,[{...worker,z:-2}],0),null);
  assert.equal(stompTarget(p,[{...worker,y:3}],0),null);
  soldier.foam=5;assert.equal(stompTarget(p,[worker,soldier],0),soldier);
});
test('kit pickup is loaded, while station refills preserve the selected tool',()=>{
  const s={gear:false,tank:0,weapon:0};
  assert.equal(consumeTank(s,SPRAY.cost),false);assert.equal(s.tank,0);
  assert.equal(collectGear(s),true);assert.equal(s.tank,100);assert.equal(s.weapon,1);
  s.weapon=2;s.tank=10;assert.equal(collectGear(s),false);
  assert.equal(s.tank,100);assert.equal(s.weapon,2);
});
test('shared fuel cannot overspend; insufficient foam still leaves spray available',()=>{
  const s={gear:true,tank:4};
  assert.equal(consumeTank(s,8),false);assert.equal(s.tank,4);
  assert.ok(consumeTank(s,SPRAY.cost));assert.equal(s.tank,3.3);
  s.tank=.2;assert.equal(consumeTank(s,SPRAY.cost),false);assert.equal(s.tank,.2);
  s.tank=8;assert.ok(consumeTank(s,8));assert.equal(s.tank,0);
  assert.equal(consumeTank(s,SPRAY.cost),false);assert.equal(s.tank,0);
});
test('spray defeats workers in three pulses, flyers in six, while soldier armor remains',()=>{
  for(const [type,hp,count] of [['worker',1,3],['flyer',2,6]]){
    const a={type,hp,state:'alive'};for(let i=0;i<count;i++)damageAnt(a,SPRAY.damage,'spray');
    assert.equal(a.state,'dead');assert.ok(count*SPRAY.interval<.6);
  }
  const a={type:'soldier',hp:10,state:'alive',foam:0};
  assert.equal(damageAnt(a,SPRAY.damage,'spray'),'armored');assert.equal(a.hp,10);
});

test('stomps require a downward crossing and horizontal overlap',()=>{
  const a={type:'worker',x:0,y:0,z:0,state:'alive'};
  assert.equal(canStomp(.8,.4,-5,{x:.3,z:0},a),true);
  assert.equal(canStomp(.8,.4,5,{x:.3,z:0},a),false);
  assert.equal(canStomp(.2,.1,-5,{x:.3,z:0},a),false);
  assert.equal(canStomp(.8,.4,-5,{x:2,z:0},a),false);
  assert.equal(canStomp(.8,.4,-5,{x:0,z:0},{...a,state:'dead'}),false);
});
test('fast carcasses cannot tunnel through flyers between frames',()=>{
  assert.equal(segmentHitsSphere({x:0,y:3,z:0},{x:0,y:3,z:10},{x:0,y:3,z:5},.8),true);
  assert.equal(segmentHitsSphere({x:0,y:3,z:0},{x:0,y:3,z:10},{x:2,y:3,z:5},.8),false);
});
test('soldier is armored until foamed, then a carcass subdues it instead of killing',()=>{
  const a={type:'soldier',state:'alive',foam:0,hp:10};
  assert.equal(damageAnt(a,100,'carcass'),'armored');
  assert.equal(a.state,'alive');
  assert.equal(damageAnt(a,1,'foam'),'foamed');
  assert.equal(damageAnt(a,1,'carcass'),'subdued');
  assert.equal(a.state,'subdued');
  assert.equal(damageAnt(a,100,'spray'),'ignored');
});
test('one worker in hand, exactly three with the cannon',()=>{
  const s={ammo:0,cannon:false};assert.equal(collectWorker(s),true);assert.equal(collectWorker(s),false);
  s.cannon=true;assert.equal(collectWorker(s),true);assert.equal(collectWorker(s),true);assert.equal(collectWorker(s),false);assert.equal(s.ammo,3);
});
test('food caches can be secured when workers have left or been defeated',()=>{
  const c={x:0,z:0};assert.equal(cacheIsClear(c,[{type:'worker',state:'alive',x:1,z:0}]),false);
  assert.equal(cacheIsClear(c,[{type:'worker',state:'alive',x:5,z:0}]),true);
  assert.equal(cacheIsClear(c,[{type:'worker',state:'dead',x:1,z:0}]),true);
});
test('mission requires all caches and the elevated clue before the final door',()=>{
  assert.equal(objectiveFor({secured:2,clue:false}).stage,1);
  assert.equal(objectiveFor({secured:3,clue:false}).stage,2);
  assert.equal(objectiveFor({secured:3,clue:true}).stage,3);
});

test('carcasses require walking over them, not collecting from a distance or another floor',()=>{
  const p={x:0,y:0,z:0},ant={type:'worker',state:'dead',x:2,y:0,z:0};
  for(const cannon of [false,true]){
    const s={weapon:0,ammo:0,ride:null,cannon};
    assert.equal(canAutoCollect(s,p,ant),false);
    assert.ok(canAutoCollect(s,p,{...ant,x:1}));
    assert.equal(canAutoCollect(s,p,{...ant,x:1,y:1.5}),false);
  }
});

const {collectAmmo,consumeAmmo,ammoKinds}=await import('./core.mjs');
test('eggs and carcasses share capacity and fire in pickup order',()=>{
  const s={ammo:0,cannon:true};
  assert.ok(collectAmmo(s,'egg'));assert.ok(collectWorker(s));assert.ok(collectAmmo(s,'egg'));
  assert.equal(collectWorker(s),false);assert.deepEqual(ammoKinds(s),['egg','carcass','egg']);
  assert.equal(consumeAmmo(s),'egg');assert.equal(s.ammo,2);
  assert.ok(collectWorker(s));
  assert.deepEqual([consumeAmmo(s),consumeAmmo(s),consumeAmmo(s)],['carcass','egg','carcass']);
  assert.equal(s.ammo,0);assert.equal(consumeAmmo(s),null);
  const hand={ammo:0,cannon:false};assert.ok(collectAmmo(hand,'egg'));assert.equal(collectWorker(hand),false);
});
test('old ammo counts stay usable and eggs require an available walk-over pickup',()=>{
  const s={ammo:2,cannon:true,weapon:0},p={x:0,y:0,z:0},egg={type:'egg',state:'available',x:1,y:.12,z:0};
  assert.equal(consumeAmmo(s),'carcass');assert.deepEqual(ammoKinds(s),['carcass']);
  assert.ok(canAutoCollect(s,p,egg));
  assert.equal(canAutoCollect(s,p,{...egg,state:'collected'}),false);
  assert.equal(canAutoCollect({...s,weapon:2},p,egg),false);
  assert.equal(canAutoCollect({...s,ride:{}},p,egg),false);
  assert.equal(canAutoCollect({...s,ammo:3},p,egg),false);
  assert.equal(canAutoCollect(s,{...p,y:3},egg),false);
  assert.equal(canAutoCollect(s,p,{...egg,x:4}),false);
});
test('eggs defeat workers and flyers but only subdue a soldier after foam',()=>{
  for(const type of ['worker','flyer'])assert.equal(damageAnt({type,state:'alive',hp:2},3,'egg'),'killed');
  const soldier={type:'soldier',state:'alive',hp:10,foam:0};
  assert.equal(damageAnt(soldier,3,'egg'),'armored');applyFoam(soldier);
  assert.equal(damageAnt(soldier,3,'egg'),'subdued');assert.equal(soldier.subdued,22);
});
