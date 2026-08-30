import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AggregateAnalyticsPoint,
  AggregateAnalyticsResult,
  AggregateMetric,
  AggregateSuppressionReason,
} from '../../domain/analytics';
import type { IsoTimestamp, OpportunityVersionId, OrganizationId } from '../../domain/shared';

export interface AnalyticsIndustryScope {
  readonly organizationId: OrganizationId;
  readonly displayName: string;
  readonly accessMode: 'recruiter' | 'industry_partner';
}

export interface AnalyticsIndustryOpportunityScope {
  readonly opportunityVersionId: OpportunityVersionId;
  readonly title: string;
  readonly opportunityType: string;
  readonly publishedAt?: IsoTimestamp;
}

export interface IndustrySkillsIntelligenceInput {
  readonly organizationId: OrganizationId;
  readonly opportunityVersionId?: OpportunityVersionId;
  readonly from: IsoTimestamp;
  readonly to: IsoTimestamp;
}

type JsonRecord = Record<string, unknown>;

const minimumSupportedCohortSize = 5;
const metrics = new Set<AggregateMetric>([
  'application_count',
  'eligibility_distribution',
  'readiness_distribution',
  'requirement_support_distribution',
  'evidence_gap_distribution',
  'application_funnel',
  'evidence_request_burden',
  'outcome_distribution',
  'requirement_pattern',
]);

const prohibitedKeys = new Set([
  'riasec',
  'workvalues',
  'privateaspirations',
  'counselorhistory',
  'privateguidance',
  'financialconstraints',
  'familyconstraints',
  'guardiandata',
  'privateconstraints',
  'unrelateddisability',
  'unrelatedaccessibility',
  'hiringprobability',
  'successprobability',
  'employabilityscore',
  'candidaterank',
  'opaquefitscore',
  'readinesspercentage',
  'fitpercentage',
  'subjectactorid',
  'applicantactorid',
  'evidencerecordid',
  'applicationid',
  'readinessresultid',
  'applicant',
  'educationSummary'.toLowerCase(),
  'email',
  'phone',
]);

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid industry analytics response: ${label} must be an object.`);
  }
  return value as JsonRecord;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid industry analytics response: ${label} must be a non-empty string.`);
  }
  return value;
}

function finiteNonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid industry analytics response: ${label} must be a non-negative number.`);
  }
  return value;
}

function nullableCount(value: unknown, label: string): number | null {
  if (value === null) return null;
  return finiteNonNegativeNumber(value, label);
}

function assertNoProhibitedKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoProhibitedKeys);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value as JsonRecord)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (prohibitedKeys.has(normalized)) {
      throw new Error(`Industry analytics response crossed an individual/private field boundary: ${key}.`);
    }
    assertNoProhibitedKeys(nested);
  }
}

function mapDimensions(value: unknown): Readonly<Record<string, string>> {
  const input = record(value, 'point.dimensions');
  const output: Record<string, string> = {};
  for (const [key, dimension] of Object.entries(input)) {
    if (typeof dimension !== 'string') {
      throw new Error('Invalid industry analytics response: every aggregate dimension must be a string.');
    }
    output[key] = dimension;
  }
  return output;
}

function mapPoint(value: unknown, minimumCohortSize: number): AggregateAnalyticsPoint {
  const row = record(value, 'point');
  const metric = stringValue(row.metric, 'point.metric') as AggregateMetric;
  if (!metrics.has(metric)) {
    throw new Error(`Invalid industry analytics response: unsupported metric ${metric}.`);
  }
  if (row.interpretation !== 'descriptive') {
    throw new Error('Industry Skills Intelligence points must be descriptive.');
  }
  if (row.causalClaimed !== false) {
    throw new Error('Industry Skills Intelligence cannot claim causality.');
  }
  if (typeof row.suppressed !== 'boolean') {
    throw new Error('Invalid industry analytics response: point.suppressed must be boolean.');
  }

  const valueCount = nullableCount(row.value, 'point.value');
  const denominator = nullableCount(row.denominator, 'point.denominator');
  const cohortSize = nullableCount(row.cohortSize, 'point.cohortSize');
  const reason = row.suppressionReason as AggregateSuppressionReason | null;

  if (row.suppressed) {
    if (valueCount !== null || denominator !== null || cohortSize !== null || reason !== 'below_minimum_cell_size') {
      throw new Error('Suppressed industry analytics cells must withhold numerator, denominator, and cohort size.');
    }
  } else {
    if (valueCount === null || denominator === null || cohortSize === null) {
      throw new Error('Reportable industry analytics cells require numerator, denominator, and cohort size.');
    }
    if (cohortSize < minimumCohortSize) {
      throw new Error('Industry analytics exposed a cell below the declared minimum cohort size.');
    }
    if (reason !== null && reason !== undefined) {
      throw new Error('Unsuppressed industry analytics cells cannot carry a suppression reason.');
    }
  }

  return {
    dimensions: mapDimensions(row.dimensions),
    metric,
    value: valueCount,
    denominator,
    cohortSize,
    suppressed: row.suppressed,
    suppressionReason: row.suppressed ? 'below_minimum_cell_size' : null,
    interpretation: 'descriptive',
    causalClaimed: false,
  };
}

function mapResult(value: unknown): AggregateAnalyticsResult {
  assertNoProhibitedKeys(value);
  const body = record(value, 'root');
  const query = record(body.query, 'query');
  const organization = record(body.organization, 'organization');
  const cohort = record(body.cohort, 'cohort');
  const privacy = record(body.privacy, 'privacy');

  const minimumCohortSize = finiteNonNegativeNumber(query.minimumCohortSize, 'query.minimumCohortSize');
  if (!Number.isInteger(minimumCohortSize) || minimumCohortSize < minimumSupportedCohortSize) {
    throw new Error(`Industry analytics minimum cohort size must be at least ${minimumSupportedCohortSize}.`);
  }
  if (
    privacy.minimumCellSize !== minimumCohortSize ||
    privacy.individualDrilldown !== false ||
    privacy.consentPurpose !== 'aggregate_analytics'
  ) {
    throw new Error('Industry analytics privacy metadata does not match the enforced aggregate-consent boundary.');
  }
  if (body.accessMode !== 'recruiter' && body.accessMode !== 'industry_partner') {
    throw new Error('Industry analytics response has an unsupported access mode.');
  }
  if (!Array.isArray(query.metrics) || !Array.isArray(query.groupBy) || !Array.isArray(body.points)) {
    throw new Error('Industry analytics response has malformed aggregate arrays.');
  }

  const queryMetrics = query.metrics.map((item) => {
    const metric = stringValue(item, 'query.metrics[]') as AggregateMetric;
    if (!metrics.has(metric)) throw new Error(`Unsupported industry aggregate metric ${metric}.`);
    return metric;
  });
  const groupBy = query.groupBy.map((item) => stringValue(item, 'query.groupBy[]')) as Array<
    'opportunity_type' | 'audience' | 'stage' | 'month' | 'organization'
  >;

  const cohortSuppressed = cohort.suppressed;
  if (typeof cohortSuppressed !== 'boolean') {
    throw new Error('Industry analytics cohort suppression state must be boolean.');
  }
  const cohortSize = nullableCount(cohort.size, 'cohort.size');
  const cohortReason = cohort.suppressionReason as AggregateSuppressionReason | null;
  if (cohortSuppressed) {
    if (cohortSize !== null || cohortReason !== 'below_minimum_cell_size') {
      throw new Error('Suppressed industry cohort must withhold its exact size.');
    }
  } else if (cohortSize === null || cohortSize < minimumCohortSize) {
    throw new Error('Reportable industry cohort must meet the declared minimum size.');
  }

  const opportunityVersionId = query.opportunityVersionId;
  if (opportunityVersionId !== null && opportunityVersionId !== undefined && typeof opportunityVersionId !== 'string') {
    throw new Error('Industry analytics opportunityVersionId must be a string or null.');
  }

  return {
    generatedAt: stringValue(body.generatedAt, 'generatedAt') as IsoTimestamp,
    organization: {
      id: stringValue(organization.id, 'organization.id') as OrganizationId,
      displayName: stringValue(organization.displayName, 'organization.displayName'),
    },
    accessMode: body.accessMode,
    query: {
      organizationId: stringValue(query.organizationId, 'query.organizationId') as OrganizationId,
      ...(typeof opportunityVersionId === 'string' && opportunityVersionId.length > 0
        ? { opportunityVersionId: opportunityVersionId as OpportunityVersionId }
        : {}),
      metrics: queryMetrics,
      from: stringValue(query.from, 'query.from') as IsoTimestamp,
      to: stringValue(query.to, 'query.to') as IsoTimestamp,
      groupBy,
      minimumCohortSize,
    },
    cohort: {
      size: cohortSize,
      suppressed: cohortSuppressed,
      suppressionReason: cohortSuppressed ? 'below_minimum_cell_size' : null,
    },
    points: body.points.map((point) => mapPoint(point, minimumCohortSize)),
    methodologyVersion: stringValue(body.methodologyVersion, 'methodologyVersion'),
    sourceLabel: stringValue(body.sourceLabel, 'sourceLabel'),
    scopeNote: stringValue(body.scopeNote, 'scopeNote'),
    privacy: {
      minimumCellSize: minimumCohortSize,
      policyLabel: stringValue(privacy.policyLabel, 'privacy.policyLabel'),
      individualDrilldown: false,
      consentPurpose: 'aggregate_analytics',
    },
  };
}

export class ProductionIndustryReads {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async listAuthorizedOrganizations(): Promise<AnalyticsIndustryScope[]> {
    const { data, error } = await this.db().rpc('list_authorized_industry_analytics_organizations');
    if (error) throw new Error(`Unable to load industry analytics scope: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Industry analytics scope response must be a list.');

    return data.map((value) => {
      const row = record(value, 'industry scope');
      if (row.access_mode !== 'recruiter' && row.access_mode !== 'industry_partner') {
        throw new Error('Industry analytics scope has an unsupported access mode.');
      }
      return {
        organizationId: stringValue(row.organization_id, 'industry scope organization_id') as OrganizationId,
        displayName: stringValue(row.display_name, 'industry scope display_name'),
        accessMode: row.access_mode,
      };
    });
  }

  async listAuthorizedOpportunities(organizationId: OrganizationId): Promise<AnalyticsIndustryOpportunityScope[]> {
    const { data, error } = await this.db().rpc('list_authorized_industry_analytics_opportunities', {
      requested_organization_id: organizationId,
    });
    if (error) throw new Error(`Unable to load industry opportunity analytics scope: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Industry opportunity analytics scope response must be a list.');

    return data.map((value) => {
      const row = record(value, 'industry opportunity scope');
      const publishedAt = row.published_at;
      if (publishedAt !== null && publishedAt !== undefined && typeof publishedAt !== 'string') {
        throw new Error('Industry opportunity scope published_at must be a timestamp string or null.');
      }
      return {
        opportunityVersionId: stringValue(row.opportunity_version_id, 'industry opportunity scope opportunity_version_id') as OpportunityVersionId,
        title: stringValue(row.title, 'industry opportunity scope title'),
        opportunityType: stringValue(row.opportunity_type, 'industry opportunity scope opportunity_type'),
        ...(typeof publishedAt === 'string' ? { publishedAt: publishedAt as IsoTimestamp } : {}),
      };
    });
  }

  async getSkillsIntelligence(input: IndustrySkillsIntelligenceInput): Promise<AggregateAnalyticsResult> {
    const { data, error } = await this.db().rpc('get_industry_skills_intelligence', {
      requested_organization_id: input.organizationId,
      requested_opportunity_version_id: input.opportunityVersionId ?? null,
      requested_from: input.from,
      requested_to: input.to,
    });
    if (error) throw new Error(`Unable to load industry Skills Intelligence: ${error.message}`);
    return mapResult(data);
  }
}
