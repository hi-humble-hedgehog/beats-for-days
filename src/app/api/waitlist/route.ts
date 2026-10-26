import { NextResponse } from "next/server";
import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase";

const signupSchema = z.object({
  email: z.string().trim().email(),
  timezone: z.string().trim().min(1).default("UTC"),
});

async function fetchClaimedCount(): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();
    const { count, error } = await supabase
      .from("beat_waitlist")
      .select("*", { count: "exact", head: true });

    if (error || count === null) {
      return 0;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Returns the current waitlist invite pool metrics.
 *
 * Rationale:
 * Supplies public counters for the `/generate` landing page without exposing email
 * addresses or personal information, honoring GDPR data minimization under ADR 0008.
 */
export async function GET() {
  const claimed = await fetchClaimedCount();
  const total = LIMITS.FREE_INVITES_POOL;
  const remaining = Math.max(0, total - claimed);

  return NextResponse.json({
    total,
    claimed,
    remaining,
  });
}

/**
 * Adds a new email signup to the early access waitlist with timezone detection.
 *
 * Rationale:
 * Captures user timezone so invite batches can be scheduled for delivery at noon
 * local time per ADR 0009. Normalizes email addresses to enforce idempotency and
 * handle duplicate attempts gracefully.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 },
    );
  }

  const { email, timezone } = parsed.data;
  const emailRaw = email;
  const emailNormalized = email.toLowerCase();
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("beat_waitlist").insert({
    email_raw: emailRaw,
    email_normalized: emailNormalized,
    timezone,
    status: "waiting",
  });

  const claimed = await fetchClaimedCount();
  const remaining = Math.max(0, LIMITS.FREE_INVITES_POOL - claimed);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist! We'll notify you when ready.",
        remaining,
      });
    }
    return NextResponse.json(
      { error: "Failed to record waitlist entry" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "You're on the list! Check your inbox around noon in your local timezone.",
    remaining,
  });
}
