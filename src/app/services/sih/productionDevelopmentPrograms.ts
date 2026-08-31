import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CanonicalResolutionState,
  DevelopmentDeliveryMode,
  DevelopmentProgramId,
  DevelopmentProgramKind,
  DevelopmentProgramSkillTarget,
  DevelopmentProgramSummary,
  DevelopmentProgramVersion,
  DevelopmentProgramVersionId,
  OrganizationId,
} from '../../domain';
import { SKILLS } from '../../data/knowledge/skills';

export interface DevelopmentProgramDraftInput {
  readonly providerOrganizationId: OrganizationId;
  readonly developmentProgramId?: DevelopmentProgramId;
  readonly developmentProgramVersionId?: DevelopmentProgramVersionId;
  readonly kind: DevelopmentProgramKind;
  readonly title: string;
  readonly description: string;
  readonly deliveryMode: DevelopmentDeliveryMode;
  readonly externalRegistrationUrl?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly skillTargets: readonly DevelopmentProgramSkillTarget[];
}

export interface SavedDevelopmentProgramDraft {
  readonly developmentProgramId: DevelopmentProgramId;
  readonly developmentProgramVersionId: DevelopmentProgramVersionId;
  readonly versionNumber: number;
}

type JsonObject = Record<string, unknown>;
const canonicalSkillLabels = new Map(SKILLS.map((skill) => [skill.id, skill.name]));

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseTarget(row: unknown): DevelopmentProgramSkillTarget {
  const item = (row ?? {}) as Record<string, unknown>;
  const literalSourceWording = String(item.literalSourceWording ?? '');
  const resolutionStatus = String(item.resolutionStatus ?? '');
  const canonicalResolution = String(item.canonicalResolution ?? '');
  const canonicalSkillId = item.canonicalSkillId ? String(item.canonicalSkillId) : undefined;
  const canonicalSkillLabel = String(item.canonicalSkillLabel ?? literalSourceWording);
  let resolution: CanonicalResolutionState;
  if (resolutionStatus === 'resolved' && canonicalSkillId && (canonicalResolution === 'exact' || canonicalResolution === 'alias')) {
    resolution = { state: 'resolved', skillId: canonicalSkillId, matchKind: canonicalResolution, label: canonicalSkillLabel };
  } else if (resolutionStatus === 'review_required') {
    const suggestions = asArray(item.resolutionSuggestions).map((value) => {
      const suggestion = value as Record<string, unknown>;
      return {
        skillId: String(suggestion.skillId ?? ''),
        label: String(suggestion.label ?? ''),
        score: Number(suggestion.score ?? 0),
        reviewOnly: true as const,
      };
    }).filter((suggestion) => suggestion.skillId && suggestion.label);
    resolution = { state: 'review_required', literalText: literalSourceWording, suggestions };
  } else {
    resolution = { state: 'unresolved', literalText: literalSourceWording };
  }
  return {
    literalSourceWording,
    canonicalResolution: resolution,
    humanConfirmed: Boolean(item.humanConfirmed),
    ...(item.confirmationMethod ? { confirmationMethod: String(item.confirmationMethod) as DevelopmentProgramSkillTarget['confirmationMethod'] } : {}),
  };
}

function serializeTarget(target: DevelopmentProgramSkillTarget): JsonObject {
  if (!target.literalSourceWording.trim()) throw new Error('Every development-program target needs literal source wording.');
  if (target.humanConfirmed && (!target.confirmationMethod || target.confirmationMethod === ('controlled_fixture' as never))) {
    throw new Error('Production program targets require an explicit non-fixture human confirmation method.');
  }
  const confirmation = target.humanConfirmed
    ? { humanConfirmed: true, confirmationMethod: target.confirmationMethod }
    : { humanConfirmed: false };
  const resolution = target.canonicalResolution;
  if (resolution.state === 'resolved') {
    const label = resolution.label ?? canonicalSkillLabels.get(resolution.skillId);
    if (!label) throw new Error(`Resolved skill ${resolution.skillId} is not in the trusted canonical skill catalog.`);
    return {
      literalSourceWording: target.literalSourceWording.trim(),
      resolutionStatus: 'resolved',
      canonicalResolution: resolution.matchKind,
      canonicalSkillId: resolution.skillId,
      canonicalSkillLabel: label,
      resolutionSuggestions: [],
      ...confirmation,
    };
  }
  if (resolution.state === 'review_required') {
    if (target.humanConfirmed) throw new Error('A review-required program target cannot be confirmed until a human resolves it or explicitly keeps it literal.');
    return {
      literalSourceWording: target.literalSourceWording.trim(),
      resolutionStatus: 'review_required',
      canonicalResolution: 'unresolved',
      canonicalSkillLabel: target.literalSourceWording.trim(),
      resolutionSuggestions: resolution.suggestions.map((suggestion) => ({ ...suggestion, reviewOnly: true })),
      humanConfirmed: false,
    };
  }
  return {
    literalSourceWording: target.literalSourceWording.trim(),
    resolutionStatus: 'unresolved',
    canonicalResolution: 'unresolved',
    canonicalSkillLabel: target.literalSourceWording.trim(),
    resolutionSuggestions: [],
    ...confirmation,
  };
}

function validateInput(input: DevelopmentProgramDraftInput): void {
  if (!input.title.trim()) throw new Error('Program title is required.');
  if (!input.description.trim()) throw new Error('Program description is required.');
  if (input.skillTargets.length === 0) throw new Error('Add at least one literal skill/capability target.');
  if (input.externalRegistrationUrl && !input.externalRegistrationUrl.startsWith('https://')) throw new Error('External registration links must use HTTPS.');
  if (input.startsAt && input.endsAt && new Date(input.endsAt).getTime() < new Date(input.startsAt).getTime()) throw new Error('Program end time cannot precede start time.');
}

