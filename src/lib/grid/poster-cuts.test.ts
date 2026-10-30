import { describe, expect, it } from "vitest";
import {
  applyUiCut,
  hitboxCut,
  isVisible,
  keepLeftOfPivot,
  rand,
  staggerCut,
} from "./poster-cuts";
import { FULL_TURN, MODULE } from "./poster-model";

describe("rand", () => {
  it("returns a stable 0..1 value for a seed and salt", () => {
    expect(rand(1, 0)).toBe(0.32712146849371493);
    expect(rand(1, 1)).toBe(0.0601814491674304);
    expect(rand(0, 0)).toBe(0.11688531329855323);
    expect(rand(2, 0)).toBe(0.12634581793099642);
    expect(rand(1, 0)).toBe(rand(1, 0));
    expect(rand(1, 0)).not.toBe(rand(1, 1));
    expect(rand(1, 0)).not.toBe(rand(0, 0));
  });
});

describe("hitboxCut", () => {
  it("returns null for an empty, inverted, or missed ring", () => {
    const pivot = { x: 100, y: 100 };
    const ring = { rIn: 50, rOut: 70 };
    expect(
      hitboxCut({
        rects: [],
        pivot,
        ring,
        unwrap: false,
      }),
    ).toBeNull();
    expect(
      hitboxCut({
        rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }],
        pivot,
        ring: { rIn: 20, rOut: 10 },
        unwrap: false,
      }),
    ).toBeNull();
    expect(
      hitboxCut({
        rects: [{ x0: 300, y0: 300, x1: 320, y1: 320 }],
        pivot,
        ring,
        unwrap: false,
      }),
    ).toBeNull();
  });

  it("snaps the intersecting rect onto the 11.25° module", () => {
    expect(
      hitboxCut({
        rects: [{ x0: 150, y0: 90, x1: 170, y1: 110 }],
        pivot: { x: 100, y: 100 },
        ring: { rIn: 50, rOut: 70 },
        unwrap: false,
      }),
    ).toEqual({
      lo: -MODULE,
      hi: FULL_TURN + MODULE,
    });
  });
});

describe("keepLeftOfPivot", () => {
  it("clamps a south-crossing cut and leaves earlier cuts alone", () => {
    expect(keepLeftOfPivot(null)).toBeNull();
    expect(keepLeftOfPivot({ lo: 1, hi: 2 })).toEqual({ lo: 1, hi: 2 });
    expect(keepLeftOfPivot({ lo: Math.PI * 1.5, hi: 4 })).toEqual({
      lo: Math.PI * 1.5 - MODULE,
      hi: 4,
    });
  });
});

describe("staggerCut and applyUiCut", () => {
  it("returns null or a full turn when there is no raw cut", () => {
    expect(staggerCut(null, { lo: 1, hi: 1 })).toBeNull();
    expect(applyUiCut(null, { lo: 0, hi: 0 })).toEqual({
      from: 0,
      to: FULL_TURN,
    });
  });

  it("nudges axis-aligned edges off the cardinal rays", () => {
    expect(
      staggerCut({ lo: Math.PI / 2, hi: Math.PI }, { lo: 0, hi: 0 }),
    ).toEqual({
      lo: Math.PI / 2 - MODULE,
      hi: Math.PI + MODULE,
    });
  });

  it("converts a staggered player cut into the drawn sweep", () => {
    expect(applyUiCut({ lo: 1, hi: 2 }, { lo: 0, hi: 0 })).toEqual({
      from: 2 - FULL_TURN,
      to: 1,
    });
  });
});

describe("isVisible", () => {
  it("keeps a band whose rays clear the inner radius", () => {
    expect(
      isVisible({
        band: {
          k: 0,
          inner: 10,
          outer: 20,
          from: 0,
          to: FULL_TURN,
          cut: null,
        },
        size: { w: 200, h: 200 },
        pivot: { x: 100, y: 100 },
      }),
    ).toBe(true);
  });

  it("drops a band that sits beyond every viewport ray", () => {
    expect(
      isVisible({
        band: {
          k: 0,
          inner: 500,
          outer: 600,
          from: 0,
          to: FULL_TURN,
          cut: null,
        },
        size: { w: 200, h: 200 },
        pivot: { x: 100, y: 100 },
      }),
    ).toBe(false);
  });

  it("drops a band whose only spans are fully cut away", () => {
    expect(
      isVisible({
        band: {
          k: 0,
          inner: 10,
          outer: 20,
          from: 0,
          to: FULL_TURN,
          cut: { lo: -1, hi: 10 },
        },
        size: { w: 200, h: 200 },
        pivot: { x: 100, y: 100 },
      }),
    ).toBe(false);
  });
});
