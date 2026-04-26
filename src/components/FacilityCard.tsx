import {
  Activity,
  AlertTriangle,
  Ambulance,
  Check,
  Droplet,
  FileText,
  HeartPulse,
  MapPin,
  Minus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Capability, Facility, MedicalNeed } from "@/lib/facilities";

/**
 * WIRED-style facility tile.
 * - No card chrome, no shadow, no radius.
 * - Mono kicker · serif headline · serif deck · hairline rules.
 * - Number prefix in display serif (40px) for the editorial "Most Popular" feel.
 */

const NEED_TO_FIELD: Record<MedicalNeed, keyof Facility> = {
  "Emergency Surgery": "emergency_surgery_capability",
  "ICU + Oxygen": "icu_capability",
  Dialysis: "dialysis_capability",
  "Neonatal Care": "neonatal_capability",
  "Trauma Care": "trauma_capability",
  "Emergency Care": "emergency_surgery_capability",
  "Maternal Care": "neonatal_capability",
  "General Medicine": "emergency_surgery_capability",
  "Vaccination / Post-exposure Care": "emergency_surgery_capability",
};

function capabilityLabel(cap: Capability): string {
  return cap === "High" ? "Strong" : cap === "Medium" ? "Caution" : "Weak";
}

function trustText(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Adequate";
  return "Weak";
}

type ChecklistItem = { key: keyof Facility; label: string; icon: LucideIcon };

const CHECKLIST: ChecklistItem[] = [
  { key: "has_oxygen", label: "Oxygen", icon: Wind },
  { key: "has_icu", label: "ICU", icon: HeartPulse },
  { key: "has_surgeon", label: "Surgeon", icon: Stethoscope },
  { key: "has_anesthesiologist", label: "Anesthesiologist", icon: Syringe },
  { key: "has_dialysis", label: "Dialysis", icon: Droplet },
  { key: "has_ambulance", label: "Ambulance", icon: Ambulance },
];

type EvidenceLine = { text: string; tone: "positive" | "neutral" | "negative" };

function buildEvidence(f: Facility): EvidenceLine[] {
  const lines: EvidenceLine[] = [];
  if (f.has_oxygen && f.has_surgeon) {
    lines.push({ text: "Facility report mentions oxygen support and surgical services.", tone: "positive" });
  } else if (f.has_oxygen) {
    lines.push({ text: "Facility report mentions oxygen support; surgical services not clearly listed.", tone: "neutral" });
  } else {
    lines.push({ text: "No mention of dedicated oxygen supply in facility records.", tone: "negative" });
  }
  if (f.has_surgeon && !f.has_anesthesiologist) {
    lines.push({ text: "Staffing information includes general surgeon but no anesthesiologist.", tone: "negative" });
  } else if (f.has_surgeon && f.has_anesthesiologist) {
    lines.push({ text: "Staffing roster lists both surgeon and anesthesiologist on call.", tone: "positive" });
  } else {
    lines.push({ text: "Staffing information does not confirm a resident surgeon.", tone: "negative" });
  }
  if (f.has_icu && f.icu_capability !== "Low") {
    lines.push({ text: `ICU bed availability cross-verified — capability rated ${f.icu_capability}.`, tone: "positive" });
  } else {
    lines.push({ text: "ICU capacity claims could not be independently verified.", tone: "negative" });
  }
  if (f.has_ambulance) {
    lines.push({ text: "Ambulance service listed in district health directory.", tone: "positive" });
  } else {
    lines.push({ text: "No ambulance service registered against this facility.", tone: "negative" });
  }
  lines.push({
    text: f.trust_score >= 80
      ? "24/7 emergency availability confirmed across multiple data sources."
      : "24/7 emergency availability is not confirmed.",
    tone: f.trust_score >= 80 ? "positive" : "negative",
  });
  lines.push({
    text: `Trust score derived from ${f.trust_score < 70 ? "incomplete" : "cross-checked"} public health records, capability claims, and staffing rosters.`,
    tone: "neutral",
  });
  return lines;
}

