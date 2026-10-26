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
  });

  it("renders nothing without ?debug=1", () => {
    const { container } = render(<DebugPanelGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for other debug values", () => {
    mockSearch = "debug=true";
    const { container } = render(<DebugPanelGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lazy-loads the panel when ?debug=1 is set", async () => {
    mockSearch = "debug=1";
    render(<DebugPanelGate />);
    expect(await screen.findByText("debug panel loaded")).toBeInTheDocument();
  });
});
