import { describe, expect, it } from "vitest";
import { classify, summarize } from "../classify";
import { Car, Mod } from "../types";

/**
 * Engine tests use SYNTHETIC fixtures on purpose: they encode logic
 * invariants, not real-world class assignments (which live in data files and
 * are validated separately + verified against the rulebook).
 */

const testCar: Car = {
  id: "test-roadster",
  make: "Test",
  model: "Roadster",
  yearStart: 2020,
  yearEnd: 2024,
  classes: {
    street: "XS",
    streetTouring: "STT",
    streetPrepared: "TSP",
  },
  verified: true,
};

const streetMod: Mod = {
  id: "test-shocks",
  label: "Shocks",
  group: "suspension",
  minCategory: "street",
  ruleRef: "test",
  verified: true,
};

const stMod: Mod = {
  id: "test-coilovers",
  label: "Coilovers",
  group: "suspension",
  minCategory: "streetTouring",
  ruleRef: "test",
  verified: true,
};

const spMod: Mod = {
  id: "test-rcomps",
  label: "R-comps",
  group: "tires-wheels",
  minCategory: "streetPrepared",
  ruleRef: "test",
  verified: true,
};

const smMod: Mod = {
  id: "test-swap",
  label: "Engine swap",
  group: "engine-drivetrain",
  minCategory: "streetModified",
  ruleRef: "test",
  verified: true,
};

