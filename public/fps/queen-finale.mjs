import {syncAntFoam} from './ant-foam.mjs';
import {advanceGroundGait} from './ground-ant-rigged.mjs';
import {loadFinaleQueen} from './queen-rigged.mjs';
import {makeMarinActor} from './marin-actor.mjs';
import {MARIN_CROWN_FIT} from './marin-rigged.mjs';
import {victoryBeat,crownDrop,crownRoll,crownCoronation,ease,clamp01,VICTORY_DURATION,CROWN_ON,DANCE_START} from './victory-core.mjs';
export function makeRoyalCrown({B,scene,V,mat,ball,cyl,rod},parent){
 const gold=mat('crown gold','#ffc94f',{glow:.6}),gem=mat('crown emerald','#97d94e',{glow:.65});
 const crown=new B.TransformNode('royal crown',scene);crown.parent=parent;crown.position.set(0,3.82,2.25);
 const ring=B.MeshBuilder.CreateTorus('gold crown band',{diameter:2.4,thickness:.3,tessellation:32},scene);ring.parent=crown;ring.material=gold;
 const upper=B.MeshBuilder.CreateTorus('crown upper band',{diameter:2.4,thickness:.12,tessellation:32},scene);upper.parent=crown;upper.position.y=.26;upper.material=gold;
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.sin(a),z=Math.cos(a),height=i%2===0?1.25:1.0;
  cyl('gold crown point',x*1.16,.25+height/2,z*1.16,.5,height,gold,crown,0);
  ball('crown pearl',x*1.16,.25+height,z*1.16,.22,.22,.22,gold,crown);
 }
 ball('crown emerald',0,.27,1.29,.42,.5,.2,gem,crown);
 return crown;
}
export function buildQueenFinale(ctx,{queen,body,crown,legs,getFeet}){
 const {B,scene,V,mat}=ctx,marin=makeMarinActor(ctx);
 let direction,queenRig=null,queenLocked=false,lastCombat=null,walkTime=0;
 const fallbackCrown=crown.getChildren?.()??[];
 const queenReady=B.SceneLoader?.IsPluginForExtensionAvailable('.glb')?loadFinaleQueen(B,scene,crown).then(rig=>{
  if(queenLocked){rig.dispose();return false;}queenRig=rig;if(lastCombat)syncCombat(lastCombat.q,lastCombat.time,0);return true;
 }).catch(error=>{console.warn('Queen model unavailable; using fallback.',error);return false;}):Promise.resolve(false);
 function segment(mesh,a,b){
  direction??=V();direction.set(b.x-a.x,b.y-a.y,b.z-a.z);const length=direction.length();
  mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.scaling.y=length;
  direction.scaleInPlace(1/Math.max(.0001,length));mesh.rotationQuaternion??=new B.Quaternion();B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,direction,mesh.rotationQuaternion);
 }
 // Flat paper and pointed glints read as a celebration, rather than floating eggs.
 const confettiGold=mat('victory paper gold','#e7ac36',{glow:.12});
 const confettiCream=mat('victory paper cream','#fff1cf',{glow:.12});
 const glintGold=mat('victory glint gold','#ffe4a1',{glow:1});
 for(const material of [confettiGold,confettiCream,glintGold])material.backFaceCulling=false;
 glintGold.disableLighting=true;
 const sparkles=[];
 for(let i=0;i<24;i++){
  const paper=B.MeshBuilder.CreatePlane('victory confetti',{width:.025+(i%3)*.007,height:.055+(i%4)*.012},scene);
  paper.material=i%3?confettiGold:confettiCream;paper.parent=marin.root;paper.isPickable=false;paper.setEnabled(false);sparkles.push(paper);
 }
 for(let i=0;i<8;i++){
  const glint=new B.Mesh('victory gold glint',scene),data=new B.VertexData();
  data.positions=[0,0,0, 0,.065,0, .01,.01,0, .045,0,0, .01,-.01,0, 0,-.065,0, -.01,-.01,0, -.045,0,0, -.01,.01,0];
  data.indices=[];for(let j=1;j<=8;j++)data.indices.push(0,j,j===8?1:j+1);
  data.normals=[];B.VertexData.ComputeNormals(data.positions,data.indices,data.normals);data.applyToMesh(glint);
  glint.material=glintGold;glint.parent=marin.root;glint.billboardMode=B.Mesh.BILLBOARDMODE_ALL;glint.isPickable=false;glint.setEnabled(false);sparkles.push(glint);
 }
 let run=null;
 // Keep the crown independent of the disabled fallback body, following the rig's head socket.
 function syncCombat(q,time,dt=0){
  lastCombat={q,time};
  if(!queenRig||run)return false;
  queen.setEnabled(false);queenRig.root.setEnabled(true);queenRig.root.position.set(q.x,0,q.z);queenRig.root.rotation.set(0,q.yaw,0);
  const speed=Math.hypot(q.vx||0,q.vz||0),stopped=q.foam>0||q.stagger>0||['dormant','repair','intermission','dead'].includes(q.mode);
  walkTime+=stopped?0:speed*Math.max(0,dt)/2.8;
  const clip=q.mode==='warn'&&!stopped?'Threat':!stopped&&speed>.05?'Walk':'Idle';
  queenRig.sampleClip(clip,clip==='Walk'?walkTime:time);queenRig.shell.sync(q,time);
  fallbackCrown.forEach(node=>node.setEnabled(false));queenRig.crownVisual.setEnabled(true);
  crown.parent=null;crown.setEnabled(true);crown.scaling.setAll(queenRig.startScale);
  crown.position.copyFrom(queenRig.crownPosition());crown.rotationQuaternion=queenRig.crownRotation();
  return true;
 }
 const mix=(a,b,t)=>a+(b-a)*t;
 function start({q,player,ants,camera,gear=true,reducedMotion=false}){
  reset();marin.locked=true;queenLocked=true;queen.position.set(q.x,0,q.z);queen.rotation.set(0,q.yaw,0);queen.computeWorldMatrix(true);body.computeWorldMatrix(true);crown.computeWorldMatrix(true);
  if(queenRig){
   queen.setEnabled(false);queenRig.root.position.set(q.x,0,q.z);queenRig.root.rotation.set(0,q.yaw,0);queenRig.root.setEnabled(true);
   fallbackCrown.forEach(n=>n.setEnabled(false));queenRig.crownVisual.setEnabled(true);queenRig.sample(0);
  }
  marin.imported?.setBackpack(gear);
  const startScale=queenRig?.startScale??1;
  const crownStart=queenRig?queenRig.crownPosition():crown.getAbsolutePosition().clone(),yaw=Math.atan2(-q.x,8-q.z),c=Math.cos(yaw),s=Math.sin(yaw);
  const point=(x,y,z)=>V(q.x+c*x+s*z,y,q.z-s*x+c*z);
  const wearScale=marin.imported?MARIN_CROWN_FIT.scale:.36;
  const rollStart=point(-3.4,.02+1.42*startScale,3.5),land=point(-3.608,.02+1.42*wearScale,6.651),destination=point(-3.4,0,7.6),entrance=point(-3.4,0,12);
  const fleeing=ants.filter(a=>a.state!=='dead'&&a.state!=='collected').map((a,i)=>{
   a.foam=0;a.crumb.setEnabled(false);a.state='fleeing';syncAntFoam(a);
   const dx=a.x-q.x,dz=a.z-q.z,d=Math.hypot(dx,dz)||1;
   return {ant:a,x:a.x,y:a.y,z:a.z,dx:d===1&&dx===0&&dz===0?Math.cos(i):dx/d,dz:d===1&&dx===0&&dz===0?Math.sin(i):dz/d,delay:.65+i*.09};
  });
  let crownRelease=crownStart,crownReleaseRotation=null;
  if(queenRig){queenRig.sample(1.3);crownRelease=queenRig.crownPosition();crownReleaseRotation=queenRig.crownRotation();queenRig.sample(0);}
  run={gear,startScale,crownRelease,crownReleaseRotation,feet:getFeet().map(f=>({side:f.side,hip:{...f.hip},knee:{...f.knee},ankle:{...f.ankle}})),time:0,stage:'fall',q:{x:q.x,z:q.z,yaw:q.yaw},camera,cameraStart:camera.position.clone(),fov:camera.fov,crownStart,rollStart,land,wearScale,destination,entrance,point,yaw,fleeing,reducedMotion};
  crown.parent=null;crown.setEnabled(true);crown.scaling.setAll(startScale);crown.position.copyFrom(crownStart);crown.rotation.set(0,q.yaw,0);
  marin.root.position.copyFrom(entrance);marin.root.rotation.y=yaw+Math.PI;marin.root.setEnabled(false);
  return run;
 }
 function step(dt){
  if(!run)return null;run.time+=Math.max(0,dt);const r=run,t=r.time,beat=victoryBeat(t);r.stage=beat.stage;
  if(queenRig){queenRig.sample(t);queenRig.polishCrown(ease((t-3.4)/6));}
  const roll=beat.roll*2.65,fallWobble=t<.6?Math.sin(t*25)*.08:Math.sin(t*17)*.06*(1-beat.roll);
  queen.rotation.set(Math.sin(t*9)*.035*(1-beat.roll),r.q.yaw,roll+fallWobble);
  const shift=2.05*Math.sin(roll);queen.position.set(r.q.x+Math.cos(r.q.yaw)*shift,2.05*(1-Math.cos(roll)),r.q.z-Math.sin(r.q.yaw)*shift);
  body.rotation.x*=Math.exp(-dt*9);body.rotation.z*=Math.exp(-dt*9);
  for(let i=0;i<legs.length;i++){
   const leg=legs[i],f=r.feet[i];if(!f)continue;
   const twitch=!r.reducedMotion&&t<3.5?Math.sin(t*19+i*1.7)*.12*(1-beat.roll*.8):0,curl=ease((t-.7)/2.4);
   const knee={x:mix(f.knee.x,f.side*2.35,curl),y:mix(f.knee.y,2.6,curl)+twitch,z:f.knee.z};
   const ankle={x:mix(f.ankle.x,f.side*1.9,curl),y:mix(f.ankle.y,3.3,curl)+twitch,z:mix(f.ankle.z,f.hip.z+.5,curl)};
   segment(leg.thigh,f.hip,knee);leg.knee.position.set(knee.x,knee.y,knee.z);segment(leg.shin,knee,ankle);segment(leg.claw,ankle,{x:ankle.x-f.side*.2,y:ankle.y+.2,z:ankle.z+.2});
  }
  if(queenRig&&t<1.3){
   crown.position.copyFrom(queenRig.crownPosition());crown.rotationQuaternion=queenRig.crownRotation();
  }else if(t<3.4){
   crown.rotationQuaternion=null;
   const drop=crownDrop(t,r.crownRelease,r.rollStart),fall=clamp01((t-1.3)/2.1);
   crown.position.set(drop.x,drop.y,drop.z);
   if(r.crownReleaseRotation)crown.rotationQuaternion=B.Quaternion.Slerp(r.crownReleaseRotation,B.Quaternion.RotationYawPitchRoll(r.yaw,0,-Math.PI/2),ease(fall));
   else crown.rotation.set(Math.sin(fall*Math.PI)*1.4,mix(r.q.yaw,r.yaw,ease(fall)),-Math.PI/2*ease(fall));
  }else if(t<11.5){
   crown.rotationQuaternion=null;
   const rolling=crownRoll(t,r.rollStart,r.land,r.wearScale,r.startScale);
   crown.position.set(rolling.x,rolling.y,rolling.z);crown.scaling.setAll(rolling.scale);
   crown.rotation.set(rolling.angle,r.yaw,-Math.PI/2);
  }
  for(const f of r.fleeing){
   const a=f.ant,elapsed=Math.max(0,t-f.delay),panic=clamp01(elapsed/.55),distance=Math.max(0,elapsed-.55)*(a.type==='flyer'?7:5.5);
   a.x=f.x+f.dx*distance;a.z=f.z+f.dz*distance;a.y=a.type==='flyer'?f.y+elapsed*.55:f.y;
   a.root.position.set(a.x,a.y+Math.sin(panic*Math.PI)*.35,a.z);a.root.rotation.set(panic<1?-.35*Math.sin(panic*Math.PI):0,Math.atan2(f.dx,f.dz),0);
   if(a.rig){if(a.type==='flyer')a.rig.sample('Fly',elapsed);else{advanceGroundGait(a,5.5*dt*(elapsed>.55?1:0));a.rig.sample('Walk',a.walkTime||0,dt);}}
   for(const leg of a.legs)leg.pivot.rotation.y=Math.sin(t*26+leg.i*2+leg.side)*.4;
   for(let i=0;i<a.wings.length;i++)a.wings[i].rotation.z=(i?1:-1)*Math.sin(t*45)*.6;
   a.shadow.position.set(a.x,.045,a.z);
   if(Math.abs(a.x)>22||a.z>22||a.z<-12||elapsed>5){a.root.setEnabled(false);a.shadow.setEnabled(false);}
  }
  marin.root.setEnabled(t>=6);marin.root.position.set(mix(r.entrance.x,r.destination.x,beat.walk),0,mix(r.entrance.z,r.destination.z,beat.walk));
  // Turn before sampling the head so the crown targets this frame's pose.
  marin.root.rotation.y=r.yaw+Math.PI+(Math.PI-.1)*ease((t-13)/2);
  if(marin.imported){marin.imported.finalePose(t,beat,r.reducedMotion);}
  else{
  const walkWave=t>=6&&t<10?Math.sin(beat.walk*Math.PI*4)*Math.sin(beat.walk*Math.PI):0;
  marin.root.position.y=Math.abs(walkWave)*.065;marin.body.rotation.x=beat.bend;
  marin.legs[0].rotation.x=walkWave*.45;marin.legs[1].rotation.x=-walkWave*.45;
  marin.arms[0].rotation.x=-walkWave*.35-beat.bend*.7;marin.arms[1].rotation.x=walkWave*.35;
  marin.elbows[0].rotation.x=-.18-beat.cheer*.65;marin.elbows[1].rotation.x=-.18;
  marin.knees[0].rotation.x=Math.max(0,-walkWave)*.5;marin.knees[1].rotation.x=Math.max(0,walkWave)*.5;
  marin.arms[0].rotation.z=-.12-beat.cheer*2.45;marin.arms[1].rotation.z=.12;
  }
  if(t>=11.5&&t<CROWN_ON){
   marin.root.computeWorldMatrix(true);marin.head.computeWorldMatrix(true);
   const fitHeight=marin.imported?MARIN_CROWN_FIT.height:.56,fitScale=marin.imported?MARIN_CROWN_FIT.scale:.36;
   const localPose=B.Matrix.Compose(V(1,1,1),B.Quaternion.RotationYawPitchRoll(0,marin.imported?MARIN_CROWN_FIT.pitch:0,MARIN_CROWN_FIT.tilt),V(marin.imported?MARIN_CROWN_FIT.x:0,fitHeight,0));
   const targetPose=localPose.multiply(marin.head.getWorldMatrix()),target=V(),targetRotation=new B.Quaternion();
   targetPose.decompose(V(),targetRotation,target);
   if(marin.imported){
    const palm=marin.imported.rightHand;palm.computeWorldMatrix(true);
    const grip=ease((t-11.5)/1.5),offset=V(-.16*grip,mix(-.4,-.08,grip),0);
    const held=palm.getAbsolutePosition().add(B.Vector3.TransformNormal(offset,marin.root.getWorldMatrix()));
    crown.position.copyFrom(B.Vector3.Lerp(r.land,held,ease((t-11.5)/.15)));
    // Finish the last few centimeters against the scalp before changing parents.
    crown.position.copyFrom(B.Vector3.Lerp(crown.position,target,ease((t-14.7)/.3)));
    crown.scaling.setAll(fitScale);
    crown.rotationQuaternion=B.Quaternion.Slerp(B.Quaternion.RotationYawPitchRoll(r.yaw,0,-Math.PI/2),targetRotation,ease((t-11.5)/1.5));
   }else{
    const flight=crownCoronation(t-1,r.land,target,fitScale);
    crown.position.set(flight.x,flight.y,flight.z);crown.scaling.setAll(flight.scale);
    crown.rotationQuaternion=B.Quaternion.Slerp(B.Quaternion.RotationYawPitchRoll(r.yaw,0,-Math.PI/2),targetRotation,flight.turn);
   }
  }
  if(t>=CROWN_ON){
   crown.rotationQuaternion=null;crown.parent=marin.head;crown.position.set(marin.imported?MARIN_CROWN_FIT.x:0,marin.imported?MARIN_CROWN_FIT.height:.56,0);crown.rotation.set(marin.imported?MARIN_CROWN_FIT.pitch:0,0,MARIN_CROWN_FIT.tilt);crown.scaling.setAll(marin.imported?MARIN_CROWN_FIT.scale:.36);
   const cheerTime=Math.max(0,t-DANCE_START);
   if(!marin.imported){marin.root.position.y=r.reducedMotion?0:Math.abs(Math.sin(cheerTime*3))*Math.exp(-cheerTime*.7)*.2;
   marin.head.rotation.z=r.reducedMotion?0:Math.sin(cheerTime*2)*.055;marin.arms[0].rotation.z+=r.reducedMotion?0:Math.sin(cheerTime*6)*.08;
   }
   for(let i=0;i<sparkles.length;i++){
    const particle=sparkles[i],side=i%2?1:-1;
    if(t<DANCE_START){particle.setEnabled(false);continue;}
    if(i<24){
     particle.setEnabled(!r.reducedMotion);
     const phase=(cheerTime/(4.8+(i%3)*.7)+i/24)%1;
     particle.position.set(side*(.75+(i%5)*.2)+Math.sin(phase*Math.PI*4+i)*.14,3.9-phase*3.7,-.45+(i%4)*.22);
     particle.rotation.set(cheerTime*1.9+i,cheerTime*.8+i,Math.sin(cheerTime*2+i)*.7);
     particle.visibility=Math.min(1,phase*12,(1-phase)*8)*ease(cheerTime/.6);
    }else{
     const phase=r.reducedMotion?.25:(cheerTime/2.8+(i-24)/8)%1;
     const pulse=Math.pow(Math.max(0,Math.sin(phase*Math.PI)),6);
     particle.setEnabled(!r.reducedMotion||i<27);
     particle.position.set(side*(.7+(i%3)*.3),1.1+(i%4)*.62,0);
     particle.scaling.setAll(.4+pulse*.6);particle.visibility=pulse*.9*ease(cheerTime/.6);
    }
   }
  }
  const fallCamera=r.point(10,6.5,13),pickupCamera=r.point(3,3.1,9),heroCamera=r.point(-2.7,2.85,12.85);
  let cam=fallCamera,target=V(r.q.x,2,r.q.z);
  if(t<1.1)cam=B.Vector3.Lerp(r.cameraStart,fallCamera,ease(t/1.1));
  else if(t>=5.5&&t<13){cam=B.Vector3.Lerp(fallCamera,pickupCamera,ease((t-5.5)/2));target=B.Vector3.Lerp(V(r.q.x,2,r.q.z),V(r.destination.x,1.35,r.destination.z),ease((t-5.5)/2));}
  else if(t>=13){cam=B.Vector3.Lerp(pickupCamera,heroCamera,ease((t-13)/2));target=V(r.destination.x,mix(1.35,1.7,ease((t-13)/2)),r.destination.z);}
  if(r.reducedMotion)cam=t<6?fallCamera:t<13?pickupCamera:heroCamera;
  cam.x=Math.max(-21,Math.min(21,cam.x));cam.z=Math.max(-11.5,Math.min(22,cam.z));
  r.camera.position.copyFrom(cam);r.camera.setTarget(target);r.camera.fov=mix(r.fov,.85,ease(t/2));
  return beat;
 }
 function replay(){
  if(!run)return null;const previous=run;
  for(const f of previous.fleeing){const a=f.ant;a.x=f.x;a.y=f.y;a.z=f.z;a.state='alive';a.root.position.set(a.x,a.y,a.z);a.root.setEnabled(true);a.shadow.setEnabled(true);}
  previous.camera.position.copyFrom(previous.cameraStart);previous.camera.fov=previous.fov;
  return start({q:previous.q,ants:previous.fleeing.map(f=>f.ant),camera:previous.camera,gear:previous.gear,reducedMotion:previous.reducedMotion});
 }
 function skip(){if(!run)return null;return step(Math.max(0,VICTORY_DURATION-run.time));}
 function reset(){
  if(run)run.camera.fov=run.fov;run=null;walkTime=0;lastCombat=null;
  queenRig?.polishCrown(0);queenRig?.shell.clear();queen.setEnabled(true);queenRig?.root.setEnabled(false);queenRig?.crownVisual.setEnabled(false);fallbackCrown.forEach(n=>n.setEnabled(true));marin.root.setEnabled(false);
  // Imported sockets retain the bind-pose correction that makes their Y axis point above the scalp.
  if(!marin.imported){marin.head.rotation.set(0,0,0);marin.body.rotation.set(0,0,0);}
  marin.root.position.set(0,0,0);
  crown.rotationQuaternion=null;crown.parent=body;crown.position.set(0,3.82,2.25);crown.rotation.set(0,0,0);crown.scaling.setAll(1);sparkles.forEach(s=>s.setEnabled(false));
 }
 return {start,step,skip,replay,reset,syncCombat,get combatRoot(){return queenRig?.root;},get combatClip(){return queenRig?.clip;},get combatAppearance(){return queenRig?.shell.state;},ready:Promise.all([marin.ready,queenReady]),get importedQueen(){return !!queenRig;},get imported(){return !!marin.imported;},get active(){return run!==null;},get time(){return run?.time||0;},get stage(){return run?.stage||null;}};
}
