import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

// These are the existing hosted-sih-fixture.ts identities, not assignable roles.
const personas = [
  { slug: 'student', label: 'Student', path: '/career' },
  { slug: 'recruiter', label: 'Recruiter', path: '/industry/opportunities' },
  { slug: 'faculty', label: 'Faculty', path: '/faculty' },
  { slug: 'institution-admin', label: 'Institution', path: '/institution' },
  { slug: 'policy-analyst', label: 'Policy', path: '/institution' },
] as const;
// Deliberately memory-only: refreshing or ending presentation locks the switcher.
const sessions = new Set<string>();
let presentationPassword = '';
function fixtureClient() {
  const env = import.meta.env;
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
const fixtureEmail = (slug: string) => `sih26044-controlled-${slug}@example.invalid`;

export function PresentationSwitcher() {
  const { user, isSupabaseConfigured, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState(sessions.size > 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!isSupabaseConfigured) return null;

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('Checking controlled accounts…');
    try {
      // An isolated client validates credentials without replacing the visitor's session.
      const client = fixtureClient();
      sessions.clear();
      for (const persona of personas) {
        const { data, error } = await client.auth.signInWithPassword({ email: fixtureEmail(persona.slug), password });
        if (!error && data.session && data.user?.app_metadata.fixture_namespace === 'sih26044-controlled-v1') {
          sessions.add(persona.slug);
        }
      }
      presentationPassword = sessions.size ? password : '';
      setReady(sessions.size > 0);
      setMessage(sessions.size ? 'Choose a controlled persona. This signs out the current account.' : 'Could not unlock controlled accounts. Check the fixture password.');
    } catch {
      sessions.clear();
      setReady(false);
      setMessage('Unable to connect. Try again.');
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  async function switchPersona(slug: string, path: string) {
    if (!sessions.has(slug) || busy) return;
    setBusy(true);
    setMessage('Opening controlled persona…');
    try {
      const fresh = await fixtureClient().auth.signInWithPassword({ email: fixtureEmail(slug), password: presentationPassword });
      if (fresh.error || !fresh.data.session || fresh.data.user?.app_metadata.fixture_namespace !== 'sih26044-controlled-v1') throw new Error('Unavailable');
      // Use the existing sign-out cleanup before loading another account's career data.
      await signOut();
      const { supabase } = await import('../services/supabase');
      if (!supabase) throw new Error('Unavailable');
      const { data, error } = await supabase.auth.setSession(fresh.data.session);
      if (error || !data.session) throw new Error('Session expired');

      navigate(path);
      setMessage('Controlled account active. Existing permissions apply.');
    } catch {
      sessions.delete(slug);
      setReady(sessions.size > 0);
      setMessage('Session unavailable. Unlock presentation again to retry.');
    } finally {
      setBusy(false);
    }
  }

  const control = 'min-h-11 border border-black/30 px-3 py-2 font-mono-ui text-[10px] uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-news)] disabled:opacity-40';
  return (
    <section aria-label="Presentation personas" className="border-b border-black/20 bg-[var(--paper)]">
      <div className="mx-auto max-w-7xl px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`${control} text-[var(--accent-news)]`} aria-expanded={open || ready} aria-controls="presentation-controls" onClick={() => setOpen(value => !value)}>
            {ready ? 'Presentation mode' : 'Presentation mode · unlock'}
          </button>
          {ready && <>
            <div id="presentation-controls" role="group" aria-label="Choose demo persona" className="flex flex-wrap gap-1">
              {personas.map(persona => <button key={persona.slug} type="button" disabled={busy || !sessions.has(persona.slug)} aria-pressed={user?.email === fixtureEmail(persona.slug)} className={`${control} ${user?.email === fixtureEmail(persona.slug) ? 'bg-black text-white' : 'hover:bg-black/5'}`} onClick={() => void switchPersona(persona.slug, persona.path)}>{persona.label}</button>)}
            </div>
            <button type="button" className={control} disabled={busy} onClick={async () => { sessions.clear(); presentationPassword = ''; setReady(false); setOpen(false); setMessage(''); await signOut(); navigate('/'); }}>End presentation</button>
          </>}
        </div>
        {open && !ready && <form id="presentation-controls" onSubmit={unlock} className="flex flex-wrap items-end gap-3 py-3">
          <label className="flex flex-col gap-1 font-mono-ui text-xs">Controlled fixture password
            <input type="password" autoComplete="off" required value={password} onChange={event => setPassword(event.target.value)} className="min-h-11 w-full max-w-64 border border-black bg-transparent px-3 focus-visible:outline-2" />
          </label>
          <button type="submit" disabled={busy} className={`${control} bg-black text-white`}>{busy ? 'Unlocking…' : 'Unlock personas'}</button>
          <p className="w-full text-xs text-black/70">Existing synthetic accounts only. Your real account’s permissions are never changed. The unlock password stays in memory until you end or reload the presentation.</p>
        </form>}
        <p role="status" className="text-xs text-black/70">{message}</p>
      </div>
    </section>
  );
}
