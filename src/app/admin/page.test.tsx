import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

const mockFetchAdminTracks = vi.fn();
vi.mock("@/lib/admin", () => ({
  fetchAdminTracks: () => mockFetchAdminTracks(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminClient: vi.fn(() => ({})),
}));

describe("AdminPage (/admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls notFound in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await AdminPage();
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders AdminDashboard with tracks in development", async () => {
    mockFetchAdminTracks.mockResolvedValueOnce([
      { id: "track-1", name: "01", index: 1, is_active: true },
    ]);

    const PageComponent = await AdminPage();
    render(PageComponent);

    expect(screen.getByText("CATALOG MANAGEMENT")).toBeDefined();
    expect(screen.getByText("#01")).toBeDefined();
  });
});
