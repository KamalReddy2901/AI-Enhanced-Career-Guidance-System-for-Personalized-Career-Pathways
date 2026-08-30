import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EligibilityRule,
  OpportunityId,
  OpportunityRequirement,
  OpportunityVersionId,
  OrganizationId,
} from '../../domain';
import { SKILLS } from '../../data/knowledge/skills';
import type { OpportunityBasicsDraft } from '../../components/sih/industry/OpportunityBasicsSection';

export interface ProductionOpportunityDraftInput {
  readonly ownerOrganizationId: OrganizationId;
  readonly opportunityId?: OpportunityId;
  readonly opportunityVersionId?: OpportunityVersionId;
  readonly basics: OpportunityBasicsDraft;
  readonly requirements: readonly OpportunityRequirement[];
  readonly eligibilityRules: readonly EligibilityRule[];
}

export interface SavedProductionOpportunityDraft {
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly versionNumber: number;
}

type JsonObject = Record<string, unknown>;

const canonicalSkillLabels = new Map(SKILLS.map((skill) => [skill.id, skill.name]));

function confirmationPayload(
  item: OpportunityRequirement | EligibilityRule,
): JsonObject {
  if (!item.humanConfirmed) return { humanConfirmed: false };
  if (item.confirmationMethod === 'controlled_fixture') {
    throw new Error('Controlled-fixture confirmation cannot be persisted through production opportunity authoring. Review and confirm the item as a human-authored production decision.');
  }
  return {
    humanConfirmed: true,
    confirmationMethod: item.confirmationMethod,
  };
}

function categoryPayload(requirement: OpportunityRequirement): JsonObject {
  switch (requirement.category) {
    case 'document_evidence':
      return requirement.requestedArtifactKind
        ? { requestedArtifactKind: requirement.requestedArtifactKind }
        : {};
    case 'questionnaire':
      return requirement.questionnaireReference
        ? { questionnaireReference: requirement.questionnaireReference }
        : {};
    case 'logistics':
      return requirement.logisticsKind
        ? { logisticsKind: requirement.logisticsKind }
        : {};
    default:
      return {};
  }
}

function serializeRequirement(requirement: OpportunityRequirement): JsonObject {
  const base: JsonObject = {
    category: requirement.category,
    priority: requirement.priority,
    literalSourceWording: requirement.literalSourceWording,
    importance: requirement.importance,
    evidenceExpectation: requirement.evidenceExpectation,
    hardGate: requirement.hardGate,
    categoryPayload: categoryPayload(requirement),
    ...confirmationPayload(requirement),
  };

  if (requirement.category === 'experience' && requirement.minimumYears !== undefined) {
    base.minimumYears = requirement.minimumYears;
  }

  if (requirement.category !== 'skill') return base;

  if (requirement.minimumProficiency !== undefined) {
    base.minimumProficiency = requirement.minimumProficiency;
  }

  const resolution = requirement.canonicalResolution;
  if (resolution.state === 'resolved') {
    const trustedLabel = resolution.label ?? canonicalSkillLabels.get(resolution.skillId);
    if (!trustedLabel) {
      throw new Error(`Resolved skill ${resolution.skillId} is not present in the trusted canonical skill catalog. Keep the requirement literal/unresolved or select a reviewed canonical option.`);
    }
    return {
      ...base,
      resolutionStatus: 'resolved',
      canonicalResolution: resolution.matchKind,
      canonicalSkillId: resolution.skillId,
      canonicalSkillLabel: trustedLabel,
      resolutionSuggestions: [],
    };
  }

  if (resolution.state === 'review_required') {
    if (requirement.humanConfirmed) {
      throw new Error('A review-required skill cannot be human-confirmed until the reviewer resolves it or explicitly keeps the literal wording unresolved.');
    }
    return {
      ...base,
      resolutionStatus: 'review_required',
      canonicalResolution: 'unresolved',
      canonicalSkillLabel: requirement.literalSourceWording,
      resolutionSuggestions: resolution.suggestions.map((suggestion) => ({
        skillId: suggestion.skillId,
        label: suggestion.label,
        score: suggestion.score,
        reviewOnly: true,
      })),
    };
  }

  return {
    ...base,
    resolutionStatus: 'unresolved',
    canonicalResolution: 'unresolved',
    canonicalSkillLabel: requirement.literalSourceWording,
    resolutionSuggestions: [],
  };
}

function serializeEligibilityRule(rule: EligibilityRule): JsonObject {
  const source = { ...(rule as unknown as JsonObject) };
  delete source.literalSourceWording;
  delete source.humanConfirmed;
  delete source.confirmedByActorId;
  delete source.confirmedAt;
  delete source.confirmationMethod;

  return {
    ruleKind: rule.kind,
    literalSourceWording: rule.literalSourceWording,
    typedRuleDefinition: source,
    ...confirmationPayload(rule),
  };
}

function validateBasics(basics: OpportunityBasicsDraft): void {
  if (!basics.title.trim()) throw new Error('Opportunity title is required.');
  if (!basics.description.trim()) throw new Error('Opportunity description is required.');
  if (!basics.type) throw new Error('Opportunity type is required.');
  if (basics.audiences.length === 0) throw new Error('Select at least one opportunity audience.');
}

export class ProductionOpportunityAuthoring {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async saveDraft(input: ProductionOpportunityDraftInput): Promise<SavedProductionOpportunityDraft> {
    validateBasics(input.basics);

    const payload = {
      title: input.basics.title.trim(),
      description: input.basics.description.trim(),
      opportunityType: input.basics.type,
      audiences: input.basics.audiences,
      ...(input.basics.closesAt ? { closesAt: input.basics.closesAt } : {}),
      sourceLiteralText: input.basics.description,
      requirements: input.requirements.map(serializeRequirement),
      eligibilityRules: input.eligibilityRules.map(serializeEligibilityRule),
    };

    const { data, error } = await this.db().rpc('save_opportunity_draft', {
      requested_owner_organization_id: input.ownerOrganizationId,
      requested_opportunity_id: input.opportunityId ?? null,
      requested_version_id: input.opportunityVersionId ?? null,
      requested_payload: payload,
    });
    if (error) throw new Error(`Unable to save opportunity draft: ${error.message}`);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.opportunity_id || !row?.opportunity_version_id || !row?.version_number) {
      throw new Error('Opportunity draft save returned an invalid authoritative identifier set.');
    }

    return {
      opportunityId: row.opportunity_id as OpportunityId,
      opportunityVersionId: row.opportunity_version_id as OpportunityVersionId,
      versionNumber: Number(row.version_number),
    };
  }
}
