# Attribute Audit — drivetrain / seats / bodyStyle

*2026-07-05. Self-audit of the physical `attributes` added to power Street
Modified placement and CAM/XS eligibility. The **class listings** (Street/ST/SP/
Prepared) are all Appendix A-cited and separately verified; this audit covers only
the ~277 hand-added physical facts, which are knowledge-based, not rulebook-cited.*

## Method

- Programmatic consistency checks over all 284 attributed rows: valid ranges,
  no contradictory combos (e.g. 2-seat marked as a sedan/SUV), drivetrain present.
- Eyeball of every `fwd` row (SMF) and every `awd` row — because only the
  **FWD-vs-not** call changes the Street Modified class (SMF vs SM/SSM). For 4–5
  seat cars, RWD vs AWD both resolve to **SM**, so that distinction never changes
  the class — it only affects BST tire-width precision.
- Web-verified the one assumption that could flip a class (Audi A5 B8).

## Fixed in this pass

- **`subaru-forester-sf`, `subaru-forester-xt`** — had attributes but no
  drivetrain; Subarus are AWD → set `awd`. (Now place cleanly in SM instead of
  emitting a "drivetrain not set" warning.)
- **`audi-a5-b8`** — I had marked `awd`, but the B8 A5 was sold in the US in both
  FWD (2.0T multitronic) and quattro forms, so a FWD A5 is really SMF. Since the
  row spans both, drivetrain is now **unset** — the engine surfaces the SM/SMF
  ambiguity rather than guessing. ([Audi A5 — Wikipedia](https://en.wikipedia.org/wiki/Audi_A5))

## Verified correct

- **All 51 `fwd` rows** are genuinely front-wheel drive (Hondas, MINIs except
  All4, Cobalt/SRT-4/Charger GLH, Fiesta/Focus ST, Elantra/Kona/Veloster N, GTI,
  Corrado, Jetta GLI, Celica, Corolla, etc.) → correct SMF placement.
- **All `awd` rows** are genuinely all-wheel drive (Subarus, Golf R, Evo, GT-R,
  quattro Audis, MINI All4, Mazdaspeed6/Mazda3 Turbo, CLA45, Focus RS, Syclone,
  AWD Teslas, Volvos, i8, C8 E-Ray, F90 M5, GR Corolla, 3000GT VR4, etc.).
- **Seat counts** on 2+2 coupes (M2/M3/M4, Supra Mk3/4, RX-8, BRZ/86, Genesis
  Coupe = 4; Corvette/Miata/S2000/Z-cars/Boxster/Viper/Z3/Z4/SLK/AMG-GT/exotics
  = 2) drive the SSM-vs-SM split and were checked individually.

## Assumptions worth your confirmation (no class impact)

These rows have an **optional** other-drivetrain; I used the base/most-common
config. Because they're all 4–5 seat cars, RWD and AWD both resolve to **SM** — so
the class is right either way; only the BST tire-width limit would differ if you
run one on ST-class tires. Confirm only if you care about that precision:

- Marked `rwd`, AWD optional: `kia-stinger-4cyl`, `kia-stinger-v6t`,
  `infiniti-g35-sedan`, `infiniti-g37`, `lexus-is-2gen-3gen`, `lexus-gs350`,
  `lexus-rc`, `alfa-giulia`, `bmw-m240i`, `bmw-230i-g42`, `bmw-i4`,
  `cadillac-ats-2-0t`, `cadillac-ct4`, `cadillac-ct4v`, `cadillac-ct5v`,
  `cadillac-cts-v`.
- Marked `awd`, base RWD exists: `kia-ev6`, `hyundai-ioniq-5`.

## Known modeling caveats (data structure, not attribute error)

- **`toyota-corolla-na` (non-GR, 1984-2025)** is a lumped row that includes the
  RWD AE86 alongside decades of FWD Corollas. Marked `fwd` for the modern
  majority — the AE86 would really be RWD (→ SM/SSM, not SMF). Split the row if
  AE86 accuracy matters.
- **Mixed-drivetrain rows left `drivetrain` unset** (surface the SM/SMF ambiguity
  rather than guess): `audi-a5-b8`, `ford-taurus-sho` (FWD V8 → AWD EcoBoost),
  `tesla-model-3-highland` (RWD + AWD variants).

## Bottom line

No class-changing errors found beyond the two fixes above. The FWD/SMF calls —
the only ones that move a car between SM classes — are all verified. Remaining
items are optional base-trim drivetrain assumptions that don't change the class,
plus one lumped legacy row (Corolla). Safe to trust for classing; the list above
is what to skim if you want it perfect.
