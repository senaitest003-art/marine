import {describe,expect,it} from 'vitest';
import {fuels,makeVessels,settings} from '../data';
import {YEARS} from '../types';
import {minimumBlend} from './blending';
import {etsCost} from './euETS';
import {fuelCost} from './fuelCost';
import {blendCI,complianceBalance,effectiveCI,penalty,penaltyMultiplier,targetCI} from './fuelEU';
import {eurPerGJFromEurPerT,normalizePrice,priceSeries} from './fuelPricing';
import {optimize} from './optimization';
import {dedicatedSelection,minimumDedicated,poolBalance} from './pooling';
import {compliantStrategiesForFuel,rankCompliantFuels} from './recommendation';
import {energyToMass} from './units';
import {CURRENT_SCHEMA_VERSION,migrateScenario,scenarioPayload} from '../scenarioStorage';
import {externalCreditOption,option} from './optimization';
import {annualizedCapex,capitalRecoveryFactor,initialConversionCapex} from './capex';
import {NAV} from '../navigation';

describe('FuelEU',()=>{
 it('uses statutory targets',()=>{expect(targetCI(2030,settings)).toBeCloseTo(85.6904);expect(targetCI(2035,settings)).toBeCloseTo(77.9418);expect(targetCI(2040,settings)).toBeCloseTo(62.9004);expect(targetCI(2050,settings)).toBeCloseTo(18.232)});
 it('finds exact compliant blend',()=>{const x=minimumBlend(fuels[0],fuels[4],2035,settings,405000);expect(x.feasible).toBe(true);expect(x.actualCI).toBeCloseTo(targetCI(2035,settings));expect(x.energyShare).toBeGreaterThan(0)});
 it('rejects ineligible and worse fuel',()=>{expect(minimumBlend(fuels[0],{...fuels[3],eligible:false},2030,settings,1).feasible).toBe(false);expect(minimumBlend(fuels[0],{...fuels[1],ci:100},2030,settings,1).reason).toContain('above FuelEU target')});
 it('handles zero energy',()=>expect(minimumBlend(fuels[0],fuels[4],2030,settings,0).altTonnes).toBe(0));
 it('computes signed balances and penalty',()=>{expect(complianceBalance(1e6,80,70)).toBe(-10);expect(penalty(-10,80,2400)).toBeGreaterThan(0)});
});

describe('units, ETS and fleet',()=>{
 it('converts GJ to tonnes',()=>expect(energyToMass(405000,40.5)).toBe(10000));
 it('charges allowances',()=>expect(etsCost([{fuel:fuels[0],energyGJ:405000}],2030,settings)).toBeGreaterThan(0));
 it('ceil dedicated vessels',()=>{const n=minimumDedicated(makeVessels(10),fuels[0],fuels[4],2030,settings);expect(Number.isInteger(n)).toBe(true);expect(n).toBeGreaterThan(0)});
 it('sums balances rather than CI averages',()=>expect(poolBalance([10,-4,-3]).balance).toBe(3));
 it('supports fleet size one and 100+',()=>{expect(minimumDedicated(makeVessels(1),fuels[0],fuels[4],2030,settings)).toBeGreaterThanOrEqual(1);expect(minimumDedicated(makeVessels(101),fuels[0],fuels[4],2030,settings)).toBeGreaterThan(0)});
 it('optimizer returns finite result with zero price',()=>{const f=structuredClone(fuels);f[4].price.eurGJ[2030]=0;expect(Number.isFinite(optimize(makeVessels(),f,2030,settings,false).total)).toBe(true)});
});

