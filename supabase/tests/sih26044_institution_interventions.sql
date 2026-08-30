-- Executable SIH26044 institutional intervention lifecycle/privacy assertions.
-- Run after all migrations on a disposable local database. Transactional.

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

create or replace function pg_temp.assert_blocked(command text, message text)
returns void language plpgsql as $$
declare
  affected_rows bigint := 0;
  blocked boolean := false;
begin
  begin
    execute command;
    get diagnostics affected_rows = row_count;
    blocked := affected_rows = 0;
  exception when others then
    blocked := true;
  end;
  if not blocked then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

-- Six learners make one reportable readiness cell (n=5) and one suppressed cell (n=1).
-- Additional actors exercise institution-admin, policy-analyst, and recruiter boundaries.
insert into auth.users (id) values
  ('12000000-0000-0000-0000-000000000001'),
  ('12000000-0000-0000-0000-000000000002'),
  ('12000000-0000-0000-0000-000000000003'),
  ('12000000-0000-0000-0000-000000000004'),
  ('12000000-0000-0000-0000-000000000005'),
  ('12000000-0000-0000-0000-000000000006'),
  ('12000000-0000-0000-0000-000000000007'),
  ('12000000-0000-0000-0000-000000000008'),
  ('12000000-0000-0000-0000-000000000009')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Intervention Learner 1'),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'Intervention Learner 2'),
  ('22000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', 'Intervention Learner 3'),
  ('22000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', 'Intervention Learner 4'),
  ('22000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000005', 'Intervention Learner 5'),
  ('22000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000006', 'Intervention Learner 6'),
  ('22000000-0000-0000-0000-000000000007', '12000000-0000-0000-0000-000000000007', 'Institution Intervention Owner'),
  ('22000000-0000-0000-0000-000000000008', '12000000-0000-0000-0000-000000000008', 'Aggregate Policy Analyst'),
  ('22000000-0000-0000-0000-000000000009', '12000000-0000-0000-0000-000000000009', 'Opportunity Recruiter');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('32000000-0000-0000-0000-000000000001', 'Intervention Test Institute', 'Intervention Test Institute', 'educational_institution'),
  ('32000000-0000-0000-0000-000000000002', 'Intervention Policy Office', 'Intervention Policy Office', 'government'),
  ('32000000-0000-0000-0000-000000000003', 'Intervention Employer Pvt Ltd', 'Intervention Employer', 'employer');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('42000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000003', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000004', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-000000000005', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000006', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000007', '22000000-0000-0000-0000-000000000007', '32000000-0000-0000-0000-000000000001', 'active'),
  ('42000000-0000-0000-0000-000000000008', '22000000-0000-0000-0000-000000000008', '32000000-0000-0000-0000-000000000002', 'active'),
  ('42000000-0000-0000-0000-000000000009', '22000000-0000-0000-0000-000000000009', '32000000-0000-0000-0000-000000000003', 'active');

insert into sih26044.organization_membership_roles (membership_id, role) values
  ('42000000-0000-0000-0000-000000000001', 'learner'),
  ('42000000-0000-0000-0000-000000000002', 'learner'),
  ('42000000-0000-0000-0000-000000000003', 'learner'),
  ('42000000-0000-0000-0000-000000000004', 'learner'),
  ('42000000-0000-0000-0000-000000000005', 'learner'),
  ('42000000-0000-0000-0000-000000000006', 'learner'),
  ('42000000-0000-0000-0000-000000000007', 'institution_admin'),
  ('42000000-0000-0000-0000-000000000008', 'policy_program_analyst'),
  ('42000000-0000-0000-0000-000000000009', 'recruiter');

-- Author and publish one opportunity so readiness rows use the production immutable version contract.
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('52000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000003', 'draft', '22000000-0000-0000-0000-000000000009');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '52100000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 1,
  'draft', 'Institution Intervention Internship', 'Controlled intervention test fixture', 'internship',
  array['student']::sih26044.opportunity_audience[], 'local_test', statement_timestamp(),
  'Controlled intervention test fixture', '22000000-0000-0000-0000-000000000009'
);
insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution,
  canonical_skill_id, canonical_skill_label, human_confirmed,
  confirmed_by_actor_id, confirmed_at, confirmation_method,
  resolution_status, resolution_suggestions
) values (
  '52200000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 0,
  'skill', 'required', 'SQL querying', 3, 'artifact_expected', false, 'exact',
  'sql-querying', 'SQL Querying', true, '22000000-0000-0000-0000-000000000009',
  statement_timestamp(), 'structured_human_entry', 'resolved', '[]'::jsonb
);
set local role authenticated;
set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000009';
select sih26044.publish_opportunity_version('52100000-0000-0000-0000-000000000001');
reset role;

