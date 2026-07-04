import {
  Car,
  CATEGORIES,
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
 *
 * Escalation rule (Appendix A: "start from the last class in the category and
 * work up"): if the car has no listing in the category its mods imply, it
 * runs in the next more-prepared category where it IS listed — e.g. a
 * non-turbo Forester with Street Touring-level mods runs FSP, because the
 * car is only listed in Street Prepared.
 */
export function classify(car: Car, mods: Mod[]): ClassificationResult {
  const warnings: string[] = [];

  // Least-prepared category the mods allow.
  const modCategory: Category = mods.reduce<Category>(
    (acc, mod) =>
      CATEGORY_ORDER[mod.minCategory] > CATEGORY_ORDER[acc] ? mod.minCategory : acc,
    "street",
  );

  const items: ItemVerdict[] = mods.map((mod) => ({
    mod,
    status: mod.minCategory === "street" ? "legal" : "bump",
    requiredCategory: mod.minCategory,
    binding: mod.minCategory === modCategory && modCategory !== "street",
  }));

  const baseClass = car.classes.street ?? null;
  if (baseClass === null) {
    if (car.streetExclusion) {
      warnings.push(`Excluded from the Street category: ${car.streetExclusion}`);
    } else {
      warnings.push(
        "This car has no Street class in our dataset — it may be Not Otherwise Classified (NOC). Verify against Appendix A.",
      );
    }
  }

  // Resolve final class, escalating past categories where the car isn't listed.
  let finalCategory: Category = modCategory;
  let finalClass = car.classes[modCategory] ?? null;
  if (finalClass === null) {
    for (const cat of CATEGORIES.slice(CATEGORY_ORDER[modCategory] + 1)) {
      const cls = car.classes[cat];
      if (cls) {
        finalCategory = cat;
        finalClass = cls;
        warnings.push(
          `This car isn't classed in ${CATEGORY_LABELS[modCategory]} — it escalates to ${CATEGORY_LABELS[cat]} (${cls}), where it is listed. Verify each modification against ${CATEGORY_LABELS[cat]} allowances.`,
        );
        break;
      }
    }
  }

  if (finalClass === null && finalCategory !== "street") {
    warnings.push(
      `We don't have a ${CATEGORY_LABELS[finalCategory]} (or more prepared) class listing for this car yet — check Appendix A of the Solo Rules.`,
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

/** Human-readable one-liner, e.g. "DS → DST (2 mods responsible)". */
export function summarize(result: ClassificationResult): string {
  const from =
    result.baseClass ?? (result.car.streetExclusion ? "Excluded from Street" : "NOC");
  if (result.finalCategory === "street") {
    return `${from} — all selected items are Street-legal`;
  }
  const to = result.finalClass ?? `${CATEGORY_LABELS[result.finalCategory]} (class TBD)`;
  const binding = result.items.filter((i) => i.binding).length;
  if (binding === 0) {
    return `${from} → ${to} (car is listed in ${CATEGORY_LABELS[result.finalCategory]})`;
  }
  return `${from} → ${to} (${binding} mod${binding === 1 ? "" : "s"} responsible)`;
}
