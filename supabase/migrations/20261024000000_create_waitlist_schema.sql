-- Waitlist schema for early generation access (ADR 0009)
create table if not exists public.beat_waitlist (
  id uuid primary key default gen_random_uuid(),
  email_raw text not null,
  email_normalized text not null,
  timezone text not null default 'UTC',

  -- Lifecycle: 'unverified' -> 'waiting' -> 'invited' -> 'redeeming' -> 'redeemed' | 'failed' | 'expired'
  status text not null check (
    status in ('unverified', 'waiting', 'invited', 'redeeming', 'redeemed', 'failed', 'expired')
  ) default 'waiting',

  is_priority_bump boolean not null default false,
  is_vip_fastpass boolean not null default false,
  payment_order_id text unique,

  verify_token text unique,
  claim_token text unique,
  last_error text,
  track_id text references public.tracks(id),

  verified_at timestamptz,
  invited_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Allow at most 1 active/in-progress entry per normalized email while keeping historical rows
create unique index if not exists uniq_active_waitlist_email
  on public.beat_waitlist (email_normalized)
  where status in ('unverified', 'waiting', 'invited', 'redeeming', 'failed');

alter table public.beat_waitlist enable row level security;

-- Public can insert new signups
create policy "Allow public insert waitlist"
  on public.beat_waitlist for insert
  with check (true);

-- Public can read aggregate rows/counts
create policy "Allow public select waitlist"
  on public.beat_waitlist for select
  using (true);
