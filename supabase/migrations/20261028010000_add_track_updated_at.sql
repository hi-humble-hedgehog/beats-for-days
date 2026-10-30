-- Add updated_at column to tracks table
alter table public.tracks
  add column if not exists updated_at timestamptz default now() not null;

-- Trigger to auto-update updated_at on row modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_tracks_updated_at on public.tracks;
create trigger set_tracks_updated_at
  before update on public.tracks
  for each row
  execute function public.handle_updated_at();
