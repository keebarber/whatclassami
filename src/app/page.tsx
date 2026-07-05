import Link from "next/link";

const FEATURES = [
  {
    title: "Per-mod verdicts",
    body: "Every tire, spring, and tune gets its own green or red flag — with the rulebook citation — so you know exactly which item moved you out of Street.",
  },
  {
    title: "Deterministic, not vibes",
    body: "Same build in, same class out, every time. Classification is computed by a tested rules engine over cited data — never guessed.",
  },
  {
    title: "Share your build",
    body: "Your whole configuration lives in the URL. Paste it in the group chat instead of typing your mod list for the fifth time.",
  },
] as const;

export default function Home() {
  return (
    <div>
      <section className="asphalt-texture">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cone-500">
            SCCA® Solo / Autocross — unofficial classing tool
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Know your class <span className="text-cone-500">before</span> the cones go up.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-chalk-dim">
            Pick your car, check off your mods, and see your class — plus exactly which
            modification bumped you and where you&apos;d land without it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/classify"
              className="rounded-lg bg-cone-500 px-6 py-3 text-base font-bold text-asphalt-950 transition hover:bg-cone-400"
            >
              Class my car →
            </Link>
            <span className="text-sm text-chalk-dim">Free. No account. Works at the event.</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-6"
            >
              <h2 className="mb-2 text-lg font-bold text-cone-400">{f.title}</h2>
              <p className="text-sm leading-relaxed text-chalk-dim">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-xl font-bold">How SCCA Solo classing works</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-chalk-dim">
          Every car starts in a Street class (SS through HS) assigned by Appendix A of the
          Solo Rules. Modifications move it through categories: Street Touring for common
          bolt-ons — coilovers, intakes, wider 200-treadwear tires within per-class width
          limits — then Street Prepared for R-comps and deeper prep, and Street Modified for
          swaps and aero. One mod beyond a category&apos;s allowances moves the whole car.
          This tool resolves all of it deterministically, with the 2026 rulebook wording
          cited on every answer. Read the{" "}
          <Link href="/faq" className="text-cone-400 underline">
            classing FAQ
          </Link>{" "}
          or{" "}
          <Link href="/cars" className="text-cone-400 underline">
            browse 300+ verified cars
          </Link>
          .
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {[
            ["mazda-miata-nd", "ND Miata"],
            ["toyota-gr86-subaru-brz-gen2", "GR86 / BRZ"],
            ["honda-civic-si-11th", "Civic Si"],
            ["subaru-wrx-va", "WRX"],
            ["ford-mustang-gt-s550", "Mustang GT"],
            ["chevy-corvette-c8", "C8 Corvette"],
            ["vw-gti-mk7", "GTI Mk7"],
            ["ford-fiesta-st", "Fiesta ST"],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={`/car/${id}`}
              className="rounded-full border border-asphalt-600 px-3 py-1 text-chalk-dim transition hover:border-cone-500 hover:text-chalk"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
