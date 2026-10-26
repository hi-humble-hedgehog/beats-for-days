import { describe, expect, it, vi } from "vitest";
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
  fetchBeatViews: vi.fn().mockResolvedValue([
    {
      id: "track-a",
      name: "A",
      audioUrl: "http://a.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [],
    },
    {
      id: "track-b",
      name: "B",
      audioUrl: "http://b.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [],
    },
    {
      id: "track-c",
      name: "C",
      audioUrl: "http://c.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [],
    },
  ]),
}));

describe("GET /api/beats", () => {
  it("returns all beats and total count", async () => {
    const request = new Request("http://localhost/api/beats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.beats).toHaveLength(3);
    expect(data.total).toBe(3);
  });

  it("respects limit parameter", async () => {
    const request = new Request("http://localhost/api/beats?limit=2");
    const response = await GET(request);
    const data = await response.json();

    expect(data.beats).toHaveLength(2);
    expect(data.total).toBe(3);
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
