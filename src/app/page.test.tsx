import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beatsApi } from "@/lib/api";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import { AppChrome } from "@/components/layout/AppChrome";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";
import type { AudioPlayerState } from "@/lib/types/audio";

const mockPush = vi.fn();
vi.mock("@/lib/api", () => ({
  beatsApi: {
    getNextBeat: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

const sampleBeat = {
  id: "0001",
  name: "Soul Rhodes",
  audioUrl: "http://storage/1.m4a",
  durationMs: 60000,
  loopStartMs: 10000,
  loopEndMs: 50000,
  bpm: 86,
  transitions: [],
};

function renderHome(value: Partial<AudioPlayerState>) {
  return render(
    <AudioPlayerContext.Provider
      value={{
        current: sampleBeat,
        isPlaying: false,
        secondsRemaining: 5,
        isLoading: false,
        error: null,
        togglePlay: vi.fn(),
        advanceTrack: vi.fn(),
        ...value,
      }}
    >
      <AppChrome>
        <Home />
      </AppChrome>
    </AudioPlayerContext.Provider>,
  );
}

describe("Home page", () => {
  it("renders the poster heading and starts playback from Play", () => {
    const mockTogglePlay = vi.fn();
    renderHome({ togglePlay: mockTogglePlay });

    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(mockTogglePlay).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/beat/0001");
  });

  it("calls play when provided in context upon clicking Play", () => {
    const mockPlay = vi.fn();
    renderHome({
      current: { ...sampleBeat, id: "0002", name: "Jazz Flute" },
      play: mockPlay,
    });

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/beat/0002");
  });

  it("resolves the next beat via beatsApi.getNextBeat when no beat is paused", async () => {
    const nextBeat = { ...sampleBeat, id: "0003", name: "Soul Trumpet" };
    vi.mocked(beatsApi.getNextBeat).mockResolvedValueOnce({
      beat: nextBeat,
      transition: null,
    });
    const mockPlay = vi.fn();
    const mockCommitBeat = vi.fn();
    renderHome({
      current: null,
      hasPausedBeat: false,
      playedHistory: ["0001", "0002"],
      play: mockPlay,
      commitBeat: mockCommitBeat,
    });

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => {
      expect(beatsApi.getNextBeat).toHaveBeenCalledWith({
        currentTrackId: "0002",
        playedTrackIds: ["0001", "0002"],
        mode: "skip",
      });
      expect(mockCommitBeat).toHaveBeenCalledWith(nextBeat);
      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/beat/0003");
    });
  });
});
