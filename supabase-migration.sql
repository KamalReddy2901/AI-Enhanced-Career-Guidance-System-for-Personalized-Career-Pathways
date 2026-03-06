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

-- ─── User Profiles (plan / subscription status) ───────────────

create table if not exists public.user_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null unique,
  plan             text not null default 'free',          -- 'free' | 'pro'
  plan_expires_at  timestamptz,                           -- null = no expiry (lifetime or ongoing)
  pack_credits     jsonb not null default '{"dossiers":0,"simulations":0,"ai_chats":0,"pdfs":0}',
  created_at       timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = user_id);

-- ─── Daily Usage Tracking ──────────────────────────────────────

create table if not exists public.user_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  date              date not null default current_date,
  dossiers_used     int not null default 0,
  simulations_used  int not null default 0,
  ai_chats_used     int not null default 0,
  compares_used     int not null default 0,
  transitions_used  int not null default 0,
  roadmaps_used     int not null default 0,
  pdfs_used         int not null default 0,
  created_at        timestamptz default now(),
  unique(user_id, date)
);

alter table public.user_usage enable row level security;

create policy "Users can view own usage"
  on public.user_usage for select using (auth.uid() = user_id);
-- Note: usage is incremented by the Cloudflare Worker using the service role key,
-- so the user itself only needs SELECT here. INSERT/UPDATE are done via service key.

-- ─── Payments ─────────────────────────────────────────────────

create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  razorpay_payment_id   text unique,
  razorpay_order_id     text,
  amount                int not null,  -- in paise (₹1 = 100 paise)
  type                  text not null, -- 'subscription' | 'pack'
  pack_type             text,          -- 'starter' | 'explorer' | 'allin' | null
  plan_months           int default 1, -- how many months of Pro this grants
  status                text not null default 'pending', -- 'pending' | 'success' | 'failed'
  created_at            timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select using (auth.uid() = user_id);
