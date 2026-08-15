import { callGroq } from './ai';
import { supabase } from './supabase';

/** Minimal market-signal shape accepted for trajectory context; works with
 * both the curated knowledge-base MarketSignal and the live MarketUpdate. */
export interface TrajectoryMarketContext {
  demandIndex: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  confidence?: string;
  reasoning?: string;
}

export interface SkillEvolution {
  skillName: string;
  trend: 'rising' | 'stable' | 'declining';
  importance: 'critical' | 'important' | 'nice-to-have';
  rationale: string;
}

export interface DivergencePath {
  title: string;
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  requiredSkills: string[];
}

export interface YearOutlook {
  year: number;
  demandRange: { min: number; max: number };
  salaryTrendIndicator: 'rising' | 'stable' | 'declining';
  keySkills: SkillEvolution[];
  emergingSpecializations: string[];
  notes: string;
}

export interface CareerTrajectory {
  occupationId: string;
  occupationTitle: string;
  generatedAt: string;
  confidenceBand: 'high' | 'medium' | 'low';
  baselineYear: YearOutlook;
  year2: YearOutlook;
  year3Plus: YearOutlook;
  divergencePaths: DivergencePath[];
  keyAssumptions: string[];
  disclaimer: string;
}

const CACHE_PREFIX = 'trajectory_';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCachedTrajectory(occupationId: string): CareerTrajectory | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + occupationId);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + occupationId);
      return null;
    }
    return data as CareerTrajectory;
  } catch {
    return null;
  }
}

