import {Fuel,Settings,Vessel,Year,CostResult} from '../types';
import {fuelCost} from './fuelCost';import {ttwEmissions} from './euETS';import {blendCI,complianceBalance,penalty,targetCI} from './fuelEU';import {annualizedCapex} from './capex';import {dedicatedSelection} from './pooling';
export interface Option extends CostResult{label:string;fuelName:string;share:number;dedicated:number;altDemand:number;baseDemand:number;technicalLimit?:boolean}
const usable=(v:Vessel,f:Fuel,share:number)=>v.ready&&v.compatible.includes(f.id)&&share<=Math.min(v.maxBlend,f.maxBlend);
export const option=(label:string,fleet:Vessel[],base:Fuel,alt:Fuel,share:number,dedicated:number,y:Year,s:Settings):Option=>{
 const selected=dedicated?new Set(dedicatedSelection(fleet,base,alt,y,s).vesselIds):null;
 let fc=0,emissions=0,balance=s.bankedSurplus+s.borrowedBalance,altDemand=0,baseDemand=0,ciWeighted=0,scopedEnergy=0,users=0,technicalLimit=false;
 for(const v of fleet){let x=selected?(selected.has(v.id)?1:0):share;if(x>0&&!usable(v,alt,x)){technicalLimit=true;x=0}if(x>0)users++;
  const slip=(alt.id==='lng'||alt.id==='bioLng')?s.lngSlip[v.engine]:0,pilot=x*alt.pilotShare,clean=x*(1-alt.pilotShare),basePart=1-clean;
  const mix=[{fuel:base,energyGJ:v.energyGJ*basePart},{fuel:alt,energyGJ:v.energyGJ*clean}];fc+=fuelCost(mix,y,s.scenario);emissions+=ttwEmissions(base,v.energyGJ*basePart,s,v.etsScope)+ttwEmissions(alt,v.energyGJ*clean,s,v.etsScope,slip);
  const ci=blendCI(base,alt,x,y,s,slip),e=v.energyGJ*1000*v.fuelEUScope;balance+=complianceBalance(e,ci,targetCI(y,s));ciWeighted+=ci*e;scopedEnergy+=e;altDemand+=v.energyGJ*clean/alt.lcv;baseDemand+=v.energyGJ*(1-x+pilot)/base.lcv;
 }
 const actualCI=scopedEnergy?ciWeighted/scopedEnergy:0,pen=penalty(balance,actualCI,s.penaltyRate,s.consecutiveNonCompliance),capex=annualizedCapex(alt,users,s),ets=emissions*s.eua[s.scenario][y],other=s.otherComplianceCost,total=fc+ets+pen+capex+other;
 return{label,fuelName:alt.name,share,dedicated:selected?.size||0,fuel:fc,ets,penalty:pen,capex,externalCredit:0,other,total,balance,actualCI,emissions,altDemand,baseDemand,technicalLimit};
};
export const externalCreditOption=(fleet:Vessel[],base:Fuel,y:Year,s:Settings):Option|undefined=>{if(!s.externalCreditAvailable)return;const raw=option('External Compliance Credit',fleet,base,base,0,0,y,{...s,externalCreditAvailable:false});const required=Math.max(0,-raw.balance),credit=required*s.externalCreditPrice;return{...raw,label:'External Compliance Credit',penalty:0,externalCredit:credit,total:raw.fuel+raw.ets+raw.capex+credit+raw.other,balance:0}};
export const optimize=(fleet:Vessel[],fuels:Fuel[],y:Year,s:Settings,zeroPenalty:boolean)=>{const base=fuels[0],candidates:Option[]=[option('Penalty pay',fleet,base,base,0,0,y,s)];for(const f of fuels.slice(1)){for(let x=0;x<=1.0001;x+=.005){const o=option('Uniform blend',fleet,base,f,Math.min(1,x),0,y,s);if(!o.technicalLimit)candidates.push(o)}}const credit=externalCreditOption(fleet,base,y,s);if(credit)candidates.push(credit);return(zeroPenalty?candidates.filter(x=>x.penalty<.01):candidates).sort((a,b)=>a.total-b.total)[0]};
