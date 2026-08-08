import {Fuel,Settings,Year} from '../types';
export const targetCI=(year:Year,s:Settings)=>s.baseCI*(1-s.reduction[year]);
export const effectiveCI=(f:Fuel,_year:Year,s:Settings,_slip=f.slip)=>{
 if(!f.eligible)return s.baseCI;
 // `ci` is the user-entered final FuelEU WtW value. CH4 slip and N2O must be
 // included in that certified value and are not added a second time here.
 return f.blue?.advanced
  ?f.blue.upstream+f.blue.production*(1-f.blue.capture)+f.blue.residual+f.blue.leakage+f.blue.transport
  :f.ci;
};
export const reward=(f:Fuel,year:Year,s:Settings)=>f.rfnbo&&s.rfNboIncentive&&year>=s.rewardFrom&&year<=s.rewardTo?s.reward:1;
export const blendCI=(base:Fuel,alt:Fuel,share:number,year:Year,s:Settings,slip?:number)=>{const r=reward(alt,year,s);return (effectiveCI(base,year,s)*(1-share)+effectiveCI(alt,year,s,slip)*share*r)/(1-share+share*r)};
export const complianceBalance=(energyMJ:number,actual:number,target:number,scope=1)=>energyMJ*(target-actual)*scope/1e6;
export const penalty=(balanceGco2e:number,actualCI:number,rate:number)=>balanceGco2e>=0||actualCI<=0?0:(-balanceGco2e)*rate*1e6/(actualCI*41000);
