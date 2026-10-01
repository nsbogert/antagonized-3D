import {makeRoyalCrown,buildQueenFinale} from './queen-finale.mjs';
import {createQueenMotion,stepQueenMotion} from './queen-motion.mjs';
export function buildRoyal({B,scene,V,M,mat,box,ball,cyl,rod,solid,sign,makeMarker}){
  const earth=mat('royal earth','#3a302c'),floor=mat('royal clay','#74604d'),rootMat=mat('ancient roots','#4b3932');
  const resin=mat('royal amber','#ab7134',{glow:.12}),glow=mat('brood glow','#b0d994',{glow:.7});
  const shell=mat('queen obsidian','#3a2027'),edge=mat('queen copper','#8f4641'),soft=mat('queen weak spot','#f0b967',{glow:.5});
  const warning=mat('queen warning','#ff765d',{glow:1,alpha:.28}),warningEdge=mat('warning edge','#ff9a66',{glow:1});
  const groundSurfaces=[{x:-24,z:-14,w:48,d:38,top:.025}];
  box('royal chamber floor',0,-.15,5,48,.35,38,floor);
  box('cavern ceiling',0,13,5,48,.6,38,earth);
  for(const x of [-24,24])solid(x,0,5,1,13,40,earth);
  for(const z of [-14,24])solid(0,0,z,48,13,1,earth);
  // Keep the center clear so a warned charge always has room to be dodged.
  for(const side of [-1,1]){
    for(const z of [-9,2,12,22]){
      rod('foundation root',V(side*23,0,z),V(side*20,10,z-1),1.3,rootMat);
      rod('root arch',V(side*20,10,z-1),V(side*5,12.5,z-3),.9,rootMat);
      ball('resin growth',side*22,2,z,2.3,4.2,2.5,resin);
    }
    solid(side*17,0,3,2.3,3,3,rootMat);
    solid(side*17,0,-7,3.5,2.4,4,earth);
    box('climbable root ledge',side*17,2.43,-7,3.7,.08,4.2,resin);
    for(let i=0;i<11;i++){
      const x=side*(20.5+(i%2)*1.1),z=-11+i*3;
      cyl('pale fungus stalk',x,.4,z,.12,.8,M.cream);
      ball('fungus lantern',x,.91,z,.7,.35,.7,glow);
    }
  }
  // Amber floor seams converge on the throne, without adding collision obstacles.
  for(let i=0;i<9;i++)rod('resin seam',V((i-4)*5,.04,22),V((i-4)*.7,.04,-10),.035,resin);
  const throne=new B.TransformNode('empty royal throne',scene);
  for(let i=0;i<9;i++){const x=(i-4)*1.2;rod('throne root',V(x,0,-12.8),V(x*.8,5.5+Math.cos(i)*1.3,-12.8),.34,resin,throne);}
  sign('THE ROYAL CHAMBER',0,8.5,-13.2,8);
  const exitRoots=new B.TransformNode('entrance roots',scene);
  for(const x of [-2.8,2.8])rod('entrance arch',V(x,0,23.3),V(x*.4,5.4,23.3),.45,resin,exitRoots);
  sign('BACK TO DAYLIGHT',0,6,23.2,5);
  const bench={x:-10,y:0,z:19},supplyPoints=[bench,{x:19,y:0,z:12}],gearPickup=new B.TransformNode('royal supplies',scene);
  for(const point of supplyPoints){
    const {x,z}=point;box('supply case',x,.4,z,2.4,.8,1.3,M.metal);
    for(let i=-1;i<=1;i++){cyl('loaded canister',x+i*.6,1.1,z,.35,.6,M.white);ball('supply light',x+i*.6,1.45,z,.2,.15,.2,glow);}
    sign('REFILL · E',x,2.3,z,2.8);makeMarker('✚','FIELD SUPPLIES',V(x,3,z));
  }
  const eggSpawns=[];
  for(const [x,z] of [[-4,16],[5,17],[-11,8],[11,8],[-7,-8],[7,-8],[-20,14],[20,-3]]){
    cyl('royal egg clutch',x,.065,z,2.5,.1,earth,null,2.8);
    for(let i=0;i<3;i++)eggSpawns.push({x:x+Math.cos(i*2.1)*.7,y:.12,z:z+Math.sin(i*2.1)*.7});
  }
  // Worker homes reuse the normal worker lifecycle, but are not food-cache objectives.
  const caches=[{name:'WEST BROOD',x:-11,z:8},{name:'EAST BROOD',x:11,z:8},{name:'ROYAL BROOD',x:-7,z:-8}].map(c=>({...c,y:0,secured:false,lid:new B.TransformNode('brood lid',scene),marker:{el:{hidden:true}}}));
  const clue={x:0,y:0,z:-3},clueMarker={el:{hidden:true}},doorMarker={el:{hidden:true}};
  const queen=new B.TransformNode('THE QUEEN',scene);queen.position.set(0,0,-3);
  const body=new B.TransformNode('queen body',scene);body.parent=queen;
  const abdomen=ball('queen abdomen',0,2.1,-1.8,4.6,3.6,5.4,shell,body);
  ball('queen thorax',0,1.9,.6,2.8,2.6,3,shell,body);
  const weak=ball('exposed royal heart',0,1.55,2.05,2.1,1.5,1.7,soft,body);
  ball('queen head',0,2.5,2.4,2.8,2.5,2.3,shell,body);
  const plates=[];
  for(let i=0;i<3;i++)plates.push(ball('breakable resin plate',0,2.65,-3+i*1.7,4.65,2.6,2.1,resin,body));
  for(const side of [-1,1]){
    ball('queen luminous eye',side*1.04,2.9,3.26,.7,.55,.4,soft,body);
    rod('queen antenna',V(side*.8,3.4,2.8),V(side*1.9,5,3.3),.12,edge,body);
    rod('queen antenna tip',V(side*1.9,5,3.3),V(side*2.7,5.5,4.1),.09,edge,body);
    rod('queen jaw',V(side*.95,1.8,3.1),V(side*1.6,1.3,4.3),.32,edge,body);
    rod('queen fang',V(side*1.6,1.3,4.3),V(side*.35,1.4,4.5),.21,resin,body);
  }
  const crown=makeRoyalCrown({B,scene,V,mat,ball,cyl,rod},body);
  const legs=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){
    // Unit cylinders are repositioned and scaled; no geometry is rebuilt per frame.
    const thigh=cyl('queen armored thigh',0,0,0,.34,1,shell,queen);
    const knee=ball('queen leg joint plate',0,0,0,.65,.65,.65,edge,queen);
    const shin=cyl('queen shin',0,0,0,.23,1,edge,queen);
    const claw=cyl('queen claw',0,0,0,.13,1,resin,queen);
    legs.push({thigh,knee,shin,claw});
  }
  let motion=createQueenMotion(),lastTime=0,direction;
  function segment(mesh,a,b){
    direction??=V();direction.set(b.x-a.x,b.y-a.y,b.z-a.z);
    const length=direction.length();mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.scaling.y=length;
    direction.scaleInPlace(1/Math.max(.0001,length));mesh.rotationQuaternion??=new B.Quaternion();
    B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,direction,mesh.rotationQuaternion);
  }
  const foam=ball('queen foam coating',0,.9,1,3.8,1.8,4,M.foam,queen);foam.setEnabled(false);
  const slam=ball('slam warning area',0,.06,0,8,.035,8,warning,null,false);slam.setEnabled(false);
  const ring=B.MeshBuilder.CreateTorus('slam warning edge',{diameter:8,thickness:.075,tessellation:48},scene);ring.material=warningEdge;ring.setEnabled(false);
  const lane=box('charge warning lane',0,.06,0,6.4,.04,1,warning,null,false);lane.setEnabled(false);
  const daylight=ball('daylight beyond roots',0,3,23.65,5,6,.1,M.cloud,null,false);daylight.setEnabled(false);
  const finale=buildQueenFinale({B,scene,V,M,mat,box,ball,cyl,rod},{queen,body,crown,legs,getFeet:()=>motion.feet});
  const shock=B.MeshBuilder.CreateTorus('queen slam shockwave',{diameter:1,thickness:.16,tessellation:48},scene);shock.material=warningEdge;shock.setEnabled(false);
  let slamAt=null;
  function queenSlam(point){shock.position.set(point.x,.12,point.z);slamAt=lastTime;shock.setEnabled(true);}
  let defeated=false;
  function syncQueen(q,time,dt=Math.max(0,Math.min(.04,time-lastTime))){
    lastTime=time;stepQueenMotion(motion,q,dt,time);
    body.position.y=motion.height;body.rotation.x=motion.pitch;body.rotation.z=motion.roll;
    queen.position.set(q.x,defeated?.15:0,q.z);queen.rotation.y=q.yaw;queen.rotation.z=defeated?1.35:0;
    const amount=Math.ceil(q.armor/3);plates.forEach((p,i)=>p.setEnabled(i<amount));
    weak.material=q.open>0?soft:shell;abdomen.material=q.hitFlash>0?edge:shell;
    foam.setEnabled(q.foam>0&&!defeated);
    for(let i=0;i<legs.length;i++){
      const leg=legs[i],f=motion.feet[i];
      segment(leg.thigh,f.hip,f.knee);leg.knee.position.set(f.knee.x,f.knee.y,f.knee.z);segment(leg.shin,f.knee,f.ankle);
      segment(leg.claw,f.ankle,{x:f.ankle.x+f.side*.28,y:Math.max(.04,f.ankle.y-.04),z:f.ankle.z+.36});
    }
    const circle=q.mode==='warn'&&q.attack==='slam';slam.setEnabled(circle);ring.setEnabled(circle);
    lane.setEnabled(q.mode==='warn'&&q.attack==='charge');
    if(circle){slam.position.set(q.target.x,.07,q.target.z);ring.position.set(q.target.x,.1,q.target.z);ring.scaling.setAll(1+Math.sin(time*12)*.025);}
    if(q.mode==='warn'&&q.attack==='charge'){
      const dx=q.target.x-q.from.x,dz=q.target.z-q.from.z;
      lane.position.set((q.from.x+q.target.x)/2,.08,(q.from.z+q.target.z)/2);lane.scaling.z=Math.hypot(dx,dz)+4;lane.rotation.y=Math.atan2(dx,dz);
    }
  }
  return {eggSpawns,supplyPoints,groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,syncQueen,finale,queenSlam,
    animate(time){if(slamAt!==null){const age=time-slamAt;shock.scaling.setAll(1+Math.min(1,age/.55)*7);shock.visibility=Math.max(0,1-age/.65);if(age>.65){shock.setEnabled(false);slamAt=null;}}},finishChapter(){defeated=true;shock.setEnabled(false);slamAt=null;daylight.setEnabled(true);exitRoots.setEnabled(false);slam.setEnabled(false);ring.setEnabled(false);lane.setEnabled(false);},
    resetChapter(){finale.reset();shock.setEnabled(false);slamAt=null;motion=createQueenMotion();lastTime=0;defeated=false;daylight.setEnabled(false);exitRoots.setEnabled(true);queen.rotation.z=0;}};
}
