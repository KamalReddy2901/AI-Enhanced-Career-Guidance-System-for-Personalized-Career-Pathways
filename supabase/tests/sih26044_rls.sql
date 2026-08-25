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

-- Draft opportunity content used to exercise authenticated confirmation hardening.
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'draft', '20000000-0000-0000-0000-000000000003');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 1, 'draft',
  'Confirmation test role', 'Draft confirmation hardening fixture', 'internship',
  array['student']::sih26044.opportunity_audience[], 'local_test', now(),
  'Controlled draft source', '20000000-0000-0000-0000-000000000003'
);
insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution,
  canonical_skill_id, canonical_skill_label, minimum_proficiency,
  human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method
) values (
  '52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 0,
  'skill', 'required', 'SQL fundamentals', 3, 'artifact_expected', false,
  'exact', 'sql', 'SQL', 2, true, '20000000-0000-0000-0000-000000000003', now(), 'structured_human_entry'
);
insert into sih26044.eligibility_rules (
  id, opportunity_version_id, ordinal, rule_kind, literal_source_wording,
  typed_rule_definition, human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method
) values (
  '53000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 0,
  'education_level', 'Undergraduate study', '{"kind":"education_level","operator":"at_least","value":"undergraduate"}',
  true, '20000000-0000-0000-0000-000000000003', now(), 'structured_human_entry'
);

-- Migration-owner writes simulate a trusted/non-authenticated adapter. Exact
-- content edits must invalidate stale traces for these writers too.
update sih26044.opportunity_requirements
set literal_source_wording = 'SQL fundamentals for trusted review'
where id = '52000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select not human_confirmed
    and confirmed_by_actor_id is null
    and confirmed_at is null
    and confirmation_method is null
   from sih26044.opportunity_requirements
   where id = '52000000-0000-0000-0000-000000000001'),
  'trusted requirement edit without fresh trace invalidates confirmation'
);
update sih26044.opportunity_requirements
set literal_source_wording = 'SQL fundamentals',
    human_confirmed = true,
    confirmed_by_actor_id = '20000000-0000-0000-0000-000000000003',
    confirmed_at = statement_timestamp(),
    confirmation_method = 'connector_review'
where id = '52000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select human_confirmed
    and literal_source_wording = 'SQL fundamentals'
    and confirmed_by_actor_id = '20000000-0000-0000-0000-000000000003'
    and confirmation_method = 'connector_review'
   from sih26044.opportunity_requirements
   where id = '52000000-0000-0000-0000-000000000001'),
  'fresh trusted confirmation binds edited requirement content'
);

update sih26044.eligibility_rules
set literal_source_wording = 'Undergraduate study for trusted review'
where id = '53000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select not human_confirmed
    and confirmed_by_actor_id is null
    and confirmed_at is null
    and confirmation_method is null
   from sih26044.eligibility_rules
   where id = '53000000-0000-0000-0000-000000000001'),
  'trusted eligibility edit without fresh trace invalidates confirmation'
);
update sih26044.eligibility_rules
set literal_source_wording = 'Undergraduate study',
    human_confirmed = true,
    confirmed_by_actor_id = '20000000-0000-0000-0000-000000000003',
    confirmed_at = statement_timestamp(),
    confirmation_method = 'controlled_fixture'
where id = '53000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select human_confirmed
    and literal_source_wording = 'Undergraduate study'
    and confirmed_by_actor_id = '20000000-0000-0000-0000-000000000003'
    and confirmation_method = 'controlled_fixture'
   from sih26044.eligibility_rules
   where id = '53000000-0000-0000-0000-000000000001'),
  'fresh trusted confirmation binds edited eligibility content'
);

insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_literal_skill_label, source_system, source_captured_at
) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Learner A literal claim', 'self_reported', 'self_confirmed', 'global_skill', 'Quantum Ceramics', 'local_test', now()),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Learner B literal claim', 'self_reported', 'self_confirmed', 'global_skill', 'Ceramics', 'local_test', now());

