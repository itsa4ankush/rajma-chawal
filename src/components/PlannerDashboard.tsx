import { AlertTriangle, Building2, Droplet, HeartPulse, Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FACILITIES, type Facility } from "@/lib/facilities";

type RiskLevel = "High" | "Medium" | "Low";

const isHigh = (c: Facility[keyof Facility]) => c === "High";
const isHighOrMedium = (c: Facility[keyof Facility]) => c === "High" || c === "Medium";

function computeStats() {
  const total = FACILITIES.length;
  const highSurgery = FACILITIES.filter((f) => isHigh(f.emergencySurgeryCapability)).length;
  const highICU = FACILITIES.filter((f) => isHigh(f.icuCapability)).length;
  const dialysis = FACILITIES.filter((f) => isHighOrMedium(f.dialysisCapability)).length;
  const withWarnings = FACILITIES.filter(
    (f) => f.riskWarning && !/no active warning/i.test(f.riskWarning),
  ).length;
  return { total, highSurgery, highICU, dialysis, withWarnings };
}

interface CityRow {
  city: string;
  state: string;
  total: number;
  highSurgery: number;
  highICU: number;
  dialysis: number;
  risk: RiskLevel;
}

function computeCityRows(): CityRow[] {
  const map = new Map<string, CityRow>();
  for (const f of FACILITIES) {
    const key = `${f.city}|${f.state}`;
    const row =
      map.get(key) ??
      ({
        city: f.city,
        state: f.state,
        total: 0,
        highSurgery: 0,
        highICU: 0,
        dialysis: 0,
        risk: "Low" as RiskLevel,
      } satisfies CityRow);
    row.total += 1;
    if (isHigh(f.emergencySurgeryCapability)) row.highSurgery += 1;
    if (isHigh(f.icuCapability)) row.highICU += 1;
    if (isHighOrMedium(f.dialysisCapability)) row.dialysis += 1;
    map.set(key, row);
  }
  // Risk: High if no high-surgery AND no high-ICU; Medium if missing one; Low otherwise
  for (const row of map.values()) {
    if (row.highSurgery === 0 && row.highICU === 0) row.risk = "High";
    else if (row.highSurgery === 0 || row.highICU === 0 || row.dialysis === 0) row.risk = "Medium";
    else row.risk = "Low";
  }
  return Array.from(map.values()).sort((a, b) => {
    const order: Record<RiskLevel, number> = { High: 0, Medium: 1, Low: 2 };
    return order[a.risk] - order[b.risk] || a.state.localeCompare(b.state);
  });
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
          <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlannerDashboard() {
  const stats = computeStats();
  const rows = computeCityRows();

  return (
    <div className="space-y-6">
      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatCard label="Total facilities analyzed" value={stats.total} icon={Building2} tone="primary" />
        <StatCard
          label="High-trust emergency surgery"
          value={stats.highSurgery}
          icon={Scissors}
          tone="success"
        />
        <StatCard label="High-trust ICU" value={stats.highICU} icon={HeartPulse} tone="accent" />
        <StatCard label="Dialysis facilities" value={stats.dialysis} icon={Droplet} tone="primary" />
        <StatCard
          label="Facilities with warnings"
          value={stats.withWarnings}
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
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.city}-${r.state}`}>
                  <TableCell className="font-medium">{r.city}</TableCell>
                  <TableCell className="text-muted-foreground">{r.state}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.highSurgery}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.highICU}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.dialysis}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskStyles[r.risk]}`}
                    >
                      {r.risk}
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
