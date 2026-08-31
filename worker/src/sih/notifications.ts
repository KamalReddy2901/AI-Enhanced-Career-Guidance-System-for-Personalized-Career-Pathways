export type NotificationDeliveryStatus = 'queued' | 'sent' | 'failed' | 'suppressed' | 'dead';

export interface NotificationJob {
  readonly id: string;
  readonly eventKey: string;
  readonly purpose: string;
  readonly channel: 'in_app' | 'email' | 'sms' | 'webhook';
  readonly templateKey: string;
  readonly templateVersion: number;
  readonly idempotencyKey: string;
  readonly attemptCount: number;
  readonly nextRetryAt?: string;
}

export interface NotificationProvider {
  readonly key: string;
  readonly mode: 'DEVELOPMENT' | 'TEST' | 'LIVE';
  send(job: NotificationJob): Promise<{ status: NotificationDeliveryStatus; providerReference?: string; errorCode?: string }>;
}

/** Explicitly non-delivering provider used until an approved provider is configured. */
export const noopNotificationProvider: NotificationProvider = {
  key: 'noop',
  mode: 'DEVELOPMENT',
  async send() { return { status: 'suppressed', errorCode: 'NO_PROVIDER_CONFIGURED' }; },
};

export function boundedRetryAt(attemptCount: number, now = Date.now()): string {
  const delay = Math.min(300_000, 1_000 * (2 ** Math.max(0, Math.min(attemptCount, 8))));
  return new Date(now + delay).toISOString();
}
