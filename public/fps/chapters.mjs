export const CHAPTERS = {
  1: {
    next:2,place:'backyard',loadoutKey:null,climbObject:'ivy planter',
    music:{src:'assets/marin-vs-the-colony.mp3',title:'Marin vs. the Colony'},
    number:'01',name:'THE BACKYARD',location:'BACKYARD',highLocation:'IVY PLANTER',
    spawn:{x:0,y:0,z:18},exit:{x:0,y:0,z:-12.2},nest:{x:0,z:-11.5},
    title:'Small yard.<br>Big <em>problem.</em>',start:'Take back the yard',
    intro:'Pick up your loaded spray + foam kit at the tool bench. Space near a worker helps line up a stomp.',
    climb:'Jump from the compost bin onto the ivy planter. Inspect the trail.',
    discovered:'The trail leads into the kitchen. Head for the back door.',
    exitAction:'Enter the kitchen · finish chapter',exitDetail:'Reach the kitchen door to finish the backyard.',
    winTitle:'The yard is yours.',winCopy:'The food trails are cut off. The colony has moved indoors. Marin grabs her gear. Time to take back the kitchen.',
    workers:60,workerLimit:96,soldiers:[],flyers:[],
  },
  2: {
    next:3,place:'kitchen',loadoutKey:'antagonized.kitchenLoadout',climbObject:'sink counter',
    music:{src:'assets/midnight-in-marins-kitchen.mp3',title:'Midnight in Marin’s Kitchen'},
    number:'02',name:'THE KITCHEN',location:'KITCHEN',highLocation:'KITCHEN COUNTER',
    spawn:{x:0,y:0,z:18},exit:{x:-13,y:0,z:-11.7},nest:{x:-13,z:-11.5},
    title:'Their feast.<br>Your <em>kitchen.</em>',start:'Take back the kitchen',
    intro:'Seal cereal, kibble and recycling. Then ride a soldier onto the sink counter to find where they went next.',
    climb:'Ride a soldier onto the sink counter. Inspect the pheromone trail.',
    discovered:'The trail follows the water pipes toward the bathroom. Head for the bathroom door.',
    exitAction:'Enter the bathroom · finish kitchen',exitDetail:'Reach the bathroom door beside the fridge.',
    winTitle:'Kitchen closed.',winCopy:'The pantry is sealed. The counter is clear. But the trail follows the plumbing to the room that started the worst of it: the bathroom.',
    workers:36,workerLimit:96,soldiers:[[11,-2,1],[-8,-5,2],[7,9,0]],flyers:[],
  },
  3: {
    next:4,place:'bathroom',loadoutKey:'antagonized.bathroomLoadout',climbObject:'vanity',
    music:{src:'assets/trouble-in-the-tiles.mp3',title:'Trouble in the Tiles'},
    number:'03',name:'THE BATHROOM',location:'BATHROOM',highLocation:'VANITY TOP',
    spawn:{x:0,y:0,z:19},exit:{x:-9,y:0,z:-11.7},nest:{x:-9,z:-11.5},
    title:'New home.<br>Uninvited <em>guests.</em>',start:'Take back the bathroom',
    intro:'Seal the cabinet hole, the tile gap beside the toilet and the crack inside the glass shower. Ride a soldier onto the vanity to trace the ants behind the plumbing.',
    climb:'Ride a soldier up the vanity. Inspect the plumbing trail.',
    discovered:'They are nesting behind the bathroom plumbing. Open the marked access panel to enter the walls.',
    exitAction:'Open plumbing access · finish bathroom',exitDetail:'Reach the plumbing access panel on the back wall.',
    winTitle:'No more bathroom guests.',winCopy:'The cabinet hole and tile cracks are sealed. After months of sharing this room with ants, Marin has had enough. One last trail leads behind the wall.',
    workers:36,workerLimit:96,soldiers:[[6,7,0],[-9,2,1],[10,-6,2]],flyers:[[-9,8,0],[7,-2,1],[-3,-8,2],[-6,15,0],[14,3,1],[5,-8,2]],
  },
  4: {
    next:5,place:'walls',loadoutKey:'antagonized.wallsLoadout',climbObject:'signal mound',
    music:{src:'assets/mid-spooky-v2.mp3',title:'Mid-Spooky'},
    number:'04',name:'BEHIND THE WALLS',location:'WALL TUNNELS',highLocation:'SIGNAL MOUND',
    spawn:{x:0,y:0,z:19},exit:{x:0,y:0,z:-11.7},nest:{x:0,z:-11.5},
    title:'The walls<br>are <em>alive.</em>',start:'Enter the colony',
    intro:'Seal the seed vault, sugar store and fungus farm. Ride a soldier up the signal mound to locate the queen.',
    climb:'Ride a soldier up the signal mound. Decode the queen’s signal.',
    discovered:'The signal comes from beyond the roots. Approach the queen’s gate and break its seal.',
    exitAction:'Break the royal seal · finish chapter',exitDetail:'Break the seal on the queen’s gate at the end of the tunnel.',
    winTitle:'She knows you’re here.',winCopy:'The colony’s stores are sealed. The roots part. In the darkness beyond, an enormous shape turns toward Marin. The queen has been waiting.',
    workers:36,workerLimit:96,soldiers:[[11,9,1],[-12,4,0],[9,-7,2]],flyers:[[-14,10,0],[14,6,1],[-12,-7,2],[2,-8,2],[-5,14,0],[7,11,1],[-6,-3,2],[15,-7,2]],
  },
  5: {
    next:null,place:'royal chamber',loadoutKey:'antagonized.queenLoadout',climbObject:'root ledges',
    music:{src:'assets/the-queen-beneath.mp3',title:'The Queen Beneath'},
    number:'05',name:'THE ROYAL CHAMBER',location:'QUEEN’S CHAMBER',highLocation:'ROOT LEDGE',
    spawn:{x:0,y:0,z:20},exit:{x:0,y:0,z:22},nest:{x:0,z:-3},
    title:'One queen.<br>Your <em>home.</em>',start:'Face the queen',
    intro:'Eggs are ammo. Break her resin armor with throws, then spray the exposed queen. Walk up to field supplies to refill health and tank.',
    climb:'Ride a soldier to smash her armor, or use the Ant Launcher.',discovered:'The way home is open.',
    exitAction:'Return home',exitDetail:'Defeat the queen to free Marin’s home.',
    winTitle:'Long live Marin.',winCopy:'The queen falls. The colony goes silent. Above the roots, sunlight spills through a crack in the foundation. Marin shoulders her sprayer. Her family has their home back. No more uninvited insects.',
    workers:6,workerLimit:6,soldiers:[[-10,4,0],[11,-3,1]],flyers:[[-13,8,0],[13,-7,1]],
  },
};

