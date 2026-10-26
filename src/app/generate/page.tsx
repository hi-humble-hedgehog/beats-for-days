"use client";

import { useEffect, useState, type FormEvent } from "react";
import { waitlistApi, type WaitlistStatsResponse } from "@/lib/api";
import { LIMITS } from "@/lib/constants";

interface WaitlistFormProps {
  onSuccess: (remaining?: number, message?: string) => void;
}

function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";

    try {
      const res = await waitlistApi.joinWaitlist({ email, timezone });
      if (res.success) {
        onSuccess(res.remaining, res.message);
        setEmail("");
      } else {
        setError(res.error ?? "Failed to join waitlist. Please try again.");
      }
    } catch {
      setError("Network error. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={isSubmitting}
          className="flex-1 border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary px-5 py-2.5 text-sm font-bold tracking-wider text-primary-foreground uppercase transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Joining..." : "Join Waitlist"}
        </button>
      </form>
      {error && (
        <div
          role="status"
          aria-live="polite"
          className="w-full border border-destructive bg-destructive/10 p-3 text-xs font-bold tracking-wider text-destructive uppercase"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  const [stats, setStats] = useState<WaitlistStatsResponse>({
    total: LIMITS.FREE_INVITES_POOL,
    claimed: 0,
    remaining: LIMITS.FREE_INVITES_POOL,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    waitlistApi
      .getStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        // Fall back gracefully to static defaults
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSuccess = (remaining?: number, message?: string) => {
    setSuccessMessage(
      message ??
        "You're on the list! We'll deliver your invite at noon in your local timezone.",
    );
    if (typeof remaining === "number") {
      setStats((prev) => ({ ...prev, remaining }));
    }
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="border border-foreground px-3 py-1 text-xs font-bold tracking-widest text-foreground uppercase">
        Phase 1 • Early Access
      </span>

      <h1 className="text-3xl leading-[0.85] font-bold tracking-tighter text-foreground sm:text-5xl">
        Generate Boom Bap Beats
      </h1>

      <p
        aria-live="polite"
        className="text-xs font-bold tracking-widest text-primary uppercase tabular-nums"
      >
        {stats.remaining.toLocaleString()} of {stats.total.toLocaleString()}{" "}
        free invites remaining
      </p>

      <p className="max-w-md text-sm text-muted-foreground">
        Public AI generation will open soon in phased batches. Join the free
        waitlist to receive your generation invite delivered at noon in your
        local timezone.
      </p>

      <WaitlistForm onSuccess={handleSuccess} />

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-md border border-border bg-card p-3 text-xs font-bold tracking-wider text-foreground uppercase"
        >
          {successMessage}
        </div>
      )}
    </main>
  );
}
