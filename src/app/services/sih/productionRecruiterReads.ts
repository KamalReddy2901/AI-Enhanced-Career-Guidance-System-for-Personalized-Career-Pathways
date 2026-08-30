import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationId, ApplicationSnapshotId } from '../../domain';
import {
  validateNoProhibitedKeys,
  type ProductionRecruiterProjection,
} from './productionRecruiterProjection';

export interface ExactRecruiterProjectionRead {
  readonly applicationSnapshotId: ApplicationSnapshotId;
  readonly finalizedAt: string;
  readonly projection: ProductionRecruiterProjection;
}

export class ProductionRecruiterReads {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  /** Resolve the exact immutable snapshot attached to the one applied transition. */
  async getExactSubmittedProjection(
    applicationId: ApplicationId,
  ): Promise<ExactRecruiterProjectionRead | null> {
    const { data: appliedEvents, error: eventError } = await this.db()
      .from('application_events')
      .select('application_snapshot_id,to_stage,event_kind,sequence_number')
      .eq('application_id', applicationId)
      .eq('to_stage', 'applied')
      .eq('event_kind', 'stage_transition')
      .order('sequence_number', { ascending: true })
      .limit(2);
    if (eventError) throw new Error(`Unable to resolve submitted application snapshot: ${eventError.message}`);
    if (!appliedEvents || appliedEvents.length === 0) return null;
    if (appliedEvents.length !== 1 || !appliedEvents[0].application_snapshot_id) {
      throw new Error('Application history does not identify one exact immutable submission snapshot.');
    }

    const snapshotId = appliedEvents[0].application_snapshot_id as ApplicationSnapshotId;
    const { data: snapshot, error: snapshotError } = await this.db()
      .from('application_snapshots')
      .select('id,application_id,finalized_at,recruiter_allowlist_projection')
      .eq('id', snapshotId)
      .eq('application_id', applicationId)
      .maybeSingle();
    if (snapshotError) throw new Error(`Unable to load consented recruiter projection: ${snapshotError.message}`);
    if (!snapshot || !snapshot.finalized_at || !snapshot.recruiter_allowlist_projection) return null;

    const projection = snapshot.recruiter_allowlist_projection as ProductionRecruiterProjection;
    validateNoProhibitedKeys(projection);
    if (
      projection.applicationId !== applicationId ||
      projection.applicationSnapshotId !== snapshotId
    ) {
      throw new Error('Recruiter projection identity does not match the exact submitted snapshot.');
    }

    return {
      applicationSnapshotId: snapshotId,
      finalizedAt: snapshot.finalized_at,
      projection,
    };
  }
}
