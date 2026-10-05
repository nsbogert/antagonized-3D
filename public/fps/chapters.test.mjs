import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,chapterNumber,chapterLoadout,nearLevelPoint,workerSpawns,WORKER_SOURCE_INTERVAL,advanceWorkerSource,workerEmergencePoint} from './chapters.mjs';
import {objectiveFor,cacheIsClear} from './core.mjs';
import {buildKitchen} from './kitchen.mjs';
import {buildBathroom} from './bathroom.mjs';
import {buildWalls} from './walls.mjs';
import {buildRoyal} from './royal.mjs';

test('chapter selection falls back safely and kitchen carries only earned equipment',()=>{
  assert.equal(chapterNumber('2'),2);assert.equal(chapterNumber('99'),1);
  const loadout=chapterLoadout(2,{gear:true,cannon:false,mist:false,ammo:5});
  assert.equal(loadout.ammo,1);assert.equal(loadout.cannon,false);
  assert.equal(loadout.weapon,1);assert.equal(loadout.tank,100);
  assert.equal(Object.hasOwn(chapterLoadout(2,{gear:false,cannon:false,mist:true}),'mist'),false);
  assert.equal(chapterLoadout(1,{gear:true,cannon:true}).gear,false);
  assert.equal(chapterLoadout(2).ammo,3);
});
test('kitchen objectives lead from food to elevated trail to bathroom door',()=>{
  assert.equal(objectiveFor({chapter:2,secured:2,clue:false}).stage,1);
  assert.match(objectiveFor({chapter:2,secured:3,clue:false}).detail,/sink counter/);
  assert.match(objectiveFor({chapter:2,secured:3,clue:true}).detail,/bathroom door/);
  assert.match(objectiveFor({chapter:1,secured:3,clue:false}).detail,/ivy planter/);
  assert.equal(nearLevelPoint({x:16,y:1.99,z:-5},{x:16,y:3.05,z:-5}),false);
  assert.ok(nearLevelPoint({x:16,y:3.05,z:-5},{x:16,y:3.05,z:-5}));
});
test('upstairs ants cannot guard a cache on another floor',()=>{
  const worker={type:'worker',state:'alive',x:0,y:3.05,z:0};
  assert.ok(cacheIsClear({x:0,y:0,z:0},[worker]));
});
// Geometry contract: verify reachable objectives against the actual kitchen builder.
function kitchenLayout(builder=buildKitchen){
  const solids=[];const node=()=>({position:{set(){}},rotation:{},scaling:{set(){}},setEnabled(){}});
  class TransformNode{constructor(){Object.assign(this,node());}}
  class Mesh{constructor(){Object.assign(this,node());}}
  class VertexData{static ComputeNormals(){}applyToMesh(){}}
  const B={TransformNode,Mesh,VertexData,Texture:class{},Color3:class{},MeshBuilder:{CreateTube:node,CreateLathe:node,CreateTorus:node,CreatePlane:node}};
  const M=new Proxy({}, {get:()=>({})});
  const result=builder({B,scene:{},V:(x,y,z)=>({x,y,z}),M,surface:material=>material,mat:()=>({}),box:node,ball:node,cyl:node,rod:node,
    solid:(x,y,z,w,h,d)=>{solids.push({x:x-w/2,z:z-d/2,w,d,top:y+h,bottom:y});return node();},
    sign:node,makeMarker:()=>({el:{hidden:false}})});
  return {...result,solids};
}
test('kitchen spawn, food, supply cart and bathroom door are on accessible floor',()=>{
  const world=kitchenLayout(),level=CHAPTERS[2];
  const blocked=p=>world.solids.some(c=>p.x>c.x-.35&&p.x<c.x+c.w+.35&&p.z>c.z-.35&&p.z<c.z+c.d+.35&&c.bottom<1.6&&c.top>.1);
  for(const point of [level.spawn,level.exit,world.bench,...world.caches])assert.equal(blocked(point),false,JSON.stringify(point));
  assert.deepEqual(world.caches.map(c=>c.name),['CEREAL','KIBBLE','RECYCLING']);
  // Flood-fill the floor to catch objectives stranded behind furniture.
  const queue=[{x:0,z:18}],seen=new Set(['0,18']);
  for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:queue[i].x+dx,z:queue[i].z+dz};const key=`${p.x},${p.z}`;
    if(p.x<-23||p.x>23||p.z<-12||p.z>23||seen.has(key)||blocked(p))continue;
    seen.add(key);queue.push(p);
  }
  for(const point of [level.exit,world.bench,...world.caches])assert.ok(queue.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<1.5),'Floor route to '+JSON.stringify(point));
});
test('sink clue has a solid climbable counter and is outside the floor interaction height',()=>{
  const world=kitchenLayout(),c=world.clue;
  assert.ok(world.solids.some(s=>c.x>s.x&&c.x<s.x+s.w&&c.z>s.z&&c.z<s.z+s.d&&Math.abs(s.top-c.y)<.001&&s.top<=3.5));
  assert.equal(nearLevelPoint({...c,y:0},c),false);
});


