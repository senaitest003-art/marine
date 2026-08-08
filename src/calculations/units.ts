export const safe=(n:number,fallback=0)=>Number.isFinite(n)?n:fallback;
export const energyToMass=(energyGJ:number,lcvMJkg:number)=>lcvMJkg>0?safe(energyGJ/lcvMJkg):0;
export const massToEnergy=(tonnes:number,lcvMJkg:number)=>safe(tonnes*lcvMJkg);
export const fmt=(n:number,d=0)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
