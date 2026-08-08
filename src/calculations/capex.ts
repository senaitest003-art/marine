import {Fuel,Settings} from '../types';
export const capitalRecoveryFactor=(rate:number,years:number)=>years<=0?0:rate===0?1/years:rate*Math.pow(1+rate,years)/(Math.pow(1+rate,years)-1);
export const annualizedCapex=(fuel:Fuel,vesselCount:number,s:Settings)=>fuel.capex*vesselCount*(s.capexMethod==='Straight-line'?1/Math.max(1,fuel.economicLife):capitalRecoveryFactor(fuel.discountRate,fuel.economicLife));
