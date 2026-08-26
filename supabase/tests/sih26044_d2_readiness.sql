-- Executable D2-A trusted-role/readiness persistence security suite.
begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

create or replace function pg_temp.assert_blocked(command text, message text)
returns void language plpgsql as $$
declare blocked boolean := false;
begin
  begin execute command; exception when others then blocked := true; end;
  if not blocked then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

create or replace function pg_temp.d2_result_body(result_id uuid, actor_id uuid)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'resultId', result_id::text,
    'opportunityId', '50000000-0000-4000-8000-0000000000d1',
    'opportunityVersionId', '51000000-0000-4000-8000-0000000000d1',
    'opportunityVersion', 1,
    'subjectActorId', actor_id::text,
    'engineVersion', 'engine-v1',
    'policyVersion', 'policy-v1',
    'inputVersion', 'input-v1',
    'subjectFactsVersion', 'facts-v1',
    'evidenceProjectionVersion', 'evidence-v1',
    'eligibilityStatus', 'NEEDS_REVIEW',
    'eligibilityRuleResults', '[]'::jsonb,
    'requiredRequirementResults', '[]'::jsonb,
    'preferredRequirementResults', '[]'::jsonb,
    'requiredCoverage', '{"met":0,"total":0}'::jsonb,
    'evidenceCoverage', '{"strong":0,"weak":0,"unknown":0}'::jsonb,
    'verificationCoverage', '{"supported":0,"total":0}'::jsonb,
    'partialCount', 0,
    'gapCount', 0,
    'relevantWorkSamples', 0,
    'learningDistance', 'unknown',
    'readinessBand', 'NEEDS_REVIEW',
    'generatedAt', '2026-08-26T00:00:00Z'
  )
$$;

insert into sih26044.actors (id, display_name) values
  ('20000000-0000-4000-8000-0000000000d1', 'D2 Subject'),
  ('20000000-0000-4000-8000-0000000000d2', 'D2 Other'),
  ('20000000-0000-4000-8000-0000000000d3', 'D2 Author');
insert into sih26044.organizations (id, legal_name, display_name, kind)
values ('30000000-0000-4000-8000-0000000000d1', 'D2 Security Org', 'D2 Security Org', 'employer');
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('50000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d1', 'published', '20000000-0000-4000-8000-0000000000d3');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id, published_at
) values (
  '51000000-0000-4000-8000-0000000000d1', '50000000-0000-4000-8000-0000000000d1', 1,
  'published', 'D2 security role', 'D2 security fixture', 'internship',
  array['student']::sih26044.opportunity_audience[], 'd2_security', statement_timestamp(),
  'D2 security source', '20000000-0000-4000-8000-0000000000d3', statement_timestamp()
);
update sih26044.opportunities set current_version_id = '51000000-0000-4000-8000-0000000000d1'
where id = '50000000-0000-4000-8000-0000000000d1';

select pg_temp.assert_true(
  not has_function_privilege('anon', 'sih26044.persist_trusted_readiness_result(uuid,uuid,uuid,uuid,text,text,text,text,text,sih26044.readiness_band,jsonb,timestamptz)', 'EXECUTE'),
  'anon/PUBLIC must not execute the trusted readiness RPC'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'sih26044.persist_trusted_readiness_result(uuid,uuid,uuid,uuid,text,text,text,text,text,sih26044.readiness_band,jsonb,timestamptz)', 'EXECUTE'),
  'authenticated browser clients must not execute the trusted readiness RPC'
);
select pg_temp.assert_true(
  has_function_privilege('service_role', 'sih26044.persist_trusted_readiness_result(uuid,uuid,uuid,uuid,text,text,text,text,text,sih26044.readiness_band,jsonb,timestamptz)', 'EXECUTE'),
  'only the intended server role receives RPC execution'
);

set local role service_role;
select pg_temp.assert_blocked(
  $command$insert into sih26044.opportunity_readiness_results (
    id, subject_actor_id, opportunity_id, opportunity_version_id, engine_version,
    evidence_policy_version, input_version, subject_facts_version,
    evidence_projection_version, readiness_band, result_body, generated_at
  ) values (
    '70000000-0000-4000-8000-0000000000d0', '20000000-0000-4000-8000-0000000000d1',
    '50000000-0000-4000-8000-0000000000d1', '51000000-0000-4000-8000-0000000000d1',
    'direct', 'direct', 'direct', 'direct', 'direct', 'NEEDS_REVIEW', '{}', statement_timestamp()
  )$command$,
  'service role must not receive direct readiness table INSERT'
);
select pg_temp.assert_blocked(
  $command$insert into sih26044.actors (display_name) values ('Broad mutation')$command$,
  'D2 server privilege must not permit broader custom-schema mutation'
);

select pg_temp.assert_blocked(
  $command$select * from sih26044.persist_trusted_readiness_result(
    '70000000-0000-4000-8000-0000000000d1',
    '20000000-0000-4000-8000-0000000000d2',
    '50000000-0000-4000-8000-0000000000d1',
    '51000000-0000-4000-8000-0000000000d1',
    'engine-v1', 'policy-v1', 'input-v1', 'facts-v1', 'evidence-v1', 'NEEDS_REVIEW',
    pg_temp.d2_result_body('70000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1'),
    '2026-08-26T00:00:00Z'
  )$command$,
  'RPC must reject mismatched actor fields'
);

select * from sih26044.persist_trusted_readiness_result(
  '70000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1',
  '50000000-0000-4000-8000-0000000000d1',
  '51000000-0000-4000-8000-0000000000d1',
  'engine-v1', 'policy-v1', 'input-v1', 'facts-v1', 'evidence-v1', 'NEEDS_REVIEW',
  pg_temp.d2_result_body('70000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1'),
  '2026-08-26T00:00:00Z'
);
select * from sih26044.persist_trusted_readiness_result(
  '70000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1',
  '50000000-0000-4000-8000-0000000000d1',
  '51000000-0000-4000-8000-0000000000d1',
  'engine-v1', 'policy-v1', 'input-v1', 'facts-v1', 'evidence-v1', 'NEEDS_REVIEW',
  pg_temp.d2_result_body('70000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1'),
  '2026-08-26T00:00:00Z'
);
reset role;
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.opportunity_readiness_results where id = '70000000-0000-4000-8000-0000000000d1'),
  'identical trusted requests must remain idempotent'
);
select pg_temp.assert_blocked(
  $command$update sih26044.opportunity_readiness_results set input_version = 'mutated'
    where id = '70000000-0000-4000-8000-0000000000d1'$command$,
  'historical readiness rows remain immutable'
);

rollback;
