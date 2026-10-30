import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminEditModal } from "./AdminEditModal";
import type { AdminTrackRecord } from "@/lib/admin";

const sampleTrack: AdminTrackRecord = {
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
};

describe("AdminEditModal", () => {
  it("renders when track is provided and populates input values", () => {
    render(
      <AdminEditModal track={sampleTrack} onClose={vi.fn()} onSave={vi.fn()} />,
    );

    const indexInput = screen.getByLabelText(
      "Track # (Order Index)",
    ) as HTMLInputElement;
    expect(indexInput.value).toBe("1");
    const bpmInput = screen.getByLabelText("BPM") as HTMLInputElement;
    expect(bpmInput.value).toBe("88");
  });

  it("calls onSave with updated values upon submission", async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AdminEditModal
        track={sampleTrack}
        onClose={vi.fn()}
        onSave={handleSave}
      />,
    );

    const indexInput = screen.getByLabelText("Track # (Order Index)");
    fireEvent.change(indexInput, { target: { value: "5" } });

    const submitBtn = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith(
      "track-1",
      expect.objectContaining({
        index: 5,
        name: "05",
      }),
    );
  });

  it("calls onClose when cancel button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <AdminEditModal
        track={sampleTrack}
        onClose={handleClose}
        onSave={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
