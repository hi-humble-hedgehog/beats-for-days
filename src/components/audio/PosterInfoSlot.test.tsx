import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosterInfoSlot } from "./PosterInfoSlot";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

describe("PosterInfoSlot", () => {
  it("renders heading, return link, and children content", () => {
    render(
      <PosterInfoSlot title="About Beats for Days" returnHref="/beat/0001">
        <p>Infinite generative 90s boom bap radio experience.</p>
      </PosterInfoSlot>,
    );

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "About Beats for Days",
    });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText(/infinite generative 90s boom bap radio experience/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to player" }),
    ).toHaveAttribute("href", "/beat/0001");
  });

  it("renders privacy children with contact link and default return href", () => {
    render(
      <PosterInfoSlot title="Privacy & Data" returnHref="/">
        <p>stream run by Rick van Mook</p>
        <p>
          <span>Tracking:</span>
          <a href="mailto:rick@beatsfordays.ai">rick@beatsfordays.ai</a>
        </p>
      </PosterInfoSlot>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Privacy & Data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/stream run by Rick van Mook/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tracking:/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "rick@beatsfordays.ai" }),
    ).toHaveAttribute("href", "mailto:rick@beatsfordays.ai");
    expect(
      screen.getByRole("link", { name: "Return to player" }),
    ).toHaveAttribute("href", "/");
  });

  it("renders 404 children content", () => {
    render(
      <PosterInfoSlot title="404 — Beat Not Found" returnHref="/">
        <p>That beat is not in the crate.</p>
      </PosterInfoSlot>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "404 — Beat Not Found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/That beat is not in the crate/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to player" }),
    ).toHaveAttribute("href", "/");
  });
});
