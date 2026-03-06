import { useState, useCallback } from 'react';
import { QuotaExceededError } from '../services/ai';

export interface PaywallState {
  open: boolean;
  featureName?: string;
  usageDetail?: { used: number; limit: number; plan: string };
}

/**
 * Hook for catching QuotaExceededError and showing the paywall modal.
 *
 * Usage:
 *   const { paywallState, closePaywall, withPaywall } = usePaywall();
 *
 *   // Wrap any async call that might hit a quota limit:
 *   await withPaywall(() => generateJobDataAI(title), 'Dossier');
 */
export function usePaywall() {
  const [paywallState, setPaywallState] = useState<PaywallState>({ open: false });

  const closePaywall = useCallback(() => {
    setPaywallState({ open: false });
  }, []);

  /**
   * Executes the given async function. If it throws a QuotaExceededError,
   * the paywall modal is opened automatically. All other errors are re-thrown.
   *
   * @returns The result of fn, or undefined if paywall was triggered.
   */
  const withPaywall = useCallback(async <T,>(
    fn: () => Promise<T>,
    featureName?: string
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        setPaywallState({
          open: true,
          featureName,
          usageDetail: {
            used: err.detail.used,
            limit: err.detail.limit,
            plan: err.detail.plan,
          },
        });
        return undefined;
      }
      throw err;
    }
  }, []);

  return { paywallState, closePaywall, withPaywall };
}
