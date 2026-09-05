-- One-shot controlled fixture seeding for SIH26044 production demo
-- SECURITY: This function is intentionally privileged and temporary
-- LIFECYCLE: Create → Invoke once → Revoke → Drop (in cleanup migration)

create or replace function sih26044.seed_controlled_demo_ecosystem()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_org_institution uuid := 'f0440000-0000-4000-8000-000000000001';
  v_org_employer_a uuid := 'f0440000-0000-4000-8000-000000000002';
  v_org_issuer uuid := 'f0440000-0000-4000-8000-000000000003';
  v_org_employer_b uuid := 'f0440000-0000-4000-8000-000000000004';
  v_org_government uuid := 'f0440000-0000-4000-8000-000000000005';
  
  v_actor_student uuid := 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_actor_faculty uuid := '27e18338-ec21-40da-a6aa-2facacc7bd6e';
  v_actor_recruiter uuid := '359de147-6dd1-41a9-aa06-8dd1a62d5080';
  v_actor_recruiter_b uuid := '471ebf1a-4758-4388-ac71-6734d9c3e967';
  v_actor_institution_admin uuid := 'd4119eba-d34c-46db-8d14-fab47c3294eb';
  v_actor_policy uuid := '59beb5f1-2587-4d70-bd1d-ddcf495ca9ec';
  v_actor_issuer uuid := 'b8fb3728-9e81-4254-9070-41ada1967444';
  
  v_membership_student uuid := 'f0441000-0000-4000-8000-000000000001';
  v_membership_faculty uuid := 'f0441000-0000-4000-8000-000000000002';
  v_membership_issuer uuid := 'f0441000-0000-4000-8000-000000000003';
  v_membership_recruiter uuid := 'f0441000-0000-4000-8000-000000000004';
  v_membership_recruiter_b uuid := 'f0441000-0000-4000-8000-000000000005';
  v_membership_institution_admin uuid := 'f0441000-0000-4000-8000-000000000006';
  v_membership_policy uuid := 'f0441000-0000-4000-8000-000000000007';
  
  v_org_count int;
  v_membership_count int;
  v_role_count int;
  v_evidence_count int;
