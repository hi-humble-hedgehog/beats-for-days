import { act, render } from "@testing-library/react";
import type { Dispatch, SetStateAction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { beatsApi } from "@/lib/api";
import { AudioEngine } from "@/lib/audio/engine";
import type { PlayerAction } from "@/lib/player/decisions";
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
    id: "01",
    name: "01",
    audioUrl: "http://storage/1.m4a",
    durationMs: 60000,
    loopStartMs: 0,
    loopEndMs: 60000,
    bpm: 86,
    transitions: [],
  };

  const beatTwo: BeatView = {
    id: "02",
    name: "02",
    audioUrl: "http://storage/2.m4a",
    durationMs: 60000,
    loopStartMs: 0,
    loopEndMs: 60000,
    bpm: 86,
    transitions: [],
  };

  let mockEngine: AudioEngine;
  const mockDispatch = vi.fn<Dispatch<PlayerAction>>();
  const mockSetCurrent = vi.fn<(beat: BeatView) => void>();
  const mockSetPlayedHistory = vi.fn<Dispatch<SetStateAction<string[]>>>();

  function makeStore(
    current: BeatView | null = beatTwo,
    pathname = "/beat/02",
  ) {
    return {
      setCurrent: mockSetCurrent,
      setPlayedHistory: mockSetPlayedHistory,
      stateRef: {
        current: {
          current,
          pathname,
          playedHistory: current ? [current.id] : [],
        },
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockEngine = new AudioEngine();

    mockBeatsApi.getBeat.mockImplementation((id: string) => {
      if (id === "01" || id === "0001") return Promise.resolve(beatOne);
      if (id === "02" || id === "0002") return Promise.resolve(beatTwo);
      return Promise.resolve(null);
    });
  });

  it("switches to target beat and calls loadTrack when paused on popstate", async () => {
    const loadSpy = vi.spyOn(mockEngine, "loadTrack").mockResolvedValue();

    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/02"
        dispatch={mockDispatch}
        store={makeStore()}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "01" } }),
      );
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "set_pathname",
      pathname: "/beat/01",
    });
    expect(mockBeatsApi.getBeat).toHaveBeenCalledWith("01");
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
        pathname="/beat/02"
        dispatch={mockDispatch}
        store={makeStore()}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "01" } }),
      );
    });

    expect(skipSpy).toHaveBeenCalledWith(beatOne);
  });

  it("does not switch beat when target matches current beat id", async () => {
    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/02"
        dispatch={mockDispatch}
        store={makeStore()}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "02" } }),
      );
    });

    expect(mockBeatsApi.getBeat).not.toHaveBeenCalled();
    expect(mockSetCurrent).not.toHaveBeenCalled();
  });

  it("handles beat fetch failure by dispatching set_error", async () => {
    mockBeatsApi.getBeat.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        dispatch={mockDispatch}
        store={makeStore()}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "0001" } }),
      );
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "set_error",
      error: "Network error",
    });
  });

  it("dispatches set_playing(false) when transitioning from a beat route to '/'", () => {
    const store = makeStore();
    const { rerender } = render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        dispatch={mockDispatch}
        store={store}
      />,
    );

    rerender(
      <TestComponent
        engine={mockEngine}
        pathname="/"
        dispatch={mockDispatch}
        store={store}
      />,
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "set_pathname",
      pathname: "/",
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "set_playing",
      isPlaying: false,
    });
  });

  it("dispatches set_not_found when getBeat returns null for an unknown beat id", async () => {
    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/0002"
        dispatch={mockDispatch}
        store={makeStore()}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "9999" } }),
      );
    });

    expect(mockBeatsApi.getBeat).toHaveBeenCalledWith("9999");
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "set_not_found",
      beatId: "9999",
    });
    expect(mockSetCurrent).not.toHaveBeenCalled();
  });

  it("preserves playedHistory order when navigating backward via popstate and appends unrecorded beats", async () => {
    vi.spyOn(mockEngine, "loadTrack").mockResolvedValue();
    const store = makeStore(beatTwo, "/beat/02");
    store.stateRef.current.playedHistory = ["01", "02", "03"];

    render(
      <TestComponent
        engine={mockEngine}
        pathname="/beat/02"
        dispatch={mockDispatch}
        store={store}
      />,
    );

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "01" } }),
      );
    });

    expect(mockSetPlayedHistory).toHaveBeenCalledWith(["01", "02", "03"]);

    // When popstate navigates to an unrecorded beat, it appends without losing existing history
    store.stateRef.current.playedHistory = ["02", "03"];
    store.stateRef.current.current = beatTwo;
    mockSetPlayedHistory.mockClear();

    await act(async () => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { beatId: "01" } }),
      );
    });

    expect(mockSetPlayedHistory).toHaveBeenCalledWith(["02", "03", "01"]);
  });
});
