import { describe, expect, it, vi } from "vitest";
import {
  accentGutterIndex,
  drawBands,
  drawGutters,
  drawSpindle,
  fillRingSpan,
  intersectSpans,
  markerEdgeInset,
  markerRadii,
  markerTilts,
  renderVinylFrame,
  ringRadii,
} from "./canvas-draw";
import { computeGeometry } from "./poster-geometry";

describe("intersectSpans", () => {
  it("keeps only overlapping angular ranges", () => {
    expect(
      intersectSpans(
        [
          [0, 2],
          [3, 5],
        ],
        [
          [1, 4],
          [4.5, 6],
        ],
      ),
    ).toEqual([
      [1, 2],
      [3, 4],
      [4.5, 5],
    ]);
  });

  it("drops hairline and empty overlaps", () => {
    expect(intersectSpans([[0, 1]], [[1, 2]])).toEqual([]);
    expect(intersectSpans([[0, 1]], [[1 + 1e-7, 2]])).toEqual([]);
  });
});

describe("accentGutterIndex", () => {
  it("picks the gutter below the first cut band", () => {
    expect(
      accentGutterIndex([
        { cut: null },
        { cut: null },
        { cut: { lo: 0, hi: 1 } },
        { cut: null },
      ]),
    ).toBe(1);
  });

  it("uses gutter 0 when the first band itself is cut", () => {
    expect(accentGutterIndex([{ cut: { lo: 0, hi: 1 } }, { cut: null }])).toBe(
      0,
    );
  });

  it("returns -1 when no band is cut", () => {
    expect(accentGutterIndex([{ cut: null }, { cut: null }])).toBe(-1);
  });
});

describe("ringRadii", () => {
  it("keeps a positive ring unchanged", () => {
    expect(ringRadii(10, 20)).toEqual({ rIn: 10, rOut: 20 });
  });

  it("clamps a negative inner edge to the pivot so arc() can still fill the ring", () => {
    expect(ringRadii(-5, 20)).toEqual({ rIn: 0, rOut: 20 });
  });

  it("drops a ring whose outer edge is not outside the pivot", () => {
    expect(ringRadii(-5, 0)).toBeNull();
    expect(ringRadii(0, -1)).toBeNull();
  });
});

describe("marker geometry", () => {
  it("measures the first marker group as the edge inset", () => {
    expect(markerEdgeInset([])).toBe(0);
    expect(
      markerEdgeInset([
        { from: 0, to: 0.1 },
        { from: 0.12, to: 0.22 },
        { from: 0.24, to: 0.34 },
      ]),
    ).toBeCloseTo(0.22, 6);
  });

  it("builds marker radii and rejects a collapsed inner edge", () => {
    const ok = markerRadii(40, 2);
    expect(ok).toEqual({
      outer: 38,
      inner: 26,
      halfGutter: 2,
    });
    expect(markerRadii(4, 2)).toBeNull();
    expect(markerRadii(16, 2)).toBeNull();
    expect(markerRadii(16.1, 2)).not.toBeNull();
  });

  it("tilts marker sides by the gutter half-angle", () => {
    const radii = { outer: 10, inner: 5, halfGutter: 1 };
    const tilts = markerTilts(radii);
    expect(tilts.tiltOuter).toBeCloseTo(Math.asin(0.1), 8);
    expect(tilts.tiltInner).toBeCloseTo(Math.asin(0.2), 8);
  });
});

function mockContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
  };
}

describe("canvas drawing helpers", () => {
  it("fills ring span or ignores collapsed ring", () => {
    const ctx = mockContext() as unknown as CanvasRenderingContext2D;
    fillRingSpan(
      ctx,
      { x: 10, y: 10 },
      { rIn: 5, rOut: 15 },
      { from: 0, to: 1 },
    );
    expect(ctx.arc).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();
    fillRingSpan(
      ctx,
      { x: 10, y: 10 },
      { rIn: -5, rOut: 0 },
      { from: 0, to: 1 },
    );
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws gutters, bands, and spindle", () => {
    const geometry = computeGeometry(800, 600, 1);
    const ctx = mockContext() as unknown as CanvasRenderingContext2D;
    const colors = { ink: "#111", stamp: "#red", sleeve: "#eee" };

    drawGutters(ctx, geometry, 1, {
      stamp: colors.stamp,
      sleeve: colors.sleeve,
    });
    expect(ctx.fill).toHaveBeenCalled();

    vi.clearAllMocks();
    drawBands(ctx, geometry, 1, { ink: colors.ink });
    expect(ctx.fill).toHaveBeenCalled();

    vi.clearAllMocks();
    drawSpindle(ctx, geometry, 1, {
      stamp: colors.stamp,
      sleeve: colors.sleeve,
    });
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it("renders a full vinyl frame into canvas", () => {
    const geometry = computeGeometry(800, 600, 1);
    const ctx = mockContext() as unknown as CanvasRenderingContext2D;
    const canvas = {
      clientWidth: 800,
      clientHeight: 600,
      width: 0,
      height: 0,
    } as unknown as HTMLCanvasElement;
    const colors = { ink: "#111", stamp: "#red", sleeve: "#eee" };

    renderVinylFrame(canvas, ctx, { geometry, colors, dpr: 1 });
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });
});
