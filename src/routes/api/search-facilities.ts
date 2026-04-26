import { createFileRoute } from "@tanstack/react-router";
import type { Facility, MedicalNeed } from "@/lib/facilities";
import { getStateVariants } from "@/lib/location-normalization";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/databricks";
const TABLE = "workspace.default.healthcare_facility_intelligence";

const SUPPORTED_NEEDS: MedicalNeed[] = [
  "Emergency Surgery",
  "ICU + Oxygen",
  "Dialysis",
  "Neonatal Care",
  "Trauma Care",
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

function buildNeedFilter(need: MedicalNeed | undefined): string | null {
  if (!need) return null;
  switch (need) {
    case "Emergency Surgery":
    case "Trauma Care":
      return "emergency_surgery_capability IN ('High','Medium')";
    case "ICU + Oxygen":
      return "icu_capability IN ('High','Medium')";
    case "Dialysis":
      return "dialysis_capability IN ('High','Medium')";
    case "Neonatal Care":
      return "has_neonatal_care = 1";
    default:
      return null;
  }
}

function escapeSqlString(input: string): string {
  return input.replace(/'/g, "''");
}

interface DatabricksColumn {
  name: string;
  type_name?: string;
}

interface DatabricksStatementResponse {
  statement_id?: string;
  status?: { state?: string; error?: { message?: string } };
  manifest?: { schema?: { columns?: DatabricksColumn[] } };
  result?: { data_array?: Array<Array<string | number | boolean | null>> };
}

function rowsToFacilities(resp: DatabricksStatementResponse): Facility[] {
  const cols = resp.manifest?.schema?.columns ?? [];
  const rows = resp.result?.data_array ?? [];
  return rows.map((row, idx) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    const num = (v: unknown) => (v == null ? 0 : Number(v));
    const bool = (v: unknown) =>
      v === true || v === 1 || v === "1" || v === "true";
    const str = (v: unknown) => (v == null ? "" : String(v));
    const optStr = (v: unknown) => (v == null || String(v).trim() === "" ? undefined : String(v));
    const optNumOrStr = (v: unknown) => {
      if (v == null || String(v).trim() === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : String(v);
    };
    const rowId = optStr(obj.facility_row_id) ?? optStr(obj.id);
    return {
      id: rowId ?? `f-${idx}`,
      facility_row_id: rowId,
      source_table: optStr(obj.source_table) ?? TABLE,
      name: str(obj.name),
      address_stateOrRegion: str(obj.address_stateOrRegion),
      address_city: str(obj.address_city),
      address_zipOrPostcode: str(obj.address_zipOrPostcode),
      latitude: num(obj.latitude),
      longitude: num(obj.longitude),
      description: optStr(obj.description),
      specialties: optStr(obj.specialties),
      procedure: optStr(obj.procedure),
      equipment: optStr(obj.equipment),
      capability: optStr(obj.capability),
      numberDoctors: optNumOrStr(obj.numberDoctors),
      capacity: optNumOrStr(obj.capacity),
      emergency_surgery_capability: (str(obj.emergency_surgery_capability) ||
        "Low") as Facility["emergency_surgery_capability"],
      icu_capability: (str(obj.icu_capability) || "Low") as Facility["icu_capability"],
      dialysis_capability: (str(obj.dialysis_capability) ||
        "Low") as Facility["dialysis_capability"],
      neonatal_capability: (str(obj.neonatal_capability) ||
        "Low") as Facility["neonatal_capability"],
      trauma_capability: (str(obj.trauma_capability) || "Low") as Facility["trauma_capability"],
      trust_score: num(obj.trust_score),
      risk_warning:
        num(obj.trust_score) < 60
          ? "Low trust score — verify capabilities before referral"
          : "",
      recommendation_reason:
        num(obj.trust_score) >= 80
          ? "High trust score with verified capability signals."
          : num(obj.trust_score) >= 60
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
    };
  });
}

export const Route = createFileRoute("/api/search-facilities")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }: { request: Request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const DATABRICKS_API_KEY = (process.env.DATABRICKS_API_KEY || process.env.DATABRICKS_API_KEY_1);
        const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

        if (!LOVABLE_API_KEY) {
          return jsonResponse({ error: "LOVABLE_API_KEY is not configured" }, 500);
        }
        if (!DATABRICKS_API_KEY) {
          return jsonResponse({ error: "DATABRICKS_API_KEY is not configured" }, 500);
        }
        if (!WAREHOUSE_ID) {
          return jsonResponse(
            { error: "DATABRICKS_WAREHOUSE_ID secret is not configured" },
            500,
          );
        }

        let body: { state?: string; city?: string; medicalNeed?: MedicalNeed };
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const { state, city, medicalNeed } = body;
        if (medicalNeed && !SUPPORTED_NEEDS.includes(medicalNeed)) {
          return jsonResponse(
            { error: `Unsupported medicalNeed: ${medicalNeed}` },
            400,
          );
        }

        const where: string[] = [];
        if (state?.trim()) {
          const variants = getStateVariants(state.trim()).map(escapeSqlString);
          where.push(`address_stateOrRegion IN ('${variants.join("', '")}')`);
        }
        if (city?.trim()) {
          where.push(
            `LOWER(address_city) LIKE LOWER('%${escapeSqlString(city.trim())}%')`,
          );
        }
        const needFilter = buildNeedFilter(medicalNeed);
        if (needFilter) where.push(needFilter);

        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const SELECT_FIELDS = [
          "facility_row_id",
          "source_table",
          "name",
          "address_stateOrRegion",
          "address_city",
          "address_zipOrPostcode",
          "latitude",
          "longitude",
          "description",
          "specialties",
          "procedure",
          "equipment",
          "capability",
          "numberDoctors",
          "capacity",
          "emergency_surgery_capability",
          "icu_capability",
          "dialysis_capability",
          "trust_score",
          "has_icu",
          "has_oxygen",
          "has_operation_theatre",
          "has_surgeon",
          "has_anesthesiologist",
          "has_dialysis",
          "has_neonatal_care",
          "has_ambulance",
          "is_24_7",
        ].join(", ");
        const statement = `SELECT ${SELECT_FIELDS} FROM ${TABLE} ${whereClause} ORDER BY trust_score DESC LIMIT 20`;

        try {
          const dbxRes = await fetch(`${GATEWAY_URL}/2.0/sql/statements`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": DATABRICKS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              warehouse_id: WAREHOUSE_ID,
              statement,
              wait_timeout: "30s",
              format: "JSON_ARRAY",
              disposition: "INLINE",
            }),
          });

          const data = (await dbxRes.json()) as DatabricksStatementResponse;
          if (!dbxRes.ok) {
            return jsonResponse(
              {
                error: `Databricks query failed [${dbxRes.status}]`,
                details: data,
              },
              502,
            );
          }
          const stmtState = data.status?.state;
          if (stmtState && stmtState !== "SUCCEEDED") {
            return jsonResponse(
              {
                error: `Databricks statement state: ${stmtState}`,
                details: data.status?.error?.message,
              },
              502,
            );
          }

          const facilities = rowsToFacilities(data);
          return jsonResponse({ facilities });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return jsonResponse({ error: `Server error: ${message}` }, 500);
        }
      },
    },
  },
});
