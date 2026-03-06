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
export const PRO_DAILY_CREDITS = 100;

// Features that require a Pro subscription (not just credits)
export const PRO_ONLY_FEATURES = ['pdf', 'chat'] as const;

export interface CreditStatus {
  cost: number;
  remaining: number;
  allowed: boolean;
}

interface UsageContextType {
  plan: 'free' | 'pro';
  creditsRemaining: number;
  isLoading: boolean;
  /** Check if a usage type can proceed (has enough credits). Returns cost + status. */
  checkCredits: (usageType: string) => CreditStatus;
  /** Optimistically deduct credits locally after a successful call */
  optimisticDeduct: (usageType: string) => void;
  /** Refresh credits from Supabase */
  refreshCredits: () => void;
  /** Check if a feature is Pro-only (locked behind subscription, not credits) */
  isProFeature: (feature: string) => boolean;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [creditsRemaining, setCreditsRemaining] = useState<number>(
    isSupabaseConfigured ? 0 : 9999 // Dev mode: unlimited credits
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!user || !supabase || !isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      // Fetch plan + credits
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('plan, plan_expires_at, credits_remaining, pro_daily_used, pro_daily_reset')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        let activePlan: 'free' | 'pro' = 'free';
        if (profileData.plan === 'pro') {
          const expiry = profileData.plan_expires_at;
          if (!expiry || new Date(expiry) > new Date()) {
            activePlan = 'pro';
          }
        }
        setPlan(activePlan);
        if (activePlan === 'pro') {
          // Show daily remaining credits for Pro users
          const today = new Date().toISOString().split('T')[0];
          const dailyUsed = (profileData.pro_daily_reset === today ? (profileData.pro_daily_used ?? 0) : 0);
          setCreditsRemaining(PRO_DAILY_CREDITS - dailyUsed);
        } else {
          setCreditsRemaining(profileData.credits_remaining ?? 0);
        }
      } else {
        // No profile yet — will be created by worker on first AI call
        setPlan('free');
        setCreditsRemaining(FREE_STARTING_CREDITS);
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
      // Free usage type — always allowed
      return { cost: 0, remaining: creditsRemaining, allowed: true };
    }
    if (plan === 'pro') {
      // Pro users: optimistic (backend enforces daily limit)
      return { cost, remaining: creditsRemaining, allowed: true };
    }
    return {
      cost,
      remaining: creditsRemaining,
      allowed: creditsRemaining >= cost,
    };
  }, [plan, creditsRemaining]);

  const optimisticDeduct = useCallback((usageType: string) => {
    const cost = CREDIT_COSTS[usageType] ?? 0;
    if (cost === 0) return;
    setCreditsRemaining(prev => Math.max(0, prev - cost));
  }, []);

  const isProFeature = useCallback((feature: string): boolean => {
    return (PRO_ONLY_FEATURES as readonly string[]).includes(feature);
  }, []);

  return (
    <UsageContext.Provider value={{
      plan,
      creditsRemaining,
      isLoading,
      checkCredits,
      optimisticDeduct,
      refreshCredits: fetchCredits,
      isProFeature,
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
