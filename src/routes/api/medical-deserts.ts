import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/databricks";
const TABLE = "workspace.default.healthcare_facility_intelligence";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

interface DatabricksColumn {
  name: string;
}
interface DatabricksStatementResponse {
  status?: { state?: string; error?: { message?: string } };
  manifest?: { schema?: { columns?: DatabricksColumn[] } };
  result?: { data_array?: Array<Array<string | number | null>> };
}

export interface MedicalDesertCity {
  state: string;
  city: string;
  total_facilities: number;
  high_surgery_facilities: number;
  high_icu_facilities: number;
  dialysis_facilities: number;
  avg_trust_score: number;
  warning_facilities: number;
  risk_level: "High" | "Medium" | "Low";
}

export const Route = createFileRoute("/api/medical-deserts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const DATABRICKS_API_KEY = process.env.DATABRICKS_API_KEY;
        const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;
        if (!LOVABLE_API_KEY || !DATABRICKS_API_KEY || !WAREHOUSE_ID) {
          return jsonResponse(
            { error: "Databricks credentials are not configured" },
            500,
          );
        }

        const statement = `
          SELECT
            address_stateOrRegion AS state,
            address_city AS city,
            COUNT(*) AS total_facilities,
            SUM(CASE WHEN emergency_surgery_capability = 'High' THEN 1 ELSE 0 END) AS high_surgery_facilities,
            SUM(CASE WHEN icu_capability = 'High' THEN 1 ELSE 0 END) AS high_icu_facilities,
            SUM(CASE WHEN dialysis_capability IN ('High','Medium') THEN 1 ELSE 0 END) AS dialysis_facilities,
            AVG(trust_score) AS avg_trust_score,
            SUM(CASE WHEN risk_warning IS NOT NULL AND TRIM(risk_warning) <> '' THEN 1 ELSE 0 END) AS warning_facilities
          FROM ${TABLE}
          WHERE address_stateOrRegion IS NOT NULL
            AND address_city IS NOT NULL
            AND TRIM(address_stateOrRegion) <> ''
            AND TRIM(address_city) <> ''
          GROUP BY address_stateOrRegion, address_city
        `;

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
            return jsonResponse({ error: `Databricks query failed [${dbxRes.status}]` }, 502);
          }
          const stmtState = data.status?.state;
          if (stmtState && stmtState !== "SUCCEEDED") {
            return jsonResponse(
              { error: data.status?.error?.message || `Statement state: ${stmtState}` },
              502,
            );
          }

          const cols = data.manifest?.schema?.columns ?? [];
          const rows = data.result?.data_array ?? [];
          const idx = (name: string) => cols.findIndex((c) => c.name === name);
          const iState = idx("state");
          const iCity = idx("city");
          const iTotal = idx("total_facilities");
          const iHSurg = idx("high_surgery_facilities");
          const iHIcu = idx("high_icu_facilities");
          const iDial = idx("dialysis_facilities");
          const iAvg = idx("avg_trust_score");
          const iWarn = idx("warning_facilities");

          const cities: MedicalDesertCity[] = rows.map((row) => {
            const total = Number(row[iTotal] ?? 0);
            const highSurg = Number(row[iHSurg] ?? 0);
            const highIcu = Number(row[iHIcu] ?? 0);
            const dial = Number(row[iDial] ?? 0);
            const avg = Number(row[iAvg] ?? 0);
            const warn = Number(row[iWarn] ?? 0);
            let risk: "High" | "Medium" | "Low";
            if (highSurg === 0 && highIcu === 0) risk = "High";
            else if (avg < 60) risk = "Medium";
            else risk = "Low";
            return {
              state: String(row[iState] ?? ""),
              city: String(row[iCity] ?? ""),
              total_facilities: total,
              high_surgery_facilities: highSurg,
              high_icu_facilities: highIcu,
              dialysis_facilities: dial,
              avg_trust_score: Math.round(avg * 10) / 10,
              warning_facilities: warn,
              risk_level: risk,
            };
          });

          // Sort highest-risk first: High > Medium > Low; within group: lower avg_trust_score first
          const rank = { High: 0, Medium: 1, Low: 2 } as const;
          cities.sort((a, b) => {
            const r = rank[a.risk_level] - rank[b.risk_level];
            if (r !== 0) return r;
            return a.avg_trust_score - b.avg_trust_score;
          });

          return jsonResponse({ cities });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return jsonResponse({ error: message }, 502);
        }
      },
    },
  },
});
