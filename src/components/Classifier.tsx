"use client";

import { useEffect, useMemo, useState } from "react";
import carsJson from "@/data/cars.json";
import modsJson from "@/data/mods.json";
import {
  Car,
  Mod,
  ModGroup,
  MOD_GROUP_LABELS,
  CarsFileSchema,
  ModsFileSchema,
  classify,
} from "@/engine";
import { decodeBuild, encodeBuild } from "@/lib/share";
import { ResultPanel } from "./ResultPanel";
import { AssistBox } from "./AssistBox";

const CARS: Car[] = CarsFileSchema.parse(carsJson);
const MODS: Mod[] = ModsFileSchema.parse(modsJson);

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
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Restore build from ?b= on first load
  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("b");
    if (encoded) {
      const build = decodeBuild(encoded);
      if (build) {
        if (build.carId && CARS.some((c) => c.id === build.carId)) setCarId(build.carId);
        setModIds(build.modIds.filter((id) => MODS.some((m) => m.id === id)));
      }
    }
    setHydrated(true);
  }, []);

  // Keep URL in sync so every result is shareable
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (carId || modIds.length > 0) {
      url.searchParams.set("b", encodeBuild({ carId, modIds }));
    } else {
      url.searchParams.delete("b");
    }
    window.history.replaceState(null, "", url.toString());
  }, [carId, modIds, hydrated]);

  const car = useMemo(() => CARS.find((c) => c.id === carId) ?? null, [carId]);

  const filteredCars = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CARS;
    return CARS.filter((c) =>
      `${c.make} ${c.model} ${c.trim ?? ""} ${c.yearStart} ${c.yearEnd}`
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const selectedMods = useMemo(
    () => MODS.filter((m) => modIds.includes(m.id)),
    [modIds],
  );

  const result = useMemo(() => (car ? classify(car, selectedMods) : null), [car, selectedMods]);

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
            {filteredCars.map((c) => {
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
                    {c.classes.street && (
                      <span className="float-right rounded bg-asphalt-700 px-1.5 py-0.5 text-xs font-bold text-cone-400">
                        {c.classes.street}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filteredCars.length === 0 && (
              <li className="rounded-lg border border-dashed border-asphalt-600 p-3 text-sm text-chalk-dim">
                Not in our dataset yet. It may be NOC — check Appendix A of the Solo Rules, or
                try the describe box above.
              </li>
            )}
          </ul>
        </section>

        {/* Mod checklist */}
        <section className="lg:col-span-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-cone-500">
            2 · Your modifications
          </h2>
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
