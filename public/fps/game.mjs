import {CHASE_DISTANCE,chaseCamera,crosshairPoint} from './camera-core.mjs';
import {makeGameplayMarin} from './gameplay-marin.mjs';
import {victoryCaption} from './victory-core.mjs';
import {createQueen,damageQueen,stepQueen,queenCenter,queenProgress,queenHint,QUEEN_PHASES} from './queen-core.mjs';
import {CHAPTERS,chapterNumber,chapterLoadout,nearLevelPoint,workerSpawns,WORKER_SOURCE_INTERVAL,advanceWorkerSource,workerEmergencePoint} from './chapters.mjs';
import {clamp,distanceXZ,canStomp,segmentHitsSphere,damageAnt,collectWorker,cacheIsClear,objectiveFor,stompTarget,SPRAY,consumeTank,collectGear,canAutoCollect,surfaceHeightAt,applyFoam,foamMovementScale,SOLDIER_FOAM_SECONDS,SOLDIER_MOUNT_HITS,collectAmmo,consumeAmmo,ammoKinds} from './core.mjs';
import {syncAntFoam} from './ant-foam.mjs';
import {loadFlyerFactory,flyerPose} from './flyer-rigged.mjs';
import {loadGroundAntFactory,groundAntPose,advanceGroundGait} from './ground-ant-rigged.mjs';
import {findMountTarget,SupplyVisits,jumpIntent} from './interaction-core.mjs';
import {buildWorld,V} from './world.mjs';
import {rotateLook,keyboardLook,LookGesture,ATTACK_KEYS,SPRINT_KEY,attackHeld} from './look.mjs';
const B=window.BABYLON, $=id=>document.getElementById(id), canvas=$('world');
// Display slots and number keys share this order; internal tool IDs stay stable.
const WEAPON_ORDER=[1,2,0];
const chapter=chapterNumber(new URLSearchParams(location.search).get('chapter')),level=CHAPTERS[chapter];
const isRoyal=level.place==='royal chamber',isWalls=level.place==='walls',isBathroom=level.place==='bathroom',isUnderground=isRoyal||isWalls;
let carriedGear=null;try{carriedGear=JSON.parse(localStorage.getItem(level.loadoutKey||'antagonized.noLoadout'));}catch{}
const startingLoadout=chapterLoadout(chapter,carriedGear);
if(isRoyal)$('victory-art').src='assets/marin-victory.png';
let engine,scene,camera,world,view;
try {
  if(!B?.Engine.isSupported()) throw new Error('WebGL unavailable');
  engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,antialias:true},true);
  engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.4));
  scene=new B.Scene(engine);scene.clearColor=new B.Color4(.66,.79,.8,1);
  scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=32;scene.fogEnd=80;scene.fogColor=new B.Color3(.68,.79,.74);
  const hemi=new B.HemisphericLight('sky',V(0,1,0),scene);hemi.intensity=.8;hemi.groundColor=new B.Color3(.32,.34,.29);
  const sun=new B.DirectionalLight('sun',V(-.4,-1,-.45),scene);sun.position=V(15,28,18);sun.intensity=.92;sun.diffuse=new B.Color3(1,.97,.87);
  camera=new B.UniversalCamera('Marin',V(0,1.65,18),scene);camera.minZ=.06;camera.maxZ=100;camera.fov=1.12;camera.rotation.set(0,Math.PI,0);camera.inputs.clear();scene.activeCamera=camera;
  if(isUnderground){hemi.intensity=.48;hemi.groundColor=new B.Color3(.18,.22,.2);sun.intensity=.24;sun.diffuse=new B.Color3(.62,.75,.73);scene.clearColor=new B.Color4(.07,.09,.075,1);scene.fogColor=new B.Color3(.13,.16,.135);scene.fogStart=21;scene.fogEnd=52;const torch=new B.PointLight('Marin work light',V(0,.35,.2),scene);torch.parent=camera;torch.diffuse=new B.Color3(.83,.94,.8);torch.intensity=.85;torch.range=17;const glow=new B.PointLight('colony signal light',V(14,6,-6),scene);glow.diffuse=new B.Color3(.56,.85,.45);glow.intensity=.75;glow.range=16;}
  if(isRoyal){const royalLight=new B.PointLight('royal heart light',V(0,6,-2),scene);royalLight.diffuse=new B.Color3(1,.55,.3);royalLight.intensity=1.3;royalLight.range=30;hemi.intensity=.55;scene.fogStart=28;scene.fogEnd=65;}
  if(chapter===2){hemi.intensity=.82;hemi.groundColor=new B.Color3(.43,.38,.3);sun.intensity=.65;sun.position=V(8,15,-6);const fill=new B.PointLight('warm kitchen lamps',V(0,8,2),scene);fill.diffuse=new B.Color3(1,.86,.62);fill.intensity=.55;fill.range=32;scene.fogStart=45;scene.fogEnd=90;}
  if(isBathroom){hemi.intensity=.74;hemi.groundColor=new B.Color3(.32,.4,.37);sun.intensity=.5;sun.diffuse=new B.Color3(.78,.9,.91);sun.position=V(3,14,-10);scene.clearColor=new B.Color4(.53,.66,.63,1);scene.fogColor=new B.Color3(.67,.76,.71);scene.fogStart=45;scene.fogEnd=85;const fill=new B.PointLight('warm vanity lamps',V(19,7,6),scene);fill.diffuse=new B.Color3(1,.86,.65);fill.intensity=.65;fill.range=25;const windowLight=new B.PointLight('frosted bathroom window',V(3,8,-10),scene);windowLight.diffuse=new B.Color3(.72,.88,.94);windowLight.intensity=.45;windowLight.range=28;}
  scene.imageProcessingConfiguration.contrast=1.05;scene.imageProcessingConfiguration.exposure=.96;
  world=buildWorld(scene,chapter);view=world.makeViewModel(camera);view.root.setEnabled(false);
  const skyTexture=new B.DynamicTexture('sky gradient',{width:4,height:256},scene,false);const skyCtx=skyTexture.getContext();const gradient=skyCtx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#78aabd');gradient.addColorStop(1,'#dce5ca');skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,4,256);skyTexture.update();const skyLayer=new B.Layer('sky',null,scene,true);skyLayer.texture=skyTexture;
  const shadows=new B.ShadowGenerator(1024,sun);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=B.ShadowGenerator.QUALITY_LOW;shadows.darkness=.2;shadows.bias=.006;shadows.normalBias=.04;sun.autoCalcShadowZBounds=true;
  for(const m of scene.meshes)if(m.name.endsWith('_merged')&&!['grass','grassLight','grassDark','cloud'].includes(m.material?.name))shadows.addShadowCaster(m);
} catch(error){$('fallback').hidden=false;console.error(error);throw error;}

