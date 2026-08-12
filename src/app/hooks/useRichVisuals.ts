import { useEffect, useState } from 'react';

export function useRichVisuals() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    const update = () => setEnabled(media.matches && (navigator.hardwareConcurrency ?? 1) > 4);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return enabled;
}
