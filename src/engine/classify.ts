import {
  Car,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  Category,
  ClassificationResult,
  ItemVerdict,
  Mod,
} from "./types";

/**
 * Deterministic classification: given a car and its list of modifications,
 * compute the final category/class and a per-mod verdict explaining exactly
 * which items moved the car and to where.
 */
export function classify(car: Car, mods: Mod[]): ClassificationResult {
  const warnings: string[] = [];

  const finalCategory: Category = mods.reduce<Category>(
    (acc, mod) =>
      CATEGORY_ORDER[mod.minCategory] > CATEGORY_ORDER[acc] ? mod.minCategory : acc,
    "street",
  );

  const items: ItemVerdict[] = mods.map((mod) => ({
    mod,
    status: mod.minCategory === "street" ? "legal" : "bump",
    requiredCategory: mod.minCategory,
    binding: mod.minCategory === finalCategory && finalCategory !== "street",
  }));

  const baseClass = car.classes.street ?? null;
  if (baseClass === null) {
    warnings.push(
      "This car has no Street class in our dataset — it may be Not Otherwise Classified (NOC). Verify against Appendix A.",
    );
  }

  const finalClass = car.classes[finalCategory] ?? null;
  if (finalClass === null && finalCategory !== "street") {
    warnings.push(
      `We don't have a ${CATEGORY_LABELS[finalCategory]} class listing for this car yet — check Appendix A of the Solo Rules.`,
    );
  }

  if (!car.verified) {
    warnings.push(
      "This car's class data is seeded but not yet verified against the 2026 rulebook.",
    );
  }
  const unverifiedMods = mods.filter((m) => !m.verified);
  if (unverifiedMods.length > 0) {
    warnings.push(
      `${unverifiedMods.length} selected modification(s) have rule data not yet verified against the 2026 rulebook.`,
    );
  }

  return { car, baseClass, finalCategory, finalClass, items, warnings };
}

/** Human-readable one-liner, e.g. "D Street → STX (2 mods responsible)". */
export function summarize(result: ClassificationResult): string {
  const from = result.baseClass ?? "NOC";
  if (result.finalCategory === "street") {
    return `${from} — all selected items are Street-legal`;
  }
  const to = result.finalClass ?? `${CATEGORY_LABELS[result.finalCategory]} (class TBD)`;
  const binding = result.items.filter((i) => i.binding).length;
  return `${from} → ${to} (${binding} mod${binding === 1 ? "" : "s"} responsible)`;
}
