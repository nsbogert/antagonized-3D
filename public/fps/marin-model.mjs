// A lightweight articulated character with shaped garment meshes and a projected face.
// Geometry and textures are created once; the finale only updates joint transforms.
export function makeMarin({B,scene,V,M,mat,ball,cyl,rod,box}){
 const root=new B.TransformNode('victory Marin',scene),body=new B.TransformNode('Marin coveralls',scene);body.parent=root;body.position.y=1.1;
 const cloth=mat('Marin tailored coveralls','#e8e6da'),seam=mat('coverall stitching','#bebcae'),skin=mat('Marin warm skin','#dda67f');
 const hair=mat('Marin chestnut bob','#62402a'),hairLight=mat('Marin hair highlights','#996439'),hairDark=mat('Marin hair part','#38281e');
 const leather=mat('Marin boot leather','#76543a'),sole=mat('Marin rubber soles','#39382e'),gold=mat('Marin buckles','#c9a159');
 cloth.specularColor=new B.Color3(.08,.08,.07);hair.specularColor=new B.Color3(.3,.2,.13);hair.specularPower=38;
 function mesh(name,positions,indices,uvs,material,parent){
  // Babylon uses clockwise triangles in its left-handed coordinate system.
  for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const mesh=new B.Mesh(name,scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.normals=[];
  B.VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(mesh);mesh.material=material;mesh.parent=parent;mesh.isPickable=false;return mesh;
 }
 function loft(name,profile,material,parent,folds=0){
  const positions=[],indices=[],uvs=[],segments=32,rows=(profile.length-1)*5;
  for(let j=0;j<=rows;j++){
   const k=j/rows*(profile.length-1),i=Math.min(profile.length-2,Math.floor(k)),t=k-i;
   const a=profile[i],b=profile[i+1],p=profile[Math.max(0,i-1)],n=profile[Math.min(profile.length-1,i+2)];
   const smooth=index=>{const A=p[index]||0,C=a[index]||0,D=b[index]||0,E=n[index]||0;return .5*((2*C)+(-A+D)*t+(2*A-5*C+4*D-E)*t*t+(-A+3*C-3*D+E)*t*t*t);};
   const y=a[0]+(b[0]-a[0])*t,rx=Math.max(.006,smooth(1)),rz=Math.max(.006,smooth(2)),oz=smooth(3);
   for(let s=0;s<=segments;s++){
    const angle=s/segments*Math.PI*2,crease=1+folds*Math.sin(angle*5+j*.8)*Math.sin(j/rows*Math.PI);
    positions.push(Math.sin(angle)*rx*crease,y,Math.cos(angle)*rz*crease+oz);uvs.push(s/segments,j/rows);
    if(j<rows&&s<segments){const at=j*(segments+1)+s,next=at+segments+1;indices.push(at,at+1,next,at+1,next+1,next);}
   }
  }
  return mesh(name,positions,indices,uvs,material,parent);
 }
 loft('fitted coverall torso',[[-.18,.32,.22],[0,.38,.24],[.19,.32,.2],[.43,.34,.23],[.65,.4,.245],[.83,.43,.21],[.95,.31,.19],[1.02,.16,.135]],cloth,body,.018);
 loft('coverall hips',[[.91,.1,.15],[1.0,.35,.24],[1.17,.39,.25],[1.28,.34,.23]],cloth,root,.02);
 loft('neck',[[.89,.14,.13],[1.09,.14,.13],[1.18,.12,.12]],skin,body);
 // Collar, belt, pockets and seams read as clothing rather than separate body blocks.
 for(const side of [-1,1]){
  const collar=ball('folded coverall collar',side*.12,.94,.15,.23,.22,.065,cloth,body);collar.rotation.z=side*.45;
  const pocket=box('coverall chest pocket',side*.21,.61,.24,.22,.2,.026,cloth,body);pocket.rotation.z=side*.035;
  rod('pocket seam',V(side*.32,.66,.26),V(side*.1,.66,.26),.011,seam,body);
  rod('sprayer shoulder strap',V(side*.32,.92,.13),V(side*.31,.05,.255),.065,M.metal,body);
  box('harness buckle',side*.31,.23,.28,.1,.09,.035,gold,body);
 }
 rod('coverall zip',V(0,.06,.25),V(0,.91,.2),.019,M.metal,body);box('zip pull',0,.75,.254,.04,.085,.027,gold,body);
 const belt=loft('utility belt',[[.02,.414,.278],[.11,.41,.276]],M.metal,body);box('belt clasp',0,.063,.298,.16,.12,.045,gold,body);
 const head=new B.TransformNode('Marin smiling head',scene);head.parent=body;head.position.set(0,1.37,0);
 ball('Marin head volume',0,.025,-.025,.71,.85,.61,skin,head);
 for(const side of [-1,1])ball('Marin ear',side*.335,-.035,.025,.13,.23,.14,skin,head);
 const face=mat('Marin illustrated face','#ffffff');face.diffuseTexture=new B.Texture('assets/marin-face.png',scene);face.diffuseTexture.hasAlpha=true;face.useAlphaFromDiffuseTexture=true;face.backFaceCulling=false;face.specularColor=new B.Color3(.035,.025,.02);face.emissiveColor=new B.Color3(.14,.14,.14);
 const fp=[],fi=[],fu=[],columns=32,rows=36;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const u=i/columns,v=j/rows,x=(u-.5)*.8,y=(.5-v)*.94;
  const dome=Math.sqrt(Math.max(0,1-(x/.47)**2-(y/.57)**2));
  const nose=.105*Math.exp(-((x/.07)**2+((y+.09)/.13)**2));
  const cheeks=.026*Math.exp(-(((Math.abs(x)-.19)/.09)**2+((y+.1)/.12)**2));
  fp.push(x,y,.12+.23*dome+nose+cheeks);fu.push(u,1-v);
  if(j<rows&&i<columns){const a=j*(columns+1)+i,b=a+columns+1;fi.push(a,b,a+1,a+1,b,b+1);}
 }
 mesh('Marin curved face',fp,fi,fu,face,head);
 // One shaped bob shell, open around the face, with fine curved highlights.
 const hp=[],hi=[],hu=[],around=64,down=28;
 const hairPoint=(a,v,lift=0)=>{
  const front=Math.max(0,Math.cos(a)),limit=2.53-front**4*(1.35+.3*Math.sin(a));
  const phi=.015+v*limit,flare=1+.06*v*v;
  return V(Math.sin(a)*Math.sin(phi)*(.425+lift)*flare,.075+Math.cos(phi)*(.5+lift),-.035+Math.cos(a)*Math.sin(phi)*(.375+lift));
 };
 for(let j=0;j<=down;j++)for(let i=0;i<=around;i++){
  const p=hairPoint(i/around*Math.PI*2,j/down);hp.push(p.x,p.y,p.z);hu.push(i/around,j/down);
  if(j<down&&i<around){const a=j*(around+1)+i,b=a+around+1;hi.push(a,b,a+1,a+1,b,b+1);}
 }
 const bob=mesh('sculpted side-part bob',hp,hi,hu,hair,head);bob.material.backFaceCulling=false;
 for(let i=0;i<25;i++){
  const base=i/25*Math.PI*2,path=[];
  for(let j=0;j<15;j++){const t=j/14,pathAngle=base+.14*Math.sin(t*Math.PI);path.push(hairPoint(pathAngle,.12+t*.87,.008));}
  const strand=B.MeshBuilder.CreateTube('bob strand',{path,radius:i%3===0?.009:.005,tessellation:5},scene);strand.parent=head;strand.material=i%4===0?hairLight:hairDark;strand.isPickable=false;
 }
 // A swept fringe follows the forehead and blends into the side of the bob.
 for(let i=0;i<6;i++){
  const path=[];for(let j=0;j<18;j++){const t=j/17;path.push(V(.22-.61*t+i*.017,.48-.45*t*t-i*.009,.12+.22*Math.sin(t*Math.PI*.7)));}
  const lock=B.MeshBuilder.CreateTube('swept bob fringe',{path,radius:.037-i*.002,tessellation:8},scene);lock.parent=head;lock.material=i%3===0?hairLight:hair;lock.isPickable=false;
 }
 const arms=[],elbows=[],hands=[],legs=[],knees=[];
 for(const side of [-1,1]){
  const arm=new B.TransformNode('Marin shoulder',scene);arm.parent=body;arm.position.set(side*.43,.8,0);
  loft('shaped upper sleeve',[[-.53,.13,.13],[-.41,.145,.145],[-.14,.18,.17],[.02,.16,.16],[.12,.055,.06]],cloth,arm,.025);
  const elbow=new B.TransformNode('Marin elbow',scene);elbow.parent=arm;elbow.position.y=-.48;
  ball('sleeve elbow',0,0,0,.27,.26,.27,cloth,elbow);
  loft('shaped lower sleeve',[[-.49,.112,.115],[-.4,.125,.13],[-.22,.145,.145],[0,.14,.14]],cloth,elbow,.025);
  loft('glove cuff',[[-.52,.13,.135],[-.44,.135,.14]],leather,elbow);
  const hand=new B.TransformNode('Marin palm',scene);hand.parent=elbow;hand.position.set(0,-.58,.01);
  ball('leather glove palm',0,-.01,0,.23,.27,.13,leather,hand);
  for(let i=0;i<4;i++)ball('glove fingers',(i-1.5)*.045,-.145,.035,.057,.18,.09,leather,hand);
  const thumb=ball('glove thumb',-side*.105,-.04,.025,.09,.18,.1,leather,hand);thumb.rotation.z=side*.45;
  arms.push(arm);elbows.push(elbow);hands.push(hand);
  const leg=new B.TransformNode('Marin hip',scene);leg.parent=root;leg.position.set(side*.21,1.12,0);
  loft('tailored upper trouser',[[-.57,.145,.15],[-.44,.16,.17],[-.15,.205,.21],[.07,.18,.19]],cloth,leg,.02);
  const knee=new B.TransformNode('Marin knee',scene);knee.parent=leg;knee.position.y=-.51;
  ball('coverall knee',0,0,0,.29,.29,.31,cloth,knee);
  loft('tailored lower trouser',[[-.47,.15,.16],[-.34,.145,.15],[-.13,.155,.16],[.02,.15,.15]],cloth,knee,.03);
  const boot=new B.TransformNode('Marin boot',scene);boot.parent=knee;boot.position.set(0,-.46,.035);
  loft('rounded work boot',[[-.115,.15,.22,.09],[-.07,.195,.31,.13],[.035,.185,.3,.12],[.12,.155,.21,.06],[.27,.14,.15,0]],leather,boot);
  loft('boot tread',[[-.145,.18,.29,.12],[-.1,.201,.315,.125],[-.065,.195,.31,.13]],sole,boot);
  for(let i=0;i<4;i++){const y=.055+i*.04,z=.32-i*.045;rod('boot lace',V(-.09,y,z),V(.09,y+.013,z),.013,seam,boot);}
  legs.push(leg);knees.push(knee);
 }
 const tank=cyl('Marin backpack sprayer',0,.5,-.37,.42,.83,M.metal,body);ball('sprayer top cap',0,.94,-.37,.42,.18,.42,M.metal,body);
 box('green tank window',0,.5,-.587,.2,.53,.035,M.lime,body);
 const hose=[];for(let i=0;i<20;i++){const t=i/19;hose.push(V(.2+.36*Math.sin(t*Math.PI),.11-.35*Math.sin(t*Math.PI),-.4+.5*t));}
 const pipe=B.MeshBuilder.CreateTube('flexible sprayer hose',{path:hose,radius:.038,tessellation:8},scene);pipe.parent=body;pipe.material=M.black;
 root.setEnabled(false);return {root,body,head,arms,elbows,hands,legs,knees};
}
