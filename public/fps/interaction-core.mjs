import {distanceXZ} from './core.mjs';
// Space deliberately mounts a foamed soldier; proximity alone never mounts one.
export function findMountTarget(player,ants){
  return ants.filter(a=>a.type==='soldier'&&((a.state==='alive'&&a.foam>0)||(a.state==='subdued'&&a.subdued>0))&&Math.abs(a.y-player.y)<1.7&&distanceXZ(a,player)<2.8)
    .sort((a,b)=>distanceXZ(player,a)-distanceXZ(player,b))[0]||null;
}
export function jumpIntent(state,player,ant){
  if(state.ride)return 'dismount';
  if(!player.grounded)return 'none';
  return ant?'mount':'jump';
}
// Each station fires once per visit. Only leaving its range rearms it.
export class SupplyVisits{
  constructor(){this.visited=new Set();}
  update(nearby){for(const station of this.visited)if(!nearby.includes(station))this.visited.delete(station);}
  enter(station){if(this.visited.has(station))return false;this.visited.add(station);return true;}
  reset(){this.visited.clear();}
}
