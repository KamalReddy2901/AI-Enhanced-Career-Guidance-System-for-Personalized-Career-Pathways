-- CareerCase × SIH26044: versioned development-program catalog and conservative gap linkage.
-- This is a discovery/authoring boundary, not an LMS. Program publication is a
-- human action; canonical skill linkage is exact/alias only; unresolved wording
-- stays literal; browsing never ranks learners or promises eligibility, hiring,
-- completion, certification, verification, evidence, or provider endorsement.

create type sih26044.development_program_kind as enum (
  'training', 'certification', 'workshop', 'mentorship'
);
create type sih26044.development_program_status as enum (
  'draft', 'published', 'paused', 'closed', 'archived'
);
create type sih26044.development_program_version_status as enum ('draft', 'published');
create type sih26044.development_delivery_mode as enum ('online', 'onsite', 'hybrid', 'self_paced');

create table sih26044.development_programs (
  id uuid primary key default gen_random_uuid(),
  provider_organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  current_version_id uuid,
  status sih26044.development_program_status not null default 'draft',
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sih26044.development_program_versions (
  id uuid primary key default gen_random_uuid(),
  development_program_id uuid not null references sih26044.development_programs(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status sih26044.development_program_version_status not null default 'draft',
  kind sih26044.development_program_kind not null,
  title text not null check (length(btrim(title)) between 1 and 300),
  description text not null check (length(btrim(description)) between 1 and 5000),
  delivery_mode sih26044.development_delivery_mode not null,
  external_registration_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (development_program_id, version_number),
  unique (id, development_program_id),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  check (external_registration_url is null or external_registration_url ~ '^https://'),
  check (
    (status = 'draft' and published_at is null)
    or (status = 'published' and published_at is not null)
  )
);

alter table sih26044.development_programs
  add constraint development_programs_current_version_fk
  foreign key (current_version_id, id)
  references sih26044.development_program_versions(id, development_program_id)
  on delete restrict;

create table sih26044.development_program_skill_targets (
  id uuid primary key default gen_random_uuid(),
  development_program_version_id uuid not null references sih26044.development_program_versions(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  literal_source_wording text not null check (length(btrim(literal_source_wording)) between 1 and 500),
  resolution_status sih26044.requirement_resolution_status not null,
  canonical_resolution sih26044.canonical_resolution_state not null,
  canonical_skill_id text,
  canonical_skill_label text not null,
  resolution_suggestions jsonb not null default '[]'::jsonb check (jsonb_typeof(resolution_suggestions) = 'array'),
  human_confirmed boolean not null default false,
  confirmed_by_actor_id uuid references sih26044.actors(id) on delete restrict,
  confirmed_at timestamptz,
  confirmation_method sih26044.human_confirmation_method,
  created_at timestamptz not null default now(),
  unique (development_program_version_id, ordinal),
  check (
    (human_confirmed = false and confirmed_by_actor_id is null and confirmed_at is null and confirmation_method is null)
    or
    (human_confirmed = true and confirmed_by_actor_id is not null and confirmed_at is not null and confirmation_method is not null)
  ),
  check (
    (resolution_status = 'resolved'
      and canonical_resolution in ('exact', 'alias')
      and canonical_skill_id is not null
      and resolution_suggestions = '[]'::jsonb)
    or
    (resolution_status = 'review_required'
      and canonical_resolution = 'unresolved'
      and canonical_skill_id is null
      and jsonb_array_length(resolution_suggestions) > 0
      and human_confirmed = false)
    or
    (resolution_status = 'unresolved'
      and canonical_resolution = 'unresolved'
      and canonical_skill_id is null
      and resolution_suggestions = '[]'::jsonb)
  )
);

create index development_program_provider_idx
  on sih26044.development_programs(provider_organization_id, status);
create index development_program_versions_program_idx
  on sih26044.development_program_versions(development_program_id, version_number desc);
create index development_program_targets_version_idx
  on sih26044.development_program_skill_targets(development_program_version_id, ordinal);
create index development_program_targets_skill_idx
  on sih26044.development_program_skill_targets(canonical_skill_id)
  where resolution_status = 'resolved';

create or replace function sih26044.can_manage_development_program(requested_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.development_programs p
    where p.id = requested_program_id
      and sih26044.has_any_active_organization_role(
        p.provider_organization_id,
        array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
      )
  )
$$;

create or replace function sih26044.protect_published_development_program_version()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
begin
  if old.status = 'published' then
    raise exception 'Published development-program versions are immutable; create a successor draft';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger protect_published_development_program_version
before update or delete on sih26044.development_program_versions
for each row execute function sih26044.protect_published_development_program_version();

create or replace function sih26044.protect_published_development_program_target()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  version_id uuid := case when tg_op = 'DELETE' then old.development_program_version_id else new.development_program_version_id end;
begin
  if exists (
    select 1 from sih26044.development_program_versions v
    where v.id = version_id and v.status = 'published'
  ) then
    raise exception 'Skill targets of published development-program versions are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger protect_published_development_program_target
before insert or update or delete on sih26044.development_program_skill_targets
for each row execute function sih26044.protect_published_development_program_target();

create or replace function sih26044.save_development_program_draft(
  requested_provider_organization_id uuid,
  requested_program_id uuid,
  requested_version_id uuid,
  requested_payload jsonb
)
returns table (
  development_program_id uuid,
  development_program_version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  current_actor uuid;
  target_program sih26044.development_programs%rowtype;
  target_version sih26044.development_program_versions%rowtype;
  target_program_id uuid;
  target_version_id uuid;
  target_version_number integer;
  program_title text;
  program_description text;
  program_kind sih26044.development_program_kind;
  program_delivery_mode sih26044.development_delivery_mode;
  registration_url text;
  starts_at_value timestamptz;
  ends_at_value timestamptz;
  targets jsonb;
  target jsonb;
  target_ordinal integer := 0;
  literal_wording text;
  resolution_status_value sih26044.requirement_resolution_status;
  canonical_resolution_value sih26044.canonical_resolution_state;
  canonical_skill_id_value text;
  canonical_skill_label_value text;
  suggestions_value jsonb;
  human_confirmed_value boolean;
  confirmation_method_text text;
begin
  current_actor := sih26044.current_actor_id();
  if current_actor is null then
    raise exception 'An active SIH actor is required to author development programs';
  end if;

  if requested_provider_organization_id is null
     or not sih26044.has_any_active_organization_role(
       requested_provider_organization_id,
       array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
     ) then
    raise exception 'Actor is not authorized to author development programs for this provider organization';
  end if;

  if requested_payload is null or jsonb_typeof(requested_payload) <> 'object' then
    raise exception 'Development-program payload must be a JSON object';
  end if;

  program_title := btrim(coalesce(requested_payload ->> 'title', ''));
  program_description := btrim(coalesce(requested_payload ->> 'description', ''));
  if length(program_title) < 1 or length(program_title) > 300 then
    raise exception 'Development-program title must contain 1 to 300 characters';
  end if;
  if length(program_description) < 1 or length(program_description) > 5000 then
    raise exception 'Development-program description must contain 1 to 5000 characters';
  end if;

  begin
    program_kind := (requested_payload ->> 'kind')::sih26044.development_program_kind;
    program_delivery_mode := (requested_payload ->> 'deliveryMode')::sih26044.development_delivery_mode;
  exception when invalid_text_representation then
    raise exception 'Development-program kind or delivery mode is invalid';
  end;
  if program_kind is null or program_delivery_mode is null then
    raise exception 'Development-program kind and delivery mode are required';
  end if;

  registration_url := nullif(btrim(coalesce(requested_payload ->> 'externalRegistrationUrl', '')), '');
  if registration_url is not null and registration_url !~ '^https://' then
    raise exception 'External registration URL must use HTTPS';
  end if;

  starts_at_value := nullif(requested_payload ->> 'startsAt', '')::timestamptz;
  ends_at_value := nullif(requested_payload ->> 'endsAt', '')::timestamptz;
  if starts_at_value is not null and ends_at_value is not null and ends_at_value < starts_at_value then
    raise exception 'Development-program end time cannot precede start time';
  end if;

  targets := coalesce(requested_payload -> 'skillTargets', '[]'::jsonb);
  if jsonb_typeof(targets) <> 'array' or jsonb_array_length(targets) < 1 then
    raise exception 'At least one literal skill/capability target is required';
  end if;

  if requested_program_id is null then
    insert into sih26044.development_programs (
      provider_organization_id, status, created_by_actor_id
    ) values (
      requested_provider_organization_id, 'draft', current_actor
    ) returning id into target_program_id;

    target_version_number := 1;
    insert into sih26044.development_program_versions (
      development_program_id, version_number, status, kind, title, description,
      delivery_mode, external_registration_url, starts_at, ends_at, created_by_actor_id
    ) values (
      target_program_id, target_version_number, 'draft', program_kind, program_title,
      program_description, program_delivery_mode, registration_url, starts_at_value,
      ends_at_value, current_actor
    ) returning id into target_version_id;
  else
    select * into target_program
    from sih26044.development_programs p
    where p.id = requested_program_id
    for update;

    if target_program.id is null
       or target_program.provider_organization_id <> requested_provider_organization_id
       or not sih26044.can_manage_development_program(requested_program_id) then
      raise exception 'Development program not found or actor is not authorized';
    end if;
    if target_program.status = 'archived' then
      raise exception 'Archived development programs cannot be revised';
    end if;
    target_program_id := target_program.id;

    if requested_version_id is null then
      select coalesce(max(v.version_number), 0) + 1
      into target_version_number
      from sih26044.development_program_versions v
      where v.development_program_id = target_program_id;

      insert into sih26044.development_program_versions (
        development_program_id, version_number, status, kind, title, description,
        delivery_mode, external_registration_url, starts_at, ends_at, created_by_actor_id
      ) values (
        target_program_id, target_version_number, 'draft', program_kind, program_title,
        program_description, program_delivery_mode, registration_url, starts_at_value,
        ends_at_value, current_actor
      ) returning id into target_version_id;
    else
      select * into target_version
      from sih26044.development_program_versions v
      where v.id = requested_version_id
        and v.development_program_id = target_program_id
      for update;
      if target_version.id is null or target_version.status <> 'draft' then
        raise exception 'Only the exact draft development-program version can be edited';
      end if;
      target_version_id := target_version.id;
      target_version_number := target_version.version_number;

      update sih26044.development_program_versions
      set kind = program_kind,
          title = program_title,
          description = program_description,
          delivery_mode = program_delivery_mode,
          external_registration_url = registration_url,
          starts_at = starts_at_value,
          ends_at = ends_at_value
      where id = target_version_id;

      delete from sih26044.development_program_skill_targets
      where development_program_version_id = target_version_id;
    end if;
  end if;

  for target in select value from jsonb_array_elements(targets)
  loop
    literal_wording := btrim(coalesce(target ->> 'literalSourceWording', ''));
    if length(literal_wording) < 1 or length(literal_wording) > 500 then
      raise exception 'Each development-program target must preserve 1 to 500 literal characters';
    end if;

    begin
      resolution_status_value := (target ->> 'resolutionStatus')::sih26044.requirement_resolution_status;
      canonical_resolution_value := (target ->> 'canonicalResolution')::sih26044.canonical_resolution_state;
    exception when invalid_text_representation then
      raise exception 'Development-program target resolution state is invalid';
    end;

    canonical_skill_id_value := nullif(btrim(coalesce(target ->> 'canonicalSkillId', '')), '');
    canonical_skill_label_value := btrim(coalesce(target ->> 'canonicalSkillLabel', ''));
    suggestions_value := coalesce(target -> 'resolutionSuggestions', '[]'::jsonb);
    human_confirmed_value := coalesce((target ->> 'humanConfirmed')::boolean, false);
    confirmation_method_text := nullif(btrim(coalesce(target ->> 'confirmationMethod', '')), '');

    if canonical_skill_label_value = '' or jsonb_typeof(suggestions_value) <> 'array' then
      raise exception 'Development-program target canonical label and suggestion shape are required';
    end if;

    if resolution_status_value = 'resolved' then
      if canonical_resolution_value not in ('exact', 'alias')
         or canonical_skill_id_value is null
         or jsonb_array_length(suggestions_value) <> 0 then
        raise exception 'Resolved development-program targets require an exact/alias canonical skill and no suggestions';
      end if;
    elsif resolution_status_value = 'review_required' then
      if canonical_resolution_value <> 'unresolved'
         or canonical_skill_id_value is not null
         or jsonb_array_length(suggestions_value) < 1
         or human_confirmed_value then
        raise exception 'Review-required development-program targets remain non-authoritative suggestions';
      end if;
    elsif resolution_status_value = 'unresolved' then
      if canonical_resolution_value <> 'unresolved'
         or canonical_skill_id_value is not null
         or jsonb_array_length(suggestions_value) <> 0 then
        raise exception 'Unresolved development-program targets must retain literal wording without canonical guessing';
      end if;
    else
      raise exception 'Development-program target resolution status is required';
    end if;

    if human_confirmed_value and (
      confirmation_method_text is null
      or confirmation_method_text not in ('structured_human_entry', 'ai_assisted_review', 'connector_review')
    ) then
      raise exception 'Production development-program confirmation requires an allowed non-fixture human method';
    end if;

    insert into sih26044.development_program_skill_targets (
      development_program_version_id, ordinal, literal_source_wording,
      resolution_status, canonical_resolution, canonical_skill_id,
      canonical_skill_label, resolution_suggestions, human_confirmed,
      confirmed_by_actor_id, confirmed_at, confirmation_method
    ) values (
      target_version_id, target_ordinal, literal_wording,
      resolution_status_value, canonical_resolution_value, canonical_skill_id_value,
      canonical_skill_label_value, suggestions_value, human_confirmed_value,
      case when human_confirmed_value then current_actor else null end,
      case when human_confirmed_value then statement_timestamp() else null end,
      case when human_confirmed_value then confirmation_method_text::sih26044.human_confirmation_method else null end
    );
    target_ordinal := target_ordinal + 1;
  end loop;

  update sih26044.development_programs
  set updated_at = statement_timestamp()
  where id = target_program_id;

  perform sih26044.record_authoritative_audit(
    current_actor,
    null,
    requested_provider_organization_id,
    'development_program.draft_saved',
    'development_program_version',
    target_version_id::text,
    null,
    jsonb_build_object(
      'developmentProgramId', target_program_id,
      'versionNumber', target_version_number,
      'targetCount', target_ordinal,
      'publicationImplicit', false
    )
  );

  return query select target_program_id, target_version_id, target_version_number;
end
$$;

create or replace function sih26044.publish_development_program_version(requested_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  current_actor uuid;
  target_version sih26044.development_program_versions%rowtype;
  target_program sih26044.development_programs%rowtype;
begin
  current_actor := sih26044.current_actor_id();
  if current_actor is null then raise exception 'An active SIH actor is required'; end if;

  select * into target_version
  from sih26044.development_program_versions v
  where v.id = requested_version_id
  for update;
  if target_version.id is null then raise exception 'Development-program version not found'; end if;

  select * into target_program
  from sih26044.development_programs p
  where p.id = target_version.development_program_id
  for update;
  if target_program.id is null or not sih26044.can_manage_development_program(target_program.id) then
    raise exception 'Development program not found or actor is not authorized';
  end if;
  if target_version.status <> 'draft' then
    raise exception 'Only a draft development-program version can be published';
  end if;
  if not exists (
    select 1 from sih26044.development_program_skill_targets t
    where t.development_program_version_id = target_version.id
  ) then
    raise exception 'Development program requires at least one skill/capability target';
  end if;
  if exists (
    select 1 from sih26044.development_program_skill_targets t
    where t.development_program_version_id = target_version.id
      and (t.resolution_status = 'review_required' or t.human_confirmed = false)
  ) then
    raise exception 'Every published development-program target must be explicitly human-reviewed; review-required suggestions cannot publish';
  end if;

  update sih26044.development_program_versions
  set status = 'published', published_at = statement_timestamp()
  where id = target_version.id;

  update sih26044.development_programs
  set current_version_id = target_version.id,
      status = 'published',
      updated_at = statement_timestamp()
  where id = target_program.id;

  perform sih26044.record_authoritative_audit(
    current_actor,
    null,
    target_program.provider_organization_id,
    'development_program.published',
    'development_program_version',
    target_version.id::text,
    null,
    jsonb_build_object(
      'developmentProgramId', target_program.id,
      'versionNumber', target_version.version_number,
      'canonicalMatchingOnly', true,
      'automaticEnrollment', false,
      'automaticEvidence', false
    )
  );

  return target_version.id;
end
$$;

create or replace function sih26044.list_published_development_programs(
  requested_canonical_skill_id text default null
)
returns table (
  development_program_id uuid,
  development_program_version_id uuid,
  version_number integer,
  provider_organization_id uuid,
  provider_display_name text,
  kind text,
  title text,
  description text,
  delivery_mode text,
  external_registration_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  skill_targets jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select
    p.id,
    v.id,
    v.version_number,
    p.provider_organization_id,
    o.display_name,
    v.kind::text,
    v.title,
    v.description,
    v.delivery_mode::text,
    v.external_registration_url,
    v.starts_at,
    v.ends_at,
    v.published_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'literalSourceWording', t.literal_source_wording,
        'resolutionStatus', t.resolution_status,
        'canonicalResolution', t.canonical_resolution,
        'canonicalSkillId', t.canonical_skill_id,
        'canonicalSkillLabel', t.canonical_skill_label
      ) order by t.ordinal)
      from sih26044.development_program_skill_targets t
      where t.development_program_version_id = v.id
    ), '[]'::jsonb)
  from sih26044.development_programs p
  join sih26044.development_program_versions v on v.id = p.current_version_id
  join sih26044.organizations o on o.id = p.provider_organization_id
  where p.status = 'published'
    and v.status = 'published'
    and o.status = 'active'
    and (
      requested_canonical_skill_id is null
      or exists (
        select 1
        from sih26044.development_program_skill_targets t
        where t.development_program_version_id = v.id
          and t.resolution_status = 'resolved'
          and t.canonical_skill_id = requested_canonical_skill_id
      )
    )
  order by v.published_at desc, p.id;
$$;

create or replace function sih26044.list_managed_development_programs(
  requested_provider_organization_id uuid
)
returns table (
  development_program_id uuid,
  development_program_version_id uuid,
  version_number integer,
  program_status text,
  version_status text,
  title text,
  kind text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  if not sih26044.has_any_active_organization_role(
    requested_provider_organization_id,
    array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
  ) then
    raise exception 'Actor is not authorized to manage development programs for this provider organization';
  end if;

  return query
  select distinct on (p.id)
    p.id,
    v.id,
    v.version_number,
    p.status::text,
    v.status::text,
    v.title,
    v.kind::text,
    p.updated_at
  from sih26044.development_programs p
  join sih26044.development_program_versions v on v.development_program_id = p.id
  where p.provider_organization_id = requested_provider_organization_id
  order by p.id, v.version_number desc;
end
$$;

create or replace function sih26044.get_managed_development_program_version(requested_version_id uuid)
returns table (
  development_program_id uuid,
  development_program_version_id uuid,
  version_number integer,
  provider_organization_id uuid,
  program_status text,
  version_status text,
  kind text,
  title text,
  description text,
  delivery_mode text,
  external_registration_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  skill_targets jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  program_id uuid;
begin
  select v.development_program_id into program_id
  from sih26044.development_program_versions v
  where v.id = requested_version_id;
  if program_id is null or not sih26044.can_manage_development_program(program_id) then
    raise exception 'Development-program version not found or actor is not authorized';
  end if;

  return query
  select
    p.id,
    v.id,
    v.version_number,
    p.provider_organization_id,
    p.status::text,
    v.status::text,
    v.kind::text,
    v.title,
    v.description,
    v.delivery_mode::text,
    v.external_registration_url,
    v.starts_at,
    v.ends_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'literalSourceWording', t.literal_source_wording,
        'resolutionStatus', t.resolution_status,
        'canonicalResolution', t.canonical_resolution,
        'canonicalSkillId', t.canonical_skill_id,
        'canonicalSkillLabel', t.canonical_skill_label,
        'resolutionSuggestions', t.resolution_suggestions,
        'humanConfirmed', t.human_confirmed,
        'confirmedByActorId', t.confirmed_by_actor_id,
        'confirmedAt', t.confirmed_at,
        'confirmationMethod', t.confirmation_method
      ) order by t.ordinal)
      from sih26044.development_program_skill_targets t
      where t.development_program_version_id = v.id
    ), '[]'::jsonb)
  from sih26044.development_programs p
  join sih26044.development_program_versions v on v.development_program_id = p.id
  where v.id = requested_version_id;
