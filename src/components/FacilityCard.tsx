import {
  Activity,
  AlertTriangle,
  Ambulance,
  Check,
  Droplet,
  HeartPulse,
  MapPin,
  Minus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Capability, Facility, MedicalNeed } from "@/lib/facilities";

const capabilityStyles: Record<Capability, { badge: string; label: string }> = {
  High: {
    badge: "bg-success/10 text-success border-success/30",
    label: "Strong",
  },
  Medium: {
    badge: "bg-warning/15 text-warning-foreground border-warning/40",
    label: "Caution",
  },
  Low: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    label: "Weak",
  },
};

const NEED_TO_FIELD: Record<MedicalNeed, keyof Facility> = {
  "Emergency Surgery": "emergencySurgeryCapability",
  "ICU + Oxygen": "icuCapability",
  Dialysis: "dialysisCapability",
  "Neonatal Care": "neonatalCapability",
  "Trauma Care": "traumaCapability",
};

function trustTone(score: number) {
  if (score >= 85) return { text: "text-success", bar: "bg-success" };
  if (score >= 70) return { text: "text-accent", bar: "bg-accent" };
  return { text: "text-destructive", bar: "bg-destructive" };
}

type ChecklistItem = { key: keyof Facility; label: string; icon: LucideIcon };

const CHECKLIST: ChecklistItem[] = [
  { key: "hasOxygen", label: "Oxygen", icon: Wind },
  { key: "hasICU", label: "ICU", icon: HeartPulse },
  { key: "hasSurgeon", label: "Surgeon", icon: Stethoscope },
  { key: "hasAnesthesiologist", label: "Anesthesiologist", icon: Syringe },
  { key: "hasDialysis", label: "Dialysis", icon: Droplet },
  { key: "hasAmbulance", label: "Ambulance", icon: Ambulance },
];

export function FacilityCard({
  facility,
  selectedNeed,
}: {
  facility: Facility;
  selectedNeed?: MedicalNeed | "";
}) {
  const capability = (selectedNeed
    ? (facility[NEED_TO_FIELD[selectedNeed]] as Capability)
    : facility.emergencySurgeryCapability) as Capability;
  const capabilityLabel = selectedNeed ?? "Emergency Surgery";
  const capStyle = capabilityStyles[capability];
  const tone = trustTone(facility.trustScore);

  return (
    <Card className="overflow-hidden border-border/70 transition-shadow hover:shadow-md">
      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
              {facility.name}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {facility.city}, {facility.state} · PIN {facility.pinCode}
              </span>
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

        {/* Trust score progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Trust score
            </span>
            <span className={`font-semibold tabular-nums ${tone.text}`}>
              {facility.trustScore}
              <span className="text-muted-foreground font-normal">/100</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${tone.bar} transition-all`}
              style={{ width: `${facility.trustScore}%` }}
              aria-label={`Trust score ${facility.trustScore} out of 100`}
            />
          </div>
        </div>

        {/* Risk warning */}
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80">
            <AlertTriangle className="h-3.5 w-3.5" />
            Risk warning
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{facility.riskWarning}</p>
        </div>

        {/* Recommendation */}
        <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Why recommended
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {facility.recommendationReason}
          </p>
        </div>

        {/* Capability checklist */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Verified capabilities
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {CHECKLIST.map(({ key, label, icon: Icon }) => {
              const present = Boolean(facility[key]);
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2 text-sm ${
                    present ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      present
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
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
        </div>

        <Button className="mt-5 w-full sm:w-auto">View Details</Button>
      </CardContent>
    </Card>
  );
}
