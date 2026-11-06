import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BeatNumber } from "./BeatNumber";
import { AudioPlayerContext } from "./AudioPlayerContext";
import { PosterContext } from "./PosterContext";
import { computeGeometry } from "@/lib/grid/poster-geometry";
import type { BeatView } from "@/lib/types/beat";

const sampleGeometry = computeGeometry(1280, 800, 1);

const sampleBeat: BeatView = {
  id: "0003",
  name: "Soul Rhodes",
  audioUrl: "http://storage/3.m4a",
  durationMs: 60000,
  loopStartMs: 10000,
  loopEndMs: 50000,
  bpm: 86,
  transitions: [],
};

describe("BeatNumber", () => {
  it("formats and displays track number from AudioPlayerContext", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: sampleBeat,
          isPlaying: true,
          secondsRemaining: 20,
          isLoading: false,
          error: null,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <PosterContext.Provider
          value={{
            geometry: sampleGeometry,
            number: "03",
            returnHref: "/beat/0003",
          }}
        >
          <BeatNumber />
        </PosterContext.Provider>
      </AudioPlayerContext.Provider>,
    );

    const numberElement = screen.getByLabelText("Now playing beat number 03");
    expect(numberElement).toBeInTheDocument();
    expect(numberElement).toHaveClass("trackNumber");
    expect(numberElement).toHaveTextContent("#03");
    expect(numberElement).toHaveStyle({
      fontSize: `${sampleGeometry.numberSize}px`,
    });
  });

  it("falls back to fallbackBeatId when current beat is null", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <BeatNumber fallbackBeatId="0007" />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByLabelText("Now playing beat number 07"),
    ).toBeInTheDocument();
  });

  it("renders empty loading state without track digits when beat is not yet loaded", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: true,
          error: null,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <BeatNumber />
      </AudioPlayerContext.Provider>,
    );

    const container = screen.getByLabelText("Loading beat");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("#00")).not.toBeInTheDocument();
  });

  it("animates the track number into view when beat is loaded", () => {
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
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <BeatNumber />
      </AudioPlayerContext.Provider>,
    );

    const trackContainer = screen.getByLabelText("Now playing beat number 01");
    const animatedSpan = trackContainer.querySelector(".animated");
    expect(animatedSpan).toBeInTheDocument();
    expect(animatedSpan).toHaveTextContent("#01");
  });

  it("hydrates initialBeat into player context on mount", () => {
    const mockHydrateBeat = vi.fn();
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          hydrateBeat: mockHydrateBeat,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <BeatNumber initialBeat={sampleBeat} />
      </AudioPlayerContext.Provider>,
    );

    expect(mockHydrateBeat).toHaveBeenCalledWith(sampleBeat);
    expect(
      screen.getByLabelText("Now playing beat number 03"),
    ).toBeInTheDocument();
  });

  it("uses activePathname from player state when current is not yet updated", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          activePathname: "/beat/0002",
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <BeatNumber fallbackBeatId="0001" />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByLabelText("Now playing beat number 02"),
    ).toBeInTheDocument();
  });

  it("renders 404 NotFound state when notFoundBeatId matches fallbackBeatId", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          notFoundBeatId: "9999",
          isPlaying: false,
          secondsRemaining: 0,
          isLoading: false,
          error: null,
          togglePlay: () => {},
          advanceTrack: () => {},
        }}
      >
        <BeatNumber fallbackBeatId="9999" />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /404 — Beat Not Found/i }),
    ).toBeInTheDocument();
  });
});
