import type { IsoDate, IsoTimestamp, OrganizationId } from './shared';

export type AggregateMetric =
  | 'opportunity_count'
  | 'application_count'
  | 'stage_conversion'
  | 'outcome_count'
  | 'evidence_coverage'
  | 'engagement_count'
  | 'readiness_distribution'
  | 'evidence_gap_distribution'
  | 'capability_gap_distribution'
  | 'eligibility_gap_distribution'
  | 'logistics_gap_distribution'
  | 'application_funnel'
  | 'recruitment_funnel'
  | 'outcome_distribution'
  | 'intervention_effectiveness_association'
  | 'requirement_pattern'
  | 'demand_pattern'
  | 'faculty_industry_engagement'
  | 'curriculum_program_alignment';

export type AnalyticsInterpretation = 'descriptive' | 'associational';

export interface AggregateAnalyticsQuery {
  readonly organizationId?: OrganizationId;
  readonly metrics: readonly AggregateMetric[];
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly groupBy: readonly ('opportunity_type' | 'audience' | 'stage' | 'month' | 'organization')[];
  readonly minimumCohortSize: number;
}

export interface AggregateAnalyticsPoint {
  readonly dimensions: Readonly<Record<string, string>>;
  readonly metric: AggregateMetric;
  readonly value: number;
  readonly cohortSize: number;
  readonly suppressed: boolean;
  readonly interpretation: AnalyticsInterpretation;
  /** Aggregate analytics cannot represent intervention association as proof of
   * causality without a separately approved causal study contract. */
  readonly causalClaimed: false;
}

export interface AggregateAnalyticsResult {
  readonly generatedAt: IsoTimestamp;
  readonly query: AggregateAnalyticsQuery;
  readonly points: readonly AggregateAnalyticsPoint[];
  readonly methodologyVersion: string;
}
