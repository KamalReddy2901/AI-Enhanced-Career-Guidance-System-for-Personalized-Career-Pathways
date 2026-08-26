import type { SupabaseClient } from '@supabase/supabase-js';
import type { EligibilityRule, OpportunityRequirement } from '../../../src/app/domain/opportunity';
import type {
  ActorId, EvidenceArtifactId, EvidenceRecordId, IsoTimestamp, OpportunityId,
  OpportunityReadinessResultId, OpportunityRequirementId, OpportunityVersionId, OrganizationId,
} from '../../../src/app/domain/shared';
import type {
  OpportunityReadinessInput, OpportunityReadinessResult, ReadinessEvidenceSignal, ReadinessSubjectInput,
} from '../../../src/app/domain/readiness';
import {
  computeOpportunityReadiness, OPPORTUNITY_READINESS_ENGINE_VERSION,
} from '../../../src/app/engine/opportunityReadiness';
import { OPPORTUNITY_READINESS_POLICY_VERSION } from '../../../src/app/engine/opportunityEvidencePolicy';
import { canonicalJson, deterministicResultId, sha256Version } from './canonicalJson';
import { SihRouteError } from './types';

type Row = Record<string, any>;
const confirmedStates = new Set(['self_confirmed', 'human_verified', 'issuer_verified', 'corrected']);
const actionToState: Record<string, string> = {
  self_confirmed: 'self_confirmed', verified_by_human: 'human_verified',
  verified_by_issuer: 'issuer_verified', disputed: 'disputed', revoked: 'revoked', corrected: 'corrected',
};

async function select<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to load canonical readiness data.');
  return data as T;
}

function trace(row: Row) {
  if (!row.human_confirmed) return { humanConfirmed: false as const };
  return {
    humanConfirmed: true as const,
    confirmedByActorId: row.confirmed_by_actor_id as ActorId,
    confirmedAt: row.confirmed_at as IsoTimestamp,
    confirmationMethod: row.confirmation_method,
  };
}

function requirement(row: Row): OpportunityRequirement {
  const base = {
    id: row.id as OpportunityRequirementId, priority: row.priority,
    literalSourceWording: row.literal_source_wording, importance: row.importance,
    evidenceExpectation: row.evidence_expectation, hardGate: row.hard_gate, ...trace(row),
  };
  if (row.category === 'skill') {
    const canonicalResolution = row.canonical_resolution === 'unresolved'
      ? { state: 'unresolved' as const, literalText: row.literal_source_wording }
      : { state: 'resolved' as const, skillId: row.canonical_skill_id, matchKind: row.canonical_resolution };
    return { ...base, category: 'skill', canonicalResolution,
      ...(row.minimum_proficiency === null ? {} : { minimumProficiency: row.minimum_proficiency }) } as OpportunityRequirement;
  }
  if (row.category === 'experience') return { ...base, category: 'experience',
    ...(row.minimum_years === null ? {} : { minimumYears: Number(row.minimum_years) }) } as OpportunityRequirement;
  if (row.category === 'document_evidence') return { ...base, category: row.category,
    ...(typeof row.category_payload?.requestedArtifactKind === 'string'
      ? { requestedArtifactKind: row.category_payload.requestedArtifactKind } : {}) } as OpportunityRequirement;
  if (row.category === 'questionnaire') return { ...base, category: row.category,
    ...(typeof row.category_payload?.questionnaireReference === 'string'
      ? { questionnaireReference: row.category_payload.questionnaireReference } : {}) } as OpportunityRequirement;
  if (row.category === 'logistics') return { ...base, category: row.category,
    ...(typeof row.category_payload?.logisticsKind === 'string'
      ? { logisticsKind: row.category_payload.logisticsKind } : {}) } as OpportunityRequirement;
  return { ...base, category: row.category } as OpportunityRequirement;
}

function eligibilityRule(row: Row): EligibilityRule {
  return {
    ...row.typed_rule_definition, kind: row.rule_kind,
    literalSourceWording: row.literal_source_wording, ...trace(row),
  } as EligibilityRule;
}

