import {Fuel,FuelPriceBasis,Prices,PriceScenario,PriceSeries,Year,YEARS} from '../types';

export const eurPerGJFromEurPerT=(eurT:number,lcvMJkg:number)=>lcvMJkg>0?eurT/lcvMJkg:Number.NaN;
export const eurPerTFromUsdPerT=(usdT:number,eurUsd:number)=>eurUsd>0?usdT/eurUsd:Number.NaN;
export const normalizePrice=(value:number,basis:FuelPriceBasis,lcvMJkg:number,eurUsd:number)=>{
 const eurT=basis==='EUR/t'?value:basis==='USD/t'?eurPerTFromUsdPerT(value,eurUsd):value*lcvMJkg;
 return{eurT,usdT:eurT*eurUsd,eurGJ:eurPerGJFromEurPerT(eurT,lcvMJkg)};
};
export const priceSeries=(price:Prices,scenario:PriceScenario):PriceSeries=>scenario==='Low'?price.low:scenario==='High'?price.high:price;
export const reconcilePrices=(fuel:Fuel,eurUsd:number,changedYear?:Year,changedValue?:number,scenario:PriceScenario='Base'):Prices=>{
 const current=priceSeries(fuel.price,scenario);
 const series={eurT:{...current.eurT},usdT:{...current.usdT},eurGJ:{...current.eurGJ}};
 for(const year of YEARS){
  const primary=changedYear===year&&changedValue!==undefined?changedValue:fuel.priceBasis==='EUR/t'?series.eurT[year]:fuel.priceBasis==='USD/t'?series.usdT[year]:series.eurGJ[year];
  const normalized=normalizePrice(primary,fuel.priceBasis,fuel.lcv,eurUsd);
  series.eurT[year]=normalized.eurT;series.usdT[year]=normalized.usdT;series.eurGJ[year]=normalized.eurGJ;
 }
 return scenario==='Low'?{...fuel.price,low:series}:scenario==='High'?{...fuel.price,high:series}:{...fuel.price,...series};
};
