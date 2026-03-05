import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type JobData } from '../data/jobs';
import { generateJobDataAI, generatePreliminaryAssessmentAI, clearAllCache } from '../services/ai';
import { fetchRemoteHistory, saveHistoryEntry, clearRemoteHistory } from '../services/supabase';
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
  const { user } = useAuth();
  const [currentJob, setCurrentJob] = useState<JobData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [refinementCount, setRefinementCount] = useState(0);
  const [isSearchAnimating, setIsSearchAnimating] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [comparisonJobs, setComparisonJobs] = useState<[JobData | null, JobData | null]>([null, null]);

  // Sync history from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    fetchRemoteHistory(user.id).then(entries => {
      if (entries.length === 0) return;
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
  }, [user?.id]);

  const refreshAIStatus = useCallback(() => {
    setIsAIEnabled(true);
  }, []);

  const searchJobPreliminary = useCallback(async (title: string): Promise<JobData> => {
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
      const aiData = await generateJobDataAI(title, skipCache, contextDescription);
      const id = title.toLowerCase().replace(/\s+/g, '-');
      return {
        id,
        title,
        category: aiData.category || 'Professional Services',
        shortDescription: aiData.shortDescription,
        fullDescription: aiData.fullDescription,
        avgSalary: aiData.avgSalary,
        education: aiData.education,
        skills: aiData.skills,
        dailyRoutine: aiData.dailyRoutine,
        workEnvironment: aiData.workEnvironment,
        careerPath: aiData.careerPath,
        weekOverview: aiData.weekOverview,
        quarterOverview: aiData.quarterOverview,
        yearOverview: aiData.yearOverview,
        funFact: aiData.funFact,
        topCompanies: aiData.topCompanies,
        relevantForCompanies: aiData.relevantForCompanies,
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
    const entry: HistoryEntry = { id: crypto.randomUUID(), jobTitle: jobData.title, timestamp: Date.now(), jobData };
    setHistory(prev => {
      const filtered = prev.filter(h => h.jobTitle.toLowerCase() !== jobData.title.toLowerCase());
      return [entry, ...filtered].slice(0, 50);
    });
    // Sync to Supabase if logged in
    if (user) {
      saveHistoryEntry(user.id, jobData.title, jobData, entry.timestamp).catch(() => {});
    }
  }, [user]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (user) clearRemoteHistory(user.id).catch(() => {});
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
    clearAllCache();
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
