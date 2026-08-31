import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorId, ConsentRecordId, OrganizationId } from '../../domain/shared';

export interface AggregateAnalyticsConsentState {
  readonly consentId: ConsentRecordId;
  readonly grantedAt: string;
  readonly expiresAt?: string;
  readonly active: boolean;
}

type GrantRow = {
  readonly id: string;
  readonly granted_at: string;
  readonly expires_at: string | null;
};

type LifecycleRow = {
  readonly consent_grant_id: string;
  readonly action: 'granted' | 'withdrawn' | 'expired';
  readonly sequence_number: number;
};

export class ProductionAnalyticsConsent {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async getLatestForOrganization(
    subjectActorId: ActorId,
    organizationId: OrganizationId,
  ): Promise<AggregateAnalyticsConsentState | null> {
    const { data: grants, error: grantError } = await this.db()
      .from('consent_grants')
      .select('id,granted_at,expires_at')
      .eq('subject_actor_id', subjectActorId)
      .eq('grantee_organization_id', organizationId)
      .eq('purpose', 'aggregate_analytics')
      .order('granted_at', { ascending: false })
      .limit(1);
    if (grantError) throw new Error(`Unable to load aggregate-analytics consent: ${grantError.message}`);
    const grant = (grants?.[0] ?? null) as GrantRow | null;
    if (!grant) return null;

    const { data: events, error: eventError } = await this.db()
      .from('consent_lifecycle_events')
      .select('consent_grant_id,action,sequence_number')
      .eq('consent_grant_id', grant.id)
      .order('sequence_number', { ascending: false })
      .limit(1);
    if (eventError) throw new Error(`Unable to load aggregate-analytics consent lifecycle: ${eventError.message}`);
    const latest = (events?.[0] ?? null) as LifecycleRow | null;
    const expired = grant.expires_at !== null && Date.parse(grant.expires_at) <= Date.now();
    const active = !expired && latest?.action === 'granted';

    return {
      consentId: grant.id as ConsentRecordId,
      grantedAt: grant.granted_at,
      ...(grant.expires_at ? { expiresAt: grant.expires_at } : {}),
      active,
    };
  }

  async grant(subjectActorId: ActorId, organizationId: OrganizationId): Promise<ConsentRecordId> {
    const existing = await this.getLatestForOrganization(subjectActorId, organizationId);
    if (existing?.active) return existing.consentId;

    const { data, error } = await this.db()
      .from('consent_grants')
      .insert({
        subject_actor_id: subjectActorId,
        grantee_organization_id: organizationId,
        purpose: 'aggregate_analytics',
        created_by_actor_id: subjectActorId,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Unable to grant aggregate-analytics consent: ${error.message}`);
    return data.id as ConsentRecordId;
  }

  async withdraw(subjectActorId: ActorId, consentId: ConsentRecordId): Promise<void> {
    const { error } = await this.db()
      .from('consent_lifecycle_events')
      .insert({
        consent_grant_id: consentId,
        action: 'withdrawn',
        actor_id: subjectActorId,
        reason: 'Subject withdrew optional aggregate analytics consent.',
      });
    if (error) throw new Error(`Unable to withdraw aggregate-analytics consent: ${error.message}`);
  }
}
