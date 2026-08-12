import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FlaskConical, Scale, ChevronDown, FileText, Brain, Swords, Zap, BarChart2, MessageSquare, ArrowRight, ExternalLink, TrendingUp, TrendingDown, Rocket, Loader2, Map, ArrowLeftRight } from 'lucide-react';
import { ScrollingTitles } from '../components/ScrollingTitles';
import { MagnifierSearch } from '../components/MagnifierSearch';
import { StickFigure } from '../components/StickFigure';
import { WhyPanel } from '../components/guidance/WhyPanel';
import { EditorialHomeHero } from '../components/home/EditorialHomeHero';
import type { CareerRecommendation } from '../engine/types';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useGuidance } from '../context/GuidanceContext';
import { occupationById } from '../data/knowledge';
import { getTrendingCareers, type TrendingCareers } from '../services/ai';
import { toast } from 'sonner';

function ScrollSectionNav({ sections }: { sections: Array<{ id: string; label: string }> }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map(s => s.id).join(',')]);

  return (
    <div
      className="fixed right-7 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end print:hidden"
      style={{ gap: '14px' }}
    >
      {sections.map(s => (
        <motion.div
          key={s.id}
          className="flex items-center gap-2.5 group cursor-pointer"
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
          whileHover={{ x: -3 }}
          transition={{ duration: 0.15 }}
        >
          <span
            className={`font-[Inter] uppercase tracking-[0.12em] transition-all duration-200 select-none ${
              activeId === s.id ? 'text-black/60' : 'text-black/0 group-hover:text-black/30'
            }`}
            style={{ fontSize: '0.58rem' }}
          >
            {s.label}
          </span>
          <div
            className={`rounded-full transition-all duration-300 ${
              activeId === s.id
                ? 'w-2 h-2 bg-black'
                : 'w-1.5 h-1.5 bg-black/20 group-hover:bg-black/50'
            }`}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { searchJob, searchJobAI, searchJobPreliminary, setCurrentJob, addToHistory, isSearchAnimating, setIsSearchAnimating, setRefinementCount, setComparisonJob } = useApp();
  const { user, isSupabaseConfigured } = useAuth();
  const { passport, recommendations, recommendationChanges, pathways, dismissRecommendationChanges } = useGuidance();

  const [trending, setTrending] = useState<TrendingCareers | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [searchingCareer, setSearchingCareer] = useState<string | null>(null);
  const [compareQueue, setCompareQueue] = useState<string[]>([]);
  const [homeExplanation, setHomeExplanation] = useState<CareerRecommendation | null>(null);
  const [comparingTitles, setComparingTitles] = useState(false);
  const trendingRef = useRef<HTMLElement | null>(null);
  const trendingFetched = useRef(false);

  const handleQuickCompare = (title: string) => {
    setCompareQueue(prev => {
      if (prev.includes(title)) return prev.filter(t => t !== title);
      if (prev.length >= 2) return [prev[1], title];
      return [...prev, title];
    });
  };

  const handleGoCompare = async () => {
    if (compareQueue.length < 2) return;
    setComparingTitles(true);
    try {
      const [jA, jB] = await Promise.all([
        searchJobAI(compareQueue[0]),
        searchJobAI(compareQueue[1]),
      ]);
      setComparisonJob(0, jA);
      setComparisonJob(1, jB);
      navigate('/compare');
    } catch (err) {
      toast.error('Failed to load careers for comparison');
    } finally {
      setComparingTitles(false);
      setCompareQueue([]);
    }
  };


  // When Supabase is configured, show landing to logged-out users; otherwise show search
  const showLanding = isSupabaseConfigured && !user;

  const spySections = useMemo(() => showLanding
    ? [
        { id: 'hero', label: 'Home' },
        { id: 'how-it-works', label: 'How It Works' },
        { id: 'use-cases', label: 'Use Cases' },
        { id: 'features', label: 'Features' },
        { id: 'about', label: 'About' },
      ]
    : [
        { id: 'hero', label: 'Home' },
        { id: 'trending', label: 'Trending' },
        { id: 'how-it-works', label: 'How It Works' },
        { id: 'features', label: 'Features' },
        { id: 'about', label: 'About' },
      ], [showLanding]);

  // Auto-load shared trending list when the section scrolls into view.
  // getTrendingCareers() reads from Supabase daily cache first — the AI is only called
  // once per day (by whichever visitor first scrolls here), then everyone else gets the
  // cached result instantly. Users cannot manually refresh the list.
  useEffect(() => {
    const el = trendingRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !trendingFetched.current) {
        trendingFetched.current = true;
        setTrendingLoading(true);
        getTrendingCareers()
          .then(data => setTrending(data))
          .catch(() => null)
          .finally(() => setTrendingLoading(false));
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchComplete = useCallback(async (jobTitle: string) => {
    // Guard: prevent concurrent searches
    if (searchingCareer) return;
    // Auth guard: if Supabase is configured the user must be logged in
    if (isSupabaseConfigured && !user) {
      navigate(`/auth?redirect=${encodeURIComponent('/job')}`);
      return;
    }
    setSearchingCareer(jobTitle);
    toast.loading(`Previewing "${jobTitle}"…`, { id: 'dossier-load' });
    try {
      const jobData = await searchJobPreliminary(jobTitle);
      setCurrentJob(jobData);
      setRefinementCount(0);
      toast.dismiss('dossier-load');
      navigate('/job');
    } finally {
      setSearchingCareer(null);
    }
  }, [searchingCareer, searchJob, searchJobAI, setCurrentJob, addToHistory, navigate, setRefinementCount, isSupabaseConfigured, user]);

  return (
    <div className="relative bg-background">
      <EditorialHomeHero
        passport={passport}
        recommendations={recommendations}
        recommendationChanges={recommendationChanges}
        showLanding={showLanding}
        onNavigate={navigate}
        onExplain={setHomeExplanation}
        onDismissChanges={dismissRecommendationChanges}
      />
      {homeExplanation && passport && (
        <WhyPanel recommendation={homeExplanation} segment={passport.segment} onClose={() => setHomeExplanation(null)} />
      )}
      {/* ── HERO SECTION ───────────────────────────────────── */}
      <div className="hidden" aria-hidden="true">
      <ScrollingTitles paused={isSearchAnimating} dimmed={isSearchAnimating} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <StickFigure pose="searching" size={64} />
          </div>

          <h1
            className="font-[Playfair_Display] text-black tracking-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            What do you want to be?
          </h1>

          <motion.div
            className="flex items-center gap-3 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="h-px w-12 bg-black/20" />
            <p
              className="font-[Inter] text-black/40 tracking-widest uppercase"
              style={{ fontSize: '0.7rem' }}
            >
              Experience any career before you commit
            </p>
            <div className="h-px w-12 bg-black/20" />
          </motion.div>
        </motion.div>

        {/* Search */}
        {showLanding ? (
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-3 bg-black text-white py-4 px-10 font-[Inter] hover:bg-black/85 transition-colors"
              style={{ fontSize: '1rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Chart my pathway
              <ArrowRight size={18} />
            </motion.button>
            <button
              onClick={() => navigate('/auth?mode=signin')}
              className="font-[Inter] text-black/35 hover:text-black/60 transition-colors underline underline-offset-2"
              style={{ fontSize: '0.82rem' }}
            >
              Already have an account? Sign in
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="w-full max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="mb-6 border-y-4 border-double border-black bg-[#f9f8f7]/95 p-4 text-left">
              <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-widest">{passport ? 'Your living career map' : 'Start with guidance'}</div>
              {passport && recommendations ? <><div className="mt-3 grid grid-cols-3 gap-2">{recommendations.recommendations.slice(0,3).map(item=><button key={item.occupationId} onClick={()=>setHomeExplanation(item)} className="min-h-11 border border-black/10 bg-white p-2 text-left hover:border-black" aria-label={`Explain ${occupationById.get(item.occupationId)?.title} score ${item.totalScore}`}><div className="font-[Playfair_Display] text-sm leading-tight">{occupationById.get(item.occupationId)?.title}</div><div className="mt-1 font-[JetBrains_Mono] text-lg">{item.totalScore}</div><div className="font-[Inter] text-[9px] underline">Why?</div></button>)}</div>{pathways[0]&&<button onClick={()=>navigate(`/pathway/${pathways[0].occupationId}`)} className="mt-3 min-h-11 font-[Inter] text-xs underline">Active pathway readiness · <strong>{pathways[0].gapReport.readiness}</strong> · explain</button>}<button onClick={()=>navigate('/recommendations')} className="mt-3 min-h-11 w-full bg-black px-4 py-3 font-[Inter] text-sm text-white">Open my career landscape →</button></>:<><p className="mt-2 font-[Inter] text-sm text-black/60">Assess your signals, compare transparent matches, and chart three grounded routes.</p><button onClick={()=>navigate('/onboarding')} className="mt-3 min-h-11 w-full bg-black px-4 py-3 font-[Inter] text-sm text-white">Chart my pathway →</button></>}
              {homeExplanation && passport && <WhyPanel recommendation={homeExplanation} segment={passport.segment} onClose={()=>setHomeExplanation(null)}/>}
            </div>
            <MagnifierSearch
              onSearchComplete={handleSearchComplete}
              isAnimating={isSearchAnimating}
              setIsAnimating={setIsSearchAnimating}
            />
          </motion.div>
        )}

        {/* AI Status + Quick Actions (only shown when logged in or no auth) */}
        {!showLanding && (
          <motion.div
            className="mt-6 flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {/* Quick action buttons */}
            <div className="flex flex-wrap justify-center gap-2">
                  <motion.button
                    onClick={() => navigate('/quiz')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <FlaskConical size={12} />
                    Career Match Quiz
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/mood')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <Brain size={12} />
                    Mood Match
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/career-transition')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <ArrowLeftRight size={12} />
                    Transition
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/roadmap')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <Map size={12} />
                    Roadmap
                  </motion.button>
              <motion.button
                onClick={() => navigate('/compare')}
                className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                style={{ fontSize: '0.72rem' }}
                whileHover={{ y: -1 }}
              >
                <Scale size={12} />
                Compare Careers
              </motion.button>

            </div>
          </motion.div>
        )}

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1.2 }}
        >
          <span className="font-[Inter] uppercase tracking-[0.2em] text-black/60" style={{ fontSize: '0.6rem' }}>
            Scroll to know more
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown size={16} className="text-black/50" />
          </motion.div>
        </motion.div>
      </div>
      </div>

      {/* ── WHAT'S TRENDING ────────────────────────────────── */}
      {!showLanding && (
      <section
        id="trending"
        ref={trendingRef as React.RefObject<HTMLElement>}
        className="py-24 px-6 border-t border-black/8"
        aria-label="What's trending in careers"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-2" style={{ fontSize: '0.65rem' }}>
              AI Career Intelligence
            </p>
            <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
              What's Trending in Careers
            </h2>

          </motion.div>



          {trendingLoading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 size={18} className="animate-spin text-black/30" />
              <span className="font-[Inter] text-black/35" style={{ fontSize: '0.85rem' }}>Pulling latest career data…</span>
            </div>
          )}

          <AnimatePresence>
            {trending && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Rising */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-emerald-200">
                    <TrendingUp size={15} className="text-emerald-600" />
                    <span className="font-[Inter] text-emerald-700 font-medium" style={{ fontSize: '0.78rem', letterSpacing: '0.08em' }}>RISING</span>
                  </div>
                  <ul className="space-y-3">
                    {trending.rising.map((item, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                        <div className="flex items-start gap-2 group/item">
                        <button
                          onClick={() => handleSearchComplete(item.title)}
                          disabled={searchingCareer !== null}
                          className="text-left group flex-1 w-full disabled:opacity-60"
                        >
                          <p className="font-[Playfair_Display] text-black group-hover:underline flex items-center gap-1.5" style={{ fontSize: '0.92rem' }}>
                            {searchingCareer === item.title && <Loader2 size={11} className="animate-spin shrink-0" />}
                            {item.title}
                          </p>
                          <p className="font-[Inter] text-black/40 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{item.reason}</p>
                        </button>
                        <button
                          onClick={() => handleQuickCompare(item.title)}
                          title="Add to compare"
                          className={`mt-0.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 ${
                            compareQueue.includes(item.title) ? 'text-black opacity-100' : 'text-black/25 hover:text-black/60'
                          }`}
                        >
                          <Scale size={13} />
                        </button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Emerging */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-violet-200">
                    <Rocket size={15} className="text-violet-600" />
                    <span className="font-[Inter] text-violet-700 font-medium" style={{ fontSize: '0.78rem', letterSpacing: '0.08em' }}>EMERGING</span>
                  </div>
                  <ul className="space-y-3">
                    {trending.emerging.map((item, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                        <div className="flex items-start gap-2 group/item">
                        <button
                          onClick={() => handleSearchComplete(item.title)}
                          disabled={searchingCareer !== null}
                          className="text-left group flex-1 w-full disabled:opacity-60"
                        >
                          <p className="font-[Playfair_Display] text-black group-hover:underline flex items-center gap-1.5" style={{ fontSize: '0.92rem' }}>
                            {searchingCareer === item.title && <Loader2 size={11} className="animate-spin shrink-0" />}
                            {item.title}
                          </p>
                          <p className="font-[Inter] text-black/40 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{item.reason}</p>
                        </button>
                        <button
                          onClick={() => handleQuickCompare(item.title)}
                          title="Add to compare"
                          className={`mt-0.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 ${
                            compareQueue.includes(item.title) ? 'text-black opacity-100' : 'text-black/25 hover:text-black/60'
                          }`}
                        >
                          <Scale size={13} />
                        </button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Declining */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-rose-200">
                    <TrendingDown size={15} className="text-rose-500" />
                    <span className="font-[Inter] text-rose-600 font-medium" style={{ fontSize: '0.78rem', letterSpacing: '0.08em' }}>DECLINING</span>
                  </div>
                  <ul className="space-y-3">
                    {trending.declining.map((item, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                        <div className="flex items-start gap-2 group/item">
                        <button
                          onClick={() => handleSearchComplete(item.title)}
                          disabled={searchingCareer !== null}
                          className="text-left group flex-1 w-full disabled:opacity-60"
                        >
                          <p className="font-[Playfair_Display] text-black/55 group-hover:underline flex items-center gap-1.5" style={{ fontSize: '0.92rem' }}>
                            {searchingCareer === item.title && <Loader2 size={11} className="animate-spin shrink-0" />}
                            {item.title}
                          </p>
                          <p className="font-[Inter] text-black/35 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{item.reason}</p>
                        </button>
                        <button
                          onClick={() => handleQuickCompare(item.title)}
                          title="Add to compare"
                          className={`mt-0.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 ${
                            compareQueue.includes(item.title) ? 'text-black opacity-100' : 'text-black/25 hover:text-black/60'
                          }`}
                        >
                          <Scale size={13} />
                        </button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {trending && (
            <motion.div
              className="mt-8 pt-6 border-t border-black/8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="font-[Inter] text-black/30" style={{ fontSize: '0.78rem' }}>
                {searchingCareer ? `Building dossier for "${searchingCareer}"…` : 'Click any career to open its full dossier'}
              </p>
            </motion.div>
          )}
        </div>
      </section>
      )}

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-black/8 bg-black/[0.018]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-3" style={{ fontSize: '0.65rem' }}>
              The Process
            </p>
            <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
              How CareerCase Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-black/10">
            {[
              {
                step: '01',
                pose: 'reading' as const,
                title: 'Assess',
                body: 'Build a Career Passport from interests, aptitude, work values, aspirations, experience and evidence.',
              },
              {
                step: '02',
                pose: 'mapping' as const,
                title: 'Match',
                body: 'Explore a diverse landscape scored transparently over 100 NCO-coded occupations with your segment lens.',
              },
              {
                step: '03',
                pose: 'climbing' as const,
                title: 'Pathway',
                body: 'Compare fastest, lower-risk and credential routes with proficiency-weighted gaps and interactive steps.',
              },
              {
                step: '04',
                pose: 'graduating' as const,
                title: 'Grow',
                body: 'Complete learning and RPL evidence; readiness and recommendations update as your Passport grows.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className={`p-8 min-h-[240px] flex flex-col border-black/10 ${i < 3 ? 'md:border-r' : ''} ${i > 0 ? 'border-t md:border-t-0' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-[JetBrains_Mono] text-black/15" style={{ fontSize: '2rem' }}>{item.step}</span>
                  <StickFigure pose={item.pose} size={48} />
                </div>
                <h3 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.2rem' }}>
                  {item.title}
                </h3>
                <p className="font-[Inter] text-black/50 leading-relaxed" style={{ fontSize: '0.88rem' }}>
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ──────────────────────────────────────── */}
      {showLanding && (
        <section id="use-cases" className="py-24 px-6 border-t border-black/8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-3" style={{ fontSize: '0.65rem' }}>
                Real Questions. Real Answers.
              </p>
              <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                The questions CareerCase answers
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/8 border border-black/8">
              {[
                { q: "Should I choose UX Design or Product Management?", hint: "Compare both careers side by side" },
                { q: "Can I actually move from customer support to data analysis?", hint: "Transition planner maps the exact steps" },
                { q: "What does a product designer's actual Tuesday look like?", hint: "Day simulation shows the real routine" },
                { q: "Am I cut out for consulting, or is it just glamorous on LinkedIn?", hint: "Dossier reveals the behind-the-scenes truth" },
                { q: "I'm a nurse. Could I become a UX researcher?", hint: "Career transition planner will tell you" },
                { q: "Is a career in AI realistic without a CS degree?", hint: "Roadmap builder lays out the path" },
                { q: "What salary should I realistically expect 5 years into data science?", hint: "Full dossier includes salary progression" },
                { q: "Should I take the startup offer or the MNC job?", hint: "Compare both career trajectories" },
              ].map((item, i) => (
                <motion.div
                  key={item.q}
                  className="p-7 bg-background hover:bg-black/2 transition-colors group cursor-default"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <p className="font-[Playfair_Display] text-black leading-snug mb-2" style={{ fontSize: '1rem' }}>
                    "{item.q}"
                  </p>
                  <p className="font-[Inter] text-black/35 group-hover:text-black/55 transition-colors" style={{ fontSize: '0.75rem' }}>
                    → {item.hint}
                  </p>
                </motion.div>
              ))}
            </div>
            <motion.div
              className="text-center mt-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <button
                onClick={() => navigate('/auth?mode=signup')}
                className="inline-flex items-center gap-2 bg-black text-white px-7 py-3 font-[Inter] hover:bg-black/80 transition-colors"
                style={{ fontSize: '0.88rem' }}
              >
                Find your answer
                <ArrowRight size={15} />
              </button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── WHAT YOU GET ───────────────────────────────────── */}
      <section id="features" className="py-24 px-6 border-t border-black/8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-3" style={{ fontSize: '0.65rem' }}>
              Features
            </p>
            <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
              Everything You Need to Decide
            </h2>
            <p className="font-[Inter] text-black/40 mt-3 max-w-xl mx-auto" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
              Nine tools, one app — from your first search to your final career decision.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-black/8 border border-black/8">
            {[
              {
                icon: <FileText size={20} />,
                title: 'Full AI Dossier',
                body: 'Salary ranges, education path, daily routine, work culture - real data powered by Llama 3.3.',
                tag: 'Core',
              },
              {
                icon: <Swords size={20} />,
                title: 'Day Simulation',
                body: 'Make decisions a professional makes from 8am to 8pm. See how you think under pressure.',
                tag: 'Immersive',
              },
              {
                icon: <MessageSquare size={20} />,
                title: 'Interview Prep',
                body: 'Practice tough interview questions with AI feedback calibrated to the specific role.',
                tag: 'Practice',
              },
              {
                icon: <Brain size={20} />,
                title: 'Career Quiz',
                body: 'Answer 7 questions about your values, pace, and interests. Get matched to careers that fit.',
                tag: 'Discovery',
              },
              {
                icon: <BarChart2 size={20} />,
                title: 'Side-by-Side Compare',
                body: 'Stack any two careers against each other - salary, skills, lifestyle, and growth potential.',
                tag: 'Analysis',
              },
              {
                icon: <Zap size={20} />,
                title: 'Mood Match',
                body: 'Describe how you feel right now. We find careers that vibe with your current energy.',
                tag: 'Discovery',
              },
              {
                icon: <ArrowLeftRight size={20} />,
                title: 'Career Transition Planner',
                body: 'Already in a career? Map out the exact steps, timeline, and skills needed to switch roles.',
                tag: 'Planning',
              },
              {
                icon: <Map size={20} />,
                title: 'Career Roadmap Builder',
                body: 'Get a personalised step-by-step roadmap from where you are today to your target role.',
                tag: 'Planning',
              },
              {
                icon: <Sparkles size={20} />,
                title: 'History & Favourites',
                body: 'Every career you explore is saved. Revisit, compare, or pick up where you left off anytime.',
                tag: 'Tracking',
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                className="p-8 bg-background hover:bg-black/[0.03] transition-colors group min-h-[200px] flex flex-col"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-black/30 group-hover:text-black/55 transition-colors">{feat.icon}</div>
                  <span className="font-[JetBrains_Mono] text-black/20 uppercase" style={{ fontSize: '0.58rem', letterSpacing: '0.08em' }}>{feat.tag}</span>
                </div>
                <h3 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.05rem' }}>
                  {feat.title}
                </h3>
                <p className="font-[Inter] text-black/50 leading-relaxed" style={{ fontSize: '0.84rem' }}>
                  {feat.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────── */}
      <section id="about" className="py-24 px-6 border-t border-black/8 bg-black/[0.018]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="flex flex-col sm:flex-row items-start gap-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="shrink-0">
              <StickFigure pose="waving" size={80} />
            </div>
            <div className="flex-1 border-l-2 border-black/10 pl-10">
              <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-4" style={{ fontSize: '0.65rem' }}>
                Why I Built This
              </p>
              <h2 className="font-[Playfair_Display] text-black mb-6" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                From Kamal Reddy
              </h2>
              <div className="space-y-4 font-[Inter] text-black/65 leading-relaxed" style={{ fontSize: '0.95rem' }}>
                <p>
                  I am Kamal Reddy. I always wondered what it'd be like to live as different careers out there - a forensic analyst, a marine biologist, an investment banker. Not in a "I want to be that" way, but in a "what does Tuesday actually look like for them?" way.
                </p>
                <p>
                  There's no good answer to that question online. Job descriptions are sanitized. Salary sites are noisy. Reddit threads are biased. I wanted something that just let you <em>feel it</em> - even for five minutes.
                </p>
                <p>
                  So I built CareerCase. It\'s the tool I wish existed when I was figuring things out. Pick a career, read the dossier, live a day, answer an interview question. Then do it again for a completely different career. Compare them. Decide.
                </p>
              </div>

              {/* More from developer — merged inline */}
              <div className="mt-10 pt-8 border-t border-black/8 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="shrink-0">
                  <StickFigure pose="coding" size={52} animate={false} />
                </div>
                <div className="flex-1">
                  <p className="font-[Inter] uppercase tracking-[0.15em] text-black/30 mb-1" style={{ fontSize: '0.6rem' }}>
                    More from the developer
                  </p>
                  <p className="font-[Inter] text-black/50 leading-relaxed mb-3" style={{ fontSize: '0.88rem' }}>
                    More projects, experiments, and ideas. Design-led, minimal, useful.
                  </p>
                  <motion.a
                    href="https://kamrede.page/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-black/30 text-black/60 py-2 px-5 font-[Inter] hover:border-black hover:text-black transition-all"
                    style={{ fontSize: '0.82rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Visit kamrede.page
                    <ExternalLink size={13} />
                  </motion.a>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-black/10" />
                <span className="font-[JetBrains_Mono] text-black/30" style={{ fontSize: '0.72rem' }}>- Kamal Reddy</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEEDBACK ─────────────────────────────────────── */}
      <section id="feedback" className="py-16 px-6 border-t border-black/6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <MessageSquare size={28} className="mx-auto text-black/20 mb-4" />
            <h2 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.4rem' }}>
              We'd love your feedback
            </h2>
            <p className="font-[Inter] text-black/45 leading-relaxed mb-6" style={{ fontSize: '0.85rem' }}>
              Found a bug? Have a feature idea? Just want to say hi? Drop me a line.
            </p>
            <motion.a
              href="https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/issues/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-2 border-black text-black py-2.5 px-6 font-[Inter] hover:bg-black hover:text-white transition-all"
              style={{ fontSize: '0.85rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send Feedback
              <ArrowRight size={14} />
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-black/8 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StickFigure pose="standing" size={28} animate={false} />
            <span className="font-[Playfair_Display] text-black/60" style={{ fontSize: '0.92rem' }}>CareerCase</span>
          </div>
          <p className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
            Built by Kamal Reddy &middot; v1.0.0
          </p>
          <div className="flex items-center gap-4 font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
            <button onClick={() => navigate('/how-it-works')} className="hover:text-black/50 transition-colors">How guidance works</button>
            <button onClick={() => navigate('/settings')} className="hover:text-black/50 transition-colors">Settings</button>
            <button onClick={() => navigate('/history')} className="hover:text-black/50 transition-colors">History</button>
          </div>
        </div>
      </footer>



      {/* Scroll Section Nav */}
      <ScrollSectionNav sections={spySections} />

      {/* Floating Quick-Compare Bar */}
      <AnimatePresence>
        {compareQueue.length > 0 && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-black text-white px-5 py-3 shadow-xl font-[Inter] print:hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{ fontSize: '0.82rem' }}
          >
            <Scale size={15} className="shrink-0" />
            <span>
              {compareQueue.length === 1
                ? `"${compareQueue[0]}" selected — pick one more`
                : `${compareQueue[0]} vs ${compareQueue[1]}`}
            </span>
            {compareQueue.length === 2 && (
              <button
                onClick={handleGoCompare}
                disabled={comparingTitles}
                className="ml-2 bg-white text-black px-3 py-1 font-semibold disabled:opacity-60 flex items-center gap-1.5"
                style={{ fontSize: '0.78rem' }}
              >
                {comparingTitles ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                Compare
              </button>
            )}
            <button
              onClick={() => setCompareQueue([])}
              className="ml-1 text-white/50 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
