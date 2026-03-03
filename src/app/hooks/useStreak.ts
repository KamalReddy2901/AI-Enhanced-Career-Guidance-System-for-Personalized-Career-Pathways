import { useState, useEffect } from 'react';

const STREAK_KEY = 'careersim_streak';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO date string YYYY-MM-DD
  totalDays: number;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    totalDays: 0,
  });

  useEffect(() => {
    const raw = localStorage.getItem(STREAK_KEY);
    let data: StreakData = raw
      ? JSON.parse(raw)
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalDays: 0 };

    const today = todayStr();

    if (data.lastActiveDate === today) {
      // Already tracked today - just load
      setStreak(data);
      return;
    }

    // New day - update streak
    const isConsecutive = data.lastActiveDate === yesterdayStr();

    data = {
      currentStreak: isConsecutive ? data.currentStreak + 1 : 1,
      longestStreak: Math.max(data.longestStreak, isConsecutive ? data.currentStreak + 1 : 1),
      lastActiveDate: today,
      totalDays: data.totalDays + 1,
    };

    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    setStreak(data);
  }, []);

  return streak;
}
