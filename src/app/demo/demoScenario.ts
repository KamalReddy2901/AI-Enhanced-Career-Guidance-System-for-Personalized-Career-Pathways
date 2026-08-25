import type {
  AggregateAnalyticsPoint,
  AggregateAnalyticsResult,
  ApplicationStage,
  IsoDate,
  OpportunityReadinessInput,
  OpportunityReadinessResult,
  RequirementReadinessResult,
} from '../domain';
import { computeOpportunityReadiness } from '../engine/opportunityReadiness';
import {
  buildRecruiterSharePreview,
  withRecruiterApplicationStage,
  type RecruiterRequirementProjection,
  type RecruiterSharePreview,
  type RecruiterShareableEvidence,
} from '../services/recruiterProjection';
import { DEMO_IDS, DEMO_TIME } from './demoFixtures';
import { projectDemoEvidenceSignals } from './demoEvidenceProjection';
import type { DemoReadinessRevision, DemoState } from './demoTypes';

const readinessIdentity = {
  initial: { resultId: DEMO_IDS.readinessInitial, generatedAt: DEMO_TIME.initialReadiness },
  work_sample_attached: { resultId: DEMO_IDS.readinessWorkSample, generatedAt: DEMO_TIME.workSampleReadiness },
  mentor_verified: { resultId: DEMO_IDS.readinessMentor, generatedAt: DEMO_TIME.mentorReadiness },
} as const;

export function computeDemoReadiness(
  state: Pick<DemoState, 'fixture' | 'evidenceLedger' | 'verificationEvents'>,
  revision: DemoReadinessRevision,
): OpportunityReadinessResult {
  const identity = readinessIdentity[revision];
  const input: OpportunityReadinessInput = {
    resultId: identity.resultId,
    generatedAt: identity.generatedAt,
    inputVersion: `controlled-demo-input-${revision}-v1`,
    evidenceProjectionVersion: `controlled-demo-evidence-projection-${revision}-v1`,
    opportunity: {
      opportunityId: state.fixture.opportunity.id,
      opportunityVersionId: state.fixture.opportunityVersion.id,
      opportunityVersion: state.fixture.opportunityVersion.version,
      eligibilityRules: state.fixture.opportunityVersion.eligibilityRules,
      requirements: state.fixture.opportunityVersion.requirements,
    },
    subject: {
      actorId: DEMO_IDS.student,
      factsVersion: 'controlled-demo-subject-facts-v1',
      educationLevel: { value: 'undergraduate', confirmed: true },
      graduationYear: { value: 2027, confirmed: true },
      physicalPresenceLocations: [],
      physicalPresenceLocationsComplete: true,
      organizationMemberships: [],
      organizationMembershipsComplete: true,
      eligibilityFacts: [],
      workAuthorizations: [],
      relevantLanguages: [],
      relevantLanguagesComplete: true,
      evidenceSignals: projectDemoEvidenceSignals(state.evidenceLedger, state.verificationEvents),
    },
  };
  return computeOpportunityReadiness(input);
}

export function currentDemoReadiness(state: DemoState): OpportunityReadinessResult {
  const result = state.readinessHistory[state.readinessHistory.length - 1];
  if (!result) throw new Error('Controlled demo readiness history must contain an initial result.');
  return result;
}

function recruiterRequirements(results: readonly RequirementReadinessResult[]): RecruiterRequirementProjection[] {
  return results.map(result => ({
    requirementId: result.requirementId,
    literalSourceWording: result.literalSourceWording,
    priority: result.priority,
    state: result.state,
    supportingEvidenceIds: result.supportingEvidenceIds,
  }));
}

