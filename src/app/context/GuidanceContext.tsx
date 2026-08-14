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
import { useAuth } from "./AuthContext";
import { calculateCompleteness } from "../engine/skillProfile";
import { GUIDANCE_ENGINE_VERSION } from "../engine/matching";

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

/**
 * Older anonymous profiles can outlive the UI version that created them.
 * Fill only structurally-required collection/default fields here so a stale
 * browser record never takes down recommendations or pathways.
 */
export function normalizeStoredPassport(value: CareerPassport): CareerPassport {
  const legacy = value as CareerPassport & {
    values?: CareerPassport["values"] & {
      achievement?: number;
      independence?: number;
      recognition?: number;
      relationships?: number;
      support?: number;
      workingConditions?: number;
    };
    constraints?: CareerPassport["constraints"] & { mustMaintainIncome?: boolean };
  };
  const numberOr = (candidate: number | undefined, fallback: number) =>
    Number.isFinite(candidate) ? candidate! : fallback;
  const normalized: CareerPassport = {
    ...value,
    experiences: Array.isArray(value.experiences) ? value.experiences : [],
    skills: Array.isArray(value.skills) ? value.skills : [],
    values: legacy.values
      ? {
          stability: numberOr(legacy.values.stability, numberOr(legacy.values.support, 50)),
          growth: numberOr(legacy.values.growth, numberOr(legacy.values.achievement, 50)),
          autonomy: numberOr(legacy.values.autonomy, numberOr(legacy.values.independence, 50)),
          impact: numberOr(legacy.values.impact, numberOr(legacy.values.relationships, 50)),
          balance: numberOr(legacy.values.balance, numberOr(legacy.values.workingConditions, 50)),
          compensation: numberOr(legacy.values.compensation, numberOr(legacy.values.recognition, 50)),
        }
      : undefined,
    aspiration: value.aspiration
      ? {
          ...value.aspiration,
          horizonYears: value.aspiration.horizonYears ?? 5,
          themes: Array.isArray(value.aspiration.themes) ? value.aspiration.themes : [],
          dreamOccupationIds: Array.isArray(value.aspiration.dreamOccupationIds)
            ? value.aspiration.dreamOccupationIds
            : [],
          entrepreneurialIntent: value.aspiration.entrepreneurialIntent ?? "none",
          capturedVia: value.aspiration.capturedVia ?? "form",
        }
      : undefined,
    constraints: {
      location: value.constraints?.location ?? "",
      canRelocate: value.constraints?.canRelocate ?? false,
      weeklyLearningHours: value.constraints?.weeklyLearningHours ?? 5,
      budgetLevel: value.constraints?.budgetLevel ?? "medium",
      languages: Array.isArray(value.constraints?.languages)
        ? value.constraints.languages
        : [],
      needsIncomeContinuity:
        value.constraints?.needsIncomeContinuity ?? legacy.constraints?.mustMaintainIncome ?? false,
    },
  };
  normalized.completeness = calculateCompleteness(normalized);
  return normalized;
}

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isSupabaseConfigured } = useAuth();

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
    let cancelled = false;
    const loadInitialData = async () => {
      setLoading(true);

      // With account-backed auth enabled, never expose a previous visitor's
      // browser profile in a signed-out session. Cloud data is loaded only for
      // the authenticated account below.
      if (isSupabaseConfigured && !user) {
        if (!cancelled) {
          setPassport(null);
          setRecommendations(null);
          setPathways([]);
          setRecommendationChanges([]);
          setLoading(false);
        }
        return;
      }

      // Try localStorage first (always available)
      try {
        const localRaw = localStorage.getItem(PASSPORT_STORAGE_KEY);
        if (localRaw) {
          const localPassport = normalizeStoredPassport(JSON.parse(localRaw) as CareerPassport);
          localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(localPassport));
          if (!cancelled) setPassport(localPassport);
        }
      } catch (err) {
        console.error("Failed to load passport from localStorage:", err);
      }
      try {
        const pathwayRaw = localStorage.getItem(PATHWAYS_STORAGE_KEY);
        if (pathwayRaw && !cancelled) setPathways(JSON.parse(pathwayRaw) as PathwayPlan[]);
      } catch {
        /* ignore invalid local pathway data */
      }

      // If signed in, load from Supabase and merge
      if (user?.id) {
        try {
          const { migrateLocalGuidanceToCloud } = await import("../services/guidanceDb");
          const migration = await migrateLocalGuidanceToCloud(user.id);
          if (!cancelled) {
            if (migration.passport) setPassport(normalizeStoredPassport(migration.passport));
            setPathways(migration.pathways);
            localStorage.setItem("cc_guidance_last_sync", JSON.stringify({ userId: user.id, at: new Date().toISOString(), uploaded: migration.uploaded }));
          }
        } catch (error) {
          // Never discard the anonymous browser copy when cloud sync is unavailable.
          console.error("Guidance migration failed; local data retained:", error);
          if (!cancelled) localStorage.setItem("cc_guidance_last_sync", JSON.stringify({ userId: user.id, at: new Date().toISOString(), error: String(error) }));
        }
      }

      if (!cancelled) setLoading(false);
    };

    if (!authLoading) void loadInitialData();
    return () => { cancelled = true; };
  }, [user?.id, authLoading, isSupabaseConfigured]);

  // ─── Update passport ────────────────────────────────────────────────────────
  const updatePassport = useCallback(
    (mutator: (prev: CareerPassport | null) => CareerPassport) => {
      setPassport((prev) => {
        const mutated = mutator(prev);
        const updated = normalizeStoredPassport({
          ...mutated,
          updatedAt: new Date().toISOString(),
          version: (prev?.version ?? 0) + 1,
        });

        // Save to localStorage immediately
        try {
          localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save passport to localStorage:", err);
        }

        // Save to Supabase if signed in
        if (user?.id) {
          void import("../services/guidanceDb").then(({ savePassport, logProgress }) => {
            void savePassport(user.id, updated).catch((err) => {
              console.error("Failed to save passport to Supabase:", err);
            });
            void logProgress(user.id, "profile_edit", { passportVersion: updated.version });
          });
        }

        return updated;
      });
    },
    [user],
  );

  // ─── Deterministic recommendation and active-pathway recomputation ─────────
  const recompute = useCallback(async () => {
    if (!passport) return;
    const [{ matchCareers }, { buildPathwayPlan }] = await Promise.all([
      import("../engine/matching"),
      import("../engine/pathways"),
    ]);
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
        const changes = next.recommendations
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
            .slice(0, 3);
        if (changes.length) setRecommendationChanges(changes);
        else if (previous.passportVersion !== next.passportVersion) {
          const item = next.recommendations[0];
          setRecommendationChanges([{
            occupationId: item.occupationId,
            previousScore: priorScore.get(item.occupationId) ?? item.totalScore,
            score: item.totalScore,
            previousRank: priorRank.get(item.occupationId) ?? 1,
            rank: 1,
          }]);
        }
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
    if (user?.id) void import("../services/guidanceDb").then(({ saveRecommendationSet }) => saveRecommendationSet(user.id, next));
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
              steps: route.steps.map((step) => ({
                ...step,
                done: oldRoute?.steps.some(oldStep => oldStep.done && oldStep.kind === step.kind && oldStep.refId === step.refId && oldStep.label === step.label) ?? false,
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
      if (user?.id) void import("../services/guidanceDb").then(({ savePathway }) => {
        refreshed.forEach((plan) => { void savePathway(user.id, plan); });
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
      if (user?.id) void import("../services/guidanceDb").then(({ savePathway }) => savePathway(user.id, plan));
      return next;
    });
  }, [user]);

  const replacePathwayPlan = useCallback((plan: PathwayPlan) => {
    setPathways((previous) => {
      const next = previous.map((item) =>
        item.occupationId === plan.occupationId ? plan : item,
      );
      localStorage.setItem(PATHWAYS_STORAGE_KEY, JSON.stringify(next));
      if (user?.id) void import("../services/guidanceDb").then(({ savePathway }) => savePathway(user.id, plan));
      return next;
    });
  }, [user]);

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
    if (!passport || (isSupabaseConfigured && !user)) return;
    const raw = localStorage.getItem("cc_guidance_recommendations");
    if (raw) {
      try {
        const cached = JSON.parse(raw) as RecommendationSet;
        // Scores from an older contract must never masquerade as results from
        // the current reviewed engine. Recompute from the durable passport.
        if (cached.engineVersion === GUIDANCE_ENGINE_VERSION) setRecommendations(cached);
        else localStorage.removeItem("cc_guidance_recommendations");
      } catch {
        /* stale cache */
      }
    }
  }, [passport, isSupabaseConfigured, user]);

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
