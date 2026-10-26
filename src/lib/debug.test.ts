import { describe, expect, it } from "vitest";
import { isDebugQueryEnabled, shouldRenderDebugGate } from "./debug";

describe("isDebugQueryEnabled", () => {
  it("is true only when debug=1", () => {
    expect(isDebugQueryEnabled(new URLSearchParams("debug=1"))).toBe(true);
    expect(isDebugQueryEnabled(new URLSearchParams("a=b&debug=1"))).toBe(true);
  });

  it("is false for other values, a missing flag, or no params", () => {
    expect(isDebugQueryEnabled(new URLSearchParams("debug=0"))).toBe(false);
    expect(isDebugQueryEnabled(new URLSearchParams("debug=true"))).toBe(false);
    expect(isDebugQueryEnabled(new URLSearchParams(""))).toBe(false);
    expect(isDebugQueryEnabled(null)).toBe(false);
  });
});

describe("shouldRenderDebugGate", () => {
  it("returns true when query has debug=1 even if cookie is unset", () => {
    expect(
      shouldRenderDebugGate({
        hasQueryFlag: true,
        hasCookie: false,
      }),
    ).toBe(true);
  });

  it("returns true when cookie is enabled even if query flag is absent", () => {
    expect(
      shouldRenderDebugGate({
        hasQueryFlag: false,
        hasCookie: true,
      }),
    ).toBe(true);
  });

  it("returns false when neither query flag nor cookie is enabled", () => {
    expect(
      shouldRenderDebugGate({
        hasQueryFlag: false,
        hasCookie: false,
      }),
    ).toBe(false);
  });
});
