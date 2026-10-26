import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugPanelGate } from "./DebugPanelGate";

let mockSearch = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

vi.mock("./DebugPanel", () => ({
  DebugPanel: () => <p>debug panel loaded</p>,
}));

describe("DebugPanelGate", () => {
  beforeEach(() => {
    mockSearch = "";
    document.cookie =
      "beats_debug_panel=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });

  it("renders nothing without ?debug=1 or cookie", () => {
    const { container } = render(<DebugPanelGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for other debug values", () => {
    mockSearch = "debug=true";
    const { container } = render(<DebugPanelGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lazy-loads the panel and sets cookie when ?debug=1 is set", async () => {
    mockSearch = "debug=1";
    render(<DebugPanelGate />);
    expect(await screen.findByText("debug panel loaded")).toBeInTheDocument();
    expect(document.cookie).toContain("beats_debug_panel=1");
  });

  it("renders the panel when cookie is set even without ?debug=1 in query", async () => {
    document.cookie = "beats_debug_panel=1; path=/;";
    mockSearch = "";
    render(<DebugPanelGate />);
    expect(await screen.findByText("debug panel loaded")).toBeInTheDocument();
  });
});
