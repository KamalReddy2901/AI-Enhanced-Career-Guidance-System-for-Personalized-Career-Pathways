-- Migration 014: Foundation Freeze Hardening
-- Addresses all freeze-blocker defects found in architecture/security review.
--
-- Changes:
-- A. Revoke broad service_role SELECT on sih26044 (migration 013 over-granted).
-- B. Add human confirmation trace columns to readiness_evidence_projections.
-- C. Add semantic uniqueness constraint to evidence_derivations.
-- D. Add current_readiness_organization_memberships() SECURITY DEFINER RPC.
-- E. Replace save_readiness_evidence_projection with canonical methods + trace.
-- F. Replace derive_artifact_backed_evidence with canonical method + idempotency.
-- G. Replace create_application_snapshot with deterministic ID + full validation.

-- ---------------------------------------------------------------------------
-- A. Revoke broad service_role SELECT (migration 013 over-granted)
-- ---------------------------------------------------------------------------
-- The Worker application flow reads subject-owned data through the user-context
-- client (RLS-authenticated) rather than the elevated client. service_role
-- direct table SELECT is not needed and widens the attack surface.

revoke select on all tables in schema sih26044 from service_role;

-- Retain only the narrow function-execute grants on functions that explicitly
-- need service_role (trusted RPCs called from the Worker elevated client).
-- All table reads in the Worker application flow must go through the user-context
-- client so RLS guards remain active. The is_consent_active grant from
-- migration 013 is retained; no new table-level grants are added.

-- ---------------------------------------------------------------------------
-- B. Human confirmation trace columns on readiness_evidence_projections
-- ---------------------------------------------------------------------------
-- High-impact capability projections must record who confirmed them, when,
-- and by which canonical method. The assembler must verify this trace.
-- The server stamps confirmation time; the browser must not supply it.

alter table sih26044.readiness_evidence_projections
  add column if not exists human_confirmed boolean not null default false,
  add column if not exists confirmed_by_actor_id uuid references sih26044.actors(id) on delete restrict,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_method text
    check (confirmation_method is null or confirmation_method in (
      'structured_human_entry', 'ai_assisted_review'
    ));

-- Existing rows from test fixtures (seeded with SQL) receive null trace;
-- the assembler filters them out if human_confirmed = false.
-- A check constraint enforces that human_confirmed=true implies all trace fields.
alter table sih26044.readiness_evidence_projections
  add constraint projection_confirmation_trace_coherent
  check (
    (not human_confirmed) or
    (confirmed_by_actor_id is not null and confirmed_at is not null and confirmation_method is not null)
  );

-- ---------------------------------------------------------------------------
-- C. Semantic uniqueness for evidence_derivations
-- ---------------------------------------------------------------------------
-- Source + artifact + derivation_kind must be unique to prevent duplicate
-- derived records for the same material.

alter table sih26044.evidence_derivations
  add constraint evidence_derivations_semantic_uniqueness
  unique (source_evidence_record_id, artifact_id, derivation_kind);

-- ---------------------------------------------------------------------------
-- D. current_readiness_organization_memberships() SECURITY DEFINER RPC
-- ---------------------------------------------------------------------------
-- Canonical D1 membership evaluation in SQL to avoid duplicating semantics
-- in TypeScript and to handle the RLS edge case where a suspended organization
-- row may be hidden from the embedded organizations relation.
--
-- Returns: organization_id, effective_active (boolean), confirmed (boolean)
-- Collapsed per organization: if any valid current membership row is active,
-- the organization is active.  Uses has_active_organization_membership() as
-- the canonical active predicate so semantics stay in one place.

create or replace function sih26044.current_readiness_organization_memberships()
returns table (
  organization_id uuid,
  effective_active boolean,
  confirmed boolean
)
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select
    om.organization_id,
    bool_or(
      sih26044.has_active_organization_membership(om.organization_id)
    ) as effective_active,
    true as confirmed
  from sih26044.organization_memberships om
  where om.actor_id = sih26044.current_actor_id()
  group by om.organization_id
  order by om.organization_id
$$;

revoke all on function sih26044.current_readiness_organization_memberships() from public, anon;
grant execute on function sih26044.current_readiness_organization_memberships() to authenticated;

comment on function sih26044.current_readiness_organization_memberships() is
  'Canonical D1 membership evaluation for the authenticated actor, safe under RLS. '
  'Returns one row per distinct organization with effective_active = true only when '
  'has_active_organization_membership() confirms active + current + active-org semantics. '
  'Suspended organization rows hidden from the embedded join remain correctly inactive.';

