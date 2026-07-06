import { describe, expect, it } from "vitest";
import { classify } from "../classify";
import type { Car } from "../types";
import cars from "../../data/cars.json";

/** CAM / XS cross-eligibility on real cars.json rows. */
const elig = (id: string): Record<string, string> => {
  const car = (cars as Car[]).find((c) => c.id === id);
  if (!car) throw new Error(`missing car ${id}`);
  const out: Record<string, string> = {};
  for (const x of classify(car, []).alsoEligible) out[x.label] = x.klass;
  return out;
};

describe("CAM / XS cross-eligibility", () => {
  it("American front-engine RWD 2-seaters → CAM-S", () => {
    expect(elig("chevy-corvette-c5")["Classic American Muscle"]).toBe("CAM-S");
    expect(elig("dodge-viper-classic")["Classic American Muscle"]).toBe("CAM-S");
    expect(elig("pontiac-solstice-gxp")["Classic American Muscle"]).toBe("CAM-S");
  });

  it("American RWD 4-seaters split CAM-T (<=2000 body) vs CAM-C (newer)", () => {
    expect(elig("chevy-camaro-ss-gen4")["Classic American Muscle"]).toBe("CAM-T"); // 1998 body
    expect(elig("chevy-camaro-ss-gen6")["Classic American Muscle"]).toBe("CAM-C"); // 2016
    expect(elig("ford-mustang-gt-s550")["Classic American Muscle"]).toBe("CAM-C"); // 2015
  });

  it("CAM-eligible cars are excluded from XS (XA/XB)", () => {
    expect(elig("chevy-camaro-ss-gen6")["Xtreme Street"]).toBeUndefined();
  });

  it("imports get XS but not CAM", () => {
    const e = elig("subaru-brz-toyota-86-gen1");
    expect(e["Classic American Muscle"]).toBeUndefined();
    expect(e["Xtreme Street"]).toBe("XA/XB");
  });

  it("excludes EV and mid-engine cars from CAM (front-engine ICE only)", () => {
    expect(elig("tesla-model-3-rwd")["Classic American Muscle"]).toBeUndefined(); // EV
    expect(elig("chevy-corvette-c8")["Classic American Muscle"]).toBeUndefined(); // mid-engine
  });

  it("FWD American cars are not CAM (front-engine RWD required)", () => {
    expect(elig("chevy-cobalt-ss-turbo")["Classic American Muscle"]).toBeUndefined();
  });

  it("Prepared-listed cars are also eligible for XP (open Prepared class)", () => {
    expect(elig("honda-s2000")["X Prepared (open)"]).toBe("XP"); // FP-listed
    expect(elig("mazda-miata-nc")["X Prepared (open)"]).toBe("XP"); // DP-listed
    // A car with no Prepared listing gets no XP note.
    expect(elig("subaru-wrx-sti")["X Prepared (open)"]).toBeUndefined();
  });

  it("flags the gen-1 86/BRZ as Solo Spec Coupe (SSC)", () => {
    expect(elig("subaru-brz-toyota-86-gen1")["Solo Spec Coupe"]).toBe("SSC");
    expect(elig("toyota-gr86-subaru-brz-gen2")["Solo Spec Coupe"]).toBeUndefined();
  });

  it("flags pure EVs as EVX but not hybrids/ICE", () => {
    expect(elig("tesla-model-3-rwd")["Electric Vehicle Experimental"]).toBe("EVX");
    expect(elig("kia-ev6")["Electric Vehicle Experimental"]).toBe("EVX");
    expect(elig("honda-s2000")["Electric Vehicle Experimental"]).toBeUndefined();
  });
});
