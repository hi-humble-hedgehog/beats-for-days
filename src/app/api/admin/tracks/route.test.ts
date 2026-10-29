import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchAdminTracks = vi.fn();
const mockCreateAdminTrack = vi.fn();
const mockUploadTrackAudio = vi.fn();

vi.mock("@/lib/admin", () => ({
  fetchAdminTracks: (...args: unknown[]) => mockFetchAdminTracks(...args),
  createAdminTrack: (...args: unknown[]) => mockCreateAdminTrack(...args),
  uploadTrackAudio: (...args: unknown[]) => mockUploadTrackAudio(...args),
  createTrackSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminClient: vi.fn(() => ({})),
}));

describe("GET /api/admin/tracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns track list in development", async () => {
    mockFetchAdminTracks.mockResolvedValueOnce([
      { id: "track-1", name: "Track 1", is_active: true },
    ]);
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tracks).toHaveLength(1);
    expect(body.tracks[0].id).toBe("track-1");
  });
});

describe("POST /api/admin/tracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/admin/tracks", {
      method: "POST",
    });
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("uploads audio and creates track record", async () => {
    mockCreateAdminTrack.mockResolvedValueOnce({
      id: "track-37",
      name: "Track 37",
      audio_path: "tracks/track-37.m4a",
      is_active: true,
    });

    const formData = new FormData();
    const file = new File(["audio-bytes"], "track-37.m4a", {
      type: "audio/mp4",
    });
    formData.append("audio", file);
    formData.append("id", "track-37");
    formData.append("name", "Track 37");
    formData.append("bpm", "90");
    formData.append("key", "C minor");
    formData.append("genre", "Boom Bap");
    formData.append("duration_ms", "60000");
    formData.append("loop_start_ms", "5000");
    formData.append("loop_end_ms", "55000");

    const req = new Request("http://localhost/api/admin/tracks", {
      method: "POST",
      body: formData,
    });

    const { POST } = await import("./route");
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(mockUploadTrackAudio).toHaveBeenCalled();
    expect(mockCreateAdminTrack).toHaveBeenCalled();
  });
});