begin
  -- Safety check: actors must already exist (created via bootstrap_student_actor)
  if not exists (select 1 from sih26044.actors where id = v_actor_student) then
    raise exception 'SAFETY: Controlled student actor does not exist. Run bootstrap first.';
  end if;

  -- 1. Organizations (idempotent upsert)
  insert into sih26044.organizations (id, legal_name, display_name, kind, status, created_at)
  values
    (v_org_institution, 'Controlled SIH Test Institute A', 'Controlled Test Institute A', 'educational_institution', 'active', '2026-01-01'::timestamptz),
    (v_org_employer_a, 'Pravaah Health Systems', 'Pravaah Health Systems', 'employer', 'active', '2026-01-01'::timestamptz),
    (v_org_issuer, 'Controlled SIH Test Issuer A', 'Controlled Test Issuer A', 'verification_issuer', 'active', '2026-01-01'::timestamptz),
    (v_org_employer_b, 'Meridian Analytics Labs', 'Meridian Analytics Labs', 'employer', 'active', '2026-01-01'::timestamptz),
    (v_org_government, 'Controlled SIH Government Program A', 'Controlled Government Program A', 'government', 'active', '2026-01-01'::timestamptz)
  on conflict (id) do update set
    status = excluded.status,
    display_name = excluded.display_name;

  get diagnostics v_org_count = row_count;
  v_result := jsonb_set(v_result, '{organizations}', to_jsonb(v_org_count));

  -- 2. Organization Memberships
  insert into sih26044.organization_memberships (id, actor_id, organization_id, status, valid_from, valid_until, created_at)
  values
    (v_membership_student, v_actor_student, v_org_institution, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz),
    (v_membership_faculty, v_actor_faculty, v_org_institution, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz),
    (v_membership_issuer, v_actor_issuer, v_org_issuer, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz),
    (v_membership_recruiter, v_actor_recruiter, v_org_employer_a, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz),
    (v_membership_recruiter_b, v_actor_recruiter_b, v_org_employer_b, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz),
    (v_membership_institution_admin, v_actor_institution_admin, v_org_institution, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz),
    (v_membership_policy, v_actor_policy, v_org_government, 'active', '2026-01-01'::timestamptz, null, '2026-01-01'::timestamptz)
  on conflict (id) do update set
    status = excluded.status;

  get diagnostics v_membership_count = row_count;
  v_result := jsonb_set(v_result, '{memberships}', to_jsonb(v_membership_count));

  -- 3. Organization Membership Roles
  insert into sih26044.organization_membership_roles (membership_id, role)
  values
    (v_membership_student, 'learner'),
    (v_membership_faculty, 'faculty'),
    (v_membership_issuer, 'issuer_verifier'),
    (v_membership_recruiter, 'recruiter'),
    (v_membership_recruiter_b, 'recruiter'),
    (v_membership_institution_admin, 'institution_admin'),
    (v_membership_policy, 'policy_program_analyst')
  on conflict (membership_id, role) do nothing;

  get diagnostics v_role_count = row_count;
  v_result := jsonb_set(v_result, '{roles}', to_jsonb(v_role_count));

  -- 4. Evidence Records for Student
  insert into sih26044.evidence_records (
    subject_actor_id, literal_claim, provenance, initial_verification_state, proposal_source,
    scope_kind, scope_literal_skill_label, source_system, source_captured_at, visibility
  )
  values
    (v_actor_student, 'Python data cleaning and preprocessing for healthcare datasets', 'self_declared', 'unverified', null, 'global_skill', 'Python', 'career_passport', '2026-08-15'::timestamptz, 'private'),
    (v_actor_student, 'SQL query optimization and database design fundamentals', 'self_declared', 'unverified', null, 'global_skill', 'SQL', 'career_passport', '2026-08-15'::timestamptz, 'private'),
    (v_actor_student, 'Created Sales Analytics Dashboard with interactive visualization layer', 'self_declared', 'proposed', 'user_entry', 'global_skill', 'Data Visualization', 'evidence_ledger', '2026-09-01'::timestamptz, 'private'),
    (v_actor_student, 'Documented research methodology and data collection protocol for health data project', 'self_declared', 'unverified', null, 'global_skill', 'Research Documentation', 'career_passport', '2026-08-20'::timestamptz, 'private'),
    (v_actor_student, 'Excel pivot tables, VLOOKUP, and data analysis for business reports', 'self_declared', 'unverified', null, 'global_skill', 'Excel', 'career_passport', '2026-08-15'::timestamptz, 'private'),
    (v_actor_student, 'Git version control, branching workflows, collaborative development', 'self_declared', 'unverified', null, 'global_skill', 'Git/GitHub', 'career_passport', '2026-08-15'::timestamptz, 'private'),
    (v_actor_student, 'Statistical hypothesis testing and confidence interval calculation', 'self_declared', 'unverified', null, 'global_skill', 'Statistics', 'career_passport', '2026-08-18'::timestamptz, 'private'),
    (v_actor_student, 'Team hackathon: built data pipeline for e-commerce analytics', 'self_declared', 'unverified', null, 'global_skill', 'Teamwork', 'career_passport', '2026-07-10'::timestamptz, 'private'),
    (v_actor_student, 'Structured data analysis: cleaned and analyzed survey responses dataset', 'assessed', 'human_verified', null, 'global_skill', 'Data Analysis', 'assessment_platform', '2026-07-25'::timestamptz, 'private'),
    (v_actor_student, 'Presented research findings to faculty panel with clear visual aids', 'self_declared', 'unverified', null, 'global_skill', 'Presentation', 'career_passport', '2026-08-05'::timestamptz, 'private')
  on conflict do nothing;

  get diagnostics v_evidence_count = row_count;
  v_result := jsonb_set(v_result, '{evidence_records}', to_jsonb(v_evidence_count));

  v_result := jsonb_set(v_result, '{status}', '"success"'::jsonb);
  v_result := jsonb_set(v_result, '{message}', '"Controlled demo ecosystem seeded"'::jsonb);
  
  return v_result;
end;
$$;

-- Security: Grant EXECUTE only to service_role
revoke all on function sih26044.seed_controlled_demo_ecosystem() from public;
revoke all on function sih26044.seed_controlled_demo_ecosystem() from anon;
revoke all on function sih26044.seed_controlled_demo_ecosystem() from authenticated;
grant execute on function sih26044.seed_controlled_demo_ecosystem() to service_role;

-- Verification queries for post-invocation
comment on function sih26044.seed_controlled_demo_ecosystem is
  'One-shot controlled fixture seeding. SECURITY DEFINER. Execute via service_role only. Revoke and drop after use.';
