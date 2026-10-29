import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AdminUploadForm } from "./AdminUploadForm";

describe("AdminUploadForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders upload form fields", () => {
    render(<AdminUploadForm onTrackCreated={vi.fn()} />);

    expect(screen.getByLabelText("Audio File (.m4a)")).toBeDefined();
    expect(screen.getByLabelText("Track ID")).toBeDefined();
    expect(screen.getByLabelText("Track Name")).toBeDefined();
    expect(screen.getByLabelText("BPM")).toBeDefined();
  });

  it("submits form data to /api/admin/tracks", async () => {
    const handleCreated = vi.fn();
    const mockTrack = { id: "track-37", name: "New Beat", is_active: true };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ track: mockTrack }),
    });

    render(<AdminUploadForm onTrackCreated={handleCreated} />);

    const file = new File(["dummy-audio"], "track-37.m4a", {
      type: "audio/mp4",
    });
    const fileInput = screen.getByLabelText("Audio File (.m4a)");
    fireEvent.change(fileInput, { target: { files: [file] } });

    const nameInput = screen.getByLabelText("Track Name");
    fireEvent.change(nameInput, { target: { value: "New Beat" } });

    const submitBtn = screen.getByRole("button", {
      name: "Upload & Register Beat",
    });
    const form = submitBtn.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/tracks",
        expect.anything(),
      );
      expect(handleCreated).toHaveBeenCalledWith(mockTrack);
    });
  });
});
