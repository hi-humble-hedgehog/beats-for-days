import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosterInfoSlot } from "./PosterInfoSlot";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

describe("PosterInfoSlot", () => {
  it("renders about copy and return link when section is about", () => {
    render(<PosterInfoSlot section="about" returnHref="/beat/0001" />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "About Beats for Days",
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("heading");
    expect(
      screen.getByText(/infinite generative 90s boom bap radio experience/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to player" }),
    ).toHaveAttribute("href", "/beat/0001");
  });

  it("renders privacy copy, tracking info, and contact link when section is privacy", () => {
    render(<PosterInfoSlot section="privacy" returnHref="/" />);

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

  it("renders 404 copy and return link when section is not-found", () => {
    render(<PosterInfoSlot section="not-found" returnHref="/" />);

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
