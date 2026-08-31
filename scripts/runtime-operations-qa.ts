import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [connectors, connectorFramework, notifications, notificationMigration, worker, sihI18n] = await Promise.all([
  readFile(join(root, 'src/app/domain/connectors.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/connectorFramework.ts'), 'utf8'),
  readFile(join(root, 'worker/src/sih/notifications.ts'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260831110000_notifications_outbox_operations.sql'), 'utf8'),
  readFile(join(root, 'worker/src/index.ts'), 'utf8'),
  readFile(join(root, 'src/app/i18n/sih.ts'), 'utf8'),
]);
for (const term of ['ConnectorRegistry', 'ConnectorPage', 'NormalizedConnectorRecord', 'dedupeConnectorRecords', 'reconcileConnectorRecords', 'connectorRetryDelayMs']) assert.match(connectors, new RegExp(term));
for (const term of ['authRequirement', 'syncDirection', 'INTEGRATION-READY', 'createDefaultConnectorRegistry']) assert.match(connectorFramework, new RegExp(term));
assert.match(connectors, /sourceCapturedAt/);
for (const term of ['notification_events', 'notification_preferences', 'notification_outbox', 'idempotency_key', 'attempt_count', 'next_retry_at', 'claim_notification_outbox', 'enqueue_notification', 'skip locked']) assert.match(notificationMigration, new RegExp(term, 'i'));
assert.match(notifications, /noopNotificationProvider|DEVELOPMENT/);
for (const language of ['en', 'hi', 'te']) assert.match(sihI18n, new RegExp(`^\u0020*${language}:`, 'm'));
for (const term of ['/healthz', 'X-Request-ID', 'X-Correlation-ID', 'nosniff', 'Content-Security-Policy', '64 KiB']) assert.match(worker, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
console.log('Runtime operations QA passed.');
