// Exercise the supplied GLB and Babylon's real rig/animation loader without a browser.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..');
const B=require(path.join(root,'vendor/babylon.js'));
const loaderContext={BABYLON:B,console,setTimeout,clearTimeout,TextDecoder,Uint8Array,ArrayBuffer};loaderContext.self=loaderContext;
vm.runInNewContext(fs.readFileSync(path.join(root,'vendor/babylonjs.loaders.min.js'),'utf8'),loaderContext);
const bytes=fs.readFileSync(path.join(root,'assets/models/marin.glb')),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
B.SceneLoader.LoadAssetContainerAsync=async(_root,_file,scene)=>{
 const bytes=fs.readFileSync(path.join(root,_file)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
 const loader=new loaderContext.LOADERS.GLTFFileLoader();loader.animationStartMode=0;loader.skipMaterials=true;
 return loader.loadAssetContainerAsync(scene,{json,bin:{byteLength:bin.length,readAsync:(o,n)=>Promise.resolve(new Uint8Array(bin.buffer,bin.byteOffset+o,n))}},'');
};
(async()=>{
 const {loadRiggedMarin,victoryDanceAt,MARIN_CROWN_FIT}=await import(path.join(root,'marin-rigged.mjs'));
 const engine=new B.NullEngine(),scene=new B.Scene(engine),actor=await loadRiggedMarin(B,scene);
 assert.ok(actor.backpack,'real backpack is attached');assert.equal(actor.backpack.root.isEnabled(),false);actor.setBackpack(true);assert.equal(actor.backpack.root.isEnabled(),true);
 assert.equal(actor.groups.length,13);assert.equal(actor.container.skeletons.length,1);
 const crown=new B.TransformNode('test crown',scene);crown.parent=actor.head;crown.position.set(MARIN_CROWN_FIT.x,MARIN_CROWN_FIT.height,0);crown.scaling.setAll(MARIN_CROWN_FIT.scale);
 const positions=[],packPositions=[];
 for(const name of ['Idle_15','Walking','Running','Jump_Over_Obstacle_2','Male_Bend_Over_Pick_Up','Boom_Dance','Love_You_Pop_Dance','Breakdance_1990']){
  for(const t of [0,.2,.4]){
   actor.sample(name,t);crown.computeWorldMatrix(true);actor.backpack.root.computeWorldMatrix(true);packPositions.push(actor.backpack.root.getAbsolutePosition().clone());
   const packScale=new B.Vector3(),packQ=new B.Quaternion(),packP=new B.Vector3();actor.backpack.root.getWorldMatrix().decompose(packScale,packQ,packP);assert.ok(Math.abs(Math.abs(packScale.x)-1)<.001,'pack socket keeps unit scale through animation');
   const p=crown.getAbsolutePosition();assert.ok(p.asArray().every(Number.isFinite));assert.ok(p.y>-.5&&p.y<5,name+' crown remains at character scale');
   const scale=new B.Vector3(),q=new B.Quaternion(),translation=new B.Vector3();crown.getWorldMatrix().decompose(scale,q,translation);
   assert.ok(Math.abs(Math.abs(scale.x)-.115)<.001,'crown retains unit socket scaling');positions.push(p.clone());
  }
 }
 assert.ok(packPositions.some(p=>B.Vector3.Distance(p,packPositions[0])>.05),'backpack follows torso during running and dances');
 assert.ok(positions.some(p=>B.Vector3.Distance(p,positions[0])>.05),'head socket follows dance motion');
 actor.sample('Boom_Dance',2);const a=actor.head.getAbsolutePosition().clone();actor.sample('Walking',.4);actor.sample('Boom_Dance',2);
 assert.ok(B.Vector3.Distance(a,actor.head.getAbsolutePosition())<.0001,'replay samples the same pose');
 assert.deepEqual([0,8,19,23].map(t=>victoryDanceAt(t).name),['Boom_Dance','Love_You_Pop_Dance','Breakdance_1990','Boom_Dance']);
 for(const t of [10,11.5,12,13,14,14.9,15,15.5,16.4,17]){
  actor.finalePose(t,{},false);actor.rightHand.computeWorldMatrix(true);
  assert.ok(actor.rightHand.getAbsolutePosition().asArray().every(Number.isFinite),'pickup/placement arm pose is finite');
 }
 actor.finalePose(14.9,{},false);actor.rightHand.computeWorldMatrix(true);actor.head.computeWorldMatrix(true);
 assert.ok(actor.rightHand.getAbsolutePosition().y>actor.head.getAbsolutePosition().y+.2,'hand reaches above the head for crown placement');
 // Check the actual joints across clip changes, loop seams and arm release.
 const joints=actor.container.transformNodes.filter(n=>n.name.startsWith('mixamorig:'));
 const poseAt=t=>{
  actor.finalePose(t,{},false);
  return joints.map(n=>{n.computeWorldMatrix(true);return n.getAbsolutePosition().clone();});
 };
 const boundaries=[6,6.35,9.5,10,11.5,13,14.6,15,16,16.5,16.95,16.5+7.2083335,24.5,24.95,24.5+10.041667,35.5,35.95,35.5+.541667,39.5];
 for(const t of boundaries){
  const before=poseAt(t-.0001),after=poseAt(t+.0001);
  const jump=Math.max(...after.map((p,i)=>B.Vector3.Distance(p,before[i])));
  assert.ok(jump<.015,'no pose snap at '+t+' seconds; jump '+jump);
 }
 const blended=poseAt(16.72);poseAt(11.5);const replayed=poseAt(16.72);
 assert.ok(replayed.every((p,i)=>B.Vector3.Distance(p,blended[i])<.00001),'blended poses replay deterministically');
 console.log('PASS actual Marin GLB: thirteen clips, real rig, dance cycle, repeatable sampling, moving crown socket at correct scale');
 assert.ok(positions[0].y>2.8&&positions[0].y<3.3,'model and crown normalize to game scale');actor.dispose();engine.dispose();
})().catch(error=>{console.error(error);process.exitCode=1;});
