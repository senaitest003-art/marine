import {Fuel,Settings,Vessel} from '../types';
export const capitalRecoveryFactor=(rate:number,years:number)=>years<=0?0:rate===0?1/years:rate*Math.pow(1+rate,years)/(Math.pow(1+rate,years)-1);
const methanolFuels:Fuel['id'][]=['cellulosic','foodBio','eMethanol','blueMethanol'];
export const initialConversionCapex=(fuel:Fuel,vessels:Vessel[],s:Settings)=>vessels.reduce((sum,vessel)=>{
 const methanolCompatible=methanolFuels.includes(fuel.id)&&vessel.convertedFuels.some(id=>methanolFuels.includes(id));
 if(vessel.conversionMode==='Already Compatible'||vessel.convertedFuels.includes(fuel.id)||methanolCompatible)return sum;
 const usd=vessel.conversionMode==='Newbuild / Replacement'?fuel.newbuildPremiumUsd[s.scenario]:fuel.retrofitCapexUsd[s.scenario];
 return sum+usd/s.eurUsd;
},0);
export const annualizedCapex=(fuel:Fuel,vessels:Vessel[],s:Settings)=>initialConversionCapex(fuel,vessels,s)*(s.capexMethod==='Straight-line'?1/Math.max(1,fuel.economicLife):capitalRecoveryFactor(fuel.discountRate,fuel.economicLife));
