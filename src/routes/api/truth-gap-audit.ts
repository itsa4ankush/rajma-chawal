import { createFileRoute } from "@tanstack/react-router";
import type { Facility } from "@/lib/facilities";
import { getStateVariants } from "@/lib/location-normalization";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/databricks";
const TABLE = "workspace.default.healthcare_facility_intelligence";

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

interface DatabricksColumn {
  name: string;
  type_name?: string;
}
interface DatabricksStatementResponse {
  status?: { state?: string; error?: { message?: string } };
  manifest?: { schema?: { columns?: DatabricksColumn[] } };
  result?: { data_array?: Array<Array<string | number | boolean | null>> };
}

const SELECT_FIELDS = [
  "facility_row_id",
  "source_table",
  "name",
  "address_city",
  "address_stateOrRegion",
  "address_zipOrPostcode",
  "latitude",
  "longitude",
  "trust_score",
  "claimed_surgery",
  "claimed_icu",
  "claimed_emergency",
  "claimed_dialysis",
  "claimed_neonatal",
  "claimed_trauma",
  "audit_flags",
  "truth_gap_flag_count",
  "audit_severity",
  "audit_reason",
  "description",
  "specialties",
  "procedure",
  "equipment",
  "capability",
  "numberDoctors",
  "capacity",
  "has_icu",
  "has_oxygen",
  "has_operation_theatre",
  "has_surgeon",
  "has_anesthesiologist",
  "has_dialysis",
  "has_neonatal_care",
  "has_ambulance",
  "is_24_7",
  "emergency_surgery_capability",
  "icu_capability",
  "dialysis_capability",
];

function rowsToFacilities(resp: DatabricksStatementResponse): Facility[] {
  const cols = resp.manifest?.schema?.columns ?? [];
  const rows = resp.result?.data_array ?? [];
  return rows.map((row, idx) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c.name] = row[i]));
    const num = (v: unknown) => (v == null ? 0 : Number(v));
    const bool = (v: unknown) =>
      v === true || v === 1 || v === "1" || v === "true";
    const str = (v: unknown) => (v == null ? "" : String(v));
    const optStr = (v: unknown) =>
      v == null || String(v).trim() === "" ? undefined : String(v);
    const optNumOrStr = (v: unknown) => {
      if (v == null || String(v).trim() === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : String(v);
    };
    const sev = optStr(obj.audit_severity);
    const severity =
      sev === "High" || sev === "Medium" || sev === "Low" ? sev : undefined;
    const rowId = optStr(obj.facility_row_id);
    return {
      id: rowId ?? `audit-${idx}`,
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
      icu_capability: (str(obj.icu_capability) ||
        "Low") as Facility["icu_capability"],
      dialysis_capability: (str(obj.dialysis_capability) ||
        "Low") as Facility["dialysis_capability"],
      neonatal_capability: "Low",
      trauma_capability: "Low",
      trust_score: num(obj.trust_score),
      risk_warning: "",
      recommendation_reason: "",
      has_icu: bool(obj.has_icu),
      has_oxygen: bool(obj.has_oxygen),
      has_operation_theatre: bool(obj.has_operation_theatre),
      has_surgeon: bool(obj.has_surgeon),
      has_anesthesiologist: bool(obj.has_anesthesiologist),
      has_dialysis: bool(obj.has_dialysis),
      has_neonatal_care: bool(obj.has_neonatal_care),
      has_ambulance: bool(obj.has_ambulance),
      is_24_7: bool(obj.is_24_7),
      claimed_surgery: bool(obj.claimed_surgery),
      claimed_icu: bool(obj.claimed_icu),
      claimed_emergency: bool(obj.claimed_emergency),
      claimed_dialysis: bool(obj.claimed_dialysis),
      claimed_neonatal: bool(obj.claimed_neonatal),
      claimed_trauma: bool(obj.claimed_trauma),
      audit_flags: optStr(obj.audit_flags),
      truth_gap_flag_count: num(obj.truth_gap_flag_count),
      audit_severity: severity,
      audit_reason: optStr(obj.audit_reason),
    };
  });
}

export const Route = createFileRoute("/api/truth-gap-audit")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }: { request: Request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const DATABRICKS_API_KEY = (process.env.DATABRICKS_API_KEY_1 || process.env.DATABRICKS_API_KEY);
        const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

        if (!LOVABLE_API_KEY || !DATABRICKS_API_KEY || !WAREHOUSE_ID) {
          return jsonResponse(
            { error: "Databricks credentials are not configured" },
            500,
          );
        }

        let body: {
          state?: string;
          city?: string;
          severity?: "High" | "Medium" | "Low";
          flagType?: string;
          limit?: number;
        } = {};
        try {
          body = await request.json();
        } catch {
          // empty body OK
        }

        const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500);
        const where: string[] = ["truth_gap_flag_count > 0"];
        if (body.state?.trim()) {
          const variants = getStateVariants(body.state.trim()).map(
            escapeSqlString,
          );
          where.push(`address_stateOrRegion IN ('${variants.join("', '")}')`);
        }
        if (body.city?.trim()) {
          where.push(
            `LOWER(address_city) LIKE LOWER('%${escapeSqlString(body.city.trim())}%')`,
          );
        }
        if (
          body.severity === "High" ||
          body.severity === "Medium" ||
          body.severity === "Low"
        ) {
          where.push(`audit_severity = '${body.severity}'`);
        }
        if (body.flagType?.trim()) {
          where.push(
            `LOWER(audit_flags) LIKE LOWER('%${escapeSqlString(body.flagType.trim())}%')`,
          );
        }

        const statement = `SELECT ${SELECT_FIELDS.join(", ")} FROM ${TABLE} WHERE ${where.join(" AND ")} ORDER BY truth_gap_flag_count DESC, trust_score ASC LIMIT ${limit}`;

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
              { error: `Databricks query failed [${dbxRes.status}]`, details: data },
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
