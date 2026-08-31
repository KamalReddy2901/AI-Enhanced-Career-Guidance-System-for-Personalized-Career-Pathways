import type { IsoTimestamp, OrganizationId } from '../../domain/shared';
import {
  ConnectorRegistry,
  type ConnectorAdapter,
  type ConnectorAuthRequirement,
  type ConnectorCapabilityState,
  type ConnectorContext,
  type ConnectorDescriptor,
  type ConnectorPage,
  type ConnectorRecordKind,
  type ConnectorSyncDirection,
  type ConnectorWebhookEvent,
  type ConnectorWebhookResult,
  minimizeAtsExportPayload,
  type NormalizedConnectorRecord,
} from '../../domain/connectors';

export interface ConnectorConfigurationState {
  readonly key: string;
  readonly organizationId: OrganizationId;
  readonly authRequirement: ConnectorAuthRequirement;
  readonly configured: boolean;
  readonly verified: boolean;
  readonly revokedAt?: IsoTimestamp;
  readonly health: 'unknown' | 'healthy' | 'degraded' | 'failed';
}

export interface ConnectorAuditEvent {
  readonly connectorKey: string;
  readonly operation: 'list' | 'export' | 'disconnect' | 'reconcile' | 'sync' | 'webhook';
  readonly idempotencyKey: string;
  readonly occurredAt: IsoTimestamp;
  readonly outcome: 'success' | 'failure' | 'skipped_unconfigured';
  readonly errorCode?: string;
}

export interface ConnectorCatalogEntry {
  readonly key: string;
  readonly displayName: string;
  readonly capabilityState: ConnectorCapabilityState;
  readonly authRequirement: ConnectorAuthRequirement;
  readonly syncDirection: ConnectorSyncDirection;
  readonly supportedRecordKinds: readonly ConnectorRecordKind[];
}

const catalog: readonly ConnectorCatalogEntry[] = [
  ['ncs', 'National Career Service', 'integration_ready', 'institution_approval', 'import', ['opportunity', 'outcome']],
  ['sidh', 'Skill India Digital Hub', 'integration_ready', 'api_key', 'import', ['opportunity', 'credential']],
  ['aicte-internship', 'AICTE Internship Portal', 'integration_ready', 'institution_approval', 'import', ['opportunity']],
  ['nats', 'National Apprenticeship Training Scheme', 'integration_ready', 'institution_approval', 'bidirectional', ['opportunity', 'outcome']],
  ['naps', 'National Apprenticeship Promotion Scheme', 'integration_ready', 'institution_approval', 'bidirectional', ['opportunity', 'outcome']],
  ['digilocker', 'DigiLocker', 'target_architecture', 'oauth2', 'import', ['credential', 'academic_record']],
  ['nad', 'National Academic Depository', 'target_architecture', 'oauth2', 'import', ['credential', 'academic_record']],
  ['apaar-abc', 'APAAR / Academic Bank of Credits', 'target_architecture', 'oauth2', 'bidirectional', ['academic_record']],
  ['sis-erp', 'Institution SIS / ERP', 'integration_ready', 'institution_approval', 'bidirectional', ['academic_record', 'learner_profile']],
  ['ats', 'Applicant Tracking System', 'integration_ready', 'api_key', 'bidirectional', ['opportunity', 'learner_profile', 'outcome']],
  ['learning-provider', 'Learning / certification provider', 'integration_ready', 'oauth2', 'import', ['credential', 'academic_record']],
].map(([key, displayName, capabilityState, authRequirement, syncDirection, supportedRecordKinds]) => ({
  key, displayName, capabilityState, authRequirement, syncDirection, supportedRecordKinds,
} as ConnectorCatalogEntry));

export function listConnectorCatalog(): readonly ConnectorCatalogEntry[] { return catalog; }

