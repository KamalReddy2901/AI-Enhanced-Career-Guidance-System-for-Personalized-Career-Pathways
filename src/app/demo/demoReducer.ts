import type {
  Application,
  ApplicationEvent,
  ApplicationSnapshot,
  ConsentRecord,
  OutcomeEvent,
  VerificationEvent,
} from '../domain';
import { buildRecruiterApplicationProjection } from '../services/recruiterProjection';
import {
  DEMO_FIXTURE,
  DEMO_IDS,
  DEMO_INITIAL_EVIDENCE,
  DEMO_INITIAL_TRACE,
  DEMO_TIME,
  DEMO_WORK_SAMPLE_EVIDENCE,
} from './demoFixtures';
import {
  buildDemoRecruiterSharePreview,
  computeDemoReadiness,
  currentDemoReadiness,
} from './demoScenario';
import type { DemoAction, DemoState, DemoTraceEvent } from './demoTypes';

const trace = (
  id: string,
  kind: DemoTraceEvent['kind'],
  actorLabel: string,
  occurredAt: DemoTraceEvent['occurredAt'],
  summary: string,
): DemoTraceEvent => ({ id, kind, actorLabel, occurredAt, summary });

export function createDemoInitialState(): DemoState {
  const baseline: DemoState = {
    fixture: DEMO_FIXTURE,
    evidenceLedger: DEMO_INITIAL_EVIDENCE,
    verificationEvents: [],
    readinessHistory: [],
    recruiterPreviewViewed: false,
    consentRecords: [],
    applicationEvents: [],
    outcomeEvents: [],
    traceEvents: DEMO_INITIAL_TRACE,
  };
  const initialReadiness = computeDemoReadiness(baseline, 'initial');
  return { ...baseline, readinessHistory: [initialReadiness] };
}

