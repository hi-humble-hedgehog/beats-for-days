import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioPlayerContext } from "./AudioPlayerContext";
import { VinylPlatter } from "./VinylPlatter";
import type { AudioPlayerState } from "@/lib/types/audio";

function createMockPlayerState(
  overrides: Partial<AudioPlayerState> = {},
): AudioPlayerState {
  return {
    current: null,
    isPlaying: true,
    secondsRemaining: 30,
    isLoading: false,
    error: null,
    togglePlay: vi.fn(),
    advanceTrack: vi.fn(),
    startManualScratch: vi.fn(),
    setScratchVelocity: vi.fn(),
    stopManualScratch: vi.fn(),
    ...overrides,
  };
}

describe("VinylPlatter", () => {
  it("renders with accessible button label and visual orientation line", () => {
    const state = createMockPlayerState();
    render(
      <AudioPlayerContext.Provider value={state}>
        <VinylPlatter />
      </AudioPlayerContext.Provider>,
    );

    const platter = screen.getByRole("button", {
      name: /Interactive vinyl turntable platter/i,
    });
    expect(platter).toBeInTheDocument();
    expect(
      screen.getByText(/Drag platter or use arrow keys to scratch/i),
    ).toBeInTheDocument();
  });

  it("handles pointer down, move, and up to drive scratch velocity", () => {
    const startManualScratch = vi.fn();
    const setScratchVelocity = vi.fn();
    const stopManualScratch = vi.fn();

    const state = createMockPlayerState({
      startManualScratch,
      setScratchVelocity,
      stopManualScratch,
    });

    render(
      <AudioPlayerContext.Provider value={state}>
        <VinylPlatter />
      </AudioPlayerContext.Provider>,
    );

    const platter = screen.getByRole("button", {
      name: /Interactive vinyl turntable platter/i,
    });

    // Mock getBoundingClientRect on the button (center at 100, 100)
    vi.spyOn(platter, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // 1. Pointer Down at (200, 100) -> 0 deg angle
    fireEvent.pointerDown(platter, {
      clientX: 200,
      clientY: 100,
      pointerId: 1,
    });
    expect(startManualScratch).toHaveBeenCalledTimes(1);

    // 2. Pointer Move to (100, 200) -> 90 deg angle (clockwise forward motion)
    fireEvent.pointerMove(platter, {
      clientX: 100,
      clientY: 200,
      pointerId: 1,
    });
    expect(setScratchVelocity).toHaveBeenCalled();

    // 3. Pointer Up
    fireEvent.pointerUp(platter, { pointerId: 1 });
    expect(stopManualScratch).toHaveBeenCalledTimes(1);
  });

  it("triggers scratch forward and reverse via keyboard arrow keys", () => {
    const startManualScratch = vi.fn();
    const setScratchVelocity = vi.fn();
    const stopManualScratch = vi.fn();

    const state = createMockPlayerState({
      startManualScratch,
      setScratchVelocity,
      stopManualScratch,
    });

    render(
      <AudioPlayerContext.Provider value={state}>
        <VinylPlatter />
      </AudioPlayerContext.Provider>,
    );

    const platter = screen.getByRole("button", {
      name: /Interactive vinyl turntable platter/i,
    });

    // ArrowLeft -> scratch backward
    fireEvent.keyDown(platter, { key: "ArrowLeft" });
    expect(startManualScratch).toHaveBeenCalledTimes(1);
    expect(setScratchVelocity).toHaveBeenCalledWith(-1.6, 0.05);

    // ArrowRight -> scratch forward
    fireEvent.keyDown(platter, { key: "ArrowRight" });
    expect(startManualScratch).toHaveBeenCalledTimes(2);
    expect(setScratchVelocity).toHaveBeenCalledWith(1.6, 0.05);
  });
});
