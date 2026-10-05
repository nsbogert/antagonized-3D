import {loadFinaleQueen} from './queen-rigged.mjs';
import {loadRiggedMarin,victoryDanceAt,MARIN_CROWN_FIT} from './marin-rigged.mjs';
import {makeRoyalCrown} from './queen-finale.mjs';
const B=window.BABYLON,$=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new B.Vector3(x,y,z);
const engine=new B.Engine($('view'),true,{preserveDrawingBuffer:true}),scene=new B.Scene(engine);
engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));scene.clearColor=new B.Color4(.12,.16,.15,1);
const camera=new B.ArcRotateCamera('preview',Math.PI/2,1.35,6.8,V(0,1.6,0),scene);camera.attachControl($('view'),true);camera.lowerRadiusLimit=2;camera.upperRadiusLimit=12;camera.lowerBetaLimit=.2;camera.upperBetaLimit=1.65;camera.wheelPrecision=40;
const fill=new B.HemisphericLight('studio fill',V(0,1,0),scene);fill.intensity=1.3;
const key=new B.DirectionalLight('studio key',V(-.4,-.7,-1),scene);key.intensity=2;
const rim=new B.PointLight('rim',V(-2,4,-3),scene);rim.intensity=15;
function mat(name,color,options={}){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(color);if(options.glow)m.emissiveColor=m.diffuseColor.scale(options.glow);return m;}
function ball(name,x,y,z,sx,sy,sz,m,parent){const n=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:16},scene);n.position.set(x,y,z);n.scaling.set(sx,sy,sz);n.material=m;n.parent=parent;return n;}
function cyl(name,x,y,z,diam,height,m,parent,top=diam){const n=B.MeshBuilder.CreateCylinder(name,{diameterBottom:diam,diameterTop:top,height,tessellation:16},scene);n.position.set(x,y,z);n.material=m;n.parent=parent;return n;}
const floor=B.MeshBuilder.CreateGround('studio floor',{width:20,height:20},scene);floor.material=mat('floor','#34413a');floor.material.disableLighting=true;floor.material.emissiveColor=floor.material.diffuseColor;
let actor,time=0,paused=false,previous=performance.now(),closeup=false;
$('crown-closeup').onclick=()=>{closeup=!closeup;camera.target=closeup?V(0,2.95,0):V(0,1.6,0);camera.radius=closeup?2.2:6.8;camera.alpha=Math.PI/2;camera.beta=1.35;$('crown-closeup').textContent=closeup?'See the full character':'See the crown closer';};
try{
 actor=await loadRiggedMarin(B,scene);
 const crown=makeRoyalCrown({B,scene,V,mat,ball,cyl},actor.head);crown.position.set(MARIN_CROWN_FIT.x,MARIN_CROWN_FIT.height,0);crown.scaling.setAll(MARIN_CROWN_FIT.scale);crown.rotation.set(MARIN_CROWN_FIT.pitch,0,MARIN_CROWN_FIT.tilt);
 const fallbackCrown=crown.getChildren();
 try{
  const queenRig=await loadFinaleQueen(B,scene,crown);
  fallbackCrown.forEach(n=>n.setEnabled(false));queenRig.crownVisual.setEnabled(true);queenRig.polishCrown(1);
 }catch(error){console.warn('Using fallback preview crown.',error);}
 $('crown').onchange=()=>crown.setEnabled($('crown').checked);
 const labels={Boom_Dance:'Boom Dance · victory default',Love_You_Pop_Dance:'Love You Pop Dance',Breakdance_1990:'Breakdance 1990',Idle_15:'Idle',Walking:'Walk',Running:'Run',Jump_Over_Obstacle_2:'Jump over obstacle',Male_Bend_Over_Pick_Up:'Bend and pick up'};
 const cycle=document.createElement('option');cycle.value='cycle';cycle.textContent='Victory dance loop · Boom first';$('animation').append(cycle);
 for(const group of actor.groups){const option=document.createElement('option');option.value=group.name;option.textContent=labels[group.name]||group.name;$('animation').append(option);}
 $('animation').value='cycle';$('animation').disabled=false;$('pause').disabled=false;
 $('animation').onchange=()=>{time=0;actor.sample($('animation').value,0);};
 $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Play':'Pause';};
 $('status').textContent='Marin ready · '+actor.groups.length+' animations · 31,011 triangles';
}catch(error){$('status').textContent='Could not load Marin. Please reload to try again.';console.error(error);}
engine.runRenderLoop(()=>{const now=performance.now(),dt=Math.min((now-previous)/1000,.05);previous=now;if(actor){if(!paused)time+=dt;if($('animation').value==='cycle')actor.sampleVictory(time);else actor.sample($('animation').value,time);}scene.render();});
window.addEventListener('resize',()=>engine.resize());
