# Class Coverage Map

*As of 2026-07-05. What the 2026 Solo Rules actually contain, what the dataset
covers, and what a "thoroughly mapped" finish still requires. Companion to
[DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) and [ROADMAP.md](./ROADMAP.md).*

## The authoritative 2026 class list

Enumerated from the 2026 Solo Rulebook table of contents and Appendix A body
(not from the tier-2 extraction, which is unreliable for anything past Street —
see the caveat at the bottom). Every class that exists in 2026:

| Category | Classes | Model in this app |
|---|---|---|
| **Street** | SS, AS, BS, CS, DS, ES, FS, GS, HS (9) | Per-car Appendix A listings + displacement catch-alls |
| **Street Touring** | SST, AST, BST, CST, DST, EST, GST (7) | Per-car listings + catch-alls |
| **Street Prepared** | SSP, CSP, DSP, ESP, FSP (5) | Per-car listings |
| **Street Modified** | SSM, SM, SMF (3) | *Not listings — drivetrain/eligibility placement* |
| **Prepared** | XP, CP, DP, EP, FP (5) | Per-car listings (like SP) |
| **Modified** | AM, BM, CM, DM, EM, FM (6) | Formula/space-frame + displacement |
| **CAM / XS** | CAM-T, CAM-C, CAM-S, XS-A, XS-B (5) | *Not listings — eligibility criteria* |
| **Developmental (Appendix B)** | Club Spec, EVX | Spec / experimental |
| **Spec** | Solo Spec Coupe (SSC) | Single-model spec (own spec doc) |

### Correction logged this pass: ASP and BSP do not exist in 2026

A prior read of the data suggested "missing ASP/BSP" Street Prepared holes.
Against the rulebook this is wrong: the 2026 Street Prepared category is exactly
**SSP, CSP, DSP, ESP, FSP**. ASP and BSP were retired — they now appear only in
Appendix J (national-championship award history; ASP was last awarded in 2022).
Street Prepared is therefore already **class-complete**, not missing two classes.
The garbled ASP/BSP entries some tools surface come from column drift in the
two-column Appendix A extraction, not from the current rules.

## Current coverage (335 verified rows, 100% cited)

Street, Street Touring, and Street Prepared are all **class-complete** — every
class letter that exists is represented — and every row is hand-verified with a
quoted Appendix A citation.

| Category | Per-class counts |
|---|---|
| Street | SS 30 · AS 35 · BS 43 · CS 44 · DS 50 · ES 23 · FS 46 · GS 35 · HS 26 |
| Street Touring | SST 40 · AST 5 · BST 70 · CST 24 · DST 22 · EST 12 · GST 28 |
| Street Prepared | SSP 8 · CSP 9 · DSP 10 · **ESP 21** · **FSP 4** |

### What changed this pass

**ESP: 3 → 21.** Many cars already in the dataset are explicitly ESP-listed in
Appendix A but were missing the Street Prepared mapping. Added the `streetPrepared`
class + verbatim citation to: S550 Mustang GT / EcoBoost / Mach 1 / GT350 / GT350R,
gen-4/5/6 Camaro (V6, SS, 2.0T), 10th-gen Civic Si, FK8 Civic Type R, Dodge SRT-4,
Cobalt SS (Turbo and S/C), Mazdaspeed3, Elantra N, and 240SX.

**FSP: 1 → 4.** Added FSP to the Fit, non-turbo Mazda3, and Scion tC (all
explicitly FSP-listed).

**Confirmed already complete (no meaningful additions available):** ES (23),
AST (5), EST (12) — each already matches its real Appendix A listing, which is
genuinely small. ES is a compact classic-sports-car class; AST is a small
high-power ST class. These are done, not thin-by-neglect.

## What remains (ranked, with the modeling each needs)

The remaining categories are **not** a matter of adding more verified rows to the
existing engine — Street/ST/SP are done. Each needs a different classing model,
because the rulebook classes them differently:

### 1. Street Modified — SSM / SM / SMF  *(needs one schema addition)*

SM is **not** a per-car Appendix A listing. Placement is by drivetrain and body,
straight from §Street Modified:

- **SMF** — all FWD vehicles.
- **SM** — all sedans/coupes originally built with 4+ seats and 4 belts, all FWD
  cars, and pickups. *Excludes:* Porsche (except 924/928/944/968), JDM-spec cars,
  all Lotus, MGB GT, all Triumph.
