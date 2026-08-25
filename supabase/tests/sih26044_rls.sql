-- Executable local-only SIH26044 RLS/immutability suite.
-- Run after all supabase/migrations from a clean local Supabase database.
-- This file is transactional and leaves no fixture data behind.

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

-- Stable fixture IDs.
insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000007')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Learner A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Learner B'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Recruiter A'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Recruiter B'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Assigned Verifier'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 'Unrelated Verifier'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', 'Policy Analyst');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('30000000-0000-0000-0000-000000000001', 'Industry A Pvt Ltd', 'Industry A', 'employer'),
  ('30000000-0000-0000-0000-000000000002', 'Industry B Pvt Ltd', 'Industry B', 'employer'),
  ('30000000-0000-0000-0000-000000000003', 'Issuer Faculty Institute', 'Verifier Org', 'verification_issuer'),
  ('30000000-0000-0000-0000-000000000004', 'Policy Programme Office', 'Policy Org', 'government');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'active'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'active'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'active'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', 'active'),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004', 'active');
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('40000000-0000-0000-0000-000000000001', 'recruiter'),
  ('40000000-0000-0000-0000-000000000002', 'recruiter'),
  ('40000000-0000-0000-0000-000000000003', 'issuer_verifier'),
  ('40000000-0000-0000-0000-000000000004', 'issuer_verifier'),
  ('40000000-0000-0000-0000-000000000005', 'policy_program_analyst');

insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'published', '20000000-0000-0000-0000-000000000003');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text,
  created_by_actor_id, published_at
) values (
  '51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1, 'published',
  'Controlled role', 'RLS test opportunity', 'internship', array['student']::sih26044.opportunity_audience[],
  'local_test', now(), 'Controlled literal opportunity source',
  '20000000-0000-0000-0000-000000000003', now()
);
update sih26044.opportunities
set current_version_id = '51000000-0000-0000-0000-000000000001'
where id = '50000000-0000-0000-0000-000000000001';

insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_literal_skill_label, source_system, source_captured_at
) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Learner A literal claim', 'self_reported', 'self_confirmed', 'global_skill', 'Quantum Ceramics', 'local_test', now()),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Learner B literal claim', 'self_reported', 'self_confirmed', 'global_skill', 'Ceramics', 'local_test', now());

insert into sih26044.opportunity_readiness_results (
  id, subject_actor_id, opportunity_id, opportunity_version_id, engine_version,
  evidence_policy_version, input_version, subject_facts_version,
  evidence_projection_version, readiness_band, result_body, generated_at
) values
  ('61000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'engine-b-test', 'evidence-policy-test', 'input-test-a', 'facts-test-a', 'projection-test-a', 'NEEDS_REVIEW', '{"readinessBand":"NEEDS_REVIEW"}', now()),
  ('61000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'engine-b-test', 'evidence-policy-test', 'input-test-b', 'facts-test-b', 'projection-test-b', 'BUILDING_EVIDENCE', '{"readinessBand":"BUILDING_EVIDENCE"}', now());

insert into sih26044.consent_grants (
  id, subject_actor_id, grantee_organization_id, purpose, created_by_actor_id
) values
  ('62000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'application_review', '20000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'evidence_verification', '20000000-0000-0000-0000-000000000001');
insert into sih26044.consent_evidence_records (consent_grant_id, evidence_record_id) values
  ('62000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001');

insert into sih26044.verification_requests (
  id, evidence_record_id, subject_actor_id, requested_verifier_actor_id,
  requested_verifier_organization_id, consent_grant_id, scope_kind,
  scope_literal_skill_label, status
) values (
  '63000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000003', '62000000-0000-0000-0000-000000000002',
  'global_skill', 'Quantum Ceramics', 'requested'
);

insert into sih26044.applications (
  id, applicant_actor_id, opportunity_id, opportunity_version_id, owner_organization_id, initial_stage
) values
  ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'saved'),
  ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'saved');
insert into sih26044.application_snapshots (
  id, application_id, opportunity_version_id, readiness_result_id,
  engine_version, evidence_policy_version, input_version, subject_facts_version,
  evidence_projection_version, recruiter_projection_version,
  recruiter_allowlist_projection, captured_at
) values (
  '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001',
  'engine-b-test', 'evidence-policy-test', 'input-test-a', 'facts-test-a', 'projection-test-a',
  'recruiter-projection-test', '{"applicant":{"displayName":"Learner A"},"evidence":[],"requirements":[]}', now()
);
insert into sih26044.application_snapshot_evidence values
  ('71000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001');
