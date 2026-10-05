import {createAntFoam} from './ant-foam.mjs';
export const FLYER_URL='assets/models/flyer-rigged.glb';
export const FLYER_SCALE=1.2,FLYER_GROUND_Y=-.266808;
// One cached source and shared textures; each live ant gets its own pose/skeleton.
export async function loadFlyerFactory(B,scene){
 if(!B.SceneLoader?.IsPluginForExtensionAvailable('.glb'))return null;
 const observer=B.SceneLoader.OnPluginActivatedObservable.add(loader=>{if(loader.name==='gltf')loader.animationStartMode=0;});
 let container;
 try{container=await B.SceneLoader.LoadAssetContainerAsync('',FLYER_URL,scene);}
 finally{B.SceneLoader.OnPluginActivatedObservable.remove(observer);}
 if(scene.isDisposed){container.dispose();return null;}
 const required=['Hover','Fly','Dive','Grounded','Defeat'];
 if(required.some(name=>!container.animationGroups.some(g=>g.name===name))){container.dispose();throw new Error('Flyer is missing required flight clips');}
 container.animationGroups.forEach(g=>g.stop());
 const actors=new Set();let serial=0,disposed=false;
 function create(parent=null){
  if(disposed||scene.isDisposed)return null;
  const prefix='Flyer '+(++serial)+' · ';
  const entry=container.instantiateModelsToScene(name=>prefix+name,false,{doNotInstantiate:true});
  const root=new B.TransformNode(prefix+'model',scene);root.parent=parent;
  root.scaling.setAll(FLYER_SCALE);root.position.y=-FLYER_GROUND_Y*FLYER_SCALE;
  entry.rootNodes.forEach(n=>n.parent=root);
  const groups=new Map(entry.animationGroups.map(g=>[g.name.replace(prefix,''),g]));
  const meshes=root.getChildMeshes();for(const mesh of meshes){mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.receiveShadows=true;}
  const foam=createAntFoam(B,meshes);
  let current=null,ended=false;
  function sample(name,time=0){
   if(ended)return;
   const group=groups.get(name)||groups.get('Hover');if(!group)return;
   if(current!==group){current?.stop();group.start(false);group.pause();current=group;}
   const fps=group.targetedAnimations[0]?.animation.framePerSecond||60,duration=(group.to-group.from)/fps;
   const seconds=name==='Defeat'?Math.min(Math.max(0,time),duration):Math.max(0,time)%duration;
   group.goToFrame(group.from+seconds*fps);
  }
  const actor={root,groups,meshes,foam,skeletons:entry.skeletons,get clip(){return current?.name.replace(prefix,'')||null;},sample,dispose(){if(ended)return;ended=true;entry.animationGroups.forEach(g=>g.dispose());entry.skeletons.forEach(s=>s.dispose());root.dispose();foam.dispose();actors.delete(actor);}};
  actors.add(actor);sample('Hover',0);return actor;
 }
 function dispose(){if(disposed)return;disposed=true;for(const actor of [...actors])actor.dispose();container.dispose();}
 scene.onDisposeObservable.add(dispose);
 return {create,dispose,container};
}
export function flyerPose(ant){
 return ant.state==='dead'?{clip:'Defeat',time:ant.deadTime}:ant.foam>0?{clip:'Grounded',time:ant.animationTime||0}:{clip:ant.diving?'Dive':'Fly',time:(ant.animationTime||0)+(ant.phase||0)};
}
