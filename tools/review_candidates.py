#!/usr/bin/env python3
"""Cross-check src/data/cars.json against extracted Appendix A candidates.

For every class assignment on every car row, fuzzy-find the supporting
listing in tools/output/candidates.json and report:
  OK        found in the class we assigned
  ELSEWHERE best match sits in a different class (investigate!)
  NOT FOUND no candidate matched (extraction gap or our error)

Usage:
    python3 tools/review_candidates.py [candidates.json] [cars.json]
"""
import json
import re
import sys

STOP_TOKENS = {
    "gen", "non", "incl", "excl", "chassis", "all", "the", "and", "with",
    "without", "including", "excluding", "trd", "edition", "package", "l",
}

def tokens(s: str) -> set[str]:
    return {
        t.lower()
        for t in re.findall(r"[A-Za-z0-9]+", s)
        if (len(t) > 1 or t.isdigit()) and t.lower() not in STOP_TOKENS
    }

def score(car_tokens: set[str], entry: dict) -> float:
    entry_tokens = tokens(f"{entry['make']} {entry['model']}")
    if not car_tokens:
        return 0.0
    return len(car_tokens & entry_tokens) / len(car_tokens)

def main() -> None:
    cand_path = sys.argv[1] if len(sys.argv) > 1 else "tools/output/candidates.json"
    cars_path = sys.argv[2] if len(sys.argv) > 2 else "src/data/cars.json"
    cands = json.load(open(cand_path))["classes"]
    cars = json.load(open(cars_path))

    ok = elsewhere = missing = 0
    for car in cars:
        name = f"{car['make']} {car['model']}"
        car_tokens = tokens(name)
        for category, klass in car["classes"].items():
            # best match in every class bucket of the same category
            best: tuple[float, str, str] | None = None  # (score, class, text)
            best_assigned: tuple[float, str] | None = None  # (score, text)
            for cls, bucket in cands.items():
                if bucket["category"] != category:
                    continue
                for e in bucket["entries"]:
                    s = score(car_tokens, e)
                    text = f"{e['make']} | {e['model'][:60]}"
                    if best is None or s > best[0]:
                        best = (s, cls, text)
                    if cls == klass and (best_assigned is None or s > best_assigned[0]):
                        best_assigned = (s, text)
            tag: str
            if best is None or best[0] < 0.34:
                tag, missing = "NOT FOUND", missing + 1
                detail = ""
            elif best_assigned and best_assigned[0] >= best[0] - 0.15:
                # ties / near-ties resolve toward our assignment
                tag, ok = "OK", ok + 1
                detail = f"→ {best_assigned[1]}"
            else:
                tag, elsewhere = "ELSEWHERE", elsewhere + 1
                detail = f"best match in {best[1]}: {best[2]}"
            print(f"{tag:9} {car['id']:32} {category}:{klass:4} {detail}")

    total = ok + elsewhere + missing
    print(f"\n{ok}/{total} OK, {elsewhere} elsewhere, {missing} not found")
    sys.exit(0 if elsewhere + missing == 0 else 1)

if __name__ == "__main__":
    main()
