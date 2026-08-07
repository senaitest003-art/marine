import {Fuel,Settings,Vessel,Year} from '../types';import {optimize} from './optimization';
export const sensitivity=(fleet:Vessel[],fuels:Fuel[],y:Year,s:Settings)=>[-.3,-.2,-.1,0,.1,.2,.3].map(delta=>{const fs=structuredClone(fuels);for(const f of fs.slice(1))f.price.eurT[y]*=1+delta;const best=optimize(fleet,fs,y,s,false);return{delta,best}});
