-- SIH26044 Foundation D1: evidence provenance, bounded verification,
-- deterministic readiness history, and purpose-specific consent.

create type sih26044.evidence_provenance as enum (
  'self_declared', 'self_reported', 'extracted', 'inferred', 'assessed',
  'artifact_backed', 'activity_observation', 'human_attested',
  'issuer_verified', 'outcome_linked'
);
create type sih26044.evidence_proposal_source as enum (
  'ai_extraction', 'rule_based_extraction', 'user_entry', 'connector_import'
);
create type sih26044.verification_state as enum (
  'proposed', 'unverified', 'self_confirmed', 'human_verified',
  'issuer_verified', 'disputed', 'revoked', 'corrected'
);
create type sih26044.evidence_scope_kind as enum ('global_skill', 'opportunity', 'organization', 'outcome');
create type sih26044.evidence_visibility as enum ('private', 'consented_application', 'organization_scoped', 'public');
create type sih26044.artifact_scan_status as enum ('pending', 'clean', 'quarantined', 'rejected', 'not_scanned');
create type sih26044.verification_request_status as enum ('requested', 'accepted', 'closed', 'cancelled');
create type sih26044.verification_action as enum (
  'submitted_for_review', 'self_confirmed', 'verified_by_human',
  'verified_by_issuer', 'disputed', 'revoked', 'corrected'
);
create type sih26044.readiness_band as enum (
  'NOT_ELIGIBLE', 'NEEDS_REVIEW', 'BUILDING_EVIDENCE', 'NEAR_READY', 'READY_FOR_REVIEW'
);
create type sih26044.consent_purpose as enum (
  'application_review', 'evidence_verification', 'institution_support', 'aggregate_analytics'
);
create type sih26044.consent_lifecycle_action as enum ('granted', 'withdrawn', 'expired');

create or replace function sih26044.reject_historical_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
begin
  raise exception '% is append-only and immutable', tg_table_name;
end
$$;

create table sih26044.evidence_records (
  id uuid primary key default gen_random_uuid(),
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  literal_claim text not null check (length(btrim(literal_claim)) > 0),
  provenance sih26044.evidence_provenance not null,
  initial_verification_state sih26044.verification_state not null,
  proposal_source sih26044.evidence_proposal_source,
  scope_kind sih26044.evidence_scope_kind not null,
  scope_skill_id text,
  scope_literal_skill_label text,
  scope_opportunity_id uuid references sih26044.opportunities(id) on delete restrict,
  scope_requirement_id uuid references sih26044.opportunity_requirements(id) on delete restrict,
  scope_organization_id uuid references sih26044.organizations(id) on delete restrict,
  scope_outcome_event_id uuid,
  source_system text not null,
  source_record_id text,
  source_url text,
  source_captured_at timestamptz not null,
  visibility sih26044.evidence_visibility not null default 'private',
  created_at timestamptz not null default now(),
  check (
    (initial_verification_state = 'proposed' and proposal_source is not null)
    or initial_verification_state <> 'proposed'
  ),
  check (
    (scope_kind = 'global_skill'
      and scope_literal_skill_label is not null
      and scope_opportunity_id is null and scope_requirement_id is null
      and scope_organization_id is null and scope_outcome_event_id is null)
    or
    (scope_kind = 'opportunity'
      and scope_opportunity_id is not null
      and scope_skill_id is null and scope_literal_skill_label is null
      and scope_organization_id is null and scope_outcome_event_id is null)
    or
    (scope_kind = 'organization'
      and scope_organization_id is not null
      and scope_skill_id is null and scope_literal_skill_label is null
      and scope_opportunity_id is null and scope_requirement_id is null and scope_outcome_event_id is null)
    or
    (scope_kind = 'outcome'
      and scope_outcome_event_id is not null
      and scope_skill_id is null and scope_literal_skill_label is null
      and scope_opportunity_id is null and scope_requirement_id is null and scope_organization_id is null)
  )
);

