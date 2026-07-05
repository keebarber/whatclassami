import { matchCatchall } from "./catchalls";
import { BuildSpec, lsdRuling, stLimits } from "./constraints";
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
  if (match.sedanByDefinition) {
    reasons.push(
      `Body style: the catch-all says "sedans," and §12 defines a sedan functionally — "a car capable of transporting four (4) or more average-size adults in normal seating positions" — with §12 definitions applying "regardless of any other definitions or interpretations." A ${a.bodyStyle} seating ${a.seats} qualifies.`,
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
export function classify(
  car: Car,
  mods: Mod[],
  spec: BuildSpec = {},
): ClassificationResult {
  const warnings: string[] = [];

  // Least-prepared category the mods allow.
  let modCategory: Category = mods.reduce<Category>(
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
  const resolveFrom = (start: Category): Resolution | null => {
    let r = resolveInCategory(car, start);
    if (r === null) {
      for (const cat of CATEGORIES.slice(CATEGORY_ORDER[start] + 1)) {
        r = resolveInCategory(car, cat);
        if (r) {
          r.reasons.unshift(
            `Not classed in ${CATEGORY_LABELS[start]} — the car runs in the next more-prepared category where it resolves. Verify each modification against ${CATEGORY_LABELS[r.category]} allowances.`,
          );
          break;
        }
      }
    }
    return r;
  };

  let resolution = resolveFrom(modCategory);

  // Class-level Street Touring constraints (§14.3 tires, §14.4 wheels,
  // §14.10.K LSDs): a build exceeding its ST class's limits is not ST-legal
  // at all — it re-resolves from Street Prepared.
  if (resolution && resolution.category === "streetTouring") {
    const klass = resolution.klass;
    const limits = stLimits(klass, car, spec);
    const violations: ItemVerdict[] = [];

    const violate = (label: string, ruleRef: string, note: string) => {
      violations.push({
        mod: {
          id: `spec-${violations.length}`,
          label,
          group: "tires-wheels",
          minCategory: "streetPrepared",
          ruleRef,
          note,
          verified: true,
        },
        status: "bump",
        requiredCategory: "streetPrepared",
        binding: true,
      });
    };

    if (limits) {
      if (spec.tireWidthMm && limits.tireWidthMm !== null) {
        if (spec.tireWidthMm > limits.tireWidthMm) {
          violate(
            `${spec.tireWidthMm}mm tires`,
            "2026 Solo Rules §14.3",
            `Exceeds the ${klass} section-width limit — ${limits.detail}.`,
          );
          if (limits.assumed)
            warnings.push(
              `Drivetrain not set: ${klass} tire limits split by drivetrain (${limits.detail}). The check used the most permissive limit.`,
            );
        } else {
          resolution.reasons.push(
            `Tire width ${spec.tireWidthMm}mm is within the ${klass} limit (${limits.detail}).${limits.assumed ? " Limit assumed most-permissive — set drivetrain to confirm." : ""}`,
          );
        }
      }
      if (spec.wheelWidthIn && limits.wheelWidthIn !== null) {
        if (spec.wheelWidthIn > limits.wheelWidthIn) {
          violate(
            `${spec.wheelWidthIn}" wide wheels`,
            "2026 Solo Rules §14.4",
            `Exceeds the ${klass} wheel-width limit — ${limits.detail}.`,
          );
        } else {
          resolution.reasons.push(
            `Wheel width ${spec.wheelWidthIn}" is within the ${klass} limit (${limits.detail}).`,
          );
        }
      }
    }

    if (mods.some((m) => m.id === "lsd-single")) {
      const ruling = lsdRuling(klass, spec);
      if (!ruling.allowed && !ruling.conditional) {
        violate("Limited-slip differential", "2026 Solo Rules §14.10.K", ruling.detail);
      } else if (ruling.conditional) {
        warnings.push(ruling.detail);
      } else {
        resolution.reasons.push(ruling.detail);
      }
    }

    if (violations.length > 0) {
      items.push(...violations);
      warnings.push(
        `This build exceeds ${klass} class limits — it is not Street Touring-legal and re-resolves from Street Prepared.`,
      );
      modCategory = "streetPrepared";
      for (const item of items) {
        item.binding = item.requiredCategory === "streetPrepared";
      }
      resolution = resolveFrom("streetPrepared");
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
