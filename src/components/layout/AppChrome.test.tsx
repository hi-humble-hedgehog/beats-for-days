import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppChrome } from "./AppChrome";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

function renderChrome(opts: {
  pathname: string;
  notFoundBeatId?: string | null;
  children: React.ReactNode;
}) {
  mockUsePathname.mockReturnValue(opts.pathname);
  return render(
    <AudioPlayerContext.Provider
      value={{
        current: null,
        isPlaying: false,
        secondsRemaining: 0,
        isLoading: false,
        error: null,
        notFoundBeatId: opts.notFoundBeatId ?? null,
        togglePlay: vi.fn(),
        advanceTrack: vi.fn(),
      }}
    >
      <AppChrome>{opts.children}</AppChrome>
    </AudioPlayerContext.Provider>,
  );
}

describe("AppChrome", () => {
  it("renders poster player shell on home route without persistent player bar", () => {
    renderChrome({
      pathname: "/",
      children: <span data-testid="child-content">Home Slot</span>,
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Persistent Audio Player" }),
    ).not.toBeInTheDocument();
  });

  it("renders editorial container and persistent bar on 404 missing beat route", () => {
    renderChrome({
      pathname: "/beat/missing",
      notFoundBeatId: "missing",
      children: <h1>404 — Beat Not Found</h1>,
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "404 — Beat Not Found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Persistent Audio Player" }),
    ).toBeInTheDocument();
  });
});
