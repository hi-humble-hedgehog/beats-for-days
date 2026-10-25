import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BeatPage from "./page";

const mockUseParams = vi.fn();
const mockTogglePlay = vi.fn();
const mockAdvanceTrack = vi.fn();

let mockPlayerState = {
  current: null as { id: string; name: string } | null,
  isPlaying: false,
  secondsRemaining: 30,
  togglePlay: mockTogglePlay,
  advanceTrack: mockAdvanceTrack,
};

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/components/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => mockPlayerState,
}));

describe("BeatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerState = {
      current: null,
      isPlaying: false,
      secondsRemaining: 30,
      togglePlay: mockTogglePlay,
      advanceTrack: mockAdvanceTrack,
    };
  });

  it("renders loading state with the slug when beat is not yet loaded", () => {
    mockUseParams.mockReturnValue({ slug: "0002" });

    render(<BeatPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Loading Beat 0002...",
    );
    expect(screen.getByText("Track ID: 0002")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "▶ Play Beat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Automatic seamless AI transition queued in 30s/),
    ).toBeInTheDocument();
  });

  it("renders fallback dash when slug is missing from params", () => {
    mockUseParams.mockReturnValue(null);

    render(<BeatPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Loading Beat —...",
    );
    expect(screen.getByText("Track ID: —")).toBeInTheDocument();
  });

  it("renders beat information when loaded and handles play/pause and next", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockPlayerState.current = { id: "0001", name: "Brooklyn Sunset" };
    mockPlayerState.isPlaying = true;
    mockPlayerState.secondsRemaining = 15;

    render(<BeatPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Brooklyn Sunset",
    );
    expect(screen.getByText("Track ID: 0001")).toBeInTheDocument();

    const pauseButton = screen.getByRole("button", { name: "⏸ Pause Beat" });
    expect(pauseButton).toBeInTheDocument();
    fireEvent.click(pauseButton);
    expect(mockTogglePlay).toHaveBeenCalledTimes(1);

    const nextButton = screen.getByRole("button", { name: "⏭ Next Beat" });
    fireEvent.click(nextButton);
    expect(mockAdvanceTrack).toHaveBeenCalledTimes(1);

    expect(
      screen.getByText(/Automatic seamless AI transition queued in 15s/),
    ).toBeInTheDocument();
  });

  it("relies on native browser focus without custom focus ring classes", () => {
    mockUseParams.mockReturnValue({ slug: "0001" });
    mockPlayerState.current = { id: "0001", name: "Brooklyn Sunset" };

    render(<BeatPage />);

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button.className).not.toMatch(/focus-visible:outline/);
      expect(button.className).not.toMatch(/focus:ring/);
    }
  });
});