end
$$;

alter table sih26044.development_programs enable row level security;
alter table sih26044.development_program_versions enable row level security;
alter table sih26044.development_program_skill_targets enable row level security;

grant select on sih26044.development_programs,
  sih26044.development_program_versions,
  sih26044.development_program_skill_targets to authenticated;

create policy development_programs_select_published_or_provider
on sih26044.development_programs for select to authenticated
using (status = 'published' or sih26044.can_manage_development_program(id));

create policy development_program_versions_select_published_or_provider
on sih26044.development_program_versions for select to authenticated
using (
  (status = 'published' and exists (
    select 1 from sih26044.development_programs p
    where p.id = development_program_id
      and p.current_version_id = development_program_versions.id
      and p.status = 'published'
  ))
  or sih26044.can_manage_development_program(development_program_id)
);

create policy development_program_targets_select_visible_version
on sih26044.development_program_skill_targets for select to authenticated
using (exists (
  select 1 from sih26044.development_program_versions v
  join sih26044.development_programs p on p.id = v.development_program_id
  where v.id = development_program_version_id
    and (
      (v.status = 'published' and p.status = 'published' and p.current_version_id = v.id)
      or sih26044.can_manage_development_program(p.id)
    )
));

-- All production mutations use atomic SECURITY DEFINER RPCs; no browser table
-- write can partially create or revise a program/version/target set.
revoke insert, update, delete on sih26044.development_programs from authenticated;
revoke insert, update, delete on sih26044.development_program_versions from authenticated;
revoke insert, update, delete on sih26044.development_program_skill_targets from authenticated;

