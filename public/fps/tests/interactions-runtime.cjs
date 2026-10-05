// Exercise actual chapter controllers, including real keyboard event dispatch.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fpsRoot=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..');
const B=require(path.join(fpsRoot,'vendor/babylon.js'));
const useProps=process.env.ANTAGONIZED_TEST_PROPS==='1';
if(useProps){
 const ctx={BABYLON:B,console,setTimeout,clearTimeout,TextDecoder,Uint8Array,ArrayBuffer};ctx.self=ctx;
 vm.runInNewContext(fs.readFileSync(path.join(fpsRoot,'vendor/babylonjs.loaders.min.js'),'utf8'),ctx);
 B.SceneLoader.LoadAssetContainerAsync=async(_root,file,scene)=>{
  const bytes=fs.readFileSync(path.join(fpsRoot,file)),n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
  const loader=new ctx.LOADERS.GLTFFileLoader();loader.animationStartMode=0;loader.skipMaterials=true;
  return loader.loadAssetContainerAsync(scene,{json,bin:{byteLength:bin.length,readAsync:(o,n)=>Promise.resolve(new Uint8Array(bin.buffer,bin.byteOffset+o,n))}},'');
 };
}
async function chapterChecks(chapter){
const draw=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:100})},{get:(o,k)=>o[k]||(()=>{})});
class Texture extends B.Texture{constructor(name,size,scene){super(null,scene);this.name=name;}getContext(){return draw;}update(){}}
class Engine extends B.NullEngine{constructor(){super({renderWidth:1280,renderHeight:720,textureSize:64,deterministicLockstep:true,lockstepMaxSteps:4});}static isSupported(){return true;}runRenderLoop(fn){this.frame=fn;}setHardwareScalingLevel(){} }
const nodes=new Map();
function node(id=''){return {id,dataset:{},hidden:false,disabled:true,value:id==='sensitivity'?'1':id==='music-volume'?'.28':'keyboard',checked:true,textContent:'',children:[],style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},position:{},
 get innerHTML(){return this.html||'';},set innerHTML(v){this.html=v;this.children=[...v.matchAll(/<span/g)].map(()=>node());},
 append(n){this.children.push(n);},setAttribute(){},querySelector(){return node();},addEventListener(){},focus(){},pause(){},play(){return Promise.resolve();},getContext(){return draw;}};}
