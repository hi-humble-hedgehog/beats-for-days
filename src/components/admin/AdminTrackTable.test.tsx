import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminTrackTable } from "./AdminTrackTable";
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
    created_at: "2026-10-25T10:00:00.000Z",
    updated_at: "2026-10-26T12:00:00.000Z",
  },
  {
    id: "track-2",
    name: "02",
    index: 2,
    bpm: 92,
    key: "F minor",
    genre: "Boom Bap",
    duration_ms: 65000,
    loop_start_ms: 8000,
    loop_end_ms: 60000,
    loop_duration_ms: 52000,
    audio_path: "tracks/track-2.m4a",
    is_active: false,
    created_at: "2026-10-24T10:00:00.000Z",
    updated_at: "2026-10-25T12:00:00.000Z",
  },
];

describe("AdminTrackTable", () => {
  it("renders track rows with track numbers, bpm, created_at, and updated_at", () => {
    render(
      <AdminTrackTable
        tracks={sampleTracks}
        onToggleActive={vi.fn()}
        onEdit={vi.fn()}
        onAudition={vi.fn()}
      />,
    );

    expect(screen.getByText("#01")).toBeDefined();
    expect(screen.getByText("#02")).toBeDefined();
    expect(screen.getByText("88 BPM")).toBeDefined();
    expect(screen.getByText("2026-10-25 10:00")).toBeDefined();
    expect(screen.getByText("2026-10-26 12:00")).toBeDefined();
  });

  it("calls onToggleActive when status switch is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <AdminTrackTable
        tracks={sampleTracks}
        onToggleActive={handleToggle}
        onEdit={vi.fn()}
        onAudition={vi.fn()}
      />,
    );

    const toggleBtn = screen.getByRole("switch", {
      name: "Toggle Track 01 active status",
    });
    fireEvent.click(toggleBtn);

    expect(handleToggle).toHaveBeenCalledWith("track-1", false);
  });

  it("calls onEdit when edit button is clicked", () => {
    const handleEdit = vi.fn();
    render(
      <AdminTrackTable
        tracks={sampleTracks}
        onToggleActive={vi.fn()}
        onEdit={handleEdit}
        onAudition={vi.fn()}
      />,
    );

    const editBtn = screen.getByRole("button", {
      name: "Edit Track 01",
    });
    fireEvent.click(editBtn);

    expect(handleEdit).toHaveBeenCalledWith(sampleTracks[0]);
  });

  it("calls onAudition when audition button is clicked", () => {
    const handleAudition = vi.fn();
    render(
      <AdminTrackTable
        tracks={sampleTracks}
        onToggleActive={vi.fn()}
        onEdit={vi.fn()}
        onAudition={handleAudition}
      />,
    );

    const auditionBtn = screen.getByRole("button", {
      name: "Audition Track 01",
    });
    fireEvent.click(auditionBtn);

    expect(handleAudition).toHaveBeenCalledWith(sampleTracks[0]);
  });

  it("re-sorts when clicking column header buttons", () => {
    render(
      <AdminTrackTable
        tracks={sampleTracks}
        onToggleActive={vi.fn()}
        onEdit={vi.fn()}
        onAudition={vi.fn()}
      />,
    );

    const bpmHeader = screen.getByRole("button", {
      name: /Sort by BPM \/ Key/,
    });
    fireEvent.click(bpmHeader);

    const rows = screen.getAllByRole("row");
    // First row is thead, second row should now be Track 01 (88 BPM), third Track 02 (92 BPM)
    expect(rows[1]?.textContent).toContain("#01");

    // Click again to sort descending
    fireEvent.click(bpmHeader);
    const descRows = screen.getAllByRole("row");
    expect(descRows[1]?.textContent).toContain("#02");
  });
});