describe('LNG blend feasibility regression',()=>{
 const bunker={...fuels[0],ci:91.16};
 const lng={...fuels[1],ci:75,maxBlend:1,eligible:true,maxSupply:1e9};
 it('finds the 2030 33.85% energy blend with fraction-based maxBlend',()=>{
  const result=minimumBlend(bunker,lng,2030,settings,405000);
  expect(result.feasible).toBe(true);
  expect(result.energyShare).toBeCloseTo((91.16-85.6904)/(91.16-75),6);
  expect(result.energyShare).toBeCloseTo(0.338465,5);
  expect(result.actualCI).toBeCloseTo(85.6904,6);
  expect(result.details.maximumAllowedBlend).toBe(1);
  expect(result.reason).toBe('Feasible');
 });
 it('does not add the reference methane slip twice to the displayed WtW CI',()=>{
  const defaultSlip=settings.lngSlip['LNG Otto LP'];
  expect(defaultSlip).toBe(lng.slip);
  expect(effectiveCI(lng,2030,settings,defaultSlip)).toBe(75);
  const result=minimumBlend(bunker,lng,2030,settings,405000,defaultSlip);
  expect(result.feasible).toBe(true);
  expect(result.energyShare).toBeCloseTo(0.338465,5);
  expect(result.actualCI).toBeCloseTo(85.6904,6);
 });
 it.each([[2030,true],[2035,true],[2040,false],[2050,false]] as const)('%s feasibility is %s',(year,feasible)=>{
  const result=minimumBlend(bunker,lng,year,settings,405000);
  expect(result.feasible).toBe(feasible);
  if(!feasible)expect(result.reason).toContain('above FuelEU target');
 });
 it('explains a technical maximum failure',()=>{
  const result=minimumBlend(bunker,{...lng,maxBlend:.2},2030,settings,405000);
  expect(result.feasible).toBe(false);
  expect(result.reason).toBe('Required blend 33.8% exceeds technical maximum blend 20.0%');
 });
});

describe('canonical EUR/GJ fuel economics',()=>{
 it('converts EUR/t and USD/t consistently',()=>{
  expect(eurPerGJFromEurPerT(738,41)).toBe(18);
  expect(normalizePrice(700,'EUR/t',50,1.1).eurGJ).toBe(14);
  expect(normalizePrice(770,'USD/t',50,1.1).eurGJ).toBeCloseTo(14);
 });
 it('prices equal energy directly from EUR/GJ rather than comparing tonnes',()=>{
  const vlsfo={...fuels[0],price:{...fuels[0].price,eurGJ:{...fuels[0].price.eurGJ,2030:18}}};
  const lng={...fuels[1],price:{...fuels[1].price,eurGJ:{...fuels[1].price.eurGJ,2030:14}}};
  expect(fuelCost([{fuel:vlsfo,energyGJ:500},{fuel:lng,energyGJ:500}],2030)).toBe(16000);
 });
});

describe('long-term planning price trajectories',()=>{
 it('reduces e-Methanol prices through every model period',()=>{
  const p=fuels.find(f=>f.id==='eMethanol')!.price.usdT;
  expect(p[2030]).toBeGreaterThan(p[2035]);expect(p[2035]).toBeGreaterThan(p[2040]);expect(p[2040]).toBeGreaterThan(p[2050]);
 });
 it('reduces green ammonia prices through every model period',()=>{
  const p=fuels.find(f=>f.id==='ammonia')!.price.usdT;
  expect(p[2030]).toBeGreaterThan(p[2035]);expect(p[2035]).toBeGreaterThan(p[2040]);expect(p[2040]).toBeGreaterThan(p[2050]);
 });
 it('reduces cellulosic bio-methanol between 2030 and 2050',()=>{
  const p=fuels.find(f=>f.id==='cellulosic')!.price.usdT;
  expect(p[2030]).toBeGreaterThan(p[2050]);
 });
 it('uses the market-based e-Methanol Low, Base and High decks',()=>{
  const p=fuels.find(f=>f.id==='eMethanol')!.price;
  expect(p.usdT).toEqual({2030:1200,2035:1000,2040:850,2050:650});
  expect(p.low.usdT).toEqual({2030:900,2035:750,2040:650,2050:500});
  expect(p.high.usdT).toEqual({2030:1600,2035:1400,2040:1200,2050:900});
  expect(p.eurGJ[2030]).toBeCloseTo((1200/settings.eurUsd)/19.9,8);
 });
 it('uses the shared methanol retrofit screening CAPEX and simplified navigation',()=>{
  for(const id of ['cellulosic','foodBio','eMethanol','blueMethanol'])expect(fuels.find(f=>f.id===id)!.retrofitCapexUsd.Base).toBe(10_500_000);
  expect(NAV).not.toContain('Cost Optimization');expect(NAV).not.toContain('Sensitivity');
 });
 it('uses explicit delivered-price decks rather than generic multipliers',()=>{
  const decks={
   vlsfo:[[550,575,600,625],[450,475,500,525],[700,725,750,775]],
   lng:[[775,775,800,800],[600,600,625,625],[1000,1000,1050,1050]],
   cellulosic:[[1000,900,825,750],[800,725,650,600],[1250,1150,1050,950]],
   foodBio:[[850,825,800,800],[700,675,650,650],[1050,1025,1000,1000]],
   eMethanol:[[1200,1000,850,650],[900,750,650,500],[1600,1400,1200,900]],
   ammonia:[[950,850,750,650],[700,650,575,500],[1250,1100,950,800]],
   blueMethanol:[[650,625,600,575],[500,475,450,425],[850,825,800,750]],
  } as const;
  const cellulosic=fuels.find(f=>f.id==='cellulosic')!;expect(cellulosic.price.usdT[2030]/cellulosic.lcv).toBeCloseTo(50.251256,6);
  for(const [id,[base,low,high]] of Object.entries(decks)){
   const fuel=fuels.find(f=>f.id===id)!;
   expect(Object.values(fuel.price.usdT)).toEqual(base);
   expect(Object.values(fuel.price.low.usdT)).toEqual(low);
   expect(Object.values(fuel.price.high.usdT)).toEqual(high);
   for(const year of YEARS){expect(fuel.price.eurT[year]).toBeCloseTo(fuel.price.usdT[year]/settings.eurUsd,8);expect(fuel.price.eurGJ[year]).toBeCloseTo(fuel.price.eurT[year]/fuel.lcv,8)}
  }
 });
});

