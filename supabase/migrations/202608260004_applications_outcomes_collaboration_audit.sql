-- SIH26044 Foundation D1: immutable application snapshots, append-only events,
-- outcomes, collaboration, and constrained audit history.

create type sih26044.application_stage as enum (
  'saved', 'preparing', 'applied', 'screening', 'evidence_requested',
  'under_review', 'interview', 'shortlisted', 'offered', 'accepted',
  'declined', 'rejected_by_human', 'withdrawn', 'active', 'completed',
  'cancelled', 'outcome_recorded'
);
create type sih26044.application_event_kind as enum ('stage_transition', 'human_rejection');
create type sih26044.outcome_kind as enum (
  'selected', 'joined', 'completed', 'credential_awarded',
  'project_delivered', 'placement_confirmed', 'engagement_completed'
);
create type sih26044.collaboration_kind as enum (
  'faculty_internship', 'industrial_training', 'faculty_development_program',
  'consultancy', 'collaborative_research', 'mentoring', 'workshop',
  'guest_lecture', 'live_project'
);
create type sih26044.collaboration_status as enum ('proposed', 'approved', 'active', 'completed', 'cancelled');

create table sih26044.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  opportunity_id uuid not null references sih26044.opportunities(id) on delete restrict,
  opportunity_version_id uuid not null,
  owner_organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  initial_stage sih26044.application_stage not null default 'saved'
    check (initial_stage in ('saved', 'preparing')),
  created_at timestamptz not null default now(),
  foreign key (opportunity_version_id, opportunity_id)
    references sih26044.opportunity_versions(id, opportunity_id) on delete restrict
);

create or replace function sih26044.validate_application_opportunity_boundary()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
begin
  if not exists (
    select 1
    from sih26044.opportunities o
    join sih26044.opportunity_versions v
      on v.id = new.opportunity_version_id and v.opportunity_id = o.id
    where o.id = new.opportunity_id
      and o.owner_organization_id = new.owner_organization_id
      and v.status = 'published'
  ) then
    raise exception 'Applications require an exact published opportunity version and owner organization';
  end if;
  return new;
end
$$;

create trigger validate_application_opportunity_boundary
before insert on sih26044.applications
for each row execute function sih26044.validate_application_opportunity_boundary();

create or replace function sih26044.recruiter_projection_is_allowlisted(projection jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, sih26044
as $$
declare
  key text;
  allowed_keys constant text[] := array[
    'applicant', 'applicationId', 'applicationSnapshotId', 'applicationStage',
    'consentRecordId', 'educationSummary', 'evidence', 'opportunityId',
    'opportunityVersionId', 'readinessBand', 'readinessResultId',
    'requirements', 'sharedWorkSamples'
  ];
begin
  if jsonb_typeof(projection) <> 'object' then return false; end if;
  for key in select jsonb_object_keys(projection)
  loop
    if not (key = any(allowed_keys)) then return false; end if;
  end loop;
  return projection::text !~* '"(riasec|work_?values|private_?aspirations|counselor_?history|financial_?constraints|family_?constraints|private_?constraints|guardian_?data|unrelated_?disability|unrelated_?accessibility)"[[:space:]]*:';
end
$$;

create table sih26044.application_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references sih26044.applications(id) on delete restrict,
  opportunity_version_id uuid not null references sih26044.opportunity_versions(id) on delete restrict,
  readiness_result_id uuid not null references sih26044.opportunity_readiness_results(id) on delete restrict,
  engine_version text not null,
  evidence_policy_version text not null,
  input_version text not null,
  subject_facts_version text not null,
  evidence_projection_version text not null,
  recruiter_projection_version text not null,
  recruiter_allowlist_projection jsonb not null,
  requirement_responses jsonb not null default '{}'::jsonb check (jsonb_typeof(requirement_responses) = 'object'),
  captured_at timestamptz not null,
  integrity_fingerprint text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  check (sih26044.recruiter_projection_is_allowlisted(recruiter_allowlist_projection)),
  check (
    (finalized_at is null and integrity_fingerprint is null)
    or (finalized_at is not null and integrity_fingerprint ~ '^[0-9a-f]{64}$')
  )
);

create table sih26044.application_snapshot_evidence (
  application_snapshot_id uuid not null references sih26044.application_snapshots(id) on delete restrict,
  evidence_record_id uuid not null references sih26044.evidence_records(id) on delete restrict,
  primary key (application_snapshot_id, evidence_record_id)
);

create table sih26044.application_snapshot_consents (
  application_snapshot_id uuid not null references sih26044.application_snapshots(id) on delete restrict,
  consent_grant_id uuid not null references sih26044.consent_grants(id) on delete restrict,
  primary key (application_snapshot_id, consent_grant_id)
);

