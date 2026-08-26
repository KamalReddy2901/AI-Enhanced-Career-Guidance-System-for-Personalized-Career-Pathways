import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { handleSihRequest } from '../worker/src/sih/routes';
import { assembleOpportunityReadinessInput } from '../worker/src/sih/readiness';
import { computeOpportunityReadiness } from '../src/app/engine/opportunityReadiness';

function localEnvironment() {
  const output = execFileSync('npx', ['--yes', 'supabase@latest', 'status', '-o', 'env'], { encoding: 'utf8' });
  return Object.fromEntries(output.split('\n').flatMap(line => {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    return match ? [[match[1], match[2]]] : [];
  })) as Record<string, string>;
}

function sql(source: string) {
  const run = spawnSync('docker', [
    'exec', '-i', 'supabase_db_careercase-sih26044-foundation',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-q',
  ], { input: source, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout);
}

const ids = {
  actorA: '20000000-0000-4000-8000-0000000000a1',
  actorB: '20000000-0000-4000-8000-0000000000b2',
  recruiterA: '20000000-0000-4000-8000-0000000000c3',
  recruiterB: '20000000-0000-4000-8000-0000000000c4',
  orgA: '30000000-0000-4000-8000-000000000001',
  orgB: '30000000-0000-4000-8000-000000000002',
  opportunity: '50000000-0000-4000-8000-000000000001',
  version: '51000000-0000-4000-8000-000000000001',
  requirement: '52000000-0000-4000-8000-000000000001',
  evidence1: '60000000-0000-4000-8000-000000000001',
  evidence2: '60000000-0000-4000-8000-000000000002',
  artifact1: '90000000-0000-4000-8000-000000000001',
  application1: '40000000-0000-4000-8000-000000000001',
  consent1: '80000000-0000-4000-8000-000000000001',
  unconfirmedOpportunity: '50000000-0000-4000-8000-000000000002',
  unconfirmedVersion: '51000000-0000-4000-8000-000000000002',
  unconfirmedRequirement: '52000000-0000-4000-8000-000000000002',
};

const local = localEnvironment();
const apiUrl = local.API_URL;
const anonKey = local.ANON_KEY;
const serviceKey = local.SECRET_KEY || local.SERVICE_ROLE_KEY;
assert.ok(apiUrl && anonKey && serviceKey, 'Disposable Supabase credentials are required');
const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });
const anonymous = createClient(apiUrl, anonKey, { auth: { persistSession: false } });
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `D2-${suffix}-Strong!`;

async function createUser(label: string) {
  const email = `d2-${label}-${suffix}@example.invalid`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  assert.ifError(createError);
  assert.ok(created.user);
  const { data: signedIn, error: signInError } = await anonymous.auth.signInWithPassword({ email, password });
  assert.ifError(signInError);
  assert.ok(signedIn.session?.access_token);
  return { id: created.user.id, token: signedIn.session!.access_token };
}

const [userA, userB, recruiterUserA, recruiterUserB, userWithoutActor] = await Promise.all([
  createUser('learner-a'),
  createUser('learner-b'),
  createUser('recruiter-a'),
  createUser('recruiter-b'),
  createUser('no-actor'),
]);

assert.notEqual(userA.id, ids.actorA, 'auth user ID and SIH actor ID must be distinct');

