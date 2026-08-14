import { useEffect, useMemo, useState } from "react";
import { animate, motion, useReducedMotion } from 'motion/react';
import { Link } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { WhyPanel } from "../components/guidance/WhyPanel";
import { StopPress } from "../components/guidance/StopPress";
import { NCOBadge } from "../components/NCOBadge";
import { useGuidance } from "../context/GuidanceContext";
import { marketFor, occupationById, skillById } from "../data/knowledge";
import type {
  CareerRecommendation,
  RecommendationGroup,
} from "../engine/types";
import { useT } from "../i18n";
import { sounds } from "../utils/sounds";
import { speak } from "../utils/voice";
import { occupationName } from "../i18n/occupationNames";
import { localizedConfidence, localizedReason, localizedTrend } from "../i18n/guidanceFormatting";
import { hapticTap } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';
import { useReveal } from '../motion/useReveal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Volume2, Star, X, ArrowUpDown, Map } from 'lucide-react';
import { toast } from 'sonner';
import { CareerLandscapeScatter } from '../components/guidance/CareerLandscapeScatter';
import { buildPathwayPlan } from '../engine/pathways';

type LandscapeFilter = 'all' | 'safe' | 'stretch' | 'ambitious';
type SortOption = 'best_fit' | 'salary' | 'fastest' | 'wlb';

const landscapeGroup = (group: RecommendationGroup): Exclude<LandscapeFilter, 'all'> =>
  group === 'best_fit' || group === 'easiest_transition' ? 'safe' :
    group === 'growth' ? 'stretch' : 'ambitious';

const HIDDEN_CAREERS_KEY = 'cc_guidance_hidden_recommendations';

function CountUp({value}:{value:number}) {
  const reduced=useReducedMotion();
  const [display,setDisplay]=useState(reduced?Math.round(value):0);
  useEffect(()=>{
    if(reduced){setDisplay(Math.round(value));return;}
    const controls=animate(0,value,{duration:.9,ease:[.22,1,.36,1],onUpdate:latest=>setDisplay(Math.round(latest))});
    return ()=>controls.stop();
  },[value,reduced]);
  return <>{display}</>;
}

