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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
        <DialogHeader className="space-y-0 p-0 border-b border-hairline">
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
            <DialogClose className="absolute right-4 top-4 sm:right-6 sm:top-6 border border-caption hover:border-ink p-1.5 rounded-full transition-colors">
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
                Capability
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

          {/* Risk + Recommendation */}
          {facility.risk_warning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Risk Warning</AlertTitle>
              <AlertDescription>{facility.risk_warning}</AlertDescription>
            </Alert>
          )}
          {facility.recommendation_reason && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Why Recommended</AlertTitle>
              <AlertDescription>{facility.recommendation_reason}</AlertDescription>
            </Alert>
          )}

          {(() => {
            const hasAudit =
              (facility.truth_gap_flag_count ?? 0) > 0 ||
              !!facility.audit_severity ||
              !!facility.audit_flags;
            let n = 0;
            return (
              <>
                {hasAudit && (
                  <>
                    <SectionHeader index={++n} icon={FileText} title="Source Citation" subtitle="Provenance for this row" />
                    <SourceCitationSection facility={facility} />
                    <SectionHeader index={++n} icon={AlertTriangle} title="Truth Gap Flags" subtitle="Potential contradictions detected in source data" />
                    <TruthGapFlagsSection facility={facility} />
                  </>
                )}
                <SectionHeader index={++n} icon={Activity} title="System Interpretation" subtitle="Derived signal checks" />
                <InterpretationSection facility={facility} />
                <SectionHeader index={++n} icon={ShieldCheck} title="Trust Score Breakdown" subtitle="How the score was calculated" />
                <TrustBreakdownSection facility={facility} />
                <SectionHeader index={++n} icon={Sparkles} title="Decision Trace" subtitle="Full audit log of this recommendation" />
                <DecisionTraceSection facility={facility} />
              </>
            );
          })()}

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

/* ─────────── Audit-section helpers ─────────── */

function SectionHeader({
  index,
  icon: Icon,
  title,
  subtitle,
}: {
  index: number;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 border-t border-ink pt-4">
      <span className="font-mono text-[10px] font-bold text-caption tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <div className="flex-1">
        <h4 className="flex items-center gap-2 font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-ink">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h4>
        {subtitle && (
          <p className="font-serif text-[12px] text-caption mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 border-b border-hairline last:border-b-0 items-baseline">
      <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption">
        {label}
      </span>
      <span className={`text-[13px] text-ink ${mono ? "font-mono tabular-nums" : "font-serif"} break-words`}>
        {value}
      </span>
    </div>
  );
}

function NotProvided() {
  return (
    <span className="font-mono uppercase tracking-[0.08em] text-[10px] text-caption italic">
      Not provided in source row
    </span>
  );
}

function fieldOrEmpty(v: string | number | undefined | null) {
  if (v === undefined || v === null) return <NotProvided />;
  const s = String(v).trim();
  if (s === "") return <NotProvided />;
  return s;
}

function RawEvidenceSection({ facility }: { facility: Facility }) {
  return (
    <div className="rounded-md border border-hairline bg-paper p-4">
      <KV label="Description" value={fieldOrEmpty(facility.description)} />
      <KV label="Specialties" value={fieldOrEmpty(facility.specialties)} />
      <KV label="Procedure" value={fieldOrEmpty(facility.procedure)} />
      <KV label="Equipment" value={fieldOrEmpty(facility.equipment)} />
      <KV label="Capability" value={fieldOrEmpty(facility.capability)} />
      <KV label="Doctors" value={fieldOrEmpty(facility.numberDoctors as string | number | undefined)} mono />
      <KV label="Capacity" value={fieldOrEmpty(facility.capacity as string | number | undefined)} mono />
    </div>
  );
}

function SourceCitationSection({ facility }: { facility: Facility }) {
  return (
    <div className="rounded-md border border-hairline bg-paper p-4">
      <KV
        label="Source Table"
        value={<span className="font-mono text-[12px] break-all">{facility.source_table || "—"}</span>}
      />
      <KV
        label="Row ID"
        value={
          <span className="font-mono text-[12px] break-all">
            {facility.facility_row_id || facility.id}
          </span>
        }
      />
      <KV label="Facility" value={facility.name} />
      <KV
        label="Location"
        value={`${facility.address_city}, ${facility.address_stateOrRegion} · PIN ${facility.address_zipOrPostcode || "—"}`}
      />
    </div>
  );
}

function severityTone(sev?: "High" | "Medium" | "Low") {
  if (sev === "High") return "bg-destructive text-white";
  if (sev === "Medium") return "bg-warning text-ink";
  return "bg-ink text-white";
}

function parseFlags(flags?: string): string[] {
  if (!flags) return [];
  return flags
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function humanizeFlag(flag: string): string {
  return flag
    .replace(/[_-]+/g, " ")
    .replace(/\bmismatch\b/gi, "mismatch")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function TruthGapFlagsSection({ facility }: { facility: Facility }) {
  const flags = parseFlags(facility.audit_flags);
  return (
    <div className="rounded-md border border-hairline bg-paper p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {facility.audit_severity && (
          <span
            className={`font-mono uppercase tracking-[0.08em] text-[10px] font-bold px-2 py-1 rounded-md ${severityTone(facility.audit_severity)}`}
          >
            Severity · {facility.audit_severity}
          </span>
        )}
        <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption">
          Truth Gap Flags
        </span>
        <span className="font-display text-2xl font-black tabular-nums text-ink leading-none">
          {facility.truth_gap_flag_count ?? flags.length}
        </span>
      </div>
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-oat-light px-2 py-0.5 font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-ink"
            >
              <AlertTriangle className="h-3 w-3" />
              {humanizeFlag(f)}
            </span>
          ))}
        </div>
      )}
      {facility.audit_reason && (
        <div className="border-t border-hairline pt-2">
          <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption">
            Audit Reason
          </span>
          <p className="mt-1 font-serif text-[13px] text-ink">{facility.audit_reason}</p>
        </div>
      )}
      <p className="font-mono uppercase tracking-[0.06em] text-[9px] text-caption">
        Potential contradiction detected from dataset evidence — not a real-time hospital inspection. Requires verification.
      </p>
    </div>
  );
}

