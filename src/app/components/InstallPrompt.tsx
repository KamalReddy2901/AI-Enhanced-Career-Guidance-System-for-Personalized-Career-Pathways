import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'careersim_install_dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40 bg-black text-white p-4 shadow-xl flex items-center gap-3 print:hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Download size={18} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-[Inter] font-medium" style={{ fontSize: '0.85rem' }}>
              Add to Home Screen
            </p>
            <p className="font-[Inter] text-white/60" style={{ fontSize: '0.72rem' }}>
              Install CareerCase for a native app experience
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 bg-white text-black px-3 py-1.5 font-[Inter] font-medium hover:bg-white/90 transition-colors"
            style={{ fontSize: '0.78rem' }}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-white/40 hover:text-white transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
