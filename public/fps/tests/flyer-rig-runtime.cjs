// Load the supplied rig with Babylon, validate deformation and cloned live actors.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..'),B=require(path.join(root,'vendor/babylon.js'));
const ctx={BABYLON:B,console,setTimeout,clearTimeout,TextDecoder,Uint8Array,ArrayBuffer};ctx.self=ctx;
vm.runInNewContext(fs.readFileSync(path.join(root,'vendor/babylonjs.loaders.min.js'),'utf8'),ctx);
const bytes=fs.readFileSync(path.join(root,'assets/models/flyer-rigged.glb')),n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
B.SceneLoader.LoadAssetContainerAsync=async(_r,_f,scene)=>{const loader=new ctx.LOADERS.GLTFFileLoader();loader.animationStartMode=0;loader.skipMaterials=true;const asset=await loader.loadAssetContainerAsync(scene,{json,bin:{byteLength:bin.length,readAsync:(o,n)=>Promise.resolve(new Uint8Array(bin.buffer,bin.byteOffset+o,n))}},'');asset.meshes.filter(m=>m.skeleton).forEach(m=>m.material=new B.StandardMaterial('shared flyer material',scene));return asset;};
(async()=>{
 assert.equal(json.skins[0].joints.length,40);assert.ok(json.materials.some(m=>m.alphaMode==='BLEND'&&m.doubleSided),'wing membranes have their own translucent material');
 const {loadFlyerFactory,flyerPose}=await import(path.join(root,'flyer-rigged.mjs'));
 const engine=new B.NullEngine(),scene=new B.Scene(engine),factory=await loadFlyerFactory(B,scene);assert.ok(factory);
 const a=factory.create(),b=factory.create();assert.equal(a.groups.size,5);assert.equal(a.groups.has('Walk'),false);
 assert.notEqual(a.skeletons[0],b.skeletons[0],'actors have independent skeletons');
 const skin=a.meshes.filter(m=>m.skeleton);assert.equal(skin.length,2);assert.ok(skin.reduce((sum,m)=>sum+m.getTotalIndices()/3,0)<100000);
 for(const m of skin){
  const w=m.getVerticesData(B.VertexBuffer.MatricesWeightsKind),inds=m.getVerticesData(B.VertexBuffer.MatricesIndicesKind);
  for(let i=0;i<w.length;i+=4){assert.ok(Math.abs(w[i]+w[i+1]+w[i+2]+w[i+3]-1)<1e-5);for(let k=0;k<4;k++)assert.ok(inds[i+k]>=0&&inds[i+k]<40);}
  const used=new Set(inds.filter((_,i)=>w[i]>.05));for(const side of ['L','R'])for(const suffix of ['Wing','WingFlex','WingTip'])assert.ok(used.has(m.skeleton.bones.findIndex(b=>b.name.endsWith(side+'_'+suffix))),'weighted '+side+' '+suffix);
 }
 const update=actor=>{actor.root.computeWorldMatrix(true);actor.root.getDescendants().forEach(n=>n.computeWorldMatrix?.(true));actor.skeletons.forEach(s=>s.prepare(true));actor.meshes.forEach(m=>m.refreshBoundingInfo(true));};
 for(const [clip,group] of a.groups){
  const duration=(group.to-group.from)/(group.targetedAnimations[0].animation.framePerSecond||60);let before,after,moved=false;let longest=0;
  for(let i=0;i<=40;i++){
   a.sample(clip,duration*i/40);update(a);
   const pose=skin.map(m=>Array.from(m.getPositionData(true,true)));
   if(!before)before=pose;else if(pose.some((p,mi)=>p.some((v,k)=>Math.abs(v-before[mi][k])>.01)))moved=true;
   after=pose;let groundMin=Infinity;
   for(let mi=0;mi<skin.length;mi++){
    const faces=skin[mi].getIndices(),p=pose[mi];assert.ok(p.every(Number.isFinite));
    let minY=Infinity;for(const idx of faces)minY=Math.min(minY,p[idx*3+1]);
    groundMin=Math.min(groundMin,minY);
    for(let e=0;e<faces.length;e+=3)for(let k=0;k<3;k++){const ai=faces[e+k]*3,bi=faces[e+(k+1)%3]*3;longest=Math.max(longest,Math.hypot(p[ai]-p[bi],p[ai+1]-p[bi+1],p[ai+2]-p[bi+2]));}
   }
   if(['Defeat','Grounded'].includes(clip))assert.ok(Math.abs(groundMin+.266808)<.005,'ground contact is maintained');
  }
  if(clip!=='Grounded')assert.ok(moved,clip+' visibly deforms the mesh');
  if(clip!=='Defeat')assert.ok(after.every((p,mi)=>p.every((v,k)=>Math.abs(v-before[mi][k])<.003)),clip+' closes its loop');
  assert.ok(longest<.6,clip+' has bounded skin edges; longest '+longest);console.log(clip+' validated');
 }
 a.sample('Fly',.0625);update(a);b.sample('Grounded',0);update(b);
 const pose=a.skeletons[0].bones.map(n=>n.getTransformNode()?.rotationQuaternion?.asArray());b.sample('Defeat',1);update(b);
 assert.deepEqual(a.skeletons[0].bones.map(n=>n.getTransformNode()?.rotationQuaternion?.asArray()),pose,'changing one actor never changes the other');
 // Check indexed body vertices, not unused wing vertices in the shared vertex buffer.
 a.sample('Defeat',1.4);update(a);
 for(const mesh of skin){
  const p=mesh.getPositionData(true,true),world=mesh.getWorldMatrix();let min=Infinity;
  for(const index of mesh.getIndices()){const i=index*3;min=Math.min(min,B.Vector3.TransformCoordinates(new B.Vector3(p[i],p[i+1],p[i+2]),world).y);}
  if(mesh.name.endsWith('primitive0'))assert.ok(min>=-.005&&min<.01,'dead body rests on the floor rather than balancing on a wing');
  else assert.ok(min>=-.005,'folded wings do not penetrate the floor');
 }
 const meshCount=scene.meshes.length,skeletonCount=scene.skeletons.length,groupCount=scene.animationGroups.length;
 for(let i=0;i<12;i++){const actor=factory.create();actor.sample('Dive',.1);actor.dispose();}
 assert.equal(scene.meshes.length,meshCount);assert.equal(scene.skeletons.length,skeletonCount);assert.equal(scene.animationGroups.length,groupCount,'spawn/reset does not leak animations');
 assert.equal(flyerPose({state:'alive',foam:3}).clip,'Grounded');assert.equal(flyerPose({state:'alive',diving:true}).clip,'Dive');assert.equal(flyerPose({state:'dead',deadTime:.7}).clip,'Defeat');
 a.dispose();b.sample('Fly',.1);b.dispose();factory.dispose();engine.dispose();console.log('PASS real flyer asset: articulated wings, five clips, independent cached actors, grounding and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
