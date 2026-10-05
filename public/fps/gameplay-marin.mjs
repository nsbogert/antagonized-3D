import {loadPropFactory} from './props.mjs';
import {attachHandSprayer} from './sprayer-attachment.mjs';
import {loadRiggedMarin} from './marin-rigged.mjs';
export function makeGameplayMarin({B,scene,world,V,view}){
 const root=new B.TransformNode('gameplay Marin',scene);root.setEnabled(false);
 const shadow=world.ball('Marin contact shadow',0,.04,0,.85,.018,.65,world.M.shadow||world.M.chitin,null,false);shadow.isPickable=false;shadow.setEnabled(false);
 const tool=view.gun.clone('Marin carried tool',null);tool.setEnabled(false);tool.scaling.setAll(1);tool.position.set(0,0,0);tool.rotation.set(0,0,0);tool.rotationQuaternion=B.Quaternion.Identity();
 for(const mesh of tool.getChildMeshes()){mesh.renderingGroupId=0;mesh.isPickable=false;if(mesh.name.startsWith('gripping glove')||mesh.name.startsWith('tool sleeve'))mesh.dispose();}
 const hosePath=Array.from({length:13},()=>V());let hose=null;
 const firstPersonArms=[];
 let rig=null,sprayer=null,current='Idle_15',time=0,previous=null,blend=1,yaw=Math.PI,jumpTime=0;
 const ready=B.SceneLoader?.IsPluginForExtensionAvailable('.glb')?loadRiggedMarin(B,scene,{parent:root,height:1.8}).then(async actor=>{rig=actor;
  const factory=await loadPropFactory(B,scene,'sprayer');
  if(factory){sprayer=attachHandSprayer(B,factory,tool);tool.getChildMeshes().filter(mesh=>!sprayer.model.meshes.includes(mesh)).forEach(mesh=>mesh.setEnabled(false));}
  tool.parent=rig.rightHand;
  // Extract just her right sleeve, forearm and glove, sharing the live skeleton and textures.
  // The full character remains the third-person actor; no second GLB or animation loop.
  for(const source of rig.container.meshes){
   if(!source.skeleton||!source.getTotalVertices())continue;
   const ids=source.getVerticesData(B.VertexBuffer.MatricesIndicesKind),weights=source.getVerticesData(B.VertexBuffer.MatricesWeightsKind);
   if(!ids||!weights)continue;
   const armBones=new Set(source.skeleton.bones.filter(b=>/Right(Arm|ForeArm|Hand)/.test(b.name)).map(b=>b.getIndex()));
   const weight=v=>{let sum=0;for(let k=0;k<4;k++)if(armBones.has(ids[v*4+k]))sum+=weights[v*4+k];return sum;};
   const indices=source.getIndices(),kept=[];
   for(let k=0;k<indices.length;k+=3)if([indices[k],indices[k+1],indices[k+2]].every(v=>weight(v)>.4))kept.push(indices[k],indices[k+1],indices[k+2]);
   if(!kept.length)continue;
   const arm=source.clone('First-person Marin sleeve and glove',source.parent);arm.makeGeometryUnique();arm.setIndices(kept);arm.releaseSubMeshes();new B.SubMesh(0,0,arm.getTotalVertices(),0,kept.length,arm);arm.skeleton=source.skeleton;
   // The supplied skeleton has no finger joints. Curl the cropped glove's fingers
   // in bind space once, keeping the real textured hand instead of adding a block glove.
   const hand=source.skeleton.bones.find(b=>b.name.endsWith(':RightHand'));
   if(hand){
    const inverseBind=hand.getAbsoluteInverseBindMatrix(),bind=inverseBind.clone().invert();
    const positions=Array.from(source.getVerticesData(B.VertexBuffer.PositionKind));
    const local=new Map();let fingerEnd=0;
    for(let v=0;v<positions.length/3;v++){
     let w=0;for(let k=0;k<4;k++)if(ids[v*4+k]===hand.getIndex())w+=weights[v*4+k];
     if(w<.9)continue;
     const point=B.Vector3.TransformCoordinates(V(...positions.slice(v*3,v*3+3)),inverseBind);
     local.set(v,point);fingerEnd=Math.max(fingerEnd,point.y);
    }
    const knuckle=fingerEnd*.56,radius=(fingerEnd-knuckle)/2.5;
    for(const [v,point] of local)if(point.y>knuckle){
     const angle=(point.y-knuckle)/Math.max(.001,fingerEnd-knuckle)*2.5;
     point.y=knuckle+Math.sin(angle)*radius;point.z-=(1-Math.cos(angle))*radius;
     const curled=B.Vector3.TransformCoordinates(point,bind);positions.splice(v*3,3,curled.x,curled.y,curled.z);
    }
    const normals=[];B.VertexData.ComputeNormals(positions,kept,normals);
    arm.setVerticesData(B.VertexBuffer.PositionKind,positions,true);arm.setVerticesData(B.VertexBuffer.NormalKind,normals,true);
   }
   arm.renderingGroupId=2;arm.isPickable=false;arm.alwaysSelectAsActiveMesh=true;arm.setEnabled(false);firstPersonArms.push(arm);
  }
  return true;
 }).catch(error=>{console.warn('Gameplay Marin could not load.',error);return false;}):Promise.resolve(false);
 const joint=name=>rig?.container.transformNodes.find(node=>node.name==='mixamorig:'+name);
 function reset(){time=0;current='Idle_15';previous=null;blend=1;yaw=Math.PI;jumpTime=0;hide();}
 function hide(){hose?.setEnabled(false);root.setEnabled(false);tool.setEnabled(false);shadow.setEnabled(false);}
 function update(player,state,look,dt,{speed=0,moveYaw=look.y,visibility=1,firstPerson=false,recoil=0}={}){
  if(!rig)return;
  rig.setBackpack(state.gear&&!firstPerson,visibility);
  for(const mesh of rig.container.meshes)if(mesh.getTotalVertices())mesh.setEnabled(!firstPerson);
  firstPersonArms.forEach(mesh=>mesh.setEnabled(firstPerson&&(state.weapon>0||state.cannon)&&!state.ride));
  root.setEnabled(true);root.position.set(player.x,player.y+(state.ride?.65:0),player.z);
  const aim=state.weapon>0||state.cannon,desired=state.ride||aim||speed<.1?look.y:moveYaw;
  if(firstPerson)yaw=desired;else yaw+=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw))*(1-Math.exp(-dt*16));root.rotation.y=yaw;root.rotation.x=firstPerson?look.x:0;
  if(firstPerson){
   // Pivot the cropped arm around the eye so steep look angles keep the same grip framing.
   const eye=V(player.x,player.y+1.65,player.z),up=B.Vector3.TransformNormal(V(0,1.65,0),B.Matrix.RotationYawPitchRoll(yaw,look.x,0));root.position.copyFrom(eye.subtract(up));
  }
  let next=state.ride?'Idle_15':!player.grounded?'Jump_Over_Obstacle_2':speed>.15?'Running':'Idle_15';
  if(next!==current){previous={name:current,time};current=next;time=0;blend=0;jumpTime=0;}
  // Broader, calmer strides: about 30% slower, still tied to distance traveled.
  if(current==='Running')time+=speed*dt/3.3;
  else if(current==='Jump_Over_Obstacle_2'){jumpTime+=dt;time=Math.min(.83,jumpTime*1.1);}
  else time+=dt;
  blend=Math.min(1,blend+dt/.2);
  if(previous&&blend<1)rig.blendSamples(previous,{name:current,time,loop:current!=='Jump_Over_Obstacle_2'},blend*blend*(3-2*blend));
  else rig.sample(current,time,{loop:current!=='Jump_Over_Obstacle_2'});
  if(state.ride){
   for(const side of ['Left','Right']){joint(side+'UpLeg').rotationQuaternion.multiplyInPlace(B.Quaternion.RotationYawPitchRoll(side==='Left'?-.25:.25,-1.1,0));joint(side+'Leg').rotationQuaternion.multiplyInPlace(B.Quaternion.RotationYawPitchRoll(0,1.5,0));}
   rig.updateMatrices();
  }
  hose?.setEnabled(false);
  const equipped=aim&&!state.ride;
  tool.setEnabled(equipped);tool.scaling.setAll(firstPerson?.78:1);
  if(equipped){
   // Raise the real arm toward a steady grip; the tool follows her palm, not the camera.
   const aimRotation=B.Quaternion.RotationYawPitchRoll(look.y,look.x,0);
   const aimMatrix=B.Matrix.Compose(V(1,1,1),aimRotation,V());
   const offset=B.Vector3.TransformNormal(V(.23,-.12-recoil,.52),aimMatrix);
   const target=firstPerson?V(player.x,player.y+1.65,player.z).add(offset):V(player.x+Math.sin(look.y)*.48+Math.cos(look.y)*.25,player.y+1.23-Math.sin(look.x)*.35,player.z+Math.cos(look.y)*.48-Math.sin(look.y)*.25);
   rig.reachRightHand(target,0,{pole:V(Math.cos(look.y)*.2,-1,-Math.sin(look.y)*.2)});
   const wrist=joint('RightHand');
   // Turn the glove onto the vertical handle instead of balancing the gun on an open palm.
   for(const [axis,direction] of [[B.Axis.Y,V(0,-1,0)],[B.Axis.X,B.Axis.Z]]){
    const inverse=wrist.parent.computeWorldMatrix(true).clone().invert();
    const from=B.Vector3.TransformNormal(B.Vector3.TransformNormal(axis,wrist.computeWorldMatrix(true)),inverse).normalize();
    const to=B.Vector3.TransformNormal(B.Vector3.TransformNormal(direction,aimMatrix),inverse).normalize();
    wrist.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(from,to,new B.Quaternion()).multiply(wrist.rotationQuaternion);rig.updateMatrices();
   }
   const palmDirection=B.Vector3.TransformNormal(B.Axis.Y,wrist.computeWorldMatrix(true)).normalize();
   const palm=wrist.getAbsolutePosition().add(palmDirection.scale(.052));
   const handMatrix=rig.rightHand.computeWorldMatrix(true),handRotation=new B.Quaternion();handMatrix.decompose(undefined,handRotation,undefined);
   tool.position.copyFrom(B.Vector3.TransformCoordinates(palm,handMatrix.clone().invert()));
   tool.rotationQuaternion.copyFrom(handRotation.invert().multiply(aimRotation));
   tool.computeWorldMatrix(true);tool.getChildMeshes().forEach(mesh=>{mesh.visibility=firstPerson?1:visibility;mesh.renderingGroupId=firstPerson?2:0;});
   if(state.gear&&rig.backpack){
    const start=B.Vector3.TransformCoordinates(V(.12,-.18,-.24),rig.back.computeWorldMatrix(true)),end=sprayer?sprayer.port.computeWorldMatrix(true).getTranslation():tool.getAbsolutePosition();
    for(let i=0;i<hosePath.length;i++){const t=i/(hosePath.length-1);B.Vector3.LerpToRef(start,end,t,hosePath[i]);hosePath[i].y-=Math.sin(t*Math.PI)*.3;hosePath[i].x+=Math.cos(look.y)*Math.sin(t*Math.PI)*.12;hosePath[i].z-=Math.sin(look.y)*Math.sin(t*Math.PI)*.12;}
    hose=B.MeshBuilder.CreateTube('Marin flexible spray hose',{path:hosePath,radius:.016,tessellation:6,updatable:true,instance:hose||undefined},scene);hose.material=world.M.black;hose.isPickable=false;hose.setEnabled(true);hose.visibility=firstPerson?0:visibility;
   }
  }
  for(const mesh of rig.container.meshes)mesh.visibility=visibility;
  shadow.setEnabled(!state.ride&&!firstPerson);shadow.position.set(player.x,player.y+.035,player.z);shadow.visibility=player.grounded?.18:.08;
 }
 return {root,shadow,tool,firstPersonArms,get sprayer(){return sprayer;},get hose(){return hose;},ready,update,reset,hide,get rig(){return rig;},get clip(){return current;}};
}
