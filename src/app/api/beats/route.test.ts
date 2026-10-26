import { describe, expect, it, vi } from "vitest";
import { fetchBeatViews } from "@/lib/tracks";
import { GET } from "./route";

vi.mock("@/lib/tracks", () => ({
  fetchBeatViewById: vi.fn((id: string) => {
    if (id === "track-a") {
      return Promise.resolve({
        id: "track-a",
        name: "A",
        audioUrl: "http://a.m4a",
        durationMs: 60000,
        loopStartMs: 10000,
        loopEndMs: 50000,
        bpm: 86,
        transitions: [],
      });
    }
    return Promise.resolve(null);
  }),
  fetchBeatViews: vi.fn(),
}));

describe("GET /api/beats", () => {
  it("rejects requests without an id and never loads the catalog", async () => {
    const response = await GET(new Request("http://localhost/api/beats"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing beat id");
    expect(vi.mocked(fetchBeatViews)).not.toHaveBeenCalled();
  });

  it("returns single beat when id parameter is provided and exists", async () => {
    const request = new Request("http://localhost/api/beats?id=track-a");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.beat.id).toBe("track-a");
  });

  it("returns 404 when id parameter is provided but beat is not found", async () => {
    const request = new Request("http://localhost/api/beats?id=non-existent");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Beat not found");
  });
});
