import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCatalogFromPath,
  resolveCatalog,
  SEED_TRACKS,
  SEED_TRANSITIONS,
} from "./cli";

describe("loadCatalogFromPath", () => {
  it("loads tracks and transitions from a valid JSON catalog and converts WAV filenames to M4A", () => {
    const fixtureDir = path.resolve("test/fixtures/catalog-test");
    const catalogPath = path.join(fixtureDir, "catalog.json");

    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(
      catalogPath,
      JSON.stringify({
        tracks: [
          {
            id: "track-01",
            name: "Test Track 01",
            bpm: 90,
            key: "C minor",
            genre: "Boom Bap",
            fileName: "track-01.wav",
            durationMs: 20000,
            loopStartMs: 5000,
            loopEndMs: 15000,
          },
        ],
        transitions: [
          {
            id: "track-01-to-track-02",
            from: "track-01",
            to: "track-02",
            fileName: "track-01-to-track-02.wav",
            timing: {
              handleMs: 250,
              crossfadeMs: 100,
              glueMs: 5000,
              landMs: 0,
            },
          },
        ],
      }),
    );

    try {
      const { tracks, transitions } = loadCatalogFromPath(catalogPath);

      expect(tracks).toHaveLength(1);
      expect(tracks[0]?.id).toBe("track-01");
      expect(tracks[0]?.fileName).toBe("track-01.m4a");
      expect(tracks[0]?.loopDurationMs).toBe(10000);

      expect(transitions).toHaveLength(1);
      expect(transitions[0]?.id).toBe("track-01-to-track-02");
      expect(transitions[0]?.fileName).toBe("track-01-to-track-02.m4a");
    } finally {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("handles missing optional fields with defaults", () => {
    const fixtureDir = path.resolve("test/fixtures/catalog-test-empty");
    const catalogPath = path.join(fixtureDir, "empty.json");

    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(catalogPath, JSON.stringify({}));

    try {
      const { tracks, transitions } = loadCatalogFromPath(catalogPath);
      expect(tracks).toEqual([]);
      expect(transitions).toEqual([]);
    } finally {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});

describe("resolveCatalog", () => {
  it("resolves built-in fallback tracks when no catalog path is provided and default does not exist", () => {
    const result = resolveCatalog("/non/existent/path.json");
    expect(result.tracks).toEqual(SEED_TRACKS);
    expect(result.transitions).toEqual(SEED_TRANSITIONS);
  });
});

describe("seedDatabase, seedTrack, seedTransition", () => {
  it("seeds tracks and transitions with mock supabase client", async () => {
    const upserted: { table: string; row: unknown }[] = [];

    const mockClient = {
      from: (table: string) => ({
        upsert: async (row: unknown) => {
          upserted.push({ table, row });
          return { error: null };
        },
      }),
    };

    const testTrack = {
      id: "track-test",
      name: "Test Track",
      bpm: 90,
      key: "C minor",
      genre: "Boom Bap",
      fileName: "track-test.m4a",
      durationMs: 20000,
      loopStartMs: 5000,
      loopEndMs: 15000,
      loopDurationMs: 10000,
    };

    const testTransition = {
      id: "track-test-to-b",
      from: "track-test",
      to: "track-b",
      fileName: "test-to-b.m4a",
      timing: { handleMs: 250, crossfadeMs: 100, glueMs: 5000, landMs: 0 },
    };

    const { seedDatabase } = await import("./cli");
    await seedDatabase(mockClient as never, {
      tracks: [testTrack],
      transitions: [testTransition],
      skipStorageUpload: true,
    });

    expect(upserted).toHaveLength(2);
    expect(upserted[0]?.table).toBe("tracks");
    expect(upserted[1]?.table).toBe("transitions");
  });

  it("cleanDatabase deletes transitions before tracks", async () => {
    const deletedTables: string[] = [];
    const mockClient = {
      from: (table: string) => ({
        delete: () => ({
          neq: async () => {
            deletedTables.push(table);
            return { error: null };
          },
        }),
      }),
    };

    const { cleanDatabase } = await import("./cli");
    await cleanDatabase(mockClient as never);

    expect(deletedTables).toEqual(["transitions", "tracks"]);
  });

  it("cleanStorageBucket removes listed files from tracks and transitions folders", async () => {
    const removedPaths: string[][] = [];
    const mockClient = {
      storage: {
        from: (bucket: string) => ({
          list: async (folder: string) => {
            if (bucket === "audio" && folder === "tracks") {
              return {
                data: [
                  { name: "old-1.m4a" },
                  { name: ".emptyFolderPlaceholder" },
                ],
              };
            }
            if (bucket === "audio" && folder === "transitions") {
              return { data: [{ name: "old-tr.m4a" }] };
            }
            return { data: [] };
          },
          remove: async (paths: string[]) => {
            removedPaths.push(paths);
            return { error: null };
          },
        }),
      },
    };

    const { cleanStorageBucket } = await import("./cli");
    await cleanStorageBucket(mockClient as never, "audio");

    expect(removedPaths).toEqual([
      ["tracks/old-1.m4a"],
      ["transitions/old-tr.m4a"],
    ]);
  });
});