const state={chapter,queen:isRoyal?createQueen():null,won:false,started:false,paused:true,ended:false,health:5,ammo:0,cannon:false,gear:false,weapon:0,tank:0,secured:0,clue:false,kills:0,stomps:0,throws:0,time:0,ride:null,rideTime:0,invulnerable:0};
const player={x:0,y:0,z:18,vy:0,grounded:true};
const eggs=[],ants=[],projectiles=[],patches=[],particles=[];
let flyerFactory=null;
function attachFlyer(ant){
 if(!flyerFactory||ant.type!=='flyer'||ant.rig||ant.root.isDisposed())return;
 const fallback=ant.root.getChildren().filter(n=>n!==ant.foamMesh&&n!==ant.crumb);
 const rig=flyerFactory.create(ant.root);if(!rig)return;
 ant.rig=rig;fallback.forEach(n=>n.setEnabled(false));ant.root.onDisposeObservable.add(()=>rig.dispose());
 syncAntFoam(ant);const pose=flyerPose(ant);rig.sample(pose.clip,pose.time);
}
const flyerReady=level.flyers.length>0?loadFlyerFactory(B,scene).then(factory=>{flyerFactory=factory;ants.forEach(attachFlyer);return !!factory;}).catch(error=>{console.warn('Flyer model unavailable; using fallback.',error);return false;}):Promise.resolve(false);
const groundFactories={worker:null,soldier:null};
function replaceGroundVisual(visual,type,carried=false){
 const factory=groundFactories[type];if(!factory||visual.rig||visual.root.isDisposed())return;
 const fallback=visual.root.getChildren().filter(n=>n!==visual.foamMesh&&n!==visual.crumb);
 const rig=factory.create(visual.root);if(!rig)return;
 visual.rig=rig;fallback.forEach(n=>n.dispose());visual.legs=[];visual.wings=[];
 visual.root.scaling.setAll(carried?.65:1);visual.root.onDisposeObservable.add(()=>rig.dispose());
 if(carried){rig.sample('Carry',0);return;}
 if(type==='worker')visual.crumb.position.set(0,.4,.78);
 syncAntFoam(visual);
 const pose=groundAntPose(visual);rig.sample(pose.clip,pose.time);
}
function attachGroundAnt(ant){if(ant.type==='worker'||ant.type==='soldier')replaceGroundVisual(ant,ant.type);}
function sampleAnt(ant,dt=1/60){syncAntFoam(ant);const pose=ant.type==='flyer'?flyerPose(ant):groundAntPose(ant);ant.rig?.sample(pose.clip,pose.time,dt);}
const groundAntsReady=Promise.all(['worker','soldier'].map(type=>type==='soldier'&&!level.soldiers.length?Promise.resolve(false):loadGroundAntFactory(B,scene,type).then(factory=>{
 groundFactories[type]=factory;ants.filter(a=>a.type===type).forEach(attachGroundAnt);
 if(type==='worker')replaceGroundVisual(view.held,'worker',true);
 return !!factory;
}).catch(error=>{console.warn(type+' model unavailable; using fallback.',error);return false;})));
const hero=makeGameplayMarin({B,scene,world,V,view});let perspective='third',cameraDistance=CHASE_DISTANCE;
function updateCamera(dt=0,snap=false){
 if(perspective==='third'){const pose=chaseCamera(player,camera.rotation,world.colliders,{riding:!!state.ride,previousDistance:cameraDistance,dt,snap});const pivot=V(player.x,player.y+(state.ride?2:1),player.z),offset=V(pose.x,pose.y,pose.z).subtract(pivot);
  // Merged scenery includes decorative roots and resin growths outside the walking colliders.
  const obstruction=scene.pickWithRay(new B.Ray(pivot,offset.normalize(),pose.distance+.15),mesh=>mesh.isEnabled()&&mesh.name.endsWith('_merged')&&!['grass','grassLight','grassDark','cloud'].includes(mesh.material?.name)&&(mesh.material?.alpha??1)>.95);
  if(obstruction?.hit&&obstruction.distance<pose.distance+.15){pose.distance=Math.max(.08,obstruction.distance-.15);const point=pivot.add(offset.scale(pose.distance));pose.x=point.x;pose.y=point.y;pose.z=point.z;pose.visibility=Math.max(0,Math.min(1,(pose.distance-.5)/.7));}
  cameraDistance=pose.distance;camera.position.set(pose.x,pose.y,pose.z);return pose.visibility;}
 camera.position.set(player.x,player.y+(state.ride?2.65:1.65),player.z);return 0;
}
function setPerspective(mode){if(state.cinematic)return;perspective=mode==='first'?'first':'third';$('camera-mode').value=perspective;updateCamera(0,true);view.root.setEnabled(perspective==='first');hero.update(player,state,camera.rotation,0,{firstPerson:perspective==='first'});$('camera-view').textContent=perspective==='third'?'THIRD PERSON':'FIRST PERSON';}
$('camera-mode').onchange=()=>setPerspective($('camera-mode').value);
const gesture=new LookGesture();let lookMode='drag',hadPointerLock=false;
const keys=new Set();let firing=false,fireCooldown=0,toastTime=0,bob=0,interactTarget=null,targetAnt=null,clock=0,queenSpawnTimer=35,uiTick=0,stepTimer=0,recoil=0,guideWasPaused=true;
let jumpTarget=null;const supplyVisits=new SupplyVisits();
const music=$('theme-music');music.volume=.28;music.src=level.music.src;$('music-status').textContent=level.music.title;
function syncMusic(){if(state.started&&((!state.paused&&!state.ended)||(state.won&&isRoyal&&!state.cinematicPaused))&&$('music-enabled').checked){music.play().catch(()=>{$('music-status').textContent='Music paused by browser — toggle music to retry.';});}else music.pause();}
$('music-enabled').onchange=syncMusic;$('music-volume').oninput=()=>music.volume=Number($('music-volume').value);
music.addEventListener('playing',()=>{$('music-status').textContent=state.won&&isRoyal?'Marin vs. the Colony · victory':level.music.title;});
music.addEventListener('error',()=>{$('music-status').textContent='Theme could not load. Game audio is still available.';});
let audioCtx=null;const soundEnabled=()=>$('sound').checked;
function sound(freq=200,duration=.1,type='sine',volume=.04,slide=0){if(!soundEnabled()||!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),audioCtx.currentTime+duration);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}
function toast(text,seconds=3.3){$('toast').textContent=text;$('toast').classList.add('visible');toastTime=seconds;}
function spawnAnt(type,x,z,cacheIndex=0){const visual=world.makeAnt(type);const carrying=type==='worker'&&!isRoyal&&ants.filter(a=>a.type==='worker').length%3===0;const a={...visual,type,x,y:type==='flyer'?3:0,z,hp:type==='soldier'?SOLDIER_MOUNT_HITS:type==='flyer'?2:1,mountedHits:0,state:'alive',foam:0,subdued:0,cacheIndex,job:isRoyal?'repair':carrying?'nest':'food',carry:carrying,phase:Math.random()*6.28,attack:0,deadTime:0,homeX:x,homeZ:z};a.root.position.set(x,a.y,z);a.crumb=world.ball('carried food',0,.62,1.08,.24,.25,.25,world.M.yellow,a.root);a.crumb.setEnabled(carrying);a.foamMesh=world.ball('foam coating',0,.28,0,1.3,.85,1.8,world.M.foam,a.root);syncAntFoam(a);a.animationTime=0;ants.push(a);attachFlyer(a);attachGroundAnt(a);return a;}
function retireWorker(a){a.state='departed';a.carry=false;a.crumb.setEnabled(false);a.root.setEnabled(false);a.shadow.setEnabled(false);}
function spawnSourceWorker(c,i){
  const point=workerEmergencePoint(c,world.colliders,c.workerSpawnSequence++);if(!point)return;
  // Keep producing at every open site, recycling a distant courier if a long session fills the arena.
  const residents=ants.filter(a=>a.type==='worker'&&a.state==='alive');
  if(residents.length>=level.workerLimit){
    const score=a=>distanceXZ(a,player)+(a.reinforcement?20:0)+(a.animationTime||0)*.01;
    const old=residents.reduce((far,a)=>score(a)>score(far)?a:far);retireWorker(old);
    old.root.dispose();old.shadow.dispose();ants.splice(ants.indexOf(old),1);
  }
  const a=spawnAnt('worker',point.x,point.z,i);
  Object.assign(a,{y:point.y,job:'food',carry:false,foodPoint:point,reinforcement:true});a.root.position.y=a.y;a.crumb.setEnabled(false);
}
function reset(){
  queenToastCooldown=0;state.queen=isRoyal?createQueen():null;state.won=false;state.cinematic=false;state.cinematicPaused=false;$('cinematic').hidden=true;$('victory-portrait').hidden=true;$('replay-film').hidden=true;$('ending').classList.remove('royal-victory');$('cinematic').dataset.stage='';music.src=level.music.src;$('music-status').textContent=level.music.title;
  supplyVisits.reset();world.resetChapter();hero.reset();view.root.setEnabled(perspective==='first');world.gearPickup.setEnabled(true);jumpTarget=null;music.currentTime=0;
  for(const a of ants){a.root.dispose();a.shadow.dispose();}ants.length=0;
  for(const list of [eggs,projectiles,patches,particles]){for(const p of list)p.node?.dispose();list.length=0;}
  Object.assign(state,{started:true,paused:false,ended:false,health:5,ammo:0,cannon:false,gear:false,weapon:0,tank:0,secured:0,clue:false,kills:0,stomps:0,throws:0,time:0,ride:null,rideTime:0,invulnerable:0});
  Object.assign(state,startingLoadout,{ammoKinds:[...startingLoadout.ammoKinds]});
  for(const [i,pos] of world.eggSpawns.entries()){const node=world.makeEgg();node.position.set(pos.x,pos.y,pos.z);node.rotation.y=i*1.3;eggs.push({...pos,node,type:'egg',state:'available'});}world.gearPickup.setEnabled(!state.gear);
  Object.assign(player,{...level.spawn,vy:0,grounded:true});camera.rotation.set(perspective==='third'?.08:0,Math.PI,0);updateCamera(0,true);keys.clear();gesture.clear();firing=false;fireCooldown=0;queenSpawnTimer=35;view.body.setEnabled(false);
  for(const c of world.caches){c.secured=false;c.workerSpawnTimer=WORKER_SOURCE_INTERVAL;c.workerSpawnSequence=0;c.lid.setEnabled(false);c.marker.el.hidden=false;}
  world.clueMarker.el.hidden=true;world.doorMarker.el.hidden=true;
  workerSpawns(chapter,world.caches,world.colliders).forEach(p=>spawnAnt('worker',...p));
  level.soldiers.forEach(p=>spawnAnt('soldier',...p));level.flyers.forEach(p=>spawnAnt('flyer',...p));
  $('ending').hidden=true;$('pause').hidden=true;$('guide').hidden=true;$('menu').hidden=true;$('veil').hidden=true;$('hud').hidden=false;
  hero.update(player,state,camera.rotation,0);if(perspective==='first')hero.hide();$('camera-view').textContent=perspective==='third'?'THIRD PERSON':'FIRST PERSON';toast(level.intro,7);updateHUD();
}
function start(){
  if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch{}}
  audioCtx?.resume();reset();syncMusic();lockPointer();
}
function updateLookMode(){
  canvas.dataset.lookMode=lookMode;
  canvas.style.cursor=lookMode==='locked'?'none':gesture.dragged?'grabbing':'grab';
  $('look-mode').textContent=lookMode==='locked'?'MOUSE LOOK':'ARROW KEYS TO LOOK';
  $('look-help').textContent=lookMode==='locked'?'Mouse turns & looks · arrows also look':'WASD moves · arrow keys look · R levels the view';
}
function dragFallback(){lookMode='drag';hadPointerLock=false;updateLookMode();}
function lockPointer(){
  gesture.clear();
  if($('mouse-mode').value!=='capture'||typeof canvas.requestPointerLock!=='function'){dragFallback();return;}
  try{const result=canvas.requestPointerLock();result?.catch(dragFallback);setTimeout(()=>{if(!document.pointerLockElement)dragFallback();},400);}catch{dragFallback();}
}

