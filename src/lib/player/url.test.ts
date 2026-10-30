import { describe, expect, it, vi } from "vitest";
import {
  extractBeatIdFromPathname,
  formatBeatUrl,
  isBeatPage,
  syncBeatUrl,
} from "./url";

describe("isBeatPage", () => {
  it("returns false for the root landing page", () => {
    expect(isBeatPage("/")).toBe(false);
  });

  it("identifies /beat, /beats and /beat/:id paths as beat pages", () => {
    expect(isBeatPage("/beat")).toBe(true);
    expect(isBeatPage("/beats")).toBe(true);
    expect(isBeatPage("/beat/0001")).toBe(true);
    expect(isBeatPage("/beat/track-a")).toBe(true);
  });

  it("returns false for non-beat pages", () => {
    expect(isBeatPage("/about")).toBe(false);
    expect(isBeatPage("/privacy")).toBe(false);
    expect(isBeatPage("/generate")).toBe(false);
  });
});

describe("formatBeatUrl", () => {
  it("formats integers, numeric strings, and track prefixes as 2-digit zero-padded beat paths", () => {
    expect(formatBeatUrl(1)).toBe("/beat/01");
    expect(formatBeatUrl("1")).toBe("/beat/01");
    expect(formatBeatUrl("track-01")).toBe("/beat/01");
    expect(formatBeatUrl("track-1")).toBe("/beat/01");
    expect(formatBeatUrl("42")).toBe("/beat/42");
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
    const mockHistory = { pushState: vi.fn(), replaceState: vi.fn() };
    const synced = syncBeatUrl("/beat/01", "02", mockHistory);

    expect(synced).toBe(true);
    expect(mockHistory.pushState).toHaveBeenCalledWith(
      { beatId: "02" },
      "",
      "/beat/02",
    );
    expect(mockHistory.replaceState).not.toHaveBeenCalled();
  });

  it("calls replaceState instead of pushState when replace is true", () => {
    const mockHistory = { pushState: vi.fn(), replaceState: vi.fn() };
    const synced = syncBeatUrl("/beat/02", "01", mockHistory, true);

    expect(synced).toBe(true);
    expect(mockHistory.replaceState).toHaveBeenCalledWith(
      { beatId: "01" },
      "",
      "/beat/01",
    );
    expect(mockHistory.pushState).not.toHaveBeenCalled();
  });

  it("falls back to pushState when replace is true but historyTarget lacks replaceState", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/beat/02", "01", mockHistory, true);

    expect(synced).toBe(true);
    expect(mockHistory.pushState).toHaveBeenCalledWith(
      { beatId: "01" },
      "",
      "/beat/01",
    );
  });

  it("uses window.history when available and no historyTarget is provided", () => {
    const mockPush = vi.fn();
    const originalWindow = globalThis.window;
    try {
      // @ts-expect-error test-only mock of window
      globalThis.window = { history: { pushState: mockPush } };
      const synced = syncBeatUrl("/beat/01", "02");
      expect(synced).toBe(true);
      expect(mockPush).toHaveBeenCalledWith({ beatId: "02" }, "", "/beat/02");
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("safely handles environments without window when no historyTarget is provided", () => {
    const originalWindow = globalThis.window;
    try {
      // @ts-expect-error test-only removal of window
      delete globalThis.window;
      const synced = syncBeatUrl("/beat/01", "02");
      expect(synced).toBe(true);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("does not call pushState when on an informational route", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/about", "02", mockHistory);

    expect(synced).toBe(false);
    expect(mockHistory.pushState).not.toHaveBeenCalled();
  });

  it("does not call pushState when already on the target beat URL", () => {
    const mockHistory = { pushState: vi.fn() };
    const synced = syncBeatUrl("/beat/02", "02", mockHistory);

    expect(synced).toBe(false);
    expect(mockHistory.pushState).not.toHaveBeenCalled();
  });

  it("does not call pushState when window.location.pathname already matches target URL", () => {
    const mockPush = vi.fn();
    const originalWindow = globalThis.window;
    try {
      globalThis.window = {
        history: { pushState: mockPush },
        location: { pathname: "/beat/02" },
      } as unknown as Window & typeof globalThis;
      const synced = syncBeatUrl("/beat/01", "02");
      expect(synced).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

describe("extractBeatIdFromPathname", () => {
  it("extracts the beat ID from /beat/:id paths", () => {
    expect(extractBeatIdFromPathname("/beat/0001")).toBe("0001");
    expect(extractBeatIdFromPathname("/beat/42")).toBe("42");
    expect(extractBeatIdFromPathname("/beat/track-a")).toBe("track-a");
  });

  it("handles URL-encoded characters in beat IDs", () => {
    expect(extractBeatIdFromPathname("/beat/track%201")).toBe("track 1");
  });

  it("ignores query parameters and hash fragments", () => {
    expect(extractBeatIdFromPathname("/beat/0001?autoplay=true")).toBe("0001");
    expect(extractBeatIdFromPathname("/beat/0001#lyrics")).toBe("0001");
  });

  it("returns null for non-beat or non-specific paths", () => {
    expect(extractBeatIdFromPathname("/")).toBeNull();
    expect(extractBeatIdFromPathname("/beats")).toBeNull();
    expect(extractBeatIdFromPathname("/beat")).toBeNull();
    expect(extractBeatIdFromPathname("/beat/")).toBeNull();
    expect(extractBeatIdFromPathname("/about")).toBeNull();
    expect(extractBeatIdFromPathname("/other/beat/0001")).toBeNull();
  });
});
