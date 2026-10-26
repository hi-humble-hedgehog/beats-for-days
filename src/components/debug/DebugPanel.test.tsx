import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
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
    window.sessionStorage.clear();
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

  it("renders collapsed by default when no sessionStorage state exists", () => {
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

  it("restores expanded state from sessionStorage on mount", () => {
    window.sessionStorage.setItem(`${STORAGE_KEYS.DEBUG_PANEL}_open`, "true");
    render(<DebugPanel />);

    const toggleButton = screen.getByRole("button", {
      name: /Toggle history debug panel/i,
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("region", { name: /Playback and history state/i }),
    ).toBeInTheDocument();
  });

  it("expands panel and updates sessionStorage when toggle button is clicked", () => {
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

    expect(
      window.sessionStorage.getItem(`${STORAGE_KEYS.DEBUG_PANEL}_open`),
    ).toBe("true");

    expect(screen.getByText("Jazz Flute (0002)")).toBeInTheDocument();
    expect(screen.getByText("/beat/0002")).toBeInTheDocument();
    expect(screen.getByText(/Played History \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("0001 → 0002")).toBeInTheDocument();
  });

  it("collapses panel and updates sessionStorage when close button is clicked", () => {
    window.sessionStorage.setItem(`${STORAGE_KEYS.DEBUG_PANEL}_open`, "true");
    render(<DebugPanel />);

    const toggleButton = screen.getByRole("button", {
      name: /Toggle history debug panel/i,
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    const closeButton = screen.getByRole("button", {
      name: /Close debug panel/i,
    });
    fireEvent.click(closeButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", { name: /Playback and history state/i }),
    ).not.toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(`${STORAGE_KEYS.DEBUG_PANEL}_open`),
    ).toBe("false");
  });
});
