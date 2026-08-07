import {Fuel,Year} from '../types';import {energyToMass} from './units';
export const fuelCost=(mix:{fuel:Fuel;energyGJ:number}[],year:Year)=>mix.reduce((a,x)=>a+energyToMass(x.energyGJ,x.fuel.lcv)*x.fuel.price.eurT[year],0);
