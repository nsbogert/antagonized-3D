// Pooled geometry: no new meshes, materials, or lights during a slam.
export function buildSlamEffects({B,scene,V,mat,box,ball,rod}){
  const root=new B.TransformNode('ground slam effects',scene);
  const clay=mat('slam broken clay','#bd8960'),dark=mat('slam fresh fissure','#231611');
  const dustMat=mat('slam dust','#c19b77',{alpha:.32});
  const hot=mat('slam amber fracture','#ffb45c',{glow:1});
  const countdown=B.MeshBuilder.CreateTorus('slam countdown',{diameter:8,thickness:.12,tessellation:48},scene);countdown.parent=root;countdown.material=hot;countdown.setEnabled(false);
  const path=Array.from({length:12},(_,i)=>{const mesh=box('slam buckling earth',0,0,0,.7,.3,.8,clay,root);mesh.setEnabled(false);return mesh;});
  const impact=new B.TransformNode('slam impact',scene);impact.parent=root;impact.setEnabled(false);
  const wave=B.MeshBuilder.CreateTorus('queen slam shockwave',{diameter:1,thickness:.22,tessellation:48},scene);wave.parent=impact;wave.material=clay;
  const shards=Array.from({length:20},(_,i)=>{
    const angle=i*Math.PI*2/20,r=1.2+(i%4)*.65;
    const mesh=ball('slam flying stone',0,0,0,.42+(i%3)*.16,.3+(i%2)*.12,.52,clay,impact);
    return {mesh,angle,r,speed:3+(i%4)*.7};
  });
  const clouds=Array.from({length:12},(_,i)=>{const mesh=ball('slam dust plume',0,0,0,1,1,1,dustMat,impact);return {mesh,angle:i*Math.PI/6};});
  const cracks=[];
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    for(let j=0;j<3;j++){
      const r=.4+j,angle=a+(j%2?.12:-.06);
      const start=V(Math.cos(angle)*r,.065,Math.sin(angle)*r),end=V(Math.cos(a)*(r+1),.065,Math.sin(a)*(r+1));
      cracks.push(rod('slam cracked floor',start,end,.08,dark,impact));
    }
  }
  let at=null;
  function warning(q,time){
    const active=q.mode==='warn'&&q.attack==='slam'&&q.target;
    countdown.setEnabled(!!active);
    if(!active){for(const p of path)p.setEnabled(false);return;}
    const progress=Math.max(0,Math.min(1,1-q.timer/1.8));
    countdown.position.set(q.target.x,.15,q.target.z);countdown.scaling.setAll(Math.max(.03,1-progress));
    // The forelegs hit at 78% of the warning. A ground ripple then reaches
    // the locked danger circle exactly when the existing damage event fires.
    const travel=Math.max(0,(progress-.78)/.22);
    const sx=q.x+Math.sin(q.yaw)*3.5,sz=q.z+Math.cos(q.yaw)*3.5;
    for(let i=0;i<path.length;i++){
      const p=path[i],t=(i+1)/path.length,age=travel-t;
      p.setEnabled(travel>0&&age>=-.12&&age<.35);
      p.position.set(sx+(q.target.x-sx)*t,.12+Math.max(0,Math.sin((age+.12)/.47*Math.PI))*.8,sz+(q.target.z-sz)*t);
      p.rotation.set(.25*Math.sin(time*15+i),i*2.4,.2);
    }
  }
  function strike(point,time){impact.position.set(point.x,0,point.z);impact.setEnabled(true);at=time;animate(time);}
  function animate(time){
    if(at===null)return;
    const age=Math.max(0,time-at),radius=Math.min(4,.5+age*10);
    wave.position.y=.14;wave.scaling.set(radius*2,1,radius*2);wave.visibility=Math.max(0,1-age/.65);
    for(const {mesh,angle,r,speed} of shards){
      const d=r+age*.9;mesh.position.set(Math.cos(angle)*d,Math.max(.16,.2+speed*age-4.9*age*age),Math.sin(angle)*d);
      mesh.rotation.set(age*3+angle,angle,age*2);mesh.visibility=Math.max(0,Math.min(1,(2.5-age)*2));
    }
    for(const {mesh,angle} of clouds){
      const d=1+Math.min(age,1)*2.6;mesh.position.set(Math.cos(angle)*d,.35+age*.7,Math.sin(angle)*d);
      mesh.scaling.set(1+age*1.4,.65+age*.7,1+age*1.4);mesh.visibility=Math.max(0,1-age/1.5)*.65;
    }
    for(const crack of cracks)crack.visibility=Math.max(0,Math.min(1,3-age));
    if(age>=3){impact.setEnabled(false);at=null;}
  }
  function reset(){at=null;impact.setEnabled(false);countdown.setEnabled(false);for(const p of path)p.setEnabled(false);}
  return {warning,strike,animate,reset};
}