create table sih26044.application_events (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity unique,
  application_id uuid not null references sih26044.applications(id) on delete restrict,
  from_stage sih26044.application_stage not null,
  to_stage sih26044.application_stage not null,
  event_kind sih26044.application_event_kind not null,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  reason text,
  note text,
  occurred_at timestamptz not null default now(),
  check (from_stage <> to_stage),
  check (
    (to_stage = 'rejected_by_human' and event_kind = 'human_rejection' and reason is not null and length(btrim(reason)) > 0)
    or (to_stage <> 'rejected_by_human' and event_kind = 'stage_transition')
  )
);

create or replace function sih26044.current_application_stage(requested_application_id uuid)
returns sih26044.application_stage
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select coalesce(
    (
      select e.to_stage
      from sih26044.application_events e
      where e.application_id = requested_application_id
      order by e.sequence_number desc
      limit 1
    ),
    (select a.initial_stage from sih26044.applications a where a.id = requested_application_id)
  )
$$;

create or replace function sih26044.application_transition_allowed(
  from_value sih26044.application_stage,
  to_value sih26044.application_stage
)
returns boolean
language sql
immutable
set search_path = pg_catalog, sih26044
as $$
  select (from_value, to_value) in (
    ('saved', 'preparing'), ('saved', 'applied'), ('saved', 'withdrawn'), ('saved', 'cancelled'),
    ('preparing', 'applied'), ('preparing', 'withdrawn'), ('preparing', 'cancelled'),
    ('applied', 'screening'), ('applied', 'evidence_requested'), ('applied', 'under_review'), ('applied', 'withdrawn'), ('applied', 'cancelled'),
    ('screening', 'evidence_requested'), ('screening', 'under_review'), ('screening', 'interview'), ('screening', 'shortlisted'), ('screening', 'rejected_by_human'),
    ('evidence_requested', 'under_review'), ('evidence_requested', 'withdrawn'), ('evidence_requested', 'cancelled'), ('evidence_requested', 'rejected_by_human'),
    ('under_review', 'evidence_requested'), ('under_review', 'interview'), ('under_review', 'shortlisted'), ('under_review', 'offered'), ('under_review', 'rejected_by_human'),
    ('interview', 'shortlisted'), ('interview', 'offered'), ('interview', 'rejected_by_human'),
    ('shortlisted', 'interview'), ('shortlisted', 'offered'), ('shortlisted', 'rejected_by_human'),
    ('offered', 'accepted'), ('offered', 'declined'), ('offered', 'withdrawn'), ('offered', 'cancelled'),
    ('accepted', 'active'), ('accepted', 'declined'), ('accepted', 'cancelled'),
    ('active', 'completed'), ('active', 'cancelled'), ('active', 'outcome_recorded'),
    ('completed', 'outcome_recorded'), ('declined', 'outcome_recorded'),
    ('rejected_by_human', 'outcome_recorded'), ('withdrawn', 'outcome_recorded'), ('cancelled', 'outcome_recorded')
  )
$$;

create or replace function sih26044.enforce_application_event_sequence()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  actual_stage sih26044.application_stage;
begin
  perform 1 from sih26044.applications where id = new.application_id for update;
  actual_stage := sih26044.current_application_stage(new.application_id);
  if actual_stage is null or new.from_stage <> actual_stage then
    raise exception 'Application event from_stage does not match current append-only history';
  end if;
  if not sih26044.application_transition_allowed(new.from_stage, new.to_stage) then
    raise exception 'Application stage transition is not allowed';
  end if;
  if new.to_stage = 'applied' and not exists (
    select 1 from sih26044.application_snapshots s
    where s.application_id = new.application_id and s.finalized_at is not null
  ) then
    raise exception 'An application cannot be submitted without a finalized immutable snapshot';
  end if;
  return new;
end
$$;

create trigger enforce_application_event_sequence
before insert on sih26044.application_events
for each row execute function sih26044.enforce_application_event_sequence();

create or replace function sih26044.protect_finalized_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
begin
  if tg_op = 'DELETE' or old.finalized_at is not null then
    raise exception 'Finalized application snapshots are immutable';
  end if;
  return new;
end
$$;

create trigger protect_finalized_snapshot
before update or delete on sih26044.application_snapshots
for each row execute function sih26044.protect_finalized_snapshot();

create or replace function sih26044.protect_finalized_snapshot_link()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  snapshot_id uuid := case when tg_op = 'DELETE' then old.application_snapshot_id else new.application_snapshot_id end;
begin
  if exists (
    select 1 from sih26044.application_snapshots s
    where s.id = snapshot_id and s.finalized_at is not null
  ) then
    raise exception 'Finalized application snapshot links are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create trigger protect_application_snapshot_evidence
