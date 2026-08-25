import assert from 'node:assert/strict';
import { DEMO_IDS } from '../src/app/demo/demoFixtures';
import { createDemoInitialState, demoReducer } from '../src/app/demo/demoReducer';
import {
  buildDemoInstitutionAnalytics,
  currentDemoReadiness,
  currentDemoRecruiterProjection,
} from '../src/app/demo/demoScenario';

const requiredState = (state: ReturnType<typeof createDemoInitialState>, requirementId: string) =>
  currentDemoReadiness(state).requiredRequirementResults.find(result => result.requirementId === requirementId);

const initial = createDemoInitialState();
const initialReadiness = currentDemoReadiness(initial);
assert.equal(initialReadiness.eligibilityStatus, 'ELIGIBLE');
assert.deepEqual(initialReadiness.requiredRequirementResults.map(result => result.state), [
  'MET_STRONG',
  'PARTIAL',
  'MET_WEAK_EVIDENCE',
]);
assert.equal(initialReadiness.readinessBand, 'BUILDING_EVIDENCE');
assert.equal(initialReadiness.resultId, DEMO_IDS.readinessInitial);
assert.equal(initialReadiness.preferredRequirementResults.length, 1);

const originalEvidenceIds = initial.evidenceLedger.map(entry => entry.record.id);
const afterWorkSample = demoReducer(initial, { type: 'ATTACH_CONTROLLED_WORK_SAMPLE' });
const afterWorkSampleReadiness = currentDemoReadiness(afterWorkSample);
assert.equal(afterWorkSample.evidenceLedger.length, initial.evidenceLedger.length + 1);
assert.deepEqual(afterWorkSample.evidenceLedger.slice(0, initial.evidenceLedger.length).map(entry => entry.record.id), originalEvidenceIds,
  'all original evidence must be retained in its original order');
assert.equal(initial.evidenceLedger.find(entry => entry.record.id === DEMO_IDS.evidenceWorkSampleClaim)?.record.provenance, 'self_reported');
assert.equal(afterWorkSample.evidenceLedger.find(entry => entry.record.id === DEMO_IDS.evidenceWorkSampleClaim)?.record.provenance, 'self_reported');
assert.equal(requiredState(afterWorkSample, DEMO_IDS.requirementWorkSample)?.state, 'MET_STRONG');
assert.equal(requiredState(afterWorkSample, DEMO_IDS.requirementAyushStandardization)?.state, 'MET_WEAK_EVIDENCE');
assert.equal(afterWorkSampleReadiness.readinessBand, 'NEAR_READY');
assert.match(afterWorkSample.traceEvents.at(-1)?.summary ?? '', /BUILDING_EVIDENCE → NEAR_READY/);
assert.equal(afterWorkSampleReadiness.resultId, DEMO_IDS.readinessWorkSample);
assert.equal(afterWorkSample.readinessHistory.length, 2);

const beforeMentorUnrelated = afterWorkSampleReadiness.requiredRequirementResults.filter(result =>
  result.requirementId !== DEMO_IDS.requirementAyushStandardization);
const contributionProvenanceBefore = afterWorkSample.evidenceLedger.find(entry => entry.record.id === DEMO_IDS.evidenceAyushContribution)?.record.provenance;
const afterMentor = demoReducer(afterWorkSample, { type: 'VERIFY_OBSERVED_CONTRIBUTION' });
const afterMentorReadiness = currentDemoReadiness(afterMentor);
assert.equal(afterMentor.verificationEvents.length, 1);
assert.equal(afterMentor.verificationEvents[0].evidenceRecordId, DEMO_IDS.evidenceAyushContribution);
assert.equal(afterMentor.verificationEvents[0].scope.kind, 'opportunity');
assert.equal(afterMentor.evidenceLedger.find(entry => entry.record.id === DEMO_IDS.evidenceAyushContribution)?.record.provenance, contributionProvenanceBefore,
  'verification must not escalate or rewrite evidence provenance');
assert.equal(requiredState(afterMentor, DEMO_IDS.requirementAyushStandardization)?.state, 'MET_STRONG');
assert.equal(afterMentorReadiness.readinessBand, 'READY_FOR_REVIEW');
assert.match(afterMentor.traceEvents.at(-1)?.summary ?? '', /NEAR_READY → READY_FOR_REVIEW/);
assert.equal(afterMentorReadiness.resultId, DEMO_IDS.readinessMentor);
assert.deepEqual(
  afterMentorReadiness.requiredRequirementResults.filter(result => result.requirementId !== DEMO_IDS.requirementAyushStandardization),
  beforeMentorUnrelated,
  'mentor verification must leave every unrelated requirement result unchanged',
);

assert.strictEqual(demoReducer(afterMentor, { type: 'SUBMIT_APPLICATION' }), afterMentor,
  'application submission must be impossible before controlled consent');
assert.equal(currentDemoRecruiterProjection(afterMentor), undefined,
  'recruiter must receive no candidate projection before submission');

