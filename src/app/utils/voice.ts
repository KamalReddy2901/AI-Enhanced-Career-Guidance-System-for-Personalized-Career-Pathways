type RecognitionResultEvent = { results: { 0: { 0: { transcript: string; confidence?: number } } } };
type RecognitionErrorEvent = { error?: string; message?: string };
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onnomatch: (() => void) | null;
  onend: (() => void) | null;
}
type RecognitionConstructor = new () => Recognition;
export type VoiceStatus = 'idle' | 'speaking' | 'listening' | 'success' | 'disabled' | 'unsupported' | 'error';

function emit(status: VoiceStatus, message: string): void {
  window.dispatchEvent(new CustomEvent('cc-voice-status', { detail: { status, message } }));
}

export function voiceOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function voiceInputSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const speechWindow = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition);
}

export function speak(text: string, lang = 'en-IN'): boolean {
  if (localStorage.getItem('cc_guidance_voice') === 'off') { emit('disabled', 'Voice assistance is disabled in Settings.'); return false; }
  if (!voiceOutputSupported()) { emit('unsupported', 'Read-aloud is unavailable in this browser.'); return false; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  const language = lang.slice(0, 2).toLowerCase();
  const preferred = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith(language));
  if (preferred) utterance.voice = preferred;
  utterance.onstart = () => emit('speaking', `Reading aloud in ${lang}.`);
  utterance.onend = () => emit('success', 'Read-aloud complete.');
  utterance.onerror = event => emit('error', `Read-aloud failed${event.error ? `: ${event.error}` : '.'}`);
  window.speechSynthesis.speak(utterance);
  return true;
}

export function listen(lang = 'en-IN', timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (localStorage.getItem('cc_guidance_voice') === 'off') { emit('disabled', 'Voice assistance is disabled in Settings.'); reject(new Error('Voice assistance is disabled in Settings')); return; }
    const speechWindow = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { emit('unsupported', 'Mic dictation is unavailable in this browser.'); reject(new Error('Voice input is not supported on this browser')); return; }
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let settled = false;
    const finish = (action: () => void) => { if (settled) return; settled = true; window.clearTimeout(timeout); action(); };
    const timeout = window.setTimeout(() => { recognition.abort(); finish(() => { emit('error', 'Mic dictation timed out. Try again.'); reject(new Error('Voice input timed out')); }); }, timeoutMs);
    recognition.onresult = event => finish(() => { const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''; if (!transcript) { emit('error', 'No speech was recognized.'); reject(new Error('No speech recognized')); return; } emit('success', 'Dictation added.'); resolve(transcript); });
    recognition.onerror = event => finish(() => { const reason = event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone permission was denied. Allow microphone access in Chrome and try again.' : event.error === 'no-speech' ? 'No speech was heard. Try again.' : `Voice input was unavailable${event.error ? `: ${event.error}` : '.'}`; emit('error', reason); reject(new Error(reason)); });
    recognition.onnomatch = () => finish(() => { emit('error', 'No speech was recognized.'); reject(new Error('No speech recognized')); });
    recognition.onend = () => finish(() => { emit('error', 'Dictation ended before speech was recognized.'); reject(new Error('Voice input ended')); });
    emit('listening', `Listening in ${lang}…`);
    try { recognition.start(); } catch (error) { finish(() => { emit('error', 'Microphone could not start.'); reject(error); }); }
  });
}
