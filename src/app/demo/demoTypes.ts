import type {
  Actor,
  AggregateAnalyticsResult,
  Application,
  ApplicationEvent,
  ApplicationSnapshot,
  CollaborationEngagement,
  ConsentRecord,
  EvidenceArtifactId,
  EvidenceRecord,
  IsoTimestamp,
  Opportunity,
  OpportunityReadinessResult,
  OpportunityVersion,
  Organization,
  OutcomeEvent,
  ReadinessEvidenceSignal,
  VerificationEvent,
} from '../domain';
import type {
  RecruiterApplicationProjection,
  RecruiterSharePreview,
} from '../services/recruiterProjection';

export interface DemoPersona extends Actor {
  readonly roleLabel: string;
  readonly syntheticPersona: true;
}

export interface DemoEvidenceLedgerEntry {
  readonly record: EvidenceRecord;
  readonly readiness: Pick<
    ReadinessEvidenceSignal,
    'proficiency' | 'experienceYears' | 'capabilityAssertion' | 'directness'
  > & {
    readonly workSampleArtifactIds: readonly EvidenceArtifactId[];
  };
}

export type DemoReadinessRevision = 'initial' | 'work_sample_attached' | 'mentor_verified';

export type DemoEventKind =
  | 'initial_evidence'
  | 'work_sample_attached'
  | 'mentor_verification_appended'
  | 'readiness_recomputed'
  | 'recruiter_preview_viewed'
  | 'consent_granted'
  | 'application_submitted'
  | 'recruiter_review_started'
  | 'recruiter_shortlisted'
  | 'outcome_recorded';

export interface DemoTraceEvent {
  readonly id: string;
  readonly kind: DemoEventKind;
  readonly actorLabel: string;
  readonly occurredAt: IsoTimestamp;
  readonly summary: string;
}

export interface DemoFixtureCatalog {
  readonly personas: readonly DemoPersona[];
  readonly organizations: readonly Organization[];
  readonly opportunity: Opportunity;
  readonly opportunityVersion: OpportunityVersion;
  readonly collaborations: readonly CollaborationEngagement[];
}

export interface DemoState {
  readonly fixture: DemoFixtureCatalog;
  readonly evidenceLedger: readonly DemoEvidenceLedgerEntry[];
  readonly verificationEvents: readonly VerificationEvent[];
  readonly readinessHistory: readonly OpportunityReadinessResult[];
  readonly recruiterPreviewViewed: boolean;
  readonly consentRecords: readonly ConsentRecord[];
  readonly application?: Application;
  readonly applicationSnapshot?: ApplicationSnapshot;
  readonly applicationEvents: readonly ApplicationEvent[];
  readonly submittedRecruiterProjection?: RecruiterApplicationProjection;
  readonly outcomeEvents: readonly OutcomeEvent[];
  readonly traceEvents: readonly DemoTraceEvent[];
}

export type DemoAction =
  | { readonly type: 'ATTACH_CONTROLLED_WORK_SAMPLE' }
  | { readonly type: 'VERIFY_OBSERVED_CONTRIBUTION' }
  | { readonly type: 'VIEW_RECRUITER_PREVIEW' }
  | { readonly type: 'GRANT_APPLICATION_CONSENT' }
  | { readonly type: 'SUBMIT_APPLICATION' }
  | { readonly type: 'START_HUMAN_REVIEW' }
  | { readonly type: 'SHORTLIST_APPLICATION' }
  | { readonly type: 'RECORD_SELECTED_OUTCOME' }
  | { readonly type: 'RESET_CONTROLLED_DEMO' };

export interface DemoDerivedState {
  readonly currentReadiness: OpportunityReadinessResult;
  readonly recruiterSharePreview?: RecruiterSharePreview;
  readonly recruiterProjection?: RecruiterApplicationProjection;
  readonly institutionAnalytics: AggregateAnalyticsResult;
}
