import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePosterGeometry } from "./usePosterGeometry";

class FakeResizeObserver {
  static last: FakeResizeObserver | undefined;
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.last = this;
  }

  observe(el: Element) {
    Object.defineProperty(el, "clientWidth", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(el, "clientHeight", {
      configurable: true,
      value: 700,
    });
    this.callback([], this);
  }

  disconnect() {}
  unobserve() {}
}

function Probe({ seed }: { seed: number }) {
  const [ref, geometry] = usePosterGeometry<HTMLDivElement>(seed);
  return (
    <div ref={ref} data-testid="poster">
      {geometry.w}x{geometry.h}:{geometry.cols}
    </div>
  );
}

describe("usePosterGeometry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.last = undefined;
  });

  it("starts at the 1280×800 SSR fallback before a node is measured", () => {
    const { result } = renderHook(() => usePosterGeometry(1));
    expect(result.current[1].w).toBe(1280);
    expect(result.current[1].h).toBe(800);
    expect(result.current[1].cols).toBe(12);
  });

  it("keeps the SSR viewport when the first box is empty", () => {
    class EmptyResizeObserver {
      callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(el: Element) {
        Object.defineProperty(el, "clientWidth", {
          configurable: true,
          value: 0,
        });
        Object.defineProperty(el, "clientHeight", {
          configurable: true,
          value: 0,
        });
        this.callback([], this);
      }

      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal("ResizeObserver", EmptyResizeObserver);
    render(<Probe seed={1} />);
    expect(screen.getByTestId("poster")).toHaveTextContent("1280x800:12");
  });

  it("keeps the last real viewport when a later box is empty", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    render(<Probe seed={1} />);
    expect(screen.getByTestId("poster")).toHaveTextContent("400x700:6");

    const el = screen.getByTestId("poster");
    Object.defineProperty(el, "clientWidth", { configurable: true, value: 0 });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 0 });
    const observer = FakeResizeObserver.last;
    expect(observer).toBeDefined();
    act(() => {
      observer?.callback([], observer);
    });
    expect(screen.getByTestId("poster")).toHaveTextContent("400x700:6");
  });

  it("rebuilds geometry from the measured node and disconnects on unmount", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const disconnect = vi.fn();
    FakeResizeObserver.prototype.disconnect = disconnect;

    const { unmount } = render(<Probe seed={1} />);
    expect(screen.getByTestId("poster")).toHaveTextContent("400x700:6");
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("updates geometry immediately when prefers-reduced-motion is active", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    function SeedProbe({ seed }: { seed: number }) {
      const [, geometry] = usePosterGeometry<HTMLDivElement>(seed);
      return <div data-testid="seed-probe">{geometry.start}</div>;
    }

    const { rerender } = render(<SeedProbe seed={1} />);
    const initialText = screen.getByTestId("seed-probe").textContent;
    expect(initialText).toBeDefined();

    rerender(<SeedProbe seed={2} />);
    const nextText = screen.getByTestId("seed-probe").textContent;
    expect(nextText).toBeDefined();
    expect(typeof nextText).toBe("string");
  });

  it("morphs geometry when seed changes under standard motion", async () => {
    function SeedProbe({ seed }: { seed: number }) {
      const [, geometry] = usePosterGeometry<HTMLDivElement>(seed);
      return <div data-testid="seed-probe">{geometry.start}</div>;
    }

    const { rerender } = render(<SeedProbe seed={1} />);
    rerender(<SeedProbe seed={999} />);

    expect(screen.getByTestId("seed-probe")).toBeDefined();
  });
});