function pause(){if(state.cinematic){state.cinematicPaused=true;$('cinematic-toggle').textContent='Resume film';syncMusic();return;}if(!state.started||state.ended)return;state.paused=true;firing=false;gesture.clear();keys.clear();$('pause').hidden=false;syncMusic();if(document.pointerLockElement)document.exitPointerLock();}
function resume(){state.paused=false;$('pause').hidden=true;$('guide').hidden=true;syncMusic();lockPointer();}
function openGuide(){guideWasPaused=state.paused;if(state.started){state.paused=true;firing=false;gesture.clear();keys.clear();}if(document.pointerLockElement)document.exitPointerLock();$('pause').hidden=true;$('guide').hidden=false;syncMusic();}
function closeGuide(){$('guide').hidden=true;if(state.started){if(guideWasPaused){$('pause').hidden=false;}else resume();}}
$('next-chapter').href=level.next?'/fps/?chapter='+level.next:'/fps/?chapter=1';
$('start').onclick=start;$('resume').onclick=resume;$('restart').onclick=start;$('replay').onclick=start;$('pause-button').onclick=pause;$('guide-button').onclick=openGuide;$('pause-guide').onclick=openGuide;$('close-guide').onclick=closeGuide;
document.addEventListener('pointerlockchange',()=>{
  const wasLocked=hadPointerLock;hadPointerLock=document.pointerLockElement===canvas;
  lookMode=hadPointerLock?'locked':'drag';gesture.clear();firing=false;updateLookMode();
  if(wasLocked&&!hadPointerLock&&state.started&&!state.ended&&!state.paused)pause();
});
document.addEventListener('pointerlockerror',dragFallback);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',()=>{keys.clear();firing=false;if(state.cinematic||state.started&&!state.paused)pause();});
canvas.addEventListener('pointerdown',e=>{
  if(state.paused||state.ended||e.button>2)return;
  canvas.focus({preventScroll:true});
  if(document.pointerLockElement===canvas){if(e.button===0){firing=true;primaryAction();}return;}
  if(e.button===0||e.button===2){gesture.begin(e.clientX,e.clientY,e.button,performance.now());canvas.setPointerCapture?.(e.pointerId);e.preventDefault();}
});
document.addEventListener('pointermove',e=>{
  if(state.paused||state.ended)return;
  const sensitivity=Number($('sensitivity').value);
  if(document.pointerLockElement===canvas)rotateLook(camera.rotation,e.movementX,e.movementY,sensitivity);
  else {const delta=gesture.move(e.clientX,e.clientY);if(delta){firing=false;rotateLook(camera.rotation,delta.dx,delta.dy,sensitivity);updateLookMode();}}
});
document.addEventListener('pointerup',e=>{
  const click=gesture.end();firing=false;
  if(click&&!state.paused&&!state.ended)primaryAction();
  if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  updateLookMode();
});
document.addEventListener('pointercancel',()=>{gesture.clear();firing=false;updateLookMode();});
document.addEventListener('keydown',e=>{
  if(state.started&&!state.paused&&!state.ended&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Escape'&&state.cinematic){toggleCinematic();return;}
  if(state.cinematic)return;
  if(e.code==='Escape'){if(!$('guide').hidden)closeGuide();else if(state.started&&!state.ended){if(state.paused)resume();else pause();}return;}
  if(e.code==='KeyH'){if(!$('guide').hidden)closeGuide();else openGuide();return;}
  if(state.paused||state.ended)return;keys.add(e.code);if(e.code.startsWith('Arrow'))keyboardLook(camera.rotation,new Set([e.code]),.055,Number($('sensitivity').value));
  if(e.code==='KeyV'){setPerspective(perspective==='third'?'first':'third');return;}
  if(e.code==='Space')jumpAction();
  if(e.code==='KeyR')camera.rotation.x=0;if(ATTACK_KEYS.has(e.code)){firing=true;primaryAction();}
  const w=Number(e.key)-1;if(w>=0&&w<WEAPON_ORDER.length)selectWeapon(WEAPON_ORDER[w]);
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(ATTACK_KEYS.has(e.code))firing=attackHeld(keys);});
document.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('resize',()=>engine.resize());
for(const button of document.querySelectorAll('[data-look]')){
  button.addEventListener('pointerdown',e=>{if(state.paused||state.ended)return;e.preventDefault();button.setPointerCapture?.(e.pointerId);keys.add(button.dataset.look);keyboardLook(camera.rotation,new Set([button.dataset.look]),.055,Number($('sensitivity').value));});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.look));
}


let queenToastCooldown=0;
function queenInCone(pos,dir,range,cone){
  const q=state.queen;if(!q||q.mode==='dead')return false;
  const center=V(q.x,1.8,q.z),to=center.subtract(pos),dist=to.length();
  return dist<range+2&&B.Vector3.Dot(to.normalize(),dir)>cone&&!blockedByWall(pos,center);
}
function restockEggs(){for(const egg of eggs){egg.state='available';egg.node.setEnabled(true);}}
function hitQueen(amount,kind){
  const q=state.queen;if(!q)return;
  const result=damageQueen(q,amount,kind);
  if(result==='won'){finish(true);return;}
  if(result==='phase'){
    state.invulnerable=8;
    // Keep reinforcements bounded; guards can always be re-foamed instead of respawned.
    for(let i=ants.filter(a=>a.type==='flyer'&&a.state==='alive').length;i<2;i++)spawnAnt('flyer',i?13:-13,-7,i);
    toast(`Phase ${q.phase+1}: ${QUEEN_PHASES[q.phase].name}. Catch your breath; visit field supplies if needed.`,5);
    sound(130,.65,'triangle',.05,180);
  }else if(result==='exposed'){toast('Resin shattered! Spray or throw at the exposed queen.',4);sound(180,.3,'sawtooth',.045,-100);}
  else if(result==='foamed'){toast('Queen interrupted! Three seconds to reposition.',2.5);sound(300,.2,'sine',.035,-180);}
  else if(result==='cracked'){burst(V(q.x,2,q.z),world.M.yellow,5,4);}
  else if(result==='armored'&&queenToastCooldown<=0){toast(q.phase===2?'Dodge her attack. Strike during recovery.':'Resin armor! Use ants, eggs or a mounted charge.',2.5);queenToastCooldown=4;}
}
function updateQueen(dt){
  const q=state.queen;if(!q||state.ended)return;
  queenToastCooldown=Math.max(0,queenToastCooldown-dt);
  const slamTarget=q.target?{...q.target}:null;
  const repairs=ants.filter(a=>a.type==='worker'&&a.state==='alive'&&a.foam<=0&&distanceXZ(a,q)<6).length;
  for(const event of stepQueen(q,dt,player,repairs)){
    if(event==='hurt'){if(state.ride)dismount();hurt(true,2);}
    if(event==='awaken'){toast('The queen awakens. Stop her repair workers with spray or foam, then blast the resin armor.',5);sound(65,.7,'sawtooth',.045,45);}
    if(event==='repair')toast('She is stopping for repairs. Spray or foam her workers!',3);
    if(event==='warning'){toast(queenHint(q),2);sound(q.attack==='slam'?95:160,.45,'triangle',.045,80);}
    if(event==='slam'){const point=slamTarget||q;world.queenSlam(point);burst(V(point.x,.2,point.z),world.M.terra,16,5);sound(60,.5,'triangle',.06,-25);}
    if(event==='opening'&&q.phase===2)toast('She is exposed! Spray or throw now.',3);
  }
}
function updateQueenHUD(){
  const q=state.queen;$('boss-hud').hidden=!q;if(!q)return;
  $('boss-phase').textContent=`${q.phase+1} / 3`;
  const health=Math.round(queenProgress(q)*100);$('boss-fill').style.width=health+'%';$('boss-health').setAttribute('aria-valuenow',health);
  $('boss-status').textContent=queenHint(q);
  $('boss-armor').textContent=q.mode==='dormant'?'Eggs · Ant Launcher · spray · soldier mounts':q.mode==='intermission'?`Next phase in ${Math.ceil(q.timer)}s`:q.armor>0?`RESIN ${Math.ceil(q.armor)} / ${QUEEN_PHASES[q.phase].armor} · workers repair armor`:q.foamCooldown>0?`Foam interrupt ready in ${Math.ceil(q.foamCooldown)}s`:'Foam can interrupt her attack';
  $('boss-hud').classList.toggle('warning',q.mode==='warn'||q.mode==='charge');
}

