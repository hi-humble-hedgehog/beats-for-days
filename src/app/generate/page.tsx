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
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50"
        >
          {isSubmitting ? "Joining..." : "Join Waitlist"}
        </button>
      </form>
      {error && (
        <div
          role="status"
          aria-live="polite"
          className="w-full rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400"
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
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-400">
        Phase 1 • Early Access
      </span>

      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
        Generate Boom Bap Beats
      </h1>

      <p
        aria-live="polite"
        className="font-mono text-sm font-medium text-amber-400"
      >
        {stats.remaining.toLocaleString()} of {stats.total.toLocaleString()}{" "}
        free invites remaining
      </p>

      <p className="max-w-md text-sm text-zinc-400">
        Public AI generation will open soon in phased batches. Join the free
        waitlist to receive your generation invite delivered at noon in your
        local timezone.
      </p>

      <WaitlistForm onSuccess={handleSuccess} />

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
        >
          {successMessage}
        </div>
      )}
    </main>
  );
}
