-- Add is_active flag to tracks table to allow soft-disabling tracks without deleting history
alter table public.tracks
  add column if not exists is_active boolean not null default true;

-- Index for fast filtering of active beats in stream queries
create index if not exists idx_tracks_is_active on public.tracks (is_active);
