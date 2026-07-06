import { describe, expect, it } from "vitest";
import { reportIssueUrl } from "../report";

const car = {
  id: "mazda-miata-na-nb",
  make: "Mazda",
  model: "MX-5 Miata (NA/NB)",
  yearStart: 1990,
  yearEnd: 2005,
};

describe("reportIssueUrl", () => {
  it("targets the repo's new-issue endpoint with a classing-correction label", () => {
    const url = reportIssueUrl({ car, classing: "ES → CST", repoUrl: "https://github.com/o/r" });
    expect(url.startsWith("https://github.com/o/r/issues/new?")).toBe(true);
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("labels")).toBe("classing-correction");
    expect(qs.get("title")).toContain("Mazda MX-5 Miata (NA/NB)");
  });

  it("embeds the car id, classing, and reproduce URL in the body", () => {
    const url = reportIssueUrl({
      car,
      classing: "ES → CST (Street Touring)",
      pageUrl: "https://whatclassami.com/car/mazda-miata-na-nb",
    });
    const body = new URLSearchParams(url.split("?")[1]).get("body")!;
    expect(body).toContain("mazda-miata-na-nb");
    expect(body).toContain("ES → CST (Street Touring)");
    expect(body).toContain("https://whatclassami.com/car/mazda-miata-na-nb");
  });

  it("omits the reproduce line when no pageUrl is given", () => {
    const body = new URLSearchParams(
      reportIssueUrl({ car, classing: "ES" }).split("?")[1],
    ).get("body")!;
    expect(body).not.toContain("Reproduce:");
  });
});
