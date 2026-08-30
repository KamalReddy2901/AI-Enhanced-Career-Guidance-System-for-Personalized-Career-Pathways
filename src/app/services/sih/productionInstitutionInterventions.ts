import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorId,
  AggregateMetric,
  CreateInstitutionInterventionInput,
  InstitutionIntervention,
  InstitutionInterventionFollowup,
  InstitutionInterventionFollowupId,
  InstitutionInterventionId,
  InstitutionInterventionKind,
  InstitutionInterventionStatus,
  IsoTimestamp,
  OrganizationId,
  RecordInstitutionInterventionFollowupInput,
} from '../../domain';

type JsonRecord = Record<string, unknown>;

const kinds = new Set<InstitutionInterventionKind>([
  'evidence_clinic',
  'project_clinic',
  'training_support',
  'mentoring_cohort',
  'employer_outreach',
  'faculty_industry_engagement',
  'opportunity_outreach',
  'curriculum_program_review',
  'other',
]);
const statuses = new Set<InstitutionInterventionStatus>([
  'draft',
  'approved',
  'active',
  'completed',
  'cancelled',
]);

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid institution intervention response: ${label} must be an object.`);
  }
  return value as JsonRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid institution intervention response: ${label} must be a non-empty string.`);
  }
  return value;
}

