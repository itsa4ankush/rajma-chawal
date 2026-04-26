import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, AlertTriangle, Database, Info, MessageSquare, ShieldCheck, Stethoscope, TestTube2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FacilityCard } from "@/components/FacilityCard";
import { PlannerDashboard } from "@/components/PlannerDashboard";
import { ChatPanel, type ParsedIntent } from "@/components/ChatPanel";
import { DatabricksStatusCard } from "@/components/DatabricksStatusCard";
import { type Facility, type MedicalNeed } from "@/lib/facilities";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "CareMap India — Find trusted healthcare facilities" },
      {
        name: "description",
        content:
          "Find trusted hospitals across India by state, city, and medical need. Capability levels, trust scores, and clear warnings.",
      },
      { property: "og:title", content: "CareMap India" },
      {
        property: "og:description",
        content: "Find trusted care from messy healthcare data.",
      },
    ],
  }),
});

const URGENCY_BADGE: Record<ParsedIntent["urgency"], string> = {
  emergency: "border-destructive/40 bg-destructive/10 text-destructive",
  urgent: "border-warning/40 bg-warning/15 text-warning-foreground",
  routine: "border-border bg-muted text-foreground",
};

function Index() {
  const [results, setResults] = useState<Facility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<MedicalNeed | "">("");
  const [dataSource, setDataSource] = useState<"live" | "demo" | null>(null);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              CareMap India
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Find trusted care from messy healthcare data
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Verified sources
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto mb-6">
            <TabsTrigger value="search">Patient / Health Worker</TabsTrigger>
            <TabsTrigger value="dashboard">NGO / Planner</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <ChatPanel
                  onSearchStart={() => {
                    setLoading(true);
                  }}
                  onResults={(facilities, need, source, parsedIntent) => {
                    setResults(facilities);
                    setSelectedNeed(need);
                    setDataSource(source);
                    setIntent(parsedIntent ?? null);
                    setLoading(false);
                  }}
                />
              </div>

              <section aria-label="Results" className="lg:col-span-3">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {loading
                      ? "Searching facilities..."
                      : results
                        ? `${results.length} facility${results.length === 1 ? "" : "s"} found`
                        : "Ask CareMap to see facilities"}
                  </h2>
                  <div className="flex items-center gap-2">
                    {dataSource && !loading && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          dataSource === "live"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-warning/40 bg-warning/15 text-warning-foreground"
                        }`}
                      >
                        {dataSource === "live" ? (
                          <>
                            <Database className="h-3 w-3" /> Live Databricks data
                          </>
                        ) : (
                          <>
                            <TestTube2 className="h-3 w-3" /> Demo data
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* LLM-parsed intent panel */}
                {intent && !loading && (
                  <div className="mb-3 rounded-xl border border-border/70 bg-card p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Understood as
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {intent.understoodNeed}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${URGENCY_BADGE[intent.urgency]}`}
                      >
                        {intent.urgency}
                      </span>
                    </div>
                    {intent.userExplanation && (
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {intent.userExplanation}
                      </p>
                    )}
                    {intent.safetyMessage && (
                      <Alert
                        className={
                          intent.urgency === "emergency"
                            ? "border-destructive/40 bg-destructive/10"
                            : "border-warning/40 bg-warning/10"
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Safety guidance</AlertTitle>
                        <AlertDescription>{intent.safetyMessage}</AlertDescription>
                      </Alert>
                    )}
                    {intent.dataLimitation && (
                      <Alert className="border-border bg-muted/40">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Data limitation</AlertTitle>
                        <AlertDescription>{intent.dataLimitation}</AlertDescription>
                      </Alert>
                    )}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Results based on available facility data — please verify by calling the facility before traveling.
                    </p>
                  </div>
                )}

                {dataSource === "demo" && !loading && results && results.length > 0 && (
                  <Alert className="mb-3 border-warning/40 bg-warning/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Live Databricks connection is unavailable.</AlertTitle>
                    <AlertDescription>
                      Showing demo facility data so the app keeps working. Reconnect Databricks for live results.
                    </AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-48 animate-pulse rounded-xl border border-border/60 bg-card"
                      />
                    ))}
                  </div>
                ) : results === null ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                    <MessageSquare className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Ask a question on the left to see matching facilities here.
                    </p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      No matching facilities for that question. Try rephrasing or broadening it.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {results.map((f) => (
                      <FacilityCard key={f.id} facility={f} selectedNeed={selectedNeed} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            <PlannerDashboard />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          <div>Sample data shown for demonstration. Always verify with the facility before travel.</div>
          <DatabricksStatusCard />
        </footer>
      </main>
    </div>
  );
}
