import { describe, expect, it } from "vitest";
import {
  FONT_STACK,
  PALETTE,
  RADIUS,
  RADIUS_TOKENS,
  SEMANTIC_TOKENS,
  TYPOGRAPHY,
} from "./design-tokens";

describe("design tokens", () => {
  describe("palette", () => {
    it("defines the 90s white-label promo pressing palette in OKLCH with WCAG 2.2 AA calibrated contrast", () => {
      expect(PALETTE.sleeve).toBe("oklch(0.9369 0.0083 91.49)");
      expect(PALETTE.vinyl).toBe("oklch(0.1913 0 0)");
      expect(PALETTE.stamp).toBe("oklch(0.5371 0.2035 29.91)");
      expect(PALETTE.pencil).toBe("oklch(0.5102 0.0096 91.57)");
    });
  });

  describe("semantic tokens", () => {
    it("maps surfaces and cards to sleeve paper", () => {
      expect(SEMANTIC_TOKENS.background).toBe(PALETTE.sleeve);
      expect(SEMANTIC_TOKENS.card).toBe(PALETTE.sleeve);
      expect(SEMANTIC_TOKENS.popover).toBe(PALETTE.sleeve);
      expect(SEMANTIC_TOKENS.muted).toBe(PALETTE.sleeve);
    });

    it("maps foreground and borders to vinyl black", () => {
      expect(SEMANTIC_TOKENS.foreground).toBe(PALETTE.vinyl);
      expect(SEMANTIC_TOKENS.cardForeground).toBe(PALETTE.vinyl);
      expect(SEMANTIC_TOKENS.popoverForeground).toBe(PALETTE.vinyl);
      expect(SEMANTIC_TOKENS.border).toBe(PALETTE.vinyl);
      expect(SEMANTIC_TOKENS.input).toBe(PALETTE.vinyl);
      expect(SEMANTIC_TOKENS.secondary).toBe(PALETTE.vinyl);
    });

    it("maps primary accents and rings to rubber-stamp red", () => {
      expect(SEMANTIC_TOKENS.primary).toBe(PALETTE.stamp);
      expect(SEMANTIC_TOKENS.accent).toBe(PALETTE.stamp);
      expect(SEMANTIC_TOKENS.destructive).toBe(PALETTE.stamp);
      expect(SEMANTIC_TOKENS.ring).toBe(PALETTE.stamp);
    });

    it("maps inverted foregrounds to sleeve paper", () => {
      expect(SEMANTIC_TOKENS.primaryForeground).toBe(PALETTE.sleeve);
      expect(SEMANTIC_TOKENS.secondaryForeground).toBe(PALETTE.sleeve);
      expect(SEMANTIC_TOKENS.accentForeground).toBe(PALETTE.sleeve);
    });

    it("maps muted foreground to graphite pencil grey", () => {
      expect(SEMANTIC_TOKENS.mutedForeground).toBe(PALETTE.pencil);
    });
  });

  describe("radius", () => {
    it("enforces sharp modernist 0rem corners across all scales", () => {
      expect(RADIUS).toBe("0rem");
      expect(RADIUS_TOKENS.sm).toBe("0rem");
      expect(RADIUS_TOKENS.md).toBe("0rem");
      expect(RADIUS_TOKENS.lg).toBe("0rem");
      expect(RADIUS_TOKENS.xl).toBe("0rem");
    });
  });

  describe("typography", () => {
    it("specifies the Inter Tight font stack with system fallbacks", () => {
      expect(FONT_STACK).toContain("var(--font-inter-tight)");
      expect(FONT_STACK).toContain("Helvetica Neue");
    });

    it("provides the giant poster display typography classes", () => {
      expect(TYPOGRAPHY.posterDisplay).toContain("font-bold");
      expect(TYPOGRAPHY.posterDisplay).toContain("tracking-[-0.07em]");
      expect(TYPOGRAPHY.posterDisplay).toContain("leading-[0.78]");
      expect(TYPOGRAPHY.posterDisplay).toContain("tabular-nums");
    });

    it("provides headings typography classes", () => {
      expect(TYPOGRAPHY.heading).toContain("text-3xl");
      expect(TYPOGRAPHY.heading).toContain("md:text-5xl");
      expect(TYPOGRAPHY.heading).toContain("font-bold");
      expect(TYPOGRAPHY.heading).toContain("tracking-tighter");
      expect(TYPOGRAPHY.heading).toContain("leading-[0.85]");
    });

    it("provides Swiss micro-typography label classes", () => {
      expect(TYPOGRAPHY.label).toContain("text-xs");
      expect(TYPOGRAPHY.label).toContain("font-bold");
      expect(TYPOGRAPHY.label).toContain("uppercase");
      expect(TYPOGRAPHY.label).toContain("tracking-widest");
    });

    it("provides alignment-stable tabular numerals class", () => {
      expect(TYPOGRAPHY.numeric).toBe("tabular-nums");
    });
  });
});
