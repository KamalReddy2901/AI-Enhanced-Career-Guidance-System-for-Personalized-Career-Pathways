// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Guidance Context — Career Passport State Management
// Holds passport, recommendations, pathways; localStorage + Supabase sync
// ══════════════════════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  CareerPassport,
  RecommendationSet,
  PathwayPlan,
} from '../engine/types';
import {
  loadPassport,
  savePassport as savePassportToDb,
  fetchPathways as fetchPathwaysFromDb,
} from '../services/guidanceDb';
import { useAuth } from './AuthContext';
import { matchCareers } from '../engine/matching';
import { saveRecommendationSet } from '../services/guidanceDb';

// ─── Context Types ────────────────────────────────────────────────────────────

interface GuidanceContextValue {
  passport: CareerPassport | null;
  recommendations: RecommendationSet | null;
  pathways: PathwayPlan[];
  
  updatePassport: (mutator: (prev: CareerPassport | null) => CareerPassport) => void;
  recompute: () => void;
  
  loading: boolean;
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const PASSPORT_STORAGE_KEY = 'cc_guidance_passport';

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [passport, setPassport] = useState<CareerPassport | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationSet | null>(null);
  const [pathways, setPathways] = useState<PathwayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ─── Load passport from localStorage or Supabase ────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      // Try localStorage first (always available)
      try {
        const localRaw = localStorage.getItem(PASSPORT_STORAGE_KEY);
        if (localRaw) {
          const localPassport = JSON.parse(localRaw) as CareerPassport;
          setPassport(localPassport);
        }
      } catch (err) {
        console.error('Failed to load passport from localStorage:', err);
      }
      
      // If signed in, load from Supabase and merge
      if (user?.id) {
        const remotePassport = await loadPassport(user.id);
        const remotePathways = await fetchPathwaysFromDb(user.id);
        
        if (remotePassport) {
          // Remote wins on conflict (compare updatedAt)
          const localRaw = localStorage.getItem(PASSPORT_STORAGE_KEY);
          let shouldUseRemote = true;
          
          if (localRaw) {
            try {
              const localPassport = JSON.parse(localRaw) as CareerPassport;
              const localTime = new Date(localPassport.updatedAt).getTime();
              const remoteTime = new Date(remotePassport.updatedAt).getTime();
              
              if (localTime > remoteTime) {
                // Local is newer, save it to remote
                await savePassportToDb(user.id, localPassport);
                shouldUseRemote = false;
              }
            } catch {
              // Parse error, use remote
            }
          }
          
          if (shouldUseRemote) {
            setPassport(remotePassport);
            localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(remotePassport));
          }
        }
        
        if (remotePathways.length > 0) {
          setPathways(remotePathways.map(p => p.plan as PathwayPlan));
        }
      }
      
      setLoading(false);
    };
    
    loadInitialData();
  }, [user]);
  
  // ─── Update passport ────────────────────────────────────────────────────────
  const updatePassport = useCallback((mutator: (prev: CareerPassport | null) => CareerPassport) => {
    setPassport(prev => {
      const updated = mutator(prev);
      updated.updatedAt = new Date().toISOString();
      updated.version = (prev?.version ?? 0) + 1;
      
      // Save to localStorage immediately
      try {
        localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save passport to localStorage:', err);
      }
      
      // Save to Supabase if signed in
      if (user?.id) {
        savePassportToDb(user.id, updated).catch(err => {
          console.error('Failed to save passport to Supabase:', err);
        });
      }
      
      return updated;
    });
  }, [user]);
  
  // ─── Recompute stub (Phase 5) ───────────────────────────────────────────────
  const recompute = useCallback(() => {
    if (!passport) return;
    const next = matchCareers(passport);
    setRecommendations(next);
    try { localStorage.setItem('cc_guidance_recommendations', JSON.stringify(next)); } catch { /* optional */ }
    if (user?.id) void saveRecommendationSet(user.id, next);
  }, [passport, user]);

  useEffect(() => {
    if (!passport) return;
    const raw = localStorage.getItem('cc_guidance_recommendations');
    if (raw) { try { setRecommendations(JSON.parse(raw) as RecommendationSet); } catch { /* stale cache */ } }
  }, [passport]);

  useEffect(() => {
    if (!passport) return;
    const timer = window.setTimeout(() => recompute(), 1500);
    return () => window.clearTimeout(timer);
  }, [passport, recompute]);
  
  return (
    <GuidanceContext.Provider
      value={{
        passport,
        recommendations,
        pathways,
        updatePassport,
        recompute,
        loading,
      }}
    >
      {children}
    </GuidanceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGuidance(): GuidanceContextValue {
  const context = useContext(GuidanceContext);
  if (!context) {
    throw new Error('useGuidance must be used within GuidanceProvider');
  }
  return context;
}