-- A future trusted registration adapter owns these canonical writes. This
-- fixture begins conservatively and links only after metadata registration.
-- The storage object referenced here is validated through the Storage API
-- integration test layer.
insert into sih26044.artifacts (
  id, subject_actor_id, storage_object_path, media_type, display_name,
  integrity_fingerprint, scan_status
) values (
  '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001/90000000-0000-0000-0000-000000000001/evidence-a.txt',
  'text/plain', 'Evidence A', 'sha256:test-evidence-a', 'pending'
);
insert into sih26044.evidence_artifact_links (
  evidence_record_id, artifact_id, linked_by_actor_id
) values (
  '60000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);

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
select pg_temp.assert_blocked(
  $sql$insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    scope_kind, scope_literal_skill_label, source_system, source_captured_at
  ) values (
    '60100000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    'Forged issuer claim', 'issuer_verified', 'self_confirmed', 'global_skill', 'SQL', 'browser', now()
  )$sql$,
  'learner cannot insert issuer_verified provenance'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    scope_kind, scope_literal_skill_label, source_system, source_captured_at
  ) values (
    '60100000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
    'Forged human claim', 'human_attested', 'self_confirmed', 'global_skill', 'SQL', 'browser', now()
  )$sql$,
  'learner cannot insert human_attested provenance'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    scope_kind, scope_literal_skill_label, source_system, source_captured_at
  ) values (
    '60100000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
    'Forged assessment claim', 'assessed', 'self_confirmed', 'global_skill', 'SQL', 'browser', now()
  )$sql$,
  'learner cannot insert assessed provenance'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    scope_kind, scope_literal_skill_label, source_system, source_captured_at
  ) values (
    '60100000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001',
    'Forged human state', 'self_reported', 'human_verified', 'global_skill', 'SQL', 'browser', now()
  )$sql$,
  'learner cannot insert human_verified initial state'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance, initial_verification_state,
    proposal_source, scope_kind, scope_literal_skill_label, source_system, source_captured_at
  ) values (
    '60100000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001',
    'Forged connector proposal', 'extracted', 'proposed', 'connector_import',
    'global_skill', 'SQL', 'browser', now()
  )$sql$,
  'browser cannot claim connector_import proposal source'
);
insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_literal_skill_label, source_system, source_captured_at
) values (
  '60100000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001',
  'Permitted self report', 'self_reported', 'self_confirmed', 'global_skill', 'SQL joins', 'browser', now()
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.evidence_records where id = '60100000-0000-0000-0000-000000000005'),
  'learner can still insert permitted weak evidence'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.opportunity_readiness_results (
    id, subject_actor_id, opportunity_id, opportunity_version_id, engine_version,
    evidence_policy_version, input_version, subject_facts_version,
    evidence_projection_version, readiness_band, result_body, generated_at
  ) values (
    '61100000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001',
    'forged-browser', 'forged-policy', 'forged-input', 'forged-facts', 'forged-projection',
    'READY_FOR_REVIEW', '{"readinessBand":"READY_FOR_REVIEW"}', now()
  )$sql$,
  'learner cannot directly insert canonical readiness result'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.application_snapshots (
    id, application_id, opportunity_version_id, readiness_result_id,
    engine_version, evidence_policy_version, input_version, subject_facts_version,
    evidence_projection_version, recruiter_projection_version,
    recruiter_allowlist_projection, captured_at
  ) values (
    '71100000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002',
    '51000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001',
    'forged-browser', 'forged-policy', 'forged-input', 'forged-facts', 'forged-projection',
    'forged-projection', '{"applicant":{"private":"injected"}}', now()
  )$sql$,
  'learner cannot directly insert application snapshot material'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.audit_events (
    id, actor_id, action, resource_type, resource_id
  ) values (
    '81100000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    'forged.audit', 'application', 'forged-resource'
  )$sql$,
  'browser cannot author authoritative audit history'
);

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
select pg_temp.assert_true((select count(*) = 1 from sih26044.opportunity_readiness_results where subject_actor_id = '20000000-0000-0000-0000-000000000001'), 'learner retains read access to own trusted readiness');

