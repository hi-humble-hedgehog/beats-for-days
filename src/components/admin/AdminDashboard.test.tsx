import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AdminDashboard } from "./AdminDashboard";
import type { AdminTrackRecord } from "@/lib/admin";

const sampleTracks: AdminTrackRecord[] = [
  {
    id: "track-1",
    name: "01",
    index: 1,
    bpm: 88,
    key: "C minor",
    genre: "Boom Bap",
    duration_ms: 60000,
    loop_start_ms: 5000,
    loop_end_ms: 55000,
    loop_duration_ms: 50000,
    audio_path: "tracks/track-1.m4a",
    is_active: true,
  },
];

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi
        .fn()
        .mockResolvedValue({ outTransitions: [], inTransitions: [] }),
    });
  });

  it("renders page header and initial tracks", () => {
    render(<AdminDashboard initialTracks={sampleTracks} />);

    expect(screen.getByText("CATALOG MANAGEMENT")).toBeDefined();
    expect(screen.getByText("#01")).toBeDefined();
    expect(screen.getByText("Return to Player ✕")).toBeDefined();
  });

  it("toggles active state via PATCH request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        track: { ...sampleTracks[0], is_active: false },
      }),
    });

    render(<AdminDashboard initialTracks={sampleTracks} />);

    const toggleBtn = screen.getByRole("switch", {
      name: "Toggle Track 01 active status",
    });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/tracks/track-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("opens audition modal when clicking audition button", () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi
        .fn()
        .mockResolvedValue({ outTransitions: [], inTransitions: [] }),
    });

    render(<AdminDashboard initialTracks={sampleTracks} />);

    const auditionBtn = screen.getByRole("button", {
      name: "Audition Track 01",
    });
    fireEvent.click(auditionBtn);

    expect(
      screen.getByRole("dialog", { name: /Audition Beat: #01/i }),
    ).toBeDefined();
  });
});
