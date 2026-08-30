-- CareerCase × SIH26044: curated gap-closure resource catalog.
-- Resources are advisory ecosystem references, not readiness evidence or hiring
-- signals. Mappings are explicit canonical-skill/action mappings; unresolved or
-- review-required opportunity wording is never guessed into a resource match.

create table sih26044.gap_closure_resources (
  id uuid primary key default gen_random_uuid(),
  resource_kind text not null check (resource_kind in (
    'course', 'training', 'certification', 'workshop', 'mentoring',
    'practice', 'live_project', 'industrial_training', 'apprenticeship', 'other'
  )),
  title text not null check (length(btrim(title)) between 1 and 300),
  description text not null default '',
  provider_name text not null check (length(btrim(provider_name)) between 1 and 300),
  provider_reference text,
  external_url text check (external_url is null or external_url ~ '^https://'),
  integration_mode text not null check (integration_mode in ('internal', 'deep_link', 'integration_ready')),
  source_system text not null check (length(btrim(source_system)) > 0),
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_captured_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (integration_mode <> 'deep_link' or external_url is not null)
);

create table sih26044.gap_closure_resource_skill_mappings (
  resource_id uuid not null references sih26044.gap_closure_resources(id) on delete cascade,
  canonical_skill_id text not null check (length(btrim(canonical_skill_id)) > 0),
  action_type text not null check (action_type in ('LEARN', 'PRACTICE', 'EXPERIENCE')),
  curated_reason text not null check (length(btrim(curated_reason)) between 1 and 500),
  mapping_source text not null check (length(btrim(mapping_source)) > 0),
  display_order integer not null default 100 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (resource_id, canonical_skill_id, action_type)
);

create index gap_closure_resource_skill_lookup_idx
  on sih26044.gap_closure_resource_skill_mappings (canonical_skill_id, action_type, display_order, resource_id);

alter table sih26044.gap_closure_resources enable row level security;
alter table sih26044.gap_closure_resource_skill_mappings enable row level security;

-- No browser table privileges: production reads use the allowlisted RPC below;
-- catalog curation remains a trusted administrative/import boundary until a
-- separately audited authoring workflow is implemented.
revoke all on sih26044.gap_closure_resources from anon, authenticated;
revoke all on sih26044.gap_closure_resource_skill_mappings from anon, authenticated;

create or replace function sih26044.list_gap_closure_resources(
  requested_opportunity_version_id uuid,
  requested_requirement_id uuid,
  requested_action_type text
)
returns table (
  resource_id uuid,
  resource_kind text,
  title text,
  description text,
  provider_name text,
  provider_reference text,
  external_url text,
  integration_mode text,
  source_system text,
  source_url text,
  source_captured_at timestamptz,
  canonical_skill_id text,
  action_type text,
  curated_reason text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  canonical_id text;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required to access production gap-closure resources';
  end if;

  if requested_action_type not in ('LEARN', 'PRACTICE', 'EXPERIENCE') then
    raise exception 'Unsupported gap-closure resource action';
  end if;

  -- Require a currently published opportunity definition. This keeps resource
  -- explanation bound to the same immutable opportunity-version semantics as
  -- readiness, while avoiding access to another tenant's private drafts.
  if not exists (
    select 1
    from sih26044.opportunity_versions v
    join sih26044.opportunities o on o.id = v.opportunity_id
    where v.id = requested_opportunity_version_id
      and v.status = 'published'
      and o.status in ('published', 'paused', 'closed')
  ) then
    raise exception 'Published opportunity version not found';
  end if;

  select r.canonical_skill_id
  into canonical_id
  from sih26044.opportunity_requirements r
  where r.id = requested_requirement_id
    and r.opportunity_version_id = requested_opportunity_version_id
    and r.category = 'skill'
    and r.canonical_resolution in ('exact', 'alias')
    and r.canonical_skill_id is not null
    and coalesce(r.resolution_status::text, 'resolved') = 'resolved';

  -- Conservative resolution is deliberate: unresolved/review-required wording
  -- returns no mapping rather than guessing which learning resource applies.
  if canonical_id is null then
    return;
  end if;

  return query
  select
    resource.id,
    resource.resource_kind,
    resource.title,
    resource.description,
    resource.provider_name,
    resource.provider_reference,
    resource.external_url,
    resource.integration_mode,
    resource.source_system,
    resource.source_url,
    resource.source_captured_at,
    mapping.canonical_skill_id,
    mapping.action_type,
    mapping.curated_reason
  from sih26044.gap_closure_resource_skill_mappings mapping
  join sih26044.gap_closure_resources resource on resource.id = mapping.resource_id
  where mapping.canonical_skill_id = canonical_id
    and mapping.action_type = requested_action_type
    and resource.status = 'active'
  order by mapping.display_order asc, resource.title asc, resource.id asc;
end
$$;

revoke all on function sih26044.list_gap_closure_resources(uuid, uuid, text) from public, anon;
grant execute on function sih26044.list_gap_closure_resources(uuid, uuid, text) to authenticated;

comment on function sih26044.list_gap_closure_resources(uuid, uuid, text) is
  'Returns curated advisory resources for an exact resolved canonical skill/action on a published opportunity version. Unresolved/review-required wording returns no guessed match. Results are deterministic catalog mappings, never personalized ranking, readiness evidence, or hiring probability.';
