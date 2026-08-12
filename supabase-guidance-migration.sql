-- ══════════════════════════════════════════════════════════════════════════════
-- CareerCase Guidance System — Supabase Tables Migration
-- Run this in the Supabase SQL Editor to add the six guidance tables.
-- Idempotent (safe to run multiple times). RLS enabled on all tables.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. guidance_profiles ─────────────────────────────────────────────────────
-- One row per user — the Career Passport (jsonb snapshot)
create table if not exists public.guidance_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  segment text,                        -- 'school_student'|'college_student'|'job_seeker'|'career_switcher'|'professional'
  passport jsonb not null default '{}'::jsonb,   -- full CareerPassport object (see engine/types.ts)
  passport_version int not null default 1,
  updated_at timestamptz default now()
);

alter table public.guidance_profiles enable row level security;

drop policy if exists "Users can view own guidance profile" on public.guidance_profiles;
create policy "Users can view own guidance profile"
  on public.guidance_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own guidance profile" on public.guidance_profiles;
create policy "Users can insert own guidance profile"
  on public.guidance_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own guidance profile" on public.guidance_profiles;
create policy "Users can update own guidance profile"
  on public.guidance_profiles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own guidance profile" on public.guidance_profiles;
create policy "Users can delete own guidance profile"
  on public.guidance_profiles for delete
  using (auth.uid() = user_id);

-- ─── 2. guidance_assessments ──────────────────────────────────────────────────
-- One row per completed assessment run
create table if not exists public.guidance_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null,                  -- 'riasec'|'aptitude'|'values'|'aspiration'
  result jsonb not null,
  taken_at timestamptz default now()
);

alter table public.guidance_assessments enable row level security;

drop policy if exists "Users can view own assessments" on public.guidance_assessments;
create policy "Users can view own assessments"
  on public.guidance_assessments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own assessments" on public.guidance_assessments;
create policy "Users can insert own assessments"
  on public.guidance_assessments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own assessments" on public.guidance_assessments;
create policy "Users can delete own assessments"
  on public.guidance_assessments for delete
  using (auth.uid() = user_id);

-- ─── 3. guidance_recommendations ──────────────────────────────────────────────
-- Versioned, source-traceable recommendation snapshots
create table if not exists public.guidance_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  passport_version int not null,
  kb_version text not null,
  result jsonb not null,               -- full RecommendationSet incl. per-career component scores
  created_at timestamptz default now()
);

alter table public.guidance_recommendations enable row level security;

drop policy if exists "Users can view own recommendations" on public.guidance_recommendations;
create policy "Users can view own recommendations"
  on public.guidance_recommendations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recommendations" on public.guidance_recommendations;
create policy "Users can insert own recommendations"
  on public.guidance_recommendations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recommendations" on public.guidance_recommendations;
create policy "Users can delete own recommendations"
  on public.guidance_recommendations for delete
  using (auth.uid() = user_id);

-- ─── 4. guidance_pathways ─────────────────────────────────────────────────────
-- Saved pathway plans
create table if not exists public.guidance_pathways (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  occupation_id text not null,
  plan jsonb not null,
  status text not null default 'active',  -- 'active'|'completed'|'archived'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.guidance_pathways enable row level security;

drop policy if exists "Users can view own pathways" on public.guidance_pathways;
create policy "Users can view own pathways"
  on public.guidance_pathways for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own pathways" on public.guidance_pathways;
create policy "Users can insert own pathways"
  on public.guidance_pathways for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own pathways" on public.guidance_pathways;
create policy "Users can update own pathways"
  on public.guidance_pathways for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own pathways" on public.guidance_pathways;
create policy "Users can delete own pathways"
  on public.guidance_pathways for delete
  using (auth.uid() = user_id);

-- ─── 5. guidance_progress ─────────────────────────────────────────────────────
-- Progress events that drive replanning
create table if not exists public.guidance_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,            -- 'skill_validated'|'module_completed'|'milestone_done'|'profile_edit'
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table public.guidance_progress enable row level security;

drop policy if exists "Users can view own progress" on public.guidance_progress;
create policy "Users can view own progress"
  on public.guidance_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.guidance_progress;
create policy "Users can insert own progress"
  on public.guidance_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own progress" on public.guidance_progress;
create policy "Users can delete own progress"
  on public.guidance_progress for delete
  using (auth.uid() = user_id);

-- ─── 6. guidance_consents ─────────────────────────────────────────────────────
-- DPDP consent ledger (append-only)
create table if not exists public.guidance_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  consent_type text not null,          -- 'terms'|'data_processing'|'guardian'
  granted boolean not null,
  detail jsonb not null default '{}'::jsonb,  -- e.g. {"guardian_email_hash":"…","method":"email_ack"}
  created_at timestamptz default now()
);

alter table public.guidance_consents enable row level security;

-- Consent ledger: select + insert only (append-only, no update/delete)
drop policy if exists "Users can view own consents" on public.guidance_consents;
create policy "Users can view own consents"
  on public.guidance_consents for select
  using (auth.uid() = user_id);

drop policy if exists "Users can log own consents" on public.guidance_consents;
create policy "Users can log own consents"
  on public.guidance_consents for insert
  with check (auth.uid() = user_id);
