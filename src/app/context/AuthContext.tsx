import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const isSupabaseConfigured = Boolean(
  viteEnv?.VITE_SUPABASE_URL && viteEnv.VITE_SUPABASE_URL !== 'your_supabase_project_url'
  && viteEnv?.VITE_SUPABASE_ANON_KEY && viteEnv.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here',
);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import('../services/supabase').then(({ supabase }) => {
      if (!active || !supabase) return;
      void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
        if (!active) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { supabase } = await import('../services/supabase');
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { supabase } = await import('../services/supabase');
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async (redirectTo?: string): Promise<{ error: string | null }> => {
    const { supabase } = await import('../services/supabase');
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectTo ?? '/'}`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    const { supabase } = await import('../services/supabase');
    if (supabase) await supabase.auth.signOut();
    // The next visitor must never inherit this browser's in-memory or local
    // career journey. Account data remains safely stored in Supabase.
    Object.keys(localStorage)
      .filter((key) => key.startsWith('cc_guidance_') || key.startsWith('careersim_'))
      .forEach((key) => localStorage.removeItem(key));
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isSupabaseConfigured, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
