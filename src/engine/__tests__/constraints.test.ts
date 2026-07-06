import { describe, expect, it } from "vitest";
import { classify } from "../classify";
import { BuildSpec, lsdRuling, stLimits } from "../constraints";
import type { Car, Mod } from "../types";

/**
 * Exhaustive per-class Street Touring legality (§14.3 tires, §14.4 wheels,
 * §14.10.K LSDs), pinned to the 2026 rulebook values so a future edit can't
 * silently drift the accuracy of the class-level checks.
 */

const bare = (attrs?: Car["attributes"]): Car => ({
  id: "t",
  make: "T",
  model: "T",
  yearStart: 2020,
  yearEnd: 2024,
  classes: {},
  verified: true,
  attributes: attrs,
});
const S = (klass: string, spec: BuildSpec = {}, car: Car = bare()) => stLimits(klass, car, spec);

describe("§14.3 / §14.4 tire & wheel width limits per ST class", () => {
  it("SST is unlimited", () => {
    expect(S("SST")).toMatchObject({ tireWidthMm: null, wheelWidthIn: null });
  });
  it("EST: 225mm / 7.5in", () => {
    expect(S("EST")).toMatchObject({ tireWidthMm: 225, wheelWidthIn: 7.5 });
  });
  it("AST/CST split on drivetrain: AWD 225/7.5, 2WD 255/9.0", () => {
    for (const k of ["AST", "CST"]) {
      expect(S(k, { drivetrain: "awd" })).toMatchObject({ tireWidthMm: 225, wheelWidthIn: 7.5 });
      expect(S(k, { drivetrain: "rwd" })).toMatchObject({ tireWidthMm: 255, wheelWidthIn: 9.0 });
      expect(S(k, {})).toMatchObject({ assumed: true, tireWidthMm: 255 }); // most-permissive
    }
  });
  it("DST: AWD 245/8.0, 2WD 265/9.0", () => {
    expect(S("DST", { drivetrain: "awd" })).toMatchObject({ tireWidthMm: 245, wheelWidthIn: 8.0 });
    expect(S("DST", { drivetrain: "fwd" })).toMatchObject({ tireWidthMm: 265, wheelWidthIn: 9.0 });
  });
  it("GST: AWD 245, 2WD 265; wheels 9.0 either way", () => {
    expect(S("GST", { drivetrain: "awd" })).toMatchObject({ tireWidthMm: 245, wheelWidthIn: 9.0 });
    expect(S("GST", { drivetrain: "rwd" })).toMatchObject({ tireWidthMm: 265, wheelWidthIn: 9.0 });
  });
  it("BST: 295 for AWD / RWD mid-engine / RWD forced-induction; 315 for RWD N/A & FWD; wheels 11.0", () => {
    const fi = bare({ seats: 2, bodyStyle: "coupe", forcedInduction: true });
    const na = bare({ seats: 2, bodyStyle: "coupe", forcedInduction: false });
    expect(S("BST", { drivetrain: "awd" }, na)).toMatchObject({ tireWidthMm: 295, wheelWidthIn: 11.0 });
    expect(S("BST", { drivetrain: "rwd", midEngine: true }, na)).toMatchObject({ tireWidthMm: 295 });
    expect(S("BST", { drivetrain: "rwd" }, fi)).toMatchObject({ tireWidthMm: 295 }); // RWD FI
    expect(S("BST", { drivetrain: "rwd" }, na)).toMatchObject({ tireWidthMm: 315 }); // RWD N/A
    expect(S("BST", { drivetrain: "fwd" }, fi)).toMatchObject({ tireWidthMm: 315 }); // FWD (even FI)
    expect(S("BST", {}, na)).toMatchObject({ assumed: true, tireWidthMm: 315 });
  });
});

describe("§14.10.K limited-slip differential legality per ST class", () => {
  it("EST bans LSDs except factory viscous", () => {
    expect(lsdRuling("EST", {})).toMatchObject({ allowed: false, conditional: false });
  });
  it("GST allows LSD for 2WD only", () => {
    expect(lsdRuling("GST", { drivetrain: "rwd" })).toMatchObject({ allowed: true });
    expect(lsdRuling("GST", { drivetrain: "awd" })).toMatchObject({ allowed: false });
    expect(lsdRuling("GST", {})).toMatchObject({ conditional: true });
  });
  it("SST/AST/BST/CST/DST allow mechanical LSDs", () => {
    for (const k of ["SST", "AST", "BST", "CST", "DST"]) {
      expect(lsdRuling(k, {}).allowed).toBe(true);
    }
  });
});

describe("BST tire split reads forced-induction from the car (backfill integration)", () => {
  const stMod: Mod = { id: "co", label: "Coilovers", group: "suspension", minCategory: "streetTouring", ruleRef: "t", verified: true };
  const bst = (fi: boolean): Car => ({
    id: "bst", make: "T", model: "T", yearStart: 2020, yearEnd: 2024,
    classes: { street: "FS", streetTouring: "BST", streetPrepared: "ESP" },
    verified: true,
    attributes: { seats: 4, bodyStyle: "coupe", drivetrain: "rwd", forcedInduction: fi },
  });
  it("RWD turbo BST car on 305mm exceeds its 295 limit → re-resolves to SP", () => {
    expect(classify(bst(true), [stMod], { tireWidthMm: 305, drivetrain: "rwd" }).finalClass).toBe("ESP");
  });
  it("RWD N/A BST car on 305mm is within its 315 limit → stays BST", () => {
    expect(classify(bst(false), [stMod], { tireWidthMm: 305, drivetrain: "rwd" }).finalClass).toBe("BST");
  });
});
