import {describe,expect,it} from 'vitest';
import {fuels,makeVessels,settings} from '../data';
import {minimumBlend} from './blending';
import {etsCost} from './euETS';
import {fuelCost} from './fuelCost';
import {complianceBalance,penalty,targetCI} from './fuelEU';
import {eurPerGJFromEurPerT,normalizePrice} from './fuelPricing';
import {optimize} from './optimization';
import {minimumDedicated,poolBalance} from './pooling';
import {energyToMass} from './units';

describe('FuelEU',()=>{
 it('uses statutory targets',()=>{expect(targetCI(2030,settings)).toBeCloseTo(85.6904);expect(targetCI(2050,settings)).toBeCloseTo(18.232)});
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