sql(`
insert into sih26044.actors (id, auth_user_id, display_name) values
  ('${ids.actorA}', '${userA.id}', 'D2 Learner A'),
  ('${ids.actorB}', '${userB.id}', 'D2 Learner B'),
  ('${ids.recruiterA}', '${recruiterUserA.id}', 'D2 Recruiter Org A'),
  ('${ids.recruiterB}', '${recruiterUserB.id}', 'D2 Recruiter Org B');

insert into sih26044.organizations (id, legal_name, display_name, kind, status) values
  ('${ids.orgA}', 'D2 Test Employer A', 'D2 Employer A', 'employer', 'active'),
  ('${ids.orgB}', 'D2 Test Employer B', 'D2 Employer B', 'employer', 'active');

-- Add memberships for recruiters
insert into sih26044.organization_memberships (id, actor_id, organization_id, status, valid_from) values
  ('31000000-0000-4000-8000-000000000001', '${ids.recruiterA}', '${ids.orgA}', 'active', statement_timestamp()),
  ('31000000-0000-4000-8000-000000000002', '${ids.recruiterB}', '${ids.orgB}', 'active', statement_timestamp());
insert into sih26044.organization_membership_roles (membership_id, role) values
  ('31000000-0000-4000-8000-000000000001', 'recruiter'),
  ('31000000-0000-4000-8000-000000000002', 'recruiter');

-- Published opportunity owned by Org A
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('${ids.opportunity}', '${ids.orgA}', 'draft', '${ids.recruiterA}');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '${ids.version}', '${ids.opportunity}', 1, 'draft', 'SQL internship', 'D2 fixture', 'internship',
  array['student']::sih26044.opportunity_audience[], 'd2_test', statement_timestamp(),
  'Confirmed SQL internship with counselor guidance endorsement', '${ids.recruiterA}'
);
insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution, canonical_skill_id,
  canonical_skill_label, minimum_proficiency, human_confirmed, confirmed_by_actor_id,
  confirmed_at, confirmation_method
) values (
  '${ids.requirement}', '${ids.version}', 0, 'skill', 'required', 'SQL fundamentals and aspirations statement',
  3, 'any_recorded', false, 'exact', 'sql', 'SQL', 2, true, '${ids.recruiterA}',
  statement_timestamp(), 'controlled_fixture'
);
insert into sih26044.eligibility_rules (
  opportunity_version_id, ordinal, rule_kind, literal_source_wording, typed_rule_definition,
  human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method
) values (
  '${ids.version}', 0, 'education_level', 'Undergraduate or higher',
  '{"kind":"education_level","operator":"at_least","value":"undergraduate"}',
  true, '${ids.recruiterA}', statement_timestamp(), 'controlled_fixture'
);
update sih26044.opportunity_versions set status = 'published', published_at = statement_timestamp()
where id = '${ids.version}';
update sih26044.opportunities set status = 'published', current_version_id = '${ids.version}'
where id = '${ids.opportunity}';

-- Initial subject facts
insert into sih26044.readiness_subject_facts (
  subject_actor_id, education_level, education_level_confirmed,
  physical_presence_locations_complete, relevant_languages_complete
) values
  ('${ids.actorA}', 'undergraduate', true, true, true),
  ('${ids.actorB}', 'undergraduate', true, true, true);

-- Weak evidence for Learner A
insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_skill_id, scope_literal_skill_label, source_system,
  source_captured_at, visibility
) values (
  '${ids.evidence1}', '${ids.actorA}', 'Confirmed SQL proficiency with counselor recommendation', 'self_reported',
  'self_confirmed', 'global_skill', 'sql', 'SQL', 'd2_test', statement_timestamp(), 'private'
);
insert into sih26044.readiness_evidence_projections (
  evidence_record_id, subject_actor_id, skill_id, literal_skill_label,
  proficiency, capability_assertion, directness, observed_at
) values (
  '${ids.evidence1}', '${ids.actorA}', 'sql', 'SQL', 3, 'supports', 'direct', statement_timestamp()
);

-- Unconfirmed opportunity version
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('${ids.unconfirmedOpportunity}', '${ids.orgA}', 'draft', '${ids.recruiterA}');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '${ids.unconfirmedVersion}', '${ids.unconfirmedOpportunity}', 1, 'draft', 'Unconfirmed role',
  'D2 refusal fixture', 'internship', array['student']::sih26044.opportunity_audience[],
  'd2_test', statement_timestamp(), 'Unconfirmed source', '${ids.recruiterA}'
);
insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution, canonical_skill_id,
  canonical_skill_label, minimum_proficiency
) values (
  '${ids.unconfirmedRequirement}', '${ids.unconfirmedVersion}', 0, 'skill', 'required',
  'Unconfirmed SQL', 3, 'any_recorded', false, 'exact', 'sql', 'SQL', 2
);
update sih26044.opportunity_versions set status = 'published', published_at = statement_timestamp()
where id = '${ids.unconfirmedVersion}';
update sih26044.opportunities set status = 'published', current_version_id = '${ids.unconfirmedVersion}'
where id = '${ids.unconfirmedOpportunity}';
`);

