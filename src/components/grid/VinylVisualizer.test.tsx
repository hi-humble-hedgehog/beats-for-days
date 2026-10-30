import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeGeometry } from "@/lib/grid/poster-geometry";
import { VinylVisualizer } from "./VinylVisualizer";

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

describe("VinylVisualizer", () => {
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

  it("draws rings, gutters, and the dpr-scaled spindle for desktop geometry", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    const geometry = computeGeometry(1280, 800, 1);
    const { container } = render(<VinylVisualizer geometry={geometry} />);
    expect(container.querySelector("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(ctx.arc).toHaveBeenCalledWith(
      geometry.px * 2,
      geometry.py * 2,
      geometry.start * 2 * 0.06,
      0,
      Math.PI * 2,
    );
    expect(ctx.fill).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("never passes a negative radius to arc when the poster box is empty", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const geometry = computeGeometry(0, 0, 1);
    expect(geometry.bands[0]?.inner).toBeCloseTo(-20 / 3, 8);
    ctx.arc.mockImplementation((_x, _y, radius: number) => {
      if (radius < 0) {
        throw new DOMException(
          `The radius provided (${radius}) is negative.`,
          "IndexSizeError",
        );
      }
    });
    expect(() => render(<VinylVisualizer geometry={geometry} />)).not.toThrow();
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(0);
    for (const call of ctx.arc.mock.calls) {
      expect(call[2]).toBeGreaterThanOrEqual(0);
    }
    vi.unstubAllGlobals();
  });

  it("still paints when no band is cut", () => {
    const geometry = computeGeometry(1280, 800, 1);
    const uncut = {
      ...geometry,
      bands: geometry.bands.map((band) => ({ ...band, cut: null })),
    };
    render(<VinylVisualizer geometry={uncut} />);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("disconnects resize observer on unmount", () => {
    const disconnectSpy = vi.fn();
    class FakeObserver {
      observe = vi.fn();
      disconnect = disconnectSpy;
    }
    vi.stubGlobal("ResizeObserver", FakeObserver);

    const geometry = computeGeometry(1280, 800, 1);
    const { unmount } = render(<VinylVisualizer geometry={geometry} />);
    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
