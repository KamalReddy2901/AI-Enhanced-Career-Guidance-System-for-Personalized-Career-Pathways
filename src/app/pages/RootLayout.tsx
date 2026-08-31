import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { OnboardingTour } from '../components/OnboardingTour';
import { BottomNav } from '../components/BottomNav';
import { InstallPrompt } from '../components/InstallPrompt';
import { PageTransition } from '../motion/PageTransition';
import { UnifiedCareerCaseShell } from '../components/UnifiedShell';
import { useAuth } from '../context/AuthContext';
import { useGuidance } from '../context/GuidanceContext';

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { passport, loading: guidanceLoading } = useGuidance();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/job?fresh=1');
        setTimeout(() => {
          const input = document.querySelector('input[placeholder*="job title"]') as HTMLInputElement;
          input?.focus();
        }, 100);
        return;
      }

      // Ctrl/Cmd + H: Go to history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        navigate('/history');
        return;
      }

      // Ctrl/Cmd + Q: Go to quiz
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        navigate('/quiz');
        return;
      }

      // Ctrl/Cmd + Shift + C: Go to compare
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        navigate('/compare');
        return;
      }

      // Ctrl/Cmd + P: Print on job detail page
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && location.pathname === '/job/detail') {
        e.preventDefault();
        window.print();
        return;
      }

      // Escape: Go back (if no dialogs open)
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"]');
        if (modals.length > 0) return;

        if (location.pathname === '/simulation') navigate('/job/detail');
        else if (location.pathname === '/job/detail') navigate('/job?fresh=1');
        else if (location.pathname === '/job') navigate('/');
        else if (location.pathname !== '/') navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const isPublicRoute = location.pathname === '/' || location.pathname === '/auth';
  if (loading) {
    return (
      <div
        className="min-h-screen bg-[var(--paper)] flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="font-mono-ui text-xs text-black/40">Loading CareerCase…</span>
      </div>
    );
  }
  if (!user && !isPublicRoute) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  const requiresPassport = [
    '/assess',
    '/passport',
    '/recommendations',
    '/pathways',
    '/pathway/',
  ].some((path) =>
    location.pathname === path ||
    location.pathname.startsWith(`${path}/`) ||
    (path.endsWith('/') && location.pathname.startsWith(path))
  );
  if (user && !guidanceLoading && requiresPassport && !passport) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <UnifiedCareerCaseShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'card-sketch font-mono-ui',
          style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.85rem',
            border: '2px solid var(--ink)',
            borderRadius: '2px',
            boxShadow: 'var(--shadow-hard)',
            background: 'var(--paper-raised)',
            color: 'var(--ink)',
          },
        }}
      />
      <OnboardingTour />
      <BottomNav />
      <InstallPrompt />
    </UnifiedCareerCaseShell>
  );
}
