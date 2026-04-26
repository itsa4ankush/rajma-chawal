import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Database,
  Droplet,
  HeartPulse,
  Loader2,
  Scissors,
  TestTube2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  High: "bg-destructive text-paper",
  Medium: "bg-warning text-paper",
  Low: "bg-ink text-paper",
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
}) {
  return (
    <div className="border border-hairline bg-paper p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
          {label}
        </span>
        <Icon className="h-4 w-4 text-ink shrink-0" />
      </div>
      <div className="mt-3 font-display text-4xl sm:text-5xl font-black leading-none text-ink tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
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
      <div className="flex items-center justify-center border border-hairline bg-paper p-12 font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading planner data…
      </div>
    );
  }

  if (!cities || cities.length === 0) {
    return (
      <div className="border border-hairline bg-paper p-10 text-center font-serif text-base text-page-ink">
        No facility data available.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Source badge — mono caps */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption">
          District-level capability survey
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 font-mono uppercase tracking-[0.08em] text-[10px] font-bold ${
            dataSource === "live" ? "bg-ink text-paper" : "bg-warning text-paper"
          }`}
        >
          {dataSource === "live" ? (
            <>
              <Database className="h-3 w-3" /> Live
            </>
          ) : (
            <>
              <TestTube2 className="h-3 w-3" /> Demo
            </>
          )}
        </span>
      </div>

      {dataSource === "demo" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Live Databricks unavailable</AlertTitle>
          <AlertDescription>
            Showing demo planner data so the dashboard keeps working.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat grid — five flat blocks divided by hairlines */}
      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-5 border-t border-l border-hairline [&>div]:border-r [&>div]:border-b [&>div]:border-hairline"
      >
        <StatCard label="Total Facilities" value={totals.total} icon={Building2} />
        <StatCard label="High-Trust Surgery" value={totals.highSurgery} icon={Scissors} />
        <StatCard label="High-Trust ICU" value={totals.highICU} icon={HeartPulse} />
        <StatCard label="Dialysis Facilities" value={totals.dialysis} icon={Droplet} />
        <StatCard label="With Warnings" value={totals.warnings} icon={AlertTriangle} />
      </section>

      {/* Medical Desert View — black ribbon header + flat table */}
      <section aria-label="Medical Desert View">
        <div className="ribbon-bar">Medical Desert View</div>
        <div className="border border-t-0 border-hairline">
          <div className="border-b border-hairline p-4 sm:p-5">
            <h2 className="font-display text-2xl sm:text-3xl font-black leading-tight text-ink">
              Cities ranked by capability gap
            </h2>
            <p className="mt-1 font-serif text-sm text-page-ink">
              Sorted by emergency surgery, ICU and dialysis coverage, then
              average trust score.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-ink">
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink">City</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink">State</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink text-right">Total</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink text-right">Surgery</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink text-right">ICU</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink text-right">Dialysis</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink text-right">Trust</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink text-right">Warn</TableHead>
                  <TableHead className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.slice(0, 100).map((r) => (
                  <TableRow key={`${r.city}-${r.state}`} className="border-b border-hairline">
                    <TableCell className="font-serif font-semibold text-ink">{r.city}</TableCell>
                    <TableCell className="font-serif text-caption">{r.state}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[12px]">{r.total_facilities}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[12px]">{r.high_surgery_facilities}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[12px]">{r.high_icu_facilities}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[12px]">{r.dialysis_facilities}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[12px]">{r.avg_trust_score}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[12px]">{r.warning_facilities}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 font-mono uppercase tracking-[0.08em] text-[10px] font-bold ${riskStyles[r.risk_level]}`}
                      >
                        {r.risk_level}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  );
}