export function RecommendationsPage() {
  const {
    passport,
    recommendations,
    recommendationChanges,
    dismissRecommendationChanges,
    recompute,
  } = useGuidance();
  const { locale, lang, t } = useT();
  const c = lang === "hi" ? { start:"आपका करियर परिदृश्य पासपोर्ट से शुरू होता है", onboarding:"ऑनबोर्डिंग शुरू करें", preparing:"आपका नियम-आधारित परिदृश्य तैयार हो रहा है…", header:"करियर परिदृश्य", title:"खोजने योग्य मज़बूत विकल्प", intro:"आपकी मौजूदा प्रोफ़ाइल पर आधारित। स्कोर प्रमाण-आधारित संकेत हैं, अंतिम निर्णय नहीं।", ask:"क्यों पूछें · अगर ऐसा हो तो पूछें", confidence:"विश्वसनीयता", demand:"माँग", why:"यह क्यों?", build:"मार्ग बनाएँ", dossier:"पूरा विवरण पढ़ें", footer:"संस्करणित ज्ञान-आधार पर नियम-आधारित स्कोरिंग · अंकों के लिए LLM का उपयोग नहीं" } : lang === "te" ? { start:"మీ కెరీర్ దృశ్యం పాస్‌పోర్ట్‌తో మొదలవుతుంది", onboarding:"ఆన్‌బోర్డింగ్ ప్రారంభించండి", preparing:"మీ నియమ-ఆధారిత దృశ్యం సిద్ధమవుతోంది…", header:"కెరీర్ దృశ్యం", title:"అన్వేషించదగిన బలమైన ఎంపికలు", intro:"మీ ప్రస్తుత ప్రొఫైల్ ఆధారంగా. స్కోర్లు ఆధారాలతో కూడిన సంకేతాలు మాత్రమే, తీర్పు కాదు.", ask:"ఎందుకో అడగండి · పరిస్థితి మారితే అడగండి", confidence:"నమ్మకం", demand:"డిమాండ్", why:"ఇది ఎందుకు?", build:"మార్గం నిర్మించండి", dossier:"పూర్తి వివరాలు చదవండి", footer:"వెర్షన్ చేసిన జ్ఞాన భాండాగారంపై నియమ-ఆధారిత స్కోరింగ్ · స్కోర్లకు LLM ఉపయోగించలేదు" } : { start:"Your career landscape starts with a passport", onboarding:"Start onboarding", preparing:"Preparing your deterministic landscape…", header:"The Career Landscape", title:"Strong options to explore", intro:"Based on your current profile. Scores are evidence-led signals, never a verdict.", ask:"Ask why · Ask what-if", confidence:"confidence", demand:"Demand", why:"Why this?", build:"Build pathway", dossier:"Read the full dossier", footer:"Deterministic scoring over the versioned knowledge base · LLM not used for scores" };
  const [explanation, setExplanation] = useState<CareerRecommendation | null>(
    null,
  );
  const [filter, setFilter] = useState<LandscapeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('best_fit');
  const [viewMode, setViewMode] = useState<'cards' | 'scatter'>('cards');
  const [hiddenCareers, setHiddenCareers] = useState<Set<string>>(() => {
    try {
      const legacyKey = 'cc_hidden_recommendations';
      const stored = localStorage.getItem(HIDDEN_CAREERS_KEY) ?? localStorage.getItem(legacyKey);
      if (stored && !localStorage.getItem(HIDDEN_CAREERS_KEY)) localStorage.setItem(HIDDEN_CAREERS_KEY, stored);
      localStorage.removeItem(legacyKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const filterLabels: Record<LandscapeFilter, string> = {
    all: t('recommendationFilterAll'),
    safe: t('recommendationFilterSafe'),
    stretch: t('recommendationFilterStretch'),
    ambitious: t('recommendationFilterAmbitious'),
  };

  const sortLabels: Record<SortOption, string> = {
    best_fit: 'Best Fit',
    salary: 'Highest Salary',
    fastest: 'Fastest Path',
    wlb: 'Best Work-Life Balance',
  };

  const reveal = useReveal<HTMLDivElement>();
  
  useEffect(() => {
    if (passport && !recommendations) recompute();
  }, [passport, recommendations, recompute]);

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_CAREERS_KEY, JSON.stringify([...hiddenCareers]));
    } catch {
      // localStorage full
    }
  }, [hiddenCareers]);

  const handleDismissCareer = (occupationId: string) => {
    setHiddenCareers(prev => new Set([...prev, occupationId]));
    sounds.click();
    toast.success('Career hidden from recommendations');
  };

  const visibleRecommendations = useMemo(() => {
    let filtered = recommendations?.recommendations.filter((item) => 
      !hiddenCareers.has(item.occupationId) &&
      (filter === 'all' || landscapeGroup(item.group) === filter)
    ) ?? [];
    if (!passport) return filtered;

    // Sort recommendations
    if (sortBy === 'salary') {
      filtered = [...filtered].sort((a, b) => {
        const marketA = marketFor(a.occupationId);
        const marketB = marketFor(b.occupationId);
        // Since medianSalary is not available, use demandIndex as proxy
        const salaryA = marketA?.demandIndex ?? 0;
        const salaryB = marketB?.demandIndex ?? 0;
        return salaryB - salaryA;
      });
    } else if (sortBy === 'fastest') {
      filtered = [...filtered].sort((a, b) => {
        const duration = (occupationId: string) => Math.min(...buildPathwayPlan(passport, occupationId).routes.map(route => route.totalMonths));
        return duration(a.occupationId) - duration(b.occupationId) || b.totalScore - a.totalScore;
      });
    } else if (sortBy === 'wlb') {
      filtered = [...filtered].sort((a, b) => {
        const occA = occupationById.get(a.occupationId);
        const occB = occupationById.get(b.occupationId);
        // Use work-life balance value as proxy for WLB
        const wlbA = occA?.valuesProfile.balance ?? 50;
        const wlbB = occB?.valuesProfile.balance ?? 50;
        return wlbB - wlbA; // Higher balance score = better WLB
      });
    }
    // Default 'best_fit' keeps original order (already sorted by score)

    return filtered;
  }, [filter, sortBy, recommendations, hiddenCareers, passport]);
  if (!passport)
    return (
      <div className="min-h-screen bg-[var(--paper)] p-8 text-center text-[var(--ink)]">
        <StickFigure pose="mapping" size={120} />
        <h1 className="font-display mt-6 text-4xl">
          {c.start}
        </h1>
        <Link
          to="/onboarding"
          className="mt-5 inline-block bg-[var(--ink)] px-5 py-3 text-[var(--paper)]"
        >
          {c.onboarding}
        </Link>
      </div>
    );
  if (!recommendations)
    return (
      <div className="min-h-screen bg-[var(--paper)] p-8 text-center text-[var(--ink)]">
        {c.preparing}
      </div>
    );
  return (
    <div className="min-h-screen bg-[var(--paper)] px-6 py-16 pb-24 md:py-24">
      <GuidanceEntrance className="mx-auto max-w-6xl">
        <header className="mb-10 grid gap-6 border-b-2 border-[var(--ink)] pb-8 md:grid-cols-[1fr_auto]">
          <StickFigure pose="mapping" size={112} />
          <div>
            <div className="label-caps text-[var(--ink-soft)]">
              {c.header} ·{" "}
              {new Date(recommendations.generatedAt).toLocaleDateString(locale)}{" "}
              · profile v{passport.version} · {recommendations.kbVersion}
            </div>
            <h1 className="font-display mt-3 text-5xl leading-[1.05] tracking-tighter md:text-6xl"><TextReveal text={c.title} /></h1>
            <p className="mt-2 text-[var(--ink-soft)]">
              {c.intro}
            </p>
          </div>
        </header>
        <StopPress
          changes={recommendationChanges}
          onDismiss={dismissRecommendationChanges}
          onExplain={(occupationId)=>{const item=recommendations.recommendations.find(recommendation=>recommendation.occupationId===occupationId);if(item)setExplanation(item)}}
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Tabs value={filter} onValueChange={(value)=>setFilter(value as LandscapeFilter)}>
            <TabsList aria-label={t('recommendations')}>
              {(['all','safe','stretch','ambitious'] as const).map(value=><TabsTrigger key={value} value={value} data-testid={`recommendations-filter-${value}`}>{filterLabels[value]}</TabsTrigger>)}
            </TabsList>
            {(['all','safe','stretch','ambitious'] as const).map(value=><TabsContent key={value} value={value} className="sr-only">{t('recommendationShowing')} {filterLabels[value]}</TabsContent>)}
          </Tabs>
          
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 border border-[var(--ink-faint)] rounded-sm overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-xs font-mono-ui uppercase transition-colors ${
                  viewMode === 'cards' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
                title="Card view"
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('scatter')}
                className={`px-3 py-2 text-xs font-mono-ui uppercase transition-colors flex items-center gap-1 ${
                  viewMode === 'scatter' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
                title="Scatter plot view"
              >
                <Map size={12} />
                Landscape
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-[var(--ink-soft)]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="border border-[var(--ink-faint)] bg-[var(--paper)] px-3 py-2 text-sm font-mono-ui uppercase hover:border-[var(--ink)]"
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="font-display mb-8 italic text-[var(--ink-soft)]">{t('recommendationLandscapeNote')}</p>
        
        {/* Scatter plot view */}
        {viewMode === 'scatter' && (
          <div className="mb-12">
            <CareerLandscapeScatter
              recommendations={visibleRecommendations}
              onCareerClick={(rec) => setExplanation(rec)}
              highlightedId={explanation?.occupationId}
              className="mx-auto"
            />
          </div>
        )}

        {/* Cards view */}
        {viewMode === 'cards' && (
          <motion.div 
            className="mb-12 grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {visibleRecommendations.map((recommendation) => (
              <motion.div 
                key={recommendation.occupationId} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                layout
              >
                <RecommendationCard 
                  recommendation={recommendation} 
                  locale={locale} 
                  lang={lang} 
                  copy={c} 
                  onExplain={() => setExplanation(recommendation)} 
                  onDismiss={() => handleDismissCareer(recommendation.occupationId)} 
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {hiddenCareers.size > 0 && (
          <div className="mb-8 border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--ink-soft)]">
                {hiddenCareers.size} career{hiddenCareers.size !== 1 ? 's' : ''} hidden
              </span>
              <button
                onClick={() => {
                  setHiddenCareers(new Set());
                  toast.success('All hidden careers restored');
                }}
                className="text-sm underline hover:no-underline"
              >
                Show all
              </button>
            </div>
          </div>
        )}
        <p className="font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
          {c.footer} · KB {recommendations.kbVersion} · profile v{passport.version}
        </p>
        <div className="mt-4">
          <NCOBadge variant="footer" />
        </div>
        <Link
          to="/counselor"
          className="fixed bottom-28 right-5 z-30 border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-4 py-3 text-sm shadow-[var(--shadow-hard-sm)] md:bottom-8"
        >
          {c.ask}
        </Link>
      </GuidanceEntrance>
      {explanation && (
        <WhyPanel
          recommendation={explanation}
          segment={passport.segment}
          onClose={() => setExplanation(null)}
        />
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  locale,
  lang,
  copy,
  onExplain,
  onDismiss,
}: {
  recommendation: CareerRecommendation;
  locale: string;
  lang: "en" | "hi" | "te";
  copy: { confidence:string; demand:string; why:string; build:string; dossier:string };
  onExplain: () => void;
  onDismiss: () => void;
}) {
  const { t } = useT();
  const occupation = occupationById.get(recommendation.occupationId)!;
  const market = marketFor(occupation.id);
  const group = landscapeGroup(recommendation.group);
  const groupLabel = group === 'safe'
    ? t('recommendationFilterSafe')
    : group === 'stretch'
      ? t('recommendationFilterStretch')
      : t('recommendationFilterAmbitious');

  // Calculate star rating (0-5 based on totalScore 0-100)
  const starRating = Math.round((recommendation.totalScore / 100) * 5);

  return (
    <article className="card-sketch group h-full p-6 transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_var(--ink)] md:p-8 relative">
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1 text-[var(--ink-faint)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 transition-opacity"
        title="Not interested"
      >
        <X size={18} />
      </button>
      
      <div className={`label-caps mb-3 ${
        group==='ambitious' ? 'border-l-4 border-[var(--accent-news)] pl-2' : 
        group==='stretch' ? 'border-l-4 border-blue-500 pl-2' :
        group==='safe' ? 'border-l-4 border-emerald-500 pl-2' : ''
      }`}>{groupLabel}</div>
      <div className="font-mono-ui text-[10px] uppercase text-[var(--ink-soft)]">
        NCO {occupation.ncoCode} · NSQF {occupation.nsqfEntryLevel}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display mt-2 text-2xl">
          {occupationName(occupation.id, occupation.title, lang)}
        </h3>
        <button
          onClick={() =>
            speak(
              `${occupationName(occupation.id, occupation.title, lang, false)}. ${recommendation.topReasons.slice(0, 2).map(reason=>localizedReason(reason,lang)).join(". ")}`,
              locale,
            )
          }
          className="min-h-11 min-w-11"
          aria-label={`Read ${occupation.title} aloud`}
        >
          <Volume2 size={16} aria-hidden="true" />
        </button>
      </div>
      
      {/* Visual Star Rating */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={18}
              className={star <= starRating ? 'fill-[var(--ink)] text-[var(--ink)]' : 'text-[var(--ink-faint)]'}
            />
          ))}
        </div>
        <span className="font-mono-ui text-sm text-[var(--ink-soft)]">
          {recommendation.totalScore}/100
        </span>
      </div>
      
      <div className="font-mono-ui mt-2 text-[10px] uppercase text-[var(--ink-soft)]">
        {copy.confidence} · {localizedConfidence(recommendation.confidence, lang)}
      </div>
      
      <ul className="mt-4 space-y-2">
        {recommendation.topReasons.slice(0, 2).map((reason) => (
          <li key={reason} className="text-sm text-[var(--ink-soft)]">
            → {localizedReason(reason, lang)}
          </li>
        ))}
      </ul>
      <div className="rule-top mt-4 pt-3">
        {recommendation.skillGapPreview.map((gap) => (
          <span
            key={gap.skillId}
            className="mr-3 inline-block font-mono-ui text-[9px] uppercase"
          >
            {skillById.get(gap.skillId)?.name ?? gap.skillId} · {gap.severity}
          </span>
        ))}
      </div>
      {market && (
        <p className="font-mono-ui mt-4 text-[9px] uppercase text-[var(--ink-soft)]">
          {copy.demand} {market.demandIndex} · {localizedTrend(market.growthTrend, lang)} ·{" "}
          {market.observedPeriod} · {market.regions.join(", ")}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            sounds.expand();
            hapticTap();
            onExplain();
          }}
          className="min-h-11 border border-[var(--ink)]/20 text-sm"
        >
          {copy.why}
        </button>
        <Link
          to={`/pathway/${occupation.id}`}
          className="flex min-h-11 items-center justify-center bg-[var(--ink)] text-sm text-[var(--paper)]"
        >
          {copy.build}
        </Link>
      </div>
      <Link
        to={`/job/detail?occupation=${occupation.id}`}
        className="mt-3 block text-center text-xs underline"
      >
        {copy.dossier}
      </Link>
    </article>
  );
}

export default RecommendationsPage;
