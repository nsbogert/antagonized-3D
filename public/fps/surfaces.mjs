// Seamless material detail is generated once per scene, with no image downloads.
// Box UVs are measured in metres so a wall does not stretch one tile across a room.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function noise(size,cells,rand){
  const grid=Float32Array.from({length:cells*cells},rand),field=new Float32Array(size*size);
  const coord=Array.from({length:size},(_,i)=>{const p=i*cells/size;return [Math.floor(p),smooth(p%1)];});
  for(let y=0;y<size;y++){
    const [iy,fy]=coord[y],row=iy*cells,next=(iy+1)%cells*cells;
    for(let x=0;x<size;x++){
      const [ix,fx]=coord[x],jx=(ix+1)%cells;
      const a=grid[row+ix]*(1-fx)+grid[row+jx]*fx,b=grid[next+ix]*(1-fx)+grid[next+jx]*fx;
      field[y*size+x]=a*(1-fy)+b*fy;
    }
  }
  return field;
}
function cellsAt(u,v,points,count){
  const gx=Math.floor(u),gy=Math.floor(v);let first=Infinity,second=Infinity;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const x=gx+dx,y=gy+dy,index=((y%count+count)%count*count+(x%count+count)%count)*2;
    const d=(u-x-points[index])**2+(v-y-points[index+1])**2;
    if(d<first){second=first;first=d;}else if(d<second)second=d;
  }
  return Math.sqrt(second)-Math.sqrt(first);
}
export function surfacePixels(kind,base,size=512,seed=417){
  const rand=random(seed),large=noise(size,4,rand),middle=noise(size,16,rand),fine=noise(size,64,rand);
  const pixels=new Uint8Array(size*size*4),height=new Float32Array(size*size);
  const rgb=base.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16));
  const crackPoints=Float32Array.from({length:8*8*2},()=>.15+rand()*.7);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,u=x/size,v=y/size,a=large[i]-.5,b=middle[i]-.5,c=fine[i]-.5;
    const grain=rand()-.5;let shade=0,h=0,r=0,g=0,bl=0;
    if(kind==='clay'||kind==='earth'){
      const gap=cellsAt(u*8+a*.3,v*8+b*.12,crackPoints,8);
      const crack=1-smooth(clamp(gap/(kind==='clay'?.055:.085)));
      const strata=kind==='earth'?Math.sin((v*12+large[i]*1.3)*Math.PI*2):0;
      shade=a*35+b*15+c*8+grain*7-crack*(kind==='clay'?26:19)+strata*7;
      h=.5+a*.24+b*.12+c*.025-crack*.12+strata*.055;
      const mineral=smooth(clamp((fine[i]-.73)*6));r=mineral*8;g=mineral*5;bl=mineral*2;
    }else if(kind==='rock'){
      const seam=Math.pow(1-Math.abs(Math.sin((v*9+large[i]*1.8)*Math.PI)),12);
      shade=a*39+b*18+c*11+grain*8-seam*20;
      h=.5+a*.3+b*.12+c*.05-seam*.11;
    }else if(kind==='wood'){
      const grainLine=Math.pow(.5+.5*Math.sin((u*76+large[i]*5+middle[i]*1.3)*Math.PI*2),9);
      shade=a*23+b*8+grain*5-grainLine*19;h=.5+a*.05-grainLine*.07+c*.015;
    }else if(kind==='grass'){
      const blade=smooth(clamp((fine[i]-.65)*5));
      shade=a*26+b*17+c*14+grain*10-blade*8;h=.5+b*.07+c*.035+grain*.016;
      r=-b*8;g=b*9;bl=-3;
    }else if(kind==='marble'){
      const vein=Math.pow(1-Math.abs(Math.sin((u*3+v*4+large[i]*1.4+middle[i]*.15)*Math.PI)),24);
      shade=a*8+b*4+c*2-vein*27;h=.5+c*.004;bl=vein*5;
    }else if(kind==='tile'||kind==='glaze'){
      shade=a*7+b*3+grain*2;h=.5+c*.005;
      const fleck=kind==='tile'?smooth(clamp((fine[i]-.76)*12)):0;shade-=fleck*10;
    }else if(kind==='plaster'||kind==='paint'){
      shade=a*9+b*6+c*4+grain*3;h=.5+b*.025+c*.025+grain*.008;
    }else{
      // Weathered limestone: pale mineral patches, pits and fine granular relief.
      const pit=smooth(clamp((.23-fine[i])*10));
      shade=a*22+b*13+c*6+grain*6-pit*17;h=.5+a*.08+b*.09+c*.02-pit*.05;
    }
    const p=i*4;pixels[p]=clamp(rgb[0]+shade+r,0,255);pixels[p+1]=clamp(rgb[1]+shade+g,0,255);pixels[p+2]=clamp(rgb[2]+shade+bl,0,255);pixels[p+3]=255;height[i]=h;
  }
  const normals=new Uint8Array(pixels.length);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,p=i*4;
    const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*7;
    const dy=(height[(y+1)%size*size+x]-height[(y+size-1)%size*size+x])*7;
    const length=Math.hypot(dx,dy,1);
    normals[p]=(-dx/length*.5+.5)*255;normals[p+1]=(-dy/length*.5+.5)*255;normals[p+2]=(1/length*.5+.5)*255;normals[p+3]=255;
  }
  return {pixels,normals,size};
}
export function createSurfaceLibrary(B,scene){
  const textures=new Map();
  return function surface(material,kind,{base,meters=3,seed=417,size=512,shine=.07,bump=.7}={}){
    const key=[kind,base,seed,size].join(':');let maps=textures.get(key);
    if(!maps){
      const data=surfacePixels(kind,base,size,seed);
      const texture=(bytes,suffix)=>{
        const t=B.RawTexture.CreateRGBATexture(bytes,size,size,scene,true,false,B.Texture.TRILINEAR_SAMPLINGMODE);
        t.name=material.name+' '+suffix;t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=8;return t;
      };
      maps={color:texture(data.pixels,'surface color'),normal:texture(data.normals,'surface relief')};textures.set(key,maps);
    }
    material.diffuseTexture=maps.color;material.bumpTexture=maps.normal;material.bumpTexture.level=bump;
    material.diffuseColor=B.Color3.White();material.specularColor=new B.Color3(shine,shine,shine);material.specularPower=kind==='tile'||kind==='glaze'||kind==='marble'?75:18;
    material.metadata={...material.metadata,surfaceMeters:meters,surfaceKind:kind};return material;
  };
}
export function mapBoxSurface(B,mesh,x,y,z,material){
  const meters=material?.metadata?.surfaceMeters;if(!meters)return;
  const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),normals=mesh.getVerticesData(B.VertexBuffer.NormalKind),uvs=[];
  for(let i=0;i<positions.length;i+=3){
    const px=positions[i]+x,py=positions[i+1]+y,pz=positions[i+2]+z;
    if(Math.abs(normals[i+1])>.5)uvs.push(px/meters,pz/meters);
    else if(Math.abs(normals[i])>.5)uvs.push(pz/meters,py/meters);
    else uvs.push(px/meters,py/meters);
  }
  mesh.setVerticesData(B.VertexBuffer.UVKind,new Float32Array(uvs));
}
