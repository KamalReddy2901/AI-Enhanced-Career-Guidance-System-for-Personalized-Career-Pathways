import { useState, useCallback, useEffect } from 'react';

const PREFERENCES_KEY = 'careersim_preferences';

export interface UserPreferences {
  soundEffects: boolean;
  showOnboarding: boolean;
  defaultView: 'week' | 'quarter' | 'year';
  compactMode: boolean;
  autoSaveNotes: boolean;
  currency: 'INR' | 'USD';
  showRelatedCareers: boolean;
  defaultDossierTab: 'wlb' | 'learn' | 'timeline';
  roadmapDetailLevel: 'essential' | 'detailed' | 'comprehensive';
  autoLoadTrending: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEffects: false,
  showOnboarding: true,
  defaultView: 'week',
  compactMode: false,
  autoSaveNotes: true,
  currency: 'INR',
  showRelatedCareers: true,
  defaultDossierTab: 'timeline',
  roadmapDetailLevel: 'detailed',
  autoLoadTrending: true,
};

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
      }
    } catch {
      setPreferencesState(DEFAULT_PREFERENCES);
    }
  }, []);

  const setPreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...prefs };
      try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      } catch {
        // localStorage full
      }
      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(PREFERENCES_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    preferences,
    setPreferences,
    resetPreferences,
  };
}
