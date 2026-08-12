-- Legacy migration reference.
-- The live app no longer uses credits, subscriptions, or payment flows.
-- Keep this file only as historical Supabase schema context.

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
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null unique,
  credits_remaining     int not null default 20,              -- unified credit balance (20 = free welcome credits)
  ask_ai_unlimited_until timestamptz,                         -- null = no active perk; set by pack purchase
  ask_ai_daily_used     int not null default 0,               -- ask-ai uses today (capped at 50 during perk)
  ask_ai_daily_reset    date,                                  -- date of last daily reset
  created_at            timestamptz default now()
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

-- ─── Migration: Add Unlimited Ask AI perk columns ─────────────
-- Run these if your DB already has the old schema.
-- Safe to run multiple times (uses IF NOT EXISTS).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ask_ai_unlimited_until timestamptz,
  ADD COLUMN IF NOT EXISTS ask_ai_daily_used int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ask_ai_daily_reset date;

-- Remove old Pro plan columns if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN plan;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'plan_expires_at'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN plan_expires_at;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'pro_daily_used'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN pro_daily_used;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'pro_daily_reset'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN pro_daily_reset;
  END IF;
END $$;

-- ─── Migration: Switch to unified credits system ──────────────
-- Run this if your DB already has the old schema (pack_credits jsonb column).
-- Safe to run multiple times.

-- Add credits_remaining column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'credits_remaining'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN credits_remaining int NOT NULL DEFAULT 20;
  END IF;
END $$;

-- Add pro_daily_used column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'pro_daily_used'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN pro_daily_used int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add pro_daily_reset column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'pro_daily_reset'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN pro_daily_reset date;
  END IF;
END $$;

-- Drop old pack_credits column if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'pack_credits'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN pack_credits;
  END IF;
END $$;
-- ─── Shared Trending Cache ─────────────────────────────────────
-- Stores one AI-generated trending-careers result per day.
-- The first visitor of each day triggers the AI call; all subsequent
-- visitors read from this table (no additional AI calls needed).

CREATE TABLE IF NOT EXISTS public.trending_cache (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cache_date date NOT NULL UNIQUE,
  data       jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trending_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public data — no PII)
CREATE POLICY "Public read trending cache"
  ON public.trending_cache FOR SELECT USING (true);

-- Anyone (including unauthenticated) can insert — the AI call is free (0 credits,
-- usageType 'trending') and the UNIQUE constraint on cache_date prevents duplicates.
CREATE POLICY "Public insert trending cache"
  ON public.trending_cache FOR INSERT WITH CHECK (true);