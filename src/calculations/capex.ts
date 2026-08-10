import {Fuel,Settings,Vessel} from '../types';
export const capitalRecoveryFactor=(rate:number,years:number)=>years<=0?1:rate===0?1/years:rate*Math.pow(1+rate,years)/(Math.pow(1+rate,years)-1);
const methanolFuels:Fuel['id'][]=['cellulosic','foodBio','eMethanol','blueMethanol'];
export const vesselRemainingUsefulLife=(vessel:Pick<Vessel,'vesselAge'|'expectedTotalLife'>)=>Math.max(0,vessel.expectedTotalLife-vessel.vesselAge);
export const retrofitRecoveryLife=(fuel:Fuel,vessel:Vessel)=>Math.min(vesselRemainingUsefulLife(vessel),Math.max(0,fuel.retrofitAssetLife));
const isCompatible=(fuel:Fuel,vessel:Vessel)=>vessel.conversionMode==='Already Compatible'||vessel.convertedFuels.includes(fuel.id)||(methanolFuels.includes(fuel.id)&&vessel.convertedFuels.some(id=>methanolFuels.includes(id)));
const vesselInitialCapex=(fuel:Fuel,vessel:Vessel,s:Settings)=>isCompatible(fuel,vessel)?0:(vessel.conversionMode==='Newbuild / Replacement'?fuel.newbuildPremiumUsd[s.scenario]:fuel.retrofitCapexUsd[s.scenario])/s.eurUsd;
export const initialConversionCapex=(fuel:Fuel,vessels:Vessel[],s:Settings)=>vessels.reduce((sum,vessel)=>{
 return sum+vesselInitialCapex(fuel,vessel,s);
},0);
export const annualizedCapex=(fuel:Fuel,vessels:Vessel[],s:Settings)=>vessels.reduce((sum,vessel)=>{
 const initial=vesselInitialCapex(fuel,vessel,s);if(initial===0)return sum;
 const recoveryLife=vessel.conversionMode==='Newbuild / Replacement'?fuel.newbuildEconomicLife:retrofitRecoveryLife(fuel,vessel);
 return sum+initial*capitalRecoveryFactor(fuel.discountRate,recoveryLife);
},0);