describe('recommended compliant fuel ranking',()=>{
 it('evaluates every alternative fuel and never recommends penalty pay as a fuel',()=>{
  const ranking=rankCompliantFuels(makeVessels(10),fuels,2030,settings);
  expect(ranking).toHaveLength(fuels.length-1);
  expect(ranking.some(r=>r.fuel.id==='vlsfo')).toBe(false);
  expect(ranking.filter(r=>r.best).every(r=>r.best!.penalty<.01)).toBe(true);
  expect(ranking.filter(r=>r.best).every(r=>r.best!.strategy!=='Penalty Pay')).toBe(true);
 });
 it('keeps fuel and deployment strategy as separate typed result fields',()=>{
  const fuel=fuels.find(f=>f.id==='eMethanol')!,fleet=makeVessels(10);
  const uniform=option('Uniform Blending',fleet,fuels[0],fuel,.1,0,2030,settings);
  const pooling=option('Dedicated Clean Fuel Vessel + Fleet Pooling',fleet,fuels[0],fuel,0,2,2030,settings);
  expect(uniform.fuelName).toBe('e-Methanol');expect(pooling.fuelName).toBe('e-Methanol');
  expect(uniform.strategy).toBe('Uniform Blending');expect(pooling.strategy).toBe('Dedicated Clean Fuel Vessel + Fleet Pooling');
 });
 it('returns one row per alternative fuel and its cheapest compliant strategy',()=>{
  const ranking=rankCompliantFuels(makeVessels(10),fuels,2030,settings);
  expect(new Set(ranking.map(r=>r.fuel.id)).size).toBe(fuels.length-1);
  for(const row of ranking.filter(r=>r.best)){
   expect(row.best!.fuelId).toBe(row.fuel.id);expect(row.best!.fuelEUPenalty).toBeLessThan(.01);
   expect(row.best!.strategy).not.toBe('Penalty Pay');
   const candidates=compliantStrategiesForFuel(makeVessels(10),fuels[0],row.fuel,2030,settings);
   expect(row.best!.totalComplianceCost).toBeCloseTo(Math.min(...candidates.map(x=>x.totalComplianceCost)),6);
  }
 });
 it('separates all-fuel cost, clean-fuel cost, and total compliance cost',()=>{
  const fleet=makeVessels(1),base=fuels[0],alt=fuels.find(f=>f.id==='eMethanol')!,share=.25;
  const result=option('Uniform Blending',fleet,base,alt,share,0,2030,settings);
  const altEnergy=fleet[0].energyGJ*share*(1-alt.pilotShare),baseEnergy=fleet[0].energyGJ*(1-share+share*alt.pilotShare);
  const expectedClean=altEnergy*priceSeries(alt.price,settings.scenario).eurGJ[2030];
  const expectedBase=baseEnergy*priceSeries(base.price,settings.scenario).eurGJ[2030];
  expect(result.cleanFuelCost).toBeCloseTo(expectedClean,8);
  expect(result.fuelCost).toBeCloseTo(expectedBase+expectedClean,8);
  expect(result.totalComplianceCost).toBeCloseTo(result.fuelCost+result.etsCost+result.fuelEUPenalty+result.annualizedCapex+result.externalCreditCost+result.other,8);
 });
});

