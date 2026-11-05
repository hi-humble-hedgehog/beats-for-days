import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRINTED_INK_PARAMS,
  mottleAlphaMatrix,
  PAPER_TILE,
  poreAlphaMatrix,
  PRINTED_INK_FILTER_ID,
  resolvePrintedInkParams,
} from "./printed-ink";

describe("printed ink constants", () => {
  it("exposes the filter id referenced by the .printed-ink CSS class", () => {
    expect(PRINTED_INK_FILTER_ID).toBe("printed-ink-filter");
  });

  it("points at the same-origin 512px paper tile", () => {
    expect(PAPER_TILE).toEqual({
      href: "/textures/paper-tile-512.jpg",
      size: 512,
    });
  });

  it("uses the tuned defaults", () => {
    expect(DEFAULT_PRINTED_INK_PARAMS).toEqual({
      edgeBleedFrequency: 0.45,
      edgeBleedScale: 1.6,
      surfaceWarpScale: 3,
      poreFrequency: 0.35,
      poreDensity: 0.3,
      mottleFrequency: 0.012,
      mottleAmount: 0.03,
    });
  });
});

describe("resolvePrintedInkParams", () => {
  it("returns the defaults when no overrides are given", () => {
    expect(resolvePrintedInkParams()).toEqual(DEFAULT_PRINTED_INK_PARAMS);
  });

  it("applies in-range overrides verbatim", () => {
    expect(
      resolvePrintedInkParams({ edgeBleedScale: 3, poreDensity: 0.5 }),
    ).toEqual({
      ...DEFAULT_PRINTED_INK_PARAMS,
      edgeBleedScale: 3,
      poreDensity: 0.5,
    });
  });

  it("clamps every parameter to its documented range", () => {
    expect(
      resolvePrintedInkParams({
        edgeBleedFrequency: 0,
        edgeBleedScale: 99,
        surfaceWarpScale: -1,
        poreFrequency: 5,
        poreDensity: -3,
        mottleFrequency: 1,
        mottleAmount: 2,
      }),
    ).toEqual({
      edgeBleedFrequency: 0.25,
      edgeBleedScale: 3.5,
      surfaceWarpScale: 0,
      poreFrequency: 1.2,
      poreDensity: 0,
      mottleFrequency: 0.1,
      mottleAmount: 0.3,
    });
  });

  it("keeps the inclusive range boundaries", () => {
    expect(
      resolvePrintedInkParams({
        edgeBleedFrequency: 0.7,
        edgeBleedScale: 0,
        surfaceWarpScale: 8,
        poreFrequency: 0.1,
        poreDensity: 1,
        mottleFrequency: 0.002,
        mottleAmount: 0,
      }),
    ).toEqual({
      edgeBleedFrequency: 0.7,
      edgeBleedScale: 0,
      surfaceWarpScale: 8,
      poreFrequency: 0.1,
      poreDensity: 1,
      mottleFrequency: 0.002,
      mottleAmount: 0,
    });
  });

  it("falls back to the default for non-finite overrides", () => {
    expect(
      resolvePrintedInkParams({ poreDensity: Number.NaN }).poreDensity,
    ).toBe(0.3);
  });
});

describe("poreAlphaMatrix", () => {
  it("opens sharp pinholes only below the noise cutoff", () => {
    // density 0.4 -> cutoff 0.1 + 0.2 * 0.4 = 0.18; alpha = 12 * (R - 0.18)
    expect(poreAlphaMatrix(0.4)).toBe(
      "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 -2.16",
    );
  });

  it("keeps a minimal 0.1 cutoff at zero density", () => {
    expect(poreAlphaMatrix(0)).toBe(
      "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 -1.2",
    );
  });
});

describe("mottleAlphaMatrix", () => {
  it("dips coverage gently around the noise mean", () => {
    // alpha = 1 - 3m + 4m * R; m = 0.1 -> 0.4 * R + 0.7
    expect(mottleAlphaMatrix(0.1)).toBe(
      "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.4 0 0 0 0.7",
    );
  });

  it("is fully opaque at zero amount", () => {
    expect(mottleAlphaMatrix(0)).toBe(
      "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1",
    );
  });
});
