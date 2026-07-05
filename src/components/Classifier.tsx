"use client";

import { useEffect, useMemo, useState } from "react";
import carsJson from "@/data/cars.json";
import listingsJson from "@/data/listings.json";
import modsJson from "@/data/mods.json";
import {
  BuildSpec,
  Car,
  CarClassMap,
  Drivetrain,
  Mod,
  ModGroup,
  MOD_GROUP_LABELS,
  CarsFileSchema,
  Listing,
  ListingsFileSchema,
  ModsFileSchema,
  classify,
} from "@/engine";
import { decodeBuild, encodeBuild } from "@/lib/share";
import { ResultPanel } from "./ResultPanel";
import { AssistBox } from "./AssistBox";

const CARS: Car[] = CarsFileSchema.parse(carsJson);
const MODS: Mod[] = ModsFileSchema.parse(modsJson);
// Tier-2: every raw Appendix A listing not already covered by a curated row.
const LISTINGS: Listing[] = ListingsFileSchema.parse(listingsJson).filter(
  (l) => !l.curatedId,
);

/** All query tokens must appear somewhere in the haystack. */
function tokenMatch(haystack: string, query: string): boolean {
  const h = haystack.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => h.includes(t));
}

function carFromListing(l: Listing): Car {
  return {
    id: l.id,
    make: l.make,
    model: l.model,
    yearStart: l.yearStart ?? 1940,
    yearEnd: l.yearEnd ?? 2026,
    classes: { [l.category]: l.class } as CarClassMap,
    verified: false,
    uncurated: true,
    notes: `Raw Appendix A listing (${l.class}) — not yet hand-curated.`,
  };
}

function resolveCar(id: string | null): Car | null {
  if (!id) return null;
  const curated = CARS.find((c) => c.id === id);
  if (curated) return curated;
  const listing = LISTINGS.find((l) => l.id === id);
  return listing ? carFromListing(listing) : null;
}

const MAX_RESULTS = 40;

/**
 * Demo build: Keenan's 2001 Forester L — coilovers, strut brace, CAI,
 * headers + full exhaust, rear sway bar, camber bolts, 17x7.5" +45 wheels,
 * 225/45R17 RT660s. Shown on first visit (no ?b= in the URL); exercises the
 * Street-exclusion + FSP escalation path.
 */
const DEMO_BUILD = {
  carId: "subaru-forester-sf",
  modIds: [
    "coilovers-springs",
    "strut-bar",
    "cold-air-intake",
    "headers",
    "catback",
    "swaybar-single",
    "camber-kit",
    "wheels-any-diameter-wide",
    "tires-wide-200tw",
  ],
  // 225/45R17 on 17x7.5" — exactly at the EST limits (§14.3/§14.4)
  spec: { tireWidthMm: 225, wheelWidthIn: 7.5, drivetrain: "awd" as const },
};

const GROUP_ORDER: ModGroup[] = [
  "tires-wheels",
  "suspension",
  "engine-drivetrain",
  "brakes",
  "body-aero",
  "interior-electrical",
];

