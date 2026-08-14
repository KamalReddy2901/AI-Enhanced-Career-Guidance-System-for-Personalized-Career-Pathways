export interface TrendingCareers {
  rising: Array<{ title: string; reason: string }>;
  declining: Array<{ title: string; reason: string }>;
  emerging: Array<{ title: string; reason: string }>;
}

/** Normalize cached and model-supplied trend data before it reaches the UI. */
export function normalizeTrendingCareers(value: unknown): TrendingCareers {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const normalizeList = (items: unknown): Array<{ title: string; reason: string }> =>
    Array.isArray(items)
      ? items.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const candidate = item as Record<string, unknown>;
          const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
          if (!title) return [];
          return [{ title, reason: typeof candidate.reason === 'string' ? candidate.reason.trim() : '' }];
        })
      : [];

  return {
    rising: normalizeList(record.rising),
    declining: normalizeList(record.declining),
    emerging: normalizeList(record.emerging),
  };
}
