const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 65_000;
const AUTH_FAILURE_QUARANTINE_MS = 15 * 60_000;
const TRANSIENT_RETRY_DELAY_MS = 250;

export interface StatusResult {
  status: number;
  headers: { get(name: string): string | null };
}

export function retryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return DEFAULT_RATE_LIMIT_COOLDOWN_MS;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1_000, Math.ceil(seconds * 1_000));
  }

  const retryAt = Date.parse(value);
  if (Number.isFinite(retryAt)) {
    return Math.max(1_000, retryAt - now);
  }

  return DEFAULT_RATE_LIMIT_COOLDOWN_MS;
}

export class KeyPool {
  private readonly unavailableUntil = new Map<string, number>();
  private nextIndex = 0;

  next(keys: string[], now = Date.now()): string {
    if (!keys.length) return '';

    for (let offset = 0; offset < keys.length; offset++) {
      const index = (this.nextIndex + offset) % keys.length;
      const key = keys[index];
      const unavailableUntil = this.unavailableUntil.get(key) ?? 0;
      if (unavailableUntil > now) continue;

      this.unavailableUntil.delete(key);
      this.nextIndex = (index + 1) % keys.length;
      return key;
    }

    return '';
  }

  coolDown(key: string, durationMs: number, now = Date.now()): void {
    this.unavailableUntil.set(key, now + Math.max(1_000, durationMs));
  }
}

export interface RotationOptions {
  now?: () => number;
  delay?: (milliseconds: number) => Promise<void>;
}

export async function executeWithKeyRotation<T extends StatusResult>(
  keys: string[],
  pool: KeyPool,
  operation: (key: string) => Promise<T>,
  options: RotationOptions = {},
): Promise<T | null> {
  const now = options.now ?? Date.now;
  const delay = options.delay ?? ((milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds)));
  let transientRetryAvailable = true;
  const maxAttempts = keys.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = pool.next(keys, now());
    if (!key) return null;

    let result: T;
    try {
      result = await operation(key);
    } catch (error) {
      if (!transientRetryAvailable) throw error;
      transientRetryAvailable = false;
      await delay(TRANSIENT_RETRY_DELAY_MS);
      continue;
    }

    if (result.status === 429) {
      pool.coolDown(key, retryAfterMs(result.headers.get('Retry-After'), now()), now());
      continue;
    }

    if (result.status === 401) {
      pool.coolDown(key, AUTH_FAILURE_QUARANTINE_MS, now());
      continue;
    }

    if (result.status >= 500 && transientRetryAvailable) {
      transientRetryAvailable = false;
      await delay(TRANSIENT_RETRY_DELAY_MS);
      continue;
    }

    return result;
  }

  return null;
}
