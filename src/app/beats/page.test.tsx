import { describe, expect, it, vi } from "vitest";
import BeatsPage from "./page";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("BeatsPage", () => {
  it("immediately triggers a server-side redirect to /", () => {
    BeatsPage();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
