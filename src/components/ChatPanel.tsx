import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Loader2, MapPin, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Facility, MedicalNeed } from "@/lib/facilities";
import { OFFICIAL_STATE_NAMES, getCanonicalState } from "@/lib/location-normalization";

const EXAMPLES = [
  "I was bitten by a dog in Patna",
  "My father has chest pain in Mumbai",
  "Newborn baby is not breathing properly, Bengaluru",
  "Need dialysis near Patna",
];

const LOCATION_EXAMPLES = ["Patna, Bihar", "Mumbai", "800001"];

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
  awaitingLocation?: boolean;
}

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "bot"; content: BotMessage }
  | { role: "loading" };

interface PendingLocation {
  originalMessage: string;
  intent: ParsedIntent;
}

function MarkdownLite({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <p className="font-serif text-[15px] leading-[1.5] whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>;
        if (p.startsWith("_") && p.endsWith("_"))
          return (
            <em key={i} className="text-caption not-italic font-mono uppercase tracking-[0.08em] text-[11px]">
              {p.slice(1, -1)}
            </em>
          );
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

const URGENCY_TONE: Record<ParsedIntent["urgency"], string> = {
  emergency: "bg-destructive text-paper",
  urgent: "bg-warning text-paper",
  routine: "bg-ink text-paper",
};

export interface ChatPanelProps {
  onSearchStart?: () => void;
  onResults?: (
    facilities: Facility[],
    selectedNeed: MedicalNeed | "",
    source: "live" | "demo",
    intent?: ParsedIntent,
    center?: { lat: number; lng: number } | null,
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

function parseLocationReply(text: string): {
  state?: string;
  city?: string;
  pinCode?: string;
} {
  const out: { state?: string; city?: string; pinCode?: string } = {};
  const pinMatch = text.match(/\b(\d{6})\b/);
  if (pinMatch) out.pinCode = pinMatch[1];

  const lower = text.toLowerCase();
  for (const state of OFFICIAL_STATE_NAMES) {
    if (lower.includes(state.toLowerCase())) {
      out.state = state;
      break;
    }
  }
  if (!out.state) {
    for (const chunk of text.split(/[,;]/).map((c) => c.trim())) {
      const canon = getCanonicalState(chunk);
      if (canon) {
        out.state = canon;
        break;
      }
    }
  }

  let remaining = text;
  if (out.pinCode) remaining = remaining.replace(out.pinCode, "");
  if (out.state) {
    const re = new RegExp(out.state, "ig");
    remaining = remaining.replace(re, "");
  }
  remaining = remaining.replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim();
  if (remaining && remaining.length <= 60 && !/^\d+$/.test(remaining)) {
    out.city = remaining;
  }
  return out;
}

export function ChatPanel({ onSearchStart, onResults }: ChatPanelProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: {
        text:
          "Describe the health problem in plain language — for example *my father has chest pain in Mumbai* or *I was bitten by a dog in Patna* — and I'll find matching facilities nearby.\n\n_I don't give diagnosis or treatment. For emergencies call local services._",
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingLocation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function callApi(payload: {
    message: string;
    state?: string;
    city?: string;
    pinCode?: string;
  }) {
    const res = await fetch("/api/ask-caremap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      needsLocation?: boolean;
      promptForLocation?: string;
      understoodNeed?: string;
      urgency?: ParsedIntent["urgency"];
      userExplanation?: string;
      safetyMessage?: string;
      dataLimitation?: string;
      dataSourceError?: string | null;
      facilities?: Facility[];
      resolvedCenter?: { lat: number; lng: number } | null;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: trimmed }, { role: "loading" }]);

    let reply: BotMessage;

    try {
      let data;
      if (pending) {
        const loc = parseLocationReply(trimmed);
        if (!loc.state && !loc.city && !loc.pinCode) {
          throw new Error(
            "I couldn't recognize a location. Try a city like \"Patna\", a state like \"Bihar\", or a 6-digit PIN code.",
          );
        }
        onSearchStart?.();
        data = await callApi({
          message: pending.originalMessage,
          state: loc.state,
          city: loc.city,
          pinCode: loc.pinCode,
        });
      } else {
        onSearchStart?.();
        data = await callApi({ message: trimmed });
      }

      const intent: ParsedIntent = {
        understoodNeed: data.understoodNeed || "General Medicine",
        urgency: data.urgency || "routine",
        userExplanation: data.userExplanation || "",
        safetyMessage: data.safetyMessage || "",
        dataLimitation: data.dataLimitation || "",
      };

      if (data.needsLocation) {
        onResults?.([], "", "live", undefined, null);
        setPending({
          originalMessage: pending?.originalMessage ?? trimmed,
          intent,
        });
        const safety = intent.safetyMessage ? `${intent.safetyMessage}\n\n` : "";
        reply = {
          text: `${safety}${data.promptForLocation || "Share your location (city, state, or PIN) to find facilities nearby."}`,
          intent,
          awaitingLocation: true,
        };
      } else {
        const facilities = data.facilities ?? [];
        const need = asMedicalNeed(intent.understoodNeed);
        onResults?.(facilities, need, "live", intent, data.resolvedCenter ?? null);
        setPending(null);

        const count = facilities.length;
        const dbxNote = data.dataSourceError
          ? `\n\n_Data source note: ${data.dataSourceError}_`
          : "";
        const safety = intent.safetyMessage ? `${intent.safetyMessage}\n\n` : "";
        const matchLine =
          count === 0
            ? "No matching facilities nearby. Try a different city or PIN."
            : `${count} ${count === 1 ? "facility" : "facilities"} nearby →`;

        reply = {
          text: `${safety}${matchLine}${dbxNote}`,
          intent,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      reply = {
        text: `**Couldn't process that.**\n\n${msg}\n\nIf this is a medical emergency, call local services immediately.`,
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
    <div className="bg-paper flex flex-col h-[640px]">
      {/* Header */}
      <div className="border-b border-hairline p-4 flex items-center gap-2">
        <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-ink">
          AI Intent Parser
        </span>
        <span className="h-2 w-2 bg-ink" />
        <span className="font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption">
          Databricks Intelligence
        </span>
        {pending && (
          <span className="ml-auto inline-flex items-center gap-1 bg-warning text-paper px-2 py-1 font-mono uppercase tracking-[0.08em] text-[10px] font-bold">
            <MapPin className="h-3 w-3" /> Location Needed
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="flex items-start gap-2 max-w-[88%]">
                <div className="bg-ink text-white px-3 py-2 rounded-2xl text-[14px] leading-snug">
                  {m.text}
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-white">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          ) : m.role === "loading" ? (
            <div key={i} className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-white">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="border-l-[3px] border-caption pl-3 py-1 font-mono uppercase tracking-[0.1em] text-[11px] font-bold text-caption inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing intent…
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="flex items-start gap-2 max-w-[92%]">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    m.content.isError ? "border-destructive bg-white text-destructive" : "border-hairline bg-white text-ink"
                  }`}
                >
                  {m.content.isError ? <AlertTriangle className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl bg-oat-light/60 ${
                    m.content.isError
                      ? "border-l-[3px] border-destructive"
                      : ""
                  }`}
                >
                  {m.content.intent && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span
                        className={`font-mono uppercase tracking-[0.08em] text-[10px] font-bold px-2 py-1 ${URGENCY_TONE[m.content.intent.urgency]}`}
                      >
                        {m.content.intent.urgency}
                      </span>
                      <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold px-2 py-1 border border-ink text-ink">
                        {m.content.intent.understoodNeed}
                      </span>
                      {m.content.awaitingLocation && (
                        <span className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold px-2 py-1 bg-warning text-paper inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Location
                        </span>
                      )}
                    </div>
                  )}
                  <MarkdownLite text={m.content.text} />
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Quick suggestions */}
      {pending ? (
        <div className="border-t border-hairline p-3 flex flex-wrap gap-2">
          <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption self-center mr-1">
            Try
          </span>
          {LOCATION_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => void send(ex)}
              className="font-mono uppercase tracking-[0.08em] text-[10px] font-bold border border-ink bg-paper px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
              disabled={busy}
            >
              {ex}
            </button>
          ))}
        </div>
      ) : messages.length <= 1 ? (
        <div className="border-t border-hairline p-3 flex flex-wrap gap-2">
          <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption self-center mr-1 w-full sm:w-auto">
            Try Asking
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => void send(ex)}
              className="font-serif text-[12px] border border-hairline bg-paper px-3 py-1.5 hover:border-ink hover:text-link transition-colors disabled:opacity-40"
              disabled={busy}
            >
              {ex}
            </button>
          ))}
        </div>
      ) : null}

      {/* Input — printerly 2px border */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t-2 border-ink p-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            pending
              ? "City, state, or 6-digit PIN…"
              : "Describe the health problem…"
          }
          className="flex-1"
          disabled={busy}
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={busy} variant="inverted">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
