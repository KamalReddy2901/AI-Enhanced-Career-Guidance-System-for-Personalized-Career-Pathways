-- Repair: Add legitimate historical application lifecycle with outcome for Arjun Nair.
--
-- Root cause: validate_application_linked_outcome() requires application_id IS NOT NULL
-- and current_application_stage(application_id) NOT IN ('saved', 'preparing').
-- All background applications were seeded at saved/preparing — none could receive outcomes.
--
-- Fix: Create one complete historical application lifecycle for Arjun Nair → Live Industry
-- Data Challenge, progressing through applied → active → outcome_recorded.
-- Uses the real schema: readiness_result → snapshot (finalized with SHA-256) → consent →
-- application_events (via enforce_application_event_sequence trigger) → outcome_event.
--
-- The enforce_application_event_sequence trigger is BEFORE INSERT and calls only:
--   current_application_stage() — SECURITY DEFINER, reads events table, no auth required
--   application_transition_allowed() — IMMUTABLE, no auth required
-- Both are safe to call in SECURITY DEFINER context without an authenticated session.
--
-- The finalize_application_snapshot() RPC requires current_actor_id() and cannot be called
-- here. Instead we compute the integrity_fingerprint directly using the same formula as
-- application_snapshot_canonical_material() and UPDATE finalized_at + fingerprint directly.
-- The protect_finalized_snapshot trigger only fires on UPDATE/DELETE of already-finalized
-- snapshots, so the initial direct UPDATE is permitted.
--
-- All PR #87 fixes are preserved in this replacement of seed_controlled_demo_ecosystem_phase2b().

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

  -- Background applications (saved/preparing — no outcome)
  v_app_1  uuid := 'f0449000-0000-4000-8000-000000000001'; -- Arjun → Jr Analyst (preparing)
  v_app_2  uuid := 'f0449000-0000-4000-8000-000000000002'; -- Sonal → Jr Analyst (saved)
  v_app_3  uuid := 'f0449000-0000-4000-8000-000000000003'; -- Vikram → Research Asst (preparing)
  v_app_4  uuid := 'f0449000-0000-4000-8000-000000000004'; -- Neha → Prod Analytics (preparing)
  v_app_5  uuid := 'f0449000-0000-4000-8000-000000000005'; -- Deepak → BI Intern (saved)

  -- Historical completed application: Arjun → Live Industry Data Challenge
  v_app_hist       uuid := 'f0449000-0000-4000-8000-000000000010';
  v_snap_hist      uuid := 'f0449000-0000-4000-8000-000000000011';
  v_readiness_hist uuid := 'f0449000-0000-4000-8000-000000000012';
  v_consent_hist_arjun uuid := 'f044e000-0000-4000-8000-000000000010';

  -- Collaborations
  v_collab_live_project  uuid := 'f044a000-0000-4000-8000-000000000001';
  v_collab_research      uuid := 'f044a000-0000-4000-8000-000000000002';
  v_collab_fdp           uuid := 'f044a000-0000-4000-8000-000000000003';
  v_collab_mentoring     uuid := 'f044a000-0000-4000-8000-000000000004';
  v_collab_guest_lecture uuid := 'f044a000-0000-4000-8000-000000000005';
  v_collab_consultancy   uuid := 'f044a000-0000-4000-8000-000000000006';

  -- Institution interventions (all left at draft — no events seeded)
  v_intv_evidence_clinic   uuid := 'f044b000-0000-4000-8000-000000000001';
  v_intv_sql_sprint        uuid := 'f044b000-0000-4000-8000-000000000002';
  v_intv_research_workshop uuid := 'f044b000-0000-4000-8000-000000000003';
  v_intv_mentoring_cohort  uuid := 'f044b000-0000-4000-8000-000000000004';

  -- Synthetic candidates
  v_cand_1  uuid := 'f044c000-0000-4000-8000-000000000001'; -- Arjun Nair
  v_cand_2  uuid := 'f044c000-0000-4000-8000-000000000002';
  v_cand_3  uuid := 'f044c000-0000-4000-8000-000000000003';
  v_cand_4  uuid := 'f044c000-0000-4000-8000-000000000004';
  v_cand_5  uuid := 'f044c000-0000-4000-8000-000000000005';
  v_cand_6  uuid := 'f044c000-0000-4000-8000-000000000006';

  -- Verifications for flagship student
  v_vreq_python_hist uuid := 'f044d000-0000-4000-8000-000000000001';
  v_vreq_da_hist     uuid := 'f044d000-0000-4000-8000-000000000002';
  v_vreq_data_viz    uuid := 'f044d000-0000-4000-8000-000000000003';
  v_consent_hist_1   uuid := 'f044e000-0000-4000-8000-000000000001';
  v_consent_hist_2   uuid := 'f044e000-0000-4000-8000-000000000002';
  v_consent_viz      uuid := 'f044e000-0000-4000-8000-000000000003';

  -- Outcome
  v_outcome_1  uuid := 'f044f000-0000-4000-8000-000000000001';

  v_flagship_ver_id  uuid;
  v_fingerprint      text;
  v_canonical        jsonb;
  v_cnt int;
  v_result jsonb := '{}'::jsonb;

  -- Arjun evidence ID (needed for snapshot evidence link)
  v_arjun_python_ev_id  uuid;
  v_arjun_sql_ev_id     uuid;