describe('scenario price schema migration',()=>{
 it('replaces legacy price trajectories while preserving non-price assumptions',()=>{
  const legacyFuels=structuredClone(fuels);
  const methanol=legacyFuels.find(f=>f.id==='eMethanol')!;
  methanol.ci=17;
  Object.assign(methanol.price.usdT,{2030:1250,2035:1287.5,2040:1325,2050:1375});
  const migrated=migrateScenario({settings:{...settings,baseCI:90},fuels:legacyFuels,fleet:makeVessels(3)})!;
  expect(migrated.version).toBe(CURRENT_SCHEMA_VERSION);
  expect(migrated.settings.baseCI).toBe(90);
  expect(migrated.fleet).toHaveLength(3);
  expect(migrated.fuels.find(f=>f.id==='eMethanol')!.ci).toBe(17);
  expect(migrated.fuels.find(f=>f.id==='eMethanol')!.price.usdT).toEqual({2030:1200,2035:1000,2040:850,2050:650});
  expect(migrated.fuels.find(f=>f.id==='eMethanol')!.price.low.usdT).toEqual({2030:900,2035:750,2040:650,2050:500});
  expect(migrated.fuels.find(f=>f.id==='eMethanol')!.price.high.usdT).toEqual({2030:1600,2035:1400,2040:1200,2050:900});
  expect(migrated.fuels.find(f=>f.id==='vlsfo')!.price.usdT).toEqual({2030:550,2035:575,2040:600,2050:625});
  expect(migrated.fuels.find(f=>f.id==='lng')!.price.usdT).toEqual({2030:775,2035:775,2040:800,2050:800});
  expect(migrated.fuels.find(f=>f.id==='cellulosic')!.price.usdT).toEqual({2030:1000,2035:900,2040:825,2050:750});
  expect(migrated.fuels.find(f=>f.id==='foodBio')!.price.usdT).toEqual({2030:850,2035:825,2040:800,2050:800});
  expect(migrated.fuels.find(f=>f.id==='ammonia')!.price.usdT).toEqual({2030:950,2035:850,2040:750,2050:650});
  expect(migrated.fuels.find(f=>f.id==='blueMethanol')!.price.usdT).toEqual({2030:650,2035:625,2040:600,2050:575});
 });
 it('preserves user-edited prices in a current-version scenario',()=>{
  const savedFuels=structuredClone(fuels);
  savedFuels.find(f=>f.id==='eMethanol')!.price.usdT[2035]=700;
  const saved=scenarioPayload(settings,savedFuels,makeVessels(2));
  expect(migrateScenario(saved)!.fuels.find(f=>f.id==='eMethanol')!.price.usdT[2035]).toBe(700);
 });
 it('migrates version 5 LNG and cellulosic decks without overwriting other edited fuels',()=>{
  const savedFuels=structuredClone(fuels);
  savedFuels.find(f=>f.id==='lng')!.price.usdT[2030]=700;
  savedFuels.find(f=>f.id==='cellulosic')!.price.usdT[2030]=700;
  savedFuels.find(f=>f.id==='vlsfo')!.price.usdT[2030]=560;
  const migrated=migrateScenario({version:5,settings,fuels:savedFuels,fleet:makeVessels(2)})!;
  expect(migrated.fuels.find(f=>f.id==='lng')!.price.usdT).toEqual({2030:775,2035:775,2040:800,2050:800});
  expect(migrated.fuels.find(f=>f.id==='cellulosic')!.price.usdT).toEqual({2030:1000,2035:900,2040:825,2050:750});
  expect(migrated.fuels.find(f=>f.id==='vlsfo')!.price.usdT[2030]).toBe(560);
 });
});

