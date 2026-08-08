export type Year=2030|2035|2040|2050;
export const YEARS:Year[]=[2030,2035,2040,2050];
export type FuelId='vlsfo'|'lng'|'cellulosic'|'foodBio'|'eMethanol'|'ammonia'|'blueMethanol'|'ucome'|'hvo'|'bioLng';
export type EngineType='LNG Otto LP'|'LNG Otto medium speed'|'LNG diesel cycle'|'LNG high pressure dual fuel'|'User Defined';
export type FuelPriceBasis='EUR/t'|'USD/t'|'EUR/GJ';
export type PriceScenario='Low'|'Base'|'High';
export interface PriceSeries{eurT:Record<Year,number>;usdT:Record<Year,number>;eurGJ:Record<Year,number>}
export interface Prices extends PriceSeries{low:PriceSeries;high:PriceSeries}
export interface Fuel {id:FuelId;name:string;lcv:number;ci:number;wtt:number;co2:number;ch4:number;n2o:number;slip:number;price:Prices;priceBasis:FuelPriceBasis;priceSource:string;priceBasisNote:string;priceConfidence:'Low'|'Medium'|'High';rfnbo:boolean;bio:boolean;food:boolean;eligible:boolean;maxSupply:number;maxBlend:number;minBlend:number;pilotShare:number;pilotFuel:FuelId;capex:number;economicLife:number;discountRate:number;blue?:{upstream:number;production:number;capture:number;residual:number;leakage:number;transport:number;advanced:boolean}}
export interface Vessel{id:string;name:string;energyGJ:number;route:string;etsScope:number;fuelEUScope:number;engine:EngineType;compatible:FuelId[];ready:boolean;maxBlend:number;mix:Partial<Record<FuelId,number>>}
export interface Settings{baseCI:number;reduction:Record<Year,number>;penaltyRate:number;consecutiveNonCompliance:number;eurUsd:number;year:Year;scenario:'Low'|'Base'|'High';eua:Record<'Low'|'Base'|'High',Record<Year,number>>;rfNboIncentive:boolean;rfNboSubtarget:boolean;reward:number;rewardFrom:number;rewardTo:number;gwpCH4:number;gwpN2O:number;etsSurrender:number;lngSlip:Record<EngineType,number>;capexMethod:'CRF'|'Straight-line';externalCreditAvailable:boolean;externalCreditPrice:number;bankedSurplus:number;borrowedBalance:number;borrowingRepayment:number;otherComplianceCost:number}
export interface CostResult{fuel:number;ets:number;penalty:number;capex:number;externalCredit:number;other:number;total:number;balance:number;actualCI:number;emissions:number}