const afterPreview = demoReducer(afterMentor, { type: 'VIEW_RECRUITER_PREVIEW' });
assert.equal(afterPreview.recruiterPreviewViewed, true);
assert.equal(afterPreview.consentRecords.length, 0, 'viewing the preview must not imply consent');
const afterConsent = demoReducer(afterPreview, { type: 'GRANT_APPLICATION_CONSENT' });
assert.equal(afterConsent.consentRecords.length, 1);
assert.equal(afterConsent.consentRecords[0].purpose, 'application_review');
assert.equal(afterConsent.consentRecords[0].status, 'granted');
const afterApply = demoReducer(afterConsent, { type: 'SUBMIT_APPLICATION' });
assert.equal(afterApply.application?.currentStage, 'applied');
assert.equal(afterApply.applicationEvents.at(-1)?.toStage, 'applied');
assert.ok(afterApply.applicationSnapshot);
assert.equal(Object.isFrozen(afterApply.applicationSnapshot), true);
assert.equal(afterApply.applicationSnapshot?.opportunityVersionId, afterMentor.fixture.opportunityVersion.id);
assert.equal(afterApply.applicationSnapshot?.submittedReadiness.readinessResultId, afterMentorReadiness.resultId);
assert.equal(afterApply.applicationSnapshot?.submittedReadiness.engineVersion, afterMentorReadiness.engineVersion);
assert.equal(afterApply.applicationSnapshot?.submittedReadiness.evidencePolicyVersion, afterMentorReadiness.policyVersion);
assert.equal(afterApply.applicationSnapshot?.submittedReadiness.inputVersion, afterMentorReadiness.inputVersion);
assert.equal(afterApply.applicationSnapshot?.submittedReadiness.evidenceProjectionVersion, afterMentorReadiness.evidenceProjectionVersion);
assert.deepEqual(afterApply.applicationSnapshot?.consentRecordIds, [DEMO_IDS.consentApplicationReview]);
const projection = currentDemoRecruiterProjection(afterApply);
assert.ok(projection);
assert.equal(projection?.readinessResultId, afterMentorReadiness.resultId);

const snapshotBeforeHumanReview = JSON.stringify(afterApply.applicationSnapshot);
const afterReview = demoReducer(afterApply, { type: 'START_HUMAN_REVIEW' });
assert.equal(afterReview.application?.currentStage, 'under_review');
assert.equal(afterReview.applicationEvents.at(-1)?.actorId, DEMO_IDS.recruiter);
assert.equal(afterReview.applicationEvents.at(-1)?.eventKind, 'stage_transition');
const afterShortlist = demoReducer(afterReview, { type: 'SHORTLIST_APPLICATION' });
assert.equal(afterShortlist.application?.currentStage, 'shortlisted');
assert.equal(afterShortlist.applicationEvents.at(-1)?.actorId, DEMO_IDS.recruiter);
assert.equal(JSON.stringify(afterShortlist.applicationSnapshot), snapshotBeforeHumanReview,
  'human application events must not mutate the submitted snapshot');
assert.equal('rankingScore' in (currentDemoRecruiterProjection(afterShortlist) ?? {}), false);

const outcomeCountBefore = buildDemoInstitutionAnalytics(afterShortlist).points.find(point => point.metric === 'outcome_count')?.value;
const afterOutcome = demoReducer(afterShortlist, { type: 'RECORD_SELECTED_OUTCOME' });
assert.equal(afterOutcome.outcomeEvents.length, 1);
assert.equal(afterOutcome.outcomeEvents[0].kind, 'selected');
assert.deepEqual(afterOutcome.outcomeEvents[0].evidenceEmissions, [],
  'a selected outcome must not fabricate outcome-linked mastery evidence');
assert.equal(afterOutcome.outcomeEvents[0].recordedBy, DEMO_IDS.recruiter);
const outcomeAnalytics = buildDemoInstitutionAnalytics(afterOutcome);
assert.equal(outcomeAnalytics.points.find(point => point.metric === 'outcome_count')?.value, (outcomeCountBefore ?? 0) + 1);
assert.equal(outcomeAnalytics.points.every(point => point.causalClaimed === false), true);
assert.equal(buildDemoInstitutionAnalytics(afterOutcome, 99).points.every(point => point.suppressed && point.value === 0), true,
  'cohorts below the configured minimum must be suppressed');

const reset = demoReducer(afterOutcome, { type: 'RESET_CONTROLLED_DEMO' });
assert.deepEqual(reset, initial, 'reset must return byte-for-byte to the deterministic fixture baseline');

console.log(JSON.stringify({
  initial: {
    eligibility: initialReadiness.eligibilityStatus,
    requiredStates: initialReadiness.requiredRequirementResults.map(result => result.state),
    band: initialReadiness.readinessBand,
  },
  afterWorkSample: {
    targetedState: requiredState(afterWorkSample, DEMO_IDS.requirementWorkSample)?.state,
    band: afterWorkSampleReadiness.readinessBand,
  },
  afterMentor: {
    targetedState: requiredState(afterMentor, DEMO_IDS.requirementAyushStandardization)?.state,
    band: afterMentorReadiness.readinessBand,
  },
  applicationStage: afterApply.application?.currentStage,
  recruiterHumanStage: afterShortlist.application?.currentStage,
  outcomeCount: afterOutcome.outcomeEvents.length,
  resetByteEquivalent: true,
  failures: [],
}, null, 2));
