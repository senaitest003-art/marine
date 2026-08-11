import {Fuel, Vessel, Year} from '../types';

/** Regulatory eligibility requires both the user eligibility decision and valid certification. */
export const hasUsableCertification=(fuel:Fuel)=>fuel.eligible&&fuel.certificationValid&&Number.isFinite(fuel.certifiedWtWCI);
/** Availability is a physical fleet-energy ceiling, not a price adjustment. */
export const fuelAvailabilityLimit=(fuel:Fuel,year:Year)=>Math.min(1,Math.max(0,fuel.availability[year]));
export const hasBunkeringAccess=(fuel:Fuel,year:Year)=>fuel.bunkeringAvailability[year]!=='Unavailable';
export const vesselCanUseFuel=(vessel:Vessel,fuel:Fuel)=>vessel.ready&&vessel.compatible.includes(fuel.id);
export const pathwayAvailable=(fuel:Fuel,year:Year)=>hasUsableCertification(fuel)&&hasBunkeringAccess(fuel,year)&&fuelAvailabilityLimit(fuel,year)>0&&fuel.maxSupply>0;
