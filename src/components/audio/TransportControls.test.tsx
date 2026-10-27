import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransportControls } from "./TransportControls";

const handlers = {
  onToggle: vi.fn(),
  onNext: vi.fn(),
  onPrevious: vi.fn(),
  onToggleMute: vi.fn(),
  onToggleGrid: vi.fn(),
};

describe("TransportControls", () => {
  it("exposes play, mute, grid, and information links without seek slider", () => {
    render(
      <TransportControls
        isPlaying={false}
        muted={false}
        showGrid={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Next beat" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous beat" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    fireEvent.click(screen.getByRole("button", { name: "Grid" }));
    expect(handlers.onToggle).toHaveBeenCalled();
    expect(handlers.onNext).toHaveBeenCalled();
    expect(handlers.onPrevious).toHaveBeenCalled();
    expect(handlers.onToggleMute).toHaveBeenCalled();
    expect(handlers.onToggleGrid).toHaveBeenCalled();

    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    expect(
      screen.getByRole("navigation", { name: "Information" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(
      screen.queryByRole("link", { name: "Generate" }),
    ).not.toBeInTheDocument();
  });

  it("switches pause and unmute labels while pressed", () => {
    render(<TransportControls isPlaying muted showGrid {...handlers} />);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmute" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const gridButton = screen.getByRole("button", { name: "Grid" });
    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(gridButton).not.toHaveAttribute("aria-keyshortcuts");
  });

  it("marks the active section link and points it to returnHref", () => {
    render(
      <TransportControls
        isPlaying={false}
        muted={false}
        showGrid={false}
        activeSection="about"
        returnHref="/beat/0002"
        {...handlers}
      />,
    );
    const aboutLink = screen.getByRole("link", { name: "About" });
    expect(aboutLink).toHaveAttribute("href", "/beat/0002");
    expect(aboutLink).toHaveAttribute("aria-current", "page");

    const privacyLink = screen.getByRole("link", { name: "Privacy" });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(privacyLink).not.toHaveAttribute("aria-current");
  });
});
