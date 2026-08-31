-- Executable SIH26044 employer/opportunity Skills Intelligence privacy assertions.
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

insert into auth.users (id) values
  ('13000000-0000-0000-0000-000000000001'),
  ('13000000-0000-0000-0000-000000000002'),
  ('13000000-0000-0000-0000-000000000003'),
  ('13000000-0000-0000-0000-000000000004'),
  ('13000000-0000-0000-0000-000000000005'),
  ('13000000-0000-0000-0000-000000000006'),
  ('13000000-0000-0000-0000-000000000007'),
  ('13000000-0000-0000-0000-000000000008')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'Industry Analytics Learner 1'),
  ('23000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'Industry Analytics Learner 2'),
  ('23000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000003', 'Industry Analytics Learner 3'),
  ('23000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000004', 'Industry Analytics Learner 4'),
  ('23000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000005', 'Industry Analytics Learner 5'),
  ('23000000-0000-0000-0000-000000000006', '13000000-0000-0000-0000-000000000006', 'Industry Analytics Learner 6'),
  ('23000000-0000-0000-0000-000000000007', '13000000-0000-0000-0000-000000000007', 'Employer Recruiter'),
  ('23000000-0000-0000-0000-000000000008', '13000000-0000-0000-0000-000000000008', 'Outside Recruiter');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('33000000-0000-0000-0000-000000000001', 'Industry Analytics Employer A Pvt Ltd', 'Employer A', 'employer'),
  ('33000000-0000-0000-0000-000000000002', 'Industry Analytics Employer B Pvt Ltd', 'Employer B', 'employer');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('43000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000007', '33000000-0000-0000-0000-000000000001', 'active'),
  ('43000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000008', '33000000-0000-0000-0000-000000000002', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('43000000-0000-0000-0000-000000000001', 'recruiter'),
  ('43000000-0000-0000-0000-000000000002', 'recruiter');

insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('53000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'draft', '23000000-0000-0000-0000-000000000007');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '53100000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 1,
  'draft', 'Industry Analytics Internship', 'Controlled employer analytics test fixture', 'internship',
  array['student']::sih26044.opportunity_audience[], 'local_test', statement_timestamp(),
  'Controlled employer analytics test fixture', '23000000-0000-0000-0000-000000000007'
);
insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution,
  canonical_skill_id, canonical_skill_label, human_confirmed,
  confirmed_by_actor_id, confirmed_at, confirmation_method,
  resolution_status, resolution_suggestions
) values (
  '53200000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 0,
  'skill', 'required', 'SQL querying', 3, 'artifact_expected', false, 'exact',
  'sql-querying', 'SQL Querying', true, '23000000-0000-0000-0000-000000000007',
  statement_timestamp(), 'structured_human_entry', 'resolved', '[]'::jsonb
);

set local role authenticated;
set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000007';
select sih26044.publish_opportunity_version('53100000-0000-0000-0000-000000000001');
reset role;

insert into sih26044.opportunity_readiness_results (
  id, subject_actor_id, opportunity_id, opportunity_version_id,
  engine_version, evidence_policy_version, input_version,
  subject_facts_version, evidence_projection_version,
  readiness_band, result_body, generated_at
) values
  ('63000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-1', 'facts-1', 'projection-1', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('63000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-2', 'facts-2', 'projection-2', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('63000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000003', '53000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-3', 'facts-3', 'projection-3', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('63000000-0000-0000-0000-000000000004', '23000000-0000-0000-0000-000000000004', '53000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-4', 'facts-4', 'projection-4', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('63000000-0000-0000-0000-000000000005', '23000000-0000-0000-0000-000000000005', '53000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-5', 'facts-5', 'projection-5', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('63000000-0000-0000-0000-000000000006', '23000000-0000-0000-0000-000000000006', '53000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001', 'engine-test', 'policy-test', 'input-6', 'facts-6', 'projection-6', 'BUILDING_EVIDENCE', '{"eligibilityStatus":"NEEDS_REVIEW","requiredRequirementResults":[{"state":"GAP"}]}'::jsonb, statement_timestamp() - interval '2 days');

-- Purpose-specific analytics consent is distinct from recruiter application-review consent.
insert into sih26044.consent_grants (
  id, subject_actor_id, grantee_organization_id, purpose, created_by_actor_id
) values
  ('73000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'aggregate_analytics', '23000000-0000-0000-0000-000000000001'),
  ('73000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001', 'aggregate_analytics', '23000000-0000-0000-0000-000000000002'),
  ('73000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000001', 'aggregate_analytics', '23000000-0000-0000-0000-000000000003'),
  ('73000000-0000-0000-0000-000000000004', '23000000-0000-0000-0000-000000000004', '33000000-0000-0000-0000-000000000001', 'aggregate_analytics', '23000000-0000-0000-0000-000000000004'),
  ('73000000-0000-0000-0000-000000000005', '23000000-0000-0000-0000-000000000005', '33000000-0000-0000-0000-000000000001', 'aggregate_analytics', '23000000-0000-0000-0000-000000000005'),
  ('73000000-0000-0000-0000-000000000006', '23000000-0000-0000-0000-000000000006', '33000000-0000-0000-0000-000000000001', 'aggregate_analytics', '23000000-0000-0000-0000-000000000006');

-- Six submitted applications, each bound to one exact finalized snapshot.
do $$
declare
  i integer;
  actor uuid;
  readiness uuid;
  application uuid;
  snapshot uuid;
  band text;
  state text;
  eligibility text;
begin
  for i in 1..6 loop
    actor := ('23000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    readiness := ('63000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    application := ('83000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    snapshot := ('93000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    band := case when i <= 5 then 'NEAR_READY' else 'BUILDING_EVIDENCE' end;
    state := case when i <= 5 then 'MET_WEAK_EVIDENCE' else 'GAP' end;
    eligibility := case when i <= 5 then 'ELIGIBLE' else 'NEEDS_REVIEW' end;

    insert into sih26044.applications (
      id, applicant_actor_id, opportunity_id, opportunity_version_id,
      owner_organization_id, initial_stage, created_at
    ) values (
      application, actor, '53000000-0000-0000-0000-000000000001',
      '53100000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001',
      'saved', statement_timestamp() - interval '1 day'
    );

    insert into sih26044.application_snapshots (
      id, application_id, opportunity_version_id, readiness_result_id,
      engine_version, evidence_policy_version, input_version,
      subject_facts_version, evidence_projection_version, recruiter_projection_version,
      recruiter_allowlist_projection, requirement_responses, captured_at,
      integrity_fingerprint, finalized_at
    ) values (
      snapshot, application, '53100000-0000-0000-0000-000000000001', readiness,
      'engine-test', 'policy-test', 'input-' || i, 'facts-' || i, 'projection-' || i,
      'recruiter-projection-test',
      jsonb_build_object(
        'applicant', jsonb_build_object('displayName', 'Consented Applicant'),
        'applicationId', application::text,
        'applicationSnapshotId', snapshot::text,
        'applicationStage', 'applied',
        'consentRecordId', ('73000000-0000-0000-0000-' || lpad(i::text, 12, '0')),
        'educationSummary', 'Purpose-minimized test summary',
        'evidence', jsonb_build_array(),
        'opportunityId', '53000000-0000-0000-0000-000000000001',
        'opportunityVersionId', '53100000-0000-0000-0000-000000000001',
        'readinessBand', band,
        'readinessResultId', readiness::text,
        'requirements', jsonb_build_array(jsonb_build_object(
          'requirementId', '53200000-0000-0000-0000-000000000001',
          'literalSourceWording', 'SQL querying',
          'priority', 'required',
          'state', state,
          'supportingEvidenceIds', jsonb_build_array()
        )),
        'sharedWorkSamples', jsonb_build_array()
      ),
      '{}'::jsonb,
      statement_timestamp() - interval '1 day',
      repeat(substr(md5(i::text), 1, 1), 64),
      statement_timestamp() - interval '1 day'
    );

    insert into sih26044.application_events (
      application_id, from_stage, to_stage, event_kind, actor_id,
      application_snapshot_id, note, occurred_at
    ) values (
      application, 'saved', 'applied', 'stage_transition', actor,
      snapshot, 'Exact immutable test submission', statement_timestamp() - interval '12 hours'
    );
  end loop;
end
$$;

-- Extra finalized snapshot for learner 1 is newer but is NOT the submitted snapshot.
-- Analytics must never infer submission authority from recency.
insert into sih26044.application_snapshots (
  id, application_id, opportunity_version_id, readiness_result_id,
  engine_version, evidence_policy_version, input_version,
  subject_facts_version, evidence_projection_version, recruiter_projection_version,
  recruiter_allowlist_projection, requirement_responses, captured_at,
  integrity_fingerprint, finalized_at
) values (
  '93000000-0000-0000-0000-000000000099', '83000000-0000-0000-0000-000000000001',
  '53100000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001',
  'engine-test', 'policy-test', 'input-1', 'facts-1', 'projection-1', 'recruiter-projection-test',
  jsonb_build_object(
    'applicant', jsonb_build_object('displayName', 'Unsubmitted Newer Snapshot'),
    'applicationId', '83000000-0000-0000-0000-000000000001',
    'applicationSnapshotId', '93000000-0000-0000-0000-000000000099',
    'applicationStage', 'applied',
    'consentRecordId', '73000000-0000-0000-0000-000000000001',
    'educationSummary', 'Must not influence analytics',
    'evidence', jsonb_build_array(),
    'opportunityId', '53000000-0000-0000-0000-000000000001',
    'opportunityVersionId', '53100000-0000-0000-0000-000000000001',
    'readinessBand', 'READY_FOR_REVIEW',
    'readinessResultId', '63000000-0000-0000-0000-000000000001',
    'requirements', jsonb_build_array(),
    'sharedWorkSamples', jsonb_build_array()
  ),
  '{}'::jsonb, statement_timestamp(), repeat('f', 64), statement_timestamp()
);

set local role authenticated;
set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000007';

select pg_temp.assert_true(
  exists (
    select 1 from sih26044.list_authorized_industry_analytics_organizations()
    where organization_id = '33000000-0000-0000-0000-000000000001'
      and access_mode = 'recruiter'
  ),
  'recruiter can list its own employer aggregate scope'
);
select pg_temp.assert_true(
  exists (
    select 1 from sih26044.list_authorized_industry_analytics_opportunities('33000000-0000-0000-0000-000000000001')
    where opportunity_version_id = '53100000-0000-0000-0000-000000000001'
  ),
  'recruiter can list exact published opportunity versions in its employer scope'
);

select pg_temp.assert_true(
  (sih26044.get_industry_skills_intelligence(
    '33000000-0000-0000-0000-000000000001', null,
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
  ) -> 'cohort' ->> 'size')::integer = 6,
  'six actively consented submitted applicants form the reportable employer cohort'
);
select pg_temp.assert_true(
  (
    jsonb_path_query_first(
      sih26044.get_industry_skills_intelligence(
        '33000000-0000-0000-0000-000000000001', null,
        statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
      ),
      '$.points[*] ? (@.metric == "readiness_distribution" && @.dimensions.readinessBand == "NEAR_READY")'
    ) ->> 'value'
  )::integer = 5,
  'exact submitted snapshot binding yields five NEAR_READY applicants and ignores newer unsubmitted snapshot material'
);
select pg_temp.assert_true(
  jsonb_path_query_first(
    sih26044.get_industry_skills_intelligence(
      '33000000-0000-0000-0000-000000000001', null,
      statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
    ),
    '$.points[*] ? (@.metric == "readiness_distribution" && @.dimensions.readinessBand == "BUILDING_EVIDENCE")'
  ) @> '{"suppressed":true,"value":null,"denominator":null,"cohortSize":null,"suppressionReason":"below_minimum_cell_size"}'::jsonb,
  'singleton readiness cell is structurally suppressed'
);
select pg_temp.assert_true(
  (
    jsonb_path_query_first(
      sih26044.get_industry_skills_intelligence(
        '33000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001',
        statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
      ),
      '$.points[*] ? (@.metric == "application_count")'
    ) ->> 'value'
  )::integer = 6,
  'exact opportunity-version analytics reports the consented submitted application count'
);
select pg_temp.assert_true(
  (sih26044.get_industry_skills_intelligence(
    '33000000-0000-0000-0000-000000000001', '53100000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
  ) -> 'query' ->> 'opportunityVersionId') = '53100000-0000-0000-0000-000000000001',
  'analytics response preserves the exact selected opportunity-version scope'
);
select pg_temp.assert_true(
  not sih26044.has_prohibited_json_keys(
    sih26044.get_industry_skills_intelligence(
      '33000000-0000-0000-0000-000000000001', null,
      statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
    )
  ),
  'employer aggregate result contains no prohibited private guidance or high-stakes keys'
);
select pg_temp.assert_true(
  sih26044.get_industry_skills_intelligence(
    '33000000-0000-0000-0000-000000000001', null,
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
  )::text not like '%23000000-0000-0000-0000-000000000001%',
  'employer aggregate result exposes no learner identifier'
);
select pg_temp.assert_true(
  sih26044.get_industry_skills_intelligence(
    '33000000-0000-0000-0000-000000000001', null,
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
  )::text not like '%83000000-0000-0000-0000-000000000001%',
  'employer aggregate result exposes no application identifier'
);
select pg_temp.assert_true(
  not jsonb_path_exists(
    sih26044.get_industry_skills_intelligence(
      '33000000-0000-0000-0000-000000000001', null,
      statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
    ),
    '$.points[*] ? (@.causalClaimed != false)'
  ),
  'all employer aggregate points remain explicitly non-causal'
);
select pg_temp.assert_blocked(
  'select id from sih26044.opportunity_readiness_results',
  'recruiter cannot use industry analytics authority to read individual readiness rows'
);
reset role;

-- Withdrawing optional analytics consent excludes that subject independently of application submission.
set local role authenticated;
set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000006';
insert into sih26044.consent_lifecycle_events (consent_grant_id, action, actor_id, reason)
values ('73000000-0000-0000-0000-000000000006', 'withdrawn', '23000000-0000-0000-0000-000000000006', 'Controlled test withdrawal');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000007';
select pg_temp.assert_true(
  (sih26044.get_industry_skills_intelligence(
    '33000000-0000-0000-0000-000000000001', null,
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
  ) -> 'cohort' ->> 'size')::integer = 5,
  'withdrawn aggregate analytics consent excludes the subject while leaving a reportable cohort'
);
select pg_temp.assert_true(
  (
    jsonb_path_query_first(
      sih26044.get_industry_skills_intelligence(
        '33000000-0000-0000-0000-000000000001', null,
        statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
      ),
      '$.points[*] ? (@.metric == "readiness_distribution" && @.dimensions.readinessBand == "NEAR_READY")'
    ) ->> 'value'
  )::integer = 5,
  'remaining reportable aggregate is recomputed after consent withdrawal'
);
reset role;

-- A recruiter from another employer has no cross-tenant aggregate authority.
set local role authenticated;
set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000008';
select pg_temp.assert_blocked(
  $$select * from sih26044.get_industry_skills_intelligence(
    '33000000-0000-0000-0000-000000000001', null,
    statement_timestamp() - interval '30 days', statement_timestamp() + interval '1 hour'
  )$$,
  'recruiter cannot read another employer aggregate'
);
select pg_temp.assert_blocked(
  $$select * from sih26044.list_authorized_industry_analytics_opportunities('33000000-0000-0000-0000-000000000001')$$,
  'recruiter cannot list another employer opportunity analytics scope'
);
reset role;

select pg_temp.assert_true(
  exists (
    select 1 from sih26044.audit_events
    where action = 'analytics.industry_aggregate_viewed'
      and organization_id = '33000000-0000-0000-0000-000000000001'
      and purpose = 'aggregate_analytics'
  ),
  'employer aggregate reads create authoritative audit events'
);
select pg_temp.assert_true(
  not exists (
    select 1 from sih26044.audit_events
    where action = 'analytics.industry_aggregate_viewed'
      and metadata::text ~* '(subjectActorId|applicantActorId|applicationId|evidenceRecordId|riasec|work_values|private_aspirations)'
  ),
  'industry analytics audit metadata remains minimized and contains no individual/private payload'
);

rollback;
