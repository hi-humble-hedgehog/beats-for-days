import { describe, expect, it } from "vitest";
import { isShortcutBlockedTarget, resolvePosterShortcut } from "./shortcuts";

function el(tagName: string, isContentEditable = false): EventTarget {
  return { tagName, isContentEditable } as unknown as EventTarget;
}

function key(
  name: string,
  target: EventTarget | null = el("DIV"),
  mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {},
) {
  return resolvePosterShortcut({
    key: name,
    metaKey: mods.metaKey ?? false,
    ctrlKey: mods.ctrlKey ?? false,
    altKey: mods.altKey ?? false,
    target,
  });
}

describe("isShortcutBlockedTarget", () => {
  it("blocks fields, buttons, links, and contenteditable nodes", () => {
    for (const tag of ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]) {
      expect(isShortcutBlockedTarget(el(tag))).toBe(true);
    }
    expect(isShortcutBlockedTarget(el("DIV", true))).toBe(true);
    expect(isShortcutBlockedTarget(el("DIV"))).toBe(false);
    expect(isShortcutBlockedTarget(null)).toBe(false);
    expect(
      isShortcutBlockedTarget(undefined as unknown as EventTarget | null),
    ).toBe(false);
    expect(isShortcutBlockedTarget(42 as unknown as EventTarget)).toBe(false);
  });
});

describe("resolvePosterShortcut", () => {
  it("maps play, previous, and next keys while ignoring g and other keys", () => {
    expect(key("g")).toBeNull();
    expect(key("G")).toBeNull();
    expect(key(" ")).toBe("toggle");
    expect(key("Spacebar")).toBe("toggle");
    expect(key("ArrowLeft")).toBe("previous");
    expect(key("ArrowRight")).toBe("next");
    expect(key("Escape")).toBeNull();
  });

  it("ignores modifier chords and blocked targets", () => {
    expect(key(" ", el("DIV"), { metaKey: true })).toBeNull();
    expect(key(" ", el("DIV"), { ctrlKey: true })).toBeNull();
    expect(key(" ", el("DIV"), { altKey: true })).toBeNull();
    expect(key(" ", el("BUTTON"))).toBeNull();
    expect(key("ArrowLeft", el("INPUT"))).toBeNull();
  });
});