-- Storage path helper validation using synthetic path (no actual object required).
select pg_temp.assert_true(
  (select array_length(
      storage.foldername('20000000-0000-0000-0000-000000000001/90000000-0000-0000-0000-000000000001/evidence-a.txt'), 1
    ) = 2
   and storage.filename('20000000-0000-0000-0000-000000000001/90000000-0000-0000-0000-000000000001/evidence-a.txt') = 'evidence-a.txt'),
  'valid storage path uses exactly actor/artifact folders plus filename'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.artifacts (
    id, subject_actor_id, storage_object_path, media_type, display_name, integrity_fingerprint
  ) values (
    '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001/90000000-0000-0000-0000-000000000001/evidence-a.txt',
    'text/plain', 'Evidence A', 'sha256:browser-claim'
  )$sql$,
  'learner cannot insert canonical artifact metadata'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.artifacts (
    id, subject_actor_id, storage_object_path, media_type, display_name,
    integrity_fingerprint, scan_status
  ) values (
    '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001/90000000-0000-0000-0000-000000000001/evidence-a.txt',
    'text/plain', 'Evidence A', 'sha256:browser-claim', 'clean'
  )$sql$,
  'browser cannot claim clean scan status through artifact insertion'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.artifacts where id = '90000000-0000-0000-0000-000000000001'),
  'learner retains read access to own registered artifact metadata'
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.evidence_artifact_links
   where evidence_record_id = '60000000-0000-0000-0000-000000000001'
     and artifact_id = '90000000-0000-0000-0000-000000000001'),
  'learner retains read access to own canonical evidence-artifact link'
);
select pg_temp.assert_blocked(
  $sql$insert into sih26044.evidence_artifact_links (
    evidence_record_id, artifact_id, linked_by_actor_id
  ) values (
    '60100000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001'
  )$sql$,
  'learner cannot insert canonical evidence-artifact link'
);
-- Storage overwrite/deletion protection for registered artifacts validated
-- through authenticated Storage API integration test layer.
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000003';
select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records), 'recruiter cannot browse the learner evidence ledger');
select pg_temp.assert_true((select count(*) = 1 from sih26044.applications where id = '70000000-0000-0000-0000-000000000001'), 'own-organization recruiter can read submitted consented application');
select pg_temp.assert_true((select count(*) = 0 from sih26044.applications where id = '70000000-0000-0000-0000-000000000002'), 'recruiter cannot read saved/unsubmitted application');
select pg_temp.assert_true((select count(*) = 0 from sih26044.opportunity_readiness_results), 'recruiter cannot browse live readiness history');

select pg_temp.assert_blocked(
  $sql$insert into sih26044.outcome_events (
    id, kind, subject_actor_id, organization_id, opportunity_id,
    application_id, recorded_by_actor_id, occurred_at
  ) values (
    '80100000-0000-0000-0000-000000000001', 'selected',
    '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003', now()
  )$sql$,
  'outcome cannot target unrelated learner/application'
);
insert into sih26044.outcome_events (
  id, kind, subject_actor_id, organization_id, opportunity_id,
  application_id, recorded_by_actor_id, occurred_at
) values (
  '80100000-0000-0000-0000-000000000002', 'selected',
  '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003', now()
);
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.outcome_events where id = '80100000-0000-0000-0000-000000000002'),
  'valid application-linked outcome can be recorded by authorized human actor'
);

