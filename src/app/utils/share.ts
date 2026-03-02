import type { JobData } from '../data/jobs';

// Abbreviated key map for compact URL encoding
const ABBREV: Record<string, string> = {
  id: 'i',
  title: 't',
  category: 'c',
  shortDescription: 'sd',
  fullDescription: 'fd',
  avgSalary: 'as',
  education: 'ed',
  skills: 'sk',
  dailyRoutine: 'dr',
  workEnvironment: 'we',
  careerPath: 'cp',
  weekOverview: 'wo',
  quarterOverview: 'qo',
  yearOverview: 'yo',
  funFact: 'ff',
};

const EXPAND: Record<string, string> = Object.fromEntries(
  Object.entries(ABBREV).map(([k, v]) => [v, k])
);

export function encodeDossier(job: JobData): string {
  const minified: Record<string, unknown> = {};
  for (const [key, abbr] of Object.entries(ABBREV)) {
    const val = (job as unknown as Record<string, unknown>)[key];
    if (val !== undefined) minified[abbr] = val;
  }
  const json = JSON.stringify(minified);
  return btoa(encodeURIComponent(json));
}

export function decodeDossier(encoded: string): JobData | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const minified: Record<string, unknown> = JSON.parse(json);
    const expanded: Record<string, unknown> = {};
    for (const [abbr, val] of Object.entries(minified)) {
      const key = EXPAND[abbr];
      if (key) expanded[key] = val;
    }
    if (!expanded.id || !expanded.title) return null;
    return expanded as unknown as JobData;
  } catch {
    return null;
  }
}

export function generateShareUrl(job: JobData): string {
  const encoded = encodeDossier(job);
  const base = window.location.origin;
  return `${base}/job/detail?d=${encoded}`;
}
