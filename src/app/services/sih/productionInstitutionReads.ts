import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AggregateAnalyticsPoint,
  AggregateAnalyticsResult,
  AggregateMetric,
  AggregateSuppressionReason,
} from '../../domain/analytics';
import type { IsoTimestamp, OrganizationId } from '../../domain/shared';

export interface AnalyticsInstitutionScope {
  readonly organizationId: OrganizationId;
  readonly displayName: string;
  readonly accessMode: 'institution_admin' | 'policy_program_analyst';
}

export interface InstitutionSkillsIntelligenceInput {
  readonly organizationId: OrganizationId;
  readonly from: IsoTimestamp;
  readonly to: IsoTimestamp;
}

type JsonRecord = Record<string, unknown>;

const minimumSupportedCohortSize = 5;
const metrics = new Set<AggregateMetric>([
  'opportunity_count',
  'application_count',
  'stage_conversion',
  'outcome_count',
  'evidence_coverage',
  'engagement_count',
  'readiness_distribution',
  'evidence_gap_distribution',
  'capability_gap_distribution',
  'eligibility_gap_distribution',
  'logistics_gap_distribution',
  'application_funnel',
  'recruitment_funnel',
  'outcome_distribution',
  'intervention_effectiveness_association',
  'requirement_pattern',
  'demand_pattern',
  'faculty_industry_engagement',
  'curriculum_program_alignment',
]);

const prohibitedKeys = new Set([
  'riasec',
  'workvalues',
  'privateaspirations',
  'counselorhistory',
  'privateguidance',
  'financialconstraints',
  'familyconstraints',
  'guardian data'.replaceAll(' ', ''),
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
]);

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid institution analytics response: ${label} must be an object.`);
  }
  return value as JsonRecord;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid institution analytics response: ${label} must be a non-empty string.`);
  }
  return value;
}

function finiteNonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid institution analytics response: ${label} must be a non-negative number.`);
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
      throw new Error(`Institution analytics response crossed a prohibited individual/private field boundary: ${key}.`);
    }
    assertNoProhibitedKeys(nested);
  }
}

function mapDimensions(value: unknown): Readonly<Record<string, string>> {
  const input = record(value, 'point.dimensions');
  const output: Record<string, string> = {};
  for (const [key, dimension] of Object.entries(input)) {
    if (typeof dimension !== 'string') {
      throw new Error('Invalid institution analytics response: every aggregate dimension must be a string.');
    }
    output[key] = dimension;
  }
  return output;
}

function mapPoint(value: unknown, minimumCohortSize: number): AggregateAnalyticsPoint {
  const row = record(value, 'point');
  const metric = stringValue(row.metric, 'point.metric') as AggregateMetric;
  if (!metrics.has(metric)) {
    throw new Error(`Invalid institution analytics response: unsupported metric ${metric}.`);
  }
  if (row.interpretation !== 'descriptive' && row.interpretation !== 'associational') {
    throw new Error('Invalid institution analytics response: point interpretation is unsupported.');
  }
  if (row.causalClaimed !== false) {
    throw new Error('Institution analytics cannot claim causality through the descriptive aggregate contract.');
  }
  if (typeof row.suppressed !== 'boolean') {
    throw new Error('Invalid institution analytics response: point.suppressed must be boolean.');
  }

  const valueCount = nullableCount(row.value, 'point.value');
  const denominator = nullableCount(row.denominator, 'point.denominator');
  const cohortSize = nullableCount(row.cohortSize, 'point.cohortSize');
  const reason = row.suppressionReason as AggregateSuppressionReason | null;

  if (row.suppressed) {
    if (valueCount !== null || denominator !== null || cohortSize !== null || reason !== 'below_minimum_cell_size') {
      throw new Error('Suppressed institution analytics cells must withhold numerator, denominator, and cohort size.');
    }
  } else {
    if (valueCount === null || denominator === null || cohortSize === null) {
      throw new Error('Reportable institution analytics cells require explicit counted numerator, denominator, and cohort size.');
    }
    if (cohortSize < minimumCohortSize) {
      throw new Error('Institution analytics exposed a cell below the declared minimum cohort size.');
    }
    if (reason !== null && reason !== undefined) {
      throw new Error('Unsuppressed institution analytics cells cannot carry a suppression reason.');
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
    interpretation: row.interpretation,
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
    throw new Error(`Institution analytics minimum cohort size must be at least ${minimumSupportedCohortSize}.`);
  }
  if (privacy.minimumCellSize !== minimumCohortSize || privacy.individualDrilldown !== false) {
    throw new Error('Institution analytics privacy metadata does not match the enforced reporting boundary.');
  }
  if (body.accessMode !== 'institution_admin' && body.accessMode !== 'policy_program_analyst') {
    throw new Error('Institution analytics response has an unsupported access mode.');
  }
  if (!Array.isArray(query.metrics) || !Array.isArray(query.groupBy) || !Array.isArray(body.points)) {
    throw new Error('Institution analytics response has malformed aggregate arrays.');
  }

  const queryMetrics = query.metrics.map((item) => {
    const metric = stringValue(item, 'query.metrics[]') as AggregateMetric;
    if (!metrics.has(metric)) throw new Error(`Unsupported aggregate metric ${metric}.`);
    return metric;
  });
  const groupBy = query.groupBy.map((item) => stringValue(item, 'query.groupBy[]')) as Array<
    'opportunity_type' | 'audience' | 'stage' | 'month' | 'organization'
  >;

  const cohortSuppressed = cohort.suppressed;
  if (typeof cohortSuppressed !== 'boolean') {
    throw new Error('Institution analytics cohort suppression state must be boolean.');
  }
  const cohortSize = nullableCount(cohort.size, 'cohort.size');
  const cohortReason = cohort.suppressionReason as AggregateSuppressionReason | null;
  if (cohortSuppressed) {
    if (cohortSize !== null || cohortReason !== 'below_minimum_cell_size') {
      throw new Error('Suppressed institution cohort must withhold its exact size.');
    }
  } else if (cohortSize === null || cohortSize < minimumCohortSize) {
    throw new Error('Reportable institution cohort must meet the declared minimum size.');
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
    },
  };
}

export class ProductionInstitutionReads {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async listAuthorizedInstitutions(): Promise<AnalyticsInstitutionScope[]> {
    const { data, error } = await this.db().rpc('list_authorized_analytics_institutions');
    if (error) throw new Error(`Unable to load institution analytics scope: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Institution analytics scope response must be a list.');

    return data.map((value) => {
      const row = record(value, 'institution scope');
      if (row.access_mode !== 'institution_admin' && row.access_mode !== 'policy_program_analyst') {
        throw new Error('Institution analytics scope has an unsupported access mode.');
      }
      return {
        organizationId: stringValue(row.organization_id, 'institution scope organization_id') as OrganizationId,
        displayName: stringValue(row.display_name, 'institution scope display_name'),
        accessMode: row.access_mode,
      };
    });
  }

  async getSkillsIntelligence(input: InstitutionSkillsIntelligenceInput): Promise<AggregateAnalyticsResult> {
    const { data, error } = await this.db().rpc('get_institution_skills_intelligence', {
      requested_organization_id: input.organizationId,
      requested_from: input.from,
      requested_to: input.to,
    });
    if (error) throw new Error(`Unable to load institution Skills Intelligence: ${error.message}`);
    return mapResult(data);
  }
}
