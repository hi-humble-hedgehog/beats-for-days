import { describe, expect, it } from "vitest";
import { epochShuffle, hashSeedItem } from "./shuffle";

describe("hashSeedItem", () => {
  it("produces deterministic numbers for identical inputs", () => {
    const h1 = hashSeedItem("seed_abc", 1, "track-1");
    const h2 = hashSeedItem("seed_abc", 1, "track-1");
    expect(h1).toBe(h2);
  });

  it("produces different numbers for different items", () => {
    const h1 = hashSeedItem("seed_abc", 1, "track-1");
    const h2 = hashSeedItem("seed_abc", 1, "track-2");
    expect(h1).not.toBe(h2);
  });

  it("produces different numbers across different cycles", () => {
    const h1 = hashSeedItem("seed_abc", 1, "track-1");
    const h2 = hashSeedItem("seed_abc", 2, "track-1");
    expect(h1).not.toBe(h2);
  });
});

describe("epochShuffle", () => {
  const sampleTracks = [
    { id: "track-a", name: "A" },
    { id: "track-b", name: "B" },
    { id: "track-c", name: "C" },
    { id: "track-d", name: "D" },
    { id: "track-e", name: "E" },
  ];

  it("returns an empty array when given an empty list", () => {
    expect(epochShuffle([], "seed_123", 1)).toEqual([]);
  });

  it("returns the same single item without mutation", () => {
    expect(epochShuffle([sampleTracks[0]!], "seed_123", 1)).toEqual([
      sampleTracks[0],
    ]);
  });

  it("shuffles deterministically for the same seed and cycle", () => {
    const first = epochShuffle(sampleTracks, "seed_42", 1);
    const second = epochShuffle(sampleTracks, "seed_42", 1);

    expect(first).toEqual(second);
    expect(first).toHaveLength(sampleTracks.length);
    // Contains all original items
    expect(new Set(first.map((t) => t.id))).toEqual(
      new Set(sampleTracks.map((t) => t.id)),
    );
  });

  it("produces a different order for a different cycle", () => {
    const cycle1 = epochShuffle(sampleTracks, "seed_42", 1);
    const cycle2 = epochShuffle(sampleTracks, "seed_42", 2);

    expect(cycle1.map((t) => t.id)).not.toEqual(cycle2.map((t) => t.id));
  });

  it("produces a different order for a different seed", () => {
    const seedA = epochShuffle(sampleTracks, "seed_aaa", 1);
    const seedB = epochShuffle(sampleTracks, "seed_bbb", 1);

    expect(seedA.map((t) => t.id)).not.toEqual(seedB.map((t) => t.id));
  });

  it("pins the starting beat to index 0 if specified and present", () => {
    const shuffled = epochShuffle(sampleTracks, "seed_42", 1, "track-c");
    expect(shuffled[0]?.id).toBe("track-c");
    expect(shuffled).toHaveLength(sampleTracks.length);
    expect(new Set(shuffled.map((t) => t.id))).toEqual(
      new Set(sampleTracks.map((t) => t.id)),
    );
  });

  it("ignores starting beat if not present in the list", () => {
    const shuffled = epochShuffle(sampleTracks, "seed_42", 1, "track-unknown");
    expect(shuffled).toHaveLength(sampleTracks.length);
  });
});
