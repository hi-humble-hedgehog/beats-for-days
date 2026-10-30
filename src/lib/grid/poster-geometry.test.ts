import { describe, expect, it } from "vitest";
import {
  BAND_GUTTER,
  BARS_PER_SLICE,
  FULL_TURN,
  MODULE,
  bandInner,
  bandOuter,
  bandWidth,
  buildConcentricBands,
  computeGeometry,
  computeGridMetrics,
  computeHitboxRects,
  computeInnerBars,
  gutterMid,
  visibleSpans,
} from "./poster-geometry";

describe("band metrics", () => {
  it("doubles band widths from 8px through 512px", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(bandWidth)).toEqual([
      8, 16, 32, 64, 128, 256, 512,
    ]);
  });

  it("stacks inner and outer radii with a 2px gutter", () => {
    expect(bandInner(0, 100)).toBe(100);
    expect(bandOuter(0, 100)).toBe(108);
    expect(gutterMid(0, 100)).toBe(109);
    expect(bandInner(1, 100)).toBe(110);
    expect(bandOuter(1, 100)).toBe(126);
    expect(gutterMid(1, 100)).toBe(127);
  });
});

describe("visibleSpans", () => {
  it("returns the full arc when there is no cut", () => {
    expect(visibleSpans(0, FULL_TURN, null)).toEqual([[0, FULL_TURN]]);
  });

  it("splits an arc around a title cut", () => {
    expect(visibleSpans(0, 4, { lo: 1, hi: 2 })).toEqual([
      [0, 1],
      [2, 4],
    ]);
  });

  it("keeps only the uncovered sides when the cut clips an end", () => {
    expect(visibleSpans(0, 2, { lo: 1.5, hi: 3 })).toEqual([[0, 1.5]]);
    expect(visibleSpans(1, 4, { lo: 0, hi: 2 })).toEqual([[2, 4]]);
  });

  it("returns no spans when the cut covers the whole arc", () => {
    expect(visibleSpans(1, 2, { lo: 0, hi: 3 })).toEqual([]);
    expect(visibleSpans(1, 2, { lo: 1, hi: 2 })).toEqual([]);
    expect(visibleSpans(1, 2, { lo: 0, hi: 2 })).toEqual([]);
  });
});

describe("computeGridMetrics", () => {
  it("uses a 12×8 desktop module with a gutter-aligned pivot", () => {
    const g = computeGridMetrics(1280, 800);
    expect(g.mobile).toBe(false);
    expect(g.cols).toBe(12);
    expect(g.rows).toBe(8);
    expect(g.margin).toBe(32);
    expect(g.gap).toBe(16);
    expect(g.colW).toBeCloseTo(1040 / 12, 8);
    expect(g.rowH).toBe(78);
    expect(g.px).toBeCloseTo(32 + 5 * (g.colW + 16) - 8, 8);
    expect(g.py).toBe(494);
  });

  it("uses a 6×10 mobile module under 768px", () => {
    const g = computeGridMetrics(375, 667);
    expect(g.mobile).toBe(true);
    expect(g.cols).toBe(6);
    expect(g.rows).toBe(10);
    expect(g.margin).toBe(16);
    expect(g.gap).toBe(12);
    expect(g.px).toBeCloseTo(16 + 1 * (g.colW + 12) - 6, 8);
  });
});