function selectWeapon(w){if(!Number.isInteger(w)||w<0||w>2)return;if(w>0&&!state.gear){toast('Pick up your loaded exterminator kit at the tool bench first.');return;}state.weapon=w;fireCooldown=.15;updateHUD();sound(220+w*60,.07,'triangle',.02);}
function forward(){return camera.getForwardRay().direction.normalize();}
function burst(pos,material,count=7,strength=2){for(let i=0;i<count;i++){if(particles.length>90)break;const node=world.ball('impact',pos.x,pos.y,pos.z,.1,.1,.1,material,null,false);particles.push({node,life:.35+Math.random()*.35,max:.7,v:V((Math.random()-.5)*strength,Math.random()*strength,(Math.random()-.5)*strength)});}}
// Riding shields Marin from ordinary bites; queen attacks force a dismount and damage.
function hurt(force=false,amount=1){if(state.invulnerable>0||(!force&&state.ride)||state.ended)return;state.health=Math.max(0,state.health-amount);state.invulnerable=1.7;$('damage-flash').style.opacity='.65';setTimeout(()=>$('damage-flash').style.opacity='0',200);sound(110,.2,'sawtooth',.045,-60);if(state.health<=0)finish(false);}
function hit(a,amount,kind){if(a.type==='soldier'&&kind==='bite'&&(!state.ride||a===state.ride))return 'ignored';const result=damageAnt(a,amount,kind);if(result==='killed'){state.kills++;if(kind==='stomp')state.stomps++;a.deadTime=0;a.fallSpeed=0;a.deathKind=kind;a.corpseSurfaces=[...world.groundSurfaces,...world.colliders];a.carry=false;a.crumb.setEnabled(false);syncAntFoam(a);burst(V(a.x,a.y+.4,a.z),world.M.yellow,7,3);sound(160,.13,'triangle',.05,-90);}
  if(result==='subdued'){syncAntFoam(a);toast('Soldier subdued! Get close and press Space to ride.',4);sound(300,.25,'triangle',.04,230);}
  if(result==='foamed'){syncAntFoam(a);if(a.type==='soldier')toast(`Soldier held for ${SOLDIER_FOAM_SECONDS}s. Get close and press Space to ride.`,3);}
  if(result==='armored'&&(kind==='carcass'||kind==='egg'||kind==='stomp'))toast('Armor! Only another soldier can kill it. Foam it, then press Space nearby to ride.',3);
  return result;
}
function spendTank(cost){
  if(consumeTank(state,cost))return true;
  fireCooldown=.6;toast(state.tank<SPRAY.cost?'Tank empty. Walk up to a refill station.':'Not enough tank for foam. Refill at a station or switch to spray.',3);updateHUD();return false;
}
function projectileTarget(ant){return ant.state==='alive'||ant.type==='soldier'&&ant.state==='subdued';}
function primaryAction(){
  if(state.paused||state.ended||fireCooldown>0)return;
  if(state.weapon>0&&!state.gear)return;
  if(state.ride){state.ride.biting=.6;if(state.queen&&distanceXZ(player,state.queen)<6)hitQueen(2,'bite');fireCooldown=.55;const d=V(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y));let count=0;for(const a of ants){if(a===state.ride||!projectileTarget(a))continue;const offset=V(a.x-player.x,0,a.z-player.z);if(offset.length()<3.5&&B.Vector3.Dot(offset.normalize(),d)>.1){hit(a,3,'bite');count++;}}recoil=.13;sound(95,.2,'sawtooth',.05,-40);burst(V(player.x+d.x*2,player.y+.8,player.z+d.z*2),world.M.cream,5);return;}
  let dir=forward();let pos;
  if(perspective==='third'||(hero.sprayer&&(state.cannon||state.weapon>0))){
   const targets=ants.filter(projectileTarget).map(a=>({x:a.x,y:a.y+.6,z:a.z,radius:a.type==='soldier'?1.2:.65}));if(state.queen&&state.queen.mode!=='dead')targets.push({x:state.queen.x,y:1.8,z:state.queen.z,radius:2.4});
   const target=crosshairPoint(camera.position,dir,world.colliders,targets);pos=hero.sprayer&&hero.tool.isEnabled()?hero.sprayer.tip.computeWorldMatrix(true).getTranslation():V(player.x+Math.sin(camera.rotation.y)*.7,player.y+1.3,player.z+Math.cos(camera.rotation.y)*.7);dir=V(target.x,target.y,target.z).subtract(pos).normalize();
  }else{pos=camera.position.add(dir.scale(.85));pos.y-=.18;}
  if(state.weapon===0){
    if(!state.ammo){toast('Space near a worker to stomp. Walk over ants or eggs in throw or Ant Launcher mode to load; Shift throws.',2);fireCooldown=.5;return;}
    const kind=consumeAmmo(state);state.throws++;fireCooldown=state.cannon?.4:.65;recoil=.12;
    let aim=dir.clone();if($('assist').checked){let nearest=null,best=.93;for(const a of ants){if(!projectileTarget(a))continue;const to=V(a.x,a.y+.5,a.z).subtract(pos),dist=to.length();const dot=B.Vector3.Dot(to.normalize(),dir);if(dist<19&&dot>best){nearest=a;best=dot;}}if(state.queen&&state.queen.mode!=='dead'){const to=V(state.queen.x,1.8,state.queen.z).subtract(pos);const dot=B.Vector3.Dot(to.normalize(),dir);if(to.length()<25&&dot>best)nearest={x:state.queen.x,y:1.3,z:state.queen.z};}if(nearest){const speed=state.cannon?25:15;const to=V(nearest.x,nearest.y+.5,nearest.z).subtract(pos);to.y+=(state.cannon?2.5:5)*Math.pow(to.length()/speed,2);aim=to.normalize();}}
    let node;if(kind==='egg'){node=world.makeEgg();node.scaling.setAll(.7);}else{const visual=world.makeAnt('worker',true);world.squashAnt(visual,1);visual.root.scaling.set(.6,.19,.6);replaceGroundVisual(visual,'worker',true);visual.shadow.dispose();node=visual.root;}node.position.copyFrom(pos);projectiles.push({node,pos,vel:aim.scale(state.cannon?25:15).add(V(0,state.cannon?.6:1.4,0)),life:4,kind,gravity:state.cannon?5:10});sound(state.cannon?100:230,.15,'triangle',.05,-70);
  }else if(state.weapon===1){
    if(!spendTank(SPRAY.cost))return;fireCooldown=SPRAY.interval;recoil=.025;
    if(state.queen&&queenInCone(pos,dir,SPRAY.range,SPRAY.cone))hitQueen(SPRAY.damage,'spray');
    for(const a of ants){if(a.state!=='alive')continue;const to=V(a.x,a.y+.55,a.z).subtract(pos),dist=to.length();if(dist<SPRAY.range&&B.Vector3.Dot(to.normalize(),dir)>SPRAY.cone&&!blockedByWall(pos,V(a.x,a.y+.55,a.z)))hit(a,SPRAY.damage,'spray');}
    for(let i=0;i<3;i++){const p=pos.add(dir.scale(.5+i*.3));const node=world.ball('spray',p.x,p.y,p.z,.11,.11,.11,world.M.lime,null,false);particles.push({node,life:.28,max:.28,v:dir.scale(11).add(V((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2))});}sound(460+Math.random()*120,.07,'sawtooth',.012,-180);
  }else if(state.weapon===2){
    if(!spendTank(8))return;fireCooldown=.5;recoil=.08;const node=world.ball('foam blob',pos.x,pos.y,pos.z,.4,.4,.4,world.M.foam,null,false);projectiles.push({node,pos,vel:dir.scale(15).add(V(0,1,0)),life:3,kind:'foam',gravity:7});sound(340,.13,'sine',.05,-200);
  }
  updateHUD();
}
function blockedByWall(a,b){for(const c of world.colliders){const steps=Math.ceil(B.Vector3.Distance(a,b)*3);for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;if(x>c.x&&x<c.x+c.w&&z>c.z&&z<c.z+c.d&&y>c.bottom&&y<c.top)return true;}}return false;}
function mountTarget(){return findMountTarget(player,ants.filter(a=>!blockedByWall(V(player.x,player.y+.4,player.z),V(a.x,a.y+.5,a.z))));}
function jumpAction(){
  const ant=state.ride?null:mountTarget(),intent=jumpIntent(state,player,ant);
  if(intent==='dismount'){jumpTarget=null;dismount();return;}
  if(intent==='mount'){
    state.ride=ant;ant.state='mounted';syncAntFoam(ant);state.rideTime=40;player.x=ant.x;player.z=ant.z;player.y=ant.y;player.vy=0;player.grounded=true;jumpTarget=null;
    toast('Hold W into the '+level.climbObject+' to climb. Space dismounts.',5);sound(160,.25,'triangle',.04,220);updateHUD();return;
  }
  if(intent==='jump'){jumpTarget=$('assist').checked?stompTarget(player,ants,camera.rotation.y):null;player.vy=9.4;player.grounded=false;sound(180,.12,'triangle',.035,120);}
}
function autoInteract(){
  const stations=isRoyal?world.supplyPoints:[world.bench];
  const nearby=stations.filter(p=>nearLevelPoint(player,p,3.3)&&!blockedByWall(V(player.x,player.y+.4,player.z),V(p.x,(p.y||0)+.4,p.z)));
  supplyVisits.update(nearby);
  if(state.ride||state.ended||!player.grounded)return;
  const t=getProximityInteraction();if(!t)return;
  if(t.type==='bench'&&!supplyVisits.enter(t.station))return;
  if(t.type==='cache'&&!cacheIsClear(t.cache,ants))return;
  interact(t);
}
function interact(t=getProximityInteraction()){if(state.ride||!t)return;
  if(t.type==='cache'){const c=t.cache;if(!cacheIsClear(c,ants)){toast(isBathroom?'Workers are guarding this gap. Stomp or spray them first.':'Workers are guarding this food. Stomp or spray them first.',3);return;}c.secured=true;c.lid.setEnabled(true);c.marker.el.hidden=true;state.secured++;state.health=Math.min(5,state.health+1);toast(state.secured===3?(isBathroom?'Plumbing entry points sealed! ':'Food supply cut off! ')+level.climb:`${c.name.toLowerCase()} ${isBathroom?'sealed':'secured'}. Health restored.`,4);sound(440,.3,'triangle',.05,300);}
  if(t.type==='bench'){if(isRoyal)restockEggs();const first=collectGear(state);world.gearPickup.setEnabled(false);state.health=5;let messages=[first?'Backpack collected! Spray equipped. 2 selects foam · 3 selects Ant Launcher.':'Tank and health restored.'];toast(messages.join(' '),5);sound(500,.35,'triangle',.05,400);}
  if(t.type==='clue'){state.clue=true;world.clueMarker.el.hidden=true;toast(level.discovered,5);sound(330,.5,'triangle',.045,440);}
  if(t.type==='door')finish(true);
  updateHUD();
}
function dismount(){const a=state.ride;if(!a)return;state.ride=null;a.state='subdued';a.subdued=10;syncAntFoam(a);player.vy=7;player.grounded=false;const yaw=camera.rotation.y;const choices=[V(Math.cos(yaw)*1.8,0,-Math.sin(yaw)*1.8),V(-Math.cos(yaw)*1.8,0,Math.sin(yaw)*1.8),V()];for(const p of choices){const x=player.x+p.x,z=player.z+p.z;if(!world.colliders.some(c=>x>c.x-.35&&x<c.x+c.w+.35&&z>c.z-.35&&z<c.z+c.d+.35&&player.y<c.top-.2)){player.x=clamp(x,-23,23);player.z=clamp(z,-23,23);break;}}toast('Dismounted. The soldier will recover soon.',2);}
function getProximityInteraction(){
  if(state.ride)return null;
  const clearPoint=p=>!blockedByWall(V(player.x,player.y+.4,player.z),V(p.x,(p.y||0)+.4,p.z));
  const stations=isRoyal?world.supplyPoints:[world.bench];
  const station=stations.find(p=>nearLevelPoint(player,p,3.3)&&clearPoint(p));
  if(station)return {type:'bench',station,text:!state.gear?'Walk up to collect the loaded kit':'Walk up to refill health & tank'};
  if(!isRoyal&&state.secured===3&&state.clue&&nearLevelPoint(player,level.exit)&&clearPoint(level.exit))return {type:'door',text:level.exitAction};
  if(!isRoyal&&!state.clue&&(chapter===1||state.secured===3)&&nearLevelPoint(player,world.clue)&&clearPoint(world.clue))return {type:'clue',text:isWalls?'Decode the queen’s signal':'Inspect the colony’s trail'};
  if(!isRoyal)for(const c of world.caches)if(!c.secured&&nearLevelPoint(player,c,c.name==='SHOWER TILE CRACK'?1.7:2.5)&&clearPoint(c))return {type:'cache',cache:c,text:cacheIsClear(c,ants)?`Seal ${c.name.toLowerCase()}${isBathroom?' entry point':' food cache'}`:'Workers nearby · stomp or spray them away'};
  return null;
}
function getInteraction(){
  if(state.ride)return {type:'dismount',text:'Dismount soldier'};
  const nearby=getProximityInteraction();if(nearby)return nearby;
  const ant=mountTarget();return ant?{type:'mount',ant,text:`Ride foamed soldier · ${Math.ceil(ant.subdued||ant.foam)}s`}:null;
}