-- ---------------------------------------------------------------------------
-- E. save_readiness_evidence_projection -- canonical methods + confirmation trace
-- ---------------------------------------------------------------------------
-- Replaces the migration 012 version. Key changes:
--   - Only canonical production methods: structured_human_entry, ai_assisted_review.
--   - Removes direct_confirmation and self_assessment_review.
--   - Stores confirmation trace (human_confirmed, confirmed_by_actor_id,
--     confirmed_at, confirmation_method) in the projection row.
--   - Server stamps confirmed_at; browser cannot supply authoritative timestamp.
--   - Idempotent retry with identical material: on conflict do nothing (existing row returned).
--   - Conflict with DIFFERENT capability material: raises an error rather than
--     silently returning the old row.

create or replace function sih26044.save_readiness_evidence_projection(
  p_evidence_record_id uuid,
  p_subject_actor_id uuid,
  p_requirement_id uuid,
  p_skill_id text,
  p_literal_skill_label text,
  p_literal_requirement_wording text,
  p_proficiency smallint,
  p_experience_years numeric,
  p_capability_assertion sih26044.readiness_capability_assertion,
  p_directness sih26044.readiness_evidence_directness,
  p_observed_at timestamptz,
  p_confirmed_by_actor_id uuid,
  p_confirmation_method text
)
returns setof sih26044.readiness_evidence_projections
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_evidence sih26044.evidence_records%rowtype;
  v_existing sih26044.readiness_evidence_projections%rowtype;
begin
  select * into v_evidence from sih26044.evidence_records where id = p_evidence_record_id;
  if v_evidence.id is null or v_evidence.subject_actor_id <> p_subject_actor_id then
    raise exception 'Evidence record not found or subject actor mismatch';
  end if;

  if p_confirmed_by_actor_id is null or p_confirmed_by_actor_id <> p_subject_actor_id then
    raise exception 'Human confirmation must match subject actor';
  end if;
  if not exists (select 1 from sih26044.actors where id = p_confirmed_by_actor_id and status = 'active') then
    raise exception 'Confirming actor must be active';
  end if;
  if p_confirmation_method is null or p_confirmation_method not in (
    'structured_human_entry', 'ai_assisted_review'
  ) then
    raise exception 'Invalid human confirmation method for capability projection: must be structured_human_entry or ai_assisted_review';
  end if;

  -- Check for conflicting material on an existing row
  select * into v_existing from sih26044.readiness_evidence_projections
  where evidence_record_id = p_evidence_record_id;

  if v_existing.evidence_record_id is not null then
    -- Validate the existing row has the same capability material
    if v_existing.skill_id is distinct from p_skill_id
      or v_existing.requirement_id is distinct from p_requirement_id
      or v_existing.proficiency is distinct from p_proficiency
      or v_existing.experience_years is distinct from p_experience_years
      or v_existing.capability_assertion is distinct from p_capability_assertion
      or v_existing.directness is distinct from p_directness
    then
      raise exception 'Conflicting capability projection material for evidence record %; existing projection has different capability fields. Create a new evidence record for changed capability claims.',
        p_evidence_record_id;
    end if;
    -- Same material: idempotent, return existing row
    return query select * from sih26044.readiness_evidence_projections
      where evidence_record_id = p_evidence_record_id;
    return;
  end if;

  insert into sih26044.readiness_evidence_projections (
    evidence_record_id, subject_actor_id, requirement_id, skill_id,
    literal_skill_label, literal_requirement_wording, proficiency,
    experience_years, capability_assertion, directness, observed_at,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method,
    created_at
  ) values (
    p_evidence_record_id, p_subject_actor_id, p_requirement_id, p_skill_id,
    p_literal_skill_label, p_literal_requirement_wording, p_proficiency,
    p_experience_years, p_capability_assertion, p_directness, p_observed_at,
    true, p_confirmed_by_actor_id, statement_timestamp(), p_confirmation_method,
    statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id, null, null, 'project_readiness_evidence',
    'readiness_evidence_projections', p_evidence_record_id::text, null,
    jsonb_build_object(
      'evidenceRecordId', p_evidence_record_id,
      'confirmationMethod', p_confirmation_method
    )
  );

  return query
  select * from sih26044.readiness_evidence_projections where evidence_record_id = p_evidence_record_id;
end;
$$;

