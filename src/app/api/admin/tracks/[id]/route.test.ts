import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateAdminTrack = vi.fn();

vi.mock("@/lib/admin", () => ({
  updateAdminTrack: (...args: unknown[]) => mockUpdateAdminTrack(...args),
  updateTrackSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminClient: vi.fn(() => ({})),
}));

describe("PATCH /api/admin/tracks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/admin/tracks/t-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "t-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("updates track metadata successfully", async () => {
    mockUpdateAdminTrack.mockResolvedValueOnce({
      id: "t-1",
      name: "Updated",
      is_active: false,
    });
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/admin/tracks/t-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "t-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.track.is_active).toBe(false);
  });
});
