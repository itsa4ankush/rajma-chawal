import { createFileRoute } from "@tanstack/react-router";
import type { Facility, MedicalNeed } from "@/lib/facilities";
import { getStateVariants, getCanonicalState } from "@/lib/location-normalization";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DBX_GATEWAY = "https://connector-gateway.lovable.dev/databricks";
const TABLE = "workspace.default.healthcare_facility_intelligence";

const SUPPORTED_NEEDS: MedicalNeed[] = [
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function escapeSqlString(input: string): string {
  return input.replace(/'/g, "''");
}

interface ParsedIntent {
  medicalNeed: MedicalNeed;
  specialtyNeed: string[];
  urgency: "emergency" | "urgent" | "routine";
  searchCapabilities: string[];
  preferredFacilityTypes: string[];
  explanationForUser: string;
  safetyMessage: string;
  locationMentioned: boolean;
  extractedState: string | null;
  extractedCity: string | null;
  extractedPinCode: string | null;
}

const SYSTEM_PROMPT = `You are CareMap's medical intent parser for India.

Your ONLY job: convert a user's plain-language health problem into a STRUCTURED healthcare search intent. You are NOT a doctor.

Hard rules:
- NEVER provide diagnosis, medication, dosage, or treatment instructions.
- NEVER tell the user to wait or self-treat.
- For anything resembling an emergency (severe pain, bleeding, breathing trouble, chest pain, unconsciousness, accident, newborn distress, pregnancy emergency, snake/animal bite), set urgency to "emergency" and direct them to seek urgent medical care or call local emergency services in safetyMessage.
- Output JSON ONLY using the provided schema. No prose outside JSON.

medicalNeed must be exactly ONE of:
"Emergency Surgery", "ICU + Oxygen", "Dialysis", "Neonatal Care", "Trauma Care", "Emergency Care", "Maternal Care", "General Medicine", "Vaccination / Post-exposure Care"

Mapping guidance:
- Dog/animal bite → "Vaccination / Post-exposure Care" (specialtyNeed includes wound care, rabies vaccination)
- Snake bite → "Emergency Care" (urgency: emergency)
- Chest pain → "Emergency Care" (urgency: emergency; capabilities: icu, oxygen, ambulance)
- Severe breathing difficulty → "ICU + Oxygen" (urgency: emergency)
- Road accident, multiple injuries → "Trauma Care" (urgency: emergency)
- Severe stomach pain / appendicitis → "Emergency Surgery"
- Kidney failure / needs dialysis → "Dialysis"
- Newborn not breathing / newborn emergency → "Neonatal Care" (urgency: emergency)
- Pregnancy emergency, labor complications → "Maternal Care" (urgency: emergency)
- High fever alone → "General Medicine"; if combined with breathing difficulty / convulsions / infants → "Emergency Care"

Location extraction:
- Identify any Indian state, city/town, district, area, or 6-digit PIN code mentioned in the user's message.
- Set locationMentioned = true if ANY place is mentioned, otherwise false.
- extractedState: canonical Indian state name (e.g. "Bihar", "Tamil Nadu", "Maharashtra") if you can confidently infer one (either directly or from a city). null otherwise.
- extractedCity: the city/town if mentioned, otherwise null.
- extractedPinCode: 6-digit PIN code if present, otherwise null.

urgency: "emergency" | "urgent" | "routine"`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "parse_medical_intent",
    description: "Return structured CareMap search intent.",
    parameters: {
      type: "object",
      properties: {
        medicalNeed: { type: "string", enum: SUPPORTED_NEEDS },
        specialtyNeed: { type: "array", items: { type: "string" } },
        urgency: { type: "string", enum: ["emergency", "urgent", "routine"] },
        searchCapabilities: { type: "array", items: { type: "string" } },
        preferredFacilityTypes: { type: "array", items: { type: "string" } },
        explanationForUser: { type: "string" },
        safetyMessage: { type: "string" },
        locationMentioned: { type: "boolean" },
        extractedState: { type: ["string", "null"] },
        extractedCity: { type: ["string", "null"] },
        extractedPinCode: { type: ["string", "null"] },
      },
      required: [
        "medicalNeed",
        "specialtyNeed",
        "urgency",
        "searchCapabilities",
        "preferredFacilityTypes",
        "explanationForUser",
        "safetyMessage",
        "locationMentioned",
        "extractedState",
        "extractedCity",
        "extractedPinCode",
      ],
      additionalProperties: false,
    },
  },
};

