import { act, render } from "@testing-library/react";
import type { Dispatch, SetStateAction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { beatsApi } from "@/lib/api";
import { AudioEngine } from "@/lib/audio/engine";
import type { PlaybackPhase } from "@/lib/types/audio";
import type { BeatView } from "@/lib/types/beat";
import { useUrlSync, type UrlSyncOptions } from "./useUrlSync";

vi.mock("@/lib/api", () => ({
  beatsApi: {
    getBeat: vi.fn(),
  },
}));

const mockBeatsApi = vi.mocked(beatsApi);

function TestComponent(props: UrlSyncOptions) {
  useUrlSync(props);
  return null;
}

describe("useUrlSync", () => {
  const beatOne: BeatView = {
    id: "0001",
    name: "Beat One",
    audioUrl: "http://storage/1.m4a",
    durationMs: 60000,
    loopStartMs: 0,
    loopEndMs: 60000,
    bpm: 86,
    transitions: [],
  };

  const beatTwo: BeatView = {
    id: "0002",
    name: "Beat Two",
    audioUrl: "http://storage/2.m4a",
    durationMs: 60000,
    loopStartMs: 0,
    loopEndMs: 60000,
    bpm: 86,
    transitions: [],
  };

  let mockEngine: AudioEngine;
  const mockSetCurrent = vi.fn<(beat: BeatView) => void>();
  const mockSetPhase = vi.fn<(phase: PlaybackPhase) => void>();
  const mockSetSecondsRemaining = vi.fn<(sec: number) => void>();
  const mockSetPositionSec = vi.fn<(sec: number) => void>();
  const mockSetError = vi.fn<(err: string | null) => void>();
  const mockSetPlayedHistory = vi.fn<Dispatch<SetStateAction<string[]>>>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEngine = new AudioEngine();

    mockBeatsApi.getBeat.mockImplementation((id: string) => {
      if (id === "0001") return Promise.resolve(beatOne);
      if (id === "0002") return Promise.resolve(beatTwo);
      return Promise.resolve(null);
    });
  });

  it("switches to target beat and calls loadTrack when paused on popstate", async () => {
    const loadSpy = vi.spyOn(mockEngine, "loadTrack").mockResolvedValue();

    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        current={beatTwo}
        setCurrent={mockSetCurrent}
        setPhase={mockSetPhase}
        setSecondsRemaining={mockSetSecondsRemaining}
        setPositionSec={mockSetPositionSec}
        setError={mockSetError}
        playedHistory={["0002"]}
        setPlayedHistory={mockSetPlayedHistory}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "0001" } }),
      );
    });

    expect(mockBeatsApi.getBeat).toHaveBeenCalledWith("0001");
    expect(mockSetCurrent).toHaveBeenCalledWith(beatOne);
    expect(loadSpy).toHaveBeenCalledWith(beatOne);
  });

  it("switches to target beat and calls skipToTrack when currently playing", async () => {
    vi.spyOn(mockEngine, "getSnapshot").mockReturnValue({
      isPlaying: true,
      phase: "playing",
      positionSec: 10,
      pass: 0,
      continuousPlaySec: 10,
      secondsRemaining: 20,
      currentBeat: beatTwo,
    });
    const skipSpy = vi.spyOn(mockEngine, "skipToTrack").mockResolvedValue();

    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        current={beatTwo}
        setCurrent={mockSetCurrent}
        setPhase={mockSetPhase}
        setSecondsRemaining={mockSetSecondsRemaining}
        setPositionSec={mockSetPositionSec}
        setError={mockSetError}
        playedHistory={["0002"]}
        setPlayedHistory={mockSetPlayedHistory}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "0001" } }),
      );
    });

    expect(skipSpy).toHaveBeenCalledWith(beatOne);
  });

  it("does not switch beat when target matches current beat id", async () => {
    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        current={beatTwo}
        setCurrent={mockSetCurrent}
        setPhase={mockSetPhase}
        setSecondsRemaining={mockSetSecondsRemaining}
        setError={mockSetError}
        playedHistory={["0002"]}
        setPlayedHistory={mockSetPlayedHistory}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "0002" } }),
      );
    });

    expect(mockBeatsApi.getBeat).not.toHaveBeenCalled();
    expect(mockSetCurrent).not.toHaveBeenCalled();
  });

  it("handles beat fetch failure by setting error", async () => {
    mockBeatsApi.getBeat.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        current={beatTwo}
        setCurrent={mockSetCurrent}
        setPhase={mockSetPhase}
        setSecondsRemaining={mockSetSecondsRemaining}
        setError={mockSetError}
        playedHistory={["0002"]}
        setPlayedHistory={mockSetPlayedHistory}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "0001" } }),
      );
    });

    expect(mockSetError).toHaveBeenCalledWith("Network error");
  });

  it("calls setIsPlaying(false) when transitioning from a beat route to '/'", async () => {
    const mockSetIsPlaying = vi.fn();

    const { rerender } = render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        current={beatTwo}
        setCurrent={mockSetCurrent}
        setPhase={mockSetPhase}
        setSecondsRemaining={mockSetSecondsRemaining}
        setError={mockSetError}
        playedHistory={["0002"]}
        setPlayedHistory={mockSetPlayedHistory}
        setIsPlaying={mockSetIsPlaying}
      />,
    );

    rerender(
      <TestComponent
        engine={mockEngine}
        pathname="/"
        current={beatTwo}
        setCurrent={mockSetCurrent}
        setPhase={mockSetPhase}
        setSecondsRemaining={mockSetSecondsRemaining}
        setError={mockSetError}
        playedHistory={["0002"]}
        setPlayedHistory={mockSetPlayedHistory}
        setIsPlaying={mockSetIsPlaying}
      />,
    );

    expect(mockSetIsPlaying).toHaveBeenCalledWith(false);
  });
});