function movePlayer(dt){
  keyboardLook(camera.rotation,keys,dt,Number($('sensitivity').value));
  const oldX=player.x,oldZ=player.z,previousY=player.y;
  const yaw=camera.rotation.y,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  let dx=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),sx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  const norm=Math.hypot(dx,sx)||1;dx/=norm;sx/=norm;const sprint=keys.has(SPRINT_KEY);const speed=(state.ride?(sprint?10:6.4):(sprint?7.7:5.3))*(world.waterAt(player)?.78:1);
  let mx=(fx*dx+rx*sx)*speed*dt,mz=(fz*dx+rz*sx)*speed*dt;
  // A nearby target gets a gentle horizontal pull; steering away cancels it.
  if(jumpTarget){if(jumpTarget.state!=='alive'||state.ride||dx<0||sx!==0||!$('assist').checked)jumpTarget=null;else if(!player.grounded){const d=distanceXZ(player,jumpTarget);if(d>4.5)jumpTarget=null;else{const pull=Math.min(d,5.5*dt);mx=(jumpTarget.x-player.x)/(d||1)*pull;mz=(jumpTarget.z-player.z)/(d||1)*pull;}}}
  const radius=state.ride?.7:.34;
  let nx=clamp(player.x+mx,-23,23),nz=clamp(player.z+mz,-12.95,23),climbing=false;
  for(const c of world.colliders){
    if(player.y>=c.top-.08||player.y+1.6<c.bottom)continue;
    if(nx>c.x-radius&&nx<c.x+c.w+radius&&nz>c.z-radius&&nz<c.z+c.d+radius){
      if(player.grounded&&c.top-player.y<=.22&&(Math.abs(mx)+Math.abs(mz)>.001)){player.y=c.top;player.vy=0;climbing=true;continue;}
      if(state.ride&&c.top<=3.5&&(Math.abs(mx)+Math.abs(mz)>.001)){player.y=Math.min(c.top,player.y+3.8*dt);player.vy=0;climbing=true;if(player.y>=c.top-.02){nx=clamp(nx,c.x+.12,c.x+c.w-.12);nz=clamp(nz,c.z+.12,c.z+c.d-.12);continue;}}
      if(player.x<=c.x-radius||player.x>=c.x+c.w+radius)nx=player.x;
      if(player.z<=c.z-radius||player.z>=c.z+c.d+radius)nz=player.z;
      if(nx>c.x-radius&&nx<c.x+c.w+radius&&nz>c.z-radius&&nz<c.z+c.d+radius){nx=player.x;nz=player.z;}
    }
  }
  if(state.queen&&state.queen.mode!=='dead'&&player.y<2.8){
    const q=state.queen,dx=nx-q.x,dz=nz-q.z,d=Math.hypot(dx,dz);
    if(d<2.9){nx=q.x+(d?dx/d:0)*2.9;nz=q.z+(d?dz/d:1)*2.9;}
  }
  player.x=nx;player.z=nz;const oldY=player.y;
  if(!climbing){player.vy-=22*dt;player.y+=player.vy*dt;player.grounded=false;}
  if(!state.ride){for(const a of ants){if(canStomp(oldY,player.y,player.vy,player,a)&&!blockedByWall(V(player.x,Math.max(.25,player.y),player.z),V(a.x,a.y+.5,a.z))){hit(a,4,'stomp');player.y=a.y+(a.type==='soldier'?1.15:.55);player.vy=a.type==='soldier'?5.5:3.8;jumpTarget=null;state.invulnerable=Math.max(state.invulnerable,.65);recoil=.08;break;}}}
  if(state.queen&&!state.ride&&player.vy<0&&oldY>=2.7&&player.y<=2.8&&distanceXZ(player,state.queen)<3.5){hitQueen(6,'stomp');player.vy=5;player.y=2.85;state.invulnerable=Math.max(state.invulnerable,.8);}
  let ground=0;for(const c of world.colliders){if(player.x>c.x-.03&&player.x<c.x+c.w+.03&&player.z>c.z-.03&&player.z<c.z+c.d+.03&&oldY>=c.top-.12)ground=Math.max(ground,c.top);}
  if(player.y<=ground){if(player.vy<-5&&!world.waterAt(player))burst(V(player.x,.1+ground,player.z),world.M.cream,5,2);player.y=ground;player.vy=0;player.grounded=true;jumpTarget=null;}
  if(climbing)player.grounded=true;
  world.updateWater(dt,player,{x:oldX,y:previousY,z:oldZ},!!state.ride);
  if(state.ride&&sprint&&state.queen&&distanceXZ(player,state.queen)<5&&Math.abs(mx)+Math.abs(mz)>.001)hitQueen(9,'charge');
  if(state.ride){const a=state.ride;a.x=player.x;a.z=player.z;a.y=player.y;a.root.rotation.y=yaw;a.root.rotation.x=climbing?-.5:0;state.rideTime-=dt;if(state.rideTime<=0){dismount();toast('The soldier bucked you off! Foam it again to subdue it.',4);a.state='alive';a.foam=0;syncAntFoam(a);}else if(sprint){for(const victim of ants){if(victim!==a&&victim.state==='alive'&&victim.type==='worker'&&distanceXZ(a,victim)<2)hit(victim,4,'charge');}}}
  if(Math.abs(mx)+Math.abs(mz)>.0001){bob+=dt*(sprint?13:9);stepTimer-=dt;if(stepTimer<=0&&player.grounded){sound(state.ride?75:130,.05,'triangle',.018,-40);stepTimer=sprint?.25:.4;}}else bob*=.95;
  const visibility=updateCamera(dt);
  if(perspective==='third'){const moved=Math.hypot(player.x-oldX,player.z-oldZ);hero.update(player,state,camera.rotation,dt,{speed:moved/Math.max(dt,.00001),moveYaw:Math.atan2(player.x-oldX,player.z-oldZ),visibility});}else hero.update(player,state,camera.rotation,dt,{firstPerson:true,recoil});
  view.root.setEnabled(perspective==='first');
  view.root.position.x=Math.sin(bob)*.015;view.root.position.y=Math.abs(Math.cos(bob))*.014-recoil;recoil=Math.max(0,recoil-dt*.7);
  const carrying=state.weapon===0&&!state.cannon&&state.ammo>0;
  const equipped=state.weapon>0||state.cannon;
  view.body.setEnabled(false);
  view.body.position.set(player.x,player.y,player.z);view.body.rotation.y=camera.rotation.y;
  view.body.rotation.x=player.grounded?0:-.12;
  view.hands.setEnabled(!state.ride&&carrying);
  view.held.root.setEnabled(!state.ride&&carrying&&state.ammoKinds?.[0]!=='egg');
  view.heldEgg.setEnabled(!state.ride&&carrying&&state.ammoKinds?.[0]==='egg');
  view.gun.setEnabled(false);
  view.gun.rotation.x=0;view.gun.position.y=-.43;
  view.tip.material=state.weapon===2?world.M.foam:world.M.lime;
  canvas.dataset.yaw=camera.rotation.y.toFixed(3);canvas.dataset.pitch=camera.rotation.x.toFixed(3);
  canvas.dataset.height=player.y.toFixed(3);canvas.dataset.x=player.x.toFixed(3);canvas.dataset.z=player.z.toFixed(3);canvas.dataset.pose=state.ride?'riding':carrying?'carrying':equipped?'equipped':'relaxed';

}
function steerAnt(a,tx,tz,speed,dt){let dx=tx-a.x,dz=tz-a.z,dist=Math.hypot(dx,dz);if(dist<.1)return;dx/=dist;dz/=dist;let nx=a.x+dx*speed*dt,nz=a.z+dz*speed*dt;
  for(const c of world.colliders){if(a.y>=c.top-.05||(isBathroom&&c.top<=.22))continue;if(nx>c.x-.65&&nx<c.x+c.w+.65&&nz>c.z-.65&&nz<c.z+c.d+.65){const choice=a.phase>3?1:-1;nx=a.x+dz*speed*dt*choice;nz=a.z-dx*speed*dt*choice;if(nx>c.x-.4&&nx<c.x+c.w+.4&&nz>c.z-.4&&nz<c.z+c.d+.4){nx=a.x;nz=a.z;}}}
  const desiredYaw=Math.atan2(nx-a.x,nz-a.z);
  if(a.rig&&a.type!=='flyer'){
    if(Math.hypot(nx-a.x,nz-a.z)>.001){const turn=Math.atan2(Math.sin(desiredYaw-a.root.rotation.y),Math.cos(desiredYaw-a.root.rotation.y));a.root.rotation.y+=clamp(turn,-dt*5,dt*5);}
  }else a.root.rotation.y=Math.atan2(dx,dz);
  a.x=clamp(nx,-22.5,22.5);a.z=clamp(nz,-12.5,22.5);
}
function updateAnts(dt){
  if(state.queen?.mode==='dead')return;
  for(const a of ants){if(a.state==='collected')continue;a.animationTime=(a.animationTime||0)+dt;a.biting=Math.max(0,(a.biting||0)-dt);const beforeX=a.poseX??a.x,beforeZ=a.poseZ??a.z;a.attack=Math.max(0,a.attack-dt);a.foam=Math.max(0,a.foam-dt);
    if(a.state==='dead'){
      a.deadTime+=dt;const surface=surfaceHeightAt(a,a.corpseSurfaces||world.groundSurfaces);
      if(a.type==='flyer'){const fall=(a.fallSpeed||0)*dt+8*dt*dt;a.fallSpeed=(a.fallSpeed||0)+16*dt;a.y=Math.max(surface,a.y-fall);if(a.y===surface)a.fallSpeed=0;}
      else a.y=Math.max(surface,a.y-dt*3);
      if(a.rig)sampleAnt(a,dt);else world.squashAnt(a,Math.min(1,a.deadTime*9));
      a.root.position.set(a.x,a.y+(a.type==='flyer'?.008:.07),a.z);a.shadow.position.set(a.x,surface+.015,a.z);
      // Leave the squash visible for a beat before loading it, with excess ammo on the ground.
      if(a.deadTime>(state.cannon?.12:.35)&&canAutoCollect(state,player,a)&&!blockedByWall(V(player.x,player.y+.4,player.z),V(a.x,a.y+.3,a.z))&&collectWorker(state)){
        a.state='collected';a.root.setEnabled(false);a.shadow.setEnabled(false);toast(state.cannon?`Worker loaded · ${state.ammo}/3`:'Worker collected · Shift to throw',1.8);sound(430,.1,'triangle',.03,160);
      }
      continue;
    }
    if(a.state==='subdued'){a.subdued-=dt;if(a.subdued<=0){a.state='alive';a.foam=0;}a.root.rotation.z=.16*Math.sin(clock*3);}
    if(a.state==='alive'){
      a.root.rotation.z=0;a.root.rotation.x=0;syncAntFoam(a);const slow=a===jumpTarget?Math.min(.12,foamMovementScale(a)):foamMovementScale(a);
      if(a.type==='worker'){
        const c=world.caches[a.cacheIndex];let tx,tz;
        if(state.queen){
          const q=state.queen;
          // Royal workers attend the queen; the food-delivery loop belongs to the household chapters.
          a.job='repair';a.carry=false;
          tx=q.x+Math.cos(a.phase+clock*.18)*4;tz=q.z+Math.sin(a.phase+clock*.18)*4;
        }
        else if(c.secured&&!a.carry){tx=level.nest.x+Math.cos(clock*.12+a.phase)*3;tz=level.nest.z+1.5+Math.sin(clock*.12+a.phase)*2;}
        else if(a.job==='food'){const food=a.foodPoint||{x:c.x+Math.cos(a.phase)*1.5,z:c.z+Math.sin(a.phase)*1.5};tx=food.x;tz=food.z;if(distanceXZ(a,food)<.4){a.job='nest';a.carry=true;}}
        else{tx=level.nest.x+Math.cos(a.phase)*2;tz=level.nest.z;if(distanceXZ(a,{x:tx,z:tz})<.5){a.job='food';a.carry=false;if(a.reinforcement)retireWorker(a);}}
        if(a.state==='departed')continue;
        a.crumb.setEnabled(!isRoyal&&a.carry);steerAnt(a,tx,tz,1.15*slow,dt);if(isBathroom)a.y=surfaceHeightAt({...a,y:Math.max(.18,a.y)},world.groundSurfaces);
      }else if(a.type==='soldier'){
        let tx=a.x,tz=a.z;const d=distanceXZ(a,player);if(d<8&&player.y<1.8){tx=player.x;tz=player.z;}else{tx=a.homeX+Math.cos(clock*.2+a.phase)*2;tz=a.homeZ+Math.sin(clock*.2+a.phase)*2;}
        steerAnt(a,tx,tz,(d<8?2.1:.7)*slow,dt);if(isBathroom&&a.y<=.22)a.y=surfaceHeightAt({...a,y:.18},world.groundSurfaces);if(a.y>0){let support=world.colliders.find(c=>a.x>c.x&&a.x<c.x+c.w&&a.z>c.z&&a.z<c.z+c.d&&a.y>=c.top-.2);a.y=Math.max(support?.top||0,a.y-dt*3);}
      }else{
        const diving=Math.sin(clock*1.2+a.phase)>.65&&distanceXZ(a,player)<8&&a.foam<=0;a.diving=diving;
        const tx=diving?player.x:a.homeX+Math.sin(clock*.6+a.phase)*3,tz=diving?player.z:a.homeZ+Math.cos(clock*.5+a.phase)*3;
        steerAnt(a,tx,tz,(diving?4:2.6)*slow,dt);const targetY=diving?player.y+.65:(chapter>1?4.5:2.8)+Math.sin(clock*1.2+a.phase)*.7;a.y=a.foam>0?Math.max(.1,a.y-dt*5):a.y+(targetY-a.y)*Math.min(1,dt*4);
      }
      const d=distanceXZ(a,player);if(d<(a.type==='soldier'?1.65:.88)&&player.y<a.y+.55&&player.y+1.6>a.y+.15&&a.attack<=0&&!(a.type==='soldier'&&a.foam>0)){hurt();a.attack=1.5;a.biting=.6;}
    }
    a.movementSpeed=Math.hypot(a.x-beforeX,a.z-beforeZ)/Math.max(dt,.001);a.poseX=a.x;a.poseZ=a.z;
    advanceGroundGait(a,Math.hypot(a.x-beforeX,a.z-beforeZ));
    if(a.rig)sampleAnt(a,dt);
    const moving=a.state==='alive'||a.state==='mounted';for(const leg of a.legs){const phase=clock*(a.foam>0?3:11)+leg.i*2+leg.side;leg.pivot.rotation.y=moving?Math.sin(phase)*.34:0;leg.pivot.rotation.z=a.state==='subdued'?leg.side*.2:moving?-leg.side*Math.max(0,Math.sin(phase))*.15:0;}
    for(let i=0;i<a.wings.length;i++)a.wings[i].rotation.z=(i?1:-1)*Math.sin(clock*36)*.45;
    a.root.position.set(a.x,a.y+(moving&&(!a.rig||a.type==='flyer')?Math.sin(clock*12+a.phase)*.025:0),a.z);a.shadow.position.set(a.x,.045,a.z);a.shadow.scaling.setAll(a.type==='flyer'?.7:1);
  }
  if(isRoyal){
    queenSpawnTimer-=dt;if(queenSpawnTimer<=0){queenSpawnTimer=20;const alive=ants.filter(a=>a.state==='alive'&&a.type==='worker').length;if(alive<6){const c=world.caches[alive%3];spawnAnt('worker',c.x+1,c.z+1,alive%3);}}
  }else world.caches.forEach((c,i)=>{for(let n=advanceWorkerSource(c,dt);n>0;n--)spawnSourceWorker(c,i);});
  // Recycle old non-ammunition enemies; keep a limited reserve of worker carcasses.
  const dead=ants.filter(a=>a.state==='dead'&&a.type==='worker');for(let i=ants.length-1;i>=0;i--){const a=ants[i];if(a.state==='departed'||a.state==='collected'||(a.state==='dead'&&a.type!=='worker'&&a.deadTime>15)||(a.state==='dead'&&a.type==='worker'&&dead.length>18&&a.deadTime>50)){a.root.dispose();a.shadow.dispose();ants.splice(i,1);}}
}
function foamPatch(pos){const y=surfaceHeightAt(pos,[...world.groundSurfaces,...world.colliders]);const node=world.ball('foam patch',pos.x,y+.1,pos.z,2.1,.2,2.1,world.M.foam,null,false);patches.push({node,x:pos.x,y,z:pos.z,life:10});}
function updateEggs(){
  for(const egg of eggs){
    if(canAutoCollect(state,player,egg)&&!blockedByWall(V(player.x,player.y+.4,player.z),V(egg.x,egg.y+.3,egg.z))&&collectAmmo(state,'egg')){
      egg.state='collected';egg.node.setEnabled(false);
      toast(state.cannon?`Egg loaded · ${state.ammo}/3`:'Egg collected · Shift to throw',1.8);sound(560,.1,'triangle',.03,180);
    }
  }
}
function updateEffects(dt){
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];const old=p.pos.clone();p.vel.y-=p.gravity*dt;p.pos.addInPlace(p.vel.scale(dt));p.life-=dt;p.node.position.copyFrom(p.pos);if(p.kind!=='foam')p.node.rotation.x+=dt*9;
    let collided=false;for(const a of ants){if(!projectileTarget(a))continue;const center=V(a.x,a.y+(a.type==='soldier'?.9:.5),a.z);if(segmentHitsSphere(old,p.pos,center,a.type==='soldier'?1.35:a.type==='flyer'?.8:.7)){hit(a,3,p.kind);burst(p.pos,p.kind==='foam'?world.M.foam:world.M.cream,6,2);collided=true;break;}}
    if(!collided&&state.queen&&state.queen.mode!=='dead'&&segmentHitsSphere(old,p.pos,queenCenter(state.queen),3.3)&&!blockedByWall(old,p.pos)){hitQueen(3,p.kind);burst(p.pos,world.M.egg,7,3);collided=true;}
    const wall=blockedByWall(old,p.pos);if(p.pos.y<.15||wall){if(p.kind==='foam')foamPatch(p.pos);collided=true;}
    if(collided||p.life<=0){if(p.kind==='egg')burst(p.pos,world.M.egg,9,3);p.node.dispose();projectiles.splice(i,1);}
  }
  for(const p of patches){if(state.queen&&distanceXZ(p,state.queen)<3&&state.queen.foamCooldown<=0)hitQueen(1,'foam');p.life-=dt;for(const a of ants){if(p.life>0&&a.state==='alive'&&Math.abs(a.y-p.y)<1&&distanceXZ(a,p)<1.3&&!blockedByWall(V(p.x,p.y+.2,p.z),V(a.x,a.y+.5,a.z))){applyFoam(a);syncAntFoam(a);}}}
  for(const list of [patches])for(let i=list.length-1;i>=0;i--)if(list[i].life<=0){list[i].node.dispose();list.splice(i,1);}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.node.position.addInPlace(p.v.scale(dt));p.v.y-=dt*4;p.node.scaling.setAll(Math.max(.1,p.life/p.max));if(p.life<=0){p.node.dispose();particles.splice(i,1);}}
}
function updateAim(){targetAnt=null;const dir=forward();let closest=25;for(const a of ants){if(a.state!=='alive'&&a.state!=='subdued')continue;const to=V(a.x,a.y+.6,a.z).subtract(camera.position),dist=to.length();if(dist<closest&&B.Vector3.Dot(to.normalize(),dir)>.965&&!blockedByWall(camera.position,V(a.x,a.y+.6,a.z))){targetAnt=a;closest=dist;}}
  $('crosshair').classList.toggle('target',!!targetAnt||queenInCone(camera.position,dir,32,.94));let text='';if(targetAnt){text=targetAnt.state==='subdued'?`SUBDUED · ${Math.ceil(targetAnt.subdued)}s TO MOUNT`:targetAnt.type==='soldier'?(targetAnt.foam>0?`FOAMED · ${Math.ceil(targetAnt.foam)}s · STOMP OR THROW`:'SOLDIER · ARMORED'):targetAnt.type==='flyer'?'FLYER · THROW TO HIT':targetAnt.foam>0?'WORKER · SLOWED':'WORKER';}if(!text&&$('assist').checked&&player.grounded&&!state.ride&&stompTarget(player,ants,camera.rotation.y))text='SPACE · STOMP ASSIST READY';if(state.queen&&!text&&queenInCone(camera.position,dir,32,.91))text=state.queen.armor>0?'QUEEN · RESIN ARMOR':state.queen.open>0?'QUEEN · EXPOSED':'QUEEN · WAIT FOR AN OPENING';
  if(targetAnt?.type==='soldier')text+=` · ${targetAnt.mountedHits||0}/${SOLDIER_MOUNT_HITS} SOLDIER HITS`;
  const nearbyEgg=!state.ride&&eggs.find(egg=>egg.state==='available'&&distanceXZ(player,egg)<1.6&&Math.abs(player.y-egg.y)<1.2&&!blockedByWall(V(player.x,player.y+.4,player.z),V(egg.x,egg.y+.3,egg.z)));
  if(nearbyEgg){if(state.weapon!==0)text=state.cannon?'EGG AMMO · 3 TO EQUIP ANT LAUNCHER':'EGG AMMO · 3 TO EQUIP THROW';else if(state.ammo>=(state.cannon?3:1))text=state.cannon?'LAUNCHER FULL · SHIFT TO FIRE, THEN WALK OVER EGGS':'HANDS FULL · SHIFT TO THROW, THEN WALK OVER EGGS';}
  $('target-info').textContent=text;
  interactTarget=getInteraction();$('interaction').innerHTML=interactTarget?`<span>${['mount','dismount'].includes(interactTarget.type)?'<kbd>SPACE</kbd> ':''}${interactTarget.text}</span>`:'';
}
function updateHUD(){const obj=objectiveFor(state);$('objective-title').textContent=obj.title;$('objective-detail').textContent=obj.detail;[...$('cache-dots').children].forEach((el,i)=>el.classList.toggle('done',isRoyal?(state.queen.mode==='dead'||i<state.queen.phase):world.caches[i].secured));updateQueenHUD();
  $('health-number').textContent=state.health*20; $('hearts').innerHTML=Array.from({length:5},(_,i)=>`<span class="${i>=state.health?'empty':''}">♥</span>`).join('');$('ammo-label').textContent=state.ammo?(state.cannon?'NEXT: ':'CARRIED ')+(state.ammoKinds?.[0]==='egg'?'EGG':'ANT'):(state.cannon?'LAUNCHER AMMO':'CARRIED AMMO');$('inventory-ammo').textContent=state.ammo;$('inventory-capacity').textContent='/ '+(state.cannon?3:1);$('tank-count').textContent=!state.gear?'GET KIT':state.tank<SPRAY.cost?'EMPTY':Math.ceil(state.tank)+'%';$('ammo-slots').innerHTML=Array.from({length:state.cannon?3:1},(_,i)=>`<i class="${i<state.ammo?'filled':''}"></i>`).join('');
  const names=['SPRAY','FOAM',state.cannon?'ANT LAUNCHER':'THROW'],slots=state.gear?[0,1,2]:[2];$('weapons').innerHTML=slots.map(i=>{const n=names[i],weapon=WEAPON_ORDER[i];return `<div class="weapon-slot ${state.weapon===weapon?'selected':''} ${weapon>0&&!state.gear?'locked':''}"><b>${i+1}</b>${n}</div>`;}).join('');$('resource-label').textContent=state.weapon===0?(state.cannon?'WALK OVER ANTS / EGGS · AUTO-LOAD · MAX 3':'WALK OVER ANTS / EGGS · SHIFT TO THROW'):(!state.gear?'PICK UP THE LOADED KIT':`SHARED TANK  ${Math.ceil(state.tank)} / 100 · REFILL AT STATIONS`);$('resource-fill').style.width=(state.weapon===0?state.ammo/(state.cannon?3:1)*100:state.tank)+'%';
  $('ride-bar').hidden=!state.ride;$('ride-fill').style.width=state.rideTime/40*100+'%';$('ride-time').textContent=Math.ceil(state.rideTime)+'s';$('heading').textContent=String(Math.round(((camera.rotation.y*180/Math.PI)%360+360)%360)).padStart(3,'0')+'°';$('look-angle').textContent=camera.rotation.x>.2?'LOOKING DOWN':camera.rotation.x<-.2?'LOOKING UP':'EYE LEVEL'; $('location-detail').textContent=state.ride?'SOLDIER RIDER':player.y>2.8?level.highLocation:level.location;
  world.clueMarker.el.hidden=state.clue||state.secured<3;world.doorMarker.el.hidden=!state.clue||state.secured<3;
}
function updateMarkers(){const size={width:engine.getRenderWidth(),height:engine.getRenderHeight()};const viewport=camera.viewport.toGlobal(size.width,size.height);for(const m of world.markers){m.beacon.setEnabled(!m.el.hidden);if(m.el.hidden)continue;const animate=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;const wave=animate?Math.sin(clock*2.5+m.phase):0;m.beacon.position.y=m.groundY+.05;m.ring.scaling.setAll(1+wave*.1);m.diamond.position.y=m.pos.y-m.groundY-.55+wave*.13;m.diamond.rotation.y=animate?clock*.75:0;m.el.style.setProperty('--marker-bob',`${wave*5}px`);m.el.style.setProperty('--marker-glow',`${8+wave*4}px`);const point=B.Vector3.Project(m.pos,B.Matrix.Identity(),scene.getTransformMatrix(),viewport);const dist=B.Vector3.Distance(camera.position,m.pos);const front=B.Vector3.Dot(m.pos.subtract(camera.position),forward())>0;m.el.style.display=front&&point.z>=0&&point.z<=1&&dist>3?'block':'none';m.el.style.left=point.x/size.width*100+'%';m.el.style.top=point.y/size.height*100+'%';m.el.querySelector('small').textContent=Math.round(dist)+' m';}}
function finish(won){if(state.ended)return;state.won=won;$('ending-note').textContent=won?(level.next?`Next: Chapter ${CHAPTERS[level.next].number} · ${CHAPTERS[level.next].name}`:'The colony is defeated · Marin’s family has their home back.'):'Retry begins at the start of this chapter.';if(won&&isRoyal){music.src='assets/marin-vs-the-colony.mp3';music.currentTime=0;}if(won)world.finishChapter();gesture.clear();state.ended=true;state.paused=true;syncMusic();firing=false;gesture.clear();keys.clear();if(document.pointerLockElement)document.exitPointerLock();$('ending').hidden=false;$('pause').hidden=true;$('ending-eyebrow').textContent=won?`CHAPTER ${level.number} COMPLETE`:'A MINOR SETBACK';$('ending-title').textContent=won?level.winTitle:'Back on your feet.';$('ending-copy').textContent=won?level.winCopy:isRoyal?'The queen held her ground. Watch the red warnings, strike during openings, and visit field supplies to recover. Your next attempt starts at the chamber entrance.':(isBathroom?'Clear the workers guarding each gap, seal the entry points, and visit the refill cabinet to recover.':'The ants won this round. Stomp or spray workers to clear food caches, gather ammo, and visit the tool bench to recover.');$('ending-stats').innerHTML=`<div><b>${isRoyal?(state.queen.mode==='dead'?3:state.queen.phase):state.secured}/3</b>${isRoyal?'phases beaten':isBathroom?'entry points sealed':'caches secured'}</div><div><b>${state.stomps}</b>stomps</div><div><b>${Math.floor(state.time/60)}:${String(Math.floor(state.time%60)).padStart(2,'0')}</b>time</div>`;$('next-chapter').hidden=!(won&&level.next);$('next-chapter').textContent=level.next?CHAPTERS[level.next].start+' ↗':'';$('replay').className=won&&level.next?'secondary':'primary';if(won&&level.next){try{localStorage.setItem(CHAPTERS[level.next].loadoutKey,JSON.stringify({gear:state.gear,cannon:state.cannon,tank:state.tank,ammo:state.ammo,ammoKinds:ammoKinds(state)}));}catch{}}updateHUD();sound(won?440:150,.5,'triangle',.05,won?440:-80);if(won&&isRoyal)beginCinematic();}

