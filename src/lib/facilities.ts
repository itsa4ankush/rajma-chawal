export type Capability = "High" | "Medium" | "Low";

export type MedicalNeed =
  | "Emergency Surgery"
  | "ICU + Oxygen"
  | "Dialysis"
  | "Neonatal Care"
  | "Trauma Care";

export interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  pin: string;
  capability: Capability;
  trustScore: number;
  warning: string;
  whyRecommended: string;
  needs: MedicalNeed[];
}

export const MEDICAL_NEEDS: MedicalNeed[] = [
  "Emergency Surgery",
  "ICU + Oxygen",
  "Dialysis",
  "Neonatal Care",
  "Trauma Care",
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

export const FACILITIES: Facility[] = [
  {
    id: "1",
    name: "Apollo Health City",
    city: "Hyderabad",
    state: "Telangana",
    pin: "500033",
    capability: "High",
    trustScore: 92,
    warning: "Average ER wait time exceeds 25 minutes during peak hours.",
    whyRecommended:
      "NABH accredited multi-specialty with 24/7 trauma team and verified ICU bed availability.",
    needs: ["Emergency Surgery", "ICU + Oxygen", "Trauma Care"],
  },
  {
    id: "2",
    name: "Manipal Hospital Whitefield",
    city: "Bengaluru",
    state: "Karnataka",
    pin: "560066",
    capability: "High",
    trustScore: 88,
    warning: "No active warnings reported in the last 90 days.",
    whyRecommended:
      "Strong neonatal ICU outcomes and dedicated dialysis unit with verified patient reviews.",
    needs: ["Neonatal Care", "Dialysis", "ICU + Oxygen"],
  },
  {
    id: "3",
    name: "Fortis Memorial Research Institute",
    city: "Gurugram",
    state: "Haryana",
    pin: "122002",
    capability: "High",
    trustScore: 90,
    warning: "Higher than average billing disputes reported in 2024.",
    whyRecommended:
      "Tertiary care center with verified emergency surgical capacity and oxygen reserves.",
    needs: ["Emergency Surgery", "ICU + Oxygen", "Trauma Care"],
  },
  {
    id: "4",
    name: "AIIMS New Delhi",
    city: "New Delhi",
    state: "Delhi",
    pin: "110029",
    capability: "High",
    trustScore: 95,
    warning: "Long OPD waiting periods; emergency triage prioritized.",
    whyRecommended:
      "Government tertiary referral hospital with strongest trauma and surgical track record.",
    needs: ["Trauma Care", "Emergency Surgery", "ICU + Oxygen", "Neonatal Care"],
  },
  {
    id: "5",
    name: "KEM Hospital",
    city: "Mumbai",
    state: "Maharashtra",
    pin: "400012",
    capability: "Medium",
    trustScore: 76,
    warning: "Equipment uptime reported at 82% — confirm dialysis slot before arrival.",
    whyRecommended:
      "Public hospital with experienced nephrology team and subsidized dialysis access.",
    needs: ["Dialysis", "Emergency Surgery"],
  },
  {
    id: "6",
    name: "Christian Medical College",
    city: "Vellore",
    state: "Tamil Nadu",
    pin: "632004",
    capability: "High",
    trustScore: 93,
    warning: "Out-of-state referrals require advance appointment.",
    whyRecommended:
      "Renowned for neonatal intensive care and complex surgical interventions.",
    needs: ["Neonatal Care", "Emergency Surgery", "ICU + Oxygen"],
  },
  {
    id: "7",
    name: "District General Hospital",
    city: "Patna",
    state: "Bihar" as unknown as string,
    pin: "800001",
    capability: "Low",
    trustScore: 54,
    warning: "Limited oxygen reserves and no on-site CT scanner.",
    whyRecommended:
      "Closest public option for stabilization before transfer to tertiary care.",
    needs: ["Trauma Care"],
  },
  {
    id: "8",
    name: "Ruby Hall Clinic",
    city: "Pune",
    state: "Maharashtra",
    pin: "411001",
    capability: "High",
    trustScore: 86,
    warning: "ICU occupancy frequently above 90%.",
    whyRecommended:
      "Verified cardiac and trauma capabilities with rapid surgical response.",
    needs: ["Emergency Surgery", "Trauma Care", "ICU + Oxygen"],
  },
];