export interface ConnectorRuntimeSnapshot {
  readonly configuration?: ConnectorConfigurationState;
  readonly sync: {
    readonly cursor?: string;
    readonly lastStartedAt?: IsoTimestamp;
    readonly lastCompletedAt?: IsoTimestamp;
    readonly lastSuccessfulAt?: IsoTimestamp;
    readonly consecutiveFailures: number;
    readonly nextRetryAt?: IsoTimestamp;
    readonly status: 'idle' | 'running' | 'degraded' | 'disabled';
  };
  readonly audit: readonly ConnectorAuditEvent[];
}

/**
 * Provider-neutral runtime boundary. It owns configuration, sync/webhook
 * state, idempotent webhook replay handling and audit records; it never
 * pretends an unconfigured adapter is connected.
 */
export class ConnectorRuntime {
  private readonly configurations = new Map<string, ConnectorConfigurationState>();
  private readonly syncStates = new Map<string, ConnectorRuntimeSnapshot['sync']>();
  private readonly auditEvents: ConnectorAuditEvent[] = [];
  private readonly handledWebhooks = new Set<string>();

  constructor(
    readonly registry: ConnectorRegistry,
    private readonly now: () => IsoTimestamp = () => new Date().toISOString() as IsoTimestamp,
  ) {
    for (const adapter of registry.list()) {
      this.syncStates.set(adapter.descriptor.key, { consecutiveFailures: 0, status: 'idle' });
    }
  }

  configure(key: string, organizationId: OrganizationId, verified = false): ConnectorConfigurationState {
    const adapter = this.requireAdapter(key);
    const state: ConnectorConfigurationState = {
      key,
      organizationId,
      authRequirement: adapter.authRequirement,
      configured: true,
      verified,
      health: verified ? 'healthy' : 'unknown',
    };
    this.configurations.set(key, state);
    return state;
  }

  revoke(key: string, revokedAt = this.now()): ConnectorConfigurationState {
    const existing = this.configurations.get(key);
    if (!existing) throw new Error(`Connector is not configured: ${key}`);
    const state = { ...existing, configured: false, verified: false, revokedAt, health: 'failed' as const };
    this.configurations.set(key, state);
    this.syncStates.set(key, { ...this.syncStates.get(key), consecutiveFailures: 0, status: 'disabled' });
    return state;
  }

  snapshot(key: string): ConnectorRuntimeSnapshot {
    this.requireAdapter(key);
    return {
      configuration: this.configurations.get(key),
      sync: this.syncStates.get(key) ?? { consecutiveFailures: 0, status: 'idle' },
      audit: this.auditEvents.filter(event => event.connectorKey === key),
    };
  }

  async list(key: string, context: ConnectorContext, cursor?: string): Promise<ConnectorPage<NormalizedConnectorRecord>> {
    const adapter = this.requireAdapter(key);
    const configuration = this.configurations.get(key);
    if (!configuration?.configured || configuration.revokedAt || !configuration.verified || !adapter.list) {
      this.recordAudit(key, 'list', context.idempotencyKey, 'skipped_unconfigured', 'CONNECTOR_NOT_CONFIGURED');
      return { items: [], hasMore: false };
    }
    const currentSync = this.syncStates.get(key) ?? { consecutiveFailures: 0, status: 'idle' as const };
    this.syncStates.set(key, { ...currentSync, status: 'running', lastStartedAt: this.now() });
    try {
      const page = await adapter.list(context, cursor);
      const startedSync = this.syncStates.get(key) ?? currentSync;
      this.syncStates.set(key, {
        ...startedSync, cursor: page.nextCursor, lastCompletedAt: this.now(), lastSuccessfulAt: this.now(), consecutiveFailures: 0, status: 'idle',
      });
      this.recordAudit(key, 'sync', context.idempotencyKey, 'success');
      return page;
    } catch (error) {
      const failedSync = this.syncStates.get(key) ?? currentSync;
      const failures = failedSync.consecutiveFailures + 1;
      this.syncStates.set(key, { ...failedSync, consecutiveFailures: failures, status: 'degraded', nextRetryAt: new Date(Date.now() + Math.min(300_000, 1_000 * (2 ** Math.min(failures, 8)))).toISOString() as IsoTimestamp });
      this.recordAudit(key, 'sync', context.idempotencyKey, 'failure', error instanceof Error ? error.message : 'CONNECTOR_SYNC_FAILED');
      throw error;
    }
  }

