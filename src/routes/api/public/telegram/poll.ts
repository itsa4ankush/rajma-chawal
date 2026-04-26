import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TG_GATEWAY = "https://connector-gateway.lovable.dev/telegram";
const MAX_RUNTIME_MS = 50_000;
const MIN_REMAINING_MS = 6_000;

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}
interface TelegramChat {
  id: number;
  type: string;
}
interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
}
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface AskCaremapFacility {
  name: string;
  address_city?: string;
  address_stateOrRegion?: string;
  address_zipOrPostcode?: string;
  trust_score?: number;
  matchedCapability?: string;
  is_24_7?: boolean;
  has_ambulance?: boolean;
  latitude?: number;
  longitude?: number;
}
interface AskCaremapResponse {
  needsLocation?: boolean;
  understoodNeed?: string;
  urgency?: string;
  userExplanation?: string;
  safetyMessage?: string;
  promptForLocation?: string;
  dataLimitation?: string;
  dataSourceError?: string | null;
  facilities?: AskCaremapFacility[];
}

function escapeMd(s: string): string {
  // Telegram MarkdownV2 escape
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`);
}

function formatReply(resp: AskCaremapResponse): string {
  const lines: string[] = [];

  if (resp.urgency === "emergency") {
    lines.push("🚨 *EMERGENCY*");
  }
  if (resp.userExplanation) {
    lines.push(escapeMd(resp.userExplanation));
  }
  if (resp.safetyMessage) {
    lines.push(`⚠️ ${escapeMd(resp.safetyMessage)}`);
  }

  if (resp.needsLocation) {
    lines.push("");
    lines.push(escapeMd(resp.promptForLocation || "Please share your city, district, state, or 6-digit PIN code."));
    return lines.join("\n");
  }

  if (resp.dataSourceError) {
    lines.push("");
    lines.push(escapeMd("Live facility data is temporarily unavailable. Please try again shortly."));
    return lines.join("\n");
  }

  const facilities = (resp.facilities ?? []).slice(0, 3);
  if (facilities.length === 0) {
    lines.push("");
    lines.push(escapeMd("No matching facilities found. Try broadening your location or rephrasing."));
    return lines.join("\n");
  }

  lines.push("");
  lines.push(`*Top ${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"}*`);

  facilities.forEach((f, i) => {
    const cityState = [f.address_city, f.address_stateOrRegion].filter(Boolean).join(", ");
    const trust =
      typeof f.trust_score === "number" ? `Trust ${Math.round(f.trust_score)}/100` : "";
    const cap = f.matchedCapability ? f.matchedCapability : "";
    const tags: string[] = [];
    if (f.is_24_7) tags.push("24/7");
    if (f.has_ambulance) tags.push("Ambulance");

    lines.push("");
    lines.push(`*${i + 1}\\. ${escapeMd(f.name)}*`);
    if (cityState) lines.push(escapeMd(cityState));
    if (cap) lines.push(`• ${escapeMd(cap)}`);
    if (trust || tags.length) {
      lines.push(`• ${escapeMd([trust, ...tags].filter(Boolean).join(" · "))}`);
    }
    if (
      typeof f.latitude === "number" &&
      typeof f.longitude === "number" &&
      f.latitude !== 0 &&
      f.longitude !== 0
    ) {
      const url = `https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`;
      lines.push(`[Open in Maps](${url})`);
    }
  });

  if (resp.dataLimitation) {
    lines.push("");
    lines.push(`_${escapeMd(resp.dataLimitation)}_`);
  }

  return lines.join("\n");
}

async function tgCall(
  method: string,
  body: Record<string, unknown>,
  lovableKey: string,
  tgKey: string,
): Promise<Response> {
  return fetch(`${TG_GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tgKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function sendMessage(
  chatId: number,
  text: string,
  lovableKey: string,
  tgKey: string,
): Promise<void> {
  const res = await tgCall(
    "sendMessage",
    { chat_id: chatId, text, parse_mode: "MarkdownV2", disable_web_page_preview: true },
    lovableKey,
    tgKey,
  );
  if (!res.ok) {
    // Fallback: try plain text without markdown if MarkdownV2 parsing failed
    const errBody = await res.text().catch(() => "");
    console.error(`Telegram sendMessage failed [${res.status}]: ${errBody.slice(0, 300)}`);
    await tgCall(
      "sendMessage",
      { chat_id: chatId, text: text.replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, "$1") },
      lovableKey,
      tgKey,
    ).catch(() => undefined);
  }
}

async function answerOne(
  origin: string,
  msg: TelegramMessage,
  lovableKey: string,
  tgKey: string,
): Promise<void> {
  const text = (msg.text ?? "").trim();
  if (!text) return;

  if (text === "/start" || text === "/help") {
    await sendMessage(
      msg.chat.id,
      escapeMd(
        "Namaste! I'm Raahat. Tell me what you need and where, e.g. 'dialysis in Patna' or 'newborn emergency Bhopal'. I'll find the most trusted nearby facilities.",
      ),
      lovableKey,
      tgKey,
    );
    return;
  }

  try {
    const res = await fetch(`${origin}/api/ask-caremap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text.slice(0, 1000) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`ask-caremap failed [${res.status}]: ${body.slice(0, 300)}`);
      await sendMessage(
        msg.chat.id,
        escapeMd("Something went wrong on my end. Please try again in a moment."),
        lovableKey,
        tgKey,
      );
      return;
    }
    const data = (await res.json()) as AskCaremapResponse;
    const reply = formatReply(data);
    await sendMessage(msg.chat.id, reply, lovableKey, tgKey);
  } catch (err) {
    console.error("answerOne error:", err);
    await sendMessage(
      msg.chat.id,
      escapeMd("I couldn't process that just now. Please try again shortly."),
      lovableKey,
      tgKey,
    );
  }
}

