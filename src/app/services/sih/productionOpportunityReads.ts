import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorId,
  EligibilityRule,
  HumanConfirmationTrace,
  IsoTimestamp,
  Opportunity,
  OpportunityId,
  OpportunityReadinessResult,
  OpportunityRequirement,
  OpportunityRequirementId,
  OpportunityVersion,
  OpportunityVersionId,
} from '../../domain';

type Row = Record<string, any>;

export interface ProductionOpportunityBundle {
  readonly opportunity: Opportunity;
  readonly version: OpportunityVersion;
}

function confirmationTrace(row: Row): HumanConfirmationTrace {
  if (!row.human_confirmed) return { humanConfirmed: false };
  if (!row.confirmed_by_actor_id || !row.confirmed_at || !row.confirmation_method) {
    throw new Error('Invalid confirmed opportunity row: incomplete human confirmation trace.');
  }
  return {
    humanConfirmed: true,
    confirmedByActorId: row.confirmed_by_actor_id as ActorId,
    confirmedAt: row.confirmed_at as IsoTimestamp,
    confirmationMethod: row.confirmation_method,
  };
}

function mapRequirement(row: Row): OpportunityRequirement {
  const base = {
    id: row.id as OpportunityRequirementId,
    priority: row.priority,
    literalSourceWording: row.literal_source_wording,
    importance: row.importance,
    evidenceExpectation: row.evidence_expectation,
    hardGate: row.hard_gate,
    ...confirmationTrace(row),
  };

  if (row.category === 'skill') {
    let canonicalResolution: Extract<OpportunityRequirement, { category: 'skill' }>['canonicalResolution'];
    if (row.resolution_status === 'review_required') {
      const suggestions = (Array.isArray(row.resolution_suggestions) ? row.resolution_suggestions : [])
        .filter((item: Row) => typeof item?.skillId === 'string' && typeof item?.label === 'string' && typeof item?.score === 'number')
        .map((item: Row) => ({
          skillId: item.skillId,
          label: item.label,
          score: item.score,
          reviewOnly: true as const,
        }));
      canonicalResolution = {
        state: 'review_required',
        literalText: row.literal_source_wording,
        suggestions,
      };
    } else if (row.canonical_resolution === 'exact' || row.canonical_resolution === 'alias') {
      canonicalResolution = {
        state: 'resolved',
        skillId: row.canonical_skill_id,
        matchKind: row.canonical_resolution,
      };
    } else {
      canonicalResolution = {
        state: 'unresolved',
        literalText: row.literal_source_wording,
      };
    }
    return {
      ...base,
      category: 'skill',
      canonicalResolution,
      ...(row.minimum_proficiency === null || row.minimum_proficiency === undefined
        ? {}
        : { minimumProficiency: Number(row.minimum_proficiency) as 0 | 1 | 2 | 3 | 4 }),
    } as OpportunityRequirement;
  }

  if (row.category === 'experience') {
    return {
      ...base,
      category: 'experience',
      ...(row.minimum_years === null || row.minimum_years === undefined
        ? {}
        : { minimumYears: Number(row.minimum_years) }),
    } as OpportunityRequirement;
  }

  if (row.category === 'document_evidence') {
    return {
      ...base,
      category: 'document_evidence',
      ...(typeof row.category_payload?.requestedArtifactKind === 'string'
        ? { requestedArtifactKind: row.category_payload.requestedArtifactKind }
        : {}),
    } as OpportunityRequirement;
  }

  if (row.category === 'questionnaire') {
    return {
      ...base,
      category: 'questionnaire',
      ...(typeof row.category_payload?.questionnaireReference === 'string'
        ? { questionnaireReference: row.category_payload.questionnaireReference }
        : {}),
    } as OpportunityRequirement;
  }

  if (row.category === 'logistics') {
    return {
      ...base,
      category: 'logistics',
      ...(typeof row.category_payload?.logisticsKind === 'string'
        ? { logisticsKind: row.category_payload.logisticsKind }
        : {}),
    } as OpportunityRequirement;
  }

  return { ...base, category: row.category } as OpportunityRequirement;
}

function mapEligibilityRule(row: Row): EligibilityRule {
  const typed = row.typed_rule_definition && typeof row.typed_rule_definition === 'object'
    ? row.typed_rule_definition
    : {};
  return {
    ...typed,
    kind: row.rule_kind,
    literalSourceWording: row.literal_source_wording,
    ...confirmationTrace(row),
  } as EligibilityRule;
}

function mapVersion(
  row: Row,
  requirements: readonly OpportunityRequirement[],
  eligibilityRules: readonly EligibilityRule[],
): OpportunityVersion {
  return {
    id: row.id as OpportunityVersionId,
    opportunityId: row.opportunity_id as OpportunityId,
    version: Number(row.version_number),
    createdAt: row.created_at as IsoTimestamp,
    createdBy: row.created_by_actor_id as ActorId,
    title: row.title,
    description: row.description,
    type: row.opportunity_type,
    audiences: row.audiences,
    requirements,
    eligibilityRules,
    source: {
      sourceSystem: row.source_system,
      ...(row.source_record_id ? { sourceRecordId: row.source_record_id } : {}),
      ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      capturedAt: row.source_captured_at as IsoTimestamp,
    },
    ...(row.published_at ? { publishedAt: row.published_at as IsoTimestamp } : {}),
    ...(row.closes_at ? { closesAt: row.closes_at as IsoTimestamp } : {}),
  };
}

