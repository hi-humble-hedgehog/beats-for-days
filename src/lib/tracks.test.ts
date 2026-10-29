import { type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  buildBeatViews,
  deriveTrackLabel,
  fetchBeatViews,
  fetchBeatViewById,
  type TrackRow,
  type TransitionRow,
} from "./tracks";

describe("buildBeatViews", () => {
  const dummyResolver = (path: string) => `http://storage.local/${path}`;

  const sampleTiming = {
    handleMs: 250,
    crossfadeMs: 100,
    glueMs: 7200,
    landMs: 0,
  };

  const sampleTracks: TrackRow[] = [
    {
      id: "track-a",
      name: "Soul Rhodes & Piano",
      bpm: 86,
      duration_ms: 61395,
      loop_start_ms: 8372,
      loop_end_ms: 50233,
      audio_path: "tracks/a.m4a",
    },
    {
      id: "track-b",
      name: "Jazz Flute & Vibraphone",
      bpm: 86,
      duration_ms: 66976,
      loop_start_ms: 16743,
      loop_end_ms: 55814,
      audio_path: "tracks/b.m4a",
    },
  ];

  const sampleTransitions: TransitionRow[] = [
    {
      id: "t-a-b",
      from_track_id: "track-a",
      to_track_id: "track-b",
      audio_path: "transitions/a-to-b.m4a",
      timing: sampleTiming,
    },
    {
      id: "t-b-a",
      from_track_id: "track-b",
      to_track_id: "track-a",
      audio_path: "transitions/b-to-a.m4a",
      timing: sampleTiming,
    },
  ];

  it("builds beat views with resolved audio URLs and nested transitions", () => {
    const views = buildBeatViews(
      sampleTracks,
      sampleTransitions,
      dummyResolver,
    );

    expect(views).toHaveLength(2);
    expect(views[0]).toEqual({
      id: "track-a",
      name: "Soul Rhodes & Piano",
      audioUrl: "http://storage.local/tracks/a.m4a",
      durationMs: 61395,
      loopStartMs: 8372,
      loopEndMs: 50233,
      bpm: 86,
      transitions: [
        {
          id: "t-a-b",
          targetTrackId: "track-b",
          audioUrl: "http://storage.local/transitions/a-to-b.m4a",
          timing: sampleTiming,
        },
      ],
    });

    expect(views[1]).toEqual({
      id: "track-b",
      name: "Jazz Flute & Vibraphone",
      audioUrl: "http://storage.local/tracks/b.m4a",
      durationMs: 66976,
      loopStartMs: 16743,
      loopEndMs: 55814,
      bpm: 86,
      transitions: [
        {
          id: "t-b-a",
          targetTrackId: "track-a",
          audioUrl: "http://storage.local/transitions/b-to-a.m4a",
          timing: sampleTiming,
        },
      ],
    });
  });

  it("handles tracks with no transitions gracefully", () => {
    const views = buildBeatViews(sampleTracks, [], dummyResolver);
    expect(views[0]?.transitions).toEqual([]);
    expect(views[1]?.transitions).toEqual([]);
  });

  it("preserves target track ID even if not found in tracks list", () => {
    const orphanTransition: TransitionRow = {
      id: "t-a-x",
      from_track_id: "track-a",
      to_track_id: "track-x",
      audio_path: "transitions/a-to-x.m4a",
      timing: sampleTiming,
    };

    const views = buildBeatViews(
      sampleTracks,
      [orphanTransition],
      dummyResolver,
    );
    expect(views[0]?.transitions[0]?.targetTrackId).toBe("track-x");
  });

  it("filters out inactive tracks and prunes transitions pointing to them", () => {
    const tracksWithInactive: TrackRow[] = [
      ...sampleTracks,
      {
        id: "track-c",
        name: "Disabled Beat",
        bpm: 90,
        duration_ms: 60000,
        loop_start_ms: 5000,
        loop_end_ms: 55000,
        audio_path: "tracks/c.m4a",
        is_active: false,
      },
    ];

    const transitionsWithInactive: TransitionRow[] = [
      ...sampleTransitions,
      {
        id: "t-a-c",
        from_track_id: "track-a",
        to_track_id: "track-c",
        audio_path: "transitions/a-to-c.m4a",
        timing: sampleTiming,
      },
    ];

    const views = buildBeatViews(
      tracksWithInactive,
      transitionsWithInactive,
      dummyResolver,
    );

    expect(views).toHaveLength(2);
    expect(views.some((v) => v.id === "track-c")).toBe(false);
    const trackA = views.find((v) => v.id === "track-a");
    expect(trackA?.transitions.some((t) => t.targetTrackId === "track-c")).toBe(
      false,
    );
  });
});

