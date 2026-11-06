import { describe, expect, it } from "vitest";
import { SITE_NAV, shouldShowPosterPlayer } from "./chrome";

describe("shouldShowPosterPlayer", () => {
  it("renders poster player on root, beat, about, privacy, and 404 routes", () => {
    expect(shouldShowPosterPlayer("/")).toBe(true);
    expect(shouldShowPosterPlayer("/beat/0001")).toBe(true);
    expect(shouldShowPosterPlayer("/about")).toBe(true);
    expect(shouldShowPosterPlayer("/privacy")).toBe(true);
    expect(shouldShowPosterPlayer("/generate")).toBe(true);
    expect(shouldShowPosterPlayer("/beat/missing")).toBe(true);
    expect(shouldShowPosterPlayer("/unknown")).toBe(true);
  });

  it("hides poster player on admin routes", () => {
    expect(shouldShowPosterPlayer("/admin")).toBe(false);
    expect(shouldShowPosterPlayer("/admin/tracks")).toBe(false);
  });
});

describe("SITE_NAV", () => {
  it("lists About and Privacy in order", () => {
    expect(SITE_NAV.map((item) => item.label)).toEqual(["About", "Privacy"]);
  });
});
