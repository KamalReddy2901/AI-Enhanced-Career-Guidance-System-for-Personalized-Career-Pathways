import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Loader2, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, Download, Share2 } from 'lucide-react';
import { getCareerRoadmap, type CareerRoadmap, hasApiKey } from '../services/ai';
import { StickFigure } from '../components/StickFigure';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { useApp } from '../context/AppContext';
import { downloadRoadmapPDF } from '../utils/pdfExport';
import { toast } from 'sonner';

const STAGE_COLORS: Record<string, { dot: string; bg: string; border: string }> = {
  blue:   { dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800' },
  green:  { dot: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800' },
  yellow: { dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30',border: 'border-yellow-200 dark:border-yellow-800' },
  orange: { dot: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30',border: 'border-orange-200 dark:border-orange-800' },
  red:    { dot: 'bg-red-500',    bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200 dark:border-red-800' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30',border: 'border-purple-200 dark:border-purple-800' },
};

export function CareerRoadmapPage() {
  const [searchParams] = useSearchParams();
  const { history } = useApp();

  const [jobTitle, setJobTitle] = useState(() => searchParams.get('job') || '');
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(0);
  const abortRef = useRef<AbortController | null>(null);

  const [inputFocused, setInputFocused] = useState(false);
  const uniqueTitles = Array.from(new Set(history.map(h => h.jobTitle)));
  const suggestions = inputFocused
    ? uniqueTitles.filter(t => t.toLowerCase().includes(jobTitle.toLowerCase())).slice(0, 6)
    : [];

  // Auto-generate if job param was passed from dossier
  useEffect(() => {
    if (searchParams.get('job')) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!jobTitle.trim()) return;
    if (!hasApiKey()) {
      setShowApiModal(true);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setRoadmap(null);

    try {
      const result = await getCareerRoadmap(jobTitle.trim(), abortRef.current.signal);
      setRoadmap(result);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Failed to generate roadmap.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Map size={22} className="text-black/40 dark:text-white/40" />
            <p className="font-[Inter] text-black/35 dark:text-white/35 uppercase tracking-[0.15em]" style={{ fontSize: '0.65rem' }}>
              Feature
            </p>
          </div>
          <h1 className="font-[Playfair_Display] text-black dark:text-white leading-tight mb-3" style={{ fontSize: '2.4rem' }}>
            Career
            <br />
            <span className="text-black/35 dark:text-white/35">Roadmap Builder</span>
          </h1>
          <p className="font-[Inter] text-black/50 dark:text-white/50" style={{ fontSize: '0.9rem' }}>
            Visualise your complete career journey from entry-level to expert — including milestones, salary progression, and key decision points.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          className="border-2 border-black/10 dark:border-white/10 p-6 mb-8 bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block font-[Inter] text-black/40 dark:text-white/40 mb-2 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>
            Career / Job Title
          </label>
          <div className="flex gap-3 relative">
            <div className="flex-1 relative">
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setInputFocused(false); handleGenerate(); }
                  if (e.key === 'Escape') setInputFocused(false);
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                placeholder="e.g. Data Scientist"
                className="w-full border border-black/15 dark:border-white/15 bg-transparent px-4 py-3 font-[Inter] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors"
                style={{ fontSize: '0.92rem' }}
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 border border-black/15 dark:border-white/15 bg-card shadow-md">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => { setJobTitle(s); setInputFocused(false); }}
                      className="w-full text-left px-4 py-2.5 font-[Inter] text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <motion.button
              onClick={handleGenerate}
              disabled={!jobTitle.trim() || loading}
              className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-3 font-[Inter] hover:bg-black/80 dark:hover:bg-white/80 disabled:opacity-40 transition-colors shrink-0"
              style={{ fontSize: '0.85rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Map size={15} />}
              {loading ? 'Building…' : 'Build Roadmap'}
            </motion.button>
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
        {loading && !roadmap && (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i, idx) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 animate-pulse mt-6" />
                  {idx < 4 && <div className="w-0.5 h-16 bg-black/8 dark:bg-white/8" />}
                </div>
                <div className="flex-1 border border-black/8 dark:border-white/8 p-4 mb-3 animate-pulse">
                  <div className="h-4 bg-black/8 dark:bg-white/8 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-2/3" />
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
              <div className="border-b-2 border-black/15 dark:border-white/15 pb-4 mb-6">
                <h2 className="font-[Playfair_Display] text-black dark:text-white" style={{ fontSize: '1.5rem' }}>
                  {roadmap.title} Roadmap
                </h2>
                <p className="font-[Inter] text-black/40 dark:text-white/40 mt-1" style={{ fontSize: '0.8rem' }}>
                  {roadmap.totalYears}
                </p>
              </div>

              {/* Vertical timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[1.4rem] top-6 bottom-6 w-0.5 bg-black/8 dark:bg-white/8" />

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
                            onClick={() => setExpandedStage(isExpanded ? null : i)}
                            className="w-full flex items-center justify-between p-4 text-left"
                            aria-expanded={isExpanded}
                          >
                            <div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className="font-[Playfair_Display] text-black dark:text-white" style={{ fontSize: '1rem' }}>
                                  {stage.stage}
                                </p>
                                <span className="font-[Inter] text-black/35 dark:text-white/35" style={{ fontSize: '0.7rem' }}>
                                  {stage.yearsRange}
                                </span>
                              </div>
                              <p className="font-[Inter] text-black/55 dark:text-white/55 mt-0.5" style={{ fontSize: '0.82rem' }}>
                                {stage.role}
                              </p>
                              <p className="font-[Inter] text-black/40 dark:text-white/40 mt-0.5" style={{ fontSize: '0.75rem' }}>
                                {stage.salary}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp size={15} className="text-black/30 dark:text-white/30 shrink-0 ml-3" />
                            ) : (
                              <ChevronDown size={15} className="text-black/30 dark:text-white/30 shrink-0 ml-3" />
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
                                <div className="px-4 pb-4 border-t border-black/8 dark:border-white/8 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="font-[Inter] text-black/30 dark:text-white/30 mb-2 uppercase tracking-[0.08em]" style={{ fontSize: '0.6rem' }}>
                                      Milestones
                                    </p>
                                    <ul className="space-y-1.5">
                                      {stage.milestones.map((m, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                          <TrendingUp size={11} className="text-black/25 dark:text-white/25 mt-1 shrink-0" />
                                          <span className="font-[Inter] text-black/60 dark:text-white/60" style={{ fontSize: '0.8rem' }}>{m}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="font-[Inter] text-black/30 dark:text-white/30 mb-2 uppercase tracking-[0.08em]" style={{ fontSize: '0.6rem' }}>
                                      Skills to Acquire
                                    </p>
                                    <ul className="space-y-1.5">
                                      {stage.skills.map((s, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                          <span className="text-black/25 dark:text-white/25 mt-0.5">+</span>
                                          <span className="font-[Inter] text-black/60 dark:text-white/60" style={{ fontSize: '0.8rem' }}>{s}</span>
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
                  <h3 className="font-[Playfair_Display] text-black dark:text-white mb-4" style={{ fontSize: '1.1rem' }}>
                    Key Career Decisions
                  </h3>
                  <div className="space-y-3">
                    {roadmap.keyDecisions.map((kd, i) => (
                      <div key={i} className="border border-black/10 dark:border-white/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-black/8 dark:bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="font-[Inter] text-black/40 dark:text-white/40" style={{ fontSize: '0.65rem' }}>{i + 1}</span>
                          </div>
                          <div>
                            <p className="font-[Inter] text-black dark:text-white font-medium mb-1" style={{ fontSize: '0.88rem' }}>
                              {kd.decision}
                            </p>
                            <p className="font-[Inter] text-black/40 dark:text-white/40 mb-1" style={{ fontSize: '0.75rem' }}>
                              {kd.timing}
                            </p>
                            <p className="font-[Inter] text-black/55 dark:text-white/55" style={{ fontSize: '0.82rem' }}>
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
                <div className="mt-6 border-l-2 border-black/20 dark:border-white/20 pl-5 py-2">
                  <p className="font-[Inter] text-black/35 dark:text-white/35 mb-1 uppercase tracking-[0.1em]" style={{ fontSize: '0.6rem' }}>
                    Industry Outlook
                  </p>
                  <p className="font-[Inter] text-black/60 dark:text-white/60" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
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
                  onClick={() => { downloadRoadmapPDF(roadmap); toast.success('Downloading roadmap PDF…'); }}
                  className="flex items-center gap-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 px-3 py-1.5 hover:border-black/25 dark:hover:border-white/25 transition-all font-[Inter]"
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
        {!loading && !roadmap && !error && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <StickFigure pose="thinking" size={72} className="mx-auto mb-5 text-black/20 dark:text-white/20" />
            <p className="font-[Inter] text-black/30 dark:text-white/30" style={{ fontSize: '0.88rem' }}>
              Enter a job title above to build your career roadmap.
            </p>
          </motion.div>
        )}
      </div>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </div>
  );
}
