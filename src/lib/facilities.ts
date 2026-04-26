export type Capability = "High" | "Medium" | "Low";

export type MedicalNeed =
  | "Emergency Surgery"
  | "ICU + Oxygen"
  | "Dialysis"
  | "Neonatal Care"
  | "Trauma Care"
  | "Emergency Care"
  | "Maternal Care"
  | "General Medicine"
  | "Vaccination / Post-exposure Care";

/**
 * Facility shape mirrors a future Databricks JSON/CSV export.
 * Field names are snake_case to match the export contract.
 */
export interface Facility {
  id: string;
  name: string;
  address_stateOrRegion: string;
  address_city: string;
  address_zipOrPostcode: string;
  latitude: number;
  longitude: number;
  emergency_surgery_capability: Capability;
  icu_capability: Capability;
  dialysis_capability: Capability;
  // Derived/secondary capabilities used by the UI
  neonatal_capability: Capability;
  trauma_capability: Capability;
  trust_score: number;
  risk_warning: string;
  recommendation_reason: string;
  has_icu: boolean;
  has_oxygen: boolean;
  has_operation_theatre: boolean;
  has_surgeon: boolean;
  has_anesthesiologist: boolean;
  has_dialysis: boolean;
  has_neonatal_care: boolean;
  has_ambulance: boolean;
  is_24_7: boolean;
}

export const MEDICAL_NEEDS: MedicalNeed[] = [
  "Emergency Surgery",
  "ICU + Oxygen",
  "Dialysis",
  "Neonatal Care",
  "Trauma Care",
  "Emergency Care",
  "Maternal Care",
  "General Medicine",
  "Vaccination / Post-exposure Care",
];

export const INDIAN_STATES = ["Bihar", "Karnataka", "Maharashtra", "Uttar Pradesh"];

export const NEED_TO_CAPABILITY_FIELD: Record<MedicalNeed, keyof Facility> = {
  "Emergency Surgery": "emergency_surgery_capability",
  "ICU + Oxygen": "icu_capability",
  Dialysis: "dialysis_capability",
  "Neonatal Care": "neonatal_capability",
  "Trauma Care": "trauma_capability",
  "Emergency Care": "emergency_surgery_capability",
  "Maternal Care": "neonatal_capability",
  "General Medicine": "emergency_surgery_capability",
  "Vaccination / Post-exposure Care": "emergency_surgery_capability",
};

export function facilityMatchesNeed(f: Facility, need: MedicalNeed): boolean {
  if (need === "Emergency Care") return f.has_ambulance || f.is_24_7;
  if (need === "Neonatal Care") return f.has_neonatal_care;
  if (need === "Maternal Care") return f.has_neonatal_care || f.is_24_7;
  if (need === "General Medicine" || need === "Vaccination / Post-exposure Care") return f.is_24_7;
  const cap = f[NEED_TO_CAPABILITY_FIELD[need]] as Capability;
  return cap === "High" || cap === "Medium";
}

