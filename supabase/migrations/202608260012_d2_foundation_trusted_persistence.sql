-- SIH26044 Foundation D2: complete trusted persistence model, privacy key filter,
-- subject fact materialization, capability projections, artifact registration,
-- derived evidence lineage, historical input snapshots, and system principal audit.

-- 1. Helper function for recursive prohibited JSON key inspection
create or replace function sih26044.has_prohibited_json_keys(p_json jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, sih26044
as $$
declare
  k text;
  normalized text;
  val jsonb;
  prohibited_keys constant text[] := array[
    'riasec', 'work_values', 'workvalues', 'private_aspirations', 'privateaspirations',
    'counselor_history', 'counselorhistory', 'private_guidance', 'privateguidance',
    'financial_constraints', 'financialconstraints', 'family_constraints', 'familyconstraints',
    'guardian_data', 'guardiandata', 'private_constraints', 'privateconstraints',
    'unrelated_disability', 'unrelated_accessibility', 'hiring_probability', 'hiringprobability',
    'candidate_rank', 'candidaterank', 'employability_score', 'employabilityscore',
    'opaque_fit_score', 'readiness_percentage', 'fit_percentage', 'success_probability'
  ];
begin
  if p_json is null or jsonb_typeof(p_json) not in ('object', 'array') then
    return false;
  end if;

  if jsonb_typeof(p_json) = 'object' then
    for k, val in select * from jsonb_each(p_json)
    loop
      normalized := lower(regexp_replace(k, '[^a-zA-Z0-9]', '', 'g'));
      if normalized = any(select lower(regexp_replace(pk, '[^a-zA-Z0-9]', '', 'g')) from unnest(prohibited_keys) as pk) then
        return true;
      end if;
      if val is not null and jsonb_typeof(val) in ('object', 'array') then
        if sih26044.has_prohibited_json_keys(val) then
          return true;
        end if;
      end if;
    end loop;
  elsif jsonb_typeof(p_json) = 'array' then
    for val in select * from jsonb_array_elements(p_json)
    loop
      if val is not null and jsonb_typeof(val) in ('object', 'array') then
        if sih26044.has_prohibited_json_keys(val) then
          return true;
        end if;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

revoke all on function sih26044.has_prohibited_json_keys(jsonb) from public;
grant execute on function sih26044.has_prohibited_json_keys(jsonb) to authenticated, service_role;

-- 2. Update recruiter_projection_is_allowlisted to use the recursive key filter
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
  return not sih26044.has_prohibited_json_keys(projection);
end;
$$;

-- 3. Audit events system principal support
alter table sih26044.audit_events alter column actor_id drop not null;
alter table sih26044.audit_events add column if not exists system_principal text
  check (system_principal is null or length(btrim(system_principal)) > 0);
alter table sih26044.audit_events drop constraint if exists audit_events_principal_check;
alter table sih26044.audit_events add constraint audit_events_principal_check check (
  (actor_id is not null and system_principal is null) or
  (actor_id is null and system_principal is not null)
);

create or replace function sih26044.record_authoritative_audit(
  p_actor_id uuid,
  p_system_principal text,
  p_organization_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_purpose sih26044.consent_purpose,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if (p_actor_id is null and p_system_principal is null) or
     (p_actor_id is not null and p_system_principal is not null) then
    raise exception 'Audit event requires exactly one principal: actor_id or system_principal';
  end if;
  if p_actor_id is not null and not exists (
    select 1 from sih26044.actors where id = p_actor_id and status = 'active'
  ) then
    raise exception 'Audit actor must be an active SIH actor';
  end if;

  insert into sih26044.audit_events (
    id, actor_id, system_principal, organization_id, action,
    resource_type, resource_id, purpose, metadata, occurred_at
  ) values (
    v_id, p_actor_id, p_system_principal, p_organization_id, p_action,
    p_resource_type, p_resource_id, p_purpose, coalesce(p_metadata, '{}'::jsonb), statement_timestamp()
  );

  return v_id;
end;
$$;

revoke all on function sih26044.record_authoritative_audit(
  uuid, text, uuid, text, text, text, sih26044.consent_purpose, jsonb
) from public, anon, authenticated;
grant execute on function sih26044.record_authoritative_audit(
  uuid, text, uuid, text, text, text, sih26044.consent_purpose, jsonb
) to service_role;

-- 4. Historical Engine B Input Snapshots
create table if not exists sih26044.readiness_input_snapshots (
  id uuid primary key default gen_random_uuid(),
  readiness_result_id uuid not null unique references sih26044.opportunity_readiness_results(id) on delete restrict,
  subject_actor_id uuid not null references sih26044.actors(id) on delete restrict,
  opportunity_id uuid not null references sih26044.opportunities(id) on delete restrict,
  opportunity_version_id uuid not null,
  engine_version text not null,
  evidence_policy_version text not null,
  input_version text not null,
  subject_facts_version text not null,
  evidence_projection_version text not null,
  canonical_input jsonb not null check (jsonb_typeof(canonical_input) = 'object'),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (opportunity_version_id, opportunity_id)
    references sih26044.opportunity_versions(id, opportunity_id) on delete restrict,
  check (not sih26044.has_prohibited_json_keys(canonical_input))
);

create trigger readiness_input_snapshots_immutable
before update or delete on sih26044.readiness_input_snapshots
for each row execute function sih26044.reject_historical_mutation();

alter table sih26044.readiness_input_snapshots enable row level security;
grant select on sih26044.readiness_input_snapshots to authenticated;
create policy readiness_input_snapshots_select_self
on sih26044.readiness_input_snapshots for select to authenticated
using (subject_actor_id = sih26044.current_actor_id());

-- 5. Updated persist_trusted_readiness_result with recursive key check and optional canonical input snapshot
create or replace function sih26044.persist_trusted_readiness_result(
  p_id uuid,
  p_subject_actor_id uuid,
  p_opportunity_id uuid,
  p_opportunity_version_id uuid,
  p_engine_version text,
  p_evidence_policy_version text,
  p_input_version text,
  p_subject_facts_version text,
  p_evidence_projection_version text,
  p_readiness_band sih26044.readiness_band,
  p_result_body jsonb,
  p_generated_at timestamptz,
  p_canonical_input jsonb default null
)
returns setof sih26044.opportunity_readiness_results
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  if p_result_body is null or jsonb_typeof(p_result_body) <> 'object'
    or (select array_agg(result_key order by result_key) from jsonb_object_keys(p_result_body) as result_key)
      is distinct from array[
        'eligibilityRuleResults', 'eligibilityStatus', 'engineVersion', 'evidenceCoverage',
        'evidenceProjectionVersion', 'gapCount', 'generatedAt', 'inputVersion',
        'learningDistance', 'opportunityId', 'opportunityVersion', 'opportunityVersionId',
        'partialCount', 'policyVersion', 'preferredRequirementResults', 'readinessBand',
        'relevantWorkSamples', 'requiredCoverage', 'requiredRequirementResults', 'resultId',
        'subjectActorId', 'subjectFactsVersion', 'verificationCoverage'
      ]::text[]
    or sih26044.has_prohibited_json_keys(p_result_body)
    or not exists (
      select 1 from sih26044.actors a
      where a.id = p_subject_actor_id and a.status = 'active'
    )
    or not exists (
      select 1 from sih26044.opportunity_versions v
      where v.id = p_opportunity_version_id
        and v.opportunity_id = p_opportunity_id
        and v.status = 'published'
    )
    or p_result_body ->> 'resultId' is distinct from p_id::text
    or p_result_body ->> 'subjectActorId' is distinct from p_subject_actor_id::text
    or p_result_body ->> 'opportunityId' is distinct from p_opportunity_id::text
    or p_result_body ->> 'opportunityVersionId' is distinct from p_opportunity_version_id::text
    or p_result_body ->> 'engineVersion' is distinct from p_engine_version
    or p_result_body ->> 'policyVersion' is distinct from p_evidence_policy_version
    or p_result_body ->> 'inputVersion' is distinct from p_input_version
    or p_result_body ->> 'subjectFactsVersion' is distinct from p_subject_facts_version
    or p_result_body ->> 'evidenceProjectionVersion' is distinct from p_evidence_projection_version
    or p_result_body ->> 'readinessBand' is distinct from p_readiness_band::text
    or (p_result_body ->> 'generatedAt')::timestamptz is distinct from p_generated_at
    or length(btrim(p_engine_version)) = 0
    or length(btrim(p_evidence_policy_version)) = 0
    or length(btrim(p_input_version)) = 0
    or length(btrim(p_subject_facts_version)) = 0
    or length(btrim(p_evidence_projection_version)) = 0
  then
    raise exception 'Trusted readiness result relationships or canonical fields are invalid';
  end if;

  insert into sih26044.opportunity_readiness_results (
    id, subject_actor_id, opportunity_id, opportunity_version_id, engine_version,
    evidence_policy_version, input_version, subject_facts_version,
    evidence_projection_version, readiness_band, result_body, generated_at
  ) values (
    p_id, p_subject_actor_id, p_opportunity_id, p_opportunity_version_id, p_engine_version,
    p_evidence_policy_version, p_input_version, p_subject_facts_version,
    p_evidence_projection_version, p_readiness_band, p_result_body, p_generated_at
  ) on conflict do nothing;

  if p_canonical_input is not null then
    if sih26044.has_prohibited_json_keys(p_canonical_input) then
      raise exception 'Canonical input contains prohibited private guidance fields';
    end if;
    insert into sih26044.readiness_input_snapshots (
      readiness_result_id, subject_actor_id, opportunity_id, opportunity_version_id,
      engine_version, evidence_policy_version, input_version, subject_facts_version,
      evidence_projection_version, canonical_input, captured_at, created_at
    ) values (
      p_id, p_subject_actor_id, p_opportunity_id, p_opportunity_version_id,
      p_engine_version, p_evidence_policy_version, p_input_version, p_subject_facts_version,
      p_evidence_projection_version, p_canonical_input, p_generated_at, statement_timestamp()
    ) on conflict do nothing;
  end if;

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id, null, null, 'persist_readiness_result',
    'opportunity_readiness_results', p_id::text, null,
    jsonb_build_object(
      'opportunityVersionId', p_opportunity_version_id,
      'inputVersion', p_input_version,
      'readinessBand', p_readiness_band
    )
  );

  return query
  select result.* from sih26044.opportunity_readiness_results result
  where result.subject_actor_id = p_subject_actor_id
    and result.opportunity_version_id = p_opportunity_version_id
    and result.engine_version = p_engine_version
    and result.evidence_policy_version = p_evidence_policy_version
    and result.input_version = p_input_version
    and result.subject_facts_version = p_subject_facts_version
    and result.evidence_projection_version = p_evidence_projection_version;
end
$$;

revoke all on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz, jsonb
) to service_role;

