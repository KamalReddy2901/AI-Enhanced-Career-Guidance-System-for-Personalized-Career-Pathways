import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

// Routes that are always public (no login required)
const PUBLIC_ROUTES = ['/', '/auth'];

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isSupabaseConfigured } = useAuth();

  // Protect routes behind auth when Supabase is configured
  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    const isPublic = PUBLIC_ROUTES.some(r => location.pathname === r || location.pathname.startsWith('/auth'));
    if (!user && !isPublic) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [user, loading, location.pathname, isSupabaseConfigured, navigate]);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Outlet />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
            border: '2px solid rgba(0,0,0,0.1)',
            borderRadius: '0',
            boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.08)',
          },
        }}
      />
    </div>
  );
}