insert into sih26044.opportunity_readiness_results (
  id, subject_actor_id, opportunity_id, opportunity_version_id,
  engine_version, evidence_policy_version, input_version,
  subject_facts_version, evidence_projection_version,
  readiness_band, result_body, generated_at
) values
  ('62000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-1', 'facts-1', 'projection-1', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('62000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-2', 'facts-2', 'projection-2', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('62000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000003', '52000000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-3', 'facts-3', 'projection-3', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('62000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-4', 'facts-4', 'projection-4', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('62000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-000000000005', '52000000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-5', 'facts-5', 'projection-5', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('62000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000006', '52000000-0000-0000-0000-000000000001', '52100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-6', 'facts-6', 'projection-6', 'BUILDING_EVIDENCE', '{"eligibilityStatus":"NEEDS_REVIEW","requiredRequirementResults":[{"state":"GAP"}]}'::jsonb, statement_timestamp() - interval '2 days');

create temporary table created_intervention(id uuid) on commit drop;
create temporary table created_followup(id uuid) on commit drop;
grant select, insert on created_intervention to authenticated;
grant select, insert on created_followup to authenticated;

-- Institution admin can create only from a reportable aggregate point.
set local role authenticated;
set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000007';
insert into created_intervention(id)
select sih26044.create_institution_intervention(
  '32000000-0000-0000-0000-000000000001',
  'evidence_clinic',
  'SQL evidence clinic',
  'A reportable readiness cell shows recurring weak evidence support.',
  'Run a cohort work-sample clinic and structured evidence review session.',
  'Learners represented by the reportable NEAR_READY aggregate cell',
  statement_timestamp() - interval '30 days',
  statement_timestamp() + interval '1 hour',
  'institution-skills-intelligence-v1',
  'readiness_distribution',
  '{"readinessBand":"NEAR_READY"}'::jsonb
);

select pg_temp.assert_true(
  exists (
    select 1
    from sih26044.institution_interventions i
    join created_intervention c on c.id = i.id
    where i.organization_id = '32000000-0000-0000-0000-000000000001'
      and i.owner_actor_id = '22000000-0000-0000-0000-000000000007'
      and i.source_value = 5
      and i.source_cohort_size = 5
      and i.source_point_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  'institution-admin creation stores server-recomputed reportable source provenance'
);
select pg_temp.assert_true(
  (select sih26044.current_institution_intervention_status(id) from created_intervention) = 'draft',
  'new intervention begins in draft state'
);
select pg_temp.assert_blocked(
  $$select sih26044.create_institution_intervention(
    '32000000-0000-0000-0000-000000000001', 'training_support', 'Hidden-cell action',
    'Do not allow hidden cohorts to seed intervention targeting.', 'No action should be created.',
    'Suppressed aggregate cohort', statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour',
    'institution-skills-intelligence-v1', 'readiness_distribution', '{"readinessBand":"BUILDING_EVIDENCE"}'::jsonb
  )$$,
  'suppressed singleton aggregate cell cannot seed an operational intervention'
);
select pg_temp.assert_blocked(
  $$select sih26044.create_institution_intervention(
    '32000000-0000-0000-0000-000000000001', 'training_support', 'Unsafe target description',
    'Identifier-bearing target descriptions are rejected.', 'No action should be created.',
    'Learner 22000000-0000-0000-0000-000000000001', statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour',
    'institution-skills-intelligence-v1', 'readiness_distribution', '{"readinessBand":"NEAR_READY"}'::jsonb
  )$$,
  'intervention target description cannot carry an individual UUID'
);

select sih26044.append_institution_intervention_event((select id from created_intervention), 'approved', 'Approved by institution owner');
select pg_temp.assert_true(
  (select sih26044.current_institution_intervention_status(id) from created_intervention) = 'approved',
  'explicit human approval advances draft to approved'
);
select sih26044.append_institution_intervention_event((select id from created_intervention), 'active', 'Clinic started');
select pg_temp.assert_true(
  (select sih26044.current_institution_intervention_status(id) from created_intervention) = 'active',
  'explicit human start advances approved to active'
);

insert into created_followup(id)
select sih26044.record_institution_intervention_followup(
  (select id from created_intervention),
  statement_timestamp() - interval '30 days',
  statement_timestamp() + interval '1 hour',
  'descriptive',
  'Observed aggregate at follow-up; no causal inference.'
);
select pg_temp.assert_true(
  exists (
    select 1
    from sih26044.institution_intervention_followups f
    join created_followup c on c.id = f.id
    where f.value = 5
      and f.cohort_size = 5
      and f.suppressed = false
      and f.interpretation = 'descriptive'
      and f.causal_claimed = false
  ),
  'follow-up persists only the authoritative aggregate point and stays explicitly non-causal'
);
select pg_temp.assert_true(
  (sih26044.list_institution_interventions('32000000-0000-0000-0000-000000000001') -> 0 -> 'latestFollowup' ->> 'causalClaimed')::boolean = false,
  'operational list contract exposes non-causal follow-up metadata'
);

select sih26044.append_institution_intervention_event((select id from created_intervention), 'completed', 'Clinic completed');
select pg_temp.assert_true(
  (select sih26044.current_institution_intervention_status(id) from created_intervention) = 'completed',
  'explicit human completion advances active to completed'
);
select pg_temp.assert_blocked(
  format($sql$select sih26044.append_institution_intervention_event('%s', 'active', null)$sql$, (select id from created_intervention)),
  'terminal intervention cannot transition back to active'
);
select pg_temp.assert_blocked(
  format($sql$update sih26044.institution_interventions set title = 'mutated' where id = '%s'$sql$, (select id from created_intervention)),
  'base intervention provenance is immutable'
);
select pg_temp.assert_blocked(
  format($sql$delete from sih26044.institution_intervention_events where intervention_id = '%s'$sql$, (select id from created_intervention)),
  'intervention lifecycle events are append-only'
);
reset role;

-- Government policy/program analyst remains aggregate-only and cannot inspect or operate interventions.
set local role authenticated;
set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000008';
select pg_temp.assert_true(
  (sih26044.get_institution_skills_intelligence(
    '32000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp() + interval '1 hour'
  ) ->> 'accessMode') = 'policy_program_analyst',
  'policy/program analyst retains aggregate Skills Intelligence access'
);
select pg_temp.assert_blocked(
  'select id from sih26044.institution_interventions',
  'policy/program analyst cannot read operational intervention rows'
);
select pg_temp.assert_blocked(
  $$select sih26044.list_institution_interventions('32000000-0000-0000-0000-000000000001')$$,
  'policy/program analyst cannot use operational intervention list RPC'
);
select pg_temp.assert_blocked(
  $$select sih26044.create_institution_intervention(
    '32000000-0000-0000-0000-000000000001', 'mentoring_cohort', 'Policy action',
    'Policy analytics must not create operational actions.', 'No action.', 'Aggregate cohort',
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour',
    'institution-skills-intelligence-v1', 'readiness_distribution', '{"readinessBand":"NEAR_READY"}'::jsonb
  )$$,
  'policy/program analyst cannot create institution intervention'
);
reset role;

-- Recruiter is also outside institution operational authority.
set local role authenticated;
set local "request.jwt.claim.sub" = '12000000-0000-0000-0000-000000000009';
select pg_temp.assert_blocked(
  $$select sih26044.list_institution_interventions('32000000-0000-0000-0000-000000000001')$$,
  'recruiter cannot read institution operational intervention list'
);
reset role;

-- Authoritative audit trail records creation, human lifecycle decisions, and follow-up separately.
select pg_temp.assert_true(
  exists (select 1 from sih26044.audit_events where action = 'institution.intervention_created'),
  'intervention creation is authoritatively audited'
);
select pg_temp.assert_true(
  (select count(*) from sih26044.audit_events where action = 'institution.intervention_status_changed') = 3,
  'each human lifecycle transition is separately audited'
);
select pg_temp.assert_true(
  exists (
    select 1 from sih26044.audit_events
    where action = 'institution.intervention_followup_recorded'
      and metadata @> '{"causalClaimed":false}'::jsonb
  ),
  'follow-up audit explicitly records the non-causal interpretation boundary'
);

rollback;
