import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Baby,
  HeartPulse,
  Loader2,
  MapPin,
  Scissors,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FacilityCard } from "@/components/FacilityCard";
import type { Facility } from "@/lib/facilities";
import { INDIAN_STATES } from "@/lib/facilities";

type Severity = "High" | "Medium" | "Low";

const FLAG_TYPES = [
  { value: "surgery", label: "Surgery mismatch" },
  { value: "icu", label: "ICU mismatch" },
  { value: "emergency", label: "Emergency mismatch" },
  { value: "neonatal", label: "Neonatal mismatch" },
  { value: "dialysis", label: "Dialysis mismatch" },
  { value: "trauma", label: "Trauma mismatch" },
];

function severityBadgeClass(s?: Severity) {
  if (s === "High") return "bg-destructive text-white";
  if (s === "Medium") return "bg-warning text-ink";
  return "bg-ink text-white";
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: typeof Scissors;
  tone?: "neutral" | "high";
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-4 shadow-[var(--shadow-clay)]">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
          {label}
        </span>
        <Icon
          className={`h-4 w-4 shrink-0 ${tone === "high" ? "text-destructive" : "text-ink"}`}
        />
      </div>
      <div
        className={`mt-3 font-display text-3xl sm:text-4xl font-black leading-none tabular-nums ${
          tone === "high" ? "text-destructive" : "text-ink"
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function flagsContain(flags: string | undefined, key: string): boolean {
  if (!flags) return false;
  return flags.toLowerCase().includes(key);
}

function FlagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-hairline bg-oat-light px-2 py-0.5 font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-ink">
      <AlertTriangle className="h-3 w-3" />
      {children}
    </span>
  );
}

function humanizeFlag(flag: string): string {
  return flag
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function FlaggedCard({
  facility,
  onView,
}: {
  facility: Facility;
  onView: () => void;
}) {
  const flags = (facility.audit_flags ?? "")
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <article className="flex h-full flex-col rounded-2xl border border-hairline bg-card p-4 shadow-[var(--shadow-clay)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-base font-semibold leading-snug tracking-[-0.32px] text-ink">
            {facility.name}
          </h3>
          <p className="mt-0.5 font-sans text-[13px] leading-snug text-caption flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {facility.address_city}, {facility.address_stateOrRegion}
            </span>
          </p>
        </div>
        <span
          className={`shrink-0 font-mono uppercase tracking-[0.08em] text-[10px] font-bold px-2 py-1 rounded-md ${severityBadgeClass(facility.audit_severity)}`}
        >
          {facility.audit_severity ?? "—"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-hairline pt-3">
        <div>
          <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption">
            Trust
          </span>
          <div className="font-display text-2xl font-black tabular-nums text-ink leading-none">
            {facility.trust_score}
            <span className="font-serif text-sm font-normal text-caption">/100</span>
          </div>
        </div>
        <div>
          <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption">
            Truth Gap Flags
          </span>
          <div className="font-display text-2xl font-black tabular-nums text-destructive leading-none">
            {facility.truth_gap_flag_count ?? flags.length}
          </div>
        </div>
      </div>

      {facility.audit_reason && (
        <p className="mt-3 font-serif text-[13px] text-ink line-clamp-3">
          {facility.audit_reason}
        </p>
      )}

      {flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {flags.slice(0, 4).map((f) => (
            <FlagChip key={f}>{humanizeFlag(f)}</FlagChip>
          ))}
          {flags.length > 4 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-caption">
              +{flags.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-hairline">
        <Button size="sm" variant="outline" className="w-full" onClick={onView}>
          View Audit Report
        </Button>
      </div>
    </article>
  );
}

export function TruthGapAudit() {
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stateFilter, setStateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [flagTypeFilter, setFlagTypeFilter] = useState<string>("all");

  const [openSignal, setOpenSignal] = useState<{ id: string; n: number } | null>(
    null,
  );

  const reqIdRef = useRef(0);

  async function fetchAudit(filters: {
    state?: string;
    city?: string;
    severity?: string;
    flagType?: string;
  }) {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/truth-gap-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: filters.state && filters.state !== "all" ? filters.state : undefined,
          city: filters.city || undefined,
          severity:
            filters.severity && filters.severity !== "all"
              ? filters.severity
              : undefined,
          flagType:
            filters.flagType && filters.flagType !== "all"
              ? filters.flagType
              : undefined,
          limit: 100,
        }),
      });
      const data = await res.json();
      if (reqId !== reqIdRef.current) return;
      if (!res.ok) {
        setError(data?.error || `Request failed (${res.status})`);
        setFacilities([]);
      } else {
        setFacilities((data.facilities ?? []) as Facility[]);
      }
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setError(e instanceof Error ? e.message : "Network error");
      setFacilities([]);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetchAudit({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    fetchAudit({
      state: stateFilter,
      city: cityFilter,
      severity: severityFilter,
      flagType: flagTypeFilter,
    });
  }

  function resetFilters() {
    setStateFilter("all");
    setCityFilter("");
    setSeverityFilter("all");
    setFlagTypeFilter("all");
    fetchAudit({});
  }

  const summary = useMemo(() => {
    const list = facilities ?? [];
    return {
      total: list.length,
      high: list.filter((f) => f.audit_severity === "High").length,
      surgery: list.filter((f) => flagsContain(f.audit_flags, "surgery")).length,
      icu: list.filter((f) => flagsContain(f.audit_flags, "icu")).length,
      emergency: list.filter((f) => flagsContain(f.audit_flags, "emergency"))
        .length,
      neonatal: list.filter((f) => flagsContain(f.audit_flags, "neonatal"))
        .length,
    };
  }, [facilities]);

  return (
    <div className="space-y-8">
      <div className="ribbon-bar flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Truth Gap Audit
        </span>
        <span className="font-mono normal-case tracking-wider text-[10px] text-paper/70">
          Potential contradictions · Requires verification
        </span>
      </div>

      <p className="font-serif text-[15px] text-page-ink max-w-3xl">
        Facilities where claimed services do not appear to be supported by
        staff or equipment signals in the source dataset. These are{" "}
        <em>potential contradictions</em> flagged from available data — not
        real-time hospital inspections. Always verify with the facility before
        acting.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Flagged Facilities" value={summary.total} icon={ShieldAlert} />
        <StatCard label="High Severity" value={summary.high} icon={AlertTriangle} tone="high" />
        <StatCard label="Surgery Mismatch" value={summary.surgery} icon={Scissors} />
        <StatCard label="ICU Mismatch" value={summary.icu} icon={HeartPulse} />
        <StatCard label="Emergency Mismatch" value={summary.emergency} icon={Siren} />
        <StatCard label="Neonatal Mismatch" value={summary.neonatal} icon={Baby} />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-hairline bg-card p-4 shadow-[var(--shadow-clay)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption block mb-1">
              State
            </label>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption block mb-1">
              City
            </label>
            <Input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="e.g. Mumbai"
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <div>
            <label className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption block mb-1">
              Severity
            </label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption block mb-1">
              Flag Type
            </label>
            <Select value={flagTypeFilter} onValueChange={setFlagTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All flags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All flags</SelectItem>
                {FLAG_TYPES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={applyFilters} className="flex-1" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
            <Button variant="outline" onClick={resetFilters} disabled={loading}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load audit data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {loading && facilities === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl bg-muted border border-hairline"
            />
          ))}
        </div>
      ) : facilities && facilities.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-card p-12 text-center shadow-[var(--shadow-clay)]">
          <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption">
            No flagged facilities
          </span>
          <p className="mt-3 font-serif text-page-ink">
            No truth gap flags match the current filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(facilities ?? []).map((f) => (
            <div key={f.id} className="relative">
              <FlaggedCard
                facility={f}
                onView={() =>
                  setOpenSignal({ id: f.id, n: (openSignal?.n ?? 0) + 1 })
                }
              />
              {/* Hidden FacilityCard provides the audit modal, opened via openSignal */}
              <div className="hidden">
                <FacilityCard
                  facility={f}
                  openSignal={openSignal?.id === f.id ? openSignal.n : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
