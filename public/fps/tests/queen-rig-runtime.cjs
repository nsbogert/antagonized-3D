// Validate the delivered asset with Babylon's actual glTF loader and skinning.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..');
const B=require(path.join(root,'vendor/babylon.js'));
const ctx={BABYLON:B,console,setTimeout,clearTimeout,TextDecoder,Uint8Array,ArrayBuffer};ctx.self=ctx;
vm.runInNewContext(fs.readFileSync(path.join(root,'vendor/babylonjs.loaders.min.js'),'utf8'),ctx);
(async()=>{
 const bytes=fs.readFileSync(path.join(root,'assets/models/queen-rigged.glb')),n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
 assert.equal(json.skins[0].joints.length,36);
 const engine=new B.NullEngine(),scene=new B.Scene(engine),loader=new ctx.LOADERS.GLTFFileLoader();loader.animationStartMode=0;loader.skipMaterials=true;
 const asset=await loader.loadAssetContainerAsync(scene,{json,bin:{byteLength:bin.length,readAsync:(o,n)=>Promise.resolve(new Uint8Array(bin.buffer,bin.byteOffset+o,n))}},'');asset.addAllToScene();
 const body=asset.meshes.find(m=>m.skeleton&&m.getTotalVertices()>1000),crown=scene.getMeshByName('DetachableCrown');assert.ok(body?.skeleton);assert.ok(crown);assert.equal(crown.parent.name,'CrownSocket');assert.equal(crown.skeleton,null);
 const weights=body.getVerticesData(B.VertexBuffer.MatricesWeightsKind),indices=body.getVerticesData(B.VertexBuffer.MatricesIndicesKind);
 for(let i=0;i<weights.length;i+=4){assert.ok(Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1)<1e-5);for(let k=0;k<4;k++)assert.ok(indices[i+k]>=0&&indices[i+k]<36);}
 const used=new Set(indices.filter((_,i)=>weights[i]>.05));
 for(const side of ['L','R'])for(const leg of ['Front','Middle','Rear']){
  const bone=body.skeleton.bones.find(b=>b.name===side+'_'+leg+'_Lower');assert.ok(bone,'leg has a lower joint');assert.ok(used.has(body.skeleton.bones.indexOf(bone)),'leg has bound vertices');
 }
 const update=()=>{asset.transformNodes.forEach(n=>n.computeWorldMatrix(true));asset.skeletons.forEach(s=>s.prepare(true));body.refreshBoundingInfo(true);};
 for(const group of asset.animationGroups){
  group.start(false);group.pause();
  const snapshots=[];let longest=0;let firstPositions,skinMoved=false;
  for(let i=0;i<=30;i++){
   group.goToFrame(group.from+(group.to-group.from)*i/30);update();
   const box=body.getBoundingInfo().boundingBox;assert.ok([...box.minimum.asArray(),...box.maximum.asArray()].every(Number.isFinite));assert.ok(box.maximum.subtract(box.minimum).length()<4,'no explosive skin deformation in '+group.name);
   const positions=body.getPositionData(true,true),faces=body.getIndices();if(!firstPositions)firstPositions=Array.from(positions);else if(positions.some((v,k)=>Math.abs(v-firstPositions[k])>.002))skinMoved=true; if(group.name==='Defeat'){let minY=Infinity;for(const v of faces)minY=Math.min(minY,positions[v*3+1]);assert.ok(Math.abs(minY+.370818)<.004,'defeat stays on the ground');}for(let e=0;e<faces.length;e+=3)for(let k=0;k<3;k++){const a=faces[e+k]*3,b=faces[e+(k+1)%3]*3;longest=Math.max(longest,Math.hypot(positions[a]-positions[b],positions[a+1]-positions[b+1],positions[a+2]-positions[b+2]));}
   snapshots.push(asset.transformNodes.filter(n=>n.name.includes('_Foot')).map(n=>n.getAbsolutePosition().clone()));
  }
  assert.ok(snapshots.some(frame=>frame.some((p,i)=>B.Vector3.Distance(p,snapshots[0][i])>.002)),group.name+' moves the leg rig');
  if(group.name!=='Defeat')assert.ok(snapshots[0].every((p,i)=>B.Vector3.Distance(p,snapshots.at(-1)[i])<.003),group.name+' loop closes');
  assert.ok(skinMoved,group.name+' deforms the mesh, not only its bones'); assert.ok(longest<.20,group.name+' has no stretched skin spikes'); console.log(group.name+' validated');group.stop();
 }
 crown.setEnabled(false);assert.equal(body.isEnabled(),true,'crown can be hidden independently');
 console.log('PASS queen GLB: six weighted legs, 36 joints, independent crown, normalized weights, four bounded animations and closed loops');asset.dispose();engine.dispose();
})().catch(e=>{console.error(e);process.exitCode=1;});
