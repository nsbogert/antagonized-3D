import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,chapterNumber,chapterLoadout,nearLevelPoint} from './chapters.mjs';
import {objectiveFor,cacheIsClear,nearestBait} from './core.mjs';
import {buildKitchen} from './kitchen.mjs';
import {buildWalls} from './walls.mjs';
import {buildRoyal} from './royal.mjs';

test('chapter selection falls back safely and kitchen carries only earned equipment',()=>{
  assert.equal(chapterNumber('2'),2);assert.equal(chapterNumber('99'),1);
  const loadout=chapterLoadout(2,{gear:true,cannon:false,mist:false,ammo:5});
  assert.equal(loadout.ammo,1);assert.equal(loadout.cannon,false);assert.equal(loadout.mist,false);
  assert.equal(loadout.weapon,1);assert.equal(loadout.tank,100);
  assert.equal(chapterLoadout(2,{gear:false,cannon:false,mist:true}).mist,false);
  assert.equal(chapterLoadout(1,{gear:true,cannon:true}).gear,false);
  assert.equal(chapterLoadout(2).ammo,3);
});
test('kitchen objectives lead from food to elevated trail to wall breach',()=>{
  assert.equal(objectiveFor({chapter:2,secured:2,clue:false}).stage,1);
  assert.match(objectiveFor({chapter:2,secured:3,clue:false}).detail,/sink counter/);
  assert.match(objectiveFor({chapter:2,secured:3,clue:true}).detail,/wall breach/);
  assert.match(objectiveFor({chapter:1,secured:3,clue:false}).detail,/ivy planter/);
  assert.equal(nearLevelPoint({x:16,y:1.99,z:-5},{x:16,y:3.05,z:-5}),false);
  assert.ok(nearLevelPoint({x:16,y:3.05,z:-5},{x:16,y:3.05,z:-5}));
});
test('upstairs ants and bait cannot block or lure across a floor',()=>{
  const worker={type:'worker',state:'alive',x:0,y:3.05,z:0};
  assert.ok(cacheIsClear({x:0,y:0,z:0},[worker]));
  assert.equal(nearestBait(worker,[{x:1,y:0,z:0,life:10}]),null);
});
// Geometry contract: verify reachable objectives against the actual kitchen builder.
function kitchenLayout(builder=buildKitchen){
  const solids=[];const node=()=>({position:{set(){}},rotation:{},setEnabled(){}});
  class TransformNode{constructor(){Object.assign(this,node());}}
  const B={TransformNode,Color3:class{},MeshBuilder:{CreateTube:node,CreateTorus:node}};
  const M=new Proxy({}, {get:()=>({})});
  const result=builder({B,scene:{},V:(x,y,z)=>({x,y,z}),M,mat:()=>({}),box:node,ball:node,cyl:node,rod:node,
    solid:(x,y,z,w,h,d)=>{solids.push({x:x-w/2,z:z-d/2,w,d,top:y+h,bottom:y});return node();},
    sign:node,makeMarker:()=>({el:{hidden:false}})});
  return {...result,solids};
}
test('kitchen spawn, food, supply cart and wall breach are on accessible floor',()=>{
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


test('chapter chain transfers kitchen gear into a distinct walls save',()=>{
  assert.equal(chapterNumber('3'),3);assert.equal(CHAPTERS[1].next,2);assert.equal(CHAPTERS[2].next,3);assert.equal(CHAPTERS[3].next,4);assert.equal(CHAPTERS[4].next,null);
  assert.notEqual(CHAPTERS[2].loadoutKey,CHAPTERS[3].loadoutKey);
  const gear=chapterLoadout(3,{gear:true,cannon:true,mist:false,ammo:2});
  assert.equal(gear.ammo,2);assert.equal(gear.mist,false);assert.equal(gear.cannon,true);assert.equal(gear.tank,100);
  assert.match(objectiveFor({chapter:3,secured:2,clue:false}).title,/colony/);
  assert.match(objectiveFor({chapter:3,secured:3,clue:false}).detail,/signal mound/);
  assert.match(objectiveFor({chapter:3,secured:3,clue:true}).detail,/queen/);
});

test('wall tunnels connect every store, supplies, gate and mounted climbing approach',()=>{
  const world=kitchenLayout(buildWalls),level=CHAPTERS[3];
  const blocked=p=>world.solids.some(c=>p.x>c.x-.75&&p.x<c.x+c.w+.75&&p.z>c.z-.75&&p.z<c.z+c.d+.75&&c.bottom<2&&c.top>.1);
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
  const loadout=chapterLoadout(3,saved);assert.deepEqual(loadout.ammoKinds,saved.ammoKinds);
  loadout.ammoKinds.shift();assert.equal(saved.ammoKinds.length,3);
  assert.deepEqual(chapterLoadout(2,{cannon:false,ammo:3,ammoKinds:['egg','egg','egg']}).ammoKinds,['egg']);
  assert.deepEqual(chapterLoadout(3,{cannon:true,ammo:2}).ammoKinds,['carcass','carcass']);
});
test('all colony egg clutches are accessible on foot and outside obstacles',()=>{
  const world=kitchenLayout(buildWalls),start=CHAPTERS[3].spawn;
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

test('royal chamber is chapter four with independent carried gear and boss objectives',()=>{
 assert.equal(chapterNumber('4'),4);assert.equal(CHAPTERS[3].next,4);
 assert.notEqual(CHAPTERS[3].loadoutKey,CHAPTERS[4].loadoutKey);
 assert.equal(chapterLoadout(4).cannon,true);
 assert.deepEqual(chapterLoadout(4,{gear:true,cannon:true,mist:true,ammo:1,ammoKinds:['egg']}).ammoKinds,['egg']);
 assert.match(objectiveFor({chapter:4}).title,/queen/);
 assert.match(objectiveFor({chapter:4,queen:{phase:1,mode:'idle'}}).detail,/Soldier/);
});
test('royal arena supplies and all 24 eggs are reachable, with a clear charge corridor',()=>{
 const world=kitchenLayout(buildRoyal),start=CHAPTERS[4].spawn;
 assert.equal(world.eggSpawns.length,24);assert.equal(world.supplyPoints.length,2);
 const blocked=p=>world.solids.some(c=>p.x>c.x-.75&&p.x<c.x+c.w+.75&&p.z>c.z-.75&&p.z<c.z+c.d+.75&&c.bottom<2&&c.top>.1);
 const queue=[start],seen=new Set([`${start.x},${start.z}`]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;
  if(p.x<-23||p.x>23||p.z<-12||p.z>23||seen.has(key)||blocked(p))continue;
  seen.add(key);queue.push(p);
 }
 for(const dest of [...world.eggSpawns,...world.supplyPoints])assert.ok(queue.some(p=>Math.hypot(p.x-dest.x,p.z-dest.z)<1),'Reachable '+JSON.stringify(dest));
 for(let x=-12;x<=12;x++)for(let z=-7;z<=12;z++)assert.equal(blocked({x,z}),false,'Open charge corridor');
});
