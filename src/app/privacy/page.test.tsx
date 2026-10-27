import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrivacyPage from "./page";
import { AppChrome } from "@/components/layout/AppChrome";
import { AudioPlayerContext } from "@/components/audio/AudioPlayerContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/privacy",
}));

function renderPrivacy() {
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
        <PrivacyPage />
      </AppChrome>
    </AudioPlayerContext.Provider>,
  );
}

describe("PrivacyPage", () => {
  it("renders Privacy & Data heading and controller summary within the poster player", () => {
    renderPrivacy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Privacy & Data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/stream run by Rick van Mook/i),
    ).toBeInTheDocument();
  });

  it("renders Tracking and Contact items and omits disabled generation waitlist", () => {
    renderPrivacy();
    expect(screen.queryByText(/Waitlist:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Tracking:/i)).toBeInTheDocument();
    const mailLink = screen.getByRole("link", { name: "rick@beatsfordays.ai" });
    expect(mailLink).toHaveAttribute("href", "mailto:rick@beatsfordays.ai");
  });
});
