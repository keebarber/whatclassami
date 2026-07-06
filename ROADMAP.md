# Roadmap — Autocross Quick Guide

*As of 2026-07-04. Companion to [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) and [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md).*

## Part 1 — What's done

**Product core.** A working classifier at `/classify`: pick a car (or describe it in plain English), check off mods, get a deterministic classification with per-mod green/red verdicts, rule citations, reasoned "why this class" explanations, and defensible alternatives with when-to-choose-them guidance. Builds are shareable via URL. Demo build (2001 Forester L) preloads on first visit.

**Rules engine** (`src/engine/`, 24 passing tests). Resolution chain: mod ceiling → explicit Appendix A listing → displacement/aspiration catch-alls → escalation to where the car is listed → honest NOC. Handles §3.1 street exclusions, catch-all Regional-only caveats, wagon/body-style ambiguity (surfaced and explained, per project principle), and emits structured reasons + alternatives.

**Data.** 334 hand-verified cars across all nine Street classes with ST mappings and SP classes on the 28 most-modded families — every row cites the Appendix A wording it relies on. 39-mod catalog sourced from SCCA's official allowance cheat sheet. Tier-2 index makes all 1,740 extracted Appendix A listings searchable ahead of curation (uncurated ones clearly flagged, engine warns).

**Tooling** (`tools/`). Column-aware PDF extractor (handles per-page column drift, rulebook typos), curated-vs-extraction cross-checker (535/564 confirmations, all flags triaged), tier-2 index builder with dupe suppression. The yearly-update pipeline exists end to end.

**Docs.** Competitive analysis, data architecture, recommendations, this roadmap. Git history tells the story commit by commit.

## Part 2 — The road ahead

### Milestone 1: Accuracy depth (the biggest gap — see Part 3)

