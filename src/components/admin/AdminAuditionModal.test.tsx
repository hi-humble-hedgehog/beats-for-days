import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminTrackRecord } from "@/lib/admin";
import { AdminAuditionModal } from "./AdminAuditionModal";

describe("AdminAuditionModal", () => {
  const sampleTrack: AdminTrackRecord = {
    id: "track-01",
    name: "01",
    index: 1,
    bpm: 92,
    key: "C minor",
    genre: "Boom Bap",
    duration_ms: 60000,
    loop_start_ms: 5000,
    loop_end_ms: 55000,
    loop_duration_ms: 50000,
    audio_path: "tracks/track-01.m4a",
    audio_url: "/audio/tracks/track-01.m4a",
    is_active: true,
  };

  const mockTransitions = {
    outTransitions: [
      {
        id: "tr-1-9",
        from_track_id: "track-01",
        to_track_id: "track-09",
        from_label: "01",
        to_label: "09",
        audio_path: "transitions/track-01-to-track-09.m4a",
        audio_url: "/audio/transitions/track-01-to-track-09.m4a",
        timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
      },
    ],
    inTransitions: [
      {
        id: "tr-3-1",
        from_track_id: "track-03",
        to_track_id: "track-01",
        from_label: "03",
        to_label: "01",
        audio_path: "transitions/track-03-to-track-01.m4a",
        audio_url: "/audio/transitions/track-03-to-track-01.m4a",
        timing: { handleMs: 250, crossfadeMs: 100, glueMs: 7200, landMs: 0 },
      },
    ],
  };

  let mockAudio: {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    src: string;
    currentTime: number;
    duration: number;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      src: "",
      currentTime: 0,
      duration: 60,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal(
      "Audio",
      vi.fn(function MockAudio() {
        return mockAudio;
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTransitions),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders beat title and metadata", () => {
    render(<AdminAuditionModal track={sampleTrack} onClose={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: /Audition Beat: #01/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/92 BPM/)).toBeInTheDocument();
    expect(screen.getAllByText(/C minor/)[0]).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<AdminAuditionModal track={sampleTrack} onClose={onClose} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Close audition dialog" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<AdminAuditionModal track={sampleTrack} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles play/pause for the beat", () => {
    render(<AdminAuditionModal track={sampleTrack} onClose={vi.fn()} />);
    const playBtn = screen.getByRole("button", { name: "Play beat" });
    fireEvent.click(playBtn);
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("renders transitions after fetch resolves", async () => {
    render(<AdminAuditionModal track={sampleTrack} onClose={vi.fn()} />);
    expect(await screen.findByText("-> #09")).toBeInTheDocument();
    expect(screen.getByText("#03 ->")).toBeInTheDocument();
  });
});
