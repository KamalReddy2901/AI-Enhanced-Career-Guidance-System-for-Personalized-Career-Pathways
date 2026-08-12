import { useState, useCallback, useEffect } from 'react';
import type { JobData } from '../data/jobs';
import { useAuth } from '../context/AuthContext';
import {
  fetchRemoteFavorites,
  saveFavorite as saveFavoriteRemote,
  deleteRemoteFavorite,
  clearRemoteFavorites,
} from '../services/supabase';
import { useGuidance } from '../context/GuidanceContext';
import { occupationById } from '../data/knowledge';

const FAVORITES_KEY = 'careersim_favorites';

export interface Favorite {
  id: string;
  jobTitle: string;
  timestamp: number;
  jobData: JobData;
  notes?: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const { passport, updatePassport } = useGuidance();
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Load from localStorage first, then merge with remote
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      setFavorites([]);
    }
  }, []);

  // Sync remote favorites when user logs in
  useEffect(() => {
    if (!user) return;
    fetchRemoteFavorites(user.id).then(remote => {
      if (remote.length === 0) return;
      const remoteFavs: Favorite[] = remote.map(r => ({
        id: r.id,
        jobTitle: r.job_title,
        timestamp: r.saved_at,
        jobData: r.job_data as JobData,
      }));
      setFavorites(prev => {
        const merged = [...prev];
        for (const rf of remoteFavs) {
          if (!merged.some(f => f.jobTitle.toLowerCase() === rf.jobTitle.toLowerCase())) {
            merged.push(rf);
          }
        }
        merged.sort((a, b) => b.timestamp - a.timestamp);
        try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged)); } catch { /* full */ }
        return merged;
      });
    }).catch(() => {});
  }, [user?.id]);

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
    const updated = [newFav, ...filtered].slice(0, 50);
    saveFavorites(updated);
    if (passport) {
      const title = jobData.title.toLowerCase();
      const occupation = [...occupationById.values()].find(item => item.title.toLowerCase() === title || item.title.toLowerCase().includes(title) || title.includes(item.title.toLowerCase()));
      updatePassport(previous => {
        if (!previous) throw new Error('Passport unavailable');
        const current = previous.aspiration ?? { statement: `Explore ${jobData.title}`, horizonYears: 3, themes: [], dreamOccupationIds: [], entrepreneurialIntent: 'none' as const, capturedVia: 'form' as const };
        return { ...previous, aspiration: { ...current, themes: [...new Set([...current.themes, jobData.title.toLowerCase()])].slice(0, 12), dreamOccupationIds: occupation ? [...new Set([...current.dreamOccupationIds, occupation.id])].slice(0, 5) : current.dreamOccupationIds } };
      });
    }
    if (user) {
      saveFavoriteRemote(user.id, jobData.title, jobData, newFav.timestamp).catch(() => {});
    }
  }, [favorites, saveFavorites, user, passport, updatePassport]);

  const removeFavorite = useCallback((jobTitle: string) => {
    saveFavorites(favorites.filter(f => f.jobTitle.toLowerCase() !== jobTitle.toLowerCase()));
    if (user) {
      deleteRemoteFavorite(user.id, jobTitle).catch(() => {});
    }
  }, [favorites, saveFavorites, user]);

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
    if (user) {
      clearRemoteFavorites(user.id).catch(() => {});
    }
  }, [saveFavorites, user]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    updateNotes,
    clearFavorites,
  };
}
