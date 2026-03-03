import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { getCareerTransition, type CareerTransitionPlan, hasApiKey } from '../services/ai';
import { StickFigure } from '../components/StickFigure';
import { ApiKeyModal } from '../components/ApiKeyModal';

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-700 bg-green-50 border-green-200',
  Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  Hard: 'text-orange-700 bg-orange-50 border-orange-200',
  'Very Hard': 'text-red-700 bg-red-50 border-red-200',
};

export function CareerTransitionPage() {
  const [fromCareer, setFromCareer] = useState('');
  const [toCareer, setToCareer] = useState('');
  const [plan, setPlan] = useState<CareerTransitionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!fromCareer.trim() || !toCareer.trim()) return;
    if (!hasApiKey()) {
      setShowApiModal(true);
      return;
    }

    // Cancel any existing request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const result = await getCareerTransition(fromCareer.trim(), toCareer.trim(), abortRef.current.signal);
      setPlan(result);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Failed to generate transition plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <ArrowLeftRight size={22} className="text-black/40 dark:text-white/40" />
            <p className="font-[Inter] text-black/35 dark:text-white/35 uppercase tracking-[0.15em]" style={{ fontSize: '0.65rem' }}>
              Feature
            </p>
          </div>
          <h1 className="font-[Playfair_Display] text-black dark:text-white leading-tight mb-3" style={{ fontSize: '2.4rem' }}>
            Career Transition
            <br />
            <span className="text-black/35 dark:text-white/35">Pathfinder</span>
          </h1>
          <p className="font-[Inter] text-black/50 dark:text-white/50" style={{ fontSize: '0.9rem' }}>
            Enter your current role and your target role to receive a detailed, personalised transition roadmap.
          </p>
        </motion.div>

        {/* Input Form */}
        <motion.div
          className="border-2 border-black/10 dark:border-white/10 p-6 mb-8 bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div>
              <label className="block font-[Inter] text-black/40 dark:text-white/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                Current Career
              </label>
              <input
                value={fromCareer}
                onChange={e => setFromCareer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Software Engineer"
                className="w-full border border-black/15 dark:border-white/15 bg-transparent px-4 py-3 font-[Inter] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
            </div>

            <div className="flex justify-center">
              <ArrowRight size={20} className="text-black/20 dark:text-white/20" />
            </div>

            <div>
              <label className="block font-[Inter] text-black/40 dark:text-white/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                Target Career
              </label>
              <input
                value={toCareer}
                onChange={e => setToCareer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Product Manager"
                className="w-full border border-black/15 dark:border-white/15 bg-transparent px-4 py-3 font-[Inter] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <motion.button
              onClick={handleGenerate}
              disabled={!fromCareer.trim() || !toCareer.trim() || loading}
              className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-[Inter] hover:bg-black/80 dark:hover:bg-white/80 disabled:opacity-40 transition-colors"
              style={{ fontSize: '0.88rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating plan…
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  Map My Transition
                </>
              )}
            </motion.button>

            {loading && (
              <button
                onClick={() => { abortRef.current?.abort(); setLoading(false); }}
                className="font-[Inter] text-black/35 dark:text-white/35 hover:text-black dark:hover:text-white transition-colors"
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
            )}
          </div>

          {!hasApiKey() && (
            <p className="mt-3 font-[Inter] text-black/35 dark:text-white/35" style={{ fontSize: '0.75rem' }}>
              ✦ Requires a free{' '}
              <button onClick={() => setShowApiModal(true)} className="underline hover:text-black dark:hover:text-white transition-colors">
                Groq API key
              </button>
            </p>
          )}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            className="mb-6 p-4 border border-red-200 bg-red-50 flex items-start gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="font-[Inter] text-red-700" style={{ fontSize: '0.85rem' }}>{error}</p>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && !plan && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-black/8 dark:border-white/8 p-5 animate-pulse">
                <div className="h-4 bg-black/8 dark:bg-white/8 rounded w-1/4 mb-3" />
                <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4 mb-2" />
                <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {plan && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Summary header */}
              <div className="border-2 border-black/15 dark:border-white/15 p-6 mb-6 bg-card">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <p className="font-[Inter] text-black/35 dark:text-white/35 mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                      TRANSITION PLAN
                    </p>
                    <h2 className="font-[Playfair_Display] text-black dark:text-white" style={{ fontSize: '1.5rem' }}>
                      {plan.fromTitle} → {plan.toTitle}
                    </h2>
                  </div>
                  <span className={`px-3 py-1 border font-[Inter] text-sm ${DIFFICULTY_COLOR[plan.difficulty] || 'text-black/60 bg-black/5 border-black/10'}`}>
                    {plan.difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="p-3 bg-black/3 dark:bg-white/3">
                    <p className="font-[Inter] text-black/35 dark:text-white/35 mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>
                      ESTIMATED TIMEFRAME
                    </p>
                    <p className="font-[Inter] text-black dark:text-white font-medium" style={{ fontSize: '0.9rem' }}>
                      {plan.timeframe}
                    </p>
                  </div>
                  <div className="p-3 bg-black/3 dark:bg-white/3">
                    <p className="font-[Inter] text-black/35 dark:text-white/35 mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>
                      SALARY IMPACT
                    </p>
                    <p className="font-[Inter] text-black dark:text-white font-medium" style={{ fontSize: '0.9rem' }}>
                      {plan.salaryImpact}
                    </p>
                  </div>
                </div>

                <p className="font-[Inter] text-black/60 dark:text-white/60" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {plan.overview}
                </p>
              </div>

              {/* Skills analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="border border-black/10 dark:border-white/10 p-5">
                  <h3 className="font-[Playfair_Display] text-black dark:text-white mb-3 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                    <CheckCircle size={16} className="text-green-600" />
                    Transferable Skills
                  </h3>
                  <ul className="space-y-2">
                    {plan.transferableSkills.map((skill, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="font-[Inter] text-black/65 dark:text-white/65" style={{ fontSize: '0.85rem' }}>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-black/10 dark:border-white/10 p-5">
                  <h3 className="font-[Playfair_Display] text-black dark:text-white mb-3 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                    <XCircle size={16} className="text-orange-500" />
                    Skill Gaps to Bridge
                  </h3>
                  <ul className="space-y-2">
                    {plan.skillGaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-orange-400 mt-1">•</span>
                        <span className="font-[Inter] text-black/65 dark:text-white/65" style={{ fontSize: '0.85rem' }}>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step-by-step phases */}
              <div className="mb-6">
                <h3 className="font-[Playfair_Display] text-black dark:text-white mb-4" style={{ fontSize: '1.2rem' }}>
                  Your Transition Roadmap
                </h3>
                <div className="space-y-3">
                  {plan.steps.map((step, i) => (
                    <div key={i} className="border border-black/10 dark:border-white/10">
                      <button
                        onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                        aria-expanded={expandedPhase === i}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-[Inter] font-medium shrink-0" style={{ fontSize: '0.75rem' }}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-[Playfair_Display] text-black dark:text-white" style={{ fontSize: '1rem' }}>{step.phase}</p>
                            <p className="font-[Inter] text-black/35 dark:text-white/35" style={{ fontSize: '0.72rem' }}>{step.duration}</p>
                          </div>
                        </div>
                        {expandedPhase === i ? (
                          <ChevronUp size={16} className="text-black/30 dark:text-white/30 shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-black/30 dark:text-white/30 shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedPhase === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 border-t border-black/8 dark:border-white/8 pt-4">
                              <ul className="space-y-2">
                                {step.actions.map((action, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <ArrowRight size={13} className="text-black/25 dark:text-white/25 mt-1 shrink-0" />
                                    <span className="font-[Inter] text-black/65 dark:text-white/65" style={{ fontSize: '0.85rem' }}>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success story */}
              {plan.successStory && (
                <div className="border-l-2 border-black/20 dark:border-white/20 pl-5 py-2 mb-4">
                  <p className="font-[Inter] text-black/40 dark:text-white/40 mb-1 uppercase tracking-[0.1em]" style={{ fontSize: '0.6rem' }}>
                    Real World Example
                  </p>
                  <p className="font-[Inter] text-black/60 dark:text-white/60 italic" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
                    "{plan.successStory}"
                  </p>
                </div>
              )}

              {/* Stick figure */}
              <div className="flex justify-center py-4">
                <StickFigure pose="celebrating" size={56} animate={false} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !plan && !error && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <StickFigure pose="thinking" size={72} className="mx-auto mb-5 text-black/20 dark:text-white/20" />
            <p className="font-[Inter] text-black/30 dark:text-white/30" style={{ fontSize: '0.88rem' }}>
              Enter your current and target career above to get started.
            </p>
          </motion.div>
        )}
      </div>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </div>
  );
}
