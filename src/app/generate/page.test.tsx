import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GeneratePage from "./page";

const mockNotFound = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("GeneratePage", () => {
  it("triggers notFound() because generation is disabled for MVP", () => {
    expect(() => render(<GeneratePage />)).toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
