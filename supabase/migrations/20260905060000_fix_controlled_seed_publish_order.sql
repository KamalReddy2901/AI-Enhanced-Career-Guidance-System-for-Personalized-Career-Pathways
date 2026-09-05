-- Repair: Fix controlled demo seeding functions to insert opportunity/questionnaire
-- versions as DRAFT first, insert all protected child records while still draft,
-- then publish. This is required by protect_published_opportunity_child() which
-- blocks INSERT/UPDATE/DELETE on opportunity_requirements for published versions.
--
-- Also handles all idempotency cases (A-E) for partial production state.

-- ==================================================================
-- REPAIRED PHASE-2A SEED FUNCTION
-- ==================================================================

create or replace function sih26044.seed_controlled_demo_ecosystem_phase2()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_result jsonb := '{}'::jsonb;

  v_org_employer_a  uuid := 'f0440000-0000-4000-8000-000000000002';

  v_actor_recruiter uuid := '359de147-6dd1-41a9-aa06-8dd1a62d5080';

  v_opp_flagship     uuid := 'f0442000-0000-4000-8000-000000000001';
  v_ver_flagship     uuid := 'f0443000-0000-4000-8000-000000000001';
  -- If v1 is already published-incomplete, we use v2 as fallback
  v_ver_flagship_v2  uuid := 'f0443000-0000-4000-8000-000000000002';

  v_req_python       uuid := 'f0444000-0000-4000-8000-000000000001';
  v_req_data_analysis uuid := 'f0444000-0000-4000-8000-000000000002';
  v_req_research_doc uuid := 'f0444000-0000-4000-8000-000000000003';
  v_req_data_viz     uuid := 'f0444000-0000-4000-8000-000000000004';
  v_req_ayush        uuid := 'f0444000-0000-4000-8000-000000000005';

  -- For v2 fallback requirements
  v_req_python_v2       uuid := 'f0444000-0000-4000-8000-000000000011';
  v_req_data_analysis_v2 uuid := 'f0444000-0000-4000-8000-000000000012';
  v_req_research_doc_v2 uuid := 'f0444000-0000-4000-8000-000000000013';
  v_req_data_viz_v2     uuid := 'f0444000-0000-4000-8000-000000000014';
  v_req_ayush_v2        uuid := 'f0444000-0000-4000-8000-000000000015';

  v_active_ver_id    uuid;
  v_ver_status       sih26044.opportunity_version_status;
  v_req_count        int;
  v_working_ver_id   uuid;
  v_working_req_base uuid;
  v_count            int;

  -- The 5 intended requirement IDs for whichever version we use
  r_python       uuid;
  r_data_analysis uuid;
  r_research_doc uuid;
  r_data_viz     uuid;
  r_ayush        uuid;

