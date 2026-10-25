import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersistentPlayerBar } from "./PersistentPlayerBar";
import { AudioPlayerContext } from "./AudioPlayerContext";
import type { BeatView } from "@/lib/types/beat";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("PersistentPlayerBar", () => {
  const sampleBeat: BeatView = {
    id: "0001",
    name: "Soul Rhodes & Piano",
    audioUrl: "http://storage/track-a.m4a",
    durationMs: 60000,
    loopStartMs: 10000,
    loopEndMs: 50000,
    bpm: 86,
    transitions: [],
  };

  it("renders now playing beat name when loaded", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: sampleBeat,
          isPlaying: true,
          secondsRemaining: 4,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <PersistentPlayerBar />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByText(/Now Playing: Soul Rhodes & Piano/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Next in 4s/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pause audio" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Skip to next track" }),
    ).toBeInTheDocument();
  });

  it("renders loading state when initial fetch is pending", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          isPlaying: false,
          secondsRemaining: 5,
          isLoading: true,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <PersistentPlayerBar />
      </AudioPlayerContext.Provider>,
    );

    expect(screen.getByText(/Loading beat catalog/)).toBeInTheDocument();
  });

  it("displays armed and bridge status labels when transitioning", () => {
    const { rerender } = render(
      <AudioPlayerContext.Provider
        value={{
          current: sampleBeat,
          isPlaying: true,
          phase: "armed",
          secondsRemaining: 12,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <PersistentPlayerBar />
      </AudioPlayerContext.Provider>,
    );

    expect(screen.getByText(/Transition in 12s/)).toBeInTheDocument();

    rerender(
      <AudioPlayerContext.Provider
        value={{
          current: sampleBeat,
          isPlaying: true,
          phase: "bridge",
          secondsRemaining: 5,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <PersistentPlayerBar />
      </AudioPlayerContext.Provider>,
    );

    expect(screen.getByText(/Transitioning \(5s\)/)).toBeInTheDocument();
  });

  it("relies on native browser focus without custom focus ring classes", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: sampleBeat,
          isPlaying: true,
          secondsRemaining: 4,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <PersistentPlayerBar />
      </AudioPlayerContext.Provider>,
    );

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button.className).not.toMatch(/focus-visible:outline/);
      expect(button.className).not.toMatch(/focus:ring/);
    }
  });
});
