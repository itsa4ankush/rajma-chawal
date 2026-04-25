const STATE_VARIANTS: Record<string, string[]> = {
  "Andhra Pradesh": ["Andhra Pradesh", "Andhrapradesh"],
  "Arunachal Pradesh": ["Arunachal Pradesh"],
  Assam: ["Assam"],
  Bihar: ["Bihar"],
  Chhattisgarh: ["Chhattisgarh", "Chattisgarh"],
  Goa: ["Goa"],
  Gujarat: ["Gujarat", "Gj"],
  Haryana: ["Haryana"],
  "Himachal Pradesh": ["Himachal Pradesh"],
  Jharkhand: ["Jharkhand"],
  Karnataka: ["Karnataka", "Ka"],
  Kerala: ["Kerala"],
  "Madhya Pradesh": ["Madhya Pradesh", "Madhyapradesh"],
  Maharashtra: ["Maharashtra", "Mh"],
  Manipur: ["Manipur"],
  Meghalaya: ["Meghalaya"],
  Mizoram: ["Mizoram"],
  Nagaland: ["Nagaland"],
  Odisha: ["Odisha"],
  Punjab: ["Punjab", "Punjab Region"],
  Rajasthan: ["Rajasthan"],
  Sikkim: ["Sikkim"],
  "Tamil Nadu": ["Tamil Nadu", "Tamilnadu"],
  Telangana: ["Telangana", "Telangana State"],
  Tripura: ["Tripura"],
  "Uttar Pradesh": ["Uttar Pradesh", "Up", "U.p."],
  Uttarakhand: ["Uttarakhand", "Uttaranchal", "Ut"],
  "West Bengal": ["West Bengal"],
  Delhi: [
    "Delhi",
    "Delhi Division",
    "Delhi Ncr",
    "National Capital Territory Of Delhi",
    "Nct",
    "West Delhi",
    "North West Delhi",
    "New Delhi",
  ],
  Chandigarh: ["Chandigarh"],
  "Jammu and Kashmir": ["Jammu And Kashmir", "Jammu & Kashmir", "J&k"],
  Ladakh: ["Ladakh"],
  Lakshadweep: ["Lakshadweep"],
  Puducherry: ["Puducherry", "Pondicherry"],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Ut Of Dadra & Nagar Haveli And Daman Diu",
    "Daman And Diu",
  ],
  "Andaman and Nicobar Islands": ["Andaman And Nicobar Islands"],
};

function normalizeLocationKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, " ").trim().replace(/\s+/g, " ");
}

const CANONICAL_STATE_BY_KEY = Object.fromEntries(
  Object.entries(STATE_VARIANTS).flatMap(([canonical, variants]) =>
    variants.map((variant) => [normalizeLocationKey(variant), canonical]),
  ),
) as Record<string, string>;

export const OFFICIAL_STATE_NAMES = Object.keys(STATE_VARIANTS).sort((a, b) =>
  a.localeCompare(b),
);

export function getCanonicalState(rawState: string): string | null {
  const trimmed = rawState.trim();
  if (!trimmed) return null;
  const normalized = normalizeLocationKey(trimmed);
  if (!normalized || ["null", "true", "false"].includes(normalized)) return null;
  return CANONICAL_STATE_BY_KEY[normalized] ?? null;
}

export function getStateVariants(state: string): string[] {
  const canonical = getCanonicalState(state) ?? state;
  return STATE_VARIANTS[canonical] ?? [state];
}

export function isValidLocationCity(rawCity: string): boolean {
  const city = rawCity.trim();
  if (!city) return false;
  if (["null", "true", "false"].includes(city.toLowerCase())) return false;
  if (city.startsWith("[")) return false;
  if (/^\d+$/.test(city)) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(city)) return false;
  return true;
}
