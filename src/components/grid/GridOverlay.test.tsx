import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeGeometry } from "@/lib/grid/poster-geometry";
import { GridOverlay } from "./GridOverlay";

describe("GridOverlay", () => {
  it("renders the Tonhalle 1955 specification caption", () => {
    const geometry = computeGeometry(1280, 800, 1);
    const { container } = render(<GridOverlay geometry={geometry} />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.textContent).toContain(
      "AFTER MÜLLER-BROCKMANN, TONHALLE 1955",
    );
    expect(container.textContent).not.toContain("BAND WIDTHS");
    expect(container.textContent).toContain("11.25°");
  });
});