before insert or update or delete on sih26044.application_snapshot_evidence
for each row execute function sih26044.protect_finalized_snapshot_link();
create trigger protect_application_snapshot_consents
before insert or update or delete on sih26044.application_snapshot_consents
for each row execute function sih26044.protect_finalized_snapshot_link();

create or replace function sih26044.application_snapshot_canonical_material(requested_snapshot_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select jsonb_build_object(
    'applicationId', s.application_id,
    'opportunityVersionId', s.opportunity_version_id,
    'readinessResultId', s.readiness_result_id,
    'engineVersion', s.engine_version,
    'evidencePolicyVersion', s.evidence_policy_version,
    'inputVersion', s.input_version,
    'subjectFactsVersion', s.subject_facts_version,
    'evidenceProjectionVersion', s.evidence_projection_version,
    'recruiterProjectionVersion', s.recruiter_projection_version,
    'recruiterAllowlistProjection', s.recruiter_allowlist_projection,
    'requirementResponses', s.requirement_responses,
    'evidenceRecordIds', coalesce((
      select jsonb_agg(l.evidence_record_id::text order by l.evidence_record_id::text)
      from sih26044.application_snapshot_evidence l
      where l.application_snapshot_id = s.id
    ), '[]'::jsonb),
    'consentGrantIds', coalesce((
      select jsonb_agg(l.consent_grant_id::text order by l.consent_grant_id::text)
      from sih26044.application_snapshot_consents l
      where l.application_snapshot_id = s.id
    ), '[]'::jsonb),
    'capturedAt', to_char(s.captured_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  )
  from sih26044.application_snapshots s
  where s.id = requested_snapshot_id
$$;

create or replace function sih26044.finalize_application_snapshot(requested_snapshot_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, sih26044, extensions
as $$
declare
  target record;
  canonical_material jsonb;
  fingerprint text;
begin
  select s.*, a.applicant_actor_id, a.owner_organization_id, a.opportunity_version_id as application_opportunity_version_id
  into target
  from sih26044.application_snapshots s
  join sih26044.applications a on a.id = s.application_id
  where s.id = requested_snapshot_id
  for update of s;

  if target.id is null then raise exception 'Application snapshot not found'; end if;
  if target.finalized_at is not null then return target.integrity_fingerprint; end if;
  if target.applicant_actor_id <> sih26044.current_actor_id() then
    raise exception 'Only the applicant can finalize this snapshot';
  end if;
  if target.opportunity_version_id <> target.application_opportunity_version_id then
    raise exception 'Snapshot must use the application opportunity version';
  end if;
  if not exists (
    select 1
    from sih26044.opportunity_readiness_results r
    where r.id = target.readiness_result_id
      and r.subject_actor_id = target.applicant_actor_id
      and r.opportunity_version_id = target.opportunity_version_id
      and r.engine_version = target.engine_version
      and r.evidence_policy_version = target.evidence_policy_version
      and r.input_version = target.input_version
      and r.subject_facts_version = target.subject_facts_version
      and r.evidence_projection_version = target.evidence_projection_version
  ) then
    raise exception 'Snapshot readiness reference/version metadata is inconsistent';
  end if;
  if not exists (
    select 1
    from sih26044.application_snapshot_consents sc
    join sih26044.consent_grants g on g.id = sc.consent_grant_id
    where sc.application_snapshot_id = target.id
      and sih26044.is_consent_active(g.id, target.applicant_actor_id, target.owner_organization_id, 'application_review')
  ) then
    raise exception 'Active purpose-specific application_review consent is required';
  end if;
  if exists (
    select 1
    from sih26044.application_snapshot_evidence se
    where se.application_snapshot_id = target.id
      and not exists (
        select 1
        from sih26044.application_snapshot_consents sc
        join sih26044.consent_grants g on g.id = sc.consent_grant_id
        join sih26044.consent_evidence_records ce
          on ce.consent_grant_id = g.id and ce.evidence_record_id = se.evidence_record_id
        where sc.application_snapshot_id = target.id
          and sih26044.is_consent_active(g.id, target.applicant_actor_id, target.owner_organization_id, 'application_review')
      )
  ) then
    raise exception 'Every selected evidence record must be explicitly covered by active application_review consent';
  end if;

  canonical_material := sih26044.application_snapshot_canonical_material(target.id);
  fingerprint := encode(extensions.digest(convert_to(canonical_material::text, 'UTF8'), 'sha256'), 'hex');
  update sih26044.application_snapshots
  set integrity_fingerprint = fingerprint, finalized_at = statement_timestamp()
  where id = target.id;
  return fingerprint;
end
$$;

create table sih26044.outcome_events (
  id uuid primary key default gen_random_uuid(),
  kind sih26044.outcome_kind not null,
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  opportunity_id uuid references sih26044.opportunities(id) on delete restrict,
  application_id uuid references sih26044.applications(id) on delete restrict,
  recorded_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table sih26044.outcome_application_snapshots (
  outcome_event_id uuid not null references sih26044.outcome_events(id) on delete restrict,
  application_snapshot_id uuid not null references sih26044.application_snapshots(id) on delete restrict,
  primary key (outcome_event_id, application_snapshot_id)
);

create table sih26044.outcome_evidence_emissions (
  id uuid primary key default gen_random_uuid(),
  outcome_event_id uuid not null references sih26044.outcome_events(id) on delete restrict,
  literal_claim text not null check (length(btrim(literal_claim)) > 0),
  scope_kind sih26044.evidence_scope_kind not null,
  scope_definition jsonb not null check (jsonb_typeof(scope_definition) = 'object'),
  requires_human_confirmation boolean not null,
  generated_evidence_record_id uuid references sih26044.evidence_records(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (generated_evidence_record_id is null or requires_human_confirmation = true)
);

alter table sih26044.evidence_records
  add constraint evidence_records_outcome_scope_fk
  foreign key (scope_outcome_event_id) references sih26044.outcome_events(id) on delete restrict;
alter table sih26044.verification_requests
  add constraint verification_requests_outcome_scope_fk
  foreign key (scope_outcome_event_id) references sih26044.outcome_events(id) on delete restrict;

create table sih26044.collaboration_engagements (
  id uuid primary key default gen_random_uuid(),
  kind sih26044.collaboration_kind not null,
  opportunity_id uuid references sih26044.opportunities(id) on delete restrict,
  host_organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  status sih26044.collaboration_status not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table sih26044.collaboration_partner_organizations (
  collaboration_engagement_id uuid not null references sih26044.collaboration_engagements(id) on delete cascade,
  organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  primary key (collaboration_engagement_id, organization_id)
);

create table sih26044.collaboration_participants (
  collaboration_engagement_id uuid not null references sih26044.collaboration_engagements(id) on delete cascade,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  primary key (collaboration_engagement_id, actor_id)
);

create table sih26044.collaboration_objectives (
  collaboration_engagement_id uuid not null references sih26044.collaboration_engagements(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  objective text not null check (length(btrim(objective)) > 0),
  primary key (collaboration_engagement_id, ordinal)
);

create table sih26044.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  organization_id uuid references sih26044.organizations(id) on delete restrict,
  action text not null check (length(btrim(action)) > 0),
  resource_type text not null check (length(btrim(resource_type)) > 0),
  resource_id text not null check (length(btrim(resource_id)) > 0),
  purpose sih26044.consent_purpose,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (metadata::text !~* '"(password|secret|token|service_?role|raw_?document|document_?content)"[[:space:]]*:')
);

create index applications_applicant_idx on sih26044.applications (applicant_actor_id, created_at desc);
create index applications_owner_org_idx on sih26044.applications (owner_organization_id, created_at desc);
create index application_snapshots_application_idx on sih26044.application_snapshots (application_id, captured_at desc);
create index application_events_application_idx on sih26044.application_events (application_id, sequence_number desc);
create index outcome_events_subject_idx on sih26044.outcome_events (subject_actor_id, occurred_at desc);
create index collaborations_host_idx on sih26044.collaboration_engagements (host_organization_id, status);
create index audit_events_org_idx on sih26044.audit_events (organization_id, occurred_at desc);

create trigger application_events_immutable
before update or delete on sih26044.application_events
for each row execute function sih26044.reject_historical_mutation();
create trigger outcome_events_immutable
before update or delete on sih26044.outcome_events
for each row execute function sih26044.reject_historical_mutation();
create trigger outcome_snapshot_links_immutable
before update or delete on sih26044.outcome_application_snapshots
for each row execute function sih26044.reject_historical_mutation();
create trigger outcome_evidence_emissions_immutable
before update or delete on sih26044.outcome_evidence_emissions
for each row execute function sih26044.reject_historical_mutation();
create trigger audit_events_immutable
before update or delete on sih26044.audit_events
for each row execute function sih26044.reject_historical_mutation();

revoke all on function sih26044.current_application_stage(uuid) from public;
revoke all on function sih26044.application_snapshot_canonical_material(uuid) from public;
revoke all on function sih26044.finalize_application_snapshot(uuid) from public;
grant execute on function sih26044.current_application_stage(uuid) to authenticated;
grant execute on function sih26044.finalize_application_snapshot(uuid) to authenticated;

comment on column sih26044.application_snapshots.integrity_fingerprint is
  'Reproducible SHA-256 integrity fingerprint over deterministic canonical snapshot material; not a digital signature.';
comment on table sih26044.outcome_events is
  'Descriptive append-only outcomes. Recording an outcome does not assert mastery or causality.';
