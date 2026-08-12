import { useEffect, useState } from 'react';
import type { VoiceStatus } from '../utils/voice';

export function useVoiceStatus() {
  const [voiceStatus, setVoiceStatus] = useState<{ status: VoiceStatus; message: string }>({ status: 'idle', message: '' });
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ status: VoiceStatus; message: string }>).detail;
      setVoiceStatus(detail);
    };
    window.addEventListener('cc-voice-status', listener);
    return () => window.removeEventListener('cc-voice-status', listener);
  }, []);
  return voiceStatus;
}
