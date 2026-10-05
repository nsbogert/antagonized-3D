export function buildWalls({B,scene,V,M,mat,surface,box,ball,cyl,rod,solid,sign,makeMarker}){
  const earth=mat('tunnel earth','#655242'),rock=mat('tunnel rock','#7e7057'),floor=mat('packed clay','#9b896b');
  const timber=mat('wall studs','#ac8157'),copper=mat('old pipes','#ba794c'),resin=mat('amber resin','#d4a649',{glow:.2});
  const glow=mat('colony glow','#badd9a',{glow:.65}),lamp=mat('work lamp','#ffdc8b',{glow:1});
  surface(earth,'earth',{base:'#635343',meters:4.2,seed:73,bump:1});
  surface(rock,'rock',{base:'#807461',meters:3.2,seed:81,bump:1});
  surface(floor,'clay',{base:'#95856a',meters:4.4,seed:52,bump:.85,shine:.035});
  surface(timber,'wood',{base:'#a07a51',meters:1.6,seed:11});
  const groundSurfaces=[{x:-24,z:-14,w:48,d:38,top:.02}];
  box('packed-earth floor',0,-.14,5,48,.3,38,floor);
  solid(-24,0,5,1,11,40,earth);solid(24,0,5,1,11,40,earth);solid(0,0,-14,48,11,1,earth);solid(0,0,24,48,11,1,earth);
  box('tunnel ceiling',0,11.3,5,48,.6,40,earth);
  // Offset tunnel partitions form wide, traversable loops instead of a dead-end maze.
  solid(-7,0,8,2,7.5,10,earth);solid(7,0,-1,2,7.5,10,earth);
  solid(-16,0,-1,14,7,2,earth);
  for(const [x,z,w,d] of [[-7,8,2,10],[7,-1,2,10],[-16,-1,14,2]]){
    box('tunnel ridge',x,7.5,z,w+.25,.35,d+.25,rock);
    for(let i=0;i<6;i++)ball('rough tunnel edge',x+(w>3?(i-2.5)*2:0),1+i%3*1.8,z+(d>3?(i-2.5)*1.4:0),w>3?2.4:2.5,1.8,d>3?2.5:2.4,rock);
  }
  // Exposed studs and beams establish that this colony is inside Marin's house.
  for(const x of [-22,22])for(let z=-11;z<24;z+=5){box('wall stud',x,5,z,.7,10,.7,timber);box('stud bracket',x,2,z,.82,.25,.82,copper);}
  for(const z of [18,2,-10]){box('crossbeam',0,9.8,z,45,.8,.8,timber);for(const x of [-20,20])box('support post',x,4.8,z,.7,9.6,.7,timber);}
  // Plumbing wraps the tunnels overhead; warm utility lamps make the floor readable.
  for(const x of [-19,19]){rod('water pipe',V(x,8.6,-12),V(x,8.6,22),.34,copper);for(const z of [-8,6,19]){
    const ring=B.MeshBuilder.CreateTorus('pipe clamp',{diameter:.43,thickness:.06,tessellation:16},scene);ring.position.set(x,8.6,z);ring.rotation.x=Math.PI/2;ring.material=M.metal;
  }}
  const lamps=[];
  for(const [x,z] of [[0,17],[-15,7],[15,8],[-12,-8],[14,-7],[0,-11]]){
    rod('lamp cable',V(x,10,z),V(x,6.8,z),.04,M.black);cyl('lamp shade',x,6.6,z,1.4,.3,copper,null,.65);const bulb=ball('warm bulb',x,6.35,z,.75,.3,.75,lamp);lamps.push(bulb);
  }
  // Decorative growth stays near walls, keeping mounted movement unobstructed.
  let seed=73;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<55;i++){
    const x=i%2?-22+rand()*1.1:22-rand()*1.1,z=-12+rand()*34;
    ball('wall stone',x,.5+rand(),z,1+rand(),1+rand()*2,1.3,rock);
    for(let n=0;n<2;n++){cyl('fungus stalk',x+n*.3,.4,z,.09,.8,M.cream);ball('glowing fungus cap',x+n*.3,.85,z,.55,.22,.5,glow);}
  }
  for(let i=0;i<36;i++)ball('trail grain',(rand()-.5)*8,.08,20-i*.9,.12,.08,.16,resin);
  sign('BEHIND THE WALLS',0,7,21.9,6);
  box('bathroom plumbing breach',0,2.2,23.4,5,4.4,.12,M.black);for(const x of [-2.8,2.8])box('broken plaster edge',x,2,23.25,.4,4.6,.4,M.cream);
  // An abandoned tool case is the safe resupply point near the entrance.
  const bench={x:9,y:0,z:16},gearPickup=new B.TransformNode('colony supplies',scene);
  solid(10,0,18,4,1.1,2,M.metal);box('toolcase lid',10,1.17,18,4.1,.14,2.1,timber);
  for(let i=0;i<3;i++){cyl('supply cartridge',9+i,1.7,18,.45,.85,M.white,gearPickup);box('cartridge stripe',9+i,1.7,17.74,.3,.4,.04,glow,gearPickup);}
  sign('FIELD SUPPLIES',10,2.8,18,4);makeMarker('⚒','TOOL CASE',V(10,3.3,18));
  const caches=[{name:'SEED VAULT',x:-15,y:0,z:8},{name:'SUGAR STORE',x:15,y:0,z:8},{name:'FUNGUS FARM',x:-14,y:0,z:-8}];
  caches.forEach((c,i)=>{
    c.secured=false;c.node=new B.TransformNode('colony food store',scene);c.node.position.set(c.x,0,c.z);
    cyl('resin food basin',0,.18,0,2.4,.36,resin,c.node,2.8);
    for(let j=0;j<10;j++){
      const x=Math.cos(j*2.4)*(.3+j*.055),z=Math.sin(j*2.4)*(.3+j*.055);
      if(i===2){cyl('food fungus stalk',x,.5,z,.09,.5,M.cream,c.node);ball('food fungus cap',x,.78,z,.45,.22,.45,glow,c.node);}
      else if(i===1){const sugar=box('stolen sugar cube',x,.43+j%2*.2,z,.38,.36,.36,M.white,c.node);sugar.rotation.y=j;}
      else ball('stolen seed',x,.4+j%2*.15,z,.3,.26,.5,M.yellow,c.node);
    }
    c.lid=ball('sealed colony store',0,.8,0,2.9,.3,2.9,M.foam,c.node);c.lid.setEnabled(false);
    c.marker=makeMarker('◇',`${String(i+1).padStart(2,'0')} ${c.name}`,V(c.x,2.1,c.z));
  });
  const eggSpawns=[];
  for(const [x,z] of [[0,15],[-12,15],[13,12],[-12,3],[-17,-5],[2,-6],[7,-10]]){
    cyl('brood nest',x,.07,z,2.3,.1,earth,null,2.5);
    for(let i=0;i<3;i++)eggSpawns.push({x:x+Math.cos(i*2.1)*.65,y:.12,z:z+Math.sin(i*2.1)*.65});
  }
  // A soldier climb leads to the signal mound, safely below the 3.5 m climb limit.
  solid(15,0,-7,8,3.2,8,earth);box('signal mound top',15,3.23,-7,8.15,.06,8.15,rock);
  for(let i=0;i<7;i++)ball('resin foothold',10.94,.4+i*.39,-5-(i%2)*.65,.25,.3,.85,resin);
  const clue={x:14,y:3.2,z:-6};
  const signal=new B.TransformNode('queen signal',scene);signal.position.set(14,3.24,-6);
  cyl('signal stalk',0,.6,0,.32,1.2,resin,signal);ball('signal pearl',0,1.25,0,.8,.8,.8,glow,signal);
  for(let i=0;i<5;i++)ball('signal tendril',Math.cos(i*1.3)*.6,.5,Math.sin(i*1.3)*.6,.25,1,.25,resin,signal);
  const clueMarker=makeMarker('⌁','QUEEN’S SIGNAL',V(14,5.4,-6),3.2);clueMarker.el.hidden=true;
  sign('THE SIGNAL MOUND',15,5.3,-10.9,4.8);
  // The final gate reveals the next destination rather than promising an unbuilt boss fight.
  box('queen gate darkness',0,3,-13.4,6,6,.15,M.black);
  for(const side of [-1,1])ball('resin gate pillar',side*3.1,3,-13.15,1,6.2,1.1,resin);
  ball('resin gate arch',0,6,-13.1,7.2,.8,1.1,resin);
  const gateRoots=new B.TransformNode('royal seal roots',scene);for(let i=-2;i<=2;i++)rod('gate roots',V(i*.85,0,-13),V(i*.85,5.8,-13),.13,copper,gateRoots);
  const queen=new B.TransformNode('queen silhouette',scene);queen.setEnabled(false);
  ball('queen head silhouette',0,3.2,-13.17,4.8,4.2,.2,M.black,queen);
  for(const side of [-1,1]){ball('queen eye',side*1.05,3.8,-12.99,.5,.32,.13,resin,queen);rod('queen antenna',V(side*1.15,4.7,-13),V(side*2.1,5.5,-13),.08,M.black,queen);}
  sign('ROYAL CHAMBER',0,7.2,-13,5);
  const doorMarker=makeMarker('↗','QUEEN’S GATE',V(0,3,-12));doorMarker.el.hidden=true;
  return {eggSpawns,finishChapter(){gateRoots.setEnabled(false);queen.setEnabled(true);},resetChapter(){gateRoots.setEnabled(true);queen.setEnabled(false);},groundSurfaces,gearPickup,caches,bench,clue,clueMarker,doorMarker,
    animate(time){signal.rotation.y=Math.sin(time*.6)*.12;const pulse=1+Math.sin(time*2)*.055;signal.scaling?.setAll(pulse);}};
}