-- 6. Trusted Subject-Fact Materialization RPC
create or replace function sih26044.materialize_readiness_subject_facts(
  p_subject_actor_id uuid,
  p_education_level sih26044.readiness_education_level,
  p_education_level_confirmed boolean,
  p_graduation_year integer,
  p_graduation_year_confirmed boolean,
  p_physical_presence_locations jsonb,
  p_physical_presence_locations_complete boolean,
  p_eligibility_facts jsonb,
  p_work_authorizations jsonb,
  p_relevant_languages jsonb,
  p_relevant_languages_complete boolean
)
returns setof sih26044.readiness_subject_facts
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  if not exists (select 1 from sih26044.actors where id = p_subject_actor_id and status = 'active') then
    raise exception 'Subject actor must be active';
  end if;

  if sih26044.has_prohibited_json_keys(p_eligibility_facts)
     or sih26044.has_prohibited_json_keys(p_physical_presence_locations)
     or sih26044.has_prohibited_json_keys(p_work_authorizations)
     or sih26044.has_prohibited_json_keys(p_relevant_languages) then
    raise exception 'Subject facts contain prohibited private guidance fields';
  end if;

  insert into sih26044.readiness_subject_facts (
    subject_actor_id,
    education_level, education_level_confirmed,
    graduation_year, graduation_year_confirmed,
    physical_presence_locations, physical_presence_locations_complete,
    eligibility_facts, work_authorizations,
    relevant_languages, relevant_languages_complete,
    updated_at
  ) values (
    p_subject_actor_id,
    p_education_level, coalesce(p_education_level_confirmed, false),
    p_graduation_year, coalesce(p_graduation_year_confirmed, false),
    coalesce(p_physical_presence_locations, '[]'::jsonb), coalesce(p_physical_presence_locations_complete, false),
    coalesce(p_eligibility_facts, '[]'::jsonb), coalesce(p_work_authorizations, '[]'::jsonb),
    coalesce(p_relevant_languages, '[]'::jsonb), coalesce(p_relevant_languages_complete, false),
    statement_timestamp()
  )
  on conflict (subject_actor_id) do update set
    education_level = excluded.education_level,
    education_level_confirmed = excluded.education_level_confirmed,
    graduation_year = excluded.graduation_year,
    graduation_year_confirmed = excluded.graduation_year_confirmed,
    physical_presence_locations = excluded.physical_presence_locations,
    physical_presence_locations_complete = excluded.physical_presence_locations_complete,
    eligibility_facts = excluded.eligibility_facts,
    work_authorizations = excluded.work_authorizations,
    relevant_languages = excluded.relevant_languages,
    relevant_languages_complete = excluded.relevant_languages_complete,
    updated_at = statement_timestamp();

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id, null, null, 'materialize_subject_facts',
    'readiness_subject_facts', p_subject_actor_id::text, null,
    jsonb_build_object('subjectActorId', p_subject_actor_id)
  );

  return query
  select * from sih26044.readiness_subject_facts where subject_actor_id = p_subject_actor_id;
