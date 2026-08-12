import { Volume2 } from 'lucide-react';

export function VoiceWaveform({active}:{active:boolean}) {
  return active?<span className="voice-waveform" aria-hidden="true"><i/><i/><i/></span>:<Volume2 size={16} aria-hidden="true"/>;
}
