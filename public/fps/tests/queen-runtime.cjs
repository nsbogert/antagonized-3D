// Offline simulation integration test: no browser or desktop automation.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fpsRoot=process.env.ANTAGONIZED_FPS_ROOT||path.resolve(__dirname,'..');
const B=require(path.join(process.env.ANTAGONIZED_VENDOR_ROOT||path.join(fpsRoot,'vendor'),'babylon.js'));
const draw=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:100})},{get:(o,k)=>o[k]||(()=>{})});
class Texture extends B.Texture{constructor(name,size,scene){super(null,scene);this.name=name;}getContext(){return draw;}update(){}}
class Engine extends B.NullEngine{constructor(){super({renderWidth:1280,renderHeight:720,textureSize:64,deterministicLockstep:true,lockstepMaxSteps:4});}static isSupported(){return true;}runRenderLoop(fn){this.frame=fn;}setHardwareScalingLevel(){} }
const nodes=new Map();
function node(id=''){return {id,dataset:{},hidden:false,disabled:true,value:id==='sensitivity'?'1':id==='music-volume'?'.28':'keyboard',checked:true,textContent:'',children:[],style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},position:{},
 get innerHTML(){return this.html||'';},set innerHTML(v){this.html=v;this.children=[...v.matchAll(/<span/g)].map(()=>node());},
 append(n){this.children.push(n);},setAttribute(){},querySelector(){return node();},addEventListener(){},focus(){},pause(){},play(){return Promise.resolve();},getContext(){return draw;}};}