function beginCinematic(replay=false){
  state.cinematic=true;state.cinematicPaused=false;state.ride=null;
  $('ending').hidden=true;$('hud').hidden=true;$('cinematic').hidden=false;$('cinematic-toggle').textContent='Pause film';
  $('cinematic-caption').textContent='The queen has fallen.';view.root.setEnabled(false);view.body.setEnabled(false);hero.hide();landing.setEnabled(false);
  for(const list of [projectiles,patches,particles]){for(const item of list)item.node?.setEnabled(false);}
  for(const marker of world.markers)marker.beacon.setEnabled(false);
  if(replay){world.finale.replay();music.currentTime=0;syncMusic();}
  else{world.syncQueen(state.queen,clock,0);world.finale.start({q:state.queen,player,ants,camera,gear:state.gear,reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches});}
  $('cinematic-toggle').focus();
}
function toggleCinematic(){if(!state.cinematic)return;state.cinematicPaused=!state.cinematicPaused;$('cinematic-toggle').textContent=state.cinematicPaused?'Resume film':'Pause film';syncMusic();}
function endCinematic(){
  state.cinematic=false;state.cinematicPaused=false;$('cinematic').hidden=true;$('ending').hidden=false;$('victory-portrait').hidden=false;
  $('replay-film').hidden=false;$('ending').classList.add('royal-victory');$('ending-eyebrow').textContent='LONG LIVE MARIN';$('ending-title').textContent='Her home. Her rules.';
  $('ending-copy').textContent='The queen has fallen. The colony has scattered. Marin, her husband, and their son have their home back. She has a new crown—and no plans to share the house with any more insects.';
  $('replay').focus();syncMusic();
}
function advanceCinematic(dt){
  if(!state.cinematic||state.cinematicPaused)return;
  const beat=world.finale.step(dt);if($('cinematic').dataset.stage!==beat.stage){$('cinematic-caption').textContent=victoryCaption(beat.stage);$('cinematic').dataset.stage=beat.stage;if(beat.stage==='scatter')sound(100,.4,'triangle',.04,-45);if(beat.stage==='pickup')sound(620,.18,'triangle',.035,180);if(beat.stage==='celebrate')sound(440,.55,'triangle',.045,440);}
  if(beat.done)endCinematic();
}
$('replay-film').onclick=()=>{if(state.won&&isRoyal)beginCinematic(true);};
$('cinematic-toggle').onclick=toggleCinematic;
$('cinematic-skip').onclick=()=>{if(state.cinematic){world.finale.skip();endCinematic();}};

