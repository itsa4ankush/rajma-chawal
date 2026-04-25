import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Building2, Database, Droplet, HeartPulse, Loader2, Scissors, TestTube2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FACILITIES, type Facility } from "@/lib/facilities";

type RiskLevel = "High" | "Medium" | "Low";

interface DesertCity {
  state: string;
  city: string;
  total_facilities: number;
  high_surgery_facilities: number;
  high_icu_facilities: number;
  dialysis_facilities: number;
  avg_trust_score: number;
  warning_facilities: number;
  risk_level: RiskLevel;
}

const riskStyles: Record<RiskLevel, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/30",
  Medium: "bg-warning/15 text-warning-foreground border-warning/40",
  Low: "bg-success/10 text-success border-success/30",
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  tone: "primary" | "success" | "accent" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="border-border/70">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {value.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildDemoCities(facilities: Facility[]): DesertCity[] {
  const map = new Map<string, DesertCity & { _trustSum: number }>();
  for (const f of facilities) {
    const key = `${f.address_city}|${f.address_stateOrRegion}`;
    const r =
      map.get(key) ??
      {
        state: f.address_stateOrRegion,
        city: f.address_city,
        total_facilities: 0,
        high_surgery_facilities: 0,
        high_icu_facilities: 0,
        dialysis_facilities: 0,
        avg_trust_score: 0,
        warning_facilities: 0,
        risk_level: "Low" as RiskLevel,
        _trustSum: 0,
      };
    r.total_facilities += 1;
    r._trustSum += f.trust_score;
    if (f.emergency_surgery_capability === "High") r.high_surgery_facilities += 1;
    if (f.icu_capability === "High") r.high_icu_facilities += 1;
    if (f.dialysis_capability === "High" || f.dialysis_capability === "Medium")
      r.dialysis_facilities += 1;
    if (f.trust_score < 60) r.warning_facilities += 1;
    map.set(key, r);
  }
  const out: DesertCity[] = [];
  for (const r of map.values()) {
    r.avg_trust_score = Math.round((r._trustSum / r.total_facilities) * 10) / 10;
    if (r.high_surgery_facilities === 0 && r.high_icu_facilities === 0) r.risk_level = "High";
    else if (r.avg_trust_score < 60) r.risk_level = "Medium";
    else r.risk_level = "Low";
    const { _trustSum: _, ...rest } = r;
    out.push(rest);
  }
  const rank = { High: 0, Medium: 1, Low: 2 } as const;
  out.sort(
    (a, b) =>
      rank[a.risk_level] - rank[b.risk_level] || a.avg_trust_score - b.avg_trust_score,
  );
  return out;
}

export function PlannerDashboard() {
  const [cities, setCities] = useState<DesertCity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "demo">("live");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/medical-deserts")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `Request failed (${r.status})`);
        return data as { cities: DesertCity[] };
      })
      .then((data) => {
        if (cancelled) return;
        setCities(data.cities ?? []);
        setDataSource("live");
      })
      .catch(() => {
        if (cancelled) return;
        setCities(buildDemoCities(FACILITIES));
        setDataSource("demo");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = (cities ?? []).reduce(
    (acc, c) => {
      acc.total += c.total_facilities;
      acc.highSurgery += c.high_surgery_facilities;
      acc.highICU += c.high_icu_facilities;
      acc.dialysis += c.dialysis_facilities;
      acc.warnings += c.warning_facilities;
      return acc;
    },
    { total: 0, highSurgery: 0, highICU: 0, dialysis: 0, warnings: 0 },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border/70 bg-card p-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading planner data…
      </div>
    );
  }

  if (!cities || cities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No facility data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            dataSource === "live"
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/40 bg-warning/15 text-warning-foreground"
          }`}
        >
          {dataSource === "live" ? (
            <>
              <Database className="h-3 w-3" /> Live Databricks data
            </>
          ) : (
            <>
              <TestTube2 className="h-3 w-3" /> Demo data
            </>
          )}
        </span>
      </div>

      {dataSource === "demo" && (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Live Databricks connection is unavailable.</AlertTitle>
          <AlertDescription>
            Showing demo planner data so the dashboard keeps working.
          </AlertDescription>
        </Alert>
      )}

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatCard label="Total facilities analyzed" value={totals.total} icon={Building2} tone="primary" />
        <StatCard
          label="High-trust emergency surgery"
          value={totals.highSurgery}
          icon={Scissors}
          tone="success"
        />
        <StatCard label="High-trust ICU" value={totals.highICU} icon={HeartPulse} tone="accent" />
        <StatCard label="Dialysis facilities" value={totals.dialysis} icon={Droplet} tone="primary" />
        <StatCard
          label="Facilities with warnings"
          value={totals.warnings}
          icon={AlertTriangle}
          tone="warning"
        />
      </section>

      <section
        aria-label="Medical Desert View"
        className="rounded-2xl border border-border/70 bg-card shadow-sm"
      >
        <div className="border-b border-border/60 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">Medical Desert View</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cities ranked by gaps in high-capability emergency, ICU, and dialysis coverage.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">High surgery</TableHead>
                <TableHead className="text-right">High ICU</TableHead>
                <TableHead className="text-right">Dialysis</TableHead>
                <TableHead className="text-right">Avg trust</TableHead>
                <TableHead className="text-right">Warnings</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.slice(0, 100).map((r) => (
                <TableRow key={`${r.city}-${r.state}`}>
                  <TableCell className="font-medium">{r.city}</TableCell>
                  <TableCell className="text-muted-foreground">{r.state}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_facilities}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.high_surgery_facilities}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.high_icu_facilities}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.dialysis_facilities}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avg_trust_score}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.warning_facilities}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskStyles[r.risk_level]}`}
                    >
                      {r.risk_level}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
