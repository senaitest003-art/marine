import {Fuel,Settings,Year} from '../types';
export const targetCI=(year:Year,s:Settings)=>s.baseCI*(1-s.reduction[year]);
export const effectiveCI=(f:Fuel,_year:Year,s:Settings,slip=0)=>{
 if(!f.eligible)return s.baseCI;
 const base=f.blue?.advanced?f.blue.upstream+f.blue.production*(1-f.blue.capture)+f.blue.residual+f.blue.leakage+f.blue.transport:f.ci;
 return (f.id==='lng'||f.id==='bioLng')?base+slip*1000*s.gwpCH4/f.lcv:base;
};
export const reward=(f:Fuel,year:Year,s:Settings)=>f.rfnbo&&s.rfNboIncentive&&year>=s.rewardFrom&&year<=s.rewardTo?s.reward:1;
/** RFNBO reward weights denominator energy only; lifecycle emissions remain actual. */
export const blendCI=(base:Fuel,alt:Fuel,share:number,year:Year,s:Settings,slip=0)=>{const r=reward(alt,year,s),pilot=alt.pilotShare,cleanShare=share*(1-pilot),baseShare=1-cleanShare;return (effectiveCI(base,year,s)*baseShare+effectiveCI(alt,year,s,slip)*cleanShare)/(baseShare+cleanShare*r)};
export const complianceBalance=(energyMJ:number,actual:number,target:number,scope=1)=>energyMJ*(target-actual)*scope/1e6;
export const penaltyMultiplier=(year:number)=>1+(Math.max(1,year)-1)/10;
export const penalty=(balanceGco2e:number,actualCI:number,rate:number,consecutiveYear=1)=>balanceGco2e>=0||actualCI<=0?0:(-balanceGco2e)*rate*1e6/(actualCI*41000)*penaltyMultiplier(consecutiveYear);
