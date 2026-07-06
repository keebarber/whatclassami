import { describe, expect, it } from "vitest";
import { classify } from "../classify";
import type { Car, Mod } from "../types";
import cars from "../../data/cars.json";

/**
 * Street Modified real-data integration test — pins SSM/SM/SMF placement of
 * backfilled cars.json rows so a future data edit that breaks placement is
 * caught. (Logic invariants live in classify.test.ts on synthetic fixtures.)
 */
const swap: Mod = {
  id: "engine-swap",
  label: "Engine or drivetrain swap",
  group: "engine-drivetrain",
  minCategory: "streetModified",
  ruleRef: "2026 Solo Rules §16.1",
  verified: true,
};

const place = (id: string): string | null => {
  const car = (cars as Car[]).find((c) => c.id === id);
  if (!car) throw new Error(`missing car ${id}`);
  return classify(car, [swap]).finalClass;
};

const expectAll = (klass: string, ids: string[]) =>
  ids.forEach((id) => expect(`${id}=${place(id)}`).toBe(`${id}=${klass}`));

describe("Street Modified placement on real cars.json rows", () => {
  it("RWD/AWD 2-seaters and exotics → SSM", () => {
    expectAll("SSM", [
      "mazda-miata-na-nb", // RWD roadster
      "honda-s2000",
      "chevy-corvette-c5",
      "chevy-corvette-c8-eray", // AWD 2-seat
      "dodge-viper-classic",
      "nissan-350z",
      "toyota-supra-mkv-6cyl",
      "jaguar-f-type-r-svr", // AWD 2-seat
    ]);
  });

  it("all Porsche and the SSM Lotus route to SSM by make (no attributes needed)", () => {
    expectAll("SSM", ["porsche-718-base", "porsche-boxster-986", "lotus-elise", "lotus-evora-na"]);
  });

  it("FWD cars → SMF (including FWD 2-seaters)", () => {
    expectAll("SMF", [
      "vw-gti-mk7",
      "honda-civic-type-r-fl5",
      "ford-fiesta-st",
      "honda-crx", // FWD 2-seat → SMF, not SSM
      "honda-del-sol",
      "mini-jcw-gp-2021",
    ]);
  });

  it("RWD/AWD 4-seat sedans/coupes → SM", () => {
    expectAll("SM", [
      "subaru-brz-toyota-86-gen1", // RWD coupe
      "chevy-camaro-ss-gen6",
      "ford-mustang-gt-s550",
      "mazda-rx8",
      "bmw-m3-g80",
      "subaru-wrx-sti", // AWD sedan
      "mitsubishi-lancer-evo",
      "vw-golf-r-mk7",
      "tesla-model-3-rwd",
    ]);
  });
});
