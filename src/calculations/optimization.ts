import {Fuel,Settings,Vessel,Year,CostResult} from '../types';
import {fuelCost} from './fuelCost';import {ttwEmissions} from './euETS';import {blendCI,complianceBalance,penalty,targetCI} from './fuelEU';import {annualizedCapex,initialConversionCapex} from './capex';import {dedicatedSelection} from './pooling';import {priceSeries} from './fuelPricing';
export type DeploymentStrategy='Uniform Blending'|'Dedicated Clean Fuel Vessel + Fleet Pooling'|'Hybrid Allocation'|'External Compliance Credit'|'Penalty Pay';
/** A physical fuel and the way it is deployed are deliberately separate fields. */
export interface Option extends CostResult{
 fuelId:Fuel['id'];fuelName:string;strategy:DeploymentStrategy;blendShare:number|null;cleanVesselCount:number;
 cleanFuelDemandTonnes:number;bunkerDemandTonnes:number;fuelCost:number;cleanFuelCost:number;etsCost:number;
 fuelEUPenalty:number;initialConversionCapex:number;annualizedCapex:number;externalCreditCost:number;totalComplianceCost:number;
 /** Backward-compatible calculation aliases used by existing charts/exports. */
 label:string;share:number;dedicated:number;altDemand:number;baseDemand:number;technicalLimit?:boolean;
}
const usable=(v:Vessel,f:Fuel,share:number)=>v.ready&&v.compatible.includes(f.id)&&share<=Math.min(v.maxBlend,f.maxBlend);
export const option=(strategy:DeploymentStrategy,fleet:Vessel[],base:Fuel,alt:Fuel,share:number,dedicated:number,y:Year,s:Settings):Option=>{
 const selected=dedicated?new Set(dedicatedSelection(fleet,base,alt,y,s).vesselIds):null;
 let fc=0,cleanEnergyGJ=0,emissions=0,balance=s.bankedSurplus+s.borrowedBalance,altDemand=0,baseDemand=0,ciWeighted=0,scopedEnergy=0,technicalLimit=false;const users:Vessel[]=[];
 for(const v of fleet){let x=selected?(selected.has(v.id)?1:0):share;if(x>0&&!usable(v,alt,x)){technicalLimit=true;x=0}if(x>0)users.push(v);
  const slip=(alt.id==='lng'||alt.id==='bioLng')?s.lngSlip[v.engine]:0,pilot=x*alt.pilotShare,clean=x*(1-alt.pilotShare),basePart=1-clean;
  const mix=[{fuel:base,energyGJ:v.energyGJ*basePart},{fuel:alt,energyGJ:v.energyGJ*clean}];fc+=fuelCost(mix,y,s.scenario);cleanEnergyGJ+=v.energyGJ*clean;emissions+=ttwEmissions(base,v.energyGJ*basePart,s,v.etsScope)+ttwEmissions(alt,v.energyGJ*clean,s,v.etsScope,slip);
  const ci=blendCI(base,alt,x,y,s,slip),e=v.energyGJ*1000*v.fuelEUScope;balance+=complianceBalance(e,ci,targetCI(y,s));ciWeighted+=ci*e;scopedEnergy+=e;altDemand+=v.energyGJ*clean/alt.lcv;baseDemand+=v.energyGJ*(1-x+pilot)/base.lcv;
 }
 const actualCI=scopedEnergy?ciWeighted/scopedEnergy:0,pen=penalty(balance,actualCI,s.penaltyRate,s.consecutiveNonCompliance),initialCapex=initialConversionCapex(alt,users,s),capex=annualizedCapex(alt,users,s),ets=emissions*s.eua[s.scenario][y],other=s.otherComplianceCost,total=fc+ets+pen+capex+other;
 const cleanFuelCost=cleanEnergyGJ*priceSeries(alt.price,s.scenario).eurGJ[y],cleanVesselCount=selected?.size||(share>0?users.length:0);
 return{fuelId:alt.id,fuelName:alt.name,strategy,blendShare:dedicated?null:share,cleanVesselCount,cleanFuelDemandTonnes:altDemand,bunkerDemandTonnes:baseDemand,fuelCost:fc,cleanFuelCost,etsCost:ets,fuelEUPenalty:pen,initialConversionCapex:initialCapex,annualizedCapex:capex,externalCreditCost:0,totalComplianceCost:total,label:strategy,share,dedicated:selected?.size||0,fuel:fc,ets,penalty:pen,capex,externalCredit:0,other,total,balance,actualCI,emissions,altDemand,baseDemand,technicalLimit};
};
export const externalCreditOption=(fleet:Vessel[],base:Fuel,y:Year,s:Settings):Option|undefined=>{if(!s.externalCreditAvailable)return;const raw=option('External Compliance Credit',fleet,base,base,0,0,y,{...s,externalCreditAvailable:false});const required=Math.max(0,-raw.balance),credit=required*s.externalCreditPrice,total=raw.fuelCost+raw.etsCost+raw.annualizedCapex+credit+raw.other;return{...raw,externalCreditCost:credit,totalComplianceCost:total,penalty:0,fuelEUPenalty:0,externalCredit:credit,total,balance:0}};
export const optimize=(fleet:Vessel[],fuels:Fuel[],y:Year,s:Settings,zeroPenalty:boolean)=>{const base=fuels[0],candidates:Option[]=[option('Penalty Pay',fleet,base,base,0,0,y,s)];for(const f of fuels.slice(1)){for(let x=0;x<=1.0001;x+=.005){const o=option('Uniform Blending',fleet,base,f,Math.min(1,x),0,y,s);if(!o.technicalLimit)candidates.push(o)}}const credit=externalCreditOption(fleet,base,y,s);if(credit)candidates.push(credit);return(zeroPenalty?candidates.filter(x=>x.penalty<.01&&x.strategy!=='Penalty Pay'):candidates).sort((a,b)=>a.total-b.total)[0]};
