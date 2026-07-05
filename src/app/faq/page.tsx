import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Autocross classing FAQ",
  description:
    "How SCCA Solo autocross classing works: Street vs Street Touring vs Street Prepared, what bumps your car out of Street, 200TW tires, NOC, catch-alls, and how this tool stays accurate.",
  alternates: { canonical: `${SITE_URL}/faq` },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What class is my car for autocross?",
    a: "A stock car runs in the Street class where Appendix A of the SCCA Solo Rules lists it (SS through HS). Modifications move you through categories: Street Touring for bolt-ons like coilovers, intakes, and wider 200-treadwear tires; Street Prepared for R-comps and deeper changes; Street Modified for swaps and aero. Our classifier resolves this automatically — pick your car, check your mods, and every item is flagged with the rule it cites.",
  },
  {
    q: "What modifications are allowed in Street class?",
    a: "Broadly (§13, 2026 Solo Rules): shocks, ONE anti-roll bar (front or rear), brake pads, cat-back or axle-back exhaust, a drop-in air filter element, alignment within factory range, 200+ treadwear tires on wheels of stock width within ±1 inch of stock diameter, and a driver restraint. The rule of thumb in the rulebook's own words: if it doesn't say you can, you can't.",
  },
  {
    q: "Do coilovers bump me out of Street class?",
    a: "Yes. Any spring change — coilovers or lowering springs — exceeds Street allowances and puts you at Street Touring prep level (§14.8). Your car then runs its Street Touring class if it has one, subject to ST tire-width and wheel-width limits.",
  },
  {
    q: "What do the 200TW / UTQG treadwear numbers mean?",
    a: "Street and Street Touring require tires with a UTQG treadwear grade of 200 or higher, minimum 7/32\" molded tread depth, listed in the Tire Guide (§13.3). Tires under 200TW (Hoosiers, most R-comps) are Street Prepared territory.",
  },
  {
    q: "How do Street Touring tire and wheel limits work?",
    a: "Each ST class has a maximum tire section width (§14.3) and wheel width (§14.4) — from 225mm/7.5\" in EST up to 315mm/11\" in BST, with different limits for AWD and RWD in several classes, and unlimited in SST. Exceed your class's limit and the build is not ST-legal at all — it resolves in Street Prepared. Our classifier enforces these from your actual tire and wheel sizes.",
  },
  {
    q: "What does NOC mean?",
    a: "Not Otherwise Classified. If your exact car isn't listed in Appendix A, category catch-alls may still class it (for example, EST takes sedans and coupes under 3.1L normally-aspirated). Catch-all and NOC classings are Regional-only — not eligible for National Tours or the Solo National Championships.",
  },
  {
    q: "My car is a wagon or SUV — can it run Street Touring?",
    a: "The ST catch-alls literally say 'Sedans & Coupes,' but nothing in the category rules excludes wagons, and SCCA's own championship history includes them. The likely explanation is rarity rather than intent. Some vehicles (including all Foresters) are excluded from the Street category for §3.1 stability reasons, yet appear in ST or SP listings. Where wording is ambiguous, our results say so and cite both readings — confirm with your Region or the SEB.",
  },
  {
    q: "Is this an official SCCA tool?",
    a: "No. This is an independent, unofficial tool with no affiliation to or endorsement by the Sports Car Club of America. The current Solo Rules are always the authority — we cite the exact wording each answer relies on so you can check.",
  },
  {
    q: "How accurate is the classing data?",
    a: "Every car and modification in the curated dataset is hand-verified against the 2026 Solo Rules, with the Appendix A or section wording quoted alongside it. The classifier itself is deterministic — same inputs, same answer — and when a classification requires interpretation, it presents the reasoning and the defensible alternatives instead of silently picking one. Raw rulebook listings that haven't been hand-verified yet are searchable but clearly labeled.",
  },
  {
    q: "What happens if I only have one modification?",
    a: "One mod beyond a category's allowances moves the whole car. A single set of coilovers on an otherwise stock car makes it a Street Touring car. The classifier shows exactly which item did it, what it would take to get back, and where you land.",
  },
  {
    q: "Found an error?",
    a: "Please tell us — every result has a shareable URL that captures the exact build. Send it through the contact page with what you believe is wrong and the rule you're relying on, and we'll verify against the rulebook and fix the data.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-extrabold tracking-tight">Autocross classing FAQ</h1>
      <p className="mt-2 text-chalk-dim">
        How SCCA® Solo® classing works, and how this tool handles it.
      </p>
      <div className="mt-8 space-y-6">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-asphalt-700 bg-asphalt-900 p-4 open:border-cone-500/50"
          >
            <summary className="cursor-pointer text-base font-bold marker:text-cone-500">
              {f.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-chalk-dim">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-sm text-chalk-dim">
        Ready to find out?{" "}
        <Link href="/classify" className="font-bold text-cone-400 underline">
          Class your car →
        </Link>
      </p>
    </div>
  );
}
