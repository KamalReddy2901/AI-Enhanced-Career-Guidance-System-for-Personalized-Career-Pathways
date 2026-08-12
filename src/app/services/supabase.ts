import { createClient } from '@supabase/supabase-js';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const supabaseUrl = viteEnv?.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = viteEnv?.VITE_SUPABASE_ANON_KEY ?? '';

// An account-backed journey needs both public Supabase values. Treat a partial
// configuration as unavailable instead of letting authentication fail later.
const isConfigured = Boolean(
  supabaseUrl && supabaseUrl !== 'your_supabase_project_url'
  && supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key_here',
);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = isConfigured;

// ── History helpers ─────────────────────────────────────────────────────────

export interface DbHistoryEntry {
  id: string;
  user_id: string;
  job_title: string;
  job_data: unknown;
  timestamp: number;
}

export async function fetchRemoteHistory(userId: string): Promise<DbHistoryEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('career_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(100);
  if (error) { console.error('fetchRemoteHistory:', error); return []; }
  return data ?? [];
}

export async function saveHistoryEntry(
  userId: string,
  jobTitle: string,
  jobData: unknown,
  timestamp: number,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('career_history').insert({
    user_id: userId,
    job_title: jobTitle,
    job_data: jobData,
    timestamp,
  });
  if (error) console.error('saveHistoryEntry:', error);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('career_history').delete().eq('id', id);
}

export async function clearRemoteHistory(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('career_history').delete().eq('user_id', userId);
}

// ── Favorites helpers ───────────────────────────────────────────────────────

export interface DbFavorite {
  id: string;
  user_id: string;
  job_title: string;
  job_data: unknown;
  saved_at: number;
}

export async function fetchRemoteFavorites(userId: string): Promise<DbFavorite[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('career_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) { console.error('fetchRemoteFavorites:', error); return []; }
  return data ?? [];
}

export async function saveFavorite(
  userId: string,
  jobTitle: string,
  jobData: unknown,
  savedAt: number,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('career_favorites').upsert(
    { user_id: userId, job_title: jobTitle, job_data: jobData, saved_at: savedAt },
    { onConflict: 'user_id,job_title' },
  );
  if (error) console.error('saveFavorite:', error);
}

export async function deleteRemoteFavorite(userId: string, jobTitle: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('career_favorites').delete()
    .eq('user_id', userId)
    .eq('job_title', jobTitle);
}

export async function clearRemoteFavorites(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('career_favorites').delete().eq('user_id', userId);
}
