import {Fuel,Settings,Year} from '../types';
import {blendCI,effectiveCI,reward,targetCI} from './fuelEU';
import {energyToMass} from './units';
import {fuelAvailabilityLimit,hasBunkeringAccess,hasUsableCertification} from './fuelConstraints';

export interface BlendDetails {
 bunkerCI:number;
 alternativeCI:number;
 targetCI:number;
 rfnboFactor:number;
 numerator:number;
 denominator:number;
 rawMinimumBlend:number;
 maximumAllowedBlend:number;
 actualCI:number;
 reason:string;
}

export interface BlendResult {
 feasible:boolean;
 energyShare:number;
 massShare:number;
 actualCI:number;
 altTonnes:number;
 baseTonnes:number;
 reason:string;
 details:BlendDetails;
}

const failed=(details:BlendDetails,energyShare:number,baseTonnes:number,altTonnes=0):BlendResult=>({
 feasible:false,energyShare,massShare:Number.NaN,actualCI:details.actualCI,
 altTonnes,baseTonnes,reason:details.reason,details,
});

export const minimumBlend=(base:Fuel,alt:Fuel,year:Year,s:Settings,energyGJ:number,slip?:number):BlendResult=>{
 const target=targetCI(year,s);
 const bunker=effectiveCI(base,year,s);
 const rawAlternative=effectiveCI(alt,year,s,slip);
 const alternative=rawAlternative*(1-alt.pilotShare)+effectiveCI(base,year,s)*alt.pilotShare;
 const factor=reward(alt,year,s);
 const numerator=bunker-target;
 // Solves the reward-weighted blendCI expression. For factor=1 this reduces
 // exactly to (bunker-target)/(bunker-alternative).
 const denominator=bunker-alternative+target*(factor-1)*(1-alt.pilotShare);
 const raw=numerator/denominator;
 const max=Math.min(1,Math.max(0,alt.maxBlend),fuelAvailabilityLimit(alt,year));
 const baseDetails={bunkerCI:bunker,alternativeCI:alternative,targetCI:target,
  rfnboFactor:factor,numerator,denominator,rawMinimumBlend:raw,
  maximumAllowedBlend:max,actualCI:bunker,reason:''};
 const baseMass=energyToMass(energyGJ,base.lcv);

 if(!alt.eligible)return failed({...baseDetails,reason:'Alternative fuel is not FuelEU eligible'},Number.NaN,baseMass);
 if(!alt.certificationValid||!hasUsableCertification(alt))return failed({...baseDetails,reason:'A valid certified FuelEU WtW CI is required'},Number.NaN,baseMass);
 if(!hasBunkeringAccess(alt,year))return failed({...baseDetails,reason:`Bunkering is unavailable in ${year}`},Number.NaN,baseMass);
 if(alt.maxSupply<=0)return failed({...baseDetails,reason:'Alternative fuel annual supply is zero'},Number.NaN,baseMass);
 if(bunker<=target)return{feasible:true,energyShare:0,massShare:0,actualCI:bunker,altTonnes:0,baseTonnes:baseMass,reason:'Bunker fuel already meets the target',details:{...baseDetails,rawMinimumBlend:0,actualCI:bunker,reason:'Bunker fuel already meets the target'}};
 if(alternative>target||denominator<=0||!Number.isFinite(raw))return failed({...baseDetails,actualCI:alternative,reason:'Alternative fuel CI remains above FuelEU target even at 100% use'},Number.NaN,baseMass);
 if(raw<0)return failed({...baseDetails,reason:'Calculated blend is below zero; verify CI assumptions'},raw,baseMass);
 if(raw>max){const reason=`Required blend ${(raw*100).toFixed(1)}% exceeds technical maximum blend ${(max*100).toFixed(1)}%`;return failed({...baseDetails,actualCI:blendCI(base,alt,max,year,s,slip),reason},raw,energyToMass(energyGJ*(1-max+max*alt.pilotShare),base.lcv),energyToMass(energyGJ*max*(1-alt.pilotShare),alt.lcv));}

 const share=Math.max(raw,Math.min(max,Math.max(0,alt.minBlend)));
 const altTonnes=energyToMass(energyGJ*share*(1-alt.pilotShare),alt.lcv);
 const baseTonnes=energyToMass(energyGJ*(1-share+share*alt.pilotShare),base.lcv);
 const actual=blendCI(base,alt,share,year,s,slip);
 if(altTonnes>alt.maxSupply){const reason=`Required annual demand ${altTonnes.toFixed(0)} t exceeds available supply ${alt.maxSupply.toFixed(0)} t`;return failed({...baseDetails,actualCI:actual,reason},share,baseTonnes,altTonnes);}
 const reason='Feasible';
 return{feasible:true,energyShare:share,massShare:altTonnes/(altTonnes+baseTonnes),actualCI:actual,altTonnes,baseTonnes,reason,details:{...baseDetails,actualCI:actual,reason}};
};
