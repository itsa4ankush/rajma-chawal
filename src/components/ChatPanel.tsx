import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FACILITIES, facilityMatchesNeed, type Facility, type MedicalNeed } from "@/lib/facilities";

const DISCLAIMER =
  "_Results are based on structured Databricks facility intelligence and trust scoring._";

const EXAMPLES = [
  "Find emergency surgery in Bihar",
  "ICU with oxygen in Maharashtra",
  "Dialysis options in Tamil Nadu",
  "Neonatal care in Kerala",
];

const NEED_FIELD: Record<MedicalNeed, keyof Facility> = {
  "Emergency Surgery": "emergency_surgery_capability",
  "ICU + Oxygen": "icu_capability",
  Dialysis: "dialysis_capability",
  "Neonatal Care": "neonatal_capability",
  "Trauma Care": "trauma_capability",
};

interface ParsedQuery {
  state?: string;
  need?: MedicalNeed;
}

function parseQuery(raw: string, knownStates: string[]): ParsedQuery {
  const q = raw.toLowerCase();
  const parsed: ParsedQuery = {};
  for (const s of knownStates) {
    if (q.includes(s.toLowerCase())) {
      parsed.state = s;
      break;
    }
  }
  if (q.includes("surgery")) parsed.need = "Emergency Surgery";
  else if (q.includes("icu") || q.includes("oxygen")) parsed.need = "ICU + Oxygen";
  else if (q.includes("dialysis")) parsed.need = "Dialysis";
  else if (q.includes("neonatal") || q.includes("newborn")) parsed.need = "Neonatal Care";
  else if (q.includes("trauma")) parsed.need = "Trauma Care";
  return parsed;
}

interface RecLine {
  index: number;
  name: string;
  city: string;
  state: string;
  trust_score: number;
  capabilityLabel: string;
  capability: string;
  warning: string;
  reason: string;
}

interface BotMessage {
  text: string;
  recommendations?: RecLine[];
}

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "bot"; content: BotMessage }
  | { role: "loading" };

function MarkdownLite({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("_") && p.endsWith("_"))
          return (
            <em key={i} className="text-muted-foreground">
              {p.slice(1, -1)}
            </em>
          );
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

export function ChatPanel() {
  const [knownStates, setKnownStates] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: {
        text:
          "Hi! I'm **CareMap**. Ask me about hospitals by **state** and **medical need** (emergency surgery, ICU + oxygen, dialysis, neonatal, trauma).\n\n" +
          DISCLAIMER,
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/location-options")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.states)) setKnownStates(d.states);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "loading" }]);

    const parsed = parseQuery(trimmed, knownStates);
    let reply: BotMessage;
    try {
      const res = await fetch("/api/search-facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: parsed.state,
          city: undefined,
          medicalNeed: parsed.need,
        }),
      });
      const data = (await res.json()) as { facilities?: Facility[]; error?: string };
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      const facilities = data.facilities ?? [];
      const need = parsed.need ?? "Emergency Surgery";
      const top = facilities.slice(0, 3);

      const filterDesc = [
        parsed.need ? `**${parsed.need}**` : null,
        parsed.state ? `in **${parsed.state}**` : null,
      ]
        .filter(Boolean)
        .join(" ");

      if (top.length === 0) {
        reply = {
          text:
            `I couldn't find matching facilities${filterDesc ? ` for ${filterDesc}` : ""}. This may indicate a healthcare access gap.\n\n` +
            DISCLAIMER,
        };
      } else {
        const recs: RecLine[] = top.map((f, i) => ({
          index: i + 1,
          name: f.name,
          city: f.address_city,
          state: f.address_stateOrRegion,
          trust_score: f.trust_score,
          capabilityLabel: need,
          capability: String(f[NEED_FIELD[need]] ?? "—"),
          warning: f.risk_warning || "No active warning on record.",
          reason: f.recommendation_reason || "Selected based on trust score and capability.",
        }));
        reply = {
          text: `Top ${recs.length} ${recs.length === 1 ? "facility" : "facilities"}${filterDesc ? ` for ${filterDesc}` : ""}:\n\n${DISCLAIMER}`,
          recommendations: recs,
        };
      }
    } catch (err) {
      reply = {
        text:
          `Sorry, I couldn't fetch facilities right now: ${err instanceof Error ? err.message : "Unknown error"}.\n\n` +
          DISCLAIMER,
      };
    }

    setMessages((m) => {
      const without = m.filter((x) => x.role !== "loading");
      return [...without, { role: "bot", content: reply }];
    });
    setBusy(false);
  }

  return (
    <Card className="border-border/70">
      <CardContent className="p-0 flex flex-col h-[520px]">
        <div className="border-b border-border/60 p-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Ask CareMap</div>
            <div className="text-[11px] text-muted-foreground">
              Structured Databricks facility intelligence + trust scoring
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-2 text-sm">
                    {m.text}
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ) : m.role === "loading" ? (
              <div key={i} className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-muted-foreground inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching Databricks…
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[90%]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 space-y-2">
                    <MarkdownLite text={m.content.text} />
                    {m.content.recommendations && (
                      <ol className="space-y-2 pt-1">
                        {m.content.recommendations.map((r) => (
                          <li
                            key={`${r.index}-${r.name}`}
                            className="rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground/90"
                          >
                            <span className="font-semibold text-foreground">
                              {r.index}. {r.name}, {r.city}, {r.state}
                            </span>
                            {" — "}
                            Trust score{" "}
                            <span className="font-semibold tabular-nums">
                              {r.trust_score}/100
                            </span>
                            . {r.capabilityLabel} capability:{" "}
                            <span className="font-medium">{r.capability}</span>.
                            <div className="mt-1 text-muted-foreground">
                              <span className="text-warning-foreground">⚠ Warning:</span>{" "}
                              {r.warning}
                            </div>
                            <div className="mt-0.5 text-muted-foreground">
                              <span className="font-medium text-foreground/80">Why recommended:</span>{" "}
                              {r.reason}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>

        {messages.length <= 1 && (
          <div className="border-t border-border/60 p-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => void send(ex)}
                className="text-xs rounded-full border border-border bg-card px-3 py-1 hover:bg-accent/10 hover:border-accent/30 text-foreground/80 transition-colors"
                disabled={busy}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="border-t border-border/60 p-3 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about facilities by state and medical need…"
            className="flex-1"
            disabled={busy}
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