describe("classify", () => {
  it("stock car stays in its Street class", () => {
    const r = classify(testCar, []);
    expect(r.finalCategory).toBe("street");
    expect(r.baseClass).toBe("XS");
    expect(r.finalClass).toBe("XS");
    expect(r.items).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("street-legal mods do not change the class", () => {
    const r = classify(testCar, [streetMod]);
    expect(r.finalCategory).toBe("street");
    expect(r.finalClass).toBe("XS");
    expect(r.items[0].status).toBe("legal");
    expect(r.items[0].binding).toBe(false);
  });

  it("a single ST mod bumps to the car's ST class and is flagged binding", () => {
    const r = classify(testCar, [streetMod, stMod]);
    expect(r.finalCategory).toBe("streetTouring");
    expect(r.baseClass).toBe("XS");
    expect(r.finalClass).toBe("STT");
    const coilovers = r.items.find((i) => i.mod.id === "test-coilovers")!;
    expect(coilovers.status).toBe("bump");
    expect(coilovers.binding).toBe(true);
    const shocks = r.items.find((i) => i.mod.id === "test-shocks")!;
    expect(shocks.status).toBe("legal");
    expect(shocks.binding).toBe(false);
  });

  it("the most-prepared mod wins; lesser bumps are marked non-binding", () => {
    const r = classify(testCar, [stMod, spMod]);
    expect(r.finalCategory).toBe("streetPrepared");
    expect(r.finalClass).toBe("TSP");
    const st = r.items.find((i) => i.mod.id === "test-coilovers")!;
    expect(st.status).toBe("bump");
    expect(st.binding).toBe(false);
    const sp = r.items.find((i) => i.mod.id === "test-rcomps")!;
    expect(sp.binding).toBe(true);
  });

  it("multiple mods at the final category are all binding", () => {
    const stMod2: Mod = { ...stMod, id: "test-swaybars", label: "Sway bars" };
    const r = classify(testCar, [stMod, stMod2]);
    expect(r.items.filter((i) => i.binding)).toHaveLength(2);
  });

  it("warns when the car has no class listing for the final category", () => {
    const r = classify(testCar, [smMod]);
    expect(r.finalCategory).toBe("streetModified");
    expect(r.finalClass).toBeNull();
    expect(r.warnings.some((w) => w.includes("Street Modified"))).toBe(true);
  });

  it("warns on unverified car data", () => {
    const r = classify({ ...testCar, verified: false }, []);
    expect(r.warnings.some((w) => w.includes("not yet verified"))).toBe(true);
  });

  it("warns on unverified mod data", () => {
    const r = classify(testCar, [{ ...stMod, verified: false }]);
    expect(r.warnings.some((w) => w.includes("modification"))).toBe(true);
  });

  it("escalates to the next listed category when the car isn't classed for its mods", () => {
    // Car listed ONLY in Street Prepared (like a non-turbo Forester → FSP)
    const spOnlyCar: Car = {
      ...testCar,
      id: "test-wagon",
      classes: { streetPrepared: "TSP" },
      streetExclusion: "On the §3.1 stability exclusion list.",
    };
    const r = classify(spOnlyCar, [stMod]); // ST-level mod
    expect(r.baseClass).toBeNull();
    expect(r.finalCategory).toBe("streetPrepared");
    expect(r.finalClass).toBe("TSP");
    expect(r.warnings.some((w) => w.includes("escalates to Street Prepared"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("Excluded from the Street category"))).toBe(
      true,
    );
  });

  it("a stock street-excluded car runs where it is listed", () => {
    const spOnlyCar: Car = {
      ...testCar,
      id: "test-wagon",
      classes: { streetPrepared: "TSP" },
      streetExclusion: "On the §3.1 stability exclusion list.",
    };
    const r = classify(spOnlyCar, []);
    expect(r.finalCategory).toBe("streetPrepared");
    expect(r.finalClass).toBe("TSP");
    expect(r.items.filter((i) => i.binding)).toHaveLength(0);
  });

  it("classes an unlisted small-displacement N/A car via the EST catch-all", () => {
    // Forester-like: 2.5L N/A wagon, street-excluded, listed only in SP.
    const wagon: Car = {
      ...testCar,
      id: "test-tall-wagon",
      classes: { streetPrepared: "TSP" },
      streetExclusion: "On the §3.1 stability exclusion list.",
      attributes: {
        displacementCc: 2457,
        forcedInduction: false,
        seats: 5,
        bodyStyle: "wagon",
        sportsCarBased: false,
      },
    };
    const r = classify(wagon, [stMod]);
    expect(r.finalCategory).toBe("streetTouring");
    expect(r.finalClass).toBe("EST");
    expect(r.via).toBe("catchall");
    expect(r.warnings.some((w) => w.includes("Regional only"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("wagons varies by Region"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("§3.1 rollover"))).toBe(true);
    expect(
      r.warnings.some((w) => w.includes("explicitly listed in Street Prepared as TSP")),
    ).toBe(true);
  });

  it("routes forced-induction cars to the GST/BST catch-alls by displacement", () => {
    const base: Car = {
      ...testCar,
      id: "test-turbo-sedan",
      classes: {},
      streetExclusion: "test",
      attributes: {
        displacementCc: 1998,
        forcedInduction: true,
        seats: 5,
        bodyStyle: "sedan",
        sportsCarBased: false,
      },
    };
    expect(classify(base, [stMod]).finalClass).toBe("GST"); // <2.5L FI
    const bigTurbo: Car = {
      ...base,
      attributes: { ...base.attributes!, displacementCc: 2900 },
    };
    expect(classify(bigTurbo, [stMod]).finalClass).toBe("BST"); // 2.5–3.1L FI
  });

  it("catch-alls exclude sports-car-based vehicles", () => {
    const kitCar: Car = {
      ...testCar,
      id: "test-sports",
      classes: { streetPrepared: "TSP" },
      streetExclusion: "test",
      attributes: {
        displacementCc: 1999,
        forcedInduction: false,
        seats: 4,
        bodyStyle: "coupe",
        sportsCarBased: true,
      },
    };
    const r = classify(kitCar, [stMod]);
    expect(r.finalClass).toBe("TSP"); // skips ST catch-alls, escalates to SP
    expect(r.via).toBe("listed");
  });

  it("classification is deterministic regardless of mod order", () => {
    const a = classify(testCar, [spMod, stMod, streetMod]);
    const b = classify(testCar, [streetMod, stMod, spMod]);
    expect(a.finalCategory).toBe(b.finalCategory);
    expect(a.finalClass).toBe(b.finalClass);
  });
});

describe("summarize", () => {
  it("describes a stock result", () => {
    expect(summarize(classify(testCar, [streetMod]))).toContain("Street-legal");
  });

  it("describes a bump with count of responsible mods", () => {
    const s = summarize(classify(testCar, [stMod]));
    expect(s).toContain("XS");
    expect(s).toContain("STT");
    expect(s).toContain("1 mod");
  });

  it("describes an escalated stock car by its listing", () => {
    const spOnlyCar: Car = {
      ...testCar,
      classes: { streetPrepared: "TSP" },
      streetExclusion: "stability list",
    };
    const s = summarize(classify(spOnlyCar, []));
    expect(s).toContain("Excluded from Street");
    expect(s).toContain("TSP");
  });
});