function appendReadiness(
  state: DemoState,
  revision: 'work_sample_attached' | 'mentor_verified',
  event: DemoTraceEvent,
): DemoState {
  const result = computeDemoReadiness(state, revision);
  return {
    ...state,
    readinessHistory: [...state.readinessHistory, result],
    traceEvents: [...state.traceEvents, event],
  };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === 'RESET_CONTROLLED_DEMO') return createDemoInitialState();

  if (action.type === 'ATTACH_CONTROLLED_WORK_SAMPLE') {
    if (state.evidenceLedger.some(entry => entry.record.id === DEMO_IDS.evidenceWorkSampleArtifact)) return state;
    const withEvidence: DemoState = {
      ...state,
      evidenceLedger: [...state.evidenceLedger, DEMO_WORK_SAMPLE_EVIDENCE],
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-work-sample-attached',
        'work_sample_attached',
        'Aarav — synthetic learner',
        DEMO_TIME.workSampleAttached,
        'A predefined controlled work sample was appended; the earlier self-report remains unchanged.',
      )],
    };
    return appendReadiness(withEvidence, 'work_sample_attached', trace(
      'demo-trace-readiness-after-work-sample',
      'readiness_recomputed',
      'Deterministic Engine B',
      DEMO_TIME.workSampleReadiness,
      'The work-sample requirement moved PARTIAL → MET_STRONG and the band moved BUILDING_EVIDENCE → NEAR_READY; prior readiness remains in history.',
    ));
  }

  if (action.type === 'VERIFY_OBSERVED_CONTRIBUTION') {
    if (state.verificationEvents.some(event => event.id === DEMO_IDS.mentorVerification)) return state;
    if (!state.evidenceLedger.some(entry => entry.record.id === DEMO_IDS.evidenceWorkSampleArtifact)) return state;
    const verification: VerificationEvent = {
      id: DEMO_IDS.mentorVerification,
      evidenceRecordId: DEMO_IDS.evidenceAyushContribution,
      action: 'verified_by_human',
      actorId: DEMO_IDS.mentor,
      actorOrganizationId: DEMO_IDS.institutionOrganization,
      scope: {
        kind: 'opportunity',
        opportunityId: DEMO_IDS.opportunity,
        requirementId: DEMO_IDS.requirementAyushStandardization,
      },
      reason: 'Observed contribution during the controlled supervised terminology exercise; contextual to this requirement only.',
      occurredAt: DEMO_TIME.mentorVerified,
    };
    const withVerification: DemoState = {
      ...state,
      verificationEvents: [...state.verificationEvents, verification],
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-mentor-verification',
        'mentor_verification_appended',
        'Dr. Meera — synthetic faculty mentor',
        DEMO_TIME.mentorVerified,
        'A scoped human verification event was appended without changing evidence provenance or unrelated requirements.',
      )],
    };
    return appendReadiness(withVerification, 'mentor_verified', trace(
      'demo-trace-readiness-after-mentor',
      'readiness_recomputed',
      'Deterministic Engine B',
      DEMO_TIME.mentorReadiness,
      'Bounded verification moved exactly one requirement MET_WEAK_EVIDENCE → MET_STRONG and the band moved NEAR_READY → READY_FOR_REVIEW.',
    ));
  }

  if (action.type === 'VIEW_RECRUITER_PREVIEW') {
    if (state.recruiterPreviewViewed || !buildDemoRecruiterSharePreview(state)) return state;
    return {
      ...state,
      recruiterPreviewViewed: true,
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-preview-viewed',
        'recruiter_preview_viewed',
        'Aarav — synthetic learner',
        DEMO_TIME.previewViewed,
        'The purpose-specific recruiter share preview was viewed; viewing alone did not grant consent.',
      )],
    };
  }

  if (action.type === 'GRANT_APPLICATION_CONSENT') {
    if (!state.recruiterPreviewViewed || state.consentRecords.length > 0) return state;
    const preview = buildDemoRecruiterSharePreview(state);
    if (!preview) return state;
    const consent: ConsentRecord = {
      id: DEMO_IDS.consentApplicationReview,
      subjectActorId: DEMO_IDS.student,
      granteeOrganizationId: DEMO_IDS.partnerOrganization,
      purpose: 'application_review',
      evidenceRecordIds: preview.evidence.map(item => item.evidenceRecordId),
      status: 'granted',
      grantedAt: DEMO_TIME.consentGranted,
      prohibitedRecruiterData: [
        'riasec',
        'work_values',
        'private_aspirations',
        'counselor_history',
        'financial_constraints',
        'family_constraints',
        'private_constraints',
        'guardian_data',
        'unrelated_disability_information',
        'unrelated_accessibility_information',
      ],
    };
    return {
      ...state,
      consentRecords: [...state.consentRecords, consent],
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-consent-granted',
        'consent_granted',
        'Aarav — synthetic learner',
        DEMO_TIME.consentGranted,
        'Purpose-specific application_review consent was explicitly granted for selected evidence only.',
      )],
    };
  }

  if (action.type === 'SUBMIT_APPLICATION') {
    if (state.application || state.consentRecords.length === 0) return state;
    const consent = state.consentRecords.find(record => record.id === DEMO_IDS.consentApplicationReview && record.status === 'granted');
    const preview = buildDemoRecruiterSharePreview(state);
    if (!consent || !preview) return state;
    const readiness = currentDemoReadiness(state);
    const snapshot: ApplicationSnapshot = Object.freeze({
      id: DEMO_IDS.applicationSnapshot,
      applicationId: DEMO_IDS.application,
      opportunityVersionId: state.fixture.opportunityVersion.id,
      evidenceRecordIds: Object.freeze([...consent.evidenceRecordIds]),
      requirementResponses: Object.freeze(Object.fromEntries(
        [...readiness.requiredRequirementResults, ...readiness.preferredRequirementResults]
          .map(result => [result.requirementId, result.state]),
      )),
      consentRecordIds: Object.freeze([consent.id]),
      submittedReadiness: Object.freeze({
        readinessResultId: readiness.resultId,
        readinessBand: readiness.readinessBand,
        engineVersion: readiness.engineVersion,
        evidencePolicyVersion: readiness.policyVersion,
        inputVersion: readiness.inputVersion,
        subjectFactsVersion: readiness.subjectFactsVersion,
        evidenceProjectionVersion: readiness.evidenceProjectionVersion,
      }),
      capturedAt: DEMO_TIME.applicationSubmitted,
      contentHash: 'controlled-demo-fingerprint-application-snapshot-v1',
    });
    const application: Application = {
      id: DEMO_IDS.application,
      applicantActorId: DEMO_IDS.student,
      opportunityId: state.fixture.opportunity.id,
      opportunityVersionId: state.fixture.opportunityVersion.id,
      ownerOrganizationId: state.fixture.opportunity.ownerOrganizationId,
      currentStage: 'applied',
      currentSnapshotId: snapshot.id,
      createdAt: DEMO_TIME.applicationSubmitted,
      updatedAt: DEMO_TIME.applicationSubmitted,
    };
    const event: ApplicationEvent = {
      id: DEMO_IDS.applicationAppliedEvent,
      applicationId: application.id,
      fromStage: 'preparing',
      toStage: 'applied',
      eventKind: 'stage_transition',
      actorId: DEMO_IDS.student,
      note: 'Controlled application submitted after explicit purpose-specific consent.',
      occurredAt: DEMO_TIME.applicationSubmitted,
    };
    return {
      ...state,
      application,
      applicationSnapshot: snapshot,
      applicationEvents: [...state.applicationEvents, event],
      submittedRecruiterProjection: buildRecruiterApplicationProjection(
        preview,
        application.id,
        snapshot.id,
        consent.id,
        application.currentStage,
      ),
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-application-submitted',
        'application_submitted',
        'Aarav — synthetic learner',
        DEMO_TIME.applicationSubmitted,
        'An immutable snapshot and attributable applied event were appended; readiness is not recomputed for the recruiter.',
      )],
    };
  }

  if (action.type === 'START_HUMAN_REVIEW') {
    if (!state.application || state.application.currentStage !== 'applied') return state;
    const event: ApplicationEvent = {
      id: DEMO_IDS.applicationReviewEvent,
      applicationId: state.application.id,
      fromStage: 'applied',
      toStage: 'under_review',
      eventKind: 'stage_transition',
      actorId: DEMO_IDS.recruiter,
      note: 'Synthetic recruiter explicitly started human review.',
      occurredAt: DEMO_TIME.reviewStarted,
    };
    return {
      ...state,
      application: { ...state.application, currentStage: 'under_review', updatedAt: DEMO_TIME.reviewStarted },
      applicationEvents: [...state.applicationEvents, event],
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-review-started',
        'recruiter_review_started',
        'Riya — synthetic industry reviewer',
        DEMO_TIME.reviewStarted,
        'A human-triggered application event moved the controlled application to under review.',
      )],
    };
  }

  if (action.type === 'SHORTLIST_APPLICATION') {
    if (!state.application || state.application.currentStage !== 'under_review') return state;
    const event: ApplicationEvent = {
      id: DEMO_IDS.applicationShortlistEvent,
      applicationId: state.application.id,
      fromStage: 'under_review',
      toStage: 'shortlisted',
      eventKind: 'stage_transition',
      actorId: DEMO_IDS.recruiter,
      note: 'Synthetic recruiter explicitly recorded a human shortlist decision.',
      occurredAt: DEMO_TIME.shortlisted,
    };
    return {
      ...state,
      application: { ...state.application, currentStage: 'shortlisted', updatedAt: DEMO_TIME.shortlisted },
      applicationEvents: [...state.applicationEvents, event],
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-shortlisted',
        'recruiter_shortlisted',
        'Riya — synthetic industry reviewer',
        DEMO_TIME.shortlisted,
        'A second human-triggered event recorded shortlist; no ranking or automatic decision was used.',
      )],
    };
  }

  if (action.type === 'RECORD_SELECTED_OUTCOME') {
    if (!state.application || state.application.currentStage !== 'shortlisted' || state.outcomeEvents.length > 0 || !state.applicationSnapshot) return state;
    const outcome: OutcomeEvent = {
      id: DEMO_IDS.outcomeSelected,
      kind: 'selected',
      subjectActorId: DEMO_IDS.student,
      organizationId: DEMO_IDS.partnerOrganization,
      opportunityId: DEMO_IDS.opportunity,
      applicationId: state.application.id,
      historicalApplicationSnapshotIds: [state.applicationSnapshot.id],
      evidenceEmissions: [],
      recordedBy: DEMO_IDS.recruiter,
      occurredAt: DEMO_TIME.outcomeRecorded,
    };
    return {
      ...state,
      outcomeEvents: [...state.outcomeEvents, outcome],
      traceEvents: [...state.traceEvents, trace(
        'demo-trace-outcome-recorded',
        'outcome_recorded',
        'Riya — synthetic industry reviewer',
        DEMO_TIME.outcomeRecorded,
        'A selected outcome was recorded descriptively; no claim is made that readiness caused selection.',
      )],
    };
  }

  return state;
}