const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},querySelector:s=>document.getElementById(s.slice(1)),querySelectorAll:()=>[],createElement:()=>node(),addEventListener(){},pointerLockElement:null};
const window={BABYLON:{...B,Engine,DynamicTexture:Texture},devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
const context=vm.createContext({window,document,console,performance,URLSearchParams,location:{search:'?chapter=4&debug=1'},localStorage:{getItem(){return null;},setItem(){}},setTimeout:()=>0,clearTimeout(){}});
const cache=new Map();
function mod(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
(async()=>{
 const root=mod(path.join(fpsRoot,'game.mjs'));await root.link((specifier,parent)=>mod(path.resolve(path.dirname(parent.identifier),specifier)));await root.evaluate();
 const g=window.antagonized;
 for(const name of ['fitted coverall torso','tailored upper trouser','Marin curved face']){
  const mesh=g.scene.getMeshByName(name),positions=mesh.getVertexBuffer(B.VertexBuffer.PositionKind).getData(),normals=mesh.getVertexBuffer(B.VertexBuffer.NormalKind).getData();
  let front=0;for(let i=0;i<positions.length;i+=3)if(positions[i+2]>positions[front+2])front=i;
  assert.ok(normals[front+2]>0,name+' has outward-facing surfaces');
 }
 g.reset();assert.equal(g.state.chapter,4);assert.equal(g.state.baits,1,'start with one bait');assert.equal(g.state.queen.mode,'dormant');assert.equal(g.world.eggSpawns.length,24);
 const initial=g.ants.map(a=>({x:a.x,z:a.z,type:a.type}));
 for(let i=0;i<80;i++)g.step(.02);
 assert.equal(g.state.queen.mode,'dormant');
 for(const type of ['worker','soldier'])assert.ok(g.ants.some((a,i)=>a.type===type&&Math.hypot(a.x-initial[i].x,a.z-initial[i].z)>.15),type+' moves before arena entry');
 g.reset();
 for(const a of g.ants){a.x=22;a.z=22;a.root.position.set(22,0,22);}
 g.teleport(0,0,8);g.step(.02);assert.equal(g.state.queen.mode,'idle');
 function advance(seconds){for(let t=0;t<seconds;t+=.02){g.step(.02);if(!g.state.won)g.world.syncQueen(g.state.queen,t,.02);}}
 function aim(){const q=g.state.queen;g.teleport(q.x,0,q.z+7);g.camera.setTarget(new B.Vector3(q.x,1.8,q.z));g.camera.getViewMatrix(true);}
 function shot(){aim();g.state.ammo=3;g.state.ammoKinds=['egg','egg','egg'];g.state.weapon=0;g.primaryAction();for(let i=0;i<60;i++)g.effectsStep(.02);advance(.45);}
 shot();assert.ok(g.state.queen.armor<6,'egg projectile hits queen armor');shot();shot();assert.equal(g.state.queen.armor,0);
 for(let phase=0;phase<3;phase++){
  assert.equal(g.state.queen.phase,phase);
  if(phase>0){advance(6.1);if(phase===1){shot();shot();shot();shot();}else{g.state.weapon=2;aim();g.primaryAction();for(let i=0;i<50;i++)g.effectsStep(.02);}}
  // Use actual spray action and tank refill loop through each whole segment.
  for(let i=0;i<240&&g.state.queen.phase===phase&&!g.state.ended;i++){
   aim();g.state.weapon=1;g.state.invulnerable=100;
   if(phase===2&&g.state.queen.open<=0)g.state.queen.open=8; // Isolate damage wiring; warning/recovery rules have independent tests.
   g.primaryAction();advance(.1);
  }
  assert.ok(g.state.queen.phase>phase||g.state.won,'spray progresses phase '+phase);assert.equal(g.state.baits,1,'phase resupply respects one bait slot');
 }
 assert.equal(g.state.won,true);assert.equal(g.state.queen.mode,'dead');assert.equal(g.state.ended,true);assert.match(document.getElementById('ending-title').textContent,/Marin/);
 assert.equal(document.getElementById('theme-music').src,'assets/marin-vs-the-colony.mp3');
 assert.equal(g.state.cinematic,true);assert.equal(document.getElementById('ending').hidden,true,'win panel waits for film');
 const crown=g.scene.getTransformNodeByName('royal crown'),queen=g.scene.getTransformNodeByName('THE QUEEN');assert.equal(crown.parent,null,'crown detaches for the fall');
 const elapsed=g.world.finale.time;document.getElementById('cinematic-toggle').onclick();advance(1);assert.equal(g.world.finale.time,elapsed,'film pauses');document.getElementById('cinematic-toggle').onclick();
 const fleeing=g.ants.filter(a=>a.state==='fleeing');assert.ok(fleeing.length>0);const antStart={x:fleeing[0].x,z:fleeing[0].z};
 advance(4);assert.ok(queen.rotation.z>2.5,'queen rolls over');assert.ok(Math.abs(crown.position.y-.25)<.01,'crown lands');assert.ok(Math.hypot(fleeing[0].x-antStart.x,fleeing[0].z-antStart.z)>1,'survivors flee');
 advance(7.5);assert.ok(crown.position.y>.25,'Marin lifts the crown');advance(7);
 assert.equal(g.state.cinematic,false);assert.equal(document.getElementById('ending').hidden,false);assert.equal(document.getElementById('victory-portrait').hidden,false);
 assert.equal(crown.parent.name,'Marin smiling head');assert.equal(crown.scaling.x,.36);assert.ok(fleeing.every(a=>!a.root.isEnabled()),'colony disperses');
 assert.match(document.getElementById('ending-title').textContent,/Her home/);
 document.getElementById('replay-film').onclick();assert.equal(g.state.cinematic,true);assert.ok(g.ants.some(a=>a.state==='fleeing'&&a.root.isEnabled()),'film replay restores the fleeing cast');document.getElementById('cinematic-skip').onclick();assert.equal(g.state.cinematic,false);

 g.reset();assert.equal(crown.parent.name,'queen body');assert.equal(crown.scaling.x,1);assert.equal(document.getElementById('victory-portrait').hidden,true);assert.equal(g.state.queen.mode,'dormant');assert.equal(g.state.queen.phase,0);assert.equal(g.state.health,5);assert.equal(g.state.ended,false);
 g.state.baits=0;g.state.health=1;g.teleport(g.world.supplyPoints[1].x,0,g.world.supplyPoints[1].z);g.interact();assert.equal(g.state.baits,1);assert.equal(g.state.health,5);g.interact();assert.equal(g.state.baits,1,'refills cannot stack bait');
 g.reset();g.teleport(0,0,10);g.step(.02);g.state.queen.phase=1;g.state.queen.hp=30;g.state.queen.armor=9;
 const soldier=g.ants.find(a=>a.type==='soldier');g.hit(soldier,1,'foam');g.hit(soldier,3,'egg');g.teleport(soldier.x,0,soldier.z);g.interact();assert.equal(g.state.ride,soldier);
 g.teleport(0,0,1.8);g.setKeys('KeyW','KeyC');g.step(.05);g.setKeys();assert.equal(g.state.queen.armor,0,'actual mounted charge exposes queen');
 g.world.syncQueen(g.state.queen,1);

 // The skip control produces the same final scene and does not leak scene objects.

 g.reset();g.teleport(0,0,4);g.step(.02);Object.assign(g.state.queen,{phase:2,armor:0,hp:.1,open:8});g.state.weapon=1;g.primaryAction();
 assert.equal(g.state.cinematic,true);document.getElementById('cinematic-skip').onclick();assert.equal(g.state.cinematic,false);assert.equal(crown.parent.name,'Marin smiling head');assert.equal(document.getElementById('ending').hidden,false);
 g.reset();assert.equal(g.scene.getTransformNodeByName('victory Marin').isEnabled(),false);assert.equal(crown.parent.name,'queen body');
 // A loss never starts the victory sequence.
 g.state.health=1;g.teleport(0,0,8);g.step(.02);Object.assign(g.state.queen,{mode:'warn',attack:'slam',timer:.001,target:{x:0,z:8}});g.step(.02);
 assert.equal(g.state.won,false);assert.equal(g.state.ended,true);assert.equal(g.state.cinematic,false);assert.equal(document.getElementById('ending').hidden,false);
 console.log('PASS victory film, crown fall/pickup/coronation, fleeing ants, pause/skip/restart/loss; pre-battle worker/soldier movement; mounted charge; real scene creation, egg projectiles, spray across all three phases, victory, music reprise, restart, second supply station');
 g.scene.dispose();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
