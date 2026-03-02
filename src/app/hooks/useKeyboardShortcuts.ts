import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search (go to home)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/');
        // Focus search input after navigation
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
        return;
      }

      // Escape: Go back
      if (e.key === 'Escape') {
        // Don't interfere with modal closes
        if (document.querySelector('[role="dialog"]')) return;
        
        e.preventDefault();
        if (location.pathname !== '/') {
          navigate(-1);
        }
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

      // Ctrl/Cmd + C: Go to compare
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.shiftKey) {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location]);
}
