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
} from "react";
import type {
  CareerPassport,
  RecommendationSet,
  PathwayPlan,
} from "../engine/types";
import {
  loadPassport,
  savePassport as savePassportToDb,
  fetchPathways as fetchPathwaysFromDb,
} from "../services/guidanceDb";
import { useAuth } from "./AuthContext";
import { matchCareers } from "../engine/matching";
import { buildPathwayPlan } from "../engine/pathways";
import { saveRecommendationSet } from "../services/guidanceDb";
import { logProgress } from "../services/guidanceDb";
import { savePathway } from "../services/guidanceDb";

// ─── Context Types ────────────────────────────────────────────────────────────

interface GuidanceContextValue {
  passport: CareerPassport | null;
  recommendations: RecommendationSet | null;
  recommendationChanges: RecommendationChange[];
  pathways: PathwayPlan[];

  updatePassport: (
    mutator: (prev: CareerPassport | null) => CareerPassport,
  ) => void;
  recompute: () => void;
  savePathwayPlan: (plan: PathwayPlan) => void;
  replacePathwayPlan: (plan: PathwayPlan) => void;
  resetGuidance: () => void;
  dismissRecommendationChanges: () => void;

  loading: boolean;
}

export interface RecommendationChange {
  occupationId: string;
  previousScore: number;
  score: number;
  previousRank: number;
  rank: number;
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const PASSPORT_STORAGE_KEY = "cc_guidance_passport";
const PATHWAYS_STORAGE_KEY = "cc_guidance_pathways";

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [passport, setPassport] = useState<CareerPassport | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationSet | null>(null);
  const [recommendationChanges, setRecommendationChanges] = useState<
    RecommendationChange[]
  >([]);
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
        console.error("Failed to load passport from localStorage:", err);
      }
      try {
        const pathwayRaw = localStorage.getItem(PATHWAYS_STORAGE_KEY);
        if (pathwayRaw) setPathways(JSON.parse(pathwayRaw) as PathwayPlan[]);
      } catch {
        /* ignore invalid local pathway data */
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
            localStorage.setItem(
              PASSPORT_STORAGE_KEY,
              JSON.stringify(remotePassport),
            );
          }
        }

        if (remotePathways.length > 0) {
          setPathways(remotePathways.map((p) => p.plan as PathwayPlan));
        }
      }

      setLoading(false);
    };

    loadInitialData();
  }, [user]);

  // ─── Update passport ────────────────────────────────────────────────────────
  const updatePassport = useCallback(
    (mutator: (prev: CareerPassport | null) => CareerPassport) => {
      setPassport((prev) => {
        const updated = mutator(prev);
        updated.updatedAt = new Date().toISOString();
        updated.version = (prev?.version ?? 0) + 1;

        // Save to localStorage immediately
        try {
          localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save passport to localStorage:", err);
        }

        // Save to Supabase if signed in
        if (user?.id) {
          savePassportToDb(user.id, updated).catch((err) => {
            console.error("Failed to save passport to Supabase:", err);
          });
          void logProgress(user.id, "profile_edit", {
            passportVersion: updated.version,
          });
        }

        return updated;
      });
    },
    [user],
  );

  // ─── Recompute stub (Phase 5) ───────────────────────────────────────────────
  const recompute = useCallback(() => {
    if (!passport) return;
    const next = matchCareers(passport);
    setRecommendations((previous) => {
      if (previous) {
        const priorRank = new Map(
          previous.recommendations.map((item, index) => [
            item.occupationId,
            index + 1,
          ]),
        );
        const priorScore = new Map(
          previous.recommendations.map((item) => [
            item.occupationId,
            item.totalScore,
          ]),
        );
        setRecommendationChanges(
          next.recommendations
            .flatMap((item, index) => {
              const previousScore = priorScore.get(item.occupationId);
              const previousRank = priorRank.get(item.occupationId);
              if (
                previousScore === undefined ||
                previousRank === undefined ||
                (previousScore === item.totalScore &&
                  previousRank === index + 1)
              )
                return [];
              return [
                {
                  occupationId: item.occupationId,
                  previousScore,
                  score: item.totalScore,
                  previousRank,
                  rank: index + 1,
                },
              ];
            })
            .sort(
              (a, b) =>
                Math.abs(b.score - b.previousScore) -
                Math.abs(a.score - a.previousScore),
            )
            .slice(0, 3),
        );
        try {
          localStorage.setItem(
            "cc_guidance_previous_recommendations",
            JSON.stringify(previous),
          );
        } catch {
          /* optional */
        }
      }
      return next;
    });
    try {
      localStorage.setItem("cc_guidance_recommendations", JSON.stringify(next));
    } catch {
      /* optional */
    }
    if (user?.id) void saveRecommendationSet(user.id, next);
    setPathways((previous) => {
      const refreshed = previous.map((saved) => {
        const rebuilt = buildPathwayPlan(passport, saved.occupationId);
        return {
          ...rebuilt,
          chosenRoute: saved.chosenRoute,
          createdAt: saved.createdAt,
          routes: rebuilt.routes.map((route) => {
            const oldRoute = saved.routes.find(
              (item) => item.kind === route.kind,
            );
            return {
              ...route,
              steps: route.steps.map((step, index) => ({
                ...step,
                done: oldRoute?.steps[index]?.done ?? false,
              })),
            };
          }),
        };
      });
      try {
        localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify(refreshed));
      } catch {
        /* optional */
      }
      if (user?.id)
        refreshed.forEach((plan) => {
          void savePathway(user.id, plan);
        });
      return refreshed;
    });
  }, [passport, user]);

  const savePathwayPlan = useCallback((plan: PathwayPlan) => {
    setPathways((previous) => {
      const next = [
        ...previous.filter((item) => item.occupationId !== plan.occupationId),
        plan,
      ];
      localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const replacePathwayPlan = useCallback((plan: PathwayPlan) => {
    setPathways((previous) => {
      const next = previous.map((item) =>
        item.occupationId === plan.occupationId ? plan : item,
      );
      localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetGuidance = useCallback(() => {
    setPassport(null);
    setRecommendations(null);
    setPathways([]);
    setRecommendationChanges([]);
    Object.keys(localStorage)
      .filter((key) => key.startsWith("cc_guidance_"))
      .forEach((key) => localStorage.removeItem(key));
  }, []);

  const dismissRecommendationChanges = useCallback(
    () => setRecommendationChanges([]),
    [],
  );

  useEffect(() => {
    if (!passport) return;
    const raw = localStorage.getItem("cc_guidance_recommendations");
    if (raw) {
      try {
        setRecommendations(JSON.parse(raw) as RecommendationSet);
      } catch {
        /* stale cache */
      }
    }
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
        recommendationChanges,
        pathways,
        updatePassport,
        recompute,
        savePathwayPlan,
        replacePathwayPlan,
        resetGuidance,
        dismissRecommendationChanges,
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
    throw new Error("useGuidance must be used within GuidanceProvider");
  }
  return context;
}