revoke all on function sih26044.can_manage_development_program(uuid) from public, anon;
revoke all on function sih26044.save_development_program_draft(uuid, uuid, uuid, jsonb) from public, anon;
revoke all on function sih26044.publish_development_program_version(uuid) from public, anon;
revoke all on function sih26044.list_published_development_programs(text) from public, anon;
revoke all on function sih26044.list_managed_development_programs(uuid) from public, anon;
revoke all on function sih26044.get_managed_development_program_version(uuid) from public, anon;
revoke execute on function sih26044.protect_published_development_program_version() from public, anon, authenticated;
revoke execute on function sih26044.protect_published_development_program_target() from public, anon, authenticated;

grant execute on function sih26044.can_manage_development_program(uuid) to authenticated;
grant execute on function sih26044.save_development_program_draft(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function sih26044.publish_development_program_version(uuid) to authenticated;
grant execute on function sih26044.list_published_development_programs(text) to authenticated;
grant execute on function sih26044.list_managed_development_programs(uuid) to authenticated;
grant execute on function sih26044.get_managed_development_program_version(uuid) to authenticated;

comment on function sih26044.list_published_development_programs(text) is
  'Published SIH26044 development-program discovery. Optional skill filtering uses exact canonical skill ids only, never fuzzy learner ranking or inferred suitability.';
comment on table sih26044.development_program_skill_targets is
  'Provider-authored capability targets with conservative canonical resolution. review_required suggestions are non-authoritative; unresolved wording stays literal.';
