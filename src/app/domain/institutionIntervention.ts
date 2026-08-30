import type { AggregateMetric, AnalyticsInterpretation } from './analytics';
import type {
  ActorId,
  InstitutionInterventionFollowupId,
  InstitutionInterventionId,
  IsoTimestamp,
  OrganizationId,
} from './shared';

export type InstitutionInterventionKind =
  | 'evidence_clinic'
  | 'project_clinic'
  | 'training_support'
  | 'mentoring_cohort'
  | 'employer_outreach'
  | 'faculty_industry_engagement'
  | 'opportunity_outreach'
  | 'curriculum_program_review'
  | 'other';

export type InstitutionInterventionStatus =
  | 'draft'
  | 'approved'
  | 'active'
  | 'completed'
  | 'cancelled';

export type InstitutionInterventionFollowupInterpretation = 'descriptive' | 'associational';

export interface InstitutionInterventionSourceSignal {
  readonly methodologyVersion: string;
  readonly generatedAt: IsoTimestamp;
  readonly windowFrom: IsoTimestamp;
  readonly windowTo: IsoTimestamp;
  readonly metric: AggregateMetric;
  readonly dimensions: Readonly<Record<string, string>>;
  readonly value: number;
  readonly denominator: number;
  readonly cohortSize: number;
  readonly interpretation: AnalyticsInterpretation;
  readonly pointFingerprint: string;
  readonly causalClaimed: false;
}

export interface InstitutionInterventionFollowup {
  readonly id: InstitutionInterventionFollowupId;
  readonly methodologyVersion: string;
  readonly generatedAt: IsoTimestamp;
  readonly windowFrom: IsoTimestamp;
  readonly windowTo: IsoTimestamp;
  readonly metric: AggregateMetric;
  readonly dimensions: Readonly<Record<string, string>>;
  readonly value: number | null;
  readonly denominator: number | null;
  readonly cohortSize: number | null;
  readonly suppressed: boolean;
  readonly suppressionReason: 'below_minimum_cell_size' | null;
  readonly interpretation: InstitutionInterventionFollowupInterpretation;
  readonly causalClaimed: false;
  readonly interpretationNote?: string;
  readonly createdAt: IsoTimestamp;
}

export interface InstitutionIntervention {
  readonly id: InstitutionInterventionId;
  readonly organizationId: OrganizationId;
  readonly kind: InstitutionInterventionKind;
  readonly title: string;
  readonly rationale: string;
  readonly actionDescription: string;
  readonly intendedPopulationDescription: string;
  readonly ownerActorId: ActorId;
  readonly createdByActorId: ActorId;
  readonly status: InstitutionInterventionStatus;
  readonly source: InstitutionInterventionSourceSignal;
  readonly latestFollowup?: InstitutionInterventionFollowup;
  readonly createdAt: IsoTimestamp;
}

export interface CreateInstitutionInterventionInput {
  readonly organizationId: OrganizationId;
  readonly kind: InstitutionInterventionKind;
  readonly title: string;
  readonly rationale: string;
  readonly actionDescription: string;
  readonly intendedPopulationDescription: string;
  readonly sourceWindowFrom: IsoTimestamp;
  readonly sourceWindowTo: IsoTimestamp;
  readonly sourceMethodologyVersion: string;
  readonly sourceMetric: AggregateMetric;
  readonly sourceDimensions: Readonly<Record<string, string>>;
}

export interface RecordInstitutionInterventionFollowupInput {
  readonly interventionId: InstitutionInterventionId;
  readonly windowFrom: IsoTimestamp;
  readonly windowTo: IsoTimestamp;
  readonly interpretation: InstitutionInterventionFollowupInterpretation;
  readonly interpretationNote?: string;
}
