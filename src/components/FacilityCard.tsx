import { Ambulance, AlertTriangle, Droplet, MapPin, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Capability, Facility, MedicalNeed } from "@/lib/facilities";

const capabilityStyles: Record<Capability, string> = {
  High: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/15 text-warning-foreground border-warning/30",
  Low: "bg-destructive/10 text-destructive border-destructive/20",
};

const NEED_TO_FIELD: Record<MedicalNeed, keyof Facility> = {
  "Emergency Surgery": "emergencySurgeryCapability",
  "ICU + Oxygen": "icuCapability",
  Dialysis: "dialysisCapability",
  "Neonatal Care": "neonatalCapability",
  "Trauma Care": "traumaCapability",
};

function trustColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-accent";
  return "text-destructive";
}

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

  return (
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
                {facility.city}, {facility.state} · PIN {facility.pinCode}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-bold tabular-nums ${trustColor(facility.trustScore)}`}>
              {facility.trustScore}
              <span className="text-sm font-medium text-muted-foreground">/100</span>
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              Trust
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${capabilityStyles[capability]}`}
          >
            {capability} · {capabilityLabel}
          </span>
          {facility.hasOxygen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              <Wind className="h-3 w-3" /> Oxygen
            </span>
          )}
          {facility.hasDialysis && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              <Droplet className="h-3 w-3" /> Dialysis
            </span>
          )}
          {facility.hasAmbulance && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              <Ambulance className="h-3 w-3" /> Ambulance
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{facility.riskWarning}</p>
        </div>

        <div className="mt-3 flex items-start gap-2 text-sm text-foreground/80">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p>
            <span className="font-medium text-foreground">Why recommended: </span>
            {facility.recommendationReason}
          </p>
        </div>

        <Button className="mt-5 w-full sm:w-auto">View Details</Button>
      </CardContent>
    </Card>
  );
}
