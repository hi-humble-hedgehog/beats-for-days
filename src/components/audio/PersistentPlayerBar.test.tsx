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
    id: "track-a",
    name: "Soul Rhodes & Piano",
    audioUrl: "http://storage/track-a.wav",
    transitions: [],
  };

  it("renders now playing beat name when loaded", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: sampleBeat,
          cycle: 1,
          orderHash: "seed_test123",
          secondsRemaining: 4,
          isLoading: false,
          error: null,
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
    expect(screen.getByText(/Cycle #1/)).toBeInTheDocument();
  });

  it("renders loading state when initial fetch is pending", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          cycle: 1,
          orderHash: "seed_test123",
          secondsRemaining: 5,
          isLoading: true,
          error: null,
          advanceTrack: vi.fn(),
        }}
      >
        <PersistentPlayerBar />
      </AudioPlayerContext.Provider>,
    );

    expect(screen.getByText(/Loading beat catalog/)).toBeInTheDocument();
  });
});
