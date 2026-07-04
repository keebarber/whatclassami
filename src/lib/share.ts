import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

export interface BuildState {
  carId: string | null;
  modIds: string[];
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
    return {
      carId: typeof parsed.carId === "string" ? parsed.carId : null,
      modIds: Array.isArray(parsed.modIds)
        ? parsed.modIds.filter((m: unknown) => typeof m === "string")
        : [],
    };
  } catch {
    return null;
  }
}
