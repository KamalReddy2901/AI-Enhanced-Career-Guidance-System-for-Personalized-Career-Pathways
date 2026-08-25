-- SIH26044 Foundation D1: versioned, human-confirmed opportunity definitions.

create type sih26044.opportunity_status as enum ('draft', 'published', 'paused', 'closed', 'archived');
create type sih26044.opportunity_version_status as enum ('draft', 'published');
create type sih26044.opportunity_type as enum (
  'job', 'internship', 'apprenticeship', 'industrial_training',
  'faculty_internship', 'live_project', 'mentoring', 'workshop',
  'guest_lecture', 'fdp', 'consultancy', 'collaborative_research'
);
create type sih26044.opportunity_audience as enum ('student', 'alumni', 'faculty', 'professional', 'institution');
create type sih26044.requirement_category as enum (
  'skill', 'experience', 'qualification', 'document_evidence',
  'questionnaire', 'logistics', 'other_literal'
);
create type sih26044.requirement_priority as enum ('required', 'preferred');
create type sih26044.requirement_evidence_expectation as enum (
  'any_recorded', 'artifact_expected', 'human_or_issuer_expected'
);
create type sih26044.canonical_resolution_state as enum ('exact', 'alias', 'unresolved');
create type sih26044.human_confirmation_method as enum (
  'structured_human_entry', 'ai_assisted_review', 'connector_review', 'controlled_fixture'
);

create table sih26044.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  current_version_id uuid,
  status sih26044.opportunity_status not null default 'draft',
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sih26044.opportunity_versions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references sih26044.opportunities(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status sih26044.opportunity_version_status not null default 'draft',
  title text not null check (length(btrim(title)) between 1 and 300),
  description text not null,
  opportunity_type sih26044.opportunity_type not null,
  audiences sih26044.opportunity_audience[] not null check (cardinality(audiences) > 0),
  source_system text not null,
  source_record_id text,
  source_url text,
  source_captured_at timestamptz not null,
  source_literal_text text not null,
  closes_at timestamptz,
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (opportunity_id, version_number),
  unique (id, opportunity_id),
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  )
);

alter table sih26044.opportunities
  add constraint opportunities_current_version_fk
  foreign key (current_version_id, id)
  references sih26044.opportunity_versions(id, opportunity_id)
  on delete restrict;

create table sih26044.opportunity_requirements (
  id uuid primary key default gen_random_uuid(),
  opportunity_version_id uuid not null references sih26044.opportunity_versions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  category sih26044.requirement_category not null,
  priority sih26044.requirement_priority not null,
  literal_source_wording text not null check (length(btrim(literal_source_wording)) > 0),
  importance smallint not null check (importance between 1 and 3),
  evidence_expectation sih26044.requirement_evidence_expectation not null,
  hard_gate boolean not null default false,
  canonical_resolution sih26044.canonical_resolution_state,
  canonical_skill_id text,
  canonical_skill_label text,
  minimum_proficiency smallint check (minimum_proficiency between 0 and 4),
  minimum_years numeric(6,2) check (minimum_years >= 0),
  category_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(category_payload) = 'object'),
  human_confirmed boolean not null default false,
  confirmed_by_actor_id uuid references sih26044.actors(id) on delete restrict,
  confirmed_at timestamptz,
  confirmation_method sih26044.human_confirmation_method,
  created_at timestamptz not null default now(),
  unique (opportunity_version_id, ordinal),
  unique (id, opportunity_version_id),
  check (
    (human_confirmed = false and confirmed_by_actor_id is null and confirmed_at is null and confirmation_method is null)
    or
    (human_confirmed = true and confirmed_by_actor_id is not null and confirmed_at is not null and confirmation_method is not null)
  ),
  check (
    (category = 'skill'
      and canonical_resolution is not null
      and canonical_skill_label is not null
      and (
        (canonical_resolution in ('exact', 'alias') and canonical_skill_id is not null)
        or (canonical_resolution = 'unresolved' and canonical_skill_id is null)
      ))
    or
    (category <> 'skill'
      and canonical_resolution is null
      and canonical_skill_id is null
      and canonical_skill_label is null
      and minimum_proficiency is null)
  ),
  check (category = 'experience' or minimum_years is null)
);

create type sih26044.eligibility_rule_kind as enum (
  'education_level', 'graduation_year', 'location', 'organization_membership',
  'availability', 'licence_registration', 'work_authorization', 'language',
  'explicit_prerequisite', 'custom'
);

