import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renders the main heading and navigation links", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Beats for Days" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "About (Route Test)" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Terms of Service (Route Test)" }),
    ).toBeInTheDocument();
  });
});
