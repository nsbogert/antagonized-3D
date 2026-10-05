import {loadPropFactory} from './props.mjs';
// The bathroom uses static, merged scenery and a small reusable set of drip/ripple meshes.
export function buildBathroom({B,scene,V,M,mat,surface,box,ball,cyl,rod,solid,sign,makeMarker}){
  const porcelain=surface(mat('bathroom porcelain','#eeeadd'),'glaze',{base:'#eeeadd',meters:1.8,shine:.3,bump:.18});
  const tile=surface(mat('bathroom sea glass tile','#89aaa3'),'glaze',{base:'#89aaa3',meters:1.6,shine:.25,bump:.18});
  const paleTile=surface(mat('bathroom ivory floor','#dcded6'),'tile',{base:'#dcded6',meters:2.4,shine:.2,bump:.24});
  const darkTile=surface(mat('bathroom slate floor','#6b8785'),'stone',{base:'#6b8785',meters:2.4,shine:.12,bump:.3});
  const wall=surface(mat('bathroom plaster','#d2dcd0'),'plaster',{base:'#d2dcd0',meters:3,shine:.025,bump:.35});
  const wood=surface(mat('bathroom oak vanity','#af936e'),'wood',{base:'#af936e',meters:1.6,shine:.08,bump:.4});
  const stone=surface(mat('bathroom stone vanity top','#e6e3d6'),'marble',{base:'#e6e3d6',meters:3.2,shine:.25,bump:.15});
  const grout=mat('bathroom grout','#a3aca2'),chrome=mat('bathroom chrome','#acbfc1'),rubber=mat('bathroom drain darkness','#253a37');
  chrome.specularColor=new B.Color3(.85,.9,.92);chrome.specularPower=110;
  const mirror=mat('bathroom silver mirror','#839ea0');mirror.specularColor=new B.Color3(.9,.95,.95);mirror.specularPower=120;
  const linen=surface(mat('bathroom waffle linen','#e8e2cd'),'plaster',{base:'#e8e2cd',meters:.55,bump:.8,shine:.02});
  const towel=surface(mat('bathroom terry towel','#d1a16c'),'plaster',{base:'#d1a16c',meters:.45,bump:1,shine:.015});
  const water=mat('bathroom water','#7daeb1',{alpha:.3}),ripple=mat('bathroom water glints','#d2e8df',{alpha:.32});
  water.specularColor=new B.Color3(.8,.9,.9);water.specularPower=100;
  const light=mat('bathroom warm light','#fff1c6',{glow:1}),frost=mat('bathroom frosted window','#b9d0c9',{glow:.2});
  const groundSurfaces=[{x:-23,z:-14,w:46,d:38,top:.025},{x:14,z:-13,w:8,d:8,top:.18}];
  box('bathroom floor base',0,-.14,5,48,.28,38,grout);
  for(let x=-22;x<23;x+=2.4)for(let z=-12;z<24;z+=2.4){
    const border=x<-20||x>20||z<-10||z>21;
    box('bathroom floor tile',x,.012,z,2.35,.025,2.35,border?darkTile:paleTile);
    if(!border&&(Math.round((x+22)/2.4)+Math.round((z+12)/2.4))%4===0){const inlay=box('bathroom diamond inlay',x,.028,z,.32,.01,.32,darkTile);inlay.rotation.y=Math.PI/4;}
  }
  for(const x of [-24,24])solid(x,0,5,.45,12,40,wall);
  solid(0,0,-14,48,12,.45,wall);solid(0,0,24,48,12,.45,wall);
  box('bathroom ceiling',0,12.15,5,48,.25,40,porcelain);
  for(let y=.6;y<5.4;y+=.8){
    for(let x=-23;x<24;x+=2)box('bathroom subway tile',x+(Math.round(y/.8)%2)*.5,y,-13.68,1.94,.74,.07,tile);
    for(const x of [-23.68,23.68])for(let z=-12;z<24;z+=2)box('bathroom side tile',x,y,z+(Math.round(y/.8)%2)*.5,.07,.74,1.94,tile);
  }
  for(const x of [-23.6,23.6]){box('bathroom tile cap',x,5.7,5,.12,.18,38,porcelain);box('bathroom skirting',x,.15,5,.15,.3,38,darkTile);}
  box('bathroom tile cap',0,5.7,-13.6,47,.18,.12,porcelain);
  // Vanity stays below the mounted climbing limit; the clue is on its open edge.
  solid(18,0,6,8,2.85,12,wood);solid(18,2.85,6,8,.2,12,stone);
  for(let z=1.3;z<12;z+=2.6){box('vanity inset door',13.93,1.4,z,.08,2.5,2.42,wood);rod('vanity brass handle',V(13.8,2,z-.35),V(13.8,2,z+.35),.08,M.yellow);}
  const basin=B.MeshBuilder.CreateLathe('curved washbasin_merged',{shape:[V(0,3.08,0),V(.9,3.08,0),V(1.45,3.18,0),V(1.85,3.5,0),V(1.9,3.55,0),V(1.72,3.6,0),V(1.6,3.4,0),V(1,3.17,0),V(.24,3.12,0)],tessellation:40},scene);basin.position.set(18,0,5.2);basin.scaling.z=.8;basin.material=porcelain;basin.isPickable=false;basin.receiveShadows=true;
  cyl('sink drain',18,3.14,5.2,.55,.035,chrome);
  for(let i=-1;i<=1;i++)box('sink drain slots',18+i*.12,3.16,5.2,.04,.015,.35,rubber);
  const tap=B.MeshBuilder.CreateTube('bathroom arched tap',{path:[V(20,3.1,5.2),V(20,4.6,5.2),V(19.7,4.9,5.2),V(18.5,4.9,5.2),V(18.25,4.5,5.2)],radius:.11,tessellation:12},scene);tap.material=chrome;
  for(const z of [4.2,6.2])cyl('bathroom tap handle',20,3.22,z,.35,.2,chrome);
  // Three toothbrushes and a child's bath duck make this a family room.
  cyl('family toothbrush cup',19.4,3.57,10.2,.75,1.05,porcelain);
  for(let i=0;i<3;i++){rod('family toothbrush',V(19.2+i*.2,3.5,10.2),V(19.2+i*.2,4.45-(i===2?.28:0),10.2),.08,[M.terra,M.leaf,M.blue][i]);box('toothbrush bristles',19.2+i*.2,4.46-(i===2?.28:0),10.2,.13,.23,.12,porcelain);}
  box('soap dish',17,3.13,9,.95,.1,.65,porcelain);ball('hand soap bar',17,3.3,9,.78,.28,.48,M.pink);
  cyl('soap pump bottle',20.4,3.62,1.6,.65,1.1,tile);rod('soap pump',V(20.4,4.22,1.6),V(20.1,4.22,1.6),.09,chrome);
  // Mirror catches the room's cool tint without a costly second scene render.
  box('bathroom mirror frame',23.36,7,6,.18,6.5,10.5,wood);
  box('bathroom mirror glass',23.23,7,6,.045,5.9,9.9,mirror);
  for(const z of [1,11]){rod('mirror lamp arm',V(23,8.2,z),V(22.45,8.2,z),.09,chrome);cyl('mirror lamp shade',22.4,8.2,z,.9,.65,porcelain);ball('mirror warm bulb',22.4,7.85,z,.55,.16,.55,light);}
  // Deep tub, rim, faucet and fabric folds, with broad floor lanes around them.
  // The basin is hollow: support the bottom and rim, never the water surface.
  solid(-18,0,3,6.8,.38,14,porcelain).setEnabled(false);
  for(const x of [-20.95,-15.05])solid(x,.38,3,.9,1.87,14,porcelain).setEnabled(false);
  for(const z of [-3.45,9.45])solid(-18,.38,z,5,1.87,1.1,porcelain).setEnabled(false);
  const tub=new B.Mesh('curved porcelain bathtub_merged',scene),data=new B.VertexData();
  const profiles=[[5.7,12.8,.95,.12],[6.6,13.7,1.2,1.3],[6.8,14,1.25,2.25],[5.8,12.8,1.05,2.25],[5.1,11.8,.85,.36]];
  const points=[];data.positions=[];data.indices=[];data.uvs=[];data.normals=[];
  for(const [w,d,r,y] of profiles){
    const ring=[];
    for(let corner=0;corner<4;corner++){
      const cx=(corner===0||corner===3?1:-1)*(w/2-r),cz=(corner<2?1:-1)*(d/2-r);
      for(let k=0;k<9;k++){const a=(corner+k/8)*Math.PI/2;ring.push([cx+Math.cos(a)*r,y,cz+Math.sin(a)*r]);}
    }
    points.push(ring);
  }
  const n=points[0].length;
  for(let j=0;j<points.length;j++)for(let i=0;i<n;i++){
    const [x,y,z]=points[j][i];data.positions.push(x,y,z);data.uvs.push(i/n,j/(points.length-1));
    if(j<points.length-1){const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;data.indices.push(a,b,c,b,d,c);}
  }
  B.VertexData.ComputeNormals(data.positions,data.indices,data.normals);data.applyToMesh(tub);tub.position.set(-18,0,3);tub.material=porcelain;tub.isPickable=false;tub.receiveShadows=true;
  box('tub recessed bottom',-18,.35,3,4.9,.04,11.5,darkTile);
  const bathSurface=mat('bath water surface','#79b8c0',{alpha:.55});bathSurface.specularColor=new B.Color3(.85,.95,.95);bathSurface.specularPower=100;
  box('tub still water',-18,1.54,3,5.2,.018,11.7,bathSurface,null,false);
  rod('tub filler',V(-21.1,2.1,7),V(-21.1,3.1,7),.13,chrome);rod('tub spout',V(-21.1,3.1,7),V(-20.1,3.1,7),.13,chrome);
  rod('shower curtain rail',V(-22,8.3,-3.5),V(-22,8.3,9),.12,chrome);
  for(let i=0;i<13;i++){
    const z=-3.2+i*.4;box('linen curtain pleat',-21.75+Math.sin(i)*.13,5,z,.25,6,.47,linen);
    const ring=B.MeshBuilder.CreateTorus('curtain ring',{diameter:.34,thickness:.04,tessellation:12},scene);ring.rotation.z=Math.PI/2;ring.position.set(-22,8.22,z);ring.material=chrome;
    box('curtain hem',-21.57,2.3,z,.04,.14,.43,tile);
  }
  const duck=new B.TransformNode('family bath duck',scene);duck.position.set(-17.5,1.62,5.5);
  ball('duck body',0,.22,0,.78,.5,.65,M.yellow,duck);ball('duck head',0,.56,.25,.43,.43,.43,M.yellow,duck);ball('duck beak',0,.5,.51,.26,.12,.2,M.terra,duck);
  for(const side of [-1,1])ball('duck eye',side*.15,.62,.38,.07,.07,.06,M.black,duck);
  const bathWater={x:-18,z:3,w:5.2,d:11.7,floor:.38,level:1.54};
  const waterAt=p=>Math.abs(p.x-bathWater.x)<bathWater.w/2&&Math.abs(p.z-bathWater.z)<bathWater.d/2&&p.y<bathWater.level?bathWater:null;
  const splashMaterial=mat('bath splash droplets','#c4e4e6',{alpha:.65}),bathRipple=mat('bath ripple highlights','#d4eef0',{alpha:.72});
  const splashes=Array.from({length:4},(_,i)=>{
    const ring=B.MeshBuilder.CreateTorus('bath footstep ripple',{diameter:1,thickness:.024,tessellation:32},scene);
    ring.material=bathRipple;ring.isPickable=false;ring.setEnabled(false);
    const drops=Array.from({length:8},()=>{const node=ball('bath splash droplet',0,0,0,.065,.11,.065,splashMaterial,null,false);node.setEnabled(false);return node;});
    return {ring,drops,life:0,age:0,x:0,z:0,strength:1};
  });
  let nextSplash=0,waterStep=0;
  function splash(x,z,strength){
    const effect=splashes[nextSplash++%splashes.length];Object.assign(effect,{x,z,strength,age:0,life:.8});
  }
  function updateWater(dt,p,previous,riding=false){
    const wet=waterAt(p),travel=Math.hypot(p.x-previous.x,p.z-previous.z);
    if(wet&&previous.y>=wet.level&&p.y<wet.level)splash(p.x,p.z,riding?1.3:1);
    if(wet&&p.grounded&&travel>.001){waterStep-=dt;if(waterStep<=0){splash(p.x,p.z,riding?.8:.45);waterStep=.38;}}
    else waterStep=0;
    for(const effect of splashes){
      effect.life=Math.max(0,effect.life-dt);effect.age+=dt;const active=effect.life>0;
      effect.ring.setEnabled(active);for(const node of effect.drops)node.setEnabled(active&&effect.age<.55);
      if(!active)continue;
      const size=.25+effect.age*2.1*effect.strength;
      effect.ring.position.set(effect.x,bathWater.level+.018,effect.z);effect.ring.scaling.set(size,1,size);
      effect.ring.visibility=effect.life/.8;
      for(let k=0;k<effect.drops.length;k++){
        const a=k*Math.PI/4+nextSplash*.3,t=effect.age,r=t*1.7*effect.strength;
        const node=effect.drops[k];node.position.set(effect.x+Math.cos(a)*r,bathWater.level+.04+t*(2+k%3*.3)*effect.strength-4*t*t,effect.z+Math.sin(a)*r);
        node.setEnabled(node.position.y>bathWater.level&&effect.age<.55);node.visibility=effect.life/.8;
      }
    }
  }
  // A compact CC0 porcelain asset replaces the old stack of primitive shapes.
  solid(-18,0,-9.5,3.5,2.7,5.2,porcelain).setEnabled(false);
  const fixtureReady=loadPropFactory(B,scene,'toilet').then(factory=>{
    if(!factory)return false;
    const toilet=factory.create({height:4.3,name:'Kenney porcelain toilet'});
    toilet.root.position.set(-18,0,-9.5);toilet.root.rotation.y=Math.PI;
    return true;
  });
  // Frameless shower: enclosed on three sides, with a hinged entry door.
  solid(18,0,-9,8,.18,8,porcelain);box('shower tray inset',18,.2,-9,7.4,.025,7.4,darkTile);
  rod('shower riser',V(22.5,.25,-11),V(22.5,7.8,-11),.12,chrome);rod('shower head arm',V(22.5,7.8,-11),V(21.4,7.8,-11),.12,chrome);
  const head=cyl('rain shower head',21.25,7.7,-11,1.8,.15,chrome);head.rotation.z=.12;
  for(let i=0;i<8;i++)ball('shower nozzle',21.25+Math.cos(i)*.55,7.6,-11+Math.sin(i)*.55,.06,.04,.06,rubber);
  const glass=mat('clear shower safety glass','#afd3ce',{alpha:.17});glass.backFaceCulling=false;glass.specularColor=new B.Color3(.8,.95,.95);glass.specularPower=100;
  const panel=(x,z,w,d)=>{
    box('shower clear glass',x,3.8,z,w,7.2,d,glass,null,false);
    solid(x,.18,z,w,7.2,d,porcelain).setEnabled(false);
    rod('shower glass polished edge',V(x,7.42,z-d/2),V(x,7.42,z+d/2),.045,chrome);
  };
  panel(14,-11.85,.06,2.3);panel(14,-6,.06,2);
  panel(18,-5,8,.06);panel(22,-9,.06,8);
  rod('shower front top edge',V(14,7.42,-5),V(22,7.42,-5),.045,chrome);
  const showerDoor=new B.TransformNode('hinged shower glass door',scene);showerDoor.position.set(14,.18,-10.7);
  box('shower door glass',0,3.6,1.85,.065,7.2,3.7,glass,showerDoor);
  for(const y of [.2,7.1])rod('door glass edge',V(0,y,0),V(0,y,3.7),.045,chrome,showerDoor);
  for(const y of [1.6,5.8])box('shower door hinge',0,y,.1,.15,.32,.28,chrome,showerDoor);
  rod('shower door handle',V(-.18,3.1,3.2),V(-.18,4.1,3.2),.09,chrome,showerDoor);
  let doorOpen=0;
  // Folded towels, woven bath mat, a child's stool and a high frosted window.
  rod('towel rail',V(-23.3,4.2,13),V(-23.3,4.2,19),.12,chrome);
  for(const z of [14.5,17.3]){box('hanging terry towel',-23.15,3,z,.18,3,2.15,towel);for(let i=0;i<6;i++)box('towel stitched rib',-23.04,2.1+i*.1,z,.025,.025,2,tile);}
  for(let i=0;i<3;i++)box('folded towel',17,3.3+i*.2,11,2.6,.19,1.4,i%2?linen:towel);
  box('woven bath mat',-7,.05,13,6,.07,3.6,linen);for(let i=0;i<20;i++)box('bath mat weave',-9.8+i*.3,.093,13,.045,.015,3.5,towel);
  solid(-12,0,14,2.6,.6,2,wood);box('child stool tread',-12,.63,14,2.65,.08,2.05,tile);
  box('frosted window frame',3,8,-13.55,11,4,.2,porcelain);box('frosted window panes',3,8,-13.4,10.4,3.4,.05,frost);
  for(const x of [-.5,3,6.5])box('window mullion',x,8,-13.33,.08,3.5,.05,porcelain);
  for(let i=0;i<7;i++)box('window frosted bands',3,6.5+i*.5,-13.32,10.3,.018,.02,porcelain);
  box('bathroom entrance door',0,3.1,23.65,5.5,6.2,.18,wood);sign('OUR NEW HOME',0,7.1,23.4,5);
  sign('NO MORE UNINVITED GUESTS',3,5.5,-13.35,7);
  // Resupply is a visible, permanent cabinet near the entrance, not a passive refill.
  const bench={x:10,y:0,z:15.4},gearPickup=new B.TransformNode('bathroom loaded kit',scene);
  solid(10,0,17.6,4,1,2.2,wood);box('bathroom supply shelf',10,1.08,17.6,4.1,.16,2.3,stone);
  for(let i=0;i<3;i++){cyl('bathroom supply cartridge',9+i,1.65,17.6,.45,.95,M.white,gearPickup);box('supply green stripe',9+i,1.65,17.34,.3,.45,.03,M.lime,gearPickup);}
  sign('MARIN’S REFILLS',10,3.1,17.7,4);makeMarker('⚒','REFILL CABINET',V(10,3.6,17.6));
  // Household gaps, not exposed pipes. Their approach points stay on reachable floor.
  const caches=[{name:'CABINET GAP',x:12.8,y:0,z:4},{name:'TOILET TILE GAP',x:-13,y:0,z:-11.7},{name:'SHOWER TILE CRACK',x:15.5,y:.18,z:-9}];
  caches.forEach((c,i)=>{
    c.kind='gap';c.secured=false;c.node=new B.TransformNode('bathroom ant entry',scene);
    c.node.position.set(c.x,c.y,c.z);
    c.lid=new B.TransformNode('sealed household gap',scene);c.lid.parent=c.node;c.lid.setEnabled(false);
    if(i===0){
      // A ragged opening cut into the cabinet's lower door, with chipped wood edges.
      const hole=new B.Mesh('jagged cabinet hole',scene),d=new B.VertexData();
      const edge=[[-.55,-.28],[-.32,-.45],[.13,-.36],[.48,-.21],[.52,.15],[.25,.4],[-.18,.33],[-.48,.15]];
      d.positions=[1.065,.66,0];d.indices=[];d.normals=[];
      for(const [z,y] of edge)d.positions.push(1.065,.66+y,z);
      for(let k=0;k<edge.length;k++)d.indices.push(0,1+k,1+(k+1)%edge.length);
      B.VertexData.ComputeNormals(d.positions,d.indices,d.normals);d.applyToMesh(hole);hole.parent=c.node;hole.material=rubber;rubber.backFaceCulling=false;hole.isPickable=false;
      for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length];rod('chipped cabinet edge',V(1.04,.66+a[1],a[0]),V(1.04,.66+b[1],b[0]),.04,wood,c.node);}
      box('cabinet repair patch',1.05,.65,0,.055,1.03,1.2,wood,c.lid);
      for(const z of [-.43,.43])ball('cabinet repair pin',1.015,.65,z,.03,.06,.06,chrome,c.lid);
    }else{
      // Branching cracks sit flush against tile: shower floor and wall beside the toilet.
      const path=i===1?[[0,0],[.22,.22],[.07,.48],[.35,.65],[.2,1.03]]:[[0,0],[.35,.14],[.65,-.15],[1.05,.05],[1.4,-.2]];
      const point=([a,b])=>i===1?V(a,.18+b,-1.9):V(a,.045,b);
      for(let k=0;k<path.length-1;k++){
        const a=point(path[k]),b=point(path[k+1]);rod('dark tile crack',a,b,.07,rubber,c.node);
        const caulkA=point(path[k]),caulkB=point(path[k+1]);
        if(i===1){caulkA.z+=.025;caulkB.z+=.025;}else{caulkA.y+=.028;caulkB.y+=.028;}
        rod('fresh tile caulk',caulkA,caulkB,.11,porcelain,c.lid);
      }
      const branchA=point(path[2]),branchB=point([path[2][0]-.27,path[2][1]+.23]);
      rod('tile crack branch',branchA,branchB,.04,rubber,c.node);
      if(i===1){branchA.z+=.025;branchB.z+=.025;}else{branchA.y+=.028;branchB.y+=.028;}
      rod('sealed tile branch',branchA,branchB,.085,porcelain,c.lid);
    }
    c.marker=makeMarker('◇',`${String(i+1).padStart(2,'0')} ${c.name}`,V(c.x,c.y+1.8,c.z),c.y);
  });
  // A clear climbing approach leads to the tap trail and the plumbing access panel.
  const clue={x:15.1,y:3.05,z:7};
  for(let i=0;i<13;i++)ball('bathroom ant trail',15.1+i*.2,3.13,7-i*.2,.11,.035,.15,M.lime);
  for(let i=0;i<12;i++)ball('pipe-side trail',14.02,.3+i*.23,7,.055,.12,.1,M.lime);
  const clueMarker=makeMarker('⌁','VANITY TRAIL',V(15.1,4.7,7),3.05);clueMarker.el.hidden=true;
  box('plumbing service recess',-9,1.6,-13.68,3.4,3.2,.1,rubber);
  const hatch=box('plumbing access panel',-9,1.6,-13.5,3.1,3,.12,wood,null,false);
  for(const [x,y] of [[-10.3,.4],[-7.7,.4],[-10.3,2.8],[-7.7,2.8]])ball('access panel screw',x,y,-13.4,.09,.09,.04,chrome);
  sign('PLUMBING ACCESS',-9,4,-13.25,4);
  const doorMarker=makeMarker('↗','INTO THE WALLS',V(-9,3.1,-12));doorMarker.el.hidden=true;
  return {fixtureReady,waterAt,updateWater,groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,
    finishChapter(){hatch.rotation.y=-1.15;},resetChapter(){hatch.rotation.y=0;waterStep=0;for(const effect of splashes){effect.life=0;effect.ring.setEnabled(false);effect.drops.forEach(node=>node.setEnabled(false));}},
    animate(time,player){
      const wanted=player&&Math.hypot(player.x-14,player.z+9)<6?1:0;
      doorOpen+=(wanted-doorOpen)*.13;showerDoor.rotation.y=-doorOpen*Math.PI*.52;
      duck.rotation.y=Math.sin(time*.35)*.06;duck.position.y=1.62+Math.sin(time*1.2)*.018;
    }};
}
