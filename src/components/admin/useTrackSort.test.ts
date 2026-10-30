// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { AdminTrackRecord } from "@/lib/admin";
import {
  formatAdminDate,
  formatAdminTrackLabel,
  sortTracks,
  useTrackSort,
} from "./useTrackSort";

const mockTracks: AdminTrackRecord[] = [
  {
    id: "track-b",
    name: "02",
    index: 2,
    bpm: 95,
    key: "A minor",
    genre: "Soul",
    duration_ms: 60000,
    loop_start_ms: 0,
    loop_end_ms: 60000,
    loop_duration_ms: 60000,
    audio_path: "tracks/track-b.m4a",
    is_active: false,
    created_at: "2026-10-25T10:00:00.000Z",
    updated_at: "2026-10-27T12:00:00.000Z",
  },
  {
    id: "track-a",
    name: "01",
    index: 1,
    bpm: 85,
    key: "C minor",
    genre: "Boom Bap",
    duration_ms: 40000,
    loop_start_ms: 0,
    loop_end_ms: 30000,
    loop_duration_ms: 30000,
    audio_path: "tracks/track-a.m4a",
    is_active: true,
    created_at: "2026-10-26T10:00:00.000Z",
    updated_at: "2026-10-26T10:00:00.000Z",
  },
];

describe("formatAdminTrackLabel", () => {
  it("formats 2-digit label from index or fallback", () => {
    expect(
      formatAdminTrackLabel({ id: "track-01", name: "01", index: 1 }),
    ).toBe("01");
    expect(
      formatAdminTrackLabel({ id: "track-09", name: "09", index: 9 }),
    ).toBe("09");
    expect(
      formatAdminTrackLabel({ id: "track-12", name: "12", index: 12 }),
    ).toBe("12");
    expect(formatAdminTrackLabel({ id: "track-03", name: "track-03" })).toBe(
      "03",
    );
  });
});

describe("formatAdminDate", () => {
  it("formats ISO string into YYYY-MM-DD HH:mm", () => {
    expect(formatAdminDate("2026-10-28T14:30:00.000Z")).toBe(
      "2026-10-28 14:30",
    );
  });

  it("returns an em-dash for undefined or invalid date strings", () => {
    expect(formatAdminDate(undefined)).toBe("—");
    expect(formatAdminDate("not-a-date")).toBe("—");
  });
});

describe("sortTracks", () => {
  it("sorts by name ascending and descending", () => {
    const asc = sortTracks(mockTracks, "name", "asc");
    expect(asc[0]?.id).toBe("track-a");

    const desc = sortTracks(mockTracks, "name", "desc");
    expect(desc[0]?.id).toBe("track-b");
  });

  it("sorts by status (active first on asc, inactive first on desc)", () => {
    const asc = sortTracks(mockTracks, "status", "asc");
    expect(asc[0]?.is_active).toBe(true);

    const desc = sortTracks(mockTracks, "status", "desc");
    expect(desc[0]?.is_active).toBe(false);
  });

  it("sorts by bpm", () => {
    const asc = sortTracks(mockTracks, "bpm", "asc");
    expect(asc[0]?.bpm).toBe(85);

    const desc = sortTracks(mockTracks, "bpm", "desc");
    expect(desc[0]?.bpm).toBe(95);
  });

  it("sorts by loop duration", () => {
    const asc = sortTracks(mockTracks, "loop", "asc");
    expect(asc[0]?.loop_duration_ms).toBe(30000);

    const desc = sortTracks(mockTracks, "loop", "desc");
    expect(desc[0]?.loop_duration_ms).toBe(60000);
  });

  it("sorts by track number ascending and descending", () => {
    const asc = sortTracks(mockTracks, "track", "asc");
    expect(asc[0]?.id).toBe("track-a"); // index 1

    const desc = sortTracks(mockTracks, "track", "desc");
    expect(desc[0]?.id).toBe("track-b"); // index 2
  });

  it("sorts by created_at", () => {
    const asc = sortTracks(mockTracks, "created_at", "asc");
    expect(asc[0]?.id).toBe("track-b"); // 2026-10-25

    const desc = sortTracks(mockTracks, "created_at", "desc");
    expect(desc[0]?.id).toBe("track-a"); // 2026-10-26
  });

  it("sorts by updated_at", () => {
    const asc = sortTracks(mockTracks, "updated_at", "asc");
    expect(asc[0]?.id).toBe("track-a"); // 2026-10-26

    const desc = sortTracks(mockTracks, "updated_at", "desc");
    expect(desc[0]?.id).toBe("track-b"); // 2026-10-27
  });
});

describe("useTrackSort", () => {
  it("defaults to sorting by track ascending", () => {
    const { result } = renderHook(() => useTrackSort(mockTracks));
    expect(result.current.sortField).toBe("track");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.sortedTracks[0]?.id).toBe("track-a");
  });

  it("toggles direction when sorting the same field", () => {
    const { result } = renderHook(() => useTrackSort(mockTracks));
    act(() => {
      result.current.handleSort("track");
    });
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.sortedTracks[0]?.id).toBe("track-b");
  });

  it("resets to ascending when switching fields", () => {
    const { result } = renderHook(() => useTrackSort(mockTracks));
    act(() => {
      result.current.handleSort("track"); // desc
    });
    expect(result.current.sortDirection).toBe("desc");

    act(() => {
      result.current.handleSort("bpm");
    });
    expect(result.current.sortField).toBe("bpm");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.sortedTracks[0]?.bpm).toBe(85);
  });
});
