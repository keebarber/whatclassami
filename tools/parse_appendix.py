#!/usr/bin/env python3
"""Parse SCCA 2026 Solo Rules Appendix A (Street + Street Touring) from
pdftotext -layout output into JSON {class: ["Make | Model", ...]}."""
import json
import re
import sys

SPLIT = 42
HEADER = re.compile(
    r"^(?:Super|[A-H]) Street(?: Touring)?[®\s]*(?:[Cc]lass\s*)?\((\w{2,4})\)"
)
FURNITURE = re.compile(
    r"Appendix A|SCCA|National Solo|\(continued\)|\(Continued\)|^\s*\d+\s*$"
)

def main(path: str) -> None:
    pages = open(path, encoding="utf-8").read().split("\f")
    start = next(i for i, p in enumerate(pages) if "Appendix A - (SS) Street" in p)

    classes: dict[str, list[str]] = {}
    current = make = None
    done = False

    for page in pages[start:]:
        if done:
            break
        lines = page.split("\n")
        for stream in ([ln[:SPLIT] for ln in lines], [ln[SPLIT:] for ln in lines]):
            if done:
                break
            for raw in stream:
                if not raw.strip():
                    continue
                stripped = raw.strip()
                if FURNITURE.search(stripped):
                    continue
                h = HEADER.match(stripped)
                if h:
                    code = h.group(1)
                    if code == "SSP":  # Street Prepared begins — stop
                        done = True
                        break
                    current = code
                    classes.setdefault(current, [])
                    make = None
                    continue
                if current is None:
                    continue
                indent = len(raw) - len(raw.rstrip("\n")) if False else len(raw) - len(raw.lstrip())
                text = stripped.replace("’", "'").replace("®", "")
                if text.startswith("•") or text.startswith("•"):
                    continue
                if indent >= 4 and classes[current]:
                    classes[current][-1] += " " + text  # continuation line
                elif indent >= 1:
                    if make:
                        classes[current].append(f"{make} | {text}")
                elif len(text) < 40 and not text.endswith((".", ":", ";", ",")):
                    make = text
                # else: prose — ignore

    json.dump(classes, sys.stdout, indent=1)

if __name__ == "__main__":
    main(sys.argv[1])
