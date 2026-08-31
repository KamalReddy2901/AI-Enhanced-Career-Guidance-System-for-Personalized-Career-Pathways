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
  readonly operation: 'list' | 'export' | 'disconnect' | 'reconcile';
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
