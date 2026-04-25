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
    <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
      {health.status === "loading" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Checking Databricks…</span>
        </>
      ) : health.status === "ok" ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
          <span>
            Databricks connected ·{" "}
            <span className="font-medium text-foreground">
              {health.totalFacilities.toLocaleString()}
            </span>{" "}
            facilities
          </span>
        </>
      ) : (
        <>
          <XCircle className="h-3.5 w-3.5 text-destructive" />
          <span title={health.message}>Databricks unavailable</span>
        </>
      )}
    </div>
  );
}
