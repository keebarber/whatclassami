import { describe, expect, it } from "vitest";
import { CarsFileSchema, ModsFileSchema } from "../schema";
import carsJson from "../../data/cars.json";
import modsJson from "../../data/mods.json";

/**
 * Data integrity gate — run via `npm run data:check` (also part of `npm test`).
 * Fails on schema violations; reports (but does not fail on) unverified rows
 * so coverage is always visible.
 */

describe("cars.json", () => {
  it("matches the Car schema (unique kebab-case ids, valid years, has Street class)", () => {
    const parsed = CarsFileSchema.safeParse(carsJson);
    if (!parsed.success) console.error(parsed.error.format());
    expect(parsed.success).toBe(true);
  });

  it("reports verification coverage", () => {
    const cars = CarsFileSchema.parse(carsJson);
    const unverified = cars.filter((c) => !c.verified);
    console.info(
      `[data:check] cars: ${cars.length} total, ${cars.length - unverified.length} verified, ${unverified.length} pending rulebook verification`,
    );
    expect(cars.length).toBeGreaterThan(0);
  });
});

describe("mods.json", () => {
  it("matches the Mod schema", () => {
    const parsed = ModsFileSchema.safeParse(modsJson);
    if (!parsed.success) console.error(parsed.error.format());
    expect(parsed.success).toBe(true);
  });

  it("every mod cites a rule reference", () => {
    const mods = ModsFileSchema.parse(modsJson);
    for (const mod of mods) {
      expect(mod.ruleRef.length, `${mod.id} missing ruleRef`).toBeGreaterThan(3);
    }
  });

  it("reports verification coverage", () => {
    const mods = ModsFileSchema.parse(modsJson);
    const unverified = mods.filter((m) => !m.verified);
    console.info(
      `[data:check] mods: ${mods.length} total, ${mods.length - unverified.length} verified, ${unverified.length} pending`,
    );
    expect(mods.length).toBeGreaterThan(0);
  });
});
