import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoPage } from "./InfoPage";

describe("InfoPage", () => {
  it("renders the editorial header, article, and return link", () => {
    render(
      <InfoPage section="about" title="About Beats for Days">
        <p>An infinite instrumental series.</p>
      </InfoPage>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "About Beats for Days" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Site navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Return to player" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Beats for Days player" }),
    ).toHaveAttribute("href", "/");
  });
});