describe('decision-engine regulatory integrations',()=>{
 it('raises LNG FuelEU CI and required blend with methane slip',()=>{
  const lng=fuels.find(f=>f.id==='lng')!;
  const lowCI=effectiveCI(lng,2030,settings,lng.slip),highCI=effectiveCI(lng,2030,settings,lng.slip+.02);
  expect(highCI).toBeGreaterThan(lowCI);
  const low=minimumBlend(fuels[0],lng,2030,settings,405000,lng.slip),high=minimumBlend(fuels[0],lng,2030,settings,405000,lng.slip+.02);
  expect(!high.feasible||high.energyShare>low.energyShare).toBe(true);
 });
 it('applies vessel ETS scope exactly',()=>{
  const full=makeVessels(1),half=structuredClone(full);half[0].etsScope=.5;
  const a=option('Penalty Pay',full,fuels[0],fuels[0],0,0,2030,settings),b=option('Penalty Pay',half,fuels[0],fuels[0],0,0,2030,settings);
  expect(b.ets).toBeCloseTo(a.ets*.5,8);
 });
 it('weights only RFNBO denominator and leaves actual emissions numerator unchanged',()=>{
  const alt=fuels.find(f=>f.id==='eMethanol')!,off={...settings,rfNboIncentive:false},on={...settings,rfNboIncentive:true};
  const share=.4,offCI=blendCI(fuels[0],alt,share,2030,off),onCI=blendCI(fuels[0],alt,share,2030,on);
  const offNumerator=offCI,onNumerator=onCI*((1-share)+share*2);
  expect(onCI).toBeLessThan(offCI);expect(onNumerator).toBeCloseTo(offNumerator,10);
 });
 it('accounts for ammonia pilot fuel in CI and ETS',()=>{
  const ammonia=fuels.find(f=>f.id==='ammonia')!,pure={...ammonia,pilotShare:0},pilot={...ammonia,pilotShare:.05};
  expect(blendCI(fuels[0],pilot,1,2035,settings)).toBeGreaterThan(blendCI(fuels[0],pure,1,2035,settings));
  const fleet=makeVessels(1),pureCost=option('Uniform Blending',fleet,fuels[0],pure,1,0,2035,settings),pilotCost=option('Uniform Blending',fleet,fuels[0],pilot,1,0,2035,settings);
  expect(pilotCost.ets).toBeGreaterThan(pureCost.ets);
 });
 it('escalates consecutive non-compliance penalty',()=>{
  expect(penaltyMultiplier(1)).toBe(1);expect(penaltyMultiplier(2)).toBe(1.1);expect(penaltyMultiplier(5)).toBe(1.4);
 });
 it('selects heterogeneous dedicated vessels by actual compliance contribution',()=>{
  const fleet=makeVessels(3);fleet[0].energyGJ=100000;fleet[1].energyGJ=900000;fleet[2].energyGJ=200000;
  const result=dedicatedSelection(fleet,fuels[0],fuels.find(f=>f.id==='eMethanol')!,2030,settings);
  expect(result.vesselIds[0]).toBe(fleet[1].id);expect(result.feasible).toBe(true);
 });
 it('annualizes conversion CAPEX only across vessels that use the alternative fuel',()=>{
  const fleet=makeVessels(10),fuel=fuels.find(f=>f.id==='eMethanol')!;
  const uniform=option('Uniform Blending',fleet,fuels[0],fuel,.1,0,2030,settings);
  expect(uniform.initialConversionCapex).toBeCloseTo(10*fuel.retrofitCapexUsd.Base/settings.eurUsd,6);
  const three=fleet.slice(0,3);expect(initialConversionCapex(fuel,three,settings)).toBeCloseTo(3*fuel.retrofitCapexUsd.Base/settings.eurUsd,6);
  const compatible=structuredClone(three);compatible.forEach(v=>v.convertedFuels.push('eMethanol'));
  expect(initialConversionCapex(fuel,compatible,settings)).toBe(0);
  expect(initialConversionCapex(fuels.find(f=>f.id==='cellulosic')!,compatible,settings)).toBe(0);
  const newbuild=structuredClone(three);newbuild.forEach(v=>v.conversionMode='Newbuild / Replacement');
  expect(initialConversionCapex(fuel,newbuild,settings)).toBeCloseTo(3*fuel.newbuildPremiumUsd.Base/settings.eurUsd,6);
  const crf=capitalRecoveryFactor(.08,15);expect(crf).toBeCloseTo(.1168295,6);
  expect(annualizedCapex(fuel,three,settings)).toBeCloseTo(initialConversionCapex(fuel,three,settings)*crf,6);
 });
 it('allows low-priced external compliance credit to be a zero-penalty option',()=>{
  const credit=externalCreditOption(makeVessels(2),fuels[0],2030,{...settings,externalCreditAvailable:true,externalCreditPrice:1})!;
  expect(credit.penalty).toBe(0);expect(credit.externalCredit).toBeGreaterThan(0);expect(credit.balance).toBe(0);
 });
});
