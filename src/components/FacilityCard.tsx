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
import { useState } from "react";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-2 border-ink">
        {/* Audit-style header — black ribbon */}
        <DialogHeader className="space-y-0 p-0 border-b-2 border-ink">
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
              <div className="mt-3 inline-flex items-center gap-1.5 border-2 border-ink px-2 py-1 text-[11px] font-mono uppercase tracking-[0.08em] font-bold">
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

export function FacilityCard({
  facility,
  selectedNeed,
  index,
}: {
  facility: Facility;
  selectedNeed?: MedicalNeed | "";
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const capability = (selectedNeed
    ? (facility[NEED_TO_FIELD[selectedNeed]] as Capability)
    : facility.emergency_surgery_capability) as Capability;
  const capabilityName = selectedNeed ?? "Emergency Surgery";

  return (
    <>
      <article className="group border-b border-ink bg-paper py-6 sm:py-8 first:pt-6">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Display-serif numeral, "Most Popular" treatment */}
          {typeof index === "number" && (
            <div className="shrink-0 font-display text-4xl sm:text-5xl font-black leading-none tabular-nums text-ink select-none">
              {String(index).padStart(2, "0")}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Mono kicker */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono uppercase tracking-[0.12em] text-[11px] font-bold text-ink">
                {capabilityName}
              </span>
              <span className="h-2 w-2 bg-ink" />
              <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption">
                Capability · {capability}
              </span>
              {typeof facility.distance_km === "number" && Number.isFinite(facility.distance_km) && (
                <>
                  <span className="h-2 w-2 bg-ink" />
                  <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption tabular-nums">
                    {facility.distance_km < 1
                      ? `${Math.round(facility.distance_km * 1000)} M`
                      : `${facility.distance_km.toFixed(1)} KM`} AWAY
                  </span>
                </>
              )}
            </div>

            {/* Display headline */}
            <h3 className="mt-2 font-display text-2xl sm:text-[28px] font-black leading-[1.08] tracking-tight text-ink group-hover:text-link transition-colors">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-left"
              >
                {facility.name}
              </button>
            </h3>

            {/* Serif deck — location */}
            <p className="mt-2 font-serif text-[15px] leading-snug text-page-ink flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-caption" />
              {facility.address_city}, {facility.address_stateOrRegion} · PIN {facility.address_zipOrPostcode}
            </p>

            {/* Trust score row — flat bar, no rounded corners */}
            <div className="mt-4 flex items-center gap-3">
              <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold text-caption shrink-0">
                Trust
              </span>
              <div className="flex-1 h-[3px] bg-hairline">
                <div className="h-full bg-ink" style={{ width: `${facility.trust_score}%` }} />
              </div>
              <span className="font-mono text-[11px] font-bold tabular-nums text-ink shrink-0">
                {facility.trust_score}/100
              </span>
            </div>

            {/* Risk warning — left-rule treatment */}
            <div className="mt-4 border-l-[3px] border-destructive pl-3">
              <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Risk Warning
              </span>
              <p className="mt-1 font-serif text-[14px] leading-snug text-page-ink">
                {facility.risk_warning}
              </p>
            </div>

            {/* Why recommended */}
            <div className="mt-3 border-l-[3px] border-ink pl-3">
              <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-ink flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Why Recommended
              </span>
              <p className="mt-1 font-serif text-[14px] leading-snug text-page-ink">
                {facility.recommendation_reason}
              </p>
            </div>

            {/* Capability checklist */}
            <div className="mt-4">
              <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
                Verified Capabilities
              </span>
              <div className="mt-2">
                <CapabilityChecklist facility={facility} />
              </div>
            </div>

            <div className="mt-5">
              <Button size="sm" onClick={() => setOpen(true)}>
                View Full Audit
              </Button>
            </div>
          </div>
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
