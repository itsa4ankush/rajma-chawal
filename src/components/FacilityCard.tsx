import { AlertTriangle, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Capability, Facility } from "@/lib/facilities";

const capabilityStyles: Record<Capability, string> = {
  High: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/15 text-warning-foreground border-warning/30",
  Low: "bg-destructive/10 text-destructive border-destructive/20",
};

function trustColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-accent";
  return "text-destructive";
}

export function FacilityCard({ facility }: { facility: Facility }) {
  const noWarning = /no active warning/i.test(facility.warning);

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
                {facility.city}, {facility.state} · PIN {facility.pin}
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
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${capabilityStyles[facility.capability]}`}
          >
            {facility.capability} capability
          </span>
          {facility.needs.slice(0, 2).map((n) => (
            <span
              key={n}
              className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {n}
            </span>
          ))}
        </div>

        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed ${
            noWarning
              ? "border-success/20 bg-success/5 text-success"
              : "border-warning/30 bg-warning/10 text-foreground"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{facility.warning}</p>
        </div>

        <div className="mt-3 flex items-start gap-2 text-sm text-foreground/80">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p>
            <span className="font-medium text-foreground">Why recommended: </span>
            {facility.whyRecommended}
          </p>
        </div>

        <Button className="mt-5 w-full sm:w-auto" variant="default">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