- **SSM** — all 2-seat cars (not excluded), all SM/SMF-eligible cars, McLaren
  MP4-12C, all Porsche, and Lotus Elise/Exige/Evora/Esprit. *Excludes:* other
  Lotus, 2-seat cars not Street-Prepared-eligible, non-US-delivered cars.
- Forced-induction displacement adders for weight: +1.4L (SSM/SM), +1.0L (SMF).

**Implemented (2026-07-05).** Added a `drivetrain` attribute (`fwd`/`rwd`/`awd`)
to `AttributesSchema`/`CarAttributes` and a placement resolver (`streetmod.ts`,
`resolveStreetModified`) wired into `classify` as a `"placement"` resolution
(National-eligible — no Regional flag). Logic: make-routes exotics to SSM (all
Porsche, McLaren MP4-12C, the four SSM Lotus; other Lotus → not SM-eligible);
2-seat → SSM; FWD → SMF (SM offered as an alternative); RWD/AWD 4-seat sedans/
coupes and pickups → SM. When drivetrain is unknown it returns SM and surfaces
the SMF ambiguity rather than guessing; when it can't place a car it returns null
(honest NOC) rather than inventing a class. Covered by unit tests (SSM/SM/SMF +
the no-data null path) and a real-data integration test.

*Backfill status (2026-07-05):* `drivetrain`/seats/body added across the
enthusiast-common car families. **221 of 335 rows now auto-place** in Street
Modified when modded to SM level (SSM 97, SM 86, SMF 38); the remaining ~114 are
vintage/econobox rows without attributes and still return the honest "no Street
Modified classing" path until curated. A real-data integration test
(`streetmod.test.ts`) pins placements across all three classes plus make-routing.

### 2. Prepared — XP / CP / DP / EP / FP  *(implemented for common cars)*

Prepared **is** per-car Appendix A listed, exactly like Street Prepared, so it
maps through the existing "listed" engine path (`prepared` is a valid category in
`types.ts`). **Done (2026-07-05):** added CP/DP/EP/FP classes with quoted Appendix
A citations to the enthusiast-common cars that are explicitly listed — CP
(American muscle: gen-4 Camaro, S197 Mustangs), DP (Miata all gens, Z3 4-cyl), EP
(Civic/Integra, Fit, CRX, del Sol, Fiesta ST, Neon SRT-4), FP (S2000, RX-7/RX-8,
Datsun Z / 300ZX / 350Z / 370Z, NSX, Solstice GXP, Fiat 124, Elise). Counts:
CP 4 · DP 4 · EP 7 · FP 24. Remaining: XP (open/exotic) and the bulk of vintage
Prepared listings — lower priority (dedicated build cars). XP also has an explicit
catch-all ("almost any production car … listed at the end is eligible for XP")
that could be modeled later.

### 3. CAM / XS — CAM-T / CAM-C / CAM-S / XS-A / XS-B  *(criteria, not listings)*

CAM (Classic American Muscle) and XS (Xtreme Street) are **eligibility-criteria**
classes: CAM by nationality/era/body type (American, specific vintages, coupe/
sedan/sports splits) with its own prep allowances; XS by tire (200TW+) and prep
tier. Neither is a name-lookup. Modeling means an eligibility evaluator plus a
short curated example set, not an Appendix A promotion. Popular, but a distinct
build.

### 4. Modified — AM / BM / CM / DM / EM / FM  *(low priority)*

Formula cars, sports racers, and space-frame/kit builds classed by displacement
formula. Almost none are street-registerable autocross cars, so this is the
lowest-value category for this app's audience. Model last, or leave to the tier-2
index.

### 5. Spec / developmental — SSC, Club Spec, EVX

Solo Spec Coupe (single-model spec — Toyota 86, its own `SSC_Specifications.pdf`),
Club Spec, and Electric Vehicle Experimental (EVX). Each is a self-contained spec;
handle as flat informational entries rather than through the classing engine.

## Data-provenance caveat (why the PDF, not the extraction)

The tier-2 index (`listings.json`) is reliable for Street but **drifts badly for
Street Prepared and beyond**: it shows zero ASP/BSP (correct, but by accident) and
misattributes makes across the two-column layout (e.g. "Cadillac | Camaro",
"Prism | S-10", "Acura Ford | NSX"). Every class assignment in this pass was read
from `reference/2026_Solo_Rulebook.pdf` Appendix A directly and cited verbatim in
the row's `notes`. Do not bulk-promote SP/Prepared listings from the extraction
without a per-row rulebook check.
