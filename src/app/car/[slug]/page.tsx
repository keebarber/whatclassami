import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import carsJson from "@/data/cars.json";
import { Car, CarsFileSchema, CATEGORY_LABELS, Category } from "@/engine";
import { encodeBuild } from "@/lib/share";
import { SITE_URL } from "@/lib/site";

const CARS: Car[] = CarsFileSchema.parse(carsJson);

export function generateStaticParams() {
  return CARS.map((c) => ({ slug: c.id }));
}

function carName(c: Car): string {
  return `${c.yearStart}–${c.yearEnd} ${c.make} ${c.model}`;
}

function classSummary(c: Car): string {
  const parts = Object.entries(c.classes).map(
    ([cat, klass]) => `${klass} (${CATEGORY_LABELS[cat as Category]})`,
  );
  if (c.streetExclusion) parts.unshift("excluded from Street (§3.1)");
  return parts.join(", ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const car = CARS.find((c) => c.id === slug);
  if (!car) return {};
  const name = carName(car);
  const street = car.classes.street;
  return {
    title: `What autocross class is a ${car.make} ${car.model}?${street ? ` ${street}` : ""}`,
    description: `${name} SCCA Solo autocross classing: ${classSummary(car)}. Verified against the 2026 Solo Rules with Appendix A citations. See how your mods change the class.`,
    alternates: { canonical: `${SITE_URL}/car/${car.id}` },
  };
}

export default async function CarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const car = CARS.find((c) => c.id === slug);
  if (!car) notFound();

  const name = carName(car);
  const street = car.classes.street;
  const st = car.classes.streetTouring;
  const shareUrl = `/classify?b=${encodeBuild({ carId: car.id, modIds: [] })}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What autocross class is a ${car.make} ${car.model}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: car.streetExclusion
            ? `The ${name} is excluded from the SCCA Street category for stability reasons (§3.1). It runs where it is listed: ${classSummary(car)}. Details: ${car.notes ?? ""}`
            : `A stock ${name} runs in ${street} (${CATEGORY_LABELS.street}) in SCCA Solo autocross. ${car.notes ?? ""}`,
        },
      },
      ...(st
        ? [
            {
              "@type": "Question",
              name: `What Street Touring class is a modified ${car.make} ${car.model} in?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `With Street Touring-level modifications (coilovers, intake, wider 200TW tires within class limits), the ${name} runs in ${st}.`,
              },
            },
          ]
        : []),
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cone-500">
        SCCA® Solo classing — unofficial guide
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
        What autocross class is a {car.make} {car.model}?
      </h1>

      <div className="mt-6 flex flex-wrap gap-3">
        {car.streetExclusion && (
          <span className="rounded-lg bg-bump-900 px-3 py-2 text-sm font-bold text-bump-500">
            Excluded from Street (§3.1)
          </span>
        )}
        {Object.entries(car.classes).map(([cat, klass]) => (
          <span key={cat} className="rounded-lg bg-asphalt-800 px-3 py-2 text-sm">
            <span className="mr-2 text-xl font-extrabold text-cone-400">{klass}</span>
            <span className="text-chalk-dim">{CATEGORY_LABELS[cat as Category]}</span>
          </span>
        ))}
      </div>

      <p className="mt-6 leading-relaxed text-chalk-dim">
        {car.streetExclusion
          ? `The ${name} has no Street class — ${car.streetExclusion} It runs in the most-prepared category where Appendix A lists it.`
          : `A stock ${name} runs in ${street} (${CATEGORY_LABELS.street}) under the 2026 SCCA Solo Rules.`}{" "}
        {st &&
          `Built to Street Touring allowances (within ${st} tire and wheel limits), it runs ${st}.`}
      </p>

      {car.notes && (
        <div className="mt-6 rounded-xl border border-asphalt-700 bg-asphalt-900 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-chalk-dim">
            From the 2026 rulebook (Appendix A)
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{car.notes}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href={shareUrl}
          className="rounded-lg bg-cone-500 px-5 py-2.5 font-bold text-asphalt-950 transition hover:bg-cone-400"
        >
          Check this car with your mods →
        </Link>
        <Link href="/cars" className="text-sm text-cone-400 underline">
          Browse all cars
        </Link>
      </div>

      <p className="mt-10 border-t border-asphalt-700 pt-4 text-xs leading-relaxed text-chalk-dim">
        Unofficial guidance verified against the 2026 SCCA® Solo® Rules — always confirm
        against the current rulebook before competing. Classing data cites the exact Appendix
        A wording it relies on.
      </p>
    </div>
  );
}
