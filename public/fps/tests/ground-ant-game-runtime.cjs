const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fpsRoot=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..');
const B=require(path.join(fpsRoot,'vendor/babylon.js'));
const loaderCtx={BABYLON:B,console,setTimeout,clearTimeout,TextDecoder,Uint8Array,ArrayBuffer};loaderCtx.self=loaderCtx;
vm.runInNewContext(fs.readFileSync(path.join(fpsRoot,'vendor/babylonjs.loaders.min.js'),'utf8'),loaderCtx);
const fetches=new Map();
B.SceneLoader.LoadAssetContainerAsync=async(_r,file,scene)=>{
 fetches.set(file,(fetches.get(file)||0)+1);const bytes=fs.readFileSync(path.join(fpsRoot,file)),n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
 const loader=new loaderCtx.LOADERS.GLTFFileLoader();loader.animationStartMode=0;loader.skipMaterials=true;
 const container=await loader.loadAssetContainerAsync(scene,{json,bin:{byteLength:bin.length,readAsync:(o,n)=>Promise.resolve(new Uint8Array(bin.buffer,bin.byteOffset+o,n))}},'');
 if(/(?:worker|soldier|flyer)-rigged/.test(file)){
  const shell=new B.PBRMaterial('offline ant shell',scene);container.materials.push(shell);
  for(const mesh of container.meshes)if(mesh.skeleton)mesh.material=shell;
 }
 return container;
};
async function runChapter(chapter){
fetches.clear();
const draw=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:100})},{get:(o,k)=>o[k]||(()=>{})});
class Texture extends B.Texture{constructor(name,size,scene){super(null,scene);this.name=name;}getContext(){return draw;}update(){}}
class Engine extends B.NullEngine{constructor(){super({renderWidth:1280,renderHeight:720,textureSize:64,deterministicLockstep:true,lockstepMaxSteps:4});}static isSupported(){return true;}runRenderLoop(fn){this.frame=fn;}setHardwareScalingLevel(){} }
const nodes=new Map();
function node(id=''){return {id,dataset:{},hidden:false,disabled:true,value:id==='sensitivity'?'1':id==='music-volume'?'.28':'keyboard',checked:true,textContent:'',children:[],style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},position:{},
 get innerHTML(){return this.html||'';},set innerHTML(v){this.html=v;this.children=[...v.matchAll(/<span/g)].map(()=>node());},
 append(n){this.children.push(n);},setAttribute(){},querySelector(){return node();},addEventListener(){},focus(){},pause(){},play(){return Promise.resolve();},getContext(){return draw;}};}