create table sih26044.eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  opportunity_version_id uuid not null references sih26044.opportunity_versions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  rule_kind sih26044.eligibility_rule_kind not null,
  literal_source_wording text not null check (length(btrim(literal_source_wording)) > 0),
  typed_rule_definition jsonb not null check (jsonb_typeof(typed_rule_definition) = 'object'),
  human_confirmed boolean not null default false,
  confirmed_by_actor_id uuid references sih26044.actors(id) on delete restrict,
  confirmed_at timestamptz,
  confirmation_method sih26044.human_confirmation_method,
  created_at timestamptz not null default now(),
  unique (opportunity_version_id, ordinal),
  check (
    (human_confirmed = false and confirmed_by_actor_id is null and confirmed_at is null and confirmation_method is null)
    or
    (human_confirmed = true and confirmed_by_actor_id is not null and confirmed_at is not null and confirmation_method is not null)
  )
);

create index opportunity_versions_opportunity_idx
  on sih26044.opportunity_versions (opportunity_id, version_number desc);
create index opportunity_requirements_version_idx
  on sih26044.opportunity_requirements (opportunity_version_id, ordinal);
create index eligibility_rules_version_idx
  on sih26044.eligibility_rules (opportunity_version_id, ordinal);

create or replace function sih26044.protect_published_opportunity_version()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
begin
  if old.status = 'published' then
    raise exception 'Published opportunity versions are immutable; create a new version';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger protect_published_opportunity_version
before update or delete on sih26044.opportunity_versions
for each row execute function sih26044.protect_published_opportunity_version();

create or replace function sih26044.protect_published_opportunity_child()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  parent_version_id uuid := case when tg_op = 'DELETE' then old.opportunity_version_id else new.opportunity_version_id end;
begin
  if exists (
    select 1 from sih26044.opportunity_versions v
    where v.id = parent_version_id and v.status = 'published'
  ) then
    raise exception 'Published opportunity requirements and eligibility rules are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger protect_published_opportunity_requirements
before insert or update or delete on sih26044.opportunity_requirements
for each row execute function sih26044.protect_published_opportunity_child();
create trigger protect_published_eligibility_rules
before insert or update or delete on sih26044.eligibility_rules
for each row execute function sih26044.protect_published_opportunity_child();

create or replace function sih26044.publish_opportunity_version(requested_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  target_version_id uuid;
  target_opportunity_id uuid;
  target_status sih26044.opportunity_version_status;
  owner_org_id uuid;
begin
  select v.id, v.opportunity_id, v.status, o.owner_organization_id
  into target_version_id, target_opportunity_id, target_status, owner_org_id
  from sih26044.opportunity_versions v
  join sih26044.opportunities o on o.id = v.opportunity_id
  where v.id = requested_version_id
  for update of v, o;

  if target_version_id is null then
    raise exception 'Opportunity version not found';
  end if;
  if target_status <> 'draft' then
    raise exception 'Only draft opportunity versions can be published';
  end if;
  if not sih26044.has_any_active_organization_role(
    owner_org_id,
    array['recruiter', 'industry_partner', 'institution_admin', 'faculty']::sih26044.actor_role[]
  ) then
    raise exception 'Actor is not authorized to publish for this organization';
  end if;
  if not exists (
    select 1 from sih26044.opportunity_requirements r
    where r.opportunity_version_id = requested_version_id
  ) then
    raise exception 'A published opportunity version requires at least one confirmed requirement';
  end if;
  if exists (
    select 1 from sih26044.opportunity_requirements r
    where r.opportunity_version_id = requested_version_id
      and (not r.human_confirmed or r.confirmed_by_actor_id is null or r.confirmed_at is null or r.confirmation_method is null)
  ) or exists (
    select 1 from sih26044.eligibility_rules e
    where e.opportunity_version_id = requested_version_id
      and (not e.human_confirmed or e.confirmed_by_actor_id is null or e.confirmed_at is null or e.confirmation_method is null)
  ) then
    raise exception 'All consumed requirements and eligibility rules need complete human confirmation';
  end if;

  update sih26044.opportunity_versions
  set status = 'published', published_at = statement_timestamp()
  where id = requested_version_id;

  update sih26044.opportunities
  set current_version_id = requested_version_id,
      status = 'published',
      updated_at = statement_timestamp()
  where id = target_opportunity_id;

  return requested_version_id;
end
$$;

revoke all on function sih26044.publish_opportunity_version(uuid) from public;
grant execute on function sih26044.publish_opportunity_version(uuid) to authenticated;

comment on function sih26044.publish_opportunity_version(uuid) is
  'Only publishing boundary: refuses incomplete HumanConfirmationTrace data and freezes the published version.';
