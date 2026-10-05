import {createAntFoam} from './ant-foam.mjs';
// World distance covered by one planted tripod cycle: sweep × scale / stance fraction.
export const GROUND_GAIT={worker:{duration:1.2,stride:.56*.7/.65},soldier:{duration:1.6,stride:.56*1.65/.65}};
export function advanceGroundGait(ant,distance){const gait=GROUND_GAIT[ant.type];if(gait)ant.walkTime=(ant.walkTime||0)+distance/gait.stride*gait.duration;}
const TYPES={
 worker:{url:'assets/models/worker-rigged.glb',scale:.7,groundY:-.47612,clips:['Idle','Walk','Bite','Carry','Stomp','Defeat']},
 soldier:{url:'assets/models/soldier-rigged.glb',scale:1.65,groundY:-.413764,clips:['Idle','Walk','Bite','Threat','Subdued','Defeat']}
};
// Geometry/textures stay shared; each actor owns its skeleton and foam material.
export async function loadGroundAntFactory(B,scene,type){
 const config=TYPES[type];if(!config)throw new Error('Unknown ground ant '+type);
 if(!B.SceneLoader?.IsPluginForExtensionAvailable('.glb'))return null;
 const observer=B.SceneLoader.OnPluginActivatedObservable.add(loader=>{if(loader.name==='gltf')loader.animationStartMode=0;});
 let container;
 try{container=await B.SceneLoader.LoadAssetContainerAsync('',config.url,scene);}
 finally{B.SceneLoader.OnPluginActivatedObservable.remove(observer);}
 if(scene.isDisposed){container.dispose();return null;}
 if(config.clips.some(name=>!container.animationGroups.some(g=>g.name===name))){container.dispose();throw new Error(type+' is missing required animation clips');}
 container.animationGroups.forEach(g=>g.stop());
 const actors=new Set();let serial=0,disposed=false;
 function create(parent=null){
  if(disposed||scene.isDisposed)return null;
  const prefix=type+' '+(++serial)+' · ';
  const entry=container.instantiateModelsToScene(name=>prefix+name,false,{doNotInstantiate:true});
  const root=new B.TransformNode(prefix+'model',scene);root.parent=parent;
  root.scaling.setAll(config.scale);root.position.y=-config.groundY*config.scale;
  entry.rootNodes.forEach(n=>n.parent=root);
  const groups=new Map(entry.animationGroups.map(g=>[g.name.replace(prefix,''),g]));
  const base=root.getDescendants().map(node=>({node,p:node.position.clone(),q:node.rotationQuaternion?.clone(),s:node.scaling.clone()}));
  const meshes=root.getChildMeshes();for(const mesh of meshes){mesh.isPickable=false;mesh.receiveShadows=true;}
  const foam=createAntFoam(B,meshes);
  let current=null,ended=false,transition=null,blend=1;
  function sample(name,time=0,dt=1/60){
   if(ended)return;
   const group=groups.get(name)||groups.get('Idle');if(!group)return;
   if(current!==group){
    transition=current?base.map(pose=>({p:pose.node.position.clone(),q:pose.node.rotationQuaternion?.clone(),s:pose.node.scaling.clone()})):null;blend=transition?0:1;
    current?.stop();for(const pose of base){pose.node.position.copyFrom(pose.p);pose.node.scaling.copyFrom(pose.s);if(pose.q)pose.node.rotationQuaternion.copyFrom(pose.q);}
    group.start(false);group.pause();current=group;
   }
   const fps=group.targetedAnimations[0]?.animation.framePerSecond||60,duration=(group.to-group.from)/fps;
   const seconds=['Stomp','Defeat'].includes(name)?Math.min(Math.max(0,time),duration):Math.max(0,time)%duration;
   if(transition&&blend<1)for(const pose of base){pose.node.position.copyFrom(pose.p);pose.node.scaling.copyFrom(pose.s);if(pose.q)pose.node.rotationQuaternion.copyFrom(pose.q);}
   group.goToFrame(group.from+seconds*fps);
   if(transition&&blend<1){
    blend=Math.min(1,blend+Math.max(0,dt)/.16);const amount=blend*blend*(3-2*blend);
    base.forEach((pose,i)=>{const from=transition[i];pose.node.position.copyFrom(B.Vector3.Lerp(from.p,pose.node.position,amount));pose.node.scaling.copyFrom(B.Vector3.Lerp(from.s,pose.node.scaling,amount));if(from.q&&pose.node.rotationQuaternion)pose.node.rotationQuaternion.copyFrom(B.Quaternion.Slerp(from.q,pose.node.rotationQuaternion,amount));});
   }
  }
  const actor={root,groups,meshes,foam,skeletons:entry.skeletons,get clip(){return current?.name.replace(prefix,'')||null;},sample,dispose(){if(ended)return;ended=true;entry.animationGroups.forEach(g=>g.dispose());entry.skeletons.forEach(s=>s.dispose());root.dispose();foam.dispose();groups.clear();meshes.length=0;base.length=0;entry.rootNodes.length=0;entry.animationGroups.length=0;entry.skeletons.length=0;transition=null;current=null;actors.delete(actor);}};
  actors.add(actor);sample('Idle',0);return actor;
 }
 function dispose(){if(disposed)return;disposed=true;for(const actor of [...actors])actor.dispose();container.dispose();}
 scene.onDisposeObservable.add(dispose);return {create,dispose,container};
}
export function groundAntPose(ant){
 if(ant.state==='dead')return {clip:ant.type==='worker'&&ant.deathKind==='stomp'?'Stomp':'Defeat',time:ant.deadTime};
 if(ant.state!=='mounted'&&(ant.state==='subdued'||(ant.type==='soldier'&&ant.foam>0)))return {clip:'Subdued',time:ant.animationTime||0};
 if(ant.biting>0)return {clip:'Bite',time:(.6-ant.biting)*2};
 if(ant.movementSpeed>.08)return {clip:'Walk',time:ant.walkTime||0};
 return {clip:'Idle',time:(ant.animationTime||0)+(ant.phase||0)};
}
