import { matchCatchall } from "./catchalls";
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

interface Resolution {
  category: Category;
  klass: string;
  via: "listed" | "catchall";
  warnings: string[];
}

/**
 * Resolve the car's class within one category:
 * 1. explicit Appendix A listing;
 * 2. category catch-all (displacement/aspiration based) — Regional only.
 */
function resolveInCategory(car: Car, category: Category): Resolution | null {
  const listed = car.classes[category];
  if (listed) return { category, klass: listed, via: "listed", warnings: [] };

  // The Street "all eligible unclassified" catch-all never applies to cars
  // on the §3.1 exclusion list.
  if (category === "street" && car.streetExclusion) return null;

  const match = matchCatchall(car, category);
  if (!match) return null;

  const warnings = [
    `Classed via the ${CATEGORY_LABELS[category]} catch-all — "${match.spec.label}" (${match.spec.ruleRef}). Catch-all/NOC classings are Regional only: not eligible for National Tours or the Solo National Championships.`,
  ];
  if (match.conditionalBody) {
    warnings.push(
      `The catch-all wording covers "Sedans & Coupes" — treatment of ${car.attributes?.bodyStyle}s varies by Region; confirm with your Region or submit to the SEB (letters.scca.com).`,
    );
  }
  warnings.push(
    "Catch-all entries must meet the §3.1 rollover guidelines (vehicle height vs. average track width).",
  );
  return { category, klass: match.spec.klass, via: "catchall", warnings };
}

/**
 * Deterministic classification: given a car and its list of modifications,
 * compute the final category/class and a per-mod verdict explaining exactly
 * which items moved the car and to where.
 *
 * Resolution order at the category the mods imply:
 * explicit listing → category catch-all → escalate to the next more-prepared
 * category where the car resolves (Appendix A: cars run where they are
 * listed) → NOC.
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
    } else if (!resolveInCategory(car, "street")) {
      warnings.push(
        "This car has no Street class in our dataset — it may be Not Otherwise Classified (NOC). Verify against Appendix A.",
      );
    }
  }

  // Resolve final class at the mod-implied category, escalating if needed.
  let resolution = resolveInCategory(car, modCategory);
  if (resolution === null) {
    for (const cat of CATEGORIES.slice(CATEGORY_ORDER[modCategory] + 1)) {
      const r = resolveInCategory(car, cat);
      if (r) {
        resolution = r;
        warnings.push(
          `This car isn't classed in ${CATEGORY_LABELS[modCategory]} — it escalates to ${CATEGORY_LABELS[cat]} (${r.klass}), where it resolves. Verify each modification against ${CATEGORY_LABELS[cat]} allowances.`,
        );
        break;
      }
    }
  }

  let finalCategory: Category = modCategory;
  let finalClass: string | null = null;
  let via: ClassificationResult["via"] = null;
  if (resolution) {
    finalCategory = resolution.category;
    finalClass = resolution.klass;
    via = resolution.via;
    warnings.push(...resolution.warnings);

    // If a catch-all decided it, surface any explicit listing elsewhere —
    // that listing is the National-eligible home.
    if (resolution.via === "catchall") {
      for (const cat of CATEGORIES) {
        const cls = car.classes[cat];
        if (cls) {
          warnings.push(
            `Also explicitly listed in ${CATEGORY_LABELS[cat]} as ${cls} — the National-eligible option for this car.`,
          );
          break;
        }
      }
    }
  } else if (finalCategory !== "street") {
    warnings.push(
      `We don't have a ${CATEGORY_LABELS[finalCategory]} (or more prepared) classing for this car — check Appendix A of the Solo Rules.`,
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

  return { car, baseClass, finalCategory, finalClass, via, items, warnings };
}

/** Human-readable one-liner, e.g. "DS → DST (2 mods responsible)". */
export function summarize(result: ClassificationResult): string {
  const from =
    result.baseClass ?? (result.car.streetExclusion ? "Excluded from Street" : "NOC");
  if (result.finalCategory === "street" && result.finalClass === result.baseClass) {
    return `${from} — all selected items are Street-legal`;
  }
  const to = result.finalClass ?? `${CATEGORY_LABELS[result.finalCategory]} (class TBD)`;
  const suffix = result.via === "catchall" ? " via catch-all, Regional" : "";
  const binding = result.items.filter((i) => i.binding).length;
  if (binding === 0) {
    return `${from} → ${to} (${CATEGORY_LABELS[result.finalCategory]}${suffix})`;
  }
  return `${from} → ${to} (${binding} mod${binding === 1 ? "" : "s"} responsible${suffix})`;
}
