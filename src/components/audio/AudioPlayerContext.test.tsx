import { render, screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { beatsApi } from "@/lib/api";
import { LIMITS, STORAGE_KEYS } from "@/lib/constants";
import { AudioPlayerProvider, useAudioPlayer } from "./AudioPlayerContext";

let mockPathname = "/beat/0001";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/api", () => ({
  beatsApi: {
    getNextBeat: vi.fn(),
  },
}));

const mockBeatsApi = vi.mocked(beatsApi);

function Consumer() {
  const {
    current,
    isPlaying,
    secondsRemaining,
    isLoading,
    error,
    togglePlay,
    advanceTrack,
  } = useAudioPlayer();

  return (
    <div>
      <p>Current: {current?.name ?? "none"}</p>
      <p>Playing: {isPlaying ? "yes" : "no"}</p>
      <p>Loading: {isLoading ? "yes" : "no"}</p>
      <p>Seconds: {secondsRemaining}</p>
      {error ? <p>Error: {error}</p> : null}
      <button onClick={togglePlay}>Toggle Play</button>
      <button onClick={() => advanceTrack()}>Advance</button>
      <button onClick={() => advanceTrack("auto")}>Auto Advance</button>
    </div>
  );
}

describe("AudioPlayerProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockPathname = "/beat/0001";
    window.localStorage.clear();

    mockBeatsApi.getNextBeat.mockImplementation((req = {}) => {
      if (req.currentTrackId === "0001") {
        return Promise.resolve({
          beat: {
            id: "0002",
            name: "Jazz Flute",
            audioUrl: "http://storage/2.wav",
            transitions: [],
          },
          transition: null,
        });
      }
      return Promise.resolve({
        beat: {
          id: "0001",
          name: "Soul Rhodes",
          audioUrl: "http://storage/1.wav",
          transitions: [],
        },
        transition: null,
      });
    });
  });

  it("provides initial beat and allows toggling playback and advancing", async () => {
    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    expect(screen.getByText("Playing: no")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Advance" }).click();
    });
    expect(await screen.findByText(/Current: Jazz Flute/)).toBeInTheDocument();
  });

  it("pauses active playing when pathname is the root landing page '/'", async () => {
    mockPathname = "/";
    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });

    // Landing page always forces isPlaying to false to avoid audio auto-start
    expect(screen.getByText("Playing: no")).toBeInTheDocument();
  });

  it("handles Error exception on initial beat load", async () => {
    mockBeatsApi.getNextBeat.mockRejectedValueOnce(new Error("Network failed"));

    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(
      await screen.findByText("Error: Network failed"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading: no")).toBeInTheDocument();
    expect(screen.getByText("Current: none")).toBeInTheDocument();
  });

  it("handles non-Error rejection on initial beat load", async () => {
    mockBeatsApi.getNextBeat.mockRejectedValueOnce("Server dropped request");

    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(
      await screen.findByText("Error: Failed to load beats"),
    ).toBeInTheDocument();
  });

  it("handles Error exception when advanceTrack fails", async () => {
    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    mockBeatsApi.getNextBeat.mockRejectedValueOnce(new Error("Advance failed"));

    act(() => {
      screen.getByRole("button", { name: "Advance" }).click();
    });

    expect(
      await screen.findByText("Error: Advance failed"),
    ).toBeInTheDocument();
  });

  it("handles non-Error rejection when advanceTrack fails", async () => {
    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    mockBeatsApi.getNextBeat.mockRejectedValueOnce("Internal Error");

    act(() => {
      screen.getByRole("button", { name: "Advance" }).click();
    });

    expect(
      await screen.findByText("Error: Failed to advance track"),
    ).toBeInTheDocument();
  });

  it("automatically advances track when countdown timer expires", async () => {
    vi.useFakeTimers();

    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    // Resolve initial beat load with fake timers
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    // Start playback
    act(() => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();
    expect(
      screen.getByText(`Seconds: ${LIMITS.CYCLE_TIMER_SECONDS}`),
    ).toBeInTheDocument();

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByText(`Seconds: ${LIMITS.CYCLE_TIMER_SECONDS - 1}`),
    ).toBeInTheDocument();

    // Advance remaining seconds to hit 0 and trigger onExpire
    await act(async () => {
      vi.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTrackId: "0001",
        mode: "auto",
      }),
    );
  });

  it("loads and saves played history using localStorage", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.PLAYED_TRACKS,
      JSON.stringify(["0099"]),
    );

    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        playedTrackIds: ["0099"],
      }),
    );

    act(() => {
      screen.getByRole("button", { name: "Advance" }).click();
    });

    expect(await screen.findByText(/Current: Jazz Flute/)).toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.PLAYED_TRACKS) ?? "[]",
      ),
    ).toEqual(["0099", "0002"]);
  });

  it("handles corrupted JSON in localStorage gracefully", async () => {
    window.localStorage.setItem(STORAGE_KEYS.PLAYED_TRACKS, "corrupted-json{");

    render(
      <AudioPlayerProvider>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        playedTrackIds: [],
      }),
    );
  });

  it("throws error when useAudioPlayer is called outside provider", () => {
    expect(() => render(<Consumer />)).toThrow(
      "useAudioPlayer must be used within an AudioPlayerProvider",
    );
  });
});