test('chapter chain inserts bathroom between kitchen and walls',()=>{
  assert.equal(chapterNumber('3'),3);assert.equal(CHAPTERS[1].next,2);assert.equal(CHAPTERS[2].next,3);assert.equal(CHAPTERS[3].next,4);assert.equal(CHAPTERS[4].next,5);assert.equal(CHAPTERS[5].next,null);
  assert.notEqual(CHAPTERS[2].loadoutKey,CHAPTERS[4].loadoutKey);
  const gear=chapterLoadout(4,{gear:true,cannon:true,mist:false,ammo:2});
  assert.equal(gear.ammo,2);assert.equal(gear.cannon,true);assert.equal(gear.tank,100);
  assert.match(objectiveFor({chapter:4,secured:2,clue:false}).title,/colony/);
  assert.match(objectiveFor({chapter:4,secured:3,clue:false}).detail,/signal mound/);
  assert.match(objectiveFor({chapter:4,secured:3,clue:true}).detail,/queen/);
});

test('wall tunnels connect every store, supplies, gate and mounted climbing approach',()=>{
  const world=kitchenLayout(buildWalls),level=CHAPTERS[4];
  const blocked=p=>world.solids.some(c=>p.x>c.x-.75&&p.x<c.x+c.w+.75&&p.z>c.z-.75&&p.z<c.z+c.d+.75&&c.bottom<2&&c.top>.22);
  const destinations=[...world.caches,world.bench,level.exit,{x:10,z:-7}];
  for(const p of [level.spawn,...destinations])assert.equal(blocked(p),false,JSON.stringify(p));
  const queue=[level.spawn],seen=new Set([`${level.spawn.x},${level.spawn.z}`]);
  for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;
    if(p.x<-23||p.x>23||p.z<-12||p.z>23||seen.has(key)||blocked(p))continue;
    seen.add(key);queue.push(p);
  }
  for(const p of destinations)assert.ok(queue.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<1.1),'Mounted route to '+JSON.stringify(p));
  assert.deepEqual(world.caches.map(c=>c.name),['SEED VAULT','SUGAR STORE','FUNGUS FARM']);
  const c=world.clue;
  assert.ok(world.solids.some(s=>c.x>s.x&&c.x<s.x+s.w&&c.z>s.z&&c.z<s.z+s.d&&Math.abs(s.top-c.y)<.001&&s.top<=3.5));
  assert.equal(nearLevelPoint({...c,y:1.99},c),false);
});

