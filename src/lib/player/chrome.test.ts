import { describe, expect, it } from "vitest";
import {
  SITE_NAV,
  shouldShowHeaderNav,
  shouldShowPersistentPlayerBar,
} from "./chrome";

describe("shouldShowHeaderNav", () => {
  it("hides the global header on poster and editorial routes", () => {
    expect(shouldShowHeaderNav("/")).toBe(false);
    expect(shouldShowHeaderNav("/beat/0001")).toBe(false);
    expect(shouldShowHeaderNav("/about")).toBe(false);
    expect(shouldShowHeaderNav("/terms-of-service")).toBe(false);
    expect(shouldShowHeaderNav("/privacy-policy")).toBe(false);
    expect(shouldShowHeaderNav("/generate")).toBe(false);
  });

  it("keeps the header only on the /beats redirect route", () => {
    expect(shouldShowHeaderNav("/beats")).toBe(true);
    expect(shouldShowHeaderNav("/unknown")).toBe(false);
  });
});

describe("shouldShowPersistentPlayerBar", () => {
  it("hides the bar on the landing poster, valid beat poster, and poster info routes", () => {
    expect(shouldShowPersistentPlayerBar("/")).toBe(false);
    expect(shouldShowPersistentPlayerBar("/about")).toBe(false);
    expect(shouldShowPersistentPlayerBar("/privacy")).toBe(false);
    expect(shouldShowPersistentPlayerBar("/beat/0001")).toBe(false);
    expect(shouldShowPersistentPlayerBar("/beat/0001", null)).toBe(false);
  });

  it("shows the bar on editorial 404 pages and missing-beat 404s", () => {
    expect(shouldShowPersistentPlayerBar("/generate")).toBe(true);
    expect(shouldShowPersistentPlayerBar("/beat/missing", "missing")).toBe(
      true,
    );
  });
});

describe("SITE_NAV", () => {
  it("lists About and Privacy in order", () => {
    expect(SITE_NAV.map((item) => item.label)).toEqual(["About", "Privacy"]);
  });
});
