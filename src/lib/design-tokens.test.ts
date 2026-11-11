import { describe, expect, it } from "vitest";
import { PALETTE } from "./design-tokens";

describe("design tokens", () => {
  describe("palette", () => {
    it("defines the 90s white-label promo pressing palette in OKLCH with WCAG 2.2 AA calibrated contrast", () => {
      expect(PALETTE.sleeve).toBe("oklch(0.9369 0.0083 91.49)");
      expect(PALETTE.vinyl).toBe("oklch(0.1913 0 0)");
      expect(PALETTE.stamp).toBe("oklch(0.5371 0.2035 29.91)");
      expect(PALETTE.pencil).toBe("oklch(0.5102 0.0096 91.57)");
    });
  });
});
