-- CareerCase × SIH26044: human-owned institutional interventions derived from
-- privacy-protected Skills Intelligence. Operational intervention records are
-- institution-admin only; policy/program analysts remain aggregate-only.

create type sih26044.institution_intervention_kind as enum (
  'evidence_clinic',
  'project_clinic',
  'training_support',
  'mentoring_cohort',
  'employer_outreach',
  'faculty_industry_engagement',
  'opportunity_outreach',
  'curriculum_program_review',
  'other'
);

create type sih26044.institution_intervention_status as enum (
  'draft',
  'approved',
  'active',
  'completed',
  'cancelled'
);

create type sih26044.institution_intervention_followup_interpretation as enum (
  'descriptive',
  'associational'
);

create table sih26044.institution_interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  kind sih26044.institution_intervention_kind not null,
  title text not null check (length(btrim(title)) between 3 and 200),
  rationale text not null check (length(btrim(rationale)) between 3 and 2000),
  action_description text not null check (length(btrim(action_description)) between 3 and 4000),
  intended_population_description text not null
    check (length(btrim(intended_population_description)) between 3 and 1000),
  owner_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  initial_status sih26044.institution_intervention_status not null default 'draft'
    check (initial_status = 'draft'),
  source_methodology_version text not null check (length(btrim(source_methodology_version)) > 0),
  source_generated_at timestamptz not null,
  source_window_from timestamptz not null,
  source_window_to timestamptz not null,
  source_metric text not null check (length(btrim(source_metric)) > 0),
  source_dimensions jsonb not null check (jsonb_typeof(source_dimensions) = 'object'),
  source_value bigint not null check (source_value >= 0),
  source_denominator bigint not null check (source_denominator >= 0),
  source_cohort_size bigint not null check (source_cohort_size >= 5),
  source_interpretation text not null check (source_interpretation in ('descriptive', 'associational')),
  source_point_fingerprint text not null check (source_point_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (source_window_to > source_window_from),
  check (source_value <= source_denominator or source_denominator = 0),
  check (not sih26044.has_prohibited_json_keys(source_dimensions)),
  check (intended_population_description !~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
);

create table sih26044.institution_intervention_events (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity unique,
  intervention_id uuid not null references sih26044.institution_interventions(id) on delete restrict,
  from_status sih26044.institution_intervention_status not null,
  to_status sih26044.institution_intervention_status not null,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  note text check (note is null or length(btrim(note)) between 1 and 2000),
  occurred_at timestamptz not null default now(),
  check (from_status <> to_status)
);

create table sih26044.institution_intervention_followups (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references sih26044.institution_interventions(id) on delete restrict,
  recorded_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  methodology_version text not null check (length(btrim(methodology_version)) > 0),
  generated_at timestamptz not null,
  window_from timestamptz not null,
  window_to timestamptz not null,
  metric text not null check (length(btrim(metric)) > 0),
  dimensions jsonb not null check (jsonb_typeof(dimensions) = 'object'),
  value bigint check (value is null or value >= 0),
  denominator bigint check (denominator is null or denominator >= 0),
  cohort_size bigint check (cohort_size is null or cohort_size >= 5),
  suppressed boolean not null,
  suppression_reason text,
  interpretation sih26044.institution_intervention_followup_interpretation not null,
  causal_claimed boolean not null default false check (causal_claimed = false),
  interpretation_note text check (interpretation_note is null or length(btrim(interpretation_note)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (window_to > window_from),
  check (not sih26044.has_prohibited_json_keys(dimensions)),
  check (
    (suppressed and value is null and denominator is null and cohort_size is null and suppression_reason = 'below_minimum_cell_size')
    or
    (not suppressed and value is not null and denominator is not null and cohort_size is not null and suppression_reason is null)
  )
);

create index institution_interventions_org_idx
  on sih26044.institution_interventions (organization_id, created_at desc);
create index institution_intervention_events_history_idx
  on sih26044.institution_intervention_events (intervention_id, sequence_number desc);
create index institution_intervention_followups_history_idx
  on sih26044.institution_intervention_followups (intervention_id, created_at desc);

create or replace function sih26044.current_institution_intervention_status(requested_intervention_id uuid)
returns sih26044.institution_intervention_status
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select coalesce(
    (
      select e.to_status
      from sih26044.institution_intervention_events e
      where e.intervention_id = requested_intervention_id
      order by e.sequence_number desc
      limit 1
    ),
    (
      select i.initial_status
      from sih26044.institution_interventions i
      where i.id = requested_intervention_id
    )
  )
$$;

create or replace function sih26044.can_manage_institution_intervention(requested_intervention_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.institution_interventions i
    where i.id = requested_intervention_id
      and sih26044.has_active_organization_role(i.organization_id, 'institution_admin')
  )
$$;

create or replace function sih26044.institution_intervention_transition_allowed(
  from_value sih26044.institution_intervention_status,
  to_value sih26044.institution_intervention_status
)
returns boolean
language sql
immutable
set search_path = pg_catalog, sih26044
as $$
  select (from_value, to_value) in (
    ('draft', 'approved'),
    ('draft', 'cancelled'),
    ('approved', 'active'),
    ('approved', 'cancelled'),
    ('active', 'completed'),
    ('active', 'cancelled')
  )
$$;

create or replace function sih26044.enforce_institution_intervention_event_sequence()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  actual_status sih26044.institution_intervention_status;
begin
  perform 1
  from sih26044.institution_interventions i
  where i.id = new.intervention_id
  for update;

  actual_status := sih26044.current_institution_intervention_status(new.intervention_id);
  if actual_status is null or new.from_status <> actual_status then
    raise exception 'Institution intervention from_status does not match append-only history';
  end if;
  if not sih26044.institution_intervention_transition_allowed(new.from_status, new.to_status) then
    raise exception 'Institution intervention transition is not allowed';
  end if;
  return new;
end
$$;

create trigger enforce_institution_intervention_event_sequence
before insert on sih26044.institution_intervention_events
for each row execute function sih26044.enforce_institution_intervention_event_sequence();

create trigger institution_interventions_immutable
before update or delete on sih26044.institution_interventions
for each row execute function sih26044.reject_historical_mutation();
create trigger institution_intervention_events_immutable
before update or delete on sih26044.institution_intervention_events
for each row execute function sih26044.reject_historical_mutation();
create trigger institution_intervention_followups_immutable
before update or delete on sih26044.institution_intervention_followups
for each row execute function sih26044.reject_historical_mutation();

create or replace function sih26044.create_institution_intervention(
  requested_organization_id uuid,
  requested_kind sih26044.institution_intervention_kind,
  requested_title text,
  requested_rationale text,
  requested_action_description text,
  requested_intended_population_description text,
  requested_source_window_from timestamptz,
  requested_source_window_to timestamptz,
  requested_source_methodology_version text,
  requested_source_metric text,
  requested_source_dimensions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044, extensions
as $$
declare
  actor_id uuid;
  analytics jsonb;
  point jsonb;
  intervention_id uuid := gen_random_uuid();
  point_fingerprint text;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required to create an institution intervention';
  end if;
  if not sih26044.has_active_organization_role(requested_organization_id, 'institution_admin') then
    raise exception 'Institution-admin authority is required to create an intervention';
  end if;
  if requested_source_dimensions is null or jsonb_typeof(requested_source_dimensions) <> 'object'
    or sih26044.has_prohibited_json_keys(requested_source_dimensions) then
    raise exception 'Intervention source dimensions are invalid';
  end if;
  if requested_intended_population_description ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' then
    raise exception 'Intervention population descriptions cannot contain individual identifiers';
  end if;

  analytics := sih26044.get_institution_skills_intelligence(
    requested_organization_id,
    requested_source_window_from,
    requested_source_window_to
  );

  if analytics ->> 'accessMode' <> 'institution_admin' then
    raise exception 'Operational interventions require institution administration authority';
  end if;
  if analytics ->> 'methodologyVersion' is distinct from requested_source_methodology_version then
    raise exception 'Intervention source methodology no longer matches the authoritative aggregate report';
  end if;

  select p.value
  into point
  from jsonb_array_elements(coalesce(analytics -> 'points', '[]'::jsonb)) as p(value)
  where p.value ->> 'metric' = requested_source_metric
    and p.value -> 'dimensions' = requested_source_dimensions
  limit 1;

  if point is null then
    raise exception 'Selected aggregate source signal was not found in the authoritative report';
  end if;
  if coalesce((point ->> 'suppressed')::boolean, true)
    or point -> 'value' = 'null'::jsonb
    or point -> 'denominator' = 'null'::jsonb
    or point -> 'cohortSize' = 'null'::jsonb then
    raise exception 'Suppressed or below-threshold aggregate cells cannot seed an operational intervention';
  end if;
  if (point ->> 'cohortSize')::bigint < 5 then
    raise exception 'Operational interventions require a reportable aggregate cohort';
  end if;
  if coalesce((point ->> 'causalClaimed')::boolean, true) then
    raise exception 'Operational interventions cannot be seeded from a causal-claiming aggregate point';
  end if;

  point_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'organizationId', requested_organization_id,
          'methodologyVersion', analytics ->> 'methodologyVersion',
          'windowFrom', requested_source_window_from,
          'windowTo', requested_source_window_to,
          'metric', point ->> 'metric',
          'dimensions', point -> 'dimensions',
          'value', (point ->> 'value')::bigint,
          'denominator', (point ->> 'denominator')::bigint,
          'cohortSize', (point ->> 'cohortSize')::bigint,
          'interpretation', point ->> 'interpretation'
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id,
    initial_status, source_methodology_version, source_generated_at,
    source_window_from, source_window_to, source_metric, source_dimensions,
    source_value, source_denominator, source_cohort_size, source_interpretation,
    source_point_fingerprint, created_at
  ) values (
    intervention_id, requested_organization_id, requested_kind, btrim(requested_title),
    btrim(requested_rationale), btrim(requested_action_description),
    btrim(requested_intended_population_description), actor_id, actor_id,
    'draft', analytics ->> 'methodologyVersion', (analytics ->> 'generatedAt')::timestamptz,
    requested_source_window_from, requested_source_window_to, point ->> 'metric',
    point -> 'dimensions', (point ->> 'value')::bigint, (point ->> 'denominator')::bigint,
    (point ->> 'cohortSize')::bigint, point ->> 'interpretation', point_fingerprint,
    statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    actor_id,
    null,
    requested_organization_id,
    'institution.intervention_created',
    'institution_interventions',
    intervention_id::text,
    null,
    jsonb_build_object(
      'kind', requested_kind::text,
      'sourceMethodologyVersion', analytics ->> 'methodologyVersion',
      'sourceMetric', point ->> 'metric',
      'sourceDimensions', point -> 'dimensions',
      'sourcePointFingerprint', point_fingerprint,
      'minimumCellSize', analytics -> 'privacy' -> 'minimumCellSize'
    )
  );

  return intervention_id;
end
$$;

create or replace function sih26044.append_institution_intervention_event(
  requested_intervention_id uuid,
  requested_to_status sih26044.institution_intervention_status,
  requested_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  organization_id uuid;
  from_status sih26044.institution_intervention_status;
  event_id uuid := gen_random_uuid();
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required to act on an institution intervention';
  end if;

  select i.organization_id
  into organization_id
  from sih26044.institution_interventions i
  where i.id = requested_intervention_id
  for update;

  if organization_id is null then
    raise exception 'Institution intervention not found';
  end if;
  if not sih26044.has_active_organization_role(organization_id, 'institution_admin') then
    raise exception 'Institution-admin authority is required to change intervention lifecycle';
  end if;

  from_status := sih26044.current_institution_intervention_status(requested_intervention_id);
  if not sih26044.institution_intervention_transition_allowed(from_status, requested_to_status) then
    raise exception 'Institution intervention transition is not allowed';
  end if;

  insert into sih26044.institution_intervention_events (
    id, intervention_id, from_status, to_status, actor_id, note, occurred_at
  ) values (
    event_id, requested_intervention_id, from_status, requested_to_status, actor_id,
    nullif(btrim(coalesce(requested_note, '')), ''), statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    actor_id,
    null,
    organization_id,
    'institution.intervention_status_changed',
    'institution_interventions',
    requested_intervention_id::text,
    null,
    jsonb_build_object(
      'fromStatus', from_status::text,
      'toStatus', requested_to_status::text,
      'eventId', event_id::text
    )
  );

  return event_id;
end
$$;

create or replace function sih26044.record_institution_intervention_followup(
  requested_intervention_id uuid,
  requested_window_from timestamptz,
  requested_window_to timestamptz,
  requested_interpretation sih26044.institution_intervention_followup_interpretation,
  requested_interpretation_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  target sih26044.institution_interventions%rowtype;
  current_status sih26044.institution_intervention_status;
  analytics jsonb;
  point jsonb;
  followup_id uuid := gen_random_uuid();
  is_suppressed boolean;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required to record an intervention follow-up';
  end if;

  select * into target
  from sih26044.institution_interventions i
  where i.id = requested_intervention_id;
  if target.id is null then
    raise exception 'Institution intervention not found';
  end if;
  if not sih26044.has_active_organization_role(target.organization_id, 'institution_admin') then
    raise exception 'Institution-admin authority is required to record intervention follow-up';
  end if;

  current_status := sih26044.current_institution_intervention_status(requested_intervention_id);
  if current_status not in ('active', 'completed') then
    raise exception 'Follow-up aggregates can only be recorded for active or completed interventions';
  end if;

  analytics := sih26044.get_institution_skills_intelligence(
    target.organization_id,
    requested_window_from,
    requested_window_to
  );

  select p.value
  into point
  from jsonb_array_elements(coalesce(analytics -> 'points', '[]'::jsonb)) as p(value)
  where p.value ->> 'metric' = target.source_metric
    and p.value -> 'dimensions' = target.source_dimensions
  limit 1;

  if point is null then
    raise exception 'The intervention source metric/dimensions are not present in the follow-up aggregate report';
  end if;
  if coalesce((point ->> 'causalClaimed')::boolean, true) then
    raise exception 'Intervention follow-up cannot consume a causal-claiming aggregate point';
  end if;

  is_suppressed := coalesce((point ->> 'suppressed')::boolean, true);

  insert into sih26044.institution_intervention_followups (
    id, intervention_id, recorded_by_actor_id, methodology_version, generated_at,
    window_from, window_to, metric, dimensions, value, denominator, cohort_size,
    suppressed, suppression_reason, interpretation, causal_claimed,
    interpretation_note, created_at
  ) values (
    followup_id, requested_intervention_id, actor_id, analytics ->> 'methodologyVersion',
    (analytics ->> 'generatedAt')::timestamptz, requested_window_from, requested_window_to,
    point ->> 'metric', point -> 'dimensions',
    case when is_suppressed then null else (point ->> 'value')::bigint end,
    case when is_suppressed then null else (point ->> 'denominator')::bigint end,
    case when is_suppressed then null else (point ->> 'cohortSize')::bigint end,
    is_suppressed,
    case when is_suppressed then 'below_minimum_cell_size' else null end,
    requested_interpretation,
    false,
    nullif(btrim(coalesce(requested_interpretation_note, '')), ''),
    statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    actor_id,
    null,
    target.organization_id,
    'institution.intervention_followup_recorded',
    'institution_interventions',
    requested_intervention_id::text,
    null,
    jsonb_build_object(
      'followupId', followup_id::text,
      'methodologyVersion', analytics ->> 'methodologyVersion',
      'metric', point ->> 'metric',
      'dimensions', point -> 'dimensions',
      'suppressed', is_suppressed,
      'interpretation', requested_interpretation::text,
      'causalClaimed', false
    )
  );

  return followup_id;
end
$$;

create or replace function sih26044.list_institution_interventions(requested_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  result jsonb;
begin
  if not sih26044.has_active_organization_role(requested_organization_id, 'institution_admin') then
    raise exception 'Institution-admin authority is required to list operational interventions';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'organizationId', i.organization_id,
        'kind', i.kind,
        'title', i.title,
        'rationale', i.rationale,
        'actionDescription', i.action_description,
        'intendedPopulationDescription', i.intended_population_description,
        'ownerActorId', i.owner_actor_id,
        'createdByActorId', i.created_by_actor_id,
        'status', sih26044.current_institution_intervention_status(i.id),
        'source', jsonb_build_object(
          'methodologyVersion', i.source_methodology_version,
          'generatedAt', i.source_generated_at,
          'windowFrom', i.source_window_from,
          'windowTo', i.source_window_to,
          'metric', i.source_metric,
          'dimensions', i.source_dimensions,
          'value', i.source_value,
          'denominator', i.source_denominator,
          'cohortSize', i.source_cohort_size,
          'interpretation', i.source_interpretation,
          'pointFingerprint', i.source_point_fingerprint,
          'causalClaimed', false
        ),
        'createdAt', i.created_at,
        'latestFollowup', (
          select jsonb_build_object(
            'id', f.id,
            'methodologyVersion', f.methodology_version,
            'generatedAt', f.generated_at,
            'windowFrom', f.window_from,
            'windowTo', f.window_to,
            'metric', f.metric,
            'dimensions', f.dimensions,
            'value', f.value,
            'denominator', f.denominator,
            'cohortSize', f.cohort_size,
            'suppressed', f.suppressed,
            'suppressionReason', f.suppression_reason,
            'interpretation', f.interpretation,
            'causalClaimed', false,
            'interpretationNote', f.interpretation_note,
            'createdAt', f.created_at
          )
          from sih26044.institution_intervention_followups f
          where f.intervention_id = i.id
          order by f.created_at desc, f.id desc
          limit 1
        )
      )
      order by i.created_at desc, i.id desc
    ),
    '[]'::jsonb
  )
  into result
  from sih26044.institution_interventions i
  where i.organization_id = requested_organization_id;

  return result;
end
$$;

alter table sih26044.institution_interventions enable row level security;
alter table sih26044.institution_intervention_events enable row level security;
alter table sih26044.institution_intervention_followups enable row level security;

revoke all on table sih26044.institution_interventions from public, anon, authenticated;
revoke all on table sih26044.institution_intervention_events from public, anon, authenticated;
revoke all on table sih26044.institution_intervention_followups from public, anon, authenticated;
grant select on table sih26044.institution_interventions to authenticated;
grant select on table sih26044.institution_intervention_events to authenticated;
grant select on table sih26044.institution_intervention_followups to authenticated;

create policy institution_interventions_select_admin
on sih26044.institution_interventions for select to authenticated
using (sih26044.has_active_organization_role(organization_id, 'institution_admin'));

create policy institution_intervention_events_select_admin
on sih26044.institution_intervention_events for select to authenticated
using (sih26044.can_manage_institution_intervention(intervention_id));

create policy institution_intervention_followups_select_admin
on sih26044.institution_intervention_followups for select to authenticated
using (sih26044.can_manage_institution_intervention(intervention_id));

revoke all on function sih26044.current_institution_intervention_status(uuid) from public, anon, authenticated;
revoke all on function sih26044.can_manage_institution_intervention(uuid) from public, anon, authenticated;
revoke all on function sih26044.institution_intervention_transition_allowed(sih26044.institution_intervention_status, sih26044.institution_intervention_status) from public, anon, authenticated;
revoke all on function sih26044.enforce_institution_intervention_event_sequence() from public, anon, authenticated;
revoke all on function sih26044.create_institution_intervention(uuid, sih26044.institution_intervention_kind, text, text, text, text, timestamptz, timestamptz, text, text, jsonb) from public, anon;
revoke all on function sih26044.append_institution_intervention_event(uuid, sih26044.institution_intervention_status, text) from public, anon;
revoke all on function sih26044.record_institution_intervention_followup(uuid, timestamptz, timestamptz, sih26044.institution_intervention_followup_interpretation, text) from public, anon;
revoke all on function sih26044.list_institution_interventions(uuid) from public, anon;

grant execute on function sih26044.create_institution_intervention(uuid, sih26044.institution_intervention_kind, text, text, text, text, timestamptz, timestamptz, text, text, jsonb) to authenticated;
grant execute on function sih26044.append_institution_intervention_event(uuid, sih26044.institution_intervention_status, text) to authenticated;
grant execute on function sih26044.record_institution_intervention_followup(uuid, timestamptz, timestamptz, sih26044.institution_intervention_followup_interpretation, text) to authenticated;
grant execute on function sih26044.list_institution_interventions(uuid) to authenticated;

comment on table sih26044.institution_interventions is
  'Human-owned institutional actions derived only from reportable aggregate Skills Intelligence. No individual learner targeting or automatic intervention creation.';
comment on table sih26044.institution_intervention_events is
  'Append-only institutional intervention lifecycle. Every transition is an explicit authenticated human action.';
comment on table sih26044.institution_intervention_followups is
  'Append-only descriptive/associational aggregate follow-up. causal_claimed is structurally false; this table is not a causal impact study.';
