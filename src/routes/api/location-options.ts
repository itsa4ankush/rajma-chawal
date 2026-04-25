import { createFileRoute } from "@tanstack/react-router";
import { getCanonicalState, isValidLocationCity } from "@/lib/location-normalization";
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

interface DatabricksStatementResponse {
  status?: { state?: string; error?: { message?: string } };
  result?: { data_array?: Array<Array<string | null>> };
}

async function runQuery(statement: string): Promise<DatabricksStatementResponse> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY!;
  const DATABRICKS_API_KEY = process.env.DATABRICKS_API_KEY!;
  const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID!;
  const res = await fetch(`${GATEWAY_URL}/2.0/sql/statements`, {
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
  const data = (await res.json()) as DatabricksStatementResponse;
  if (!res.ok) {
    throw new Error(`Databricks query failed [${res.status}]`);
  }
  const stmtState = data.status?.state;
  if (stmtState && stmtState !== "SUCCEEDED") {
    throw new Error(data.status?.error?.message || `Statement state: ${stmtState}`);
  }
  return data;
}

export const Route = createFileRoute("/api/location-options")({
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

        try {
          const data = await runQuery(
            `SELECT DISTINCT address_stateOrRegion, address_city
             FROM ${TABLE}
             WHERE address_stateOrRegion IS NOT NULL
               AND address_city IS NOT NULL
               AND TRIM(address_stateOrRegion) <> ''
               AND TRIM(address_city) <> ''
             ORDER BY address_stateOrRegion, address_city`,
          );

          const rows = data.result?.data_array ?? [];
          const citiesByState: Record<string, string[]> = {};
          for (const row of rows) {
            const rawState = (row[0] ?? "").toString().trim();
            const cityName = (row[1] ?? "").toString().trim();
            const stateName = getCanonicalState(rawState);
            if (!stateName || !isValidLocationCity(cityName)) continue;
            if (!citiesByState[stateName]) citiesByState[stateName] = [];
            if (!citiesByState[stateName].includes(cityName)) {
              citiesByState[stateName].push(cityName);
            }
          }
          const states = Object.keys(citiesByState).sort((a, b) =>
            a.localeCompare(b),
          );
          for (const s of states) {
            citiesByState[s].sort((a, b) => a.localeCompare(b));
          }

          return jsonResponse({ states, citiesByState });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return jsonResponse({ error: message }, 502);
        }
      },
    },
  },
});
