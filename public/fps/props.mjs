// One load per prop per scene; instances share their geometry and textures.
export const PROP_URLS={toilet:'assets/models/toilet.glb',sprayer:'assets/models/sprayer.glb',backpack:'assets/models/backpack.glb',egg:'assets/models/ant-egg.glb',station:'assets/models/refill-station.glb'};
const scenes=new WeakMap();
export function loadPropFactory(B,scene,type){
 if(!B.SceneLoader?.IsPluginForExtensionAvailable('.glb'))return Promise.resolve(null);
 let cache=scenes.get(scene);if(!cache){cache=new Map();scenes.set(scene,cache);}
 if(cache.has(type))return cache.get(type);
 const ready=B.SceneLoader.LoadAssetContainerAsync('',PROP_URLS[type],scene).then(container=>{
  if(scene.isDisposed){container.dispose();return null;}
  let serial=0;const actors=new Set();
  function create({parent=null,height=1,centered=false,name=type}={}){
   const entry=container.instantiateModelsToScene(n=>`${name} ${++serial} · ${n}`,false,{doNotInstantiate:true});
   const root=new B.TransformNode(name+' model',scene),visual=new B.TransformNode(name+' normalized',scene);visual.parent=root;
   entry.rootNodes.forEach(n=>n.parent=visual);
   const meshes=visual.getChildMeshes();let min=new B.Vector3(Infinity,Infinity,Infinity),max=new B.Vector3(-Infinity,-Infinity,-Infinity);
   for(const mesh of meshes){mesh.isPickable=false;mesh.receiveShadows=true;mesh.computeWorldMatrix(true);const bounds=mesh.getBoundingInfo().boundingBox;min=B.Vector3.Minimize(min,bounds.minimumWorld);max=B.Vector3.Maximize(max,bounds.maximumWorld);}
   const scale=height/Math.max(.001,max.y-min.y);visual.scaling.setAll(scale);visual.position.set(-(min.x+max.x)*scale/2,-(centered?(min.y+max.y)/2:min.y)*scale,-(min.z+max.z)*scale/2);
   root.parent=parent;let disposed=false;
   const actor={root,visual,meshes,entry,dispose(){if(disposed)return;disposed=true;root.dispose();actors.delete(actor);}};actors.add(actor);root.onDisposeObservable.add(()=>actors.delete(actor));return actor;
  }
  scene.onDisposeObservable.add(()=>{for(const actor of [...actors])actor.dispose();container.dispose();});
  return {container,create};
 }).catch(error=>{console.warn(type+' model unavailable; using fallback.',error);return null;});cache.set(type,ready);return ready;
}
