import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  buildProductionRecruiterProjection,
  validateNoProhibitedKeys,
} from '../src/app/services/sih/productionRecruiterProjection';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const projectionPath = join(repositoryRoot, 'src', 'app', 'services', 'sih', 'productionRecruiterProjection.ts');
const source = await readFile(projectionPath, 'utf8');

const prohibitedSourcePatterns: ReadonlyArray<[RegExp, string]> = [
  [/CareerPassport/, 'full Career Passport'],
  [/GuidanceContext|GuidanceProvider|useGuidance/, 'Career Guidance context'],
  [/engine\/(?:matching|weights|gaps)|\bGapReport\b/, 'Engine A scoring/readiness'],
  [/\bimport\b.*?\b(?:Riasec|WorkValues|Aspiration)\b/i, 'private guidance type imports'],
  [/\.\.\.(?:student|subject|candidate|input)\b/, 'generic student/input object spread'],
];

const sourceViolations = prohibitedSourcePatterns
  .filter(([pattern]) => pattern.test(source))
  .map(([, label]) => label);
assert.deepEqual(sourceViolations, []);

// 1. Build a valid production recruiter projection with legitimate literal texts
const validProjection = buildProductionRecruiterProjection({
  applicantDisplayName: 'Real Learner Name',
  applicationId: '40000000-0000-4000-8000-000000000001' as any,
  applicationSnapshotId: '41000000-0000-4000-8000-000000000001' as any,
  consentRecordId: '80000000-0000-4000-8000-000000000001' as any,
  applicationStage: 'applied',
  opportunityId: '50000000-0000-4000-8000-000000000001' as any,
  opportunityVersionId: '51000000-0000-4000-8000-000000000001' as any,
  educationSummary: 'undergraduate (Class of 2026)',
  readinessResultId: '70000000-0000-4000-8000-000000000001' as any,
  readinessBand: 'READY_FOR_REVIEW',
  requirements: [
    {
      requirementId: '52000000-0000-4000-8000-000000000001' as any,
      literalSourceWording: 'Research aspirations statement and counselor endorsement required',
      priority: 'required',
      state: 'MET_STRONG',
      supportingEvidenceIds: ['60000000-0000-4000-8000-000000000001' as any],
    },
  ],
  evidence: [
    {
      evidenceRecordId: '60000000-0000-4000-8000-000000000001' as any,
      literalClaim: 'Completed full-stack project supporting counselor registration workflow',
      provenance: 'artifact_backed',
      verificationState: 'human_verified',
      verificationAssertions: [{
        verificationRequestId: '71000000-0000-4000-8000-000000000001',
        verificationState: 'human_verified',
        action: 'verified_by_human',
        sequenceNumber: 2,
        occurredAt: '2026-08-31T00:00:00Z',
      }],
      artifactIds: ['90000000-0000-4000-8000-000000000001' as any],
      artifactDisplayNames: ['Project Artifact PDF'],
    },
  ],
});

const allowedTopLevel = [
  'applicant',
  'applicationId',
  'applicationSnapshotId',
  'applicationStage',
  'consentRecordId',
  'educationSummary',
  'evidence',
  'opportunityId',
  'opportunityVersionId',
  'readinessBand',
  'readinessResultId',
  'requirements',
  'sharedWorkSamples',
].sort();

assert.deepEqual(Object.keys(validProjection).sort(), allowedTopLevel);
assert.deepEqual(Object.keys(validProjection.evidence[0]).sort(), [
  'artifactDisplayNames', 'artifactIds', 'evidenceRecordId', 'literalClaim',
  'provenance', 'verificationAssertions', 'verificationState',
].sort());
assert.deepEqual(Object.keys(validProjection.evidence[0].verificationAssertions[0]).sort(), [
  'action', 'occurredAt', 'sequenceNumber', 'verificationRequestId', 'verificationState',
].sort());
assert.equal((validProjection.applicant as any).syntheticPersona, undefined, 'Must not have syntheticPersona in production projection');

// 2. Test recursive key inspection catches prohibited keys
const prohibitedKeysToTest = [
  'riasec',
  'work_values',
  'workValues',
  'private_aspirations',
  'counselor_history',
  'counselorHistory',
  'financial_constraints',
  'family_constraints',
  'guardian_data',
  'hiring_probability',
  'candidate_rank',
  'syntheticPersona',
];

for (const key of prohibitedKeysToTest) {
  const badObject = { nested: { [key]: 'prohibited data' } };
  assert.throws(
    () => validateNoProhibitedKeys(badObject),
    /Prohibited key detected/,
    `Should reject prohibited key: ${key}`,
  );
}

// 3. Ensure legitimate string values containing words like "aspiration" or "counselor" are accepted
const benignObject = {
  literalClaim: 'Research aspiration statement completed with counselor guidance note',
  requirements: [{ wording: 'Counselor registration proof' }],
};
assert.doesNotThrow(() => validateNoProhibitedKeys(benignObject));

console.log(JSON.stringify({
  productionProjectorSourceValid: true,
  allowlistedTopLevelFields: allowedTopLevel,
  prohibitedKeysBlockedCount: prohibitedKeysToTest.length,
  legitimateLiteralValuesPreserved: true,
  syntheticPersonaExcluded: true,
  failures: [],
}, null, 2));
