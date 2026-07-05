/**
 * Core types for the SCCA Solo classification engine.
 *
 * Category ladder (simplified for v1): a mod's `minCategory` is the least
 * prepared category in which it is broadly allowed. The final category for a
 * build is the max of all its mods' minimums. Category-specific exceptions
 * (e.g. no LSD in STS) are modeled as per-mod notes/exceptions until the
 * engine grows class-level rules.
 */

export const CATEGORIES = [
  "street",
  "streetTouring",
  "streetPrepared",
  "streetModified",
  "prepared",
  "modified",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  street: "Street",
  streetTouring: "Street Touring",
  streetPrepared: "Street Prepared",
  streetModified: "Street Modified",
  prepared: "Prepared",
  modified: "Modified",
};

export const CATEGORY_ORDER: Record<Category, number> = {
  street: 0,
  streetTouring: 1,
  streetPrepared: 2,
  streetModified: 3,
  prepared: 4,
  modified: 5,
};

/** Class letters per category for a given car, e.g. { street: "CS", streetTouring: "STR" }. */
export type CarClassMap = Partial<Record<Category, string>>;

export type BodyStyle =
  | "sedan"
  | "coupe"
  | "hatchback"
  | "wagon"
  | "suv"
  | "convertible"
  | "truck"
  | "sports";

/** Physical attributes used to evaluate Appendix A catch-all listings. */
export interface CarAttributes {
  displacementCc: number;
  forcedInduction: boolean;
  seats: number;
  bodyStyle: BodyStyle;
  /** Catch-alls exclude "sports-car-based" vehicles. */
  sportsCarBased: boolean;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  trim?: string;
  yearStart: number;
  yearEnd: number;
  classes: CarClassMap;
  /** Needed for catch-all evaluation; omit if the car is explicitly listed everywhere it runs. */
  attributes?: CarAttributes;
  /**
   * Present when the car is on the Street category exclusion list (§3.1
   * stability). Such cars have no Street class and run in the first more-
   * prepared category where they are listed (e.g. Forester → FSP).
   */
  streetExclusion?: string;
  /** True once checked against the current rulebook's Appendix A. */
  verified: boolean;
  /** True for cars built at runtime from a raw Appendix A listing (tier-2 search). */
  uncurated?: boolean;
  notes?: string;
}

export type ModGroup =
  | "tires-wheels"
  | "suspension"
  | "engine-drivetrain"
  | "brakes"
  | "body-aero"
  | "interior-electrical";

export const MOD_GROUP_LABELS: Record<ModGroup, string> = {
  "tires-wheels": "Tires & Wheels",
  suspension: "Suspension",
  "engine-drivetrain": "Engine & Drivetrain",
  brakes: "Brakes",
  "body-aero": "Body & Aero",
  "interior-electrical": "Interior & Electrical",
};

export interface Mod {
  id: string;
  /** Plain-language label, e.g. "Coilovers / lowering springs". */
  label: string;
  group: ModGroup;
  /** Least prepared category where this is broadly allowed. */
  minCategory: Category;
  /** Citation into the Solo Rules / official cheat sheet. */
  ruleRef: string;
  /** Caveats, e.g. "No LSD allowed in STS". */
  note?: string;
  verified: boolean;
}

export interface ItemVerdict {
  mod: Mod;
  /** "legal" = allowed in Street; "bump" = requires a more prepared category. */
  status: "legal" | "bump";
  requiredCategory: Category;
  /** True when this mod is (one of) the reason(s) for the final category. */
  binding: boolean;
}

/** A defensible classing other than the primary, with the case for choosing it. */
export interface AlternativeClassing {
  category: Category;
  klass: string;
  reasons: string[];
}

export interface ClassificationResult {
  car: Car;
  /** Class if the car were bone stock (Street category). */
  baseClass: string | null;
  finalCategory: Category;
  /** Class letters in the final category, null if unknown for this car. */
  finalClass: string | null;
  /** How the final class was resolved. */
  via: "listed" | "catchall" | null;
  /** The case for the primary classing. */
  reasons: string[];
  /** Other defensible classings and when to choose them. */
  alternatives: AlternativeClassing[];
  items: ItemVerdict[];
  warnings: string[];
}
