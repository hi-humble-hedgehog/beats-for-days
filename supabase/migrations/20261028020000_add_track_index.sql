-- Add index column to tracks table for sequential ordering
alter table public.tracks
  add column if not exists "index" integer;

-- Create index on ordering column
create index if not exists idx_tracks_index on public.tracks ("index");

-- Populate initial index and 2-digit name from existing IDs if not set
update public.tracks
set
  "index" = substring(id from '\d+')::integer,
  name = lpad(substring(id from '\d+'), 2, '0')
where
  id ~ '\d+'
  and ("index" is null or name !~ '^\d{2}$');
