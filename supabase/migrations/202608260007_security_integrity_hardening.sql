-- SIH26044 Foundation D1.1: forward-only production trust-boundary hardening.
-- Migrations 001-006 remain unchanged to preserve the reviewed defect/fix history.

-- ---------------------------------------------------------------------------
-- HumanConfirmationTrace authenticity and exact-content binding
-- ---------------------------------------------------------------------------

create or replace function sih26044.enforce_authenticated_requirement_confirmation()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  content_changed boolean := false;
  trace_changed boolean := false;
  fresh_confirmation boolean := false;
begin
  if current_user <> 'authenticated' then return new; end if;

  actor_id := sih26044.current_actor_id();
  if actor_id is null then raise exception 'An active SIH actor is required to confirm opportunity content'; end if;

  if tg_op = 'UPDATE' then
    content_changed := row(
      new.ordinal, new.literal_source_wording, new.category, new.priority,
      new.importance, new.evidence_expectation, new.hard_gate,
      new.canonical_resolution, new.canonical_skill_id, new.canonical_skill_label,
      new.minimum_proficiency, new.minimum_years, new.category_payload
    ) is distinct from row(
      old.ordinal, old.literal_source_wording, old.category, old.priority,
      old.importance, old.evidence_expectation, old.hard_gate,
      old.canonical_resolution, old.canonical_skill_id, old.canonical_skill_label,
      old.minimum_proficiency, old.minimum_years, old.category_payload
    );
    trace_changed := row(
      new.human_confirmed, new.confirmed_by_actor_id,
      new.confirmed_at, new.confirmation_method
    ) is distinct from row(
      old.human_confirmed, old.confirmed_by_actor_id,
      old.confirmed_at, old.confirmation_method
    );
  end if;

  if tg_op = 'INSERT' then
    fresh_confirmation := new.human_confirmed;
  else
    fresh_confirmation := new.human_confirmed and (not old.human_confirmed or trace_changed);
  end if;

  if content_changed and not fresh_confirmation then
    new.human_confirmed := false;
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
    return new;
  end if;

  if fresh_confirmation then
    if new.confirmed_by_actor_id is not null and new.confirmed_by_actor_id <> actor_id then
      raise exception 'Authenticated clients cannot impersonate another confirmation actor';
    end if;
    if new.confirmation_method is null
      or new.confirmation_method not in ('structured_human_entry', 'ai_assisted_review')
    then
      raise exception 'Authenticated confirmation requires a production human-review method';
    end if;
    new.confirmed_by_actor_id := actor_id;
    new.confirmed_at := statement_timestamp();
    return new;
  end if;

  if not new.human_confirmed then
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
  end if;
  return new;
end
$$;

create or replace function sih26044.enforce_authenticated_eligibility_confirmation()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  content_changed boolean := false;
  trace_changed boolean := false;
  fresh_confirmation boolean := false;
begin
  if current_user <> 'authenticated' then return new; end if;

  actor_id := sih26044.current_actor_id();
  if actor_id is null then raise exception 'An active SIH actor is required to confirm eligibility content'; end if;

  if tg_op = 'UPDATE' then
    content_changed := row(
      new.ordinal, new.rule_kind, new.literal_source_wording, new.typed_rule_definition
    ) is distinct from row(
      old.ordinal, old.rule_kind, old.literal_source_wording, old.typed_rule_definition
    );
    trace_changed := row(
      new.human_confirmed, new.confirmed_by_actor_id,
      new.confirmed_at, new.confirmation_method
    ) is distinct from row(
      old.human_confirmed, old.confirmed_by_actor_id,
      old.confirmed_at, old.confirmation_method
    );
  end if;

  if tg_op = 'INSERT' then
    fresh_confirmation := new.human_confirmed;
  else
    fresh_confirmation := new.human_confirmed and (not old.human_confirmed or trace_changed);
  end if;

  if content_changed and not fresh_confirmation then
    new.human_confirmed := false;
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
    return new;
  end if;

  if fresh_confirmation then
    if new.confirmed_by_actor_id is not null and new.confirmed_by_actor_id <> actor_id then
      raise exception 'Authenticated clients cannot impersonate another confirmation actor';
    end if;
    if new.confirmation_method is null
      or new.confirmation_method not in ('structured_human_entry', 'ai_assisted_review')
    then
      raise exception 'Authenticated confirmation requires a production human-review method';
    end if;
    new.confirmed_by_actor_id := actor_id;
    new.confirmed_at := statement_timestamp();
    return new;
  end if;

  if not new.human_confirmed then
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
  end if;
  return new;
end
$$;

