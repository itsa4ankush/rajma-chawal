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

interface DatabricksStatementResponse {
  status?: { state?: string; error?: { message?: string } };
  result?: { data_array?: Array<Array<string | number | null>> };
}

export const Route = createFileRoute("/api/databricks-health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const DATABRICKS_API_KEY = process.env.DATABRICKS_API_KEY;
        const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

        if (!LOVABLE_API_KEY || !DATABRICKS_API_KEY || !WAREHOUSE_ID) {
          return jsonResponse({
            status: "error",
            message: "Databricks credentials are not configured",
          });
        }

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
              statement: `SELECT COUNT(*) as total FROM ${TABLE}`,
              wait_timeout: "30s",
              format: "JSON_ARRAY",
              disposition: "INLINE",
            }),
          });

          const rawText = await dbxRes.text();
          let data: DatabricksStatementResponse = {};
          try { data = JSON.parse(rawText) as DatabricksStatementResponse; } catch { /* keep raw */ }
          if (!dbxRes.ok) {
            const detail = (data as { message?: string })?.message
              || data.status?.error?.message
              || rawText.slice(0, 300);
            return jsonResponse({
              status: "error",
              message: `Databricks query failed [${dbxRes.status}]: ${detail}`,
            });
          }
          const stmtState = data.status?.state;
          if (stmtState && stmtState !== "SUCCEEDED") {
            return jsonResponse({
              status: "error",
              message: data.status?.error?.message || `Statement state: ${stmtState}`,
            });
          }
          const total = Number(data.result?.data_array?.[0]?.[0] ?? 0);
          return jsonResponse({ status: "ok", totalFacilities: total });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return jsonResponse({ status: "error", message });
        }
      },
    },
  },
});
