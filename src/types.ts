export type Language = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or' | 'ur';

export interface Farmer {
  uid: string;
  farmerName: string;
  mobileNumber: string;
  email?: string;
  area: string;
  landSize: number;
  preferredLanguage: Language;
  signupDate: string;
}

export interface FarmerLog {
  id?: string;
  farmerId: string;
  activityType: string;
  activityDetails: string;
  timestamp: string;
}

export interface DiseaseRecord {
  id?: string;
  farmerId: string;
  plantName: string;
  detectedDisease: string;
  recommendedTreatment: string;
  cause: string;
  preventionTips: string;
  scanDate: string;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  benefits: string;
  usageMethod: string;
  icon: string;
}

export interface WeatherInfo {
  temp: number;
  humidity: number;
  rainChance: number;
  windSpeed: number;
  condition: string;
}

export interface SoilInfo {
  type: string;
  n: number;
  p: number;
  k: number;
  moisture: number;
  waterAvailability: string;
}

export interface LocationInfo {
  name?: string;
  village: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
}

export interface CropProfitData {
  cropName: string;
  totalCost: number;
  expectedYield: number;
  estimatedProfit: number;
  season: string;
}

export interface PesticideInfo {
  cropName: string;
  chemical: {
    name: string;
    usage: string;
    details: string;
  }[];
  organic: {
    name: string;
    usage: string;
    details: string;
  }[];
}

export interface IrrigationSchedule {
  bestTime: string;
  nextWatering: string;
  schedule: {
    stage: string;
    frequency: string;
    details: string;
  }[];
}

export interface GovernmentScheme {
  id: string;
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  applicationLink: string;
  category: string;
  location: string[];
  farmerType: string[];
  cropType: string[];
}

export interface AgriculturalLoan {
  id: string;
  bankName: string;
  loanType: string;
  interestRate: string;
  maxAmount: string;
  repaymentPeriod: string;
  eligibility: string;
  location: string[];
  farmerType: string[];
}
