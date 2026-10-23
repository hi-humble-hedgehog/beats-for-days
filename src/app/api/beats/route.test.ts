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
  it("returns shuffled beats with orderHash and cycle", async () => {
    const request = new Request(
      "http://localhost/api/beats?order_hash=test_seed&cycle=1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orderHash).toBe("test_seed");
    expect(data.cycle).toBe(1);
    expect(data.beats).toHaveLength(3);
    expect(data.total).toBe(3);
  });

  it("generates an orderHash if not provided in the query", async () => {
    const request = new Request("http://localhost/api/beats");
    const response = await GET(request);
    const data = await response.json();

    expect(data.orderHash).toBeDefined();
    expect(typeof data.orderHash).toBe("string");
    expect(data.cycle).toBe(1);
  });

  it("pins starting_beat to index 0 if specified", async () => {
    const request = new Request(
      "http://localhost/api/beats?order_hash=test_seed&cycle=1&starting_beat=track-b",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.beats[0]?.id).toBe("track-b");
  });

  it("respects limit parameter", async () => {
    const request = new Request(
      "http://localhost/api/beats?order_hash=test_seed&limit=2",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.beats).toHaveLength(2);
    expect(data.total).toBe(3);
  });
});
