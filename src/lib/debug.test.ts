import { describe, expect, it } from "vitest";
import { isDebugQueryEnabled } from "./debug";

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
