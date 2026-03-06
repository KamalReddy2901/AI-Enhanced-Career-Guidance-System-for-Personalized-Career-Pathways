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

// ─── Limits (mirrors worker/src/models.ts) ────────────────────
// Keep these in sync if you change limits!
export const FREE_LIMITS = {
  dossiers_used: 3,
  simulations_used: 1,
  ai_chats_used: 5,
  compares_used: 1,
  transitions_used: 1,
  roadmaps_used: 1,
} as const;

export const PRO_LIMITS = {
  dossiers_used: 15,
  simulations_used: 5,
  ai_chats_used: 50,
  compares_used: 5,
  transitions_used: 5,
  roadmaps_used: 5,
} as const;

// Maps feature type → DB column
export const FEATURE_COLUMN: Record<string, keyof typeof FREE_LIMITS | null> = {
  dossier: 'dossiers_used',
  simulation: 'simulations_used',
  chat: 'ai_chats_used',
  compare: 'compares_used',
  transition: 'transitions_used',
  roadmap: 'roadmaps_used',
  // Unmetered (free)
  suggestion: null,
  trending: null,
  preliminary: null,
  related: null,
  wlb: null,
  quiz: null,
  mood: null,
  refine: null,
  interview: null,
  gbu: null,
};

export type QuotaKey = keyof typeof FREE_LIMITS;

export interface UsageRow {
  dossiers_used: number;
  simulations_used: number;
  ai_chats_used: number;
  compares_used: number;
  transitions_used: number;
  roadmaps_used: number;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
}

interface UsageContextType {
  plan: 'free' | 'pro';
  usage: UsageRow;
  isLoading: boolean;
  /** Check if a feature type is within quota. Returns live status. */
  checkQuota: (featureType: string) => QuotaStatus;
  /** Optimistically increment local usage counter (true usage is tracked server-side) */
  optimisticIncrement: (featureType: string) => void;
  /** Refresh usage from Supabase */
  refreshUsage: () => void;
  /** Show paywall for a given feature. Returns true if allowed. */
  isProFeature: (featureType: string) => boolean;
}

const defaults: UsageRow = {
  dossiers_used: 0,
  simulations_used: 0,
  ai_chats_used: 0,
  compares_used: 0,
  transitions_used: 0,
  roadmaps_used: 0,
};

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [usage, setUsage] = useState<UsageRow>(defaults);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!user || !supabase || !isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Fetch plan
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('plan, plan_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      let activePlan: 'free' | 'pro' = 'free';
      if (profileData?.plan === 'pro') {
        const expiry = profileData.plan_expires_at;
        if (!expiry || new Date(expiry) > new Date()) {
          activePlan = 'pro';
        }
      }
      setPlan(activePlan);

      // Fetch today's usage
      const { data: usageData } = await supabase
        .from('user_usage')
        .select('dossiers_used, simulations_used, ai_chats_used, compares_used, transitions_used, roadmaps_used')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      setUsage(usageData ?? defaults);
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const checkQuota = useCallback((featureType: string): QuotaStatus => {
    const col = FEATURE_COLUMN[featureType];
    if (!col) {
      // Unmetered
      return { used: 0, limit: 999, remaining: 999, allowed: true };
    }
    const limits = plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
    const limit = limits[col];
    const used = usage[col] ?? 0;
    const remaining = Math.max(0, limit - used);
    return { used, limit, remaining, allowed: remaining > 0 };
  }, [plan, usage]);

  const optimisticIncrement = useCallback((featureType: string) => {
    const col = FEATURE_COLUMN[featureType] as keyof UsageRow | null;
    if (!col) return;
    setUsage(prev => ({ ...prev, [col]: (prev[col] ?? 0) + 1 }));
  }, []);

  const isProFeature = useCallback((featureType: string): boolean => {
    // Features locked entirely behind Pro (no free uses)
    const proOnly = ['pdf'];
    return proOnly.includes(featureType);
  }, []);

  return (
    <UsageContext.Provider value={{
      plan,
      usage,
      isLoading,
      checkQuota,
      optimisticIncrement,
      refreshUsage: fetchUsage,
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
