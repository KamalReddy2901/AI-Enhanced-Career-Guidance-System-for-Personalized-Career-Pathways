-- ============================================================
-- Production Verification & Readiness Repair V2 - CANONICAL
-- ============================================================
-- Corrects PR #91 contract violations.
-- 
-- CHANGES FROM PR #91:
-- 1. Uses actual save_readiness_evidence_projection() RPC contract
-- 2. Creates NEW canonical-scoped evidence records (immutable originals untouched)
-- 3. Creates NEW organization-bound consent (immutable original untouched)
-- 4. Creates flagship opportunity v2 with human_or_issuer_expected for Data Visualization
-- 5. Uses valid enum values (supports/partial/does_not_meet, direct/explicit_claim/indirect)
-- 6. Subject actor confirms projections (not faculty)
-- 7. Adds CI-executable fixture prerequisites + readiness verification test
-- 8. Includes VerificationPage role guard UI fix
-- ============================================================

do $$
declare
  v_actor_student uuid := 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_actor_faculty uuid := '27e18338-ec21-40da-a6aa-2facacc7bd6e';
  v_org_institution uuid := 'f0440000-0000-4000-8000-000000000001';
  
  -- NEW canonical evidence records (deterministic IDs)
  v_evidence_python_canonical uuid := 'f044a000-0000-4000-8000-000000000001';
  v_evidence_data_analysis_canonical uuid := 'f044a000-0000-4000-8000-000000000002';
  v_evidence_research_doc_canonical uuid := 'f044a000-0000-4000-8000-000000000003';
  v_evidence_data_viz_canonical uuid := 'f044a000-0000-4000-8000-000000000004';
  
  -- NEW organization-bound consent/request
  v_consent_viz_org_bound uuid := 'f044e000-0000-4000-8000-000000000100';
  v_vreq_viz_org_bound uuid := 'f044d000-0000-4000-8000-000000000100';
  
  -- Flagship opportunity IDs (v1 from Phase-2B)
  v_opp_flagship uuid := 'f0442000-0000-4000-8000-000000000001';
  v_ver_flagship_v1 uuid := 'f0443000-0000-4000-8000-000000000001';
  v_ver_flagship_v2 uuid := 'f0443000-0000-4000-8000-000000000002';
  
  v_actors_exist boolean;
  v_cnt int;