create trigger enforce_authenticated_requirement_confirmation
before insert or update on sih26044.opportunity_requirements
for each row execute function sih26044.enforce_authenticated_requirement_confirmation();

create trigger enforce_authenticated_eligibility_confirmation
before insert or update on sih26044.eligibility_rules
for each row execute function sih26044.enforce_authenticated_eligibility_confirmation();

-- ---------------------------------------------------------------------------
-- Evidence, readiness, snapshot, and audit trusted-write boundaries
-- ---------------------------------------------------------------------------

drop policy if exists evidence_records_insert_subject on sih26044.evidence_records;
create policy evidence_records_insert_weak_subject
on sih26044.evidence_records for insert to authenticated
with check (
  subject_actor_id = sih26044.current_actor_id()
  and provenance in ('self_declared', 'self_reported', 'extracted', 'inferred')
  and initial_verification_state in ('proposed', 'unverified', 'self_confirmed')
);

drop policy if exists readiness_results_insert_subject on sih26044.opportunity_readiness_results;
revoke insert on sih26044.opportunity_readiness_results from authenticated;

drop policy if exists application_snapshots_insert_subject on sih26044.application_snapshots;
drop policy if exists snapshot_evidence_insert_subject on sih26044.application_snapshot_evidence;
drop policy if exists snapshot_consents_insert_subject on sih26044.application_snapshot_consents;
revoke insert on sih26044.application_snapshots from authenticated;
revoke insert on sih26044.application_snapshot_evidence from authenticated;
revoke insert on sih26044.application_snapshot_consents from authenticated;

drop policy if exists audit_events_insert_attributed on sih26044.audit_events;
revoke insert on sih26044.audit_events from authenticated;

comment on table sih26044.opportunity_readiness_results is
  'Immutable deterministic Engine B results. INSERT is reserved for a trusted server-side computation adapter; learners retain subject-only SELECT.';
comment on table sih26044.application_snapshots is
  'Snapshot material and links are trusted-write inputs. D2 will construct the allowlisted projection; applicants retain authorized SELECT/finalization only.';
comment on table sih26044.audit_events is
  'Authoritative audit history. Browser clients cannot author audit facts; trusted operations and triggers append records.';

-- ---------------------------------------------------------------------------
-- Internal SECURITY DEFINER predicates are not UUID-probing client APIs
-- ---------------------------------------------------------------------------

create or replace function sih26044.can_create_verification_request(
  requested_evidence_record_id uuid,
  requested_subject_actor_id uuid,
  requested_verifier_organization_id uuid,
  requested_consent_grant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select requested_subject_actor_id = sih26044.current_actor_id()
    and requested_verifier_organization_id is not null
    and exists (
      select 1 from sih26044.evidence_records e
      where e.id = requested_evidence_record_id
        and e.subject_actor_id = requested_subject_actor_id
    )
    and sih26044.is_consent_active(
      requested_consent_grant_id,
      requested_subject_actor_id,
      requested_verifier_organization_id,
      'evidence_verification'
    )
    and exists (
      select 1 from sih26044.consent_evidence_records ce
      where ce.consent_grant_id = requested_consent_grant_id
        and ce.evidence_record_id = requested_evidence_record_id
    )
$$;

drop policy if exists verification_requests_insert_subject on sih26044.verification_requests;
create policy verification_requests_insert_authorized_subject
on sih26044.verification_requests for insert to authenticated
with check (
  status = 'requested'
  and consent_grant_id is not null
  and sih26044.can_create_verification_request(
    evidence_record_id,
    subject_actor_id,
    requested_verifier_organization_id,
    consent_grant_id
  )
);

alter function sih26044.validate_verification_request_scope() security definer;
alter function sih26044.validate_verification_request_scope()
  set search_path = pg_catalog, sih26044;
alter function sih26044.enforce_application_event_sequence() security definer;
alter function sih26044.enforce_application_event_sequence()
  set search_path = pg_catalog, sih26044;

revoke all on function sih26044.is_consent_active(uuid, uuid, uuid, sih26044.consent_purpose) from authenticated;
revoke all on function sih26044.current_scoped_verification_state(uuid, uuid) from authenticated;
revoke all on function sih26044.current_application_stage(uuid) from authenticated;
revoke all on function sih26044.can_create_verification_request(uuid, uuid, uuid, uuid) from public;
grant execute on function sih26044.can_create_verification_request(uuid, uuid, uuid, uuid) to authenticated;

comment on function sih26044.can_create_verification_request(uuid, uuid, uuid, uuid) is
  'Authorized wrapper for the subject-owned verification-request INSERT policy; low-level consent and verification predicates are not client-executable.';

-- ---------------------------------------------------------------------------
-- Supabase Storage canonical path correction and registered-byte immutability
-- ---------------------------------------------------------------------------

drop policy if exists sih_private_evidence_insert_owner on storage.objects;
drop policy if exists sih_private_evidence_update_owner on storage.objects;
drop policy if exists sih_private_evidence_delete_owner on storage.objects;

create policy sih_private_evidence_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and array_length(storage.foldername(name), 1) = 2
  and storage.filename(name) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$'
);