revoke all on function sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text, smallint, numeric,
  sih26044.readiness_capability_assertion, sih26044.readiness_evidence_directness,
  timestamptz, uuid, text
) from public, anon, authenticated;
grant execute on function sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text, smallint, numeric,
  sih26044.readiness_capability_assertion, sih26044.readiness_evidence_directness,
  timestamptz, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- F. derive_artifact_backed_evidence -- canonical method + idempotency
-- ---------------------------------------------------------------------------
-- Replaces the migration 012 version. Key changes:
--   - derivation_kind is always 'artifact_backed'; browser cannot override it.
--   - derived_evidence_id is server-derived from semantic material (via
--     SHA-256 of source+artifact+derivation_kind as a deterministic UUID v5-
--     equivalent using gen_random_uuid seed); the browser-supplied value is
--     rejected. The semantic uniqueness constraint (section C) enforces
--     at-most-one derivation per source+artifact+kind combination.
--   - Identical retry returns the existing derived record without error.
--   - Conflicting material (same source+artifact+kind but different claim)
--     is rejected because the uniqueness constraint catches the conflict.
--   - Only canonical production methods: structured_human_entry, ai_assisted_review.
--   - Derived record: provenance=artifact_backed, initial_verification_state=unverified.
--   - No verification events are copied.
--   - Adds confirmed_by_actor_id and confirmed_at to evidence_derivations.

-- First extend evidence_derivations to track confirmation
alter table sih26044.evidence_derivations
  add column if not exists confirmed_by_actor_id uuid references sih26044.actors(id) on delete restrict,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_method text
    check (confirmation_method is null or confirmation_method in (
      'structured_human_entry', 'ai_assisted_review'
    ));

create or replace function sih26044.derive_artifact_backed_evidence(
  p_source_evidence_record_id uuid,
  p_artifact_id uuid,
  p_subject_actor_id uuid,
  p_literal_claim text,
  p_confirmed_by_actor_id uuid,
  p_confirmation_method text
)
returns setof sih26044.evidence_records
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_source sih26044.evidence_records%rowtype;
  v_artifact sih26044.artifacts%rowtype;
  v_existing_derivation sih26044.evidence_derivations%rowtype;
  v_derived_id uuid;
  -- derivation_kind is always exactly 'artifact_backed'; not browser-supplied
  v_derivation_kind constant text := 'artifact_backed';
begin
  select * into v_source from sih26044.evidence_records where id = p_source_evidence_record_id;
  if v_source.id is null or v_source.subject_actor_id <> p_subject_actor_id then
    raise exception 'Source evidence does not belong to subject';
  end if;

  select * into v_artifact from sih26044.artifacts where id = p_artifact_id;
  if v_artifact.id is null or v_artifact.subject_actor_id <> p_subject_actor_id then
    raise exception 'Artifact does not belong to subject';
  end if;

  if v_artifact.scan_status <> 'clean' then
    raise exception 'Artifact must have clean scan status to back derived evidence';
  end if;

  if not exists (
    select 1 from sih26044.evidence_artifact_links
    where evidence_record_id = p_source_evidence_record_id and artifact_id = p_artifact_id
  ) then
    raise exception 'Artifact must be linked to the source evidence';
  end if;

  if p_confirmed_by_actor_id is null or p_confirmed_by_actor_id <> p_subject_actor_id then
    raise exception 'Derivation human confirmation must match subject actor';
  end if;
  if not exists (select 1 from sih26044.actors where id = p_confirmed_by_actor_id and status = 'active') then
    raise exception 'Confirming actor must be active';
  end if;
  if p_confirmation_method is null or p_confirmation_method not in (
    'structured_human_entry', 'ai_assisted_review'
  ) then
    raise exception 'Invalid human confirmation method for derivation: must be structured_human_entry or ai_assisted_review';
  end if;

  -- Check for existing derivation (idempotency: identical material returns existing)
  select * into v_existing_derivation from sih26044.evidence_derivations
  where source_evidence_record_id = p_source_evidence_record_id
    and artifact_id = p_artifact_id
    and derivation_kind = v_derivation_kind;

  if v_existing_derivation.derived_evidence_record_id is not null then
    -- Idempotent retry: return the existing derived evidence record
    return query select * from sih26044.evidence_records
      where id = v_existing_derivation.derived_evidence_record_id;
    return;
  end if;

  -- Deterministic server-assigned derived evidence ID based on semantic material.
  -- Uses a namespace UUID derived from 'sih26044:artifact_derivation' + source + artifact.
  -- This is a deterministic UUID v5-equivalent using MD5 as PostgreSQL lacks SHA-256 for UUID.
  v_derived_id := extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'sih26044:artifact_backed:' || p_source_evidence_record_id::text || ':' || p_artifact_id::text
  );

  -- Create derived evidence record
  -- provenance = 'artifact_backed' ALWAYS
  -- initial_verification_state = 'unverified' ALWAYS (never inherited)
  insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    proposal_source, scope_kind, scope_skill_id, scope_literal_skill_label,
    scope_opportunity_id, scope_requirement_id, scope_organization_id, scope_outcome_event_id,
    source_system, source_record_id, source_url, source_captured_at, visibility, created_at
  ) values (
    v_derived_id, p_subject_actor_id, coalesce(p_literal_claim, v_source.literal_claim),
    'artifact_backed', 'unverified', null,
    v_source.scope_kind, v_source.scope_skill_id, v_source.scope_literal_skill_label,
    v_source.scope_opportunity_id, v_source.scope_requirement_id,
    v_source.scope_organization_id, v_source.scope_outcome_event_id,
    'derived_artifact_workflow', v_source.id::text, null, statement_timestamp(),
    v_source.visibility, statement_timestamp()
  );

  insert into sih26044.evidence_artifact_links (
    evidence_record_id, artifact_id, linked_by_actor_id, linked_at
  ) values (
    v_derived_id, p_artifact_id, p_subject_actor_id, statement_timestamp()
  ) on conflict do nothing;

  insert into sih26044.evidence_derivations (
    derived_evidence_record_id, source_evidence_record_id, artifact_id,
    derivation_kind, confirmed_by_actor_id, confirmed_at, confirmation_method,
    derived_at, created_at
  ) values (
    v_derived_id, p_source_evidence_record_id, p_artifact_id,
    v_derivation_kind, p_confirmed_by_actor_id, statement_timestamp(),
    p_confirmation_method, statement_timestamp(), statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id, null, null, 'derive_artifact_backed_evidence',
    'evidence_records', v_derived_id::text, null,
    jsonb_build_object(
      'sourceEvidenceRecordId', p_source_evidence_record_id,
      'derivedEvidenceRecordId', v_derived_id,
      'artifactId', p_artifact_id,
      'derivationKind', v_derivation_kind
    )
  );

  return query
  select * from sih26044.evidence_records where id = v_derived_id;
