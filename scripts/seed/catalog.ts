import * as fs from "node:fs";
import * as path from "node:path";
import {
  type SeedTrack,
  type SeedTransition,
  SEED_TRACKS,
  SEED_TRANSITIONS,
} from "./fixtures";

/** Configuration options for database seeding. */
export interface SeedOptions {
  catalogPath?: string;
  tracks?: SeedTrack[];
  transitions?: SeedTransition[];
  skipStorageUpload?: boolean;
  clean?: boolean;
}

/**
 * Loads and parses track and transition metadata from a JSON catalog file.
 * Automatically translates `.wav` extensions into `.m4a` file paths.
 */
export function loadCatalogFromPath(catalogPath: string): {
  tracks: SeedTrack[];
  transitions: SeedTransition[];
} {
  const raw = fs.readFileSync(catalogPath, "utf8");
  const parsed = JSON.parse(raw);
  const tracks: SeedTrack[] = (parsed.tracks ?? []).map(
    (t: Record<string, unknown>, idx: number) => {
      const match = /(\d+)/.exec(String(t.id));
      const trackIndex =
        t.index !== undefined
          ? Number(t.index)
          : match
            ? Number(match[1])
            : idx + 1;
      const label = String(trackIndex).padStart(2, "0");

      return {
        id: String(t.id),
        name: label,
        index: trackIndex,
        bpm: Number(t.bpm),
        key: String(t.key),
        genre: String(t.genre),
        leadInstrument: t.leadInstrument ? String(t.leadInstrument) : undefined,
        counterInstrument: t.counterInstrument
          ? String(t.counterInstrument)
          : undefined,
        fileName: String(t.fileName).replace(/\.wav$/i, ".m4a"),
        durationMs: Number(t.durationMs),
        loopStartMs: Number(t.loopStartMs),
        loopEndMs: Number(t.loopEndMs),
        loopDurationMs:
          Number(t.loopDurationMs) ||
          Number(t.loopEndMs) - Number(t.loopStartMs),
      };
    },
  );

  const transitions: SeedTransition[] = (parsed.transitions ?? []).map(
    (tr: Record<string, unknown>) => ({
      id: String(tr.id),
      from: String(tr.from),
      to: String(tr.to),
      fileName: String(tr.fileName).replace(/\.wav$/i, ".m4a"),
      timing: tr.timing as SeedTransition["timing"],
      recipeVersion: tr.recipeVersion ? String(tr.recipeVersion) : undefined,
    }),
  );

  return { tracks, transitions };
}

/**
 * Resolves the catalog dataset to seed. Checks custom CLI/env paths, defaults to
 * docs/beats-launch-pack/catalog.json if available, or falls back to built-in seed fixtures.
 */
export function resolveCatalog(customPath?: string): {
  tracks: SeedTrack[];
  transitions: SeedTransition[];
} {
  const candidate =
    customPath ||
    process.env.CATALOG_PATH ||
    (fs.existsSync(path.resolve("docs/beats-launch-pack/catalog.json"))
      ? path.resolve("docs/beats-launch-pack/catalog.json")
      : undefined);

  if (candidate && fs.existsSync(candidate)) {
    return loadCatalogFromPath(candidate);
  }

  return { tracks: SEED_TRACKS, transitions: SEED_TRANSITIONS };
}

/** Resolves seed data from options or catalog path. */
export function resolveSeedData(options?: SeedOptions): {
  tracks: SeedTrack[];
  transitions: SeedTransition[];
} {
  if (options?.tracks && options?.transitions) {
    return { tracks: options.tracks, transitions: options.transitions };
  }
  return resolveCatalog(options?.catalogPath);
}