test('mixed ammo survives chapter transfer without reusing the saved queue',()=>{
  const saved={gear:true,cannon:true,ammo:3,ammoKinds:['egg','carcass','egg']};
  const loadout=chapterLoadout(4,saved);assert.deepEqual(loadout.ammoKinds,saved.ammoKinds);
  loadout.ammoKinds.shift();assert.equal(saved.ammoKinds.length,3);
  assert.deepEqual(chapterLoadout(2,{cannon:false,ammo:3,ammoKinds:['egg','egg','egg']}).ammoKinds,['egg']);
  assert.deepEqual(chapterLoadout(4,{cannon:true,ammo:2}).ammoKinds,['carcass','carcass']);
});
test('all colony egg clutches are accessible on foot and outside obstacles',()=>{
  const world=kitchenLayout(buildWalls),start=CHAPTERS[4].spawn;
  assert.equal(world.eggSpawns.length,21);
  const blocked=p=>world.solids.some(c=>p.x>c.x-.35&&p.x<c.x+c.w+.35&&p.z>c.z-.35&&p.z<c.z+c.d+.35&&c.bottom<1.6&&c.top>.1);
  const queue=[start],seen=new Set([`${start.x},${start.z}`]);
  for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;
    if(p.x<-23||p.x>23||p.z<-12||p.z>23||seen.has(key)||blocked(p))continue;
    seen.add(key);queue.push(p);
  }
  for(const egg of world.eggSpawns){assert.equal(blocked(egg),false);assert.ok(queue.some(p=>Math.hypot(p.x-egg.x,p.z-egg.z)<1),'Reachable egg '+JSON.stringify(egg));assert.ok(egg.y>=.02);}
});

test('royal chamber is chapter five with independent carried gear and boss objectives',()=>{
 assert.equal(chapterNumber('5'),5);assert.equal(CHAPTERS[4].next,5);
 assert.notEqual(CHAPTERS[4].loadoutKey,CHAPTERS[5].loadoutKey);
 assert.equal(chapterLoadout(5).cannon,true);
 assert.deepEqual(chapterLoadout(5,{gear:true,cannon:true,mist:true,ammo:1,ammoKinds:['egg']}).ammoKinds,['egg']);
 assert.match(objectiveFor({chapter:5}).title,/queen/);
 assert.match(objectiveFor({chapter:5,queen:{phase:1,mode:'idle'}}).detail,/Soldier/);
});
test('royal arena supplies and all 24 eggs are reachable, with a clear charge corridor',()=>{
 const world=kitchenLayout(buildRoyal),start=CHAPTERS[5].spawn;
 assert.equal(world.eggSpawns.length,24);assert.equal(world.supplyPoints.length,1);
 const blocked=p=>world.solids.some(c=>p.x>c.x-.75&&p.x<c.x+c.w+.75&&p.z>c.z-.75&&p.z<c.z+c.d+.75&&c.bottom<2&&c.top>.22);
 const queue=[start],seen=new Set([`${start.x},${start.z}`]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;
  if(p.x<-23||p.x>23||p.z<-12||p.z>23||seen.has(key)||blocked(p))continue;
  seen.add(key);queue.push(p);
 }
 for(const dest of [...world.eggSpawns,...world.supplyPoints])assert.ok(queue.some(p=>Math.hypot(p.x-dest.x,p.z-dest.z)<1),'Reachable '+JSON.stringify(dest));
 for(let x=-12;x<=12;x++)for(let z=-7;z<=12;z++)assert.equal(blocked({x,z}),false,'Open charge corridor');
});

test('all chapter transfers preserve remaining tank, including an empty tank',()=>{
  for(const chapter of [2,3,4,5]){
    for(const tank of [0,.2,37.5,100])assert.equal(chapterLoadout(chapter,{gear:true,tank}).tank,tank);
    assert.equal(chapterLoadout(chapter,{gear:true,tank:-5}).tank,0);
    assert.equal(chapterLoadout(chapter,{gear:true,tank:200}).tank,100);
    assert.equal(chapterLoadout(chapter,{gear:false,tank:100}).tank,0);
    assert.equal(chapterLoadout(chapter,{gear:true,mist:true}).tank,100,'legacy saves still load');
    assert.equal(Object.hasOwn(chapterLoadout(chapter,{gear:true,mist:true}),'mist'),false);
    assert.equal(chapterLoadout(chapter).tank,100,'direct chapter entry starts loaded');
  }
});

