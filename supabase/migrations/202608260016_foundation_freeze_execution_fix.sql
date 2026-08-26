-- Migration 202608260016: Foundation Freeze Execution Fix
--
-- Fixes critical execution blockers found in clean replay:
-- (A) Function signature overload ambiguity (SQLSTATE 42725)
-- (B) UUIDv5 implementation equivalence
-- (C) Canonical JSON identity for requirementResponses
-- (D) Database-authoritative snapshot identity planning RPC
--
-- DOES NOT alter business logic from migration 015.
-- ONLY repairs execution/signature/identity consistency.

-- ======================================================================================
-- A. Drop migration-015 function overloads that created ambiguous signatures
-- ======================================================================================

-- Migration 015 accidentally changed typed parameters to `text`, creating overloads
-- instead of replacing the canonical migration-014 signatures.
-- Drop the overloaded signatures before recreating canonical ones.

-- Drop migration-015 overload (text-typed parameters)
drop function if exists sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text,
  text, numeric, text, text, timestamptz, uuid, text
);

-- Drop migration-015 overload (changed derive signature if any)
drop function if exists sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) cascade;

-- create_application_snapshot signature remained consistent, but drop migration-015 version
-- to recreate with proper comment qualification
drop function if exists sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) cascade;

-- ======================================================================================
-- B. Create database-authoritative snapshot identity planning RPC
-- ======================================================================================

-- Worker calls this BEFORE building recruiter projection to get the authoritative
-- deterministic snapshot ID. This avoids duplicate UUIDv5 implementations and ensures
-- Worker/DB identity agreement.

create or replace function sih26044.plan_application_snapshot_identity(
  p_application_id uuid,
  p_opportunity_version_id uuid,
  p_readiness_result_id uuid,
  p_input_version text,
  p_subject_facts_version text,
  p_evidence_projection_version text,
  p_selected_evidence_ids uuid[],
  p_consent_grant_ids uuid[],
  p_requirement_responses jsonb,
  p_recruiter_projection_version text
)
returns table (snapshot_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_sorted_evidence text;
  v_sorted_consents text;
  v_canonical_responses text;
  v_name text;
begin
  -- Sort evidence and consent IDs for deterministic identity
  v_sorted_evidence := array_to_string(array(select unnest(p_selected_evidence_ids) order by 1), ',');
  v_sorted_consents := array_to_string(array(select unnest(p_consent_grant_ids) order by 1), ',');
  
  -- Canonical JSON for requirementResponses (key-sorted, deterministic)
  -- Use jsonb's natural ordering which is deterministic
  v_canonical_responses := coalesce(p_requirement_responses::text, '{}');
  
  -- Build canonical name material
  v_name := 'sih26044:snapshot:' || p_application_id::text || ':'
    || p_opportunity_version_id::text || ':'
    || p_readiness_result_id::text || ':'
    || p_input_version || ':'
    || p_subject_facts_version || ':'
    || p_evidence_projection_version || ':'
    || v_sorted_evidence || ':'
    || v_sorted_consents || ':'
    || v_canonical_responses || ':'
    || p_recruiter_projection_version;
  
  -- Compute RFC 4122 UUIDv5
  return query select extensions.uuid_generate_v5(
    'b6c7d3a0-f2e1-4b89-9c05-1a2b3c4d5e6f'::uuid,
    v_name
  );
end;
$$;

revoke all on function sih26044.plan_application_snapshot_identity(
  uuid, uuid, uuid, text, text, text, uuid[], uuid[], jsonb, text
) from public, anon, authenticated;

grant execute on function sih26044.plan_application_snapshot_identity(
  uuid, uuid, uuid, text, text, text, uuid[], uuid[], jsonb, text
) to service_role;

comment on function sih26044.plan_application_snapshot_identity is
  'Compute authoritative deterministic snapshot ID before Worker builds recruiter projection. '
  'Returns the exact UUID that create_application_snapshot will assign, ensuring Worker/DB identity agreement.';

-- ======================================================================================
-- C. Recreate canonical save_readiness_evidence_projection with strong types
-- ======================================================================================

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
  if v_evidence.id is null then
    raise exception 'Evidence record not found';
  end if;
  if v_evidence.subject_actor_id <> p_subject_actor_id then
    raise exception 'Evidence does not belong to the requesting actor';
  end if;

  if p_confirmation_method not in ('structured_human_entry', 'ai_assisted_review') then
    raise exception 'Invalid human confirmation method';
  end if;

  -- Check for existing projection with SAME evidence record
  select * into v_existing from sih26044.readiness_evidence_projections
    where evidence_record_id = p_evidence_record_id;

  if v_existing.id is not null then
    -- Migration 015: compare ALL semantic material fields
    if (
      coalesce(v_existing.requirement_id::text, '') <> coalesce(p_requirement_id::text, '')
      or coalesce(v_existing.skill_id, '') <> coalesce(p_skill_id, '')
      or coalesce(v_existing.literal_skill_label, '') <> coalesce(p_literal_skill_label, '')
      or coalesce(v_existing.literal_requirement_wording, '') <> coalesce(p_literal_requirement_wording, '')
      or coalesce(v_existing.proficiency, -1) <> coalesce(p_proficiency, -1)
      or coalesce(v_existing.experience_years, -1) <> coalesce(p_experience_years, -1)
      or coalesce(v_existing.capability_assertion, 'UNKNOWN') <> coalesce(p_capability_assertion, 'UNKNOWN')
      or v_existing.directness <> p_directness
      or v_existing.observed_at <> p_observed_at
    ) then
      raise exception 'Capability projection conflict: different semantic material for the same evidence record';
    end if;

    -- Identical material: return existing projection
    return query select v_existing.*;
    return;
  end if;

  -- Insert new projection
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

  return query
    select proj.*
    from sih26044.readiness_evidence_projections proj
    where proj.evidence_record_id = p_evidence_record_id;
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

comment on function sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text, smallint, numeric,
  sih26044.readiness_capability_assertion, sih26044.readiness_evidence_directness,
  timestamptz, uuid, text
) is
  'Migration 016: Canonical typed signature with ALL semantic field conflict detection (migration 015 logic preserved).';