end;
$$;

revoke all on function sih26044.materialize_readiness_subject_facts(
  uuid, sih26044.readiness_education_level, boolean, integer, boolean,
  jsonb, boolean, jsonb, jsonb, jsonb, boolean
) from public, anon, authenticated;
grant execute on function sih26044.materialize_readiness_subject_facts(
  uuid, sih26044.readiness_education_level, boolean, integer, boolean,
  jsonb, boolean, jsonb, jsonb, jsonb, boolean
) to service_role;

-- 7. Evidence Capability Projection RPC
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
    'structured_human_entry', 'ai_assisted_review', 'direct_confirmation', 'self_assessment_review'
  ) then
    raise exception 'Invalid human confirmation method for capability projection';
  end if;

  insert into sih26044.readiness_evidence_projections (
    evidence_record_id, subject_actor_id, requirement_id, skill_id,
    literal_skill_label, literal_requirement_wording, proficiency,
    experience_years, capability_assertion, directness, observed_at, created_at
  ) values (
    p_evidence_record_id, p_subject_actor_id, p_requirement_id, p_skill_id,
    p_literal_skill_label, p_literal_requirement_wording, p_proficiency,
    p_experience_years, p_capability_assertion, p_directness, p_observed_at, statement_timestamp()
  )
  on conflict (evidence_record_id) do nothing;

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

