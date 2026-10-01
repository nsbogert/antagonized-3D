// Kitchen scenery uses the same lightweight mesh/material helpers as the backyard.
export function buildKitchen({B,scene,V,M,mat,box,ball,cyl,rod,solid,sign,makeMarker}) {
  const tile=mat('porcelain tile','#d8d7bd'),grout=mat('warm grout','#9aab9c');
  const cabinet=mat('sage cabinets','#50766b'),trim=mat('cabinet inset','#6f9180');
  const marble=mat('cream countertop','#eee5cc'),steel=mat('brushed steel','#8faaa9');
  const brass=mat('brass fittings','#d1ad62'),wall=mat('warm kitchen plaster','#e6d9bd');
  const light=mat('pendant glow','#fff1bf',{glow:1}),red=mat('cereal red','#c86445');
  steel.specularColor=new B.Color3(.6,.65,.65);steel.specularPower=90;
  const groundSurfaces=[{x:-23,z:-14,w:46,d:38,top:.025}];
  box('tile floor',0,-.15,5,48,.3,40,grout);
  for(let x=-22;x<23;x+=2.5)for(let z=-12;z<24;z+=2.5)box('floor tile',x,.012,z,2.45,.025,2.45,((Math.round(x/2.5)+Math.round(z/2.5))%2)?tile:M.cream);
  solid(-24,0,5,.4,12,40,wall);solid(24,0,5,.4,12,40,wall);solid(0,0,-14,48,12,.4,wall);solid(0,0,24,48,12,.4,wall);
  box('ceiling',0,12.2,5,48,.3,40,M.cream);
  for(const x of [-23.7,23.7])box('baseboard',x,.25,5,.18,.5,38,M.white);
  box('back baseboard',0,.25,-13.7,47,.5,.18,M.white);
  for(let x=-22;x<24;x+=2)for(let y=3.5;y<7;y+=.65)box('subway backsplash',x+(Math.round(y/.65)%2)*.5,y,-13.65,1.94,.59,.08,M.white);
  // Tall refrigerator and pantry leave a navigable route to the wall breach.
  solid(-19,0,-8,5,9,5,steel);
  box('fridge door',-19,4.6,-5.43,4.85,8.6,.18,M.white);
  box('freezer seam',-19,6.5,-5.3,4.8,.07,.03,steel);
  for(const y of [4.7,7.4])rod('fridge handle',V(-17.3,y-.65,-5.15),V(-17.3,y+.65,-5.15),.13,brass);
  for(let i=0;i<4;i++){const note=box('fridge note',-20+i*.65,5.3+Math.sin(i)*.7,-5.27,.5,.75,.015,[M.yellow,M.pink,M.blue,M.lime][i]);note.rotation.z=(i-1.5)*.12;}
  sign('NO ANTS. NO EXCEPTIONS.',-19,7.9,-5.15,4);
  solid(-20,0,10,5,8,6,cabinet);for(const x of [-21.2,-18.8]){box('pantry door',x,4,13.08,2.25,7.6,.12,trim);rod('pantry handle',V(x,3.4,13.23),V(x,4.3,13.23),.12,brass);}
  // The east counter is deliberately climbable by a soldier (3.05 m).
  solid(18,0,-5,8,2.85,17,cabinet);solid(18,2.85,-5,8,.2,17,marble);
  for(let z=-11;z<3;z+=2.8){box('cabinet face',13.94,1.45,z,.1,2.55,2.55,trim);rod('drawer pull',V(13.8,2.3,z-.4),V(13.8,2.3,z+.4),.1,brass);}
  // Sink basin, curved tap, dripping water, and dish rack.
  box('sink rim',18,3.08,-7,4.7,.12,4,steel);box('sink water',18,3.15,-7,3.9,.04,3.3,M.glass);
  const tap=B.MeshBuilder.CreateTube('curved faucet',{path:[V(20,3.1,-7),V(20,4.6,-7),V(19.6,5,-7),V(18.7,5,-7),V(18.35,4.55,-7)],radius:.12,tessellation:12},scene);tap.material=steel;
  const drips=[];for(let i=0;i<3;i++)drips.push(ball('sink drip',18.35,4-i*.25,-7,.075,.16,.075,M.glass,null,false));
  for(let i=0;i<5;i++){const plate=cyl('drying plate',18+i*.4,3.65,-11,1.05,.06,M.white);plate.rotation.z=Math.PI/2;}
  for(const z of [-1,1]){cyl('stove burner',18,3.12,z,1.5,.07,M.black);const ring=B.MeshBuilder.CreateTorus('burner rim',{diameter:1.12,thickness:.045,tessellation:24},scene);ring.position.set(18,3.17,z);ring.material=steel;}
  cyl('soup pot',18,3.6,1,1.5,.8,red);cyl('pot lid',18,4.03,1,1.65,.1,steel);ball('lid knob',18,4.18,1,.24,.24,.24,M.black);
  const herb=cyl('herb pot',20.5,3.45,-3,.9,.8,M.terra);for(let i=0;i<7;i++)ball('basil',20.5+Math.sin(i)*.35,4+Math.cos(i)*.15,-3+Math.cos(i)*.3,.55,.8,.45,M.leaf);
  // Central island creates two combat lanes and a shortcut over the top.
  solid(-1,0,1,8,2.85,5,cabinet);solid(-1,2.85,1,8,.2,5,marble);
  box('cutting board',-1,3.1,1,3,.13,2,M.wood);box('bread loaf',-1,3.5,1,1.8,.7,1.1,M.yellow);
  for(let i=0;i<3;i++)box('bread score',-1.5+i*.5,3.86,1,.06,.02,.7,M.wood);
  cyl('fruit bowl',1.5,3.25,1.6,1.7,.35,M.terra);for(let i=0;i<5;i++)ball('fruit',1.5+Math.cos(i)*.4,3.6,1.6+Math.sin(i)*.4,.55,.55,.55,i%2?red:M.yellow);
  for(const x of [-5,2]){cyl('stool seat',x,1.8,5.5,1.4,.18,M.wood);for(const side of [-1,1])rod('stool leg',V(x+side*.48,0,5.5),V(x+side*.35,1.7,5.5),.13,steel);}
  for(const x of [-6,6]){rod('pendant cable',V(x,12,1),V(x,8.5,1),.05,M.black);cyl('pendant shade',x,8.3,1,2,.6,cabinet,null,.6);cyl('pendant light',x,8,1,1.7,.04,light);}
  // A big window, curtains and a framed family print give the room a lived-in feel.
  box('window frame',5,7,-13.6,10,5,.2,M.white);box('window sky',5,7,-13.45,9.5,4.5,.08,M.glass);
  for(const x of [2.6,5,7.4])box('window mullion',x,7,-13.35,.12,4.5,.08,M.white);
  box('window crossbar',5,7,-13.34,9.5,.12,.08,M.white);
  for(const x of [-.3,10.3]){box('linen curtain',x,7.4,-13.1,1.3,5.7,.14,M.yellow);for(let i=0;i<4;i++)rod('curtain pleat',V(x-.45+i*.3,4.6,-13),V(x-.45+i*.3,10.1,-13),.07,M.cream);}
  box('back door',0,3,23.65,4.5,6,.2,M.wood);sign('THE BACKYARD',0,6.6,23.5,4);
  // Supply trolley is reachable immediately from the entrance.
  const bench={x:9,y:0,z:13.8};solid(10,0,16,4,1.25,2.2,M.wood);box('supply cart top',10,1.32,16,4.3,.14,2.5,marble);
  const gearPickup=new B.TransformNode('kitchen gear kit',scene);
  for(let i=0;i<3;i++){cyl('refill bottle',9+i,1.85,16,.5,.9,M.white,gearPickup);box('refill label',9+i,1.85,15.72,.33,.45,.025,M.lime,gearPickup);}
  sign('MARIN’S SUPPLIES',10,2.8,16,4);makeMarker('⚒','SUPPLY CART',V(10,3.4,16));
  const caches=[{name:'CEREAL',x:-10,y:0,z:7},{name:'KIBBLE',x:9,y:0,z:4},{name:'RECYCLING',x:-9,y:0,z:-5}];
  caches.forEach((c,i)=>{c.secured=false;c.node=new B.TransformNode('kitchen food cache',scene);c.node.position.set(c.x,0,c.z);
    box('food spill tray',0,.1,0,2,.2,1.5,M.cream,c.node);
    if(i===0){const carton=box('cereal carton',-.8,.65,-.2,.8,1.3,.5,red,c.node);carton.rotation.z=-.25;box('cereal label',-.8,.7,.08,.55,.65,.02,M.yellow,c.node);}
    if(i===1)cyl('pet bowl',0,.25,0,1.55,.35,red,c.node,1.7);
    if(i===2){cyl('recycling tin',-.6,.6,-.2,.6,1,M.metal,c.node);box('recycling carton',.55,.55,-.3,.6,.9,.6,M.wood,c.node);}
    for(let j=0;j<7;j++)ball('food crumbs',Math.cos(j*2)*.65,.34,Math.sin(j*2)*.5,.25,.2,.2,M.yellow,c.node);
    c.lid=box('sealed food cover',0,.95,0,2.3,.15,1.9,M.lime,c.node);c.lid.setEnabled(false);
    c.marker=makeMarker('◇',`${String(i+1).padStart(2,'0')} ${c.name}`,V(c.x,2,c.z));
  });
  const clue={x:16,y:3.05,z:-5};
  for(let i=0;i<10;i++)ball('pheromone trail',14.6+i*.3,3.13,-4-i*.3,.11,.04,.16,M.lime);
  sign('FOLLOW THE TRAIL',17,5.7,-12.8,4.5);
  const clueMarker=makeMarker('⌁','SINK TRAIL',V(16,4.8,-5),3.05);clueMarker.el.hidden=true;
  box('wall breach',-13,1,-13.68,2.4,2,.12,M.black);for(let i=0;i<7;i++)box('broken plaster',-14.3+i*.4,.1,-13.1,.35,.17,.3,M.cream);
  const doorMarker=makeMarker('↗','WALL BREACH',V(-13,2.5,-12.3));doorMarker.el.hidden=true;
  return {caches,bench,clue,clueMarker,doorMarker,gearPickup,groundSurfaces,
    animate(time){drips.forEach((drop,i)=>drop.position.y=4.5-((time*1.2+i*.4)%1.3));}};
}
