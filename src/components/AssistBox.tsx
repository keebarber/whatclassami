"use client";

import { useState } from "react";

interface AssistResponse {
  carId: string | null;
  modIds: string[];
  unmatched: string[];
  note?: string;
}

/**
 * Natural-language entry: the LLM only MAPS the description to known car/mod
 * ids — classification itself is always computed by the deterministic engine.
 * Fully optional; the manual picker works without it.
 */
export function AssistBox({
  onApply,
}: {
  onApply: (carId: string | null, modIds: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text.trim() }),
      });
      if (res.status === 503) {
        setDisabled(true);
        setStatus("Assist isn't configured on this deployment — use the picker below.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AssistResponse = await res.json();
      onApply(data.carId, data.modIds);
      const parts: string[] = [];
      if (data.carId) parts.push("matched your car");
      if (data.modIds.length > 0) parts.push(`mapped ${data.modIds.length} mod(s)`);
      if (data.unmatched.length > 0)
        parts.push(`couldn't map: ${data.unmatched.join(", ")} — check these manually`);
      setStatus(parts.length ? `We ${parts.join("; ")}. Verify below, then read your result.` : "Nothing matched — try the picker below.");
    } catch {
      setStatus("Assist hit a snag — the manual picker below always works.");
    } finally {
      setBusy(false);
    }
  }

  if (disabled) return null;

  return (
    <div className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-4">
      <label htmlFor="assist" className="text-xs font-bold uppercase tracking-widest text-cone-500">
        Fast lane · describe your car in plain English
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="assist"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder='e.g. "2019 ND Miata with coilovers, a tune, and 225 RE-71RS"'
          className="flex-1 rounded-lg border border-asphalt-600 bg-asphalt-800 px-3 py-2.5 text-sm placeholder:text-asphalt-500 focus:border-cone-500 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-cone-500 px-4 py-2.5 text-sm font-bold text-asphalt-950 transition hover:bg-cone-400 disabled:opacity-40"
        >
          {busy ? "Mapping…" : "Map my build"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-chalk-dim">
        This only fills in the pickers — your class is always computed by the rules engine, never
        by the AI.
      </p>
      {status && <p className="mt-2 text-xs text-cone-100">{status}</p>}
    </div>
  );
}
