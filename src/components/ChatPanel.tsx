import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Facility, MedicalNeed } from "@/lib/facilities";

const EXAMPLES = [
  "I was bitten by a dog, what hospitals are nearby?",
  "My father has chest pain",
  "Newborn baby is not breathing properly",
  "Need dialysis near Patna",
];

export interface ParsedIntent {
  understoodNeed: string;
  urgency: "emergency" | "urgent" | "routine";
  userExplanation: string;
  safetyMessage: string;
  dataLimitation: string;
}

interface BotMessage {
  text: string;
  intent?: ParsedIntent;
  isError?: boolean;
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

const URGENCY_TONE: Record<ParsedIntent["urgency"], string> = {
  emergency: "border-destructive/40 bg-destructive/10 text-destructive",
  urgent: "border-warning/40 bg-warning/15 text-warning-foreground",
  routine: "border-border bg-muted text-foreground",
};

export interface ChatPanelProps {
  onSearchStart?: () => void;
  onResults?: (
    facilities: Facility[],
    selectedNeed: MedicalNeed | "",
    source: "live" | "demo",
    intent?: ParsedIntent,
  ) => void;
}

const SUPPORTED_NEEDS: MedicalNeed[] = [
  "Emergency Surgery",
  "ICU + Oxygen",
  "Dialysis",
  "Neonatal Care",
  "Trauma Care",
  "Emergency Care",
  "Maternal Care",
  "General Medicine",
  "Vaccination / Post-exposure Care",
];

function asMedicalNeed(v: string): MedicalNeed | "" {
  return (SUPPORTED_NEEDS as string[]).includes(v) ? (v as MedicalNeed) : "";
}

export function ChatPanel({ onSearchStart, onResults }: ChatPanelProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: {
        text:
          "Hi! I'm **CareMap**. Describe the health problem in plain language — for example *\"my father has chest pain\"* or *\"I was bitten by a dog\"* — and I'll find matching facilities.\n\n_I don't give medical diagnosis or treatment. For emergencies, please call local emergency services._",
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "loading" }]);
    onSearchStart?.();

    let reply: BotMessage;

    try {
      const res = await fetch("/api/ask-caremap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as {
        understoodNeed?: string;
        urgency?: ParsedIntent["urgency"];
        userExplanation?: string;
        safetyMessage?: string;
        dataLimitation?: string;
        dataSourceError?: string | null;
        facilities?: Facility[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      const intent: ParsedIntent = {
        understoodNeed: data.understoodNeed || "General Medicine",
        urgency: data.urgency || "routine",
        userExplanation: data.userExplanation || "",
        safetyMessage: data.safetyMessage || "",
        dataLimitation: data.dataLimitation || "",
      };
      const facilities = data.facilities ?? [];
      const need = asMedicalNeed(intent.understoodNeed);
      onResults?.(facilities, need, "live", intent);

      const count = facilities.length;
      const dbxNote = data.dataSourceError
        ? `\n\n**Data source note:** ${data.dataSourceError}`
        : "";
      const matchLine =
        count === 0
          ? "I couldn't find matching facilities in the available data. This may indicate a healthcare access gap in your area."
          : `Showing **${count}** matching ${count === 1 ? "facility" : "facilities"} on the right →`;

      reply = {
        text: `**Understood as:** ${intent.understoodNeed} · _${intent.urgency}_\n\n${intent.safetyMessage}\n\n${matchLine}${dbxNote}`,
        intent,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      onResults?.([], "", "live", undefined);
      reply = {
        text: `**I couldn't process that question right now.**\n\n${msg}\n\nPlease try again in a moment. If this is a medical emergency, call local emergency services immediately.`,
        isError: true,
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
      <CardContent className="p-0 flex flex-col h-[640px]">
        <div className="border-b border-border/60 p-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Ask CareMap</div>
            <div className="text-[11px] text-muted-foreground">
              AI intent parser + Databricks facility intelligence
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Understanding your question…
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[90%]">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      m.content.isError
                        ? "bg-destructive/15 text-destructive"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {m.content.isError ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl rounded-tl-sm px-3 py-2 ${
                      m.content.isError
                        ? "border border-destructive/30 bg-destructive/5"
                        : "bg-muted"
                    }`}
                  >
                    {m.content.intent && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${URGENCY_TONE[m.content.intent.urgency]}`}
                        >
                          {m.content.intent.urgency}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                          {m.content.intent.understoodNeed}
                        </span>
                      </div>
                    )}
                    <MarkdownLite text={m.content.text} />
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
            placeholder="Describe the health problem in your own words…"
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