  async export(key: string, context: ConnectorContext, records: readonly NormalizedConnectorRecord[]): Promise<void> {
    const adapter = this.requireAdapter(key);
    const configuration = this.configurations.get(key);
    if (!configuration?.configured || configuration.revokedAt || !configuration.verified || !adapter.export) {
      this.recordAudit(key, 'export', context.idempotencyKey, 'skipped_unconfigured', 'CONNECTOR_NOT_CONFIGURED');
      throw new Error(`Connector ${key} is not configured for export`);
    }
    const outbound = key === 'ats'
      ? records.map(record => ({ ...record, payload: minimizeAtsExportPayload(record.payload) }))
      : records;
    try {
      await adapter.export(context, outbound);
      this.recordAudit(key, 'export', context.idempotencyKey, 'success');
    } catch (error) {
      this.recordAudit(key, 'export', context.idempotencyKey, 'failure', error instanceof Error ? error.message : 'CONNECTOR_EXPORT_FAILED');
      throw error;
    }
  }

  async handleWebhook(key: string, context: ConnectorContext, event: ConnectorWebhookEvent): Promise<ConnectorWebhookResult> {
    const adapter = this.requireAdapter(key);
    const webhookKey = `${key}:${event.externalEventId}`;
    if (this.handledWebhooks.has(webhookKey)) return { accepted: true, duplicate: true, records: [] };
    const configuration = this.configurations.get(key);
    if (!configuration?.configured || configuration.revokedAt || !configuration.verified || !adapter.webhook) {
      this.recordAudit(key, 'webhook', context.idempotencyKey, 'skipped_unconfigured', 'CONNECTOR_NOT_CONFIGURED');
      return { accepted: false, duplicate: false, records: [] };
    }
    const records = await adapter.webhook(context, event);
    this.handledWebhooks.add(webhookKey);
    this.recordAudit(key, 'webhook', context.idempotencyKey, 'success');
    return { accepted: true, duplicate: false, records };
  }

  async disconnect(key: string, context: ConnectorContext): Promise<void> {
    const adapter = this.requireAdapter(key);
    if (adapter.disconnect) await adapter.disconnect(context);
    this.revoke(key);
    this.recordAudit(key, 'disconnect', context.idempotencyKey, 'success');
  }

  private requireAdapter(key: string): ConnectorAdapter {
    const adapter = this.registry.get(key);
    if (!adapter) throw new Error(`Unknown connector: ${key}`);
    return adapter;
  }

  private recordAudit(connectorKey: string, operation: ConnectorAuditEvent['operation'], idempotencyKey: string, outcome: ConnectorAuditEvent['outcome'], errorCode?: string): void {
    this.auditEvents.push({ connectorKey, operation, idempotencyKey, occurredAt: this.now(), outcome, errorCode });
  }
}

export function createNoopConnector(entry: ConnectorCatalogEntry): ConnectorAdapter {
  const descriptor: ConnectorDescriptor = {
    key: entry.key,
    displayName: entry.displayName,
    capabilityState: entry.capabilityState,
    operationalState: 'not_configured',
    supportedOperations: entry.syncDirection === 'import' ? ['list'] : ['list', 'export', 'disconnect'],
  };
  return {
    descriptor,
    authRequirement: entry.authRequirement,
    syncDirection: entry.syncDirection,
    async list(): Promise<ConnectorPage<NormalizedConnectorRecord>> {
      return { items: [], hasMore: false };
    },
    async export(): Promise<void> {
      throw new Error(`Connector ${entry.key} is INTEGRATION-READY and has no configured provider`);
    },
    async disconnect(): Promise<void> { return undefined; },
  };
}

export function createDefaultConnectorRegistry(): ConnectorRegistry {
  const registry = new ConnectorRegistry();
  for (const entry of catalog) registry.register(createNoopConnector(entry));
  return registry;
}

export function createDefaultConnectorRuntime(): ConnectorRuntime {
  return new ConnectorRuntime(createDefaultConnectorRegistry());
}
