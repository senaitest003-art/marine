export type Year=2030|2035|2040|2050;
export const YEARS:Year[]=[2030,2035,2040,2050];
export type FuelId='vlsfo'|'lng'|'cellulosic'|'foodBio'|'eMethanol'|'ammonia'|'blueMethanol';
export type EngineType='LNG Otto LP'|'LNG Otto medium speed'|'LNG diesel cycle'|'LNG high pressure dual fuel'|'User Defined';
export interface Prices{eurT:Record<Year,number>;usdT:Record<Year,number>}
export interface Fuel {id:FuelId;name:string;lcv:number;ci:number;wtt:number;co2:number;ch4:number;n2o:number;slip:number;price:Prices;rfnbo:boolean;bio:boolean;food:boolean;eligible:boolean;maxSupply:number;maxBlend:number;minBlend:number;pilotShare:number;pilotFuel:FuelId;blue?:{upstream:number;production:number;capture:number;residual:number;leakage:number;transport:number;advanced:boolean}}
export interface Vessel{id:string;name:string;energyGJ:number;route:string;etsScope:number;fuelEUScope:number;engine:EngineType;compatible:FuelId[];ready:boolean;maxBlend:number;mix:Partial<Record<FuelId,number>>}
export interface Settings{baseCI:number;reduction:Record<Year,number>;penaltyRate:number;eurUsd:number;year:Year;scenario:'Low'|'Base'|'High';eua:Record<'Low'|'Base'|'High',Record<Year,number>>;rfNboIncentive:boolean;rfNboSubtarget:boolean;reward:number;rewardFrom:number;rewardTo:number;gwpCH4:number;gwpN2O:number;etsSurrender:number;lngSlip:Record<EngineType,number>}
export interface CostResult{fuel:number;ets:number;penalty:number;total:number;balance:number;actualCI:number;emissions:number}
