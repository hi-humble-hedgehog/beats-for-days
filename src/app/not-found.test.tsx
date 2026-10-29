import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";
import { beatsApi } from "@/lib/api";
import NotFound from "./not-found";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/beat/missing",
}));

vi.mock("@/lib/api", () => ({
  beatsApi: {
    getNextBeat: vi.fn(),
  },
}));

describe("NotFound page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 404 heading and explanation copy", () => {
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
        <NotFound />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /404 — Beat Not Found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /That beat is not in the crate\. Press play to resume your paused beat or start the next track\./i,
      ),
    ).toBeInTheDocument();
  });

  it("resumes the paused beat and keeps isPlaying true while still mounted before router.push completes", () => {
    const mockPause = vi.fn();

    function StatefulHarness() {
      const [isPlaying, setIsPlaying] = useState(false);
      return (
        <AudioPlayerContext.Provider
          value={{
            current: {
              id: "0002",
              name: "Jazz Flute",
              audioUrl: "/audio/2.m4a",
              durationMs: 60000,
              loopStartMs: 0,
              loopEndMs: 60000,
              bpm: 86,
              transitions: [],
            },
            hasPausedBeat: true,
            isPlaying,
            secondsRemaining: 10,
            isLoading: false,
            error: null,
            togglePlay: () => setIsPlaying((prev) => !prev),
            play: () => setIsPlaying(true),
            pause: () => {
              mockPause();
              setIsPlaying(false);
            },
            advanceTrack: vi.fn(),
          }}
        >
          <span data-testid="playing-state">{isPlaying ? "yes" : "no"}</span>
          <NotFound />
        </AudioPlayerContext.Provider>
      );
    }

    render(<StatefulHarness />);

    fireEvent.click(
      screen.getByRole("button", { name: /Start Radio Stream/i }),
    );
    expect(screen.getByTestId("playing-state")).toHaveTextContent("yes");
    expect(mockPause).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/beat/02");
  });

  it("fetches next beat and navigates when clicking Start Radio Stream without a paused beat", async () => {
    const nextBeat = {
      id: "0003",
      name: "Soul Trumpet",
      audioUrl: "/audio/3.m4a",
      durationMs: 60000,
      loopStartMs: 0,
      loopEndMs: 60000,
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
          playedHistory: ["0001"],
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
        <NotFound />
      </AudioPlayerContext.Provider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Start Radio Stream/i }),
    );

    await waitFor(() => {
      expect(beatsApi.getNextBeat).toHaveBeenCalledWith({
        currentTrackId: "0001",
        playedTrackIds: ["0001"],
        mode: "skip",
      });
      expect(mockCommitBeat).toHaveBeenCalledWith(nextBeat);
      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/beat/03");
    });
  });
});
