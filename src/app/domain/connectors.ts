import type { IsoTimestamp, OrganizationId } from './shared';

export type ConnectorCapabilityState =
  | 'implemented'
  | 'controlled_prototype'
  | 'integration_ready'
  | 'target_architecture';

export type ConnectorOperationalState =
  | 'not_configured'
  | 'configured_not_verified'
  | 'sandbox_connected'
  | 'live_connected'
  | 'degraded'
  | 'disabled';

export interface ConnectorDescriptor {
  readonly key: string;
  readonly displayName: string;
  readonly capabilityState: ConnectorCapabilityState;
  readonly operationalState: ConnectorOperationalState;
  readonly organizationId?: OrganizationId;
  readonly supportedOperations: readonly string[];
  readonly lastVerifiedAt?: IsoTimestamp;
  readonly liveAuthorizationReference?: string;
}

export type ConnectorAuthRequirement = 'none' | 'oauth2' | 'api_key' | 'mTLS' | 'institution_approval';
export type ConnectorSyncDirection = 'import' | 'export' | 'bidirectional';
export type ConnectorRecordKind = 'opportunity' | 'credential' | 'academic_record' | 'learner_profile' | 'outcome';

export interface ConnectorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface NormalizedConnectorRecord {
  readonly kind: ConnectorRecordKind;
  readonly externalId: string;
  readonly sourceSystem: string;
  readonly sourceUrl?: string;
  readonly sourceCapturedAt: IsoTimestamp;
  readonly freshnessAt: IsoTimestamp;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface ConnectorSyncState {
  readonly cursor?: string;
  readonly lastStartedAt?: IsoTimestamp;
  readonly lastCompletedAt?: IsoTimestamp;
  readonly lastSuccessfulAt?: IsoTimestamp;
  readonly consecutiveFailures: number;
  readonly nextRetryAt?: IsoTimestamp;
  readonly status: 'idle' | 'running' | 'degraded' | 'disabled';
}

export interface ConnectorContext {
  readonly organizationId: OrganizationId;
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
}

/** Provider webhook envelope. Provider-specific payload fields stay opaque until an authorized adapter maps them. */
export interface ConnectorWebhookEvent {
  readonly externalEventId: string;
  readonly receivedAt: IsoTimestamp;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly signature?: string;
}

export interface ConnectorWebhookResult {
  readonly accepted: boolean;
  readonly duplicate: boolean;
  readonly records: readonly NormalizedConnectorRecord[];
}

/** Explicit recruiter projection fields permitted in an ATS export. */
export const ATS_EXPORT_ALLOWED_FIELDS = [
  'applicant', 'applicationId', 'applicationSnapshotId', 'applicationStage',
  'consentRecordId', 'educationSummary', 'evidence', 'opportunityId',
  'opportunityVersionId', 'readinessBand', 'readinessResultId', 'requirements',
  'sharedWorkSamples',
] as const;

const ATS_FORBIDDEN_KEY = /riasec|work.?values?|private.?aspiration|counsel|family|guardian|financial|health|suitability|hiring.?probability|candidate.?rank|automatic.?rejection/i;

function assertAtsExportSafe(value: unknown, path = 'payload'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAtsExportSafe(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (ATS_FORBIDDEN_KEY.test(key)) throw new Error(`ATS export contains prohibited field: ${path}.${key}`);
    assertAtsExportSafe(nested, `${path}.${key}`);
  }
}

export function minimizeAtsExportPayload(payload: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const minimized = Object.fromEntries(
    ATS_EXPORT_ALLOWED_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(payload, field))
      .map(field => [field, payload[field]]),
  );
  assertAtsExportSafe(minimized);
  return minimized;
}

export interface ConnectorAdapter {
  readonly descriptor: ConnectorDescriptor;
  readonly authRequirement: ConnectorAuthRequirement;
  readonly syncDirection: ConnectorSyncDirection;
  readonly list?: (context: ConnectorContext, cursor?: string) => Promise<ConnectorPage<NormalizedConnectorRecord>>;
  readonly export?: (context: ConnectorContext, records: readonly NormalizedConnectorRecord[]) => Promise<void>;
  readonly webhook?: (context: ConnectorContext, event: ConnectorWebhookEvent) => Promise<readonly NormalizedConnectorRecord[]>;
  readonly disconnect?: (context: ConnectorContext) => Promise<void>;
}

export class ConnectorRegistry {
  private readonly adapters = new Map<string, ConnectorAdapter>();

  register(adapter: ConnectorAdapter): void {
    if (this.adapters.has(adapter.descriptor.key)) throw new Error(`Connector already registered: ${adapter.descriptor.key}`);
    this.adapters.set(adapter.descriptor.key, adapter);
  }

  get(key: string): ConnectorAdapter | undefined { return this.adapters.get(key); }
  list(): readonly ConnectorAdapter[] { return [...this.adapters.values()]; }
}

export function connectorRetryDelayMs(attempt: number, baseMs = 1000, maxMs = 300_000): number {
  const boundedAttempt = Math.max(0, Math.min(attempt, 8));
  return Math.min(maxMs, baseMs * (2 ** boundedAttempt));
}

export function dedupeConnectorRecords(records: readonly NormalizedConnectorRecord[]): NormalizedConnectorRecord[] {
  const byKey = new Map<string, NormalizedConnectorRecord>();
  for (const record of records) {
    const key = `${record.sourceSystem}:${record.kind}:${record.externalId}`;
    const existing = byKey.get(key);
    if (!existing || existing.freshnessAt < record.freshnessAt) byKey.set(key, record);
  }
  return [...byKey.values()];
}

export function reconcileConnectorRecords(
  previous: readonly NormalizedConnectorRecord[],
  incoming: readonly NormalizedConnectorRecord[],
): { added: NormalizedConnectorRecord[]; changed: NormalizedConnectorRecord[]; unchanged: NormalizedConnectorRecord[]; removed: NormalizedConnectorRecord[] } {
  const next = new Map(dedupeConnectorRecords(incoming).map(record => [`${record.sourceSystem}:${record.kind}:${record.externalId}`, record]));
  const old = new Map(dedupeConnectorRecords(previous).map(record => [`${record.sourceSystem}:${record.kind}:${record.externalId}`, record]));
  const added: NormalizedConnectorRecord[] = [], changed: NormalizedConnectorRecord[] = [], unchanged: NormalizedConnectorRecord[] = [], removed: NormalizedConnectorRecord[] = [];
  for (const [key, record] of next) {
    const prior = old.get(key);
    if (!prior) added.push(record);
    else if (JSON.stringify(prior.payload) !== JSON.stringify(record.payload)) changed.push(record);
    else unchanged.push(record);
  }
  for (const [key, record] of old) if (!next.has(key)) removed.push(record);
  return { added, changed, unchanged, removed };
}

export function canRepresentConnectorAsLive(connector: ConnectorDescriptor): boolean {
  return connector.capabilityState === 'implemented'
    && connector.operationalState === 'live_connected'
    && Boolean(connector.liveAuthorizationReference);
}
