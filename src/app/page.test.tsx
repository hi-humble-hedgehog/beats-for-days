import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beatsApi } from "@/lib/api";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";

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

describe("Home page", () => {
  it("renders the main heading and play button", () => {
    const mockTogglePlay = vi.fn();

    render(
      <AudioPlayerContext.Provider
        value={{
          current: {
            id: "0001",
            name: "Soul Rhodes",
            audioUrl: "http://storage/1.m4a",
            durationMs: 60000,
            loopStartMs: 10000,
            loopEndMs: 50000,
            bpm: 86,
            transitions: [],
          },
          isPlaying: false,
          secondsRemaining: 5,
          isLoading: false,
          error: null,
          togglePlay: mockTogglePlay,
          advanceTrack: vi.fn(),
        }}
      >
        <Home />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();

    const startButton = screen.getByRole("button", {
      name: /Start Radio Stream/,
    });
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);
    expect(mockTogglePlay).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/beat/0001");
  });

  it("calls play when provided in context upon clicking Start Radio Stream", () => {
    const mockPlay = vi.fn();
    render(
      <AudioPlayerContext.Provider
        value={{
          current: {
            id: "0002",
            name: "Jazz Flute",
            audioUrl: "http://storage/2.m4a",
            durationMs: 60000,
            loopStartMs: 10000,
            loopEndMs: 50000,
            bpm: 90,
            transitions: [],
          },
          isPlaying: false,
          secondsRemaining: 5,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          play: mockPlay,
          advanceTrack: vi.fn(),
        }}
      >
        <Home />
      </AudioPlayerContext.Provider>,
    );

    const startButton = screen.getByRole("button", {
      name: /Start Radio Stream/,
    });
    fireEvent.click(startButton);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/beat/0002");
  });

  it("relies on native browser focus without custom focus ring classes", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <Home />
      </AudioPlayerContext.Provider>,
    );

    const button = screen.getByRole("button", {
      name: /Start Radio Stream/,
    });
    expect(button.className).not.toMatch(/focus-visible:outline/);
    expect(button.className).not.toMatch(/focus:ring/);
  });

  it("resolves the next beat via beatsApi.getNextBeat when no beat is paused", async () => {
    const nextBeat = {
      id: "0003",
      name: "Soul Trumpet",
      audioUrl: "http://storage/3.m4a",
      durationMs: 60000,
      loopStartMs: 10000,
      loopEndMs: 50000,
      bpm: 88,
      transitions: [],
    };
    vi.mocked(beatsApi.getNextBeat).mockResolvedValueOnce({
      beat: nextBeat,
      transition: null,
    });
    const mockPlay = vi.fn();
    const mockCommitBeat = vi.fn();

    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          hasPausedBeat: false,
          playedHistory: ["0001", "0002"],
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          play: mockPlay,
          commitBeat: mockCommitBeat,
          advanceTrack: vi.fn(),
        }}
      >
        <Home />
      </AudioPlayerContext.Provider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Start Radio Stream/i }),
    );

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
