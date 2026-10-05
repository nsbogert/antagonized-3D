import {loadPropFactory} from './props.mjs';
import {CROWN_ON,DANCE_START,ease} from './victory-core.mjs';
// One locally bundled, textured Meshy character; clips are sampled explicitly so
// the finale's pause, skip and replay controls also control the imported rig.
// A small coronet perched on her hair, matching the victory portrait.
export const MARIN_CROWN_FIT={x:.065,height:.332,scale:.115,tilt:-.12,pitch:-.08};
export const MARIN_URL='assets/models/marin.glb';
export const MARIN_DANCES=['Boom_Dance','Love_You_Pop_Dance','Breakdance_1990'];
export function victoryDanceAt(seconds){
 const t=((seconds%23)+23)%23;
 return t<8?{name:'Boom_Dance',time:t}:t<19?{name:'Love_You_Pop_Dance',time:t-8}:{name:'Breakdance_1990',time:t-19};
}
export async function loadRiggedMarin(B,scene,{parent=null,height=3}={}){
 const observer=B.SceneLoader.OnPluginActivatedObservable.add(loader=>{if(loader.name==='gltf')loader.animationStartMode=0;});
 let container;
 try{container=await B.SceneLoader.LoadAssetContainerAsync('',MARIN_URL,scene);}
 finally{B.SceneLoader.OnPluginActivatedObservable.remove(observer);}
 if(scene.isDisposed){container.dispose();throw new Error('Scene closed while Marin was loading');}
 const root=new B.TransformNode('Meshy Marin',scene);root.parent=parent;
 const visual=new B.TransformNode('Marin model scale',scene);visual.parent=root;
 container.addAllToScene();container.animationGroups.forEach(g=>g.stop());
 for(const node of [...container.meshes,...container.transformNodes])if(!node.parent)node.parent=visual;
 const nodes=container.transformNodes;
 const joint=name=>nodes.find(n=>n.name==='mixamorig:'+name);
 const hips=joint('Hips'),headJoint=joint('Head'),leftHand=joint('LeftHand');
 if(!hips||!headJoint||!leftHand){container.dispose();root.dispose();throw new Error('Marin is missing required Mixamo joints');}
 const sockets=[];
 const updateMatrices=()=>{root.computeWorldMatrix(true);visual.computeWorldMatrix(true);nodes.forEach(n=>n.computeWorldMatrix(true));container.skeletons.forEach(s=>s.prepare());sockets.forEach(socket=>socket.computeWorldMatrix(true));};
 updateMatrices();
 const meshes=container.meshes.filter(m=>m.getTotalVertices()>0);
 for(const mesh of meshes){mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.refreshBoundingInfo(true);}
 let min=Infinity,max=-Infinity;
 for(const mesh of meshes){const b=mesh.getBoundingInfo().boundingBox;min=Math.min(min,b.minimumWorld.y);max=Math.max(max,b.maximumWorld.y);}
 const scale=height/(max-min);visual.scaling.setAll(scale);visual.position.y=-min*scale;updateMatrices();
 // Sockets retain unit world scale at bind pose, then follow the animated joints.
 // That lets the existing crown use its normal meter-sized offsets and scale.
 function socket(name,bone){
  const node=new B.TransformNode(name,scene);node.position.copyFrom(bone.getAbsolutePosition());node.computeWorldMatrix(true);node.setParent(bone);sockets.push(node);return node;
 }
 const back=socket('Marin rigged backpack socket',joint('Spine2')),head=socket('Marin rigged crown socket',headJoint),hand=socket('Marin rigged left palm',leftHand),rightHand=socket('Marin rigged right palm',joint('RightHand'));
 const restHips=hips.position.clone(),groups=container.animationGroups.filter(g=>!g.name.includes('baselayer'));
 let current=null;
 function sampleRaw(name,seconds=0,{loop=true}={}){
  const group=groups.find(g=>g.name===name)||groups.find(g=>g.name==='Idle_15')||groups[0];
  if(!group)return;
  if(current!==group){current?.stop();group.start(false);group.pause();current=group;}
  const fps=group.targetedAnimations[0]?.animation.framePerSecond||60,duration=(group.to-group.from)/fps;
  const time=loop&&duration>0?Math.max(0,seconds)%duration:Math.min(Math.max(0,seconds),duration);
  group.goToFrame(group.from+time*fps);
  // Movement belongs to the game. Keep clip hip bounce but remove exported travel.
  hips.position.x=restHips.x;hips.position.z=restHips.z;updateMatrices();
 }
 // Sample both poses at an explicit timeline time, so blending survives pauses,
 // skipping and replay without depending on the previous rendered frame.
 const poseNodes=nodes.filter(n=>n.name.startsWith('mixamorig:'));
 const blendPose=poseNodes.map(n=>({position:n.position.clone(),rotation:n.rotationQuaternion.clone(),scale:n.scaling.clone()}));
 function blendSamples(from,to,weight){
  if(from.smooth)sample(from.name,from.time,{loop:from.loop??true});
  else sampleRaw(from.name,from.time,{loop:from.loop??true});
  poseNodes.forEach((n,i)=>{blendPose[i].position.copyFrom(n.position);blendPose[i].rotation.copyFrom(n.rotationQuaternion);blendPose[i].scale.copyFrom(n.scaling);});
  sampleRaw(to.name,to.time,{loop:to.loop??true});
  poseNodes.forEach((n,i)=>{
   B.Vector3.LerpToRef(blendPose[i].position,n.position,weight,n.position);
   B.Quaternion.SlerpToRef(blendPose[i].rotation,n.rotationQuaternion,weight,n.rotationQuaternion);
   B.Vector3.LerpToRef(blendPose[i].scale,n.scaling,weight,n.scaling);
  });
  updateMatrices();
 }
 function sample(name,seconds=0,{loop=true}={}){
  const group=groups.find(g=>g.name===name);
  const fps=group?.targetedAnimations[0]?.animation.framePerSecond||60,duration=group?(group.to-group.from)/fps:0;
  const local=duration>0?Math.max(0,seconds)%duration:0,seam=Math.min(.18,duration*.12);
  if(loop&&duration>0&&local>duration-seam){
   blendSamples({name,time:local,loop:false},{name,time:0,loop:false},ease((local-duration+seam)/seam));
  }else sampleRaw(name,seconds,{loop});
 }
 function sampleVictory(seconds,{intro=false}={}){
  const t=((seconds%23)+23)%23,dance=victoryDanceAt(seconds),blend=.45;
  const segment=t<8?0:t<19?8:19,phase=t-segment;
  if(phase<blend){
   const previous=segment===0?{name:'Breakdance_1990',time:4+phase}:segment===8?{name:'Boom_Dance',time:8+phase}:{name:'Love_You_Pop_Dance',time:11+phase};
   if(intro&&seconds<blend){previous.name='Male_Bend_Over_Pick_Up';previous.time=7.25;previous.loop=false;}
   blendSamples(previous,{name:dance.name,time:dance.time},ease(phase/blend));
  }else sample(dance.name,dance.time);
 }
 // Aim the two arm joints after sampling the clip; never accumulate edits between frames.
 function reachRightHand(target,iterations=10,{pole=null}={}){
  const wrist=joint('RightHand');
  if(pole){
   const arm=joint('RightArm'),elbow=joint('RightForeArm'),origin=arm.getAbsolutePosition();
   const upper=B.Vector3.Distance(origin,elbow.getAbsolutePosition()),lower=B.Vector3.Distance(elbow.getAbsolutePosition(),wrist.getAbsolutePosition());
   const direction=target.subtract(origin),distance=Math.max(Math.abs(upper-lower)+.001,Math.min(direction.length(),upper+lower-.001));direction.normalize();
   const bend=pole.subtract(direction.scale(B.Vector3.Dot(pole,direction))).normalize();
   const along=(upper*upper-lower*lower+distance*distance)/(2*distance),out=Math.sqrt(Math.max(0,upper*upper-along*along));
   const elbowTarget=origin.add(direction.scale(along)).add(bend.scale(out)),handTarget=origin.add(direction.scale(distance));
   for(const [bone,end,goal] of [[arm,elbow,elbowTarget],[elbow,wrist,handTarget]]){
    const inverse=bone.parent.computeWorldMatrix(true).clone().invert(),p=bone.getAbsolutePosition();
    const from=B.Vector3.TransformNormal(end.getAbsolutePosition().subtract(p),inverse).normalize(),to=B.Vector3.TransformNormal(goal.subtract(p),inverse).normalize();
    bone.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(from,to,new B.Quaternion()).multiply(bone.rotationQuaternion);updateMatrices();
   }
   return;
  }
  for(let pass=0;pass<iterations;pass++)for(const name of ['RightForeArm','RightArm']){
   const bone=joint(name),origin=bone.getAbsolutePosition(),inverse=bone.parent.getWorldMatrix().clone().invert();
   const from=B.Vector3.TransformNormal(wrist.getAbsolutePosition().subtract(origin),inverse).normalize();
   const to=B.Vector3.TransformNormal(target.subtract(origin),inverse).normalize();
   const delta=B.Quaternion.FromUnitVectorsToRef(from,to,new B.Quaternion());
   bone.rotationQuaternion=delta.multiply(bone.rotationQuaternion);updateMatrices();
  }
 }
 function finalePose(t,beat,reducedMotion=false){
  if(t>=DANCE_START){
   if(reducedMotion)blendSamples({name:'Male_Bend_Over_Pick_Up',time:7.25,loop:false},{name:'Idle_15',time:0},ease((t-DANCE_START)/.45));
   else sampleVictory(t-DANCE_START,{intro:true});
  }else if(t>=6&&t<10){
   // Two walk cycles over the 4.4-unit approach; phase follows floor travel.
   const walkTime=ease((t-6)/4)*(13/6);
   if(t<6.35)blendSamples({name:'Idle_15',time:0},{name:'Walking',time:walkTime},ease((t-6)/.35));
   else if(t>9.5)blendSamples({name:'Walking',time:walkTime,smooth:true},{name:'Male_Bend_Over_Pick_Up',time:0,loop:false},ease((t-9.5)/.5));
   else sample('Walking',walkTime);
  }
  else if(t>=10){
   const release=Math.max(0,Math.min(1,(t-CROWN_ON)/1.5));
   const clipTime=t<CROWN_ON?t-10:5+1.5*release+3.75*release*release-3*release*release*release;
   sample('Male_Bend_Over_Pick_Up',clipTime,{loop:false});
   if(t>=13){
    const weight=t<CROWN_ON?ease((t-13)/1.6):1-ease(t-CROWN_ON);
    const crownTarget=B.Vector3.TransformCoordinates(new B.Vector3(MARIN_CROWN_FIT.x,MARIN_CROWN_FIT.height,0),head.computeWorldMatrix(true));
    const gripOffset=B.Vector3.TransformNormal(new B.Vector3(-.16,-.08,0),root.computeWorldMatrix(true));
    const target=crownTarget.subtract(gripOffset);
    reachRightHand(B.Vector3.Lerp(joint('RightHand').getAbsolutePosition(),target,weight));
   }
  }else sample('Idle_15',0);
 }
 sample('Idle_15',0);
 // A unit-scale torso socket makes the same pack fit gameplay and cinematic Marin.
 const packFactory=await loadPropFactory(B,scene,'backpack');
 const backpack=packFactory?.create({parent:back,height:height*.37,centered:true,name:'Marin exterminator backpack'});
 if(backpack){backpack.root.position.set(0,-height*.055,-height*.14);backpack.root.rotation.y=Math.PI;backpack.root.setEnabled(false);}
 const harness=new B.TransformNode('Marin fitted backpack harness',scene);harness.parent=back;harness.scaling.setAll(height/3);harness.setEnabled(false);
 const webbing=new B.StandardMaterial('Marin dark webbing',scene);webbing.diffuseColor=new B.Color3(.11,.13,.11);webbing.specularColor=new B.Color3(.14,.14,.14);webbing.backFaceCulling=false;
 const brass=new B.StandardMaterial('Marin harness brass',scene);brass.diffuseColor=new B.Color3(.68,.45,.16);brass.specularColor=new B.Color3(.65,.55,.3);
 const straps=[];
 for(const side of [-1,1]){
  const path=[new B.Vector3(side*.24,-.18,-.28),new B.Vector3(side*.21,.19,-.19),new B.Vector3(side*.21,.22,0),new B.Vector3(side*.21,.14,.14),new B.Vector3(side*.20,-.12,.17),new B.Vector3(side*.19,-.44,.15),new B.Vector3(side*.18,-.65,.10)];
  const edges=[-.028,.028].map(offset=>path.map(point=>point.add(new B.Vector3(offset,0,0))));
  const strap=B.MeshBuilder.CreateRibbon('Marin shoulder strap',{pathArray:edges,sideOrientation:B.Mesh.DOUBLESIDE},scene);strap.parent=harness;strap.material=webbing;strap.isPickable=false;straps.push(strap);
  for(const y of [.06,-.44]){const buckle=B.MeshBuilder.CreateBox('Marin brass strap buckle',{width:.085,height:.062,depth:.016},scene);buckle.parent=harness;buckle.position.set(side*.20,y,y>0?.16:.17);buckle.material=brass;buckle.isPickable=false;straps.push(buckle);const center=B.MeshBuilder.CreateBox('Marin buckle webbing',{width:.047,height:.028,depth:.018},scene);center.parent=buckle;center.position.z=.01;center.material=webbing;center.isPickable=false;straps.push(center);}
 }
 function setBackpack(enabled,visibility=1){if(!backpack)return;backpack.root.setEnabled(enabled);harness.setEnabled(enabled);[...backpack.meshes,...straps].forEach(mesh=>mesh.visibility=visibility);}
 return {root,head,hand,rightHand,back,backpack,setBackpack,groups,container,sample,blendSamples,reachRightHand,updateMatrices,sampleVictory,finalePose,dispose(){container.dispose();root.dispose();}};
}
