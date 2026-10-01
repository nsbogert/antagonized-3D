import {buildRoyal} from './royal.mjs';
import {buildWalls} from './walls.mjs';
import {buildKitchen} from './kitchen.mjs';
const B = window.BABYLON;
export const V = (x=0,y=0,z=0) => new B.Vector3(x,y,z);
export function buildWorld(scene,chapter=1) {
  const materials = {};
  function mat(name,color,options={}) {
    if (materials[name]) return materials[name];
    const m = new B.StandardMaterial(name,scene);
    m.diffuseColor=B.Color3.FromHexString(color); m.specularColor=new B.Color3(.08,.08,.06);
    if(options.alpha) m.alpha=options.alpha;
    if(options.glow) m.emissiveColor=m.diffuseColor.scale(options.glow);
    materials[name]=m; return m;
  }
  const M={grass:mat('grass','#789956'),grassDark:mat('grassDark','#5d8045'),grassLight:mat('grassLight','#8eac62'),stone:mat('stone','#ddd1b1'),stoneSide:mat('stoneSide','#b9ad91'),soil:mat('soil','#574c37'),wood:mat('wood','#b78858'),woodDark:mat('woodDark','#725239'),cream:mat('cream','#f3e6c6'),white:mat('white','#eee9d7'),cloud:mat('cloud','#edf1dd',{glow:.8}),house:mat('house','#abc3ad'),roof:mat('roof','#455b58'),glass:mat('glass','#709ca1'),leaf:mat('leaf','#4e7842'),leafLight:mat('leafLight','#8ba45b'),terra:mat('terra','#bf7450'),terraLight:mat('terraLight','#d39264'),yellow:mat('yellow','#efca64'),pink:mat('pink','#da9a9a'),purple:mat('purple','#9c90ad'),metal:mat('metal','#53645a'),lime:mat('lime','#d7e783',{glow:.15}),black:mat('black','#272f28'),worker:mat('worker','#342d25'),soldier:mat('soldier','#984229'),eye:mat('eye','#111a17'),blue:mat('blue','#486e93'),glove:mat('glove','#67523a'),skin:mat('skin','#d7a078'),foam:mat('foam','#bde4e1'),mist:mat('mist','#c2db75',{alpha:.18,glow:.3}),shadow:mat('shadow','#273927',{alpha:.16})};
  M.egg=mat('pearl egg shell','#e5ebbc',{glow:.22});M.egg.specularColor=new B.Color3(.6,.7,.4);M.egg.specularPower=65;
  M.chitin=mat('chitin seams','#251f19');M.shellHighlight=mat('shell highlight','#61513b');
  M.wing=mat('wing membrane','#d7e9d4',{alpha:.52,glow:.18});M.vein=mat('wing veins','#8ba29c');
  M.worker.specularColor=new B.Color3(.45,.38,.26);M.worker.specularPower=75;
  M.soldier.specularColor=new B.Color3(.5,.3,.17);M.soldier.specularPower=65;
  M.eye.specularColor=new B.Color3(.9,.9,.9);M.eye.specularPower=110;
  let textureSeed=417;
  const trand=()=>{textureSeed=(textureSeed*16807)%2147483647;return(textureSeed-1)/2147483646;};
  function surfaceTexture(name,base,kind,repeat=1){
    const texture=new B.DynamicTexture(name,{width:512,height:512},scene,true);const ctx=texture.getContext();ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    for(let i=0;i<6500;i++){const x=trand()*512,y=trand()*512;ctx.fillStyle=trand()>.5?'rgba(255,244,203,.07)':'rgba(24,42,20,.065)';ctx.fillRect(x,y,1+trand()*4,kind==='wood'?25+trand()*100:1+trand()*5);}
    if(kind==='grass'){for(let i=0;i<3000;i++){const x=trand()*512,y=trand()*512;ctx.strokeStyle=trand()>.45?'rgba(54,82,37,.25)':'rgba(189,199,117,.25)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+trand()*4-2,y-2-trand()*7);ctx.stroke();}}
    if(kind==='stone'){for(let i=0;i<40;i++){ctx.fillStyle='rgba(225,217,188,.18)';ctx.beginPath();ctx.ellipse(trand()*512,trand()*512,15+trand()*35,8+trand()*24,trand()*3,0,Math.PI*2);ctx.fill();}}
    if(kind==='wood'){for(let y=0;y<512;y+=64){ctx.fillStyle='rgba(34,25,12,.16)';ctx.fillRect(0,y,512,2);}}
    texture.update();texture.uScale=texture.vScale=repeat;return texture;
  }
  for(const [material,base,kind,repeat] of [[M.grass,'#80995d','grass',18],[M.stone,'#d3c5a5','stone',5],[M.wood,'#b58a5d','wood',2],[M.soil,'#65533b','soil',3],[M.roof,'#526465','stone',8]]){material.diffuseTexture=surfaceTexture(material.name+' detail',base,kind,repeat);material.diffuseColor=B.Color3.White();}
  const shadowTex=new B.DynamicTexture('soft ant shadow',{width:64,height:64},scene,false);const sc=shadowTex.getContext(),sg=sc.createRadialGradient(32,32,4,32,32,32);sg.addColorStop(0,'rgba(13,28,14,.7)');sg.addColorStop(1,'rgba(13,28,14,0)');sc.fillStyle=sg;sc.fillRect(0,0,64,64);shadowTex.hasAlpha=true;shadowTex.update();M.shadow.diffuseTexture=shadowTex;M.shadow.useAlphaFromDiffuseTexture=true;M.shadow.alpha=.5;M.shadow.disableLighting=true;M.shadow.emissiveColor=B.Color3.White();
  const statics=[],colliders=[],markers=[];
  function box(name,x,y,z,w,h,d,m,parent=null,merge=true) {const o=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);o.position.set(x,y,z);o.material=m;o.parent=parent;o.isPickable=false;if(!parent&&merge)statics.push(o);return o;}
  function ball(name,x,y,z,sx,sy,sz,m,parent=null,merge=true) {const o=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:16},scene);o.position.set(x,y,z);o.scaling.set(sx,sy,sz);o.material=m;o.parent=parent;o.isPickable=false;if(!parent&&merge)statics.push(o);return o;}
  function cyl(name,x,y,z,diam,h,m,parent=null,top=diam,merge=true){const o=B.MeshBuilder.CreateCylinder(name,{diameterBottom:diam,diameterTop:top,height:h,tessellation:12},scene);o.position.set(x,y,z);o.material=m;o.parent=parent;o.isPickable=false;if(!parent&&merge)statics.push(o);return o;}
  function rod(name,a,b,r,m,parent=null,merge=true){const mid=a.add(b).scale(.5);const o=cyl(name,mid.x,mid.y,mid.z,r,B.Vector3.Distance(a,b),m,parent,r,merge);o.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,b.subtract(a).normalize(),new B.Quaternion());return o;}
  function solid(x,y,z,w,h,d,m){const o=box('solid',x,y+h/2,z,w,h,d,m);colliders.push({x:x-w/2,z:z-d/2,w,d,top:y+h,bottom:y});return o;}
  function sign(text,x,y,z,width=2.3){const t=new B.DynamicTexture('label',{width:512,height:128},scene,false);t.hasAlpha=true;const ctx=t.getContext();ctx.fillStyle='#233f2c';ctx.fillRect(0,0,512,128);ctx.font='bold 37px sans-serif';ctx.fillStyle='#f2ebd2';ctx.textAlign='center';ctx.fillText(text,256,78);t.update();const m=new B.StandardMaterial('sign',scene);m.diffuseTexture=t;m.emissiveColor=new B.Color3(.15,.15,.12);m.specularColor=B.Color3.Black();const o=B.MeshBuilder.CreatePlane('sign',{width,height:width/4,sideOrientation:B.Mesh.DOUBLESIDE},scene);o.position.set(x,y,z);o.rotation.y=Math.PI;o.material=m;o.isPickable=false;return o;}
  function makeMarker(icon,label,pos,groundY=0){const el=document.createElement('div');el.className='marker';el.innerHTML=`<b>${icon}</b>${label}<small></small>`;document.querySelector('#markers').append(el);const beacon=new B.TransformNode('objective beacon',scene);beacon.position.set(pos.x,groundY+.05,pos.z);const ring=B.MeshBuilder.CreateTorus('objective pulse',{diameter:2.3,thickness:.04,tessellation:32},scene);ring.parent=beacon;ring.material=M.lime;ring.isPickable=false;const diamond=box('floating objective',0,pos.y-groundY-.55,0,.22,.22,.22,M.lime,beacon);diamond.rotation.z=Math.PI/4;const m={el,pos,beacon,ring,diamond,groundY,phase:markers.length*1.3};markers.push(m);return m;}
  let supplyPoints=[],syncQueen=()=>{},eggSpawns=[],groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,animate=()=>{},finishChapter=()=>{},resetChapter=()=>{};
  if(chapter===4){({supplyPoints,syncQueen,eggSpawns,finishChapter,resetChapter,groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,animate}=buildRoyal({B,scene,V,M,mat,box,ball,cyl,rod,solid,sign,makeMarker}));}
  else if(chapter===3){({eggSpawns,finishChapter,resetChapter,groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,animate}=buildWalls({B,scene,V,M,mat,box,ball,cyl,rod,solid,sign,makeMarker}));}
  else if(chapter===2){({groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,animate}=buildKitchen({B,scene,V,M,mat,box,ball,cyl,rod,solid,sign,makeMarker}));}
  else {
  // Heights of visible ground surfaces, including paving without movement colliders.
  groundSurfaces=[{x:-23,z:-15.5,w:46,d:17,top:.035}];
  // Lawn, warm stone patio, a winding stepping-stone route.
  box('lawn',0,-.2,0,52,.4,52,M.grass);
  box('patio',0,-.04,-7,46,.12,17,M.stone);
  for(let x=-23;x<24;x+=3.8)for(let z=-15;z<2;z+=3.2){box('paver seam',x,.027,z,.025,.013,3.14,M.stoneSide);box('paver seam',x,.028,z,3.74,.013,.025,M.stoneSide);}
  for(let i=0;i<9;i++){const x=Math.sin(i*.7)*1.5;const o=cyl('garden stepping stone',x,.04,19-i*2.1,2,.13,M.stone);o.scaling.set(1.2,1,.75);o.rotation.y=Math.sin(i)*.18;groundSurfaces.push({x,z:19-i*2.1,rx:1.2,rz:.75,angle:o.rotation.y,top:.105});}
  let seed=19;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  // Fence encloses the play space. Broad surfaces and repeated details share materials.
  for(let i=-24;i<=24;i+=1.15){for(const side of [-1,1]){box('fence picket',side*24,1.35,i,.18,2.7,.94,M.cream);const cap=box('picket cap',side*24,2.74,i,.19,.36,.66,M.cream);cap.rotation.x=Math.PI/4;}box('fence picket',i,1.35,24,.94,2.7,.18,M.cream);}
  for(const side of [-1,1]){box('fence rail',side*23.8,.8,0,.16,.15,48,M.wood);box('fence rail',side*23.8,2.1,0,.16,.15,48,M.wood);}box('fence rail',0,1.8,23.8,48,.15,.16,M.wood);
  // House and welcoming porch.
  solid(0,0,-19,32,8,10,M.house);
  for(let y=.5;y<8;y+=.45)box('clapboard',0,y,-13.98,32,.045,.055,M.cream);
  const roof=box('roof front',0,9.15,-15.75,34,.24,7,M.roof);roof.rotation.x=.35;
  const roofBack=box('roof back',0,9.15,-22.25,34,.24,7,M.roof);roofBack.rotation.x=-.35;
  box('roof ridge',0,10.34,-19,34,.16,.32,M.roof);
  box('chimney',10,10.1,-21,1.5,3,1.5,M.terra);box('chimney cap',10,11.65,-21,1.8,.2,1.8,M.cream);
  for(let y=9;y<11.5;y+=.4)box('chimney masonry',10,y,-20.24,1.5,.035,.015,M.cream);
  box('roof fascia',0,8.15,-12.95,34,.35,.25,M.cream);
  for(const x of [-11,-6,6,11]){box('window frame',x,4.6,-13.84,3.3,3.4,.24,M.cream);box('window glass',x,4.6,-13.68,2.9,3,.1,M.glass);box('window divider',x,4.6,-13.56,.1,3,.11,M.cream);box('window divider',x,4.6,-13.55,2.9,.1,.11,M.cream);box('flower box',x,2.9,-13.5,3.5,.45,.8,M.wood);for(let i=0;i<7;i++)ball('window flowers',x-1.35+i*.45,3.3,-13.35,.48,.55,.5,i%2?M.pink:M.yellow);}
  box('door frame',0,2.35,-13.75,3.15,4.7,.3,M.cream);box('kitchen door',0,2.25,-13.55,2.7,4.5,.2,M.woodDark);box('door glass',0,3.1,-13.42,2.15,2,.06,M.glass);ball('door handle',1,1.8,-13.35,.13,.13,.13,M.yellow);
  sign('HOME SWEET HOME',0,5.15,-13.52,3.8);
  box('doormat',0,.05,-12.5,3,.07,1.2,M.woodDark);
  // Ivy planter: a deliberate soldier-climbing challenge.
  solid(17,0,-7,7,3.05,9,M.terra);box('planter soil',17,3.08,-7,6.5,.12,8.5,M.soil);
  for(let i=0;i<20;i++){const x=13.44;const y=.3+rand()*2.7;const z=-11+rand()*8;ball('ivy',x,y,z,.18,.6,.75,M.leaf);}
  sign('IVY WALL',13.35,1.8,-2.43,2);
  for(let i=0;i<14;i++)ball('planter hedge',14+rand()*6,3.65,-10.6+rand()*2,1.5,1.6,1.4,i%2?M.leaf:M.leafLight);
  // Raised beds, pots and garden flowers.
  function flower(x,z,color,y=0){rod('stem',V(x,y,z),V(x,y+.6,z),.055,M.leaf);for(let a=0;a<5;a++){const angle=a*Math.PI*2/5;ball('petal',x+Math.cos(angle)*.17,y+.67,z+Math.sin(angle)*.17,.28,.14,.28,color);}ball('flower center',x,y+.71,z,.16,.1,.16,M.yellow);}
  function pot(x,z,size=1){cyl('pot',x,.55*size,z,1.1*size,1.1*size,M.terra,null,1.5*size);cyl('rim',x,1.08*size,z,1.58*size,.16*size,M.terraLight);cyl('dirt',x,1.17*size,z,1.35*size,.02,M.soil);for(let j=0;j<4;j++)ball('pot leaves',x+(rand()-.5)*size,1.5*size,z+(rand()-.5)*size,.8*size,1*size,.6*size,M.leaf);}
  for(const p of [[-20,-10,1.4],[-19,-7,1],[-21,3,1.2],[21,6,1.4],[7,-12,1.1],[-4,-12,.85],[-19,17,1.5],[19,19,1.6]])pot(...p);
  for(let side of [-1,1]){solid(side*20,0,11,4,.45,9,M.wood);box('bed soil',side*20,.47,11,3.6,.08,8.6,M.soil);for(let i=0;i<28;i++)flower(side*20+(rand()-.5)*3.4,7+rand()*8,[M.yellow,M.pink,M.purple][i%3],.48);}
  for(let i=0;i<700;i++){let x=(rand()-.5)*46,z=3+rand()*20;if(Math.abs(x)<2.8||Math.abs(x)>18.5)continue;for(let j=0;j<3;j++){const blade=new B.Mesh('grass blade',scene),data=new B.VertexData();const h=.09+rand()*.2;data.positions=[-.035,0,0,.035,0,0,.025,h,0];data.indices=[0,1,2,2,1,0];data.normals=[0,0,1,0,0,1,0,0,1];data.uvs=[0,0,1,0,.5,1];data.applyToMesh(blade);blade.position.set(x+j*.04,.02,z);blade.rotation.y=rand()*6.28;blade.material=i%2?M.grassDark:M.grassLight;blade.isPickable=false;statics.push(blade);}}
  // A coiled hose, stepping-stone edging, and patio clutter give the yard scale.
  for(let i=0;i<3;i++){const coil=B.MeshBuilder.CreateTorus('garden hose',{diameter:2.4-i*.35,thickness:.09,tessellation:40},scene);coil.position.set(-18,.08+i*.02,-3);coil.material=M.leaf;statics.push(coil);}
  for(let i=0;i<26;i++){const x=-22+i*1.72;ball('patio edging pebble',x,.1,1.65,.35+rand()*.3,.2,.27+rand()*.2,M.stoneSide);}
  for(let i=0;i<17;i++){const x=(rand()-.5)*40,z=3+rand()*17;const leaf=ball('fallen leaf',x,.035,z,.14,.025,.32,i%2?M.wood:M.yellow);leaf.rotation.y=rand()*6;}

  // Picnic table, bench and compost scenery.
  colliders.push({x:-13.85,z:4.95,w:5.7,d:2.1,top:1.9,bottom:0});for(const x of [-13,-9])for(const z of [5.3,6.7])box('picnic table leg',x,.83,z,.22,1.66,.22,M.woodDark);box('table top',-11,1.84,6,6,.18,2.6,M.wood);for(const z of [4,8]){colliders.push({x:-14,z:z-.325,w:6,d:.65,top:.7,bottom:0});box('bench seat',-11,.63,z,6,.14,.65,M.wood);for(const x of [-13,-9])box('bench leg',x,.29,z,.2,.58,.45,M.woodDark);}
  const cloth=box('picnic cloth',-11,1.95,6,2.6,.025,2.65,M.cream);for(let i=-1;i<2;i++){box('cloth stripe',-11+i*.7,1.968,6,.15,.01,2.65,M.terra);}
  cyl('cup',-10,2.13,6,.3,.38,M.cream);ball('apple',-11.5,2.2,6.2,.5,.48,.5,M.soldier);
  solid(20,0,-.5,3.5,1.7,3,M.woodDark);for(let y=.25;y<1.7;y+=.36)box('compost slat',20,y,1.02,3.7,.1,.08,M.wood);
  sign('COMPOST',20,1.3,1.11,2.4);
  colliders.push({x:5.6,z:9.3,w:4.8,d:1.4,top:1.45,bottom:0});for(const x of [5.8,10.2])for(const z of [9.45,10.55])box('workbench leg',x,.6,z,.2,1.2,.2,M.woodDark);box('workbench shelf',8,.3,10,4.8,.15,1.4,M.wood);box('workbench top',8,1.35,10,5.1,.2,1.7,M.cream);
  gearPickup=new B.TransformNode('loaded exterminator kit',scene);
  for(let x=6.4;x<10;x+=1){cyl('gear canister',x,1.85,10,.47,.8,M.white,gearPickup);cyl('tank cap',x,2.28,10,.35,.12,M.metal,gearPickup);box('tank label',x,1.85,9.74,.3,.4,.025,M.lime,gearPickup);}
  box('pickup sprayer',8,1.65,9.5,1.5,.22,.3,M.metal,gearPickup);box('pickup grip',8.5,1.5,9.5,.2,.36,.24,M.glove,gearPickup);
  sign('LOADED GEAR · PICK UP',8,2.8,10.15,4);
  // Ground caches are accessible without precision platforming.
  caches=[{name:'PICNIC',x:-11,z:1.1},{name:'COMPOST',x:14,z:1.3},{name:'PANTRY',x:-12,z:-9}];
  caches.forEach((c,i)=>{c.secured=false;c.node=new B.TransformNode('cache',scene);c.node.position.set(c.x,0,c.z);box('food tray',0,.12,0,1.6,.22,1.2,M.cream,c.node);for(let k=0;k<5;k++)ball('crumb',-.55+rand(),.35,-.35+rand()*.7,.4,.4,.4,M.yellow,c.node);const lid=box('cache lid',0,.38,0,1.8,.12,1.4,M.lime,c.node);lid.setEnabled(false);c.lid=lid;c.marker=makeMarker('◇',`${String(i+1).padStart(2,'0')} ${c.name}`,V(c.x,1.6,c.z));});
  bench={x:8,z:8.6};makeMarker('⚒','TOOL BENCH',V(8,3.4,10));
  clue={x:17,y:3.05,z:-5.8};cyl('nest entrance',17,3.15,-5.8,1.1,.1,M.black);for(let i=0;i<7;i++)ball('trail crumbs',17+(rand()-.5)*2,3.2,-5.8+rand()*2,.2,.16,.2,M.yellow);
  clueMarker=makeMarker('⌁','ANT TRAIL',V(17,4.3,-5.8),3.05);clueMarker.el.hidden=true;
  doorMarker=makeMarker('↗','KITCHEN',V(0,3.7,-12.8));doorMarker.el.hidden=true;

  // Tree canopies outside the fence give the yard an enclosed, lived-in silhouette.
  for(let i=0;i<15;i++){const angle=i/15*Math.PI*2;const x=Math.cos(angle)*33,z=Math.sin(angle)*33;if(z<-20)continue;cyl('tree trunk',x,4,z,.7,8,M.woodDark);for(let j=0;j<4;j++)ball('tree canopy',x+Math.cos(j*2)*2,8+Math.sin(j)*1.8,z+Math.sin(j*2)*2,6.5,7,6.5,j%2?M.leaf:M.leafLight);}
  for(let i=0;i<5;i++){const x=-35+i*17;for(let j=0;j<3;j++)ball('cloud',x+j*3,22+Math.sin(i*5)*2+Math.sin(j)*1.1,-42+Math.cos(i)*5,7,3,4,M.cloud);}
  }
  // Merge static scenery by material to keep the browser's draw-call count modest.
  const groups=new Map();for(const mesh of statics){const key=mesh.material.uniqueId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
  for(const meshes of groups.values()){const merged=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);if(merged){merged.receiveShadows=true;merged.freezeWorldMatrix();}}

  function makeAnt(type='worker',view=false) {
    const root=new B.TransformNode(type,scene), legs=[],wings=[];
    const color=type==='soldier'?M.soldier:M.worker;
    ball('segmented abdomen',0,.51,-.51,.74,.64,1.05,color,root);
    ball('petiole waist',0,.47,.03,.23,.28,.29,M.chitin,root);
    ball('thorax',0,.51,.27,.46,.49,.59,color,root);
    ball('head',0,.58,.73,type==='soldier'?.86:.69,.64,.64,color,root);
    for(let i=0;i<3;i++){
      const ring=B.MeshBuilder.CreateTorus('abdomen seam',{diameter:.61,thickness:.023,tessellation:24},scene);ring.parent=root;ring.material=M.chitin;ring.rotation.x=Math.PI/2;ring.position.set(0,.51,-.78+i*.25);ring.scaling.x=i===1?1.16:1;ring.scaling.z=.96;
    }
    for(const side of [-1,1]){
      ball('compound eye',side*.265,.72,.95,.2,.23,.145,M.eye,root);
      ball('eye glint',side*.275,.785,1.004,.043,.049,.022,M.white,root);
      const antenna=new B.TransformNode('antenna joint',scene);antenna.parent=root;antenna.position.set(side*.22,.82,.85);
      rod('antenna base',V(),V(side*.24,.3,.18),.037,color,antenna);
      rod('antenna tip',V(side*.24,.3,.18),V(side*.11,.36,.49),.029,color,antenna);
      ball('antenna feeler',side*.11,.36,.49,.05,.055,.07,color,antenna);
      const jaw=B.MeshBuilder.CreateTube('curved mandible',{path:[V(side*.23,.41,.96),V(side*.3,.35,1.13),V(side*.17,.35,1.29),V(side*.04,.39,1.24)],radiusFunction:(i)=>Math.max(.013,(type==='soldier'?.1:.061)*(1-i/4)),tessellation:8},scene);jaw.parent=root;jaw.material=color;
      for(let i=0;i<3;i++){
        const pivot=new B.TransformNode('leg joint',scene);pivot.parent=root;pivot.position.set(side*.14,.44,.44-i*.4);
        const knee=V(side*.52,.01,(i-1)*-.19),ankle=V(side*.7,-.36,(i-1)*-.29),toe=V(side*.78,-.41,(i-1)*-.34+.07);
        rod('upper leg',V(),knee,.056,color,pivot);ball('knee',knee.x,knee.y,knee.z,.085,.09,.085,color,pivot);rod('shin',knee,ankle,.04,color,pivot);rod('foot',ankle,toe,.025,M.chitin,pivot);legs.push({pivot,side,i});
      }
    }
    if(type==='soldier'){
      for(let i=0;i<3;i++){ball('overlapping armor plate',0,.72,-.74+i*.3,.83,.4,.48,M.terra,root);const crest=ball('armor edge',0,.91,-.77+i*.3,.61,.065,.13,M.terraLight,root);}
      for(const side of [-1,1])ball('shoulder plate',side*.24,.61,.4,.42,.42,.58,color,root);
    }
    if(type==='flyer')for(const side of [-1,1]){
      const wing=new B.TransformNode('wing pivot',scene);wing.parent=root;wing.position.set(side*.1,.81,.18);
      const membrane=ball('translucent wing',side*.55,.02,-.27,1.23,.026,.8,M.wing,wing);membrane.rotation.y=side*-.22;
      rod('wing leading edge',V(),V(side*1.05,.015,-.46),.012,M.vein,wing);
      for(let i=0;i<3;i++)rod('wing vein',V(side*.12,.03,-.09),V(side*(.5+i*.22),.03,-.5+i*.15),.009,M.vein,wing);
      wings.push(wing);
    }
    // Combine rigid shell pieces, retaining independently animated legs and wings.
    const rigid=root.getChildren().filter(n=>n instanceof B.Mesh),shellGroups=new Map();
    for(const mesh of rigid){const key=mesh.material.uniqueId;if(!shellGroups.has(key))shellGroups.set(key,[]);shellGroups.get(key).push(mesh);}
    for(const group of shellGroups.values())if(group.length>1){const merged=B.Mesh.MergeMeshes(group,true,true,undefined,false,false);merged.parent=root;}
    if(type==='soldier')root.scaling.setAll(1.85);
    const shadow=B.MeshBuilder.CreateDisc('ant shadow',{radius:type==='soldier'?1.5:.73,tessellation:18},scene);shadow.rotation.x=Math.PI/2;shadow.material=M.shadow;shadow.position.y=.04;shadow.isPickable=false;if(view)shadow.setEnabled(false);
    return {root,legs,wings,shadow};
  }
  function squashAnt(ant,amount=1){
    ant.root.rotation.x=0;ant.root.rotation.z=0;
    ant.root.scaling.set(1+amount*.32,1-amount*.65,1+amount*.18);
    for(const leg of ant.legs){leg.pivot.rotation.y=leg.side*(leg.i-1)*.3*amount;leg.pivot.rotation.z=leg.side*.3*amount;}
    for(const wing of ant.wings)wing.setEnabled(false);
  }
  function makeEgg(parent=null){
    const root=new B.TransformNode('throwable egg',scene);root.parent=parent;
    ball('pearl egg',0,.34,0,.55,.64,.84,M.egg,root);
    ball('egg shell highlight',-.13,.48,.1,.15,.18,.34,M.white,root);
    return root;
  }
  function makeViewModel(camera) {
    const root=new B.TransformNode('viewmodel',scene);root.parent=camera;
    const hands=new B.TransformNode('carrying hands',scene);hands.parent=root;
    for(const side of [-1,1]){
      const sleeve=cyl('bent sleeve',side*.32,-.61,.75,.18,.36,M.leaf,hands,.21);sleeve.rotation.x=1.05;sleeve.rotation.z=side*-.5;
      ball('holding glove',side*.25,-.47,.94,.2,.16,.24,M.glove,hands);
      for(let i=0;i<4;i++)ball('curled finger',side*.25-.057+i*.038,-.43,1.02,.045,.07,.06,M.glove,hands);
    }
    const held=makeAnt('worker',true);held.root.parent=root;held.root.position.set(0,-.49,1.11);squashAnt(held);held.root.scaling.set(.43,.12,.43);held.root.rotation.set(-.18,Math.PI/2,0);held.root.setEnabled(false);
    const heldEgg=makeEgg(root);heldEgg.position.set(0,-.64,1.04);heldEgg.scaling.setAll(.64);heldEgg.rotation.y=Math.PI/2;heldEgg.setEnabled(false);
    const gun=new B.TransformNode('lowered tool',scene);gun.parent=root;gun.position.set(.34,-.43,1.02);gun.rotation.y=-.08;
    box('tool casing',0,0,0,.28,.23,.47,M.white,gun);box('tool grip',0,-.13,-.1,.105,.2,.12,M.glove,gun);box('green insert',0,.12,-.06,.2,.035,.23,M.lime,gun);
    for(let i=0;i<3;i++)box('tool vent',.145,.02,-.12+i*.09,.015,.07,.032,M.metal,gun);
    const pressure=ball('pressure gauge',-.07,.13,-.18,.08,.025,.08,M.glass,gun);
    const barrel=cyl('nozzle',0,.01,.34,.14,.42,M.metal,gun);barrel.rotation.x=Math.PI/2;
    const tip=cyl('tip',0,.01,.57,.19,.09,M.lime,gun);tip.rotation.x=Math.PI/2;
    const hopper=cyl('cannon hopper',0,.23,-.04,.31,.34,M.wood,gun,.4);hopper.setEnabled(false);
    ball('gripping glove',.015,-.17,-.14,.17,.19,.16,M.glove,gun);
    const sleeve=cyl('tool sleeve',.1,-.31,-.31,.2,.4,M.leaf,gun);sleeve.rotation.x=1.05;sleeve.rotation.z=-.28;
    // Legs are anchored to Marin's body in world space, so looking down reveals feet.
    const body=new B.TransformNode('Marin body',scene);body.setEnabled(false);ball('denim waist',0,1.02,-.22,.55,.4,.4,M.blue,body);
    for(const side of [-1,1]){
      ball('denim leg',side*.15,.52,-.04,.21,.95,.25,M.blue,body);
      ball('stomp boot',side*.15,.14,.11,.25,.25,.49,M.glove,body);
      ball('boot sole',side*.15,.04,.12,.27,.065,.51,M.chitin,body);
      for(let i=0;i<3;i++)box('boot laces',side*.15,.252,.11+i*.065,.12,.012,.018,M.cream,body);
      cyl('boot cuff',side*.15,.27,-.04,.235,.13,M.woodDark,body);
    }
    for(const mesh of root.getChildMeshes()){mesh.alwaysSelectAsActiveMesh=true;mesh.renderingGroupId=2;}
    scene.setRenderingAutoClearDepthStencil(2,true,true,true);
    return {root,hands,held,heldEgg,gun,hopper,body,tip};
  }

  return {supplyPoints,syncQueen,eggSpawns,makeEgg,finishChapter,resetChapter,animate,M,mat,box,ball,cyl,rod,colliders,groundSurfaces,caches,bench,clue,clueMarker,doorMarker,markers,gearPickup,makeAnt,squashAnt,makeViewModel};
}
