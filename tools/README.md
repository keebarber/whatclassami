# Data tooling — Appendix A extraction & review

The pipeline that turns the rulebook PDF into reviewable candidate rows.
See [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) for where this fits:
**extraction output is never shipped directly** — rows enter `src/data/`
only after human verification.

## Pipeline

```bash
# 1. Extract text (PDF lives in reference/, gitignored)
pdftotext -layout reference/2026_Solo_Rulebook.pdf /tmp/rulebook.txt

# 2. Parse Appendix A into candidates (Street, ST, SP; SM is rule-based, no listings)
python3 tools/parse_appendix.py /tmp/rulebook.txt > tools/output/candidates.json

# 3. Cross-check curated data against the extraction
python3 tools/review_candidates.py

# 4. Rebuild the tier-2 search index (src/data/listings.json)
python3 tools/build_listings.py
```

`build_listings.py` makes every Appendix A entry searchable before curation:
year parsing, make-whitelist sanity flags, and curated-dupe linking (listings
that strongly match a cars.json row in the same class get `curatedId` and are
suppressed from search). Uncurated listings render with dashed borders and an
explicit engine warning. Promote listings to cars.json as they're verified —
rerunning the script then auto-links them.

`review_candidates.py` reports, for every class assignment in `cars.json`:
`OK` (listing found in the assigned class), `ELSEWHERE` (best match in a
different class — investigate), or `NOT FOUND`. Current run: 68/75 OK; all
flags triaged (see below).

## Known limitations (triaged 2026-07-04)

- **Two-column drift**: the right column's indent varies per page; it's
  detected statistically (`detect_split`). Class-boundary pages are the
  risk area — verify boundary entries against the actual PDF page.
  Alphabetical make order within a class is the checksum.
- **HS page bleed**: some H Street content on ad-heavy pages lands in the
  wrong bucket (known misses: "Golf GTI (2006-21)", "Mazdaspeed3" — both
  hand-verified in `cars.json` from the PDF directly).
- **Rulebook typos**: unbalanced parens in the source (e.g. "CT4 (non-V,
  non-Blackwing (2020-26)") can over-merge adjacent entries; joins are
  capped at 4 lines and a make line always breaks a run.
- **Matcher noise**: `review_candidates.py` token matching is intentionally
  loose; ELSEWHERE/NOT FOUND flags mean "human, look here," not "wrong."
- `tools/output/` is gitignored: bulk extraction of Appendix A stays local;
  only human-verified rows (facts with citations) are committed.