function count(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid institution intervention response: ${label} must be a non-negative number.`);
  }
  return value;
}

function dimensions(value: unknown): Readonly<Record<string, string>> {
  const source = record(value, 'dimensions');
  const mapped: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    if (typeof item !== 'string') {
      throw new Error('Invalid institution intervention response: aggregate dimensions must contain string values.');
    }
    mapped[key] = item;
  }
  return mapped;
}

function mapFollowup(value: unknown): InstitutionInterventionFollowup | undefined {
  if (value === null || value === undefined) return undefined;
  const row = record(value, 'latestFollowup');
  if (typeof row.suppressed !== 'boolean' || row.causalClaimed !== false) {
    throw new Error('Institution intervention follow-up crossed the aggregate interpretation boundary.');
  }
  if (row.interpretation !== 'descriptive' && row.interpretation !== 'associational') {
    throw new Error('Institution intervention follow-up has an unsupported interpretation.');
  }
  const suppressionReason = row.suppressionReason;
  if (row.suppressed) {
    if (row.value !== null || row.denominator !== null || row.cohortSize !== null || suppressionReason !== 'below_minimum_cell_size') {
      throw new Error('Suppressed intervention follow-up must structurally withhold its exact counts.');
    }
  }
  return {
    id: text(row.id, 'latestFollowup.id') as InstitutionInterventionFollowupId,
    methodologyVersion: text(row.methodologyVersion, 'latestFollowup.methodologyVersion'),
    generatedAt: text(row.generatedAt, 'latestFollowup.generatedAt') as IsoTimestamp,
    windowFrom: text(row.windowFrom, 'latestFollowup.windowFrom') as IsoTimestamp,
    windowTo: text(row.windowTo, 'latestFollowup.windowTo') as IsoTimestamp,
    metric: text(row.metric, 'latestFollowup.metric') as AggregateMetric,
    dimensions: dimensions(row.dimensions),
    value: row.value === null ? null : count(row.value, 'latestFollowup.value'),
    denominator: row.denominator === null ? null : count(row.denominator, 'latestFollowup.denominator'),
    cohortSize: row.cohortSize === null ? null : count(row.cohortSize, 'latestFollowup.cohortSize'),
    suppressed: row.suppressed,
    suppressionReason: row.suppressed ? 'below_minimum_cell_size' : null,
    interpretation: row.interpretation,
    causalClaimed: false,
    ...(typeof row.interpretationNote === 'string' && row.interpretationNote.trim()
      ? { interpretationNote: row.interpretationNote }
      : {}),
    createdAt: text(row.createdAt, 'latestFollowup.createdAt') as IsoTimestamp,
  };
}

function mapIntervention(value: unknown): InstitutionIntervention {
  const row = record(value, 'intervention');
  const kind = text(row.kind, 'kind') as InstitutionInterventionKind;
  const status = text(row.status, 'status') as InstitutionInterventionStatus;
  if (!kinds.has(kind) || !statuses.has(status)) {
    throw new Error('Institution intervention response contains an unsupported kind or lifecycle state.');
  }
  const source = record(row.source, 'source');
  if (source.causalClaimed !== false) {
    throw new Error('Institution intervention source cannot claim causal impact.');
  }
  if (source.interpretation !== 'descriptive' && source.interpretation !== 'associational') {
    throw new Error('Institution intervention source has an unsupported interpretation.');
  }
  const sourceCohortSize = count(source.cohortSize, 'source.cohortSize');
  if (sourceCohortSize < 5) {
    throw new Error('Institution intervention source fell below the minimum reportable cohort boundary.');
  }

  return {
    id: text(row.id, 'id') as InstitutionInterventionId,
    organizationId: text(row.organizationId, 'organizationId') as OrganizationId,
    kind,
    title: text(row.title, 'title'),
    rationale: text(row.rationale, 'rationale'),
    actionDescription: text(row.actionDescription, 'actionDescription'),
    intendedPopulationDescription: text(row.intendedPopulationDescription, 'intendedPopulationDescription'),
    ownerActorId: text(row.ownerActorId, 'ownerActorId') as ActorId,
    createdByActorId: text(row.createdByActorId, 'createdByActorId') as ActorId,
    status,
    source: {
      methodologyVersion: text(source.methodologyVersion, 'source.methodologyVersion'),
      generatedAt: text(source.generatedAt, 'source.generatedAt') as IsoTimestamp,
      windowFrom: text(source.windowFrom, 'source.windowFrom') as IsoTimestamp,
      windowTo: text(source.windowTo, 'source.windowTo') as IsoTimestamp,
      metric: text(source.metric, 'source.metric') as AggregateMetric,
      dimensions: dimensions(source.dimensions),
      value: count(source.value, 'source.value'),
      denominator: count(source.denominator, 'source.denominator'),
      cohortSize: sourceCohortSize,
      interpretation: source.interpretation,
      pointFingerprint: text(source.pointFingerprint, 'source.pointFingerprint'),
      causalClaimed: false,
    },
    latestFollowup: mapFollowup(row.latestFollowup),
    createdAt: text(row.createdAt, 'createdAt') as IsoTimestamp,
  };
}

export class ProductionInstitutionInterventions {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async list(organizationId: OrganizationId): Promise<InstitutionIntervention[]> {
    const { data, error } = await this.db().rpc('list_institution_interventions', {
      requested_organization_id: organizationId,
    });
    if (error) throw new Error(`Unable to load institution interventions: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Institution intervention list response must be an array.');
    return data.map(mapIntervention);
  }

  async create(input: CreateInstitutionInterventionInput): Promise<InstitutionInterventionId> {
    const { data, error } = await this.db().rpc('create_institution_intervention', {
      requested_organization_id: input.organizationId,
      requested_kind: input.kind,
      requested_title: input.title,
      requested_rationale: input.rationale,
      requested_action_description: input.actionDescription,
      requested_intended_population_description: input.intendedPopulationDescription,
      requested_source_window_from: input.sourceWindowFrom,
      requested_source_window_to: input.sourceWindowTo,
      requested_source_methodology_version: input.sourceMethodologyVersion,
      requested_source_metric: input.sourceMetric,
      requested_source_dimensions: input.sourceDimensions,
    });
    if (error) throw new Error(`Unable to create institution intervention: ${error.message}`);
    return text(data, 'create intervention id') as InstitutionInterventionId;
  }

  async transition(
    interventionId: InstitutionInterventionId,
    toStatus: InstitutionInterventionStatus,
    note?: string,
  ): Promise<void> {
    const { error } = await this.db().rpc('append_institution_intervention_event', {
      requested_intervention_id: interventionId,
      requested_to_status: toStatus,
      requested_note: note?.trim() || null,
    });
    if (error) throw new Error(`Unable to update institution intervention: ${error.message}`);
  }

  async recordFollowup(input: RecordInstitutionInterventionFollowupInput): Promise<InstitutionInterventionFollowupId> {
    const { data, error } = await this.db().rpc('record_institution_intervention_followup', {
      requested_intervention_id: input.interventionId,
      requested_window_from: input.windowFrom,
      requested_window_to: input.windowTo,
      requested_interpretation: input.interpretation,
      requested_interpretation_note: input.interpretationNote?.trim() || null,
    });
    if (error) throw new Error(`Unable to record institution intervention follow-up: ${error.message}`);
    return text(data, 'follow-up id') as InstitutionInterventionFollowupId;
  }
}
