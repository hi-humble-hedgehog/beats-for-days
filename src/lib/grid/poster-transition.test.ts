import { describe, expect, it } from "vitest";
import { computeGeometry } from "./poster-geometry";
import { interpolateCut, interpolateGeometry } from "./poster-transition";

describe("poster-transition", () => {
  const geomA = computeGeometry(1280, 800, 1);
  const geomB = computeGeometry(1280, 800, 2);

  describe("interpolateCut", () => {
    it("returns null when neither band has a cut", () => {
      expect(interpolateCut(null, null, 0.5)).toBeNull();
    });

    it("interpolates directly when both cuts exist", () => {
      const cutA = { lo: 0.2, hi: 0.6 };
      const cutB = { lo: 0.4, hi: 0.8 };
      const mid = interpolateCut(cutA, cutB, 0.5);
      expect(mid?.lo).toBeCloseTo(0.3);
      expect(mid?.hi).toBeCloseTo(0.7);
    });

    it("smoothly opens a cut from its center when only the target has a cut", () => {
      const cutB = { lo: 0.2, hi: 0.6 };
      const start = interpolateCut(null, cutB, 0);
      const mid = interpolateCut(null, cutB, 0.5);
      const end = interpolateCut(null, cutB, 1);

      expect(start?.lo).toBeCloseTo(0.4);
      expect(start?.hi).toBeCloseTo(0.4);
      expect(mid?.lo).toBeCloseTo(0.3);
      expect(mid?.hi).toBeCloseTo(0.5);
      expect(end?.lo).toBeCloseTo(0.2);
      expect(end?.hi).toBeCloseTo(0.6);
    });

    it("smoothly closes a cut to its center when only the source has a cut", () => {
      const cutA = { lo: 0.2, hi: 0.6 };
      const start = interpolateCut(cutA, null, 0);
      const mid = interpolateCut(cutA, null, 0.5);
      const end = interpolateCut(cutA, null, 1);

      expect(start?.lo).toBeCloseTo(0.2);
      expect(start?.hi).toBeCloseTo(0.6);
      expect(mid?.lo).toBeCloseTo(0.3);
      expect(mid?.hi).toBeCloseTo(0.5);
      expect(end).toBeNull();
    });
  });

  describe("interpolateGeometry", () => {
    it("returns source geometry at t = 0", () => {
      const result = interpolateGeometry(geomA, geomB, 0);
      expect(result.start).toBeCloseTo(geomA.start);
      expect(result.barBase).toBeCloseTo(geomA.barBase);
      expect(result.bands[0]?.inner).toBeCloseTo(geomA.bands[0]?.inner ?? 0);
      expect(result.bands[0]?.from).toBeCloseTo(geomA.bands[0]?.from ?? 0);
    });

    it("returns target geometry at t = 1", () => {
      const result = interpolateGeometry(geomA, geomB, 1);
      expect(result.start).toBeCloseTo(geomB.start);
      expect(result.barBase).toBeCloseTo(geomB.barBase);
      expect(result.bands[0]?.inner).toBeCloseTo(geomB.bands[0]?.inner ?? 0);
      expect(result.bands[0]?.from).toBeCloseTo(geomB.bands[0]?.from ?? 0);
    });

    it("interpolates start radius, barBase, and band bounds at t = 0.5", () => {
      const result = interpolateGeometry(geomA, geomB, 0.5);
      expect(result.start).toBeCloseTo((geomA.start + geomB.start) / 2);
      expect(result.barBase).toBeCloseTo((geomA.barBase + geomB.barBase) / 2);
      expect(result.startCols).toBeCloseTo(
        (geomA.startCols + geomB.startCols) / 2,
      );
      expect(result.numberSize).toBeCloseTo(
        (geomA.numberSize + geomB.numberSize) / 2,
      );

      const firstA = geomA.bands[0];
      const firstB = geomB.bands[0];
      const firstRes = result.bands[0];
      expect(firstA && firstB && firstRes).toBeDefined();
      if (firstA && firstB && firstRes) {
        expect(firstRes.from).toBeCloseTo((firstA.from + firstB.from) / 2);
        expect(firstRes.to).toBeCloseTo((firstA.to + firstB.to) / 2);
        expect(firstRes.inner).toBeCloseTo((firstA.inner + firstB.inner) / 2);
        expect(firstRes.outer).toBeCloseTo((firstA.outer + firstB.outer) / 2);
      }
    });

    it("clamps progress between 0 and 1", () => {
      const below = interpolateGeometry(geomA, geomB, -0.5);
      const above = interpolateGeometry(geomA, geomB, 1.5);
      expect(below.start).toBeCloseTo(geomA.start);
      expect(above.start).toBeCloseTo(geomB.start);
    });

    it("handles geometries with different numbers of bands cleanly", () => {
      const mockA = { ...geomA, bands: geomA.bands.slice(0, 5), rings: 5 };
      const mockB = { ...geomB, bands: geomB.bands.slice(0, 7), rings: 7 };

      const result = interpolateGeometry(mockA, mockB, 0.5);
      expect(result.bands.length).toBe(7);
      expect(result.rings).toBe(7);

      for (const band of result.bands) {
        expect(Number.isNaN(band.inner)).toBe(false);
        expect(Number.isNaN(band.outer)).toBe(false);
        expect(band.outer).toBeGreaterThanOrEqual(band.inner);
      }
    });
  });
});