// A landing ring helps judge depth without moving the camera for the player.
const landing=B.MeshBuilder.CreateTorus('landing aid',{diameter:3.2,thickness:.045,tessellation:32},scene);landing.material=world.M.lime;landing.setEnabled(false);
function updateLanding(){landing.setEnabled(false);if(!$('assist').checked||state.ride)return;const ready=player.grounded?stompTarget(player,ants,camera.rotation.y):jumpTarget;for(const a of ready?[ready]:ants){if(a.state==='alive'&&a.type!=='flyer'&&distanceXZ(player,a)<3.6&&(player.grounded||player.y>a.y+.4)){landing.setEnabled(true);landing.position.set(a.x,a.y+.075,a.z);landing.scaling.setAll(a.type==='soldier'?1.8:1);break;}}}
// Development hooks are opt-in; production play does not expose state mutation controls.
if(new URLSearchParams(location.search).has('debug'))window.antagonized={state,player,ants,world,scene,camera,hero,heroReady:hero.ready,eggs,setPerspective,get perspective(){return perspective;},flyerReady,groundAntsReady,reset,hit,interact,jumpAction,autoInteract,primaryAction,selectWeapon,updateHUD,pause,resume,
  step(dt=1/60){if(state.cinematic){advanceCinematic(dt);return;}if(state.ended)return;fireCooldown=Math.max(0,fireCooldown-dt);movePlayer(dt);updateAnts(dt);updateEggs();autoInteract();updateEffects(dt);updateQueen(dt);updateAim();updateHUD();},
  effectsStep(dt=1/60){updateEffects(dt);},
  setKeys(...codes){keys.clear();codes.forEach(c=>keys.add(c));},
  teleport(x,y,z,yaw=Math.PI){Object.assign(player,{x,y,z,vy:0});camera.rotation.set(0,yaw,0);updateCamera(0,true);},
  snapshot(){return {state:{...state,ride:state.ride?.type||null},player:{...player},ants:ants.map(a=>({type:a.type,state:a.state,x:a.x,y:a.y,z:a.z,foam:a.foam})),fps:engine.getFps(),meshes:scene.meshes.length};}
};