begin
  -- ----------------------------------------------------------------
  -- SAFETY
  -- ----------------------------------------------------------------
  if not exists (select 1 from sih26044.organizations where id = v_org_employer_a) then
    raise exception 'SAFETY: Phase-1 orgs not found.';
  end if;

  select coalesce(
    (select id from sih26044.opportunity_versions where id = v_ver_flagship_v2 and opportunity_id = v_opp_flagship),
    (select id from sih26044.opportunity_versions where id = v_ver_flagship   and opportunity_id = v_opp_flagship)
  ) into v_flagship_ver_id;

  if v_flagship_ver_id is null then
    raise exception 'SAFETY: Phase-2A flagship version not found.';
  end if;

  -- ----------------------------------------------------------------
  -- SYNTHETIC CANDIDATE ACTORS + MEMBERSHIPS
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

  -- Candidate evidence
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
  -- OPPORTUNITIES (draft → requirements → publish)
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

  insert into sih26044.opportunity_versions (
    id, opportunity_id, version_number, status,
    title, description, opportunity_type, audiences,
    source_system, source_literal_text, source_captured_at,
    created_by_actor_id, created_at, published_at
  ) values
    (v_ver_jr_analyst, v_opp_jr_analyst, 1, 'draft', 'Junior Data Analyst Intern',
     'Work with Meridian Analytics Labs on data pipelines and business insights. Duration: 6 months | Hybrid, Bangalore | ₹18,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-20'::timestamptz, v_actor_recruiter_b, '2026-08-20'::timestamptz, null),
    (v_ver_prod_analytics, v_opp_prod_analytics, 1, 'draft', 'Product Analytics Intern',
     'Measure feature adoption and funnel drop-offs at Meridian Analytics Labs. Duration: 3 months | Remote | ₹15,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-21'::timestamptz, v_actor_recruiter_b, '2026-08-21'::timestamptz, null),
    (v_ver_research_asst, v_opp_research_asst, 1, 'draft', 'Research Data Assistant',
     'Support Pravaah Health Systems with data collection and documentation for AYUSH clinical studies. Duration: 4 months | On-site, Pune | ₹12,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-22'::timestamptz, v_actor_recruiter, '2026-08-22'::timestamptz, null),
    (v_ver_bi_intern, v_opp_bi_intern, 1, 'draft', 'Business Intelligence Intern',
     'Build BI dashboards in Tableau/Power BI for Meridian Analytics Labs. Duration: 6 months | Hybrid | ₹20,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-23'::timestamptz, v_actor_recruiter_b, '2026-08-23'::timestamptz, null),
    (v_ver_ops_analytics, v_opp_ops_analytics, 1, 'draft', 'Operations Analytics Intern',
     'Analyse supply chain data for Pravaah Health Systems. Duration: 3 months | Hybrid, Mumbai | ₹14,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-24'::timestamptz, v_actor_recruiter, '2026-08-24'::timestamptz, null),
    (v_ver_backend_dev, v_opp_backend_dev, 1, 'draft', 'Backend Developer Intern',
     'Build REST APIs for Meridian Analytics Labs data platform. Duration: 6 months | Remote | ₹22,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-25'::timestamptz, v_actor_recruiter_b, '2026-08-25'::timestamptz, null),
    (v_ver_ux_research, v_opp_ux_research, 1, 'draft', 'UX Research Assistant',
     'Support user research at Pravaah Health Systems. Duration: 3 months | Hybrid, Bangalore | ₹12,000/month',
     'internship', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-26'::timestamptz, v_actor_recruiter, '2026-08-26'::timestamptz, null),
    (v_ver_live_project, v_opp_live_project, 1, 'draft', 'Live Industry Data Challenge – Health Analytics',
     'A 4-week industry live project at Meridian Analytics Labs. Teams analyse a real anonymised health dataset and present to industry judges.',
     'live_project', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-27'::timestamptz, v_actor_recruiter_b, '2026-08-27'::timestamptz, null),
    (v_ver_mentoring, v_opp_mentoring, 1, 'draft', 'Industry Mentorship Cohort – Data & Analytics',
     'Structured 8-week mentoring programme for final-year students.',
     'mentoring', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-15'::timestamptz, v_actor_faculty, '2026-08-15'::timestamptz, null),
    (v_ver_workshop, v_opp_workshop, 1, 'draft', 'Applied Analytics Workshop – Python & SQL Bootcamp',
     'Intensive 3-day hands-on workshop. Certificate on completion.',
     'workshop', ARRAY['student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-16'::timestamptz, v_actor_faculty, '2026-08-16'::timestamptz, null),
    (v_ver_faculty_fdp, v_opp_faculty_fdp, 1, 'draft', 'Faculty Development Programme – Data & Research Methods',
     'A 5-day residential FDP on modern data analysis and reproducible research.',
     'fdp', ARRAY['faculty']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-10'::timestamptz, v_actor_inst_admin, '2026-08-10'::timestamptz, null),
    (v_ver_collab_research, v_opp_collab_research, 1, 'draft', 'Research Collaboration – Health Data Standardisation',
     'Joint research on standardised AYUSH clinical trial data schemas.',
     'collaborative_research', ARRAY['faculty', 'student']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-12'::timestamptz, v_actor_recruiter, '2026-08-12'::timestamptz, null),
    (v_ver_guest_lecture, v_opp_guest_lecture, 1, 'draft', 'Guest Lecture – Applied Analytics in Research',
     'A 90-minute guest lecture by Meridian Analytics Labs data scientists.',
     'guest_lecture', ARRAY['student', 'faculty']::sih26044.opportunity_audience[], 'controlled_fixture', 'Controlled synthetic demo opportunity', '2026-08-13'::timestamptz, v_actor_recruiter_b, '2026-08-13'::timestamptz, null)
  on conflict (id, opportunity_id) do nothing;

  -- Requirements while DRAFT
  insert into sih26044.opportunity_requirements (
    id, opportunity_version_id, ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency, hard_gate,
    human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method, created_at
  ) values
    ('f04410a0-0000-4000-8000-000000000001', v_ver_jr_analyst, 0, 'skill', 'required', 'SQL for data extraction and aggregation', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000002', v_ver_jr_analyst, 1, 'skill', 'required', 'Python for data manipulation', 2, 'any_recorded', 'exact', 'python', 'Python', 2, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000003', v_ver_jr_analyst, 2, 'skill', 'required', 'Structured data analysis and presentation', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000004', v_ver_jr_analyst, 3, 'skill', 'preferred', 'Data visualisation tools', 1, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 1, false, true, v_actor_recruiter_b, '2026-08-20'::timestamptz, 'controlled_fixture', '2026-08-20'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000011', v_ver_prod_analytics, 0, 'skill', 'required', 'Data analysis and metric interpretation', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000012', v_ver_prod_analytics, 1, 'skill', 'required', 'SQL for product funnel queries', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000013', v_ver_prod_analytics, 2, 'skill', 'preferred', 'Data visualisation for product dashboards', 1, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 1, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000014', v_ver_prod_analytics, 3, 'skill', 'preferred', 'Communication of findings to non-technical stakeholders', 1, 'any_recorded', 'exact', 'presentation', 'Presentation', 1, false, true, v_actor_recruiter_b, '2026-08-21'::timestamptz, 'controlled_fixture', '2026-08-21'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000021', v_ver_research_asst, 0, 'skill', 'required', 'Research methodology and documentation', 2, 'human_or_issuer_expected', 'exact', 'research-documentation', 'Research Documentation', 2, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000022', v_ver_research_asst, 1, 'skill', 'required', 'Data cleaning and validation', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000023', v_ver_research_asst, 2, 'skill', 'preferred', 'Python for scripted data processing', 1, 'any_recorded', 'exact', 'python', 'Python', 1, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000024', v_ver_research_asst, 3, 'skill', 'preferred', 'AYUSH or traditional medicine terminology familiarity', 1, 'any_recorded', 'unresolved', null, 'AYUSH Healthcare Domain Knowledge', null, false, true, v_actor_recruiter, '2026-08-22'::timestamptz, 'controlled_fixture', '2026-08-22'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000031', v_ver_bi_intern, 0, 'skill', 'required', 'Data visualisation and dashboard development', 3, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 2, false, true, v_actor_recruiter_b, '2026-08-23'::timestamptz, 'controlled_fixture', '2026-08-23'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000032', v_ver_bi_intern, 1, 'skill', 'required', 'SQL for business reporting queries', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-23'::timestamptz, 'controlled_fixture', '2026-08-23'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000033', v_ver_bi_intern, 2, 'skill', 'preferred', 'Python or R for data transformation', 1, 'any_recorded', 'exact', 'python', 'Python', 1, false, true, v_actor_recruiter_b, '2026-08-23'::timestamptz, 'controlled_fixture', '2026-08-23'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000041', v_ver_ops_analytics, 0, 'skill', 'required', 'Data analysis for operations reporting', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter, '2026-08-24'::timestamptz, 'controlled_fixture', '2026-08-24'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000042', v_ver_ops_analytics, 1, 'skill', 'required', 'Excel or SQL for operational data queries', 2, 'any_recorded', 'exact', 'sql', 'SQL', 1, false, true, v_actor_recruiter, '2026-08-24'::timestamptz, 'controlled_fixture', '2026-08-24'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000043', v_ver_ops_analytics, 2, 'skill', 'preferred', 'Statistical analysis for process improvement', 1, 'any_recorded', 'exact', 'statistics', 'Statistics', 1, false, true, v_actor_recruiter, '2026-08-24'::timestamptz, 'controlled_fixture', '2026-08-24'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000051', v_ver_backend_dev, 0, 'skill', 'required', 'Python backend development (FastAPI or Flask)', 3, 'artifact_expected', 'exact', 'python', 'Python', 2, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000052', v_ver_backend_dev, 1, 'skill', 'required', 'SQL and relational database design', 2, 'any_recorded', 'exact', 'sql', 'SQL', 2, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000053', v_ver_backend_dev, 2, 'skill', 'required', 'Git version control and collaborative workflows', 2, 'any_recorded', 'exact', 'git', 'Git/GitHub', 1, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000054', v_ver_backend_dev, 3, 'skill', 'preferred', 'REST API design principles', 1, 'any_recorded', 'unresolved', null, 'REST API Design', null, false, true, v_actor_recruiter_b, '2026-08-25'::timestamptz, 'controlled_fixture', '2026-08-25'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000061', v_ver_ux_research, 0, 'skill', 'required', 'User research methods: interviews and surveys', 2, 'any_recorded', 'exact', 'ux-research', 'UX Research', 1, false, true, v_actor_recruiter, '2026-08-26'::timestamptz, 'controlled_fixture', '2026-08-26'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000062', v_ver_ux_research, 1, 'skill', 'required', 'Synthesis and presentation of qualitative findings', 2, 'any_recorded', 'exact', 'presentation', 'Presentation', 1, false, true, v_actor_recruiter, '2026-08-26'::timestamptz, 'controlled_fixture', '2026-08-26'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000063', v_ver_ux_research, 2, 'skill', 'preferred', 'Basic data analysis for quantitative user metrics', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_recruiter, '2026-08-26'::timestamptz, 'controlled_fixture', '2026-08-26'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000071', v_ver_live_project, 0, 'skill', 'required', 'Data analysis and structured problem-solving', 2, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_recruiter_b, '2026-08-27'::timestamptz, 'controlled_fixture', '2026-08-27'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000072', v_ver_live_project, 1, 'skill', 'preferred', 'Data visualisation for presentation', 1, 'artifact_expected', 'exact', 'data-visualization', 'Data Visualization', 1, false, true, v_actor_recruiter_b, '2026-08-27'::timestamptz, 'controlled_fixture', '2026-08-27'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000081', v_ver_mentoring, 0, 'skill', 'preferred', 'Enrolled student with interest in data/analytics career', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 1, false, true, v_actor_faculty, '2026-08-15'::timestamptz, 'controlled_fixture', '2026-08-15'::timestamptz),
    ('f04410a0-0000-4000-8000-000000000091', v_ver_workshop, 0, 'skill', 'preferred', 'Basic Python or data interest', 1, 'any_recorded', 'exact', 'python', 'Python', 0, false, true, v_actor_faculty, '2026-08-16'::timestamptz, 'controlled_fixture', '2026-08-16'::timestamptz),
    ('f04410a0-0000-4000-8000-0000000000a1', v_ver_faculty_fdp, 0, 'skill', 'required', 'Active faculty member with research or teaching portfolio', 2, 'any_recorded', 'exact', 'research-documentation', 'Research Documentation', 1, false, true, v_actor_inst_admin, '2026-08-10'::timestamptz, 'controlled_fixture', '2026-08-10'::timestamptz),
    ('f04410a0-0000-4000-8000-0000000000b1', v_ver_collab_research, 0, 'skill', 'required', 'Research methodology and documentation', 2, 'human_or_issuer_expected', 'exact', 'research-documentation', 'Research Documentation', 2, false, true, v_actor_recruiter, '2026-08-12'::timestamptz, 'controlled_fixture', '2026-08-12'::timestamptz),
    ('f04410a0-0000-4000-8000-0000000000b2', v_ver_collab_research, 1, 'skill', 'preferred', 'Data analysis for health datasets', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 2, false, true, v_actor_recruiter, '2026-08-12'::timestamptz, 'controlled_fixture', '2026-08-12'::timestamptz),
    ('f04410a0-0000-4000-8000-0000000000c1', v_ver_guest_lecture, 0, 'skill', 'preferred', 'Interest in data science or analytics', 1, 'any_recorded', 'exact', 'data-analysis', 'Data Analysis', 0, false, true, v_actor_recruiter_b, '2026-08-13'::timestamptz, 'controlled_fixture', '2026-08-13'::timestamptz)
  on conflict (id, opportunity_version_id) do nothing;

  -- Publish
  update sih26044.opportunity_versions set status = 'published', published_at = created_at
  where id in (
    v_ver_jr_analyst, v_ver_prod_analytics, v_ver_research_asst, v_ver_bi_intern,
    v_ver_ops_analytics, v_ver_backend_dev, v_ver_ux_research, v_ver_live_project,
    v_ver_mentoring, v_ver_workshop, v_ver_faculty_fdp, v_ver_collab_research, v_ver_guest_lecture
  ) and status = 'draft';

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

  -- ----------------------------------------------------------------
  -- QUESTIONNAIRES (draft → questions → publish) [PR #87 Fix B+C preserved]
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
     'Assesses core SQL, Python, and analytical reasoning skills for data analyst intern roles.',
     'reusable_technical',
     '{"version": "1.0", "rules": [{"questionOrdinal": 0, "maxScore": 4}, {"questionOrdinal": 1, "maxScore": 4}, {"questionOrdinal": 2, "maxScore": 4}]}'::jsonb,
     v_actor_recruiter_b, '2026-08-20'::timestamptz, null),
    (v_qv_research_data, v_q_research_data, 1, 'draft',
     'Research Data Handling Assessment',
     'Evaluates research methodology, data integrity, and responsible data handling.',
     'reusable_technical', null, v_actor_recruiter, '2026-08-22'::timestamptz, null),
    (v_qv_product_analytics, v_q_product_analytics, 1, 'draft',
     'Product Analytics Reasoning',
     'Tests metric reasoning, conversion interpretation, and findings communication.',
     'opportunity_specific', null, v_actor_recruiter_b, '2026-08-21'::timestamptz, null)
  on conflict (id, questionnaire_id) do nothing;

  -- Questions while DRAFT — Fix B: conflict on (questionnaire_version_id, ordinal)
  insert into sih26044.questionnaire_questions (
    id, questionnaire_version_id, ordinal, question_type, question_text,
    choice_options, skill_refs, scoring_weight, created_at
  ) values
    ('f0441001-0000-4000-8000-000000000001', v_qv_data_analyst, 0, 'single_choice',
     'You receive a CSV with 50,000 rows of patient appointments. 15% of rows have NULL in "diagnosis_code". What is your first step?',
     '[{"value":"A","label":"Drop all rows with NULL diagnosis_code immediately"},{"value":"B","label":"Investigate the NULL pattern — check if NULLs cluster by date, provider, or facility before deciding"},{"value":"C","label":"Fill NULLs with the string UNKNOWN and proceed"},{"value":"D","label":"Raise a critical bug and refuse to process the dataset"}]'::jsonb,
     '["data-analysis"]'::jsonb, 4.0, '2026-08-20'::timestamptz),
    ('f0441001-0000-4000-8000-000000000002', v_qv_data_analyst, 1, 'single_choice',
     'Which SQL correctly finds the top 5 departments by average appointment duration, only including departments with at least 100 appointments in August 2026?',
     '[{"value":"A","label":"SELECT dept, AVG(duration) FROM appointments GROUP BY dept LIMIT 5"},{"value":"B","label":"SELECT dept, AVG(duration) FROM appointments WHERE month=8 GROUP BY dept HAVING COUNT(*)>=100 ORDER BY AVG(duration) DESC LIMIT 5"},{"value":"C","label":"SELECT TOP 5 dept FROM appointments HAVING COUNT(*)>=100"},{"value":"D","label":"SELECT dept FROM appointments GROUP BY dept LIMIT 5"}]'::jsonb,
     '["sql"]'::jsonb, 4.0, '2026-08-20'::timestamptz),
    ('f0441001-0000-4000-8000-000000000003', v_qv_data_analyst, 2, 'single_choice',
     'A stakeholder asks for a chart comparing 12 months of revenue across 6 product lines. Which chart type is most appropriate?',
     '[{"value":"A","label":"Pie chart"},{"value":"B","label":"Line chart with one series per product line"},{"value":"C","label":"Scatter plot"},{"value":"D","label":"Histogram"}]'::jsonb,
     '["data-visualization"]'::jsonb, 4.0, '2026-08-20'::timestamptz),
    ('f0441001-0000-4000-8000-000000000004', v_qv_data_analyst, 3, 'text',
     'Describe a time you found an unexpected pattern in data. What was your approach to validating it before sharing findings?',
     null, '["data-analysis"]'::jsonb, null, '2026-08-20'::timestamptz),
    ('f0441001-0000-4000-8000-000000000011', v_qv_research_data, 0, 'single_choice',
     'A colleague proposes combining two datasets from different trials that used slightly different measurement scales. What should happen first?',
     '[{"value":"A","label":"Merge them immediately"},{"value":"B","label":"Check whether the measurement instruments are sufficiently comparable and document the harmonisation decision"},{"value":"C","label":"Use only the larger dataset"},{"value":"D","label":"Report the discrepancy to ethics and stop"}]'::jsonb,
     '["research-documentation"]'::jsonb, null, '2026-08-22'::timestamptz),
    ('f0441001-0000-4000-8000-000000000012', v_qv_research_data, 1, 'text',
     'How would you document a data cleaning decision so that another researcher can reproduce your analysis six months later?',
     null, '["research-documentation"]'::jsonb, null, '2026-08-22'::timestamptz),
    ('f0441001-0000-4000-8000-000000000013', v_qv_research_data, 2, 'single_choice',
     'A colleague asks you to email a de-identified patient CSV to their personal address. You should:',
     '[{"value":"A","label":"Send it — it is de-identified"},{"value":"B","label":"Decline and remind them de-identified research data must remain within approved systems"},{"value":"C","label":"Ask your supervisor first"},{"value":"D","label":"Share a public cloud link"}]'::jsonb,
     '["research-documentation"]'::jsonb, null, '2026-08-22'::timestamptz),
    ('f0441001-0000-4000-8000-000000000021', v_qv_product_analytics, 0, 'single_choice',
     'Your signup-to-activation rate dropped from 62% to 48% last week. Which is the most appropriate first action?',
     '[{"value":"A","label":"Immediately roll back the last deployment"},{"value":"B","label":"Segment the drop by traffic source, device, and cohort before drawing conclusions"},{"value":"C","label":"Email the CEO with the percentage drop"},{"value":"D","label":"Increase paid acquisition"}]'::jsonb,
     '["data-analysis"]'::jsonb, null, '2026-08-21'::timestamptz),
    ('f0441001-0000-4000-8000-000000000022', v_qv_product_analytics, 1, 'single_choice',
     'An A/B test ran for 3 days and shows a 4% lift with p=0.04. A PM wants to ship. What do you advise?',
     '[{"value":"A","label":"Ship it — p-value is under 0.05"},{"value":"B","label":"Wait for the pre-specified sample size; early stopping inflates false-positive rates"},{"value":"C","label":"Run a second A/B test"},{"value":"D","label":"Discard — 3 days is too short"}]'::jsonb,
     '["data-analysis"]'::jsonb, null, '2026-08-21'::timestamptz),
    ('f0441001-0000-4000-8000-000000000023', v_qv_product_analytics, 2, 'text',
     'You present weekly metrics to the product team. How do you choose which metrics to highlight and communicate an unexpected movement?',
     null, '["presentation"]'::jsonb, null, '2026-08-21'::timestamptz)
  on conflict (questionnaire_version_id, ordinal) do nothing;  -- Fix B

  update sih26044.questionnaire_versions set status = 'published', published_at = created_at
  where id in (v_qv_data_analyst, v_qv_research_data, v_qv_product_analytics) and status = 'draft';

  update sih26044.questionnaires set status = 'published', current_version_id = v_qv_data_analyst
  where id = v_q_data_analyst and current_version_id is null;
  update sih26044.questionnaires set status = 'published', current_version_id = v_qv_research_data
  where id = v_q_research_data and current_version_id is null;
  update sih26044.questionnaires set status = 'published', current_version_id = v_qv_product_analytics
  where id = v_q_product_analytics and current_version_id is null;

  -- Fix C: assignments include questionnaire_version_id
  insert into sih26044.opportunity_questionnaire_assignments (
    id, opportunity_version_id, questionnaire_version_id, questionnaire_id, required, ordinal, created_at
  ) values
    ('f0441002-0000-4000-8000-000000000001', v_ver_jr_analyst,     v_qv_data_analyst,      v_q_data_analyst,      true, 0, '2026-08-20'::timestamptz),
    ('f0441002-0000-4000-8000-000000000002', v_ver_prod_analytics, v_qv_product_analytics, v_q_product_analytics, true, 0, '2026-08-21'::timestamptz),
    ('f0441002-0000-4000-8000-000000000003', v_ver_research_asst,  v_qv_research_data,     v_q_research_data,     true, 0, '2026-08-22'::timestamptz)
  on conflict (opportunity_version_id, questionnaire_id) do nothing;

  -- ----------------------------------------------------------------
  -- BACKGROUND APPLICATIONS (saved/preparing — no outcome on these)
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

  -- ----------------------------------------------------------------
  -- HISTORICAL COMPLETED APPLICATION LIFECYCLE: Arjun → Live Industry Data Challenge
  --
  -- Schema prerequisites for 'applied' transition:
  --   1. application_snapshots row with finalized_at IS NOT NULL
  --   2. integrity_fingerprint = SHA-256 of canonical material
  --   3. Active application_review consent
  --   4. consent_evidence_records linking each evidence record
  --   5. application_snapshot_consents linking snapshot to consent
  --   6. application_snapshot_evidence linking snapshot to evidence
  --
  -- enforce_application_event_sequence fires BEFORE INSERT on application_events.
  -- It calls current_application_stage() (SECURITY DEFINER, no auth needed) and
  -- application_transition_allowed() (IMMUTABLE, no auth needed). Safe here.
  --
  -- validate_application_linked_outcome fires BEFORE INSERT on outcome_events.
  -- Requires application_id IS NOT NULL and stage NOT IN ('saved','preparing').
  -- ----------------------------------------------------------------

  -- Step A: Create the historical application (initial_stage = 'preparing')
  insert into sih26044.applications (
    id, applicant_actor_id, opportunity_id, opportunity_version_id,
    owner_organization_id, initial_stage, created_at
  ) values (
    v_app_hist, v_cand_1, v_opp_live_project, v_ver_live_project,
    v_org_employer_b, 'preparing', '2026-07-01'::timestamptz
  ) on conflict (id) do nothing;

  -- Step B: Consent grant for application_review (required by snapshot finalize)
  insert into sih26044.consent_grants (
    id, subject_actor_id, grantee_organization_id, purpose,
    granted_at, created_by_actor_id, created_at
  ) values (
    v_consent_hist_arjun, v_cand_1, v_org_employer_b, 'application_review',
    '2026-07-01'::timestamptz, v_cand_1, '2026-07-01'::timestamptz
  ) on conflict (id) do nothing;

  -- Step C: Resolve Arjun's evidence record IDs for Python and SQL
  select id into v_arjun_python_ev_id from sih26044.evidence_records
  where subject_actor_id = v_cand_1 and scope_literal_skill_label = 'Python' limit 1;

  select id into v_arjun_sql_ev_id from sih26044.evidence_records
  where subject_actor_id = v_cand_1 and scope_literal_skill_label = 'SQL' limit 1;

  -- Step D: Link consent to evidence records
  if v_arjun_python_ev_id is not null then
    insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id)
    values (v_consent_hist_arjun, v_arjun_python_ev_id) on conflict do nothing;
  end if;
  if v_arjun_sql_ev_id is not null then
    insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id)
    values (v_consent_hist_arjun, v_arjun_sql_ev_id) on conflict do nothing;
  end if;

  -- Step E: Synthetic readiness result (direct INSERT — immutability fires on UPDATE/DELETE only)
  insert into sih26044.opportunity_readiness_results (
    id, subject_actor_id, opportunity_id, opportunity_version_id,
    engine_version, evidence_policy_version, input_version,
    subject_facts_version, evidence_projection_version,
    readiness_band, result_body, generated_at, created_at
  ) values (
    v_readiness_hist, v_cand_1, v_opp_live_project, v_ver_live_project,
    'engine-b-v1.0', 'evidence-policy-v1.0', 'input-v1.0',
    'subject-facts-v1.0', 'evidence-projection-v1.0',
    'READY_FOR_REVIEW',
    '{"readinessBand": "READY_FOR_REVIEW", "requirements": [{"requirementId": "f04410a0-0000-4000-8000-000000000071", "band": "READY_FOR_REVIEW"}, {"requirementId": "f04410a0-0000-4000-8000-000000000072", "band": "NEAR_READY"}]}'::jsonb,
    '2026-07-01T06:00:00Z'::timestamptz,
    '2026-07-01T06:00:00Z'::timestamptz
  ) on conflict (id) do nothing;

  -- Step F: Application snapshot (unfinalized first)
  -- recruiter_allowlist_projection must pass recruiter_projection_is_allowlisted():
  -- allowed keys: applicant, applicationId, applicationSnapshotId, applicationStage,
  --   consentRecordId, educationSummary, evidence, opportunityId, opportunityVersionId,
  --   readinessBand, readinessResultId, requirements, sharedWorkSamples
  insert into sih26044.application_snapshots (
    id, application_id, opportunity_version_id, readiness_result_id,
    engine_version, evidence_policy_version, input_version,
    subject_facts_version, evidence_projection_version, recruiter_projection_version,
    recruiter_allowlist_projection, requirement_responses,
    captured_at, integrity_fingerprint, finalized_at, created_at
  ) values (
    v_snap_hist, v_app_hist, v_ver_live_project, v_readiness_hist,
    'engine-b-v1.0', 'evidence-policy-v1.0', 'input-v1.0',
    'subject-facts-v1.0', 'evidence-projection-v1.0', 'recruiter-projection-v1.0',
    jsonb_build_object(
      'applicationId', v_app_hist,
      'opportunityId', v_opp_live_project,
      'opportunityVersionId', v_ver_live_project,
      'readinessBand', 'READY_FOR_REVIEW',
      'readinessResultId', v_readiness_hist,
      'applicationStage', 'preparing'
    ),
    '{}'::jsonb,
    '2026-07-01T06:00:00Z'::timestamptz,
    null, null,  -- finalized below after linking evidence+consents
    '2026-07-01T06:00:00Z'::timestamptz
  ) on conflict (id) do nothing;

  -- Step G: Link evidence to snapshot
  if v_arjun_python_ev_id is not null then
    insert into sih26044.application_snapshot_evidence (application_snapshot_id, evidence_record_id)
    values (v_snap_hist, v_arjun_python_ev_id) on conflict do nothing;
  end if;
  if v_arjun_sql_ev_id is not null then
    insert into sih26044.application_snapshot_evidence (application_snapshot_id, evidence_record_id)
    values (v_snap_hist, v_arjun_sql_ev_id) on conflict do nothing;
  end if;

  -- Step H: Link consent to snapshot
  insert into sih26044.application_snapshot_consents (application_snapshot_id, consent_grant_id)
  values (v_snap_hist, v_consent_hist_arjun) on conflict do nothing;

  -- Step I: Compute and set integrity_fingerprint directly (same formula as
  -- application_snapshot_canonical_material() + SHA-256).
  -- protect_finalized_snapshot fires on UPDATE only when old.finalized_at IS NOT NULL.
  -- Since finalized_at is currently NULL, this UPDATE is permitted.
  if not exists (
    select 1 from sih26044.application_snapshots
    where id = v_snap_hist and finalized_at is not null
  ) then
    v_canonical := sih26044.application_snapshot_canonical_material(v_snap_hist);
    v_fingerprint := encode(
      digest(convert_to(v_canonical::text, 'UTF8'), 'sha256'),
      'hex'
    );
    update sih26044.application_snapshots
    set integrity_fingerprint = v_fingerprint,
        finalized_at = '2026-07-01T06:05:00Z'::timestamptz
    where id = v_snap_hist;
  end if;

  -- Step J: Application event sequence (enforce_application_event_sequence is BEFORE INSERT,
  -- calls current_application_stage() which is SECURITY DEFINER reading events table — safe here).
  -- Sequence: preparing → applied → active → outcome_recorded
  -- Each event must match current_application_stage() as from_stage.

  -- preparing → applied
  insert into sih26044.application_events (
    application_id, from_stage, to_stage, event_kind, actor_id, note, occurred_at
  ) values (
    v_app_hist, 'preparing', 'applied', 'stage_transition',
    v_cand_1, 'Submitted application for Live Industry Data Challenge.', '2026-07-01T07:00:00Z'::timestamptz
  );

  -- applied → active (live project goes directly to active after acceptance)
  insert into sih26044.application_events (
    application_id, from_stage, to_stage, event_kind, actor_id, note, occurred_at
  ) values (
    v_app_hist, 'applied', 'active', 'stage_transition',
    v_actor_recruiter_b, 'Team accepted into live project cohort.', '2026-07-02T09:00:00Z'::timestamptz
  );

  -- active → completed
  insert into sih26044.application_events (
    application_id, from_stage, to_stage, event_kind, actor_id, note, occurred_at
  ) values (
    v_app_hist, 'active', 'completed', 'stage_transition',
    v_actor_recruiter_b, 'Live project concluded. Top team presented strong findings.', '2026-07-31T17:00:00Z'::timestamptz
  );

  -- completed → outcome_recorded
  insert into sih26044.application_events (
    application_id, from_stage, to_stage, event_kind, actor_id, note, occurred_at
  ) values (
    v_app_hist, 'completed', 'outcome_recorded', 'stage_transition',
    v_actor_recruiter_b, 'Project delivery outcome recorded.', '2026-07-31T18:00:00Z'::timestamptz
  );

  -- Step K: Outcome event (validate_application_linked_outcome now passes:
  -- application_id IS NOT NULL, stage = 'outcome_recorded' ≠ saved/preparing,
  -- subject/org/opportunity all match)
  insert into sih26044.outcome_events (
    id, kind, subject_actor_id, organization_id,
    opportunity_id, application_id, recorded_by_actor_id, occurred_at, created_at
  ) values (
    v_outcome_1, 'project_delivered', v_cand_1, v_org_employer_b,
    v_opp_live_project, v_app_hist,
    v_actor_recruiter_b, '2026-07-31T18:00:00Z'::timestamptz, '2026-07-31T18:00:00Z'::timestamptz
  ) on conflict (id) do nothing;

  -- Step L: Outcome-linked evidence
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

  v_result := jsonb_set(v_result, '{historical_outcome_application}', to_jsonb(v_app_hist::text));
  v_result := jsonb_set(v_result, '{historical_outcome_stage}', '"outcome_recorded"');

  -- ----------------------------------------------------------------
  -- FLAGSHIP STUDENT VERIFICATION FOUNDATION
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

  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
    consent_grant_id, scope_kind, scope_literal_skill_label, status, requested_at, closed_at
  )
  select v_vreq_python_hist, e.id, v_actor_student, v_actor_faculty,
    v_consent_hist_1, 'global_skill', 'Python', 'closed', '2026-08-01'::timestamptz, '2026-08-08'::timestamptz
  from sih26044.evidence_records e where e.subject_actor_id = v_actor_student and e.scope_literal_skill_label = 'Python' limit 1
  on conflict (id) do nothing;

  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
    consent_grant_id, scope_kind, scope_literal_skill_label, status, requested_at, closed_at
  )
  select v_vreq_da_hist, e.id, v_actor_student, v_actor_faculty,
    v_consent_hist_2, 'global_skill', 'Data Analysis', 'closed', '2026-08-05'::timestamptz, '2026-08-12'::timestamptz
  from sih26044.evidence_records e where e.subject_actor_id = v_actor_student and e.scope_literal_skill_label = 'Data Analysis' limit 1
  on conflict (id) do nothing;

  insert into sih26044.verification_requests (
    id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
    consent_grant_id, scope_kind, scope_literal_skill_label, status, requested_at
  )
  select v_vreq_data_viz, e.id, v_actor_student, v_actor_faculty,
    v_consent_viz, 'global_skill', 'Data Visualization', 'requested', '2026-09-01'::timestamptz
  from sih26044.evidence_records e where e.subject_actor_id = v_actor_student and e.scope_literal_skill_label = 'Data Visualization' limit 1
  on conflict (id) do nothing;

  insert into sih26044.verification_events (
    verification_request_id, evidence_record_id, action, actor_id, actor_organization_id, reason, occurred_at
  )
  select v_vreq_python_hist, r.evidence_record_id, 'verified_by_human',
    v_actor_faculty, v_org_institution,
    'Observed student independently write and debug Python data-cleaning script during lab session.',
    '2026-08-08'::timestamptz
  from sih26044.verification_requests r where r.id = v_vreq_python_hist
  and not exists (select 1 from sih26044.verification_events where verification_request_id = v_vreq_python_hist and action = 'verified_by_human');

  insert into sih26044.verification_events (
    verification_request_id, evidence_record_id, action, actor_id, actor_organization_id, reason, occurred_at
  )
  select v_vreq_da_hist, r.evidence_record_id, 'verified_by_human',
    v_actor_faculty, v_org_institution,
    'Student independently prepared SQL analysis of survey dataset and explained aggregation logic to class.',
    '2026-08-12'::timestamptz
  from sih26044.verification_requests r where r.id = v_vreq_da_hist
  and not exists (select 1 from sih26044.verification_events where verification_request_id = v_vreq_da_hist and action = 'verified_by_human');

  -- ----------------------------------------------------------------
  -- COLLABORATIONS
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
    (v_collab_consultancy,   'consultancy',                 null,                  v_org_employer_a,  'proposed', null, null, v_actor_recruiter, '2026-09-02'::timestamptz, '2026-09-02'::timestamptz)
  on conflict (id) do nothing;

  insert into sih26044.collaboration_partner_organizations (collaboration_engagement_id, organization_id)
  values
    (v_collab_live_project, v_org_institution), (v_collab_research, v_org_institution),
    (v_collab_fdp, v_org_employer_a), (v_collab_mentoring, v_org_employer_b),
    (v_collab_consultancy, v_org_institution)
  on conflict do nothing;

  insert into sih26044.collaboration_participants (collaboration_engagement_id, actor_id)
  values
    (v_collab_live_project, v_actor_faculty), (v_collab_live_project, v_cand_1), (v_collab_live_project, v_cand_5),
    (v_collab_research, v_actor_faculty), (v_collab_research, v_actor_student),
    (v_collab_fdp, v_actor_faculty), (v_collab_mentoring, v_actor_faculty), (v_collab_mentoring, v_actor_student),
    (v_collab_guest_lecture, v_actor_faculty)
  on conflict do nothing;

  insert into sih26044.collaboration_objectives (collaboration_engagement_id, ordinal, objective)
  values
    (v_collab_live_project, 0, 'Analyse anonymised health dataset and surface clinically relevant patterns'),
    (v_collab_live_project, 1, 'Present findings to industry judges with reproducible methodology'),
    (v_collab_research, 0, 'Develop standardised AYUSH clinical trial data schemas'),
    (v_collab_research, 1, 'Publish schema documentation for adoption by partner institutions'),
    (v_collab_fdp, 0, 'Upgrade faculty data analysis skills for curriculum integration'),
    (v_collab_mentoring, 0, 'Pair students with industry mentors for structured career guidance'),
    (v_collab_consultancy, 0, 'Evaluate feasibility of AI-assisted clinical data validation')
  on conflict do nothing;

  insert into sih26044.collaboration_engagement_events (
    collaboration_engagement_id, sequence_number, kind, from_status, to_status,
    title, detail, actor_id, organization_id, occurred_at
  ) values
    (v_collab_live_project, 2, 'status_transition', 'proposed', 'approved', null, null, v_actor_recruiter_b, v_org_employer_b, '2026-06-16'::timestamptz),
    (v_collab_live_project, 3, 'status_transition', 'approved', 'active',   null, null, v_actor_recruiter_b, v_org_employer_b, '2026-07-01'::timestamptz),
    (v_collab_live_project, 4, 'milestone',  null, null, 'Dataset handed over to student teams', 'Anonymised health dataset with 12,000 records delivered to 3 participating teams.', v_actor_recruiter_b, v_org_employer_b, '2026-07-03'::timestamptz),
    (v_collab_live_project, 5, 'deliverable',null, null, 'Team presentations completed', 'All 3 teams presented findings. Top team identified significant seasonal pattern in appointment no-shows.', v_actor_recruiter_b, v_org_employer_b, '2026-07-28'::timestamptz),
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

  update sih26044.collaboration_engagements set status = 'completed', updated_at = '2026-07-31'::timestamptz where id = v_collab_live_project  and status <> 'completed';
  update sih26044.collaboration_engagements set status = 'active',    updated_at = '2026-08-01'::timestamptz where id = v_collab_research      and status <> 'active';
  update sih26044.collaboration_engagements set status = 'completed', updated_at = '2026-08-14'::timestamptz where id = v_collab_fdp           and status <> 'completed';
  update sih26044.collaboration_engagements set status = 'active',    updated_at = '2026-08-20'::timestamptz where id = v_collab_mentoring     and status <> 'active';
  update sih26044.collaboration_engagements set status = 'completed', updated_at = '2026-08-13'::timestamptz where id = v_collab_guest_lecture and status <> 'completed';

  -- ----------------------------------------------------------------
  -- INSTITUTION INTERVENTIONS (all draft — Fix D preserved: no events seeded)
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
  ) values
    (v_intv_evidence_clinic, v_org_institution, 'evidence_clinic',
     'Portfolio Evidence Clinic – Data Visualisation',
     'Aggregate skills intelligence shows only 29% of final-year students have recorded evidence for data visualisation, against a sector benchmark of 55%.',
     'Run three structured portfolio clinics in September 2026 where students can submit, review, and strengthen their data visualisation evidence with faculty guidance.',
     'Final-year students in data/analytics programmes with low or absent data visualisation evidence',
     v_actor_inst_admin, v_actor_inst_admin, 'draft',
     'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
     'evidence_coverage_rate', '{"skillCategory": "data_visualization"}'::jsonb,
     23, 80, 80, 'descriptive', v_fingerprint, '2026-09-01'::timestamptz)
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
  ) values
    (v_intv_sql_sprint, v_org_institution, 'training_support',
     'SQL Practice Sprint – Analytics Readiness',
     'Only 39% of students have recorded SQL evidence. Industry readiness benchmarks require SQL at intermediate level.',
     'Host a 2-week SQL practice sprint with daily exercises, peer review, and a final assessed scenario.',
     'Pre-final-year students without intermediate SQL evidence in their passport',
     v_actor_inst_admin, v_actor_inst_admin, 'draft',
     'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
     'evidence_coverage_rate', '{"skillCategory": "sql"}'::jsonb,
     31, 80, 80, 'descriptive', v_fingerprint, '2026-09-02'::timestamptz)
  on conflict (id) do nothing;

  v_fingerprint := encode(digest(convert_to(
    '{"organizationId":"f0440000-0000-4000-8000-000000000001","methodologyVersion":"sih26044-skills-intel-v1","windowFrom":"2026-06-01T00:00:00Z","windowTo":"2026-08-31T00:00:00Z","metric":"evidence_coverage_rate","dimensions":{"skillCategory":"research_documentation"},"value":18,"denominator":80,"cohortSize":80,"interpretation":"descriptive"}',
    'UTF8'), 'sha256'), 'hex');

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id, initial_status,
    source_methodology_version, source_generated_at, source_window_from, source_window_to,
    source_metric, source_dimensions, source_value, source_denominator, source_cohort_size,
    source_interpretation, source_point_fingerprint, created_at
  ) values
    (v_intv_research_workshop, v_org_institution, 'project_clinic',
     'Research Documentation Workshop',
     'Only 23% of students have recorded evidence for research methodology and documentation.',
     'Conduct a half-day workshop on research documentation best practices.',
     'Students applying for research-adjacent internships without research documentation evidence',
     v_actor_inst_admin, v_actor_inst_admin, 'draft',
     'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
     'evidence_coverage_rate', '{"skillCategory": "research_documentation"}'::jsonb,
     18, 80, 80, 'descriptive', v_fingerprint, '2026-09-03'::timestamptz)
  on conflict (id) do nothing;

  v_fingerprint := encode(digest(convert_to(
    '{"organizationId":"f0440000-0000-4000-8000-000000000001","methodologyVersion":"sih26044-skills-intel-v1","windowFrom":"2026-06-01T00:00:00Z","windowTo":"2026-08-31T00:00:00Z","metric":"placement_readiness_rate","dimensions":{"programmeYear":"final","track":"data_analytics"},"value":42,"denominator":65,"cohortSize":65,"interpretation":"descriptive"}',
    'UTF8'), 'sha256'), 'hex');

  insert into sih26044.institution_interventions (
    id, organization_id, kind, title, rationale, action_description,
    intended_population_description, owner_actor_id, created_by_actor_id, initial_status,
    source_methodology_version, source_generated_at, source_window_from, source_window_to,
    source_metric, source_dimensions, source_value, source_denominator, source_cohort_size,
    source_interpretation, source_point_fingerprint, created_at
  ) values
    (v_intv_mentoring_cohort, v_org_institution, 'mentoring_cohort',
     'Faculty–Industry Mentoring Cohort – Data Analytics Track',
     'Placement readiness for final-year data analytics students is 65%. A structured 8-week cohort is the most scalable intervention.',
     'Launch the Data Analytics Mentoring Cohort pairing 20 students with 10 industry mentors for 8 weeks.',
     'Final-year students in data analytics track with placement readiness below NEAR_READY threshold',
     v_actor_inst_admin, v_actor_inst_admin, 'draft',
     'sih26044-skills-intel-v1', '2026-09-01'::timestamptz, '2026-06-01'::timestamptz, '2026-08-31'::timestamptz,
     'placement_readiness_rate', '{"programmeYear": "final", "track": "data_analytics"}'::jsonb,
     42, 65, 65, 'descriptive', v_fingerprint, '2026-09-04'::timestamptz)
  on conflict (id) do nothing;

  -- ----------------------------------------------------------------
  -- FINAL COUNTS
  -- ----------------------------------------------------------------
  select count(*) into v_cnt from sih26044.opportunities;
  v_result := jsonb_set(v_result, '{opportunities_total}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.opportunity_requirements;
  v_result := jsonb_set(v_result, '{requirements_total}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.applications;
  v_result := jsonb_set(v_result, '{applications_total}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.application_events
  where application_id = v_app_hist;
  v_result := jsonb_set(v_result, '{historical_app_events}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.outcome_events where id = v_outcome_1;
  v_result := jsonb_set(v_result, '{outcome_loops}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.verification_requests
  where id = v_vreq_data_viz and status = 'requested';
  v_result := jsonb_set(v_result, '{flagship_viz_verification_pending}', to_jsonb(v_cnt));
  select count(*) into v_cnt from sih26044.institution_interventions
  where id in (v_intv_evidence_clinic, v_intv_sql_sprint, v_intv_research_workshop, v_intv_mentoring_cohort);
  v_result := jsonb_set(v_result, '{institution_interventions}', to_jsonb(v_cnt));

  v_result := jsonb_set(v_result, '{status}', '"success"'::jsonb);
  v_result := jsonb_set(v_result, '{message}', '"Phase-2B complete demo ecosystem seeded with legitimate historical outcome loop"'::jsonb);
  return v_result;
end;
$$;

revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2b() from public;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2b() from anon;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2b() from authenticated;
grant execute on function sih26044.seed_controlled_demo_ecosystem_phase2b() to service_role;

comment on function sih26044.seed_controlled_demo_ecosystem_phase2b is
  'PR #88 repair: legitimate historical application lifecycle (Arjun → Live Project → outcome_recorded → project_delivered). All PR #87 fixes preserved. SECURITY DEFINER, service_role only.';
