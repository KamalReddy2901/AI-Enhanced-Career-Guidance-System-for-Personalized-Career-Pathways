import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CollaborationEngagementId,
  CollaborationKind,
  OpportunityId,
  OrganizationId,
} from '../../domain';

export interface CollaborationPartnerOrganization {
  readonly organizationId: OrganizationId;
  readonly displayName: string;
  readonly kind: string;
}

export interface CreateCollaborationProposalInput {
  readonly hostOrganizationId: OrganizationId;
  readonly kind: CollaborationKind;
  readonly partnerOrganizationIds: readonly OrganizationId[];
  readonly objectives: readonly string[];
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly opportunityId?: OpportunityId;
}

type PartnerRow = {
  organization_id?: string;
  display_name?: string;
  kind?: string;
};

function normalizeObjectives(objectives: readonly string[]): string[] {
  const normalized = objectives.map((objective) => objective.trim());
  if (normalized.length === 0 || normalized.some((objective) => objective.length === 0)) {
    throw new Error('Add at least one non-empty collaboration objective.');
  }
  if (normalized.some((objective) => objective.length > 500)) {
    throw new Error('Each collaboration objective must be 500 characters or fewer.');
  }
  return normalized;
}

function normalizePartnerIds(ids: readonly OrganizationId[]): OrganizationId[] {
  const normalized = [...new Set(ids)];
  if (normalized.length === 0) {
    throw new Error('Select at least one explicit partner organization.');
  }
  return normalized;
}

export class ProductionCollaborationAuthoring {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async listPartnerOrganizations(hostOrganizationId: OrganizationId): Promise<readonly CollaborationPartnerOrganization[]> {
    const { data, error } = await this.db().rpc('list_collaboration_partner_organizations', {
      requested_host_organization_id: hostOrganizationId,
    });
    if (error) throw new Error(`Unable to load collaboration partner directory: ${error.message}`);

    return ((data ?? []) as PartnerRow[]).map((row) => {
      if (!row.organization_id || !row.display_name || !row.kind) {
        throw new Error('Collaboration partner directory returned an invalid row.');
      }
      return {
        organizationId: row.organization_id as OrganizationId,
        displayName: row.display_name,
        kind: row.kind,
      };
    });
  }

  async createProposal(input: CreateCollaborationProposalInput): Promise<CollaborationEngagementId> {
    const partnerOrganizationIds = normalizePartnerIds(input.partnerOrganizationIds);
    if (partnerOrganizationIds.includes(input.hostOrganizationId)) {
      throw new Error('The host organization cannot also be selected as a partner.');
    }
    const objectives = normalizeObjectives(input.objectives);

    if (input.startsAt && input.endsAt && new Date(input.endsAt).getTime() < new Date(input.startsAt).getTime()) {
      throw new Error('Collaboration end time cannot precede start time.');
    }

    const { data, error } = await this.db().rpc('create_collaboration_proposal', {
      requested_host_organization_id: input.hostOrganizationId,
      requested_kind: input.kind,
      requested_partner_organization_ids: partnerOrganizationIds,
      requested_objectives: objectives,
      requested_starts_at: input.startsAt ?? null,
      requested_ends_at: input.endsAt ?? null,
      requested_opportunity_id: input.opportunityId ?? null,
    });
    if (error) throw new Error(`Unable to create collaboration proposal: ${error.message}`);
    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Collaboration proposal creation returned an invalid authoritative identifier.');
    }
    return data as CollaborationEngagementId;
  }
}