function setCachedTrajectory(occupationId: string, data: CareerTrajectory) {
  try {
    localStorage.setItem(CACHE_PREFIX + occupationId, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full
  }
}

/**
 * Generate a 3-year forward projection for a career using AI analysis
 * grounded in Indian industry context
 */
export async function projectCareerTrajectory(
  occupationTitle: string,
  occupationId: string,
  currentMarketSignal: TrajectoryMarketContext | null,
  options: { skipCache?: boolean; signal?: AbortSignal } = {}
): Promise<CareerTrajectory> {
  const { skipCache = false, signal } = options;

  // Check cache first
  if (!skipCache) {
    const cached = getCachedTrajectory(occupationId);
    if (cached) return cached;
  }

  try {
    const systemPrompt = `You are a career trajectory analyst specializing in Indian labor markets.

Generate a 3-year forward projection for a career based on:
- Current Indian industry trends (IT, Manufacturing, Healthcare, Services)
- Government initiatives impact (PLI schemes, Digital India, Skill India, Startup India)
- Technology adoption curves specific to India
- Workforce demographics and education pipeline
- Regional economic development patterns

Return structured, realistic projections with explicit uncertainty ranges. Be honest about limitations.`;

    const marketContext = currentMarketSignal
      ? `Current market signal: Demand ${currentMarketSignal.demandIndex}/100, Trend ${currentMarketSignal.growthTrend}${currentMarketSignal.confidence ? `, Confidence ${currentMarketSignal.confidence}` : ''}${currentMarketSignal.reasoning ? `. Reasoning: ${currentMarketSignal.reasoning}` : ''}`
      : 'No current market signal available.';

    const userPrompt = `Project the 3-year trajectory for "${occupationTitle}" in the Indian labor market.

${marketContext}

Return this exact JSON structure:
{
  "confidenceBand": "high" (backed by clear trends), "medium" (mixed signals), or "low" (high uncertainty),
  "baselineYear": {
    "year": 0,
    "demandRange": {"min": 50, "max": 70},
    "salaryTrendIndicator": "stable",
    "keySkills": [
      {"skillName": "Specific skill", "trend": "rising", "importance": "critical", "rationale": "Why this matters"}
    ],
    "emergingSpecializations": ["Sub-field 1", "Sub-field 2"],
    "notes": "Current state summary in 2-3 sentences"
  },
  "year2": {
    "year": 2,
    "demandRange": {"min": 55, "max": 75},
    "salaryTrendIndicator": "rising",
    "keySkills": [
      {"skillName": "Evolving skill", "trend": "rising", "importance": "important", "rationale": "Why it will matter"}
    ],
    "emergingSpecializations": ["New area 1"],
    "notes": "Expected changes in 2 years"
  },
  "year3Plus": {
    "year": 3,
    "demandRange": {"min": 60, "max": 80},
    "salaryTrendIndicator": "rising",
    "keySkills": [
      {"skillName": "Future-critical skill", "trend": "rising", "importance": "critical", "rationale": "Long-term impact"}
    ],
    "emergingSpecializations": ["Mature specialization"],
    "notes": "3+ year outlook with higher uncertainty"
  },
  "divergencePaths": [
    {
      "title": "Specialization route",
      "description": "Deep expertise path",
      "likelihood": "high",
      "requiredSkills": ["Skill A", "Skill B"]
    },
    {
      "title": "Generalization route",
      "description": "Breadth path",
      "likelihood": "medium",
      "requiredSkills": ["Skill C", "Skill D"]
    }
  ],
  "keyAssumptions": [
    "Assumption 1 about economy/policy",
    "Assumption 2 about technology adoption",
    "Assumption 3 about workforce supply"
  ]
}

Guidelines:
- Demand ranges should reflect uncertainty (not single numbers)
- Skills should be specific and actionable (not generic like "communication")
- Divergence paths should be realistic career forks, not aspirational fantasies
- Ground assumptions in actual Indian context (not global generic trends)
- Be conservative with confidence bands - most projections are medium or low confidence`;

    const raw = await callGroq(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 1500,
      jsonMode: true,
      signal,
      usageType: 'trajectory-projection',
    });

    const parsed = JSON.parse(raw) as Omit<CareerTrajectory, 'occupationId' | 'occupationTitle' | 'generatedAt' | 'disclaimer'>;

    const result: CareerTrajectory = {
      ...parsed,
      occupationId,
      occupationTitle,
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Forward-looking estimate based on current market signals and industry patterns. Not a guarantee. Real outcomes depend on individual effort, market conditions, and policy changes.',
    };

    // Cache the result
    setCachedTrajectory(occupationId, result);

    // Store in Supabase if available
    if (supabase) {
      try {
        await supabase.from('career_trajectories').upsert({
          occupation_id: occupationId,
          confidence_band: result.confidenceBand,
          baseline_year: result.baselineYear,
          year_2: result.year2,
          year_3_plus: result.year3Plus,
          divergence_paths: result.divergencePaths,
          key_assumptions: result.keyAssumptions,
          generated_at: result.generatedAt,
        });
      } catch (err) {
        console.warn('Failed to store trajectory in Supabase:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('Trajectory projection failed:', error);

    // Fallback to conservative baseline
    const fallbackYear: YearOutlook = {
      year: 0,
      demandRange: { min: 45, max: 55 },
      salaryTrendIndicator: 'stable' as const,
      keySkills: [],
      emergingSpecializations: [],
      notes: 'Trajectory data unavailable. Showing baseline conservative estimate.',
    };

    return {
      occupationId,
      occupationTitle,
      generatedAt: new Date().toISOString(),
      confidenceBand: 'low',
      baselineYear: fallbackYear,
      year2: { ...fallbackYear, year: 2 },
      year3Plus: { ...fallbackYear, year: 3 },
      divergencePaths: [],
      keyAssumptions: ['Fallback projection due to data unavailability'],
      disclaimer:
        'Forward-looking estimate based on current market signals and industry patterns. Not a guarantee. Real outcomes depend on individual effort, market conditions, and policy changes.',
    };
  }
}

/**
 * Get age of trajectory data for display
 */
export function getTrajectoryDataAge(generatedAt: string): string {
  const now = Date.now();
  const generated = new Date(generatedAt).getTime();
  const diffMs = now - generated;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Generated today';
  if (diffDays === 1) return 'Generated yesterday';
  if (diffDays < 7) return `Generated ${diffDays} days ago`;
  if (diffDays < 30) return `Generated ${Math.floor(diffDays / 7)} weeks ago`;
  return `Generated ${Math.floor(diffDays / 30)} months ago`;
}
