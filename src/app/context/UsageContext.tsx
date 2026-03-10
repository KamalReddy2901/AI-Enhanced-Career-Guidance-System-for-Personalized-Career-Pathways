import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from './AuthContext';

// ─── Credit Costs (mirrors worker/src/models.ts) ──────────────
// Keep these in sync with CREDIT_COSTS in worker/src/models.ts!
export const CREDIT_COSTS: Record<string, number> = {
  dossier: 3,
  simulation: 5,
  compare: 2,
  transition: 2,
  roadmap: 2,
  chat: 1,
  interview: 1,
  gbu: 0,
  // Free (0 credits)
  suggestion: 0,
  trending: 0,
  preliminary: 0,
  related: 0,
  wlb: 0,
  quiz: 0,
  mood: 0,
  refine: 0,
};

export const FREE_STARTING_CREDITS = 20;

export interface CreditStatus {
  cost: number;
  remaining: number;
  allowed: boolean;
}

interface UsageContextType {
  creditsRemaining: number;
  /** True when the user has an active Ask AI unlimited perk */
  hasUnlimitedAskai: boolean;
  isLoading: boolean;
  /** Check if a usage type can proceed (has enough credits). Returns cost + status. */
  checkCredits: (usageType: string) => CreditStatus;
  /** Optimistically deduct credits locally after a successful call */
  optimisticDeduct: (usageType: string) => void;
  /** Refresh credits from Supabase */
  refreshCredits: () => void;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [creditsRemaining, setCreditsRemaining] = useState<number>(
    isSupabaseConfigured ? 0 : 9999 // Dev mode: unlimited credits
  );
  const [hasUnlimitedAskai, setHasUnlimitedAskai] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!user || !supabase || !isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('credits_remaining, ask_ai_unlimited_until')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setCreditsRemaining(profileData.credits_remaining ?? 0);
        const unlimitedUntil = profileData.ask_ai_unlimited_until
          ? new Date(profileData.ask_ai_unlimited_until)
          : null;
        setHasUnlimitedAskai(!!unlimitedUntil && unlimitedUntil > new Date());
      } else {
        // No profile yet — will be created by worker on first AI call
        setCreditsRemaining(FREE_STARTING_CREDITS);
        setHasUnlimitedAskai(false);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const checkCredits = useCallback((usageType: string): CreditStatus => {
    const cost = CREDIT_COSTS[usageType] ?? 0;
    if (cost === 0) {
      return { cost: 0, remaining: creditsRemaining, allowed: true };
    }
    // Ask AI is free during unlimited perk period
    if (usageType === 'chat' && hasUnlimitedAskai) {
      return { cost: 0, remaining: creditsRemaining, allowed: true };
    }
    return {
      cost,
      remaining: creditsRemaining,
      allowed: creditsRemaining >= cost,
    };
  }, [creditsRemaining, hasUnlimitedAskai]);

  const optimisticDeduct = useCallback((usageType: string) => {
    // Ask AI is free during unlimited period — nothing to deduct
    if (usageType === 'chat' && hasUnlimitedAskai) return;
    const cost = CREDIT_COSTS[usageType] ?? 0;
    if (cost === 0) return;
    setCreditsRemaining(prev => Math.max(0, prev - cost));
    // Re-sync with actual Supabase value after the worker has finished writing
    setTimeout(fetchCredits, 3000);
  }, [fetchCredits, hasUnlimitedAskai]);

  return (
    <UsageContext.Provider value={{
      creditsRemaining,
      hasUnlimitedAskai,
      isLoading,
      checkCredits,
      optimisticDeduct,
      refreshCredits: fetchCredits,
    }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsage must be used within UsageProvider');
  return ctx;
}