update sih26044.opportunity_requirements
set literal_source_wording = 'SQL fundamentals with joins'
where id = '52000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select not human_confirmed
    and confirmed_by_actor_id is null
    and confirmed_at is null
    and confirmation_method is null
   from sih26044.opportunity_requirements
   where id = '52000000-0000-0000-0000-000000000001'),
  'confirmed requirement edit invalidates stale confirmation'
);
select pg_temp.assert_blocked(
  $sql$update sih26044.opportunity_requirements
    set human_confirmed = true,
        confirmed_by_actor_id = '20000000-0000-0000-0000-000000000002',
        confirmed_at = '2000-01-01T00:00:00Z',
        confirmation_method = 'structured_human_entry'
    where id = '52000000-0000-0000-0000-000000000001'$sql$,
  'confirmation actor cannot be impersonated'
);
select pg_temp.assert_blocked(
  $sql$update sih26044.opportunity_requirements
    set human_confirmed = true,
        confirmed_by_actor_id = null,
        confirmed_at = null,
        confirmation_method = 'controlled_fixture'
    where id = '52000000-0000-0000-0000-000000000001'$sql$,
  'production client cannot claim controlled confirmation method'
);

update sih26044.eligibility_rules
set literal_source_wording = 'Current undergraduate study'
where id = '53000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select not human_confirmed
    and confirmed_by_actor_id is null
    and confirmed_at is null
    and confirmation_method is null
   from sih26044.eligibility_rules
   where id = '53000000-0000-0000-0000-000000000001'),
  'confirmed eligibility edit invalidates stale confirmation'
);

update sih26044.opportunity_requirements
set human_confirmed = true,
    confirmed_by_actor_id = null,
    confirmed_at = '2000-01-01T00:00:00Z',
    confirmation_method = 'structured_human_entry'
where id = '52000000-0000-0000-0000-000000000001';
update sih26044.eligibility_rules
set human_confirmed = true,
    confirmed_by_actor_id = null,
    confirmed_at = '2000-01-01T00:00:00Z',
    confirmation_method = 'ai_assisted_review'
where id = '53000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(
  (select human_confirmed
    and confirmed_by_actor_id = '20000000-0000-0000-0000-000000000003'
    and confirmed_at <> '2000-01-01T00:00:00Z'
   from sih26044.opportunity_requirements
   where id = '52000000-0000-0000-0000-000000000001'),
  'server derives confirmation actor and timestamp'
);
select sih26044.publish_opportunity_version('51000000-0000-0000-0000-000000000002');
select pg_temp.assert_true(
  (select status = 'published' from sih26044.opportunity_versions where id = '51000000-0000-0000-0000-000000000002'),
  'freshly reconfirmed edited content can publish'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000004';
select pg_temp.assert_true((select count(*) = 0 from sih26044.applications where id = '70000000-0000-0000-0000-000000000001'), 'organization B recruiter cannot read organization A application');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000005';
select pg_temp.assert_true((select count(*) = 1 from sih26044.evidence_records where id = '60000000-0000-0000-0000-000000000001'), 'assigned verifier can read exactly requested evidence');
select pg_temp.assert_true((select count(*) = 0 from sih26044.evidence_records where id = '60000000-0000-0000-0000-000000000002'), 'assigned verifier cannot browse unrelated evidence');
select pg_temp.assert_true((select count(*) = 1 from sih26044.artifacts where id = '90000000-0000-0000-0000-000000000001'), 'assigned verifier retains read access to properly linked artifact metadata');
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
select pg_temp.assert_blocked(
  $sql$select sih26044.is_consent_active(
    '62000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'evidence_verification'
  )$sql$,
  'low-level trust helper cannot leak unauthorized state'
);
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
  blocked := false;
  begin update sih26044.artifacts set integrity_fingerprint = 'forbidden-replacement' where id = '90000000-0000-0000-0000-000000000001'; exception when others then blocked := true; end;
  perform pg_temp.assert_true(blocked, 'artifact core metadata cannot be rewritten by a trusted role');
end
$$;

select pg_temp.assert_true(
  (select public = false from storage.buckets where id = 'career-evidence-private'),
  'evidence bucket is private'
);
-- Cross-actor Storage object access control validated through authenticated
-- Storage API integration test layer.

rollback;
