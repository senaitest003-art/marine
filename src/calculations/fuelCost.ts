import {Fuel,Year} from '../types';
import {eurPerGJFromEurPerT} from './fuelPricing';

/** Fuel economics always compare equal delivered energy in EUR/GJ. */
export const fuelCost=(mix:{fuel:Fuel;energyGJ:number}[],year:Year)=>mix.reduce((total,item)=>{
 const eurGJ=Number.isFinite(item.fuel.price.eurGJ[year])
  ?item.fuel.price.eurGJ[year]
  :eurPerGJFromEurPerT(item.fuel.price.eurT[year],item.fuel.lcv);
 return total+item.energyGJ*eurGJ;
},0);