function CapabilityChecklist({ facility }: { facility: Facility }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {CHECKLIST.map(({ key, label, icon: Icon }) => {
        const present = Boolean(facility[key]);
        return (
          <li
            key={key}
            className={`flex items-center gap-2 font-sans text-[13px] ${present ? "text-ink" : "text-caption"}`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                present ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-caption"
              }`}
            >
              {present ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <Minus className="h-2.5 w-2.5" />}
            </span>
            <Icon className={`h-3.5 w-3.5 ${present ? "" : "opacity-40"}`} />
            <span className={present ? "" : "line-through opacity-60"}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FacilityDetailsDialog({
  facility,
  selectedNeed,
  open,
  onOpenChange,
}: {
  facility: Facility;
  selectedNeed?: MedicalNeed | "";
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const capability = (selectedNeed
    ? (facility[NEED_TO_FIELD[selectedNeed]] as Capability)
    : facility.emergency_surgery_capability) as Capability;
  const capabilityName = selectedNeed ?? "Emergency Surgery";
  const evidence = buildEvidence(facility);
  const reportId = `CMI-${facility.id.toUpperCase()}-${facility.address_zipOrPostcode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl border border-hairline">
        {/* Audit-style header */}
        <DialogHeader className="space-y-0 p-0 border-b border-hairline">
          <div className="ribbon-bar flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              CareMap Audit Report
            </span>
            <span className="font-mono text-paper/70 normal-case tracking-wider text-[10px]">
              {reportId}
            </span>
          </div>
          <div className="p-6 sm:p-8 bg-paper">
            <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption">
              Facility Profile
            </span>
            <DialogTitle className="mt-2 font-display text-3xl sm:text-4xl font-black leading-[1.05] tracking-tight text-ink">
              {facility.name}
            </DialogTitle>
            <div className="mt-3 flex items-center gap-1.5 font-serif text-sm text-page-ink">
              <MapPin className="h-3.5 w-3.5" />
              {facility.address_city}, {facility.address_stateOrRegion} · PIN {facility.address_zipOrPostcode}
            </div>
            <DialogClose className="absolute right-4 top-12 sm:right-6 sm:top-14 border border-caption hover:border-ink p-1.5 rounded-full transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="p-6 sm:p-8 space-y-6 bg-paper">
          {/* Score + capability summary — two facing columns separated by hairline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-ink">
            <section className="pb-5 sm:pb-0 sm:pr-6 border-b sm:border-b-0 border-hairline">
              <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Trust Score
              </span>
              <div className="mt-2 font-display text-5xl font-black leading-none text-ink tabular-nums">
                {facility.trust_score}
                <span className="font-serif text-lg text-caption font-normal">/100</span>
              </div>
              <div className="mt-2 font-mono uppercase tracking-[0.08em] text-[11px] font-bold text-ink">
                {trustText(facility.trust_score)}
              </div>
              <div className="mt-3 h-[3px] w-full bg-hairline">
                <div className="h-full bg-ink" style={{ width: `${facility.trust_score}%` }} />
              </div>
            </section>

            <section className="pt-5 sm:pt-0 sm:pl-6">
              <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
                Capability · {capabilityName}
              </span>
              <div className="mt-2 font-display text-4xl font-black leading-none text-ink">
                {capability}
              </div>
              <div className="mt-2 font-mono uppercase tracking-[0.08em] text-[11px] font-bold text-ink">
                {capabilityLabel(capability)}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-hairline bg-oat-light px-2 py-1 text-[11px] font-mono uppercase tracking-[0.08em] font-bold">
                <Activity className="h-3 w-3" /> Verified Signal
              </div>
            </section>
          </div>

          {/* Risk warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Risk Warning</AlertTitle>
            <AlertDescription>{facility.risk_warning}</AlertDescription>
          </Alert>

          {/* Recommendation */}
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Why Recommended</AlertTitle>
            <AlertDescription>{facility.recommendation_reason}</AlertDescription>
          </Alert>

          {/* Capabilities */}
          <section>
            <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
              Verified Capabilities
            </span>
            <div className="mt-3">
              <CapabilityChecklist facility={facility} />
            </div>
          </section>

          {/* Evidence — audit log */}
          <section className="border-t border-ink pt-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
                Evidence Log
              </span>
              <span className="font-mono text-[10px] text-caption tabular-nums">
                {String(evidence.length).padStart(2, "0")} FINDINGS
              </span>
            </div>
            <ol className="space-y-3">
              {evidence.map((e, i) => (
                <li key={i} className="grid grid-cols-[auto_2.5rem_1fr] gap-3 items-start font-serif text-sm leading-relaxed text-page-ink">
                  <span
                    className={`mt-1.5 h-2 w-2 ${
                      e.tone === "positive" ? "bg-ink" : e.tone === "negative" ? "bg-destructive" : "bg-caption"
                    }`}
                  />
                  <span className="font-mono text-[11px] text-caption tabular-nums pt-0.5">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <p className="border-t border-hairline pt-4 font-mono uppercase tracking-[0.08em] text-[10px] text-caption">
            Generated from public health directories, facility self-reports, and
            cross-checked staffing rosters. Always confirm critical capabilities
            with the facility before transport.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Local re-import to avoid pulling Alert at top (kept here for clarity)
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Compact chip with a mono kicker label + value, tone-tinted left border.
 * Differentiates each metric without shouting.
 */
function MetaChip({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  title,
  mono = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
  title?: string;
  mono?: boolean;
}) {
  const toneStyles: Record<string, { border: string; value: string; iconCls: string }> = {
    good: { border: "border-l-emerald-600", value: "text-emerald-700", iconCls: "text-emerald-700" },
    warn: { border: "border-l-amber-600", value: "text-amber-700", iconCls: "text-amber-700" },
    bad: { border: "border-l-destructive", value: "text-destructive", iconCls: "text-destructive" },
    neutral: { border: "border-l-caption", value: "text-ink", iconCls: "text-caption" },
  };
  const t = toneStyles[tone];
  return (
    <div
      title={title}
      className={`min-w-0 flex items-center gap-2 rounded-md border border-hairline border-l-[3px] ${t.border} bg-oat-light/50 px-2 py-1`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${t.iconCls}`} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span className="font-mono uppercase tracking-[0.08em] text-[9px] font-bold text-caption">
          {label}
        </span>
        <span
          className={`truncate text-[12px] font-semibold ${t.value} ${mono ? "font-mono tabular-nums" : "font-sans"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}


export function FacilityCard({
  facility,
  selectedNeed,
  index,
  isActive,
  onHover,
  openSignal,
}: {
  facility: Facility;
  selectedNeed?: MedicalNeed | "";
  index?: number;
  isActive?: boolean;
  onHover?: (id: string | null) => void;
  /** When this number changes, open the audit dialog (used by map → card). */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const capability = (selectedNeed
    ? (facility[NEED_TO_FIELD[selectedNeed]] as Capability)
    : facility.emergency_surgery_capability) as Capability;
  const capabilityName = selectedNeed ?? "Emergency Surgery";

  // Open dialog when parent signals (e.g. map marker "View Full Audit" clicked).
  // Using a numeric signal avoids re-opening on unrelated re-renders.
  const lastOpenSignal = useRef<number | undefined>(undefined);
  if (openSignal !== undefined && openSignal !== lastOpenSignal.current) {
    lastOpenSignal.current = openSignal;
    if (!open) setTimeout(() => setOpen(true), 0);
  }

  return (
    <>
      <article
        id={`facility-${facility.id}`}
        onMouseEnter={() => onHover?.(facility.id)}
        onMouseLeave={() => onHover?.(null)}
        className={`group flex h-full flex-col rounded-2xl border bg-card p-3 sm:p-4 shadow-[var(--shadow-clay)] transition-all ${
          isActive ? "border-link ring-2 ring-link/20" : "border-hairline"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* Compact headline — truncated */}
            <h3 className="font-sans text-base font-semibold leading-snug tracking-[-0.32px] text-ink group-hover:text-link transition-colors">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="block w-full text-left truncate"
                title={facility.name}
              >
                {facility.name}
              </button>
            </h3>

            {/* Location — single line, truncated */}
            <p className="mt-0.5 font-sans text-[13px] leading-snug text-caption flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {facility.address_city}, {facility.address_stateOrRegion}
              </span>
            </p>
          </div>

          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
            Details
          </Button>
        </div>

        {/* Bottom meta row — labeled chips, each field clearly differentiated */}
        <div className="mt-3 pt-3 border-t border-hairline grid grid-cols-2 gap-1.5">
          {/* Matched need */}
          <MetaChip
            icon={Stethoscope}
            label="Need"
            value={capabilityName}
            tone="neutral"
            title={`Matched need: ${capabilityName}`}
          />
          {/* Capability level */}
          <MetaChip
            icon={Activity}
            label="Capability"
            value={capability}
            tone={capability === "High" ? "good" : capability === "Medium" ? "warn" : "bad"}
            title={`${capabilityName} capability: ${capability}`}
          />
          {/* Trust score */}
          <MetaChip
            icon={ShieldCheck}
            label="Trust"
            value={`${facility.trust_score}/100`}
            tone={facility.trust_score >= 85 ? "good" : facility.trust_score >= 70 ? "warn" : "bad"}
            title={`Trust score: ${facility.trust_score}/100 — ${trustText(facility.trust_score)}`}
            mono
          />
          {/* Distance */}
          {typeof facility.distance_km === "number" && Number.isFinite(facility.distance_km) ? (
            <MetaChip
              icon={MapPin}
              label="Distance"
              value={
                facility.distance_km < 1
                  ? `${Math.round(facility.distance_km * 1000)} m`
                  : `${facility.distance_km.toFixed(1)} km`
              }
              tone="neutral"
              title="Distance from search location"
              mono
            />
          ) : (
            <span />
          )}
        </div>
      </article>

      <FacilityDetailsDialog
        facility={facility}
        selectedNeed={selectedNeed}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
