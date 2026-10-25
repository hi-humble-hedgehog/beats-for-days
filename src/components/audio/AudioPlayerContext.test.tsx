import { render, screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { beatsApi } from "@/lib/api";
import { AudioEngine } from "@/lib/audio/engine";
import type { AudioContextLike, AudioBufferLike } from "@/lib/audio/types";
import { STORAGE_KEYS } from "@/lib/constants";
import type { BeatView } from "@/lib/types/beat";
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

function createTestAudioEngine(onTrackHandoff?: (next: BeatView) => void) {
  let currentTime = 0;
  const mockBuffer: AudioBufferLike = {
    duration: 60,
    length: 60 * 44100,
    numberOfChannels: 2,
    sampleRate: 44100,
  };

  const context: AudioContextLike = {
    get currentTime() {
      return currentTime;
    },
    state: "running",
    destination: { connect: vi.fn(), disconnect: vi.fn() },
    createGain: () => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        setValueCurveAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createBufferSource: () => ({
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    resume: vi.fn().mockResolvedValue(undefined),
  };

  const engine = new AudioEngine({
    contextFactory: () => context,
    bufferLoader: () => Promise.resolve(mockBuffer),
    onTrackHandoff,
  });

  return {
    engine,
    setTime: (t: number) => {
      currentTime = t;
      engine.getSnapshot();
    },
    advanceTime: (delta: number) => {
      currentTime += delta;
    },
  };
}

function Consumer() {
  const {
    current,
    isPlaying,
    phase,
    secondsRemaining,
    isLoading,
    error,
    togglePlay,
    advanceTrack,
    scratch,
  } = useAudioPlayer();

  return (
    <div>
      <p>Current: {current?.name ?? "none"}</p>
      <p>Playing: {isPlaying ? "yes" : "no"}</p>
      <p>Phase: {phase ?? "idle"}</p>
      <p>Loading: {isLoading ? "yes" : "no"}</p>
      <p>Seconds: {secondsRemaining}</p>
      {error ? <p>Error: {error}</p> : null}
      <button onClick={togglePlay}>Toggle Play</button>
      <button onClick={() => advanceTrack()}>Advance</button>
      <button onClick={() => advanceTrack("auto")}>Auto Advance</button>
      <button onClick={() => scratch?.(1.5)}>Scratch</button>
    </div>
  );
}

describe("AudioPlayerProvider", () => {
  const transition1To2 = {
    id: "tr-1-2",
    targetTrackId: "0002",
    audioUrl: "http://storage/tr-1-2.m4a",
    timing: {
      handleMs: 250,
      crossfadeMs: 100,
      glueMs: 7200,
      landMs: 0,
    },
  };

  let testHarness: ReturnType<typeof createTestAudioEngine>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockPathname = "/beat/0001";
    window.localStorage.clear();
    testHarness = createTestAudioEngine();

    mockBeatsApi.getNextBeat.mockImplementation((req = {}) => {
      if (req.currentTrackId === "0001") {
        return Promise.resolve({
          beat: {
            id: "0002",
            name: "Jazz Flute",
            audioUrl: "http://storage/2.m4a",
            durationMs: 60000,
            loopStartMs: 10000,
            loopEndMs: 50000,
            bpm: 86,
            transitions: [],
          },
          transition: req.mode === "auto" ? transition1To2 : null,
          resolveAfterSec: 30,
        });
      }
      return Promise.resolve({
        beat: {
          id: "0001",
          name: "Soul Rhodes",
          audioUrl: "http://storage/1.m4a",
          durationMs: 60000,
          loopStartMs: 10000,
          loopEndMs: 50000,
          bpm: 86,
          transitions: [transition1To2],
        },
        transition: null,
        resolveAfterSec: 30,
      });
    });
  });

  it("provides initial beat and allows toggling playback and advancing", async () => {
    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    expect(screen.getByText("Playing: no")).toBeInTheDocument();
    expect(screen.getByText("Phase: idle")).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();
    expect(screen.getByText("Phase: playing")).toBeInTheDocument();
    const loadTrackSpy = vi.spyOn(testHarness.engine, "loadTrack");

    await act(async () => {
      screen.getByRole("button", { name: "Advance" }).click();
    });
    expect(await screen.findByText(/Current: Jazz Flute/)).toBeInTheDocument();
    // skipToTrack loads the next beat once; useEngineSync must not re-load it when already playing
    expect(loadTrackSpy).toHaveBeenCalledTimes(1);
  });

  it("resumes playback from paused position without reloading the track", async () => {
    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    // Start playback
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();

    // Advance audio clock to 15 seconds
    testHarness.setTime(15);
    const loadTrackSpy = vi.spyOn(testHarness.engine, "loadTrack");

    // Pause playback
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: no")).toBeInTheDocument();
    expect(testHarness.engine.getSnapshot().positionSec).toBeCloseTo(15, 2);

    // Resume playback
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();

    // Must NOT re-load track on resume, and positionSec must be preserved at 15
    expect(loadTrackSpy).not.toHaveBeenCalled();
    expect(testHarness.engine.getSnapshot().positionSec).toBeCloseTo(15, 2);
  });

  it("pauses active playing when pathname is the root landing page '/'", async () => {
    mockPathname = "/";
    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });

    // Landing page always forces isPlaying to false to avoid audio auto-start
    expect(screen.getByText("Playing: no")).toBeInTheDocument();
  });

  it("cancels in-flight track playback if paused before audio buffer finishes loading", async () => {
    let resolveBuffer!: (buf: AudioBufferLike) => void;
    const mockBuffer: AudioBufferLike = {
      duration: 60,
      length: 60 * 44100,
      numberOfChannels: 2,
      sampleRate: 44100,
    };
    const delayedEngine = new AudioEngine({
      contextFactory: () => testHarness.engine.getContext(),
      bufferLoader: () =>
        new Promise<AudioBufferLike>((resolve) => {
          resolveBuffer = resolve;
        }),
    });

    render(
      <AudioPlayerProvider engine={delayedEngine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    // Start playing (launches async loadTrack) then immediately pause before buffer resolves
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: no")).toBeInTheDocument();

    // Now resolve the delayed audio buffer
    await act(async () => {
      resolveBuffer(mockBuffer);
      await Promise.resolve();
    });

    expect(delayedEngine.getSnapshot().isPlaying).toBe(false);
  });

  it("handles Error exception on initial beat load", async () => {
    mockBeatsApi.getNextBeat.mockRejectedValueOnce(new Error("Network failed"));

    render(
      <AudioPlayerProvider engine={testHarness.engine}>
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
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(
      await screen.findByText("Error: Failed to load beats"),
    ).toBeInTheDocument();
  });

  it("handles Error exception when advanceTrack fails", async () => {
    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    mockBeatsApi.getNextBeat.mockRejectedValueOnce(new Error("Advance failed"));

    await act(async () => {
      screen.getByRole("button", { name: "Advance" }).click();
    });

    expect(
      await screen.findByText("Error: Advance failed"),
    ).toBeInTheDocument();
  });

  it("handles non-Error rejection when advanceTrack fails", async () => {
    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    mockBeatsApi.getNextBeat.mockRejectedValueOnce("Internal Error");

    await act(async () => {
      screen.getByRole("button", { name: "Advance" }).click();
    });

    expect(
      await screen.findByText("Error: Failed to advance track"),
    ).toBeInTheDocument();
  });

  it("resolves and arms transition after continuous play threshold and hands off at nextStart", async () => {
    vi.useFakeTimers();

    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    mockBeatsApi.getNextBeat.mockClear();

    // Start playback at t = 0
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();
    expect(screen.getByText("Phase: playing")).toBeInTheDocument();

    // Advance audio clock to 30s continuous play and run poll tick
    testHarness.setTime(30);
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTrackId: "0001",
        mode: "auto",
      }),
    );
    expect(screen.getByText("Phase: armed")).toBeInTheDocument();

    // Advance audio clock into bridge (89.8s)
    testHarness.setTime(89.8);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText("Phase: bridge")).toBeInTheDocument();

    // Advance audio clock past nextStart (97.3s) -> handoff to Jazz Flute
    testHarness.setTime(97.3);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText(/Current: Jazz Flute/)).toBeInTheDocument();
    expect(screen.getByText("Phase: playing")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does not re-arm or poll-resolve transition while armTransition is still in flight", async () => {
    vi.useFakeTimers();

    let resolveArm: () => void = () => {};
    const armPromise = new Promise<void>((resolve) => {
      resolveArm = resolve;
    });

    const armSpy = vi
      .spyOn(testHarness.engine, "armTransition")
      .mockImplementationOnce(() => armPromise);

    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    mockBeatsApi.getNextBeat.mockClear();

    // Start playback
    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });
    expect(screen.getByText("Playing: yes")).toBeInTheDocument();

    // Advance clock to threshold (30s)
    testHarness.setTime(30);

    // Trigger poll interval once
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledTimes(1);
    expect(armSpy).toHaveBeenCalledTimes(1);

    // Poll interval fires again while armTransition is still in flight
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    // Should NOT call getNextBeat a second auto-advance time (still 1 call total)
    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledTimes(1);
    expect(armSpy).toHaveBeenCalledTimes(1);

    // Resolve the in-flight armTransition
    await act(async () => {
      resolveArm();
      await Promise.resolve();
    });
    vi.useRealTimers();
  });

  it("loads and saves played history using localStorage", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.PLAYED_TRACKS,
      JSON.stringify(["0099"]),
    );

    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    expect(await screen.findByText(/Current: Soul Rhodes/)).toBeInTheDocument();
    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        playedTrackIds: ["0099"],
      }),
    );

    await act(async () => {
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
      <AudioPlayerProvider engine={testHarness.engine}>
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

  it("updates player state immediately when engine invokes onTrackHandoff without waiting for 200ms poll", async () => {
    vi.useFakeTimers();

    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });

    // Advance clock to auto-resolution threshold (30s) and trigger auto-advance
    testHarness.setTime(30);
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });
    expect(screen.getByText("Phase: armed")).toBeInTheDocument();

    // Advance audio clock to nextStart (97.3s) and advance timers by only 10ms (< 200ms poll interval)
    testHarness.setTime(97.3);
    await act(async () => {
      vi.advanceTimersByTime(10);
      await Promise.resolve();
    });

    // Should update to Jazz Flute immediately without waiting for 200ms poll
    expect(screen.getByText(/Current: Jazz Flute/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("queries next beat using newly active track when skipped in audio clock handoff window", async () => {
    vi.useFakeTimers();

    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/Current: Soul Rhodes/)).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Toggle Play" }).click();
    });

    testHarness.setTime(30);
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });
    expect(screen.getByText("Phase: armed")).toBeInTheDocument();

    // Advance audio context to splice point (97.3s), but DO NOT advance timers by 200ms
    testHarness.setTime(97.3);
    mockBeatsApi.getNextBeat.mockClear();

    // User clicks skip immediately in the handoff window
    await act(async () => {
      screen.getByRole("button", { name: "Advance" }).click();
    });

    // Must query next beat for 0002 (Jazz Flute), NOT 0001 (Soul Rhodes which already ended)
    expect(mockBeatsApi.getNextBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTrackId: "0002",
        mode: "skip",
      }),
    );
    vi.useRealTimers();
  });

  it("delegates scratch calls to the audio engine", async () => {
    const scratchSpy = vi.spyOn(testHarness.engine, "scratch");
    render(
      <AudioPlayerProvider engine={testHarness.engine}>
        <Consumer />
      </AudioPlayerProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: "Scratch" }).click();
    });

    expect(scratchSpy).toHaveBeenCalledWith(1.5);
  });
});