function mapOpportunity(row: Row): Opportunity {
  if (!row.current_version_id) {
    throw new Error('Published opportunity is missing its current version.');
  }
  return {
    id: row.id as OpportunityId,
    ownerOrganizationId: row.owner_organization_id,
    currentVersionId: row.current_version_id as OpportunityVersionId,
    status: row.status,
  };
}

async function dataOrThrow<T>(query: PromiseLike<{ data: T | null; error: any }>, message: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${message}: ${error.message ?? String(error)}`);
  return (data ?? []) as T;
}

export class ProductionOpportunityReads {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async listCurrentPublished(): Promise<ProductionOpportunityBundle[]> {
    const opportunityRows = await dataOrThrow<Row[]>(
      this.db()
        .from('opportunities')
        .select('id,owner_organization_id,current_version_id,status')
        .eq('status', 'published')
        .not('current_version_id', 'is', null)
        .order('updated_at', { ascending: false }),
      'Unable to load published opportunities',
    );
    if (opportunityRows.length === 0) return [];

    const versionIds = opportunityRows.map(row => row.current_version_id as string);
    const versionRows = await dataOrThrow<Row[]>(
      this.db()
        .from('opportunity_versions')
        .select('id,opportunity_id,version_number,status,title,description,opportunity_type,audiences,source_system,source_record_id,source_url,source_captured_at,closes_at,created_by_actor_id,created_at,published_at')
        .in('id', versionIds)
        .eq('status', 'published'),
      'Unable to load canonical opportunity versions',
    );
    const bundles = await this.composeBundles(opportunityRows, versionRows);
    return bundles.sort((a, b) => (b.version.publishedAt ?? b.version.createdAt).localeCompare(a.version.publishedAt ?? a.version.createdAt));
  }

  async getPublishedVersion(opportunityVersionId: OpportunityVersionId | string): Promise<ProductionOpportunityBundle | null> {
    const { data: versionRow, error: versionError } = await this.db()
      .from('opportunity_versions')
      .select('id,opportunity_id,version_number,status,title,description,opportunity_type,audiences,source_system,source_record_id,source_url,source_captured_at,closes_at,created_by_actor_id,created_at,published_at')
      .eq('id', opportunityVersionId)
      .eq('status', 'published')
      .maybeSingle();
    if (versionError) throw new Error(`Unable to load opportunity version: ${versionError.message}`);
    if (!versionRow) return null;

    const { data: opportunityRow, error: opportunityError } = await this.db()
      .from('opportunities')
      .select('id,owner_organization_id,current_version_id,status')
      .eq('id', versionRow.opportunity_id)
      .maybeSingle();
    if (opportunityError) throw new Error(`Unable to load opportunity: ${opportunityError.message}`);
    if (!opportunityRow) return null;

    const [bundle] = await this.composeBundles([opportunityRow as Row], [versionRow as Row]);
    return bundle ?? null;
  }

  async getLatestReadinessResult(
    subjectActorId: ActorId,
    opportunityVersionId: OpportunityVersionId | string,
  ): Promise<OpportunityReadinessResult | null> {
    const { data, error } = await this.db()
      .from('opportunity_readiness_results')
      .select('result_body,subject_actor_id,opportunity_version_id,generated_at')
      .eq('subject_actor_id', subjectActorId)
      .eq('opportunity_version_id', opportunityVersionId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Unable to load canonical readiness result: ${error.message}`);
    if (!data?.result_body || typeof data.result_body !== 'object') return null;
    const result = data.result_body as OpportunityReadinessResult;
    if (result.subjectActorId !== subjectActorId || result.opportunityVersionId !== opportunityVersionId) {
      throw new Error('Canonical readiness result identity does not match the requested actor and opportunity version.');
    }
    return result;
  }

  private async composeBundles(opportunityRows: readonly Row[], versionRows: readonly Row[]): Promise<ProductionOpportunityBundle[]> {
    if (versionRows.length === 0) return [];
    const versionIds = versionRows.map(row => row.id as string);
    const [requirementRows, ruleRows] = await Promise.all([
      dataOrThrow<Row[]>(
        this.db().from('opportunity_requirements').select('*').in('opportunity_version_id', versionIds).order('ordinal'),
        'Unable to load opportunity requirements',
      ),
      dataOrThrow<Row[]>(
        this.db().from('eligibility_rules').select('*').in('opportunity_version_id', versionIds).order('ordinal'),
        'Unable to load opportunity eligibility rules',
      ),
    ]);

    const opportunityById = new Map(opportunityRows.map(row => [row.id as string, row]));
    return versionRows.flatMap(row => {
      const opportunityRow = opportunityById.get(row.opportunity_id as string);
      if (!opportunityRow) return [];
      const requirements = requirementRows
        .filter(requirement => requirement.opportunity_version_id === row.id)
        .map(mapRequirement);
      const eligibilityRules = ruleRows
        .filter(rule => rule.opportunity_version_id === row.id)
        .map(mapEligibilityRule);
      return [{
        opportunity: mapOpportunity(opportunityRow),
        version: mapVersion(row, requirements, eligibilityRules),
      }];
    });
  }
}
