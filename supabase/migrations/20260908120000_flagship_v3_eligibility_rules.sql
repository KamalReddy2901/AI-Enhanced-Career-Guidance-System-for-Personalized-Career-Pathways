-- ============================================================================
-- Migration: 20260908120000_flagship_v3_eligibility_rules
--
-- Purpose: Create flagship opportunity V3 as a successor to the published V2.
--
-- V2 (f0443000-0000-4000-8000-000000000002) is immutable and must not be
-- touched. It is deliberately preserved because the existing submitted
-- application snapshot (a080bafe-ec71-4fd5-99b2-19ed8ac8cb87) is legitimately
-- bound to it and must remain so.
--
-- V3 (f0443000-0000-4000-8000-000000000003) adds one truthful eligibility rule
-- grounded entirely in existing authoritative canonical data:
--
--   organization_membership kind
--   organizationIds: ["f0440000-0000-4000-8000-000000000001"]  (institution)
--   Literal: "Applicant must have an active student affiliation with the
--             participating institution."
--
-- This rule evaluates via current_readiness_organization_memberships() which
-- the Worker already calls during subject assembly. The controlled student
-- has an active learner membership in that organization (seeded in migration
-- 20260905000000_controlled_fixture_seed_oneshot.sql, membership ID
-- f0441000-0000-4000-8000-000000000001, status = active, valid_until = null).
-- The RPC marks that row confirmed = true, effective_active = true.
-- evaluateEligibilityRule returns SATISFIED without touching any subject facts.
--
-- No new readiness_subject_facts rows are created.
--
-- Authoritative fact source: existing organization_memberships row.
-- No manufactured or inferred facts.
--
-- Deterministic ID namespaces:
--   V3 version      : f0443000-0000-4000-8000-000000000003
--   V3 requirements : f0444200-0000-4000-8000-0000000002xx  (ordinal 00-04)
--   V3 elig rule    : f0445300-0000-4000-8000-000000000100  (ordinal 0)
-- ============================================================================

do $$
declare
  -- Controlled fixture actor IDs
  v_actor_student   uuid := 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_actor_recruiter uuid := '359de147-6dd1-41a9-aa06-8dd1a62d5080';

  -- Flagship opportunity IDs
  v_opp_flagship    uuid := 'f0442000-0000-4000-8000-000000000001';
  v_ver_v2          uuid := 'f0443000-0000-4000-8000-000000000002';
  v_ver_v3          uuid := 'f0443000-0000-4000-8000-000000000003';

  -- Institution organization (authoritative fact source)
  v_org_institution uuid := 'f0440000-0000-4000-8000-000000000001';

  -- V3 requirement IDs (deterministic copies of V2 requirements)
  v_req_v3_python      uuid := 'f0444200-0000-4000-8000-000000000200';
  v_req_v3_data_anal   uuid := 'f0444200-0000-4000-8000-000000000201';
  v_req_v3_research    uuid := 'f0444200-0000-4000-8000-000000000202';
  v_req_v3_data_viz    uuid := 'f0444200-0000-4000-8000-000000000203';
  v_req_v3_ayush       uuid := 'f0444200-0000-4000-8000-000000000204';

  -- V3 eligibility rule ID
  v_rule_membership    uuid := 'f0445300-0000-4000-8000-000000000100';

  -- State checks
  v_actors_exist  boolean;
  v_v2_published  boolean;
  v_membership_ok boolean;
  v_v3_exists     boolean;
  v_v3_published  boolean;
  v_req_count     integer;
  v_rule_count    integer;