function objects(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function verificationState(evidence: Row, events: Row[]): ReadinessEvidenceSignal['verificationState'] {
  const latest = events.filter(event => event.evidence_record_id === evidence.id && event.action !== 'submitted_for_review')
    .sort((a, b) => Number(b.sequence_number) - Number(a.sequence_number))[0];
  return (latest ? actionToState[latest.action] : evidence.initial_verification_state) as ReadinessEvidenceSignal['verificationState'];
}

export async function assembleOpportunityReadinessInput(
  client: SupabaseClient,
  actorId: string,
  opportunityVersionId: string,
  generatedAt: string,
): Promise<OpportunityReadinessInput> {
  const db = client.schema('sih26044');
  const version = await select<Row | null>(db.from('opportunity_versions')
    .select('id,opportunity_id,version_number,status').eq('id', opportunityVersionId)
    .eq('status', 'published').maybeSingle());
  if (!version) throw new SihRouteError('NOT_FOUND', 404, 'Published opportunity version was not found.');

  const [requirementRows, ruleRows, facts, memberships, allEvidence] = await Promise.all([
    select<Row[]>(db.from('opportunity_requirements').select('*')
      .eq('opportunity_version_id', version.id).order('ordinal')),
    select<Row[]>(db.from('eligibility_rules').select('*')
      .eq('opportunity_version_id', version.id).order('ordinal')),
    select<Row | null>(db.from('readiness_subject_facts').select('*')
      .eq('subject_actor_id', actorId).maybeSingle()),
    select<Row[]>(db.from('organization_memberships').select('organization_id,status')
      .eq('actor_id', actorId)),
    select<Row[]>(db.from('evidence_records').select([
      'id', 'subject_actor_id', 'provenance', 'initial_verification_state', 'scope_kind',
      'scope_skill_id', 'scope_literal_skill_label', 'scope_opportunity_id',
      'scope_requirement_id', 'source_captured_at',
    ].join(',')).eq('subject_actor_id', actorId)),
  ]);
  const requirements = requirementRows.map(requirement);
  const eligibilityRules = ruleRows.map(eligibilityRule);
  const evidence = allEvidence.filter(row => row.scope_kind === 'global_skill'
    || (row.scope_kind === 'opportunity' && row.scope_opportunity_id === version.opportunity_id));
  const evidenceIds = evidence.map(row => row.id);
  const [projections, events, links] = evidenceIds.length ? await Promise.all([
    select<Row[]>(db.from('readiness_evidence_projections').select('*').in('evidence_record_id', evidenceIds)),
    select<Row[]>(db.from('verification_events').select('evidence_record_id,sequence_number,action')
      .in('evidence_record_id', evidenceIds)),
    select<Row[]>(db.from('evidence_artifact_links').select('evidence_record_id,artifact_id')
      .in('evidence_record_id', evidenceIds)),
  ]) : [[], [], []];
  const projectionById = new Map(projections.map(row => [row.evidence_record_id, row]));
  const evidenceSignals = evidence.flatMap((record): ReadinessEvidenceSignal[] => {
    const projection = projectionById.get(record.id);
    if (!projection) return [];
    const currentState = verificationState(record, events);
    if (!confirmedStates.has(currentState)) return [];
    const artifactIds = links.filter(link => link.evidence_record_id === record.id)
      .map(link => link.artifact_id as EvidenceArtifactId).sort();
    return [{
      evidenceRecordId: record.id as EvidenceRecordId,
      ...(projection.requirement_id ? { requirementId: projection.requirement_id as OpportunityRequirementId } : {}),
      ...(projection.skill_id ? { skillId: projection.skill_id } : {}),
      ...(projection.literal_skill_label ? { literalSkillLabel: projection.literal_skill_label } : {}),
      ...(projection.literal_requirement_wording
        ? { literalRequirementWording: projection.literal_requirement_wording } : {}),
      ...(projection.proficiency === null ? {} : { proficiency: projection.proficiency }),
      ...(projection.experience_years === null ? {} : { experienceYears: Number(projection.experience_years) }),
      ...(projection.capability_assertion ? { capabilityAssertion: projection.capability_assertion } : {}),
      provenance: record.provenance,
      verificationState: currentState,
      artifactIds,
      workSampleArtifactIds: [],
      observedAt: projection.observed_at as IsoTimestamp,
      directness: projection.directness,
    }];
  }).sort((left, right) => left.evidenceRecordId.localeCompare(right.evidenceRecordId));

  const physicalPresenceLocations = objects(facts?.physical_presence_locations)
    .filter(item => typeof item.value === 'string')
    .map(item => ({ value: item.value as string, confirmed: item.confirmed === true }));
  const eligibilityFacts = (objects(facts?.eligibility_facts)
    .filter(item => ['availability', 'licence_registration', 'explicit_prerequisite'].includes(String(item.kind))
      && typeof item.key === 'string' && (typeof item.value === 'string' || typeof item.value === 'boolean'))
    .map(item => ({ kind: item.kind, key: item.key, value: item.value, confirmed: item.confirmed === true }))) as ReadinessSubjectInput['eligibilityFacts'];
  const workAuthorizations = objects(facts?.work_authorizations)
    .filter(item => typeof item.jurisdiction === 'string' && typeof item.authorized === 'boolean')
    .map(item => ({ jurisdiction: item.jurisdiction as string,
      authorized: item.authorized as boolean, confirmed: item.confirmed === true }));
  const relevantLanguages = objects(facts?.relevant_languages)
    .filter(item => typeof item.value === 'string')
    .map(item => ({ value: item.value as string, confirmed: item.confirmed === true }));
  const subjectMaterial = {
    actorId,
    educationLevel: facts?.education_level
      ? { value: facts.education_level, confirmed: facts.education_level_confirmed === true } : undefined,
    graduationYear: facts?.graduation_year === null || facts?.graduation_year === undefined
      ? undefined : { value: Number(facts.graduation_year), confirmed: facts.graduation_year_confirmed === true },
    physicalPresenceLocations,
    physicalPresenceLocationsComplete: facts?.physical_presence_locations_complete === true,
    organizationMemberships: memberships.map(row => ({
      organizationId: row.organization_id as OrganizationId,
      active: row.status === 'active', confirmed: true,
    })).sort((left, right) => left.organizationId.localeCompare(right.organizationId)),
    organizationMembershipsComplete: true,
    eligibilityFacts,
    workAuthorizations,
    relevantLanguages,
    relevantLanguagesComplete: facts?.relevant_languages_complete === true,
  };
  const subjectFactsVersion = await sha256Version('subject-facts-v1', subjectMaterial);
  const evidenceProjectionVersion = await sha256Version('evidence-projection-v1', evidenceSignals);
  const opportunity = {
    opportunityId: version.opportunity_id as OpportunityId,
    opportunityVersionId: version.id as OpportunityVersionId,
    opportunityVersion: Number(version.version_number), requirements, eligibilityRules,
  };
  const inputVersion = await sha256Version('opportunity-readiness-input-v1', {
    opportunity, subjectFactsVersion, evidenceProjectionVersion,
  });
  const resultId = await deterministicResultId({
    actorId, opportunityVersionId: version.id, inputVersion, subjectFactsVersion,
    evidenceProjectionVersion, engineVersion: OPPORTUNITY_READINESS_ENGINE_VERSION,
    policyVersion: OPPORTUNITY_READINESS_POLICY_VERSION,
  });
  return {
    resultId: resultId as OpportunityReadinessResultId,
    generatedAt: generatedAt as IsoTimestamp,
    inputVersion, evidenceProjectionVersion, opportunity,
    subject: {
      ...subjectMaterial, actorId: actorId as ActorId,
      factsVersion: subjectFactsVersion, evidenceSignals,
    },
  };
}

export async function persistReadinessResult(
  elevatedClient: SupabaseClient,
  result: OpportunityReadinessResult,
): Promise<OpportunityReadinessResult> {
  const { data, error } = await elevatedClient.schema('sih26044').rpc('persist_trusted_readiness_result', {
    p_id: result.resultId,
    p_subject_actor_id: result.subjectActorId,
    p_opportunity_id: result.opportunityId,
    p_opportunity_version_id: result.opportunityVersionId,
    p_engine_version: result.engineVersion,
    p_evidence_policy_version: result.policyVersion,
    p_input_version: result.inputVersion,
    p_subject_facts_version: result.subjectFactsVersion,
    p_evidence_projection_version: result.evidenceProjectionVersion,
    p_readiness_band: result.readinessBand,
    p_result_body: result,
    p_generated_at: result.generatedAt,
  });
  if (error || !data) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to persist trusted readiness.');
  }
  const row = Array.isArray(data) ? data[0] : data;
  const persisted = (row as { result_body?: OpportunityReadinessResult } | null)?.result_body;
  const identity = (value: OpportunityReadinessResult) => ({
    resultId: value.resultId, subjectActorId: value.subjectActorId,
    opportunityVersionId: value.opportunityVersionId, engineVersion: value.engineVersion,
    policyVersion: value.policyVersion, inputVersion: value.inputVersion,
    subjectFactsVersion: value.subjectFactsVersion,
    evidenceProjectionVersion: value.evidenceProjectionVersion,
  });
  if (!persisted || canonicalJson(identity(persisted)) !== canonicalJson(identity(result))) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to persist trusted readiness.');
  }
  return persisted;
}

export async function recomputeAndPersistReadiness(
  userClient: SupabaseClient,
  elevatedClient: SupabaseClient,
  actorId: string,
  opportunityVersionId: string,
  now: () => Date = () => new Date(),
): Promise<OpportunityReadinessResult> {
  const input = await assembleOpportunityReadinessInput(
    userClient, actorId, opportunityVersionId, now().toISOString(),
  );
  let result: OpportunityReadinessResult;
  try {
    result = computeOpportunityReadiness(input);
  } catch (error) {
    if (error instanceof Error && error.name === 'OpportunityReadinessInputValidationError') {
      throw new SihRouteError('UNCONFIRMED_OPPORTUNITY', 409, 'Opportunity content requires human confirmation.');
    }
    throw error;
  }
  return persistReadinessResult(elevatedClient, result);
}
