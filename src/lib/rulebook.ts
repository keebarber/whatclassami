/**
 * Deep links into the official 2026 Solo Rules PDF (hosted by SCCA).
 * Browser PDF viewers honor #page=N. Printed page N = PDF page N+1 in the
 * February 2026 edition. Page map covers section starts we verified while
 * reading the rulebook; unknown refs fall back to the official rules page.
 */
export const RULEBOOK_PDF_URL =
  "https://cdn.connectsites.net/user_files/scca/downloads/000/078/494/2026%20Solo%20Rulebook%20Feb.pdf";

export const RULES_PAGE_URL = "https://www.scca.com/pages/solo-cars-and-rules";

const PRINTED_PAGE_BY_SECTION: Record<string, number> = {
  "3.1": 24,
  "12": 67,
  "13": 75,
  "14": 86,
  "14.2": 88,
  "14.3": 89,
  "14.4": 89,
  "14.5": 89,
  "15": 100,
  "16": 122,
  "21": 184,
};

const APPENDIX_A_PRINTED = 189;

/** Best-effort deep link for a ruleRef string like "ST cat., 2026 Solo Rules §14.3". */
export function ruleLink(ruleRef: string): { href: string; label: string } {
  if (/appendix a/i.test(ruleRef)) {
    return {
      href: `${RULEBOOK_PDF_URL}#page=${APPENDIX_A_PRINTED + 1}`,
      label: "Appendix A (PDF)",
    };
  }
  const m = ruleRef.match(/§(\d+(?:\.\d+)?)/);
  if (m) {
    const section = m[1];
    const printed =
      PRINTED_PAGE_BY_SECTION[section] ??
      PRINTED_PAGE_BY_SECTION[section.split(".")[0]];
    if (printed) {
      return { href: `${RULEBOOK_PDF_URL}#page=${printed + 1}`, label: `§${section} (PDF)` };
    }
    return { href: RULES_PAGE_URL, label: `§${section}` };
  }
  return { href: RULES_PAGE_URL, label: "Solo Rules" };
}
