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
});
