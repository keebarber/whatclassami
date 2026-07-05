import { matchCatchall } from "./catchalls";
import {
  AlternativeClassing,
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
  reasons: string[];
  warnings: string[];
}

/**
 * Resolve the car's class within one category:
 * 1. explicit Appendix A listing;
 * 2. category catch-all (displacement/aspiration based) — Regional only.
 */
function resolveInCategory(car: Car, category: Category): Resolution | null {
  const listed = car.classes[category];
  if (listed) {
    return {
      category,
      klass: listed,
      via: "listed",
      reasons: [
        `Explicitly listed in Appendix A under ${CATEGORY_LABELS[category]} — unambiguous at tech and National-eligible.`,
      ],
      warnings: [],
    };
  }

  // The Street "all eligible unclassified" catch-all never applies to cars
  // on the §3.1 exclusion list.
  if (category === "street" && car.streetExclusion) return null;

  const match = matchCatchall(car, category);
  if (!match) return null;

  const a = car.attributes!;
  const reasons = [
    `Fits the ${match.spec.klass} catch-all — "${match.spec.label}": this car is ${a.displacementCc}cc, ${a.forcedInduction ? "forced-induction" : "normally aspirated"}, ${a.seats} seats${match.spec.excludeSportsCarBased ? ", not sports-car-based" : ""}. (${match.spec.ruleRef})`,
  ];
  const warnings = [
    `Catch-all/NOC classings are Regional only — not eligible for National Tours or the Solo National Championships (Appendix A introduction).`,
  ];
  if (match.conditionalBody) {
    warnings.push(
      `Ambiguity: the catch-all wording says "Sedans & Coupes" and never mentions ${a.bodyStyle}s. Nothing in the category rules excludes them, SCCA's own ST championship history includes wagons, and the likely explanation is rarity rather than intent — but the literal wording leaves room for a Region to disagree. Confirm locally or ask the SEB (letters.scca.com).`,
    );
  }
  warnings.push(
    "Catch-all entries must meet the §3.1 rollover guidelines (vehicle height vs. average track width chart).",
  );
  return { category, klass: match.spec.klass, via: "catchall", reasons, warnings };
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
        r.reasons.unshift(
          `Not classed in ${CATEGORY_LABELS[modCategory]} — the car runs in the next more-prepared category where it resolves. Verify each modification against ${CATEGORY_LABELS[cat]} allowances.`,
        );
        break;
      }
    }
  }

  let finalCategory: Category = modCategory;
  let finalClass: string | null = null;
  let via: ClassificationResult["via"] = null;
  let reasons: string[] = [];
  const alternatives: AlternativeClassing[] = [];

  if (resolution) {
    finalCategory = resolution.category;
    finalClass = resolution.klass;
    via = resolution.via;
    reasons = resolution.reasons;
    warnings.push(...resolution.warnings);

    // When a catch-all decided it, present explicit listings elsewhere as
    // alternatives, with the case for choosing them.
    if (resolution.via === "catchall") {
      for (const cat of CATEGORIES) {
        const cls = car.classes[cat];
        if (!cls || cat === finalCategory) continue;
        alternatives.push({
          category: cat,
          klass: cls,
          reasons: [
            `Explicit Appendix A listing — no catch-all interpretation needed, so no argument at tech.`,
            `National-eligible: choose ${cls} for National Tours or the Solo National Championships (catch-all classings are Regional only).`,
            CATEGORY_ORDER[cat] > CATEGORY_ORDER[finalCategory]
              ? `Also the landing spot if your build grows beyond ${CATEGORY_LABELS[finalCategory]} allowances.`
              : `Note: a ${CATEGORY_LABELS[finalCategory]}-prepped car may concede development headroom to purpose-built ${cls} cars.`,
          ],
        });
      }
    }
  } else if (finalCategory !== "street") {
    warnings.push(
      `We don't have a ${CATEGORY_LABELS[finalCategory]} (or more prepared) classing for this car — check Appendix A of the Solo Rules.`,
    );
  }

  if (car.uncurated) {
    warnings.push(
      "This result comes from a raw Appendix A listing that hasn't been hand-curated yet — the class shown is as extracted from the rulebook, but cross-category listings (ST/SP) may exist that we haven't linked. Verify against Appendix A.",
    );
  } else if (!car.verified) {
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

  return {
    car,
    baseClass,
    finalCategory,
    finalClass,
    via,
    reasons,
    alternatives,
    items,
    warnings,
  };
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
