import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ExternalLink, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { setApiKey, validateApiKey } from '../services/ai';
import { StickFigure } from './StickFigure';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySet: () => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeySet }: ApiKeyModalProps) {
  const [key, setKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap + restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus first input after mount
      setTimeout(() => {
        const input = modalRef.current?.querySelector('input');
        input?.focus();
      }, 100);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'input, button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  const handleSubmit = async () => {
    if (!key.trim()) return;
    setIsValidating(true);
    setError('');

    const valid = await validateApiKey(key.trim());
    if (valid) {
      setApiKey(key.trim());
      onKeySet();
      onClose();
      setKey('');
    } else {
      setError('Invalid API key. Please check and try again.');
    }
    setIsValidating(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apikey-modal-title"
            onKeyDown={handleKeyDown}
            className="relative bg-white border-2 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] w-full max-w-md mx-4 p-8"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 text-black/30 hover:text-black transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <StickFigure pose="waving" size={48} animate={false} />
              <div>
                <h2 id="apikey-modal-title" className="font-[Playfair_Display] text-black" style={{ fontSize: '1.3rem' }}>
                  AI-Powered Mode
                </h2>
                <p className="font-[Inter] text-black/40" style={{ fontSize: '0.72rem' }}>
                  Free Groq API key required
                </p>
              </div>
            </div>

            <div className="bg-black/3 border border-black/8 p-4 mb-6">
              <p className="font-[Inter] text-black/60 mb-3" style={{ fontSize: '0.85rem' }}>
                This app uses <strong>Groq</strong> (free, unlimited for personal use) to generate
                unique, AI-tailored content for every profession.
              </p>
              <ol className="space-y-1.5 font-[Inter] text-black/50" style={{ fontSize: '0.8rem' }}>
                <li className="flex items-start gap-2">
                  <span className="text-black/30 shrink-0">1.</span>
                  Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2 hover:text-black/70 inline-flex items-center gap-1">console.groq.com/keys <ExternalLink size={11} /></a>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black/30 shrink-0">2.</span>
                  Sign up for free (Google/GitHub login)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black/30 shrink-0">3.</span>
                  Create an API key and paste it below
                </li>
              </ol>
            </div>

            <div className="relative mb-4">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25" />
              <input
                type="password"
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="gsk_..."
                className="w-full border-2 border-black/15 pl-10 pr-4 py-3 font-[JetBrains_Mono] text-black/70 placeholder:text-black/20 outline-none focus:border-black/40 transition-colors"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {error && (
              <motion.div
                className="flex items-center gap-2 text-red-600 mb-4 font-[Inter]"
                style={{ fontSize: '0.8rem' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={!key.trim() || isValidating}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 font-[Inter] hover:bg-black/85 transition-colors disabled:bg-black/30"
              style={{ fontSize: '0.88rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isValidating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Connect & Start
                </>
              )}
            </motion.button>

            <p className="font-[Inter] text-black/25 text-center mt-4" style={{ fontSize: '0.68rem' }}>
              Your key is stored locally in your browser. Never sent anywhere except Groq.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
