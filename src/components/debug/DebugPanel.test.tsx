import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugPanel } from "./DebugPanel";

let mockPathname = "/beat/0002";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

let mockPlayerState = {
  current: { id: "0002", name: "Jazz Flute" },
  isPlaying: true,
  phase: "playing" as const,
  secondsRemaining: 25,
  positionSec: 10,
  isLoading: false,
  error: null,
  playedHistory: ["0001", "0002"],
  togglePlay: vi.fn(),
  advanceTrack: vi.fn(),
};

vi.mock("@/components/audio/AudioPlayerContext", () => ({
  useAudioPlayer: () => mockPlayerState,
}));

describe("DebugPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/beat/0002";
    mockPlayerState = {
      current: { id: "0002", name: "Jazz Flute" },
      isPlaying: true,
      phase: "playing" as const,
      secondsRemaining: 25,
      positionSec: 10,
      isLoading: false,
      error: null,
      playedHistory: ["0001", "0002"],
      togglePlay: vi.fn(),
      advanceTrack: vi.fn(),
    };
  });

  it("renders collapsed by default with accessible toggle button", () => {
    render(<DebugPanel />);

    const toggleButton = screen.getByRole("button", {
      name: /Toggle history debug panel/i,
    });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", { name: /Playback and history state/i }),
    ).not.toBeInTheDocument();
  });

  it("expands panel when toggle button is clicked and displays history state", () => {
    render(<DebugPanel />);

    const toggleButton = screen.getByRole("button", {
      name: /Toggle history debug panel/i,
    });
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", {
      name: /Playback and history state/i,
    });
    expect(region).toBeInTheDocument();

    expect(screen.getByText("Jazz Flute (0002)")).toBeInTheDocument();
    expect(screen.getByText("/beat/0002")).toBeInTheDocument();
    expect(screen.getByText(/Played History \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("0001 → 0002")).toBeInTheDocument();
  });

  it("collapses panel when close button inside panel is clicked", () => {
    render(<DebugPanel />);

    const toggleButton = screen.getByRole("button", {
      name: /Toggle history debug panel/i,
    });
    fireEvent.click(toggleButton);

    const closeButton = screen.getByRole("button", {
      name: /Close debug panel/i,
    });
    fireEvent.click(closeButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", { name: /Playback and history state/i }),
    ).not.toBeInTheDocument();
  });
});
