import { useEffect, useMemo, useState } from "react";
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

const order: RecommendationGroup[] = [
  "best_fit",
  "growth",
  "easiest_transition",
  "aspiration",
  "exploration",
  "vocational_entrepreneurial",
];

export function RecommendationsPage() {
  const {
    passport,
    recommendations,
    recommendationChanges,
    dismissRecommendationChanges,
    recompute,
  } = useGuidance();
  const { t, locale } = useT();
  const [explanation, setExplanation] = useState<CareerRecommendation | null>(
    null,
  );
  useEffect(() => {
    if (passport && !recommendations) recompute();
  }, [passport, recommendations, recompute]);
  const groups = useMemo(
    () =>
      order
        .map(
          (group) =>
            [
              group,
              recommendations?.recommendations.filter(
                (item) => item.group === group,
              ) ?? [],
            ] as const,
        )
        .filter(([, items]) => items.length),
    [recommendations],
  );
  if (!passport)
    return (
      <div className="min-h-screen p-8 text-center">
        <StickFigure pose="mapping" size={120} />
        <h1 className="mt-6 text-4xl font-[Playfair_Display]">
          Your career landscape starts with a passport
        </h1>
        <Link
          to="/onboarding"
          className="mt-5 inline-block bg-black px-5 py-3 font-[Inter] text-white"
        >
          Start onboarding
        </Link>
      </div>
    );
  if (!recommendations)
    return (
      <div className="min-h-screen p-8 text-center font-[Inter]">
        Preparing your deterministic landscape…
      </div>
    );
  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center gap-4 border-y-4 border-double border-black py-6">
          <StickFigure pose="mapping" size={88} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              The Career Landscape ·{" "}
              {new Date(recommendations.generatedAt).toLocaleDateString(locale)}{" "}
              · profile v{passport.version} · {recommendations.kbVersion}
            </div>
            <h1 className="text-4xl font-[Playfair_Display] md:text-5xl">
              Strong options to explore
            </h1>
            <p className="mt-2 font-[Inter] text-black/60">
              Based on your current profile. Scores are evidence-led signals,
              never a verdict.
            </p>
          </div>
        </header>
        <StopPress
          changes={recommendationChanges}
          onDismiss={dismissRecommendationChanges}
        />
        {groups.map(([group, items]) => (
          <section key={group} className="mb-10">
            <h2 className="mb-4 border-b border-black/20 pb-2 font-[JetBrains_Mono] text-xs uppercase tracking-[.2em]">
              {t(group)}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.occupationId}
                  recommendation={recommendation}
                  locale={locale}
                  onExplain={() => setExplanation(recommendation)}
                />
              ))}
            </div>
          </section>
        ))}
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wide text-black/45">
          Deterministic scoring over KB {recommendations.kbVersion} · profile v
          {passport.version} · LLM used for wording only.
        </p>
        <Link
          to="/counselor"
          className="fixed bottom-20 right-5 z-30 border-2 border-black bg-[#f9f8f7] px-4 py-3 font-[Inter] text-sm shadow-[3px_3px_0_#1a1a1a]"
        >
          Ask why · Ask what-if
        </Link>
      </div>
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
  onExplain,
}: {
  recommendation: CareerRecommendation;
  locale: string;
  onExplain: () => void;
}) {
  const occupation = occupationById.get(recommendation.occupationId)!;
  const market = marketFor(occupation.id);
  return (
    <article className="bg-white p-5 shadow-[3px_3px_0_rgba(0,0,0,.05)] border border-black/10">
      <div className="font-[JetBrains_Mono] text-[10px] uppercase text-black/50">
        NCO {occupation.ncoCode} · NSQF {occupation.nsqfEntryLevel}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="mt-2 text-2xl font-[Playfair_Display]">
          {occupation.title}
        </h3>
        <button
          onClick={() =>
            speak(
              `${occupation.title}. ${recommendation.topReasons.slice(0, 2).join(". ")}`,
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
        <div className="text-5xl font-[Playfair_Display]">
          {recommendation.totalScore}
        </div>
        <div className="font-[JetBrains_Mono] text-[10px] uppercase">
          confidence · {recommendation.confidence}
        </div>
      </div>
      <div className="mt-2 h-2 bg-black/10">
        <div
          className="h-2 bg-black"
          style={{ width: `${recommendation.totalScore}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {recommendation.topReasons.slice(0, 2).map((reason) => (
          <li key={reason} className="font-[Inter] text-sm text-black/70">
            → {reason}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1">
        {recommendation.skillGapPreview.map((gap) => (
          <span
            key={gap.skillId}
            className="border border-black/10 px-2 py-1 font-[JetBrains_Mono] text-[9px]"
          >
            {skillById.get(gap.skillId)?.name ?? gap.skillId} · {gap.severity}
          </span>
        ))}
      </div>
      {market && (
        <p className="mt-4 font-[JetBrains_Mono] text-[9px] uppercase text-black/50">
          Demand {market.demandIndex} · {market.growthTrend} ·{" "}
          {market.observedPeriod} · {market.regions.join(", ")}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            sounds.expand();
            onExplain();
          }}
          className="min-h-11 border border-black/20 font-[Inter] text-sm"
        >
          Why this?
        </button>
        <Link
          to={`/pathway/${occupation.id}`}
          className="flex min-h-11 items-center justify-center bg-black font-[Inter] text-sm text-white"
        >
          Build pathway
        </Link>
      </div>
      <Link
        to={`/job/detail?occupation=${occupation.id}`}
        className="mt-3 block text-center font-[Inter] text-xs underline"
      >
        Read the full dossier
      </Link>
    </article>
  );
}

export default RecommendationsPage;
