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
import { FacilitiesMap } from "@/components/FacilitiesMap";
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
  emergency: "bg-destructive text-paper",
  urgent: "bg-warning text-paper",
  routine: "bg-ink text-paper",
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
            CareMap · Field Edition
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
              CareMap
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
            </TabsList>
          </div>

          <TabsContent value="search" className="mt-0">
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-12 lg:gap-8">
              {/* LEFT — Ask CareMap column */}
              <section
                aria-label="Ask CareMap"
                className="lg:col-span-5 lg:border-r lg:border-hairline lg:pr-8"
              >
                <RibbonHeader>Ask CareMap</RibbonHeader>
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
                      <span className="flex items-center gap-1 text-paper/70">
                        <span className="h-3 w-px bg-paper/40" />
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
                      <span className="ml-auto flex items-center border border-paper/40">
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
                                ? "bg-paper text-ink"
                                : "bg-transparent text-paper/80 hover:bg-paper/10"
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

                {/* Intent panel — editorial pull-quote treatment */}
                {intent && !loading && (
                  <div className="border-x border-b-2 border-ink border-b-ink border-x-hairline bg-paper p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Kicker className="text-caption">Understood as</Kicker>
                      <span className="font-mono uppercase tracking-[0.08em] text-[11px] font-bold border-2 border-ink bg-paper px-2 py-1 text-ink">
                        {intent.understoodNeed}
                      </span>
                      <span
                        className={`font-mono uppercase tracking-[0.1em] text-[10px] font-bold px-2 py-1 ${URGENCY_BADGE[intent.urgency]}`}
                      >
                        {intent.urgency}
                      </span>
                    </div>

                    {intent.userExplanation && (
                      <p className="mt-4 font-serif text-base leading-[1.5] text-page-ink">
                        {intent.userExplanation}
                      </p>
                    )}

                    {intent.safetyMessage && (
                      <Alert
                        variant={intent.urgency === "emergency" ? "destructive" : "default"}
                        className="mt-4"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Safety guidance</AlertTitle>
                        <AlertDescription>{intent.safetyMessage}</AlertDescription>
                      </Alert>
                    )}
                    {intent.dataLimitation && (
                      <Alert className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Data limitation</AlertTitle>
                        <AlertDescription>{intent.dataLimitation}</AlertDescription>
                      </Alert>
                    )}

                    <p className="mt-4 border-t border-hairline pt-3 font-mono uppercase tracking-[0.08em] text-[10px] text-caption">
                      Verify by calling the facility before traveling
                    </p>
                  </div>
                )}

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
                    <div className="grid grid-cols-1 gap-0 divide-y divide-ink border-t border-b border-ink">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-44 animate-pulse bg-muted"
                        />
                      ))}
                    </div>
                  ) : results === null ? (
                    <div className="border border-hairline bg-paper p-12 text-center">
                      <MessageSquare className="mx-auto mb-4 h-6 w-6 text-caption" />
                      <Kicker className="text-caption">Awaiting Query</Kicker>
                      <p className="mt-3 font-serif text-base text-page-ink">
                        Ask a question on the left to see matching facilities here.
                      </p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="border border-hairline bg-paper p-12 text-center">
                      <Kicker className="text-caption">No Match</Kicker>
                      <p className="mt-3 font-serif text-base text-page-ink">
                        No matching facilities for that question. Try rephrasing or
                        broadening your search.
                      </p>
                    </div>
                  ) : showList ? (
                    <div className="border-t border-ink">
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
        </Tabs>
      </main>

      {/* Footer — the ONLY inverted region */}
      <footer className="mt-16 bg-footer-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight">
              CareMap
            </h2>
            <p className="mt-2 font-mono uppercase tracking-[0.12em] text-[11px] text-paper/60">
              Healthcare Intelligence · India
            </p>
          </div>
          <div className="mx-auto mt-8 h-px max-w-md bg-paper/20" />
          <div className="mt-6 text-center">
            <p className="font-serif text-sm text-paper/80">
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