- [x] **Class-level ST constraints** *(done 2026-07-04)*: §14.3 tire widths, §14.4 wheel widths (with drivetrain/mid-engine/FI splits), §14.10.K LSD rules enforced from structured inputs; violations re-resolve from Street Prepared with citations.
- [x] **Mod catalog verification pass** *(done 2026-07-04)*: all 39 mods cite verified 2026 sections (§13/§14/§15/§16), including newly-discovered constraints — SP Limited/Full Prep tiers (radio delete, splitters, fender mods, clutch/flywheel are Full Prep only), Street tire specifics (7/32" tread depth, Tire Guide listing), wheel offset ±7mm. Remaining refinement: coarse-mod splits (exhaust variants) and Limited/Full Prep as a first-class engine concept.
- [ ] **§3.1 rollover chart as data** so excluded-list cars get a computed answer instead of a hand-wave.

### Milestone 2: Ship it

- [x] Domain purchased: **whatclassami.com** (2026-07-04); site branded to match. Remaining: Vercel deploy + DNS.
- [ ] Wire "report an error" to a prefilled GitHub issue (needs: public repo decision).
- [x] Assist guardrails *(done 2026-07-04)*: per-IP rate limits (6/5min, 40/day), per-instance daily cap (300), response dedupe cache, Anthropic prompt caching on the catalog block, 400-token output cap, 500-char input cap, no-retry + 12s timeout. Remaining: set `ANTHROPIC_API_KEY` in Vercel, set a spend limit in the Anthropic Console, and smoke-test in a preview deployment.
- [ ] Analytics (privacy-light) + error reporting.
- [ ] Portfolio card + link on SafetyLlama.dev.

### Milestone 3: Coverage completion

- [x] **Street / ST / SP class-complete** *(2026-07-05)*: every 2026 class letter is represented and verified. Confirmed the true class list against the rulebook — ASP/BSP are retired (Appendix J history only), so SP is legitimately SSP/CSP/DSP/ESP/FSP. Thickened the two genuinely thin SP classes (ESP 3→21, FSP 1→4) from Appendix A. Full map + remaining-category plan in [CLASS_COVERAGE.md](./CLASS_COVERAGE.md).
- [x] **Street Modified (SSM/SM/SMF)** *(2026-07-05)*: `drivetrain` attribute + placement resolver (`streetmod.ts`) wired into `classify` as a National-eligible `"placement"` resolution (2-seat/exotics → SSM, FWD → SMF, RWD/AWD sedans/coupes+pickups → SM; honest NOC otherwise). Backfilled drivetrain/seats/body across the popular car set — **221/335 rows now auto-place** in SM (SSM 97 · SM 86 · SMF 38); ~114 vintage/econobox rows remain for later curation.
- [x] **Prepared (CP/DP/EP/FP)** *(2026-07-05)*: added verified `prepared` classes with quoted Appendix A citations to the enthusiast-common cars explicitly listed (CP 4 · DP 4 · EP 7 · FP 24). Uses the existing "listed" path. Remaining: XP (open/exotic) + bulk vintage listings.
- [ ] Curation grind: promote high-traffic tier-2 listings into verified rows (loop is automated; human verification is the throughput limit).
- [ ] Fix known extractor gaps: HS make-tracking slips, missing Syclone/Typhoon, 250 suspect-make listings; SP/Prepared column drift (don't bulk-promote past Street without a per-row PDF check).
- [ ] Cross-category linking for uncurated listings (a tier-2 car currently knows only one category, so escalation is blind).
- [ ] Remaining categories (per CLASS_COVERAGE.md): Prepared (fits current model, large), CAM/XS (criteria-based, needs eligibility evaluator), Modified (low priority), spec/dev (SSC, Club Spec, EVX).

### Milestone 4: Growth & longevity

- [ ] Static per-car SEO pages (`/car/2019-mazda-mx-5`) from verified rows — the long-tail wedge neither competitor has.
- [ ] Rules-year versioning (`data/2026/`, `data/2027/`) + year switcher + build diffing.
- [ ] FasTrack monthly change monitoring once live.
- [ ] Delighters: "path back to Street" suggestions, PAX context, event-day PWA mode, saved garages, top/popular cars by class report (Keenan idea, 2026-07).
- [ ] Monetization (lean-first): Tire Rack/parts affiliate links on results (high intent, zero page weight) + Ko-fi/GitHub Sponsors; single static EthicalAds/Carbon card only once traffic justifies it; never ad networks that add scripts/trackers.

## Part 3 — The biggest pieces still missing (ranked)

**1. Class-level modification legality.** The engine reasons at *category* granularity: coilovers = "Street Touring level." But real ST legality is per-class — tire width limits differ across SST/AST/BST/CST/DST/EST/GST, LSDs are banned in EST, wheel rules vary. Today a user with 285s on an EST car gets a green "ST-legal tires" verdict that a tech inspector would reject. This is the gap between "helpful guide" and "trustworthy tool," and it drives the tire/wheel structured-input work. Everything else on this list is smaller.

**2. Mod catalog provenance.** The car data got a rigorous 2026 verification pass; the mod catalog hasn't. It's sourced from SCCA's official (but 2019-dated) cheat sheet — good bones, unverified details.

**3. It isn't live.** Every day unlaunched is zero users, zero error reports, zero SEO aging. Milestone 2 is a weekend.

**4. One-category blindness in tier-2.** 1,297 uncurated cars classify from a single extracted listing; if a user mods one into a different category, escalation can't find its other listings. Curation fixes this car by car; cross-category linking in `build_listings.py` (fuzzy-matching listings to each other, not just to curated rows) would fix it wholesale at lower confidence.

**5. No feedback loop.** The accuracy strategy leans on community correction ("report an error" with a share URL), which needs the public repo + issue wiring to exist.

**6. Rules churn readiness.** The 2027 rulebook and monthly FasTrack changes will arrive; without versioned data the dataset silently rots. The pipeline handles re-extraction; versioning is structural work not yet done.

Honorable mentions: UI/e2e tests (engine is tested, components aren't), mobile device-testing + a11y audit, LLM assist has never run against a live API key.
