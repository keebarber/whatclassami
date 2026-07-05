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
- All 20 seed cars are verified against the 2026 rulebook (Appendix A), including the 2026 Street realignment and the restructured Street Touring classes (SST/AST/BST/CST/DST/EST/GST). Nine of the twenty originally seeded classes were wrong — the verification pass caught all of them.
- Engine tests use synthetic fixtures so logic invariants are never coupled to possibly-wrong real-world data. `npm run data:check` gates schema integrity and reports verification coverage.
- Unknown cars/categories produce explicit "check Appendix A / NOC" warnings — never guesses.

## Roadmap

1. Expand car coverage (Appendix A ingest tooling drafted in `tools/parse_appendix.py` — the two-column PDF layout still needs work; boundary regions must be human-verified)
2. ST class-level constraints (tire width by class, no-LSD-in-STS as a hard rule)
3. Remaining categories: SP/SM detail, CAM, XS, EV
4. Static per-car SEO pages (`/car/2019-mazda-mx-5`)
5. Rules-year versioning and build diffing

See [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) and [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) for the full plan.

## License & data provenance

Code and curated data are licensed under **AGPL-3.0** (see LICENSE): use it, learn from it, fork it — but if you run a derivative as a service, your source must be open too.

Provenance notes: vehicle classings are facts derived from the SCCA® Solo® Rules; the rulebook itself is © SCCA and is **not** included in this repository (short cited excerpts appear in data notes under fair-use principles; the PDFs are gitignored). The AGPL covers this project's code, curation, tests, and prose — it grants no rights to SCCA's text or trademarks.

## Disclaimer

Not affiliated with or endorsed by the Sports Car Club of America. Always verify classing against the current [SCCA Solo Rules](https://www.scca.com/pages/solo-cars-and-rules) before competing.
