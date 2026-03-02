import { useState, useCallback, useEffect } from 'react';
import type { JobData } from '../data/jobs';

const FAVORITES_KEY = 'careersim_favorites';

export interface Favorite {
  id: string;
  jobTitle: string;
  timestamp: number;
  jobData: JobData;
  notes?: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  const saveFavorites = useCallback((favs: Favorite[]) => {
    setFavorites(favs);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    } catch {
      // localStorage full
    }
  }, []);

  const addFavorite = useCallback((jobData: JobData, notes?: string) => {
    const newFav: Favorite = {
      id: crypto.randomUUID(),
      jobTitle: jobData.title,
      timestamp: Date.now(),
      jobData,
      notes,
    };
    const filtered = favorites.filter(f => f.jobTitle.toLowerCase() !== jobData.title.toLowerCase());
    saveFavorites([newFav, ...filtered].slice(0, 50));
  }, [favorites, saveFavorites]);

  const removeFavorite = useCallback((jobTitle: string) => {
    saveFavorites(favorites.filter(f => f.jobTitle.toLowerCase() !== jobTitle.toLowerCase()));
  }, [favorites, saveFavorites]);

  const isFavorite = useCallback((jobTitle: string) => {
    return favorites.some(f => f.jobTitle.toLowerCase() === jobTitle.toLowerCase());
  }, [favorites]);

  const updateNotes = useCallback((jobTitle: string, notes: string) => {
    saveFavorites(
      favorites.map(f =>
        f.jobTitle.toLowerCase() === jobTitle.toLowerCase()
          ? { ...f, notes }
          : f
      )
    );
  }, [favorites, saveFavorites]);

  const clearFavorites = useCallback(() => {
    saveFavorites([]);
  }, [saveFavorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    updateNotes,
    clearFavorites,
  };
}
