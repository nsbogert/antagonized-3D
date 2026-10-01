// Small numeric rig: six persistent feet, alternating tripods, two-bone leg IK.
// Stance feet stay in world space while the body walks and turns above them.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const localToWorld=(q,x,z)=>({x:q.x+Math.cos(q.yaw)*x+Math.sin(q.yaw)*z,z:q.z-Math.sin(q.yaw)*x+Math.cos(q.yaw)*z});
export function createQueenMotion(){return {feet:[],group:0,x:0,z:0,travel:0,mode:null,age:0,height:0,pitch:0,roll:0};}
export function stepQueenMotion(m,q,dt,time){
  dt=clamp(dt,0,.05);
  if(m.mode!==q.mode){m.mode=q.mode;m.age=0;}else m.age+=dt;
  if(!m.feet.length){
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const nx=side*(i===1?4.5:4),nz=2.1-i*2.2,p=localToWorld(q,nx,nz);
      m.feet.push({side,i,group:(i+(side===1?1:0))%2,nx,nz,x:p.x,y:.08,z:p.z,progress:1,hip:{},knee:{},ankle:{}});
    }
    m.x=q.x;m.z=q.z;
  }
  const distance=Math.hypot(q.x-m.x,q.z-m.z);m.travel+=distance;m.x=q.x;m.z=q.z;
  const speed=dt>0?distance/dt:0;
  const canStep=q.mode!=='dead';
  const swinging=m.feet.some(f=>f.progress<1);
  if(canStep&&!swinging&&dt>0){
    const needsStep=m.feet.some(f=>{const p=localToWorld(q,f.nx,f.nz);return Math.hypot(p.x-f.x,p.z-f.z)>.65;});
    if(needsStep){
      for(const f of m.feet)if(f.group===m.group){
        const p=localToWorld(q,f.nx,f.nz),lead=Math.min(.22,2/Math.max(1,speed));
        f.startX=f.x;f.startZ=f.z;f.endX=p.x+(q.vx||0)*lead;f.endZ=p.z+(q.vz||0)*lead;
        f.progress=0;f.duration=clamp(.6/Math.max(2,speed),.055,.26);
      }
      m.group=1-m.group;
    }
  }
  const windup=q.mode==='warn'&&q.attack==='slam'?Math.sin(clamp(1-q.timer/1.8,0,1)*Math.PI*.65):0;
  const impact=q.mode==='recover'&&q.attack==='slam'&&q.stagger<=0&&q.foam<=0?Math.exp(-m.age*7):0;
  const walking=clamp(speed/2,0,1),breath=Math.sin(time*1.7)*.035;
  const height=breath+windup*.85-impact*.25+(q.mode==='warn'&&q.attack==='charge'?-.16:0)+Math.sin(m.travel*4)*.06*walking;
  const pitch=-windup*.2+impact*.1+(q.mode==='charge'?.07:0)+(q.stagger>0?-.04:0);
  const blend=1-Math.exp(-dt*12);m.height+=(height-m.height)*blend;m.pitch+=(pitch-m.pitch)*blend;
  m.roll+=(Math.sin(m.travel*2)*.025*walking-m.roll)*blend;
  const c=Math.cos(q.yaw),s=Math.sin(q.yaw);
  for(const f of m.feet){
    if(f.progress<1&&canStep){
      f.progress=Math.min(1,f.progress+dt/f.duration);const t=f.progress,e=t*t*(3-2*t);
      f.x=f.startX+(f.endX-f.startX)*e;f.z=f.startZ+(f.endZ-f.startZ)*e;f.y=.08+Math.sin(t*Math.PI)*(q.mode==='charge'?.55:.38);
    }
    // Body pitch raises the front hips with the same transform used for the shell.
    const hx=f.side*.85,hy=1.65,hz=1.3-f.i*1.6,cp=Math.cos(m.pitch),sp=Math.sin(m.pitch),cr=Math.cos(m.roll),sr=Math.sin(m.roll);
    const py=hy*cp-hz*sp;
    Object.assign(f.hip,{x:hx*cr-py*sr,y:hx*sr+py*cr+m.height,z:hy*sp+hz*cp});
    Object.assign(f.ankle,{x:c*(f.x-q.x)-s*(f.z-q.z),y:f.y,z:s*(f.x-q.x)+c*(f.z-q.z)});
    const dx=f.ankle.x-f.hip.x,dy=f.ankle.y-f.hip.y,dz=f.ankle.z-f.hip.z,raw=Math.hypot(dx,dy,dz)||.001;
    const d=clamp(raw,.61,5.999),ux=dx/raw,uy=dy/raw,uz=dz/raw;
    // Bend knees outward and upward, rather than letting them flip through the body.
    const dot=f.side*.55*ux+uy;let bx=f.side*.55-dot*ux,by=1-dot*uy,bz=-dot*uz;
    const length=Math.hypot(bx,by,bz)||1;bx/=length;by/=length;bz/=length;
    const along=(2.7**2-3.3**2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,2.7**2-along*along));
    Object.assign(f.knee,{x:f.hip.x+ux*along+bx*bend,y:f.hip.y+uy*along+by*bend,z:f.hip.z+uz*along+bz*bend});
  }
  return m;
}
