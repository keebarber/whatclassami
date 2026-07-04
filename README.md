# Autocross Quick Guide

Unofficial SCCA® Solo class finder that answers the real question: **"what class is my car *with my mods* — and which mod put me there?"**

Pick a car, check off modifications, and get a deterministic classification with every item flagged green (Street-legal) or red (bumps you), each with a rulebook citation. Builds are shareable via URL. An optional LLM assist maps plain-English descriptions ("ND Miata with coilovers and a tune") onto the structured pickers — but classification is always computed by the tested rules engine, never by the AI.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + data integrity tests
npm run build      # production build
```

Optional LLM assist: copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. Without it, `/api/assist` returns 503 and the UI quietly falls back to manual entry.

## Structure

```
src/
  engine/          Pure, deterministic classification engine (+ Zod schemas, tests)
  data/            Curated rules data — cars.json, mods.json (cited, versioned)
  app/             Next.js App Router pages + /api/assist route
  components/      Classifier UI (car picker, mod checklist, result panel)
  lib/             Share-URL encoding (lz-string)
reference/         Official SCCA source documents (see reference/README.md)
```

## Data accuracy policy

- Every car and mod row carries a `verified` flag and a rule citation. **Nothing ships as verified until checked against the current rulebook** (`reference/2026_Solo_Rulebook.pdf` — see `reference/README.md` for download instructions).
- The seed dataset is intentionally marked `verified: false` and the UI warns about it. Verification against Appendix A is the next milestone.
- Engine tests use synthetic fixtures so logic invariants are never coupled to possibly-wrong real-world data. `npm run data:check` gates schema integrity and reports verification coverage.
- Unknown cars/categories produce explicit "check Appendix A / NOC" warnings — never guesses.

## Roadmap

1. Verify seed data against the 2026 rulebook; expand car coverage (Appendix A ingest tooling in `tools/`, planned)
2. ST class-level constraints (tire width by class, no-LSD-in-STS as a hard rule)
3. Remaining categories: SP/SM detail, CAM, XS, EV
4. Static per-car SEO pages (`/car/2019-mazda-mx-5`)
5. Rules-year versioning and build diffing

See [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) and [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) for the full plan.

## Disclaimer

Not affiliated with or endorsed by the Sports Car Club of America. Always verify classing against the current [SCCA Solo Rules](https://www.scca.com/pages/solo-cars-and-rules) before competing.