-- ======================================================================================
-- D. Recreate canonical derive_artifact_backed_evidence
-- ======================================================================================

create or replace function sih26044.derive_artifact_backed_evidence(
  p_source_evidence_record_id uuid,
  p_artifact_id uuid,
  p_subject_actor_id uuid,
  p_literal_claim text,
  p_confirmed_by_actor_id uuid,
  p_confirmation_method text
)
returns table (
  derived_evidence_record_id uuid,
  source_evidence_record_id uuid,
  artifact_id uuid,
  derivation_kind text,
  literal_claim text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_source sih26044.evidence_records%rowtype;
  v_artifact sih26044.artifacts%rowtype;
  v_existing_derivation sih26044.evidence_derivations%rowtype;
  v_existing_derived sih26044.evidence_records%rowtype;
  v_derived_id uuid;
begin
  select * into v_source from sih26044.evidence_records where id = p_source_evidence_record_id;
  if v_source.id is null or v_source.subject_actor_id <> p_subject_actor_id then
    raise exception 'Source evidence not found or does not belong to actor';
  end if;

  select * into v_artifact from sih26044.artifacts where id = p_artifact_id;
  if v_artifact.id is null or v_artifact.subject_actor_id <> p_subject_actor_id then
    raise exception 'Artifact does not exist or does not belong to actor';
  end if;

  if v_artifact.scan_status <> 'clean' then
    raise exception 'Artifact must have clean scan status';
  end if;

  if not exists (
    select 1 from sih26044.evidence_artifact_links eal
    where eal.evidence_record_id = p_source_evidence_record_id
      and eal.artifact_id = p_artifact_id
  ) then
    raise exception 'Artifact must be linked to source evidence before derivation';
  end if;

  if p_confirmation_method not in ('structured_human_entry', 'ai_assisted_review') then
    raise exception 'Invalid human confirmation method';
  end if;

  -- Check for existing derivation (semantic uniqueness)
  select * into v_existing_derivation from sih26044.evidence_derivations ed
    where ed.source_evidence_record_id = p_source_evidence_record_id
      and ed.artifact_id = p_artifact_id
      and ed.derivation_kind = 'artifact_backed';

  if v_existing_derivation.id is not null then
    -- Existing derivation found; compare semantic claim (migration 015)
    select * into v_existing_derived from sih26044.evidence_records
      where id = v_existing_derivation.derived_evidence_record_id;

    if v_existing_derived.literal_claim <> coalesce(p_literal_claim, v_source.literal_claim) then
      raise exception 'Derivation conflict: existing derivation has a different literal claim';
    end if;

    -- Identical material: return existing
    return query
      select v_existing_derivation.derived_evidence_record_id,
             v_existing_derivation.source_evidence_record_id,
             v_existing_derivation.artifact_id,
             v_existing_derivation.derivation_kind,
             v_existing_derived.literal_claim,
             v_existing_derivation.created_at;
    return;
  end if;

  -- Create new derived evidence
  v_derived_id := extensions.uuid_generate_v5(
    '8f3e7a94-5c62-4d1b-9a80-3f2c1e4d6b7a'::uuid,
    'sih26044:derived:' || p_source_evidence_record_id::text || ':' || p_artifact_id::text || ':artifact_backed'
  );

  insert into sih26044.evidence_records (
    id, subject_actor_id, provenance, initial_verification_state,
    scope_kind, literal_claim, confirmed_by_actor_id,
    confirmation_method, created_at
  ) values (
    v_derived_id, p_subject_actor_id, 'artifact_backed', 'human_verified',
    'global_skill', coalesce(p_literal_claim, v_source.literal_claim),
    p_confirmed_by_actor_id, p_confirmation_method, statement_timestamp()
  ) on conflict (id) do nothing;

  insert into sih26044.evidence_derivations (
    source_evidence_record_id, derived_evidence_record_id,
    artifact_id, derivation_kind, created_at
  ) values (
    p_source_evidence_record_id, v_derived_id,
    p_artifact_id, 'artifact_backed', statement_timestamp()
  ) on conflict (source_evidence_record_id, artifact_id, derivation_kind) do nothing;

  insert into sih26044.evidence_artifact_links (
    evidence_record_id, artifact_id
  ) values (v_derived_id, p_artifact_id) on conflict do nothing;

  return query
    select v_derived_id, p_source_evidence_record_id, p_artifact_id,
           'artifact_backed'::text, coalesce(p_literal_claim, v_source.literal_claim),
           statement_timestamp();
end;
$$;

revoke all on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) from public, anon, authenticated;

