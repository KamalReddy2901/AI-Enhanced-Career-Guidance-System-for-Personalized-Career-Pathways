-- Migration 202608260017: Foundation RPC surface repair
--
-- Migration 016 intentionally retained the canonical six-argument artifact
-- derivation RPC, but its named ON CONFLICT target is ambiguous in PL/pgSQL:
-- RETURNS TABLE exposes source_evidence_record_id and artifact_id as variables.
-- Repair it forward with an unambiguous conflict action and remove every
-- historical trusted-worker overload that is no longer part of the contract.

-- The migration-011 signature was superseded by the canonical-input signature
-- in migration 012. Keeping it leaves PostgREST with an accidental RPC overload.
drop function if exists sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz
);

-- Migration-012 client-shaped RPCs were superseded in migration 014.
drop function if exists sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, uuid, text, text, uuid, text
);

drop function if exists sih26044.create_application_snapshot(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  jsonb, jsonb, uuid[], uuid[], timestamptz
);

-- Return-column names are part of the Worker RPC contract. Recreate the
-- canonical signature so the first returned column remains `id`.
drop function if exists sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
);

create or replace function sih26044.derive_artifact_backed_evidence(
  p_source_evidence_record_id uuid,
  p_artifact_id uuid,
  p_subject_actor_id uuid,
  p_literal_claim text,
  p_confirmed_by_actor_id uuid,
  p_confirmation_method text
)
returns table (
  id uuid,
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
  v_effective_claim text;
begin
  select source_record.* into v_source
  from sih26044.evidence_records as source_record
  where source_record.id = p_source_evidence_record_id;

  if v_source.id is null or v_source.subject_actor_id <> p_subject_actor_id then
    raise exception 'Source evidence not found or does not belong to actor';
  end if;

  select artifact_record.* into v_artifact
  from sih26044.artifacts as artifact_record
  where artifact_record.id = p_artifact_id;

  if v_artifact.id is null or v_artifact.subject_actor_id <> p_subject_actor_id then
    raise exception 'Artifact does not exist or does not belong to actor';
  end if;
  if v_artifact.scan_status <> 'clean' then
    raise exception 'Artifact must have clean scan status';
  end if;
  if p_confirmed_by_actor_id is null or p_confirmed_by_actor_id <> p_subject_actor_id then
    raise exception 'Derivation human confirmation must match subject actor';
  end if;
  if p_confirmation_method is null
    or p_confirmation_method not in ('structured_human_entry', 'ai_assisted_review') then
    raise exception 'Invalid human confirmation method';
  end if;
  if not exists (
    select 1
    from sih26044.evidence_artifact_links as source_link
    where source_link.evidence_record_id = p_source_evidence_record_id
      and source_link.artifact_id = p_artifact_id
  ) then
    raise exception 'Artifact must be linked to source evidence before derivation';
  end if;

  v_effective_claim := coalesce(p_literal_claim, v_source.literal_claim);

  select derivation.* into v_existing_derivation
  from sih26044.evidence_derivations as derivation
  where derivation.source_evidence_record_id = p_source_evidence_record_id
    and derivation.artifact_id = p_artifact_id
    and derivation.derivation_kind = 'artifact_backed';

  if v_existing_derivation.id is not null then
    select derived_record.* into v_existing_derived
    from sih26044.evidence_records as derived_record
    where derived_record.id = v_existing_derivation.derived_evidence_record_id;

    if v_existing_derived.literal_claim is distinct from v_effective_claim then
      raise exception 'Derivation conflict: existing derivation has a different literal claim';
    end if;

    return query select
      v_existing_derivation.derived_evidence_record_id,
      v_existing_derivation.source_evidence_record_id,
      v_existing_derivation.artifact_id,
      v_existing_derivation.derivation_kind,
      v_existing_derived.literal_claim,
      v_existing_derivation.created_at;
    return;
  end if;

  v_derived_id := extensions.uuid_generate_v5(
    '8f3e7a94-5c62-4d1b-9a80-3f2c1e4d6b7a'::uuid,
    'sih26044:derived:' || p_source_evidence_record_id::text || ':' || p_artifact_id::text || ':artifact_backed'
  );

  insert into sih26044.evidence_records as derived_record (
    id, subject_actor_id, provenance, initial_verification_state,
    scope_kind, scope_literal_skill_label, literal_claim,
    source_system, source_captured_at, created_at
  ) values (
    v_derived_id, p_subject_actor_id, 'artifact_backed', 'unverified',
    'global_skill', v_effective_claim, v_effective_claim,
    'sih26044', statement_timestamp(), statement_timestamp()
  ) on conflict do nothing;

  -- A concurrent replay can reach the idempotent insert after another request.
  -- Re-read the immutable record so a different literal claim never succeeds.
  select derived_record.* into v_existing_derived
  from sih26044.evidence_records as derived_record
  where derived_record.id = v_derived_id;

  if v_existing_derived.literal_claim is distinct from v_effective_claim
    or v_existing_derived.provenance <> 'artifact_backed'
    or v_existing_derived.initial_verification_state <> 'unverified' then
    raise exception 'Derivation conflict: immutable derived evidence has different semantic material';
  end if;

  -- Do not name the conflict columns: RETURNS TABLE exposes two names that
  -- otherwise collide with the target columns in PL/pgSQL. The preceding
  -- semantic lookup handles conflicts; this only makes the insert race-safe.
  insert into sih26044.evidence_derivations as derivation (
    source_evidence_record_id, derived_evidence_record_id,
    artifact_id, derivation_kind, created_at
  ) values (
    p_source_evidence_record_id, v_derived_id,
    p_artifact_id, 'artifact_backed', statement_timestamp()
  ) on conflict do nothing;

  insert into sih26044.evidence_artifact_links as derived_link (
    evidence_record_id, artifact_id, linked_by_actor_id, linked_at
  ) values (
    v_derived_id, p_artifact_id, p_subject_actor_id, statement_timestamp()
  ) on conflict do nothing;

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id, null, null, 'derive_artifact_backed_evidence',
    'evidence_records', v_derived_id::text, null,
    jsonb_build_object(
      'sourceEvidenceRecordId', p_source_evidence_record_id,
      'derivedEvidenceRecordId', v_derived_id,
      'artifactId', p_artifact_id,
      'derivationKind', 'artifact_backed'
    )
  );

  return query select
    v_derived_id,
    p_source_evidence_record_id,
    p_artifact_id,
    'artifact_backed'::text,
    v_effective_claim,
    statement_timestamp();
