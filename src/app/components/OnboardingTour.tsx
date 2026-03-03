import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, Sparkles, Search, BookOpen, Play, Star } from 'lucide-react';

const TOUR_KEY = 'careersim_onboarded_v1';

interface TourStep {
  icon: React.ReactNode;
  headline: string;
  body: string;
  tag: string;
}

const STEPS: TourStep[] = [
  {
    tag: 'WELCOME',
    icon: <Sparkles size={28} />,
    headline: 'Your career compass, powered by AI.',
    body: "Career Simulation helps you explore any profession in depth — timelines, salaries, education paths, and honest day-in-the-life snapshots. Let's take a 30-second tour.",
  },
  {
    tag: 'SEARCH',
    icon: <Search size={28} />,
    headline: 'Search any career — or ask a question.',
    body: "Type a role (\"UX Designer\"), an industry (\"renewable energy\"), or a question (\"what jobs involve travel?\") on the Home page. With an API key, AI handles fuzzy queries automatically.",
  },
  {
    tag: 'EXPLORE',
    icon: <BookOpen size={28} />,
    headline: 'Dive into a full career dossier.',
    body: "Each result includes a salary range, required skills, education paths, career trajectory, a day-in-the-life simulation timeline, related careers, and an AI Q&A panel.",
  },
  {
    tag: 'SIMULATE',
    icon: <Play size={28} />,
    headline: 'Live a day in the role.',
    body: "Hit Simulate on any career dossier to step into a realistic 8-hour workday. Make decisions, face unexpected events, and see how your choices affect the outcome.",
  },
  {
    tag: 'SAVE',
    icon: <Star size={28} />,
    headline: 'Save favourites & track your journey.',
    body: "Star careers to build your shortlist. Your search history and favourites sync via Supabase when you sign in, so they're available everywhere. You're all set — go explore!",
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      // Delay slightly so layout settles
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:top-auto sm:bottom-8 sm:right-8 sm:w-[380px]"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="bg-[#f9f8f7] dark:bg-[#1e1e1b] border border-black/12 dark:border-white/12 shadow-2xl">
              {/* Progress bar */}
              <div className="h-0.5 bg-black/8 dark:bg-white/8">
                <motion.div
                  className="h-full bg-black dark:bg-white"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>

              <div className="p-7">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="text-black/30 dark:text-white/30">
                      {current.icon}
                    </div>
                    <span
                      className="font-[Inter] text-black/30 dark:text-white/30"
                      style={{ fontSize: '0.62rem', letterSpacing: '0.12em' }}
                    >
                      {current.tag} — {step + 1}/{STEPS.length}
                    </span>
                  </div>
                  <button
                    onClick={dismiss}
                    className="text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors"
                    aria-label="Close tour"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3
                      className="font-[Playfair_Display] text-black dark:text-white mb-3 leading-snug"
                      style={{ fontSize: '1.25rem' }}
                    >
                      {current.headline}
                    </h3>
                    <p
                      className="font-[Inter] text-black/55 dark:text-white/55 leading-relaxed"
                      style={{ fontSize: '0.875rem' }}
                    >
                      {current.body}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center justify-between mt-7">
                  <button
                    onClick={dismiss}
                    className="font-[Inter] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Skip tour
                  </button>
                  <motion.button
                    onClick={next}
                    className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 font-[Inter]"
                    style={{ fontSize: '0.82rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {step < STEPS.length - 1 ? (
                      <>Next <ArrowRight size={14} /></>
                    ) : (
                      <>Let's go! <ArrowRight size={14} /></>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