const saved=new Map();const handlers={};const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},querySelector:s=>document.getElementById(s.slice(1)),querySelectorAll:()=>[],createElement:()=>node(),addEventListener(name,fn){handlers[name]=fn;},pointerLockElement:null};
const window={BABYLON:{...B,Engine,DynamicTexture:Texture},devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
const context=vm.createContext({window,document,console,performance,URLSearchParams,location:{search:'?chapter='+chapter+'&debug=1'},localStorage:{getItem(key){return saved.get(key)||null;},setItem(key,value){saved.set(key,value);}},setTimeout:()=>0,clearTimeout(){}});
const cache=new Map();
function mod(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}

 const root=mod(path.join(fpsRoot,'game.mjs'));await root.link((specifier,parent)=>mod(path.resolve(path.dirname(parent.identifier),specifier)));await root.evaluate();
 const g=window.antagonized;
 if(chapter===1)assert.ok(g.ants.every(a=>a.type==='worker'),'yard title shows workers only');
 if(chapter===2)assert.ok(g.ants.every(a=>a.type!=='flyer'),'kitchen title does not introduce flyers');
 if(useProps){await g.heroReady;await g.world.propsReady;await g.world.fixtureReady;await g.world.finale?.ready;await g.groundAntsReady;await g.flyerReady;assert.equal(g.world.stations.length,1);assert.equal(g.scene.getTransformNodeByName('throwable egg').metadata.importedEgg,true);}
 g.reset();await new Promise(setImmediate);
 const populations={1:[60,0,0],2:[36,3,0],3:[36,3,6],4:[36,3,8],5:[6,2,2]};
 assert.deepEqual(['worker','soldier','flyer'].map(type=>g.ants.filter(a=>a.type===type).length),populations[chapter],'chapter '+chapter+' starts with its intended population');
 for(const a of g.ants.filter(a=>a.type==='worker'))assert.ok(!g.world.colliders.some(c=>c.bottom<.6&&c.top>.22&&a.x>c.x-.65&&a.x<c.x+c.w+.65&&a.z>c.z-.65&&a.z<c.z+c.d+.65),'worker starts clear of furniture');
 if(useProps){assert.equal(await g.flyerReady,chapter>=3,'imported flyers load wherever they appear');assert.ok(g.ants.filter(a=>a.type==='flyer').every(a=>a.rig),'every chapter flyer uses its articulated model');}
 g.updateHUD();
 assert.equal(g.state.weapon,chapter===1?0:1,'only throw before backpack, otherwise default Spray');
 assert.equal(g.state.cannon,chapter!==1,'backpack grants launcher without any kills');
 if(chapter===1){assert.equal(g.state.gear,false);assert.equal((document.getElementById('weapons').innerHTML.match(/class="weapon-slot /g)||[]).length,1);assert.match(document.getElementById('weapons').innerHTML,/<b>3<\/b>THROW/);}
 g.step(.01);assert.equal(g.perspective,'third');assert.ok(g.camera.position.z>g.player.z,'every chapter starts with a chase camera');assert.equal(g.scene.getMeshByName('stomp boot'),null);assert.equal(g.scene.getMeshByName('denim leg'),null);
 // Household workers visibly deliver food to the exit and return for another load.
 const workers=g.ants.filter(a=>a.type==='worker'),cargo=workers.filter(a=>a.carry);
 if(chapter===5){
  assert.equal(cargo.length,0,'royal workers never carry food');
  assert.ok(workers.every(a=>a.job==='repair'&&!a.crumb.isEnabled()),'royal workers are dedicated repair attendants');
 }else{
  assert.ok(cargo.length>0&&cargo.length<workers.length,'each household starts with both collectors and couriers');
  assert.ok(cargo.every(a=>a.job==='nest'&&a.crumb.isEnabled()),'delivery workers display their food, including in the bathroom');
  const levels=await import(path.join(fpsRoot,'chapters.mjs')),nest=levels.CHAPTERS[chapter].nest,a=cargo[0];
  g.teleport(0,0,22);a.x=nest.x+Math.cos(a.phase)*2;a.z=nest.z;a.y=0;g.step(.01);
  assert.equal(a.carry,false,'arrival at the exit drops off food');assert.equal(a.crumb.isEnabled(),false);assert.equal(a.job,'food','worker returns to collect');
  const c=g.world.caches[a.cacheIndex];a.phase=Math.PI/2;a.x=c.x;a.z=c.z+1.5;a.y=c.y||0;g.step(.01);
  assert.equal(a.carry,true,'arrival at food source picks up another load');assert.equal(a.crumb.isEnabled(),true);assert.equal(a.job,'nest');
  const before=Math.hypot(a.x-nest.x,a.z-nest.z);g.step(.1);assert.ok(Math.hypot(a.x-nest.x,a.z-nest.z)<before,'loaded worker walks toward the exit');
  c.secured=true;a.x=nest.x;a.z=nest.z;a.phase=Math.PI/2;g.step(.01);assert.equal(a.carry,false,'sealing a source still lets workers drop off their final load');c.secured=false;
  g.reset();await new Promise(setImmediate);g.step(.01);
 }
 const key=code=>handlers.keydown({code,key:code==='Space'?' ':code.startsWith('Digit')?code.slice(-1):code.slice(3),repeat:false,preventDefault(){}});
 const leave=()=>{g.teleport(0,0,22);g.step(.01);};
 const clearAnts=()=>g.ants.forEach(a=>{a.x=-21;a.z=-11;a.y=0;a.foam=100;a.attack=100;});
 clearAnts();
 if(useProps){g.hero.update(g.player,g.state,g.camera.rotation,0);assert.equal(g.hero.rig.backpack.root.isEnabled(),chapter!==1,'backpack follows the starting gear loadout');}
 const bench=g.world.bench;
 g.state.health=2;g.state.tank=10;g.teleport(bench.x,0,bench.z);g.step(.01);
 assert.equal(g.state.cannon,true,'first backpack pickup grants launcher immediately');assert.equal(g.state.kills,0);assert.equal(g.state.weapon,1,'backpack pickup selects Spray');
 assert.equal(g.state.health,5,'walk up restores health in chapter '+chapter);assert.equal(g.state.tank,100);assert.equal(g.state.gear,true);if(useProps){g.hero.update(g.player,g.state,g.camera.rotation,0);assert.equal(g.hero.rig.backpack.root.isEnabled(),true,'collecting gear equips backpack');g.state.weapon=0;g.hero.update(g.player,g.state,g.camera.rotation,0);assert.equal(g.hero.rig.backpack.root.isEnabled(),true,'switching to throwing keeps backpack');assert.ok(g.world.stations.every(a=>a.root.isEnabled()),'stations remain after picking up gear');}
 g.state.health=3;g.state.tank=45;for(let i=0;i<100;i++)g.step(.04);
 assert.equal(g.state.health,3,'standing at a station does not heal continuously');assert.equal(g.state.tank,45);
 key('KeyE');assert.equal(g.state.health,3,'E has no action');
 leave();g.teleport(bench.x,0,bench.z);g.step(.01);assert.equal(g.state.health,5);assert.equal(g.state.tank,100,'reentering refills the tank');
 if(chapter===5){
  assert.equal(g.world.supplyPoints.length,1,'queen chamber has one refill area');
  assert.equal(g.world.markers.filter(m=>m.el.innerHTML.includes('FIELD SUPPLIES')).length,1,'queen chamber has one supply marker');
  g.state.health=2;g.state.tank=0;g.teleport(19,0,12);g.step(.01);assert.equal(g.state.health,2);assert.equal(g.state.tank,0,'removed second station cannot refill');
 }else{
  leave();g.state.tank=12;const cache=g.world.caches[0],guard=g.ants.find(a=>a.type==='worker');
  Object.assign(guard,{x:cache.x,y:0,z:cache.z,state:'alive',foam:100});g.teleport(cache.x,0,cache.z);g.step(.01);assert.equal(cache.secured,false,'guarded cache stays open');
  guard.x=-21;guard.z=-11;g.step(.01);assert.equal(cache.secured,true,'standing near a cache seals when workers leave');
  g.step(.01);assert.equal(g.state.secured,1,'cache is secured only once');
  for(const c of g.world.caches.slice(1)){g.teleport(c.x,c.y||0,c.z);g.step(.01);}assert.equal(g.state.secured,3);assert.equal(g.state.tank,12,'food caches do not refill fuel');
  if(chapter===3){assert.ok(g.world.caches.every(c=>c.lid.isEnabled()),'all household gaps receive repair patches');}
  const clue=g.world.clue;
  if(chapter===1){
   assert.equal(clue.y,3.05,'yard keeps its original elevated ivy trail');
   g.teleport(clue.x,0,clue.z);g.step(.01);assert.equal(g.state.clue,false,'the ivy clue cannot be collected from the ground');
   // Reach the unchanged planter using two ordinary jumps, with no mount or boosted jump.
   g.teleport(19,0,2,Math.PI);g.player.grounded=true;g.jumpAction();g.setKeys('KeyW');
   for(let i=0;i<40;i++)g.step(1/60);g.setKeys();for(let i=0;i<20;i++)g.step(1/60);
   assert.equal(g.player.y,1.7,'first jump lands on the compost bin');
   g.jumpAction();g.setKeys('KeyW');for(let i=0;i<40;i++)g.step(1/60);g.setKeys();for(let i=0;i<20;i++)g.step(1/60);
   assert.equal(g.player.y,3.05,'second jump lands on the ivy planter');
   g.camera.rotation.y=Math.atan2(clue.x-g.player.x,clue.z-g.player.z);g.setKeys('KeyW');for(let i=0;i<20;i++)g.step(1/60);g.setKeys();
   assert.equal(g.state.clue,true,'Marin reaches the original trail by jumping');assert.equal(g.state.ride,null);
  }else{
   g.teleport(clue.x,0,clue.z);g.step(.01);assert.equal(g.state.clue,false,'cannot inspect a high clue from the ground');
   g.teleport(clue.x,clue.y,clue.z);g.step(.01);assert.equal(g.state.clue,true,'walk up inspects the high trail');
  }
 }
 if(chapter===3){
  clearAnts();g.teleport(11,0,-9,Math.PI/2);g.setKeys('KeyW');
  for(let i=0;i<60;i++)g.step(1/60);g.setKeys();
  assert.ok(g.player.x>15,'Marin walks through the shower door opening');
  assert.equal(g.player.y,.18,'the shower tray is a walkable low curb');
  clearAnts();g.teleport(-18,3,3,Math.PI/2);
  let entrySplash=false;
  for(let i=0;i<100;i++){g.step(1/60);entrySplash ||= g.scene.getMeshByName('bath footstep ripple').isEnabled();}
  assert.ok(entrySplash,'falling into the tub makes a splash');
  assert.equal(g.player.y,.38,'Marin lands on the basin bottom, below the water');
  assert.ok(g.world.waterAt(g.player));
  g.setKeys('KeyW');for(let i=0;i<15;i++)g.step(1/60);g.setKeys();
  assert.equal(g.player.y,.38,'walking in water stays on the basin bottom');
  assert.ok(g.player.x>-18,'Marin can wade through the water');
  assert.ok(g.scene.meshes.some(m=>m.name==='bath footstep ripple'&&m.isEnabled()),'wading creates ripples');
  g.jumpAction();g.setKeys('KeyW');for(let i=0;i<120;i++)g.step(1/60);g.setKeys();
  assert.ok(g.player.x>-13,'Marin can jump out of the tub');
  assert.equal(g.player.y,0,'Marin lands back on the bathroom floor');
  g.world.resetChapter();assert.ok(g.scene.meshes.filter(m=>m.name==='bath footstep ripple'||m.name==='bath splash droplet').every(m=>!m.isEnabled()),'retry clears water effects');
  clearAnts();const mount=g.ants.find(a=>a.type==='soldier');
  Object.assign(mount,{x:12,y:0,z:7,state:'alive',foam:14,subdued:0});
  g.teleport(12,0,7,Math.PI/2);g.player.grounded=true;g.jumpAction();assert.equal(g.state.ride,mount);
  g.setKeys('KeyW');for(let i=0;i<120;i++)g.step(1/60);g.setKeys();
  assert.ok(g.player.y>=3&&g.player.x>14.5,'mounted soldier physically climbs the bathroom vanity');
  g.jumpAction();assert.equal(g.state.ride,null);g.teleport(0,0,22);g.step(.02);
 }
 if(useProps){
  clearAnts();g.teleport(0,0,20);g.state.gear=true;g.state.weapon=1;g.setPerspective('first');
  assert.ok(g.hero.firstPersonArms.length>0);assert.equal(g.scene.getMeshByName('cannon hopper'),null);
  const tool=g.hero.sprayer.model.root;
  for(const weapon of [1,2,0])for(const pitch of [-1.2,-.5,0,.6,1.2]){
   g.state.weapon=weapon;g.state.cannon=weapon===0;g.camera.rotation.x=pitch;g.step(.016);
   assert.equal(g.hero.sprayer.model.root,tool,'all weapons share the generated sprayer');
   assert.ok(g.hero.firstPersonArms.every(m=>m.isEnabled()&&m.renderingGroupId===2));
   const local=B.Vector3.TransformCoordinates(g.hero.tool.computeWorldMatrix(true).getTranslation(),g.camera.computeWorldMatrix(true).clone().invert());
   assert.ok(local.x>.05&&local.x<.4&&local.y>-.3&&local.y<.1&&local.z>.2&&local.z<.7,'palm stays in frame at pitch '+pitch+': '+local);
   assert.ok(g.hero.rig.container.meshes.filter(m=>m.getTotalVertices()).every(m=>!m.isEnabled()),'body is hidden in first person');
  }
  g.state.cannon=false;g.setPerspective('third');g.camera.rotation.x=0;g.step(.016);
  assert.ok(g.hero.firstPersonArms.every(m=>!m.isEnabled()));
  assert.ok(g.hero.rig.container.meshes.filter(m=>m.getTotalVertices()).every(m=>m.isEnabled()));
 }
 // Number keys match the displayed selector in every chapter.
 g.state.gear=true;g.state.cannon=true;
 for(const [digit,weapon,label] of [[1,1,'SPRAY'],[2,2,'FOAM'],[3,0,'ANT LAUNCHER']]){
  key('Digit'+digit);assert.equal(g.state.weapon,weapon,'number '+digit+' selects '+label);
  const html=document.getElementById('weapons').innerHTML;
  assert.match(html,new RegExp('weapon-slot selected[^>]*><b>'+digit+'</b>'+label),'HUD highlights the selected number and tool');
 }
 assert.match(document.getElementById('weapons').innerHTML,/<b>1<\/b>SPRAY<\/div>.*<b>2<\/b>FOAM<\/div>.*<b>3<\/b>ANT LAUNCHER/);
 if(chapter===4||chapter===5){
  clearAnts();
  for(const egg of g.eggs){
   Object.assign(g.state,{ammo:3,ammoKinds:['carcass','carcass','carcass']});key('Digit3');g.teleport(egg.x,0,egg.z);g.step(.01);
   assert.equal(egg.state,'available','a full launcher leaves this egg on the ground');assert.equal(egg.node.isEnabled(),true);
   assert.match(document.getElementById('target-info').textContent,/LAUNCHER FULL/);
   key('Digit1');g.state.ammo=2;g.state.ammoKinds=['carcass','carcass'];g.step(.01);
   assert.equal(egg.state,'available','spray does not collect ammo');assert.match(document.getElementById('target-info').textContent,/3 TO EQUIP ANT LAUNCHER/);
   key('Digit2');g.step(.01);assert.equal(egg.state,'available','foam does not collect ammo');
   key('Digit3');g.step(.01);
   assert.equal(egg.state,'collected','every brood egg is collectible in chapter '+chapter);assert.equal(egg.node.isEnabled(),false);
   assert.equal(g.state.ammo,3);assert.deepEqual(Array.from(g.state.ammoKinds),['carcass','carcass','egg']);assert.equal(g.state.weapon,0);
  }
  g.teleport(0,0,22);g.state.ammo=1;g.state.ammoKinds=['egg'];g.step(.2);g.primaryAction();
  assert.equal(g.state.ammo,0,'launcher fires a collected egg');assert.equal(g.state.ammoKinds.length,0);
  assert.ok(g.scene.transformNodes.some(n=>n.name==='throwable egg'&&n.isEnabled()&&!g.eggs.some(e=>e.node===n)),'collected egg becomes a projectile');
 }
 // Waiting or attacking dry must never replenish fuel, in any chapter.
 // Keep the queen dormant while isolating fuel behavior; damage is checked below.
 if(g.state.queen)Object.assign(g.state.queen,{mode:'dormant',timer:3,target:null});
 leave();clearAnts();g.state.gear=true;g.state.tank=17;g.state.weapon=0;
 for(let i=0;i<125;i++)g.step(.04);
 assert.equal(g.state.tank,17,'idle never refills');
 g.selectWeapon(1);g.step(.2);g.primaryAction();assert.ok(Math.abs(g.state.tank-16.3)<1e-8,'spray spends shared fuel');
 g.selectWeapon(2);g.step(.2);g.primaryAction();assert.ok(Math.abs(g.state.tank-8.3)<1e-8,'foam spends eight units');
 for(let i=0;i<100;i++)g.step(.04);assert.ok(Math.abs(g.state.tank-8.3)<1e-8,'release attack does not refill');
 g.state.tank=4;g.primaryAction();assert.equal(g.state.tank,4,'insufficient foam does not trigger a refill');
 g.state.tank=0;g.state.weapon=1;
 for(let i=0;i<150;i++){g.primaryAction();g.step(.04);}
 assert.equal(g.state.tank,0,'empty tank stays empty with repeated attack');assert.equal(document.getElementById('tank-count').textContent,'EMPTY');
 assert.match(document.getElementById('toast').textContent,/refill station/);
 assert.equal((document.getElementById('weapons').innerHTML.match(/class="weapon-slot /g)||[]).length,3,'HUD has exactly three tools');
 key('Digit4');key('KeyQ');g.selectWeapon(3);assert.equal(g.state.weapon,1,'removed controls cannot select or place anything');
 assert.equal(Object.hasOwn(g.state,'mist'),false);assert.equal(Object.hasOwn(g.state,'baits'),false);
 leave();g.teleport(bench.x,0,bench.z);g.step(.01);assert.equal(g.state.tank,100,'walking up refills an empty tank');
 if(chapter!==1){
 leave();clearAnts();const ant=g.ants.find(a=>a.type==='soldier');Object.assign(ant,{x:0,y:0,z:18,state:'alive',foam:14,subdued:0});g.teleport(0,0,17);g.step(.01);
 assert.equal(g.state.ride,null,'proximity alone never mounts');key('KeyE');assert.equal(g.state.ride,null,'E does not mount');
 key('Space');assert.equal(g.state.ride,ant,'jump mounts a foamed soldier directly');assert.equal(g.player.vy,0,'mount does not jump');
 const bitingWorker=g.ants.find(a=>a.type==='worker');Object.assign(bitingWorker,{x:g.player.x+.3,y:g.player.y,z:g.player.z,state:'alive',foam:0,attack:0});g.state.health=5;g.state.invulnerable=0;g.step(.01);assert.equal(g.state.health,5,'mounted Marin is protected from ordinary bites');
 key('Space');assert.equal(g.state.ride,null,'jump dismounts');assert.ok(g.player.vy>0,'Marin hops off');
 // Dismount works while climbing/airborne too, rather than jumping the soldier.
 g.state.ride=ant;ant.state='mounted';g.player.grounded=false;g.player.y=2;key('Space');assert.equal(g.state.ride,null);
 if(chapter===5){g.state.ride=ant;ant.state='mounted';g.player.y=0;g.player.vy=0;g.player.grounded=true;g.state.health=5;g.state.invulnerable=0;Object.assign(g.state.queen,{mode:'warn',attack:'slam',timer:.001,target:{x:g.player.x,z:g.player.z}});g.step(.02);assert.equal(g.state.ride,null,'queen hit knocks Marin off');assert.equal(g.state.health,3,'queen deals 40 damage and knocks mounted Marin off');}
 }
 if(chapter===5){
  clearAnts();g.state.ride=null;
  for(const attack of ['slam','charge']){
   g.teleport(0,0,0);g.player.vy=0;g.state.health=5;g.state.invulnerable=0;
   Object.assign(g.state.queen,{mode:attack==='slam'?'warn':'charge',attack,timer:attack==='slam'?.001:1.35,x:0,z:0,from:{x:0,z:0},target:{x:0,z:6},chargeHit:false});
   if(attack==='slam')g.state.queen.target={x:0,z:0};
   g.step(.02);assert.equal(g.state.health,3,attack+' deals 40 damage');assert.equal(document.getElementById('health-number').textContent,60);
   g.step(.02);assert.equal(g.state.health,3,'one attack does not damage twice');
  }
  g.state.health=1;g.state.invulnerable=0;Object.assign(g.state.queen,{mode:'warn',attack:'slam',timer:.001,target:{x:g.player.x,z:g.player.z}});g.step(.02);
  assert.equal(g.state.health,0,'lethal queen hit clamps health at zero');assert.equal(g.state.ended,true);assert.equal(g.state.won,false);
  g.reset();await new Promise(setImmediate);clearAnts();
 }
 if(chapter!==5){
  const levels=await import(path.join(fpsRoot,'chapters.mjs'));const exit=levels.CHAPTERS[chapter].exit;
  Object.assign(g.state,{gear:true,cannon:true,tank:23,ammo:2,ammoKinds:['egg','carcass']});
  g.teleport(exit.x,exit.y,exit.z);g.step(.01);assert.equal(g.state.won,true,'walk up completes chapter '+chapter);
  const next=document.getElementById('next-chapter'),destination=levels.CHAPTERS[chapter].next;
  assert.equal(next.hidden,false);assert.equal(next.href,'/fps/?chapter='+destination);assert.equal(next.textContent,levels.CHAPTERS[destination].start+' ↗');
  const carry=JSON.parse(saved.get(levels.CHAPTERS[destination].loadoutKey));
  assert.equal(carry.gear,true);assert.equal(carry.cannon,true);assert.equal(carry.tank,23);assert.equal(Object.hasOwn(carry,'mist'),false);assert.equal(carry.ammo,2);assert.deepEqual(carry.ammoKinds,['egg','carcass']);
  const loadout=levels.chapterLoadout(destination,carry);assert.equal(loadout.tank,23);assert.equal(loadout.ammo,2);assert.deepEqual(loadout.ammoKinds,['egg','carcass']);
  let prevented=false;handlers.keydown({code:'Space',key:' ',repeat:false,preventDefault(){prevented=true;}});assert.equal(prevented,false,'completion controls retain keyboard activation');
 }
 // Actual mounted attacks kill other soldiers in three bites, preserving the mount.
 if(chapter!==1){
  g.reset();await new Promise(setImmediate);clearAnts();
  if(g.state.queen)Object.assign(g.state.queen,{mode:'dormant',timer:3,target:null});
  const soldiers=g.ants.filter(a=>a.type==='soldier'),mount=soldiers[0];
  Object.assign(mount,{x:0,y:0,z:17,state:'alive',foam:14,subdued:0});
  g.teleport(0,0,17,Math.PI);g.player.grounded=true;g.jumpAction();
  assert.equal(g.state.ride,mount);
  assert.equal(g.hit(mount,100,'bite'),'ignored','mount cannot kill itself');
  for(const victim of soldiers.slice(1)){
   Object.assign(victim,{x:0,y:0,z:15,state:'alive',foam:100,subdued:0,hp:3,mountedHits:0});
   for(const kind of ['egg','carcass'])for(let i=0;i<6;i++)g.hit(victim,100,kind);
   assert.equal(victim.hp,3,'projectiles do not damage soldier health');assert.notEqual(victim.state,'dead');
   for(let i=0;i<3;i++){
    g.step(.6);g.primaryAction();g.step(.01);
    assert.equal(victim.mountedHits,i+1,'mounted attack '+(i+1));assert.equal(victim.hp,2-i);
    assert.equal(victim.state,i===2?'dead':'subdued');
   }
   if(useProps)assert.equal(victim.rig.clip,'Defeat','dead soldier plays the defeat clip');
   victim.x=-21;victim.z=-11;
  }
  assert.equal(soldiers.filter(a=>a.state!=='dead').length,1,'one soldier always survives');assert.equal(mount.state,'mounted');
  g.jumpAction();g.state.weapon=0;g.state.ammo=0;g.state.ammoKinds=[];
  const corpse=soldiers[1];g.teleport(corpse.x,0,corpse.z);g.step(.4);
  assert.equal(g.state.ammo,0,'dead soldiers never become throwable ammunition');
  assert.equal(g.hit(mount,100,'bite'),'ignored','unmounted attack cannot damage the last soldier');
  g.reset();await new Promise(setImmediate);clearAnts();
 }
 g.reset();await new Promise(setImmediate);g.ants.forEach(a=>{a.foam=100;a.attack=100;});
 const levels=await import(path.join(fpsRoot,'chapters.mjs'));
 if(chapter!==5){
  const counts=()=>g.world.caches.map((_,i)=>g.ants.filter(a=>a.type==='worker'&&a.cacheIndex===i).length);
  const before=counts();g.step(4.9);assert.deepEqual(counts(),before,'sources wait for their five-second interval');
  g.step(.11);assert.deepEqual(counts(),before.map(n=>n+1),'each of the three open sites creates one worker after five seconds');
  const wave=g.ants.filter(a=>a.reinforcement);assert.equal(wave.length,3);
  for(const a of wave){const c=g.world.caches[a.cacheIndex];assert.ok(Math.hypot(a.x-c.x,a.z-c.z)<=3.01,'worker emerges near its own site');if(useProps)assert.ok(a.rig,'new workers use the imported rig');}
  g.step(.01);assert.ok(wave.every(a=>a.carry&&a.crumb.isEnabled()),'new workers collect visible food at their source');
  const courier=wave[0],nest=levels.CHAPTERS[chapter].nest;courier.x=nest.x+Math.cos(courier.phase)*2;courier.z=nest.z;courier.y=0;g.step(.01);
  assert.ok(!g.ants.includes(courier)&&courier.root.isDisposed(),'reinforcement couriers leave through the exit and release their models after delivery');
  g.world.caches[0].secured=true;const onePatched=counts();g.step(5);
  assert.deepEqual(counts(),onePatched.map((n,i)=>n+(i===0?0:1)),'only unpatched sites continue spawning');
  g.world.caches.forEach(c=>c.secured=true);const known=new Set(g.ants);g.step(30);
  assert.ok(g.ants.every(a=>known.has(a)),'patching every site stops all new workers');
  g.reset();await new Promise(setImmediate);g.ants.forEach(a=>{a.foam=1000;a.attack=1000;});for(let i=0;i<120;i++){g.step(5);await new Promise(setImmediate);}
  assert.ok(g.ants.filter(a=>a.type==='worker'&&a.state==='alive').length<=levels.CHAPTERS[chapter].workerLimit,'long sessions keep a bounded live population');
  assert.ok(g.world.caches.every(c=>c.workerSpawnSequence===120),'every open site keeps producing even at the population limit');
  g.reset();await new Promise(setImmediate);g.step(4.9);assert.equal(g.ants.filter(a=>a.type==='worker').length,populations[chapter][0],'retry resets every source timer');
 }else{g.step(35.1);assert.ok(g.ants.filter(a=>a.type==='worker'&&a.state==='alive').length<=6,'royal repair workers keep their own population limit');}
 assert.equal(g.ants.filter(a=>a.type==='soldier').length,populations[chapter][1],'reinforcements do not introduce soldiers early');
 assert.equal(g.ants.filter(a=>a.type==='flyer').length,populations[chapter][2],'reinforcements do not introduce flyers early');
 console.log('PASS chapter '+chapter+': automatic supplies/caches/trail/exit, reentry refill, Space mount/dismount, no E action, three tools, station-only fuel and carried tank');g.scene.dispose();g.scene.getEngine().dispose();
}
(async()=>{const chapters=process.env.ANTAGONIZED_TEST_CHAPTER?[Number(process.env.ANTAGONIZED_TEST_CHAPTER)]:[1,2,3,4,5];for(const chapter of chapters)await chapterChecks(chapter);})().catch(e=>{console.error(e);process.exitCode=1;});
