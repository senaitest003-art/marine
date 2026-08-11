import {Fuel,Settings,Vessel,Year} from '../types';
import {minimumBlend} from './blending';
import {blendCI,complianceBalance,effectiveCI,targetCI} from './fuelEU';
import {fuelAvailabilityLimit,pathwayAvailable,vesselCanUseFuel} from './fuelConstraints';

export interface DedicatedSelection{count:number;vesselIds:string[];balance:number;feasible:boolean}
export const dedicatedSelection=(fleet:Vessel[],base:Fuel,alt:Fuel,year:Year,s:Settings):DedicatedSelection=>{
 if(!pathwayAvailable(alt,year))return{count:Infinity,vesselIds:[],balance:Number.NEGATIVE_INFINITY,feasible:false};
 const target=targetCI(year,s);
 const fleetEnergy=fleet.reduce((sum,v)=>sum+v.energyGJ*v.fuelEUScope,0),energyBudget=fleetEnergy*fuelAvailabilityLimit(alt,year);
 let balance=s.bankedSurplus+s.borrowedBalance;
 const candidates=fleet.map(v=>{
  const energyMJ=v.energyGJ*1000*v.fuelEUScope;
  const fossil=complianceBalance(energyMJ,effectiveCI(base,year,s),target);
  const slip=(alt.id==='lng'||alt.id==='bioLng')?s.lngSlip[v.engine]:0;
  const cleanCI=blendCI(base,alt,1,year,s,slip);
  const clean=complianceBalance(energyMJ,cleanCI,target);
  balance+=fossil;
  return{v,improvement:clean-fossil};
 }).filter(x=>vesselCanUseFuel(x.v,alt)&&x.v.maxBlend>=1&&x.improvement>0).sort((a,b)=>b.improvement-a.improvement||a.v.id.localeCompare(b.v.id));
 const ids:string[]=[];
 let usedEnergy=0;
 for(const candidate of candidates){if(balance>=0)break;const candidateEnergy=candidate.v.energyGJ*candidate.v.fuelEUScope;if(usedEnergy+candidateEnergy>energyBudget+1e-8)continue;usedEnergy+=candidateEnergy;balance+=candidate.improvement;ids.push(candidate.v.id)}
 return{count:balance>=0?ids.length:Infinity,vesselIds:ids,balance,feasible:balance>=0};
};
export const minimumDedicated=(fleet:Vessel[],base:Fuel,alt:Fuel,year:Year,s:Settings)=>dedicatedSelection(fleet,base,alt,year,s).count;
export const poolBalance=(balances:number[])=>({balance:balances.reduce((a,b)=>a+b,0),surplus:balances.filter(x=>x>0).reduce((a,b)=>a+b,0),deficit:-balances.filter(x=>x<0).reduce((a,b)=>a+b,0)});
export const uniformShare=(fleet:Vessel[],b:Fuel,a:Fuel,y:Year,s:Settings)=>minimumBlend(b,a,y,s,fleet.reduce((x,v)=>x+v.energyGJ*v.fuelEUScope,0),a.id==='lng'||a.id==='bioLng'?fleet.reduce((x,v)=>x+s.lngSlip[v.engine]*v.energyGJ,0)/fleet.reduce((x,v)=>x+v.energyGJ,0):0).energyShare;
