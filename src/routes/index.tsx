import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Database,
  Info,
  List as ListIcon,
  Map as MapIcon,
  MessageSquare,
  Rows,
  TestTube2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FacilityCard } from "@/components/FacilityCard";
import { FacilitiesMapClient as FacilitiesMap } from "@/components/FacilitiesMapClient";
import { PlannerDashboard } from "@/components/PlannerDashboard";
import { ChatPanel, type ParsedIntent } from "@/components/ChatPanel";
import { DatabricksStatusCard } from "@/components/DatabricksStatusCard";
import { TruthGapAudit } from "@/components/TruthGapAudit";
import { type Facility, type MedicalNeed } from "@/lib/facilities";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Raahat India — Find trusted healthcare facilities" },
      {
        name: "description",
        content:
          "Find trusted hospitals across India by state, city, and medical need. Capability levels, trust scores, and clear warnings.",
      },
      { property: "og:title", content: "Raahat India" },
      {
        property: "og:description",
        content: "Find trusted care from messy healthcare data.",
      },
    ],
  }),
});

const URGENCY_BADGE: Record<ParsedIntent["urgency"], string> = {
  emergency: "bg-destructive text-white",
  urgent: "bg-warning text-ink",
  routine: "bg-ink text-white",
};

function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono uppercase tracking-[0.1em] text-[11px] font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function RibbonHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="ribbon-bar flex items-center justify-between">
      <span>{children}</span>
    </div>
  );
}

type ViewMode = "both" | "map" | "list";