export function Classifier() {
  const [carId, setCarId] = useState<string | null>(null);
  const [modIds, setModIds] = useState<string[]>([]);
  const [spec, setSpec] = useState<BuildSpec>({});
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Restore build from ?b= on first load; otherwise show the demo build
  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("b");
    const build = encoded ? decodeBuild(encoded) : null;
    if (build) {
      if (build.carId && resolveCar(build.carId)) setCarId(build.carId);
      setModIds(build.modIds.filter((id) => MODS.some((m) => m.id === id)));
      if (build.spec) setSpec(build.spec);
    } else if (!encoded) {
      setCarId(DEMO_BUILD.carId);
      setModIds(DEMO_BUILD.modIds);
      setSpec(DEMO_BUILD.spec);
    }
    setHydrated(true);
  }, []);

  // Keep URL in sync so every result is shareable
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (carId || modIds.length > 0) {
      url.searchParams.set("b", encodeBuild({ carId, modIds, spec }));
    } else {
      url.searchParams.delete("b");
    }
    window.history.replaceState(null, "", url.toString());
  }, [carId, modIds, spec, hydrated]);

  const car = useMemo(() => resolveCar(carId), [carId]);

  const filteredCars = useMemo(() => {
    const q = query.trim();
    if (!q) return CARS;
    return CARS.filter((c) =>
      tokenMatch(`${c.make} ${c.model} ${c.trim ?? ""} ${c.yearStart} ${c.yearEnd}`, q),
    );
  }, [query]);

  const filteredListings = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return LISTINGS.filter((l) =>
      tokenMatch(`${l.make} ${l.model} ${l.class}`, q),
    );
  }, [query]);

  const selectedMods = useMemo(
    () => MODS.filter((m) => modIds.includes(m.id)),
    [modIds],
  );

  const result = useMemo(
    () => (car ? classify(car, selectedMods, spec) : null),
    [car, selectedMods, spec],
  );

  function toggleMod(id: string) {
    setModIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function applyAssist(newCarId: string | null, newModIds: string[]) {
    if (newCarId && CARS.some((c) => c.id === newCarId)) setCarId(newCarId);
    setModIds(newModIds.filter((id) => MODS.some((m) => m.id === id)));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
        Class my car
      </h1>
      <p className="mt-1 text-sm text-chalk-dim">
        Pick your car, check what you&apos;ve changed. Green = fine in Street. Red = that item
        moves you — and we&apos;ll show you where.
      </p>

      <div className="mt-4">
        <AssistBox onApply={applyAssist} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Car picker */}
        <section className="lg:col-span-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-cone-500">
            1 · Your car
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search make or model…"
            className="w-full rounded-lg border border-asphalt-600 bg-asphalt-800 px-3 py-2.5 text-sm placeholder:text-asphalt-500 focus:border-cone-500 focus:outline-none"
            aria-label="Search cars"
          />
          <ul className="mt-2 max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {filteredCars.slice(0, MAX_RESULTS).map((c) => {
              const active = c.id === carId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setCarId(active ? null : c.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "border-cone-500 bg-asphalt-800"
                        : "border-asphalt-700 bg-asphalt-900 hover:border-asphalt-500"
                    }`}
                  >
                    <span className="font-semibold">
                      {c.make} {c.model}
                    </span>
                    <span className="ml-2 text-xs text-chalk-dim">
                      {c.yearStart}–{c.yearEnd}
                    </span>
                    {(c.classes.street ?? Object.values(c.classes)[0]) && (
                      <span className="float-right rounded bg-asphalt-700 px-1.5 py-0.5 text-xs font-bold text-cone-400">
                        {c.classes.street ?? Object.values(c.classes)[0]}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filteredCars.length > MAX_RESULTS && (
              <li className="px-3 py-1 text-xs text-chalk-dim">
                +{filteredCars.length - MAX_RESULTS} more — keep typing to narrow.
              </li>
            )}
            {filteredListings.length > 0 && (
              <li className="mt-2 px-1 text-[11px] font-bold uppercase tracking-widest text-chalk-dim">
                Appendix A listings — not yet curated
              </li>
            )}
            {filteredListings.slice(0, MAX_RESULTS).map((l) => {
              const active = l.id === carId;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setCarId(active ? null : l.id)}
                    className={`w-full rounded-lg border border-dashed px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "border-cone-500 bg-asphalt-800"
                        : "border-asphalt-600 bg-asphalt-900/60 hover:border-asphalt-500"
                    }`}
                  >
                    <span className="font-semibold">
                      {l.make} {l.model}
                    </span>
                    <span className="float-right rounded bg-asphalt-700 px-1.5 py-0.5 text-xs font-bold text-chalk-dim">
                      {l.class}
                    </span>
                  </button>
                </li>
              );
            })}
            {filteredListings.length > MAX_RESULTS && (
              <li className="px-3 py-1 text-xs text-chalk-dim">
                +{filteredListings.length - MAX_RESULTS} more listings — keep typing.
              </li>
            )}
            {filteredCars.length === 0 && filteredListings.length === 0 && (
              <li className="rounded-lg border border-dashed border-asphalt-600 p-3 text-sm text-chalk-dim">
                Nothing in the dataset or the Appendix A listings. It may be NOC — check the
                Solo Rules, or try the describe box above.
              </li>
            )}
          </ul>
        </section>

        {/* Mod checklist */}
        <section className="lg:col-span-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-cone-500">
            2 · Your modifications
          </h2>

          {/* Sizes & drivetrain — drive the §14.3/§14.4/§14.10.K class-limit checks */}
          <div className="mb-3 rounded-lg border border-asphalt-700 bg-asphalt-900 p-3">
            <h3 className="text-xs font-bold text-chalk-dim">
              Sizes & drivetrain <span className="font-normal">(for exact class limits)</span>
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-chalk-dim">
                Tire width (mm)
                <input
                  type="number"
                  inputMode="numeric"
                  min={125}
                  max={455}
                  step={5}
                  value={spec.tireWidthMm ?? ""}
                  onChange={(e) =>
                    setSpec((s) => ({
                      ...s,
                      tireWidthMm: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="225"
                  className="mt-1 w-full rounded-md border border-asphalt-600 bg-asphalt-800 px-2 py-1.5 text-sm text-chalk placeholder:text-asphalt-500 focus:border-cone-500 focus:outline-none"
                />
              </label>
              <label className="text-xs text-chalk-dim">
                Wheel width (in)
                <input
                  type="number"
                  inputMode="decimal"
                  min={4}
                  max={14}
                  step={0.5}
                  value={spec.wheelWidthIn ?? ""}
                  onChange={(e) =>
                    setSpec((s) => ({
                      ...s,
                      wheelWidthIn: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="7.5"
                  className="mt-1 w-full rounded-md border border-asphalt-600 bg-asphalt-800 px-2 py-1.5 text-sm text-chalk placeholder:text-asphalt-500 focus:border-cone-500 focus:outline-none"
                />
              </label>
              <label className="text-xs text-chalk-dim">
                Drivetrain
                <select
                  value={spec.drivetrain ?? ""}
                  onChange={(e) =>
                    setSpec((s) => ({
                      ...s,
                      drivetrain: (e.target.value || undefined) as Drivetrain | undefined,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-asphalt-600 bg-asphalt-800 px-2 py-1.5 text-sm text-chalk focus:border-cone-500 focus:outline-none"
                >
                  <option value="">Not set</option>
                  <option value="fwd">FWD</option>
                  <option value="rwd">RWD</option>
                  <option value="awd">AWD</option>
                </select>
              </label>
              <label className="flex items-end gap-2 pb-1.5 text-xs text-chalk-dim">
                <input
                  type="checkbox"
                  checked={spec.midEngine ?? false}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, midEngine: e.target.checked || undefined }))
                  }
                  className="h-4 w-4 accent-cone-500"
                />
                Mid-engine
              </label>
            </div>
          </div>

          <div className="max-h-[480px] space-y-4 overflow-y-auto pr-1">
            {GROUP_ORDER.map((group) => (
              <div key={group}>
                <h3 className="mb-1.5 text-xs font-bold text-chalk-dim">
                  {MOD_GROUP_LABELS[group]}
                </h3>
                <ul className="space-y-1">
                  {MODS.filter((m) => m.group === group).map((m) => {
                    const checked = modIds.includes(m.id);
                    return (
                      <li key={m.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                            checked
                              ? "border-cone-500/60 bg-asphalt-800"
                              : "border-asphalt-700 bg-asphalt-900 hover:border-asphalt-500"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMod(m.id)}
                            className="mt-0.5 h-4 w-4 accent-cone-500"
                          />
                          <span>
                            {m.label}
                            {m.note && (
                              <span className="mt-0.5 block text-xs text-chalk-dim">
                                {m.note}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Result */}
        <section className="lg:col-span-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-cone-500">
            3 · Your class
          </h2>
          <ResultPanel result={result} />
        </section>
      </div>
    </div>
  );
}
