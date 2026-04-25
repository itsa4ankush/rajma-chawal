import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FacilityCard } from "@/components/FacilityCard";
import { PlannerDashboard } from "@/components/PlannerDashboard";
import { ChatPanel } from "@/components/ChatPanel";
import { DatabricksStatusCard } from "@/components/DatabricksStatusCard";
import {
  MEDICAL_NEEDS,
  type Facility,
  type MedicalNeed,
} from "@/lib/facilities";

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

function Index() {
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [need, setNeed] = useState<MedicalNeed | "">("");
  const [results, setResults] = useState<Facility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [citiesByState, setCitiesByState] = useState<Record<string, string[]>>({});
  const [locationsLoading, setLocationsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/location-options")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.states)) {
          setStates(data.states);
          setCitiesByState(data.citiesByState ?? {});
        }
      })
      .catch(() => {
        /* keep empty; UI will show no options */
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cityOptions = state ? (citiesByState[state] ?? []) : [];

  async function runSearch() {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch("/api/search-facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: state || undefined,
          city: city.trim() || undefined,
          medicalNeed: need || undefined,
        }),
      });
      const payload = (await res.json()) as { facilities?: Facility[]; error?: string };
      if (!res.ok) {
        throw new Error(payload.error || `Request failed (${res.status})`);
      }
      setResults(payload.facilities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch facilities");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-6">
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-6">
            <TabsTrigger value="search">Patient / Health Worker</TabsTrigger>
            <TabsTrigger value="dashboard">NGO / Planner</TabsTrigger>
            <TabsTrigger value="chat">Ask CareMap</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <section
              aria-label="Search facilities"
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runSearch();
                }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state" className="w-full">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="need">Medical need</Label>
                  <Select value={need} onValueChange={(v) => setNeed(v as MedicalNeed)}>
                    <SelectTrigger id="need" className="w-full">
                      <SelectValue placeholder="Select need" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICAL_NEEDS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </form>
            </section>

            <section aria-label="Results" className="mt-6 sm:mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {loading
                    ? "Searching facilities..."
                    : results
                      ? `${results.length} facility${results.length === 1 ? "" : "s"} found`
                      : "Search to see facilities"}
                </h2>
                <span className="text-xs text-muted-foreground">Sorted by trust score</span>
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Could not load facilities</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-48 animate-pulse rounded-xl border border-border/60 bg-card"
                    />
                  ))}
                </div>
              ) : !hasSearched ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Choose a state, city, or medical need and click Search.
                  </p>
                </div>
              ) : results && results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No matching facilities. Try broadening your filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {results?.map((f) => (
                    <FacilityCard key={f.id} facility={f} selectedNeed={need} />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            <PlannerDashboard />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <div className="max-w-2xl mx-auto">
              <ChatPanel />
            </div>
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
