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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Capability, Facility, MedicalNeed } from "@/lib/facilities";

const capabilityStyles: Record<Capability, { badge: string; label: string }> = {
  High: { badge: "bg-success/10 text-success border-success/30", label: "Strong" },
  Medium: { badge: "bg-warning/15 text-warning-foreground border-warning/40", label: "Caution" },
  Low: { badge: "bg-destructive/10 text-destructive border-destructive/30", label: "Weak" },
};

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

function trustTone(score: number) {
  if (score >= 85) return { text: "text-success", bar: "bg-success" };
  if (score >= 70) return { text: "text-accent", bar: "bg-accent" };
  return { text: "text-destructive", bar: "bg-destructive" };
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
    lines.push({
      text: "Facility report mentions oxygen support and surgical services.",
      tone: "positive",
    });
  } else if (f.has_oxygen) {
    lines.push({
      text: "Facility report mentions oxygen support; surgical services not clearly listed.",
      tone: "neutral",
    });
  } else {
    lines.push({
      text: "No mention of dedicated oxygen supply in facility records.",
      tone: "negative",
    });
  }

  if (f.has_surgeon && !f.has_anesthesiologist) {
    lines.push({
      text: "Staffing information includes general surgeon but no anesthesiologist.",
      tone: "negative",
    });
  } else if (f.has_surgeon && f.has_anesthesiologist) {
    lines.push({
      text: "Staffing roster lists both surgeon and anesthesiologist on call.",
      tone: "positive",
    });
  } else {
    lines.push({
      text: "Staffing information does not confirm a resident surgeon.",
      tone: "negative",
    });
  }

  if (f.has_icu && f.icu_capability !== "Low") {
    lines.push({
      text: `ICU bed availability cross-verified — capability rated ${f.icu_capability}.`,
      tone: "positive",
    });
  } else {
    lines.push({
      text: "ICU capacity claims could not be independently verified.",
      tone: "negative",
    });
  }

  if (f.has_ambulance) {
    lines.push({
      text: "Ambulance service listed in district health directory.",
      tone: "positive",
    });
  } else {
    lines.push({
      text: "No ambulance service registered against this facility.",
      tone: "negative",
    });
  }

  lines.push({
    text:
      f.trust_score >= 80
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
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
      {CHECKLIST.map(({ key, label, icon: Icon }) => {
        const present = Boolean(facility[key]);
        return (
          <li
            key={key}
            className={`flex items-center gap-2 text-sm ${present ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                present ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              {present ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </span>
            <Icon className={`h-3.5 w-3.5 ${present ? "" : "opacity-50"}`} />
            <span className={present ? "" : "line-through opacity-70"}>{label}</span>
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
  const capabilityLabel = selectedNeed ?? "Emergency Surgery";
  const capStyle = capabilityStyles[capability];
  const tone = trustTone(facility.trust_score);
  const evidence = buildEvidence(facility);
  const reportId = `CMI-${facility.id.toUpperCase()}-${facility.address_zipOrPostcode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Audit-style header */}
        <DialogHeader className="border-b border-border bg-muted/40 p-5 sm:p-6 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              CareMap audit report
              <span className="text-border">·</span>
              <span className="font-mono text-foreground/70">{reportId}</span>
            </div>
            <DialogClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {facility.name}
          </DialogTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {facility.address_city}, {facility.address_stateOrRegion} · PIN {facility.address_zipOrPostcode}
          </div>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Score + capability summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Trust score
                </span>
                <span className={`font-semibold tabular-nums ${tone.text}`}>
                  {facility.trust_score}
                  <span className="text-muted-foreground font-normal">/100</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${tone.bar}`}
                  style={{ width: `${facility.trust_score}%` }}
                />
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Capability for {capabilityLabel}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${capStyle.badge}`}
              >
                <Activity className="h-3.5 w-3.5" />
                {capability} · {capStyle.label}
              </span>
            </section>
          </div>

          {/* Risk warning */}
          <section className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk warning
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{facility.risk_warning}</p>
          </section>

          {/* Recommendation */}
          <section className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Why recommended
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {facility.recommendation_reason}
            </p>
          </section>

          {/* Capabilities */}
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verified capabilities
            </div>
            <CapabilityChecklist facility={facility} />
          </section>

          {/* Evidence — audit-style */}
          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evidence log
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {evidence.length} findings
              </span>
            </div>
            <ol className="space-y-2">
              {evidence.map((e, i) => {
                const dot =
                  e.tone === "positive"
                    ? "bg-success"
                    : e.tone === "negative"
                    ? "bg-destructive"
                    : "bg-muted-foreground/50";
                return (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-1.5 flex flex-col items-center">
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground pt-0.5 w-8 shrink-0">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground/90">{e.text}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
            Generated from public health directories, facility self-reports, and cross-checked staffing
            rosters. Always confirm critical capabilities with the facility before transport.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FacilityCard({
  facility,
  selectedNeed,
}: {
  facility: Facility;
  selectedNeed?: MedicalNeed | "";
}) {
  const [open, setOpen] = useState(false);
  const capability = (selectedNeed
    ? (facility[NEED_TO_FIELD[selectedNeed]] as Capability)
    : facility.emergency_surgery_capability) as Capability;
  const capabilityLabel = selectedNeed ?? "Emergency Surgery";
  const capStyle = capabilityStyles[capability];
  const tone = trustTone(facility.trust_score);

  return (
    <>
      <Card className="overflow-hidden border-border/70 transition-shadow hover:shadow-md">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                {facility.name}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {facility.address_city}, {facility.address_stateOrRegion} · PIN {facility.address_zipOrPostcode}
                </span>
                {typeof facility.distance_km === "number" && Number.isFinite(facility.distance_km) && (
                  <span className="shrink-0 ml-1 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    {facility.distance_km < 1
                      ? `${Math.round(facility.distance_km * 1000)} m`
                      : `${facility.distance_km.toFixed(1)} km`} away
                  </span>
                )}
              </div>
            </div>
            <span
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${capStyle.badge}`}
              title={`${capabilityLabel} capability: ${capability}`}
            >
              <Activity className="h-3 w-3" />
              {capability} · {capStyle.label}
            </span>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trust score
              </span>
              <span className={`font-semibold tabular-nums ${tone.text}`}>
                {facility.trust_score}
                <span className="text-muted-foreground font-normal">/100</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${tone.bar} transition-all`}
                style={{ width: `${facility.trust_score}%` }}
                aria-label={`Trust score ${facility.trust_score} out of 100`}
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk warning
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{facility.risk_warning}</p>
          </div>

          <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Why recommended
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {facility.recommendation_reason}
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verified capabilities
            </div>
            <CapabilityChecklist facility={facility} />
          </div>

          <Button className="mt-5 w-full sm:w-auto" onClick={() => setOpen(true)}>
            View Details
          </Button>
        </CardContent>
      </Card>

      <FacilityDetailsDialog
        facility={facility}
        selectedNeed={selectedNeed}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