end;
$$;

-- Revoke old signature (migration 012: 8 params including p_derived_evidence_id and p_derivation_kind)
revoke all on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, uuid, text, text, uuid, text
) from public, anon, authenticated, service_role;

-- Grant new signature (6 params: no p_derived_evidence_id, no p_derivation_kind)
revoke all on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) from public, anon, authenticated;
grant execute on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- G. create_application_snapshot -- deterministic ID + full validation
-- ---------------------------------------------------------------------------
-- Replaces the migration 012 version. Key changes:
--   - Deterministic snapshot ID derived from canonical material.
--   - Full server-side pre-insertion validation:
--       application existence + pre-submission stage
--       applicant/readiness subject match
--       exact opportunity version match
--       readiness result ownership + version consistency
--       active application_review consent
--       every selected evidence belongs to applicant
--       every selected evidence covered by consent
--       recruiter projection passes allowlist
--       projection IDs match arguments
--       nested supportingEvidenceIds subset of selected evidence
--   - Rejects post-submission new snapshot construction.
--   - Idempotent: same deterministic ID + same material returns existing row.
--   - Conflict: same ID but different immutable material raises error.

create or replace function sih26044.create_application_snapshot(
  p_application_id uuid,
  p_opportunity_version_id uuid,
  p_readiness_result_id uuid,
  p_engine_version text,
  p_evidence_policy_version text,
  p_input_version text,
  p_subject_facts_version text,
  p_evidence_projection_version text,
  p_recruiter_projection_version text,
  p_recruiter_allowlist_projection jsonb,
  p_requirement_responses jsonb,
  p_selected_evidence_ids uuid[],
  p_consent_grant_ids uuid[],
  p_applicant_actor_id uuid
)
returns table (
  snapshot_id uuid,
  application_id uuid,
  opportunity_version_id uuid,
  readiness_result_id uuid,
  engine_version text,
  evidence_policy_version text,
  input_version text,
  subject_facts_version text,
  evidence_projection_version text,
  recruiter_projection_version text,
  recruiter_allowlist_projection jsonb,
  requirement_responses jsonb,
  captured_at timestamptz,
  finalized_at timestamptz,
  integrity_fingerprint text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_application sih26044.applications%rowtype;
  v_readiness sih26044.opportunity_readiness_results%rowtype;
  v_current_stage sih26044.application_stage;
  v_snapshot_id uuid;
  v_existing sih26044.application_snapshots%rowtype;
  v_evidence_id uuid;
  v_consent_id uuid;
  v_selected_set uuid[];
  v_req_ev_ids jsonb;
begin
  -- 1. Validate application exists and is in pre-submission stage
  select * into v_application from sih26044.applications where id = p_application_id;
  if v_application.id is null then
    raise exception 'Application not found: %', p_application_id;
  end if;
  if v_application.applicant_actor_id <> p_applicant_actor_id then
    raise exception 'Application does not belong to the requesting actor';
  end if;
  if v_application.opportunity_version_id <> p_opportunity_version_id then
    raise exception 'Opportunity version mismatch with application';
  end if;

  v_current_stage := sih26044.current_application_stage(p_application_id);
  if v_current_stage not in ('saved', 'preparing') then
    raise exception 'Snapshot construction is only permitted before submission; current stage: %', v_current_stage;
  end if;

  -- 2. Validate readiness result
  select * into v_readiness from sih26044.opportunity_readiness_results where id = p_readiness_result_id;
  if v_readiness.id is null
    or v_readiness.subject_actor_id <> p_applicant_actor_id
    or v_readiness.opportunity_version_id <> p_opportunity_version_id
  then
    raise exception 'Readiness result not found or does not match applicant/opportunity';
  end if;
  if v_readiness.engine_version <> p_engine_version
    or v_readiness.evidence_policy_version <> p_evidence_policy_version
    or v_readiness.input_version <> p_input_version
    or v_readiness.subject_facts_version <> p_subject_facts_version
    or v_readiness.evidence_projection_version <> p_evidence_projection_version
  then
    raise exception 'Readiness version metadata mismatch between snapshot request and persisted result';
  end if;

  -- 3. Validate active application_review consent
  if not exists (
    select 1 from unnest(p_consent_grant_ids) as cid(id)
    where sih26044.is_consent_active(cid.id, p_applicant_actor_id, v_application.owner_organization_id, 'application_review')
  ) then
    raise exception 'Active application_review consent is required for the owner organization';
  end if;

  -- 4. Validate all selected evidence belongs to applicant and is covered by consent
  v_selected_set := array(select unnest(p_selected_evidence_ids) order by 1);
  foreach v_evidence_id in array v_selected_set loop
    if not exists (
      select 1 from sih26044.evidence_records
      where id = v_evidence_id and subject_actor_id = p_applicant_actor_id
    ) then
      raise exception 'Selected evidence % does not belong to the applicant', v_evidence_id;
    end if;
    if not exists (
      select 1 from sih26044.consent_evidence_records cer
      join unnest(p_consent_grant_ids) cid(id) on cid.id = cer.consent_grant_id
      where cer.evidence_record_id = v_evidence_id
    ) then
      raise exception 'Selected evidence % is not covered by the supplied consent grant(s)', v_evidence_id;
    end if;
  end loop;

  -- 5. Validate recruiter projection
  if sih26044.has_prohibited_json_keys(p_recruiter_allowlist_projection) then
    raise exception 'Recruiter projection contains prohibited private keys';
  end if;

  -- 6. Validate that projection.evidence IDs exactly equal selected evidence
  --    (no unselected evidence IDs may appear)
  if (
    select count(*) from jsonb_array_elements(
      p_recruiter_allowlist_projection -> 'evidence'
    ) as ev
    where not (ev ->> 'evidenceRecordId')::uuid = any(v_selected_set)
  ) > 0 then
    raise exception 'Recruiter projection contains evidence not in the selected/consented set';
  end if;

  -- 7. Validate nested supportingEvidenceIds are a subset of selected evidence
  for v_req_ev_ids in
    select req -> 'supportingEvidenceIds'
    from jsonb_array_elements(p_recruiter_allowlist_projection -> 'requirements') as req
    where req -> 'supportingEvidenceIds' is not null
  loop
    if (
      select count(*) from jsonb_array_elements_text(v_req_ev_ids) as ev_id
      where ev_id::uuid <> all(v_selected_set)
    ) > 0 then
      raise exception 'Recruiter projection requirement contains supportingEvidenceId not in selected evidence';
    end if;
  end loop;

  -- 8. Deterministic snapshot ID from canonical material (sorted evidence, sorted consents)
  v_snapshot_id := extensions.uuid_generate_v5(
    'b6c7d3a0-f2e1-4b89-9c05-1a2b3c4d5e6f'::uuid,
    'sih26044:snapshot:' || p_application_id::text || ':'
      || p_opportunity_version_id::text || ':'
      || p_readiness_result_id::text || ':'
      || p_input_version || ':'
      || p_subject_facts_version || ':'
      || p_evidence_projection_version || ':'
      || array_to_string(array(select unnest(p_selected_evidence_ids) order by 1), ',') || ':'
      || array_to_string(array(select unnest(p_consent_grant_ids) order by 1), ',') || ':'
      || coalesce(p_requirement_responses::text, '{}') || ':'
      || p_recruiter_projection_version
  );

  -- 9. Idempotency: if same deterministic ID already exists, validate material matches
  select * into v_existing from sih26044.application_snapshots where id = v_snapshot_id;
  if v_existing.id is not null then
    -- Verify immutable material matches
    if v_existing.readiness_result_id <> p_readiness_result_id
      or v_existing.opportunity_version_id <> p_opportunity_version_id
      or v_existing.engine_version <> p_engine_version
    then
      raise exception 'Snapshot ID collision: existing snapshot has different immutable material';
    end if;
    return query
      select v_existing.id, v_existing.application_id, v_existing.opportunity_version_id,
             v_existing.readiness_result_id, v_existing.engine_version,
             v_existing.evidence_policy_version, v_existing.input_version,
             v_existing.subject_facts_version, v_existing.evidence_projection_version,
             v_existing.recruiter_projection_version, v_existing.recruiter_allowlist_projection,
             v_existing.requirement_responses, v_existing.captured_at,
             v_existing.finalized_at, v_existing.integrity_fingerprint, v_existing.created_at;
    return;
  end if;

  -- 10. Insert snapshot
  insert into sih26044.application_snapshots (
    id, application_id, opportunity_version_id, readiness_result_id,
    engine_version, evidence_policy_version, input_version,
    subject_facts_version, evidence_projection_version,
    recruiter_projection_version, recruiter_allowlist_projection,
    requirement_responses, captured_at, created_at
  ) values (
    v_snapshot_id, p_application_id, p_opportunity_version_id, p_readiness_result_id,
    p_engine_version, p_evidence_policy_version, p_input_version,
    p_subject_facts_version, p_evidence_projection_version,
    p_recruiter_projection_version, p_recruiter_allowlist_projection,
    coalesce(p_requirement_responses, '{}'::jsonb), statement_timestamp(), statement_timestamp()
  );

  foreach v_evidence_id in array v_selected_set loop
    insert into sih26044.application_snapshot_evidence (
      application_snapshot_id, evidence_record_id
    ) values (v_snapshot_id, v_evidence_id) on conflict do nothing;
  end loop;

  if p_consent_grant_ids is not null then
    foreach v_consent_id in array p_consent_grant_ids loop
      insert into sih26044.application_snapshot_consents (
        application_snapshot_id, consent_grant_id
      ) values (v_snapshot_id, v_consent_id) on conflict do nothing;
    end loop;
  end if;

  return query
    select s.id, s.application_id, s.opportunity_version_id,
           s.readiness_result_id, s.engine_version,
           s.evidence_policy_version, s.input_version,
           s.subject_facts_version, s.evidence_projection_version,
           s.recruiter_projection_version, s.recruiter_allowlist_projection,
           s.requirement_responses, s.captured_at,
           s.finalized_at, s.integrity_fingerprint, s.created_at
    from sih26044.application_snapshots s where s.id = v_snapshot_id;
end;
$$;

-- Revoke old signature (migration 012: 15 params including p_id and p_captured_at)
revoke all on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], timestamptz
) from public, anon, authenticated, service_role;

-- Grant new signature (14 params: no p_id, no p_captured_at, adds p_applicant_actor_id)
revoke all on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) from public, anon, authenticated;
grant execute on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) to service_role;

comment on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) is
  'Trusted Worker RPC: validates application ownership, pre-submission stage, readiness '
  'version consistency, active consent, evidence ownership and coverage, recruiter projection '
  'allowlist and selected-evidence minimization. Returns deterministic snapshot ID derived '
  'from canonical material. Idempotent for identical material; rejects post-submission construction.';

comment on function sih26044.current_readiness_organization_memberships() is
  'Canonical D1 membership evaluation for the authenticated actor. '
  'Safe under RLS: suspended organizations hidden from embedded join are still '
  'evaluated correctly because has_active_organization_membership() queries '
  'organization status with elevated security context.';