async function parseIntentWithLLM(
  message: string,
  apiKey: string,
): Promise<ParsedIntent> {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "parse_medical_intent" } },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{
      message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
    }>;
  };
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI did not return structured intent.");
  const parsed = JSON.parse(args) as ParsedIntent;
  if (!SUPPORTED_NEEDS.includes(parsed.medicalNeed)) {
    parsed.medicalNeed = "General Medicine";
  }
  return parsed;
}

function buildNeedFilter(need: MedicalNeed): string | null {
  switch (need) {
    case "Emergency Surgery":
      return "emergency_surgery_capability IN ('High','Medium')";
    case "ICU + Oxygen":
      return "icu_capability IN ('High','Medium')";
    case "Dialysis":
      return "dialysis_capability IN ('High','Medium')";
    case "Neonatal Care":
      return "has_neonatal_care = 1";
    case "Trauma Care":
      return "(emergency_surgery_capability IN ('High','Medium') OR has_ambulance = 1)";
    case "Emergency Care":
      return "(has_ambulance = 1 OR is_24_7 = 1 OR emergency_surgery_capability IN ('High','Medium'))";
    case "Maternal Care":
      return "(has_neonatal_care = 1 OR is_24_7 = 1)";
    case "General Medicine":
    case "Vaccination / Post-exposure Care":
      return null; // fall back to location only
    default:
      return null;
  }
}

interface DbxColumn { name: string }
interface DbxResp {
  status?: { state?: string; error?: { message?: string } };
  manifest?: { schema?: { columns?: DbxColumn[] } };
  result?: { data_array?: Array<Array<string | number | boolean | null>> };
}

function rowsToFacilities(resp: DbxResp): Facility[] {
  const cols = resp.manifest?.schema?.columns ?? [];
  const rows = resp.result?.data_array ?? [];
  return rows.map((row, idx) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => { obj[c.name] = row[i]; });
    const num = (v: unknown) => (v == null ? 0 : Number(v));
    const numOrUndef = (v: unknown) => {
      if (v == null) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const bool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";
    const str = (v: unknown) => (v == null ? "" : String(v));
    const trust = num(obj.trust_score);
    return {
      id: str(obj.id) || `f-${idx}`,
      name: str(obj.name),
      address_stateOrRegion: str(obj.address_stateOrRegion),
      address_city: str(obj.address_city),
      address_zipOrPostcode: str(obj.address_zipOrPostcode),
      latitude: num(obj.latitude),
      longitude: num(obj.longitude),
      emergency_surgery_capability: (str(obj.emergency_surgery_capability) || "Low") as Facility["emergency_surgery_capability"],
      icu_capability: (str(obj.icu_capability) || "Low") as Facility["icu_capability"],
      dialysis_capability: (str(obj.dialysis_capability) || "Low") as Facility["dialysis_capability"],
      neonatal_capability: (str(obj.neonatal_capability) || "Low") as Facility["neonatal_capability"],
      trauma_capability: (str(obj.trauma_capability) || "Low") as Facility["trauma_capability"],
      trust_score: trust,
      risk_warning: trust < 60
        ? "Low trust score — verify capabilities by calling the facility before referral."
        : "Verify current capability and bed availability by calling the facility.",
      recommendation_reason: trust >= 80
        ? "High trust score with verified capability signals matching the parsed need."
        : trust >= 60
          ? "Reasonable capability match — verify before referral."
          : "Limited verified capability — use only if no stronger option is available.",
      has_icu: bool(obj.has_icu),
      has_oxygen: bool(obj.has_oxygen),
      has_operation_theatre: bool(obj.has_operation_theatre),
      has_surgeon: bool(obj.has_surgeon),
      has_anesthesiologist: bool(obj.has_anesthesiologist),
      has_dialysis: bool(obj.has_dialysis),
      has_neonatal_care: bool(obj.has_neonatal_care),
      has_ambulance: bool(obj.has_ambulance),
      is_24_7: bool(obj.is_24_7),
      distance_km: numOrUndef(obj.distance_km),
    };
  });
}

