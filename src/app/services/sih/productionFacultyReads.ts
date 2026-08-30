import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Actor,
  ActorId,
  CollaborationEngagement,
  CollaborationEngagementEvent,
  CollaborationEngagementEventId,
  CollaborationEngagementId,
  IsoTimestamp,
  OpportunityId,
  Organization,
  OrganizationId,
} from '../../domain';

type Row = Record<string, any>;

export interface ProductionFacultyCollaborationBundle {
  readonly engagements: readonly CollaborationEngagement[];
  readonly events: readonly CollaborationEngagementEvent[];
  /** Only organizations visible through the caller's existing membership RLS are returned. */
  readonly organizations: readonly Organization[];
  /** Actor RLS is self-only. Other participant identities deliberately remain undisclosed. */
  readonly visibleActors: readonly Actor[];
}

async function dataOrThrow<T>(
  query: PromiseLike<{ data: T | null; error: any }>,
  message: string,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${message}: ${error.message ?? String(error)}`);
  return (data ?? []) as T;
}

export class ProductionFacultyReads {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async listVisible(): Promise<ProductionFacultyCollaborationBundle> {
    const engagementRows = await dataOrThrow<Row[]>(
      this.db()
        .from('collaboration_engagements')
        .select('id,kind,opportunity_id,host_organization_id,status,starts_at,ends_at,created_at')
        .order('created_at', { ascending: false }),
      'Unable to load authorized faculty–industry collaborations',
    );
    if (engagementRows.length === 0) {
      return { engagements: [], events: [], organizations: [], visibleActors: [] };
    }

    const engagementIds = engagementRows.map((row) => row.id as string);
    const [partnerRows, participantRows, objectiveRows, eventRows] = await Promise.all([
      dataOrThrow<Row[]>(
        this.db()
          .from('collaboration_partner_organizations')
          .select('collaboration_engagement_id,organization_id')
          .in('collaboration_engagement_id', engagementIds),
        'Unable to load collaboration partner organizations',
      ),
      dataOrThrow<Row[]>(
        this.db()
          .from('collaboration_participants')
          .select('collaboration_engagement_id,actor_id')
          .in('collaboration_engagement_id', engagementIds),
        'Unable to load collaboration participants',
      ),
      dataOrThrow<Row[]>(
        this.db()
          .from('collaboration_objectives')
          .select('collaboration_engagement_id,ordinal,objective')
          .in('collaboration_engagement_id', engagementIds)
          .order('ordinal', { ascending: true }),
        'Unable to load collaboration objectives',
      ),
      dataOrThrow<Row[]>(
        this.db()
          .from('collaboration_engagement_events')
          .select('id,collaboration_engagement_id,sequence_number,kind,from_status,to_status,title,detail,actor_id,organization_id,occurred_at')
          .in('collaboration_engagement_id', engagementIds)
          .order('sequence_number', { ascending: true }),
        'Unable to load collaboration lifecycle events',
      ),
    ]);

    const organizationIds = new Set<string>();
    for (const row of engagementRows) organizationIds.add(row.host_organization_id as string);
    for (const row of partnerRows) organizationIds.add(row.organization_id as string);
    const actorIds = [...new Set(participantRows.map((row) => row.actor_id as string))];

    const [organizationRows, actorRows] = await Promise.all([
      organizationIds.size === 0
        ? Promise.resolve([] as Row[])
        : dataOrThrow<Row[]>(
            this.db()
              .from('organizations')
              .select('id,legal_name,display_name,kind,status,created_at')
              .in('id', [...organizationIds]),
            'Unable to load visible collaboration organizations',
          ),
      actorIds.length === 0
        ? Promise.resolve([] as Row[])
        : dataOrThrow<Row[]>(
            this.db()
              .from('actors')
              .select('id,display_name,status')
              .in('id', actorIds),
            'Unable to load visible collaboration participants',
          ),
    ]);

    const engagements: CollaborationEngagement[] = engagementRows.map((row) => ({
      id: row.id as CollaborationEngagementId,
      kind: row.kind,
      ...(row.opportunity_id ? { opportunityId: row.opportunity_id as OpportunityId } : {}),
      hostOrganizationId: row.host_organization_id as OrganizationId,
      partnerOrganizationIds: partnerRows
        .filter((item) => item.collaboration_engagement_id === row.id)
        .map((item) => item.organization_id as OrganizationId),
      participantActorIds: participantRows
        .filter((item) => item.collaboration_engagement_id === row.id)
        .map((item) => item.actor_id as ActorId),
      status: row.status,
      objectives: objectiveRows
        .filter((item) => item.collaboration_engagement_id === row.id)
        .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
        .map((item) => item.objective as string),
      ...(row.starts_at ? { startsAt: row.starts_at as IsoTimestamp } : {}),
      ...(row.ends_at ? { endsAt: row.ends_at as IsoTimestamp } : {}),
    }));

    const organizations: Organization[] = organizationRows.map((row) => ({
      id: row.id as OrganizationId,
      legalName: row.legal_name,
      displayName: row.display_name,
      kind: row.kind,
      status: row.status,
      createdAt: row.created_at as IsoTimestamp,
    }));

    const visibleActors: Actor[] = actorRows.map((row) => ({
      id: row.id as ActorId,
      displayName: row.display_name,
      status: row.status,
    }));

    const events: CollaborationEngagementEvent[] = eventRows.map((row) => ({
      id: row.id as CollaborationEngagementEventId,
      collaborationEngagementId: row.collaboration_engagement_id as CollaborationEngagementId,
      sequenceNumber: Number(row.sequence_number),
      kind: row.kind,
      ...(row.from_status ? { fromStatus: row.from_status } : {}),
      ...(row.to_status ? { toStatus: row.to_status } : {}),
      ...(row.title ? { title: row.title } : {}),
      ...(row.detail ? { detail: row.detail } : {}),
      actorId: row.actor_id as ActorId,
      organizationId: row.organization_id as OrganizationId,
      occurredAt: row.occurred_at as IsoTimestamp,
    }));

    return { engagements, events, organizations, visibleActors };
  }

  async getVisible(
    collaborationId: CollaborationEngagementId | string,
  ): Promise<{
    readonly engagement?: CollaborationEngagement;
    readonly events: readonly CollaborationEngagementEvent[];
    readonly organizations: readonly Organization[];
    readonly visibleActors: readonly Actor[];
  }> {
    const bundle = await this.listVisible();
    return {
      engagement: bundle.engagements.find((item) => item.id === collaborationId),
      events: bundle.events.filter((item) => item.collaborationEngagementId === collaborationId),
      organizations: bundle.organizations,
      visibleActors: bundle.visibleActors,
    };
  }
}