-- 8. Artifact Registration RPC
create or replace function sih26044.register_trusted_artifact(
  p_artifact_id uuid,
  p_subject_actor_id uuid,
  p_storage_bucket_id text,
  p_storage_object_path text,
  p_media_type text,
  p_display_name text,
  p_integrity_fingerprint text,
  p_evidence_record_id uuid default null
)
returns setof sih26044.artifacts
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_existing sih26044.artifacts%rowtype;
begin
  if not exists (select 1 from sih26044.actors where id = p_subject_actor_id and status = 'active') then
    raise exception 'Subject actor must be active';
  end if;

  if p_storage_bucket_id <> 'career-evidence-private' then
    raise exception 'Artifacts must use career-evidence-private bucket';
  end if;

  if split_part(p_storage_object_path, '/', 1) <> p_subject_actor_id::text
     or split_part(p_storage_object_path, '/', 2) <> p_artifact_id::text then
    raise exception 'Storage object path does not match subject actor and artifact ID';
  end if;

  if p_integrity_fingerprint is null or p_integrity_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Valid SHA-256 integrity fingerprint is required';
  end if;

  if p_evidence_record_id is not null then
    if not exists (
      select 1 from sih26044.evidence_records
      where id = p_evidence_record_id and subject_actor_id = p_subject_actor_id
    ) then
      raise exception 'Evidence record does not belong to subject actor';
    end if;
  end if;

  select * into v_existing from sih26044.artifacts where id = p_artifact_id;
  if v_existing.id is not null then
    if v_existing.subject_actor_id <> p_subject_actor_id
       or v_existing.storage_object_path <> p_storage_object_path
       or v_existing.integrity_fingerprint <> p_integrity_fingerprint then
      raise exception 'Artifact ID conflict with differing metadata';
    end if;
  else
    insert into sih26044.artifacts (
      id, subject_actor_id, storage_bucket_id, storage_object_path,
      media_type, display_name, integrity_fingerprint, scan_status, created_at
    ) values (
      p_artifact_id, p_subject_actor_id, p_storage_bucket_id, p_storage_object_path,
      p_media_type, p_display_name, p_integrity_fingerprint, 'not_scanned', statement_timestamp()
    );

    perform sih26044.record_authoritative_audit(
      p_subject_actor_id, null, null, 'register_artifact',
      'artifacts', p_artifact_id::text, null,
      jsonb_build_object(
        'artifactId', p_artifact_id,
        'storageObjectPath', p_storage_object_path,
        'integrityFingerprint', p_integrity_fingerprint
      )
    );
  end if;

  if p_evidence_record_id is not null then
    insert into sih26044.evidence_artifact_links (
      evidence_record_id, artifact_id, linked_by_actor_id, linked_at
    ) values (
      p_evidence_record_id, p_artifact_id, p_subject_actor_id, statement_timestamp()
    ) on conflict do nothing;

    perform sih26044.record_authoritative_audit(
      p_subject_actor_id, null, null, 'link_evidence_artifact',
      'evidence_artifact_links', p_evidence_record_id::text || ':' || p_artifact_id::text, null,
      jsonb_build_object(
        'evidenceRecordId', p_evidence_record_id,
        'artifactId', p_artifact_id
      )
    );
  end if;

  return query
  select * from sih26044.artifacts where id = p_artifact_id;
