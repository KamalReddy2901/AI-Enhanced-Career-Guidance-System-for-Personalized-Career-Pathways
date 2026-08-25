import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createDemoInitialState, demoReducer } from '../src/app/demo/demoReducer';
import { currentDemoRecruiterProjection } from '../src/app/demo/demoScenario';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const projectionPath = join(repositoryRoot, 'src', 'app', 'services', 'recruiterProjection.ts');
const source = await readFile(projectionPath, 'utf8');
const prohibitedSourcePatterns: ReadonlyArray<[RegExp, string]> = [
  [/CareerPassport/, 'full Career Passport'],
  [/GuidanceContext|GuidanceProvider|useGuidance/, 'Career Guidance context'],
  [/engine\/(?:matching|weights|gaps)|\bGapReport\b/, 'Engine A scoring/readiness'],
  [/\bRiasec\w*\b|\bWorkValues\b|\bAspiration\w*\b/i, 'private guidance types'],
  [/\.\.\.(?:student|subject|candidate|input)\b/, 'generic student/input object spread'],
];
const sourceViolations = prohibitedSourcePatterns
  .filter(([pattern]) => pattern.test(source))
  .map(([, label]) => label);
assert.deepEqual(sourceViolations, []);

let state = createDemoInitialState();
assert.equal(currentDemoRecruiterProjection(state), undefined);
state = demoReducer(state, { type: 'ATTACH_CONTROLLED_WORK_SAMPLE' });
state = demoReducer(state, { type: 'VERIFY_OBSERVED_CONTRIBUTION' });
state = demoReducer(state, { type: 'VIEW_RECRUITER_PREVIEW' });
state = demoReducer(state, { type: 'GRANT_APPLICATION_CONSENT' });
assert.equal(currentDemoRecruiterProjection(state), undefined,
  'consent without submission must not deliver a recruiter application payload');
state = demoReducer(state, { type: 'SUBMIT_APPLICATION' });
const projection = currentDemoRecruiterProjection(state);
assert.ok(projection);

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
assert.deepEqual(Object.keys(projection!).sort(), allowedTopLevel);

const prohibitedTokens = [
  'riasec',
  'workvalues',
  'work_values',
  'aspiration',
  'counselor',
  'financial',
  'family',
  'constraint',
  'guardian',
  'disability',
  'accessibility',
  'hiringprobability',
  'ranking',
  'employability',
];
const recursiveViolations: string[] = [];
function inspect(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      const normalized = key.toLocaleLowerCase('en').replace(/[^a-z0-9_]/g, '');
      if (prohibitedTokens.some(token => normalized.includes(token))) recursiveViolations.push(`${path}.${key}`);
      inspect(nested, `${path}.${key}`);
    });
  }
}
inspect(projection, 'projection');
assert.deepEqual(recursiveViolations, [], `Prohibited recruiter projection fields: ${recursiveViolations.join(', ')}`);
assert.equal(projection?.evidence.every(item => state.consentRecords[0].evidenceRecordIds.includes(item.evidenceRecordId)), true,
  'every shared evidence item must be explicitly covered by application_review consent');

console.log(JSON.stringify({
  sourceViolations,
  recursiveViolations,
  allowlistedTopLevelFields: allowedTopLevel,
  consentedEvidenceRecords: projection?.evidence.length,
  preSubmissionPayloadBlocked: true,
  failures: [],
}, null, 2));
