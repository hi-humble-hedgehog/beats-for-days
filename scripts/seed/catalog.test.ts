import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalogFromPath } from "./catalog";

describe("Launch Pack Catalog Integrity", () => {
  it("loads track-09 with accurate 98 BPM musical loop markers", () => {
    const catalogPath = path.resolve("docs/beats-launch-pack/catalog.json");
    const { tracks } = loadCatalogFromPath(catalogPath);

    const track09 = tracks.find((t) => t.id === "track-09");
    expect(track09).toBeDefined();
    expect(track09?.bpm).toBe(98);
    expect(track09?.loopStartMs).toBe(9796);
    expect(track09?.loopEndMs).toBe(44082);
    expect(track09?.loopDurationMs).toBe(34286);
  });
});
