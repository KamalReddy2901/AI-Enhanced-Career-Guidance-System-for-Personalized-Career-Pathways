// FavoritesPage redirects to HistoryPage's "saved" tab
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function FavoritesPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/history?tab=saved', { replace: true });
  }, [navigate]);
  return null;
}
