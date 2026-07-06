import { Car, CrossClassing } from "./types";

/**
 * Classic American Muscle (CAM) and Xtreme Street (XS) eligibility.
 *
 * These are **parallel** National categories, not rungs on the Street → …→
 * Modified prep ladder — an eligible car can choose to run them regardless of
 * its Street/ST/SP class. So they're surfaced as cross-eligibility alongside the
 * primary classification, not through the mod-ceiling escalation.
 *
 * CAM (2026 Solo Rules §21 / Appendix A): North American, front-engine RWD,
 * non-EV/hybrid cars.
 *   • CAM-S — domestic front-engine RWD 2-seaters (+ '65-67 Cobra replicas).
 *   • CAM-T — 4+-seat (or truck/SUV) with a body originating 1948-2000.
 *   • CAM-C — same but body originating after 2000.
 * XS (XA/XB): 200-treadwear category for sports sedans/coupes/sports cars; the
 * XA vs XB split is by weight-vs-minimum, which we can't compute without curb
 * weight, so it's surfaced as one entry. Cars eligible for any CAM class are
 * excluded from XA/XB, as are Street stability-exclusion-list cars.
 */

const NA_MAKES = [
  "chevrolet",
  "chevy",
  "gmc",
  "buick",
  "pontiac",
  "oldsmobile",
  "cadillac",
  "ford",
  "mercury",
  "lincoln",
  "dodge",
  "chrysler",
  "plymouth",
  "jeep",
  "ram",
  "amc",
  "studebaker",
  "saturn",
  "hummer",
  "shelby",
];

const isNorthAmerican = (car: Car): boolean => {
  const make = car.make.toLowerCase();
  return NA_MAKES.some((m) => make.includes(m));
};

// EV/hybrid and mid-engine cars are excluded from CAM (front-engine ICE only).
const isElectricOrHybrid = (car: Car): boolean =>
  car.make.toLowerCase() === "tesla" ||
  /mach-e|e-ray|eray|bolt|\bev\b/.test(`${car.id} ${car.model}`.toLowerCase());

const isMidEngine = (car: Car): boolean =>
  /corvette-c8|fiero/.test(car.id.toLowerCase());

/** CAM class for a car, or null if not CAM-eligible. */
function camClass(car: Car): CrossClassing | null {
  if (!isNorthAmerican(car) || isElectricOrHybrid(car) || isMidEngine(car)) return null;
  const a = car.attributes;
  // CAM requires front-engine RWD; without a known RWD drivetrain we don't guess.
  if (!a || a.drivetrain !== "rwd") return null;

  const CITE = "2026 Solo Rules §21 / Appendix A (Classic American Muscle)";
  if (a.seats <= 2) {
    return {
      klass: "CAM-S",
      label: "Classic American Muscle",
      reasons: [
        `Domestic front-engine RWD 2-seater → CAM-S. ${CITE}.`,
        "A popular home for American RWD sports cars (Corvette, Viper, Solstice/Sky); National-eligible.",
      ],
    };
  }
  if (a.seats >= 4 || a.bodyStyle === "truck" || a.bodyStyle === "suv") {
    const traditional = car.yearStart <= 2000;
    return {
      klass: traditional ? "CAM-T" : "CAM-C",
      label: "Classic American Muscle",
      reasons: traditional
        ? [
            `North American front-engine RWD, body originating ${car.yearStart} (1948-2000) with 4+ seats → CAM-T. ${CITE}.`,
            "CAM-T cars may also run CAM-C if they meet the CAM-C minimum weight.",
          ]
        : [
            `North American front-engine RWD, body originating ${car.yearStart} (after 2000) with 4+ seats → CAM-C. ${CITE}.`,
          ],
    };
  }
  return null;
}

/** XS (XA/XB) eligibility, or null. */
function xsEligibility(car: Car, camEligible: boolean): CrossClassing | null {
  if (car.streetExclusion) return null; // excluded from all X classes (§3.1 list)
  if (camEligible) return null; // CAM-eligible cars are excluded from XA/XB
  if (!car.attributes) return null; // only surface for cars we actually know
  return {
    klass: "XA/XB",
    label: "Xtreme Street",
    reasons: [
      "Eligible for Xtreme Street, the 200-treadwear (200TW) category for sports sedans, coupes, and sports cars.",
      "XA vs XB is set by weight against the class minimums (by drivetrain) — pick the class your car's weight meets. National-eligible.",
    ],
  };
}

/**
 * XP (X Prepared) — the open Prepared class. Per Appendix A, "any vehicle …
 * listed in another Prepared class, specifically listed in CP, DP, EP, FP, or
 * listed at the end, is eligible for XP." A row's single `prepared` slot holds
 * its natural CP/DP/EP/FP class, so XP is surfaced as the open alternative for
 * any Prepared-listed car (more allowances — engine/drivetrain/bodywork — at a
 * higher minimum weight).
 */
function xpEligibility(car: Car): CrossClassing | null {
  const prep = car.classes.prepared;
  if (!prep || prep === "XP") return null;
  return {
    klass: "XP",
    label: "X Prepared (open)",
    reasons: [
      `Any car listed in another Prepared class (here ${prep}) is eligible for XP, the open Prepared class — near-unrestricted engine/drivetrain/bodywork at a higher minimum weight (§17 / Appendix A).`,
      "National-eligible; choose XP over " + prep + " when a build exceeds the tighter class's allowances.",
    ],
  };
}

// Pure electric (not hybrid) → EVX exhibition class.
const isPureEV = (car: Car): boolean => {
  const s = `${car.id} ${car.model}`.toLowerCase();
  return (
    car.make.toLowerCase() === "tesla" ||
    /ioniq|\bev6\b|taycan|mach-e|\bi4\b|\bbolt\b|\bleaf\b/.test(s)
  );
};

/** Solo Spec Coupe (SSC) — the gen-1 Toyota 86 / Subaru BRZ / Scion FR-S spec chassis (§20). */
function sscEligibility(car: Car): CrossClassing | null {
  if (car.id !== "subaru-brz-toyota-86-gen1") return null;
  return {
    klass: "SSC",
    label: "Solo Spec Coupe",
    reasons: [
      "The gen-1 Toyota 86 / Subaru BRZ / Scion FR-S is the Solo Spec Coupe chassis — a single-model spec class with a defined parts package (§20). Tight, low-cost, driver-focused racing.",
    ],
  };
}

/** Electric Vehicle Experimental (EVX) — 2026 exhibition class for pure EVs (Appendix B). */
function evxEligibility(car: Car): CrossClassing | null {
  if (!isPureEV(car)) return null;
  return {
    klass: "EVX",
    label: "Electric Vehicle Experimental",
    reasons: [
      "As a battery-electric car this is eligible for EVX, the 2026 exhibition class for EVs (Appendix B). (EVs may also run Street Modified by drivetrain/seats.)",
    ],
  };
}

/** CAM + XS + XP + spec-class cross-eligibility for a car (may be empty). */
export function crossEligibility(car: Car): CrossClassing[] {
  const out: CrossClassing[] = [];
  const cam = camClass(car);
  if (cam) out.push(cam);
  const xs = xsEligibility(car, cam !== null);
  if (xs) out.push(xs);
  const xp = xpEligibility(car);
  if (xp) out.push(xp);
  const ssc = sscEligibility(car);
  if (ssc) out.push(ssc);
  const evx = evxEligibility(car);
  if (evx) out.push(evx);
  return out;
}