function SignalRow({ label, present }: { label: string; present: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 border-b border-hairline last:border-b-0">
      <span className="font-serif text-[13px] text-ink">{label}</span>
      <span
        className={`font-mono uppercase tracking-[0.08em] text-[10px] font-bold inline-flex items-center gap-1 ${
          present ? "text-emerald-700" : "text-caption"
        }`}
      >
        {present ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {present ? "Found" : "Not confirmed"}
      </span>
    </li>
  );
}

function InterpretationSection({ facility }: { facility: Facility }) {
  const hasClaims =
    facility.claimed_surgery !== undefined ||
    facility.claimed_icu !== undefined ||
    facility.claimed_emergency !== undefined ||
    facility.claimed_dialysis !== undefined ||
    facility.claimed_neonatal !== undefined ||
    facility.claimed_trauma !== undefined;
  return (
    <ul className="rounded-md border border-hairline bg-paper p-4">
      {hasClaims && (
        <>
          <SignalRow label="Claimed surgery" present={!!facility.claimed_surgery} />
          <SignalRow label="Claimed ICU" present={!!facility.claimed_icu} />
          <SignalRow label="Claimed emergency" present={!!facility.claimed_emergency} />
          <SignalRow label="Claimed dialysis" present={!!facility.claimed_dialysis} />
          <SignalRow label="Claimed neonatal" present={!!facility.claimed_neonatal} />
          <SignalRow label="Claimed trauma" present={!!facility.claimed_trauma} />
        </>
      )}
      <SignalRow label="Oxygen confirmed" present={facility.has_oxygen} />
      <SignalRow label="Operation theatre confirmed" present={facility.has_operation_theatre} />
      <SignalRow label="Surgeon confirmed" present={facility.has_surgeon} />
      <SignalRow label="Anesthesiologist confirmed" present={facility.has_anesthesiologist} />
      <SignalRow label="ICU confirmed" present={facility.has_icu} />
      <SignalRow label="Dialysis confirmed" present={facility.has_dialysis} />
      <SignalRow label="Ambulance confirmed" present={facility.has_ambulance} />
      <SignalRow label="24/7 confirmed" present={facility.is_24_7} />
    </ul>
  );
}

interface ScorePart { label: string; points: number; awarded: boolean }

function buildTrustParts(f: Facility): { base: number; parts: ScorePart[]; computed: number } {
  const base = 40;
  const parts: ScorePart[] = [
    { label: "Oxygen confirmed", points: 10, awarded: f.has_oxygen },
    { label: "Operation theatre confirmed", points: 10, awarded: f.has_operation_theatre },
    { label: "Surgeon on staff", points: 10, awarded: f.has_surgeon },
    { label: "Anesthesiologist on staff", points: 15, awarded: f.has_anesthesiologist },
    { label: "Ambulance available", points: 5, awarded: f.has_ambulance },
    { label: "24/7 availability", points: 10, awarded: f.is_24_7 },
  ];
  const computed = base + parts.filter((p) => p.awarded).reduce((s, p) => s + p.points, 0);
  return { base, parts, computed };
}

function TrustBreakdownSection({ facility }: { facility: Facility }) {
  const { base, parts, computed } = buildTrustParts(facility);
  const missingCritical = parts
    .filter((p) => !p.awarded && p.points >= 10)
    .map((p) => p.label);
  const finalScore = facility.trust_score; // source of truth from Databricks
  const drift = finalScore !== computed;

  return (
    <div className="rounded-md border border-hairline bg-paper p-4">
      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption">
          Base Score
        </span>
        <span className="font-mono tabular-nums text-[14px] font-bold text-ink">{base}</span>
      </div>
      <ul className="py-2">
        {parts.map((p) => (
          <li
            key={p.label}
            className="flex items-center justify-between py-1 font-serif text-[13px]"
          >
            <span className={p.awarded ? "text-ink" : "text-caption line-through"}>
              {p.label}
            </span>
            <span
              className={`font-mono tabular-nums text-[12px] font-bold ${
                p.awarded ? "text-emerald-700" : "text-caption"
              }`}
            >
              {p.awarded ? `+${p.points}` : `+0 / ${p.points}`}
            </span>
          </li>
        ))}
      </ul>
      {missingCritical.length > 0 && (
        <div className="border-t border-hairline pt-2 mb-2">
          <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-destructive">
            Missing critical signals
          </span>
          <p className="mt-1 font-serif text-[12px] text-page-ink">
            {missingCritical.join(" · ")}
          </p>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t-2 border-ink pt-2">
        <span className="font-mono uppercase tracking-[0.08em] text-[11px] font-bold text-ink">
          Final Trust Score
        </span>
        <span className="font-display text-2xl font-black tabular-nums text-ink">
          {finalScore}
          <span className="font-serif text-sm font-normal text-caption">/100</span>
        </span>
      </div>
      {drift && (
        <p className="mt-2 font-mono uppercase tracking-[0.06em] text-[9px] text-caption">
          Computed from signals: {computed}. Source-of-truth score (from Databricks): {finalScore}.
        </p>
      )}
    </div>
  );
}

function DecisionTraceSection({ facility }: { facility: Facility }) {
  const t = facility.decision_trace;
  if (!t) {
    return (
      <p className="font-serif text-[13px] text-caption italic">
        No trace was attached to this row.
      </p>
    );
  }
  const loc = [t.location.city, t.location.state, t.location.pinCode].filter(Boolean).join(", ") || "—";
  return (
    <Accordion type="single" collapsible className="border border-hairline rounded-md bg-paper">
      <AccordionItem value="trace" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 font-mono uppercase tracking-[0.08em] text-[11px] font-bold text-ink hover:no-underline">
          View full decision trace
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <KV label="User Message" value={`"${t.user_message}"`} />
          <KV label="Parsed Intent" value={t.parsed_intent} />
          <KV label="Location" value={loc} />
          <KV label="Source Table" value={<span className="font-mono text-[12px]">{t.source_table}</span>} />
          <KV
            label="Filters Applied"
            value={
              t.filters_applied.length === 0 ? (
                <NotProvided />
              ) : (
                <ul className="space-y-0.5">
                  {t.filters_applied.map((f, i) => (
                    <li key={i} className="font-mono text-[11px] text-page-ink break-all">
                      {f}
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <KV label="Ranking" value={<span className="font-mono text-[12px]">{t.ranking}</span>} />
          <KV label="Candidate Rows" value={t.candidate_rows} mono />
          <KV label="Returned Rows" value={t.returned_rows} mono />
          <KV
            label="Row ID"
            value={
              <span className="font-mono text-[12px] break-all">
                {facility.facility_row_id || facility.id}
              </span>
            }
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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

            {/* Need + Distance — quiet metadata directly under location */}
            <div className="mt-1 flex items-center gap-x-3 gap-y-0.5 flex-wrap font-sans text-[12px] text-caption min-w-0">
              <span className="inline-flex items-center gap-1 min-w-0" title={`Matched need: ${capabilityName}`}>
                <Stethoscope className="h-3 w-3 shrink-0" />
                <span className="truncate">{capabilityName}</span>
              </span>
              {typeof facility.distance_km === "number" && Number.isFinite(facility.distance_km) && (
                <span className="inline-flex items-center gap-1 tabular-nums" title="Distance from search location">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {facility.distance_km < 1
                    ? `${Math.round(facility.distance_km * 1000)} m`
                    : `${facility.distance_km.toFixed(1)} km`}
                </span>
              )}
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
            Details
          </Button>
        </div>

        {/* Bottom meta — only the two highlighted labels */}
        <div className="mt-3 pt-3 border-t border-hairline flex items-center gap-1.5 flex-wrap">
          <MetaChip
            icon={Activity}
            label="Capability"
            value={capability}
            tone={capability === "High" ? "good" : capability === "Medium" ? "warn" : "bad"}
            title={`${capabilityName} capability: ${capability}`}
          />
          <MetaChip
            icon={ShieldCheck}
            label="Trust"
            value={`${facility.trust_score}/100`}
            tone={facility.trust_score >= 85 ? "good" : facility.trust_score >= 70 ? "warn" : "bad"}
            title={`Trust score: ${facility.trust_score}/100 — ${trustText(facility.trust_score)}`}
            mono
          />
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
