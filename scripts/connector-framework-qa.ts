import assert from 'node:assert/strict';
import { createDefaultConnectorRegistry, listConnectorCatalog, ConnectorRuntime } from '../src/app/services/sih/connectorFramework';
import { ConnectorRegistry, connectorRetryDelayMs, dedupeConnectorRecords, minimizeAtsExportPayload, reconcileConnectorRecords } from '../src/app/domain/connectors';

const catalog = listConnectorCatalog();
assert.ok(catalog.length >= 10);
assert.ok(catalog.every(entry => entry.capabilityState !== 'implemented'));
assert.ok(catalog.some(entry => entry.key === 'ncs'));
assert.ok(catalog.some(entry => entry.key === 'digilocker'));
const registry = createDefaultConnectorRegistry();
assert.equal(registry.list().length, catalog.length);
const noop = registry.get('ncs');
assert.ok(noop);
assert.equal(noop?.descriptor.operationalState, 'not_configured');
assert.equal((await noop?.list?.({ organizationId: 'org' as never, idempotencyKey: 'qa-1' }))?.hasMore, false);
await assert.rejects(() => noop?.export?.({ organizationId: 'org' as never, idempotencyKey: 'qa-2' }, []), /INTEGRATION-READY/);
const runtime = new ConnectorRuntime(registry, () => '2026-08-31T02:00:00.000Z' as never);
assert.equal((await runtime.list('ncs', { organizationId: 'org' as never, idempotencyKey: 'qa-3' })).items.length, 0);
assert.equal(runtime.snapshot('ncs').audit.at(-1)?.outcome, 'skipped_unconfigured');
runtime.configure('ncs', 'org' as never, true);
assert.equal((await runtime.list('ncs', { organizationId: 'org' as never, idempotencyKey: 'qa-4' })).hasMore, false);
assert.equal(runtime.snapshot('ncs').sync.status, 'idle');
assert.deepEqual(Object.keys(minimizeAtsExportPayload({ applicationId: 'app', readinessBand: 'NEAR_READY', riasec: 'private', arbitrary: 'drop' })).sort(), ['applicationId', 'readinessBand']);
assert.throws(() => minimizeAtsExportPayload({ applicationId: 'app', evidence: [{ hiring_probability: 0.5 }] }), /prohibited field/);

const base = { kind: 'opportunity' as const, externalId: '1', sourceSystem: 'ncs', sourceCapturedAt: '2026-08-31T00:00:00Z' as never, freshnessAt: '2026-08-31T00:00:00Z' as never, payload: { title: 'old' } };
const webhookRegistry = new ConnectorRegistry();
webhookRegistry.register({
  descriptor: { key: 'webhook-test', displayName: 'Webhook test', capabilityState: 'controlled_prototype', operationalState: 'not_configured', supportedOperations: ['webhook'] },
  authRequirement: 'api_key', syncDirection: 'import',
  webhook: async (_context, event) => [{ ...base, externalId: event.externalEventId, sourceSystem: 'webhook-test', sourceCapturedAt: event.receivedAt, freshnessAt: event.receivedAt }],
});
const webhookRuntime = new ConnectorRuntime(webhookRegistry, () => '2026-08-31T02:00:00.000Z' as never);
webhookRuntime.configure('webhook-test', 'org' as never, true);
const webhookContext = { organizationId: 'org' as never, idempotencyKey: 'qa-webhook-1' };
const webhookEvent = { externalEventId: 'external-1', receivedAt: '2026-08-31T02:00:00.000Z' as never, payload: { title: 'opaque provider payload' } };
assert.equal((await webhookRuntime.handleWebhook('webhook-test', webhookContext, webhookEvent)).accepted, true);
assert.equal((await webhookRuntime.handleWebhook('webhook-test', webhookContext, webhookEvent)).duplicate, true);
assert.equal(connectorRetryDelayMs(3), 8000);
const fresh = { ...base, freshnessAt: '2026-08-31T01:00:00Z' as never, payload: { title: 'new' } };
assert.equal(dedupeConnectorRecords([base, fresh]).length, 1);
assert.equal(reconcileConnectorRecords([base], [fresh]).changed.length, 1);
console.log('Connector framework QA passed.');
