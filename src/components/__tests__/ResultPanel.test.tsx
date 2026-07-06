import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultPanel } from "@/components/ResultPanel";
import carsJson from "@/data/cars.json";
import modsJson from "@/data/mods.json";
import {
  Car,
  CarsFileSchema,
  classify,
  Mod,
  ModsFileSchema,
  Category,
} from "@/engine";

const CARS: Car[] = CarsFileSchema.parse(carsJson);
const MODS: Mod[] = ModsFileSchema.parse(modsJson);
const car = (id: string): Car => {
  const c = CARS.find((x) => x.id === id);
  if (!c) throw new Error(`missing car ${id}`);
  return c;
};
const firstMod = (cat: Category): Mod => {
  const m = MODS.find((x) => x.minCategory === cat);
  if (!m) throw new Error(`no mod at ${cat}`);
  return m;
};
const html = (result: ReturnType<typeof classify> | null) =>
  renderToStaticMarkup(<ResultPanel result={result} />);

describe("ResultPanel", () => {
  it("prompts to pick a car when there is no result", () => {
    expect(html(null)).toContain("Select a car");
  });

  it("shows the stock Street class and a run-it message", () => {
    const out = html(classify(car("mazda-miata-na-nb"), []));
    expect(out).toContain("ES"); // Miata NA/NB street class
    expect(out).toContain("Mazda");
    expect(out).toContain("Run it.");
  });

  it("shows the bumped class and a 'Why' rationale for a Street Touring build", () => {
    const out = html(classify(car("mazda-miata-na-nb"), [firstMod("streetTouring")]));
    expect(out).toContain("Why"); // reasons block header
    expect(out).toContain("→"); // base → final arrow appears when bumped
  });

  it("renders CAM cross-eligibility for an American RWD car", () => {
    const out = html(classify(car("chevy-camaro-ss-gen6"), []));
    expect(out).toContain("Also eligible for");
    expect(out).toContain("CAM-C");
    expect(out).toContain("Classic American Muscle");
  });

  it("flags a catch-all result as Regional with warnings", () => {
    const out = html(classify(car("chevy-caprice-91-96"), []));
    expect(out).toContain("via catch-all");
    expect(out).toContain("Regional");
  });

  it("lists per-mod verdicts", () => {
    const stMod = firstMod("streetTouring");
    const out = html(classify(car("mazda-miata-na-nb"), [stMod]));
    expect(out).toContain(stMod.label);
  });
});
