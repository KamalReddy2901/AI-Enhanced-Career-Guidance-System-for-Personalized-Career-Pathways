import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { generateJobData, type JobData } from '../data/jobs';
import { generateJobDataAI, hasApiKey, clearAllCache } from '../services/ai';
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
  searchJobAI: (title: string, skipCache?: boolean) => Promise<JobData>;
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
  const [currentJob, setCurrentJob] = useState<JobData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [refinementCount, setRefinementCount] = useState(0);
  const [isSearchAnimating, setIsSearchAnimating] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(hasApiKey());
  const [comparisonJobs, setComparisonJobs] = useState<[JobData | null, JobData | null]>([null, null]);

  const refreshAIStatus = useCallback(() => {
    setIsAIEnabled(hasApiKey());
  }, []);

  const searchJob = useCallback((title: string): JobData => {
    return generateJobData(title);
  }, []);

  const searchJobAI = useCallback(async (title: string, skipCache = false): Promise<JobData> => {
    if (!hasApiKey()) {
      return generateJobData(title);
    }

    try {
      const aiData = await generateJobDataAI(title, skipCache);
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
      };
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error('AI generation failed — using template data', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return generateJobData(title);
    }
  }, []);

  const addToHistory = useCallback((jobData: JobData) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.jobTitle.toLowerCase() !== jobData.title.toLowerCase());
      return [
        { id: crypto.randomUUID(), jobTitle: jobData.title, timestamp: Date.now(), jobData },
        ...filtered
      ].slice(0, 30);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    toast.success('History cleared');
  }, []);

  const setComparisonJob = useCallback((index: 0 | 1, job: JobData | null) => {
    setComparisonJobs(prev => {
      const next: [JobData | null, JobData | null] = [...prev];
      next[index] = job;
      return next;
    });
  }, []);

  const clearAICache = useCallback(() => {
    clearAllCache();
    toast.success('AI cache cleared — fresh data on next search');
  }, []);

  return (
    <AppContext.Provider value={{
      currentJob,
      setCurrentJob,
      searchJob,
      searchJobAI,
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