insert into sih26044.application_snapshot_consents values
  ('71000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  length(sih26044.finalize_application_snapshot('71000000-0000-0000-0000-000000000001')) = 64,
  'finalized snapshot must receive a reproducible SHA-256 integrity fingerprint'
);
insert into sih26044.application_events (
  id, application_id, from_stage, to_stage, event_kind, actor_id, note
) values (
  '72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
  'saved', 'applied', 'stage_transition', '20000000-0000-0000-0000-000000000001', 'Explicit applicant submission'
);

select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records where subject_actor_id = '20000000-0000-0000-0000-000000000002'), 'learner A cannot read learner B evidence');
select pg_temp.assert_true((select count(*) = 0 from sih26044.opportunity_readiness_results where subject_actor_id = '20000000-0000-0000-0000-000000000002'), 'learner A cannot read learner B readiness');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000003';
select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records), 'recruiter cannot browse the learner evidence ledger');
select pg_temp.assert_true((select count(*) = 1 from sih26044.applications where id = '70000000-0000-0000-0000-000000000001'), 'own-organization recruiter can read submitted consented application');
select pg_temp.assert_true((select count(*) = 0 from sih26044.applications where id = '70000000-0000-0000-0000-000000000002'), 'recruiter cannot read saved/unsubmitted application');
select pg_temp.assert_true((select count(*) = 0 from sih26044.opportunity_readiness_results), 'recruiter cannot browse live readiness history');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000004';
select pg_temp.assert_true((select count(*) = 0 from sih26044.applications where id = '70000000-0000-0000-0000-000000000001'), 'organization B recruiter cannot read organization A application');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000005';
select pg_temp.assert_true((select count(*) = 1 from sih26044.evidence_records where id = '60000000-0000-0000-0000-000000000001'), 'assigned verifier can read exactly requested evidence');
select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records where id = '60000000-0000-0000-0000-000000000002'), 'assigned verifier cannot browse unrelated evidence');
insert into sih26044.verification_events (
  id, verification_request_id, evidence_record_id, action, actor_id, actor_organization_id, reason
) values (
  '64000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001', 'verified_by_issuer',
  '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'Bounded issuer review'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000006';
select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records), 'unrelated verifier cannot read requested evidence');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000007';
select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records), 'policy analyst cannot read individual evidence');
select pg_temp.assert_true((select count(*) = 0 from sih26044.opportunity_readiness_results), 'policy analyst cannot read individual readiness');
select pg_temp.assert_true((select count(*) = 0 from sih26044.applications), 'policy analyst cannot read individual applications');
reset role;

-- Seed historical rows as the migration owner, then prove schema triggers reject mutation even when RLS is bypassed.
insert into sih26044.outcome_events (
  id, kind, subject_actor_id, organization_id, application_id, recorded_by_actor_id, occurred_at
) values (
  '80000000-0000-0000-0000-000000000001', 'selected', '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003', now()
);
insert into sih26044.audit_events (id, actor_id, organization_id, action, resource_type, resource_id)
values ('81000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'application.reviewed', 'application', '70000000-0000-0000-0000-000000000001');

do $$
declare blocked boolean;
begin
  blocked := false;
  begin update sih26044.opportunity_versions set title = 'Forbidden edit' where id = '51000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'published opportunity version cannot be mutated');
  blocked := false;
  begin update sih26044.verification_events set reason = 'Forbidden edit' where id = '64000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'verification history cannot be updated');
  blocked := false;
  begin delete from sih26044.application_events where id = '72000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'application history cannot be deleted');
  blocked := false;
  begin update sih26044.application_snapshots set engine_version = 'forbidden' where id = '71000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'finalized application snapshot cannot be updated');
  blocked := false;
  begin delete from sih26044.opportunity_readiness_results where id = '61000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'readiness history cannot be deleted');
  blocked := false;
  begin update sih26044.outcome_events set kind = 'joined' where id = '80000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'outcome history cannot be updated');
  blocked := false;
  begin delete from sih26044.audit_events where id = '81000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'audit history cannot be deleted');
end
$$;

select pg_temp.assert_true(
  (select public = false from storage.buckets where id = 'career-evidence-private'),
  'evidence bucket is private'
);
insert into storage.objects (bucket_id, name)
values ('career-evidence-private', '20000000-0000-0000-0000-000000000002/90000000-0000-0000-0000-000000000002/private-b.txt');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select count(*) = 0 from storage.objects where bucket_id = 'career-evidence-private' and name like '20000000-0000-0000-0000-000000000002/%'),
  'one actor cannot read another actor private storage object'
);
reset role;

rollback;
