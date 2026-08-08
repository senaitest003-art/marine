import {Fuel,Settings,Year} from '../types';import {energyToMass} from './units';
export const ttwEmissions=(fuel:Fuel,energyGJ:number,s:Settings,scope=1,slip=fuel.slip)=>{const t=energyToMass(energyGJ,fuel.lcv);return t*(fuel.co2+slip*s.gwpCH4+fuel.n2o*s.gwpN2O)*scope*s.etsSurrender};
export const etsCost=(mix:{fuel:Fuel;energyGJ:number;slip?:number}[],year:Year,s:Settings,scope=1)=>mix.reduce((a,x)=>a+ttwEmissions(x.fuel,x.energyGJ,s,scope,x.slip),0)*s.eua[s.scenario][year];
