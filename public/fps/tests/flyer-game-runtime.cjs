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
async function run(){const chapter=4;
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
 const g=window.antagonized;g.reset();const oldFlyers=g.ants.filter(a=>a.type==='flyer');g.reset();
 assert.equal(await g.flyerReady,true);await g.groundAntsReady;await g.heroReady;await g.world.propsReady;assert.ok(oldFlyers.every(a=>a.root.isDisposed()),'reset during load disposes the old cast');
 const flyers=g.ants.filter(a=>a.type==='flyer');assert.equal(flyers.length,8);assert.ok(flyers.every(a=>a.rig),'all live flyers use the imported rig');
 assert.equal(fetches.size,8,'four actors and four shared equipment props are loaded');assert.ok([...fetches.values()].every(count=>count===1),'each model loads once per scene');
 const a=flyers[0];g.teleport(a.x,0,a.z);a.phase=Math.PI/2;g.step(.02);assert.equal(a.diving,true);assert.equal(a.rig.clip,'Dive','controller selects dive pose');
 g.hit(a,1,'foam');const height=a.y;g.step(.1);assert.ok(a.y<height,'foam brings flyer down');assert.equal(a.rig.clip,'Grounded');assert.equal(a.foamMesh.isEnabled(),false,'foamed flyer has no enclosing blob');assert.equal(a.rig.foam.state.amount,1);assert.equal(flyers[1].rig.foam.state.amount,0);
 a.foam=0;a.phase=-Math.PI/2;g.step(.02);assert.equal(a.rig.clip,'Fly','recovery resumes wingbeats');assert.equal(a.rig.foam.state.amount,0,'recovery restores the shell');
 g.hit(a,10,'spray');g.step(.1);assert.equal(a.rig.clip,'Defeat');assert.equal(a.root.scaling.y,1,'imported death clip avoids procedural squash');
 function bodyContact(ant){
  const mesh=ant.rig.meshes.find(m=>m.name.endsWith('primitive0'));
  ant.root.computeWorldMatrix(true);ant.rig.root.getDescendants().forEach(n=>n.computeWorldMatrix?.(true));ant.rig.skeletons.forEach(s=>s.prepare(true));
  const p=mesh.getPositionData(true,true),matrix=mesh.getWorldMatrix();let low=Infinity;
  for(const index of mesh.getIndices()){const i=index*3;low=Math.min(low,B.Vector3.TransformCoordinates(new B.Vector3(p[i],p[i+1],p[i+2]),matrix).y);}return low;
 }
 g.teleport(20,0,20);a.x=15;a.z=18;a.y=4;a.root.position.set(a.x,a.y,a.z);
 const start=a.y;g.step(.2);const firstFall=start-a.y;g.step(.2);assert.ok(start-firstFall-a.y>firstFall,'dead flyer accelerates downward rather than drifting at constant speed');
 for(let i=0;i<90;i++)g.step(.02);
 const rules=await import(path.join(fpsRoot,'core.mjs')),floor=rules.surfaceHeightAt(a,a.corpseSurfaces);
 assert.ok(bodyContact(a)>=floor&&bodyContact(a)<floor+.02,'dead flyer body rests directly on the floor');assert.equal(a.fallSpeed,0);
 const raised=g.world.colliders.find(c=>c.top>1&&c.w>1&&c.d>1);assert.ok(raised,'fixture has an elevated surface');
 const high=flyers[1];Object.assign(high,{x:raised.x+raised.w/2,z:raised.z+raised.d/2,y:raised.top+3});g.hit(high,10,'spray');
 for(let i=0;i<90;i++)g.step(.02);
 assert.ok(bodyContact(high)>=raised.top&&bodyContact(high)<raised.top+.02,'dead flyer rests on a raised surface without sinking through it');
 const size=()=>[g.scene.meshes.length,g.scene.skeletons.length,g.scene.animationGroups.length,g.scene.materials.length];g.reset();const baseline=size();
 for(let i=0;i<8;i++){g.reset();assert.deepEqual(size(),baseline,'replay/reset does not leak flyer meshes or animations');}
 assert.ok([...fetches.values()].every(count=>count===1),'restart reuses each imported model');g.scene.dispose();console.log('PASS actual game flyer import: cached load, reset while loading, dive/foam/recovery/death poses, and cleanup');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
