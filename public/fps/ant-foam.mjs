// A thin, mottled coating on the animated shell, rather than a solid enclosing blob.
export function foamAmount(ant){
 if(ant.state==='subdued')return 1;
 return ant.state==='alive'&&ant.foam>0?Math.min(1,ant.foam/.6):0;
}
export function createAntFoam(B,meshes){
 const state={amount:0},materials=new Map(),plugins=[];
 class FoamCoating extends B.MaterialPluginBase{
  constructor(material){super(material,'AntFoamCoating',210,{},true,true);}
  getUniforms(){return {ubo:[{name:'antFoamAmount',size:1,type:'float'}],fragment:'uniform float antFoamAmount;'};}
  bindForSubMesh(buffer){buffer.updateFloat('antFoamAmount',state.amount);}
  getCustomCode(type){if(type!=='fragment')return null;return {
   CUSTOM_FRAGMENT_BEFORE_LIGHTS:`
    float antFoamFlecks = sin(dot(vPositionW, vec3(17.0, 23.0, 13.0))) * sin(dot(vPositionW, vec3(31.0, -19.0, 29.0)));
    float antFoamCoverage = antFoamAmount * (0.58 + 0.24 * smoothstep(-0.4, 0.45, antFoamFlecks));
    surfaceAlbedo = mix(surfaceAlbedo, vec3(0.94, 0.95, 0.88), antFoamCoverage);
   `
  };}
 }
 function own(source){
  if(!source)return null;
  if(materials.has(source))return materials.get(source);
  const material=source.clone(source.name+' · individual foam');materials.set(source,material);
  if(source.subMaterials)material.subMaterials=source.subMaterials.map(own);
  // Preserve the flyer's transparent wing membranes; foam coats its solid shell.
  else if(B.MaterialPluginBase&&material.getClassName()==='PBRMaterial'&&material.alpha>=.99&&!material.needAlphaBlending())plugins.push(new FoamCoating(material));
  return material;
 }
 for(const mesh of meshes)if(mesh.material)mesh.material=own(mesh.material);
 return {state,plugins,sync(ant){state.amount=foamAmount(ant);},clear(){state.amount=0;},dispose(){for(const material of materials.values())material.dispose(false,false);materials.clear();}};
}
export function syncAntFoam(ant){
 const amount=foamAmount(ant);
 ant.rig?.foam?.sync(ant);
 // The fallback gets the old indicator only while no imported mesh is available.
 ant.foamMesh?.setEnabled(!ant.rig&&amount>0);
}