begin
  -- Check if production controlled actors exist
  select exists(select 1 from sih26044.actors where id = v_actor_student) into v_actors_exist;
  
  if not v_actors_exist then
    raise notice 'Production actors not present - skipping production-specific repair';
    return;
  end if;
  
  raise notice 'Starting production repair v2 (canonical evidence + contracts)...';
  
  -- ================================================================
  -- 1. CREATE NEW CANONICAL-SCOPED EVIDENCE RECORDS
  -- ================================================================
  -- Immutable originals remain untouched.
  -- These new records have proper scope_skill_id for projection validation.
  
  insert into sih26044.evidence_records (
    id, subject_actor_id, provenance, initial_verification_state,
    scope_kind, scope_skill_id, scope_literal_skill_label,
    source, source_captured_at, created_at
  ) values
    -- Python (strong: human_attested provenance, verified)
    (v_evidence_python_canonical, v_actor_student, 'human_attested', 'self_confirmed',
     'global_skill', 'python', 'Python',
     'evidence_ledger', '2026-08-08'::timestamptz, '2026-08-08'::timestamptz),
    
    -- Data Analysis (strong: human_attested provenance, verified)
    (v_evidence_data_analysis_canonical, v_actor_student, 'human_attested', 'self_confirmed',
     'global_skill', 'data-analysis', 'Data Analysis',
     'evidence_ledger', '2026-08-12'::timestamptz, '2026-08-12'::timestamptz),
    
    -- Research Documentation (strong: human_attested provenance, verified)
    (v_evidence_research_doc_canonical, v_actor_student, 'human_attested', 'self_confirmed',
     'global_skill', 'research-documentation', 'Research Documentation',
     'evidence_ledger', '2026-08-15'::timestamptz, '2026-08-15'::timestamptz),
    
    -- Data Visualization (weak: self_declared provenance, proposed, awaiting verification)
    (v_evidence_data_viz_canonical, v_actor_student, 'self_declared', 'proposed',
     'global_skill', 'data-visualization', 'Data Visualization',
     'evidence_ledger', '2026-08-20'::timestamptz, '2026-08-20'::timestamptz)
  on conflict (id) do nothing;
  
  raise notice 'Created 4 canonical-scoped evidence records';
  
  -- ================================================================
  -- 2. CREATE READINESS PROJECTIONS USING ACTUAL RPC CONTRACT
  -- ================================================================
  -- Subject actor confirms (not faculty).
  -- Valid enum values only.
  -- Preserves canonical scope from evidence records.
  
  -- Python projection (STRONG: supports + direct)
  perform sih26044.save_readiness_evidence_projection(
    v_evidence_python_canonical,  -- p_evidence_record_id
    v_actor_student,              -- p_subject_actor_id
    null,                         -- p_requirement_id
    'python',                     -- p_skill_id
    'Python',                     -- p_literal_skill_label
    null,                         -- p_literal_requirement_wording
    2,                            -- p_proficiency
    null,                         -- p_experience_years
    'supports',                   -- p_capability_assertion (enum)
    'direct',                     -- p_directness (enum)
    '2026-08-08'::timestamptz,    -- p_observed_at
    v_actor_student,              -- p_confirmed_by_actor_id (MUST BE SUBJECT)
    'structured_human_entry'      -- p_confirmation_method
  );
  
  -- Data Analysis projection (STRONG: supports + direct)
  perform sih26044.save_readiness_evidence_projection(
    v_evidence_data_analysis_canonical,
    v_actor_student,
    null,
    'data-analysis',
    'Data Analysis',
    null,
    2,
    null,
    'supports',
    'direct',
    '2026-08-12'::timestamptz,
    v_actor_student,
    'structured_human_entry'
  );
  
  -- Research Documentation projection (STRONG: supports + direct)
  perform sih26044.save_readiness_evidence_projection(
    v_evidence_research_doc_canonical,
    v_actor_student,
    null,
    'research-documentation',
    'Research Documentation',
    null,
    2,
    null,
    'supports',
    'direct',
    '2026-08-15'::timestamptz,
    v_actor_student,
    'structured_human_entry'
  );
  
  -- Data Visualization projection (WEAK: supports + explicit_claim, awaiting verification)
  perform sih26044.save_readiness_evidence_projection(
    v_evidence_data_viz_canonical,
    v_actor_student,
    null,
    'data-visualization',
    'Data Visualization',
    null,
    1,
    null,
    'supports',
    'explicit_claim',  -- self-declared = explicit_claim
    '2026-08-20'::timestamptz,
    v_actor_student,
    'ai_assisted_review'
  );
  
  raise notice 'Created 4 readiness projections via RPC';
  
  -- ================================================================
  -- 3. CREATE NEW ORGANIZATION-BOUND CONSENT & VERIFICATION REQUEST
  -- ================================================================
  -- Immutable malformed consent remains untouched.
  
  insert into sih26044.consent_grants (
    id, subject_actor_id, grantee_organization_id, purpose,
    granted_at, created_by_actor_id, created_at
  ) values (
    v_consent_viz_org_bound,
    v_actor_student,
    v_org_institution,  -- ORGANIZATION-BOUND
    'evidence_verification',
    '2026-09-01'::timestamptz,
    v_actor_student,
    '2026-09-01'::timestamptz
  ) on conflict (id) do nothing;
  
  -- Link NEW canonical Data Visualization evidence to consent
  insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id)
  values (v_consent_viz_org_bound, v_evidence_data_viz_canonical)
  on conflict do nothing;
  
  -- Create NEW organization-bound verification request
  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id,
    requested_verifier_actor_id, requested_verifier_organization_id,
    consent_grant_id, scope_kind, scope_literal_skill_label,
    status, requested_at
  ) values (
    v_vreq_viz_org_bound,
    v_evidence_data_viz_canonical,
    v_actor_student,
    v_actor_faculty,
    v_org_institution,  -- ORGANIZATION-BOUND
    v_consent_viz_org_bound,
    'global_skill',
    'Data Visualization',
    'requested',
    '2026-09-01'::timestamptz
  ) on conflict (id) do nothing;
  
  raise notice 'Created organization-bound consent/request for Data Visualization';
  
  -- Retire malformed NULL-organization request if it has no events
  select count(*) into v_cnt
  from sih26044.verification_events
  where verification_request_id = 'f044d000-0000-4000-8000-000000000003';
  
  if v_cnt = 0 then
    delete from sih26044.verification_requests
    where id = 'f044d000-0000-4000-8000-000000000003'
      and status = 'requested'
      and requested_verifier_organization_id is null;
    raise notice 'Retired malformed verification request';
  end if;
  
  -- ================================================================
  -- 4. CREATE FLAGSHIP OPPORTUNITY V2 WITH CORRECT EVIDENCE_EXPECTATION
  -- ================================================================
  -- Published v1 remains immutable.
  -- v2 uses human_or_issuer_expected for Data Visualization to match intended verification story.
  
  insert into sih26044.opportunity_versions (
    id, opportunity_id, version_number, status,
    owner_organization_id, title, description,
    opportunity_type, audiences, source_system, source_literal_text,
    source_captured_at, created_by_actor_id, created_at
  )
  select
    v_ver_flagship_v2,
    opportunity_id,
    2,  -- v2
    'draft',
    owner_organization_id,
    title,
    description,
    opportunity_type,
    audiences,
    source_system,
    source_literal_text,
    source_captured_at,
    v_actor_student,  -- FIXME: should be recruiter, but using controlled student for demo
    now()
  from sih26044.opportunity_versions
  where id = v_ver_flagship_v1
  on conflict (id, opportunity_id) do nothing;
  
  -- Copy requirements from v1 with Data Visualization evidence_expectation fix
  insert into sih26044.opportunity_requirements (
    id, opportunity_version_id, ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency, human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method, created_at
  )
  select
    uuid_generate_v4(),
    v_ver_flagship_v2,
    ordinal,
    category,
    priority,
    literal_source_wording,
    importance,
    -- FIX: Data Visualization uses human_or_issuer_expected (not artifact_expected)
    case
      when canonical_skill_label = 'Data Visualization' then 'human_or_issuer_expected'
      else evidence_expectation
    end,
    canonical_resolution,
    canonical_skill_id,
    canonical_skill_label,
    minimum_proficiency,
    human_confirmed,
    confirmed_by_actor_id,
    confirmed_at,
    confirmation_method,
    now()
  from sih26044.opportunity_requirements
  where opportunity_version_id = v_ver_flagship_v1
  on conflict do nothing;
  
  -- Copy eligibility rules (if any exist)
  insert into sih26044.eligibility_rules (
    id, opportunity_version_id, ordinal, rule_kind,
    literal_source_wording, typed_rule_definition,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method, created_at
  )
  select
    uuid_generate_v4(),
    v_ver_flagship_v2,
    ordinal,
    rule_kind,
    literal_source_wording,
    typed_rule_definition,
    human_confirmed,
    confirmed_by_actor_id,
    confirmed_at,
    confirmation_method,
    now()
  from sih26044.eligibility_rules
  where opportunity_version_id = v_ver_flagship_v1
  on conflict do nothing;
  
  -- Publish v2
  update sih26044.opportunity_versions
  set status = 'published', published_at = now()
  where id = v_ver_flagship_v2 and status = 'draft';
  
  -- Make v2 current
  update sih26044.opportunities
  set current_version_id = v_ver_flagship_v2
  where id = v_opp_flagship and current_version_id != v_ver_flagship_v2;
  
  raise notice 'Created and published flagship opportunity v2';
  
  raise notice 'Production repair v2 complete';
end;
$$;

-- ================================================================
-- 5. VERIFIER ROLE GUARD (UI FIX)
-- ================================================================
-- This is handled in a separate TypeScript commit in the same PR.
-- VerificationPage already checks getCurrentVerifierActingContexts().
-- Need to hide/disable FACULTY → VERIFICATION menu item for non-verifiers.
