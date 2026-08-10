import {fuels as initialFuels,settings as initialSettings} from './data';
import {Fuel,Settings,Vessel} from './types';

export const CURRENT_SCHEMA_VERSION=7;
export interface ScenarioData{version:number;settings:Settings;fuels:Fuel[];fleet:Vessel[]}

const mergeFuel=(saved:Partial<Fuel>,fallback:Fuel,resetPrice:boolean):Fuel=>{
 const price=resetPrice?structuredClone(fallback.price):{...fallback.price,...saved.price,low:{...fallback.price.low,...saved.price?.low},high:{...fallback.price.high,...saved.price?.high}};
 return{...fallback,...saved,price,priceBasis:resetPrice?fallback.priceBasis:saved.priceBasis||fallback.priceBasis,priceType:resetPrice?fallback.priceType:saved.priceType||fallback.priceType,priceSource:resetPrice?fallback.priceSource:saved.priceSource||fallback.priceSource,priceBasisNote:resetPrice?fallback.priceBasisNote:saved.priceBasisNote||fallback.priceBasisNote,priceConfidence:resetPrice?fallback.priceConfidence:saved.priceConfidence||fallback.priceConfidence};
};
const version5RebasedFuelIds:Fuel['id'][]=['vlsfo','lng','cellulosic','foodBio','eMethanol','ammonia','blueMethanol'];
const version6RebasedFuelIds:Fuel['id'][]=['lng','cellulosic'];
export const mergeCurrentFuelDefaults=(saved:Partial<Fuel>[]|undefined,resetPrice=false,resetIds:Fuel['id'][]=[]):Fuel[]=>initialFuels.map((fallback,index)=>mergeFuel(saved?.find(f=>f.id===fallback.id)||saved?.[index]||{},fallback,resetPrice||resetIds.includes(fallback.id)));
export const migrateScenario=(raw:unknown):ScenarioData|null=>{if(!raw||typeof raw!=='object')return null;const saved=raw as Partial<ScenarioData>;if(!saved.settings||!saved.fleet)return null;const version=saved.version??0,resetIds=version<5?version5RebasedFuelIds:version<6?version6RebasedFuelIds:[];return{version:CURRENT_SCHEMA_VERSION,settings:{...structuredClone(initialSettings),...saved.settings,lngSlip:{...initialSettings.lngSlip,...saved.settings.lngSlip}},fuels:mergeCurrentFuelDefaults(saved.fuels,false,resetIds),fleet:saved.fleet.map(v=>({...v,convertedFuels:v.convertedFuels||['vlsfo','ucome','hvo','bioLng'],conversionMode:v.conversionMode||'Existing Vessel Retrofit',vesselAge:v.vesselAge??10,expectedTotalLife:v.expectedTotalLife??25,remainingUsefulLife:Math.max(0,(v.expectedTotalLife??25)-(v.vesselAge??10))}))}};
export const scenarioPayload=(settings:Settings,fuels:Fuel[],fleet:Vessel[]):ScenarioData=>({version:CURRENT_SCHEMA_VERSION,settings,fuels,fleet});
