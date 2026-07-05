import type { Metadata } from "next";
import Link from "next/link";
import { RULEBOOK_PDF_URL } from "@/lib/rulebook";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Autocross terms & definitions",
  description:
    "What the SCCA Solo Rules actually mean by sedan, mid-engine, standard part, NOC, catch-all, Limited vs Full Prep, 200TW, and more — with §12 citations.",
  alternates: { canonical: `${SITE_URL}/glossary` },
};

interface Term {
  term: string;
  def: string;
  cite?: string;
}

// §12 "Automobile Definitions" is the controlling source: its definitions
// apply "regardless of any other definitions or interpretations."
const RULEBOOK_TERMS: Term[] = [
  {
    term: "Sedan",
    def: "“A car capable of transporting four (4) or more average-size adults in normal seating positions.” A functional definition, not a body style — a wagon, SUV, or hatchback that seats four adults is a sedan for rules purposes. This is why sedans-and-coupes catch-alls can apply to wagons.",
    cite: "§12",
  },
  {
    term: "Mid-engine",
    def: "Engine located behind the passenger compartment and in front of the rear axle. Matters for BST tire-width limits (295mm vs 315mm).",
    cite: "§12",
  },
  {
    term: "Open / closed car",
    def: "Closed: full roof, or targa/T-top with a full windshield. Open: convertible, retractable hardtop, or targa/T-top with less than a full windshield. Drives helmet and rollover requirements.",
    cite: "§12",
  },
  {
    term: "Standard part",
    def: "Standard or optional equipment orderable with the car and delivered through a US dealer, including manufacturer options installed by dealers or ports. Dealer accessories don't count, and this definition does not allow update/backdate.",
    cite: "§12",
  },
  {
    term: "Model",
    def: "Cars of a make with virtually identical bodies and chassis, distinguished from other models by major body/chassis differences — regardless of what the manufacturer calls them.",
    cite: "§12",
  },
  {
    term: "Strut bar",
    def: "A transverse member connecting upper or lower suspension mounting points left-to-right. 2-point bars fasten only at the towers; triangulated bars add firewall attachments. All connections bolted.",
    cite: "§12",
  },
  {
    term: "Drivetrain",
    def: "Engine, clutch, transmission, driveshafts, differentials, axles — the components that make the car move. Not wheels or spindles.",
    cite: "§12",
  },
];

const PRACTICAL_TERMS: Term[] = [
  {
    term: "Coupe",
    def: "Not defined in §12 — commonly read as a two-door fixed-roof car. Because “sedan” is defined functionally, the sedans-and-coupes catch-alls rarely turn on this distinction.",
  },
  {
    term: "Wagon / SUV",
    def: "Also not defined as body styles in the rulebook. If it seats four adults, it meets the §12 sedan definition; some (like all Subaru Foresters) appear on the §3.1 Street-category stability exclusion list, which is a separate question from body style.",
  },
  {
    term: "NOC — Not Otherwise Classified",
    def: "A car with no specific Appendix A listing. NOC cars class via category catch-alls and are Regional-only: ineligible for National Tours and the Solo National Championships.",
    cite: "Appendix A",
  },
  {
    term: "Catch-all",
    def: "The listing at the end of a category's classes that sweeps up unlisted cars (by displacement/aspiration in ST, V8 sedans in FS, etc.). Per Appendix A: start from the last class in the category and work up until a class is found.",
    cite: "Appendix A",
  },
  {
    term: "Limited Prep / Full Prep",
    def: "Street Prepared's two tiers. Several classic SP modifications — radio removal, splitters, fender modifications, metal clutch/flywheel — are Full Prep only. Cars marked *Limited Prep* in Appendix A run SP with the reduced allowance set.",
    cite: "§15",
  },
  {
    term: "200TW / UTQG treadwear",
    def: "Street and Street Touring tires must carry a UTQG treadwear grade of 200 or higher, have at least 7/32″ molded tread depth, and be listed in the Tire Guide. Below 200TW (R-comps) means Street Prepared.",
    cite: "§13.3",
  },
  {
    term: "Section width",
    def: "The tire's nominal width in millimeters (the 225 in 225/45R17). Street Touring classes cap it per class and drivetrain — 225mm (EST) up to 315mm (BST RWD N/A), unlimited in SST.",
    cite: "§14.3",
  },
  {
    term: "§3.1 stability exclusion",
    def: "Vehicles with high centers of gravity and narrow track (SUVs, minivans, pickups) that fail the rollover guidelines must be excluded; Appendix A lists examples. A §3.1-excluded car can still appear in ST/SP listings — eligibility is per the rollover chart, so ride height matters.",
    cite: "§3.1",
  },
];

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Terms & definitions</h1>
      <p className="mt-2 leading-relaxed text-chalk-dim">
        The Solo Rules define their own vocabulary in §12 — and those definitions apply
        &quot;regardless of any other definitions or interpretations.&quot; Quoted or summarized
        below, alongside practical terms the rulebook uses without defining.{" "}
        <a
          href={`${RULEBOOK_PDF_URL}#page=68`}
          className="text-cone-400 underline"
          target="_blank"
          rel="noopener"
        >
          Read §12 in the official PDF →
        </a>
      </p>

      <h2 className="mt-8 text-lg font-bold text-cone-400">Defined by the rulebook (§12)</h2>
      <dl className="mt-3 space-y-4">
        {RULEBOOK_TERMS.map((t) => (
          <div key={t.term} className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-4">
            <dt className="font-bold">
              {t.term}
              {t.cite && <span className="ml-2 text-xs font-normal text-chalk-dim">{t.cite}</span>}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-chalk-dim">{t.def}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-lg font-bold text-cone-400">Practical terms</h2>
      <dl className="mt-3 space-y-4">
        {PRACTICAL_TERMS.map((t) => (
          <div key={t.term} className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-4">
            <dt className="font-bold">
              {t.term}
              {t.cite && <span className="ml-2 text-xs font-normal text-chalk-dim">{t.cite}</span>}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-chalk-dim">{t.def}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 text-sm text-chalk-dim">
        See it applied:{" "}
        <Link href="/classify" className="font-bold text-cone-400 underline">
          class your car →
        </Link>
      </p>
    </div>
  );
}
