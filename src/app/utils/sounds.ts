// Simple sound effect utilities using Web Audio API
// These are procedurally generated sounds, no files needed

let audioContext: AudioContext | null = null;
let isSoundEnabled = false;

export function enableSound(enabled: boolean) {
  isSoundEnabled = enabled;
  if (enabled && !audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
}

export function isSoundOn() {
  return isSoundEnabled;
}

function getCtx(): AudioContext | null {
  if (!isSoundEnabled) return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.1, startDelay = 0) {
  const ctx = getCtx();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  const start = ctx.currentTime + startDelay;
  gainNode.gain.setValueAtTime(0.001, start);
  gainNode.gain.linearRampToValueAtTime(volume, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playFreqSweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  startDelay = 0
) {
  const ctx = getCtx();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  const start = ctx.currentTime + startDelay;
  oscillator.frequency.setValueAtTime(startFreq, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, start + duration);

  gainNode.gain.setValueAtTime(0.001, start);
  gainNode.gain.linearRampToValueAtTime(volume, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const sounds = {
  // ── Core UI Sounds
  click: () => playTone(900, 0.06, 'sine', 0.06),
  hover: () => playTone(700, 0.03, 'sine', 0.02),
  pop: () => playTone(1100, 0.05, 'sine', 0.07),
  tick: () => playTone(1400, 0.03, 'triangle', 0.05),

  // ── Navigation
  navigate: () => {
    playFreqSweep(600, 900, 0.12, 'sine', 0.05);
  },
  tabChange: () => {
    playTone(880, 0.06, 'triangle', 0.05);
    playTone(1047, 0.08, 'triangle', 0.04, 0.06);
  },

  // ── Feedback Sounds
  success: () => {
    playTone(523.25, 0.12, 'sine', 0.08);
    playTone(659.25, 0.12, 'sine', 0.08, 0.1);
    playTone(783.99, 0.18, 'sine', 0.09, 0.22);
  },
  error: () => {
    playTone(380, 0.12, 'square', 0.06);
    playTone(280, 0.18, 'square', 0.06, 0.12);
  },
  notification: () => {
    playTone(880, 0.1, 'sine', 0.06);
    playTone(1046.5, 0.12, 'sine', 0.07, 0.1);
  },

  // ── Quiz / selection
  quizAnswer: () => {
    playTone(660, 0.04, 'triangle', 0.06);
    playTone(880, 0.05, 'triangle', 0.05, 0.04);
  },
  quizCorrect: () => {
    playTone(523, 0.1, 'sine', 0.08);
    playTone(659, 0.1, 'sine', 0.08, 0.1);
    playTone(784, 0.16, 'sine', 0.09, 0.2);
  },
  quizWrong: () => {
    playTone(330, 0.1, 'triangle', 0.06);
    playTone(262, 0.15, 'triangle', 0.06, 0.1);
  },
  select: () => playFreqSweep(800, 1000, 0.08, 'triangle', 0.04),

  // ── Expand / Collapse / Toggle
  expand: () => playFreqSweep(500, 750, 0.12, 'triangle', 0.04),
  collapse: () => playFreqSweep(750, 500, 0.12, 'triangle', 0.04),
  toggle: () => {
    playTone(1000, 0.04, 'triangle', 0.05);
    playTone(700, 0.06, 'triangle', 0.04, 0.04);
  },

  // ── Modal / Dialog
  modalOpen: () => {
    playFreqSweep(400, 700, 0.22, 'sine', 0.06);
  },
  modalClose: () => {
    playFreqSweep(700, 350, 0.18, 'sine', 0.05);
  },

  // ── Download / Save
  download: () => {
    playTone(880, 0.08, 'sine', 0.07);
    playTone(1100, 0.08, 'sine', 0.07, 0.08);
    playTone(1320, 0.12, 'sine', 0.07, 0.18);
    playTone(880, 0.14, 'sine', 0.06, 0.3);
  },

  // ── Transition Sounds
  whoosh: () => playFreqSweep(900, 180, 0.32, 'sawtooth', 0.07),
  slide: () => playFreqSweep(600, 350, 0.2, 'sine', 0.05),
  pageFlip: () => playFreqSweep(400, 1200, 0.15, 'triangle', 0.06),

  // ── Stamp / Case File
  stamp: () => {
    playTone(140, 0.12, 'triangle', 0.12);  // thud
    playTone(950, 0.04, 'sine', 0.07, 0.05); // tap
  },

  // ── Typewriter (scanning animation)
  typewriter: () => {
    playTone(1300, 0.02, 'sine', 0.04);
    playTone(1100, 0.02, 'sine', 0.04, 0.04);
    playTone(1200, 0.02, 'sine', 0.04, 0.08);
  },
  typeTick: () => playTone(1300 + Math.random() * 200, 0.015, 'sine', 0.03),

  // ── Favorite toggle
  favorite: () => {
    playTone(660, 0.1, 'sine', 0.07);
    playTone(880, 0.12, 'sine', 0.08, 0.1);
  },
  unfavorite: () => {
    playTone(880, 0.1, 'sine', 0.06);
    playTone(550, 0.12, 'sine', 0.06, 0.1);
  },

  // ── Simulation Complete (triumphant arpeggio)
  complete: () => {
    playTone(523.25, 0.1, 'sine', 0.09);           // C4
    playTone(659.25, 0.1, 'sine', 0.09, 0.1);      // E4
    playTone(783.99, 0.1, 'sine', 0.09, 0.2);      // G4
    playTone(1046.5, 0.22, 'sine', 0.1, 0.32);     // C5
  },

  // ── Confetti shower
  confetti: () => {
    const freqs = [1200, 900, 1500, 800, 1100, 1400];
    freqs.forEach((f, i) =>
      playTone(f, 0.07, 'sine', 0.05, i * 0.07)
    );
  },

  // ── Share
  share: () => {
    playTone(880, 0.08, 'sine', 0.06);
    playTone(1100, 0.1, 'sine', 0.07, 0.09);
    playTone(1320, 0.14, 'sine', 0.07, 0.2);
  },

  // ── Search / discover
  search: () => {
    playFreqSweep(700, 1100, 0.18, 'sine', 0.06);
  },

  // ── Copy to clipboard
  copy: () => {
    playTone(1047, 0.05, 'triangle', 0.05);
    playTone(1319, 0.08, 'triangle', 0.04, 0.06);
  },

  // ── Add to compare
  addCompare: () => {
    playTone(784, 0.07, 'sine', 0.06);
    playTone(988, 0.09, 'sine', 0.07, 0.08);
  },

  // ── Reveal / unlock
  reveal: () => {
    const notes = [392, 494, 587, 740];
    notes.forEach((f, i) => playTone(f, 0.1, 'sine', 0.06, i * 0.06));
  },
};