export const FACILITIES: Facility[] = [
  {
    id: "f1",
    name: "Patna Medical College Hospital",
    address_stateOrRegion: "Bihar",
    address_city: "Patna",
    address_zipOrPostcode: "800004",
    latitude: 25.6127,
    longitude: 85.1376,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "Medium",
    neonatal_capability: "Medium",
    trauma_capability: "High",
    trust_score: 84,
    risk_warning: "Frequent overcrowding; ER wait can exceed 40 minutes.",
    recommendation_reason:
      "Largest government tertiary hospital in Bihar with verified trauma and surgical capacity.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f2",
    name: "AIIMS Patna",
    address_stateOrRegion: "Bihar",
    address_city: "Patna",
    address_zipOrPostcode: "801507",
    latitude: 25.5519,
    longitude: 85.0931,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "High",
    neonatal_capability: "High",
    trauma_capability: "High",
    trust_score: 92,
    risk_warning: "Advance appointment recommended for non-emergency cases.",
    recommendation_reason:
      "Premier institute with full-spectrum critical care and neonatal ICU.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f3",
    name: "Sadar Hospital Gaya",
    address_stateOrRegion: "Bihar",
    address_city: "Gaya",
    address_zipOrPostcode: "823001",
    latitude: 24.7914,
    longitude: 85.0002,
    emergency_surgery_capability: "Medium",
    icu_capability: "Low",
    dialysis_capability: "Low",
    neonatal_capability: "Medium",
    trauma_capability: "Medium",
    trust_score: 62,
    risk_warning: "Limited ICU beds and intermittent oxygen supply.",
    recommendation_reason:
      "Closest district hospital for stabilization before tertiary referral.",
    has_icu: false,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: false,
    has_dialysis: false,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f4",
    name: "Ruby Hall Clinic",
    address_stateOrRegion: "Maharashtra",
    address_city: "Pune",
    address_zipOrPostcode: "411001",
    latitude: 18.5362,
    longitude: 73.8826,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "High",
    neonatal_capability: "High",
    trauma_capability: "High",
    trust_score: 89,
    risk_warning: "ICU occupancy frequently above 90%.",
    recommendation_reason:
      "NABH accredited multi-specialty with rapid surgical response team.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f5",
    name: "KEM Hospital Mumbai",
    address_stateOrRegion: "Maharashtra",
    address_city: "Mumbai",
    address_zipOrPostcode: "400012",
    latitude: 19.0034,
    longitude: 72.8421,
    emergency_surgery_capability: "High",
    icu_capability: "Medium",
    dialysis_capability: "High",
    neonatal_capability: "High",
    trauma_capability: "High",
    trust_score: 81,
    risk_warning: "Equipment uptime ~82%; confirm dialysis slot in advance.",
    recommendation_reason:
      "Public tertiary center with experienced trauma and nephrology teams.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f6",
    name: "Lilavati Hospital",
    address_stateOrRegion: "Maharashtra",
    address_city: "Mumbai",
    address_zipOrPostcode: "400050",
    latitude: 19.0509,
    longitude: 72.8294,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "Medium",
    neonatal_capability: "High",
    trauma_capability: "Medium",
    trust_score: 87,
    risk_warning: "Premium pricing; verify insurance coverage beforehand.",
    recommendation_reason:
      "Strong neonatal outcomes and 24/7 surgical theatre availability.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f7",
    name: "Sassoon General Hospital",
    address_stateOrRegion: "Maharashtra",
    address_city: "Pune",
    address_zipOrPostcode: "411001",
    latitude: 18.5304,
    longitude: 73.8736,
    emergency_surgery_capability: "Medium",
    icu_capability: "Medium",
    dialysis_capability: "Low",
    neonatal_capability: "Medium",
    trauma_capability: "High",
    trust_score: 71,
    risk_warning: "High patient load; expect longer admission times.",
    recommendation_reason:
      "Government trauma center with reliable emergency surgical access.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: false,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f8",
    name: "Manipal Hospital Whitefield",
    address_stateOrRegion: "Karnataka",
    address_city: "Bengaluru",
    address_zipOrPostcode: "560066",
    latitude: 12.9698,
    longitude: 77.7499,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "High",
    neonatal_capability: "High",
    trauma_capability: "Medium",
    trust_score: 88,
    risk_warning: "No active warnings reported in the last 90 days.",
    recommendation_reason:
      "Strong neonatal ICU outcomes and dedicated dialysis unit.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f9",
    name: "Victoria Hospital",
    address_stateOrRegion: "Karnataka",
    address_city: "Bengaluru",
    address_zipOrPostcode: "560002",
    latitude: 12.9606,
    longitude: 77.5747,
    emergency_surgery_capability: "High",
    icu_capability: "Medium",
    dialysis_capability: "Medium",
    neonatal_capability: "Low",
    trauma_capability: "High",
    trust_score: 75,
    risk_warning: "Crowded outpatient department; emergency triage prioritized.",
    recommendation_reason:
      "Major government trauma hospital with experienced surgical staff.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: false,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f10",
    name: "KMC Hospital Mangalore",
    address_stateOrRegion: "Karnataka",
    address_city: "Mangalore",
    address_zipOrPostcode: "575001",
    latitude: 12.8703,
    longitude: 74.8425,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "High",
    neonatal_capability: "Medium",
    trauma_capability: "Medium",
    trust_score: 83,
    risk_warning: "Limited helipad access; ground transport recommended.",
    recommendation_reason:
      "Tertiary teaching hospital with verified ICU and dialysis capacity.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f11",
    name: "SGPGI Lucknow",
    address_stateOrRegion: "Uttar Pradesh",
    address_city: "Lucknow",
    address_zipOrPostcode: "226014",
    latitude: 26.7544,
    longitude: 80.9458,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "High",
    neonatal_capability: "High",
    trauma_capability: "Medium",
    trust_score: 90,
    risk_warning: "Referral-based admissions for non-emergency cases.",
    recommendation_reason:
      "Premier postgraduate institute with comprehensive critical care.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f12",
    name: "BHU Trauma Centre",
    address_stateOrRegion: "Uttar Pradesh",
    address_city: "Varanasi",
    address_zipOrPostcode: "221005",
    latitude: 25.2677,
    longitude: 82.9913,
    emergency_surgery_capability: "High",
    icu_capability: "Medium",
    dialysis_capability: "Medium",
    neonatal_capability: "Medium",
    trauma_capability: "High",
    trust_score: 78,
    risk_warning: "ICU bed availability fluctuates; call ahead.",
    recommendation_reason:
      "Dedicated trauma facility with 24/7 surgical and anesthesia coverage.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
  {
    id: "f13",
    name: "District Hospital Agra",
    address_stateOrRegion: "Uttar Pradesh",
    address_city: "Agra",
    address_zipOrPostcode: "282002",
    latitude: 27.1767,
    longitude: 78.0081,
    emergency_surgery_capability: "Medium",
    icu_capability: "Low",
    dialysis_capability: "Low",
    neonatal_capability: "Medium",
    trauma_capability: "Medium",
    trust_score: 60,
    risk_warning: "Limited ICU and no on-site dialysis unit.",
    recommendation_reason:
      "Useful for stabilization and basic emergency surgical care before transfer.",
    has_icu: false,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: false,
    has_dialysis: false,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: false,
  },
  {
    id: "f14",
    name: "KGMU Lucknow",
    address_stateOrRegion: "Uttar Pradesh",
    address_city: "Lucknow",
    address_zipOrPostcode: "226003",
    latitude: 26.8721,
    longitude: 80.9126,
    emergency_surgery_capability: "High",
    icu_capability: "High",
    dialysis_capability: "High",
    neonatal_capability: "High",
    trauma_capability: "High",
    trust_score: 86,
    risk_warning: "High footfall; expect queues at registration.",
    recommendation_reason:
      "Comprehensive government medical university with strong trauma and neonatal units.",
    has_icu: true,
    has_oxygen: true,
    has_operation_theatre: true,
    has_surgeon: true,
    has_anesthesiologist: true,
    has_dialysis: true,
    has_neonatal_care: true,
    has_ambulance: true,
    is_24_7: true,
  },
];
