-- Executable D2 Foundation trusted-role, privacy, artifact, derivation, snapshot security suite.
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

-- 1. Function privileges checks
select pg_temp.assert_true(
  not has_function_privilege('anon', 'sih26044.persist_trusted_readiness_result(uuid,uuid,uuid,uuid,text,text,text,text,text,sih26044.readiness_band,jsonb,timestamptz,jsonb)', 'EXECUTE'),
  'anon/PUBLIC must not execute the trusted readiness RPC'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'sih26044.persist_trusted_readiness_result(uuid,uuid,uuid,uuid,text,text,text,text,text,sih26044.readiness_band,jsonb,timestamptz,jsonb)', 'EXECUTE'),
  'authenticated browser clients must not execute the trusted readiness RPC'
);
select pg_temp.assert_true(
  has_function_privilege('service_role', 'sih26044.persist_trusted_readiness_result(uuid,uuid,uuid,uuid,text,text,text,text,text,sih26044.readiness_band,jsonb,timestamptz,jsonb)', 'EXECUTE'),
  'only the intended server role receives RPC execution'
);

-- 2. Prohibited key filter verification (Keys blocked vs legitimate text values allowed)
select pg_temp.assert_true(
  sih26044.has_prohibited_json_keys('{"riasec":{"realistic":10}}'::jsonb),
  'has_prohibited_json_keys must detect riasec key'
);
select pg_temp.assert_true(
  sih26044.has_prohibited_json_keys('{"nested":{"work_values":["autonomy"]}}'::jsonb),
  'has_prohibited_json_keys must detect work_values key recursively'
);
select pg_temp.assert_true(
  sih26044.has_prohibited_json_keys('{"nested":{"privateAspirations":"secret"}}'::jsonb),
  'has_prohibited_json_keys must detect privateAspirations key recursively'
);
select pg_temp.assert_true(
  sih26044.has_prohibited_json_keys('{"nested":{"counselorHistory":["note"]}}'::jsonb),
  'has_prohibited_json_keys must detect counselorHistory key recursively'
);
select pg_temp.assert_true(
  sih26044.has_prohibited_json_keys('{"nested":{"financial_constraints":"low"}}'::jsonb),
  'has_prohibited_json_keys must detect financial_constraints key recursively'
);
select pg_temp.assert_true(
  not sih26044.has_prohibited_json_keys('{"literalClaim":"Research aspirations statement and counselor registration required"}'::jsonb),
  'has_prohibited_json_keys must ALLOW legitimate literal strings containing aspiration or counselor'
);
select pg_temp.assert_true(
  not sih26044.has_prohibited_json_keys('{"requirements":[{"wording":"Counselor certificate required"}]}'::jsonb),
  'has_prohibited_json_keys must ALLOW legitimate nested strings'
);

set local role service_role;

-- 3. Service role mutation restrictions
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

-- 4. Trusted readiness persistence RPC execution
select * from sih26044.persist_trusted_readiness_result(
  '70000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1',
  '50000000-0000-4000-8000-0000000000d1',
  '51000000-0000-4000-8000-0000000000d1',
  'engine-v1', 'policy-v1', 'input-v1', 'facts-v1', 'evidence-v1', 'NEEDS_REVIEW',
  pg_temp.d2_result_body('70000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1'),
  '2026-08-26T00:00:00Z',
  '{"opportunity":{"id":"50000000-0000-4000-8000-0000000000d1"}}'::jsonb
);

-- Idempotency check
select * from sih26044.persist_trusted_readiness_result(
  '70000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1',
  '50000000-0000-4000-8000-0000000000d1',
  '51000000-0000-4000-8000-0000000000d1',
  'engine-v1', 'policy-v1', 'input-v1', 'facts-v1', 'evidence-v1', 'NEEDS_REVIEW',
  pg_temp.d2_result_body('70000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1'),
  '2026-08-26T00:00:00Z',
  '{"opportunity":{"id":"50000000-0000-4000-8000-0000000000d1"}}'::jsonb
);

-- 5. Subject fact materialization
select * from sih26044.materialize_readiness_subject_facts(
  '20000000-0000-4000-8000-0000000000d1',
  'undergraduate', true, 2026, true,
  '[{"value":"Bangalore","confirmed":true}]'::jsonb, true,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true
);

