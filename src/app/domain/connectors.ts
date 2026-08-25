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

export function canRepresentConnectorAsLive(connector: ConnectorDescriptor): boolean {
  return connector.capabilityState === 'implemented'
    && connector.operationalState === 'live_connected'
    && Boolean(connector.liveAuthorizationReference);
}
