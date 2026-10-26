import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GeneratePage from "./page";
import { waitlistApi } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  waitlistApi: {
    getStats: vi.fn(),
    joinWaitlist: vi.fn(),
  },
}));

describe("GeneratePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and renders initial pool statistics", async () => {
    vi.mocked(waitlistApi.getStats).mockResolvedValue({
      total: 1500,
      claimed: 150,
      remaining: 1350,
    });

    render(<GeneratePage />);

    expect(
      await screen.findByText(/1,350 of 1,500 free invites remaining/i),
    ).toBeInTheDocument();
  });

  it("submits waitlist email with detected timezone and shows success message", async () => {
    vi.mocked(waitlistApi.getStats).mockResolvedValue({
      total: 1500,
      claimed: 0,
      remaining: 1500,
    });

    vi.mocked(waitlistApi.joinWaitlist).mockResolvedValue({
      success: true,
      message: "You're on the list!",
      remaining: 1499,
    });

    render(<GeneratePage />);

    const input = screen.getByLabelText(/Email address/i);
    const button = screen.getByRole("button", { name: /Join Waitlist/i });

    fireEvent.change(input, { target: { value: "mc@example.com" } });
    fireEvent.click(button);

    expect(waitlistApi.joinWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "mc@example.com",
      }),
    );

    expect(await screen.findByText(/You're on the list!/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/1,499 of 1,500 free invites remaining/i),
    ).toBeInTheDocument();
  });

  it("relies on native browser focus without custom focus ring classes", () => {
    vi.mocked(waitlistApi.getStats).mockReturnValue(new Promise(() => {}));

    render(<GeneratePage />);

    const input = screen.getByLabelText(/Email address/i);
    const button = screen.getByRole("button", { name: /Join Waitlist/i });

    expect(input.className).not.toMatch(/focus-visible:outline/);
    expect(input.className).not.toMatch(/focus:ring/);
    expect(button.className).not.toMatch(/focus-visible:outline/);
    expect(button.className).not.toMatch(/focus:ring/);
  });
});
