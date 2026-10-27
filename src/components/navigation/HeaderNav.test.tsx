import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderNav } from "./HeaderNav";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";

describe("HeaderNav", () => {
  it("renders navigation links and links directly to active beat", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: {
            id: "0003",
            name: "Trumpet Beat",
            audioUrl: "http://storage/3.m4a",
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
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <HeaderNav />
      </AudioPlayerContext.Provider>,
    );

    expect(
      screen.getByRole("link", { name: /Beats for Days/ }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Beats" })).toHaveAttribute(
      "href",
      "/beat/0003",
    );
    expect(
      screen.queryByRole("link", { name: "Generate" }),
    ).not.toBeInTheDocument();
  });

  it("links to /beats fallback when no beat is loaded", () => {
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
        <HeaderNav />
      </AudioPlayerContext.Provider>,
    );

    expect(screen.getByRole("link", { name: "Beats" })).toHaveAttribute(
      "href",
      "/beats",
    );
  });

  it("relies on native browser focus without custom focus ring classes", () => {
    render(
      <AudioPlayerContext.Provider
        value={{
          current: null,
          isPlaying: false,
          secondsRemaining: 5,
          isLoading: false,
          error: null,
          togglePlay: vi.fn(),
          advanceTrack: vi.fn(),
        }}
      >
        <HeaderNav />
      </AudioPlayerContext.Provider>,
    );

    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.className).not.toMatch(/focus-visible:outline/);
      expect(link.className).not.toMatch(/focus:ring/);
    }
  });
});