describe("computeGeometry", () => {
  it("is deterministic for the same viewport and seed", () => {
    const a = computeGeometry(1280, 800, 1);
    const b = computeGeometry(1280, 800, 1);
    expect(a).toEqual(b);
    expect(a.rings).toBe(7);
    expect(a.startCols).toBe(2);
    expect(a.start).toBe(188);
    expect(a.numberSize).toBeCloseTo(112.94117647058823, 8);
    expect(a.px).toBeCloseTo(537.3333333333334, 8);
    expect(a.py).toBe(494);
    expect(a.titleRects).toEqual([
      { x0: 26, y0: 26, x1: 204, y1: 122 },
      { x0: 26, y0: 122, x1: 250, y1: 189 },
    ]);
    expect(a.bands.map((band) => band.k)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(a.bands[0]).toEqual({
      k: 0,
      inner: 188,
      outer: 196,
      from: 0.1963495408493623,
      to: 4.123340357836604,
      cut: null,
    });
    expect(a.bands[4]?.cut).toEqual({
      lo: 1.7671458676442584,
      hi: 2.9452431127404313,
    });
    expect(a.bands[5]?.cut).toEqual({
      lo: 2.1598449493429825,
      hi: 2.748893571891069,
    });
    expect(a.barBase).toBe(186);
    expect(a.bars).toHaveLength(64);
  });

  it("changes poster cuts when the beat seed changes", () => {
    const a = computeGeometry(1280, 800, 1);
    const b = computeGeometry(1280, 800, 99);
    expect(a.bands.map((band) => band.cut)).not.toEqual(
      b.bands.map((band) => band.cut),
    );
  });

  it("keeps resting bars inside the first ring and on the 11.25° module", () => {
    const g = computeGeometry(1280, 800, 7);
    const first = g.bands[0];
    expect(first).toBeDefined();
    expect(g.barBase).toBe(g.start - BAND_GUTTER);
    expect(g.bars).toHaveLength(
      Math.round(FULL_TURN / (MODULE / BARS_PER_SLICE)),
    );
    expect(g.titleRects.length).toBe(2);
    expect(g.uiRects.length).toBe(2);
  });

  it("omits the desktop tag hitbox on mobile and locks start to two columns", () => {
    const g = computeGeometry(390, 844, 3);
    expect(g.mobile).toBe(true);
    expect(g.startCols).toBe(2);
    expect(g.titleRects).toHaveLength(1);
    expect(g.numberSize).toBeGreaterThanOrEqual(56);
  });

  it("snaps title cuts away from the horizontal and vertical axes", () => {
    const g = computeGeometry(1280, 800, 4);
    const cut = g.bands.find((band) => band.cut)?.cut;
    expect(cut).toBeDefined();
    if (!cut) return;
    const loQuarter = cut.lo / (Math.PI / 2);
    const hiQuarter = cut.hi / (Math.PI / 2);
    expect(Math.abs(loQuarter - Math.round(loQuarter))).toBeGreaterThan(1e-6);
    expect(Math.abs(hiQuarter - Math.round(hiQuarter))).toBeGreaterThan(1e-6);
  });
});

describe("buildConcentricBands and inner bar helpers", () => {
  it("stops adding bands once a ring would miss the viewport", () => {
    const metrics = computeGridMetrics(320, 600);
    const hitboxes = computeHitboxRects(metrics, 1);
    const bands = buildConcentricBands(metrics, hitboxes, 1);
    expect(bands.length).toBeGreaterThanOrEqual(5);
    expect(bands.length).toBeLessThanOrEqual(16);
    expect(bands[0]?.inner).toBe(hitboxes.start);
  });

  it("builds 64 resting marker bars inside the first band", () => {
    const inner = computeInnerBars(80);
    expect(inner.barBase).toBe(80 - BAND_GUTTER);
    expect(inner.bars).toHaveLength(64);
    expect(inner.bars[0]).toEqual({ from: 0, to: MODULE / 2 });
  });

  it("anchors start radius to the smaller module on ultrawide viewports", () => {
    const metrics = computeGridMetrics(2560, 1080);
    expect(metrics.colW).toBeGreaterThan(metrics.rowH);
    const hitboxes = computeHitboxRects(metrics, 1);
    const expectedModule = Math.min(metrics.colW, metrics.rowH);
    expect(hitboxes.start).toBe(
      hitboxes.startCols * (expectedModule + metrics.gap),
    );
  });

  it("projects UI cuts onto outer bands so ultrawide rings do not collapse into full circles", () => {
    const metrics = computeGridMetrics(2560, 1080);
    const hitboxes = computeHitboxRects(metrics, 1);
    const bands = buildConcentricBands(metrics, hitboxes, 1);
    for (const band of bands) {
      const drawnAngle =
        band.to >= band.from
          ? band.to - band.from
          : band.to + FULL_TURN - band.from;
      expect(drawnAngle).toBeLessThan(FULL_TURN - 1e-6);
    }
  });
});