interface PollResult {
  ok: boolean;
  processed: number;
  finalOffset: number;
  iterations: number;
  error?: string;
}

async function runPoll(origin: string): Promise<PollResult> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

  const start = Date.now();
  let processed = 0;
  let iterations = 0;

  const { data: state, error: stateErr } = await supabaseAdmin
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();
  if (stateErr) throw new Error(`state read failed: ${stateErr.message}`);

  let currentOffset = Number(state.update_offset) || 0;

  while (true) {
    const elapsed = Date.now() - start;
    const remaining = MAX_RUNTIME_MS - elapsed;
    if (remaining < MIN_REMAINING_MS) break;

    // Long-poll up to ~30s, but cap so we still have time to process and respond.
    const timeoutSec = Math.min(30, Math.max(1, Math.floor(remaining / 1000) - 5));

    iterations++;
    const res = await fetch(`${TG_GATEWAY}/getUpdates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout: timeoutSec,
        allowed_updates: ["message"],
      }),
    });
    const data = (await res.json()) as { ok?: boolean; result?: TelegramUpdate[] };
    if (!res.ok) {
      throw new Error(`getUpdates failed [${res.status}]`);
    }
    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Persist the raw updates first so we never lose them.
    const rows = updates
      .filter((u) => u.message)
      .map((u) => ({
        update_id: u.update_id,
        chat_id: u.message!.chat.id,
        text: u.message!.text ?? null,
        raw_update: u as never,
      }));

    if (rows.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("telegram_messages")
        .upsert(rows, { onConflict: "update_id" });
      if (insErr) throw new Error(`message upsert failed: ${insErr.message}`);
    }

    // Advance offset BEFORE answering so a slow ask-caremap can't cause a re-poll loop.
    const newOffset = Math.max(...updates.map((u) => u.update_id)) + 1;
    const { error: offErr } = await supabaseAdmin
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (offErr) throw new Error(`offset update failed: ${offErr.message}`);
    currentOffset = newOffset;

    // Answer messages in parallel (cap concurrency).
    await Promise.all(
      updates
        .filter((u) => u.message?.text)
        .map((u) => answerOne(origin, u.message!, LOVABLE_API_KEY, TELEGRAM_API_KEY)),
    );

    processed += rows.length;
  }

  return { ok: true, processed, finalOffset: currentOffset, iterations };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/telegram/poll")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const origin = `${url.protocol}//${url.host}`;
          const result = await runPoll(origin);
          return jsonResponse(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("telegram poll error:", message);
          return jsonResponse({ ok: false, error: message }, 500);
        }
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const origin = `${url.protocol}//${url.host}`;
          const result = await runPoll(origin);
          return jsonResponse(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("telegram poll error:", message);
          return jsonResponse({ ok: false, error: message }, 500);
        }
      },
    },
  },
});
