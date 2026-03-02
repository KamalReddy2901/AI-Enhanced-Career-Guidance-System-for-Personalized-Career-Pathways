-- Run this SQL in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste & run)

-- Career history table
create table if not exists public.career_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  job_title   text not null,
  job_data    jsonb not null,
  timestamp   bigint not null,
  created_at  timestamptz default now()
);

-- Row-level security: users can only see their own history
alter table public.career_history enable row level security;

create policy "Users can view own history"
  on public.career_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.career_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.career_history for delete
  using (auth.uid() = user_id);

-- Optional: career_favorites table
create table if not exists public.career_favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  job_title   text not null,
  job_data    jsonb not null,
  notes       text default '',
  saved_at    bigint not null,
  created_at  timestamptz default now()
);

alter table public.career_favorites enable row level security;

create policy "Users can view own favorites"
  on public.career_favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.career_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can update own favorites"
  on public.career_favorites for update
  using (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.career_favorites for delete
  using (auth.uid() = user_id);
