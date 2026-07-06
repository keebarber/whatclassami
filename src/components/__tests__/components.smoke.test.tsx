import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistBox } from "@/components/AssistBox";
import { Classifier } from "@/components/Classifier";
import { ContactForm } from "@/components/ContactForm";

describe("AssistBox", () => {
  it("renders the natural-language entry with the AI-never-classes disclaimer", () => {
    const out = renderToStaticMarkup(<AssistBox onApply={() => {}} />);
    expect(out).toContain("Map my build");
    expect(out).toContain("describe your car in plain English");
    expect(out).toContain("rules engine"); // "…computed by the rules engine, never by the AI."
  });
});

describe("ContactForm", () => {
  it("renders the report form with topic options", () => {
    const out = renderToStaticMarkup(<ContactForm email="test@example.com" />);
    expect(out).toContain("Classing error report");
    expect(out).toContain("Missing car");
    expect(out).toContain("Name (optional)");
  });
});

describe("Classifier", () => {
  it("renders the full picker tree without throwing (empty initial state)", () => {
    const out = renderToStaticMarkup(<Classifier />);
    expect(out.length).toBeGreaterThan(100);
    expect(out).toContain("Select a car"); // empty ResultPanel state
    expect(out).toContain("Map my build"); // AssistBox mounted inside
  });
});