begin
  -- ----------------------------------------------------------------
  -- SAFETY
  -- ----------------------------------------------------------------
  if not exists (select 1 from sih26044.organizations where id = v_org_employer_a) then
    raise exception 'SAFETY: Phase-1 seed must be applied first';
  end if;

  -- ----------------------------------------------------------------
  -- STEP 1: Ensure opportunity parent exists
  -- ----------------------------------------------------------------
  insert into sih26044.opportunities (
    id, owner_organization_id, status, created_by_actor_id, created_at
  )
  values (
    v_opp_flagship, v_org_employer_a, 'draft', v_actor_recruiter, '2026-09-01T00:00:00Z'
  )
  on conflict (id) do nothing;

  -- ----------------------------------------------------------------
  -- STEP 2: Determine which version to use
  --
  -- Case D/E: v1 already published AND has all 5 requirements → done
  -- Case E:   v1 already published AND missing requirements → use v2
  -- Case C:   v1 draft → use v1 (add missing children, then publish)
  -- Case A/B: neither exists → create v1 as draft
  -- ----------------------------------------------------------------
  select v.id, v.status
  into v_active_ver_id, v_ver_status
  from sih26044.opportunity_versions v
  where v.id = v_ver_flagship and v.opportunity_id = v_opp_flagship;

  if v_active_ver_id is not null and v_ver_status = 'published' then
    -- Check if all 5 requirements already exist on v1
    select count(*) into v_req_count
    from sih26044.opportunity_requirements
    where opportunity_version_id = v_ver_flagship
      and id in (v_req_python, v_req_data_analysis, v_req_research_doc, v_req_data_viz, v_req_ayush);

    if v_req_count = 5 then
      -- Case D: already complete and published — nothing to do
      v_result := jsonb_set(v_result, '{flagship_version}', to_jsonb(v_ver_flagship::text));
      v_result := jsonb_set(v_result, '{flagship_requirements}', to_jsonb(5));
      v_result := jsonb_set(v_result, '{status}', '"success"'::jsonb);
      v_result := jsonb_set(v_result, '{message}', '"Phase-2A: flagship already complete (Case D)"'::jsonb);
      return v_result;
    else
      -- Case E: published v1 is incomplete → create v2 as new draft
      v_working_ver_id   := v_ver_flagship_v2;
      r_python           := v_req_python_v2;
      r_data_analysis    := v_req_data_analysis_v2;
      r_research_doc     := v_req_research_doc_v2;
      r_data_viz         := v_req_data_viz_v2;
      r_ayush            := v_req_ayush_v2;
    end if;
  else
    -- Case A/B/C: use v1
    v_working_ver_id   := v_ver_flagship;
    r_python           := v_req_python;
    r_data_analysis    := v_req_data_analysis;
    r_research_doc     := v_req_research_doc;
    r_data_viz         := v_req_data_viz;
    r_ayush            := v_req_ayush;
  end if;

  -- ----------------------------------------------------------------
  -- STEP 3: Create the working version as DRAFT (if not yet present)
  -- ----------------------------------------------------------------
  insert into sih26044.opportunity_versions (
    id, opportunity_id, version_number, status,
    title, description, opportunity_type, audiences,
    source_system, source_literal_text, source_captured_at,
    created_by_actor_id, created_at,
    published_at  -- NULL while draft
  )
  values (
    v_working_ver_id,
    v_opp_flagship,
    case when v_working_ver_id = v_ver_flagship then 1 else 2 end,
    'draft',   -- <-- DRAFT, not published
    'Clinical Research Data & Standardization Intern',
    'Join our clinical research team to help standardize and analyze patient data across multiple AYUSH clinical trials. You''ll work with real healthcare datasets, implement data validation pipelines, and create reports for research coordinators.

This internship provides hands-on experience with healthcare data systems, regulatory compliance requirements, and collaborative research workflows in traditional medicine research.

Duration: 3-6 months
Mode: Hybrid
Location: Bangalore
Stipend: ₹20,000/month',
    'internship',
    ARRAY['student']::sih26044.opportunity_audience[],
    'controlled_fixture',
    'Controlled synthetic demo opportunity',
    '2026-09-01T00:00:00Z',
    v_actor_recruiter,
    '2026-09-01T00:00:00Z',
    null  -- draft has no published_at
  )
  on conflict (id, opportunity_id) do nothing;

  -- ----------------------------------------------------------------
  -- STEP 4: Insert requirements WHILE VERSION IS DRAFT
  -- ----------------------------------------------------------------
  insert into sih26044.opportunity_requirements (
    id, opportunity_version_id, ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency, hard_gate,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method,
    created_at
  )
  values
    (r_python, v_working_ver_id, 0, 'skill', 'required',
     'Python data cleaning and preprocessing', 2, 'any_recorded',
     'exact', 'python', 'Python', 2, false,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),

    (r_data_analysis, v_working_ver_id, 1, 'skill', 'required',
     'Structured data analysis and interpretation', 2, 'any_recorded',
     'exact', 'data-analysis', 'Data Analysis', 2, false,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),

    (r_research_doc, v_working_ver_id, 2, 'skill', 'required',
     'Research methodology documentation', 2, 'any_recorded',
     'exact', 'research-documentation', 'Research Documentation', 2, false,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),

    (r_data_viz, v_working_ver_id, 3, 'skill', 'preferred',
     'Data visualization for research reports', 1, 'artifact_expected',
     'exact', 'data-visualization', 'Data Visualization', 1, false,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),

    (r_ayush, v_working_ver_id, 4, 'skill', 'preferred',
     'Familiarity with AYUSH healthcare and traditional medicine terminology', 1, 'any_recorded',
     'unresolved', null, 'AYUSH Healthcare Domain Knowledge', null, false,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z')
  on conflict (id, opportunity_version_id) do nothing;

  -- ----------------------------------------------------------------
  -- STEP 5: Publish the version (UPDATE draft → published)
  -- The protect_published_opportunity_version trigger only raises on
  -- UPDATE when old.status = 'published'. Updating draft → published
  -- is allowed.
  -- ----------------------------------------------------------------
  update sih26044.opportunity_versions
  set status = 'published',
      published_at = '2026-09-01T00:00:00Z'
  where id = v_working_ver_id
    and status = 'draft';  -- no-op if somehow already published

  -- ----------------------------------------------------------------
  -- STEP 6: Point opportunity to this published version
  -- ----------------------------------------------------------------
  update sih26044.opportunities
  set current_version_id = v_working_ver_id,
      status = 'published'
  where id = v_opp_flagship;

  -- ----------------------------------------------------------------
  -- RESULT
  -- ----------------------------------------------------------------
  select count(*) into v_count
  from sih26044.opportunity_requirements
  where opportunity_version_id = v_working_ver_id;

  v_result := jsonb_set(v_result, '{flagship_version_id}', to_jsonb(v_working_ver_id::text));
  v_result := jsonb_set(v_result, '{flagship_requirements}', to_jsonb(v_count));
  v_result := jsonb_set(v_result, '{opportunities_created}', to_jsonb(1));
  v_result := jsonb_set(v_result, '{status}', '"success"'::jsonb);
  v_result := jsonb_set(v_result, '{message}', '"Phase-2A flagship seeded: draft version → requirements → published"'::jsonb);

  return v_result;
end;
$$;

revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2() from public;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2() from anon;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2() from authenticated;
grant execute on function sih26044.seed_controlled_demo_ecosystem_phase2() to service_role;

comment on function sih26044.seed_controlled_demo_ecosystem_phase2 is
  'Repaired Phase-2A seed. SECURITY DEFINER. service_role only. Inserts version as DRAFT, adds requirements, then publishes. Handles all partial-state cases A-E.';


-- ==================================================================
-- REPAIRED PHASE-2B SEED FUNCTION
-- Fixes: all opportunity_versions and questionnaire_versions must be
-- inserted as DRAFT, children inserted, then published via UPDATE.
-- ==================================================================

create or replace function sih26044.seed_controlled_demo_ecosystem_phase2b()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044, extensions
as $$
declare
  v_org_institution  uuid := 'f0440000-0000-4000-8000-000000000001';
  v_org_employer_a   uuid := 'f0440000-0000-4000-8000-000000000002';
  v_org_employer_b   uuid := 'f0440000-0000-4000-8000-000000000004';

  v_actor_student    uuid := 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_actor_faculty    uuid := '27e18338-ec21-40da-a6aa-2facacc7bd6e';
  v_actor_recruiter  uuid := '359de147-6dd1-41a9-aa06-8dd1a62d5080';
  v_actor_recruiter_b uuid := '471ebf1a-4758-4388-ac71-6734d9c3e967';
  v_actor_inst_admin uuid := 'd4119eba-d34c-46db-8d14-fab47c3294eb';

  v_opp_flagship         uuid := 'f0442000-0000-4000-8000-000000000001';
  v_ver_flagship         uuid := 'f0443000-0000-4000-8000-000000000001';
  v_ver_flagship_v2      uuid := 'f0443000-0000-4000-8000-000000000002';

  v_opp_jr_analyst       uuid := 'f0445000-0000-4000-8000-000000000002';
  v_ver_jr_analyst       uuid := 'f0446000-0000-4000-8000-000000000002';
  v_opp_prod_analytics   uuid := 'f0445000-0000-4000-8000-000000000003';
  v_ver_prod_analytics   uuid := 'f0446000-0000-4000-8000-000000000003';
  v_opp_research_asst    uuid := 'f0445000-0000-4000-8000-000000000004';
  v_ver_research_asst    uuid := 'f0446000-0000-4000-8000-000000000004';
  v_opp_bi_intern        uuid := 'f0445000-0000-4000-8000-000000000005';
  v_ver_bi_intern        uuid := 'f0446000-0000-4000-8000-000000000005';
  v_opp_ops_analytics    uuid := 'f0445000-0000-4000-8000-000000000006';
  v_ver_ops_analytics    uuid := 'f0446000-0000-4000-8000-000000000006';
  v_opp_backend_dev      uuid := 'f0445000-0000-4000-8000-000000000007';
  v_ver_backend_dev      uuid := 'f0446000-0000-4000-8000-000000000007';
  v_opp_ux_research      uuid := 'f0445000-0000-4000-8000-000000000008';
  v_ver_ux_research      uuid := 'f0446000-0000-4000-8000-000000000008';
  v_opp_live_project     uuid := 'f0445000-0000-4000-8000-000000000009';
  v_ver_live_project     uuid := 'f0446000-0000-4000-8000-000000000009';
  v_opp_mentoring        uuid := 'f0445000-0000-4000-8000-000000000010';
  v_ver_mentoring        uuid := 'f0446000-0000-4000-8000-000000000010';
  v_opp_workshop         uuid := 'f0445000-0000-4000-8000-000000000011';
  v_ver_workshop         uuid := 'f0446000-0000-4000-8000-000000000011';
  v_opp_faculty_fdp      uuid := 'f0445000-0000-4000-8000-000000000012';
  v_ver_faculty_fdp      uuid := 'f0446000-0000-4000-8000-000000000012';
  v_opp_collab_research  uuid := 'f0445000-0000-4000-8000-000000000013';
  v_ver_collab_research  uuid := 'f0446000-0000-4000-8000-000000000013';
  v_opp_guest_lecture    uuid := 'f0445000-0000-4000-8000-000000000014';
  v_ver_guest_lecture    uuid := 'f0446000-0000-4000-8000-000000000014';

  v_q_data_analyst       uuid := 'f0447000-0000-4000-8000-000000000001';
  v_qv_data_analyst      uuid := 'f0448000-0000-4000-8000-000000000001';
  v_q_research_data      uuid := 'f0447000-0000-4000-8000-000000000002';
  v_qv_research_data     uuid := 'f0448000-0000-4000-8000-000000000002';
  v_q_product_analytics  uuid := 'f0447000-0000-4000-8000-000000000003';
  v_qv_product_analytics uuid := 'f0448000-0000-4000-8000-000000000003';

  v_app_1  uuid := 'f0449000-0000-4000-8000-000000000001';
  v_app_2  uuid := 'f0449000-0000-4000-8000-000000000002';
  v_app_3  uuid := 'f0449000-0000-4000-8000-000000000003';
  v_app_4  uuid := 'f0449000-0000-4000-8000-000000000004';
  v_app_5  uuid := 'f0449000-0000-4000-8000-000000000005';

  v_collab_live_project  uuid := 'f044a000-0000-4000-8000-000000000001';
  v_collab_research      uuid := 'f044a000-0000-4000-8000-000000000002';
  v_collab_fdp           uuid := 'f044a000-0000-4000-8000-000000000003';
  v_collab_mentoring     uuid := 'f044a000-0000-4000-8000-000000000004';
  v_collab_guest_lecture uuid := 'f044a000-0000-4000-8000-000000000005';
  v_collab_consultancy   uuid := 'f044a000-0000-4000-8000-000000000006';

  v_intv_evidence_clinic   uuid := 'f044b000-0000-4000-8000-000000000001';
  v_intv_sql_sprint        uuid := 'f044b000-0000-4000-8000-000000000002';
  v_intv_research_workshop uuid := 'f044b000-0000-4000-8000-000000000003';
  v_intv_mentoring_cohort  uuid := 'f044b000-0000-4000-8000-000000000004';

  v_cand_1  uuid := 'f044c000-0000-4000-8000-000000000001';
  v_cand_2  uuid := 'f044c000-0000-4000-8000-000000000002';
  v_cand_3  uuid := 'f044c000-0000-4000-8000-000000000003';
  v_cand_4  uuid := 'f044c000-0000-4000-8000-000000000004';
  v_cand_5  uuid := 'f044c000-0000-4000-8000-000000000005';
  v_cand_6  uuid := 'f044c000-0000-4000-8000-000000000006';

  v_vreq_python_hist uuid := 'f044d000-0000-4000-8000-000000000001';
  v_vreq_da_hist     uuid := 'f044d000-0000-4000-8000-000000000002';
  v_vreq_data_viz    uuid := 'f044d000-0000-4000-8000-000000000003';

  v_consent_hist_1   uuid := 'f044e000-0000-4000-8000-000000000001';
  v_consent_hist_2   uuid := 'f044e000-0000-4000-8000-000000000002';
  v_consent_viz      uuid := 'f044e000-0000-4000-8000-000000000003';

  v_outcome_1  uuid := 'f044f000-0000-4000-8000-000000000001';

  -- Resolve which flagship version is authoritative
  v_flagship_ver_id  uuid;

  v_fingerprint text;
  v_cnt int;
  v_result jsonb := '{}'::jsonb;

begin
  -- ----------------------------------------------------------------
  -- SAFETY
  -- ----------------------------------------------------------------
  if not exists (select 1 from sih26044.organizations where id = v_org_employer_a) then
    raise exception 'SAFETY: Phase-1 orgs not found. Apply phase-1 seed first.';
  end if;

  -- Resolve the authoritative flagship version (may be v1 or v2 depending on phase-2A run)
  select coalesce(
    (select id from sih26044.opportunity_versions
     where id = v_ver_flagship_v2 and opportunity_id = v_opp_flagship),
    (select id from sih26044.opportunity_versions
     where id = v_ver_flagship and opportunity_id = v_opp_flagship)
  ) into v_flagship_ver_id;

  if v_flagship_ver_id is null then
    raise exception 'SAFETY: Phase-2A flagship version not found. Apply phase-2A seed first.';
  end if;

  -- ----------------------------------------------------------------
  -- SYNTHETIC CANDIDATE ACTORS
  -- ----------------------------------------------------------------
  insert into sih26044.actors (id, display_name, status, created_at)
  values
    (v_cand_1, 'Synthetic Candidate – Arjun Nair',    'active', '2026-08-01'::timestamptz),
    (v_cand_2, 'Synthetic Candidate – Sonal Mehta',   'active', '2026-08-01'::timestamptz),
    (v_cand_3, 'Synthetic Candidate – Vikram Bose',   'active', '2026-08-01'::timestamptz),
    (v_cand_4, 'Synthetic Candidate – Neha Krishnan', 'active', '2026-08-01'::timestamptz),
    (v_cand_5, 'Synthetic Candidate – Deepak Pillai', 'active', '2026-08-01'::timestamptz),
    (v_cand_6, 'Synthetic Candidate – Meera Iyer',    'active', '2026-08-01'::timestamptz)
  on conflict (id) do nothing;

  insert into sih26044.organization_memberships (id, actor_id, organization_id, status, valid_from, created_at)
  values
    ('f044c001-0000-4000-8000-000000000001', v_cand_1, v_org_institution, 'active', '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    ('f044c001-0000-4000-8000-000000000002', v_cand_2, v_org_institution, 'active', '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    ('f044c001-0000-4000-8000-000000000003', v_cand_3, v_org_institution, 'active', '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    ('f044c001-0000-4000-8000-000000000004', v_cand_4, v_org_institution, 'active', '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    ('f044c001-0000-4000-8000-000000000005', v_cand_5, v_org_institution, 'active', '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    ('f044c001-0000-4000-8000-000000000006', v_cand_6, v_org_institution, 'active', '2026-08-01'::timestamptz, '2026-08-01'::timestamptz)
  on conflict (id) do nothing;

  insert into sih26044.organization_membership_roles (membership_id, role)
  values
    ('f044c001-0000-4000-8000-000000000001', 'learner'),
    ('f044c001-0000-4000-8000-000000000002', 'learner'),
    ('f044c001-0000-4000-8000-000000000003', 'learner'),
    ('f044c001-0000-4000-8000-000000000004', 'learner'),
    ('f044c001-0000-4000-8000-000000000005', 'learner'),
    ('f044c001-0000-4000-8000-000000000006', 'learner')
  on conflict (membership_id, role) do nothing;

  -- Candidate evidence (idempotent via WHERE NOT EXISTS)
  insert into sih26044.evidence_records (
    subject_actor_id, literal_claim, provenance, initial_verification_state,
    scope_kind, scope_literal_skill_label, source_system, source_captured_at, visibility
  )
  select * from (values
    (v_cand_1, 'Advanced Python pandas data wrangling project',                   'artifact_backed'::sih26044.evidence_provenance,  'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Python',                'career_passport', '2026-07-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_1, 'SQL query optimization for production database',                  'human_attested'::sih26044.evidence_provenance,   'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'SQL',                   'career_passport', '2026-07-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_1, 'Tableau dashboard for sales analytics',                           'artifact_backed'::sih26044.evidence_provenance,  'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Data Visualization',    'career_passport', '2026-07-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_2, 'Python scripting for data extraction',                            'self_declared'::sih26044.evidence_provenance,    'unverified'::sih26044.verification_state,     'global_skill'::sih26044.evidence_scope_kind, 'Python',                'career_passport', '2026-07-15'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_2, 'Basic data analysis with Excel',                                  'self_declared'::sih26044.evidence_provenance,    'unverified'::sih26044.verification_state,     'global_skill'::sih26044.evidence_scope_kind, 'Data Analysis',         'career_passport', '2026-07-15'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_3, 'Research methodology and literature review documentation',        'human_attested'::sih26044.evidence_provenance,   'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Research Documentation','career_passport', '2026-06-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_3, 'Statistical analysis for research paper',                         'assessed'::sih26044.evidence_provenance,         'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Statistics',            'career_passport', '2026-06-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_4, 'Product metrics analysis and funnel interpretation',              'self_declared'::sih26044.evidence_provenance,    'self_confirmed'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Data Analysis',         'career_passport', '2026-07-20'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_4, 'User research synthesis for product decision',                    'self_declared'::sih26044.evidence_provenance,    'self_confirmed'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'UX Research',           'career_passport', '2026-07-20'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_5, 'Python, SQL, and R for data science coursework',                  'assessed'::sih26044.evidence_provenance,         'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Python',                'career_passport', '2026-05-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_5, 'Data visualization with matplotlib and seaborn',                  'artifact_backed'::sih26044.evidence_provenance,  'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Data Visualization',    'career_passport', '2026-05-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_5, 'Statistical inference and hypothesis testing',                    'assessed'::sih26044.evidence_provenance,         'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Statistics',            'career_passport', '2026-05-01'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_6, 'Python data analysis capstone project',                           'artifact_backed'::sih26044.evidence_provenance,  'human_verified'::sih26044.verification_state, 'global_skill'::sih26044.evidence_scope_kind, 'Python',                'career_passport', '2026-08-10'::timestamptz, 'private'::sih26044.evidence_visibility),
    (v_cand_6, 'Data cleaning and transformation pipeline',                       'self_declared'::sih26044.evidence_provenance,    'unverified'::sih26044.verification_state,     'global_skill'::sih26044.evidence_scope_kind, 'Data Analysis',         'career_passport', '2026-08-10'::timestamptz, 'private'::sih26044.evidence_visibility)
  ) as src(subject_actor_id, literal_claim, provenance, initial_verification_state, scope_kind, scope_literal_skill_label, source_system, source_captured_at, visibility)
  where not exists (
    select 1 from sih26044.evidence_records e
    where e.subject_actor_id = src.subject_actor_id and e.literal_claim = src.literal_claim
  );

  -- ----------------------------------------------------------------
  -- OPPORTUNITIES: insert parent rows as 'draft'
  -- ----------------------------------------------------------------
  insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id, created_at)
  values
    (v_opp_jr_analyst,      v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-20'::timestamptz),
    (v_opp_prod_analytics,  v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-21'::timestamptz),
    (v_opp_research_asst,   v_org_employer_a, 'draft', v_actor_recruiter,   '2026-08-22'::timestamptz),
    (v_opp_bi_intern,       v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-23'::timestamptz),
    (v_opp_ops_analytics,   v_org_employer_a, 'draft', v_actor_recruiter,   '2026-08-24'::timestamptz),
    (v_opp_backend_dev,     v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-25'::timestamptz),
    (v_opp_ux_research,     v_org_employer_a, 'draft', v_actor_recruiter,   '2026-08-26'::timestamptz),
    (v_opp_live_project,    v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-27'::timestamptz),
    (v_opp_mentoring,       v_org_institution,'draft', v_actor_faculty,     '2026-08-15'::timestamptz),
    (v_opp_workshop,        v_org_institution,'draft', v_actor_faculty,     '2026-08-16'::timestamptz),
    (v_opp_faculty_fdp,     v_org_institution,'draft', v_actor_inst_admin,  '2026-08-10'::timestamptz),
    (v_opp_collab_research, v_org_employer_a, 'draft', v_actor_recruiter,   '2026-08-12'::timestamptz),
    (v_opp_guest_lecture,   v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-13'::timestamptz)
  on conflict (id) do nothing;

  -- ----------------------------------------------------------------
  -- OPPORTUNITY VERSIONS: insert all as DRAFT (published_at = null)
  -- ----------------------------------------------------------------
  insert into sih26044.opportunity_versions (
    id, opportunity_id, version_number, status,
    title, description, opportunity_type, audiences,
    source_system, source_literal_text, source_captured_at,
    created_by_actor_id, created_at, published_at
  ) values
    (v_ver_jr_analyst, v_opp_jr_analyst, 1, 'draft',
     'Junior Data Analyst Intern',
     'Work with Meridian Analytics Labs to build and maintain data pipelines, perform exploratory analysis, and generate business insights from large structured datasets.

You will collaborate with senior analysts, write SQL queries against production data warehouses, and present findings to stakeholders.

Duration: 6 months | Hybrid, Bangalore | ₹18,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-20'::timestamptz, v_actor_recruiter_b, '2026-08-20'::timestamptz, null),

    (v_ver_prod_analytics, v_opp_prod_analytics, 1, 'draft',
     'Product Analytics Intern',
     'Join the product team at Meridian Analytics Labs to measure feature adoption, diagnose funnel drop-offs, and translate data into actionable product decisions.

Duration: 3 months | Remote | ₹15,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-21'::timestamptz, v_actor_recruiter_b, '2026-08-21'::timestamptz, null),

    (v_ver_research_asst, v_opp_research_asst, 1, 'draft',
     'Research Data Assistant',
     'Support Pravaah Health Systems research team with data collection, cleaning, and documentation for ongoing AYUSH clinical studies.

Duration: 4 months | On-site, Pune | ₹12,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-22'::timestamptz, v_actor_recruiter, '2026-08-22'::timestamptz, null),

    (v_ver_bi_intern, v_opp_bi_intern, 1, 'draft',
     'Business Intelligence Intern',
     'Build and maintain BI dashboards in Tableau/Power BI for Meridian Analytics Labs. Own data model documentation and train end users on self-serve analytics.

Duration: 6 months | Hybrid | ₹20,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-23'::timestamptz, v_actor_recruiter_b, '2026-08-23'::timestamptz, null),

    (v_ver_ops_analytics, v_opp_ops_analytics, 1, 'draft',
     'Operations Analytics Intern',
     'Analyse supply chain and logistics data for Pravaah Health Systems. Identify inefficiencies, build KPI reports, and present recommendations to operations leadership.

Duration: 3 months | Hybrid, Mumbai | ₹14,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-24'::timestamptz, v_actor_recruiter, '2026-08-24'::timestamptz, null),

    (v_ver_backend_dev, v_opp_backend_dev, 1, 'draft',
     'Backend Developer Intern',
     'Build REST APIs and microservices for Meridian Analytics Labs data platform. Work with Python/FastAPI, PostgreSQL, and cloud infrastructure.

Duration: 6 months | Remote | ₹22,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-25'::timestamptz, v_actor_recruiter_b, '2026-08-25'::timestamptz, null),

    (v_ver_ux_research, v_opp_ux_research, 1, 'draft',
     'UX Research Assistant',
     'Support user research activities at Pravaah Health Systems: conduct user interviews, synthesise findings, and present insights to product and design teams.

Duration: 3 months | Hybrid, Bangalore | ₹12,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-26'::timestamptz, v_actor_recruiter, '2026-08-26'::timestamptz, null),

    (v_ver_live_project, v_opp_live_project, 1, 'draft',
     'Live Industry Data Challenge – Health Analytics',
     'A 4-week industry live project hosted by Meridian Analytics Labs. Teams of 3-5 students analyse a real anonymised health dataset and present findings to industry judges.',
     'live_project', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-27'::timestamptz, v_actor_recruiter_b, '2026-08-27'::timestamptz, null),

    (v_ver_mentoring, v_opp_mentoring, 1, 'draft',
     'Industry Mentorship Cohort – Data & Analytics',
     'Structured 8-week mentoring programme pairing final-year students with senior industry professionals in data analytics and health technology.',
     'mentoring', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-15'::timestamptz, v_actor_faculty, '2026-08-15'::timestamptz, null),

    (v_ver_workshop, v_opp_workshop, 1, 'draft',
     'Applied Analytics Workshop – Python & SQL Bootcamp',
     'Intensive 3-day hands-on workshop covering Python pandas, SQL analytics, and data storytelling. Industry-led sessions with real datasets. Certificate on completion.',
     'workshop', ARRAY['student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-16'::timestamptz, v_actor_faculty, '2026-08-16'::timestamptz, null),

    (v_ver_faculty_fdp, v_opp_faculty_fdp, 1, 'draft',
     'Faculty Development Programme – Data & Research Methods',
     'A 5-day residential Faculty Development Programme covering modern data analysis methods, reproducible research workflows, and industry-aligned pedagogy.',
     'fdp', ARRAY['faculty']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-10'::timestamptz, v_actor_inst_admin, '2026-08-10'::timestamptz, null),

    (v_ver_collab_research, v_opp_collab_research, 1, 'draft',
     'Research Collaboration – Health Data Standardisation',
     'Joint research engagement between Pravaah Health Systems and Controlled Test Institute A to develop standardised health data schemas for AYUSH clinical trials.',
     'collaborative_research', ARRAY['faculty', 'student']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-12'::timestamptz, v_actor_recruiter, '2026-08-12'::timestamptz, null),

    (v_ver_guest_lecture, v_opp_guest_lecture, 1, 'draft',
     'Guest Lecture – Applied Analytics in Research',
     'A 90-minute guest lecture by senior data scientists from Meridian Analytics Labs covering real-world applications of analytics in health research.',
     'guest_lecture', ARRAY['student', 'faculty']::sih26044.opportunity_audience[],
     'controlled_fixture', 'Controlled synthetic demo opportunity',
     '2026-08-13'::timestamptz, v_actor_recruiter_b, '2026-08-13'::timestamptz, null)
  on conflict (id, opportunity_id) do nothing;

  -- ----------------------------------------------------------------
  -- REQUIREMENTS: all inserted while versions are still DRAFT
  -- ----------------------------------------------------------------
  insert into sih26044.opportunity_requirements (
    id, opportunity_version_id, ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency, hard_gate,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method, created_at
  ) values
    -- Jr Data Analyst (4)
    ('f04410a0-0000-4000-8000-000000000001', v_ver_jr_analyst, 0, 'skill', 'required', 'SQL for data extraction and aggregation', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000002', v_ver_jr_analyst, 1, 'skill', 'required', 'Python for data manipulation', 2, 'any_recorded', 'exact', 'python', 'Python', 2, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000003', v_ver_jr_analyst, 2, 'skill', 'required', 'Structured data analysis and presentation', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000004', v_ver_jr_analyst, 3, 'skill', 'preferred', 'Data visualisation tools (Tableau, Power BI, or Python)', 1, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 1, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    -- Product Analytics (4)
    ('f04410a0-0000-4000-8000-000000000011', v_ver_prod_analytics, 0, 'skill', 'required', 'Data analysis and metric interpretation', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000012', v_ver_prod_analytics, 1, 'skill', 'required', 'SQL for product funnel queries', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000013', v_ver_prod_analytics, 2, 'skill', 'preferred', 'Data visualisation for product dashboards', 1, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 1, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000014', v_ver_prod_analytics, 3, 'skill', 'preferred', 'Communication of findings to non-technical stakeholders', 1, 'any_recorded', 'exact', 'presentation', 'Presentation', 1, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    -- Research Data Asst (4)
    ('f04410a0-0000-4000-8000-000000000021', v_ver_research_asst, 0, 'skill', 'required', 'Research methodology and documentation', 2, 'human_or_issuer_expected', 'exact', 'research-documentation', 'Research Documentation', 2, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000022', v_ver_research_asst, 1, 'skill', 'required', 'Data cleaning and validation', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000023', v_ver_research_asst, 2, 'skill', 'preferred', 'Python for scripted data processing', 1, 'any_recorded', 'exact', 'python', 'Python', 1, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000024', v_ver_research_asst, 3, 'skill', 'preferred', 'AYUSH or traditional medicine terminology familiarity', 1, 'any_recorded', 'unresolved', null, 'AYUSH Healthcare Domain Knowledge', null, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    -- BI Intern (3)
    ('f04410a0-0000-4000-8000-000000000031', v_ver_bi_intern, 0, 'skill', 'required', 'Data visualisation and dashboard development', 3, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 2, false, true, v_actor_recruiter_b, '2026-08-23'::timestamptz, 'controlled_fixture', '2026-08-23'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000032', v_ver_bi_intern, 1, 'skill', 'required', 'SQL for business reporting queries', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-23'::timestamptz, 'controlled_fixture', '2026-08-23'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000033', v_ver_bi_intern, 2, 'skill', 'preferred', 'Python or R for data transformation', 1, 'any_recorded', 'exact', 'python', 'Python', 1, false, true, v_actor_recruiter_b, '2026-08-23'::timestamptz, 'controlled_fixture', '2026-08-23'::timestamptz),
    -- Ops Analytics (3)
    ('f04410a0-0000-4000-8000-000000000041', v_ver_ops_analytics, 0, 'skill', 'required', 'Data analysis for operations reporting', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter, '2026-08-24'::timestamptz, 'controlled_fixture', '2026-08-24'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000042', v_ver_ops_analytics, 1, 'skill', 'required', 'Excel or SQL for operational data queries', 2, 'any_recorded', 'exact', 'sql', 'SQL', 1, false, true, v_actor_recruiter, '2026-08-24'::timestamptz, 'controlled_fixture', '2026-08-24'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000043', v_ver_ops_analytics, 2, 'skill', 'preferred', 'Statistical analysis for process improvement', 1, 'any_recorded', 'exact', 'statistics', 'Statistics', 1, false, true, v_actor_recruiter, '2026-08-24'::timestamptz, 'controlled_fixture', '2026-08-24'::timestamptz),
    -- Backend Dev (4)
    ('f04410a0-0000-4000-8000-000000000051', v_ver_backend_dev, 0, 'skill', 'required', 'Python backend development (FastAPI or Flask)', 3, 'artifact_expected', 'exact', 'python', 'Python', 2, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000052', v_ver_backend_dev, 1, 'skill', 'required', 'SQL and relational database design', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000053', v_ver_backend_dev, 2, 'skill', 'required', 'Git version control and collaborative workflows', 2, 'any_recorded', 'exact', 'git', 'Git/GitHub', 1, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000054', v_ver_backend_dev, 3, 'skill', 'preferred', 'REST API design principles', 1, 'any_recorded', 'unresolved', null, 'REST API Design', null, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    -- UX Research (3)
    ('f04410a0-0000-4000-8000-000000000061', v_ver_ux_research, 0, 'skill', 'required', 'User research methods: interviews and surveys', 2, 'any_recorded', 'exact', 'ux-research', 'UX Research', 1, false, true, v_actor_recruiter, '2026-08-26'::timestamptz, 'controlled_fixture', '2026-08-26'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000062', v_ver_ux_research, 1, 'skill', 'required', 'Synthesis and presentation of qualitative findings', 2, 'any_recorded', 'exact', 'presentation', 'Presentation', 1, false, true, v_actor_recruiter, '2026-08-26'::timestamptz, 'controlled_fixture', '2026-08-26'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000063', v_ver_ux_research, 2, 'skill', 'preferred', 'Basic data analysis for quantitative user metrics', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_recruiter, '2026-08-26'::timestamptz, 'controlled_fixture', '2026-08-26'::timestamptz),
    -- Live Project (2)
    ('f04410a0-0000-4000-8000-000000000071', v_ver_live_project, 0, 'skill', 'required', 'Data analysis and structured problem-solving', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_recruiter_b, '2026-08-27'::timestamptz, 'controlled_fixture', '2026-08-27'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000072', v_ver_live_project, 1, 'skill', 'preferred', 'Data visualisation for presentation', 1, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 1, false, true, v_actor_recruiter_b, '2026-08-27'::timestamptz, 'controlled_fixture', '2026-08-27'::timestamptz),
    -- Mentoring (1)
    ('f04410a0-0000-4000-8000-000000000081', v_ver_mentoring, 0, 'skill', 'preferred', 'Enrolled student with interest in data/analytics career', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_faculty, '2026-08-15'::timestamptz, 'controlled_fixture', '2026-08-15'::timestamptz),
    -- Workshop (1)
    ('f04410a0-0000-4000-8000-000000000091', v_ver_workshop, 0, 'skill', 'preferred', 'Basic Python or data interest', 1, 'any_recorded', 'exact', 'python', 'Python', 0, false, true, v_actor_faculty, '2026-08-16'::timestamptz, 'controlled_fixture', '2026-08-16'::timestamptz),
    -- FDP (1)
    ('f04410a0-0000-4000-8000-0000000000a1', v_ver_faculty_fdp, 0, 'skill', 'required', 'Active faculty member with research or teaching portfolio', 2, 'any_recorded', 'exact', 'research-documentation', 'Research Documentation', 1, false, true, v_actor_inst_admin, '2026-08-10'::timestamptz, 'controlled_fixture', '2026-08-10'::timestamptz),
    -- Collab Research (2)
    ('f04410a0-0000-4000-8000-0000000000b1', v_ver_collab_research, 0, 'skill', 'required', 'Research methodology and documentation', 2, 'human_or_issuer_expected', 'exact', 'research-documentation', 'Research Documentation', 2, false, true, v_actor_recruiter, '2026-08-12'::timestamptz, 'controlled_fixture', '2026-08-12'::timestamptz),
    ('f04410a0-0000-4000-8000-0000000000b2', v_ver_collab_research, 1, 'skill', 'preferred', 'Data analysis for health datasets', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter, '2026-08-12'::timestamptz, 'controlled_fixture', '2026-08-12'::timestamptz),
    -- Guest Lecture (1)
    ('f04410a0-0000-4000-8000-0000000000c1', v_ver_guest_lecture, 0, 'skill', 'preferred', 'Interest in data science or analytics', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 0, false, true, v_actor_recruiter_b, '2026-08-13'::timestamptz, 'controlled_fixture', '2026-08-13'::timestamptz)
  on conflict (id, opportunity_version_id) do nothing;

  -- ----------------------------------------------------------------
  -- PUBLISH all versions (UPDATE draft → published, after children exist)
  -- protect_published_opportunity_version only blocks UPDATE when
  -- old.status = 'published', so draft→published is permitted.
  -- ----------------------------------------------------------------
  update sih26044.opportunity_versions set status = 'published', published_at = created_at
  where id in (
    v_ver_jr_analyst, v_ver_prod_analytics, v_ver_research_asst, v_ver_bi_intern,
    v_ver_ops_analytics, v_ver_backend_dev, v_ver_ux_research, v_ver_live_project,
    v_ver_mentoring, v_ver_workshop, v_ver_faculty_fdp, v_ver_collab_research, v_ver_guest_lecture
  ) and status = 'draft';

  -- Point current_version_id on parent opportunities
  update sih26044.opportunities set current_version_id = v_ver_jr_analyst,      status = 'published' where id = v_opp_jr_analyst      and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_prod_analytics,  status = 'published' where id = v_opp_prod_analytics  and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_research_asst,   status = 'published' where id = v_opp_research_asst   and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_bi_intern,       status = 'published' where id = v_opp_bi_intern       and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_ops_analytics,   status = 'published' where id = v_opp_ops_analytics   and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_backend_dev,     status = 'published' where id = v_opp_backend_dev     and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_ux_research,     status = 'published' where id = v_opp_ux_research     and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_live_project,    status = 'published' where id = v_opp_live_project    and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_mentoring,       status = 'published' where id = v_opp_mentoring       and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_workshop,        status = 'published' where id = v_opp_workshop        and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_faculty_fdp,     status = 'published' where id = v_opp_faculty_fdp     and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_collab_research, status = 'published' where id = v_opp_collab_research and current_version_id is null;
  update sih26044.opportunities set current_version_id = v_ver_guest_lecture,   status = 'published' where id = v_opp_guest_lecture   and current_version_id is null;

  select count(*) into v_cnt from sih26044.opportunity_requirements
  where opportunity_version_id in (
    v_ver_jr_analyst, v_ver_prod_analytics, v_ver_research_asst, v_ver_bi_intern,
    v_ver_ops_analytics, v_ver_backend_dev, v_ver_ux_research, v_ver_live_project,
    v_ver_mentoring, v_ver_workshop, v_ver_faculty_fdp, v_ver_collab_research, v_ver_guest_lecture
  );
  v_result := jsonb_set(v_result, '{background_requirements}', to_jsonb(v_cnt));

  -- ----------------------------------------------------------------
  -- QUESTIONNAIRES: insert parent + DRAFT version + questions, then publish
  -- ----------------------------------------------------------------
  insert into sih26044.questionnaires (id, owner_organization_id, status, created_by_actor_id, created_at)
  values
    (v_q_data_analyst,      v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-20'::timestamptz),
    (v_q_research_data,     v_org_employer_a, 'draft', v_actor_recruiter,   '2026-08-22'::timestamptz),
    (v_q_product_analytics, v_org_employer_b, 'draft', v_actor_recruiter_b, '2026-08-21'::timestamptz)
  on conflict (id) do nothing;

  insert into sih26044.questionnaire_versions (
    id, questionnaire_id, version_number, status, title, description,
    scope_declaration, scoring_policy, created_by_actor_id, created_at, published_at
  ) values
    (v_qv_data_analyst, v_q_data_analyst, 1, 'draft',
     'Data Analyst Technical Screening',
     'Assesses core SQL, Python data handling, and analytical reasoning skills relevant to data analyst intern roles.',
     'reusable_technical',
     '{"version": "1.0", "rules": [{"questionOrdinal": 0, "maxScore": 4}, {"questionOrdinal": 1, "maxScore": 4}, {"questionOrdinal": 2, "maxScore": 4}]}'::jsonb,
     v_actor_recruiter_b, '2026-08-20'::timestamptz, null),

    (v_qv_research_data, v_q_research_data, 1, 'draft',
     'Research Data Handling Assessment',
     'Evaluates understanding of research methodology, data integrity practices, and responsible data handling.',
     'reusable_technical', null,
     v_actor_recruiter, '2026-08-22'::timestamptz, null),

    (v_qv_product_analytics, v_q_product_analytics, 1, 'draft',
     'Product Analytics Reasoning',
     'Tests ability to reason about product metrics, interpret conversion data, and communicate findings clearly.',
     'opportunity_specific', null,
     v_actor_recruiter_b, '2026-08-21'::timestamptz, null)
  on conflict (id, questionnaire_id) do nothing;

  -- Questions WHILE versions are DRAFT
  insert into sih26044.questionnaire_questions (
    id, questionnaire_version_id, ordinal, question_type, question_text,
    choice_options, skill_refs, scoring_weight, created_at
  ) values
    ('f044q000-0000-4000-8000-000000000001', v_qv_data_analyst, 0, 'single_choice',
     'You receive a CSV with 50,000 rows of patient appointments. 15% of rows have NULL in the "diagnosis_code" column. What is your first step?',
     '[{"value":"A","label":"Drop all rows with NULL diagnosis_code immediately"},{"value":"B","label":"Investigate the NULL pattern — check if NULLs cluster by date, provider, or facility before deciding"},{"value":"C","label":"Fill NULLs with the string UNKNOWN and proceed"},{"value":"D","label":"Raise a critical bug and refuse to process the dataset"}]'::jsonb,
     '["data-analysis"]'::jsonb, 4.0, '2026-08-20'::timestamptz),

    ('f044q000-0000-4000-8000-000000000002', v_qv_data_analyst, 1, 'single_choice',
     'Which SQL correctly finds the top 5 departments by average appointment duration, only including departments with at least 100 appointments in August 2026?',
     '[{"value":"A","label":"SELECT dept, AVG(duration) FROM appointments GROUP BY dept LIMIT 5"},{"value":"B","label":"SELECT dept, AVG(duration) FROM appointments WHERE month=8 GROUP BY dept HAVING COUNT(*)>=100 ORDER BY AVG(duration) DESC LIMIT 5"},{"value":"C","label":"SELECT TOP 5 dept, AVG(duration) FROM appointments HAVING COUNT(*)>=100"},{"value":"D","label":"SELECT dept FROM appointments GROUP BY dept LIMIT 5"}]'::jsonb,
     '["sql"]'::jsonb, 4.0, '2026-08-20'::timestamptz),

    ('f044q000-0000-4000-8000-000000000003', v_qv_data_analyst, 2, 'single_choice',
     'A stakeholder asks for a chart comparing 12 months of revenue across 6 product lines. Which chart type is most appropriate?',
     '[{"value":"A","label":"Pie chart"},{"value":"B","label":"Line chart with one series per product line"},{"value":"C","label":"Scatter plot"},{"value":"D","label":"Histogram"}]'::jsonb,
     '["data-visualization"]'::jsonb, 4.0, '2026-08-20'::timestamptz),

    ('f044q000-0000-4000-8000-000000000004', v_qv_data_analyst, 3, 'text',
     'Describe a time you found an unexpected pattern in data. What was your approach to validating it before sharing findings?',
     null, '["data-analysis"]'::jsonb, null, '2026-08-20'::timestamptz),

    ('f044q000-0000-4000-8000-000000000011', v_qv_research_data, 0, 'single_choice',
     'A colleague proposes combining two datasets from different trials that used slightly different measurement scales. What should happen first?',
     '[{"value":"A","label":"Merge them immediately"},{"value":"B","label":"Check whether the measurement instruments are sufficiently comparable and document the harmonisation decision"},{"value":"C","label":"Use only the larger dataset"},{"value":"D","label":"Report the discrepancy to ethics and stop"}]'::jsonb,
     '["research-documentation"]'::jsonb, null, '2026-08-22'::timestamptz),

    ('f044q000-0000-4000-8000-000000000012', v_qv_research_data, 1, 'text',
     'How would you document a data cleaning decision so that another researcher can reproduce your analysis six months later?',
     null, '["research-documentation"]'::jsonb, null, '2026-08-22'::timestamptz),

    ('f044q000-0000-4000-8000-000000000013', v_qv_research_data, 2, 'single_choice',
     'A colleague asks you to email a de-identified patient CSV to their personal address for weekend analysis. You should:',
     '[{"value":"A","label":"Send it — it is de-identified"},{"value":"B","label":"Decline and remind them de-identified research data must remain within approved systems"},{"value":"C","label":"Ask your supervisor first and meanwhile send it"},{"value":"D","label":"Share a link on a public cloud service"}]'::jsonb,
     '["research-documentation"]'::jsonb, null, '2026-08-22'::timestamptz),

    ('f044q000-0000-4000-8000-000000000021', v_qv_product_analytics, 0, 'single_choice',
     'Your signup-to-activation rate dropped from 62% to 48% last week. Which is the most appropriate first action?',
     '[{"value":"A","label":"Immediately roll back the last deployment"},{"value":"B","label":"Segment the drop by traffic source, device, and cohort to identify where it concentrates"},{"value":"C","label":"Email the CEO with the percentage drop"},{"value":"D","label":"Increase paid acquisition to compensate"}]'::jsonb,
     '["data-analysis"]'::jsonb, null, '2026-08-21'::timestamptz),

    ('f044q000-0000-4000-8000-000000000022', v_qv_product_analytics, 1, 'single_choice',
     'An A/B test ran for 3 days and shows a 4% lift with p=0.04. A PM wants to ship immediately. What do you advise?',
     '[{"value":"A","label":"Ship it — the p-value is under 0.05"},{"value":"B","label":"Wait for the pre-specified sample size and duration; early stopping inflates false-positive rates"},{"value":"C","label":"Run a second A/B test to confirm"},{"value":"D","label":"Discard — 3 days is too short"}]'::jsonb,
     '["data-analysis"]'::jsonb, null, '2026-08-21'::timestamptz),

    ('f044q000-0000-4000-8000-000000000023', v_qv_product_analytics, 2, 'text',
     'You present weekly metrics to the product team. Describe how you choose which metrics to highlight and how you communicate a metric that moved unexpectedly.',
     null, '["presentation"]'::jsonb, null, '2026-08-21'::timestamptz)
  on conflict (id, questionnaire_version_id) do nothing;

  -- Publish questionnaire versions (UPDATE draft → published)
  update sih26044.questionnaire_versions
  set status = 'published', published_at = created_at
  where id in (v_qv_data_analyst, v_qv_research_data, v_qv_product_analytics)
    and status = 'draft';

  update sih26044.questionnaires set status = 'published', current_version_id = v_qv_data_analyst
  where id = v_q_data_analyst and current_version_id is null;
  update sih26044.questionnaires set status = 'published', current_version_id = v_qv_research_data
  where id = v_q_research_data and current_version_id is null;
  update sih26044.questionnaires set status = 'published', current_version_id = v_qv_product_analytics
  where id = v_q_product_analytics and current_version_id is null;

  -- Questionnaire-opportunity bindings (created after versions published)
  insert into sih26044.opportunity_questionnaire_assignments (
    id, opportunity_version_id, questionnaire_id, required, ordinal, created_at
  ) values
    ('f044qa00-0000-4000-8000-000000000001', v_ver_jr_analyst,     v_q_data_analyst,      true, 0, '2026-08-20'::timestamptz),
    ('f044qa00-0000-4000-8000-000000000002', v_ver_prod_analytics,  v_q_product_analytics, true, 0, '2026-08-21'::timestamptz),
    ('f044qa00-0000-4000-8000-000000000003', v_ver_research_asst,   v_q_research_data,     true, 0, '2026-08-22'::timestamptz)
  on conflict (opportunity_version_id, questionnaire_id) do nothing;

  select count(*) into v_cnt from sih26044.questionnaire_questions
  where questionnaire_version_id in (v_qv_data_analyst, v_qv_research_data, v_qv_product_analytics);
  v_result := jsonb_set(v_result, '{questionnaire_questions}', to_jsonb(v_cnt));

  -- ----------------------------------------------------------------
  -- BACKGROUND APPLICATIONS (saved/preparing only — no snapshot needed)
  -- ----------------------------------------------------------------
  insert into sih26044.applications (
    id, applicant_actor_id, opportunity_id, opportunity_version_id,
    owner_organization_id, initial_stage, created_at
  ) values
    (v_app_1, v_cand_1, v_opp_jr_analyst,     v_ver_jr_analyst,     v_org_employer_b, 'preparing', '2026-08-28'::timestamptz),
    (v_app_2, v_cand_2, v_opp_jr_analyst,     v_ver_jr_analyst,     v_org_employer_b, 'saved',     '2026-08-29'::timestamptz),
    (v_app_3, v_cand_3, v_opp_research_asst,  v_ver_research_asst,  v_org_employer_a, 'preparing', '2026-08-30'::timestamptz),
    (v_app_4, v_cand_4, v_opp_prod_analytics, v_ver_prod_analytics, v_org_employer_b, 'preparing', '2026-08-31'::timestamptz),
    (v_app_5, v_cand_5, v_opp_bi_intern,      v_ver_bi_intern,      v_org_employer_b, 'saved',     '2026-09-01'::timestamptz)
  on conflict (id) do nothing;

  select count(*) into v_cnt from sih26044.applications
  where id in (v_app_1, v_app_2, v_app_3, v_app_4, v_app_5);
  v_result := jsonb_set(v_result, '{applications}', to_jsonb(v_cnt));

  -- ----------------------------------------------------------------
  -- CONSENT GRANTS for historical verifications
  -- ----------------------------------------------------------------
  insert into sih26044.consent_grants (id, subject_actor_id, grantee_organization_id, purpose, granted_at, created_by_actor_id, created_at)
  values
    (v_consent_hist_1, v_actor_student, null, 'evidence_verification', '2026-08-01'::timestamptz, v_actor_student, '2026-08-01'::timestamptz),
    (v_consent_hist_2, v_actor_student, null, 'evidence_verification', '2026-08-05'::timestamptz, v_actor_student, '2026-08-05'::timestamptz),
    (v_consent_viz,    v_actor_student, null, 'evidence_verification', '2026-09-01'::timestamptz, v_actor_student, '2026-09-01'::timestamptz)
  on conflict (id) do nothing;

  insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id)
  select v_consent_hist_1, id from sih26044.evidence_records
  where subject_actor_id = v_actor_student and scope_literal_skill_label = 'Python' limit 1
  on conflict do nothing;

  insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id)
  select v_consent_hist_2, id from sih26044.evidence_records
  where subject_actor_id = v_actor_student and scope_literal_skill_label = 'Data Analysis' limit 1
  on conflict do nothing;

  insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id)
  select v_consent_viz, id from sih26044.evidence_records
  where subject_actor_id = v_actor_student and scope_literal_skill_label = 'Data Visualization' limit 1
  on conflict do nothing;

  -- ----------------------------------------------------------------
  -- VERIFICATION REQUESTS
  -- ----------------------------------------------------------------
  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
    consent_grant_id, scope_kind, scope_literal_skill_label,
    status, requested_at, closed_at
  )
  select v_vreq_python_hist, e.id, v_actor_student, v_actor_faculty,
    v_consent_hist_1, 'global_skill', 'Python', 'closed', '2026-08-01'::timestamptz, '2026-08-08'::timestamptz
  from sih26044.evidence_records e
  where e.subject_actor_id = v_actor_student and e.scope_literal_skill_label = 'Python' limit 1
  on conflict (id) do nothing;

  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
    consent_grant_id, scope_kind, scope_literal_skill_label,
    status, requested_at, closed_at
  )
  select v_vreq_da_hist, e.id, v_actor_student, v_actor_faculty,
    v_consent_hist_2, 'global_skill', 'Data Analysis', 'closed', '2026-08-05'::timestamptz, '2026-08-12'::timestamptz
  from sih26044.evidence_records e
  where e.subject_actor_id = v_actor_student and e.scope_literal_skill_label = 'Data Analysis' limit 1
  on conflict (id) do nothing;

  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
    consent_grant_id, scope_kind, scope_literal_skill_label,
    status, requested_at
  )
  select v_vreq_data_viz, e.id, v_actor_student, v_actor_faculty,
    v_consent_viz, 'global_skill', 'Data Visualization', 'requested', '2026-09-01'::timestamptz
  from sih26044.evidence_records e
  where e.subject_actor_id = v_actor_student and e.scope_literal_skill_label = 'Data Visualization' limit 1
  on conflict (id) do nothing;

  -- Historical verification events (idempotent)
  insert into sih26044.verification_events (
    verification_request_id, evidence_record_id, action,
    actor_id, actor_organization_id, reason, occurred_at
  )
  select v_vreq_python_hist, r.evidence_record_id, 'verified_by_human',
    v_actor_faculty, v_org_institution,
    'Observed student independently write and debug Python data-cleaning script during lab session.',
    '2026-08-08'::timestamptz
  from sih26044.verification_requests r where r.id = v_vreq_python_hist
  and not exists (
    select 1 from sih26044.verification_events
    where verification_request_id = v_vreq_python_hist and action = 'verified_by_human'
  );

  insert into sih26044.verification_events (
    verification_request_id, evidence_record_id, action,
    actor_id, actor_organization_id, reason, occurred_at
  )
  select v_vreq_da_hist, r.evidence_record_id, 'verified_by_human',
    v_actor_faculty, v_org_institution,
    'Student independently prepared SQL analysis of survey dataset and explained aggregation logic to class.',
    '2026-08-12'::timestamptz
  from sih26044.verification_requests r where r.id = v_vreq_da_hist
  and not exists (
    select 1 from sih26044.verification_events
    where verification_request_id = v_vreq_da_hist and action = 'verified_by_human'
  );

  select count(*) into v_cnt from sih26044.verification_requests
  where id in (v_vreq_python_hist, v_vreq_da_hist, v_vreq_data_viz);
  v_result := jsonb_set(v_result, '{verification_requests}', to_jsonb(v_cnt));

  -- ----------------------------------------------------------------
  -- COLLABORATIONS (start proposed, then transition events, then status update)
  -- ----------------------------------------------------------------
  insert into sih26044.collaboration_engagements (
    id, kind, opportunity_id, host_organization_id, status,
    starts_at, ends_at, created_by_actor_id, created_at, updated_at
  ) values
    (v_collab_live_project,  'live_project',                v_opp_live_project,    v_org_employer_b,  'proposed', '2026-07-01'::timestamptz, '2026-07-31'::timestamptz, v_actor_recruiter_b, '2026-06-15'::timestamptz, '2026-06-15'::timestamptz),
    (v_collab_research,      'collaborative_research',      v_opp_collab_research, v_org_employer_a,  'proposed', '2026-08-01'::timestamptz, '2026-12-31'::timestamptz, v_actor_recruiter,   '2026-07-15'::timestamptz, '2026-07-15'::timestamptz),
    (v_collab_fdp,           'faculty_development_program', v_opp_faculty_fdp,     v_org_institution, 'proposed', '2026-08-10'::timestamptz, '2026-08-14'::timestamptz, v_actor_inst_admin,  '2026-07-20'::timestamptz, '2026-07-20'::timestamptz),
    (v_collab_mentoring,     'mentoring',                   v_opp_mentoring,       v_org_institution, 'proposed', '2026-08-20'::timestamptz, '2026-10-15'::timestamptz, v_actor_faculty,     '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    (v_collab_guest_lecture, 'guest_lecture',               v_opp_guest_lecture,   v_org_employer_b,  'proposed', '2026-08-13'::timestamptz, '2026-08-13'::timestamptz, v_actor_recruiter_b, '2026-08-01'::timestamptz, '2026-08-01'::timestamptz),
    (v_collab_consultancy,   'consultancy',                 null,                  v_org_employer_a,  'proposed', null,                      null,                      v_actor_recruiter,   '2026-09-02'::timestamptz, '2026-09-02'::timestamptz)
  on conflict (id) do nothing;

  insert into sih26044.collaboration_partner_organizations (collaboration_engagement_id, organization_id)
  values
    (v_collab_live_project,  v_org_institution),
    (v_collab_research,      v_org_institution),
    (v_collab_fdp,           v_org_employer_a),
    (v_collab_mentoring,     v_org_employer_b),
    (v_collab_consultancy,   v_org_institution)
  on conflict do nothing;

  insert into sih26044.collaboration_participants (collaboration_engagement_id, actor_id)
  values
    (v_collab_live_project,  v_actor_faculty),
    (v_collab_live_project,  v_cand_1),
    (v_collab_live_project,  v_cand_5),
    (v_collab_research,      v_actor_faculty),
    (v_collab_research,      v_actor_student),
    (v_collab_fdp,           v_actor_faculty),
    (v_collab_mentoring,     v_actor_faculty),
    (v_collab_mentoring,     v_actor_student),
    (v_collab_guest_lecture, v_actor_faculty)
  on conflict do nothing;

  insert into sih26044.collaboration_objectives (collaboration_engagement_id, ordinal, objective)
  values
    (v_collab_live_project, 0, 'Analyse anonymised health dataset and surface clinically relevant patterns'),
    (v_collab_live_project, 1, 'Present findings to industry judges with reproducible methodology'),
    (v_collab_research,     0, 'Develop standardised AYUSH clinical trial data schemas'),
    (v_collab_research,     1, 'Publish schema documentation for adoption by partner institutions'),
    (v_collab_fdp,          0, 'Upgrade faculty data analysis skills for curriculum integration'),
    (v_collab_mentoring,    0, 'Pair students with industry mentors for structured career guidance'),
    (v_collab_consultancy,  0, 'Evaluate feasibility of AI-assisted clinical data validation')
  on conflict do nothing;

  insert into sih26044.collaboration_engagement_events (
    collaboration_engagement_id, sequence_number, kind, from_status, to_status,
    title, detail, actor_id, organization_id, occurred_at
  ) values
    (v_collab_live_project, 2, 'status_transition', 'proposed', 'approved', null, null, v_actor_recruiter_b, v_org_employer_b, '2026-06-16'::timestamptz),
    (v_collab_live_project, 3, 'status_transition', 'approved', 'active',   null, null, v_actor_recruiter_b, v_org_employer_b, '2026-07-01'::timestamptz),
    (v_collab_live_project, 4, 'milestone', null, null, 'Dataset handed over to student teams', 'Anonymised health dataset with 12,000 records delivered to 3 participating teams.', v_actor_recruiter_b, v_org_employer_b, '2026-07-03'::timestamptz),
    (v_collab_live_project, 5, 'deliverable', null, null, 'Team presentations completed', 'All 3 teams presented findings. Top team identified significant seasonal pattern in appointment no-shows.', v_actor_recruiter_b, v_org_employer_b, '2026-07-28'::timestamptz),
    (v_collab_live_project, 6, 'status_transition', 'active', 'completed', null, null, v_actor_recruiter_b, v_org_employer_b, '2026-07-31'::timestamptz),
    (v_collab_live_project, 7, 'outcome', null, null, 'Top team fast-tracked for internship screening', 'Arjun Nair recommended for Jr Data Analyst internship pipeline.', v_actor_recruiter_b, v_org_employer_b, '2026-08-01'::timestamptz),
    (v_collab_research, 2, 'status_transition', 'proposed', 'approved', null, null, v_actor_recruiter, v_org_employer_a, '2026-07-16'::timestamptz),
    (v_collab_research, 3, 'status_transition', 'approved', 'active',   null, null, v_actor_recruiter, v_org_employer_a, '2026-08-01'::timestamptz),
    (v_collab_research, 4, 'milestone', null, null, 'Kickoff meeting completed', 'Faculty and industry team agreed on initial schema scope: 5 clinical data domains.', v_actor_faculty, v_org_institution, '2026-08-05'::timestamptz),
    (v_collab_fdp, 2, 'status_transition', 'proposed', 'approved', null, null, v_actor_inst_admin, v_org_institution, '2026-07-22'::timestamptz),
    (v_collab_fdp, 3, 'status_transition', 'approved', 'active',   null, null, v_actor_inst_admin, v_org_institution, '2026-08-10'::timestamptz),
    (v_collab_fdp, 4, 'status_transition', 'active', 'completed', null, null, v_actor_inst_admin, v_org_institution, '2026-08-14'::timestamptz),
    (v_collab_fdp, 5, 'feedback', null, null, 'Faculty satisfaction survey results', '18/20 faculty rated programme "highly useful".', v_actor_inst_admin, v_org_institution, '2026-08-16'::timestamptz),
    (v_collab_mentoring, 2, 'status_transition', 'proposed', 'approved', null, null, v_actor_faculty, v_org_institution, '2026-08-05'::timestamptz),
    (v_collab_mentoring, 3, 'status_transition', 'approved', 'active',   null, null, v_actor_faculty, v_org_institution, '2026-08-20'::timestamptz),
    (v_collab_guest_lecture, 2, 'status_transition', 'proposed', 'approved', null, null, v_actor_recruiter_b, v_org_employer_b, '2026-08-05'::timestamptz),
    (v_collab_guest_lecture, 3, 'status_transition', 'approved', 'active',   null, null, v_actor_recruiter_b, v_org_employer_b, '2026-08-13'::timestamptz),
    (v_collab_guest_lecture, 4, 'status_transition', 'active', 'completed', null, null, v_actor_recruiter_b, v_org_employer_b, '2026-08-13'::timestamptz)
  on conflict (collaboration_engagement_id, sequence_number) do nothing;

  -- Sync final status
  update sih26044.collaboration_engagements set status = 'completed', updated_at = '2026-07-31'::timestamptz where id = v_collab_live_project  and status <> 'completed';
  update sih26044.collaboration_engagements set status = 'active',    updated_at = '2026-08-01'::timestamptz where id = v_collab_research      and status <> 'active';
  update sih26044.collaboration_engagements set status = 'completed', updated_at = '2026-08-14'::timestamptz where id = v_collab_fdp           and status <> 'completed';
  update sih26044.collaboration_engagements set status = 'active',    updated_at = '2026-08-20'::timestamptz where id = v_collab_mentoring     and status <> 'active';
  update sih26044.collaboration_engagements set status = 'completed', updated_at = '2026-08-13'::timestamptz where id = v_collab_guest_lecture and status <> 'completed';

  select count(*) into v_cnt from sih26044.collaboration_engagements
  where id in (v_collab_live_project, v_collab_research, v_collab_fdp, v_collab_mentoring, v_collab_guest_lecture, v_collab_consultancy);
  v_result := jsonb_set(v_result, '{collaborations}', to_jsonb(v_cnt));

  -- ----------------------------------------------------------------
  -- INSTITUTION INTERVENTIONS
  -- ----------------------------------------------------------------
  v_fingerprint := encode(digest(convert_to(
    '{"organizationId":"f0440000-0000-4000-8000-000000000001","methodologyVersion":"sih26044-skills-intel-v1","windowFrom":"2026-06-01T00:00:00Z","windowTo":"2026-08-31T00:00:00Z","metric":"evidence_coverage_rate","dimensions":{"skillCategory":"data_visualization"},"value":23,"denominator":80,"cohortSize":80,"interpretation":"descriptive"}',
    'UTF8'), 'sha256'), 'hex');

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id, initial_status,
    source_methodology_version, source_generated_at, source_window_from, source_window_to,
    source_metric, source_dimensions, source_value, source_denominator, source_cohort_size,
    source_interpretation, source_point_fingerprint, created_at
  ) values (
    v_intv_evidence_clinic, v_org_institution, 'evidence_clinic',
    'Portfolio Evidence Clinic – Data Visualisation',
    'Aggregate skills intelligence shows only 29% of final-year students have recorded evidence for data visualisation, against a sector benchmark of 55%.',
    'Run three structured portfolio clinics in September 2026 where students can submit, review, and strengthen their data visualisation evidence with faculty guidance.',
    'Final-year students in data/analytics programmes with low or absent data visualisation evidence',
    v_actor_inst_admin, v_actor_inst_admin, 'draft',
    'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
    'evidence_coverage_rate', '{"skillCategory": "data_visualization"}'::jsonb,
    23, 80, 80, 'descriptive', v_fingerprint, '2026-09-01'::timestamptz
  ) on conflict (id) do nothing;

  insert into sih26044.institution_intervention_events (id, intervention_id, from_status, to_status, actor_id, note, occurred_at)
  values ('f044b001-0000-4000-8000-000000000001', v_intv_evidence_clinic, 'draft', 'approved', v_actor_inst_admin, 'Approved for September 2026 pilot cohort.', '2026-09-02'::timestamptz)
  on conflict (id) do nothing;

  v_fingerprint := encode(digest(convert_to(
    '{"organizationId":"f0440000-0000-4000-8000-000000000001","methodologyVersion":"sih26044-skills-intel-v1","windowFrom":"2026-06-01T00:00:00Z","windowTo":"2026-08-31T00:00:00Z","metric":"evidence_coverage_rate","dimensions":{"skillCategory":"sql"},"value":31,"denominator":80,"cohortSize":80,"interpretation":"descriptive"}',
    'UTF8'), 'sha256'), 'hex');

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id, initial_status,
    source_methodology_version, source_generated_at, source_window_from, source_window_to,
    source_metric, source_dimensions, source_value, source_denominator, source_cohort_size,
    source_interpretation, source_point_fingerprint, created_at
  ) values (
    v_intv_sql_sprint, v_org_institution, 'training_support',
    'SQL Practice Sprint – Analytics Readiness',
    'Only 39% of students have recorded SQL evidence. Industry readiness benchmarks for data intern roles require SQL at intermediate level.',
    'Host a 2-week SQL practice sprint with daily exercises, peer review, and a final assessed scenario.',
    'Pre-final-year students without intermediate SQL evidence in their passport',
    v_actor_inst_admin, v_actor_inst_admin, 'draft',
    'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
    'evidence_coverage_rate', '{"skillCategory": "sql"}'::jsonb,
    31, 80, 80, 'descriptive', v_fingerprint, '2026-09-02'::timestamptz
  ) on conflict (id) do nothing;

  v_fingerprint := encode(digest(convert_to(
    '{"organizationId":"f0440000-0000-4000-8000-000000000001","methodologyVersion":"sih26044-skills-intel-v1","windowFrom":"2026-06-01T00:00:00Z","windowTo":"2026-08-31T00:00:00Z","metric":"evidence_coverage_rate","dimensions":{"skillCategory":"research_documentation"},"value":18,"denominator":80,"cohortSize":80,"interpretation":"descriptive"}',
    'UTF8'), 'sha256'), 'hex');

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id, initial_status,
    source_methodology_version, source_generated_at, source_window_from, source_window_to,
    source_metric, source_dimensions, source_value, source_denominator, source_cohort_size,
    source_interpretation, source_point_fingerprint, created_at
  ) values (
    v_intv_research_workshop, v_org_institution, 'project_clinic',
    'Research Documentation Workshop',
    'Only 23% of students have recorded evidence for research methodology and documentation.',
    'Conduct a half-day workshop on research documentation best practices: literature review structure, data collection protocol writing, and reproducibility standards.',
    'Students applying for research-adjacent internships without research documentation evidence',
    v_actor_inst_admin, v_actor_inst_admin, 'draft',
    'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
    'evidence_coverage_rate', '{"skillCategory": "research_documentation"}'::jsonb,
    18, 80, 80, 'descriptive', v_fingerprint, '2026-09-03'::timestamptz
  ) on conflict (id) do nothing;

  v_fingerprint := encode(digest(convert_to(
    '{"organizationId":"f0440000-0000-4000-8000-000000000001","methodologyVersion":"sih26044-skills-intel-v1","windowFrom":"2026-06-01T00:00:00Z","windowTo":"2026-08-31T00:00:00Z","metric":"placement_readiness_rate","dimensions":{"programmeYear":"final","track":"data_analytics"},"value":42,"denominator":65,"cohortSize":65,"interpretation":"descriptive"}',
    'UTF8'), 'sha256'), 'hex');

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id, initial_status,
    source_methodology_version, source_generated_at, source_window_from, source_window_to,
    source_metric, source_dimensions, source_value, source_denominator, source_cohort_size,
    source_interpretation, source_point_fingerprint, created_at
  ) values (
    v_intv_mentoring_cohort, v_org_institution, 'mentoring_cohort',
    'Faculty–Industry Mentoring Cohort – Data Analytics Track',
    'Placement readiness for final-year data analytics students is 65%. A structured 8-week cohort is the most scalable intervention.',
    'Launch the Data Analytics Mentoring Cohort pairing 20 students with 10 industry mentors for 8 weeks.',
    'Final-year students in data analytics track with placement readiness below NEAR_READY threshold',
    v_actor_inst_admin, v_actor_inst_admin, 'draft',
    'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
    'placement_readiness_rate', '{"programmeYear": "final", "track": "data_analytics"}'::jsonb,
    42, 65, 65, 'descriptive', v_fingerprint, '2026-09-04'::timestamptz
  ) on conflict (id) do nothing;

  insert into sih26044.institution_intervention_events (id, intervention_id, from_status, to_status, actor_id, note, occurred_at)
  values
    ('f044b004-0000-4000-8000-000000000001', v_intv_mentoring_cohort, 'draft', 'approved', v_actor_inst_admin, 'Approved. Industry partners confirmed 10 mentors.', '2026-09-05'::timestamptz),
    ('f044b004-0000-4000-8000-000000000002', v_intv_mentoring_cohort, 'approved', 'active', v_actor_inst_admin, 'Cohort launched. First group session scheduled 2026-09-10.', '2026-09-05'::timestamptz)
  on conflict (id) do nothing;

  select count(*) into v_cnt from sih26044.institution_interventions
  where id in (v_intv_evidence_clinic, v_intv_sql_sprint, v_intv_research_workshop, v_intv_mentoring_cohort);
  v_result := jsonb_set(v_result, '{institution_interventions}', to_jsonb(v_cnt));

  -- ----------------------------------------------------------------
  -- OUTCOME LOOP
  -- ----------------------------------------------------------------
  insert into sih26044.outcome_events (
    id, kind, subject_actor_id, organization_id,
    opportunity_id, application_id, recorded_by_actor_id, occurred_at, created_at
  ) values (
    v_outcome_1, 'project_delivered', v_cand_1, v_org_employer_b,
    v_opp_live_project, null, v_actor_recruiter_b, '2026-07-31'::timestamptz, '2026-07-31'::timestamptz
  ) on conflict (id) do nothing;

  insert into sih26044.evidence_records (
    subject_actor_id, literal_claim, provenance, initial_verification_state,
    scope_kind, scope_outcome_event_id, source_system, source_captured_at, visibility
  )
  select v_cand_1,
    'Delivered health analytics project: identified seasonal no-show pattern across 12,000 appointment records; presented to industry panel with reproducible Python analysis',
    'outcome_linked', 'human_verified', 'outcome', v_outcome_1,
    'industry_live_project', '2026-07-31'::timestamptz, 'private'
  where not exists (
    select 1 from sih26044.evidence_records
    where subject_actor_id = v_cand_1 and scope_outcome_event_id = v_outcome_1
  );

  -- ----------------------------------------------------------------
  -- FINAL COUNTS
  -- ----------------------------------------------------------------
  select count(*) into v_cnt from sih26044.opportunities;
  v_result := jsonb_set(v_result, '{opportunities_total}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.opportunity_requirements;
  v_result := jsonb_set(v_result, '{requirements_total}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.applications;
  v_result := jsonb_set(v_result, '{applications_total}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.outcome_events where id = v_outcome_1;
  v_result := jsonb_set(v_result, '{outcome_loops}', to_jsonb(v_cnt));

  v_result := jsonb_set(v_result, '{status}', '"success"'::jsonb);
  v_result := jsonb_set(v_result, '{message}', '"Phase-2B complete demo ecosystem seeded"'::jsonb);
  return v_result;
end;
$$;

revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2b() from public;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2b() from anon;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2b() from authenticated;
grant execute on function sih26044.seed_controlled_demo_ecosystem_phase2b() to service_role;

comment on function sih26044.seed_controlled_demo_ecosystem_phase2b is
  'Repaired Phase-2B complete demo ecosystem seed. SECURITY DEFINER. service_role only. All versions inserted DRAFT, children inserted, then published.';
