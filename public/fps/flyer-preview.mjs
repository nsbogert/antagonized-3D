const B=window.BABYLON,$=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new B.Vector3(x,y,z);
const engine=new B.Engine($('view'),true,{preserveDrawingBuffer:true}),scene=new B.Scene(engine);
engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));scene.clearColor=new B.Color4(.12,.16,.15,1);
const camera=new B.ArcRotateCamera('preview',Math.PI/2,1.35,3.5,V(0,1.1,0),scene);camera.attachControl($('view'),true);camera.lowerRadiusLimit=.5;camera.upperRadiusLimit=12;camera.lowerBetaLimit=.2;camera.upperBetaLimit=1.65;camera.wheelPrecision=40;
const fill=new B.HemisphericLight('studio fill',V(0,1,0),scene);fill.intensity=.8;
const key=new B.DirectionalLight('studio key',V(-.4,-.7,-1),scene);key.intensity=.8;
const rim=new B.PointLight('rim',V(-2,4,-3),scene);rim.intensity=.5;
function mat(name,color,options={}){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(color);if(options.glow)m.emissiveColor=m.diffuseColor.scale(options.glow);return m;}
function ball(name,x,y,z,sx,sy,sz,m,parent){const n=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:16},scene);n.position.set(x,y,z);n.scaling.set(sx,sy,sz);n.material=m;n.parent=parent;return n;}
function cyl(name,x,y,z,diam,height,m,parent,top=diam){const n=B.MeshBuilder.CreateCylinder(name,{diameterBottom:diam,diameterTop:top,height,tessellation:16},scene);n.position.set(x,y,z);n.material=m;n.parent=parent;return n;}
const floor=B.MeshBuilder.CreateGround('studio floor',{width:20,height:20},scene);floor.material=mat('floor','#34413a');

floor.material.disableLighting=true;floor.material.emissiveColor=B.Color3.FromHexString('#28362f');
const observer=B.SceneLoader.OnPluginActivatedObservable.add(loader=>{if(loader.name==='gltf')loader.animationStartMode=0;});
const loaded=await B.SceneLoader.ImportMeshAsync('', 'assets/models/flyer-rigged.glb','',scene);
B.SceneLoader.OnPluginActivatedObservable.remove(observer);
const root=loaded.meshes[0];root.position.y=.266808;
const base=loaded.transformNodes.map(n=>({node:n,p:n.position.clone(),q:n.rotationQuaternion?.clone(),s:n.scaling.clone()}));
let current,paused=false;
function choose(){
 loaded.animationGroups.forEach(g=>g.stop());
 for(const pose of base){pose.node.position.copyFrom(pose.p);if(pose.q)pose.node.rotationQuaternion.copyFrom(pose.q);pose.node.scaling.copyFrom(pose.s);}
 current=loaded.animationGroups.find(g=>g.name===$('animation').value);
 root.position.y=.266808+(['Hover','Fly','Dive'].includes(current?.name)?1.0:0);current?.start(current.name!=='Defeat');$('pose-time').max=current?(current.to/(current.targetedAnimations[0]?.animation.framePerSecond||60)):0;$('pose-time').value=0;paused=false;$('pause').textContent='Pause';
}
$('animation').disabled=false;$('pause').disabled=false;$('animation').onchange=choose;
$('pause').onclick=()=>{paused=!paused;if(paused)current?.pause();else current?.play(current.name!=='Defeat');$('pause').textContent=paused?'Play':'Pause';};
$('pose-time').oninput=()=>{if(!current)return;current.pause();paused=true;$('pause').textContent='Play';current.goToFrame(Number($('pose-time').value)*(current.targetedAnimations[0]?.animation.framePerSecond||60));};

choose();
$('status').textContent='40 joints · articulated wings · 5 flight/ground clips';
$('angle').onchange=()=>{
 const view=$('angle').value;camera.radius=view==='side'?4.3:3.5;
 camera.alpha=view==='side'?0:view==='back'?-Math.PI/2:Math.PI/2;
 camera.beta=view==='top'?.05:1.3;
};
engine.runRenderLoop(()=>scene.render());
window.addEventListener('resize',()=>engine.resize());
