import type { Metadata } from "next";
import Link from "next/link";
import carsJson from "@/data/cars.json";
import { Car, CarsFileSchema } from "@/engine";
import { SITE_URL } from "@/lib/site";

const CARS: Car[] = CarsFileSchema.parse(carsJson);

export const metadata: Metadata = {
  title: "Browse autocross classing by car",
  description:
    "SCCA Solo autocross classes for 300+ cars, verified against the 2026 rulebook — Street, Street Touring, and Street Prepared classings with citations.",
  alternates: { canonical: `${SITE_URL}/cars` },
};

const CLASS_ORDER = ["SS", "AS", "BS", "CS", "DS", "ES", "FS", "GS", "HS"];

export default function CarsIndex() {
  const byClass = new Map<string, Car[]>();
  for (const car of CARS) {
    const key = car.classes.street ?? "Excluded / other";
    byClass.set(key, [...(byClass.get(key) ?? []), car]);
  }
  const keys = [
    ...CLASS_ORDER.filter((k) => byClass.has(k)),
    ...[...byClass.keys()].filter((k) => !CLASS_ORDER.includes(k)),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">
        Autocross classing, car by car
      </h1>
      <p className="mt-2 max-w-2xl text-chalk-dim">
        Every car below is verified against the 2026 SCCA® Solo® Rules, with the Appendix A
        wording cited. Grouped by Street class.
      </p>
      {keys.map((klass) => (
        <section key={klass} className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-cone-400">
            {klass}
            <span className="ml-2 text-sm font-normal text-chalk-dim">
              {byClass.get(klass)!.length} cars
            </span>
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {byClass
              .get(klass)!
              .sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/car/${c.id}`}
                    className="block rounded-lg border border-asphalt-700 bg-asphalt-900 px-3 py-2 text-sm transition hover:border-cone-500"
                  >
                    {c.make} {c.model}
                    <span className="ml-1 text-xs text-chalk-dim">
                      {c.yearStart}–{c.yearEnd}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
