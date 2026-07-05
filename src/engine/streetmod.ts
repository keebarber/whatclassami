import { AlternativeClassing, Car } from "./types";

/**
 * Street Modified placement (SSM / SM / SMF).
 *
 * Unlike Street / Street Touring / Street Prepared, Street Modified is **not** a
 * per-car Appendix A listing. The rulebook (2026 Solo Rules, Street Modified
 * category) places any eligible car by drivetrain, body, and a short make-based
 * eligibility list:
 *
 *   • SSM — all 2-seat cars (not excluded); all Porsche; McLaren MP4-12C;
 *           Lotus Elise/Exige/Evora/Esprit; plus all SM/SMF-eligible cars.
 *   • SMF — all front-wheel-drive vehicles (the FWD-specific class).
 *   • SM  — all sedans/coupes originally built with 4+ seats and 4 belts,
 *           all FWD cars, and pickups (RWD/AWD land here).
 *
 * Excluded from SM entirely: Lotus other than Elise/Exige/Evora/Esprit
 * (they are not SSM-listed either, so they are not SM-eligible at all).
 * Triumph, MGB GT, and non-924/928/944/968 Porsche are excluded from SM but are
 * 2-seaters / all-Porsche and so resolve to SSM.
 *
 * These are National-eligible classes — NOT Regional-only catch-alls, so no
 * Regional warning is attached.
 *
 * Returns `null` when we lack the attributes to place the car, so callers fall
 * back to the honest "no Street Modified classing" path rather than guess.
 */

const CITE =
  "2026 Solo Rules, Street Modified category (SSM/SM/SMF eligibility & placement)";
const NATIONAL = "Street Modified classes are National-eligible (not Regional-only).";

export interface SmResolution {
  klass: "SSM" | "SM" | "SMF";
  reasons: string[];
  warnings: string[];
  alternatives: AlternativeClassing[];
}

function ssm(why: string): SmResolution {
  return { klass: "SSM", reasons: [why, `${NATIONAL} ${CITE}.`], warnings: [], alternatives: [] };
}

const SM_BODIES = new Set([
  "sedan",
  "coupe",
  "hatchback",
  "wagon",
  "suv",
  "convertible",
  "truck",
]);

export function resolveStreetModified(car: Car): SmResolution | null {
  const make = car.make.toLowerCase();
  const model = car.model.toLowerCase();

  // --- Make-based routing to SSM (exotics), no attributes required ---
  if (make === "porsche") {
    return ssm('SSM lists "Porsche (all)" — every Porsche runs Super Street Modified.');
  }
  if (make === "mclaren" && model.includes("mp4-12c")) {
    return ssm("The McLaren MP4-12C is explicitly SSM-listed.");
  }
  if (make === "lotus") {
    if (/(elise|exige|evora|esprit)/.test(model)) {
      return ssm("SSM lists the Lotus Elise, Exige, Evora & Esprit.");
    }
    return null; // other Lotus: excluded from SM and not SSM-listed → not SM-eligible
  }

  const a = car.attributes;
  if (!a) return null; // need seats / body / drivetrain to place a mainstream car

  const dt = a.drivetrain;

  // --- FWD → SMF (checked first: a FWD 2-seater like a CRX/del Sol runs SMF,
  //     not SSM — "All FWD vehicles" is the FWD-specific class) ---
  if (dt === "fwd") {
    return {
      klass: "SMF",
      reasons: [
        `Front-wheel drive → SMF, the Street Modified FWD class ("All FWD vehicles"). ${CITE}.`,
        NATIONAL,
      ],
      warnings: [],
      alternatives: [
        {
          category: "streetModified",
          klass: "SM",
          reasons: [
            "FWD cars are also SM-eligible; most run SMF for its lighter weight formula, but SM is a legal alternative.",
          ],
        },
      ],
    };
  }

  // --- 2-seat (RWD/AWD) cars → SSM ---
  if (a.seats <= 2) {
    return ssm(
      `Two-seat cars run in SSM — "All 2-seat cars not excluded" (this car seats ${a.seats}).`,
    );
  }

  // --- 4+-seat sedans/coupes and pickups (RWD/AWD) → SM ---
  if (!SM_BODIES.has(a.bodyStyle)) return null;

  const bodyNote =
    a.bodyStyle === "truck"
      ? "pickup truck"
      : `${a.seats}-seat ${a.bodyStyle} (4+ seats → SM-eligible)`;

  if (dt === "rwd" || dt === "awd") {
    return {
      klass: "SM",
      reasons: [
        `${dt.toUpperCase()} ${bodyNote} → SM ("all sedans/coupes with 4+ seats … and pickups"). ${CITE}.`,
        NATIONAL,
      ],
      warnings: [],
      alternatives: [],
    };
  }

  // Body qualifies but drivetrain is unknown — can't split SM vs SMF; surface it.
  return {
    klass: "SM",
    reasons: [`Eligible for Street Modified as a ${bodyNote}. ${CITE}.`, NATIONAL],
    warnings: [
      "Drivetrain not set: front-wheel-drive cars run in SMF (the FWD-specific class); RWD/AWD run in SM. Set the car's drivetrain to place precisely.",
    ],
    alternatives: [
      {
        category: "streetModified",
        klass: "SMF",
        reasons: ["If this car is front-wheel drive, it runs SMF rather than SM."],
      },
    ],
  };
}