export function buildDemoRecruiterSharePreview(state: DemoState): RecruiterSharePreview | undefined {
  const readiness = currentDemoReadiness(state);
  if (readiness.readinessBand !== 'READY_FOR_REVIEW') return undefined;
  const required = recruiterRequirements(readiness.requiredRequirementResults);
  const preferred = recruiterRequirements(readiness.preferredRequirementResults);
  const selectedEvidenceIds = new Set([...required, ...preferred].flatMap(item => item.supportingEvidenceIds));
  const projectedSignals = projectDemoEvidenceSignals(state.evidenceLedger, state.verificationEvents);
  const projectedById = new Map(projectedSignals.map(signal => [signal.evidenceRecordId, signal]));
  const evidence: RecruiterShareableEvidence[] = state.evidenceLedger
    .filter(entry => selectedEvidenceIds.has(entry.record.id))
    .map(entry => ({
      evidenceRecordId: entry.record.id,
      literalClaim: entry.record.literalClaim,
      provenance: entry.record.provenance,
      verificationState: projectedById.get(entry.record.id)?.verificationState ?? entry.record.verificationState,
      artifactIds: entry.record.artifacts.map(artifact => artifact.id),
      artifactDisplayNames: entry.record.artifacts.map(artifact => artifact.displayName),
    }));
  return buildRecruiterSharePreview({
    applicantDisplayName: 'Aarav — synthetic learner',
    syntheticPersona: true,
    opportunityId: state.fixture.opportunity.id,
    opportunityVersionId: state.fixture.opportunityVersion.id,
    educationSummary: 'Synthetic undergraduate learner; confirmed fixture fact only.',
    readinessResultId: readiness.resultId,
    readinessBand: readiness.readinessBand,
    requirements: [...required, ...preferred],
    evidence,
  });
}

export function currentDemoRecruiterProjection(state: DemoState) {
  if (!state.submittedRecruiterProjection || !state.application) return undefined;
  return withRecruiterApplicationStage(state.submittedRecruiterProjection, state.application.currentStage);
}

const BASE_COHORT_SIZE = 12;
const DEMO_MINIMUM_COHORT = 10;

function aggregatePoint(
  metric: AggregateAnalyticsPoint['metric'],
  value: number,
  cohortSize: number,
  dimensions: Readonly<Record<string, string>>,
  minimumCohortSize: number,
): AggregateAnalyticsPoint {
  const suppressed = cohortSize < minimumCohortSize;
  return {
    metric,
    value: suppressed ? 0 : value,
    cohortSize,
    dimensions,
    suppressed,
    interpretation: 'descriptive',
    causalClaimed: false,
  };
}

export function buildDemoInstitutionAnalytics(
  state: DemoState,
  minimumCohortSize = DEMO_MINIMUM_COHORT,
): AggregateAnalyticsResult {
  const readiness = currentDemoReadiness(state);
  const cohortSize = BASE_COHORT_SIZE + 1;
  const readinessBase: Readonly<Record<OpportunityReadinessResult['readinessBand'], number>> = {
    NOT_ELIGIBLE: 0,
    NEEDS_REVIEW: 0,
    BUILDING_EVIDENCE: 3,
    NEAR_READY: 2,
    READY_FOR_REVIEW: 7,
  };
  const points: AggregateAnalyticsPoint[] = Object.entries(readinessBase).map(([band, value]) =>
    aggregatePoint(
      'readiness_distribution',
      value + (readiness.readinessBand === band ? 1 : 0),
      cohortSize,
      { readiness_band: band },
      minimumCohortSize,
    ));
  points.push(
    aggregatePoint(
      'evidence_gap_distribution',
      5 + (readiness.partialCount > 0 ? 1 : 0),
      cohortSize,
      { category: 'inspectable_work_sample' },
      minimumCohortSize,
    ),
    aggregatePoint(
      'evidence_coverage',
      16 + readiness.verificationCoverage.supported,
      cohortSize,
      { measure: 'verification_supported_required_items' },
      minimumCohortSize,
    ),
    aggregatePoint(
      'evidence_coverage',
      36 + readiness.verificationCoverage.total,
      cohortSize,
      { measure: 'verification_required_items_total' },
      minimumCohortSize,
    ),
    aggregatePoint(
      'application_funnel',
      6 + (state.application ? 1 : 0),
      cohortSize,
      { stage: state.application?.currentStage ?? 'not_applied' },
      minimumCohortSize,
    ),
    aggregatePoint(
      'outcome_count',
      2 + state.outcomeEvents.length,
      cohortSize,
      { outcome: 'selected_recorded' },
      minimumCohortSize,
    ),
  );
  return {
    generatedAt: state.traceEvents[state.traceEvents.length - 1]?.occurredAt ?? DEMO_TIME.fixtureCreated,
    query: {
      organizationId: DEMO_IDS.institutionOrganization,
      metrics: ['readiness_distribution', 'evidence_gap_distribution', 'evidence_coverage', 'application_funnel', 'outcome_count'],
      from: '2026-08-01' as IsoDate,
      to: '2026-08-31' as IsoDate,
      groupBy: ['stage'],
      minimumCohortSize,
    },
    points,
    methodologyVersion: 'controlled-demo-aggregate-v1',
  };
}

export function applicationStageLabel(stage: ApplicationStage): string {
  return stage.replaceAll('_', ' ');
}