begin
  -- -----------------------------------------------------------------------
  -- Guard 1: Controlled actors must exist (production environment check).
  -- -----------------------------------------------------------------------
  select exists(
    select 1 from sih26044.actors where id = v_actor_student and status = 'active'
  ) into v_actors_exist;

  if not v_actors_exist then
    raise notice 'Controlled student actor not present — skipping (not production).';
    return;
  end if;

  -- -----------------------------------------------------------------------
  -- Guard 2: V2 must be published and have exactly 5 requirements.
  -- -----------------------------------------------------------------------
  select exists(
    select 1 from sih26044.opportunity_versions
    where id = v_ver_v2 and status = 'published'
  ) into v_v2_published;

  if not v_v2_published then
    raise exception 'Flagship v2 (%) is not published — cannot create v3 successor.', v_ver_v2;
  end if;

  select count(*) into v_req_count
  from sih26044.opportunity_requirements
  where opportunity_version_id = v_ver_v2;

  if v_req_count != 5 then
    raise exception 'Flagship v2 has % requirements (expected 5).', v_req_count;
  end if;

  -- -----------------------------------------------------------------------
  -- Guard 3: The authoritative membership fact must exist and be active.
  --
  -- The organization_membership eligibility rule will only evaluate to
  -- SATISFIED if the student has an active membership in the institution.
  -- Fail fast here rather than creating a V3 with a broken rule.
  -- -----------------------------------------------------------------------
  select exists(
    select 1
    from sih26044.organization_memberships om
    where om.actor_id      = v_actor_student
      and om.organization_id = v_org_institution
      and om.status          = 'active'
      and (om.valid_until is null or om.valid_until > now())
  ) into v_membership_ok;

  if not v_membership_ok then
    raise exception
      'Student (%) has no active membership in institution (%) — '
      'the organization_membership eligibility rule would not evaluate SATISFIED. '
      'Aborting v3 creation.',
      v_actor_student, v_org_institution;
  end if;

  -- -----------------------------------------------------------------------
  -- Idempotency check for V3.
  -- -----------------------------------------------------------------------
  select
    exists(select 1 from sih26044.opportunity_versions where id = v_ver_v3),
    exists(select 1 from sih26044.opportunity_versions where id = v_ver_v3 and status = 'published')
  into v_v3_exists, v_v3_published;

  if v_v3_published then
    select count(*) into v_req_count
    from sih26044.opportunity_requirements where opportunity_version_id = v_ver_v3;
    select count(*) into v_rule_count
    from sih26044.eligibility_rules where opportunity_version_id = v_ver_v3;

    if v_req_count = 5 and v_rule_count = 1 then
      raise notice 'Flagship v3 already published (5 requirements, 1 eligibility rule) — idempotent no-op.';
    else
      raise exception
        'Flagship v3 published but counts unexpected: % requirements, % rules.',
        v_req_count, v_rule_count;
    end if;
    return;
  end if;

  if v_v3_exists then
    raise exception 'Flagship v3 exists as draft — unexpected state; manual inspection required.';
  end if;

  raise notice 'Creating flagship v3 with 1 organization_membership eligibility rule...';

  -- -----------------------------------------------------------------------
  -- Step 1: Create V3 as a draft, copying all metadata from V2.
  -- -----------------------------------------------------------------------
  insert into sih26044.opportunity_versions (
    id, opportunity_id, version_number, status,
    title, description, opportunity_type, audiences,
    source_system, source_record_id, source_url, source_literal_text, source_captured_at,
    created_by_actor_id, created_at
  )
  select
    v_ver_v3,
    opportunity_id,
    3,        -- version_number
    'draft',
    title, description, opportunity_type, audiences,
    source_system, source_record_id, source_url, source_literal_text, source_captured_at,
    v_actor_recruiter,
    now()
  from sih26044.opportunity_versions
  where id = v_ver_v2;

  raise notice 'V3 draft created.';

  -- -----------------------------------------------------------------------
  -- Step 2: Copy all 5 requirements from V2 with deterministic IDs.
  --
  -- Uses a CASE on ordinal to assign deterministic IDs.  The ordinal order
  -- from V2 is preserved so the student's existing readiness projections
  -- (which reference requirement IDs) continue to resolve correctly.
  -- -----------------------------------------------------------------------
  insert into sih26044.opportunity_requirements (
    id, opportunity_version_id, ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation, hard_gate,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method,
    created_at
  )
  select
    case ordinal
      when 0 then v_req_v3_python
      when 1 then v_req_v3_data_anal
      when 2 then v_req_v3_research
      when 3 then v_req_v3_data_viz
      when 4 then v_req_v3_ayush
    end,
    v_ver_v3,
    ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation, hard_gate,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method,
    now()
  from sih26044.opportunity_requirements
  where opportunity_version_id = v_ver_v2
  order by ordinal;

  raise notice 'Copied 5 requirements from v2 to v3.';

  -- -----------------------------------------------------------------------
  -- Step 3: Insert the single truthful eligibility rule.
  --
  -- kind:    organization_membership
  -- typed_rule_definition: {"organizationIds": ["<institution-id>"]}
  --
  -- The Worker's eligibilityRule() function (worker/src/sih/readiness.ts)
  -- spreads typed_rule_definition into the rule object and sets kind from
  -- rule_kind, so typed_rule_definition must contain only non-kind fields:
  --   { organizationIds: string[] }
  --
  -- Evaluation path (src/app/engine/opportunityEligibility.ts):
  --   subject.organizationMemberships is populated by
  --   current_readiness_organization_memberships() via the Worker.
  --   The student's active learner membership in v_org_institution returns
  --   effective_active = true, confirmed = true.
  --   evaluateEligibilityRule returns SATISFIED.
  --   → evaluateEligibility returns ELIGIBLE.
  --   → determineReadinessBand returns READY_FOR_REVIEW (unchanged).
  --
  -- No new subject facts are created by this migration.
  -- -----------------------------------------------------------------------
  insert into sih26044.eligibility_rules (
    id, opportunity_version_id, ordinal,
    rule_kind, literal_source_wording, typed_rule_definition,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method,
    created_at
  ) values (
    v_rule_membership,
    v_ver_v3,
    0,
    'organization_membership',
    'Applicant must have an active student affiliation with the participating institution.',
    jsonb_build_object('organizationIds', jsonb_build_array(v_org_institution::text)),
    true,
    v_actor_recruiter,
    '2026-09-08T00:00:00Z',
    'controlled_fixture',
    now()
  );

  raise notice 'Inserted 1 organization_membership eligibility rule.';

  -- -----------------------------------------------------------------------
  -- Step 4: Publish V3 directly.
  --
  -- publish_opportunity_version() is not callable here (no session context
  -- for has_any_active_organization_role()).  We replicate its final state
  -- transition having satisfied all preconditions above:
  --   ✓ version is draft
  --   ✓ at least one confirmed requirement (5 copied, all human_confirmed)
  --   ✓ all eligibility rules human_confirmed (1 inserted as confirmed)
  -- -----------------------------------------------------------------------
  update sih26044.opportunity_versions
  set status = 'published', published_at = now()
  where id = v_ver_v3;

  raise notice 'V3 published.';

  -- -----------------------------------------------------------------------
  -- Step 5: Advance current_version_id on the parent opportunity to V3.
  --
  -- V2 is left with status = 'published'. The application snapshot
  -- (a080bafe-ec71-4fd5-99b2-19ed8ac8cb87) stays bound to V2.
  -- The recruiter view (SCREENING stage for Ananya) is unchanged.
  -- -----------------------------------------------------------------------
  update sih26044.opportunities
  set current_version_id = v_ver_v3
  where id = v_opp_flagship;

  raise notice 'Flagship current_version_id advanced to v3 (%).', v_ver_v3;

  -- -----------------------------------------------------------------------
  -- Step 6: Final verification.
  -- -----------------------------------------------------------------------
  select count(*) into v_req_count
  from sih26044.opportunity_requirements where opportunity_version_id = v_ver_v3;

  select count(*) into v_rule_count
  from sih26044.eligibility_rules where opportunity_version_id = v_ver_v3;

  if v_req_count != 5 or v_rule_count != 1 then
    raise exception
      'Post-creation validation failed: v3 has % requirements and % eligibility rules (expected 5 and 1).',
      v_req_count, v_rule_count;
  end if;

  raise notice '=================================================================';
  raise notice 'Flagship v3 (%) created successfully.', v_ver_v3;
  raise notice '  Requirements : % (all copied from v2)', v_req_count;
  raise notice '  Eligibility  : % rule — organization_membership (institution)', v_rule_count;
  raise notice '  Fact source  : existing active organization_memberships row';
  raise notice '  Subject facts: NO new rows created';
  raise notice '  V2 (%)       : preserved, application snapshot intact', v_ver_v2;
  raise notice '=================================================================';

end;
$$;
