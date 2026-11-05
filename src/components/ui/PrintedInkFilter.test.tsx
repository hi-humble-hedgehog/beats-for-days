import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintedInkFilter } from "./PrintedInkFilter";

function renderFilter(props: Parameters<typeof PrintedInkFilter>[0] = {}) {
  const { container } = render(<PrintedInkFilter {...props} />);
  const svg = container.querySelector("svg");
  const filter = container.querySelector("filter#printed-ink-filter");
  if (!svg || !filter) throw new Error("filter not rendered");
  return { svg, filter };
}

describe("PrintedInkFilter", () => {
  it("is hidden from assistive technology and takes no space", () => {
    const { svg } = renderFilter();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "0");
    expect(svg).toHaveAttribute("height", "0");
  });

  it("renders in sRGB with user-space primitives", () => {
    const { filter } = renderFilter();
    expect(filter).toHaveAttribute("color-interpolation-filters", "sRGB");
    expect(filter).toHaveAttribute("primitiveUnits", "userSpaceOnUse");
  });

  it("samples one paper tile at the origin with explicit size", () => {
    const { filter } = renderFilter();
    const images = filter.querySelectorAll("feImage");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("href", "/textures/paper-tile-512.jpg");
    expect(images[0]).toHaveAttribute("x", "0");
    expect(images[0]).toHaveAttribute("y", "0");
    expect(images[0]).toHaveAttribute("width", "512");
    expect(images[0]).toHaveAttribute("height", "512");
  });

  it("derives 2D warp from horizontal and vertical Sobel gradients", () => {
    const { filter } = renderFilter();
    const [gx, gy] = filter.querySelectorAll("feConvolveMatrix");
    expect(gx).toHaveAttribute("kernelMatrix", "-1 0 1 -2 0 2 -1 0 1");
    expect(gy).toHaveAttribute("kernelMatrix", "-1 -2 -1 0 0 0 1 2 1");
    for (const kernel of [gx, gy]) {
      expect(kernel).toHaveAttribute("bias", "0.5");
      expect(kernel).toHaveAttribute("preserveAlpha", "true");
    }
  });

  it("wires the tuning parameters into the primitives", () => {
    const { filter } = renderFilter({
      params: {
        edgeBleedScale: 3,
        surfaceWarpScale: 6,
        poreFrequency: 1,
        mottleFrequency: 0.05,
      },
    });
    const [bleed, warp] = filter.querySelectorAll("feDisplacementMap");
    expect(bleed).toHaveAttribute("scale", "3");
    expect(warp).toHaveAttribute("scale", "6");
    const [edgeNoise, poreNoise, mottleNoise] =
      filter.querySelectorAll("feTurbulence");
    expect(edgeNoise).toHaveAttribute("baseFrequency", "0.45");
    expect(poreNoise).toHaveAttribute("baseFrequency", "1");
    expect(mottleNoise).toHaveAttribute("baseFrequency", "0.05");
  });

  it("clips the final ink to pinhole x mottle coverage", () => {
    const { filter } = renderFilter({
      params: { poreDensity: 0.4, mottleAmount: 0.1 },
    });
    const last = filter.lastElementChild;
    expect(last?.tagName.toLowerCase()).toBe("fecomposite");
    expect(last).toHaveAttribute("operator", "in");
    expect(last).toHaveAttribute("in2", "coverage");
    expect(
      filter.querySelector("feColorMatrix[result='poreAlpha']"),
    ).toHaveAttribute(
      "values",
      "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 -2.16",
    );
    expect(
      filter.querySelector("feColorMatrix[result='mottleAlpha']"),
    ).toHaveAttribute(
      "values",
      "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.4 0 0 0 0.7",
    );
    const multiply = filter.querySelector("feComposite[result='coverage']");
    expect(multiply).toHaveAttribute("operator", "arithmetic");
    expect(multiply).toHaveAttribute("k1", "1");
  });
});
