import {Fuel,PriceScenario,Year} from '../types';
import {eurPerGJFromEurPerT,priceSeries} from './fuelPricing';

/** Fuel economics always compare equal delivered energy in EUR/GJ. */
export const fuelCost=(mix:{fuel:Fuel;energyGJ:number}[],year:Year,scenario:PriceScenario='Base')=>mix.reduce((total,item)=>{
 const prices=priceSeries(item.fuel.price,scenario);
 const eurGJ=Number.isFinite(prices.eurGJ[year])
  ?prices.eurGJ[year]
  :eurPerGJFromEurPerT(prices.eurT[year],item.fuel.lcv);
 return total+item.energyGJ*eurGJ;
},0);