let previous=performance.now();engine.runRenderLoop(()=>{
  const now=performance.now(),dt=Math.min((now-previous)/1000,.04);previous=now;
  if(!state.started){clock+=dt;camera.position.set(isUnderground?2:(chapter===2||isBathroom)?10:17+Math.sin(clock*.1)*.3,isUnderground?3.6:(chapter===2||isBathroom)?6:6.5,20);camera.setTarget(V(isUnderground?0:-2,chapter>1?3:1.6,-2));}
  else if(!state.paused&&!state.ended){clock+=dt;state.time+=dt;state.invulnerable=Math.max(0,state.invulnerable-dt);fireCooldown=Math.max(0,fireCooldown-dt);if(lookMode==='drag'&&gesture.shouldHoldFire(performance.now()))firing=true;if(firing&&(state.weapon===1||state.ride||attackHeld(keys)||gesture.active))primaryAction();movePlayer(dt);updateAnts(dt);updateEggs();autoInteract();updateEffects(dt);updateQueen(dt);updateLanding();uiTick+=dt;if(uiTick>.1){updateAim();updateHUD();uiTick=0;}if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}}
  if(state.cinematic){advanceCinematic(dt);}
  world.animate(clock,player);if(state.queen&&!state.won)world.syncQueen(state.queen,clock,(!state.started||!state.paused&&!state.ended)?dt:0);scene.render();if(state.started&&!state.ended)updateMarkers();
});
// A few live ant silhouettes make the title scene a view into the playable yard.
spawnAnt('worker',2,10,0);
if(level.soldiers.length)spawnAnt('soldier',9,2,1);
if(level.flyers.length)spawnAnt('flyer',-3,8,0);
if(chapter===1)for(const p of [[-3,13,0],[5,7,1],[-6,8,0],[8,3,1]])spawnAnt('worker',...p);
updateLookMode();
scene.executeWhenReady(()=>{$('start').disabled=false;$('start').innerHTML=level.start+' <span>↗</span>';$('load-note').textContent='A playable third-person adventure · WASD to move · arrow keys to look';});

function chapterUI(){
  if(chapter>1)$('guide-mount-title').textContent='02 / FOAM → RIDE';
  document.title=`Antagonized · ${level.name}`;
  if($('start').disabled)$('start').innerHTML='Preparing the '+level.place+'… <span>↗</span>';
  $('location-detail').textContent=level.location;
  $('chapter-eyebrow').textContent=`${level.number} / ${level.name}`;
  $('menu-chapter').textContent=`CHAPTER ${level.number} / ${level.name}`;
  $('menu-title').innerHTML=level.title;
  $('cache-dots').innerHTML=world.caches.map((c,i)=>`<span>${String(i+1).padStart(2,'0')} ${c.name}</span>`).join('');
  if(isRoyal)$('cache-dots').innerHTML='<span>01 CROWN</span><span>02 GUARD</span><span>03 QUEEN</span>';
  $('resume').innerHTML=`Back to the ${level.place} <span>↗</span>`;
  $('ending-note').textContent=level.next?`Next: Chapter ${CHAPTERS[level.next].number} · ${CHAPTERS[level.next].name}`:'The colony is defeated · Marin’s family has their home back.';
  if(isRoyal){
    $('menu-story').textContent='Deep beneath the foundation, the queen waits. Turn her brood into ammunition, commandeer her guards, and end the infestation.';
    $('menu-lede').innerHTML='She built an empire.<br>You brought a sprayer.';
    $('postcard-copy').innerHTML='Break the crown.<br>Take back home.';$('postcard-chapter').textContent='05 — THE LAST STAND';
    $('guide-note').textContent='Three phases: break resin armor with ants or eggs, then spray the exposed queen. In phase two, a mounted soldier charge breaks armor in one hit; Ant Launcher shots work too. In the final phase, dodge a warned attack and hit during recovery. Foam interrupts her for 3 seconds, with a 10-second cooldown. Red circles mark slams; red lanes mark charges. Field supplies restore health, tank and egg clutches. Each phase gives you a short breather to visit supplies. Retry starts at the chamber entrance.';
    $('guide-climb').textContent='Foam a soldier, get close and press Space to mount. Hold C while moving into the queen to smash armor; Shift bites. Space dismounts. Root ledges are climbable, but never required.';
    $('ride-instructions').textContent='C + move into queen · smash armor · Shift bites · Space dismounts';
  }
  if(isWalls){
    $('menu-story').textContent='Beyond the plaster: stolen food, ancient pipes, and a colony that hears every footstep. Find what is calling them deeper.';
    $('menu-lede').innerHTML='You can hear them.<br>Now they can hear you.';
    $('postcard-copy').innerHTML='Cut off the colony.<br>Find the queen.';
    $('postcard-chapter').textContent='04 — NOTES FROM THE DARK';
    $('guide-note').textContent='Seal the seed vault, sugar store and fungus farm. Foam a soldier and jump nearby to mount. Ride it up the signal mound, dismount to inspect the signal, then break the royal seal at the marked gate. Walk over pale eggs in throw/Ant Launcher mode for extra ammo. Field supplies near the entrance restore health and tank.';
    $('guide-climb').textContent='Foam a soldier, get close and press Space to mount; walk into the signal mound to climb. Dismount and inspect the queen’s signal after sealing all stores.';
    $('ride-instructions').textContent='W at the signal mound to climb · Shift bites · C charges · Space dismounts';
  }
  if(isBathroom){
    $('menu-story').textContent='A new home for Marin, her husband, and their son. An ant infestation they never asked for. Months of battles—and the bathroom was the worst of it.';
    $('menu-lede').innerHTML='They came for the water.<br>She came for her bathroom back.';
    $('postcard-copy').innerHTML='Seal every gap.<br>Follow the trail.';
    $('postcard-chapter').textContent='03 — NO MORE UNINVITED GUESTS';
    $('guide-note').textContent='Clear workers from the cabinet hole and the tile cracks beside the toilet and inside the shower, then walk up to seal each entry point. Visit the refill cabinet for health and tank. Foam a soldier, jump nearby to mount, and ride onto the vanity. Dismount to inspect the ant trail, then walk up to the plumbing access panel to enter the walls.';
    $('guide-climb').textContent='Foam a soldier and press Space nearby to mount. Walk into the vanity’s open left edge to climb. Dismount to inspect the plumbing trail after sealing all three entry points. Shift bites; C charges.';
    $('ride-instructions').textContent='W at the vanity to climb · Shift bites · C charges · Space dismounts';
  }
  if(chapter===2){
    $('menu-story').textContent='Cereal on the floor. Soldiers at the sink. Reclaim the kitchen and follow the plumbing trail into the bathroom.';
    $('menu-lede').innerHTML='They found the pantry.<br>Marin found her patience limit.';
    $('postcard-copy').innerHTML='Close the kitchen.<br>Find their way in.';
    $('postcard-chapter').textContent='02 — KITCHEN FIELD NOTES';
    $('guide-note').textContent='Secure cereal, kibble and recycling. Foam a soldier, jump nearby to mount, then ride it up the sink counter. Dismount to inspect the trail. Head for the bathroom door beside the fridge.';
    $('guide-climb').textContent='Foam a soldier, get close and press Space to mount. Walk into the sink counter to climb, then dismount to inspect the trail. Shift bites; C charges.';
    $('ride-instructions').textContent='W at a counter to climb · Shift to bite · C to charge · Space to dismount';
  }
  if(!isRoyal)$('guide-note').textContent+=' Each unsealed site produces a new worker every five seconds. Seal it to stop its reinforcements.';
}
chapterUI();

// An explicit preview URL lets the player review the finale without winning again.
if(isRoyal&&new URLSearchParams(location.search).get('preview')==='finale'){
 const button=document.createElement('button');button.className='secondary';button.textContent='Preview Marin’s victory dances ↗';button.disabled=true;
 $('start').parentNode.append(button);
 world.finale.ready.then(()=>{button.disabled=false;});
 button.onclick=()=>{reset();state.queen.mode='dead';state.queen.phase=2;state.queen.hp=0;finish(true);};
}
