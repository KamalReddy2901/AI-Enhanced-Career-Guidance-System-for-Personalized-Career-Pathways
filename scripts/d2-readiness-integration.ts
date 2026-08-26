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
  actorA: '20000000-0000-4000-8000-0000000000a1', actorB: '20000000-0000-4000-8000-0000000000b2',
  recruiter: '20000000-0000-4000-8000-0000000000c3', org: '30000000-0000-4000-8000-000000000001',
  opportunity: '50000000-0000-4000-8000-000000000001', version: '51000000-0000-4000-8000-000000000001',
  requirement: '52000000-0000-4000-8000-000000000001', evidence1: '60000000-0000-4000-8000-000000000001',
  evidence2: '60000000-0000-4000-8000-000000000002',
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
const password = `D2a-${suffix}-Strong!`;

async function createUser(label: string) {
  const email = `d2a-${label}-${suffix}@example.invalid`;
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

const [userA, userB, userWithoutActor] = await Promise.all([
  createUser('learner-a'), createUser('learner-b'), createUser('no-actor'),
]);
assert.notEqual(userA.id, ids.actorA, 'auth user ID and SIH actor ID must be demonstrably distinct');

sql(`
insert into sih26044.actors (id, auth_user_id, display_name) values
  ('${ids.actorA}', '${userA.id}', 'D2 Learner A'),
  ('${ids.actorB}', '${userB.id}', 'D2 Learner B'),
  ('${ids.recruiter}', null, 'D2 Recruiter');
insert into sih26044.organizations (id, legal_name, display_name, kind)
values ('${ids.org}', 'D2 Test Employer', 'D2 Employer', 'employer');
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('${ids.opportunity}', '${ids.org}', 'draft', '${ids.recruiter}');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '${ids.version}', '${ids.opportunity}', 1, 'draft', 'SQL internship', 'D2 fixture', 'internship',
  array['student']::sih26044.opportunity_audience[], 'd2_test', statement_timestamp(),
  'Confirmed SQL internship', '${ids.recruiter}'
);
insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution, canonical_skill_id,
  canonical_skill_label, minimum_proficiency, human_confirmed, confirmed_by_actor_id,
  confirmed_at, confirmation_method
) values (
  '${ids.requirement}', '${ids.version}', 0, 'skill', 'required', 'SQL fundamentals',
  3, 'any_recorded', false, 'exact', 'sql', 'SQL', 2, true, '${ids.recruiter}',
  statement_timestamp(), 'controlled_fixture'
);
insert into sih26044.eligibility_rules (
  opportunity_version_id, ordinal, rule_kind, literal_source_wording, typed_rule_definition,
  human_confirmed, confirmed_by_actor_id, confirmed_at, confirmation_method
) values (
  '${ids.version}', 0, 'education_level', 'Undergraduate or higher',
  '{"kind":"education_level","operator":"at_least","value":"undergraduate"}',
  true, '${ids.recruiter}', statement_timestamp(), 'controlled_fixture'
);
update sih26044.opportunity_versions set status = 'published', published_at = statement_timestamp()
where id = '${ids.version}';
update sih26044.opportunities set status = 'published', current_version_id = '${ids.version}'
where id = '${ids.opportunity}';
insert into sih26044.readiness_subject_facts (
  subject_actor_id, education_level, education_level_confirmed,
  physical_presence_locations_complete, relevant_languages_complete
) values
  ('${ids.actorA}', 'undergraduate', true, true, true),
  ('${ids.actorB}', 'undergraduate', true, true, true);
insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_skill_id, scope_literal_skill_label, source_system,
  source_captured_at, visibility
) values (
  '${ids.evidence1}', '${ids.actorA}', 'Confirmed SQL proficiency', 'self_reported',
  'self_confirmed', 'global_skill', 'sql', 'SQL', 'd2_test', statement_timestamp(), 'private'
);
insert into sih26044.readiness_evidence_projections (
  evidence_record_id, subject_actor_id, skill_id, literal_skill_label,
  proficiency, capability_assertion, directness, observed_at
) values (
  '${ids.evidence1}', '${ids.actorA}', 'sql', 'SQL', 3, 'supports', 'direct', statement_timestamp()
);

insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values ('${ids.unconfirmedOpportunity}', '${ids.org}', 'draft', '${ids.recruiter}');
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '${ids.unconfirmedVersion}', '${ids.unconfirmedOpportunity}', 1, 'draft', 'Unconfirmed role',
  'D2 refusal fixture', 'internship', array['student']::sih26044.opportunity_audience[],
  'd2_test', statement_timestamp(), 'Unconfirmed source', '${ids.recruiter}'
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
  SUPABASE_URL: apiUrl, SUPABASE_ANON_KEY: anonKey, SUPABASE_ELEVATED_KEY: serviceKey,
};
const respond = (data: unknown, status = 200) => Response.json(data, { status });
const call = (token: string, opportunityVersionId: string, extra: Record<string, unknown> = {}) =>
  handleSihRequest(new Request('http://worker.local/sih/readiness/recompute', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityVersionId, ...extra }),
  }), workerEnv, respond);

const invalidSessionResponse = await call('invalid.token.value', ids.version);
assert.equal(invalidSessionResponse.status, 401);
assert.equal((await invalidSessionResponse.json() as any).error.code, 'UNAUTHENTICATED');

const noActorResponse = await call(userWithoutActor.token, ids.version);
assert.equal(noActorResponse.status, 403);
assert.equal((await noActorResponse.json() as any).error.code, 'NO_ACTIVE_SIH_ACTOR');

const responseA = await call(userA.token, ids.version);
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
assert.equal(JSON.stringify(resultA).match(/riasec|workValues|aspiration|counselor|privateGuidance/gi), null);

const directInsert = await clientA.schema('sih26044').from('opportunity_readiness_results').insert({
  id: crypto.randomUUID(), subject_actor_id: ids.actorA, opportunity_id: ids.opportunity,
  opportunity_version_id: ids.version, engine_version: 'browser', evidence_policy_version: 'browser',
  input_version: 'browser', subject_facts_version: 'browser', evidence_projection_version: 'browser',
  readiness_band: 'READY_FOR_REVIEW', result_body: {}, generated_at: new Date().toISOString(),
});
assert.ok(directInsert.error, 'authenticated browser must not insert readiness directly');

const repeatA = (await (await call(userA.token, ids.version)).json() as any).result;
assert.equal(repeatA.resultId, resultA.resultId);
const { data: rowsAfterRepeat, error: rowsError } = await clientA.schema('sih26044')
  .from('opportunity_readiness_results').select('id').eq('opportunity_version_id', ids.version);
assert.ifError(rowsError);
assert.equal(rowsAfterRepeat?.length, 1);

const resultB = (await (await call(userB.token, ids.version)).json() as any).result;
assert.equal(resultB.subjectActorId, ids.actorB);
assert.notEqual(resultB.resultId, resultA.resultId);
assert.equal(resultB.requiredRequirementResults[0].state, 'UNKNOWN');

sql(`
insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_skill_id, scope_literal_skill_label, source_system,
  source_captured_at, visibility
) values (
  '${ids.evidence2}', '${ids.actorA}', 'Additional direct SQL evidence', 'self_reported',
  'self_confirmed', 'global_skill', 'sql', 'SQL', 'd2_test', statement_timestamp(), 'private'
);
insert into sih26044.readiness_evidence_projections (
  evidence_record_id, subject_actor_id, skill_id, literal_skill_label,
  proficiency, capability_assertion, directness, observed_at
) values (
  '${ids.evidence2}', '${ids.actorA}', 'sql', 'SQL', 4, 'supports', 'direct', statement_timestamp()
);
`);
const changedA = (await (await call(userA.token, ids.version)).json() as any).result;
assert.notEqual(changedA.evidenceProjectionVersion, resultA.evidenceProjectionVersion);
assert.notEqual(changedA.inputVersion, resultA.inputVersion);
assert.notEqual(changedA.resultId, resultA.resultId);
const { data: history } = await clientA.schema('sih26044').from('opportunity_readiness_results')
  .select('id').eq('opportunity_version_id', ids.version);
assert.equal(history?.length, 2);

const unconfirmed = await call(userA.token, ids.unconfirmedVersion);
assert.equal(unconfirmed.status, 409);
assert.equal((await unconfirmed.json() as any).error.code, 'UNCONFIRMED_OPPORTUNITY');

const spoof = await call(userB.token, ids.version, { actorId: ids.actorA });
assert.equal(spoof.status, 400);

await Promise.all([userA, userB, userWithoutActor].map(user => admin.auth.admin.deleteUser(user.id)));
console.log(JSON.stringify({
  authActorIdsDistinct: true,
  invalidSessionRefused: true,
  actorAResolved: resultA.subjectActorId,
  actorBResolved: resultB.subjectActorId,
  canonicalResultEquivalent: true,
  directBrowserInsertBlocked: true,
  unchangedRecomputeIdempotent: true,
  changedEvidenceAppendsHistory: true,
  privateGuidanceExcluded: true,
  unconfirmedOpportunityRefused: true,
}, null, 2));