-- Subject fact materialization rejects prohibited keys
select pg_temp.assert_blocked(
  $command$select * from sih26044.materialize_readiness_subject_facts(
    '20000000-0000-4000-8000-0000000000d1',
    'undergraduate', true, 2026, true,
    '[{"value":"Bangalore","confirmed":true}]'::jsonb, true,
    '[{"riasec":"prohibited"}]'::jsonb, '[]'::jsonb, '[]'::jsonb, true
  )$command$,
  'materialize_readiness_subject_facts must reject prohibited guidance keys'
);

-- 6. Artifact registration and scan status update
select * from sih26044.register_trusted_artifact(
  '90000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1',
  'career-evidence-private',
  '20000000-0000-4000-8000-0000000000d1/90000000-0000-4000-8000-0000000000d1/test.pdf',
  'application/pdf',
  'Test Document',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);

select * from sih26044.update_artifact_scan_status(
  '90000000-0000-4000-8000-0000000000d1',
  'clean',
  'automated_scanner',
  'Clean file scan'
);

-- 7. Evidence record and artifact-backed derivation
-- The service role is intentionally denied direct evidence-table mutation. Use the
-- migration-test owner only to seed the weak source fixture, then return to the
-- trusted role for derivation and audit assertions.
set local role postgres;
insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_skill_id, scope_literal_skill_label, source_system, source_captured_at
) values (
  '60000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1',
  'Initial self-reported SQL skill', 'self_reported', 'unverified',
  'global_skill', 'sql', 'SQL', 'd2_test', statement_timestamp()
);
insert into sih26044.evidence_artifact_links (
  evidence_record_id, artifact_id, linked_by_actor_id
) values (
  '60000000-0000-4000-8000-0000000000d1', '90000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1'
);
set local role service_role;

select * from sih26044.derive_artifact_backed_evidence(
  '60000000-0000-4000-8000-0000000000d2',
  '60000000-0000-4000-8000-0000000000d1',
  '90000000-0000-4000-8000-0000000000d1',
  '20000000-0000-4000-8000-0000000000d1',
  'Artifact backed SQL claim',
  'artifact_attachment',
  '20000000-0000-4000-8000-0000000000d1',
  'direct_confirmation'
);

-- Prove derived record has provenance = artifact_backed and initial_verification_state = unverified
select pg_temp.assert_true(
  (select provenance = 'artifact_backed' and initial_verification_state = 'unverified'
   from sih26044.evidence_records where id = '60000000-0000-4000-8000-0000000000d2'),
  'Derived record must have artifact_backed provenance and unverified state'
);

-- 8. Audit event principal integrity
select sih26044.record_authoritative_audit(
  '20000000-0000-4000-8000-0000000000d1', null, null, 'human_action',
  'evidence_records', '60000000-0000-4000-8000-0000000000d1', null, '{}'::jsonb
);
select sih26044.record_authoritative_audit(
  null, 'system_scanner_daemon', null, 'system_action',
  'artifacts', '90000000-0000-4000-8000-0000000000d1', null, '{}'::jsonb
);

-- Audit event must reject both principals or neither principal
select pg_temp.assert_blocked(
  $command$select sih26044.record_authoritative_audit(
    '20000000-0000-4000-8000-0000000000d1', 'system_scanner', null, 'invalid_action',
    'artifacts', '90000000-0000-4000-8000-0000000000d1', null, '{}'::jsonb
  )$command$,
  'Audit event must reject having both human actor and system principal'
);
select pg_temp.assert_blocked(
  $command$select sih26044.record_authoritative_audit(
    null, null, null, 'invalid_action',
    'artifacts', '90000000-0000-4000-8000-0000000000d1', null, '{}'::jsonb
  )$command$,
  'Audit event must reject having neither human actor nor system principal'
);

reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.opportunity_readiness_results where id = '70000000-0000-4000-8000-0000000000d1'),
  'identical trusted requests must remain idempotent'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.readiness_input_snapshots where readiness_result_id = '70000000-0000-4000-8000-0000000000d1'),
  'canonical input snapshot must be persisted alongside readiness result'
);
select pg_temp.assert_blocked(
  $command$update sih26044.readiness_input_snapshots set input_version = 'mutated'
    where readiness_result_id = '70000000-0000-4000-8000-0000000000d1'$command$,
  'historical input snapshots remain immutable'
);

rollback;
