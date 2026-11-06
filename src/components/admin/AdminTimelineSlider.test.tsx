import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminTimelineSlider } from "./AdminTimelineSlider";

describe("AdminTimelineSlider", () => {
  it("renders with correct ARIA slider attributes", () => {
    render(
      <AdminTimelineSlider
        currentTime={10}
        duration={60}
        loopStartSec={5}
        loopEndSec={55}
        onSeek={vi.fn()}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Beat timeline" });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "60");
    expect(slider).toHaveAttribute("aria-valuenow", "10");
    expect(slider).toHaveAttribute("aria-valuetext", "00:10");
  });

  it("handles keyboard navigation (ArrowLeft, ArrowRight, Home, End)", () => {
    const onSeek = vi.fn();
    render(
      <AdminTimelineSlider
        currentTime={20}
        duration={60}
        loopStartSec={5}
        loopEndSec={55}
        onSeek={onSeek}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Beat timeline" });

    // ArrowLeft (-1s)
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenCalledWith(19);

    // ArrowRight (+1s)
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenCalledWith(21);

    // Shift + ArrowRight (+4s)
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(onSeek).toHaveBeenCalledWith(24);

    // Shift + ArrowLeft (-4s)
    fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
    expect(onSeek).toHaveBeenCalledWith(16);

    // Home (loopStart)
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onSeek).toHaveBeenCalledWith(5);

    // End (loopEnd - 8s = 55 - 8 = 47)
    fireEvent.keyDown(slider, { key: "End" });
    expect(onSeek).toHaveBeenCalledWith(47);
  });

  it("renders shaded loop window within boundaries", () => {
    render(
      <AdminTimelineSlider
        currentTime={0}
        duration={100}
        loopStartSec={10}
        loopEndSec={90}
        onSeek={vi.fn()}
      />,
    );

    const windowEl = screen.getByTestId("shaded-loop-window");
    expect(windowEl).toBeInTheDocument();
    expect(windowEl.style.left).toBe("10%");
    expect(windowEl.style.width).toBe("80%");
  });
});
