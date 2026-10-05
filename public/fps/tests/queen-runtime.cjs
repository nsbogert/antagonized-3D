// Offline simulation integration test: no browser or desktop automation.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fpsRoot=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..');
const B=require(path.join(process.env.ANTAGONIZED_VENDOR_ROOT||path.join(fpsRoot,'vendor'),'babylon.js'));
const useImported=process.env.ANTAGONIZED_TEST_MARIN==='1';
if(useImported){
 const loaderContext={BABYLON:B,console,setTimeout,clearTimeout,TextDecoder,Uint8Array,ArrayBuffer};loaderContext.self=loaderContext;
 vm.runInNewContext(fs.readFileSync(path.join(fpsRoot,'vendor/babylonjs.loaders.min.js'),'utf8'),loaderContext);
 B.SceneLoader.LoadAssetContainerAsync=async(_root,_file,scene)=>{
  const bytes=fs.readFileSync(path.join(fpsRoot,_file)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
  const loader=new loaderContext.LOADERS.GLTFFileLoader();loader.animationStartMode=0;loader.skipMaterials=true;
  const container=await loader.loadAssetContainerAsync(scene,{json,bin:{byteLength:bin.length,readAsync:(o,n)=>Promise.resolve(new Uint8Array(bin.buffer,bin.byteOffset+o,n))}},'');
  // Exercise real material updates without fetching the embedded image textures.
  if(_file.includes('queen-rigged'))for(const mesh of container.meshes)if(mesh.skeleton||mesh.name==='DetachableCrown')mesh.material=new B.PBRMaterial('offline '+mesh.name,scene);
  return container;
 };
}
const draw=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:100})},{get:(o,k)=>o[k]||(()=>{})});
class Texture extends B.Texture{constructor(name,size,scene){super(null,scene);this.name=name;}getContext(){return draw;}update(){}}
class Engine extends B.NullEngine{constructor(){super({renderWidth:1280,renderHeight:720,textureSize:64,deterministicLockstep:true,lockstepMaxSteps:4});}static isSupported(){return true;}runRenderLoop(fn){this.frame=fn;}setHardwareScalingLevel(){} }
const nodes=new Map();
function node(id=''){return {id,dataset:{},hidden:false,disabled:true,value:id==='sensitivity'?'1':id==='music-volume'?'.28':'keyboard',checked:true,textContent:'',children:[],style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},position:{},
 get innerHTML(){return this.html||'';},set innerHTML(v){this.html=v;this.children=[...v.matchAll(/<span/g)].map(()=>node());},
 append(n){this.children.push(n);},setAttribute(){},querySelector(){return node();},addEventListener(){},focus(){},pause(){},play(){return Promise.resolve();},getContext(){return draw;}};}