end;
$$;

revoke all on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz, jsonb
) to service_role;

revoke all on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) from public, anon, authenticated;
grant execute on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) to service_role;

revoke all on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) from public, anon, authenticated;
grant execute on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], uuid
) to service_role;

comment on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, text, uuid, text
) is
  'Canonical server-only artifact derivation. It is idempotent for identical semantic material, rejects conflicting literal claims, and has no PL/pgSQL ambiguous conflict target.';

-- The snapshot RPC is retained from migration 016 except for its enum-safe
-- recruiter-projection band comparison. PostgreSQL has no text <> enum
-- operator, so recreate the canonical body with explicit text comparison.
create or replace function sih26044.create_application_snapshot(
  p_application_id uuid, p_opportunity_version_id uuid, p_readiness_result_id uuid,
  p_engine_version text, p_evidence_policy_version text, p_input_version text,
  p_subject_facts_version text, p_evidence_projection_version text,
  p_recruiter_projection_version text, p_recruiter_allowlist_projection jsonb,
  p_requirement_responses jsonb, p_selected_evidence_ids uuid[],
  p_consent_grant_ids uuid[], p_applicant_actor_id uuid
)
returns table (snapshot_id uuid, application_id uuid, opportunity_version_id uuid,
  readiness_result_id uuid, engine_version text, evidence_policy_version text,
  input_version text, subject_facts_version text, evidence_projection_version text,
  recruiter_projection_version text, recruiter_allowlist_projection jsonb,
  requirement_responses jsonb, captured_at timestamptz, finalized_at timestamptz,
  integrity_fingerprint text, created_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, sih26044
as $$
declare
  v_application sih26044.applications%rowtype;
  v_readiness sih26044.opportunity_readiness_results%rowtype;
  v_stage sih26044.application_stage;
  v_snapshot_id uuid; v_existing sih26044.application_snapshots%rowtype;
  v_evidence_id uuid; v_consent_id uuid; v_selected_set uuid[];
  v_sorted_evidence text; v_sorted_consents text; v_name text;
  v_req_ids jsonb;
begin
  select application_row.* into v_application from sih26044.applications as application_row
  where application_row.id = p_application_id;
  if v_application.id is null or v_application.applicant_actor_id <> p_applicant_actor_id
    or v_application.opportunity_version_id <> p_opportunity_version_id then raise exception 'Application mismatch'; end if;
  v_stage := sih26044.current_application_stage(p_application_id);
  if v_stage not in ('saved', 'preparing') then raise exception 'Snapshot construction is only permitted before submission'; end if;
  select readiness_row.* into v_readiness from sih26044.opportunity_readiness_results as readiness_row
  where readiness_row.id = p_readiness_result_id;
  if v_readiness.id is null or v_readiness.subject_actor_id <> p_applicant_actor_id
    or v_readiness.opportunity_version_id <> p_opportunity_version_id then raise exception 'Readiness mismatch'; end if;
  if v_readiness.engine_version is distinct from p_engine_version or v_readiness.evidence_policy_version is distinct from p_evidence_policy_version
    or v_readiness.input_version is distinct from p_input_version or v_readiness.subject_facts_version is distinct from p_subject_facts_version
    or v_readiness.evidence_projection_version is distinct from p_evidence_projection_version then raise exception 'Readiness metadata mismatch'; end if;
  if cardinality(p_consent_grant_ids) <> 1 or not sih26044.is_consent_active(p_consent_grant_ids[1], p_applicant_actor_id, v_application.owner_organization_id, 'application_review') then raise exception 'Active application_review consent required'; end if;
  v_selected_set := array(select distinct selected_id from unnest(coalesce(p_selected_evidence_ids, '{}'::uuid[])) as selected_id order by selected_id);
  if cardinality(v_selected_set) <> cardinality(p_selected_evidence_ids) then raise exception 'Duplicate selected evidence IDs'; end if;
  foreach v_evidence_id in array v_selected_set loop
    if not exists (select 1 from sih26044.evidence_records as evidence_row where evidence_row.id = v_evidence_id and evidence_row.subject_actor_id = p_applicant_actor_id)
      or not exists (select 1 from sih26044.consent_evidence_records as consent_evidence where consent_evidence.evidence_record_id = v_evidence_id and consent_evidence.consent_grant_id = p_consent_grant_ids[1]) then raise exception 'Selected evidence mismatch'; end if;
  end loop;
  if sih26044.has_prohibited_json_keys(p_recruiter_allowlist_projection) then raise exception 'Recruiter projection contains prohibited private keys'; end if;
  v_sorted_evidence := array_to_string(v_selected_set, ','); v_sorted_consents := p_consent_grant_ids[1]::text;
  v_name := 'sih26044:snapshot:' || p_application_id::text || ':' || p_opportunity_version_id::text || ':' || p_readiness_result_id::text || ':' || p_input_version || ':' || p_subject_facts_version || ':' || p_evidence_projection_version || ':' || v_sorted_evidence || ':' || v_sorted_consents || ':' || coalesce(p_requirement_responses, '{}'::jsonb)::text || ':' || p_recruiter_projection_version;
  v_snapshot_id := extensions.uuid_generate_v5('b6c7d3a0-f2e1-4b89-9c05-1a2b3c4d5e6f'::uuid, v_name);
  if p_recruiter_allowlist_projection->>'applicationSnapshotId' is distinct from v_snapshot_id::text
    or p_recruiter_allowlist_projection->>'applicationId' is distinct from p_application_id::text
    or p_recruiter_allowlist_projection->>'applicationStage' is distinct from 'applied'
    or p_recruiter_allowlist_projection->>'consentRecordId' is distinct from p_consent_grant_ids[1]::text
    or p_recruiter_allowlist_projection->>'readinessResultId' is distinct from p_readiness_result_id::text
    or p_recruiter_allowlist_projection->>'readinessBand' is distinct from v_readiness.readiness_band::text
    or p_recruiter_allowlist_projection->>'opportunityId' is distinct from v_application.opportunity_id::text
    or p_recruiter_allowlist_projection->>'opportunityVersionId' is distinct from p_opportunity_version_id::text then raise exception 'Projection cross-field mismatch'; end if;
  if (select count(*) from jsonb_array_elements(coalesce(p_recruiter_allowlist_projection->'evidence','[]'::jsonb)) as projection_evidence) <> cardinality(v_selected_set)
    or (select count(distinct (projection_evidence->>'evidenceRecordId')::uuid) from jsonb_array_elements(coalesce(p_recruiter_allowlist_projection->'evidence','[]'::jsonb)) as projection_evidence) <> cardinality(v_selected_set)
    or exists (select 1 from jsonb_array_elements(coalesce(p_recruiter_allowlist_projection->'evidence','[]'::jsonb)) as projection_evidence where not ((projection_evidence->>'evidenceRecordId')::uuid = any(v_selected_set))) then raise exception 'Projection evidence mismatch'; end if;
  for v_req_ids in select requirement_item->'supportingEvidenceIds' from jsonb_array_elements(coalesce(p_recruiter_allowlist_projection->'requirements','[]'::jsonb)) as requirement_item where requirement_item->'supportingEvidenceIds' is not null loop
    if exists (select 1 from jsonb_array_elements_text(v_req_ids) as supporting_id where not (supporting_id::uuid = any(v_selected_set))) then raise exception 'Projection supporting evidence mismatch'; end if;
  end loop;
  select snapshot_row.* into v_existing from sih26044.application_snapshots as snapshot_row where snapshot_row.id = v_snapshot_id;
  if v_existing.id is not null then
    if v_existing.application_id is distinct from p_application_id or v_existing.readiness_result_id is distinct from p_readiness_result_id or v_existing.opportunity_version_id is distinct from p_opportunity_version_id or v_existing.recruiter_allowlist_projection is distinct from p_recruiter_allowlist_projection or v_existing.requirement_responses is distinct from coalesce(p_requirement_responses,'{}'::jsonb) then raise exception 'Snapshot ID collision'; end if;
    return query select v_existing.id,v_existing.application_id,v_existing.opportunity_version_id,v_existing.readiness_result_id,v_existing.engine_version,v_existing.evidence_policy_version,v_existing.input_version,v_existing.subject_facts_version,v_existing.evidence_projection_version,v_existing.recruiter_projection_version,v_existing.recruiter_allowlist_projection,v_existing.requirement_responses,v_existing.captured_at,v_existing.finalized_at,v_existing.integrity_fingerprint,v_existing.created_at; return;
  end if;
  insert into sih26044.application_snapshots as snapshot_row (id,application_id,opportunity_version_id,readiness_result_id,engine_version,evidence_policy_version,input_version,subject_facts_version,evidence_projection_version,recruiter_projection_version,recruiter_allowlist_projection,requirement_responses,captured_at,created_at) values (v_snapshot_id,p_application_id,p_opportunity_version_id,p_readiness_result_id,p_engine_version,p_evidence_policy_version,p_input_version,p_subject_facts_version,p_evidence_projection_version,p_recruiter_projection_version,p_recruiter_allowlist_projection,coalesce(p_requirement_responses,'{}'::jsonb),statement_timestamp(),statement_timestamp());
  foreach v_evidence_id in array v_selected_set loop insert into sih26044.application_snapshot_evidence as snapshot_evidence (application_snapshot_id,evidence_record_id) values (v_snapshot_id,v_evidence_id) on conflict do nothing; end loop;
  foreach v_consent_id in array p_consent_grant_ids loop insert into sih26044.application_snapshot_consents as snapshot_consent (application_snapshot_id,consent_grant_id) values (v_snapshot_id,v_consent_id) on conflict do nothing; end loop;
  return query select snapshot_row.id,snapshot_row.application_id,snapshot_row.opportunity_version_id,snapshot_row.readiness_result_id,snapshot_row.engine_version,snapshot_row.evidence_policy_version,snapshot_row.input_version,snapshot_row.subject_facts_version,snapshot_row.evidence_projection_version,snapshot_row.recruiter_projection_version,snapshot_row.recruiter_allowlist_projection,snapshot_row.requirement_responses,snapshot_row.captured_at,snapshot_row.finalized_at,snapshot_row.integrity_fingerprint,snapshot_row.created_at from sih26044.application_snapshots as snapshot_row where snapshot_row.id=v_snapshot_id;
end; $$;
