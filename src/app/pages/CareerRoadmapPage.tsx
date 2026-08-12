import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Loader2, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, Download, Share2, Clock, X, Zap, Pencil, ArrowRight } from 'lucide-react';
import { getCareerRoadmap, getQuickDescription, type CareerRoadmap, getJobSuggestions } from '../services/ai';
import { StickFigure } from '../components/StickFigure';
import { AskAIPanel } from '../components/AskAIPanel';
import { downloadRoadmapPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';
import { JOB_TITLES } from '../data/jobs';
import { TextReveal } from '../motion/TextReveal';

const STAGE_COLORS: Record<string, { dot: string; bg: string; border: string }> = {
  blue:   { dot: 'bg-violet-500',  bg: 'bg-violet-50',  border: 'border-violet-200' },
  green:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  yellow: { dot: 'bg-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  orange: { dot: 'bg-orange-400',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  red:    { dot: 'bg-rose-500',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  purple: { dot: 'bg-violet-400',  bg: 'bg-violet-50',  border: 'border-violet-200' },
};

export function CareerRoadmapPage() {
  const [searchParams] = useSearchParams();

  const [jobTitle, setJobTitle] = useState(() => searchParams.get('job') || '');
  const [description, setDescription] = useState('');
  const [descLoading, setDescLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDescription = useCallback(async (title: string) => {
    if (!title.trim()) return;
    setDescLoading(true);
    setDescription('');
    try {
      const desc = await getQuickDescription(title.trim());
      setDescription(desc);
    } catch { /* silent — user can type manually */ }
    finally { setDescLoading(false); }
  }, []);

  const [expandedStage, setExpandedStage] = useState<number | null>(0);
  const abortRef = useRef<AbortController | null>(null);

  const [inputFocused, setInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Roadmap history
  const [roadmapHistory, setRoadmapHistory] = useState<{ title: string; date: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('cs_roadmap_history') || '[]'); } catch { return []; }
  });
  const [showRoadmapHistory, setShowRoadmapHistory] = useState(false);

  // AI-powered suggestions
  useEffect(() => {
    if (!inputFocused || !jobTitle.trim()) { setSuggestions([]); return; }
    clearTimeout(suggestDebounce.current!);
    // Quick local filter first
    const local = JOB_TITLES.filter(t => t.toLowerCase().includes(jobTitle.toLowerCase())).slice(0, 6);
    setSuggestions(local);
    // Then AI suggestions
    suggestDebounce.current = setTimeout(async () => {
      setFetchingSuggestions(true);
      try {
        const ai = await getJobSuggestions(jobTitle.trim());
        if (ai.length) setSuggestions(ai);
      } catch { /* ignore */ }
      setFetchingSuggestions(false);
    }, 350);
    return () => { clearTimeout(suggestDebounce.current!); setFetchingSuggestions(false); };
  }, [jobTitle, inputFocused]);

  // Abort in-flight request on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-generate if job param was passed from dossier
  useEffect(() => {
    if (searchParams.get('job')) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!jobTitle.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setRoadmap(null);

    try {
      const result = await getCareerRoadmap(jobTitle.trim(), abortRef.current.signal, description.trim() || undefined);
      setRoadmap(result);
      // Save to roadmap history
      const entry = { title: jobTitle.trim(), date: new Date().toISOString() };
      setRoadmapHistory(prev => {
        const updated = [entry, ...prev.filter(h => h.title.toLowerCase() !== jobTitle.trim().toLowerCase())].slice(0, 10);
        localStorage.setItem('cs_roadmap_history', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Failed to generate roadmap.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editorial-workflow min-h-screen bg-[var(--paper)] pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-6 border-l-4 border-black bg-white p-4 font-[Inter] text-sm">Want this grounded in your evidence, constraints and segment lens? <Link to="/recommendations" className="font-semibold underline">Open your Career Landscape</Link> and build a deterministic Pathway plan.</div>
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Map size={22} className="text-black/40" />
            <p className="font-[Inter] text-black/35 uppercase tracking-[0.15em]" style={{ fontSize: '0.65rem' }}>
              Feature
            </p>
          </div>
          <h1 className="font-display text-black leading-tight mb-3"><TextReveal text="Career Roadmap Builder" /></h1>
          <p className="font-[Inter] text-black/50" style={{ fontSize: '0.9rem' }}>
            Visualise your complete career journey from entry-level to expert — including milestones, salary progression, and key decision points.
          </p>
          {roadmapHistory.length > 0 && (
            <button
              onClick={() => setShowRoadmapHistory(true)}
              className="mt-4 flex items-center gap-1.5 text-black/35 hover:text-black transition-colors font-[Inter]"
              style={{ fontSize: '0.75rem' }}
            >
              <Clock size={12} />
              Recent Roadmaps ({roadmapHistory.length})
            </button>
          )}
        </motion.div>

        {/* Input */}
        <motion.div
          className="border-2 border-black/10 p-6 mb-8 bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block font-[Inter] text-black/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
            Career / Job Title
          </label>
          <div className="relative">
            <input
              value={jobTitle}
              onChange={e => { setJobTitle(e.target.value); setDescription(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setInputFocused(false); fetchDescription(jobTitle); }
                if (e.key === 'Escape') setInputFocused(false);
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setTimeout(() => setInputFocused(false), 150); if (jobTitle.trim()) fetchDescription(jobTitle.trim()); }}
              placeholder="e.g. Data Scientist"
              className="w-full border border-black/15 bg-transparent px-4 py-3 font-[Inter] text-black placeholder:text-black/25 outline-none focus:border-black/40 transition-colors"
              style={{ fontSize: '0.92rem' }}
            />
            {inputFocused && (suggestions.length > 0 || (fetchingSuggestions && suggestions.length === 0)) && (
              <div className="absolute top-full left-0 right-0 z-20 border border-black/15 bg-card shadow-md max-h-48 overflow-y-auto">
                {fetchingSuggestions && suggestions.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 text-black/40">
                    <Loader2 size={13} className="animate-spin" />
                    <span className="font-[Inter]" style={{ fontSize: '0.82rem' }}>Finding suggestions…</span>
                  </div>
                )}
                {suggestions.map(s => (
                  <button
                    key={s}
                    onMouseDown={() => { setJobTitle(s); setInputFocused(false); fetchDescription(s); }}
                    className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 hover:bg-black/5 transition-colors border-b border-black/5 last:border-0"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description step — auto-generated, editable */}
          {jobTitle.trim() && (descLoading || description) && (
            <div className="mt-5 pt-4 border-t border-black/8">
              <div className="flex items-center justify-between mb-2">
                <label className="font-[Inter] text-black/35 uppercase tracking-[0.1em]" style={{ fontSize: '0.6rem' }}>
                  <Pencil size={9} className="inline mr-1 opacity-60" />
                  Your context <span className="normal-case tracking-normal text-black/25">(edit to tailor results to your situation)</span>
                </label>
                {descLoading && <Loader2 size={11} className="animate-spin text-black/25 shrink-0" />}
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={descLoading ? 'Auto-generating…' : 'Describe your specific version of this role…'}
                rows={2}
                disabled={descLoading}
                className="w-full border border-black/10 bg-transparent px-3 py-2.5 font-[Inter] text-black/70 placeholder:text-black/20 outline-none focus:border-black/30 transition-colors resize-none disabled:opacity-40"
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          )}

          {/* Generate button */}
          <div className="mt-4 flex items-center gap-4">
            <motion.button
              onClick={handleGenerate}
              disabled={!jobTitle.trim() || loading}
              className="flex items-center gap-2 bg-black text-white px-5 py-3 font-[Inter] hover:bg-black/80 disabled:opacity-40 transition-colors"
              style={{ fontSize: '0.85rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Map size={15} />}
              {loading ? 'Building…' : 'Build Roadmap'}
            </motion.button>
            {descLoading && !loading && (
              <span className="font-[Inter] text-black/30 text-xs">Generating context…</span>
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
        {loading && !roadmap && (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i, idx) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-black/10 animate-pulse mt-6" />
                  {idx < 4 && <div className="w-0.5 h-16 bg-black/8" />}
                </div>
                <div className="flex-1 border border-black/8 p-4 mb-3 animate-pulse">
                  <div className="h-4 bg-black/8 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-black/5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Roadmap timeline */}
        <AnimatePresence>
          {roadmap && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Title bar */}
              <div className="border-b-2 border-black/15 pb-4 mb-6">
                <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.5rem' }}>
                  {roadmap.title} Roadmap
                </h2>
                <p className="font-[Inter] text-black/40 mt-1" style={{ fontSize: '0.8rem' }}>
                  {roadmap.totalYears}
                </p>
              </div>

              {/* Vertical timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[1.4rem] top-6 bottom-6 w-0.5 bg-black/8" />

                <div className="space-y-3">
                  {roadmap.stages.map((stage, i) => {
                    const colors = STAGE_COLORS[stage.color] || STAGE_COLORS.blue;
                    const isExpanded = expandedStage === i;

                    return (
                      <motion.div
                        key={i}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        {/* Dot */}
                        <div className="flex flex-col items-center shrink-0 pt-5">
                          <div className={`w-4 h-4 rounded-full ${colors.dot} ring-4 ring-background z-10`} />
                        </div>

                        {/* Card */}
                        <div className={`flex-1 border ${colors.border} ${colors.bg} mb-1`}>
                          <button
                            onClick={() => { setExpandedStage(isExpanded ? null : i); isExpanded ? sounds.collapse() : sounds.expand(); }}
                            className="w-full flex items-center justify-between p-4 text-left"
                            aria-expanded={isExpanded}
                          >
                            <div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className="font-[Playfair_Display] text-black" style={{ fontSize: '1rem' }}>
                                  {stage.stage}
                                </p>
                                <span className="font-[Inter] text-black/35" style={{ fontSize: '0.7rem' }}>
                                  {stage.yearsRange}
                                </span>
                              </div>
                              <p className="font-[Inter] text-black/55 mt-0.5" style={{ fontSize: '0.82rem' }}>
                                {stage.role}
                              </p>
                              <p className="font-[Inter] text-black/40 mt-0.5" style={{ fontSize: '0.75rem' }}>
                                {stage.salary}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp size={15} className="text-black/30 shrink-0 ml-3" />
                            ) : (
                              <ChevronDown size={15} className="text-black/30 shrink-0 ml-3" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 border-t border-black/8 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="font-[Inter] text-black/30 mb-2 uppercase tracking-[0.08em]" style={{ fontSize: '0.6rem' }}>
                                      Milestones
                                    </p>
                                    <ul className="space-y-1.5">
                                      {stage.milestones.map((m, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                          <TrendingUp size={11} className="text-black/25 mt-1 shrink-0" />
                                          <span className="font-[Inter] text-black/60" style={{ fontSize: '0.8rem' }}>{m}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="font-[Inter] text-black/30 mb-2 uppercase tracking-[0.08em]" style={{ fontSize: '0.6rem' }}>
                                      Skills to Acquire
                                    </p>
                                    <ul className="space-y-1.5">
                                      {stage.skills.map((s, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                          <span className="text-black/25 mt-0.5">+</span>
                                          <span className="font-[Inter] text-black/60" style={{ fontSize: '0.8rem' }}>{s}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Key decisions */}
              {roadmap.keyDecisions && roadmap.keyDecisions.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-[Playfair_Display] text-black mb-4" style={{ fontSize: '1.1rem' }}>
                    Key Career Decisions
                  </h3>
                  <div className="space-y-3">
                    {roadmap.keyDecisions.map((kd, i) => (
                      <div key={i} className="border border-black/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-black/8 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="font-[Inter] text-black/40" style={{ fontSize: '0.65rem' }}>{i + 1}</span>
                          </div>
                          <div>
                            <p className="font-[Inter] text-black font-medium mb-1" style={{ fontSize: '0.88rem' }}>
                              {kd.decision}
                            </p>
                            <p className="font-[Inter] text-black/40 mb-1" style={{ fontSize: '0.75rem' }}>
                              {kd.timing}
                            </p>
                            <p className="font-[Inter] text-black/55" style={{ fontSize: '0.82rem' }}>
                              {kd.impact}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry outlook */}
              {roadmap.industryOutlook && (
                <div className="mt-6 border-l-2 border-black/20 pl-5 py-2">
                  <p className="font-[Inter] text-black/35 mb-1 uppercase tracking-[0.1em]" style={{ fontSize: '0.6rem' }}>
                    Industry Outlook
                  </p>
                  <p className="font-[Inter] text-black/60" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
                    {roadmap.industryOutlook}
                  </p>
                </div>
              )}

              <div className="flex justify-center py-6">
                <StickFigure pose="celebrating" size={56} animate={false} />
              </div>

              {/* PDF + Share */}
              <div className="flex items-center justify-center gap-3 pb-4">
                <motion.button
                  onClick={() => { downloadRoadmapPDF(roadmap); sounds.download(); toast.success('Downloading roadmap PDF…'); }}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Download size={12} />
                  Download PDF
                </motion.button>
                <motion.button
                  onClick={() => {
                    const url = `${window.location.origin}/roadmap?job=${encodeURIComponent(roadmap.title)}`;
                    navigator.clipboard.writeText(url).then(() => toast.success('Roadmap link copied!')).catch(() => toast.error('Could not copy link'));
                  }}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
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
        {!loading && !roadmap && !error && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <StickFigure pose="thinking" size={72} className="mx-auto mb-5 text-black/20" />
            <p className="font-[Inter] text-black/30" style={{ fontSize: '0.88rem' }}>
              Enter a job title above to build your career roadmap.
            </p>
          </motion.div>
        )}
      </div>

      {/* Roadmap History Modal */}
      <AnimatePresence>
        {showRoadmapHistory && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowRoadmapHistory(false)} />
            <motion.div
              className="relative bg-white border-2 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] w-full max-w-sm mx-4 max-h-[60vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-5 border-b border-black/10 flex items-center justify-between">
                <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.05rem' }}>Recent Roadmaps</h3>
                <button onClick={() => setShowRoadmapHistory(false)} className="text-black/30 hover:text-black transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {roadmapHistory.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setJobTitle(item.title);
                      setShowRoadmapHistory(false);
                    }}
                    className="w-full text-left p-3 border border-black/8 hover:border-black/20 transition-colors"
                  >
                    <p className="font-[Inter] text-black/70" style={{ fontSize: '0.85rem' }}>{item.title}</p>
                    <p className="font-[Inter] text-black/30 mt-0.5" style={{ fontSize: '0.7rem' }}>
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {roadmap && (
        <AskAIPanel
          contextTitle={`${roadmap.title} Roadmap`}
          contextBody={`Career roadmap for ${roadmap.title}.\n\nOutlook: ${roadmap.industryOutlook}\nStages: ${roadmap.stages?.map(stage => stage.stage).join(' → ')}`}
        />
      )}

    </div>
  );
}
