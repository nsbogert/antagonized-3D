import {createQueenShell} from './queen-shell.mjs';
// One imported queen actor serves both live combat and the victory sequence.
export async function loadFinaleQueen(B,scene,crown){
 const observer=B.SceneLoader.OnPluginActivatedObservable.add(loader=>{if(loader.name==='gltf')loader.animationStartMode=0;});
 let container;
 try{container=await B.SceneLoader.LoadAssetContainerAsync('','assets/models/queen-rigged.glb',scene);}
 finally{B.SceneLoader.OnPluginActivatedObservable.remove(observer);}
 if(scene.isDisposed){container.dispose();throw new Error('Scene closed while queen was loading');}
 const root=new B.TransformNode('Meshy finale queen',scene),visual=new B.TransformNode('Queen model scale',scene);visual.parent=root;
 const scale=6;visual.scaling.setAll(scale);visual.position.y=.370818*scale;
 container.addAllToScene();container.animationGroups.forEach(g=>g.stop());
 for(const node of [...container.meshes,...container.transformNodes])if(!node.parent)node.parent=visual;
 const crownMesh=container.meshes.find(m=>m.name==='DetachableCrown');
 const socket=container.transformNodes.find(n=>n.name==='CrownSocket');
 const defeat=container.animationGroups.find(g=>g.name==='Defeat');
 if(!crownMesh||!socket||!defeat){container.dispose();root.dispose();throw new Error('Queen rig is missing crown or defeat clip');}
 for(const mesh of container.meshes){mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;}
 // Apply only to the queen's skinned shell; the separate crown stays gold.
 const shellMaterials=[...new Set(container.meshes.filter(m=>m.skeleton&&m.material instanceof B.PBRMaterial).map(m=>m.material))];
 const shell=createQueenShell(B,shellMaterials);
 let gold=null;
 if(crownMesh.material){
  gold=crownMesh.material.clone('Finale crown gold');gold.metallic=.3;gold.roughness=.4;
  gold.emissiveTexture=gold.albedoTexture;gold.emissiveColor=new B.Color3(.14,.14,.14);crownMesh.material=gold;
 }
 function polishCrown(progress){
  if(!gold)return;
  const p=Math.max(0,Math.min(1,progress)),mix=(a,b)=>a+(b-a)*p;
  gold.albedoColor.set(mix(.72,1),mix(.66,1),mix(.48,1));
  gold.metallic=mix(.3,.55);gold.roughness=mix(.42,.26);
  gold.emissiveColor.set(mix(.10,.28),mix(.10,.28),mix(.10,.28));
 }
 polishCrown(0);
 const bounds=crownMesh.getBoundingInfo().boundingBox,normalization=2.84/(bounds.maximum.x-bounds.minimum.x);
 // Keep the existing crown choreography in its familiar 1.42-unit radius space.
 // Re-center the extracted band, then preserve glTF's handedness conversion.
 const crownVisual=new B.TransformNode('Meshy royal crown',scene);crownVisual.parent=crown;
 crownMesh.parent=crownVisual;crownMesh.position.set(-(bounds.minimum.x+bounds.maximum.x)*normalization/2,-bounds.minimum.y*normalization,-(bounds.minimum.z+bounds.maximum.z)*normalization/2);
 crownMesh.scaling.set(-normalization,normalization,normalization);crownMesh.rotationQuaternion=null;crownMesh.rotation.set(0,0,0);
 const startScale=scale/normalization;
 const update=()=>{root.computeWorldMatrix(true);visual.computeWorldMatrix(true);container.transformNodes.forEach(n=>n.computeWorldMatrix(true));container.skeletons.forEach(s=>s.prepare(true));};
 const clips=new Map(container.animationGroups.map(group=>[group.name,group]));
 const targets=[...new Set(container.animationGroups.flatMap(group=>group.targetedAnimations.map(a=>a.target)))];
 const bind=targets.filter(node=>node.position&&node.scaling).map(node=>({node,position:node.position.clone(),scaling:node.scaling.clone(),rotation:node.rotation.clone(),quaternion:node.rotationQuaternion?.clone()}));
 let current=null;
 function sampleClip(name,time){
  const group=clips.get(name)||defeat;
  if(current!==group){
   current?.stop();
   for(const pose of bind){pose.node.position.copyFrom(pose.position);pose.node.scaling.copyFrom(pose.scaling);pose.node.rotation.copyFrom(pose.rotation);if(pose.quaternion)pose.node.rotationQuaternion.copyFrom(pose.quaternion);}
   group.start(false);group.pause();current=group;
  }
  const fps=group.targetedAnimations[0].animation.framePerSecond,duration=(group.to-group.from)/fps;
  const seconds=group===defeat?Math.max(0,Math.min(duration,time)):((time%duration)+duration)%duration;
  group.goToFrame(group.from+seconds*fps);update();
 }
 function sample(time){sampleClip('Defeat',time);}
 function crownPosition(){socket.computeWorldMatrix(true);return socket.getAbsolutePosition().clone();}
 function crownRotation(){
  const matrix=socket.getWorldMatrix(),up=B.Vector3.TransformNormal(B.Axis.Y,matrix).normalize(),forward=B.Vector3.TransformNormal(B.Axis.Z,matrix).normalize();
  const right=B.Vector3.Cross(up,forward).normalize(),rotation=B.Matrix.Identity();
  B.Matrix.FromXYZAxesToRef(right,up,forward,rotation);return B.Quaternion.FromRotationMatrix(rotation);
 }
 sample(0);root.setEnabled(false);crownVisual.setEnabled(false);
 return {root,crownVisual,startScale,sample,sampleClip,shell,get clip(){return current?.name;},polishCrown,crownPosition,crownRotation,dispose(){container.dispose();root.dispose();crownVisual.dispose();}};
}
