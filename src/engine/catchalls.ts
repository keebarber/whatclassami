import { BodyStyle, Car, Category } from "./types";

/**
 * Appendix A "catch-all" listings — cars not explicitly listed in a category
 * may class via these. Per the Appendix A introduction, catch-all/NOC
 * classings are NOT eligible for National Tours or the National
 * Championships (Regional competition only).
 *
 * All catch-all entries carry the rulebook footnote: "All vehicles must meet
 * the requirements of Section 3.1" (rollover guidelines).
 */
export interface CatchallSpec {
  category: Category;
  /** Class letters awarded by this catch-all. */
  klass: string;
  /** Quoted rulebook wording. */
  label: string;
  ruleRef: string;
  /** "na" = normally aspirated, "fi" = forced induction, "any". */
  aspiration: "na" | "fi" | "any";
  /** Displacement bounds in cc (inclusive). */
  minCc?: number;
  maxCc?: number;
  minSeats?: number;
  /** Body styles squarely covered by the wording. */
  bodyStyles: BodyStyle[] | "any";
  /** Body styles commonly accepted but not literally in the wording — match with a caveat. */
  conditionalBodyStyles?: BodyStyle[];
  excludeSportsCarBased?: boolean;
}

const ST_BODY: BodyStyle[] = ["sedan", "coupe", "hatchback"];
const ST_BODY_CONDITIONAL: BodyStyle[] = ["wagon", "suv"];

export const CATCHALLS: CatchallSpec[] = [
  {
    category: "street",
    klass: "AS",
    label: "All eligible unclassified cars not covered by another catch-all listing",
    ruleRef: "Appendix A, A Street catch-all",
    aspiration: "any",
    bodyStyles: "any",
  },
  {
    category: "streetTouring",
    klass: "BST",
    label:
      "Sedans & Coupes NOC (non-sports-car-based; 4-seat min.; over 5.1L normally aspirated)",
    ruleRef: "Appendix A, BST catch-all",
    aspiration: "na",
    minCc: 5101,
    minSeats: 4,
    bodyStyles: ST_BODY,
    conditionalBodyStyles: ST_BODY_CONDITIONAL,
    excludeSportsCarBased: true,
  },
  {
    category: "streetTouring",
    klass: "BST",
    label:
      "Sedans & Coupes NOC (non-sports-car-based; 4-seat min.; 2.5L to 3.1L forced induction)",
    ruleRef: "Appendix A, BST catch-all",
    aspiration: "fi",
    minCc: 2500,
    maxCc: 3100,
    minSeats: 4,
    bodyStyles: ST_BODY,
    conditionalBodyStyles: ST_BODY_CONDITIONAL,
    excludeSportsCarBased: true,
  },
  {
    category: "streetTouring",
    klass: "DST",
    label:
      "Sedans & Coupes NOC (non-sports-car-based; 4-seat minimum; 3.1L to 5.1L normally aspirated)",
    ruleRef: "Appendix A, DST catch-all",
    aspiration: "na",
    minCc: 3100,
    maxCc: 5100,
    minSeats: 4,
    bodyStyles: ST_BODY,
    conditionalBodyStyles: ST_BODY_CONDITIONAL,
    excludeSportsCarBased: true,
  },
  {
    category: "streetTouring",
    klass: "EST",
    label:
      "Sedans & Coupes NOC (non-sports-car-based; 4-seat minimum; less than 3.1L (3100cc) normally-aspirated)",
    ruleRef: "Appendix A, EST catch-all",
    aspiration: "na",
    maxCc: 3099,
    minSeats: 4,
    bodyStyles: ST_BODY,
    conditionalBodyStyles: ST_BODY_CONDITIONAL,
    excludeSportsCarBased: true,
  },
  {
    category: "streetTouring",
    klass: "GST",
    label:
      "Sedans & Coupes NOC (non-sports-car-based; 4-seat minimum; less than 2.5L (2500cc) forced-induction)",
    ruleRef: "Appendix A, GST catch-all",
    aspiration: "fi",
    maxCc: 2499,
    minSeats: 4,
    bodyStyles: ST_BODY,
    conditionalBodyStyles: ST_BODY_CONDITIONAL,
    excludeSportsCarBased: true,
  },
];

export interface CatchallMatch {
  spec: CatchallSpec;
  /** True when the body style is only conditionally covered (e.g. wagons). */
  conditionalBody: boolean;
}

/** Find the first catch-all in `category` that the car's attributes satisfy. */
export function matchCatchall(car: Car, category: Category): CatchallMatch | null {
  const a = car.attributes;
  if (!a) return null;
  for (const spec of CATCHALLS) {
    if (spec.category !== category) continue;
    if (spec.aspiration === "na" && a.forcedInduction) continue;
    if (spec.aspiration === "fi" && !a.forcedInduction) continue;
    if (spec.minCc !== undefined && a.displacementCc < spec.minCc) continue;
    if (spec.maxCc !== undefined && a.displacementCc > spec.maxCc) continue;
    if (spec.minSeats !== undefined && a.seats < spec.minSeats) continue;
    if (spec.excludeSportsCarBased && a.sportsCarBased) continue;
    if (spec.bodyStyles !== "any" && !spec.bodyStyles.includes(a.bodyStyle)) {
      if (spec.conditionalBodyStyles?.includes(a.bodyStyle)) {
        return { spec, conditionalBody: true };
      }
      continue;
    }
    return { spec, conditionalBody: false };
  }
  return null;
}
