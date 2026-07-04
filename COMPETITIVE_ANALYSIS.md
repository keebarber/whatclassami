# Competitive Analysis — SCCA Autocross Car Classifier

*Last updated: 2026-07-04. Companion to [RECOMMENDATIONS.md](./RECOMMENDATIONS.md).*

## 1. What users actually need

The recurring newcomer question is "what class is my car?" — but the real question underneath is **"what class is my car *with my mods*, and what did each mod cost me?"** Every existing tool answers only the first question. Users today resolve the second by posting in Facebook groups / Reddit / region forums and waiting for a human. That human-answer loop is the true competitor to beat: it's trusted because it explains *why*. A winning tool must reproduce that explanatory power, instantly and reproducibly.

## 2. The landscape

### 2.1 scca-classifier.com (Bjorn Stange, open source)

The incumbent. Linked directly from SCCA's official [Solo Cars and Rules](https://www.scca.com/pages/solo-cars-and-rules) page as the "Unofficial Solo Car Classifier" — meaning SCCA itself outsources this job to it.

- **How it works:** TurboTax-style yes/no question flow per category, plus make/model lookup for Street classing. Static vanilla-JS site, no backend. [Open source](https://github.com/Bjorn248/scca_classifier).
- **Strengths:** SCCA's implicit endorsement (official-page link = huge trust + SEO); simple; free; community-maintained; has a companion updater tool for yearly rules changes.
- **Weaknesses:** One-question-at-a-time flow is slow and stateless — no picture of *your whole build*; answers a class, not a *why*; no per-mod attribution; no shareable result; dated visual design; question flow requires you to already understand rules vocabulary ("Does your car have a non-OE anti-roll bar on both ends?"); issue tracker shows known correctness gaps (e.g., torsen/non-torsen Miata STS/STR edge cases).

### 2.2 AutoClass (autoclass.adaptiveintelsolutions.com)

The new entrant. AI chat assistant over the 2026 rulebook. Free, beta, even ships an MCP server for Claude Desktop.

- **Strengths:** Natural-language entry (zero rules vocabulary needed); handles messy real-world descriptions; covers all categories including CAM; low-effort yearly updates (swap the rulebook).
- **Weaknesses:** Non-deterministic — same question can yield different answers; carries a permanent "AI assistants can make mistakes" disclaimer, which is fatal for the one thing users need (confidence at tech inspection); no structured car entry, no visual build breakdown, no shareable/reproducible result; chat is a poor format for comparing scenarios ("what if I ran a 245 instead?").

### 2.3 SCCA official resources

- **2026 Solo Rules PDF** (~400 pages) — the source of truth. Appendix A lists every classed car. Unsearchable-in-practice for novices.
- **[Category Allowance Cheat Sheet](https://www.scca.com/downloads/44544-2019-03-08-quick-reference-of-category-allowances/download)** — one-page PDF summary of Street/ST/SP/SM allowances (saved in `reference/`).
- **[Time Trials CLASSMYCAR](https://timetrials.scca.com/pages/classmycar)** — different program (TT), informational pages only; shows SCCA has no interactive Solo tool of its own.

Static, authoritative, not interactive. These are inputs, not competitors — but they define the accuracy bar.

### 2.4 Regional guides & community

Region sites (CNY's [classing guide PDF](https://cny-scca.com/solo/SCCA_Classing_Guide.pdf), WNY, Yellowstone) publish static flowcharts and link to the two tools above. Facebook groups, r/Autocross, and paddock neighbors handle the hard cases. High trust, high latency, zero reproducibility.

## 3. Feature matrix

| Feature | scca-classifier | AutoClass | SCCA docs | **This app (target)** |
|---|:-:|:-:|:-:|:-:|
| Make/model/year lookup | ✅ | ~ (chat) | Appendix A | ✅ searchable picker |
| Whole-build entry (car + all mods at once) | ❌ | ~ (prose) | ❌ | ✅ structured checklist |
| Per-mod legality verdict with rule citation | ❌ | ~ (prose, unreliable) | ❌ | ✅ core feature |
| "Which mod bumped me and to where" | ❌ | ~ | ❌ | ✅ color-coded diff |
| Base class vs final class shown together | ❌ | ❌ | ❌ | ✅ |
| Deterministic / reproducible result | ✅ | ❌ | ✅ | ✅ |
| Natural-language entry | ❌ | ✅ | ❌ | ✅ LLM assist → maps to structured data |
| Rule citations on every answer | partial | partial | n/a | ✅ required by schema |
| Shareable result URL | ❌ | ❌ | ❌ | ✅ config encoded in URL |
| Scenario comparison ("what if") | ❌ | poor | ❌ | ✅ toggle mods live |
| Rules-year versioning | current only | current only | per-year PDFs | ✅ planned (v1: 2026) |
| Mobile-friendly | partial | ✅ | ❌ (PDF) | ✅ required |
| All categories | ✅ | ✅ | ✅ | v1: Street+ST, then expand |
| Open data / auditability | ✅ (open source) | ❌ | ✅ | ✅ cited, versioned JSON |

## 4. Gaps this app must close (and how)

**Table stakes** (parity): make/model/year lookup; Street classing for common cars; mobile usability; free; unofficial-tool disclaimer.

**Differentiators** (the reason to exist):

1. **Per-mod diff view.** Every entered item renders green (legal in base class, with citation) or red (bumps you, with the destination category/class and citation). No competitor does this. This is the product.
2. **Deterministic engine + LLM as translator, not oracle.** AutoClass proved demand for natural-language entry but poisoned trust with non-determinism. Our LLM layer only *maps user language to structured data* ("I have a tune and coilovers" → `ecu-reflash`, `coilovers`); the classification itself is always computed by the tested engine from cited data. Same input → same answer, every time. This directly attacks both competitors' core weaknesses simultaneously.
3. **Shareable, reproducible results.** URL-encoded build → paste in a forum thread or group chat. Turns every answered question into marketing.
4. **Scenario toggling.** Flip a mod on/off and watch the class change live — answers "should I return these wheels?" in seconds.
5. **Confidence & provenance.** Every data row carries `verified` status and rulebook citation; anything unverified or NOC-adjacent is labeled, with a link to SCCA's [letters process](https://letters.scca.com/). Trust through transparency rather than disclaimers.

**Delighters** (later): "path back to Street" suggestions; rules-year diffing (2026 vs 2027 for your build); class competitiveness context (PAX index, national entry counts); saved garage; event-day mode (big type, offline-capable PWA).

## 5. Accuracy strategy (the vital requirement)

Accuracy is where both competitors leak trust — scca-classifier through stale/edge-case data (see its issue tracker), AutoClass through hallucination risk. Plan:

1. **Single source of truth:** curated, Zod-validated JSON in `src/data/`, every row citing rulebook section/page and Appendix A line. PDFs live in `reference/`.
2. **Verification workflow:** every car/mod entry has `verified: true/false`. The UI badges unverified data. `npm run data:check` fails CI on schema violations and reports unverified counts.
3. **Engine tests, not data tests:** the classification engine is unit-tested against synthetic fixtures (so tests encode *logic* invariants, not possibly-wrong real-world classes), plus a growing suite of real "known tricky cases" (torsen Miata, shock-count rules, tire-width-by-class) added only after verification against the rulebook.
4. **Yearly update pipeline:** parser-assist CLI diffs the new rulebook's Appendix A against current data and emits a human-review report. Human approves; nothing auto-ships.
5. **Community correction loop:** every result panel links "report an error" (GitHub issue prefilled with the build URL). scca-classifier proved this works.
6. **Honest NOC handling:** cars/mods outside the dataset return "not classifiable here" with next steps, never a guess.

## 6. LLM backend design

- **Endpoint:** `POST /api/assist` — takes free-text car + mod description, returns structured `{carCandidates[], modIds[], unmatched[]}` constrained to dataset IDs (tool-use/JSON schema, low temperature).
- **The engine classifies; the LLM never does.** LLM output lands in the same UI as manual entry — user confirms the mapping, sees deterministic result.
- **Unmatched terms** surface as "we couldn't map these — check the rulebook or ask the SEB" rather than being silently dropped or guessed.
- **Cost control:** Haiku-class model, aggressive caching of the static system prompt, rate limiting. Fallback: if no API key/quota, the manual picker is fully functional — LLM is enhancement, not dependency.

## 7. UX notes

- **Desktop-first** three-panel layout: car picker → mod checklist (grouped by rule area: tires/wheels, suspension, engine, brakes, body/aero, interior) → live result panel.
- **Mobile matters more than "guessing":** the highest-stakes use is *in the paddock at an event* on a phone. Single column, result as sticky bottom summary that expands, 44px+ tap targets, works offline once loaded (static data), fast on hotspot-grade connections.
- **Vocabulary-free entry:** plain-language mod labels ("lowering springs / coilovers") with the rule term and citation shown secondary — reverse of scca-classifier's approach.
- **Racing-vibe theme:** asphalt dark UI, cone-orange accent, checkered-flag motifs, green/red legality flags (with icons — not color-only, for accessibility).

## 8. Growth / SEO

Long-tail intent pages are the wedge: statically generate `/car/2019-mazda-mx-5` pages ("What autocross class is a 2019 MX-5?") from the dataset — thousands of indexable, genuinely useful pages neither competitor has. Answer-first content + the share-URL loop in forums/groups. Get listed on region resource pages (they already link tools; WNY/Yellowstone/CNY precedent).

## 9. Risks

| Risk | Mitigation |
|---|---|
| SCCA copyright on rules text | Store derived facts + citations, not prose; unofficial disclaimer; both competitors operate openly this way |
| Yearly rules churn | Parser-assist diff pipeline; versioned data files |
| Appendix A is huge (data trove) | Start Street+ST for popular cars, badge coverage %, community reports fill gaps; SEO pages generated only for verified rows |
| scca-classifier's official-page link | Can't beat that link short-term — win on product; long-term, being open + accurate makes region sites and eventually SCCA link us |
| LLM cost/abuse | Optional layer, rate-limited, cached, cheap model |

## 10. Verdict

Two tools split the market's needs: scca-classifier has trust and data but no build-level insight or modern UX; AutoClass has effortless entry but no determinism or trust. Nobody shows *why*. A deterministic per-mod diff engine with cited data, wrapped in natural-language entry and shareable results, is both differentiated and defensible — the moat is the verified dataset + test suite, which compounds with every correction.