export function chapterNumber(value){return Object.hasOwn(CHAPTERS,Number(value))?Number(value):1;}
export function chapterLoadout(chapter,saved=null){
  if(chapter===1)return {gear:false,cannon:false,ammo:0,ammoKinds:[],weapon:0,tank:0};
  const source=saved&&typeof saved==='object'?saved:{gear:true,cannon:true,ammo:3};
  const gear=source.gear===true,cannon=source.cannon===true;
  const ammo=Math.max(0,Math.min(cannon?3:1,Math.floor(Number(source.ammo)||0)));
  const ammoKinds=Array.from({length:ammo},(_,i)=>source.ammoKinds?.[i]==='egg'?'egg':'carcass');
  const tank=gear?(Number.isFinite(source.tank)?Math.max(0,Math.min(100,source.tank)):100):0;
  return {gear,cannon,ammo,ammoKinds,weapon:cannon?0:gear?1:0,tank};
}
export function nearLevelPoint(player,point,radius=2.5){
  return Math.hypot(player.x-point.x,player.z-point.z)<radius&&Math.abs(player.y-(point.y||0))<(point.y>1?.5:1.2);
}

// Keep the larger swarms off furniture, out of one another, and spread along the yard approaches.
export function workerSpawns(chapter,caches,colliders=[]){
  const count=CHAPTERS[chapter].workers,spawns=[];
  const open=(x,z)=>x>=-22.5&&x<=22.5&&z>=-12.5&&z<=22.5
    &&!colliders.some(c=>c.bottom<.6&&c.top>.22&&x>c.x-.7&&x<c.x+c.w+.7&&z>c.z-.7&&z<c.z+c.d+.7)
    &&spawns.every(p=>Math.hypot(p[0]-x,p[1]-z)>1.05);
  if(chapter===1)for(const [x,z,i] of [[-.8,12,0],[2.1,9,0],[-2,5,0],[-5,15,0],[-8,12,0],[-5,8,0],[-7,3,0],[6,15,1],[11,13,1],[14,9,1],[10,5,1],[-6,-5,2]]){
    if(open(x,z))spawns.push([x,z,i]);
  }
  const remaining=count-spawns.length;
  caches.forEach((c,i)=>{
    const group=Math.floor(remaining/caches.length)+(i<remaining%caches.length?1:0);
    let placed=0;
    for(let n=0;placed<group&&n<200;n++){
      const angle=n*2.399963+i*.7,radius=2+Math.floor(n/8)*1.1;
      const x=c.x+Math.cos(angle)*radius,z=c.z+Math.sin(angle)*radius;
      if(open(x,z)){spawns.push([x,z,i]);placed++;}
    }
  });
  return spawns;
}


export const WORKER_SOURCE_INTERVAL=5;
// Each open site keeps its own clock; a seal shuts it off immediately.
export function advanceWorkerSource(cache,dt){
  if(cache.secured||!Number.isFinite(dt)||dt<=0)return 0;
  let remaining=(cache.workerSpawnTimer??WORKER_SOURCE_INTERVAL)-dt,count=0;
  if(remaining<=0){count=Math.floor(-remaining/WORKER_SOURCE_INTERVAL)+1;remaining+=count*WORKER_SOURCE_INTERVAL;}
  cache.workerSpawnTimer=remaining;return count;
}
export function workerEmergencePoint(cache,colliders,sequence=0){
  const y=cache.y||0,base=sequence*2.399963;
  for(const radius of [1.2,1.8,2.4,3])for(let n=0;n<24;n++){
    const angle=base+n*Math.PI/12,x=cache.x+Math.cos(angle)*radius,z=cache.z+Math.sin(angle)*radius;
    if(x<-22.5||x>22.5||z<-12.5||z>22.5)continue;
    if(colliders.some(c=>c.bottom<y+.6&&c.top>y+.22&&x>c.x-.7&&x<c.x+c.w+.7&&z>c.z-.7&&z<c.z+c.d+.7))continue;
    return {x,y,z};
  }
  return null;
}
