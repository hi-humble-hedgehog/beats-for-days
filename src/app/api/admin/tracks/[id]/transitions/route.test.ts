import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchAdminTrackTransitions = vi.fn();

vi.mock("@/lib/admin", () => ({
  fetchAdminTrackTransitions: (...args: unknown[]) =>
    mockFetchAdminTrackTransitions(...args),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminClient: vi.fn(() => ({})),
}));

describe("GET /api/admin/tracks/[id]/transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");
    const req = new Request(
      "http://localhost/api/admin/tracks/t-1/transitions",
    );
    const response = await GET(req, {
      params: Promise.resolve({ id: "t-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns in and out transitions for the specified track", async () => {
    const mockTransitions = {
      outTransitions: [
        {
          id: "tr-1-9",
          from_track_id: "track-01",
          to_track_id: "track-09",
          from_label: "01",
          to_label: "09",
          audio_path: "transitions/track-01-to-track-09.m4a",
          audio_url: "/audio/transitions/track-01-to-track-09.m4a",
          timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
        },
      ],
      inTransitions: [],
    };
    mockFetchAdminTrackTransitions.mockResolvedValueOnce(mockTransitions);

    const { GET } = await import("./route");
    const req = new Request(
      "http://localhost/api/admin/tracks/track-01/transitions",
    );
    const response = await GET(req, {
      params: Promise.resolve({ id: "track-01" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.outTransitions).toHaveLength(1);
    expect(body.outTransitions[0].to_label).toBe("09");
  });

  it("returns 400 when query fails", async () => {
    mockFetchAdminTrackTransitions.mockRejectedValueOnce(
      new Error("Query failed"),
    );

    const { GET } = await import("./route");
    const req = new Request(
      "http://localhost/api/admin/tracks/track-01/transitions",
    );
    const response = await GET(req, {
      params: Promise.resolve({ id: "track-01" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Query failed");
  });
});