const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},querySelector:s=>document.getElementById(s.slice(1)),querySelectorAll:()=>[],createElement:()=>node(),addEventListener(){},pointerLockElement:null};
const window={BABYLON:{...B,Engine,DynamicTexture:Texture},devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
const context=vm.createContext({window,document,console,performance,URLSearchParams,location:{search:'?chapter=5&debug=1'},localStorage:{getItem(){return null;},setItem(){}},setTimeout:()=>0,clearTimeout(){}});
const cache=new Map();
function mod(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
(async()=>{
 const root=mod(path.join(fpsRoot,'game.mjs'));await root.link((specifier,parent)=>mod(path.resolve(path.dirname(parent.identifier),specifier)));await root.evaluate();
 const g=window.antagonized;
 await g.world.finale.ready;await g.heroReady;await g.world.propsReady;assert.equal(g.world.finale.imported,useImported);assert.equal(g.world.finale.importedQueen,useImported);
 const crownSocket=g.scene.getTransformNodeByName('Marin rigged crown socket');
 const socketRotation=crownSocket?.rotation.clone();
 if(useImported)assert.equal(g.world.stations.length,1,'single royal refill station uses the new model');
 function assertCrownSocket(){
  if(useImported)assert.ok(B.Vector3.Distance(crownSocket.rotation,socketRotation)<.00001,'restart/replay preserves the head socket orientation');
 }
 for(const name of ['fitted coverall torso','tailored upper trouser','Marin curved face']){
  const mesh=g.scene.getMeshByName(name),positions=mesh.getVertexBuffer(B.VertexBuffer.PositionKind).getData(),normals=mesh.getVertexBuffer(B.VertexBuffer.NormalKind).getData();
  let front=0;for(let i=0;i<positions.length;i+=3)if(positions[i+2]>positions[front+2])front=i;
  assert.ok(normals[front+2]>0,name+' has outward-facing surfaces');
 }

 // Gameplay uses the real animated Marin at human scale, with no detached legacy boots.
 assert.equal(g.scene.getMeshByName('stomp boot'),null);assert.equal(g.scene.getMeshByName('denim leg'),null);
 if(useImported){
  g.reset();assert.equal(g.perspective,'third');g.setKeys('KeyW');g.step(.04);
  assert.equal(g.hero.root.isEnabled(),true);assert.equal(g.hero.rig.backpack.root.isEnabled(),true,'gear loadout equips backpack');assert.equal(g.hero.clip,'Running');assert.ok(g.camera.position.z>g.player.z+2,'chase camera stays behind the player');
  assert.ok(Math.abs(g.hero.root.position.z-g.player.z)<1e-6);
  const joints=g.hero.rig.container.transformNodes.filter(n=>n.name.startsWith('mixamorig:'));
  const before=joints.map(n=>n.rotationQuaternion.clone());g.step(.08);
  assert.ok(joints.some((n,i)=>B.Quaternion.Distance(before[i],n.rotationQuaternion)>.01),'run articulates Marin’s actual skeleton');
  g.setKeys();g.jumpAction();g.step(.03);assert.equal(g.hero.clip,'Jump_Over_Obstacle_2');assert.ok(g.hero.root.position.y>0);
  g.player.y=0;g.player.vy=0;g.player.grounded=true;g.state.ride=g.ants.find(a=>a.type==='soldier');g.state.ride.state='mounted';g.state.rideTime=40;g.step(.02);assert.equal(g.hero.clip,'Idle_15');assert.ok(g.hero.root.position.y>.6,'Marin is seated above the mounted soldier');
  g.reset();const obstruction=B.MeshBuilder.CreateBox('camera-test_merged',{width:4,height:4,depth:.4},g.scene);obstruction.position.set(0,2,g.player.z+1.4);obstruction.computeWorldMatrix(true);
  g.setPerspective('third');assert.ok(g.camera.position.z<g.player.z+1.2,'decorative geometry also pushes the chase camera inward');obstruction.dispose();
  g.setPerspective('first');assert.equal(g.hero.root.isEnabled(),true);assert.ok(g.hero.firstPersonArms.length>0);assert.ok(g.hero.rig.container.meshes.filter(m=>m.getTotalVertices()).every(m=>!m.isEnabled()),'first person hides full body while sharing its live arm rig');assert.equal(g.scene.getTransformNodeByName('Marin body').isEnabled(),false);
  g.setPerspective('third');assert.equal(g.hero.root.isEnabled(),true);g.reset();
  g.teleport(0,0,18);g.state.weapon=1;g.hero.update(g.player,g.state,{x:0,y:Math.PI},0);assert.ok(B.Vector3.Distance(g.hero.tool.computeWorldMatrix(true).getTranslation(),new B.Vector3(g.player.x,g.player.y+1.3,g.player.z))<.9,'tool follows the hand immediately after Marin moves');g.reset();
 }
 // The same imported crowned queen is visible and animated before and during battle.
 if(useImported){
  g.reset();const q=g.state.queen,rig=g.world.finale.combatRoot,crown=g.scene.getTransformNodeByName('royal crown');
  g.world.syncQueen(q,0,0);assert.equal(rig.isEnabled(),true);assert.equal(g.scene.getTransformNodeByName('THE QUEEN').isEnabled(),false);assert.equal(crown.isEnabled(),true);assert.equal(crown.parent,null);assert.equal(g.world.finale.combatClip,'Idle');
  const socket=g.scene.getTransformNodeByName('CrownSocket');assert.ok(B.Vector3.Distance(crown.position,socket.getAbsolutePosition())<1e-5,'combat crown stays on the imported head');
  Object.assign(q,{mode:'idle',vx:2,vz:0});g.world.syncQueen(q,1,.2);assert.equal(g.world.finale.combatClip,'Walk');
  const walk=g.scene.animationGroups.find(group=>group.name==='Walk'),leg=walk.targetedAnimations.find(a=>a.target.name.includes('Thigh'))||walk.targetedAnimations[0];
  const before=leg.target.rotationQuaternion.clone();g.world.syncQueen(q,1.2,.2);assert.ok(B.Quaternion.Distance(before,leg.target.rotationQuaternion)>1e-4,'walking deforms the real skeleton');
  q.mode='warn';q.attack='slam';q.target={x:2,z:8};g.world.syncQueen(q,1.4,.02);assert.equal(g.world.finale.combatClip,'Threat');
  q.foam=3;g.world.syncQueen(q,1.5,.02);assert.equal(g.world.finale.combatClip,'Idle');assert.equal(g.scene.getMeshByName('queen foam coating').isEnabled(),false,'legacy foam blob stays hidden');assert.equal(g.world.finale.combatAppearance.foam,1,'foam coats the actual shell');
  q.phase=1;q.armor=4.5;q.foam=0;g.world.syncQueen(q,1.55,.02);assert.equal(g.world.finale.combatAppearance.armor,.5,'armor sheen tracks each phase’s armor capacity');
  q.open=4;q.armor=0;g.world.syncQueen(q,1.6,.02);assert.equal(g.world.finale.combatAppearance.open,1);assert.equal(g.world.finale.combatAppearance.armor,0);
  assert.equal(g.scene.getMeshByName('exposed royal heart').isEnabled(),false,'no floating heart on imported queen');
  assert.ok(g.scene.meshes.filter(m=>m.name==='breakable resin plate').every(m=>!m.isEnabled()),'no old armor ellipsoids');
  assert.ok(g.scene.materials.some(m=>m.pluginManager?.getPlugin('QueenShellCue')),'shell cue is bound to the real material');
  g.reset();g.world.syncQueen(g.state.queen,2,0);assert.equal(g.world.finale.combatRoot,rig,'restart reuses the imported actor');assert.equal(rig.isEnabled(),true);
 }
 // Slam effects retain the exact danger target, cancel warnings, and reuse a fixed pool.
 g.reset();assertCrownSocket();const slamQ=g.state.queen;Object.assign(slamQ,{mode:'warn',attack:'slam',timer:.7,target:{x:2,z:8}});
 g.world.syncQueen(slamQ,1,.02);
 const countdown=g.scene.getMeshByName('slam countdown');assert.ok(countdown.isEnabled());assert.equal(countdown.position.x,2);
 slamQ.mode='recover';slamQ.foam=3;g.world.syncQueen(slamQ,1.02,.02);assert.equal(countdown.isEnabled(),false,'foam cancels telegraph');
 const meshCount=g.scene.meshes.length;
 g.world.queenSlam({x:2,z:8});g.world.animate(1.25);
 const impact=g.scene.getTransformNodeByName('slam impact');assert.ok(impact.isEnabled());assert.equal(impact.position.z,8);
 assert.ok(g.scene.getMeshByName('slam flying stone').position.y>.5,'debris rises above ground');
 g.world.animate(4.1);assert.equal(impact.isEnabled(),false,'impact expires');
 for(let i=0;i<8;i++){g.world.queenSlam({x:i,z:8});g.world.animate(1.3);}
 assert.equal(g.scene.meshes.length,meshCount,'repeated slams allocate no new meshes');
 g.world.resetChapter();assert.equal(impact.isEnabled(),false,'restart clears debris');

 // Completing a queen phase must not silently foam the whole colony.
 g.reset();g.teleport(0,0,4);g.step(.02);Object.assign(g.state.queen,{armor:0,hp:.1,open:8});
 const liveAnts=g.ants.filter(a=>a.state==='alive');assert.ok(liveAnts.every(a=>a.foam===0));
 g.state.weapon=1;g.state.tank=31;g.state.health=3;g.primaryAction();assert.equal(g.state.queen.phase,1);assert.ok(Math.abs(g.state.tank-30.3)<1e-8,'phase change preserves spent fuel');assert.equal(g.state.health,3,'phase change has no hidden health refill');
 assert.ok(liveAnts.every(a=>a.foam===0),'queen phase transition does not apply unsolicited foam');
 assert.ok(liveAnts.every(a=>!a.foamMesh.isEnabled()),'no giant blobs appear between phases');
 g.reset();if(useImported){const egg=g.scene.getTransformNodeByName('throwable egg');assert.equal(egg.metadata.importedEgg,true,'ground and held eggs use the new mesh');}
 g.reset();assert.equal(g.state.chapter,5);assert.equal(g.state.queen.mode,'dormant');assert.equal(g.world.eggSpawns.length,24);
 const initial=g.ants.map(a=>({x:a.x,z:a.z,type:a.type}));
 for(let i=0;i<80;i++)g.step(.02);
 assert.equal(g.state.queen.mode,'dormant');
 for(const type of ['worker','soldier'])assert.ok(g.ants.some((a,i)=>a.type===type&&Math.hypot(a.x-initial[i].x,a.z-initial[i].z)>.15),type+' moves before arena entry');
 g.reset();
 for(const a of g.ants){a.x=22;a.z=22;a.root.position.set(22,0,22);}
 g.teleport(0,0,8);g.step(.02);assert.equal(g.state.queen.mode,'idle');
 function advance(seconds){for(let t=0;t<seconds;t+=.02){g.step(.02);if(!g.state.won)g.world.syncQueen(g.state.queen,t,.02);}}
 function aim(){
  // Keep the damage-wiring fixture clear of returning repair workers and guards.
  // Without the old automatic phase foam, they can now walk back during this long test.
  for(const a of g.ants){a.x=22;a.z=22;a.root.position.set(22,a.y,22);}
  const q=g.state.queen;g.teleport(q.x,0,q.z+7);g.camera.setTarget(new B.Vector3(q.x,1.8,q.z));g.camera.getViewMatrix(true);}
 function shot(){aim();g.state.ammo=3;g.state.ammoKinds=['egg','egg','egg'];g.state.weapon=0;g.primaryAction();for(let i=0;i<60;i++)g.effectsStep(.02);advance(.45);}
 shot();assert.ok(g.state.queen.armor<6,'egg projectile hits queen armor');shot();shot();assert.equal(g.state.queen.armor,0);
 for(let phase=0;phase<3;phase++){
  assert.equal(g.state.queen.phase,phase);
  if(phase>0){advance(6.1);if(phase===1){shot();shot();shot();shot();}else{g.state.weapon=2;aim();g.primaryAction();for(let i=0;i<50;i++)g.effectsStep(.02);}}
  // Complete the fight using real spray actions and visits to supply stations.
  for(let i=0;i<240&&g.state.queen.phase===phase&&!g.state.ended;i++){
   if(g.state.tank<8){const supply=g.world.bench;g.teleport(supply.x,0,supply.z);g.step(.02);assert.equal(g.state.tank,100,'fight refills by visiting supplies');}
   aim();g.state.weapon=1;g.state.invulnerable=100;
   if(phase===2&&g.state.queen.open<=0)g.state.queen.open=8; // Isolate damage wiring; warning/recovery rules have independent tests.
   g.primaryAction();advance(.1);
  }
  assert.ok(g.state.queen.phase>phase||g.state.won,'spray progresses phase '+phase);
 }
 assert.equal(g.state.won,true);assert.equal(g.state.queen.mode,'dead');assert.equal(g.state.ended,true);assert.match(document.getElementById('ending-title').textContent,/Marin/);
 assert.equal(document.getElementById('theme-music').src,'assets/marin-vs-the-colony.mp3');
 assert.equal(g.state.cinematic,true);assert.equal(document.getElementById('ending').hidden,true,'win panel waits for film');
 const crown=g.scene.getTransformNodeByName('royal crown'),queen=g.scene.getTransformNodeByName('THE QUEEN');assert.equal(crown.parent,null,'crown detaches for the fall');assert.equal(g.hero.root.isEnabled(),false,'gameplay Marin hides during the film');assert.equal(g.scene.getTransformNodeByName('Marin body').isEnabled(),false,'no old feet remain during the film');
 if(useImported){assert.equal(g.world.finale.combatAppearance.open,0,'defeat clears combat glow');assert.equal(g.world.finale.combatAppearance.foam,0);assert.equal(queen.isEnabled(),false);assert.equal(g.scene.getTransformNodeByName('Meshy finale queen').isEnabled(),true);assert.equal(g.scene.getMeshByName('DetachableCrown').parent.name,'Meshy royal crown');}
 if(useImported){
  crown.computeWorldMatrix(true);
  const socket=g.scene.getTransformNodeByName('CrownSocket');socket.computeWorldMatrix(true);
  const crownUp=B.Vector3.TransformNormal(B.Axis.Y,crown.getWorldMatrix()).normalize(),headUp=B.Vector3.TransformNormal(B.Axis.Y,socket.getWorldMatrix()).normalize();
  assert.ok(B.Vector3.Dot(crownUp,headUp)>.99,'textured crown follows the queen head upright');
 }
 const elapsed=g.world.finale.time;document.getElementById('cinematic-toggle').onclick();advance(1);assert.equal(g.world.finale.time,elapsed,'film pauses');document.getElementById('cinematic-toggle').onclick();
 const fleeing=g.ants.filter(a=>a.state==='fleeing');assert.ok(fleeing.length>0);const antStart={x:fleeing[0].x,z:fleeing[0].z};
 advance(4);assert.ok(queen.rotation.z>2.5,'queen rolls over');assert.ok(crown.rotation.x>.01&&crown.scaling.x<1,'crown rolls and shrinks after landing');assert.ok(Math.hypot(fleeing[0].x-antStart.x,fleeing[0].z-antStart.z)>1,'survivors flee');
 advance(6.5);
 const hero=g.scene.getTransformNodeByName('victory Marin');
 if(useImported){const gold=g.scene.getMeshByName('DetachableCrown').material;assert.ok(Math.abs(gold.roughness-.26)<1e-8,'rolling crown reaches its polished finish');assert.ok(Math.abs(gold.emissiveColor.r-.28)<1e-8,'crown brightens during its roll');}
 const crownDistance=Math.hypot(hero.position.x-crown.position.x,hero.position.z-crown.position.z);
 assert.ok(crownDistance>.85&&crownDistance<1.05,'small crown rests just ahead of her feet');
 assert.ok(Math.abs(crown.scaling.x-(useImported?.115:.36))<.001,'crown finishes shrinking during the roll');assert.ok(Math.abs(crown.position.y-(.02+1.42*crown.scaling.x))<.001,'small crown rests on its circular band');
 crown.computeWorldMatrix(true);const crownAxis=B.Vector3.TransformNormal(B.Axis.Y,crown.getWorldMatrix()).normalize();assert.ok(Math.abs(crownAxis.y)<.001,'points face sideways instead of tumbling over the floor');
 advance(2);assert.ok(crown.position.y>.6,'Marin lifts the small crown');
 assert.ok(Math.abs(crown.scaling.x-(useImported?.115:.36))<.001,'crown reaches wearable size before lift-off');
 if(useImported){
  advance(3.5);assertCrownSocket();crown.computeWorldMatrix(true);
  const head=crown.parent.parent;head.computeWorldMatrix(true);
  const crownHeight=crown.getAbsolutePosition().y-head.getAbsolutePosition().y;
  assert.ok(crownHeight>.24&&crownHeight<.45,'coronet rests at the top of her hair rather than behind the shoulders or floating overhead');
  advance(25);
 }else advance(29);
 assert.equal(g.state.cinematic,false);assert.equal(document.getElementById('ending').hidden,false);assert.equal(document.getElementById('victory-portrait').hidden,false);
 assert.equal(crown.parent.name,(useImported?'Marin rigged crown socket':'Marin smiling head'));assert.equal(crown.scaling.x,useImported?.115:.36);assert.ok(fleeing.every(a=>!a.root.isEnabled()),'colony disperses');
 assert.match(document.getElementById('ending-title').textContent,/Her home/);assert.match(document.getElementById('ending-copy').textContent,/husband.*son/);assert.match(document.getElementById('ending-copy').textContent,/more insects/);
 document.getElementById('replay-film').onclick();assertCrownSocket();assert.equal(g.state.cinematic,true);assert.ok(g.ants.some(a=>a.state==='fleeing'&&a.root.isEnabled()),'film replay restores the fleeing cast');document.getElementById('cinematic-skip').onclick();assert.equal(g.state.cinematic,false);

 g.reset();if(useImported){assert.ok(Math.abs(g.scene.getMeshByName('DetachableCrown').material.roughness-.42)<1e-8,'restart resets crown polish');assert.equal(queen.isEnabled(),true);assert.equal(g.scene.getTransformNodeByName('Meshy finale queen').isEnabled(),false);}assert.equal(crown.parent.name,'queen body');assert.equal(crown.scaling.x,1);assert.equal(document.getElementById('victory-portrait').hidden,true);assert.equal(g.state.queen.mode,'dormant');assert.equal(g.state.queen.phase,0);assert.equal(g.state.health,5);assert.equal(g.state.ended,false);
 g.state.tank=0;g.state.health=1;g.teleport(g.world.supplyPoints[0].x,0,g.world.supplyPoints[0].z);g.interact();assert.equal(g.state.tank,100);assert.equal(g.state.health,5);g.interact();
 g.reset();g.teleport(0,0,10);g.step(.02);g.state.queen.phase=1;g.state.queen.hp=30;g.state.queen.armor=9;
 const soldier=g.ants.find(a=>a.type==='soldier');g.hit(soldier,1,'foam');g.hit(soldier,3,'egg');g.teleport(soldier.x,0,soldier.z);g.player.grounded=true;g.jumpAction();assert.equal(g.state.ride,soldier);
 g.teleport(0,0,1.8);g.setKeys('KeyW','KeyC');g.step(.05);g.setKeys();assert.equal(g.state.queen.armor,0,'actual mounted charge exposes queen');
 g.world.syncQueen(g.state.queen,1);

 // The skip control produces the same final scene and does not leak scene objects.

 g.reset();g.teleport(0,0,4);g.step(.02);Object.assign(g.state.queen,{phase:2,armor:0,hp:.1,open:8});g.state.weapon=1;g.primaryAction();
 assert.equal(g.state.cinematic,true);document.getElementById('cinematic-skip').onclick();assert.equal(g.state.cinematic,false);assert.equal(crown.parent.name,(useImported?'Marin rigged crown socket':'Marin smiling head'));assert.equal(document.getElementById('ending').hidden,false);
 g.reset();assert.equal(g.scene.getTransformNodeByName('victory Marin').isEnabled(),false);assert.equal(crown.parent.name,'queen body');
 // A loss never starts the victory sequence.
 g.state.health=1;g.teleport(0,0,8);g.step(.02);Object.assign(g.state.queen,{mode:'warn',attack:'slam',timer:.001,target:{x:0,z:8}});g.step(.02);
 assert.equal(g.state.won,false);assert.equal(g.state.ended,true);assert.equal(g.state.cinematic,false);assert.equal(document.getElementById('ending').hidden,false);
 console.log('PASS victory film, crown fall/pickup/coronation, fleeing ants, pause/skip/restart/loss; pre-battle worker/soldier movement; mounted charge; real scene creation, egg projectiles, spray across all three phases, victory, music reprise, restart, single supply station');
 g.scene.dispose();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
