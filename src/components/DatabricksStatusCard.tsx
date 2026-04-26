import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Health =
  | { status: "loading" }
  | { status: "ok"; totalFacilities: number }
  | { status: "error"; message: string };

export function DatabricksStatusCard() {
  const [health, setHealth] = useState<Health>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/databricks-health")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.status === "ok") {
          setHealth({ status: "ok", totalFacilities: Number(data.totalFacilities ?? 0) });
        } else {
          setHealth({ status: "error", message: data?.message ?? "Unknown error" });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setHealth({ status: "error", message: err?.message ?? "Network error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 border border-paper/30 px-3 py-1.5 font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-paper/80">
      {health.status === "loading" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Checking Databricks…</span>
        </>
      ) : health.status === "ok" ? (
        <>
          <CheckCircle2 className="h-3 w-3 text-paper" />
          <span>
            Databricks Connected ·{" "}
            <span className="text-paper">
              {health.totalFacilities.toLocaleString()}
            </span>{" "}
            Facilities
          </span>
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3 text-destructive" />
          <span title={health.message}>Databricks Unavailable</span>
        </>
      )}
    </div>
  );
}
