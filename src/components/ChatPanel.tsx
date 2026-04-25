import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FACILITIES,
  INDIAN_STATES,
  facilityMatchesNeed,
  type Facility,
  type MedicalNeed,
} from "@/lib/facilities";

type ParsedQuery = {
  state?: string;
  need?: MedicalNeed;
  intent: "search" | "desert" | "explain-low-trust" | "unknown";
};

const EXAMPLES = [
  "Find emergency surgery in Bihar",
  "Find ICU with oxygen in Maharashtra",
  "Where are dialysis deserts?",
  "Why is this hospital low trust?",
];

function parseQuery(raw: string): ParsedQuery {
  const q = raw.toLowerCase();
  const parsed: ParsedQuery = { intent: "unknown" };

  for (const s of INDIAN_STATES) {
    if (q.includes(s.toLowerCase())) {
      parsed.state = s;
      break;
    }
  }

  if (q.includes("emergency surgery") || q.includes("surgery")) {
    parsed.need = "Emergency Surgery";
  } else if (q.includes("icu") || q.includes("oxygen")) {
    parsed.need = "ICU + Oxygen";
  } else if (q.includes("dialysis")) {
    parsed.need = "Dialysis";
  } else if (q.includes("neonatal") || q.includes("baby") || q.includes("newborn")) {
    parsed.need = "Neonatal Care";
  } else if (q.includes("trauma") || q.includes("accident")) {
    parsed.need = "Trauma Care";
  }

  if (q.includes("desert")) parsed.intent = "desert";
  else if (q.includes("low trust") || q.includes("why") || q.includes("risky")) {
    parsed.intent = "explain-low-trust";
  } else if (parsed.need || parsed.state) parsed.intent = "search";

  return parsed;
}

type BotMessage = {
  text: string;
  facilities?: Facility[];
  cities?: { city: string; state: string; gap: string }[];
};

function answer(query: string): BotMessage {
  const parsed = parseQuery(query);
  const disclaimer =
    "_Recommendations are based on structured capability extraction plus trust scoring — not just keyword search._";

  if (parsed.intent === "explain-low-trust") {
    return {
      text:
        "A facility gets a **low trust score** when its self-reported capabilities can't be cross-verified — for example, missing anesthesiologist on the staff roster, no confirmed oxygen supply, or no record of 24/7 emergency availability in public health directories. The audit report on each facility lists the specific findings that pushed the score down.\n\n" +
        disclaimer,
    };
  }

  if (parsed.intent === "desert") {
    const map = new Map<string, { total: number; highSurg: number; highICU: number; dialysis: number; state: string }>();
    for (const f of FACILITIES) {
      const k = `${f.city}|${f.state}`;
      const r = map.get(k) ?? { total: 0, highSurg: 0, highICU: 0, dialysis: 0, state: f.state };
      r.total += 1;
      if (f.emergencySurgeryCapability === "High") r.highSurg += 1;
      if (f.icuCapability === "High") r.highICU += 1;
      if (f.dialysisCapability === "High" || f.dialysisCapability === "Medium") r.dialysis += 1;
      map.set(k, r);
    }
    const deserts = Array.from(map.entries())
      .filter(([, r]) => r.dialysis === 0)
      .map(([k, r]) => ({ city: k.split("|")[0], state: r.state, gap: "No verified dialysis capacity" }));

    if (deserts.length === 0) {
      return {
        text:
          "Good news — every city in the current dataset has at least one facility with verified dialysis capacity.\n\n" +
          disclaimer,
      };
    }
    return {
      text: `Found **${deserts.length} dialysis desert${deserts.length === 1 ? "" : "s"}** in the dataset:\n\n${disclaimer}`,
      cities: deserts,
    };
  }

  if (parsed.intent === "search") {
    let list = FACILITIES;
    if (parsed.state) list = list.filter((f) => f.state === parsed.state);
    if (parsed.need) list = list.filter((f) => facilityMatchesNeed(f, parsed.need!));
    list = [...list].sort((a, b) => b.trustScore - a.trustScore).slice(0, 5);

    const filterDesc = [
      parsed.need ? `**${parsed.need}**` : null,
      parsed.state ? `in **${parsed.state}**` : null,
    ]
      .filter(Boolean)
      .join(" ");

    if (list.length === 0) {
      return {
        text: `I couldn't find facilities matching ${filterDesc || "your query"}. Try a different state or capability.\n\n${disclaimer}`,
      };
    }

    return {
      text: `Top ${list.length} facilities for ${filterDesc}, ranked by trust score:\n\n${disclaimer}`,
      facilities: list,
    };
  }

  return {
    text:
      "I can help you find facilities by **state** and **medical need** (emergency surgery, ICU + oxygen, dialysis, neonatal, trauma), or explain **why a hospital has low trust**. Try one of the example questions below.\n\n" +
      disclaimer,
  };
}

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "bot"; content: BotMessage };

function MarkdownLite({ text }: { text: string }) {
  // Minimal markdown: **bold**, _italic_, line breaks
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("_") && p.endsWith("_"))
          return <em key={i} className="text-muted-foreground">{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: {
        text:
          "Hi! I'm **CareMap**. Ask me about hospitals by state and medical need, or about coverage gaps. Recommendations come from structured capability extraction plus trust scoring — not just keyword search.",
      },
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = answer(trimmed);
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "bot", content: reply }]);
    setInput("");
  }

  return (
    <Card className="border-border/70">
      <CardContent className="p-0 flex flex-col h-[520px]">
        {/* Header */}
        <div className="border-b border-border/60 p-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Ask CareMap</div>
            <div className="text-[11px] text-muted-foreground">
              Structured capability + trust-score search
            </div>
          </div>
        </div>

        {/* Messages */}
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
            ) : (
              <div key={i} className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[90%]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 space-y-2">
                    <MarkdownLite text={m.content.text} />

                    {m.content.facilities && (
                      <ul className="space-y-1.5 pt-1">
                        {m.content.facilities.map((f) => (
                          <li
                            key={f.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{f.name}</div>
                              <div className="text-muted-foreground truncate">
                                {f.city}, {f.state}
                              </div>
                            </div>
                            <span className="shrink-0 font-semibold tabular-nums text-foreground">
                              {f.trustScore}
                              <span className="text-muted-foreground font-normal">/100</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {m.content.cities && (
                      <ul className="space-y-1 pt-1">
                        {m.content.cities.map((c) => (
                          <li
                            key={`${c.city}-${c.state}`}
                            className="rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs"
                          >
                            <span className="font-medium text-foreground">
                              {c.city}, {c.state}
                            </span>{" "}
                            <span className="text-muted-foreground">— {c.gap}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>

        {/* Examples */}
        {messages.length <= 1 && (
          <div className="border-t border-border/60 p-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => send(ex)}
                className="text-xs rounded-full border border-border bg-card px-3 py-1 hover:bg-accent/10 hover:border-accent/30 text-foreground/80 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border/60 p-3 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about facilities or coverage gaps…"
            className="flex-1"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
