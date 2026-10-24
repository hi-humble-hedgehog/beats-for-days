import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/tracks", () => ({
  fetchBeatViews: vi.fn().mockResolvedValue([
    { id: "track-a", name: "A", audioUrl: "http://a.wav", transitions: [] },
    { id: "track-b", name: "B", audioUrl: "http://b.wav", transitions: [] },
    { id: "track-c", name: "C", audioUrl: "http://c.wav", transitions: [] },
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
});