function Index() {
  const [results, setResults] = useState<Facility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<MedicalNeed | "">("");
  const [dataSource, setDataSource] = useState<"live" | "demo" | null>(null);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<ViewMode>("both");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openSignal, setOpenSignal] = useState<{ id: string; n: number } | null>(null);

  const showMap = (view === "both" || view === "map") && results !== null && results.length > 0;
  const showList = view === "both" || view === "list";

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* Top utility strip */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2 text-[11px] sm:px-6">
          <span className="font-mono uppercase tracking-[0.12em]">
            Raahat · Field Edition
          </span>
          <span className="hidden sm:inline font-mono uppercase tracking-[0.12em] text-white/70">
            Verified facility intelligence · India
          </span>
        </div>
      </div>

      {/* Masthead */}
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12">
          <div className="text-center">
            <Kicker className="text-caption">Issue 01 · Healthcare Intelligence</Kicker>
            <h1 className="mt-3 font-display text-5xl sm:text-7xl lg:text-[88px] font-black leading-[0.93] tracking-[-0.02em] text-ink">
              Raahat
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-serif text-base sm:text-lg leading-relaxed text-page-ink">
              Find trusted care from messy healthcare data — hospital capability,
              trust scores, and clear warnings, sourced from public records and
              cross-checked rosters.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <Tabs defaultValue="search" className="w-full">
          <div className="mb-8 flex justify-center">
            <TabsList>
              <TabsTrigger value="search">Patient · Health Worker</TabsTrigger>
              <TabsTrigger value="dashboard">NGO · Planner</TabsTrigger>
              <TabsTrigger value="audit">Truth Gap Audit</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="mt-0">
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-12 lg:gap-8">
              {/* LEFT — Ask Raahat column */}
              <section
                aria-label="Ask Raahat"
                className="lg:col-span-5 lg:border-r lg:border-hairline lg:pr-8"
              >
                <RibbonHeader>Ask Raahat</RibbonHeader>
                <div className="mt-3 rounded-2xl border border-hairline bg-card shadow-[var(--shadow-clay)] overflow-hidden">
                  <ChatPanel
                    onSearchStart={() => setLoading(true)}
                    onResults={(facilities, need, source, parsedIntent, resolvedCenter) => {
                      setResults(facilities);
                      setSelectedNeed(need);
                      setDataSource(source);
                      setIntent(parsedIntent ?? null);
                      setCenter(resolvedCenter ?? null);
                      setActiveId(null);
                      setLoading(false);
                    }}
                  />
                </div>
              </section>

              {/* RIGHT — Editorial results column */}
              <section aria-label="Results" className="lg:col-span-7 mt-8 lg:mt-0">
                <RibbonHeader>
                  <span className="flex items-center gap-3">
                    <span>
                      {loading
                        ? "Searching…"
                        : results
                          ? `${results.length} ${results.length === 1 ? "Facility" : "Facilities"}`
                          : "Facilities"}
                    </span>
                    {dataSource && !loading && (
                      <span className="flex items-center gap-1 text-ink/70">
                        <span className="h-3 w-px bg-ink/30" />
                        {dataSource === "live" ? (
                          <>
                            <Database className="h-3 w-3" /> Live
                          </>
                        ) : (
                          <>
                            <TestTube2 className="h-3 w-3" /> Demo
                          </>
                        )}
                      </span>
                    )}
                    {results && results.length > 0 && !loading && (
                      <span className="ml-auto flex items-center rounded-lg border border-hairline bg-white overflow-hidden">
                        {(
                          [
                            { v: "both", label: "Both", Icon: Rows },
                            { v: "map", label: "Map", Icon: MapIcon },
                            { v: "list", label: "List", Icon: ListIcon },
                          ] as const
                        ).map(({ v, label, Icon }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            aria-pressed={view === v}
                            className={`flex items-center gap-1 px-2 py-1 font-mono uppercase tracking-[0.08em] text-[10px] font-bold transition-colors ${
                              view === v
                                ? "bg-ink text-white"
                                : "bg-transparent text-ink/60 hover:bg-oat-light hover:text-ink"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{label}</span>
                          </button>
                        ))}
                      </span>
                    )}
                  </span>
                </RibbonHeader>

                {/* Intent panel removed */}

                {dataSource === "demo" && !loading && results && results.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Live Databricks unavailable</AlertTitle>
                    <AlertDescription>
                      Showing demo facility data so the app keeps working.
                      Reconnect Databricks for live results.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Map (above cards) */}
                {showMap && (
                  <div className="mt-6">
                    <FacilitiesMap
                      facilities={results!}
                      selectedNeed={selectedNeed}
                      centerHint={center}
                      activeId={activeId}
                      onMarkerHover={setActiveId}
                      onMarkerClick={(id) =>
                        setOpenSignal({ id, n: (openSignal?.n ?? 0) + 1 })
                      }
                      height={view === "map" ? 620 : 400}
                    />
                  </div>
                )}

                {/* Results list */}
                <div className="mt-6">
                  {loading ? (
                    <div className="grid grid-cols-1 gap-4">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-44 animate-pulse rounded-2xl bg-muted border border-hairline"
                        />
                      ))}
                    </div>
                  ) : results === null ? (
                    <div className="rounded-2xl border border-hairline bg-card p-12 text-center shadow-[var(--shadow-clay)]">
                      <MessageSquare className="mx-auto mb-4 h-6 w-6 text-caption" />
                      <Kicker className="text-caption">Awaiting Query</Kicker>
                      <p className="mt-3 text-base text-page-ink">
                        Ask a question on the left to see matching facilities here.
                      </p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="rounded-2xl border border-hairline bg-card p-12 text-center shadow-[var(--shadow-clay)]">
                      <Kicker className="text-caption">No Match</Kicker>
                      <p className="mt-3 text-base text-page-ink">
                        No matching facilities for that question. Try rephrasing or
                        broadening your search.
                      </p>
                    </div>
                  ) : showList ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.map((f, idx) => (
                        <FacilityCard
                          key={f.id}
                          facility={f}
                          selectedNeed={selectedNeed}
                          index={idx + 1}
                          isActive={activeId === f.id}
                          onHover={setActiveId}
                          openSignal={
                            openSignal?.id === f.id ? openSignal.n : undefined
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            <PlannerDashboard />
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <TruthGapAudit />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-footer-ink text-white rounded-t-[40px]">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight text-white">
              Raahat
            </h2>
            <p className="mt-2 font-mono uppercase tracking-[0.12em] text-[11px] text-white/60">
              Healthcare Intelligence · India
            </p>
          </div>
          <div className="mx-auto mt-8 h-px max-w-md bg-white/20" />
          <div className="mt-6 text-center">
            <p className="text-sm text-white/80">
              Sample data shown for demonstration. Always verify with the
              facility before travel.
            </p>
            <div className="mt-4 flex justify-center">
              <DatabricksStatusCard />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