create table sih26044.artifacts (
  id uuid primary key default gen_random_uuid(),
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  storage_bucket_id text not null default 'career-evidence-private',
  storage_object_path text not null,
  media_type text not null,
  display_name text not null check (length(btrim(display_name)) > 0),
  integrity_fingerprint text,
  scan_status sih26044.artifact_scan_status not null default 'not_scanned',
  created_at timestamptz not null default now(),
  unique (storage_bucket_id, storage_object_path),
  check (storage_bucket_id = 'career-evidence-private'),
  check (split_part(storage_object_path, '/', 1) = subject_actor_id::text),
  check (split_part(storage_object_path, '/', 2) = id::text),
  check (storage_object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$')
);

create table sih26044.evidence_artifact_links (
  evidence_record_id uuid not null references sih26044.evidence_records(id) on delete restrict,
  artifact_id uuid not null references sih26044.artifacts(id) on delete restrict,
  linked_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (evidence_record_id, artifact_id)
);

create table sih26044.verification_requests (
  id uuid primary key default gen_random_uuid(),
  evidence_record_id uuid not null references sih26044.evidence_records(id) on delete restrict,
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  requested_verifier_actor_id uuid references sih26044.actors(id) on delete restrict,
  requested_verifier_organization_id uuid references sih26044.organizations(id) on delete restrict,
  consent_grant_id uuid not null,
  scope_kind sih26044.evidence_scope_kind not null,
  scope_skill_id text,
  scope_literal_skill_label text,
  scope_opportunity_id uuid references sih26044.opportunities(id) on delete restrict,
  scope_requirement_id uuid references sih26044.opportunity_requirements(id) on delete restrict,
  scope_organization_id uuid references sih26044.organizations(id) on delete restrict,
  scope_outcome_event_id uuid,
  status sih26044.verification_request_status not null default 'requested',
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  closed_at timestamptz,
  unique (id, evidence_record_id),
  check (requested_verifier_actor_id is not null or requested_verifier_organization_id is not null),
  check (expires_at is null or expires_at > requested_at),
  check (closed_at is null or closed_at >= requested_at)
);

create table sih26044.verification_events (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity unique,
  verification_request_id uuid not null,
  evidence_record_id uuid not null,
  action sih26044.verification_action not null,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  actor_organization_id uuid references sih26044.organizations(id) on delete restrict,
  reason text,
  supersedes_event_id uuid references sih26044.verification_events(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  foreign key (verification_request_id, evidence_record_id)
    references sih26044.verification_requests(id, evidence_record_id) on delete restrict,
  check (action not in ('disputed', 'revoked', 'corrected') or (reason is not null and length(btrim(reason)) > 0))
);

create table sih26044.opportunity_readiness_results (
  id uuid primary key,
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  opportunity_id uuid not null references sih26044.opportunities(id) on delete restrict,
  opportunity_version_id uuid not null,
  engine_version text not null,
  evidence_policy_version text not null,
  input_version text not null,
  subject_facts_version text not null,
  evidence_projection_version text not null,
  readiness_band sih26044.readiness_band not null,
  result_body jsonb not null check (jsonb_typeof(result_body) = 'object'),
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (opportunity_version_id, opportunity_id)
    references sih26044.opportunity_versions(id, opportunity_id) on delete restrict,
  check (result_body::text !~* '(readiness_percentage|fit_percentage|hiring_probability|success_probability|employability_score|candidate_rank|opaque_fit_score)')
);

create table sih26044.consent_grants (
  id uuid primary key default gen_random_uuid(),
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  grantee_organization_id uuid references sih26044.organizations(id) on delete restrict,
  purpose sih26044.consent_purpose not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > granted_at),
  check (purpose <> 'application_review' or grantee_organization_id is not null)
);

create table sih26044.consent_evidence_records (
  consent_grant_id uuid not null references sih26044.consent_grants(id) on delete restrict,
  evidence_record_id uuid not null references sih26044.evidence_records(id) on delete restrict,
  primary key (consent_grant_id, evidence_record_id)
);

create table sih26044.consent_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity unique,
  consent_grant_id uuid not null references sih26044.consent_grants(id) on delete restrict,
  action sih26044.consent_lifecycle_action not null,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  reason text,
  occurred_at timestamptz not null default now(),
  check (action = 'granted' or length(btrim(reason)) > 0)
);

alter table sih26044.verification_requests
  add constraint verification_requests_consent_fk
  foreign key (consent_grant_id) references sih26044.consent_grants(id) on delete restrict;

create or replace function sih26044.validate_verification_request_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  evidence sih26044.evidence_records%rowtype;
begin
  select * into evidence from sih26044.evidence_records where id = new.evidence_record_id;
  if evidence.id is null
    or evidence.subject_actor_id <> new.subject_actor_id
    or evidence.scope_kind <> new.scope_kind
    or evidence.scope_skill_id is distinct from new.scope_skill_id
    or evidence.scope_literal_skill_label is distinct from new.scope_literal_skill_label
    or evidence.scope_opportunity_id is distinct from new.scope_opportunity_id
    or evidence.scope_requirement_id is distinct from new.scope_requirement_id
    or evidence.scope_organization_id is distinct from new.scope_organization_id
    or evidence.scope_outcome_event_id is distinct from new.scope_outcome_event_id
  then
    raise exception 'Verification request scope must exactly match its bounded evidence record';
  end if;
  if not sih26044.is_consent_active(
    new.consent_grant_id,
    new.subject_actor_id,
    new.requested_verifier_organization_id,
    'evidence_verification'
  ) or not exists (
    select 1 from sih26044.consent_evidence_records ce
    where ce.consent_grant_id = new.consent_grant_id
      and ce.evidence_record_id = new.evidence_record_id
  ) then
    raise exception 'Verification request requires active evidence_verification consent for this exact evidence record';
  end if;
  return new;
end
$$;

