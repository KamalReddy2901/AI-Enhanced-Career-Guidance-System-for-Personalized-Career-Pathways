import { lazy, Suspense, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FlaskConical, Scale, ChevronDown, FileText, Brain, Swords, Zap, BarChart2, MessageSquare, ArrowRight, ExternalLink, TrendingUp, TrendingDown, Rocket, Loader2, Map, ArrowLeftRight } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { BrandMark } from '../components/BrandMark';
import { WordCloudMasthead } from '../components/hero/WordCloudMasthead';
import { FixedRibbon } from '../components/FixedRibbon';
import { Skeleton } from '../components/ui/skeleton';
import type { CareerRecommendation } from '../engine/types';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useGuidance } from '../context/GuidanceContext';
import type { TrendingCareers } from '../services/ai';
import { toast } from 'sonner';
import { useT } from '../i18n';
import { TrustStrip } from '../components/guidance/TrustStrip';
import { sounds } from '../utils/sounds';
import { hapticLight, hapticTap } from '../utils/haptic';

const EditorialHomeHero = lazy(() => import('../components/home/EditorialHomeHero').then(module => ({ default: module.EditorialHomeHero })));
const WhyPanel = lazy(() => import('../components/guidance/WhyPanel').then(module => ({ default: module.WhyPanel })));

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
            className={`font-[Inter] uppercase tracking-[0.12em] transition-[color,background-color,border-color,opacity,transform,box-shadow] duration-200 select-none ${
              activeId === s.id ? 'text-black/60' : 'text-black/0 group-hover:text-black/30'
            }`}
            style={{ fontSize: '0.58rem' }}
          >
            {s.label}
          </span>
          <div
            className={`rounded-full transition-[color,background-color,border-color,opacity,transform,box-shadow] duration-300 ${
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
  const { t, lang } = useT();
  const { searchJobAI, searchJobPreliminary, setCurrentJob, addToHistory, isSearchAnimating, setIsSearchAnimating, setRefinementCount, setComparisonJob } = useApp();
  const { user } = useAuth();
  const { passport, recommendations, recommendationChanges, dismissRecommendationChanges } = useGuidance();
  const howTo = lang === 'hi' ? {
    kicker: 'यहाँ से शुरू करें', title: 'CareerCase का उपयोग कैसे करें',
    intro: 'एक सरल क्रम है: अपनी स्थिति बताएँ, अपने मेल देखें, फिर किसी मार्ग पर कार्रवाई करें। आपकी प्रगति आपके खाते में सुरक्षित रहती है।',
    review: 'अपना पासपोर्ट देखें', build: 'अपना पासपोर्ट बनाएँ', account: 'अपना खाता बनाएँ',
    reviewBody: 'जब भी कुछ बदले, अपना रिज़्यूमे, कौशल, अनुभव और सीमाएँ अपडेट करें।',
    buildBody: 'कुछ मूल प्रश्नों के उत्तर दें ताकि सुझाव आपकी स्थिति के अनुरूप हों।',
    accountBody: 'ईमेल या Google खाते का उपयोग करें ताकि आपका करियर कार्य निजी रहे और हर डिवाइस पर मिले।',
    openPassport: 'पासपोर्ट खोलें', startOnboarding: 'सेटअप शुरू करें', createAccount: 'खाता बनाएँ',
    essentials: 'ज़रूरी चरण पूरे करें', assessmentsBody: 'छोटे रुचि, योग्यता और कार्य-मूल्य आकलन पूरे करें। हर एक आपके मेल बेहतर बनाता है।',
    onboardingBody: 'पहले छोटा परिचय प्रोफ़ाइल पूरा करें। यह आकलन और सुझावों के लिए ज़रूरी संदर्भ दर्ज करता है।',
    openAssessments: 'आकलन खोलें', finishOnboarding: 'सेटअप पूरा करें', signIn: 'जारी रखने के लिए साइन इन करें',
    nextMove: 'अपना अगला कदम चुनें', nextBody: 'जानें कि कोई भूमिका क्यों मेल खाती है, मार्गों की तुलना करें और आगे बढ़ते हुए चरण पूरे करें।',
    recommendations: 'सुझाव देखें', explorePrefix: 'आप ', explore: 'Explore टैब', counselorPrefix: ' में कोई भी करियर देख सकते हैं। या ', counselor: 'Counselor टैब', counselorSuffix: ' में AI काउंसलर से बात करें।', step: 'चरण',
  } : lang === 'te' ? {
    kicker: 'ఇక్కడ ప్రారంభించండి', title: 'CareerCase ఎలా ఉపయోగించాలి',
    intro: 'ఒక సులభమైన క్రమం ఉంది: మీ పరిస్థితిని చెప్పండి, మీ సరిపోలికలను చూడండి, ఆపై ఒక మార్గంపై చర్య తీసుకోండి. మీ పురోగతి మీ ఖాతాలో భద్రంగా ఉంటుంది.',
    review: 'మీ పాస్‌పోర్ట్‌ను చూడండి', build: 'మీ పాస్‌పోర్ట్‌ను రూపొందించండి', account: 'మీ ఖాతాను సృష్టించండి',
    reviewBody: 'మార్పులు వచ్చినప్పుడు మీ రెజ్యూమే, నైపుణ్యాలు, అనుభవం మరియు పరిమితులను నవీకరించండి.',
    buildBody: 'సూచనలు మీ పరిస్థితికి సరిపోవడానికి కొన్ని ప్రాథమిక ప్రశ్నలకు సమాధానం ఇవ్వండి.',
    accountBody: 'మీ కెరీర్ పని గోప్యంగా ఉండి ప్రతి పరికరంలో అందుబాటులో ఉండేందుకు ఇమెయిల్ లేదా Google ఖాతాను ఉపయోగించండి.',
    openPassport: 'పాస్‌పోర్ట్ తెరవండి', startOnboarding: 'సెటప్ ప్రారంభించండి', createAccount: 'ఖాతా సృష్టించండి',
    essentials: 'అవసరమైన దశలను పూర్తి చేయండి', assessmentsBody: 'చిన్న ఆసక్తులు, సామర్థ్యం మరియు పని విలువల అంచనాలను పూర్తి చేయండి. ప్రతి ఒక్కటి మీ సరిపోలికలను మెరుగుపరుస్తుంది.',
    onboardingBody: 'ముందుగా చిన్న పరిచయ ప్రొఫైల్‌ను పూర్తి చేయండి. ఇది అంచనాలు మరియు సూచనలకు అవసరమైన సందర్భాన్ని నమోదు చేస్తుంది.',
    openAssessments: 'అంచనాలు తెరవండి', finishOnboarding: 'సెటప్ పూర్తి చేయండి', signIn: 'కొనసాగడానికి సైన్ ఇన్ చేయండి',
    nextMove: 'మీ తదుపరి అడుగును ఎంచుకోండి', nextBody: 'ఒక పాత్ర ఎందుకు సరిపోతుందో చదవండి, మార్గాలను పోల్చండి, ముందుకు సాగుతూ దశలను పూర్తి చేయండి.',
    recommendations: 'సూచనలు చూడండి', explorePrefix: 'మీరు ', explore: 'Explore ట్యాబ్', counselorPrefix: 'లో ఏ కెరీర్‌నైనా చూడవచ్చు. లేదా ', counselor: 'Counselor ట్యాబ్', counselorSuffix: 'లో AI కౌన్సలర్‌తో మాట్లాడండి.', step: 'దశ',
  } : {
    kicker: 'Start here', title: 'How to use CareerCase',
    intro: 'There is one simple loop: tell us where you are, review your matches, then act on a pathway. Your progress is saved to your account as you go.',
    review: 'Review your passport', build: 'Build your passport', account: 'Create your account',
    reviewBody: 'Add your resume, skills, experience and constraints whenever they change.', buildBody: 'Answer a few basics so recommendations can reflect your situation.', accountBody: 'Use an email or Google account so your career work is private and available on every device.',
    openPassport: 'Open passport', startOnboarding: 'Start onboarding', createAccount: 'Create account', essentials: 'Complete the essentials',
    assessmentsBody: 'Take the short interests, aptitude and work-values assessments. Each one makes your matches more useful.', onboardingBody: 'Finish the short onboarding profile first. It records the context the assessments and recommendations need.',
    openAssessments: 'Open assessments', finishOnboarding: 'Finish onboarding', signIn: 'Sign in to continue', nextMove: 'Choose your next move',
    nextBody: 'Read why a role fits, compare routes, and tick off pathway steps as you build evidence and confidence.', recommendations: 'See recommendations',
    explorePrefix: 'Feel free to explore any career in the ', explore: 'Explore tab', counselorPrefix: '. Or talk to an AI counselor in the ', counselor: 'Counselor tab', counselorSuffix: '.', step: 'STEP',
  };

  const [trending, setTrending] = useState<TrendingCareers | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState(false);
  const [searchingCareer, setSearchingCareer] = useState<string | null>(null);
  const [compareQueue, setCompareQueue] = useState<string[]>([]);
  const [homeExplanation, setHomeExplanation] = useState<CareerRecommendation | null>(null);
  const [comparingTitles, setComparingTitles] = useState(false);
  const trendingRef = useRef<HTMLElement | null>(null);
  const trendingFetched = useRef(false);

  const handleQuickCompare = (title: string) => {
    sounds.addCompare();
    hapticLight();
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
      sounds.navigate();
      hapticTap();
      navigate('/compare');
    } catch (err) {
      toast.error('Failed to load careers for comparison');
    } finally {
      setComparingTitles(false);
      setCompareQueue([]);
    }
  };

  const loadTrending = useCallback(() => {
    if (trendingLoading) return;
    setTrendingLoading(true);
    setTrendingError(false);
    import('../services/ai').then(({ getTrendingCareers }) => getTrendingCareers())
      .then(data => setTrending(data))
      .catch(() => setTrendingError(true))
      .finally(() => setTrendingLoading(false));
  }, [trendingLoading]);


  // The public page explains the product; the working journey begins only
  // after an account is established so every piece of progress is attributable.
  const showLanding = !user;

  const spySections = useMemo(() => showLanding
    ? [
        { id: 'hero', label: 'Home' },
        { id: 'how-to-use', label: 'How to use' },
        { id: 'use-cases', label: 'Use Cases' },
        { id: 'features', label: 'Features' },
      ]
    : [
        { id: 'hero', label: 'Home' },
        { id: 'how-to-use', label: 'How to use' },
        { id: 'trending', label: 'Trending' },
        { id: 'features', label: 'Features' },
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
        loadTrending();
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTrending]);

  const handleSearchComplete = useCallback(async (jobTitle: string) => {
    // Guard: prevent concurrent searches
    if (searchingCareer) return;
    if (!user) {
      sounds.navigate();
      hapticTap();
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
      sounds.navigate();
      hapticTap();
      navigate('/job');
    } finally {
      setSearchingCareer(null);
    }
  }, [searchingCareer, searchJobPreliminary, setCurrentJob, navigate, setRefinementCount, user]);

  return (
    <div className="relative bg-background">
      {/* Fixed Ribbon - only visible on homepage for logged-in users */}
      {!showLanding && (
        <div className="sticky top-14 z-40 print:hidden">
          <FixedRibbon />
        </div>
      )}
      
      <WordCloudMasthead passport={passport} showLanding={showLanding} onNavigate={(to) => { sounds.navigate(); hapticTap(); navigate(to); }} />
      {!showLanding && <Suspense fallback={null}><EditorialHomeHero
          passport={passport}
          recommendations={recommendations}
          recommendationChanges={recommendationChanges}
          onNavigate={navigate}
          onExplain={setHomeExplanation}
          onDismissChanges={dismissRecommendationChanges}
        /></Suspense>}
      {!showLanding && homeExplanation && passport && (
        <Suspense fallback={null}><WhyPanel recommendation={homeExplanation} segment={passport.segment} onClose={() => setHomeExplanation(null)} /></Suspense>
      )}



      {/* ── HOW TO USE ─────────────────────────────────────── */}
      <section id="how-to-use" className="border-t border-black/8 bg-[var(--paper-raised)] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl"><TrustStrip compact /></div>
        <div className="mx-auto max-w-4xl">
          <div className="max-w-2xl">
            <p className="label-caps text-[var(--ink-soft)]">{howTo.kicker}</p>
            <h2 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{howTo.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--ink-soft)] md:text-base">{howTo.intro}</p>
          </div>
          <ol className="mt-10 grid gap-px border border-[var(--ink-faint)] bg-[var(--ink-faint)] md:grid-cols-3">
            {[
              {
                number: '01',
                pose: 'reading' as const,
                title: user ? (passport ? howTo.review : howTo.build) : howTo.account,
                body: user ? (passport ? howTo.reviewBody : howTo.buildBody) : howTo.accountBody,
                action: user ? (passport ? howTo.openPassport : howTo.startOnboarding) : howTo.createAccount,
                path: user ? (passport ? '/passport' : '/onboarding') : '/auth?mode=signup',
              },
              {
                number: '02',
                pose: 'mapping' as const,
                title: howTo.essentials,
                body: passport ? howTo.assessmentsBody : howTo.onboardingBody,
                action: user ? (passport ? howTo.openAssessments : howTo.finishOnboarding) : howTo.signIn,
                path: user ? (passport ? '/assess' : '/onboarding') : '/auth?mode=signup',
              },
              {
                number: '03',
                pose: 'climbing' as const,
                title: howTo.nextMove,
                body: howTo.nextBody,
                action: user ? howTo.recommendations : howTo.createAccount,
                path: user ? '/recommendations' : '/auth?mode=signup',
              },
            ].map((step) => (
              <li key={step.number} className="flex min-h-64 flex-col bg-[var(--paper-raised)] p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="font-mono-ui text-xs text-[var(--accent-news)] tracking-wider">{howTo.step} {step.number}</span>
                  <StickFigure pose={step.pose} size={48} />
                </div>
                <h3 className="font-display text-2xl leading-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{step.body}</p>
                <button 
                  type="button" 
                  onClick={() => { sounds.navigate(); hapticTap(); navigate(step.path); }}
                  className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6 font-mono-ui text-xs uppercase tracking-wider underline decoration-[var(--accent-news)] decoration-2 underline-offset-4 hover:text-[var(--accent-news)] transition-colors"
                >
                  {step.action} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-10 max-w-2xl text-center font-[Inter] text-sm leading-relaxed text-[var(--ink-soft)] md:text-base">
            {howTo.explorePrefix}<Link to="/job?fresh=1" onClick={() => { sounds.navigate(); hapticTap(); }} className="font-semibold text-[var(--ink)] underline decoration-[var(--accent-news)] decoration-2 underline-offset-2 hover:decoration-[var(--ink)] transition-colors">{howTo.explore}</Link>.
            <br />
            Or talk to an AI counselor in the <Link to={user ? '/counselor' : '/auth?redirect=%2Fcounselor'} onClick={() => { sounds.navigate(); hapticTap(); }} className="font-semibold text-[var(--ink)] underline decoration-[var(--accent-news)] decoration-2 underline-offset-2 hover:decoration-[var(--ink)] transition-colors">{howTo.counselor}</Link>.
          </p>
        </div>
      </section>

      {/* ── WHAT'S TRENDING ────────────────────────────────── */}
      {!showLanding && (
      <section
        id="trending"
        ref={trendingRef as React.RefObject<HTMLElement>}
        className="border-t border-[var(--ink-faint)] px-6 py-24"
        aria-label={t('homeTrendingAria')}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <p className="label-caps mb-2 text-[var(--ink-faint)]">
              {t('homeTrendingKicker')}
            </p>
            <h2 className="font-display text-[var(--ink)]" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
              {t('homeTrendingTitle')}
            </h2>

          </motion.div>



          {trendingLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((col) => (
                <div key={col} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-[var(--ink-faint)] pb-2 mb-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div key={item} className="space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {trendingError && !trendingLoading && (
            <div className="border border-[var(--accent-news)] bg-[var(--paper-raised)] p-5 text-center">
              <p className="text-sm text-[var(--ink-soft)]">Live trends are unavailable right now. You can still explore any career from the Explore section.</p>
              <button type="button" onClick={() => { sounds.click(); loadTrending(); }} className="mt-3 min-h-11 font-mono-ui text-xs uppercase underline underline-offset-4">Try again</button>
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
                  <div className="mb-4 flex items-center gap-2 border-b border-[var(--ink)] pb-2">
                    <TrendingUp size={15} className="text-[var(--ink)]" />
                    <span className="label-caps text-[var(--ink)]">{t('homeRising')}</span>
                  </div>
                  <ul className="space-y-3">
                    {(trending.rising ?? []).map((item, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                        <div className="flex items-start gap-2 group/item">
                        <button
                          onClick={() => handleSearchComplete(item.title)}
                          disabled={searchingCareer !== null}
                          className="text-left group flex-1 w-full disabled:opacity-60"
                        >
                          <p className="font-display flex items-center gap-1.5 text-[var(--ink)] group-hover:underline" style={{ fontSize: '0.92rem' }}>
                            {searchingCareer === item.title && <Loader2 size={11} className="animate-spin shrink-0" />}
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[var(--ink-soft)]" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{item.reason}</p>
                        </button>
                        <button
                          onClick={() => handleQuickCompare(item.title)}
                          title={t('homeAddCompare')}
                          className={`mt-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity p-0.5 ${
                            compareQueue.includes(item.title) ? 'text-[var(--ink)] opacity-100' : 'text-[var(--ink-faint)] hover:text-[var(--ink-soft)]'
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
                  <div className="mb-4 flex items-center gap-2 border-b border-[var(--accent-news)] pb-2">
                    <Rocket size={15} className="text-[var(--accent-news)]" />
                    <span className="label-caps text-[var(--accent-news)]">{t('homeEmerging')}</span>
                  </div>
                  <ul className="space-y-3">
                    {(trending.emerging ?? []).map((item, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                        <div className="flex items-start gap-2 group/item">
                        <button
                          onClick={() => handleSearchComplete(item.title)}
                          disabled={searchingCareer !== null}
                          className="text-left group flex-1 w-full disabled:opacity-60"
                        >
                          <p className="font-display flex items-center gap-1.5 text-[var(--ink)] group-hover:underline" style={{ fontSize: '0.92rem' }}>
                            {searchingCareer === item.title && <Loader2 size={11} className="animate-spin shrink-0" />}
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[var(--ink-soft)]" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{item.reason}</p>
                        </button>
                        <button
                          onClick={() => handleQuickCompare(item.title)}
                          title={t('homeAddCompare')}
                          className={`mt-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity p-0.5 ${
                            compareQueue.includes(item.title) ? 'text-[var(--accent-news)] opacity-100' : 'text-[var(--ink-faint)] hover:text-[var(--accent-news)]'
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
                  <div className="mb-4 flex items-center gap-2 border-b border-[var(--ink-faint)] pb-2">
                    <TrendingDown size={15} className="text-[var(--ink-soft)]" />
                    <span className="label-caps text-[var(--ink-soft)]">{t('homeDeclining')}</span>
                  </div>
                  <ul className="space-y-3">
                    {(trending.declining ?? []).map((item, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                        <div className="flex items-start gap-2 group/item">
                        <button
                          onClick={() => handleSearchComplete(item.title)}
                          disabled={searchingCareer !== null}
                          className="text-left group flex-1 w-full disabled:opacity-60"
                        >
                          <p className="font-display flex items-center gap-1.5 text-[var(--ink-soft)] group-hover:underline" style={{ fontSize: '0.92rem' }}>
                            {searchingCareer === item.title && <Loader2 size={11} className="animate-spin shrink-0" />}
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[var(--ink-faint)]" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>{item.reason}</p>
                        </button>
                        <button
                          onClick={() => handleQuickCompare(item.title)}
                          title={t('homeAddCompare')}
                          className={`mt-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity p-0.5 ${
                            compareQueue.includes(item.title) ? 'text-[var(--ink)] opacity-100' : 'text-[var(--ink-faint)] hover:text-[var(--ink-soft)]'
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
              className="mt-8 border-t border-[var(--ink-faint)] pt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-[var(--ink-faint)]" style={{ fontSize: '0.78rem' }}>
                {searchingCareer ? `${t('homeBuildingDossier')} "${searchingCareer}"…` : t('homeOpenDossier')}
              </p>
            </motion.div>
          )}
        </div>
      </section>
      )}

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
                onClick={() => { sounds.navigate(); hapticTap(); navigate('/auth?mode=signup'); }}
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
              Explore, reflect, and choose with confidence
            </h2>
            <p className="font-[Inter] text-black/40 mt-3 max-w-xl mx-auto" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
              Start with a career dossier, then use simulations, comparisons, and your Personal workspace to make the next move clearer.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-black/8 border border-black/8">
            {[
              {
                icon: <FileText size={20} />,
                title: 'Career Dossiers',
                body: 'Explore any role through its responsibilities, entry routes, work rhythm, trade-offs, and questions that matter.',
                tag: 'Core',
              },
              {
                icon: <Swords size={20} />,
                title: 'Try a Day in the Role',
                body: 'Work through realistic decisions, then see how that experience connects with your own career profile.',
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
                title: 'Personal Workspace',
                body: 'Your Passport, assessment desk, landscape and pathways stay together and improve as you add evidence.',
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

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-black/8 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark compact />
          </div>
          <div className="flex items-center gap-4 font-[Inter] text-[var(--ink-soft)]" style={{ fontSize: '0.72rem' }}>
            <button onClick={() => { sounds.click(); document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-black transition-colors">How to use</button>
            {user ? <>
              <button onClick={() => { sounds.navigate(); hapticTap(); navigate('/settings'); }} className="hover:text-black transition-colors">Settings</button>
              <button onClick={() => { sounds.navigate(); hapticTap(); navigate('/history'); }} className="hover:text-black transition-colors">History</button>
            </> : <button onClick={() => { sounds.navigate(); hapticTap(); navigate('/auth?mode=signup'); }} className="hover:text-black transition-colors">Create account</button>}
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
