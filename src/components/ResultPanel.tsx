"use client";

import { useState } from "react";
import { CATEGORY_LABELS, ClassificationResult } from "@/engine";

function ClassChip({ label, tone }: { label: string; tone: "base" | "final" | "unknown" }) {
  const styles =
    tone === "final"
      ? "bg-cone-500 text-asphalt-950"
      : tone === "base"
        ? "bg-asphalt-700 text-chalk"
        : "bg-asphalt-700 text-chalk-dim";
  return (
    <span className={`rounded-lg px-3 py-1.5 text-xl font-extrabold tracking-tight ${styles}`}>
      {label}
    </span>
  );
}

export function ResultPanel({ result }: { result: ClassificationResult | null }) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-asphalt-600 bg-asphalt-900 p-6 text-sm text-chalk-dim">
        Select a car to see its class.
      </div>
    );
  }

  const bumped = result.finalCategory !== "street";
  const base =
    result.baseClass ?? (result.car.streetExclusion ? "Excluded" : "NOC");
  const final =
    result.finalClass ?? (bumped ? `${CATEGORY_LABELS[result.finalCategory]} — class TBD` : base);
  // Escalated = the car landed in a category no mod strictly requires
  // (it's classed there in Appendix A, e.g. non-turbo Forester → FSP).
  const escalated =
    bumped && result.items.every((i) => i.requiredCategory !== result.finalCategory);

  async function copyShareUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-5 lg:sticky lg:top-4">
      <div className="flex flex-wrap items-center gap-3">
        <ClassChip label={base} tone={bumped ? "base" : "final"} />
        {bumped && (
          <>
            <span aria-hidden className="text-xl font-bold text-chalk-dim">→</span>
            <ClassChip label={final} tone={result.finalClass ? "final" : "unknown"} />
          </>
        )}
      </div>
      <p className="mt-2 text-sm text-chalk-dim">
        {bumped
          ? escalated
            ? `This car runs in ${CATEGORY_LABELS[result.finalCategory]}, where it's listed in Appendix A.`
            : `Modifications move this car from ${CATEGORY_LABELS.street} toward ${CATEGORY_LABELS[result.finalCategory]}.`
          : "Everything selected is allowed in Street. Run it."}
      </p>

      {result.items.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {result.items.map(({ mod, status, requiredCategory, binding }) => (
            <li
              key={mod.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                status === "legal"
                  ? "border-legal-500/30 bg-legal-900/40"
                  : "border-bump-500/30 bg-bump-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span>
                  <span aria-hidden>{status === "legal" ? "✓ " : "✕ "}</span>
                  <span className="font-semibold">{mod.label}</span>
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${
                    status === "legal" ? "text-legal-500" : "text-bump-500"
                  }`}
                >
                  {status === "legal" ? "Street OK" : CATEGORY_LABELS[requiredCategory]}
                  {binding && " •"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-chalk-dim">{mod.ruleRef}</p>
            </li>
          ))}
        </ul>
      )}

      {result.warnings.length > 0 && (
        <div className="mt-4 space-y-1 rounded-lg border border-cone-500/40 bg-asphalt-800 p-3">
          {result.warnings.map((w) => (
            <p key={w} className="text-xs text-cone-100">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={copyShareUrl}
          className="rounded-lg bg-asphalt-700 px-4 py-2 text-sm font-bold transition hover:bg-asphalt-600"
        >
          {copied ? "Copied!" : "Copy share link"}
        </button>
        <span className="text-xs text-chalk-dim">• = caused the bump</span>
      </div>

      <p className="mt-4 border-t border-asphalt-700 pt-3 text-[11px] leading-relaxed text-chalk-dim">
        Unofficial guidance — verify against the current SCCA Solo Rules before tech. Found an
        error? Report it with your share link.
      </p>
    </div>
  );
}
