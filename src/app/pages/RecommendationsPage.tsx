import { useEffect, useMemo, useState } from "react";
import { motion } from 'motion/react';
import { Link } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { WhyPanel } from "../components/guidance/WhyPanel";
import { StopPress } from "../components/guidance/StopPress";
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
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';

type LandscapeFilter = 'all' | 'safe' | 'stretch' | 'frontier';
const landscapeGroup = (group: RecommendationGroup): Exclude<LandscapeFilter, 'all'> =>
  group === 'best_fit' || group === 'easiest_transition' ? 'safe' :
    group === 'growth' || group === 'aspiration' ? 'stretch' : 'frontier';

export function RecommendationsPage() {
  const {
    passport,
    recommendations,
    recommendationChanges,
    dismissRecommendationChanges,
    recompute,
  } = useGuidance();
  const { locale, lang } = useT();
  const c = lang === "hi" ? { start:"आपका करियर परिदृश्य पासपोर्ट से शुरू होता है", onboarding:"ऑनबोर्डिंग शुरू करें", preparing:"आपका नियम-आधारित परिदृश्य तैयार हो रहा है…", header:"करियर परिदृश्य", title:"खोजने योग्य मज़बूत विकल्प", intro:"आपकी मौजूदा प्रोफ़ाइल पर आधारित। स्कोर प्रमाण-आधारित संकेत हैं, अंतिम निर्णय नहीं।", ask:"क्यों पूछें · अगर ऐसा हो तो पूछें", confidence:"विश्वसनीयता", demand:"माँग", why:"यह क्यों?", build:"मार्ग बनाएँ", dossier:"पूरा विवरण पढ़ें", footer:"संस्करणित ज्ञान-आधार पर नियम-आधारित स्कोरिंग · अंकों के लिए LLM का उपयोग नहीं" } : lang === "te" ? { start:"మీ కెరీర్ దృశ్యం పాస్‌పోర్ట్‌తో మొదలవుతుంది", onboarding:"ఆన్‌బోర్డింగ్ ప్రారంభించండి", preparing:"మీ నియమ-ఆధారిత దృశ్యం సిద్ధమవుతోంది…", header:"కెరీర్ దృశ్యం", title:"అన్వేషించదగిన బలమైన ఎంపికలు", intro:"మీ ప్రస్తుత ప్రొఫైల్ ఆధారంగా. స్కోర్లు ఆధారాలతో కూడిన సంకేతాలు మాత్రమే, తీర్పు కాదు.", ask:"ఎందుకో అడగండి · పరిస్థితి మారితే అడగండి", confidence:"నమ్మకం", demand:"డిమాండ్", why:"ఇది ఎందుకు?", build:"మార్గం నిర్మించండి", dossier:"పూర్తి వివరాలు చదవండి", footer:"వెర్షన్ చేసిన జ్ఞాన భాండాగారంపై నియమ-ఆధారిత స్కోరింగ్ · స్కోర్లకు LLM ఉపయోగించలేదు" } : { start:"Your career landscape starts with a passport", onboarding:"Start onboarding", preparing:"Preparing your deterministic landscape…", header:"The Career Landscape", title:"Strong options to explore", intro:"Based on your current profile. Scores are evidence-led signals, never a verdict.", ask:"Ask why · Ask what-if", confidence:"confidence", demand:"Demand", why:"Why this?", build:"Build pathway", dossier:"Read the full dossier", footer:"Deterministic scoring over the versioned knowledge base · LLM not used for scores" };
  const [explanation, setExplanation] = useState<CareerRecommendation | null>(
    null,
  );
  const [filter, setFilter] = useState<LandscapeFilter>('all');
  const reveal = useReveal<HTMLDivElement>();
  useEffect(() => {
    if (passport && !recommendations) recompute();
  }, [passport, recommendations, recompute]);
  const visibleRecommendations = useMemo(() => recommendations?.recommendations.filter((item) => filter === 'all' || landscapeGroup(item.group) === filter) ?? [], [filter, recommendations]);
  if (!passport)
    return (
      <div className="min-h-screen p-8 text-center">
        <StickFigure pose="mapping" size={120} />
        <h1 className="mt-6 text-4xl font-[Playfair_Display]">
          {c.start}
        </h1>
        <Link
          to="/onboarding"
          className="mt-5 inline-block bg-black px-5 py-3 font-[Inter] text-white"
        >
          {c.onboarding}
        </Link>
      </div>
    );
  if (!recommendations)
    return (
      <div className="min-h-screen p-8 text-center font-[Inter]">
        {c.preparing}
      </div>
    );
  return (
    <div className="min-h-screen bg-[var(--paper)] px-6 py-16 pb-24 md:py-24">
      <GuidanceEntrance className="mx-auto max-w-6xl">
        <header className="mb-10 grid gap-6 border-b-2 border-[var(--ink)] pb-8 md:grid-cols-[1fr_auto]">
          <StickFigure pose="mapping" size={112} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              {c.header} ·{" "}
              {new Date(recommendations.generatedAt).toLocaleDateString(locale)}{" "}
              · profile v{passport.version} · {recommendations.kbVersion}
            </div>
            <h1 className="font-display mt-3 text-5xl leading-[1.05] tracking-tighter md:text-6xl"><TextReveal text={c.title} /></h1>
            <p className="mt-2 font-[Inter] text-black/60">
              {c.intro}
            </p>
          </div>
        </header>
        <StopPress
          changes={recommendationChanges}
          onDismiss={dismissRecommendationChanges}
          onExplain={(occupationId)=>{const item=recommendations.recommendations.find(recommendation=>recommendation.occupationId===occupationId);if(item)setExplanation(item)}}
        />
        <Tabs value={filter} onValueChange={(value)=>setFilter(value as LandscapeFilter)} className="mb-8">
          <TabsList aria-label="Career landscape filters">
            {(['all','safe','stretch','frontier'] as const).map(value=><TabsTrigger key={value} value={value} data-testid={`recommendations-filter-${value}`}>{value}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <p className="font-display mb-8 italic text-[var(--ink-soft)]">Every landscape keeps grounded, ambitious and exploratory routes in view.</p>
        <motion.div ref={reveal.ref} variants={reveal.containerVariants} initial="hidden" animate={reveal.animate} className="mb-12 grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {visibleRecommendations.map((recommendation) => (
            <motion.div key={recommendation.occupationId} variants={reveal.itemVariants} layout>
              <RecommendationCard recommendation={recommendation} locale={locale} lang={lang} copy={c} onExplain={() => setExplanation(recommendation)} />
            </motion.div>
          ))}
        </motion.div>
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wide text-black/45">
          {c.footer} · KB {recommendations.kbVersion} · profile v{passport.version}
        </p>
        <Link
          to="/counselor"
          className="fixed bottom-20 right-5 z-30 border-2 border-black bg-[#f9f8f7] px-4 py-3 font-[Inter] text-sm shadow-[3px_3px_0_#1a1a1a]"
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
}: {
  recommendation: CareerRecommendation;
  locale: string;
  lang: "en" | "hi" | "te";
  copy: { confidence:string; demand:string; why:string; build:string; dossier:string };
  onExplain: () => void;
}) {
  const occupation = occupationById.get(recommendation.occupationId)!;
  const market = marketFor(occupation.id);
  return (
    <article className="card-sketch group h-full p-6 transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_var(--ink)] md:p-8">
      <div className={`label-caps mb-3 ${landscapeGroup(recommendation.group)==='frontier'?'!text-[var(--accent-news)]':''}`}>{landscapeGroup(recommendation.group)}</div>
      <div className="font-[JetBrains_Mono] text-[10px] uppercase text-black/50">
        NCO {occupation.ncoCode} · NSQF {occupation.nsqfEntryLevel}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="mt-2 text-2xl font-[Playfair_Display]">
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
          🔊
        </button>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="font-mono-ui text-5xl">
          {recommendation.totalScore}
        </div>
        <div className="font-[JetBrains_Mono] text-[10px] uppercase">
          {copy.confidence} · {localizedConfidence(recommendation.confidence, lang)}
        </div>
      </div>
      <div className="mt-2 h-2 bg-black/10">
        <div className="h-2 origin-left bg-black transition-transform duration-700" style={{ transform: `scaleX(${recommendation.totalScore/100})` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {recommendation.topReasons.slice(0, 2).map((reason) => (
          <li key={reason} className="font-[Inter] text-sm text-black/70">
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
        <p className="mt-4 font-[JetBrains_Mono] text-[9px] uppercase text-black/50">
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
          className="min-h-11 border border-black/20 font-[Inter] text-sm"
        >
          {copy.why}
        </button>
        <Link
          to={`/pathway/${occupation.id}`}
          className="flex min-h-11 items-center justify-center bg-black font-[Inter] text-sm text-white"
        >
          {copy.build}
        </Link>
      </div>
      <Link
        to={`/job/detail?occupation=${occupation.id}`}
        className="mt-3 block text-center font-[Inter] text-xs underline"
      >
        {copy.dossier}
      </Link>
    </article>
  );
}

export default RecommendationsPage;
