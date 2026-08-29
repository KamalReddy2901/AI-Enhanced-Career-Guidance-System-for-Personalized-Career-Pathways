import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorId, ApplicationId, EvidenceRecordId } from '../src/app/domain';
import { SihBrowserDal } from '../src/app/services/sih';

interface FakeResponse { data: unknown; error: null }
interface RecordedQuery { table: string; select?: string; filters: Array<[string, string, unknown]> }
interface RecordedRpc { name: string; args: Record<string, unknown> }

class FakeQuery implements PromiseLike<FakeResponse> {
  private readonly recorded: RecordedQuery;

  constructor(private readonly response: FakeResponse, table: string, private readonly queries: RecordedQuery[]) {
    this.recorded = { table, filters: [] };
    queries.push(this.recorded);
  }

  select(columns: string) { this.recorded.select = columns; return this; }
  eq(column: string, value: unknown) { this.recorded.filters.push(['eq', column, value]); return this; }
  in(column: string, value: unknown) { this.recorded.filters.push(['in', column, value]); return this; }
  order() { return this; }
  insert() { return this; }
  single() { return Promise.resolve(this.response); }
  maybeSingle() { return Promise.resolve(this.response); }
  then<TResult1 = FakeResponse, TResult2 = never>(
    onfulfilled?: ((value: FakeResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

function fakeDal(responses: FakeResponse[], rpcResponses: FakeResponse[] = []) {
  const queries: RecordedQuery[] = [];
  const rpcs: RecordedRpc[] = [];
  let offset = 0;
  let rpcOffset = 0;
  const client = {
    schema(schema: string) {
      assert.equal(schema, 'sih26044');
      return {
        from(table: string) {
          const response = responses[offset++];
          assert.ok(response, `Missing fake response for ${table}`);
          return new FakeQuery(response, table, queries);
        },
        rpc(name: string, args: Record<string, unknown>) {
          rpcs.push({ name, args });
          const response = rpcResponses[rpcOffset++];
          assert.ok(response, `Missing fake response for RPC ${name}`);
          return Promise.resolve(response);
        },
      };
    },
  } as unknown as SupabaseClient;
  return { dal: new SihBrowserDal(client), queries, rpcs };
}

const ok = (data: unknown): FakeResponse => ({ data, error: null });
const actorId = 'actor-1' as ActorId;
const evidenceId = 'evidence-1' as EvidenceRecordId;
const applicationId = 'application-1' as ApplicationId;
const evidenceRow = {
  id: evidenceId, subject_actor_id: actorId, literal_claim: 'Built an accessible prototype',
  provenance: 'self_reported', initial_verification_state: 'unverified', proposal_source: 'user_entry',
  scope_kind: 'global_skill', scope_skill_id: null, scope_literal_skill_label: 'Accessibility testing',
  scope_opportunity_id: null, scope_requirement_id: null, scope_organization_id: null, scope_outcome_event_id: null,
  source_system: 'student_entry', source_record_id: 'entry-1', source_url: null,
  source_captured_at: '2026-08-28T08:00:00.000Z', visibility: 'private', created_at: '2026-08-28T08:00:00.000Z',
} as const;
const evidenceReadModel = {
  id: evidenceId,
  subjectActorId: actorId,
  literalClaim: 'Built an accessible prototype',
  provenance: 'self_reported',
  initialVerificationState: 'unverified',
  proposalSource: 'user_entry',
  scope: { kind: 'global_skill', skillId: undefined, literalSkillLabel: 'Accessibility testing' },
  source: {
    system: 'student_entry',
    recordId: 'entry-1',
    url: undefined,
    capturedAt: '2026-08-28T08:00:00.000Z',
  },
  visibility: 'private',
  createdAt: '2026-08-28T08:00:00.000Z',
} as const;

{
  const { dal, queries } = fakeDal([ok([evidenceRow])]);
  const rows = await dal.listEvidenceForSubject(actorId);
  assert.deepEqual(rows, [evidenceReadModel]);
  assert.equal('currentVerification' in (rows[0] ?? {}), false,
    'Evidence ledger rows must not expose a universal verification state');
  assert.deepEqual(queries.map(query => query.table), ['evidence_records'],
    'Evidence ledger must not collapse events from multiple requests into one evidence-level state');
  assert.ok(queries.every(query => query.select && query.select !== '*'));
}

{
  const { dal, queries } = fakeDal([ok([])]);
  assert.deepEqual(await dal.listEvidenceForSubject(actorId), []);
  assert.deepEqual(queries.map(query => query.table), ['evidence_records']);
}

{
  const { dal, queries } = fakeDal([ok(evidenceRow), ok(null)]);
  assert.deepEqual(await dal.getEvidenceRecord(evidenceId), evidenceReadModel,
    'Targeted evidence read must preserve the canonical evidence read-model mapping');
  assert.equal(await dal.getEvidenceRecord('inaccessible-evidence' as EvidenceRecordId), null,
    'Missing and RLS-inaccessible evidence must map to null');
  assert.deepEqual(queries.map(query => query.table), ['evidence_records', 'evidence_records'],
    'Verifier detail must query evidence_records only');
  assert.deepEqual(queries[0]?.filters, [['eq', 'id', evidenceId]],
    'Targeted evidence read must use an exact id filter');
  assert.deepEqual(queries[1]?.filters, [['eq', 'id', 'inaccessible-evidence']],
    'Targeted evidence read must not require a bulk subject evidence query');
  assert.equal(queries[0]?.select, queries[1]?.select);
  assert.ok(queries.every(query => query.select && query.select !== '*'),
    'Targeted evidence reads must reuse the explicit evidence select');
}

{
  const { dal, queries } = fakeDal([
    ok([{ evidence_record_id: evidenceId, artifact_id: 'artifact-1', linked_at: '2026-08-28T08:30:00.000Z' }]),
    ok([{ id: 'artifact-1', storage_bucket_id: 'career-evidence-private', storage_object_path: `${actorId}/artifact-1/file.pdf`, media_type: 'application/pdf', display_name: 'Work sample', integrity_fingerprint: 'abc', scan_status: 'clean', created_at: '2026-08-28T08:20:00.000Z' }]),
  ]);
  const artifacts = await dal.listArtifactsForEvidence(evidenceId);
  assert.equal(artifacts[0]?.displayName, 'Work sample');
  assert.equal(artifacts[0]?.storageObjectPath, `${actorId}/artifact-1/file.pdf`);
  assert.deepEqual(queries.map(query => query.table), ['evidence_artifact_links', 'artifacts']);
}

{
  const requestRow = {
    id: 'request-1', evidence_record_id: evidenceId, subject_actor_id: actorId,
    requested_verifier_actor_id: 'verifier-1', requested_verifier_organization_id: 'org-1', consent_grant_id: 'consent-1',
    scope_kind: 'organization', scope_skill_id: null, scope_literal_skill_label: null, scope_opportunity_id: null,
    scope_requirement_id: null, scope_organization_id: 'org-1', scope_outcome_event_id: null,
    status: 'requested', requested_at: '2026-08-28T08:00:00.000Z', expires_at: null, closed_at: null,
  };
  const { dal } = fakeDal([ok([requestRow]), ok(requestRow), ok(null)]);
  assert.equal((await dal.listVerificationRequestsForVerifier({ requestedVerifierActorId: 'verifier-1' as ActorId, status: 'requested' }))[0]?.scope.kind, 'organization');
  assert.equal((await dal.getVerificationRequest('request-1'))?.id, 'request-1');
  assert.equal(await dal.getVerificationRequest('inaccessible-request'), null);
}

{
  const actions = ['submitted_for_review', 'self_confirmed', 'verified_by_human', 'verified_by_issuer', 'disputed', 'revoked', 'corrected'] as const;
  const { dal } = fakeDal([ok(actions.map((action, index) => ({
    id: `event-${index}`, sequence_number: index + 1, verification_request_id: 'request-1', evidence_record_id: evidenceId,
    action, actor_id: 'actor-1', actor_organization_id: null, reason: action === 'disputed' ? 'Needs correction' : null,
    supersedes_event_id: null, occurred_at: `2026-08-28T0${index}:00:00.000Z`,
  })))]);
  assert.deepEqual((await dal.listVerificationEvents({ verificationRequestId: 'request-1' })).map(event => event.action), actions);
}

{
  const application = { id: applicationId, applicant_actor_id: actorId, opportunity_id: 'opportunity-1', opportunity_version_id: 'version-1', owner_organization_id: 'org-1', initial_stage: 'saved', created_at: '2026-08-28T08:00:00.000Z' };
  const { dal } = fakeDal([
    ok([application]), ok([{ application_id: applicationId, to_stage: 'preparing', sequence_number: 1 }]),
    ok(application), ok([{ application_id: applicationId, to_stage: 'preparing', sequence_number: 1 }]),
    ok(null),
    ok([{ id: 'app-event-1', sequence_number: 1, application_id: applicationId, from_stage: 'saved', to_stage: 'preparing', event_kind: 'stage_transition', actor_id: actorId, reason: null, note: 'Draft started', occurred_at: '2026-08-28T09:00:00.000Z' }]),
  ]);
  assert.equal((await dal.listApplicationsForApplicant(actorId))[0]?.currentStage, 'preparing');
  assert.equal((await dal.getApplication(applicationId))?.currentStage, 'preparing');
  assert.equal(await dal.getApplication('missing' as ApplicationId), null);
  assert.equal((await dal.listApplicationEvents(applicationId))[0]?.eventKind, 'stage_transition');
}

{
  const application = { id: applicationId, applicant_actor_id: actorId, opportunity_id: 'opportunity-1', opportunity_version_id: 'version-1', owner_organization_id: 'org-1', initial_stage: 'saved', created_at: '2026-08-28T08:00:00.000Z' };
  const { dal, queries } = fakeDal([
    ok([application]),
    ok([{ application_id: applicationId, to_stage: 'under_review', sequence_number: 2 }]),
  ]);
  const rows = await dal.listApplicationsForRecruiterOrganization('org-1' as any, {
    opportunityId: 'opportunity-1' as any,
    currentStage: 'under_review',
  });
  assert.equal(rows[0]?.currentStage, 'under_review');
  assert.deepEqual(queries.map(query => query.table), ['applications', 'application_events']);
  assert.ok(queries[0]?.filters.some(([, column, value]) => column === 'owner_organization_id' && value === 'org-1'),
    'Recruiter discovery must be explicitly organization-scoped in addition to RLS');
  assert.ok(queries[0]?.filters.some(([, column, value]) => column === 'opportunity_id' && value === 'opportunity-1'));
  assert.ok(queries.every(query => query.select && query.select !== '*'));
}

{
  const versionId = '51000000-0000-4000-8000-000000000001';
  const { dal, rpcs } = fakeDal([], [ok(versionId)]);
  assert.equal(await dal.publishOpportunityVersion(versionId as any), versionId);
  assert.deepEqual(rpcs, [{
    name: 'publish_opportunity_version',
    args: { requested_version_id: versionId },
  }]);
}

{
  const { dal, queries } = fakeDal([
    ok([{ id: 'consent-1', subject_actor_id: actorId, grantee_organization_id: 'org-1', purpose: 'application_review', granted_at: '2026-08-28T08:00:00.000Z', expires_at: null }]),
    ok([{ consent_grant_id: 'consent-1', sequence_number: 2, action: 'withdrawn', occurred_at: '2026-08-28T10:00:00.000Z' }]),
    ok([{ consent_grant_id: 'consent-1', evidence_record_id: evidenceId }]),
  ]);
  const consents = await dal.listApplicationReviewConsentsForSubject(actorId);
  assert.equal(consents[0]?.purpose, 'application_review');
  assert.equal(consents[0]?.status, 'withdrawn');
  assert.deepEqual(consents[0]?.evidenceRecordIds, [evidenceId]);
  assert.ok(queries[0]?.filters.some(([, column, value]) => column === 'purpose' && value === 'application_review'));
}

let browserDalSource = await readFile(fileURLToPath(new URL('../src/app/services/sih/browserDal.ts', import.meta.url)), 'utf8');
browserDalSource = browserDalSource.replace(/\r\n/g, '\n');
assert.doesNotMatch(browserDalSource, /\.select\(\s*['"]\*['"]\s*\)/, 'SIH browser DAL reads must not use select(*)');
assert.doesNotMatch(browserDalSource, /readiness_percentage|hiring_probability|candidate_rank/i);
const evidenceLedgerMethod = browserDalSource.match(/async listEvidenceForSubject[\s\S]*?\n  }\n\n  async listArtifactsForEvidence/)?.[0] ?? '';
assert.ok(evidenceLedgerMethod, 'Evidence ledger read method must remain present');
assert.doesNotMatch(evidenceLedgerMethod, /verification_events|currentVerification|latestByEvidence/,
  'Evidence ledger must not derive a cross-request universal verification state');
const targetedEvidenceMethod = browserDalSource.match(/async getEvidenceRecord[\s\S]*?\n  }\n\n  async listArtifactsForEvidence/)?.[0] ?? '';
assert.ok(targetedEvidenceMethod, 'Targeted evidence record read method must remain present');
assert.match(targetedEvidenceMethod, /\.from\(['"]evidence_records['"]\)/,
  'Targeted evidence read must query evidence_records');
assert.match(targetedEvidenceMethod, /\.select\(evidenceSelect\)/,
  'Targeted evidence read must reuse the explicit evidence select');
assert.match(targetedEvidenceMethod, /\.eq\(['"]id['"], evidenceRecordId\)/,
  'Targeted evidence read must use the exact evidence record id filter');
assert.doesNotMatch(targetedEvidenceMethod, /subject_actor_id|listEvidenceForSubject/,
  'Verifier detail must not depend on a bulk subject evidence read');
const recruiterApplicationIndexMethod = browserDalSource.match(/async listApplicationsForRecruiterOrganization[\s\S]*?\n  }\n\n  async getApplication/)?.[0] ?? '';
assert.ok(recruiterApplicationIndexMethod, 'Recruiter organization application index must remain present');
assert.match(recruiterApplicationIndexMethod, /\.from\(['"]applications['"]\)/);
assert.match(recruiterApplicationIndexMethod, /\.eq\(['"]owner_organization_id['"], ownerOrganizationId\)/,
  'Recruiter discovery must apply an organization workflow filter while RLS remains the authority');
assert.match(recruiterApplicationIndexMethod, /mapApplicationsWithCurrentStage/,
  'Recruiter discovery must compose current stage from append-only application events');
assert.doesNotMatch(recruiterApplicationIndexMethod, /listApplicationsForApplicant|readiness|score|rank|probability/i,
  'Recruiter discovery must not reuse applicant discovery or introduce candidate scoring');
const publishMethod = browserDalSource.match(/async publishOpportunityVersion[\s\S]*?\n  }\n}/)?.[0] ?? '';
assert.ok(publishMethod, 'Explicit opportunity publication method must remain present');
assert.match(publishMethod, /\.rpc\(['"]publish_opportunity_version['"]/,
  'Publication must use the guarded database contract rather than draft table mutation');
assert.doesNotMatch(publishMethod, /\.from\(['"](?:opportunities|opportunity_versions)['"]\).*?\.update/s,
  'Publication must not bypass the guarded database contract');

console.log('SIH browser read contract QA passed.');
