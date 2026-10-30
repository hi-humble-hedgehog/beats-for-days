import { describe, expect, it, vi } from "vitest";
import {
  createAdminTrack,
  createTrackSchema,
  fetchAdminTracks,
  fetchAdminTrackTransitions,
  resolveAdminAudioUrl,
  updateAdminTrack,
  updateTrackSchema,
  uploadTrackAudio,
} from "./admin";

describe("admin lib", () => {
  describe("schemas", () => {
    it("validates createTrackSchema correctly", () => {
      const valid = createTrackSchema.safeParse({
        id: "track-01",
        name: "01",
        index: 1,
        bpm: 90,
        key: "C minor",
        genre: "Boom Bap",
        duration_ms: 60000,
        loop_start_ms: 1000,
        loop_end_ms: 50000,
      });
      expect(valid.success).toBe(true);

      const invalidId = createTrackSchema.safeParse({
        id: "invalid id with spaces!",
        name: "01",
        bpm: 90,
        key: "C minor",
        genre: "Boom Bap",
        duration_ms: 60000,
        loop_start_ms: 1000,
        loop_end_ms: 50000,
      });
      expect(invalidId.success).toBe(false);
    });

    it("validates updateTrackSchema correctly", () => {
      const valid = updateTrackSchema.safeParse({
        bpm: 95,
        is_active: false,
        name: "Updated",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("resolveAdminAudioUrl", () => {
    it("returns empty string when audioPath is missing", () => {
      const client = {} as never;
      expect(resolveAdminAudioUrl(client, undefined)).toBe("");
      expect(resolveAdminAudioUrl(client, "")).toBe("");
    });

    it("returns local audio url prefixed with /audio/ if not already starting with /", () => {
      const client = {} as never;
      expect(resolveAdminAudioUrl(client, "tracks/01.m4a", true)).toBe(
        "/audio/tracks/01.m4a",
      );
      expect(resolveAdminAudioUrl(client, "/tracks/01.m4a", true)).toBe(
        "/tracks/01.m4a",
      );
    });

    it("returns public url from storage when useLocalAudio is false", () => {
      const client = {
        storage: {
          from: vi.fn().mockReturnValue({
            getPublicUrl: vi.fn().mockReturnValue({
              data: { publicUrl: "https://supabase.co/audio/tracks/01.m4a" },
            }),
          }),
        },
      };
      expect(
        resolveAdminAudioUrl(client as never, "tracks/01.m4a", false),
      ).toBe("https://supabase.co/audio/tracks/01.m4a");
    });
  });

  it("fetchAdminTracks queries all tracks ordered by index and name", async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({
      data: [{ id: "track-1", name: "01", index: 1, is_active: true }],
      error: null,
    });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockClient = {
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    };

    const tracks = await fetchAdminTracks(mockClient as never);
    expect(tracks).toHaveLength(1);
    expect(mockClient.from).toHaveBeenCalledWith("tracks");
    expect(mockOrder1).toHaveBeenCalledWith("index", {
      ascending: true,
      nullsFirst: false,
    });
    expect(mockOrder2).toHaveBeenCalledWith("name");
  });

  it("fetchAdminTracks falls back to legacy columns if updated_at or index is missing", async () => {
    const mockOrderPrimary2 = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'column "updated_at" does not exist' },
    });
    const mockOrderPrimary1 = vi
      .fn()
      .mockReturnValue({ order: mockOrderPrimary2 });

    const mockOrderFallback = vi.fn().mockResolvedValue({
      data: [{ id: "track-legacy", name: "Legacy Track", is_active: true }],
      error: null,
    });

    const mockSelect = vi
      .fn()
      .mockReturnValueOnce({ order: mockOrderPrimary1 })
      .mockReturnValueOnce({ order: mockOrderFallback });

    const mockClient = {
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    };

    const tracks = await fetchAdminTracks(mockClient as never);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.id).toBe("track-legacy");
    expect(mockOrderFallback).toHaveBeenCalledWith("name");
  });

  it("fetchAdminTracks throws if query returns error", async () => {
    const mockOrder2 = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "DB Error" } });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ order: mockOrder1 }),
      }),
    };

    await expect(fetchAdminTracks(mockClient as never)).rejects.toThrow(
      "DB Error",
    );
  });

  it("updateAdminTrack updates track with valid patch", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "track-1", is_active: false },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    };

    const result = await updateAdminTrack(mockClient as never, "track-1", {
      is_active: false,
    });
    expect(result.is_active).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockEq).toHaveBeenCalledWith("id", "track-1");
  });

  it("updateAdminTrack recomputes loop_duration_ms and formats index name", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "track-1", name: "05", loop_duration_ms: 40000 },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockClient = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    };

    await updateAdminTrack(mockClient as never, "track-1", {
      index: 5,
      loop_start_ms: 10000,
      loop_end_ms: 50000,
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      index: 5,
      name: "05",
      loop_start_ms: 10000,
      loop_end_ms: 50000,
      loop_duration_ms: 40000,
    });
  });

  it("updateAdminTrack throws on update error", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Update failed" },
    });
    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: mockSingle }),
          }),
        }),
      }),
    };

    await expect(
      updateAdminTrack(mockClient as never, "track-1", { is_active: true }),
    ).rejects.toThrow("Failed to update track track-1: Update failed");
  });

  it("createAdminTrack formats name from index and throws on insert error", async () => {
    const newTrack = {
      id: "track-05",
      name: "",
      index: 5,
      bpm: 90,
      key: "C minor",
      genre: "Boom Bap",
      duration_ms: 60000,
      loop_start_ms: 10000,
      loop_end_ms: 50000,
      audio_path: "tracks/track-05.m4a",
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Duplicate key" },
        }),
      }),
    });
    const mockClient = {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    };

    await expect(
      createAdminTrack(mockClient as never, newTrack),
    ).rejects.toThrow("Failed to create track track-05: Duplicate key");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "05",
        loop_duration_ms: 40000,
      }),
    );
  });

  it("createAdminTrack inserts new track row", async () => {
    const newTrack = {
      id: "track-new",
      name: "New Track",
      bpm: 90,
      key: "C minor",
      genre: "Boom Bap",
      duration_ms: 60000,
      loop_start_ms: 5000,
      loop_end_ms: 55000,
      loop_duration_ms: 50000,
      audio_path: "tracks/track-new.m4a",
      is_active: true,
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: newTrack,
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockClient = {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    };

    const result = await createAdminTrack(mockClient as never, newTrack);
    expect(result.id).toBe("track-new");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "track-new",
        name: "New Track",
        is_active: true,
      }),
    );
  });

  it("uploadTrackAudio uploads buffer to storage bucket", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });
    const mockClient = {
      storage: { from: mockFrom },
    };

    const buffer = Buffer.from("test-audio");
    await uploadTrackAudio(mockClient as never, "tracks/test.m4a", buffer);

    expect(mockFrom).toHaveBeenCalledWith("audio");
    expect(mockUpload).toHaveBeenCalledWith("tracks/test.m4a", buffer, {
      contentType: "audio/mp4",
      upsert: true,
    });
  });

  it("uploadTrackAudio throws error on storage failure", async () => {
    const mockUpload = vi
      .fn()
      .mockResolvedValue({ error: { message: "Storage failed" } });
    const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });
    const mockClient = {
      storage: { from: mockFrom },
    };

    await expect(
      uploadTrackAudio(mockClient as never, "tracks/test.m4a", Buffer.from("")),
    ).rejects.toThrow("Storage failed");
  });

  describe("fetchAdminTrackTransitions", () => {
    it("fetches and partitions in/out transitions with labels and audio urls", async () => {
      const mockTransitions = [
        {
          id: "tr-1-9",
          from_track_id: "track-01",
          to_track_id: "track-09",
          audio_path: "transitions/track-01-to-track-09.m4a",
          timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
        },
        {
          id: "tr-3-1",
          from_track_id: "track-03",
          to_track_id: "track-01",
          audio_path: "transitions/track-03-to-track-01.m4a",
          timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
        },
      ];

      const mockTracks = [
        { id: "track-01", name: "01", index: 1 },
        { id: "track-03", name: "03", index: 3 },
        { id: "track-09", name: "09", index: 9 },
      ];

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === "transitions") {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({
                  data: mockTransitions,
                  error: null,
                }),
              }),
            };
          }
          if (table === "tracks") {
            return {
              select: vi.fn().mockResolvedValue({
                data: mockTracks,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      const result = await fetchAdminTrackTransitions(
        mockClient as never,
        "track-01",
      );

      expect(result.outTransitions).toHaveLength(1);
      expect(result.outTransitions[0]?.to_label).toBe("09");
      expect(result.outTransitions[0]?.audio_url).toBe(
        "/audio/transitions/track-01-to-track-09.m4a",
      );

      expect(result.inTransitions).toHaveLength(1);
      expect(result.inTransitions[0]?.from_label).toBe("03");
      expect(result.inTransitions[0]?.audio_url).toBe(
        "/audio/transitions/track-03-to-track-01.m4a",
      );
    });

    it("throws error if transitions query fails", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Transition query failed" },
            }),
          }),
        }),
      };

      await expect(
        fetchAdminTrackTransitions(mockClient as never, "track-01"),
      ).rejects.toThrow("Transition query failed");
    });
  });
});
