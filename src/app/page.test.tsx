import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";

const mockPush = vi.fn();
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
            audioUrl: "http://storage/1.wav",
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
});
