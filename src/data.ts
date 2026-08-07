import {Fuel,Settings,Vessel,Year,YEARS} from './types';
const rec=(a:number,b:number,c:number,d:number)=>({2030:a,2035:b,2040:c,2050:d} as Record<Year,number>);
const p=(e:number)=>({eurT:rec(e,e*1.03,e*1.06,e*1.1),usdT:rec(e*1.08,e*1.112,e*1.145,e*1.188)});
export const settings:Settings={baseCI:91.16,reduction:rec(.06,.145,.31,.80),penaltyRate:2400,eurUsd:1.08,year:2030,scenario:'Base',eua:{Low:rec(70,80,95,120),Base:rec(100,120,150,200),High:rec(140,180,230,300)},rfNboIncentive:true,rfNboSubtarget:false,reward:2,rewardFrom:2025,rewardTo:2033,gwpCH4:28,gwpN2O:265,etsSurrender:1,lngSlip:{'LNG Otto LP':.035,'LNG Otto medium speed':.025,'LNG diesel cycle':.006,'LNG high pressure dual fuel':.002,'User Defined':.02}};
export const fuels:Fuel[]=[
 {id:'vlsfo',name:'VLSFO',lcv:40.5,ci:91.16,wtt:13.5,co2:3.114,ch4:0,n2o:0,slip:0,price:p(650),rfnbo:false,bio:false,food:false,eligible:true,maxSupply:1e9,maxBlend:1,minBlend:0,pilotShare:0,pilotFuel:'vlsfo'},
 {id:'lng',name:'LNG',lcv:49.1,ci:85,wtt:18.5,co2:2.75,ch4:0,n2o:0,slip:.035,price:p(760),rfnbo:false,bio:false,food:false,eligible:true,maxSupply:1e9,maxBlend:1,minBlend:0,pilotShare:0,pilotFuel:'vlsfo'},
 {id:'cellulosic',name:'Cellulosic Bio-Methanol',lcv:19.9,ci:18,wtt:15,co2:0.08,ch4:0,n2o:0,slip:0,price:p(1080),rfnbo:false,bio:true,food:false,eligible:true,maxSupply:200000,maxBlend:1,minBlend:0,pilotShare:0,pilotFuel:'vlsfo'},
 {id:'foodBio',name:'Food Bio-Methanol',lcv:19.9,ci:45,wtt:35,co2:.2,ch4:0,n2o:0,slip:0,price:p(900),rfnbo:false,bio:true,food:true,eligible:false,maxSupply:100000,maxBlend:1,minBlend:0,pilotShare:0,pilotFuel:'vlsfo'},
 {id:'eMethanol',name:'e-Methanol',lcv:19.9,ci:12,wtt:9,co2:.04,ch4:0,n2o:0,slip:0,price:p(1250),rfnbo:true,bio:false,food:false,eligible:true,maxSupply:250000,maxBlend:1,minBlend:0,pilotShare:0,pilotFuel:'vlsfo'},
 {id:'ammonia',name:'Green Ammonia',lcv:18.6,ci:9,wtt:7,co2:0,ch4:0,n2o:.0001,slip:0,price:p(980),rfnbo:true,bio:false,food:false,eligible:true,maxSupply:250000,maxBlend:1,minBlend:0,pilotShare:.05,pilotFuel:'vlsfo'},
 {id:'blueMethanol',name:'Blue Methanol',lcv:19.9,ci:48,wtt:40,co2:.15,ch4:0,n2o:0,slip:0,price:p(820),rfnbo:false,bio:false,food:false,eligible:true,maxSupply:180000,maxBlend:1,minBlend:0,pilotShare:0,pilotFuel:'vlsfo',blue:{upstream:12,production:55,capture:.9,residual:5.5,leakage:3,transport:2,advanced:false}}
];
export const makeVessels=(n=10):Vessel[]=>(Array.from({length:n},(_,i)=>({id:crypto.randomUUID(),name:`Vessel ${i+1}`,energyGJ:405000,route:'Intra-EU',etsScope:1,fuelEUScope:1,engine:'LNG Otto LP',compatible:fuels.map(f=>f.id),ready:true,maxBlend:1,mix:{vlsfo:1}})));
