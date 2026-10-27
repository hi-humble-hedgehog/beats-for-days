import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPage from "./page";
import { AppChrome } from "@/components/layout/AppChrome";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/about",
}));

function renderAbout() {
  return render(
    <AudioPlayerContext.Provider
      value={{
        current: null,
        isPlaying: false,
        secondsRemaining: 0,
        isLoading: false,
        error: null,
        togglePlay: vi.fn(),
        advanceTrack: vi.fn(),
      }}
    >
      <AppChrome>
        <AboutPage />
      </AppChrome>
    </AudioPlayerContext.Provider>,
  );
}

describe("AboutPage", () => {
  it("renders the big poster player with About text instead of beat number", () => {
    renderAbout();
    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "About Beats for Days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/infinite generative 90s boom bap radio experience/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to player" }),
    ).toBeInTheDocument();
  });
});
