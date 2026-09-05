-- Phase-2B verification helper: replace the phase-2A version with comprehensive counts.
-- Returns aggregate controlled-demo entity counts only. No private content.
-- service_role EXECUTE only. Temporary — revoke and drop after production validation.

create or replace function sih26044.controlled_demo_seed_status()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_cnt int;
begin
  -- Organizations
  select count(*) into v_cnt from sih26044.organizations
  where id in (
    'f0440000-0000-4000-8000-000000000001',
    'f0440000-0000-4000-8000-000000000002',
    'f0440000-0000-4000-8000-000000000003',
    'f0440000-0000-4000-8000-000000000004',
    'f0440000-0000-4000-8000-000000000005'
  );
  v_result := jsonb_set(v_result, '{organizations}', to_jsonb(v_cnt));

  -- Memberships
  select count(*) into v_cnt from sih26044.organization_memberships
  where id like 'f0441000-0000-4000-8000-%'
     or id like 'f044c001-0000-4000-8000-%';
  v_result := jsonb_set(v_result, '{memberships}', to_jsonb(v_cnt));

  -- Flagship student evidence
  select count(*) into v_cnt from sih26044.evidence_records
  where subject_actor_id = 'ef04e316-39b6-4641-8d18-f3564c00f144';
  v_result := jsonb_set(v_result, '{student_evidence}', to_jsonb(v_cnt));

  -- Synthetic candidate actors
  select count(*) into v_cnt from sih26044.actors
  where id in (
    'f044c000-0000-4000-8000-000000000001',
    'f044c000-0000-4000-8000-000000000002',
    'f044c000-0000-4000-8000-000000000003',
    'f044c000-0000-4000-8000-000000000004',
    'f044c000-0000-4000-8000-000000000005',
    'f044c000-0000-4000-8000-000000000006'
  );
  v_result := jsonb_set(v_result, '{synthetic_candidates}', to_jsonb(v_cnt));

  -- Opportunities total (all controlled)
  select count(*) into v_cnt from sih26044.opportunities
  where id in (
    'f0442000-0000-4000-8000-000000000001',
    'f0445000-0000-4000-8000-000000000002',
    'f0445000-0000-4000-8000-000000000003',
    'f0445000-0000-4000-8000-000000000004',
    'f0445000-0000-4000-8000-000000000005',
    'f0445000-0000-4000-8000-000000000006',
    'f0445000-0000-4000-8000-000000000007',
    'f0445000-0000-4000-8000-000000000008',
    'f0445000-0000-4000-8000-000000000009',
    'f0445000-0000-4000-8000-000000000010',
    'f0445000-0000-4000-8000-000000000011',
    'f0445000-0000-4000-8000-000000000012',
    'f0445000-0000-4000-8000-000000000013',
    'f0445000-0000-4000-8000-000000000014'
  );
  v_result := jsonb_set(v_result, '{opportunities}', to_jsonb(v_cnt));

  -- Opportunity versions
  select count(*) into v_cnt from sih26044.opportunity_versions
  where id in (
    'f0443000-0000-4000-8000-000000000001',
    'f0446000-0000-4000-8000-000000000002',
    'f0446000-0000-4000-8000-000000000003',
    'f0446000-0000-4000-8000-000000000004',
    'f0446000-0000-4000-8000-000000000005',
    'f0446000-0000-4000-8000-000000000006',
    'f0446000-0000-4000-8000-000000000007',
    'f0446000-0000-4000-8000-000000000008',
    'f0446000-0000-4000-8000-000000000009',
    'f0446000-0000-4000-8000-000000000010',
    'f0446000-0000-4000-8000-000000000011',
    'f0446000-0000-4000-8000-000000000012',
    'f0446000-0000-4000-8000-000000000013',
    'f0446000-0000-4000-8000-000000000014'
  );
  v_result := jsonb_set(v_result, '{opportunity_versions}', to_jsonb(v_cnt));

  -- Requirements total
  select count(*) into v_cnt from sih26044.opportunity_requirements
  where opportunity_version_id in (
    'f0443000-0000-4000-8000-000000000001',
    'f0446000-0000-4000-8000-000000000002',
    'f0446000-0000-4000-8000-000000000003',
    'f0446000-0000-4000-8000-000000000004',
    'f0446000-0000-4000-8000-000000000005',
    'f0446000-0000-4000-8000-000000000006',
    'f0446000-0000-4000-8000-000000000007',
    'f0446000-0000-4000-8000-000000000008',
    'f0446000-0000-4000-8000-000000000009',
    'f0446000-0000-4000-8000-000000000010',
    'f0446000-0000-4000-8000-000000000011',
    'f0446000-0000-4000-8000-000000000012',
    'f0446000-0000-4000-8000-000000000013',
    'f0446000-0000-4000-8000-000000000014'
  );
  v_result := jsonb_set(v_result, '{requirements}', to_jsonb(v_cnt));

  -- Questionnaires
  select count(*) into v_cnt from sih26044.questionnaires
  where id in (
    'f0447000-0000-4000-8000-000000000001',
    'f0447000-0000-4000-8000-000000000002',
    'f0447000-0000-4000-8000-000000000003'
  );
  v_result := jsonb_set(v_result, '{questionnaires}', to_jsonb(v_cnt));

  -- Questionnaire items
  select count(*) into v_cnt from sih26044.questionnaire_questions
  where questionnaire_version_id in (
    'f0448000-0000-4000-8000-000000000001',
    'f0448000-0000-4000-8000-000000000002',
    'f0448000-0000-4000-8000-000000000003'
  );
  v_result := jsonb_set(v_result, '{questionnaire_items}', to_jsonb(v_cnt));

  -- Background applications
  select count(*) into v_cnt from sih26044.applications
  where id in (
    'f0449000-0000-4000-8000-000000000001',
    'f0449000-0000-4000-8000-000000000002',
    'f0449000-0000-4000-8000-000000000003',
    'f0449000-0000-4000-8000-000000000004',
    'f0449000-0000-4000-8000-000000000005'
  );
  v_result := jsonb_set(v_result, '{applications}', to_jsonb(v_cnt));

  -- Application events
  select count(*) into v_cnt from sih26044.application_events
  where application_id in (
    'f0449000-0000-4000-8000-000000000001',
    'f0449000-0000-4000-8000-000000000002',
    'f0449000-0000-4000-8000-000000000003',
    'f0449000-0000-4000-8000-000000000004',
    'f0449000-0000-4000-8000-000000000005'
  );
  v_result := jsonb_set(v_result, '{application_events}', to_jsonb(v_cnt));

  -- Verification requests
  select count(*) into v_cnt from sih26044.verification_requests
  where id in (
    'f044d000-0000-4000-8000-000000000001',
    'f044d000-0000-4000-8000-000000000002',
    'f044d000-0000-4000-8000-000000000003'
  );
  v_result := jsonb_set(v_result, '{verification_requests}', to_jsonb(v_cnt));

  -- Historical completed attestations (verification_events by faculty)
  select count(*) into v_cnt from sih26044.verification_events
  where verification_request_id in (
    'f044d000-0000-4000-8000-000000000001',
    'f044d000-0000-4000-8000-000000000002'
  );
  v_result := jsonb_set(v_result, '{historical_attestations}', to_jsonb(v_cnt));

  -- Faculty engagements (verification events authored by controlled faculty)
  select count(*) into v_cnt from sih26044.verification_events
  where actor_id = '27e18338-ec21-40da-a6aa-2facacc7bd6e';
  v_result := jsonb_set(v_result, '{faculty_engagements}', to_jsonb(v_cnt));

  -- Collaborations
  select count(*) into v_cnt from sih26044.collaboration_engagements
  where id in (
    'f044a000-0000-4000-8000-000000000001',
    'f044a000-0000-4000-8000-000000000002',
    'f044a000-0000-4000-8000-000000000003',
    'f044a000-0000-4000-8000-000000000004',
    'f044a000-0000-4000-8000-000000000005',
    'f044a000-0000-4000-8000-000000000006'
  );
  v_result := jsonb_set(v_result, '{collaborations}', to_jsonb(v_cnt));

  -- Institution interventions
  select count(*) into v_cnt from sih26044.institution_interventions
  where id in (
    'f044b000-0000-4000-8000-000000000001',
    'f044b000-0000-4000-8000-000000000002',
    'f044b000-0000-4000-8000-000000000003',
    'f044b000-0000-4000-8000-000000000004'
  );
  v_result := jsonb_set(v_result, '{institution_interventions}', to_jsonb(v_cnt));

  -- Outcomes
  select count(*) into v_cnt from sih26044.outcome_events
  where id = 'f044f000-0000-4000-8000-000000000001';
  v_result := jsonb_set(v_result, '{outcomes}', to_jsonb(v_cnt));

  -- Flagship data viz verification (should be 'requested')
  select count(*) into v_cnt from sih26044.verification_requests
  where id = 'f044d000-0000-4000-8000-000000000003' and status = 'requested';
  v_result := jsonb_set(v_result, '{flagship_viz_verification_pending}', to_jsonb(v_cnt));

  return v_result;
end;
$$;

revoke all on function sih26044.controlled_demo_seed_status() from public;
revoke all on function sih26044.controlled_demo_seed_status() from anon;
revoke all on function sih26044.controlled_demo_seed_status() from authenticated;
grant execute on function sih26044.controlled_demo_seed_status() to service_role;

comment on function sih26044.controlled_demo_seed_status is
  'Phase-2B comprehensive verification helper. Aggregate counts only. No private content. Revoke and drop after production validation.';
