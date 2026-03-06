import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { PaywallModal } from '../components/PaywallModal';
import { QuotaExceededError } from '../services/ai';

interface PaywallContextType {
  triggerPaywall: (featureName?: string, detail?: { creditsRemaining: number; creditCost: number; plan: string }) => void;
  /**
   * Wraps an async call. On QuotaExceededError, opens the paywall modal and
   * returns undefined. All other errors are re-thrown.
   */
  withPaywall: <T>(fn: () => Promise<T>, featureName?: string) => Promise<T | undefined>;
}

const PaywallContext = createContext<PaywallContextType | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    featureName?: string;
    creditDetail?: { creditsRemaining: number; creditCost: number; plan: string; dailyLimitHit?: boolean };
  }>({ open: false });

  const triggerPaywall = useCallback((
    featureName?: string,
    detail?: { creditsRemaining: number; creditCost: number; plan: string }
  ) => {
    setState({ open: true, featureName, creditDetail: detail });
  }, []);

  const withPaywall = useCallback(async <T,>(
    fn: () => Promise<T>,
    featureName?: string
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        setState({
          open: true,
          featureName,
          creditDetail: err.detail,
        });
        return undefined;
      }
      throw err;
    }
  }, []);

  return (
    <PaywallContext.Provider value={{ triggerPaywall, withPaywall }}>
      {children}
      <PaywallModal
        open={state.open}
        onClose={() => setState({ open: false })}
        featureName={state.featureName}
        creditDetail={state.creditDetail}
      />
    </PaywallContext.Provider>
  );
}

export function usePaywallContext() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error('usePaywallContext must be used inside PaywallProvider');
  return ctx;
}
