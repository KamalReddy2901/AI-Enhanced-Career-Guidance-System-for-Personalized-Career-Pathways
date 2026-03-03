import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, ExternalLink, Download, Share2, Clock, X } from 'lucide-react';
import { getCareerTransition, getJobSuggestions, type CareerTransitionPlan, hasApiKey } from '../services/ai';
import { JOB_TITLES } from '../data/jobs';
import { StickFigure } from '../components/StickFigure';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { downloadTransitionPDF } from '../utils/pdfExport';
import { toast } from 'sonner';

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-700 bg-green-50 border-green-200',
  Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  Hard: 'text-orange-700 bg-orange-50 border-orange-200',
  'Very Hard': 'text-red-700 bg-red-50 border-red-200',
};

export function CareerTransitionPage() {
  const [searchParams] = useSearchParams();

  const [fromCareer, setFromCareer] = useState(() => searchParams.get('from') || '');
  const [toCareer, setToCareer] = useState(() => searchParams.get('to') || '');
  const [plan, setPlan] = useState<CareerTransitionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const abortRef = useRef<AbortController | null>(null);

  // AI-powered suggestion state
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [fetchingFrom, setFetchingFrom] = useState(false);
  const [fetchingTo, setFetchingTo] = useState(false);
  const fromDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Separate transition history
  const [transitionHistory, setTransitionHistory] = useState<Array<{ from: string; to: string; timestamp: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('cs_transition_history') || '[]'); } catch { return []; }
  });
  const [showTransitionHistory, setShowTransitionHistory] = useState(false);

  // AI suggestions for "from" field
  useEffect(() => {
    if (!fromFocused || fromCareer.length < 2) { setFromSuggestions([]); return; }
    if (fromDebounce.current) clearTimeout(fromDebounce.current);
    if (hasApiKey()) {
      fromDebounce.current = setTimeout(async () => {
        setFetchingFrom(true);
        try { const r = await getJobSuggestions(fromCareer.trim()); setFromSuggestions(r); }
        catch { setFromSuggestions([]); }
        finally { setFetchingFrom(false); }
      }, 350);
    } else {
      const q = fromCareer.toLowerCase();
      setFromSuggestions(JOB_TITLES.filter(t => t.toLowerCase().includes(q)).slice(0, 5));
    }
    return () => { if (fromDebounce.current) clearTimeout(fromDebounce.current); setFetchingFrom(false); };
  }, [fromCareer, fromFocused]);

  // AI suggestions for "to" field
  useEffect(() => {
    if (!toFocused || toCareer.length < 2) { setToSuggestions([]); return; }
    if (toDebounce.current) clearTimeout(toDebounce.current);
    if (hasApiKey()) {
      toDebounce.current = setTimeout(async () => {
        setFetchingTo(true);
        try { const r = await getJobSuggestions(toCareer.trim()); setToSuggestions(r); }
        catch { setToSuggestions([]); }
        finally { setFetchingTo(false); }
      }, 350);
    } else {
      const q = toCareer.toLowerCase();
      setToSuggestions(JOB_TITLES.filter(t => t.toLowerCase().includes(q)).slice(0, 5));
    }
    return () => { if (toDebounce.current) clearTimeout(toDebounce.current); setFetchingTo(false); };
  }, [toCareer, toFocused]);

  // Abort in-flight request on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-generate if both params are prefilled from URL
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Save to transition history
      setTransitionHistory(prev => {
        const filtered = prev.filter(h => !(h.from === fromCareer.trim() && h.to === toCareer.trim()));
        const updated = [{ from: fromCareer.trim(), to: toCareer.trim(), timestamp: Date.now() }, ...filtered].slice(0, 10);
        localStorage.setItem('cs_transition_history', JSON.stringify(updated));
        return updated;
      });
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
          {transitionHistory.length > 0 && (
            <button
              onClick={() => setShowTransitionHistory(true)}
              className="mt-3 inline-flex items-center gap-1.5 font-[Inter] text-black/35 dark:text-white/35 hover:text-black/60 dark:hover:text-white/60 border border-black/10 dark:border-white/10 px-3 py-1.5 hover:border-black/25 transition-all"
              style={{ fontSize: '0.72rem' }}
            >
              <Clock size={11} />
              Recent Transitions ({transitionHistory.length})
            </button>
          )}
        </motion.div>

        {/* Input Form */}
        <motion.div
          className="border-2 border-black/10 dark:border-white/10 p-6 mb-8 bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="relative">
              <label className="block font-[Inter] text-black/40 dark:text-white/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                Current Career
              </label>
              <input
                value={fromCareer}
                onChange={e => setFromCareer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setFromFocused(false); handleGenerate(); }
                  if (e.key === 'Escape') setFromFocused(false);
                }}
                onFocus={() => setFromFocused(true)}
                onBlur={() => setTimeout(() => setFromFocused(false), 150)}
                placeholder="e.g. Software Engineer"
                className="w-full border border-black/15 dark:border-white/15 bg-transparent px-4 py-3 font-[Inter] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
              {(fromSuggestions.length > 0 || fetchingFrom) && fromFocused && (
                <div className="absolute top-full left-0 right-0 z-20 border border-black/15 dark:border-white/15 bg-card shadow-md max-h-48 overflow-y-auto">
                  {fetchingFrom && fromSuggestions.length === 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 text-black/35 font-[Inter]" style={{ fontSize: '0.8rem' }}>
                      <Loader2 size={12} className="animate-spin" /> Finding careers...
                    </div>
                  )}
                  {fromSuggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setFromCareer(s); setFromFocused(false); }}
                      className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight size={20} className="text-black/20 dark:text-white/20" />
            </div>

            <div className="relative">
              <label className="block font-[Inter] text-black/40 dark:text-white/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                Target Career
              </label>
              <input
                value={toCareer}
                onChange={e => setToCareer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setToFocused(false); handleGenerate(); }
                  if (e.key === 'Escape') setToFocused(false);
                }}
                onFocus={() => setToFocused(true)}
                onBlur={() => setTimeout(() => setToFocused(false), 150)}
                placeholder="e.g. Product Manager"
                className="w-full border border-black/15 dark:border-white/15 bg-transparent px-4 py-3 font-[Inter] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
              {(toSuggestions.length > 0 || fetchingTo) && toFocused && (
                <div className="absolute top-full left-0 right-0 z-20 border border-black/15 dark:border-white/15 bg-card shadow-md max-h-48 overflow-y-auto">
                  {fetchingTo && toSuggestions.length === 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 text-black/35 font-[Inter]" style={{ fontSize: '0.8rem' }}>
                      <Loader2 size={12} className="animate-spin" /> Finding careers...
                    </div>
                  )}
                  {toSuggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setToCareer(s); setToFocused(false); }}
                      className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
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
                <div className="border-l-2 border-black/20 dark:border-white/20 pl-5 py-2 mb-6">
                  <p className="font-[Inter] text-black/40 dark:text-white/40 mb-1 uppercase tracking-[0.1em]" style={{ fontSize: '0.6rem' }}>
                    Real World Example
                  </p>
                  <p className="font-[Inter] text-black/60 dark:text-white/60 italic" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
                    "{plan.successStory}"
                  </p>
                </div>
              )}

              {/* Real stories section */}
              <div className="border border-black/10 dark:border-white/10 p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <ExternalLink size={14} className="text-black/40 dark:text-white/40" />
                  <p className="font-[Inter] text-black/40 dark:text-white/40 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                    Real People Who Made This Transition
                  </p>
                </div>
                <p className="font-[Inter] text-black/50 dark:text-white/50 mb-4" style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                  Read firsthand accounts from people who transitioned from {plan.fromTitle} to {plan.toTitle}.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://www.reddit.com/search/?q=${encodeURIComponent(`${plan.fromTitle} to ${plan.toTitle} career change transition`)}&type=link`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  >
                    <span className="text-orange-600 font-bold" style={{ fontSize: '1rem' }}>r/</span>
                    <div>
                      <p className="font-[Inter] text-orange-800 dark:text-orange-300 font-medium" style={{ fontSize: '0.82rem' }}>Reddit Stories</p>
                      <p className="font-[Inter] text-orange-600/70 dark:text-orange-400/70" style={{ fontSize: '0.72rem' }}>r/cscareerquestions, r/learnprogramming &amp; more</p>
                    </div>
                    <ExternalLink size={11} className="text-orange-500 ml-auto shrink-0" />
                  </a>
                  <a
                    href={`https://www.reddit.com/search/?q=${encodeURIComponent(`I transitioned from ${plan.fromTitle} to ${plan.toTitle}`)}&type=link`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  >
                    <span className="text-orange-600 font-bold" style={{ fontSize: '1rem' }}>r/</span>
                    <div>
                      <p className="font-[Inter] text-orange-800 dark:text-orange-300 font-medium" style={{ fontSize: '0.82rem' }}>"I did it" Posts</p>
                      <p className="font-[Inter] text-orange-600/70 dark:text-orange-400/70" style={{ fontSize: '0.72rem' }}>Personal transition success stories</p>
                    </div>
                    <ExternalLink size={11} className="text-orange-500 ml-auto shrink-0" />
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`"${plan.fromTitle}" to "${plan.toTitle}" career transition story experience`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-blue-600 font-bold" style={{ fontSize: '0.9rem' }}>G</span>
                    <div>
                      <p className="font-[Inter] text-blue-800 dark:text-blue-300 font-medium" style={{ fontSize: '0.82rem' }}>Articles &amp; Blog Posts</p>
                      <p className="font-[Inter] text-blue-600/70 dark:text-blue-400/70" style={{ fontSize: '0.72rem' }}>Medium, Dev.to, LinkedIn articles</p>
                    </div>
                    <ExternalLink size={11} className="text-blue-500 ml-auto shrink-0" />
                  </a>
                  <a
                    href={`https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(`${plan.fromTitle} to ${plan.toTitle} transition`)}&origin=GLOBAL_SEARCH_HEADER`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-blue-700 font-bold" style={{ fontSize: '0.9rem', fontFamily: 'sans-serif' }}>in</span>
                    <div>
                      <p className="font-[Inter] text-blue-800 dark:text-blue-300 font-medium" style={{ fontSize: '0.82rem' }}>LinkedIn Posts</p>
                      <p className="font-[Inter] text-blue-600/70 dark:text-blue-400/70" style={{ fontSize: '0.72rem' }}>Real professionals sharing their journey</p>
                    </div>
                    <ExternalLink size={11} className="text-blue-500 ml-auto shrink-0" />
                  </a>
                </div>
              </div>

              {/* Stick figure */}
              <div className="flex justify-center py-4">
                <StickFigure pose="celebrating" size={56} animate={false} />
              </div>

              {/* PDF + Share */}
              <div className="flex items-center justify-center gap-3 pb-4">
                <motion.button
                  onClick={() => { downloadTransitionPDF(plan); toast.success('Downloading transition PDF…'); }}
                  className="flex items-center gap-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 px-3 py-1.5 hover:border-black/25 dark:hover:border-white/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Download size={12} />
                  Download PDF
                </motion.button>
                <motion.button
                  onClick={() => {
                    const url = `${window.location.origin}/career-transition?from=${encodeURIComponent(plan.fromTitle)}&to=${encodeURIComponent(plan.toTitle)}`;
                    navigator.clipboard.writeText(url).then(() => toast.success('Transition link copied!')).catch(() => toast.error('Could not copy link'));
                  }}
                  className="flex items-center gap-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 px-3 py-1.5 hover:border-black/25 dark:hover:border-white/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Share2 size={12} />
                  Share
                </motion.button>
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

      {/* Transition History Modal */}
      <AnimatePresence>
        {showTransitionHistory && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowTransitionHistory(false)} />
            <motion.div
              className="relative bg-white dark:bg-[#1a1a18] border-2 border-black/20 dark:border-white/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] w-full max-w-sm mx-4 max-h-[60vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-[Playfair_Display] text-black dark:text-white" style={{ fontSize: '1.05rem' }}>Recent Transitions</h3>
                <button onClick={() => setShowTransitionHistory(false)} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {transitionHistory.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFromCareer(item.from);
                      setToCareer(item.to);
                      setShowTransitionHistory(false);
                    }}
                    className="w-full text-left p-3 border border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-[Inter] text-black/70 dark:text-white/70" style={{ fontSize: '0.85rem' }}>{item.from}</span>
                      <ArrowRight size={12} className="text-black/25 dark:text-white/25 shrink-0" />
                      <span className="font-[Inter] text-black/70 dark:text-white/70" style={{ fontSize: '0.85rem' }}>{item.to}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showApiModal && <ApiKeyModal isOpen={showApiModal} onClose={() => setShowApiModal(false)} onKeySet={() => setShowApiModal(false)} />}
    </div>
  );
}