const workerEnv = {
  SUPABASE_URL: apiUrl,
  SUPABASE_ANON_KEY: anonKey,
  SUPABASE_ELEVATED_KEY: serviceKey,
};
const respond = (data: unknown, status = 200) => Response.json(data, { status });
const call = (token: string, path: string, body: Record<string, unknown>, method = 'POST') =>
  handleSihRequest(new Request(`http://worker.local${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), workerEnv, respond);

// 1. Auth & identity checks
const invalidSessionResponse = await call('invalid.token.value', '/sih/readiness/recompute', { opportunityVersionId: ids.version });
assert.equal(invalidSessionResponse.status, 401);
assert.equal((await invalidSessionResponse.json() as any).error.code, 'UNAUTHENTICATED');

const noActorResponse = await call(userWithoutActor.token, '/sih/readiness/recompute', { opportunityVersionId: ids.version });
assert.equal(noActorResponse.status, 403);
assert.equal((await noActorResponse.json() as any).error.code, 'NO_ACTIVE_SIH_ACTOR');

// 2. Readiness recompute
const responseA = await call(userA.token, '/sih/readiness/recompute', { opportunityVersionId: ids.version });
assert.equal(responseA.status, 200);
const resultA = (await responseA.json() as any).result;
assert.equal(resultA.subjectActorId, ids.actorA);
assert.equal(resultA.readinessBand, 'NEAR_READY');

const clientA = createClient(apiUrl, anonKey, {
  global: { headers: { Authorization: `Bearer ${userA.token}` } }, auth: { persistSession: false },
});
const canonicalInput = await assembleOpportunityReadinessInput(
  clientA, ids.actorA, ids.version, resultA.generatedAt,
);
assert.deepEqual(resultA, computeOpportunityReadiness(canonicalInput));

// Check input snapshot was persisted
const { data: snapshotRows } = await clientA.schema('sih26044')
  .from('readiness_input_snapshots')
  .select('*')
  .eq('readiness_result_id', resultA.resultId);
assert.equal(snapshotRows?.length, 1);
assert.equal(snapshotRows![0].subject_actor_id, ids.actorA);

// Direct browser insert to readiness results blocked
const directInsert = await clientA.schema('sih26044').from('opportunity_readiness_results').insert({
  id: crypto.randomUUID(), subject_actor_id: ids.actorA, opportunity_id: ids.opportunity,
  opportunity_version_id: ids.version, engine_version: 'browser', evidence_policy_version: 'browser',
  input_version: 'browser', subject_facts_version: 'browser', evidence_projection_version: 'browser',
  readiness_band: 'READY_FOR_REVIEW', result_body: {}, generated_at: new Date().toISOString(),
});
assert.ok(directInsert.error, 'authenticated browser must not insert readiness directly');

// Repeat recompute is idempotent
const repeatA = (await (await call(userA.token, '/sih/readiness/recompute', { opportunityVersionId: ids.version })).json() as any).result;
assert.equal(repeatA.resultId, resultA.resultId);

// 3. Subject fact materialization via trusted Worker route
const updateFactsRes = await call(userA.token, '/sih/readiness/subject-facts', {
  educationLevel: 'postgraduate',
  educationLevelConfirmed: true,
  graduationYear: 2027,
  graduationYearConfirmed: true,
}, 'PUT');
assert.equal(updateFactsRes.status, 200);

// Recompute after changed facts produces new subjectFactsVersion & inputVersion
const responseA2 = await call(userA.token, '/sih/readiness/recompute', { opportunityVersionId: ids.version });
const resultA2 = (await responseA2.json() as any).result;
assert.notEqual(resultA2.subjectFactsVersion, resultA.subjectFactsVersion);
assert.notEqual(resultA2.resultId, resultA.resultId);

// Historical input snapshot for old result remains intact
const { data: oldSnapshot } = await clientA.schema('sih26044')
  .from('readiness_input_snapshots')
  .select('*')
  .eq('readiness_result_id', resultA.resultId);
assert.equal(oldSnapshot?.length, 1);

// 4. Artifact upload + trusted registration
const storagePath = `${ids.actorA}/${ids.artifact1}/sample.pdf`;
const dummyContent = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const { error: uploadError } = await clientA.storage
  .from('career-evidence-private')
  .upload(storagePath, dummyContent, { contentType: 'application/pdf' });
assert.ifError(uploadError);

const registerRes = await call(userA.token, '/sih/artifacts/register', {
  artifactId: ids.artifact1,
  storageObjectPath: storagePath,
  displayName: 'Sample Certificate',
  mediaType: 'application/pdf',
  evidenceRecordId: ids.evidence1,
});
assert.equal(registerRes.status, 200);
const registeredArtifact = (await registerRes.json() as any).artifact;
assert.equal(registeredArtifact.id, ids.artifact1);
assert.equal(registeredArtifact.scanStatus, 'not_scanned');

// Artifact scan transition to clean via elevated RPC
const elevatedClient = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });
const { data: scanUpdated, error: scanErr } = await elevatedClient.schema('sih26044').rpc('update_artifact_scan_status', {
  p_artifact_id: ids.artifact1,
  p_scan_status: 'clean',
  p_scanner_principal: 'test_scanner_daemon',
  p_reason: 'Automated test clean scan',
});
assert.ifError(scanErr);
assert.equal((scanUpdated as any[])[0].scan_status, 'clean');

// 5. Artifact-backed evidence derivation
const derivedEvidenceId = '60000000-0000-4000-8000-000000000099';
const deriveRes = await call(userA.token, '/sih/evidence/derive-artifact-backed', {
  derivedEvidenceId,
  sourceEvidenceRecordId: ids.evidence1,
  artifactId: ids.artifact1,
  literalClaim: 'Artifact backed SQL certificate evidence',
  derivationKind: 'artifact_attachment',
  confirmationMethod: 'direct_confirmation',
});
assert.equal(deriveRes.status, 200);

const { data: derivedRow } = await clientA.schema('sih26044')
  .from('evidence_records')
  .select('*')
  .eq('id', derivedEvidenceId)
  .single();
assert.equal(derivedRow?.provenance, 'artifact_backed');
assert.equal(derivedRow?.initial_verification_state, 'unverified');

// Check lineage in evidence_derivations
const { data: derivationLineage } = await clientA.schema('sih26044')
  .from('evidence_derivations')
  .select('*')
  .eq('derived_evidence_record_id', derivedEvidenceId);
assert.equal(derivationLineage?.length, 1);
assert.equal(derivationLineage![0].source_evidence_record_id, ids.evidence1);
assert.equal(derivationLineage![0].artifact_id, ids.artifact1);

// 6. Application snapshot flow
// Create application
const { data: appData, error: appCreateErr } = await clientA.schema('sih26044')
  .from('applications')
  .insert({
    id: ids.application1,
    applicant_actor_id: ids.actorA,
    opportunity_id: ids.opportunity,
    opportunity_version_id: ids.version,
    owner_organization_id: ids.orgA,
    initial_stage: 'saved',
  }).select().single();
assert.ifError(appCreateErr);

// Grant application_review consent for Org A covering evidence1
const { data: consentData, error: consentCreateErr } = await clientA.schema('sih26044')
  .from('consent_grants')
  .insert({
    id: ids.consent1,
    subject_actor_id: ids.actorA,
    grantee_organization_id: ids.orgA,
    purpose: 'application_review',
    created_by_actor_id: ids.actorA,
  }).select().single();
assert.ifError(consentCreateErr);

const { error: linkConsentErr } = await clientA.schema('sih26044')
  .from('consent_evidence_records')
  .insert({ consent_grant_id: ids.consent1, evidence_record_id: ids.evidence1 });
assert.ifError(linkConsentErr);

// Call snapshot endpoint
const snapshotRes = await call(userA.token, '/sih/applications/snapshot', {
  applicationId: ids.application1,
  opportunityVersionId: ids.version,
  selectedEvidenceRecordIds: [ids.evidence1],
  consentGrantId: ids.consent1,
});
// Diagnostic: log bounded error if snapshot fails (status, error code only; no tokens/SQL/private data)
const snapshotBody = await snapshotRes.json() as any;
if (snapshotRes.status !== 200) {
  console.error(`[DIAGNOSTIC] snapshot status=${snapshotRes.status} code=${snapshotBody?.error?.code ?? 'unknown'} msg=${snapshotBody?.error?.message ?? ''}`);
}
assert.equal(snapshotRes.status, 200);
const snapshotJson = snapshotBody;
assert.ok(snapshotJson.snapshotId);
assert.ok(snapshotJson.integrityFingerprint);
assert.equal(snapshotJson.recruiterProjection.applicant.displayName, 'D2 Learner A');
assert.equal(snapshotJson.recruiterProjection.applicant.syntheticPersona, undefined);

// Transition application to applied
const { error: applyErr } = await clientA.schema('sih26044')
  .from('application_events')
  .insert({
    application_id: ids.application1,
    from_stage: 'saved',
    to_stage: 'applied',
    event_kind: 'stage_transition',
    actor_id: ids.actorA,
  });
assert.ifError(applyErr);

// Recruiter of Org A can read application
const recruiterClientA = createClient(apiUrl, anonKey, {
  global: { headers: { Authorization: `Bearer ${recruiterUserA.token}` } }, auth: { persistSession: false },
});
const { data: recruiterAppA, error: recruiterReadErr } = await recruiterClientA.schema('sih26044')
  .from('applications')
  .select('id, owner_organization_id')
  .eq('id', ids.application1);
assert.ifError(recruiterReadErr);
assert.equal(recruiterAppA?.length, 1);

// Recruiter of Org B CANNOT read application
const recruiterClientB = createClient(apiUrl, anonKey, {
  global: { headers: { Authorization: `Bearer ${recruiterUserB.token}` } }, auth: { persistSession: false },
});
const { data: recruiterAppB } = await recruiterClientB.schema('sih26044')
  .from('applications')
  .select('id')
  .eq('id', ids.application1);
assert.equal(recruiterAppB?.length, 0);

// Recruiter CANNOT read raw evidence ledger
const { data: rawEvidenceRecruiter } = await recruiterClientA.schema('sih26044')
  .from('evidence_records')
  .select('*')
  .eq('id', ids.evidence1);
assert.equal(rawEvidenceRecruiter?.length, 0);

// Learner A withdraws consent
const { error: withdrawErr } = await clientA.schema('sih26044')
  .from('consent_lifecycle_events')
  .insert({
    consent_grant_id: ids.consent1,
    action: 'withdrawn',
    actor_id: ids.actorA,
    reason: 'Consent withdrawn by learner',
  });
assert.ifError(withdrawErr);

// Recruiter of Org A can NO LONGER read application after consent withdrawal
const { data: recruiterAppAAfterWithdraw } = await recruiterClientA.schema('sih26044')
  .from('applications')
  .select('id')
  .eq('id', ids.application1);
assert.equal(recruiterAppAAfterWithdraw?.length, 0);

// Historical snapshot remains intact in database
const { data: historicalSnapshot } = await clientA.schema('sih26044')
  .from('application_snapshots')
  .select('id, integrity_fingerprint')
  .eq('id', snapshotJson.snapshotId);
assert.equal(historicalSnapshot?.length, 1);

await Promise.all([userA, userB, recruiterUserA, recruiterUserB, userWithoutActor].map(user => admin.auth.admin.deleteUser(user.id)));

console.log(JSON.stringify({
  authActorIdsDistinct: true,
  readinessRecomputeDeterministic: true,
  inputSnapshotPersisted: true,
  subjectFactsMaterialized: true,
  artifactUploadedAndCleanScanned: true,
  artifactBackedEvidenceDerivedWithLineage: true,
  applicationSnapshotFinalizedWithUserContext: true,
  recruiterAuthorizationEnforced: true,
  recruiterRawEvidenceBlocked: true,
  consentWithdrawalRevokesRecruiterRead: true,
  historicalSnapshotPreserved: true,
  failures: [],
}, null, 2));
