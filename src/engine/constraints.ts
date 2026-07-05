import { Car } from "./types";

/**
 * Class-level Street Touring constraints — 2026 Solo Rules §14.3 (tire
 * section width), §14.4 (wheel width), §14.10.K (limited-slip differentials).
 * Verified against the rulebook 2026-07-04.
 */

export type Drivetrain = "fwd" | "rwd" | "awd";

/** User-supplied build details that class-level checks need. */
export interface BuildSpec {
  tireWidthMm?: number;
  wheelWidthIn?: number;
  drivetrain?: Drivetrain;
  midEngine?: boolean;
}

export interface StLimits {
  tireWidthMm: number | null; // null = unlimited
  wheelWidthIn: number | null;
  /** True when the limit differs by drivetrain and we had to assume. */
  assumed: boolean;
  detail: string;
}

/**
 * §14.3 / §14.4 limits for one ST class given what we know about the car.
 * When drivetrain is unknown and the class splits on it, returns the most
 * permissive limit with `assumed: true` so callers can warn instead of
 * silently passing or failing.
 */
export function stLimits(klass: string, car: Car, spec: BuildSpec): StLimits | null {
  const dt = spec.drivetrain ?? null;
  const fi = car.attributes?.forcedInduction ?? false;
  const mid = spec.midEngine ?? false;

  switch (klass) {
    case "SST":
      return { tireWidthMm: null, wheelWidthIn: null, assumed: false, detail: "SST: unlimited (§14.3/§14.4)" };
    case "EST":
      return { tireWidthMm: 225, wheelWidthIn: 7.5, assumed: false, detail: "EST: 225mm / 7.5\" (§14.3/§14.4)" };
    case "AST":
    case "CST": {
      if (dt === "awd") return { tireWidthMm: 225, wheelWidthIn: 7.5, assumed: false, detail: `${klass} AWD: 225mm / 7.5\"` };
      if (dt) return { tireWidthMm: 255, wheelWidthIn: 9.0, assumed: false, detail: `${klass} 2WD: 255mm / 9.0\"` };
      return { tireWidthMm: 255, wheelWidthIn: 9.0, assumed: true, detail: `${klass}: AWD 225mm/7.5\" — 2WD 255mm/9.0\"` };
    }
    case "DST": {
      if (dt === "awd") return { tireWidthMm: 245, wheelWidthIn: 8.0, assumed: false, detail: "DST AWD: 245mm / 8.0\"" };
      if (dt) return { tireWidthMm: 265, wheelWidthIn: 9.0, assumed: false, detail: "DST 2WD: 265mm / 9.0\"" };
      return { tireWidthMm: 265, wheelWidthIn: 9.0, assumed: true, detail: "DST: AWD 245mm/8.0\" — 2WD 265mm/9.0\"" };
    }
    case "GST": {
      if (dt === "awd") return { tireWidthMm: 245, wheelWidthIn: 9.0, assumed: false, detail: "GST AWD: 245mm / 9.0\"" };
      if (dt) return { tireWidthMm: 265, wheelWidthIn: 9.0, assumed: false, detail: "GST 2WD: 265mm / 9.0\"" };
      return { tireWidthMm: 265, wheelWidthIn: 9.0, assumed: true, detail: "GST: AWD 245mm — 2WD 265mm; wheels 9.0\"" };
    }
    case "BST": {
      // Tires: 295 for AWD, RWD mid-engine, or RWD forced-induction; 315 for RWD N/A and FWD.
      const narrow = dt === "awd" || (dt === "rwd" && (mid || fi));
      if (dt) {
        const w = narrow ? 295 : 315;
        return { tireWidthMm: w, wheelWidthIn: 11.0, assumed: false, detail: `BST: ${w}mm / 11.0\"` };
      }
      return { tireWidthMm: 315, wheelWidthIn: 11.0, assumed: true, detail: "BST: 295mm (AWD/RWD mid-engine/RWD FI) — 315mm (RWD N/A, FWD); wheels 11.0\"" };
    }
    default:
      return null;
  }
}

export interface LsdRuling {
  allowed: boolean;
  /** Null when it depends on unknown drivetrain. */
  conditional: boolean;
  detail: string;
}

/** §14.10.K — LSD legality per ST class. */
export function lsdRuling(klass: string, spec: BuildSpec): LsdRuling {
  const dt = spec.drivetrain ?? null;
  if (klass === "EST") {
    return {
      allowed: false,
      conditional: false,
      detail: "EST: no LSDs except factory standard viscous units (§14.10.K.1).",
    };
  }
  if (klass === "GST") {
    if (dt === "awd")
      return { allowed: false, conditional: false, detail: "GST: mechanical LSDs are 2WD-only — not permitted on AWD cars (§14.10.K.3)." };
    if (dt)
      return { allowed: true, conditional: false, detail: "GST 2WD: any mechanical LSD (§14.10.K.3)." };
    return { allowed: true, conditional: true, detail: "GST: LSD legal for 2WD only (§14.10.K.3) — select your drivetrain." };
  }
  // SST, AST, BST, CST, DST
  return {
    allowed: true,
    conditional: false,
    detail: `${klass}: 2WD may use any mechanical LSD; AWD may substitute one differential (§14.10.K.2).`,
  };
}
