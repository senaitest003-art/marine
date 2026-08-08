import {Fuel,FuelPriceBasis,Prices,Year,YEARS} from '../types';

export const eurPerGJFromEurPerT=(eurT:number,lcvMJkg:number)=>lcvMJkg>0?eurT/lcvMJkg:Number.NaN;
export const eurPerTFromUsdPerT=(usdT:number,eurUsd:number)=>eurUsd>0?usdT/eurUsd:Number.NaN;
export const normalizePrice=(value:number,basis:FuelPriceBasis,lcvMJkg:number,eurUsd:number)=>{
 const eurT=basis==='EUR/t'?value:basis==='USD/t'?eurPerTFromUsdPerT(value,eurUsd):value*lcvMJkg;
 return{eurT,usdT:eurT*eurUsd,eurGJ:eurPerGJFromEurPerT(eurT,lcvMJkg)};
};
export const reconcilePrices=(fuel:Fuel,eurUsd:number,changedYear?:Year,changedValue?:number):Prices=>{
 const price={eurT:{...fuel.price.eurT},usdT:{...fuel.price.usdT},eurGJ:{...fuel.price.eurGJ}};
 for(const year of YEARS){
  const primary=changedYear===year&&changedValue!==undefined?changedValue:fuel.priceBasis==='EUR/t'?price.eurT[year]:fuel.priceBasis==='USD/t'?price.usdT[year]:price.eurGJ[year];
  const normalized=normalizePrice(primary,fuel.priceBasis,fuel.lcv,eurUsd);
  price.eurT[year]=normalized.eurT;price.usdT[year]=normalized.usdT;price.eurGJ[year]=normalized.eurGJ;
 }
 return price;
};
