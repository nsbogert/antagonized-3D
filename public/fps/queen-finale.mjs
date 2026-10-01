import {makeMarin} from './marin-model.mjs';
import {victoryBeat,crownDrop,ease,clamp01,VICTORY_DURATION} from './victory-core.mjs';
export function makeRoyalCrown({B,scene,V,mat,ball,cyl,rod},parent){
 const gold=mat('crown gold','#efb848',{glow:.2}),gem=mat('crown emerald','#97d94e',{glow:.45});
 const crown=new B.TransformNode('royal crown',scene);crown.parent=parent;crown.position.set(0,3.7,2.25);
 const ring=B.MeshBuilder.CreateTorus('gold crown band',{diameter:2.15,thickness:.22,tessellation:32},scene);ring.parent=crown;ring.material=gold;
 const upper=B.MeshBuilder.CreateTorus('crown upper band',{diameter:2.25,thickness:.09,tessellation:32},scene);upper.parent=crown;upper.position.y=.26;upper.material=gold;
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.sin(a),z=Math.cos(a),height=i%2===0?.95:.7;
  cyl('gold crown point',x*1.04,.25+height/2,z*1.04,.38,height,gold,crown,0);
  ball('crown pearl',x*1.04,.25+height,z*1.04,.17,.17,.17,gold,crown);
 }
 ball('crown emerald',0,.23,1.15,.34,.42,.15,gem,crown);
 return crown;
}
export function buildQueenFinale(ctx,{queen,body,crown,legs,getFeet}){
 const {B,scene,V,M,ball}=ctx,marin=makeMarin(ctx);
 let direction;
 function segment(mesh,a,b){
  direction??=V();direction.set(b.x-a.x,b.y-a.y,b.z-a.z);const length=direction.length();
  mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.scaling.y=length;
  direction.scaleInPlace(1/Math.max(.0001,length));mesh.rotationQuaternion??=new B.Quaternion();B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,direction,mesh.rotationQuaternion);
 }
 const sparkles=[];for(let i=0;i<18;i++){const s=ball('victory sparkle',0,0,0,.065,.13,.065,M.lime,marin.root);s.setEnabled(false);sparkles.push(s);}
 let run=null;
 const mix=(a,b,t)=>a+(b-a)*t;
 function start({q,player,ants,camera,reducedMotion=false}){
  reset();queen.position.set(q.x,0,q.z);queen.rotation.set(0,q.yaw,0);queen.computeWorldMatrix(true);body.computeWorldMatrix(true);crown.computeWorldMatrix(true);
  const crownStart=crown.getAbsolutePosition().clone(),yaw=Math.atan2(-q.x,8-q.z),c=Math.cos(yaw),s=Math.sin(yaw);
  const point=(x,y,z)=>V(q.x+c*x+s*z,y,q.z-s*x+c*z);
  const land=point(-3.4,.25,5),destination=point(-3.4,0,6.25),entrance=point(-3.4,0,12);
  const fleeing=ants.filter(a=>a.state!=='dead'&&a.state!=='collected').map((a,i)=>{
   a.foam=0;a.foamMesh.setEnabled(false);a.crumb.setEnabled(false);a.state='fleeing';
   const dx=a.x-q.x,dz=a.z-q.z,d=Math.hypot(dx,dz)||1;
   return {ant:a,x:a.x,y:a.y,z:a.z,dx:d===1&&dx===0&&dz===0?Math.cos(i):dx/d,dz:d===1&&dx===0&&dz===0?Math.sin(i):dz/d,delay:.65+i*.09};
  });
  run={feet:getFeet().map(f=>({side:f.side,hip:{...f.hip},knee:{...f.knee},ankle:{...f.ankle}})),time:0,stage:'fall',q:{x:q.x,z:q.z,yaw:q.yaw},camera,cameraStart:camera.position.clone(),fov:camera.fov,crownStart,land,destination,entrance,point,yaw,fleeing,reducedMotion};
  crown.parent=null;crown.position.copyFrom(crownStart);crown.rotation.set(0,q.yaw,0);
  marin.root.position.copyFrom(entrance);marin.root.rotation.y=yaw+Math.PI;marin.root.setEnabled(false);
  return run;
 }
 function step(dt){
  if(!run)return null;run.time+=Math.max(0,dt);const r=run,t=r.time,beat=victoryBeat(t);r.stage=beat.stage;
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
  if(t<11){const drop=crownDrop(t,r.crownStart,r.land);crown.position.set(drop.x,drop.y,drop.z);crown.rotation.set(Math.sin(clamp01((t-1.3)/2.1)*Math.PI)*1.4,r.q.yaw+clamp01((t-1.3)/2.1)*4,.12*Math.sin(t*16)*Math.max(0,1-(t-3)/.7));}
  for(const f of r.fleeing){
   const a=f.ant,elapsed=Math.max(0,t-f.delay),panic=clamp01(elapsed/.55),distance=Math.max(0,elapsed-.55)*(a.type==='flyer'?7:5.5);
   a.x=f.x+f.dx*distance;a.z=f.z+f.dz*distance;a.y=a.type==='flyer'?f.y+elapsed*.55:f.y;
   a.root.position.set(a.x,a.y+Math.sin(panic*Math.PI)*.35,a.z);a.root.rotation.set(panic<1?-.35*Math.sin(panic*Math.PI):0,Math.atan2(f.dx,f.dz),0);
   for(const leg of a.legs)leg.pivot.rotation.y=Math.sin(t*26+leg.i*2+leg.side)*.4;
   for(let i=0;i<a.wings.length;i++)a.wings[i].rotation.z=(i?1:-1)*Math.sin(t*45)*.6;
   a.shadow.position.set(a.x,.045,a.z);
   if(Math.abs(a.x)>22||a.z>22||a.z<-12||elapsed>5){a.root.setEnabled(false);a.shadow.setEnabled(false);}
  }
  marin.root.setEnabled(t>=6);marin.root.position.set(mix(r.entrance.x,r.destination.x,beat.walk),0,mix(r.entrance.z,r.destination.z,beat.walk));
  const walkWave=t>=6&&t<10?Math.sin((t-6)*10)*Math.sin(beat.walk*Math.PI):0;
  marin.root.position.y=Math.abs(walkWave)*.065;marin.body.rotation.x=beat.bend;
  marin.legs[0].rotation.x=walkWave*.45;marin.legs[1].rotation.x=-walkWave*.45;
  marin.arms[0].rotation.x=-walkWave*.35-beat.bend*.7;marin.arms[1].rotation.x=walkWave*.35;
  marin.elbows[0].rotation.x=-.18-beat.cheer*.65;marin.elbows[1].rotation.x=-.18;
  marin.knees[0].rotation.x=Math.max(0,-walkWave)*.5;marin.knees[1].rotation.x=Math.max(0,walkWave)*.5;
  marin.arms[0].rotation.z=-.12-beat.cheer*2.45;marin.arms[1].rotation.z=.12;
  if(t>=11&&t<14){
   marin.root.computeWorldMatrix(true);marin.body.computeWorldMatrix(true);marin.hands[0].computeWorldMatrix(true);marin.head.computeWorldMatrix(true);
   const hand=marin.hands[0].getAbsolutePosition(),head=marin.head.getAbsolutePosition();
   if(t<12){const lift=ease(t-11);crown.position.set(mix(r.land.x,hand.x,lift),mix(r.land.y,hand.y+.12,lift),mix(r.land.z,hand.z,lift));}
   else{crown.position.set(mix(hand.x,head.x,beat.crown),mix(hand.y+.12,head.y+.56,beat.crown)+Math.sin(beat.crown*Math.PI)*.45,mix(hand.z,head.z,beat.crown));}
   crown.scaling.setAll(mix(1,.36,ease((t-11)/3)));crown.rotation.set(0,r.yaw,0);
  }
  if(t>=14){
   crown.parent=marin.head;crown.position.set(0,.56,0);crown.rotation.set(0,0,-.12);crown.scaling.setAll(.36);
   const cheerTime=t-14;marin.root.position.y=r.reducedMotion?0:Math.abs(Math.sin(cheerTime*3))*Math.exp(-cheerTime*.7)*.2;
   marin.head.rotation.z=r.reducedMotion?0:Math.sin(cheerTime*2)*.055;marin.arms[0].rotation.z+=r.reducedMotion?0:Math.sin(cheerTime*6)*.08;
   for(let i=0;i<sparkles.length;i++){const a=i*2.4+cheerTime*.25;sparkles[i].setEnabled(true);sparkles[i].position.set(Math.sin(a)*(1+i%3*.25),.6+(i%7)*.38+Math.sin(cheerTime*2+i)*.08,Math.cos(a)*1.2);sparkles[i].rotation.z=t+i;}
  }
  const fallCamera=r.point(10,6.5,13),pickupCamera=r.point(3,3.1,9),heroCamera=r.point(-2.7,2.85,11.5);
  let cam=fallCamera,target=V(r.q.x,2,r.q.z);
  if(t<1.1)cam=B.Vector3.Lerp(r.cameraStart,fallCamera,ease(t/1.1));
  else if(t>=5.5&&t<12){cam=B.Vector3.Lerp(fallCamera,pickupCamera,ease((t-5.5)/2));target=B.Vector3.Lerp(V(r.q.x,2,r.q.z),V(r.destination.x,1.35,r.destination.z),ease((t-5.5)/2));}
  else if(t>=12){cam=B.Vector3.Lerp(pickupCamera,heroCamera,ease((t-12)/2));target=V(r.destination.x,1.7,r.destination.z);marin.root.rotation.y=r.yaw+Math.PI+(Math.PI-.1)*ease((t-12)/2);}
  if(r.reducedMotion)cam=t<6?fallCamera:t<12?pickupCamera:heroCamera;
  cam.x=Math.max(-21,Math.min(21,cam.x));cam.z=Math.max(-11.5,Math.min(22,cam.z));
  r.camera.position.copyFrom(cam);r.camera.setTarget(target);r.camera.fov=mix(r.fov,.85,ease(t/2));
  return beat;
 }
 function replay(){
  if(!run)return null;const previous=run;
  for(const f of previous.fleeing){const a=f.ant;a.x=f.x;a.y=f.y;a.z=f.z;a.state='alive';a.root.position.set(a.x,a.y,a.z);a.root.setEnabled(true);a.shadow.setEnabled(true);}
  previous.camera.position.copyFrom(previous.cameraStart);previous.camera.fov=previous.fov;
  return start({q:previous.q,ants:previous.fleeing.map(f=>f.ant),camera:previous.camera,reducedMotion:previous.reducedMotion});
 }
 function skip(){if(!run)return null;return step(Math.max(0,VICTORY_DURATION-run.time));}
 function reset(){
  if(run)run.camera.fov=run.fov;run=null;marin.root.setEnabled(false);marin.head.rotation.set(0,0,0);marin.body.rotation.set(0,0,0);marin.root.position.set(0,0,0);
  crown.parent=body;crown.position.set(0,3.7,2.25);crown.rotation.set(0,0,0);crown.scaling.setAll(1);sparkles.forEach(s=>s.setEnabled(false));
 }
 return {start,step,skip,replay,reset,get active(){return run!==null;},get time(){return run?.time||0;},get stage(){return run?.stage||null;}};
}