async function runDbxQuery(
  statement: string,
  apiKey: string,
  dbxKey: string,
  warehouseId: string,
): Promise<DbxResp> {
  const res = await fetch(`${DBX_GATEWAY}/2.0/sql/statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": dbxKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      statement,
      wait_timeout: "30s",
      format: "JSON_ARRAY",
      disposition: "INLINE",
    }),
  });
  const data = (await res.json()) as DbxResp;
  if (!res.ok) throw new Error(`Databricks query failed (${res.status})`);
  if (data.status?.state && data.status.state !== "SUCCEEDED") {
    throw new Error(data.status.error?.message || `Databricks state: ${data.status.state}`);
  }
  return data;
}

async function resolveCenter(
  state: string | undefined,
  city: string | undefined,
  pinCode: string | undefined,
  apiKey: string,
  dbxKey: string,
  warehouseId: string,
): Promise<{ lat: number; lng: number } | null> {
  const filters: string[] = ["latitude IS NOT NULL", "longitude IS NOT NULL"];
  if (pinCode?.trim()) {
    filters.push(`address_zipOrPostcode = '${escapeSqlString(pinCode.trim())}'`);
  } else if (city?.trim()) {
    filters.push(`LOWER(address_city) LIKE LOWER('%${escapeSqlString(city.trim())}%')`);
    if (state?.trim()) {
      const variants = getStateVariants(state.trim()).map(escapeSqlString);
      filters.push(`address_stateOrRegion IN ('${variants.join("', '")}')`);
    }
  } else if (state?.trim()) {
    const variants = getStateVariants(state.trim()).map(escapeSqlString);
    filters.push(`address_stateOrRegion IN ('${variants.join("', '")}')`);
  } else {
    return null;
  }
  const stmt = `SELECT AVG(latitude) AS lat, AVG(longitude) AS lng FROM ${TABLE} WHERE ${filters.join(" AND ")} LIMIT 1`;
  try {
    const data = await runDbxQuery(stmt, apiKey, dbxKey, warehouseId);
    const row = data.result?.data_array?.[0];
    if (!row) return null;
    const lat = Number(row[0]);
    const lng = Number(row[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

const SELECT_FIELDS = [
  "name", "address_stateOrRegion", "address_city", "address_zipOrPostcode",
  "latitude", "longitude",
  "emergency_surgery_capability", "icu_capability", "dialysis_capability",
  "trust_score",
  "has_icu", "has_oxygen", "has_operation_theatre", "has_surgeon",
  "has_anesthesiologist", "has_dialysis", "has_neonatal_care",
  "has_ambulance", "is_24_7",
].join(", ");

async function searchFacilities(
  need: MedicalNeed,
  state: string | undefined,
  city: string | undefined,
  pinCode: string | undefined,
  apiKey: string,
  dbxKey: string,
  warehouseId: string,
): Promise<Facility[]> {
  // Try to resolve a center point for proximity sorting.
  const center = await resolveCenter(state, city, pinCode, apiKey, dbxKey, warehouseId);

  const baseWhere: string[] = [];
  if (state?.trim()) {
    const variants = getStateVariants(state.trim()).map(escapeSqlString);
    baseWhere.push(`address_stateOrRegion IN ('${variants.join("', '")}')`);
  }
  const cityFilter = city?.trim()
    ? `LOWER(address_city) LIKE LOWER('%${escapeSqlString(city.trim())}%')`
    : null;
  const pinFilter = pinCode?.trim()
    ? `address_zipOrPostcode = '${escapeSqlString(pinCode.trim())}'`
    : null;
  if (pinFilter) baseWhere.push(pinFilter);
  else if (cityFilter) baseWhere.push(cityFilter);

  const needFilter = buildNeedFilter(need);
  if (needFilter) baseWhere.push(needFilter);

  const buildStatement = (where: string[], withDistance: boolean) => {
    const distExpr = withDistance && center
      ? `, (6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(${center.lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${center.lng})) + sin(radians(${center.lat})) * sin(radians(latitude)))))) AS distance_km`
      : "";
    const allWhere = withDistance && center
      ? [...where, "latitude IS NOT NULL", "longitude IS NOT NULL"]
      : where;
    const whereClause = allWhere.length ? `WHERE ${allWhere.join(" AND ")}` : "";
    const orderBy = withDistance && center
      ? "ORDER BY distance_km ASC, trust_score DESC"
      : "ORDER BY trust_score DESC";
    return `SELECT ${SELECT_FIELDS}${distExpr} FROM ${TABLE} ${whereClause} ${orderBy} LIMIT 5`;
  };

  // First attempt: strict filters + distance sort.
  let data = await runDbxQuery(buildStatement(baseWhere, true), apiKey, dbxKey, warehouseId);
  let facilities = rowsToFacilities(data);

  // Fallback: if strict filters yielded too few results AND we had a city filter,
  // broaden to state-only with distance sort so genuinely closer facilities surface.
  if (facilities.length < 3 && cityFilter && !pinFilter && center) {
    const broadened = baseWhere.filter((w) => w !== cityFilter);
    data = await runDbxQuery(buildStatement(broadened, true), apiKey, dbxKey, warehouseId);
    facilities = rowsToFacilities(data);
  }

  // Final fallback: no center resolved → trust-score sort, original behavior.
  if (facilities.length === 0 && !center) {
    data = await runDbxQuery(buildStatement(baseWhere, false), apiKey, dbxKey, warehouseId);
    facilities = rowsToFacilities(data);
  }

  return facilities;
}

function capabilityForNeed(f: Facility, need: MedicalNeed): string {
  switch (need) {
    case "Emergency Surgery": return `Emergency Surgery: ${f.emergency_surgery_capability}`;
    case "ICU + Oxygen": return `ICU: ${f.icu_capability}${f.has_oxygen ? " + Oxygen" : ""}`;
    case "Dialysis": return `Dialysis: ${f.dialysis_capability}`;
    case "Neonatal Care": return f.has_neonatal_care ? "Neonatal care available" : "Neonatal care not confirmed";
    case "Trauma Care": return `Trauma/Surgery: ${f.emergency_surgery_capability}${f.has_ambulance ? " + Ambulance" : ""}`;
    case "Emergency Care": return `${f.is_24_7 ? "24/7 " : ""}${f.has_ambulance ? "Ambulance · " : ""}ER: ${f.emergency_surgery_capability}`;
    case "Maternal Care": return `${f.has_neonatal_care ? "Neonatal · " : ""}${f.is_24_7 ? "24/7" : "Daytime"}`;
    case "General Medicine": return `${f.is_24_7 ? "24/7 " : ""}General facility`;
    case "Vaccination / Post-exposure Care": return `${f.is_24_7 ? "24/7 " : ""}General/ER facility`;
  }
}

const VACCINE_LIMITATION =
  "The dataset does not directly confirm rabies or other vaccine availability. Please call the facility to confirm vaccine stock before traveling.";

export const Route = createFileRoute("/api/ask-caremap")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const DATABRICKS_API_KEY = process.env.DATABRICKS_API_KEY;
        const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

        if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY is not configured" }, 500);
        if (!DATABRICKS_API_KEY) return jsonResponse({ error: "DATABRICKS_API_KEY is not configured" }, 500);
        if (!WAREHOUSE_ID) return jsonResponse({ error: "DATABRICKS_WAREHOUSE_ID is not configured" }, 500);

        let body: { message?: string; state?: string; city?: string; pinCode?: string };
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }

        const message = (body.message || "").trim();
        if (!message) return jsonResponse({ error: "message is required" }, 400);
        if (message.length > 1000) return jsonResponse({ error: "message too long (max 1000 chars)" }, 400);

        // 1. Parse intent with LLM
        let intent: ParsedIntent;
        try {
          intent = await parseIntentWithLLM(message, LOVABLE_API_KEY);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown AI error";
          return jsonResponse({ error: `Intent parsing failed: ${msg}` }, 502);
        }

        // 2. Query Databricks
        let facilities: Facility[] = [];
        let dbxError: string | null = null;
        try {
          facilities = await searchFacilities(
            intent.medicalNeed,
            body.state,
            body.city,
            body.pinCode,
            LOVABLE_API_KEY,
            DATABRICKS_API_KEY,
            WAREHOUSE_ID,
          );
        } catch (err) {
          dbxError = err instanceof Error ? err.message : "Databricks unavailable";
        }

        // 3. Build per-facility match info (kept on Facility shape so existing FacilityCard works)
        const enriched = facilities.map((f) => ({
          ...f,
          matchedCapability: capabilityForNeed(f, intent.medicalNeed),
        }));

        const dataLimitation =
          intent.medicalNeed === "Vaccination / Post-exposure Care" ? VACCINE_LIMITATION : "";

        return jsonResponse({
          understoodNeed: intent.medicalNeed,
          specialtyNeed: intent.specialtyNeed,
          urgency: intent.urgency,
          userExplanation: intent.explanationForUser,
          safetyMessage: intent.safetyMessage,
          dataLimitation,
          dataSourceError: dbxError,
          facilities: enriched,
        });
      },
    },
  },
});