const handlers={};const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},querySelector:s=>document.getElementById(s.slice(1)),querySelectorAll:()=>[],createElement:()=>node(),addEventListener(name,fn){handlers[name]=fn;},pointerLockElement:null};
const window={BABYLON:{...B,Engine,DynamicTexture:Texture},devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
const context=vm.createContext({window,document,console,performance,URLSearchParams,location:{search:'?chapter='+chapter+'&debug=1'},localStorage:{getItem(){return null;},setItem(){}},setTimeout:()=>0,clearTimeout(){}});
const cache=new Map();
function mod(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}


 const root=mod(path.join(fpsRoot,'game.mjs'));await root.link((specifier,parent)=>mod(path.resolve(path.dirname(parent.identifier),specifier)));await root.evaluate();
 const g=window.antagonized;g.reset();const old=g.ants.slice();g.reset();
 assert.deepEqual(Array.from(await g.groundAntsReady),[true,chapter!==1]);await g.flyerReady;await g.heroReady;await g.world.finale?.ready;await g.world.propsReady;
 assert.ok(old.every(a=>a.root.isDisposed()),'reset during loading discards the old cast');
 // The real handle stays in the glove, and the hose stays on its connector, through motion and aim.
 const hero=g.hero;assert.ok(hero.sprayer);assert.equal(hero.tool.parent,hero.rig.rightHand,'sprayer is attached to the actual hand socket');
 const handMesh=hero.sprayer.model.meshes.find(m=>m.getTotalVertices()>0),wrist=hero.rig.container.transformNodes.find(n=>n.name==='mixamorig:RightHand');
 Object.assign(g.state,{gear:true,weapon:1,ride:null});
 let tubeGeometry=null,meshCount=null;
 for(const [speed,grounded,pitch,heading] of [[0,true,0,0],[2.1,true,0,.8],[2.1,true,-.5,1.4],[2.1,true,.5,2.1],[0,false,0,Math.PI]]){
  Object.assign(g.player,{x:3,y:grounded?0:.4,z:20,grounded});
  hero.update(g.player,g.state,{x:pitch,y:heading},.1,{speed,moveYaw:heading});
  const grip=B.Vector3.TransformCoordinates(new B.Vector3(.025,-.15,.335),handMesh.computeWorldMatrix(true));
  const palm=wrist.getAbsolutePosition().add(B.Vector3.TransformNormal(B.Axis.Y,wrist.computeWorldMatrix(true)).normalize().scale(.052));
  assert.ok(B.Vector3.Distance(grip,palm)<.0001,'handle stays in the glove during running, jumping and aiming');
  const barrel=B.Vector3.TransformNormal(B.Axis.Z,hero.tool.computeWorldMatrix(true)).normalize(),expected=B.Vector3.TransformNormal(B.Axis.Z,B.Matrix.RotationYawPitchRoll(heading,pitch,0)).normalize();
  assert.ok(B.Vector3.Dot(barrel,expected)>.999,'sprayer barrel follows the aim direction');
  const positions=hero.hose.getVerticesData(B.VertexBuffer.PositionKind),ring=positions.length/13/3;
  function center(index){const point=B.Vector3.Zero();for(let i=0;i<ring-1;i++)point.addInPlace(B.Vector3.FromArray(positions,(index*ring+i)*3));return point.scale(1/(ring-1));}
  assert.ok(B.Vector3.Distance(center(12),hero.sprayer.port.computeWorldMatrix(true).getTranslation())<.002,'hose ends on the sprayer connector');
  const tankPort=B.Vector3.TransformCoordinates(new B.Vector3(.12,-.18,-.24),hero.rig.back.computeWorldMatrix(true));
  assert.ok(B.Vector3.Distance(center(0),tankPort)<.002,'hose starts on the backpack connector');
  if(tubeGeometry){assert.equal(hero.hose.geometry,tubeGeometry);assert.equal(g.scene.meshes.length,meshCount,'moving hose reuses its mesh');}
  else{tubeGeometry=hero.hose.geometry;meshCount=g.scene.meshes.length;}
 }
 g.state.weapon=0;g.state.cannon=true;hero.update(g.player,g.state,{x:0,y:0},.02);assert.equal(hero.tool.isEnabled(),true);assert.equal(hero.hose.isEnabled(),true,'cannon mode keeps the equipped gun connected to her tank');
 if(chapter!==1){g.state.ride=g.ants.find(a=>a.type==='soldier');hero.update(g.player,g.state,{x:0,y:0},.02);assert.equal(hero.tool.isEnabled(),false);assert.equal(hero.hose.isEnabled(),false,'mounting stows the gun and hose');}
 g.state.ride=null;g.state.weapon=0;g.state.cannon=false;hero.update(g.player,g.state,{x:0,y:0},.02);assert.equal(hero.tool.isEnabled(),false,'throw mode frees her hand');
 hero.hide();assert.equal(hero.hose.isEnabled(),false,'first-person view hides the third-person hose');g.reset();
 const workers=g.ants.filter(a=>a.type==='worker'),soldiers=g.ants.filter(a=>a.type==='soldier');
 assert.ok(workers.length);assert.equal(soldiers.length,chapter===1?0:chapter===5?2:3);assert.ok([...workers,...soldiers].every(a=>a.rig),'both models replace all live ground ants');
 assert.equal(fetches.get('assets/models/worker-rigged.glb'),1);assert.equal(fetches.get('assets/models/soldier-rigged.glb'),chapter===1?undefined:1);
 assert.notEqual(workers[0].rig.skeletons[0],workers[1].rig.skeletons[0],'worker poses are independent');
 assert.equal(workers[0].rig.meshes.find(m=>m.skeleton).geometry,workers[1].rig.meshes.find(m=>m.skeleton).geometry,'worker geometry is shared');
 for(let i=0;i<10;i++)g.step(.04);
 assert.ok(workers.some(a=>a.rig.clip==='Walk'),'workers walk to their jobs');
 for(const type of ['worker','soldier']){
  const ant=g.ants.find(a=>a.type===type);if(!ant)continue;const saved={x:ant.x,z:ant.z};
  assert.ok(Math.abs(ant.root.position.y-ant.y)<1e-7,'ground ant no longer has a rapid artificial bob');
  const duration=type==='worker'?1.2:1.6,scale=type==='worker'?.7:1.65,stride=.56*scale/.65;
  const foot=ant.rig.root.getDescendants().find(n=>n.name.endsWith('L_Front_Foot'));
  function plantedAt(time){
   ant.root.rotation.set(0,0,0);ant.root.position.set(0,0,time/duration*stride);ant.rig.sample('Walk',time,1);
   ant.root.computeWorldMatrix(true);ant.rig.root.getDescendants().forEach(n=>n.computeWorldMatrix?.(true));return foot.getAbsolutePosition().clone();
  }
  const start=plantedAt(.1),end=plantedAt(.2);assert.ok(Math.abs(end.z-start.z)<.035,'stance foot stays planted as '+type+' body advances');
  ant.root.position.set(saved.x,ant.y,saved.z);
 }
 if(soldiers.length){
 const soldier=soldiers[0],otherSoldier=soldiers[1];
 const soldierMesh=soldier.rig.meshes.find(m=>m.skeleton),otherMesh=otherSoldier.rig.meshes.find(m=>m.skeleton);
 assert.notEqual(soldierMesh.material,otherMesh.material,'foam material is isolated per ant');
 assert.equal(soldier.rig.foam.plugins.length,1,'real shell gets a foam shader');
 assert.equal(soldier.rig.foam.state.amount,0,'unfoamed soldier retains its original appearance');
 g.hit(soldier,1,'foam');g.step(.03);assert.equal(soldier.rig.clip,'Subdued');
 assert.equal(soldier.foamMesh.isEnabled(),false,'imported soldier never enables the giant enclosing blob');
 assert.equal(soldier.rig.foam.state.amount,1);assert.equal(otherSoldier.rig.foam.state.amount,0,'foam does not coat neighboring ants');
 soldier.foam=.25;g.step(.01);assert.ok(soldier.rig.foam.state.amount>0&&soldier.rig.foam.state.amount<1,'coating fades as foam expires');
 soldier.foam=0;g.step(.01);assert.equal(soldier.rig.foam.state.amount,0,'expired foam restores the shell');
 g.hit(soldier,1,'foam');
 g.teleport(soldier.x,soldier.y,soldier.z);g.player.grounded=true;g.jumpAction();assert.equal(g.state.ride,soldier);assert.equal(soldier.rig.foam.state.amount,0,'mounting clears the surface coating');
 handlers.keydown({code:'KeyW',key:'w',preventDefault(){},repeat:false});g.step(.1);assert.equal(soldier.rig.clip,'Walk','mounted soldier walks despite foam');
 handlers.keyup({code:'KeyW',key:'w'});g.primaryAction();g.step(.02);assert.equal(soldier.rig.clip,'Bite','mounted attack articulates mandibles');
 g.jumpAction();assert.equal(g.state.ride,null);g.step(.02);assert.equal(soldier.rig.clip,'Subdued','dismount returns to subdued pose');assert.equal(soldier.rig.foam.state.amount,1,'subdued soldier remains readable after dismount');assert.equal(soldier.foamMesh.isEnabled(),false);
 }
 const worker=workers[0];g.teleport(20,0,20);g.hit(worker,1,'foam');assert.equal(worker.rig.foam.state.amount,1);assert.equal(worker.foamMesh.isEnabled(),false);g.hit(worker,10,'stomp');assert.equal(worker.rig.foam.state.amount,0,'a carcass has no foam covering');g.step(.2);assert.equal(worker.rig.clip,'Stomp');g.step(1);
 assert.equal(worker.root.scaling.y,1,'stomp uses the actual rig instead of crushing its container');
 worker.rig.root.computeWorldMatrix(true);worker.rig.root.getDescendants().forEach(n=>n.computeWorldMatrix?.(true));worker.rig.skeletons.forEach(s=>s.prepare(true));
 const mesh=worker.rig.meshes.find(m=>m.skeleton),positions=mesh.getPositionData(true,true),matrix=mesh.getWorldMatrix();let low=Infinity;
 for(let i=0;i<positions.length;i+=3)low=Math.min(low,B.Vector3.TransformCoordinates(new B.Vector3(positions[i],positions[i+1],positions[i+2]),matrix).y);
 assert.ok(low>=worker.y-.01,'stomped mesh remains above its supporting floor');
 g.state.weapon=0;g.state.ammo=0;g.teleport(worker.x,worker.y,worker.z);g.step(.1);assert.ok(g.state.ammo>0,'walk-over carcass pickup works');
 g.state.ammo=1;g.state.ammoKinds=['carcass'];g.primaryAction();assert.ok(g.scene.transformNodes.some(n=>n.name.startsWith('worker ')&&n.name.endsWith('model')&&n.parent?.name==='worker'),'carried/thrown worker uses imported model');
 const size=()=>[g.scene.meshes.length,g.scene.skeletons.length,g.scene.animationGroups.length,g.scene.materials.length];g.reset();const baseline=size();
 for(let i=0;i<4;i++){g.reset();assert.deepEqual(size(),baseline,'restart releases cloned ground-ant rigs');}
 assert.equal(fetches.get('assets/models/worker-rigged.glb'),1);assert.equal(fetches.get('assets/models/soldier-rigged.glb'),chapter===1?undefined:1);
 // Reinforcement spawns also inherit the loaded models.
 g.teleport(20,0,20);for(const ant of g.ants.filter(a=>a.type==='worker').slice(0,8))g.hit(ant,10,'spray');g.step(36);
 assert.ok(g.ants.filter(a=>a.type==='worker').every(a=>a.rig),'new worker waves use the imported rig');
 g.scene.dispose();g.scene.getEngine().dispose();console.log('PASS chapter '+chapter+': shared independent rigs, walking, foam, mount/bite/dismount, grounded stomp, pickup, projectiles, reinforcements and restart cleanup');
}
(async()=>{
 if(process.env.ANTAGONIZED_TEST_CHAPTER){await runChapter(Number(process.env.ANTAGONIZED_TEST_CHAPTER));return;}
 // Separate VM-backed games release their imported animation data between chapters.
 const {spawnSync}=require('node:child_process');
 for(const chapter of [1,2,3,4,5]){
  const child=spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,ANTAGONIZED_TEST_CHAPTER:String(chapter)},stdio:'inherit'});
  if(child.error)throw child.error;if(child.status!==0)throw new Error('Chapter '+chapter+' checks failed: '+(child.signal||child.status));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
