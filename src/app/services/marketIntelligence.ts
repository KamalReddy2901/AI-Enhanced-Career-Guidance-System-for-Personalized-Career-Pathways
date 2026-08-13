import { callGroq } from './ai';
import { supabase } from './supabase';

export interface MarketUpdate {
  occupationId: string;
  demandIndex: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  regions: Array<{ name: string; level: 'high' | 'medium' | 'low' }>;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  sources: string;
  lastUpdated: string;
}

const CACHE_PREFIX = 'market_signal_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCachedMarketData(occupationId: string): MarketUpdate | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + occupationId);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + occupationId);
      return null;
    }
    return data as MarketUpdate;
  } catch {
    return null;
  }
}

function setCachedMarketData(occupationId: string, data: MarketUpdate) {
  try {
    localStorage.setItem(CACHE_PREFIX + occupationId, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full
  }
}

/**
 * Get current occupation trends using AI analysis
 * Falls back to static data if AI fails
 */
export async function getOccupationTrends(
  occupationTitle: string,
  occupationId: string,
  options: { skipCache?: boolean; signal?: AbortSignal } = {}
): Promise<MarketUpdate> {
  const { skipCache = false, signal } = options;

  // Check cache first
  if (!skipCache) {
    const cached = getCachedMarketData(occupationId);
    if (cached) return cached;
  }

  try {
    const systemPrompt = `You are a labor market analyst tracking job demand trends in India.
Analyze current demand and growth trajectory for careers based on:
- Recent job posting trends on major portals (Naukri, LinkedIn, Indeed India)
- Industry growth patterns (IT, Healthcare, Manufacturing, etc.)
- Government initiatives (Skill India, Make in India, Startup India)
- Regional demand variations (Metro cities vs Tier-2/3)

Return ONLY valid JSON with realistic, data-driven Indian market insights.`;

    const userPrompt = `Analyze the current Indian labor market demand for "${occupationTitle}".

Consider:
1. Current hiring trends and job postings
2. Industry sector health and growth
3. Government policy impact (PLI schemes, skill development programs)
4. Regional demand distribution
5. Future outlook based on economic indicators

Return this exact JSON structure:
{
  "demandIndex": 0-100 score (50=average, 70+=high demand, 30-=low demand),
  "growthTrend": "rising" | "stable" | "declining",
  "regions": [
    {"name": "Mumbai/Delhi NCR/Bangalore", "level": "high"},
    {"name": "Pune/Hyderabad/Chennai", "level": "medium"},
    {"name": "Tier-2 cities", "level": "low"}
  ],
  "reasoning": "2-3 sentence explanation based on actual market factors. Cite specific trends.",
  "confidence": "high" (if backed by clear data), "medium" (if mixed signals), or "low" (if limited data),
  "sources": "Job portal trends, NSDC reports, industry news" (indicate data sources)
}

Be realistic and honest. If demand is low, say so. Base the analysis on real Indian market conditions.`;

    const raw = await callGroq(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxTokens: 600,
      jsonMode: true,
      signal,
      usageType: 'market-intelligence',
    });

    const parsed = JSON.parse(raw) as Omit<MarketUpdate, 'occupationId' | 'lastUpdated'>;
    
    const result: MarketUpdate = {
      ...parsed,
      occupationId,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    setCachedMarketData(occupationId, result);

    // Store in Supabase if available
    if (supabase) {
      try {
        await supabase.from('market_signals').upsert({
          occupation_id: occupationId,
          demand_index: result.demandIndex,
          growth_trend: result.growthTrend,
          regions: result.regions,
          reasoning: result.reasoning,
          confidence: result.confidence,
          sources: result.sources,
          updated_at: result.lastUpdated,
        });
      } catch (err) {
        console.warn('Failed to store market signal in Supabase:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('AI market intelligence failed:', error);
    
    // Fallback to reasonable defaults
    return {
      occupationId,
      demandIndex: 55,
      growthTrend: 'stable',
      regions: [
        { name: 'Metro cities', level: 'medium' },
        { name: 'Tier-2 cities', level: 'low' },
      ],
      confidence: 'low',
      reasoning: 'Market data currently unavailable. Showing default baseline signal.',
      sources: 'Fallback data',
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Batch refresh market signals for multiple occupations
 */
export async function refreshMarketSignalsBatch(
  occupations: Array<{ id: string; title: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, MarketUpdate>> {
  const results = new Map<string, MarketUpdate>();
  
  for (let i = 0; i < occupations.length; i++) {
    const { id, title } = occupations[i];
    onProgress?.(i + 1, occupations.length);
    
    try {
      const signal = await getOccupationTrends(title, id, { skipCache: true });
      results.set(id, signal);
      
      // Rate limiting: wait 1 second between calls to avoid hitting API limits
      if (i < occupations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to refresh market signal for ${title}:`, error);
    }
  }
  
  return results;
}

/**
 * Load market signals from Supabase cache
 */
export async function loadMarketSignalsFromDb(
  occupationIds: string[]
): Promise<Map<string, MarketUpdate>> {
  const results = new Map<string, MarketUpdate>();
  
  if (!supabase) return results;
  
  try {
    const { data, error } = await supabase
      .from('market_signals')
      .select('*')
      .in('occupation_id', occupationIds)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    data?.forEach(row => {
      results.set(row.occupation_id, {
        occupationId: row.occupation_id,
        demandIndex: row.demand_index,
        growthTrend: row.growth_trend,
        regions: row.regions,
        confidence: row.confidence,
        reasoning: row.reasoning,
        sources: row.sources,
        lastUpdated: row.updated_at,
      });
    });
  } catch (error) {
    console.error('Failed to load market signals from DB:', error);
  }
  
  return results;
}

/**
 * Get age of market data for display
 */
export function getMarketDataAge(lastUpdated: string): string {
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
  return `Updated ${Math.floor(diffDays / 30)} months ago`;
}
