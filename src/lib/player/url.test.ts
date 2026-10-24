import { describe, expect, it, vi } from "vitest";
import { formatBeatUrl, isBeatPage, syncBeatUrl } from "./url";

describe("isBeatPage", () => {
  it("identifies the root page as a beat page", () => {
    expect(isBeatPage("/")).toBe(true);
  });

  it("identifies /beat, /beats and /beat/:id paths as beat pages", () => {
    expect(isBeatPage("/beat")).toBe(true);
    expect(isBeatPage("/beats")).toBe(true);
    expect(isBeatPage("/beat/0001")).toBe(true);
    expect(isBeatPage("/beat/track-a")).toBe(true);
  });

  it("returns false for non-beat pages", () => {
    expect(isBeatPage("/about")).toBe(false);
    expect(isBeatPage("/terms-of-service")).toBe(false);
    expect(isBeatPage("/privacy-policy")).toBe(false);
    expect(isBeatPage("/generate")).toBe(false);
  });
});

describe("formatBeatUrl", () => {
  it("formats integer and numeric strings as 4-digit zero-padded beat paths", () => {
    expect(formatBeatUrl(1)).toBe("/beat/0001");
    expect(formatBeatUrl("42")).toBe("/beat/0042");
    expect(formatBeatUrl(1500)).toBe("/beat/1500");
  });

  it("does not pad zero, negative, or non-integer numbers", () => {
    expect(formatBeatUrl(0)).toBe("/beat/0");
    expect(formatBeatUrl("0")).toBe("/beat/0");
    expect(formatBeatUrl(-5)).toBe("/beat/-5");
    expect(formatBeatUrl(1.5)).toBe("/beat/1.5");
    expect(formatBeatUrl("2.75")).toBe("/beat/2.75");
    expect(formatBeatUrl("")).toBe("/beat/");
  });

  it("formats string IDs directly", () => {
    expect(formatBeatUrl("track-a")).toBe("/beat/track-a");
    expect(formatBeatUrl("invalid-slug")).toBe("/beat/invalid-slug");
  });
});

describe("syncBeatUrl", () => {
  it("calls pushState when on a beat page", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/", "0002", mockHistory);

    expect(synced).toBe(true);
    expect(mockHistory.pushState).toHaveBeenCalledWith(
      { beatId: "0002" },
      "",
      "/beat/0002",
    );
  });

  it("uses window.history when available and no historyTarget is provided", () => {
    const mockPush = vi.fn();
    const originalWindow = globalThis.window;
    try {
      // @ts-expect-error test-only mock of window
      globalThis.window = { history: { pushState: mockPush } };
      const synced = syncBeatUrl("/beat/0001", "0002");
      expect(synced).toBe(true);
      expect(mockPush).toHaveBeenCalledWith(
        { beatId: "0002" },
        "",
        "/beat/0002",
      );
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("safely handles environments without window when no historyTarget is provided", () => {
    const originalWindow = globalThis.window;
    try {
      // @ts-expect-error test-only removal of window
      delete globalThis.window;
      const synced = syncBeatUrl("/beat/0001", "0002");
      expect(synced).toBe(true);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("does not call pushState when on an informational route", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/about", "0002", mockHistory);

    expect(synced).toBe(false);
    expect(mockHistory.pushState).not.toHaveBeenCalled();
  });
});
