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

  it("renders poster player shell on 404 missing beat route without persistent player bar", () => {
    renderChrome({
      pathname: "/beat/missing",
      notFoundBeatId: "missing",
      children: <h2>404 — Beat Not Found</h2>,
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "404 — Beat Not Found" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Persistent Audio Player" }),
    ).not.toBeInTheDocument();
  });

  it("renders children directly on admin route without poster player shell", () => {
    renderChrome({
      pathname: "/admin",
      children: <span data-testid="admin-content">Admin Dashboard</span>,
    });

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Beats for Days" }),
    ).not.toBeInTheDocument();
  });
});
