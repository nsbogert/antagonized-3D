// Authored handle/nozzle locations in the supplied sprayer mesh, before normalization.
const GRIP=[.025,-.15,.335],INLET=[.025,-.48,.295],MUZZLE=[.025,.12,.94];
export function attachHandSprayer(B,factory,tool){
 const model=factory.create({parent:tool,height:.55,centered:true,name:'Marin hand sprayer'});
 const mesh=model.meshes.find(mesh=>mesh.getTotalVertices()>0);
 const inverse=tool.computeWorldMatrix(true).clone().invert();
 const local=point=>B.Vector3.TransformCoordinates(B.Vector3.TransformCoordinates(B.Vector3.FromArray(point),mesh.computeWorldMatrix(true)),inverse);
 const grip=local(GRIP),inlet=local(INLET).subtract(grip),muzzle=local(MUZZLE).subtract(grip);
 // Put the handle, rather than the center of the model, at the hand's grip.
 model.root.position.copyFrom(grip.scale(-1));
 const port=new B.TransformNode('Marin sprayer hose inlet',tool.getScene());port.parent=tool;port.position.copyFrom(inlet);
 const tip=new B.TransformNode('Marin sprayer muzzle',tool.getScene());tip.parent=tool;tip.position.copyFrom(muzzle);
 return {model,port,tip};
}
