import { REPO_URL } from "./site";

export interface ReportCar {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
}

/**
 * Build a prefilled GitHub "new issue" URL for a classing correction, so every
 * community report carries an audit trail: the exact car row, the classing the
 * tool showed, and the share/page URL that reproduces it. Pure + deterministic
 * (easy to unit-test); the caller supplies the current page URL.
 */
export function reportIssueUrl(opts: {
  car: ReportCar;
  /** Human-readable classing the tool displayed, e.g. "DS → DST (Street Touring)". */
  classing: string;
  /** The share/permalink URL that reproduces the result (optional). */
  pageUrl?: string;
  repoUrl?: string;
}): string {
  const { car, classing, pageUrl, repoUrl = REPO_URL } = opts;
  const name = `${car.yearStart}–${car.yearEnd} ${car.make} ${car.model}`;
  const title = `Classing correction: ${name}`;
  const body = [
    `**Car:** ${name} (\`${car.id}\`)`,
    `**Classing shown:** ${classing}`,
    ...(pageUrl ? [`**Reproduce:** ${pageUrl}`] : []),
    "",
    "**What's wrong / what the class should be:**",
    "",
    "",
    "**Appendix A citation or source (2026 Solo Rules), if known:**",
    "",
    "",
    "_Filed from the “report an error” link. Thanks for helping keep the data honest._",
  ].join("\n");
  const params = new URLSearchParams({
    title,
    body,
    labels: "classing-correction",
  });
  return `${repoUrl}/issues/new?${params.toString()}`;
}
