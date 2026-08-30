import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CollaborationEngagement,
  CollaborationEngagementEventId,
  CollaborationEngagementId,
  CollaborationEventKind,
} from '../../domain';

export interface AppendCollaborationActivityInput {
  readonly collaborationEngagementId: CollaborationEngagementId;
  readonly kind: Exclude<CollaborationEventKind, 'created' | 'status_transition'>;
  readonly title: string;
  readonly detail?: string;
}

export class ProductionFacultyLifecycle {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  private async append(
    collaborationEngagementId: CollaborationEngagementId,
    kind: CollaborationEventKind,
    toStatus: CollaborationEngagement['status'] | null,
    title: string | null,
    detail: string | null,
  ): Promise<CollaborationEngagementEventId> {
    const { data, error } = await this.db().rpc('append_collaboration_engagement_event', {
      requested_collaboration_engagement_id: collaborationEngagementId,
      requested_kind: kind,
      requested_to_status: toStatus,
      requested_title: title,
      requested_detail: detail,
    });
    if (error) throw new Error(`Unable to update collaboration engagement: ${error.message}`);
    if (typeof data !== 'string') throw new Error('Collaboration lifecycle response did not contain an event id.');
    return data as CollaborationEngagementEventId;
  }

  async transition(
    collaborationEngagementId: CollaborationEngagementId,
    toStatus: CollaborationEngagement['status'],
    detail?: string,
  ): Promise<CollaborationEngagementEventId> {
    return this.append(
      collaborationEngagementId,
      'status_transition',
      toStatus,
      null,
      detail?.trim() || null,
    );
  }

  async recordActivity(input: AppendCollaborationActivityInput): Promise<CollaborationEngagementEventId> {
    return this.append(
      input.collaborationEngagementId,
      input.kind,
      null,
      input.title.trim(),
      input.detail?.trim() || null,
    );
  }
}
