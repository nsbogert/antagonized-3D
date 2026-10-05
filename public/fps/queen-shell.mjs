import {QUEEN_PHASES} from './queen-core.mjs';
// Combat cues tint the animated shell itself; no separate floating armor or heart.
export function createQueenShell(B,materials){
 const state={armor:0,open:0,foam:0,flash:0,time:0,x:0,z:0,yaw:0};
 class ShellCue extends B.MaterialPluginBase{
  constructor(material){super(material,'QueenShellCue',200,{},true,true);}
  getUniforms(){return {ubo:[{name:'queenOrigin',size:4,type:'vec4'},{name:'queenStatus',size:4,type:'vec4'},{name:'queenPulse',size:2,type:'vec2'}],fragment:'uniform vec4 queenOrigin; uniform vec4 queenStatus; uniform vec2 queenPulse;'};}
  bindForSubMesh(buffer){
   buffer.updateFloat4('queenOrigin',state.x,state.z,Math.sin(state.yaw),Math.cos(state.yaw));
   buffer.updateFloat4('queenStatus',state.armor,state.open,state.foam,state.flash);
   buffer.updateFloat2('queenPulse',state.time,0);
  }
  getCustomCode(type){if(type!=='fragment')return null;return {
   CUSTOM_FRAGMENT_BEFORE_LIGHTS:`
    vec2 queenDelta = vPositionW.xz - queenOrigin.xy;
    vec3 queenLocal = vec3(queenDelta.x * queenOrigin.w - queenDelta.y * queenOrigin.z, vPositionW.y, queenDelta.x * queenOrigin.z + queenDelta.y * queenOrigin.w);
    float queenArmorMask = 1.0 - smoothstep(0.65, 1.05, length((queenLocal - vec3(0.45, 2.8, -0.8)) / vec3(1.85, 1.25, 3.9)));
    float queenWeakMask = 1.0 - smoothstep(0.3, 1.0, length((queenLocal - vec3(0.45, 2.48, 2.3)) / vec3(1.2, 0.85, 1.05)));
    float queenFoamMask = (1.0 - smoothstep(2.4, 3.1, queenLocal.y)) * queenStatus.z;
    float queenWeakGlow = queenWeakMask * queenStatus.y * (0.8 + 0.2 * sin(queenPulse.x * 4.0));
    surfaceAlbedo = mix(surfaceAlbedo, surfaceAlbedo * vec3(1.35, 1.1, 0.82), queenArmorMask * queenStatus.x * 0.35);
    surfaceAlbedo = mix(surfaceAlbedo, vec3(0.75, 0.19, 0.035), queenWeakGlow * 0.45);
    surfaceAlbedo = mix(surfaceAlbedo, vec3(0.65, 0.88, 0.92), queenFoamMask * 0.7);
   `,
   CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION:`
    finalEmissive += vec3(1.0, 0.22, 0.025) * queenWeakGlow * 0.75;
    finalEmissive += vec3(0.35, 0.12, 0.025) * queenArmorMask * queenStatus.x * 0.08;
    finalEmissive += vec3(0.7, 0.27, 0.1) * queenStatus.w * queenArmorMask * 0.5;
   `
  };}
 }
 const plugins=materials.map(material=>new ShellCue(material));
 return {state,plugins,sync(q,time){
  state.x=q.x;state.z=q.z;state.yaw=q.yaw;state.time=time;
  state.armor=Math.max(0,Math.min(1,q.armor/Math.max(1,QUEEN_PHASES[q.phase]?.armor||6)));state.open=q.open>0?1:0;state.foam=q.foam>0?1:0;state.flash=q.hitFlash>0?1:0;
 },clear(){state.armor=state.open=state.foam=state.flash=0;}};
}