-- No authenticated UPDATE policy is recreated. Registered bytes cannot be
-- overwritten, moved, or renamed. Only demonstrably orphaned uploads may be
-- removed directly by their owner.
create policy sih_private_evidence_delete_orphan_owner
on storage.objects for delete to authenticated
using (
  bucket_id = 'career-evidence-private'
  and (storage.foldername(name))[1] = sih26044.current_actor_id()::text
  and not exists (
    select 1 from sih26044.artifacts a
    where a.storage_bucket_id = bucket_id
      and a.storage_object_path = name
  )
);

create or replace function sih26044.protect_artifact_core_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Artifact metadata is historical; deletion requires a later trusted retention workflow';
  end if;
  if row(
    new.id, new.subject_actor_id, new.storage_bucket_id,
    new.storage_object_path, new.media_type, new.display_name,
    new.integrity_fingerprint, new.created_at
  ) is distinct from row(
    old.id, old.subject_actor_id, old.storage_bucket_id,
    old.storage_object_path, old.media_type, old.display_name,
    old.integrity_fingerprint, old.created_at
  ) then
    raise exception 'Artifact identity, path, media, fingerprint, and display history are immutable';
  end if;
  return new;
end
$$;

create trigger protect_artifact_core_metadata
before update or delete on sih26044.artifacts
for each row execute function sih26044.protect_artifact_core_metadata();

comment on column sih26044.artifacts.scan_status is
  'Controlled security-processing state only. A scan state is not evidence verification and does not change provenance.';

-- ---------------------------------------------------------------------------
-- Application-linked outcome relational integrity
-- ---------------------------------------------------------------------------

create or replace function sih26044.validate_application_linked_outcome()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  application_record sih26044.applications%rowtype;
begin
  if new.application_id is null then
    raise exception 'Direct outcome recording requires an application; non-application outcomes need a future trusted relationship workflow';
  end if;

  select * into application_record
  from sih26044.applications a
  where a.id = new.application_id;

  if application_record.id is null
    or application_record.applicant_actor_id <> new.subject_actor_id
    or application_record.owner_organization_id <> new.organization_id
    or (new.opportunity_id is not null and application_record.opportunity_id <> new.opportunity_id)
  then
    raise exception 'Outcome subject, organization, opportunity, and application relationship is inconsistent';
  end if;
  if sih26044.current_application_stage(application_record.id) in ('saved', 'preparing') then
    raise exception 'Private saved/preparing applications cannot receive outcomes';
  end if;
  return new;
end
$$;

create trigger validate_application_linked_outcome
before insert on sih26044.outcome_events
for each row execute function sih26044.validate_application_linked_outcome();

create or replace function sih26044.can_record_application_outcome(
  requested_application_id uuid,
  requested_subject_actor_id uuid,
  requested_organization_id uuid,
  requested_opportunity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1 from sih26044.applications a
    where a.id = requested_application_id
      and a.applicant_actor_id = requested_subject_actor_id
      and a.owner_organization_id = requested_organization_id
      and (requested_opportunity_id is null or a.opportunity_id = requested_opportunity_id)
      and sih26044.current_application_stage(a.id) not in ('saved', 'preparing')
      and sih26044.can_recruiter_read_application(a.id)
  )
$$;

drop policy if exists outcomes_insert_authorized_organization on sih26044.outcome_events;
create policy outcomes_insert_application_linked_human
on sih26044.outcome_events for insert to authenticated
with check (
  recorded_by_actor_id = sih26044.current_actor_id()
  and application_id is not null
  and sih26044.can_record_application_outcome(
    application_id,
    subject_actor_id,
    organization_id,
    opportunity_id
  )
);

revoke all on function sih26044.can_record_application_outcome(uuid, uuid, uuid, uuid) from public;
grant execute on function sih26044.can_record_application_outcome(uuid, uuid, uuid, uuid) to authenticated;

comment on function sih26044.can_record_application_outcome(uuid, uuid, uuid, uuid) is
  'Authorized outcome wrapper: exact submitted application relationship plus an allowed organization role; no arbitrary learner target.';
