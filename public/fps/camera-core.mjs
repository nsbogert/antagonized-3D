// Plain geometry shared by the camera and weapon aiming; no mesh picking or extra render pass.
export const CHASE_DISTANCE=3.6;
export function directionFor(rotation){const c=Math.cos(rotation.x);return {x:Math.sin(rotation.y)*c,y:-Math.sin(rotation.x),z:Math.cos(rotation.y)*c};}
export function rayBoxDistance(origin,direction,box,limit,padding=0){
 let near=0,far=limit;
 for(const [axis,min,max] of [['x',box.x-padding,box.x+box.w+padding],['y',box.bottom-padding,box.top+padding],['z',box.z-padding,box.z+box.d+padding]]){
  const d=direction[axis],o=origin[axis];
  if(Math.abs(d)<1e-7){if(o<min||o>max)return null;continue;}
  let a=(min-o)/d,b=(max-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null;
 }
 return near<=limit&&far>=0?Math.max(0,near):null;
}
export function chaseCamera(player,rotation,colliders,{riding=false,previousDistance=CHASE_DISTANCE,dt=0,snap=false}={}){
 const forward=directionFor(rotation),pivot={x:player.x,y:player.y+(riding?2:1.0),z:player.z},right={x:Math.cos(rotation.y),z:-Math.sin(rotation.y)},desired={x:pivot.x-forward.x*CHASE_DISTANCE+right.x*.65,y:Math.max(player.y+.25,pivot.y-forward.y*CHASE_DISTANCE),z:pivot.z-forward.z*CHASE_DISTANCE+right.z*.65};
 let dx=desired.x-pivot.x,dy=desired.y-pivot.y,dz=desired.z-pivot.z,length=Math.hypot(dx,dy,dz),direction={x:dx/length,y:dy/length,z:dz/length},allowed=length;
 for(const box of colliders){const hit=rayBoxDistance(pivot,direction,box,length,.2);if(hit!==null)allowed=Math.min(allowed,Math.max(.08,hit-.12));}
 const distance=snap||allowed<previousDistance?allowed:Math.min(allowed,previousDistance+(allowed-previousDistance)*(1-Math.exp(-dt*8)));
 return {x:pivot.x+direction.x*distance,y:pivot.y+direction.y*distance,z:pivot.z+direction.z*distance,distance,visibility:Math.max(0,Math.min(1,(distance-.5)/.7))};
}
export function crosshairPoint(origin,direction,colliders,targets=[],range=60){
 let nearest=range;
 for(const box of colliders){const hit=rayBoxDistance(origin,direction,box,nearest);if(hit!==null)nearest=Math.min(nearest,hit);}
 for(const target of targets){
  const x=origin.x-target.x,y=origin.y-target.y,z=origin.z-target.z,b=x*direction.x+y*direction.y+z*direction.z,c=x*x+y*y+z*z-target.radius**2,discriminant=b*b-c;
  if(discriminant<0)continue;const hit=-b-Math.sqrt(discriminant);if(hit>0)nearest=Math.min(nearest,hit);
 }
 return {x:origin.x+direction.x*nearest,y:origin.y+direction.y*nearest,z:origin.z+direction.z*nearest};
}
