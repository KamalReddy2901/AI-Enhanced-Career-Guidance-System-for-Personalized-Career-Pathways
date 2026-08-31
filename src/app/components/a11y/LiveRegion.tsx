/**
 * ARIA Live Region for Status Announcements
 * 
 * WCAG 2.1 Success Criterion 4.1.3 (Level AA): Status Messages
 * 
 * Announces dynamic status updates to screen readers without
 * moving focus or interrupting user's current task.
 */

import { useEffect, useRef } from 'react';

type Politeness = 'polite' | 'assertive';

interface LiveRegionProps {
  readonly message: string;
  readonly politeness?: Politeness;
  readonly clearAfter?: number;  // milliseconds
}

export function LiveRegion({ message, politeness = 'polite', clearAfter }: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clearAfter && message && regionRef.current) {
      const timer = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearAfter);
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook for managing status announcements
 */
export function useStatusAnnouncer() {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<Politeness>('polite');

  const announce = (text: string, urgent = false) => {
    setPoliteness(urgent ? 'assertive' : 'polite');
    setMessage(text);
  };

  const clear = () => setMessage('');

  return { message, politeness, announce, clear };
}

// Re-export useState to fix missing import
import { useState } from 'react';