test('bathroom floor routes reach all household gaps, supplies, service hatch and vanity approach',()=>{
  const world=kitchenLayout(buildBathroom),level=CHAPTERS[3];
  assert.equal(level.place,'bathroom');assert.equal(level.next,4);
  assert.deepEqual(world.caches.map(c=>c.name),['CABINET GAP','TOILET TILE GAP','SHOWER TILE CRACK']);
  assert.ok(world.caches.every(c=>c.kind==='gap'));
  const blocked=p=>world.solids.some(c=>p.x>c.x-.75&&p.x<c.x+c.w+.75&&p.z>c.z-.75&&p.z<c.z+c.d+.75&&c.bottom<2&&c.top>.22);
  const destinations=[...world.caches,world.bench,level.exit,{x:12,z:7}];
  const queue=[level.spawn],seen=new Set([`${level.spawn.x},${level.spawn.z}`]);
  for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;
    if(p.x<-23||p.x>23||p.z<-12||p.z>23||seen.has(key)||blocked(p))continue;
    seen.add(key);queue.push(p);
  }
  for(const p of destinations){assert.equal(blocked(p),false,JSON.stringify(p));assert.ok(queue.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<1.1),'Bathroom route to '+JSON.stringify(p));}
  const clue=world.clue;assert.ok(world.solids.some(c=>clue.x>c.x&&clue.x<c.x+c.w&&clue.z>c.z&&clue.z<c.z+c.d&&Math.abs(c.top-clue.y)<.001&&c.top<=3.5));
  assert.equal(nearLevelPoint({...clue,y:0},clue),false,'the vanity trail requires a climb');
});
test('bathroom objectives go from plumbing seals to vanity trail to wall access',()=>{
  assert.match(objectiveFor({chapter:3,secured:1}).detail,/household.*1\/3/);
  assert.match(objectiveFor({chapter:3,secured:3,clue:false}).detail,/vanity/);
  assert.match(objectiveFor({chapter:3,secured:3,clue:true}).detail,/plumbing access/);
  assert.notEqual(CHAPTERS[3].loadoutKey,CHAPTERS[4].loadoutKey);
  assert.equal(chapterNumber('3'),3);assert.equal(chapterNumber('5'),5);
});


test('enemy types debut gradually and later chapters have denser swarms',()=>{
  assert.equal(CHAPTERS[1].workers,60);assert.equal(CHAPTERS[1].soldiers.length,0);assert.equal(CHAPTERS[1].flyers.length,0);
  assert.equal(CHAPTERS[2].soldiers.length,3);assert.equal(CHAPTERS[2].flyers.length,0);
  assert.equal(CHAPTERS[3].flyers.length,6);assert.equal(CHAPTERS[4].workers,36);assert.equal(CHAPTERS[4].flyers.length,8);
  assert.equal(CHAPTERS[5].flyers.length,2);
});
test('larger worker groups start separated and outside household furniture',()=>{
  for(const [chapter,builder] of [[2,buildKitchen],[3,buildBathroom],[4,buildWalls],[5,buildRoyal]]){
    const world=kitchenLayout(builder),spawns=workerSpawns(chapter,world.caches,world.solids);
    assert.equal(spawns.length,CHAPTERS[chapter].workers);
    for(const [i,a] of spawns.entries())for(const b of spawns.slice(i+1))assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>1.05);
  }
});


test('each open source produces every five seconds, stops on sealing, and preserves elapsed time',()=>{
  assert.equal(WORKER_SOURCE_INTERVAL,5);
  const a={secured:false},b={secured:false};
  assert.equal(advanceWorkerSource(a,4.9),0);assert.equal(advanceWorkerSource(b,2),0);
  assert.equal(advanceWorkerSource(a,.2),1);assert.ok(Math.abs(a.workerSpawnTimer-4.9)<1e-8);
  assert.equal(advanceWorkerSource(b,3),1);a.secured=true;
  assert.equal(advanceWorkerSource(a,20),0);assert.equal(advanceWorkerSource(b,15),3);
});
test('source emergence points stay outside furniture and within the room',()=>{
  for(const builder of [buildKitchen,buildBathroom,buildWalls]){
    const world=kitchenLayout(builder);
    for(const c of world.caches)for(let i=0;i<24;i++){
      const p=workerEmergencePoint(c,world.solids,i);assert.ok(p,'site has an open emergence point');
      assert.ok(Math.hypot(p.x-c.x,p.z-c.z)<=3.001,'new worker emerges beside its source');
      assert.ok(!world.solids.some(b=>b.bottom<p.y+.6&&b.top>p.y+.22&&p.x>b.x-.65&&p.x<b.x+b.w+.65&&p.z>b.z-.65&&p.z<b.z+b.d+.65));
    }
  }
});
