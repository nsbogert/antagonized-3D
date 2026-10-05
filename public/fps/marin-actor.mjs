import {makeMarin} from './marin-model.mjs';
import {loadRiggedMarin} from './marin-rigged.mjs';
export function makeMarinActor(ctx){
 const actor=makeMarin(ctx);
 actor.imported=null;actor.ready=Promise.resolve(false);actor.locked=false;
 // Keep the procedural fallback for offline rule tests or a failed model fetch.
 if(!ctx.B.SceneLoader?.IsPluginForExtensionAvailable('.glb'))return actor;
 const fallback=actor.root.getChildren();
 actor.ready=loadRiggedMarin(ctx.B,ctx.scene,{parent:actor.root}).then(rig=>{
  // Do not swap character geometry in the middle of an already-running finale.
  if(actor.locked){rig.dispose();return false;}
  fallback.forEach(n=>n.setEnabled(false));actor.imported=rig;actor.head=rig.head;actor.hands=[rig.hand,rig.rightHand];return true;
 }).catch(error=>{console.warn('Marin model unavailable; using fallback.',error);return false;});
 return actor;
}
