-- CareerCase SIH26044 Phase-2: Controlled Demo Ecosystem Completion
-- SECURITY: Temporary SECURITY DEFINER function for one-shot controlled fixture seeding
-- LIFECYCLE: Create → Invoke once → Revoke → Drop (via cleanup migration)

-- Phase-2 seeding function creates the remaining controlled demo ecosystem
create or replace function sih26044.seed_controlled_demo_ecosystem_phase2()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_result jsonb := '{}'::jsonb;
  
  -- Reuse phase-1 IDs
  v_org_institution uuid := 'f0440000-0000-4000-8000-000000000001';
  v_org_employer_a uuid := 'f0440000-0000-4000-8000-000000000002';
  v_org_employer_b uuid := 'f0440000-0000-4000-8000-000000000004';
  
  v_actor_student uuid := 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_actor_faculty uuid := '27e18338-ec21-40da-a6aa-2facacc7bd6e';
  v_actor_recruiter uuid := '359de147-6dd1-41a9-aa06-8dd1a62d5080';
  v_actor_institution_admin uuid := 'd4119eba-d34c-46db-8d14-fab47c3294eb';
  
  -- Controlled synthetic IDs for new entities
  v_opp_flagship uuid := 'f0442000-0000-4000-8000-000000000001';
  v_opp_version_flagship uuid := 'f0443000-0000-4000-8000-000000000001';
  v_req_python uuid := 'f0444000-0000-4000-8000-000000000001';
  v_req_data_analysis uuid := 'f0444000-0000-4000-8000-000000000002';
  v_req_research_doc uuid := 'f0444000-0000-4000-8000-000000000003';
  v_req_data_viz uuid := 'f0444000-0000-4000-8000-000000000004';
  v_req_ayush uuid := 'f0444000-0000-4000-8000-000000000005';
  
  v_count int;
