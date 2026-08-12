import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { Navbar } from '../components/Navbar';
import { OnboardingTour } from '../components/OnboardingTour';
import { Breadcrumb } from '../components/Breadcrumb';
import { BottomNav } from '../components/BottomNav';
import { InstallPrompt } from '../components/InstallPrompt';

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (location.pathname !== '/') {
          navigate('/');
        }
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

      // Ctrl/Cmd + P: Print (only on job detail page)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && location.pathname === '/job/detail') {
        e.preventDefault();
        window.print();
        return;
      }

      // Escape: Go back
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"]');
        if (modals.length > 0) return;

        if (location.pathname === '/simulation') navigate('/job/detail');
        else if (location.pathname === '/job/detail') navigate('/job');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Skip navigation link for keyboard/screen-reader users */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content">
        <Breadcrumb />
        <Outlet />
      </main>
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
    </div>
  );
}
