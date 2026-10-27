import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeGeometry } from "@/lib/grid/poster-geometry";
import { SpectrumBars } from "./SpectrumBars";

function mockContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
  };
}

describe("SpectrumBars", () => {
  let ctx: ReturnType<typeof mockContext>;

  beforeEach(() => {
    ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clips and fills resting markers inside the first band", () => {
    const geometry = computeGeometry(1280, 800, 1);
    const { container } = render(<SpectrumBars geometry={geometry} />);
    expect(container.querySelector("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("skips drawing when there is no first band", () => {
    const geometry = {
      ...computeGeometry(1280, 800, 1),
      bands: [],
      bars: [],
    };
    render(<SpectrumBars geometry={geometry} />);
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it("disconnects resize observer on unmount", () => {
    const disconnectSpy = vi.fn();
    class FakeObserver {
      observe = vi.fn();
      disconnect = disconnectSpy;
    }
    vi.stubGlobal("ResizeObserver", FakeObserver);

    const geometry = computeGeometry(1280, 800, 1);
    const { unmount } = render(<SpectrumBars geometry={geometry} />);
    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
