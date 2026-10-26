-- Create tracks table
create table if not exists public.tracks (
  id text primary key,
  name text not null,
  bpm integer not null,
  key text not null,
  genre text not null,
  lead_instrument text,
  counter_instrument text,
  duration_ms integer not null,
  loop_start_ms integer not null,
  loop_end_ms integer not null,
  loop_duration_ms integer not null,
  sections jsonb default '[]'::jsonb,
  audio_path text not null,
  created_at timestamptz default now() not null
);

-- Create transitions table
create table if not exists public.transitions (
  id text primary key,
  from_track_id text not null references public.tracks(id) on delete cascade,
  to_track_id text not null references public.tracks(id) on delete cascade,
  timing jsonb default '{}'::jsonb,
  audio_path text not null,
  recipe_version text,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS) and allow public read access
alter table public.tracks enable row level security;
alter table public.transitions enable row level security;

create policy "Allow public read tracks"
  on public.tracks for select
  using (true);

create policy "Allow public read transitions"
  on public.transitions for select
  using (true);

-- Ensure public storage bucket for audio exists
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = true;

-- Storage object read policy
create policy "Allow public read audio bucket"
  on storage.objects for select
  using (bucket_id = 'audio');