create trigger validate_verification_request_scope
before insert or update on sih26044.verification_requests
for each row execute function sih26044.validate_verification_request_scope();

create or replace function sih26044.append_initial_consent_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  insert into sih26044.consent_lifecycle_events (consent_grant_id, action, actor_id, occurred_at)
  values (new.id, 'granted', new.created_by_actor_id, new.granted_at);
  return new;
end
$$;

create trigger append_initial_consent_event
after insert on sih26044.consent_grants
for each row execute function sih26044.append_initial_consent_event();

create or replace function sih26044.is_consent_active(
  requested_consent_id uuid,
  requested_subject_actor_id uuid,
  requested_grantee_organization_id uuid,
  requested_purpose sih26044.consent_purpose
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.consent_grants g
    where g.id = requested_consent_id
      and g.subject_actor_id = requested_subject_actor_id
      and g.grantee_organization_id is not distinct from requested_grantee_organization_id
      and g.purpose = requested_purpose
      and g.granted_at <= statement_timestamp()
      and (g.expires_at is null or g.expires_at > statement_timestamp())
      and (
        select e.action
        from sih26044.consent_lifecycle_events e
        where e.consent_grant_id = g.id
          and e.occurred_at <= statement_timestamp()
        order by e.sequence_number desc
        limit 1
      ) = 'granted'
  )
$$;

create or replace function sih26044.current_scoped_verification_state(
  requested_evidence_record_id uuid,
  requested_verification_request_id uuid
)
returns sih26044.verification_state
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select coalesce(
    (
      select case e.action
        when 'self_confirmed' then 'self_confirmed'::sih26044.verification_state
        when 'verified_by_human' then 'human_verified'::sih26044.verification_state
        when 'verified_by_issuer' then 'issuer_verified'::sih26044.verification_state
        when 'disputed' then 'disputed'::sih26044.verification_state
        when 'revoked' then 'revoked'::sih26044.verification_state
        when 'corrected' then 'corrected'::sih26044.verification_state
        else null
      end
      from sih26044.verification_events e
      where e.evidence_record_id = requested_evidence_record_id
        and e.verification_request_id = requested_verification_request_id
      order by e.sequence_number desc
      limit 1
    ),
    (select r.initial_verification_state from sih26044.evidence_records r where r.id = requested_evidence_record_id)
  )
$$;

create index evidence_records_subject_idx on sih26044.evidence_records (subject_actor_id, created_at desc);
create index artifacts_subject_idx on sih26044.artifacts (subject_actor_id, created_at desc);
create index verification_requests_evidence_idx on sih26044.verification_requests (evidence_record_id, status);
create index verification_events_request_idx on sih26044.verification_events (verification_request_id, sequence_number desc);
create index readiness_results_subject_idx on sih26044.opportunity_readiness_results (subject_actor_id, generated_at desc);
create index readiness_results_opportunity_idx on sih26044.opportunity_readiness_results (opportunity_version_id, generated_at desc);
create index consent_grants_subject_idx on sih26044.consent_grants (subject_actor_id, purpose, granted_at desc);
create index consent_events_grant_idx on sih26044.consent_lifecycle_events (consent_grant_id, sequence_number desc);

create trigger evidence_records_immutable
before update or delete on sih26044.evidence_records
for each row execute function sih26044.reject_historical_mutation();
create trigger evidence_artifact_links_immutable
before update or delete on sih26044.evidence_artifact_links
for each row execute function sih26044.reject_historical_mutation();
create trigger verification_events_immutable
before update or delete on sih26044.verification_events
for each row execute function sih26044.reject_historical_mutation();
create trigger readiness_results_immutable
before update or delete on sih26044.opportunity_readiness_results
for each row execute function sih26044.reject_historical_mutation();
create trigger consent_grants_immutable
before update or delete on sih26044.consent_grants
for each row execute function sih26044.reject_historical_mutation();
create trigger consent_evidence_records_immutable
before update or delete on sih26044.consent_evidence_records
for each row execute function sih26044.reject_historical_mutation();
create trigger consent_lifecycle_events_immutable
before update or delete on sih26044.consent_lifecycle_events
for each row execute function sih26044.reject_historical_mutation();

revoke all on function sih26044.is_consent_active(uuid, uuid, uuid, sih26044.consent_purpose) from public;
revoke all on function sih26044.current_scoped_verification_state(uuid, uuid) from public;
grant execute on function sih26044.is_consent_active(uuid, uuid, uuid, sih26044.consent_purpose) to authenticated;
grant execute on function sih26044.current_scoped_verification_state(uuid, uuid) to authenticated;

comment on column sih26044.evidence_records.provenance is
  'Categorical source provenance. Verification events never promote or rewrite this value.';
comment on column sih26044.artifacts.integrity_fingerprint is
  'Content integrity fingerprint only; artifact existence or checksum does not imply verification.';
comment on table sih26044.opportunity_readiness_results is
  'Immutable deterministic Engine B results. No percentage or probability is persisted.';
