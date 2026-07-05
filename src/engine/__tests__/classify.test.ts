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
    expect(r.reasons.some((w) => w.includes("Not classed in Street Touring"))).toBe(true);
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
    expect(r.reasons.some((w) => w.includes("2457cc"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("Regional only"))).toBe(true);
    // §12's functional sedan definition admits wagons — cited as a reason.
    expect(r.reasons.some((w) => w.includes("§12 defines a sedan"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("§3.1 rollover"))).toBe(true);
    // FSP surfaces as a reasoned alternative, not just a warning.
    expect(r.alternatives).toHaveLength(1);
    expect(r.alternatives[0].category).toBe("streetPrepared");
    expect(r.alternatives[0].klass).toBe("TSP");
    expect(r.alternatives[0].reasons.some((w) => w.includes("National-eligible"))).toBe(
      true,
    );
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

  it("classes a NOC V8 wagon via the FS street catch-all (work-up order)", () => {
    // 1994 Caprice Classic wagon-alike: nowhere in Appendix A.
    const caprice: Car = {
      ...testCar,
      id: "test-caprice",
      classes: {},
      attributes: {
        displacementCc: 5733,
        forcedInduction: false,
        seats: 6,
        bodyStyle: "wagon",
        cylinders: 8,
        sportsCarBased: false,
      },
    };
    const stock = classify(caprice, []);
    expect(stock.finalCategory).toBe("street");
    expect(stock.finalClass).toBe("FS"); // FS V8-sedans beats the AS any-car catch-all
    expect(stock.via).toBe("catchall");
    expect(stock.reasons.some((w) => w.includes("§12 defines a sedan"))).toBe(true);

    const modded = classify(caprice, [stMod]); // ST-level mod → >5.1L NA → BST
    expect(modded.finalClass).toBe("BST");
  });

  it("classes a NOC RWD pickup via the HS street catch-all", () => {
    const truck: Car = {
      ...testCar,
      id: "test-truck",
      classes: {},
      attributes: {
        displacementCc: 4300,
        forcedInduction: false,
        seats: 3,
        bodyStyle: "truck",
        cylinders: 6,
        sportsCarBased: false,
      },
    };
    const r = classify(truck, []);
    expect(r.finalClass).toBe("HS"); // HS pickups checked before FS/AS (work-up order)
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

describe("class-level ST constraints (§14.3 / §14.4 / §14.10.K)", () => {
  const estCar: Car = {
    ...testCar,
    id: "test-est",
    classes: { street: "XS", streetTouring: "EST", streetPrepared: "TSP" },
  };
  const bstCar: Car = {
    ...testCar,
    id: "test-bst",
    classes: { street: "XS", streetTouring: "BST", streetPrepared: "TSP" },
  };

  it("flags tires over the class width limit and re-resolves in SP", () => {
    const r = classify(estCar, [stMod], { tireWidthMm: 245 });
    expect(r.finalCategory).toBe("streetPrepared");
    expect(r.finalClass).toBe("TSP");
    expect(r.items.some((i) => i.mod.ruleRef.includes("14.3"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("not Street Touring-legal"))).toBe(true);
  });

  it("passes tires and wheels at exactly the class limit", () => {
    const r = classify(estCar, [stMod], { tireWidthMm: 225, wheelWidthIn: 7.5 });
    expect(r.finalClass).toBe("EST");
    expect(r.reasons.some((x) => x.includes("within the EST limit"))).toBe(true);
  });

  it("applies drivetrain-specific BST tire limits (AWD 295 vs RWD-N/A 315)", () => {
    expect(
      classify(bstCar, [stMod], { tireWidthMm: 305, drivetrain: "awd" }).finalClass,
    ).toBe("TSP");
    expect(
      classify(bstCar, [stMod], { tireWidthMm: 305, drivetrain: "rwd" }).finalClass,
    ).toBe("BST");
  });

  it("flags wheels over the class width limit", () => {
    const r = classify(estCar, [stMod], { wheelWidthIn: 9 });
    expect(r.finalClass).toBe("TSP");
    expect(r.items.some((i) => i.mod.ruleRef.includes("14.4"))).toBe(true);
  });

  it("bans mechanical LSDs in EST (§14.10.K.1)", () => {
    const lsd: Mod = { ...stMod, id: "lsd-single", label: "LSD" };
    const r = classify(estCar, [lsd]);
    expect(r.finalCategory).toBe("streetPrepared");
    expect(r.finalClass).toBe("TSP");
  });

  it("stays permissive with a warning when drivetrain is unset and limits split", () => {
    const dstCar: Car = {
      ...estCar,
      id: "test-dst",
      classes: { street: "XS", streetTouring: "DST", streetPrepared: "TSP" },
    };
    const r = classify(dstCar, [stMod], { tireWidthMm: 255 }); // between AWD 245 and 2WD 265
    expect(r.finalClass).toBe("DST");
    expect(r.reasons.some((x) => x.includes("assumed most-permissive"))).toBe(true);
  });
});

describe("Street Modified placement (SSM / SM / SMF)", () => {
  const withAttrs = (id: string, a: Car["attributes"]): Car => ({
    ...testCar,
    id,
    classes: { street: "XS", streetPrepared: "TSP" },
    attributes: a,
  });

  it("places a 2-seat car in SSM via placement (National-eligible, not Regional)", () => {
    const roadster = withAttrs("test-2seat", {
      displacementCc: 1998,
      forcedInduction: false,
      seats: 2,
      bodyStyle: "convertible",
      sportsCarBased: true,
      drivetrain: "rwd",
    });
    const r = classify(roadster, [smMod]);
    expect(r.finalCategory).toBe("streetModified");
    expect(r.finalClass).toBe("SSM");
    expect(r.via).toBe("placement");
    expect(r.warnings.some((w) => w.includes("Regional"))).toBe(false);
  });

  it("places a FWD car in SMF and offers SM as an alternative", () => {
    const fwd = withAttrs("test-fwd", {
      displacementCc: 1984,
      forcedInduction: true,
      seats: 5,
      bodyStyle: "hatchback",
      sportsCarBased: false,
      drivetrain: "fwd",
    });
    const r = classify(fwd, [smMod]);
    expect(r.finalClass).toBe("SMF");
    expect(r.alternatives.some((alt) => alt.klass === "SM")).toBe(true);
  });

  it("places RWD and AWD 4-seaters in SM", () => {
    const rwd = withAttrs("test-rwd", {
      displacementCc: 1998,
      forcedInduction: false,
      seats: 4,
      bodyStyle: "coupe",
      sportsCarBased: true,
      drivetrain: "rwd",
    });
    const awd = withAttrs("test-awd", {
      displacementCc: 1998,
      forcedInduction: true,
      seats: 5,
      bodyStyle: "sedan",
      sportsCarBased: false,
      drivetrain: "awd",
    });
    expect(classify(rwd, [smMod]).finalClass).toBe("SM");
    expect(classify(awd, [smMod]).finalClass).toBe("SM");
  });

  it("routes all Porsche to SSM by make, without needing attributes", () => {
    const p: Car = { ...testCar, id: "test-porsche", make: "Porsche", model: "911 Carrera", classes: { street: "SS" } };
    expect(classify(p, [smMod]).finalClass).toBe("SSM");
  });

  it("returns no class (not a guess) for a Lotus outside the SSM list", () => {
    const lotus: Car = { ...testCar, id: "test-lotus", make: "Lotus", model: "Elan", classes: { street: "SS" } };
    const r = classify(lotus, [smMod]);
    expect(r.finalClass).toBeNull();
    expect(r.warnings.some((w) => w.includes("Street Modified"))).toBe(true);
  });

  it("surfaces the SM/SMF ambiguity when drivetrain is unknown", () => {
    const nodt = withAttrs("test-nodt", {
      displacementCc: 2000,
      forcedInduction: false,
      seats: 4,
      bodyStyle: "sedan",
      sportsCarBased: false,
    });
    const r = classify(nodt, [smMod]);
    expect(r.finalClass).toBe("SM");
    expect(r.warnings.some((w) => w.includes("Drivetrain not set"))).toBe(true);
    expect(r.alternatives.some((alt) => alt.klass === "SMF")).toBe(true);
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
