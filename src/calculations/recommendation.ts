import {Fuel,Settings,Vessel,Year} from '../types';
import {minimumBlend} from './blending';
import {option,Option} from './optimization';
import {minimumDedicated} from './pooling';

export interface FuelRankingResult{fuel:Fuel;best?:Option}

/** Ranks only zero-penalty alternative-fuel pathways; VLSFO and penalty pay are excluded. */
export const rankCompliantFuels=(fleet:Vessel[],fuels:Fuel[],year:Year,s:Settings):FuelRankingResult[]=>{
 const base=fuels[0],energy=fleet.reduce((sum,v)=>sum+v.energyGJ*v.fuelEUScope,0);
 return fuels.slice(1).map(fuel=>{
  const candidates:Option[]=[];
  const slip=(fuel.id==='lng'||fuel.id==='bioLng')?fleet.reduce((sum,v)=>sum+s.lngSlip[v.engine]*v.energyGJ*v.fuelEUScope,0)/Math.max(1,fleet.reduce((sum,v)=>sum+v.energyGJ*v.fuelEUScope,0)):0;
  const blend=minimumBlend(base,fuel,year,s,energy,slip);
  if(blend.feasible){const uniform=option('Uniform Blend',fleet,base,fuel,blend.energyShare,0,year,s);if(uniform.penalty<.01&&!uniform.technicalLimit)candidates.push(uniform)}
  const dedicated=minimumDedicated(fleet,base,fuel,year,s);
  if(fuel.eligible&&dedicated<=fleet.length){const pooling=option('Fleet Pooling',fleet,base,fuel,0,dedicated,year,s);if(pooling.penalty<.01&&pooling.altDemand<=fuel.maxSupply)candidates.push(pooling)}
  return{fuel,best:candidates.slice().sort((a,b)=>a.total-b.total)[0]};
 }).sort((a,b)=>a.best&&b.best?a.best.total-b.best.total:a.best?-1:b.best?1:0);
};
