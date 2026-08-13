import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, ArrowRight, ChevronLeft, Sparkles, Loader2, Zap, Compass, Map, ArrowLeftRight, Brain, Scale } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { MagnifierSearch } from '../components/MagnifierSearch';
import { useApp } from '../context/AppContext';
import { refineJobDescription } from '../services/ai';
import { toast } from 'sonner';
import { TextReveal } from '../motion/TextReveal';
import { ScrollingTitles } from '../components/ScrollingTitles';
import { useGuidance } from '../context/GuidanceContext';

function JobSearchEmptyState() {
  const { searchJobPreliminary, setCurrentJob, setIsSearchAnimating, isSearchAnimating } = useApp();
  const { passport } = useGuidance();
  const navigate = useNavigate();

  const handleSearchComplete = useCallback(async (title: string) => {
    const job = await searchJobPreliminary(title);
    setCurrentJob(job);
    navigate('/job', { replace: true });
  }, [searchJobPreliminary, setCurrentJob, navigate]);

  return (
    <div className="relative min-h-[80vh] overflow-hidden flex flex-col items-center justify-center px-6 py-24" data-testid="job-search-empty-state">
      <ScrollingTitles dimmed />
      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="flex justify-center mb-8">
          <StickFigure pose="searching" size={80} />
        </div>
        <p className="label-caps mb-3 text-[var(--accent-news)]">CareerCase · Explore</p>
        <h1 className="font-display text-4xl leading-snug tracking-tight text-[var(--ink)] mb-3">
          What do you want<br/>to explore?
        </h1>
        <p className="text-sm text-[var(--ink-soft)] mb-10">
          Type any job title — even made-up ones. AI will build a full dossier for you.
        </p>
        <MagnifierSearch
          onSearchComplete={handleSearchComplete}
          isAnimating={isSearchAnimating}
          setIsAnimating={setIsSearchAnimating}
        />
        <div className="mt-8 border-t border-[var(--accent-news)]/45 pt-4 text-left">
          <p className="mb-3 text-center font-mono-ui text-[0.62rem] uppercase tracking-[.14em] text-[var(--accent-news)]">Explore tools</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { label: passport?.experiences[0]?.title ? 'Build from my current job' : 'Roadmap', icon: <Map size={14}/>, path: '/roadmap', note: passport?.experiences[0]?.title ? `${passport.experiences[0].title} → your next move` : 'Choose a destination' },
              { label: 'Transition', icon: <ArrowLeftRight size={14}/>, path: '/career-transition', note: 'Plan a change' },
              { label: 'Compare', icon: <Scale size={14}/>, path: '/compare', note: 'Compare two roles' },
              { label: 'Mood Match', icon: <Zap size={14}/>, path: '/mood', note: 'Explore by energy' },
              { label: 'Career Quiz', icon: <Brain size={14}/>, path: '/quiz', note: 'Find a starting point' },
            ].map(tool => <button key={tool.label} type="button" onClick={() => navigate(tool.path)} className="min-h-[64px] min-w-[124px] flex-1 border border-black/12 bg-[var(--paper)] p-2.5 text-left transition-colors hover:border-[var(--accent-news)] hover:bg-black/[.025] focus-visible:border-[var(--accent-news)]">
              <span className="mb-1.5 flex text-[var(--accent-news)]">{tool.icon}</span><span className="block font-[Inter] text-[.7rem] leading-tight text-black/75">{tool.label}</span><span className="mt-1 block font-[Inter] text-[.6rem] leading-tight text-black/38">{tool.note}</span>
            </button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentJob, setCurrentJob, refinementCount, setRefinementCount, searchJobAI, addToHistory } = useApp();
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [description, setDescription] = useState(currentJob?.shortDescription || '');
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]);
  const isFreshSearch = searchParams.get('fresh') === '1';

  useEffect(() => {
    if (isFreshSearch) setCurrentJob(null);
  }, [isFreshSearch, setCurrentJob]);

  useEffect(() => {
    if (currentJob) {
      setDescription(currentJob.shortDescription);
    }
  }, [currentJob]);

  // Show search state when no career selected (no more silent redirect)
  if (isFreshSearch || !currentJob) return <JobSearchEmptyState />;

  const handleConfirm = async () => {
    if (!currentJob) return;
    // If this is already a full dossier (has fullDescription), go straight to detail
    if (currentJob.fullDescription) {
      addToHistory(currentJob);
      navigate('/job/detail');
      return;
    }
    // Otherwise, generate the full dossier now
    setIsLoadingFull(true);
    const tid = toast.loading(`Building full dossier for “${currentJob.title}”…`);
    try {
      const fullJob = await searchJobAI(currentJob.title, false, description);
      setCurrentJob(fullJob);
      addToHistory(fullJob);
      toast.success('Dossier ready!', { id: tid });
      navigate('/job/detail');
    } catch (error) {
      toast.error('Failed to generate dossier — please try again', { id: tid });
      setIsLoadingFull(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementText.trim() || refinementCount >= 5) return;

    setIsRefining(true);
    setRefinementHistory(prev => [...prev, refinementText]);

    try {
      const refined = await refineJobDescription(
        currentJob.title,
        description,
        refinementText,
        refinementHistory
      );
      toast.success('Description refined by AI');

      setDescription(refined);
      const updatedJob = { ...currentJob, shortDescription: refined };
      setCurrentJob(updatedJob);
      setRefinementCount(refinementCount + 1);
      setRefinementText('');
      setShowRefinement(false);
    } catch (error) {
      console.error('Refinement failed:', error);
      toast.error('AI refinement failed — please try again');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="editorial-article relative min-h-screen overflow-hidden bg-[var(--paper)] pt-20 pb-16">
      <ScrollingTitles dimmed />
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Back button */}
        <motion.button
          onClick={() => { setCurrentJob(null); navigate('/job?fresh=1'); }}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          New Search
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-black/10" />
            <span className="font-[Inter] text-black/30 uppercase tracking-[0.2em]" style={{ fontSize: '0.65rem' }}>
              Case File
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="flex items-start gap-5">
            <StickFigure pose="thinking" size={80} />
            <div className="flex-1">
              <h1 className="font-display text-black mb-1"><TextReveal text={currentJob.title} /></h1>
              <div className="flex items-center gap-2">
                <span className="inline-block font-[Inter] text-black/40 border border-black/10 px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                  {currentJob.category}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Description Card */}
        <motion.div
          className="border-2 border-black/15 p-8 mb-6 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="absolute -top-3 left-6 bg-background px-3">
            <span className="font-[Inter] text-black/40 uppercase tracking-[0.15em]" style={{ fontSize: '0.65rem' }}>
              Preliminary Assessment
            </span>
          </div>

          <p className="font-[Inter] text-black/70 leading-relaxed" style={{ fontSize: '0.95rem' }}>
            {description}
          </p>

          <div className="mt-5 pt-4 border-t border-black/8">
            <p className="font-[Inter] text-black/40 leading-relaxed" style={{ fontSize: '0.8rem' }}>
              <strong className="text-black/50">Important:</strong> This is a preliminary AI assessment. If this description doesn't quite match the specific role you have in mind — perhaps it's a different specialization, industry, or work setting — use the <em>"Not quite right"</em> button below to refine it before generating your full dossier. The more accurately this description reflects your intended role, the better your dossier will be.
            </p>
          </div>

          {refinementHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-black/10">
              <p className="font-[Inter] text-black/30 mb-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Refinement notes ({refinementCount}/5)
              </p>
              {refinementHistory.map((note, i) => (
                <p key={i} className="font-[Inter] text-black/40 italic" style={{ fontSize: '0.8rem' }}>
                  "{note}"
                </p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={handleConfirm}
            disabled={isLoadingFull}
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3.5 px-6 hover:bg-black/85 transition-colors font-[Inter] disabled:bg-black/50"
            style={{ fontSize: '0.88rem' }}
            whileHover={isLoadingFull ? {} : { scale: 1.01 }}
            whileTap={isLoadingFull ? {} : { scale: 0.99 }}
          >
            {isLoadingFull ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading full dossier…
              </>
            ) : (
              <>
                <Check size={18} />
                  Yes, this is the role I’m looking for              </>
            )}
          </motion.button>

          {refinementCount < 5 && !isLoadingFull && (
            <motion.button
              onClick={() => setShowRefinement(!showRefinement)}
              className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3.5 px-6 hover:border-black/40 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
              style={{ fontSize: '0.88rem' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <RefreshCw size={16} />
              Not quite right
            </motion.button>
          )}
        </motion.div>

        {/* Refinement Panel */}
        <AnimatePresence>
          {showRefinement && (
            <motion.div
              className="mt-6 border-2 border-black/10 p-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-4">
                <StickFigure pose="reading" size={56} />
                <div className="flex-1">
                  <h3 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.1rem' }}>
                    Tell us what's different
                  </h3>
                  <p className="font-[Inter] text-black/40 mb-4" style={{ fontSize: '0.8rem' }}>
                    Describe your specific situation - location, work style, specialization, industry, company size - and AI will rewrite the description to match.
                  </p>

                  <textarea
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    placeholder="E.g., 'I'm thinking more about a remote position focused on frontend development at a Series A startup in Austin' or 'This is more of a clinical research role at a university hospital'..."
                    className="w-full border border-black/15 p-4 font-[Inter] text-black/70 placeholder:text-black/25 resize-none outline-none focus:border-black/40 transition-colors"
                    style={{ fontSize: '0.88rem' }}
                    rows={3}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <span className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
                      {5 - refinementCount} refinement{5 - refinementCount !== 1 ? 's' : ''} remaining
                    </span>

                    <motion.button
                      onClick={handleRefine}
                      disabled={!refinementText.trim() || isRefining}
                      className="flex items-center gap-2 bg-black text-white px-5 py-2.5 disabled:bg-black/30 font-[Inter]"
                      style={{ fontSize: '0.82rem' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isRefining ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          >
                            <RefreshCw size={14} />
                          </motion.div>
                          AI Refining...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          <ArrowRight size={14} />
                          Refine Description
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
