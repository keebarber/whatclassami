#!/usr/bin/env python3
"""Extract Appendix A listings (Street, Street Touring, Street Prepared,
Street Modified) from the SCCA Solo Rules PDF into candidate rows for human
review.

Usage:
    pdftotext -layout reference/2026_Solo_Rulebook.pdf /tmp/rulebook.txt
    python3 tools/parse_appendix.py /tmp/rulebook.txt > tools/output/candidates.json

The two-column page layout is the hard part: the right column's base indent
drifts between pages (roughly cols 32-46), so the split position is detected
per page from the distribution of gap positions. Output is CANDIDATES —
every row still requires human verification before it enters src/data/.
"""
import json
import re
import sys
from collections import Counter

# Class codes we extract, and their category.
CATEGORY_BY_CODE = {
    **{c: "street" for c in ["SS", "AS", "BS", "CS", "DS", "ES", "FS", "GS", "HS"]},
    **{c: "streetTouring" for c in ["SST", "AST", "BST", "CST", "DST", "EST", "GST"]},
    **{c: "streetPrepared" for c in ["SSP", "ASP", "BSP", "CSP", "DSP", "ESP", "FSP"]},
    **{c: "streetModified" for c in ["SSM", "SM", "SMF"]},
}
# Codes that mark the end of the sections we care about.
STOP_CODES = {"XP", "CP", "DP", "EP", "FP", "AM", "BM", "CM", "DM", "EM", "FM", "KM"}

HEADER_RE = re.compile(
    r"^(?:Super\s+)?(?:[A-HX]\s+)?Street(?:\s+Touring|\s+Prepared|\s+Modified)?"
    r"[®\s]*(?:Front-Wheel-Drive\s*)?(?:[Cc]lass\s*)?\((\w{2,4})\)"
)
# Prepared/Modified category headers ("X Prepared (XP)", "A Modified (AM)")
# don't contain the word "Street" — they mark the end of our sections.
STOP_RE = re.compile(r"^[A-FX]\s+(?:Prepared|Modified)\s*\((\w{2,3})\)")
FURNITURE_RE = re.compile(
    r"Appendix A|SCCA|National Solo|Solo® Rules|\(continued\)|\(Continued\)"
    r"|^\s*\d+\s*$|Tire Rack|tirerack|FAST FREE|www\.|^\s*©|Hoosier|STREET (TOURING® )?CATEGORY"
    r"|Complete Line of Competition",
    re.IGNORECASE,
)
MAKE_RE = re.compile(r'^[A-Z“"][\w“”"&\-\./ ]{0,30}$')
CATCHALL_RE = re.compile(r"[“\"]?Catch-?all[”\"]?:?", re.IGNORECASE)

def detect_split(lines: list[str]) -> int | None:
    """Find the right column's base indent for one page."""
    cands: list[int] = []
    for ln in lines:
        if FURNITURE_RE.search(ln):
            continue
        m = re.match(r"^(\s{28,60})\S", ln)
        if m:
            cands.append(len(m.group(1)))
        for g in re.finditer(r"\S(\s{3,})\S", ln):
            p = g.end(1)
            if 28 <= p <= 60:
                cands.append(p)
    if not cands:
        return None
    cnt = Counter(cands)
    thresh = max(2, max(cnt.values()) // 5)
    goods = sorted(p for p, c in cnt.items() if c >= thresh)
    return goods[0] if goods else min(cands)

def unbalanced(s: str) -> bool:
    return s.count("(") > s.count(")")

class Parser:
    def __init__(self) -> None:
        self.classes: dict[str, dict] = {}
        self.exclusions: list[str] = []
        self.current: str | None = None
        self.make: str | None = None
        self.in_catchall = False
        self.done = False

    def bucket(self) -> dict:
        return self.classes.setdefault(
            self.current,
            {"category": CATEGORY_BY_CODE[self.current], "entries": [], "catchall": ""},
        )

    def feed(self, raw: str) -> None:
        if self.done or not raw.strip():
            return
        text = raw.strip().replace("’", "'").replace("®", "")
        if FURNITURE_RE.search(text):
            return

        if STOP_RE.match(text):
            self.done = True
            return
        h = HEADER_RE.match(text)
        if h:
            code = h.group(1)
            if code in STOP_CODES:
                self.done = True
                return
            if code in CATEGORY_BY_CODE:
                self.current = code
                self.make = None
                self.in_catchall = False
                self.bucket()
            return

        if text.startswith(("•", "●")):
            self.exclusions.append(text.lstrip("•● ").strip())
            return
        if self.current is None:
            return
        if text.startswith("*"):  # §3.1 footnotes
            return

        indent = len(raw) - len(raw.lstrip())
        b = self.bucket()

        if CATCHALL_RE.match(text):
            self.in_catchall = True
            self.make = None
            return
        if self.in_catchall:
            if indent == 0 and MAKE_RE.match(text):
                self.in_catchall = False  # fall through to make handling
            else:
                b["catchall"] = (b["catchall"] + " " + text).strip()
                return

        prev = b["entries"][-1] if b["entries"] else None

        # A make line always breaks a continuation run. This guards against
        # rulebook typos with unbalanced parens (e.g. "CT4 (non-V,
        # non-Blackwing (2020-26)") swallowing everything after them.
        # True continuation fragments never look like makes: they contain
        # parens, or start lowercase / with a digit.
        if indent == 0 and MAKE_RE.match(text) and "(" not in text:
            self.make = text.strip('“”"')
            return

        continuation = prev is not None and prev.get("joins", 0) < 4 and (
            unbalanced(prev["model"])
            or text.startswith("(")
            or indent >= 3
            or prev["model"].endswith(("-", ",", "&"))
        )
        if continuation and prev is not None:
            prev["model"] = f"{prev['model']} {text}"
            prev["joins"] = prev.get("joins", 0) + 1
            return
        if self.make:
            b["entries"].append({"make": self.make, "model": text})

def main(path: str) -> None:
    pages = open(path, encoding="utf-8").read().split("\f")
    start = next(i for i, p in enumerate(pages) if "Appendix A - (SS) Street" in p)

    parser = Parser()
    for page in pages[start:]:
        if parser.done:
            break
        lines = page.split("\n")
        split = detect_split(lines)
        if split is None:
            for ln in lines:
                parser.feed(ln)
            continue
        for ln in lines:  # left column, then right column: reading order
            parser.feed(ln[:split].rstrip())
        for ln in lines:
            parser.feed(ln[split:])

    for b in parser.classes.values():
        for e in b["entries"]:
            e.pop("joins", None)
    total = sum(len(b["entries"]) for b in parser.classes.values())
    out = {
        "meta": {
            "source": path,
            "note": "CANDIDATES ONLY — human verification required before use in src/data/",
            "totalEntries": total,
            "perClass": {k: len(v["entries"]) for k, v in parser.classes.items()},
        },
        "streetExclusions": parser.exclusions,
        "classes": parser.classes,
    }
    json.dump(out, sys.stdout, indent=1)

if __name__ == "__main__":
    main(sys.argv[1])
