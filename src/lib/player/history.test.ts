import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
import { loadPlayedHistory, savePlayedHistory } from "./history";

describe("history storage helpers in node environment (no window)", () => {
  it("loadPlayedHistory returns empty array when window is undefined", () => {
    expect(loadPlayedHistory()).toEqual([]);
  });

  it("savePlayedHistory does not throw when window is undefined", () => {
    expect(() => savePlayedHistory(["0001"])).not.toThrow();
  });
});

describe("history storage helpers with window.localStorage", () => {
  let mockStore: Record<string, string> = {};
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStore = {};
    const mockStorage: Storage = {
      length: 0,
      clear: () => {
        mockStore = {};
      },
      getItem: (key: string) => mockStore[key] ?? null,
      key: () => null,
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
    };
    globalThis.window = {
      localStorage: mockStorage,
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("loadPlayedHistory returns empty array when storage is empty", () => {
    expect(loadPlayedHistory()).toEqual([]);
  });

  it("savePlayedHistory stores track IDs in localStorage and loadPlayedHistory retrieves them", () => {
    savePlayedHistory(["0001", "0002"]);
    expect(loadPlayedHistory()).toEqual(["0001", "0002"]);
  });

  it("loadPlayedHistory handles corrupted JSON gracefully", () => {
    mockStore[STORAGE_KEYS.PLAYED_TRACKS] = "{invalid-json";
    expect(loadPlayedHistory()).toEqual([]);
  });
});
