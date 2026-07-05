import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import carsJson from "@/data/cars.json";
import modsJson from "@/data/mods.json";
import { CarsFileSchema, ModsFileSchema } from "@/engine";
import { allowDaily, allowSliding, LruCache, normalizeQuery } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 15;

const CARS = CarsFileSchema.parse(carsJson);
const MODS = ModsFileSchema.parse(modsJson);

// ---- Cost guardrails ------------------------------------------------------
// Per-request: input is ~5k tokens (90% served from Anthropic's prompt cache
// after the first call per instance), output capped at 400 tokens.
// Per-IP: 6 calls / 5 min, 40 / day. Per-instance: 300 calls / day.
// Identical queries are served from an in-memory LRU without an API call.
// The final backstop is the spend limit in the Anthropic Console.
const PER_IP_WINDOW = { max: 6, windowMs: 5 * 60_000 };
const PER_IP_DAILY = 40;
const INSTANCE_DAILY = 300;
const MAX_OUTPUT_TOKENS = 400;
const MAX_INPUT_CHARS = 500;

const responseCache = new LruCache<object>(500, 24 * 60 * 60_000);

const RequestSchema = z.object({
  description: z.string().min(3).max(MAX_INPUT_CHARS),
});

const AssistSchema = z.object({
  carId: z.string().nullable(),
  modIds: z.array(z.string()),
  unmatched: z.array(z.string()),
});

const CAR_CATALOG = CARS.map(
  (c) => `${c.id} = ${c.yearStart}-${c.yearEnd} ${c.make} ${c.model}${c.trim ? ` ${c.trim}` : ""}`,
).join("\n");

const MOD_CATALOG = MODS.map((m) => `${m.id} = ${m.label}`).join("\n");

// Split so the big static block carries Anthropic's prompt-cache marker:
// cache writes cost 1.25x once, cache reads cost 0.1x thereafter.
const SYSTEM_STATIC = `You map a driver's plain-English description of their car and modifications onto a fixed catalog of ids. You NEVER classify the car yourself — a deterministic rules engine does that.

Car catalog (id = description):
${CAR_CATALOG}

Modification catalog (id = description):
${MOD_CATALOG}`;

const SYSTEM_RULES = `Rules:
- Only use ids that appear in the catalogs. Never invent ids.
- carId: best single match for the described car, or null if no confident match.
- modIds: every catalog mod clearly implied by the description. Wider-than-stock performance tires imply "tires-wide-200tw"; sticker/R-comp tires (Hoosier, slicks) imply "tires-rcomp". A "tune" implies "ecu-tune".
- unmatched: short phrases from the description you could NOT map (car or mods). Do not guess.
Respond with ONLY minified JSON: {"carId":string|null,"modIds":string[],"unmatched":string[]}`;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "assist-not-configured" }, { status: 503 });
  }

  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  // Serve repeats without touching the API (shared links, double-clicks).
  const cacheKey = normalizeQuery(body.data.description);
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "x-assist-cache": "hit" } });
  }

  // Rate limits — per IP, then per instance.
  const ip = clientIp(req);
  if (
    !allowSliding(`ip:${ip}`, PER_IP_WINDOW.max, PER_IP_WINDOW.windowMs) ||
    !allowDaily(`ip-day:${ip}`, PER_IP_DAILY)
  ) {
    return NextResponse.json(
      { error: "rate-limited" },
      { status: 429, headers: { "Retry-After": "300" } },
    );
  }
  if (!allowDaily("instance", INSTANCE_DAILY)) {
    // Daily budget exhausted — degrade exactly like the feature being off.
    return NextResponse.json({ error: "assist-not-configured" }, { status: 503 });
  }

  try {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 12_000 });
    const message = await client.messages.create({
      model: process.env.ASSIST_MODEL ?? "claude-haiku-4-5",
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      system: [
        {
          type: "text",
          text: SYSTEM_STATIC,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: SYSTEM_RULES },
      ],
      messages: [{ role: "user", content: body.data.description }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?|```$/g, "");

    const parsed = AssistSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return NextResponse.json({ error: "assist-parse-failed" }, { status: 502 });
    }

    // Clamp to known ids — defense in depth against hallucinated ids.
    const carId =
      parsed.data.carId && CARS.some((c) => c.id === parsed.data.carId)
        ? parsed.data.carId
        : null;
    const modIds = parsed.data.modIds.filter((id) => MODS.some((m) => m.id === id));
    const result = { carId, modIds, unmatched: parsed.data.unmatched.slice(0, 10) };

    responseCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "assist-unavailable" }, { status: 502 });
  }
}
