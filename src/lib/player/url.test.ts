import { describe, expect, it, vi } from "vitest";
import { formatBeatUrl, isBeatPage, syncBeatUrl } from "./url";

describe("isBeatPage", () => {
  it("identifies the root page as a beat page", () => {
    expect(isBeatPage("/")).toBe(true);
  });

  it("identifies /beat and /beat/:id paths as beat pages", () => {
    expect(isBeatPage("/beat")).toBe(true);
    expect(isBeatPage("/beat/track-a")).toBe(true);
    expect(isBeatPage("/beat/soul-rhodes/details")).toBe(true);
  });

  it("returns false for non-beat pages", () => {
    expect(isBeatPage("/about")).toBe(false);
    expect(isBeatPage("/terms-of-service")).toBe(false);
    expect(isBeatPage("/generate")).toBe(false);
    expect(isBeatPage("/settings")).toBe(false);
  });
});

describe("formatBeatUrl", () => {
  it("formats the beat route path with encoded id", () => {
    expect(formatBeatUrl("track-a")).toBe("/beat/track-a");
    expect(formatBeatUrl("track with spaces")).toBe(
      "/beat/track%20with%20spaces",
    );
  });
});

describe("syncBeatUrl", () => {
  it("calls pushState when on a beat page", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/", "track-b", mockHistory);

    expect(synced).toBe(true);
    expect(mockHistory.pushState).toHaveBeenCalledWith(
      { beatId: "track-b" },
      "",
      "/beat/track-b",
    );
  });

  it("does not call pushState when on an informational route", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/about", "track-b", mockHistory);

    expect(synced).toBe(false);
    expect(mockHistory.pushState).not.toHaveBeenCalled();
  });
});