export class ProductionDevelopmentPrograms {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() { return this.supabase.schema('sih26044'); }

  async listPublished(canonicalSkillId?: string): Promise<readonly DevelopmentProgramVersion[]> {
    const { data, error } = await this.db().rpc('list_published_development_programs', {
      requested_canonical_skill_id: canonicalSkillId ?? null,
    });
    if (error) throw new Error(`Unable to load development programs: ${error.message}`);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.development_program_version_id) as DevelopmentProgramVersionId,
      developmentProgramId: String(row.development_program_id) as DevelopmentProgramId,
      versionNumber: Number(row.version_number),
      status: 'published',
      providerOrganizationId: String(row.provider_organization_id) as OrganizationId,
      providerDisplayName: String(row.provider_display_name ?? 'Provider organization'),
      kind: String(row.kind) as DevelopmentProgramKind,
      title: String(row.title),
      description: String(row.description),
      deliveryMode: String(row.delivery_mode) as DevelopmentDeliveryMode,
      ...(row.external_registration_url ? { externalRegistrationUrl: String(row.external_registration_url) } : {}),
      ...(row.starts_at ? { startsAt: String(row.starts_at) as DevelopmentProgramVersion['startsAt'] } : {}),
      ...(row.ends_at ? { endsAt: String(row.ends_at) as DevelopmentProgramVersion['endsAt'] } : {}),
      ...(row.published_at ? { publishedAt: String(row.published_at) as DevelopmentProgramVersion['publishedAt'] } : {}),
      skillTargets: asArray(row.skill_targets).map(parseTarget),
    }));
  }

  async listManaged(providerOrganizationId: OrganizationId): Promise<readonly DevelopmentProgramSummary[]> {
    const { data, error } = await this.db().rpc('list_managed_development_programs', {
      requested_provider_organization_id: providerOrganizationId,
    });
    if (error) throw new Error(`Unable to load managed development programs: ${error.message}`);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.development_program_id) as DevelopmentProgramId,
      currentVersionId: String(row.development_program_version_id) as DevelopmentProgramVersionId,
      currentVersionNumber: Number(row.version_number),
      providerOrganizationId,
      status: String(row.program_status) as DevelopmentProgramSummary['status'],
      versionStatus: String(row.version_status) as DevelopmentProgramSummary['versionStatus'],
      title: String(row.title),
      kind: String(row.kind) as DevelopmentProgramKind,
    }));
  }

  async getManagedVersion(versionId: DevelopmentProgramVersionId): Promise<DevelopmentProgramVersion | null> {
    const { data, error } = await this.db().rpc('get_managed_development_program_version', { requested_version_id: versionId });
    if (error) throw new Error(`Unable to load managed development-program version: ${error.message}`);
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.development_program_version_id) as DevelopmentProgramVersionId,
      developmentProgramId: String(row.development_program_id) as DevelopmentProgramId,
      versionNumber: Number(row.version_number),
      status: String(row.version_status) as DevelopmentProgramVersion['status'],
      providerOrganizationId: String(row.provider_organization_id) as OrganizationId,
      kind: String(row.kind) as DevelopmentProgramKind,
      title: String(row.title),
      description: String(row.description),
      deliveryMode: String(row.delivery_mode) as DevelopmentDeliveryMode,
      ...(row.external_registration_url ? { externalRegistrationUrl: String(row.external_registration_url) } : {}),
      ...(row.starts_at ? { startsAt: String(row.starts_at) as DevelopmentProgramVersion['startsAt'] } : {}),
      ...(row.ends_at ? { endsAt: String(row.ends_at) as DevelopmentProgramVersion['endsAt'] } : {}),
      skillTargets: asArray(row.skill_targets).map(parseTarget),
    };
  }

  async saveDraft(input: DevelopmentProgramDraftInput): Promise<SavedDevelopmentProgramDraft> {
    validateInput(input);
    const { data, error } = await this.db().rpc('save_development_program_draft', {
      requested_provider_organization_id: input.providerOrganizationId,
      requested_program_id: input.developmentProgramId ?? null,
      requested_version_id: input.developmentProgramVersionId ?? null,
      requested_payload: {
        kind: input.kind,
        title: input.title.trim(),
        description: input.description.trim(),
        deliveryMode: input.deliveryMode,
        ...(input.externalRegistrationUrl ? { externalRegistrationUrl: input.externalRegistrationUrl.trim() } : {}),
        ...(input.startsAt ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt ? { endsAt: input.endsAt } : {}),
        skillTargets: input.skillTargets.map(serializeTarget),
      },
    });
    if (error) throw new Error(`Unable to save development-program draft: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.development_program_id || !row?.development_program_version_id || !row?.version_number) throw new Error('Development-program save returned invalid authoritative identifiers.');
    return {
      developmentProgramId: row.development_program_id as DevelopmentProgramId,
      developmentProgramVersionId: row.development_program_version_id as DevelopmentProgramVersionId,
      versionNumber: Number(row.version_number),
    };
  }

  async publish(versionId: DevelopmentProgramVersionId): Promise<void> {
    const { data, error } = await this.db().rpc('publish_development_program_version', { requested_version_id: versionId });
    if (error) throw new Error(`Unable to publish development program: ${error.message}`);
    if (data !== versionId) throw new Error('Development-program publication returned an unexpected version identifier.');
  }
}
