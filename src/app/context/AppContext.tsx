import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { generateJobData, normalizeJobData, type JobData } from '../data/jobs';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface HistoryEntry {
  id: string;
  jobTitle: string;
  timestamp: number;
  jobData: JobData;
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

export function AppProvider({ children }: { children: ReactNode }) {
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
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error('AI generation failed — please try again', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, []);

  const addToHistory = useCallback((jobData: JobData) => {
    if (isSupabaseConfigured && !user) return;
    const entry: HistoryEntry = { id: crypto.randomUUID(), jobTitle: jobData.title, timestamp: Date.now(), jobData };
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
  }, [user, isSupabaseConfigured]);

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
