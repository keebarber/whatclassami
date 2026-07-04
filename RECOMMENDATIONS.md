# Autocross Quick Guide — Rebuild Plan

Decisions locked in: curated data with parser-assist, Street + Street Touring for v1, dedicated domain, no accounts (shareable URLs).

## The product

Enter your car (year/make/model/trim) plus your actual mods, and see:

1. Your base class if the car were stock (e.g., **D Street**)
2. Each entered item color-coded: green = legal in base class, red = pushes you out, with the class it pushes you to (e.g., 255-width RE-71RS → **STS**) and the rule reference (§13.3, etc.)
3. Your final resolved class, plus "what would it take to get back to D Street"

That per-item diff view is the differentiator — nothing existing does it.

## Competitive landscape

| Tool | What it does | Gaps you can exploit |
|---|---|---|
| [scca-classifier.com](https://www.scca-classifier.com/) (open source, [GitHub](https://github.com/Bjorn248/scca_classifier)) | TurboTax-style yes/no question flow per category; static vanilla-JS site; make/model lookup for Street | No mod-level diagnosis — tells you *a* class, not *why* or *which item* moved you. Dated UX. No shareable results. |
| [AutoClass](https://autoclass.adaptiveintelsolutions.com/) | AI chat over the 2026 rulebook; free; even ships an MCP server | Non-deterministic ("AI can make mistakes" disclaimer). No structured car entry, no visual per-mod breakdown, answers aren't reproducible or shareable. |
| SCCA official ([Solo Cars and Rules](https://www.scca.com/pages/solo-cars-and-rules)) | PDF rulebook + downloadable "Unofficial Solo Car Classifier" spreadsheet | Static documents; no interactivity at all. But the spreadsheet is a great seed dataset. |
| [SCCA TT CLASSMYCAR](https://timetrials.scca.com/pages/classmycar) | Quick-start classing guide for Time Trials (not Solo) | Different program; just informational pages. |
| Regional guides ([CNY PDF](https://cny-scca.com/solo/SCCA_Classing_Guide.pdf), WNY, Yellowstone) | Static flowcharts/PDFs explaining classing | Not interactive; mostly link to the two tools above. |

**Your differentiators:** per-mod legality diff with rule citations; deterministic + reproducible (vs. AutoClass); shareable build URLs; rules versioned by year (see how the 2027 rules affect your build); "path back to Street" suggestions; modern polished UI.

## Stack

Your Next.js instinct is right.

- **Next.js (App Router) + TypeScript**, deployed static/SSG — no accounts means no server state; the whole app can prerender.
- **Rules engine as a pure TS package** (`packages/engine` or just `src/engine`): input = car + mod list, output = classification result with per-item annotations. Zero dependencies, exhaustively unit-tested with **Vitest**. This is the portfolio centerpiece — deterministic logic + test suite reads far better to hiring managers than scraping code.
- **Curated data as JSON, validated with Zod** — one file per category (street.json, street-touring.json), schema-checked in CI. Seed from SCCA's classifier spreadsheet + the open-source classifier's data. No database needed for v1.
- **Parser-assist CLI** (`tools/rules-diff`): Node script that pulls the yearly Solo Rules PDF, extracts Appendix A tables, and diffs against your curated JSON, emitting a human-review report. Keeps the scraper/parser skill demo without betting correctness on it.
- **UI:** Tailwind + shadcn/ui. Car picker → mod checklist grouped by rule section (tires/wheels, suspension, intake/exhaust, aero...) → live-updating result panel.
- **Shareable URLs:** serialize the build config into a compressed query param (e.g., lz-string). Free persistence, no auth.

## Hosting & domain

- **Vercel free tier** — native Next.js, zero config, preview deploys per PR (nice portfolio artifact). Alternative: Cloudflare Pages, equally free and generous since the site is static.
- **Domain:** buy through Cloudflare Registrar or Porkbun (at-cost, ~$11/yr for .com). Ideas: whatclassismycar.com-style descriptive, or something short like classmy.car / autoxclass.com — check availability. Point it at Vercel; add a project card + link on SafetyLlama.dev.
- **Total running cost: ~$11/yr** (domain only).

## Legal note

The Solo Rules are SCCA-copyrighted. Both existing tools operate openly as "unofficial, not affiliated." Store derived structured facts (classes, allowances) with rule-number citations rather than reproducing rulebook text, and carry the same disclaimer. Not legal advice — but the precedent of two long-running unofficial tools is encouraging.

## v1 milestones

1. **Data + engine first:** Zod schemas, Street class tables (from SCCA spreadsheet), ST allowance rules encoded, engine with test suite covering known tricky cases (Miata torsen/non-torsen, tire width limits, etc.)
2. **UI:** car picker, mod checklist, result panel with color-coded diff
3. **Share URLs + deploy** to Vercel with domain
4. **Parser-assist CLI** for yearly updates
5. Later: remaining categories (SP/SM/CAM/XS/EV), saved garages, "cheapest class-legal setup" suggestions

## Existing repo

The 2023 Puppeteer scraper code (src/pages, puppeteerLauncher, etc.) doesn't fit the new architecture — start fresh as planned. Only `tools/rules-diff` inherits its spirit.