end;
$$;

revoke all on function sih26044.register_trusted_artifact(
  uuid, uuid, text, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function sih26044.register_trusted_artifact(
  uuid, uuid, text, text, text, text, text, uuid
) to service_role;

-- 9. Artifact Scan Status Adapter RPC
create or replace function sih26044.update_artifact_scan_status(
  p_artifact_id uuid,
  p_scan_status sih26044.artifact_scan_status,
  p_scanner_principal text,
  p_reason text default null
)
returns setof sih26044.artifacts
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_artifact sih26044.artifacts%rowtype;
begin
  if p_scanner_principal is null or length(btrim(p_scanner_principal)) = 0 then
    raise exception 'Explicit scanner principal required';
  end if;

  select * into v_artifact from sih26044.artifacts where id = p_artifact_id;
  if v_artifact.id is null then
    raise exception 'Artifact not found';
  end if;

  update sih26044.artifacts
  set scan_status = p_scan_status
  where id = p_artifact_id;

  perform sih26044.record_authoritative_audit(
    null, p_scanner_principal, null, 'update_artifact_scan_status',
    'artifacts', p_artifact_id::text, null,
    jsonb_build_object(
      'artifactId', p_artifact_id,
      'fromScanStatus', v_artifact.scan_status,
      'toScanStatus', p_scan_status,
      'reason', p_reason
    )
  );

  return query
  select * from sih26044.artifacts where id = p_artifact_id;
end;
$$;

revoke all on function sih26044.update_artifact_scan_status(
  uuid, sih26044.artifact_scan_status, text, text
) from public, anon, authenticated;
grant execute on function sih26044.update_artifact_scan_status(
  uuid, sih26044.artifact_scan_status, text, text
) to service_role;

-- 10. Evidence Derivations (Lineage for Artifact-Backed Evidence)
create table if not exists sih26044.evidence_derivations (
  id uuid primary key default gen_random_uuid(),
  derived_evidence_record_id uuid not null unique references sih26044.evidence_records(id) on delete restrict,
  source_evidence_record_id uuid not null references sih26044.evidence_records(id) on delete restrict,
  artifact_id uuid not null references sih26044.artifacts(id) on delete restrict,
  derivation_kind text not null check (length(btrim(derivation_kind)) > 0),
  derived_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger evidence_derivations_immutable
before update or delete on sih26044.evidence_derivations
for each row execute function sih26044.reject_historical_mutation();

alter table sih26044.evidence_derivations enable row level security;
grant select on sih26044.evidence_derivations to authenticated;
create policy evidence_derivations_select_self
on sih26044.evidence_derivations for select to authenticated
using (
  exists (
    select 1 from sih26044.evidence_records e
    where e.id = derived_evidence_record_id
      and e.subject_actor_id = sih26044.current_actor_id()
  )
);

create or replace function sih26044.derive_artifact_backed_evidence(
  p_derived_evidence_id uuid,
  p_source_evidence_record_id uuid,
  p_artifact_id uuid,
  p_subject_actor_id uuid,
  p_literal_claim text,
  p_derivation_kind text,
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
  if p_confirmation_method is null or p_confirmation_method not in (
    'structured_human_entry', 'ai_assisted_review', 'direct_confirmation', 'self_assessment_review'
  ) then
    raise exception 'Invalid human confirmation method for derivation';
  end if;

  -- Create derived evidence record with provenance = 'artifact_backed'
  -- Initial verification state is NEVER inherited as human_verified / issuer_verified!
  insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    proposal_source, scope_kind, scope_skill_id, scope_literal_skill_label,
    scope_opportunity_id, scope_requirement_id, scope_organization_id, scope_outcome_event_id,
    source_system, source_record_id, source_url, source_captured_at, visibility, created_at
  ) values (
    p_derived_evidence_id, p_subject_actor_id, coalesce(p_literal_claim, v_source.literal_claim),
    'artifact_backed', 'unverified', null,
    v_source.scope_kind, v_source.scope_skill_id, v_source.scope_literal_skill_label,
    v_source.scope_opportunity_id, v_source.scope_requirement_id, v_source.scope_organization_id, v_source.scope_outcome_event_id,
    'derived_artifact_workflow', v_source.id::text, null, statement_timestamp(), v_source.visibility, statement_timestamp()
  );

  insert into sih26044.evidence_artifact_links (
    evidence_record_id, artifact_id, linked_by_actor_id, linked_at
  ) values (
    p_derived_evidence_id, p_artifact_id, p_subject_actor_id, statement_timestamp()
  ) on conflict do nothing;

  insert into sih26044.evidence_derivations (
    derived_evidence_record_id, source_evidence_record_id, artifact_id,
    derivation_kind, derived_at, created_at
  ) values (
    p_derived_evidence_id, p_source_evidence_record_id, p_artifact_id,
    p_derivation_kind, statement_timestamp(), statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id, null, null, 'derive_artifact_backed_evidence',
    'evidence_records', p_derived_evidence_id::text, null,
    jsonb_build_object(
      'sourceEvidenceRecordId', p_source_evidence_record_id,
      'derivedEvidenceRecordId', p_derived_evidence_id,
      'artifactId', p_artifact_id,
      'derivationKind', p_derivation_kind
    )
  );

  return query
  select * from sih26044.evidence_records where id = p_derived_evidence_id;
end;
$$;

revoke all on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, uuid, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function sih26044.derive_artifact_backed_evidence(
  uuid, uuid, uuid, uuid, text, text, uuid, text
) to service_role;

-- 11. Application Snapshot Construction RPC
create or replace function sih26044.create_application_snapshot(
  p_id uuid,
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
  p_captured_at timestamptz
)
returns setof sih26044.application_snapshots
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_existing sih26044.application_snapshots%rowtype;
  v_evidence_id uuid;
  v_consent_id uuid;
begin
  if sih26044.has_prohibited_json_keys(p_recruiter_allowlist_projection) then
    raise exception 'Recruiter projection contains prohibited private keys';
  end if;

  select * into v_existing from sih26044.application_snapshots where id = p_id;
  if v_existing.id is not null then
    return query select * from sih26044.application_snapshots where id = p_id;
    return;
  end if;

  insert into sih26044.application_snapshots (
    id, application_id, opportunity_version_id, readiness_result_id,
    engine_version, evidence_policy_version, input_version,
    subject_facts_version, evidence_projection_version,
    recruiter_projection_version, recruiter_allowlist_projection,
    requirement_responses, captured_at, created_at
  ) values (
    p_id, p_application_id, p_opportunity_version_id, p_readiness_result_id,
    p_engine_version, p_evidence_policy_version, p_input_version,
    p_subject_facts_version, p_evidence_projection_version,
    p_recruiter_projection_version, p_recruiter_allowlist_projection,
    coalesce(p_requirement_responses, '{}'::jsonb), p_captured_at, statement_timestamp()
  );

  if p_selected_evidence_ids is not null then
    foreach v_evidence_id in array p_selected_evidence_ids
    loop
      insert into sih26044.application_snapshot_evidence (
        application_snapshot_id, evidence_record_id
      ) values (
        p_id, v_evidence_id
      ) on conflict do nothing;
    end loop;
  end if;

  if p_consent_grant_ids is not null then
    foreach v_consent_id in array p_consent_grant_ids
    loop
      insert into sih26044.application_snapshot_consents (
        application_snapshot_id, consent_grant_id
      ) values (
        p_id, v_consent_id
      ) on conflict do nothing;
    end loop;
  end if;

  return query select * from sih26044.application_snapshots where id = p_id;
end;
$$;

revoke all on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], timestamptz
) from public, anon, authenticated;
grant execute on function sih26044.create_application_snapshot(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, uuid[], uuid[], timestamptz
) to service_role;

comment on function sih26044.has_prohibited_json_keys(jsonb) is
  'Recursive JSON key inspection rejecting prohibited private guidance and ranking keys while preserving legitimate string values.';
comment on table sih26044.readiness_input_snapshots is
  'Immutable historical Engine B semantic input snapshots linked to readiness results for audit and deterministic replay.';
comment on table sih26044.evidence_derivations is
  'Append-only lineage for derived artifact-backed evidence records.';
