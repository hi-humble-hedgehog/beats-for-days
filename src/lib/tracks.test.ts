import { describe, expect, it } from "vitest";
import {
  buildBeatViews,
  fetchBeatViews,
  type TrackRow,
  type TransitionRow,
} from "./tracks";

describe("buildBeatViews", () => {
  const dummyResolver = (path: string) => `http://storage.local/${path}`;

  const sampleTracks: TrackRow[] = [
    { id: "track-a", name: "Soul Rhodes & Piano", audio_path: "tracks/a.wav" },
    {
      id: "track-b",
      name: "Jazz Flute & Vibraphone",
      audio_path: "tracks/b.wav",
    },
  ];

  const sampleTransitions: TransitionRow[] = [
    {
      id: "t-a-b",
      from_track_id: "track-a",
      to_track_id: "track-b",
      audio_path: "transitions/a-to-b.wav",
    },
    {
      id: "t-b-a",
      from_track_id: "track-b",
      to_track_id: "track-a",
      audio_path: "transitions/b-to-a.wav",
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
      audioUrl: "http://storage.local/tracks/a.wav",
      transitions: [
        {
          id: "t-a-b",
          targetTrackName: "Jazz Flute & Vibraphone",
          audioUrl: "http://storage.local/transitions/a-to-b.wav",
        },
      ],
    });

    expect(views[1]).toEqual({
      id: "track-b",
      name: "Jazz Flute & Vibraphone",
      audioUrl: "http://storage.local/tracks/b.wav",
      transitions: [
        {
          id: "t-b-a",
          targetTrackName: "Soul Rhodes & Piano",
          audioUrl: "http://storage.local/transitions/b-to-a.wav",
        },
      ],
    });
  });

  it("handles tracks with no transitions gracefully", () => {
    const views = buildBeatViews(sampleTracks, [], dummyResolver);
    expect(views[0]?.transitions).toEqual([]);
    expect(views[1]?.transitions).toEqual([]);
  });

  it("falls back to target ID if target track name is not found", () => {
    const orphanTransition: TransitionRow = {
      id: "t-a-x",
      from_track_id: "track-a",
      to_track_id: "track-x",
      audio_path: "transitions/a-to-x.wav",
    };

    const views = buildBeatViews(
      sampleTracks,
      [orphanTransition],
      dummyResolver,
    );
    expect(views[0]?.transitions[0]?.targetTrackName).toBe("track-x");
  });
});

describe("fetchBeatViews", () => {
  it("fetches tracks and transitions using the provided supabase client", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "tracks") {
          return {
            select: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "track-1",
                      name: "Track One",
                      audio_path: "tracks/1.wav",
                    },
                  ],
                  error: null,
                }),
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
                  audio_path: "transitions/1-2.wav",
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const views = await fetchBeatViews(mockClient as any);
    expect(views).toEqual([
      {
        id: "track-1",
        name: "Track One",
        audioUrl: "https://test.supabase.co/audio/tracks/1.wav",
        transitions: [
          {
            id: "t-1-2",
            targetTrackName: "track-2",
            audioUrl: "https://test.supabase.co/audio/transitions/1-2.wav",
          },
        ],
      },
    ]);
  });

  it("throws error when tracks fetch fails", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "tracks") {
          return {
            select: () => ({
              order: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "Tracks DB failure" },
                }),
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
            select: () => ({
              order: () =>
                Promise.resolve({
                  data: [],
                  error: null,
                }),
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
