import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, ArrowLeftRight, ExternalLink, Download, Share2, Clock, X, Zap, Pencil } from 'lucide-react';
import { getCareerTransition, getQuickDescription, getJobSuggestions, type CareerTransitionPlan } from '../services/ai';
import { useAuth } from '../context/AuthContext';
import { JOB_TITLES } from '../data/jobs';
import { StickFigure } from '../components/StickFigure';
import { AskAIPanel } from '../components/AskAIPanel';
import { downloadTransitionPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Hard: 'text-orange-600 bg-orange-50 border-orange-200',
  'Very Hard': 'text-rose-700 bg-rose-50 border-rose-200',
};

export function CareerTransitionPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [fromCareer, setFromCareer] = useState(() => searchParams.get('from') || '');
  const [toCareer, setToCareer] = useState(() => searchParams.get('to') || '');
  const [fromDesc, setFromDesc] = useState('');
  const [toDesc, setToDesc] = useState('');
  const [fromDescLoading, setFromDescLoading] = useState(false);
  const [toDescLoading, setToDescLoading] = useState(false);
  const [plan, setPlan] = useState<CareerTransitionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromDesc = useCallback(async (title: string) => {
    if (!title.trim()) return;
    setFromDescLoading(true); setFromDesc('');
    try { setFromDesc(await getQuickDescription(title.trim())); } catch { /* silent */ }
    finally { setFromDescLoading(false); }
  }, []);

  const fetchToDesc = useCallback(async (title: string) => {
    if (!title.trim()) return;
    setToDescLoading(true); setToDesc('');
    try { setToDesc(await getQuickDescription(title.trim())); } catch { /* silent */ }
    finally { setToDescLoading(false); }
  }, []);

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
    fromDebounce.current = setTimeout(async () => {
      setFetchingFrom(true);
      try { const r = await getJobSuggestions(fromCareer.trim()); setFromSuggestions(r); }
      catch { setFromSuggestions([]); }
      finally { setFetchingFrom(false); }
    }, 350);
    return () => { if (fromDebounce.current) clearTimeout(fromDebounce.current); setFetchingFrom(false); };
  }, [fromCareer, fromFocused]);

  // AI suggestions for "to" field
  useEffect(() => {
    if (!toFocused || toCareer.length < 2) { setToSuggestions([]); return; }
    if (toDebounce.current) clearTimeout(toDebounce.current);
    toDebounce.current = setTimeout(async () => {
      setFetchingTo(true);
      try { const r = await getJobSuggestions(toCareer.trim()); setToSuggestions(r); }
      catch { setToSuggestions([]); }
      finally { setFetchingTo(false); }
    }, 350);
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
    // Cancel any existing request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const result = await getCareerTransition(fromCareer.trim(), toCareer.trim(), abortRef.current.signal, fromDesc.trim() || undefined, toDesc.trim() || undefined);
      setPlan(result);
      // Save to transition history
      setTransitionHistory(prev => {
        const filtered = prev.filter(h => !(h.from === fromCareer.trim() && h.to === toCareer.trim()));
        const updated = [{ from: fromCareer.trim(), to: toCareer.trim(), timestamp: Date.now() }, ...filtered].slice(0, 10);
        localStorage.setItem('cs_transition_history', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Failed to generate transition plan.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <StickFigure pose="walking" size={80} className="mx-auto mb-6" />
        <p className="font-[Inter] uppercase tracking-[0.2em] text-black/25 mb-3" style={{ fontSize: '0.63rem' }}>Sign in to unlock</p>
        <h1 className="font-[Playfair_Display] text-black mb-4" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}>
          Career Transition Planner
        </h1>
        <p className="font-[Inter] text-black/50 leading-relaxed mb-8" style={{ fontSize: '0.9rem' }}>
          Already working? Map the exact steps, timeline, and skills to transition from your current role to your dream one.
        </p>
        <Link
          to="/auth?mode=signup"
          className="inline-flex items-center gap-2 bg-black text-white px-7 py-3 font-[Inter] hover:bg-black/80 transition-colors mb-4"
          style={{ fontSize: '0.88rem' }}
        >
          Get Started — It's Free
          <ArrowRight size={15} />
        </Link>
        <p className="font-[Inter] text-black/35" style={{ fontSize: '0.78rem' }}>
          Already have an account?{' '}
          <Link to="/auth?mode=signin" className="underline hover:text-black/60 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-6 border-l-4 border-black bg-white p-4 font-[Inter] text-sm">Want this grounded in your evidence, constraints and segment lens? <Link to="/recommendations" className="font-semibold underline">Open your Career Landscape</Link> and build a deterministic Pathway plan.</div>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <ArrowLeftRight size={22} className="text-black/40" />
            <p className="font-[Inter] text-black/35 uppercase tracking-[0.15em]" style={{ fontSize: '0.65rem' }}>
              Feature
            </p>
          </div>
          <h1 className="font-[Playfair_Display] text-black leading-tight mb-3" style={{ fontSize: '2.4rem' }}>
            Career Transition
            <br />
            <span className="text-black/35">Pathfinder</span>
          </h1>
          <p className="font-[Inter] text-black/50" style={{ fontSize: '0.9rem' }}>
            Enter your current role and your target role to receive a detailed, personalised transition roadmap.
          </p>
          {transitionHistory.length > 0 && (
            <button
              onClick={() => setShowTransitionHistory(true)}
              className="mt-3 inline-flex items-center gap-1.5 font-[Inter] text-black/35 hover:text-black/60 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
              style={{ fontSize: '0.72rem' }}
            >
              <Clock size={11} />
              Recent Transitions ({transitionHistory.length})
            </button>
          )}
        </motion.div>

        {/* Input Form */}
        <motion.div
          className="border-2 border-black/10 p-6 mb-8 bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="relative">
              <label className="block font-[Inter] text-black/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                Current Career
              </label>
              <input
                value={fromCareer}
                onChange={e => { setFromCareer(e.target.value); setFromDesc(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setFromFocused(false); fetchFromDesc(fromCareer.trim()); }
                  if (e.key === 'Escape') setFromFocused(false);
                }}
                onFocus={() => setFromFocused(true)}
                onBlur={() => { setTimeout(() => setFromFocused(false), 150); if (fromCareer.trim()) fetchFromDesc(fromCareer.trim()); }}
                placeholder="e.g. Software Engineer"
                className="w-full border border-black/15 bg-transparent px-4 py-3 font-[Inter] text-black placeholder:text-black/25 outline-none focus:border-black/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
              {(fromSuggestions.length > 0 || fetchingFrom) && fromFocused && (
                <div className="absolute top-full left-0 right-0 z-20 border border-black/15 bg-card shadow-md max-h-48 overflow-y-auto">
                  {fetchingFrom && fromSuggestions.length === 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 text-black/35 font-[Inter]" style={{ fontSize: '0.8rem' }}>
                      <Loader2 size={12} className="animate-spin" /> Finding careers...
                    </div>
                  )}
                  {fromSuggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setFromCareer(s); setFromFocused(false); fetchFromDesc(s); }}
                      className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 hover:bg-black/5 transition-colors border-b border-black/5 last:border-0"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  const temp = fromCareer; setFromCareer(toCareer); setToCareer(temp);
                  const tempD = fromDesc; setFromDesc(toDesc); setToDesc(tempD);
                  sounds.click();
                }}
                className="p-2 text-black/20 hover:text-black/50 hover:bg-black/5 transition-all rounded-full"
                title="Swap careers"
                aria-label="Swap from and to careers"
              >
                <ArrowLeftRight size={20} />
              </button>
            </div>

            <div className="relative">
              <label className="block font-[Inter] text-black/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
                Target Career
              </label>
              <input
                value={toCareer}
                onChange={e => { setToCareer(e.target.value); setToDesc(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setToFocused(false); fetchToDesc(toCareer.trim()); }
                  if (e.key === 'Escape') setToFocused(false);
                }}
                onFocus={() => setToFocused(true)}
                onBlur={() => { setTimeout(() => setToFocused(false), 150); if (toCareer.trim()) fetchToDesc(toCareer.trim()); }}
                placeholder="e.g. Product Manager"
                className="w-full border border-black/15 bg-transparent px-4 py-3 font-[Inter] text-black placeholder:text-black/25 outline-none focus:border-black/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
              {(toSuggestions.length > 0 || fetchingTo) && toFocused && (
                <div className="absolute top-full left-0 right-0 z-20 border border-black/15 bg-card shadow-md max-h-48 overflow-y-auto">
                  {fetchingTo && toSuggestions.length === 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 text-black/35 font-[Inter]" style={{ fontSize: '0.8rem' }}>
                      <Loader2 size={12} className="animate-spin" /> Finding careers...
                    </div>
                  )}
                  {toSuggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setToCareer(s); setToFocused(false); fetchToDesc(s); }}
                      className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 hover:bg-black/5 transition-colors border-b border-black/5 last:border-0"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description step — auto-generated, editable */}
          {(fromCareer.trim() || toCareer.trim()) && (fromDescLoading || fromDesc || toDescLoading || toDesc) && (
            <div className="mt-5 pt-4 border-t border-black/8">
              <p className="font-[Inter] text-black/35 uppercase tracking-[0.1em] mb-3 flex items-center gap-1.5" style={{ fontSize: '0.6rem' }}>
                <Pencil size={9} className="opacity-60" />
                Your context <span className="normal-case tracking-normal text-black/25">(edit to tailor results)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fromCareer.trim() && (
                  <div>
                    <label className="block font-[Inter] text-black/30 mb-1" style={{ fontSize: '0.68rem' }}>{fromCareer}</label>
                    <div className="relative">
                      <textarea
                        value={fromDesc}
                        onChange={e => setFromDesc(e.target.value)}
                        placeholder={fromDescLoading ? 'Auto-generating…' : 'Describe your current role…'}
                        rows={3}
                        disabled={fromDescLoading}
                        className="w-full border border-black/10 bg-transparent px-3 py-2 font-[Inter] text-black/70 placeholder:text-black/20 outline-none focus:border-black/30 transition-colors resize-none disabled:opacity-40 pr-6"
                        style={{ fontSize: '0.83rem' }}
                      />
                      {fromDescLoading && <Loader2 size={11} className="animate-spin text-black/25 absolute top-2.5 right-2" />}
                    </div>
                  </div>
                )}
                {toCareer.trim() && (
                  <div>
                    <label className="block font-[Inter] text-black/30 mb-1" style={{ fontSize: '0.68rem' }}>{toCareer}</label>
                    <div className="relative">
                      <textarea
                        value={toDesc}
                        onChange={e => setToDesc(e.target.value)}
                        placeholder={toDescLoading ? 'Auto-generating…' : 'Describe your target role…'}
                        rows={3}
                        disabled={toDescLoading}
                        className="w-full border border-black/10 bg-transparent px-3 py-2 font-[Inter] text-black/70 placeholder:text-black/20 outline-none focus:border-black/30 transition-colors resize-none disabled:opacity-40 pr-6"
                        style={{ fontSize: '0.83rem' }}
                      />
                      {toDescLoading && <Loader2 size={11} className="animate-spin text-black/25 absolute top-2.5 right-2" />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-4">
            <motion.button
              onClick={handleGenerate}
              disabled={!fromCareer.trim() || !toCareer.trim() || loading}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 font-[Inter] hover:bg-black/80 disabled:opacity-40 transition-colors"
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
                className="font-[Inter] text-black/35 hover:text-black transition-colors"
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
            )}
          </div>


        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            className="mb-6 p-4 border border-rose-200 bg-rose-50 flex items-start gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="font-[Inter] text-rose-700" style={{ fontSize: '0.85rem' }}>{error}</p>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && !plan && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-black/8 p-5 animate-pulse">
                <div className="h-4 bg-black/8 rounded w-1/4 mb-3" />
                <div className="h-3 bg-black/5 rounded w-3/4 mb-2" />
                <div className="h-3 bg-black/5 rounded w-1/2" />
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
              <div className="border-2 border-black/15 p-6 mb-6 bg-card">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <p className="font-[Inter] text-black/35 mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}>
                      TRANSITION PLAN
                    </p>
                    <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.5rem' }}>
                      {plan.fromTitle} → {plan.toTitle}
                    </h2>
                  </div>
                  <span className={`px-3 py-1 border font-[Inter] text-sm ${DIFFICULTY_COLOR[plan.difficulty] || 'text-black/60 bg-black/5 border-black/10'}`}>
                    {plan.difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="p-3 bg-black/3">
                    <p className="font-[Inter] text-black/35 mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>
                      ESTIMATED TIMEFRAME
                    </p>
                    <p className="font-[Inter] text-black font-medium" style={{ fontSize: '0.9rem' }}>
                      {plan.timeframe}
                    </p>
                  </div>
                  <div className="p-3 bg-black/3">
                    <p className="font-[Inter] text-black/35 mb-1" style={{ fontSize: '0.62rem', letterSpacing: '0.1em' }}>
                      SALARY IMPACT
                    </p>
                    <p className="font-[Inter] text-black font-medium" style={{ fontSize: '0.9rem' }}>
                      {plan.salaryImpact}
                    </p>
                  </div>
                </div>

                <p className="font-[Inter] text-black/60" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {plan.overview}
                </p>
              </div>

              {/* Skills analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="border border-black/10 p-5">
                  <h3 className="font-[Playfair_Display] text-black mb-3 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                    <CheckCircle size={16} className="text-emerald-600" />
                    Transferable Skills
                  </h3>
                  <ul className="space-y-2">
                    {plan.transferableSkills.map((skill, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        <span className="font-[Inter] text-black/65" style={{ fontSize: '0.85rem' }}>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-black/10 p-5">
                  <h3 className="font-[Playfair_Display] text-black mb-3 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                    <XCircle size={16} className="text-rose-500" />
                    Skill Gaps to Bridge
                  </h3>
                  <ul className="space-y-2">
                    {plan.skillGaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-400 mt-1">•</span>
                        <span className="font-[Inter] text-black/65" style={{ fontSize: '0.85rem' }}>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step-by-step phases */}
              <div className="mb-6">
                <h3 className="font-[Playfair_Display] text-black mb-4" style={{ fontSize: '1.2rem' }}>
                  Your Transition Roadmap
                </h3>
                <div className="space-y-3">
                  {plan.steps.map((step, i) => (
                    <div key={i} className="border border-black/10">
                      <button
                        onClick={() => { setExpandedPhase(expandedPhase === i ? null : i); expandedPhase === i ? sounds.collapse() : sounds.expand(); }}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-black/2 transition-colors"
                        aria-expanded={expandedPhase === i}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 bg-black text-white flex items-center justify-center font-[Inter] font-medium shrink-0" style={{ fontSize: '0.75rem' }}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-[Playfair_Display] text-black" style={{ fontSize: '1rem' }}>{step.phase}</p>
                            <p className="font-[Inter] text-black/35" style={{ fontSize: '0.72rem' }}>{step.duration}</p>
                          </div>
                        </div>
                        {expandedPhase === i ? (
                          <ChevronUp size={16} className="text-black/30 shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-black/30 shrink-0" />
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
                            <div className="px-5 pb-5 border-t border-black/8 pt-4">
                              <ul className="space-y-2">
                                {step.actions.map((action, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <ArrowRight size={13} className="text-black/25 mt-1 shrink-0" />
                                    <span className="font-[Inter] text-black/65" style={{ fontSize: '0.85rem' }}>{action}</span>
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
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-black/10" />
                    <span className="font-[Inter] text-black/40 uppercase tracking-[0.12em]" style={{ fontSize: '0.62rem' }}>
                      Real World Example
                    </span>
                    <div className="h-px flex-1 bg-black/10" />
                  </div>
                  <div className="border-2 border-black/10 p-6 relative overflow-hidden">
                    {/* Decorative quote mark */}
                    <span
                      className="absolute top-3 left-4 font-[Playfair_Display] text-black/6 select-none pointer-events-none"
                      style={{ fontSize: '5rem', lineHeight: 1 }}
                      aria-hidden
                    >
                      &ldquo;
                    </span>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-black/8 flex items-center justify-center">
                          <span className="font-[Inter] text-black/50 font-bold" style={{ fontSize: '0.75rem' }}>
                            {plan.fromTitle.slice(0, 1)}&rarr;{plan.toTitle.slice(0, 1)}
                          </span>
                        </div>
                        <div>
                          <p className="font-[Inter] text-black/55 font-medium" style={{ fontSize: '0.8rem' }}>
                            {plan.fromTitle} → {plan.toTitle}
                          </p>
                          <p className="font-[Inter] text-black/30" style={{ fontSize: '0.65rem' }}>Transition Story</p>
                        </div>
                      </div>
                      <p className="font-[Playfair_Display] text-black/70 leading-relaxed" style={{ fontSize: '1rem', lineHeight: 1.8 }}>
                        {plan.successStory}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Real stories section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="font-[Inter] text-black/40 uppercase tracking-[0.12em]" style={{ fontSize: '0.62rem' }}>
                    Real People Who Made This Transition
                  </span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>
                <p className="font-[Inter] text-black/45 mb-4 text-center" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
                  Firsthand accounts and stories from people who went from{' '}
                  <span className="font-semibold text-black/60">{plan.fromTitle}</span> to{' '}
                  <span className="font-semibold text-black/60">{plan.toTitle}</span>.
                </p>

                {/* Reddit — two cards side by side */}
                <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://www.reddit.com/search/?q=${encodeURIComponent(`${plan.fromTitle} to ${plan.toTitle} career change`)}&type=link&sort=top`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 p-4 border border-[#FF4500]/25 bg-[#FF4500]/5 hover:bg-[#FF4500]/10 transition-colors"
                  >
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#FF4500] text-white font-black rounded-full" style={{ fontSize: '0.85rem' }}>
                      r/
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Inter] font-semibold text-[#c13f00]" style={{ fontSize: '0.82rem' }}>Transition Discussions</p>
                      <p className="font-[Inter] text-[#FF4500]/60" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
                        Top posts about this career change — sorted by most helpful
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-[#FF4500]/50 group-hover:text-[#FF4500] transition-colors mt-0.5 shrink-0" />
                  </a>
                  <a
                    href={`https://www.reddit.com/search/?q=${encodeURIComponent(`"I made the switch" OR "I transitioned" ${plan.fromTitle} ${plan.toTitle}`)}&type=link`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 p-4 border border-[#FF4500]/25 bg-[#FF4500]/5 hover:bg-[#FF4500]/10 transition-colors"
                  >
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#FF4500] text-white font-black rounded-full" style={{ fontSize: '0.85rem' }}>
                      r/
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Inter] font-semibold text-[#c13f00]" style={{ fontSize: '0.82rem' }}>"I Made the Switch" Posts</p>
                      <p className="font-[Inter] text-[#FF4500]/60" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
                        Personal success stories from Redditors who did it
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-[#FF4500]/50 group-hover:text-[#FF4500] transition-colors mt-0.5 shrink-0" />
                  </a>
                </div>

                {/* LinkedIn + YouTube side by side */}
                <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(`${plan.fromTitle} to ${plan.toTitle} career transition`)}&origin=GLOBAL_SEARCH_HEADER`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 p-4 border border-[#0077B5]/25 bg-[#0077B5]/5 hover:bg-[#0077B5]/10 transition-colors"
                  >
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#0077B5] text-white font-black rounded" style={{ fontSize: '1rem', fontFamily: 'sans-serif' }}>
                      in
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Inter] font-semibold text-[#005d8c]" style={{ fontSize: '0.82rem' }}>LinkedIn Posts</p>
                      <p className="font-[Inter] text-[#0077B5]/60" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
                        Professionals sharing their transition journey publicly
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-[#0077B5]/50 group-hover:text-[#0077B5] transition-colors mt-0.5 shrink-0" />
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${plan.fromTitle} to ${plan.toTitle} career change story`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 p-4 border border-[#FF0000]/25 bg-[#FF0000]/5 hover:bg-[#FF0000]/10 transition-colors"
                  >
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#FF0000] text-white rounded" style={{ fontSize: '0.65rem' }}>
                      {/* Simple triangle play icon */}
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Inter] font-semibold text-[#cc0000]" style={{ fontSize: '0.82rem' }}>YouTube Vlogs</p>
                      <p className="font-[Inter] text-[#FF0000]/60" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
                        Video diaries and interviews from real career changers
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-[#FF0000]/50 group-hover:text-[#FF0000] transition-colors mt-0.5 shrink-0" />
                  </a>
                </div>

                {/* Google — full width */}
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`"${plan.fromTitle}" to "${plan.toTitle}" career transition story`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 p-4 border border-black/10 bg-black/3 hover:bg-black/6 transition-colors"
                >
                  <div className="w-9 h-9 shrink-0 flex items-center justify-center border border-black/10 bg-white font-bold text-black" style={{ fontSize: '0.9rem' }}>
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[Inter] font-semibold text-black/65" style={{ fontSize: '0.82rem' }}>Articles &amp; Blogs</p>
                    <p className="font-[Inter] text-black/40" style={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
                      Medium, Dev.to, personal blogs — written deep-dives into this exact transition
                    </p>
                  </div>
                  <ExternalLink size={11} className="text-black/30 group-hover:text-black/60 transition-colors mt-0.5 shrink-0" />
                </a>
              </div>

              {/* Stick figure */}
              <div className="flex justify-center py-4">
                <StickFigure pose="celebrating" size={56} animate={false} />
              </div>

              {/* PDF + Share */}
              <div className="flex items-center justify-center gap-3 pb-4">
                <motion.button
                  onClick={() => { downloadTransitionPDF(plan); sounds.download(); toast.success('Downloading transition PDF…'); }}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
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
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
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
            <StickFigure pose="thinking" size={72} className="mx-auto mb-5 text-black/20" />
            <p className="font-[Inter] text-black/30" style={{ fontSize: '0.88rem' }}>
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
              className="relative bg-white border-2 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] w-full max-w-sm mx-4 max-h-[60vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-5 border-b border-black/10 flex items-center justify-between">
                <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.05rem' }}>Recent Transitions</h3>
                <button onClick={() => setShowTransitionHistory(false)} className="text-black/30 hover:text-black transition-colors">
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
                    className="w-full text-left p-3 border border-black/8 hover:border-black/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-[Inter] text-black/70" style={{ fontSize: '0.85rem' }}>{item.from}</span>
                      <ArrowRight size={12} className="text-black/25 shrink-0" />
                      <span className="font-[Inter] text-black/70" style={{ fontSize: '0.85rem' }}>{item.to}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {plan && (
        <AskAIPanel
          contextTitle={`${plan.fromTitle} → ${plan.toTitle} Transition`}
          contextBody={`Career transition from ${plan.fromTitle} to ${plan.toTitle}.\n\nDifficulty: ${plan.difficulty}\nTimeline: ${plan.timeframe}\nSummary: ${plan.overview}\nTransferable skills: ${plan.transferableSkills?.join(', ')}\nSkill gaps: ${plan.skillGaps?.join(', ')}`}
        />
      )}

    </div>
  );
}
