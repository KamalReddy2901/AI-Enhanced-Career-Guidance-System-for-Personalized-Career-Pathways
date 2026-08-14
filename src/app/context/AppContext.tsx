import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { generateJobData, normalizeJobData, type JobData } from '../data/jobs';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { useGuidance } from './GuidanceContext';
import { KB_VERSION, OCCUPATIONS, qualificationsForOccupation, skillById } from '../data/knowledge';
import type { Segment } from '../engine/types';

interface HistoryEntry {
  id: string;
  jobTitle: string;
  timestamp: number;
  jobData: JobData;
  segment?: Segment;
  kbVersion?: string;
}

interface AppContextType {
  currentJob: JobData | null;
  setCurrentJob: (job: JobData | null) => void;
  searchJob: (title: string) => JobData;
  searchJobAI: (title: string, skipCache?: boolean, contextDescription?: string) => Promise<JobData>;
  searchJobPreliminary: (title: string) => Promise<JobData>;
  history: HistoryEntry[];
  addToHistory: (jobData: JobData) => void;
  clearHistory: () => void;
  refinementCount: number;
  setRefinementCount: (count: number) => void;
  isSearchAnimating: boolean;
  setIsSearchAnimating: (v: boolean) => void;
  isAIEnabled: boolean;
  refreshAIStatus: () => void;
  // Comparison
  comparisonJobs: [JobData | null, JobData | null];
  setComparisonJob: (index: 0 | 1, job: JobData | null) => void;
  // Cache
  clearAICache: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const normalizedWords = (value: string) => value
  .toLowerCase()
  .replace(/engineer/g, 'developer')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

/**
 * Keep career exploration useful when the optional live enrichment service is
 * unavailable. Known roles are grounded in the versioned NCO/NSQF knowledge
 * base; unknown roles still receive the deterministic local dossier.
 */
function groundedJobFallback(title: string): JobData {
  const fallback = generateJobData(title);
  const queryWords = new Set(normalizedWords(title));
  const match = OCCUPATIONS
    .map(candidate => {
      const candidateWords = new Set(normalizedWords(`${candidate.id} ${candidate.title}`));
      const overlap = [...queryWords].filter(word => candidateWords.has(word)).length;
      return { candidate, score: overlap / Math.max(queryWords.size, candidateWords.size, 1) };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!match || match.score < 0.25) return fallback;

  const role = match.candidate;
  const skills = role.skills
    .map(requirement => skillById.get(requirement.skillId)?.name)
    .filter((name): name is string => Boolean(name));
  const qualifications = qualificationsForOccupation(role.id)
    .sort((a, b) => a.typicalMonths - b.typicalMonths)
    .slice(0, 5)
    .map(qualification => `${qualification.name} (NSQF ${qualification.nsqfLevel})`);
  const primarySkills = skills.slice(0, 4).join(', ');

  return normalizeJobData(title, {
    ...fallback,
    category: role.sector,
    shortDescription: `${title} is represented by NCO-2015 occupation ${role.ncoCode} in the ${role.sector} sector. The role's strongest knowledge-base requirements are ${primarySkills}. This is a grounded offline snapshot; live AI enrichment is optional and never changes CareerCase recommendation scores.`,
    fullDescription: `${title} sits in CareerCase's ${role.cluster.replace('_', ' ')} occupation cluster and typically begins around NSQF level ${role.nsqfEntryLevel}. Its evidence profile is grounded in NCO-2015 occupation ${role.ncoCode}.\n\nCore requirements in the current knowledge base include ${skills.slice(0, 6).join(', ')}. These requirements are used to explain skill gaps and learning routes; they are not inferred from generated text.\n\nThe role is ${role.isEmerging ? 'marked as emerging' : 'an established occupation'} in the current knowledge base. Treat salary and market ranges as indicative, because location, employer, qualification and experience materially change outcomes.\n\nUse the Career Passport, gap report and linked NSQF learning routes to validate fit before investing time or money. Live AI enrichment can add narrative detail when available, but deterministic TypeScript rules remain the source of every score.`,
    education: qualifications.length ? qualifications : fallback.education,
    skills: skills.length ? skills : fallback.skills,
    funFact: `CareerCase maps this role to NCO-2015 code ${role.ncoCode} and an NSQF entry level of ${role.nsqfEntryLevel}.`,
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { passport } = useGuidance();
  const { user, isSupabaseConfigured } = useAuth();
  const [currentJob, setCurrentJobState] = useState<JobData | null>(null);
  const setCurrentJob = useCallback((job: JobData | null) => {
    setCurrentJobState(job ? normalizeJobData(job.title || 'Career', job) : null);
  }, []);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [refinementCount, setRefinementCount] = useState(0);
  const [isSearchAnimating, setIsSearchAnimating] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [comparisonJobs, setComparisonJobs] = useState<[JobData | null, JobData | null]>([null, null]);

  // Sync history from Supabase when user logs in
  useEffect(() => {
    let active = true;
    if (!user) {
      setHistory([]);
      setCurrentJob(null);
      setComparisonJobs([null, null]);
      setRefinementCount(0);
      return;
    }
    import('../services/supabase').then(({ fetchRemoteHistory }) => fetchRemoteHistory(user.id)).then(entries => {
      if (!active || entries.length === 0) return;
      setHistory(prev => {
        const remoteItems: HistoryEntry[] = entries.map(e => ({
          id: e.id,
          jobTitle: e.job_title,
          timestamp: e.timestamp,
          jobData: e.job_data as JobData,
        }));
        // Merge: remote + local, deduplicate by jobTitle (keep newest)
        const merged = [...remoteItems, ...prev];
        const seen = new Set<string>();
        return merged
          .filter(h => {
            const key = h.jobTitle.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 50);
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  const refreshAIStatus = useCallback(() => {
    setIsAIEnabled(true);
  }, []);

  const searchJobPreliminary = useCallback(async (title: string): Promise<JobData> => {
    const grounded = groundedJobFallback(title);
    if (grounded.shortDescription.includes('NCO-2015 occupation')) return grounded;
    try {
      const { generatePreliminaryAssessmentAI } = await import('../services/ai');
      const prelim = await generatePreliminaryAssessmentAI(title);
      const id = title.toLowerCase().replace(/\s+/g, '-');
      return {
        id, title,
        category: prelim.category || 'Professional Services',
        shortDescription: prelim.shortDescription,
        fullDescription: '',
        avgSalary: prelim.avgSalary,
        education: [],
        skills: [],
        dailyRoutine: '',
        workEnvironment: '',
        careerPath: '',
        weekOverview: '',
        quarterOverview: '',
        yearOverview: '',
        funFact: '',
      };
    } catch {
      return groundedJobFallback(title);
    }
  }, []);

  const searchJob = useCallback((title: string): JobData => {
    const id = title.toLowerCase().replace(/\s+/g, '-');
    return {
      id, title,
      category: 'Professional Services',
      shortDescription: '',
      fullDescription: '',
      avgSalary: 'Loading...',
      education: [],
      skills: [],
      dailyRoutine: '',
      workEnvironment: '',
      careerPath: '',
      weekOverview: '',
      quarterOverview: '',
      yearOverview: '',
      funFact: '',
    };
  }, []);

  const searchJobAI = useCallback(async (title: string, skipCache = false, contextDescription?: string): Promise<JobData> => {
    try {
      const { generateJobDataAI } = await import('../services/ai');
      const aiData = await generateJobDataAI(title, skipCache, contextDescription);
      const id = title.toLowerCase().replace(/\s+/g, '-');
      const fallback = generateJobData(title);
      return {
        id,
        title,
        category: typeof aiData.category === 'string' && aiData.category.trim() ? aiData.category : fallback.category,
        shortDescription: typeof aiData.shortDescription === 'string' && aiData.shortDescription.trim() ? aiData.shortDescription : fallback.shortDescription,
        fullDescription: typeof aiData.fullDescription === 'string' && aiData.fullDescription.trim() ? aiData.fullDescription : fallback.fullDescription,
        avgSalary: typeof aiData.avgSalary === 'string' && aiData.avgSalary.trim() ? aiData.avgSalary : fallback.avgSalary,
        education: Array.isArray(aiData.education) ? aiData.education.filter((item): item is string => typeof item === 'string') : fallback.education,
        skills: Array.isArray(aiData.skills) ? aiData.skills.filter((item): item is string => typeof item === 'string') : fallback.skills,
        dailyRoutine: typeof aiData.dailyRoutine === 'string' && aiData.dailyRoutine.trim() ? aiData.dailyRoutine : fallback.dailyRoutine,
        workEnvironment: typeof aiData.workEnvironment === 'string' && aiData.workEnvironment.trim() ? aiData.workEnvironment : fallback.workEnvironment,
        careerPath: typeof aiData.careerPath === 'string' && aiData.careerPath.trim() ? aiData.careerPath : fallback.careerPath,
        weekOverview: typeof aiData.weekOverview === 'string' && aiData.weekOverview.trim() ? aiData.weekOverview : fallback.weekOverview,
        quarterOverview: typeof aiData.quarterOverview === 'string' && aiData.quarterOverview.trim() ? aiData.quarterOverview : fallback.quarterOverview,
        yearOverview: typeof aiData.yearOverview === 'string' && aiData.yearOverview.trim() ? aiData.yearOverview : fallback.yearOverview,
        funFact: typeof aiData.funFact === 'string' && aiData.funFact.trim() ? aiData.funFact : fallback.funFact,
        topCompanies: Array.isArray(aiData.topCompanies) ? aiData.topCompanies.filter(company => company && typeof company.name === 'string') : [],
        relevantForCompanies: Boolean(aiData.relevantForCompanies),
      };
    } catch {
      return groundedJobFallback(title);
    }
  }, []);

  const addToHistory = useCallback((jobData: JobData) => {
    if (isSupabaseConfigured && !user) return;
    const entry: HistoryEntry = { id: crypto.randomUUID(), jobTitle: jobData.title, timestamp: Date.now(), jobData, segment: passport?.segment, kbVersion: KB_VERSION };
    setHistory(prev => {
      const filtered = prev.filter(h => h.jobTitle.toLowerCase() !== jobData.title.toLowerCase());
      return [entry, ...filtered].slice(0, 50);
    });
    // Sync to Supabase if logged in
    if (user) {
      void import('../services/supabase').then(({ saveHistoryEntry }) =>
        saveHistoryEntry(user.id, jobData.title, jobData, entry.timestamp),
      ).catch(() => {});
    }
  }, [user, isSupabaseConfigured, passport?.segment]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (user) void import('../services/supabase').then(({ clearRemoteHistory }) => clearRemoteHistory(user.id)).catch(() => {});
    toast.success('History cleared');
  }, [user]);

  const setComparisonJob = useCallback((index: 0 | 1, job: JobData | null) => {
    setComparisonJobs(prev => {
      const next: [JobData | null, JobData | null] = [...prev];
      next[index] = job;
      return next;
    });
  }, []);

  const clearAICache = useCallback(() => {
    void import('../services/ai').then(({ clearAllCache }) => clearAllCache());
    toast.success('AI cache cleared - fresh data on next search');
  }, []);

  return (
    <AppContext.Provider value={{
      currentJob,
      setCurrentJob,
      searchJob,
      searchJobAI,
      searchJobPreliminary,
      history,
      addToHistory,
      clearHistory,
      refinementCount,
      setRefinementCount,
      isSearchAnimating,
      setIsSearchAnimating,
      isAIEnabled,
      refreshAIStatus,
      comparisonJobs,
      setComparisonJob,
      clearAICache,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
