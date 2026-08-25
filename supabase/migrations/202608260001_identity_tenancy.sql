-- SIH26044 Foundation D1: production actor, organization, and tenancy boundary.
-- This schema is intentionally separate from legacy Career Guidance tables.

create schema if not exists sih26044;
create extension if not exists pgcrypto with schema extensions;

create type sih26044.actor_status as enum ('active', 'disabled');
create type sih26044.organization_kind as enum (
  'educational_institution',
  'employer',
  'industry_body',
  'government',
  'training_provider',
  'verification_issuer'
);
create type sih26044.organization_status as enum ('active', 'suspended', 'archived');
create type sih26044.membership_status as enum ('invited', 'active', 'suspended', 'ended');
create type sih26044.actor_role as enum (
  'learner',
  'faculty',
  'institution_admin',
  'recruiter',
  'industry_partner',
  'issuer_verifier',
  'counselor',
  'policy_program_analyst',
  'platform_admin',
  'auditor'
);

create table sih26044.actors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  status sih26044.actor_status not null default 'active',
  created_at timestamptz not null default now()
);

create table sih26044.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(btrim(legal_name)) between 1 and 300),
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  kind sih26044.organization_kind not null,
  status sih26044.organization_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sih26044.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  status sih26044.membership_status not null default 'invited',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  unique (id, actor_id, organization_id)
);

create table sih26044.organization_membership_roles (
  membership_id uuid not null references sih26044.organization_memberships(id) on delete cascade,
  role sih26044.actor_role not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, role)
);

create index organization_memberships_actor_idx
  on sih26044.organization_memberships (actor_id, organization_id, status);
create index organization_memberships_org_idx
  on sih26044.organization_memberships (organization_id, status);

create or replace function sih26044.current_actor_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select a.id
  from sih26044.actors a
  where a.auth_user_id = auth.uid()
    and a.status = 'active'
  limit 1
$$;

create or replace function sih26044.has_active_organization_role(
  requested_organization_id uuid,
  requested_role sih26044.actor_role
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.organization_memberships m
    join sih26044.organization_membership_roles mr on mr.membership_id = m.id
    join sih26044.organizations o on o.id = m.organization_id
    where m.actor_id = sih26044.current_actor_id()
      and m.organization_id = requested_organization_id
      and m.status = 'active'
      and m.valid_from <= statement_timestamp()
      and (m.valid_until is null or m.valid_until > statement_timestamp())
      and o.status = 'active'
      and mr.role = requested_role
  )
$$;

create or replace function sih26044.has_any_active_organization_role(
  requested_organization_id uuid,
  requested_roles sih26044.actor_role[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from unnest(requested_roles) as requested(role)
    where sih26044.has_active_organization_role(requested_organization_id, requested.role)
  )
$$;

revoke all on function sih26044.current_actor_id() from public;
revoke all on function sih26044.has_active_organization_role(uuid, sih26044.actor_role) from public;
revoke all on function sih26044.has_any_active_organization_role(uuid, sih26044.actor_role[]) from public;
grant execute on function sih26044.current_actor_id() to authenticated;
grant execute on function sih26044.has_active_organization_role(uuid, sih26044.actor_role) to authenticated;
grant execute on function sih26044.has_any_active_organization_role(uuid, sih26044.actor_role[]) to authenticated;

comment on schema sih26044 is
  'SIH26044 Opportunity Readiness persistence; separate from Career Guidance Engine A state.';
comment on table sih26044.organization_membership_roles is
  'Normalized multi-role memberships. Organization authority is never inferred from email domains.';
