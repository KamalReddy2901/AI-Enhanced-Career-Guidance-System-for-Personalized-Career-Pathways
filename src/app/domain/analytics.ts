import type { IsoDate, IsoTimestamp, OpportunityVersionId, OrganizationId } from './shared';

export type AggregateMetric =
  | 'opportunity_count'
  | 'application_count'
  | 'stage_conversion'
  | 'outcome_count'
  | 'evidence_coverage'
  | 'engagement_count'
  | 'readiness_distribution'
  | 'eligibility_distribution'
  | 'requirement_support_distribution'
  | 'evidence_gap_distribution'
  | 'capability_gap_distribution'
  | 'eligibility_gap_distribution'
  | 'logistics_gap_distribution'
  | 'application_funnel'
  | 'recruitment_funnel'
  | 'evidence_request_burden'
  | 'outcome_distribution'
  | 'intervention_effectiveness_association'
  | 'requirement_pattern'
  | 'demand_pattern'
  | 'faculty_industry_engagement'
  | 'curriculum_program_alignment';

export type AnalyticsInterpretation = 'descriptive' | 'associational';
export type AggregateSuppressionReason = 'below_minimum_cell_size';
export type AggregateAnalyticsAccessMode =
  | 'institution_admin'
  | 'policy_program_analyst'
  | 'recruiter'
  | 'industry_partner';

export interface AggregateAnalyticsQuery {
  readonly organizationId?: OrganizationId;
  readonly opportunityVersionId?: OpportunityVersionId;
  readonly metrics: readonly AggregateMetric[];
  readonly from: IsoDate | IsoTimestamp;
  readonly to: IsoDate | IsoTimestamp;
  readonly groupBy: readonly ('opportunity_type' | 'audience' | 'stage' | 'month' | 'organization')[];
  readonly minimumCohortSize: number;
}

/** Suppressed cells structurally withhold the numerator, denominator, and
 * cohort size instead of returning a hidden exact number next to a UI flag. */
export interface AggregateAnalyticsPoint {
  readonly dimensions: Readonly<Record<string, string>>;
  readonly metric: AggregateMetric;
  readonly value: number | null;
  readonly denominator: number | null;
  readonly cohortSize: number | null;
  readonly suppressed: boolean;
  readonly suppressionReason: AggregateSuppressionReason | null;
  readonly interpretation: AnalyticsInterpretation;
  /** Aggregate analytics cannot represent intervention association as proof of
   * causality without a separately approved causal study contract. */
  readonly causalClaimed: false;
}

export interface AggregateAnalyticsCohort {
  readonly size: number | null;
  readonly suppressed: boolean;
  readonly suppressionReason: AggregateSuppressionReason | null;
}

export interface AggregateAnalyticsOrganization {
  readonly id: OrganizationId;
  readonly displayName: string;
}

export interface AggregateAnalyticsResult {
  readonly generatedAt: IsoTimestamp;
  readonly organization?: AggregateAnalyticsOrganization;
  readonly accessMode?: AggregateAnalyticsAccessMode;
  readonly query: AggregateAnalyticsQuery;
  readonly cohort?: AggregateAnalyticsCohort;
  readonly points: readonly AggregateAnalyticsPoint[];
  readonly methodologyVersion: string;
  readonly sourceLabel?: string;
  readonly scopeNote?: string;
  readonly privacy?: {
    readonly minimumCellSize: number;
    readonly policyLabel: string;
    readonly individualDrilldown: false;
    readonly consentPurpose?: 'aggregate_analytics';
  };
}