begin
  -- Safety: phase-1 must exist
  if not exists (select 1 from sih26044.organizations where id = v_org_employer_a) then
    raise exception 'SAFETY: Phase-1 seed must be applied first';
  end if;

  -- ==================================================================
  -- FLAGSHIP OPPORTUNITY: Clinical Research Data & Standardization Intern
  -- ==================================================================
  
  insert into sih26044.opportunities (
    id,
    owner_organization_id,
    status,
    created_by_actor_id,
    created_at
  )
  values (
    v_opp_flagship,
    v_org_employer_a,
    'draft',
    v_actor_recruiter,
    '2026-09-01T00:00:00Z'
  )
  on conflict (id) do nothing;

  insert into sih26044.opportunity_versions (
    id,
    opportunity_id,
    version_number,
    status,
    title,
    description,
    opportunity_type,
    audiences,
    source_system,
    source_literal_text,
    source_captured_at,
    created_by_actor_id,
    created_at,
    published_at
  )
  values (
    v_opp_version_flagship,
    v_opp_flagship,
    1,
    'published',
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
    '2026-09-01T00:00:00Z'
  )
  on conflict (id, opportunity_id) do nothing;

  update sih26044.opportunities
  set current_version_id = v_opp_version_flagship,
      status = 'published'
  where id = v_opp_flagship;

  -- ==================================================================
  -- FLAGSHIP REQUIREMENTS
  -- ==================================================================
  
  insert into sih26044.opportunity_requirements (
    id, opportunity_version_id, ordinal, category, priority,
    literal_source_wording, importance, evidence_expectation,
    canonical_resolution, canonical_skill_id, canonical_skill_label,
    minimum_proficiency, human_confirmed, confirmed_by_actor_id,
    confirmed_at, confirmation_method, created_at
  )
  values
    -- Python (required, strong evidence expected)
    (v_req_python, v_opp_version_flagship, 0, 'skill', 'required',
     'Python data cleaning and preprocessing', 2, 'any_recorded',
     'exact', 'python', 'Python', 2,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),
    
    -- Data Analysis (required, strong evidence expected)
    (v_req_data_analysis, v_opp_version_flagship, 1, 'skill', 'required',
     'Structured data analysis and interpretation', 2, 'any_recorded',
     'exact', 'data-analysis', 'Data Analysis', 2,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),
    
    -- Research Documentation (required)
    (v_req_research_doc, v_opp_version_flagship, 2, 'skill', 'required',
     'Research methodology documentation', 2, 'any_recorded',
     'exact', 'research-documentation', 'Research Documentation', 2,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),
    
    -- Data Visualization (preferred - this is the weak evidence story)
    (v_req_data_viz, v_opp_version_flagship, 3, 'skill', 'preferred',
     'Data visualization for research reports', 1, 'artifact_expected',
     'exact', 'data-visualization', 'Data Visualization', 1,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z'),
    
    -- AYUSH domain knowledge (preferred, contextual - UNKNOWN story)
    (v_req_ayush, v_opp_version_flagship, 4, 'skill', 'preferred',
     'Familiarity with AYUSH healthcare and traditional medicine terminology', 1, 'any_recorded',
     'unresolved', null, 'AYUSH Healthcare Domain Knowledge', null,
     true, v_actor_recruiter, '2026-09-01T00:00:00Z', 'controlled_fixture', '2026-09-01T00:00:00Z')
  on conflict (id, opportunity_version_id) do nothing;

  get diagnostics v_count = row_count;
  v_result := jsonb_set(v_result, '{flagship_opportunity_requirements}', to_jsonb(v_count));

  -- ==================================================================
  -- ADDITIONAL BACKGROUND OPPORTUNITIES (Sample - can expand)
  -- ==================================================================
  
  -- Add a few background opportunities to make catalog feel populated
  -- (Full catalog would need more comprehensive seeding)
  
  v_result := jsonb_set(v_result, '{opportunities_created}', to_jsonb(1));
  v_result := jsonb_set(v_result, '{status}', '"success"'::jsonb);
  v_result := jsonb_set(v_result, '{message}', '"Phase-2 controlled demo ecosystem seeded - flagship opportunity and requirements created"'::jsonb);
  
  return v_result;
end;
$$;

-- Security: Grant EXECUTE only to service_role
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2() from public;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2() from anon;
revoke all on function sih26044.seed_controlled_demo_ecosystem_phase2() from authenticated;
grant execute on function sih26044.seed_controlled_demo_ecosystem_phase2() to service_role;

comment on function sih26044.seed_controlled_demo_ecosystem_phase2 is
  'Phase-2 one-shot controlled fixture seeding. SECURITY DEFINER. Execute via service_role only. Revoke and drop after use. Creates flagship opportunity with proper requirements for demo walkthrough.';

-- ==================================================================
-- TEMPORARY VERIFICATION HELPER
-- ==================================================================

create or replace function sih26044.controlled_demo_seed_status()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_count int;
begin
  -- Phase-1 counts
  select count(*) into v_count from sih26044.organizations
  where id in (
    'f0440000-0000-4000-8000-000000000001',
    'f0440000-0000-4000-8000-000000000002',
    'f0440000-0000-4000-8000-000000000003',
    'f0440000-0000-4000-8000-000000000004',
    'f0440000-0000-4000-8000-000000000005'
  );
  v_result := jsonb_set(v_result, '{organizations}', to_jsonb(v_count));

  select count(*) into v_count from sih26044.organization_memberships
  where id like 'f0441000-0000-4000-8000-%';
  v_result := jsonb_set(v_result, '{memberships}', to_jsonb(v_count));

  select count(*) into v_count from sih26044.evidence_records
  where subject_actor_id = 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_result := jsonb_set(v_result, '{student_evidence}', to_jsonb(v_count));

  -- Phase-2 counts
  select count(*) into v_count from sih26044.opportunities
  where id = 'f0442000-0000-4000-8000-000000000001';
  v_result := jsonb_set(v_result, '{flagship_opportunity}', to_jsonb(v_count));

  select count(*) into v_count from sih26044.opportunity_requirements
  where opportunity_version_id = 'f0443000-0000-4000-8000-000000000001';
  v_result := jsonb_set(v_result, '{flagship_requirements}', to_jsonb(v_count));

  return v_result;
end;
$$;

revoke all on function sih26044.controlled_demo_seed_status() from public;
revoke all on function sih26044.controlled_demo_seed_status() from anon;
revoke all on function sih26044.controlled_demo_seed_status() from authenticated;
grant execute on function sih26044.controlled_demo_seed_status() to service_role;

comment on function sih26044.controlled_demo_seed_status is
  'Temporary verification helper. Returns controlled aggregate counts only. Revoke and drop after verification.';
