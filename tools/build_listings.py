#!/usr/bin/env python3
"""Build the searchable listings index from extraction candidates.

Tier-2 search data: every Appendix A entry becomes searchable even before
it's been hand-curated into cars.json. Listings that strongly match an
already-curated row (same category + class) get a `curatedId` so the UI can
suppress the duplicate. Everything else surfaces as an "uncurated listing"
with explicit warnings in the app.

Usage:
    python3 tools/parse_appendix.py /tmp/rulebook.txt > tools/output/candidates.json
    python3 tools/build_listings.py            # writes src/data/listings.json
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "tools/output/candidates.json"
CARS = ROOT / "src/data/cars.json"
OUT = ROOT / "src/data/listings.json"

YEAR_RE = re.compile(r"\((\d{4})½?\s*[-–]\s*(\d{2,4})\)")
SINGLE_YEAR_RE = re.compile(r"\((\d{4})\)")

STOP_TOKENS = {
    "gen", "non", "incl", "excl", "chassis", "all", "the", "and", "with",
    "without", "including", "excluding", "edition", "package", "l",
}

def tokens(s: str) -> set[str]:
    return {
        t.lower()
        for t in re.findall(r"[A-Za-z0-9]+", s)
        if (len(t) > 1 or t.isdigit()) and t.lower() not in STOP_TOKENS
    }

def parse_years(text: str) -> tuple[int | None, int | None]:
    m = None
    for m in YEAR_RE.finditer(text):
        pass  # last range wins (usually the year listing)
    if m:
        y1 = int(m.group(1))
        y2 = int(m.group(2))
        if y2 < 100:
            y2 += 2000 if y2 <= 40 else 1900
        if 1940 <= y1 <= 2100 and y1 <= y2 <= 2100:
            return y1, y2
    s = SINGLE_YEAR_RE.search(text)
    if s:
        y = int(s.group(1))
        if 1940 <= y <= 2100:
            return y, y
    return None, None

def main() -> None:
    cands = json.load(open(CANDIDATES))
    cars = json.load(open(CARS))

    # Known-good makes: everything in curated data plus rulebook staples.
    known_makes = {c["make"].lower() for c in cars}
    for extra in [
        "Acura", "Alfa Romeo", "AMC", "Aston Martin", "Audi", "Austin",
        "Austin-Healey", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
        "Chrysler & Plymouth", "Daewoo", "Datsun", "Dodge", "Dodge & SRT",
        "Eagle", "Ferrari", "Fiat", "Fiat & Bertone", "Ford", "Geo", "GMC",
        "Honda", "Hyundai", "Infiniti", "Isuzu", "Jaguar", "Jensen", "Kia",
        "Lamborghini", "Lancia", "Lexus", "Lincoln", "Lotus", "Maserati",
        "Mazda", "McLaren", "Mercedes", "Mercedes-Benz", "Mercury", "Merkur",
        "MG", "MINI", "Mini", "Mitsubishi", "Morgan", "Nissan",
        "Nissan & Datsun", "Nissan/Datsun", "Oldsmobile", "Opel", "Peugeot",
        "Plymouth", "Polestar", "Pontiac", "Pontiac & Toyota", "Porsche",
        "Renault", "Saab", "Saturn", "Scion", "Shelby", "Subaru", "Sunbeam",
        "Suzuki", "Tesla", "Tesla Motors", "Toyota", "Triumph", "TVR",
        "Volkswagen", "Volvo", "Yugo",
    ]:
        known_makes.add(extra.lower())

    # Curated car token sets, bucketed by (category, class) for dupe detection.
    curated: dict[tuple[str, str], list[tuple[str, set[str]]]] = {}
    for car in cars:
        car_tokens = tokens(f"{car['make']} {car['model']}")
        for category, klass in car["classes"].items():
            curated.setdefault((category, klass), []).append((car["id"], car_tokens))

    listings = []
    idx = 0
    for klass, bucket in cands["classes"].items():
        category = bucket["category"]
        for e in bucket["entries"]:
            make = re.sub(r"\s+", " ", e["make"]).strip()
            model = re.sub(r"\s+", " ", e["model"]).strip()
            if len(model) < 2:
                continue
            y1, y2 = parse_years(model)
            entry_tokens = tokens(f"{make} {model}")

            curated_id = None
            best = 0.0
            for cid, ct in curated.get((category, klass), []):
                if not ct:
                    continue
                score = len(ct & entry_tokens) / len(ct)
                if score > best:
                    best, curated_id = score, cid
            if best < 0.75:
                curated_id = None

            idx += 1
            listing = {
                "id": f"l{idx:04d}",
                "category": category,
                "class": klass,
                "make": make,
                "model": model,
            }
            if y1:
                listing["yearStart"], listing["yearEnd"] = y1, y2
            if make.lower() not in known_makes:
                listing["makeSuspect"] = True
            if curated_id:
                listing["curatedId"] = curated_id
            listings.append(listing)

    with open(OUT, "w") as f:
        json.dump(listings, f, indent=1, ensure_ascii=False)
        f.write("\n")

    dupes = sum(1 for l in listings if "curatedId" in l)
    suspect = sum(1 for l in listings if l.get("makeSuspect"))
    print(
        f"{len(listings)} listings written; {dupes} matched to curated rows; "
        f"{suspect} with suspect makes; {len(listings) - dupes} net-new searchable"
    )

if __name__ == "__main__":
    main()
