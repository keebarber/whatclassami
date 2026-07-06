import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import carsJson from "@/data/cars.json";
import {
  Car,
  CarsFileSchema,
  CATEGORY_LABELS,
  Category,
  crossEligibility,
  resolveStreetModified,
} from "@/engine";
import { reportIssueUrl } from "@/lib/report";
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

/** Stock → Street Modified prep ladder, one class per rung. */
function ladder(c: Car): { label: string; klass: string | null }[] {
  const sm = resolveStreetModified(c);
  return [
    { label: "Stock (Street)", klass: c.streetExclusion ? null : (c.classes.street ?? null) },
    { label: "Street Touring", klass: c.classes.streetTouring ?? null },
    { label: "Street Prepared", klass: c.classes.streetPrepared ?? null },
    { label: "Street Modified", klass: sm?.klass ?? null },
    { label: "Prepared", klass: c.classes.prepared ?? null },
  ];
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
  const rungs = ladder(car);
  const smClass = rungs.find((r) => r.label === "Street Modified")?.klass ?? null;
  const cross = crossEligibility(car);
  const shareUrl = `/classify?b=${encodeBuild({ carId: car.id, modIds: [] })}`;

  // Related cars: same Street class (fallback ST), for internal linking.
  const relKey = street ? ("street" as const) : ("streetTouring" as const);
  const relVal = car.classes[relKey];
  const related = relVal
    ? CARS.filter((c) => c.id !== car.id && c.classes[relKey] === relVal).slice(0, 8)
    : [];

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
      ...(smClass
        ? [
            {
              "@type": "Question",
              name: `What Street Modified class is a ${car.make} ${car.model} in?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `A heavily-modified ${name} runs in ${smClass} in the SCCA Street Modified category (placement by drivetrain and body per §Street Modified).`,
              },
            },
          ]
        : []),
      ...(cross.length
        ? [
            {
              "@type": "Question",
              name: `What else can a ${car.make} ${car.model} run?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `The ${name} is also eligible for ${cross.map((x) => `${x.klass} (${x.label})`).join(", ")}.`,
              },
            },
          ]
        : []),
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Cars", item: `${SITE_URL}/cars` },
      { "@type": "ListItem", position: 2, name: name, item: `${SITE_URL}/car/${car.id}` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="text-xs text-chalk-dim">
        <Link href="/cars" className="underline hover:text-cone-400">
          Cars
        </Link>{" "}
        / <span>{name}</span>
      </nav>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-cone-500">
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

      {/* Prep ladder — how the class changes as the build gets more prepared. */}
      <div className="mt-8 overflow-hidden rounded-xl border border-asphalt-700">
        <h2 className="border-b border-asphalt-700 bg-asphalt-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-chalk-dim">
          Class by preparation level
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {rungs.map((r) => (
              <tr key={r.label} className="border-b border-asphalt-800 last:border-0">
                <td className="px-4 py-2 text-chalk-dim">{r.label}</td>
                <td className="px-4 py-2 text-right font-extrabold text-cone-400">
                  {r.klass ?? <span className="text-chalk-dim">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-asphalt-800 px-4 py-2 text-xs text-chalk-dim">
          A “—” means the car isn’t listed at that level; a build lands in the least-prepared
          category its modifications allow.
        </p>
      </div>

      {cross.length > 0 && (
        <div className="mt-6 rounded-xl border border-asphalt-700 bg-asphalt-900 p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-chalk-dim">
            Also eligible for
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {cross.map((x) => (
              <span key={x.klass} className="rounded-lg bg-asphalt-800 px-3 py-1.5 text-sm">
                <span className="mr-1.5 font-extrabold text-cone-400">{x.klass}</span>
                <span className="text-chalk-dim">{x.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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

      {related.length > 0 && (
        <div className="mt-10 border-t border-asphalt-700 pt-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-chalk-dim">
            Other {relVal} cars
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {related.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/car/${c.id}`}
                  className="text-sm text-cone-400 underline hover:text-cone-300"
                >
                  {c.make} {c.model}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-10 border-t border-asphalt-700 pt-4 text-xs leading-relaxed text-chalk-dim">
        Unofficial guidance verified against the 2026 SCCA® Solo® Rules — always confirm
        against the current rulebook before competing. Classing data cites the exact Appendix
        A wording it relies on. Spot an error?{" "}
        <a
          href={reportIssueUrl({
            car,
            classing: classSummary(car),
            pageUrl: `${SITE_URL}/car/${car.id}`,
          })}
          target="_blank"
          rel="noopener"
          className="text-cone-400 underline hover:text-cone-300"
        >
          Report it on GitHub
        </a>
        .
      </p>
    </div>
  );
}
