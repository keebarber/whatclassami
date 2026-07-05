import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { BuildSpec } from "@/engine/constraints";

export interface BuildState {
  carId: string | null;
  modIds: string[];
  spec?: BuildSpec;
}

/** Encode a build into a compact URL-safe string (no backend, no accounts). */
export function encodeBuild(state: BuildState): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeBuild(encoded: string): BuildState | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    const spec: BuildSpec = {};
    if (typeof parsed.spec === "object" && parsed.spec !== null) {
      if (typeof parsed.spec.tireWidthMm === "number") spec.tireWidthMm = parsed.spec.tireWidthMm;
      if (typeof parsed.spec.wheelWidthIn === "number") spec.wheelWidthIn = parsed.spec.wheelWidthIn;
      if (["fwd", "rwd", "awd"].includes(parsed.spec.drivetrain)) spec.drivetrain = parsed.spec.drivetrain;
      if (typeof parsed.spec.midEngine === "boolean") spec.midEngine = parsed.spec.midEngine;
    }
    return {
      carId: typeof parsed.carId === "string" ? parsed.carId : null,
      modIds: Array.isArray(parsed.modIds)
        ? parsed.modIds.filter((m: unknown) => typeof m === "string")
        : [],
      spec,
    };
  } catch {
    return null;
  }
}
