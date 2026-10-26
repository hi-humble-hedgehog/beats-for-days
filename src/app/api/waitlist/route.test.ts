import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

describe("GET /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pool statistics from Supabase", async () => {
    mockSelect.mockResolvedValue({ count: 120, error: null });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith("beat_waitlist");
    expect(mockSelect).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
    expect(data).toEqual({
      total: 1500,
      claimed: 120,
      remaining: 1380,
    });
  });

  it("handles database error gracefully by returning full pool", async () => {
    mockSelect.mockResolvedValue({
      count: null,
      error: new Error("DB offline"),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      total: 1500,
      claimed: 0,
      remaining: 1500,
    });
  });

  it("handles unexpected thrown exceptions in fetchClaimedCount", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("Connection failed");
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      total: 1500,
      claimed: 0,
      remaining: 1500,
    });
  });
});

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: "not-json{",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects invalid email address with exact error message", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "A valid email address is required" });
  });

  it("rejects empty timezone string with exact error message", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: "valid@example.com", timezone: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "A valid email address is required" });
  });

  it("trims whitespace from timezone parameter", async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockResolvedValue({ count: 5, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "beat_waitlist") {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({
        email: "trimmed@example.com",
        timezone: "  Europe/Paris  ",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: "Europe/Paris",
      }),
    );
  });

  it("inserts valid email, defaults timezone to UTC, and returns remaining pool count", async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockResolvedValue({ count: 5, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "beat_waitlist") {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({
        email: " Artist@EXAMPLE.com ",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toEqual({
      success: true,
      message:
        "You're on the list! Check your inbox around noon in your local timezone.",
      remaining: 1495,
    });
    expect(mockInsert).toHaveBeenCalledWith({
      email_raw: "Artist@EXAMPLE.com",
      email_normalized: "artist@example.com",
      timezone: "UTC",
      status: "waiting",
    });
  });

  it("clamps remaining pool count to 0 when claimed exceeds total pool", async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockResolvedValue({ count: 1600, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "beat_waitlist") {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({
        email: "late@example.com",
        timezone: "America/New_York",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.remaining).toBe(0);
    expect(mockInsert).toHaveBeenCalledWith({
      email_raw: "late@example.com",
      email_normalized: "late@example.com",
      timezone: "America/New_York",
      status: "waiting",
    });
  });

  it("handles duplicate active signup gracefully", async () => {
    mockInsert.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    mockSelect.mockResolvedValue({ count: 5, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "beat_waitlist") {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: "repeat@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      success: true,
      message: "You're already on the waitlist! We'll notify you when ready.",
      remaining: 1495,
    });
  });

  it("handles non-duplicate database insert failure with status 500", async () => {
    mockInsert.mockResolvedValue({
      error: { code: "42P01", message: "relation does not exist" },
    });
    mockSelect.mockResolvedValue({ count: 5, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "beat_waitlist") {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: "db-fail@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      error: "Failed to record waitlist entry",
    });
  });
});
