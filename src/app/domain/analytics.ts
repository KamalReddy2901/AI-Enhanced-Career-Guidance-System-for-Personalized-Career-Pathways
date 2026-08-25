import type { IsoDate, IsoTimestamp, OrganizationId } from './shared';

export type AggregateMetric =
  | 'opportunity_count'
  | 'application_count'
  | 'stage_conversion'
  | 'outcome_count'
  | 'evidence_coverage'
  | 'engagement_count';

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
}

export interface AggregateAnalyticsResult {
  readonly generatedAt: IsoTimestamp;
  readonly query: AggregateAnalyticsQuery;
  readonly points: readonly AggregateAnalyticsPoint[];
  readonly methodologyVersion: string;
}