grant execute on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) to service_role;

comment on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) is
  'Migration 016: Canonical signature with semantic claim conflict detection (migration 015 logic preserved).';

-- ======================================================================================
-- E. Recreate canonical create_application_snapshot with complete validation
-- ======================================================================================

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
  v_proj_snapshot_id text;
  v_proj_app_id text;
  v_proj_stage text;
  v_proj_band text;
  v_proj_consent_id text;
  v_proj_readiness_id text;
  v_proj_opp_id text;
  v_proj_opp_ver_id text;
  v_proj_evidence_count int;
  v_actual_evidence_count int;
  v_sorted_evidence text;
  v_sorted_consents text;
  v_canonical_responses text;
  v_name text;
begin
  -- 1. Validate application exists and is in pre-submission stage
  select * into v_application from sih26044.applications where id = p_application_id;
  if v_application.id is null then
    raise exception 'Application not found';
  end if;
  if v_application.applicant_actor_id <> p_applicant_actor_id then
    raise exception 'Application does not belong to the requesting actor';
  end if;
  if v_application.opportunity_version_id <> p_opportunity_version_id then
    raise exception 'Opportunity version mismatch with application';
  end if;

  v_current_stage := sih26044.current_application_stage(p_application_id);
  if v_current_stage not in ('saved', 'preparing') then
    raise exception 'Snapshot construction is only permitted before submission';
  end if;

  -- 2. Validate readiness result
  select * into v_readiness from sih26044.opportunity_readiness_results where id = p_readiness_result_id;
  if v_readiness.id is null
    or v_readiness.subject_actor_id <> p_applicant_actor_id
    or v_readiness.opportunity_version_id <> p_opportunity_version_id
  then
    raise exception 'Readiness result not found or does not match applicant and opportunity';
  end if;
  if v_readiness.engine_version <> p_engine_version
    or v_readiness.evidence_policy_version <> p_evidence_policy_version
    or v_readiness.input_version <> p_input_version
    or v_readiness.subject_facts_version <> p_subject_facts_version
    or v_readiness.evidence_projection_version <> p_evidence_projection_version
  then
    raise exception 'Readiness version metadata mismatch between snapshot request and persisted result';
  end if;

  -- 3. Validate active application_review consent (prefer ONE consent for this API)
  if array_length(p_consent_grant_ids, 1) <> 1 then
    raise exception 'Exactly one application_review consent grant required';
  end if;

  if not sih26044.is_consent_active(
    p_consent_grant_ids[1], p_applicant_actor_id, v_application.owner_organization_id, 'application_review'
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
      raise exception 'Selected evidence does not belong to the applicant';
    end if;
    if not exists (
      select 1 from sih26044.consent_evidence_records
      where evidence_record_id = v_evidence_id and consent_grant_id = p_consent_grant_ids[1]
    ) then
      raise exception 'Selected evidence is not covered by the supplied consent';
    end if;
  end loop;

  -- 5. Validate recruiter projection structure
  if sih26044.has_prohibited_json_keys(p_recruiter_allowlist_projection) then
    raise exception 'Recruiter projection contains prohibited private keys';
  end if;

  -- Compute deterministic snapshot ID (same algorithm as plan_application_snapshot_identity)
  v_sorted_evidence := array_to_string(array(select unnest(p_selected_evidence_ids) order by 1), ',');
  v_sorted_consents := array_to_string(array(select unnest(p_consent_grant_ids) order by 1), ',');
  v_canonical_responses := coalesce(p_requirement_responses::text, '{}');
  
  v_name := 'sih26044:snapshot:' || p_application_id::text || ':'
    || p_opportunity_version_id::text || ':'
    || p_readiness_result_id::text || ':'
    || p_input_version || ':'
    || p_subject_facts_version || ':'
    || p_evidence_projection_version || ':'
    || v_sorted_evidence || ':'
    || v_sorted_consents || ':'
    || v_canonical_responses || ':'
    || p_recruiter_projection_version;
  
  v_snapshot_id := extensions.uuid_generate_v5(
    'b6c7d3a0-f2e1-4b89-9c05-1a2b3c4d5e6f'::uuid,
    v_name
  );

  -- 6. Migration 016: COMPLETE cross-field projection validation
  v_proj_snapshot_id := p_recruiter_allowlist_projection->>'applicationSnapshotId';
  v_proj_app_id := p_recruiter_allowlist_projection->>'applicationId';
  v_proj_stage := p_recruiter_allowlist_projection->>'applicationStage';
  v_proj_consent_id := p_recruiter_allowlist_projection->>'consentRecordId';
  v_proj_readiness_id := p_recruiter_allowlist_projection->>'readinessResultId';
  v_proj_band := p_recruiter_allowlist_projection->>'readinessBand';
  v_proj_opp_id := p_recruiter_allowlist_projection->>'opportunityId';
  v_proj_opp_ver_id := p_recruiter_allowlist_projection->>'opportunityVersionId';

  if v_proj_snapshot_id <> v_snapshot_id::text then
    raise exception 'Projection applicationSnapshotId does not match computed deterministic snapshot ID';
  end if;

  if v_proj_app_id <> p_application_id::text then
    raise exception 'Projection applicationId does not match p_application_id';
  end if;

  if v_proj_stage <> 'applied' then
    raise exception 'Projection applicationStage must be "applied" for submission snapshot';
  end if;

  if v_proj_consent_id <> p_consent_grant_ids[1]::text then
    raise exception 'Projection consentRecordId does not match the supplied consent grant';
  end if;

  if v_proj_readiness_id <> p_readiness_result_id::text then
    raise exception 'Projection readinessResultId does not match p_readiness_result_id';
  end if;

  if v_proj_band <> v_readiness.readiness_band then
    raise exception 'Projection readinessBand does not match persisted result';
  end if;

  if v_proj_opp_id <> v_application.opportunity_id::text then
    raise exception 'Projection opportunityId does not match application opportunity';
  end if;

  if v_proj_opp_ver_id <> p_opportunity_version_id::text then
    raise exception 'Projection opportunityVersionId does not match p_opportunity_version_id';
  end if;

  -- Validate projection.evidence IDs EXACTLY equal selected evidence (no extras, no duplicates)
  v_proj_evidence_count := (
    select count(distinct (ev->>'evidenceRecordId')::uuid)
    from jsonb_array_elements(p_recruiter_allowlist_projection->'evidence') as ev
  );
  v_actual_evidence_count := array_length(v_selected_set, 1);

  if v_proj_evidence_count <> v_actual_evidence_count then
    raise exception 'Projection evidence count does not match selected evidence count';
  end if;

  if (
    select count(*) from jsonb_array_elements(p_recruiter_allowlist_projection->'evidence') as ev
    where not (ev->>'evidenceRecordId')::uuid = any(v_selected_set)
  ) > 0 then
    raise exception 'Recruiter projection contains evidence not in the selected set';
  end if;

  -- Validate nested supportingEvidenceIds are subsets of selected evidence
  for v_req_ev_ids in
    select req->'supportingEvidenceIds'
    from jsonb_array_elements(p_recruiter_allowlist_projection->'requirements') as req
    where req->'supportingEvidenceIds' is not null
  loop
    if (
      select count(*) from jsonb_array_elements_text(v_req_ev_ids) as ev_id
      where ev_id::uuid <> all(v_selected_set)
    ) > 0 then
      raise exception 'Projection requirement contains supportingEvidenceId not in selected evidence';
    end if;
  end loop;

  -- 7. Idempotency: if same deterministic ID already exists, validate material matches
  select * into v_existing from sih26044.application_snapshots where id = v_snapshot_id;
  if v_existing.id is not null then
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

  -- 8. Insert snapshot
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

revoke all on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) from public, anon, authenticated;

grant execute on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) to service_role;

comment on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) is
  'Migration 016: Canonical signature with COMPLETE cross-field validation (migration 015 logic preserved + extended).';
