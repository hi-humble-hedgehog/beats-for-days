import { describe, expect, it, vi } from "vitest";
import * as graph from "@/lib/player/graph";
import { GET, POST } from "./route";

const spyResolveNextBeat = vi.spyOn(graph, "resolveNextBeat");

const { defaultTiming } = vi.hoisted(() => ({
  defaultTiming: {
    handleMs: 250,
    crossfadeMs: 100,
    glueMs: 7000,
    landMs: 0,
  },
}));

vi.mock("@/lib/tracks", () => ({
  fetchBeatViews: vi.fn().mockResolvedValue([
    {
      id: "track-a",
      name: "Track A",
      audioUrl: "http://a.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [
        {
          id: "tr-a-b",
          targetTrackId: "track-b",
          audioUrl: "http://tr-ab.m4a",
          timing: defaultTiming,
        },
      ],
    },
    {
      id: "track-b",
      name: "Track B",
      audioUrl: "http://b.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [],
    },
    {
      id: "track-c",
      name: "Track C",
      audioUrl: "http://c.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 86,
      transitions: [],
    },
  ]),
}));

describe("POST /api/beats/next", () => {
  it("resolves the next track and transition in auto mode", async () => {
    const request = new Request("http://localhost/api/beats/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentTrackId: "track-a",
        playedTrackIds: ["track-a"],
        mode: "auto",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.beat.id).toBe("track-b");
    expect(data.transition).toEqual({
      id: "tr-a-b",
      targetTrackId: "track-b",
      audioUrl: "http://tr-ab.m4a",
      timing: defaultTiming,
    });
  });

  it("resolves an unheard track with no transition in skip mode", async () => {
    const request = new Request("http://localhost/api/beats/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentTrackId: "track-a",
        playedTrackIds: ["track-a"],
        mode: "skip",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Skips randomly pick among unheard candidates ("track-b" or "track-c")
    expect(["track-b", "track-c"]).toContain(data.beat.id);
    expect(data.transition).toBeNull();
  });

  it("handles initial request with empty body or cold start", async () => {
    const request = new Request("http://localhost/api/beats/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(["track-a", "track-b", "track-c"]).toContain(data.beat.id);
    expect(data.transition).toBeNull();
    expect(spyResolveNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        playedTrackIds: [],
        mode: "auto",
      }),
    );
  });
});

describe("GET /api/beats/next", () => {
  it("returns initial beat on cold start", async () => {
    const request = new Request("http://localhost/api/beats/next");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(["track-a", "track-b", "track-c"]).toContain(data.beat.id);
    expect(data.transition).toBeNull();
    expect(spyResolveNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        playedTrackIds: [],
        mode: "skip",
      }),
    );
  });

  it("handles malformed JSON body gracefully", async () => {
    const request = new Request("http://localhost/api/beats/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(["track-a", "track-b", "track-c"]).toContain(data.beat.id);
  });

  it("returns 404 when no tracks exist", async () => {
    const { fetchBeatViews } = await import("@/lib/tracks");
    vi.mocked(fetchBeatViews).mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/beats/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("No beats available");
  });

  it("GET returns 404 when no tracks exist", async () => {
    const { fetchBeatViews } = await import("@/lib/tracks");
    vi.mocked(fetchBeatViews).mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("No beats available");
  });
});
