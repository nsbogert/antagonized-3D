export const CHAPTERS = {
  1: {
    next:2,place:'backyard',loadoutKey:null,climbObject:'ivy planter',
    music:{src:'assets/marin-vs-the-colony.mp3',title:'Marin vs. the Colony'},
    number:'01',name:'THE BACKYARD',location:'BACKYARD',highLocation:'IVY PLANTER',
    spawn:{x:0,y:0,z:18},exit:{x:0,y:0,z:-12.2},nest:{x:0,z:-11.5},
    title:'Small yard.<br>Big <em>problem.</em>',start:'Take back the yard',
    intro:'Pick up your loaded spray + foam kit at the tool bench. Space near a worker helps line up a stomp.',
    climb:'Ride a soldier up the ivy planter. Inspect the trail.',
    discovered:'The ants are entering the kitchen walls. Head for the back door.',
    exitAction:'Enter the kitchen · finish chapter',exitDetail:'Reach the kitchen door to finish the backyard.',
    winTitle:'The yard is yours.',winCopy:'The food trails are cut off. The colony has moved indoors. Marin grabs her gear. Time to take back the kitchen.',
    soldiers:[[9,-5,1],[-6,-6,2]],flyers:[[-5,-1,0],[7,2,1],[-9,-7,2]],
  },
  2: {
    next:3,place:'kitchen',loadoutKey:'antagonized.kitchenLoadout',climbObject:'sink counter',
    music:{src:'assets/midnight-in-marins-kitchen.mp3',title:'Midnight in Marin’s Kitchen'},
    number:'02',name:'THE KITCHEN',location:'KITCHEN',highLocation:'KITCHEN COUNTER',
    spawn:{x:0,y:0,z:18},exit:{x:-13,y:0,z:-11.7},nest:{x:-13,z:-11.5},
    title:'Their feast.<br>Your <em>kitchen.</em>',start:'Take back the kitchen',
    intro:'Seal cereal, kibble and recycling. Then ride a soldier onto the sink counter to find the colony’s route.',
    climb:'Ride a soldier onto the sink counter. Inspect the pheromone trail.',
    discovered:'Behind the fridge: a tunnel into the walls. Open the marked wall breach.',
    exitAction:'Open wall breach · finish kitchen',exitDetail:'Open the wall breach beside the fridge.',
    winTitle:'Kitchen closed.',winCopy:'The pantry is sealed. The counter is clear. Behind the fridge, a warm draft carries the sound of thousands of feet. Marin has found the way into the colony.',
    soldiers:[[11,-2,1],[-8,-5,2],[7,9,0]],flyers:[[10,-5,0],[-8,-3,1],[4,3,2],[16,-7,1]],
  },
  3: {
    next:4,place:'walls',loadoutKey:'antagonized.wallsLoadout',climbObject:'signal mound',
    music:{src:'assets/mid-spooky-v2.mp3',title:'Mid-Spooky'},
    number:'03',name:'BEHIND THE WALLS',location:'WALL TUNNELS',highLocation:'SIGNAL MOUND',
    spawn:{x:0,y:0,z:19},exit:{x:0,y:0,z:-11.7},nest:{x:0,z:-11.5},
    title:'The walls<br>are <em>alive.</em>',start:'Enter the colony',
    intro:'Seal the seed vault, sugar store and fungus farm. Ride a soldier up the signal mound to locate the queen.',
    climb:'Ride a soldier up the signal mound. Decode the queen’s signal.',
    discovered:'The signal comes from beyond the roots. Approach the queen’s gate and break its seal.',
    exitAction:'Break the royal seal · finish chapter',exitDetail:'Break the seal on the queen’s gate at the end of the tunnel.',
    winTitle:'She knows you’re here.',winCopy:'The colony’s stores are sealed. The roots part. In the darkness beyond, an enormous shape turns toward Marin. The queen has been waiting.',
    soldiers:[[11,9,1],[-12,4,0],[9,-7,2]],flyers:[[-14,10,0],[14,6,1],[-12,-7,2],[2,-8,2]],
  },
  4: {
    next:null,place:'royal chamber',loadoutKey:'antagonized.queenLoadout',climbObject:'root ledges',
    music:{src:'assets/the-queen-beneath.mp3',title:'The Queen Beneath'},
    number:'04',name:'THE ROYAL CHAMBER',location:'QUEEN’S CHAMBER',highLocation:'ROOT LEDGE',
    spawn:{x:0,y:0,z:20},exit:{x:0,y:0,z:22},nest:{x:0,z:-3},
    title:'One queen.<br>Your <em>home.</em>',start:'Face the queen',
    intro:'Eggs are ammo. Break her resin armor with throws, then spray the exposed queen. E at field supplies refills health and bait.',
    climb:'Ride a soldier to smash her armor, or use the cannon.',discovered:'The way home is open.',
    exitAction:'Return home',exitDetail:'Defeat the queen to free Marin’s home.',
    winTitle:'Long live Marin.',winCopy:'The queen falls. The colony goes silent. Above the roots, sunlight spills through a crack in the foundation. Marin shoulders her sprayer. Her home is hers again.',
    soldiers:[[-10,4,0],[11,-3,1]],flyers:[],
  },
};

export function chapterNumber(value){return [1,2,3,4].includes(Number(value))?Number(value):1;}
export function chapterLoadout(chapter,saved=null){
  if(chapter===1)return {gear:false,cannon:false,mist:false,ammo:0,ammoKinds:[],weapon:0,tank:0};
  const source=saved&&typeof saved==='object'?saved:{gear:true,cannon:true,mist:true,ammo:3};
  const gear=source.gear===true,cannon=source.cannon===true,mist=gear&&source.mist===true;
  const ammo=Math.max(0,Math.min(cannon?3:1,Math.floor(Number(source.ammo)||0)));
  const ammoKinds=Array.from({length:ammo},(_,i)=>source.ammoKinds?.[i]==='egg'?'egg':'carcass');
  return {gear,cannon,mist,ammo,ammoKinds,weapon:cannon?0:gear?1:0,tank:gear?100:0};
}
export function nearLevelPoint(player,point,radius=2.5){
  return Math.hypot(player.x-point.x,player.z-point.z)<radius&&Math.abs(player.y-(point.y||0))<(point.y>1?.5:1.2);
}
