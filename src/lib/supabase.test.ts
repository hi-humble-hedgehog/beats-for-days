import { describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url: string, key: string) => ({
    url,
    key,
    from: vi.fn(),
    storage: vi.fn(),
  })),
}));

vi.mock("./env", () => ({
  getServerEnv: vi.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
  })),
}));

describe("supabase clients", () => {
  it("creates and reuses server client with anon key", async () => {
    const { getSupabaseServerClient } = await import("./supabase");
    const client1 = getSupabaseServerClient();
    const client2 = getSupabaseServerClient();

    expect(client1).toBe(client2);
    expect((client1 as unknown as { key: string }).key).toBe("anon-test-key");
  });

  it("creates and reuses admin client with service role key", async () => {
    const { getSupabaseAdminClient } = await import("./supabase");
    const client1 = getSupabaseAdminClient();
    const client2 = getSupabaseAdminClient();

    expect(client1).toBe(client2);
    expect((client1 as unknown as { key: string }).key).toBe(
      "service-role-test-key",
    );
  });
});
