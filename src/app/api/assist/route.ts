import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import carsJson from "@/data/cars.json";
import modsJson from "@/data/mods.json";
import { CarsFileSchema, ModsFileSchema } from "@/engine";

export const runtime = "nodejs";

const CARS = CarsFileSchema.parse(carsJson);
const MODS = ModsFileSchema.parse(modsJson);

const RequestSchema = z.object({
  description: z.string().min(3).max(2000),
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

const SYSTEM = `You map a driver's plain-English description of their car and modifications onto a fixed catalog of ids. You NEVER classify the car yourself — a deterministic rules engine does that.

Car catalog (id = description):
${CAR_CATALOG}

Modification catalog (id = description):
${MOD_CATALOG}

Rules:
- Only use ids that appear in the catalogs. Never invent ids.
- carId: best single match for the described car, or null if no confident match.
- modIds: every catalog mod clearly implied by the description. Wider-than-stock performance tires imply "tires-wide-200tw"; sticker/R-comp tires (Hoosier, slicks) imply "tires-rcomp". A "tune" implies "ecu-tune".
- unmatched: short phrases from the description you could NOT map (car or mods). Do not guess.
Respond with ONLY minified JSON: {"carId":string|null,"modIds":string[],"unmatched":string[]}`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "assist-not-configured" }, { status: 503 });
  }

  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: process.env.ASSIST_MODEL ?? "claude-haiku-4-5",
      max_tokens: 600,
      temperature: 0,
      system: SYSTEM,
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

    return NextResponse.json({ carId, modIds, unmatched: parsed.data.unmatched.slice(0, 10) });
  } catch {
    return NextResponse.json({ error: "assist-unavailable" }, { status: 502 });
  }
}