describe("deriveTrackLabel", () => {
  it("derives 2-digit label from index or fallback", () => {
    expect(deriveTrackLabel({ id: "track-01", name: "01", index: 1 })).toBe(
      "01",
    );
    expect(deriveTrackLabel({ id: "track-09", name: "09", index: 9 })).toBe(
      "09",
    );
    expect(deriveTrackLabel({ id: "track-12", name: "12", index: 12 })).toBe(
      "12",
    );
    expect(deriveTrackLabel({ id: "track-03", name: "track-03" })).toBe("03");
  });
});

describe("fetchBeatViews", () => {
  const sampleTiming = {
    handleMs: 250,
    crossfadeMs: 100,
    glueMs: 7200,
    landMs: 0,
  };

  const createMockClient = () => {
    const tablesQueried: string[] = [];
    const ordersRequested: string[] = [];
    return {
      tablesQueried,
      ordersRequested,
      from: (table: string) => {
        tablesQueried.push(table);
        if (table === "tracks") {
          const trackData = {
            data: [
              {
                id: "track-1",
                name: "01",
                index: 1,
                bpm: 88,
                duration_ms: 60000,
                loop_start_ms: 10000,
                loop_end_ms: 50000,
                audio_path: "tracks/1.m4a",
              },
            ],
            error: null,
          };
          const query = {
            order: (col: string) => {
              ordersRequested.push(col);
              return query;
            },
            then: (
              resolve: (v: unknown) => unknown,
              reject?: (e: unknown) => unknown,
            ) => Promise.resolve(trackData).then(resolve, reject),
          };
          return {
            select: () => query,
          };
        }
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  id: "t-1-2",
                  from_track_id: "track-1",
                  to_track_id: "track-2",
                  audio_path: "transitions/1-2.m4a",
                  timing: sampleTiming,
                },
              ],
              error: null,
            }),
        };
      },
      storage: {
        from: (bucket: string) => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://test.supabase.co/${bucket}/${path}` },
          }),
        }),
      },
    };
  };

  it("fetches tracks and resolves Supabase storage CDN URLs when useLocalAudio is false", async () => {
    const mockClient = createMockClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const views = await fetchBeatViews(mockClient as any, false);
    expect(mockClient.tablesQueried).toEqual(["tracks", "transitions"]);
    expect(mockClient.ordersRequested).toEqual(["index", "name"]);
    expect(views).toEqual([
      {
        id: "track-1",
        name: "01",
        index: 1,
        bpm: 88,
        durationMs: 60000,
        loopStartMs: 10000,
        loopEndMs: 50000,
        audioUrl: "https://test.supabase.co/audio/tracks/1.m4a",
        transitions: [
          {
            id: "t-1-2",
            targetTrackId: "track-2",
            audioUrl: "https://test.supabase.co/audio/transitions/1-2.m4a",
            timing: sampleTiming,
          },
        ],
      },
    ]);
  });

  function createChainedOrderQuery(result: { data: unknown; error: unknown }) {
    const query = {
      order: () => query,
      then: (
        resolve: (v: unknown) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  }

  it("resolves local /audio/ static URLs and preserves leading slash paths when useLocalAudio is true", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "tracks") {
          return {
            select: () =>
              createChainedOrderQuery({
                data: [
                  {
                    id: "track-1",
                    name: "01",
                    bpm: 88,
                    duration_ms: 60000,
                    loop_start_ms: 10000,
                    loop_end_ms: 50000,
                    audio_path: "tracks/1.m4a/",
                  },
                ],
                error: null,
              }),
          };
        }
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  id: "t-1-2",
                  from_track_id: "track-1",
                  to_track_id: "track-2",
                  audio_path: "/custom/transitions/1-2.m4a",
                  timing: sampleTiming,
                },
              ],
              error: null,
            }),
        };
      },
      storage: {
        from: () => ({
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const views = await fetchBeatViews(mockClient as any, true);
    expect(views[0]?.audioUrl).toBe("/audio/tracks/1.m4a/");
    expect(views[0]?.transitions[0]?.audioUrl).toBe(
      "/custom/transitions/1-2.m4a",
    );
  });

  it("falls back to local /audio/ static URLs when Supabase storage is absent", async () => {
    const mockClientWithoutStorage = {
      from: (table: string) => {
        if (table === "tracks") {
          return {
            select: () =>
              createChainedOrderQuery({
                data: [
                  {
                    id: "track-1",
                    name: "01",
                    bpm: 88,
                    duration_ms: 60000,
                    loop_start_ms: 10000,
                    loop_end_ms: 50000,
                    audio_path: "tracks/1.m4a",
                  },
                ],
                error: null,
              }),
          };
        }
        return {
          select: () =>
            Promise.resolve({
              data: [],
              error: null,
            }),
        };
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const views = await fetchBeatViews(mockClientWithoutStorage as any, false);
    expect(views[0]?.audioUrl).toBe("/audio/tracks/1.m4a");
  });

  it("throws error when tracks fetch fails", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "tracks") {
          return {
            select: () =>
              createChainedOrderQuery({
                data: null,
                error: { message: "Tracks DB failure" },
              }),
          };
        }
        return {
          select: () => Promise.resolve({ data: [], error: null }),
        };
      },
      storage: {
        from: () => ({
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(fetchBeatViews(mockClient as any)).rejects.toThrow(
      "Failed to fetch tracks: Tracks DB failure",
    );
  });

  it("throws error when transitions fetch fails", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "tracks") {
          return {
            select: () =>
              createChainedOrderQuery({
                data: [],
                error: null,
              }),
          };
        }
        return {
          select: () =>
            Promise.resolve({
              data: null,
              error: { message: "Transitions DB failure" },
            }),
        };
      },
      storage: {
        from: () => ({
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(fetchBeatViews(mockClient as any)).rejects.toThrow(
      "Failed to fetch transitions: Transitions DB failure",
    );
  });
});

describe("fetchBeatViewById", () => {
  const trackRow: TrackRow = {
    id: "0001",
    name: "01",
    bpm: 85,
    duration_ms: 60000,
    loop_start_ms: 0,
    loop_end_ms: 60000,
    audio_path: "1.m4a",
  };
  const transitionRow: TransitionRow = {
    id: "t-1-2",
    from_track_id: "0001",
    to_track_id: "0002",
    audio_path: "t.m4a",
    timing: { handleMs: 1, crossfadeMs: 2, glueMs: 3, landMs: 4 },
  };

  interface Result {
    data: unknown;
    error: { message: string } | null;
  }

  /** Records every query call so tests can assert the exact filters. */
  function makeClient(trackResult: Result, transitionResult: Result) {
    const calls: unknown[][] = [];
    const client = {
      from: (table: string) => ({
        select: (columns: string) => ({
          or: (filter: string) => {
            calls.push([table, columns, "or", filter]);
            if (table === "tracks") {
              return { maybeSingle: () => Promise.resolve(trackResult) };
            }
            return Promise.resolve(transitionResult);
          },
        }),
      }),
    };
    return { client: client as unknown as SupabaseClient, calls };
  }

  it("filters both tables by the requested id", async () => {
    const { client, calls } = makeClient(
      { data: trackRow, error: null },
      { data: [transitionRow], error: null },
    );
    await fetchBeatViewById("0001", client, true);
    expect(calls[0]?.[0]).toBe("tracks");
    expect(calls[0]?.[2]).toBe("or");
    expect(calls[1]?.[0]).toBe("transitions");
    expect(calls[1]?.[2]).toBe("or");
  });

  it("returns the beat with its outgoing transitions", async () => {
    const { client } = makeClient(
      { data: trackRow, error: null },
      { data: [transitionRow], error: null },
    );
    const beat = await fetchBeatViewById("0001", client, true);
    expect(beat).toEqual({
      id: "0001",
      name: "01",
      index: 1,
      audioUrl: "/audio/1.m4a",
      durationMs: 60000,
      loopStartMs: 0,
      loopEndMs: 60000,
      bpm: 85,
      transitions: [
        {
          id: "t-1-2",
          targetTrackId: "0002",
          audioUrl: "/audio/t.m4a",
          timing: { handleMs: 1, crossfadeMs: 2, glueMs: 3, landMs: 4 },
        },
      ],
    });
  });

  it("returns null when the track does not exist", async () => {
    const { client } = makeClient(
      { data: null, error: null },
      { data: [], error: null },
    );
    expect(await fetchBeatViewById("missing", client, true)).toBeNull();
  });

  it("treats missing transition data as no transitions", async () => {
    const { client } = makeClient(
      { data: trackRow, error: null },
      { data: null, error: null },
    );
    const beat = await fetchBeatViewById("0001", client, true);
    expect(beat?.transitions).toEqual([]);
  });

  it("throws when the track query fails", async () => {
    const { client } = makeClient(
      { data: null, error: { message: "boom" } },
      { data: [], error: null },
    );
    await expect(fetchBeatViewById("0001", client, true)).rejects.toThrow(
      "Failed to fetch track: boom",
    );
  });

  it("throws when the transition query fails", async () => {
    const { client } = makeClient(
      { data: trackRow, error: null },
      { data: null, error: { message: "nope" } },
    );
    await expect(fetchBeatViewById("0001", client, true)).rejects.toThrow(
      "Failed to fetch transitions: nope",
    );
  });
});
