import { BodyStyle, Car, Category } from "./types";

/**
 * Appendix A "catch-all" listings — cars not explicitly listed in a category
 * may class via these. Per the Appendix A introduction: "To use the
 * catch-alls ... start from the last class in the category and work up the
 * classes until a class is found" — so specs are ordered last-class-first
 * and the first match wins. Catch-all/NOC classings are Regional only.
 *
 * Body styles: §12 defines "sedan" functionally — "a car capable of
 * transporting four (4) or more average-size adults in normal seating
 * positions" — and §12 definitions apply "regardless of any other
 * definitions or interpretations." Wagons, SUVs, and hatchbacks that seat
 * 4+ therefore qualify as sedans for catch-all purposes; matches via this
 * reading are flagged so the UI can cite §12.
 */
export interface CatchallSpec {
  category: Category;
  klass: string;
  label: string;
  ruleRef: string;
  aspiration: "na" | "fi" | "any";
  minCc?: number;
  maxCc?: number;
  minSeats?: number;
  minCylinders?: number;
  /** Body styles named by the catch-all wording. */
  bodyStyles: BodyStyle[] | "any";
  /** Body styles admitted via the §12 sedan definition (flagged in results). */
  sedanByDefinition?: BodyStyle[];
  excludeSportsCarBased?: boolean;
}

const ST_BODY: BodyStyle[] = ["sedan", "coupe", "hatchback"];
const SEDAN_BY_DEF: BodyStyle[] = ["wagon", "suv"];

// Ordered per the Appendix A "work up from the last class" procedure.
export const CATCHALLS: CatchallSpec[] = [
  // ---- Street (HS → FS → AS) ----
  {
    category: "street",
    klass: "HS",
    label: "RWD pickup trucks (NOC)",
    ruleRef: "Appendix A, H Street catch-all",
    aspiration: "any",
    bodyStyles: ["truck"],
  },
  {
    category: "street",
    klass: "FS",
    label: "V8 sedans, pick-ups, and sedan-derived convertibles (NOC)",
    ruleRef: "Appendix A, F Street catch-all",
    aspiration: "any",
    minCylinders: 8,
    minSeats: 4,
    bodyStyles: ["sedan", "truck", "convertible", "hatchback"],
    sedanByDefinition: SEDAN_BY_DEF,
  },
  {
    category: "street",
    klass: "AS",
    label: "All eligible unclassified cars not covered by another catch-all listing",
    ruleRef: "Appendix A, A Street catch-all",
    aspiration: "any",
    bodyStyles: "any",
  },
  // ---- Street Touring (GST → EST → DST → BST); SST has no catch-all ----
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
    sedanByDefinition: SEDAN_BY_DEF,
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
    sedanByDefinition: SEDAN_BY_DEF,
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
    sedanByDefinition: SEDAN_BY_DEF,
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
    sedanByDefinition: SEDAN_BY_DEF,
    excludeSportsCarBased: true,
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
    sedanByDefinition: SEDAN_BY_DEF,
    excludeSportsCarBased: true,
  },
];

export interface CatchallMatch {
  spec: CatchallSpec;
  /** True when the body style qualifies via §12's sedan definition (wagon/SUV). */
  sedanByDefinition: boolean;
}

/** First catch-all in `category` (in work-up order) the car satisfies. */
export function matchCatchall(car: Car, category: Category): CatchallMatch | null {
  const a = car.attributes;
  if (!a) return null;
  // Displacement/aspiration catch-alls can't be evaluated without these; a car
  // carrying only SM-placement facts (seats/bodyStyle/drivetrain) never matches.
  if (
    a.displacementCc === undefined ||
    a.forcedInduction === undefined ||
    a.sportsCarBased === undefined
  ) {
    return null;
  }
  for (const spec of CATCHALLS) {
    if (spec.category !== category) continue;
    if (spec.aspiration === "na" && a.forcedInduction) continue;
    if (spec.aspiration === "fi" && !a.forcedInduction) continue;
    if (spec.minCc !== undefined && a.displacementCc < spec.minCc) continue;
    if (spec.maxCc !== undefined && a.displacementCc > spec.maxCc) continue;
    if (spec.minSeats !== undefined && a.seats < spec.minSeats) continue;
    if (spec.minCylinders !== undefined && (a.cylinders ?? 0) < spec.minCylinders) continue;
    if (spec.excludeSportsCarBased && a.sportsCarBased) continue;
    if (spec.bodyStyles !== "any" && !spec.bodyStyles.includes(a.bodyStyle)) {
      if (spec.sedanByDefinition?.includes(a.bodyStyle) && a.seats >= 4) {
        return { spec, sedanByDefinition: true };
      }
      continue;
    }
    return { spec, sedanByDefinition: false };
  }
  return null;
}
