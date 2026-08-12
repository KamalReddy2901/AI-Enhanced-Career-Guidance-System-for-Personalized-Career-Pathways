import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { PathwayGraph } from "../components/guidance/PathwayGraph";
import { ScoreBar } from "../components/guidance/ScoreBar";
import { WhyPanel, type ScoreEvidence } from "../components/guidance/WhyPanel";
import { useGuidance } from "../context/GuidanceContext";
import { useAuth } from "../context/AuthContext";
import { buildPathwayPlan } from "../engine/pathways";
import {
  marketFor,
  occupationById,
  qualificationById,
} from "../data/knowledge";
import { skillName } from "../engine/gaps";
import {
  calculateCompleteness,
  mergeSkillClaims,
} from "../engine/skillProfile";
import type { Proficiency, SkillClaim } from "../engine/types";
import { logProgress, savePathway } from "../services/guidanceDb";
import { sounds } from "../utils/sounds";
import { useStreak } from "../hooks/useStreak";
import { useT } from "../i18n";

export function PathwayPage() {
  const { occupationId = "" } = useParams();
  const {
    passport,
    pathways,
    savePathwayPlan,
    replacePathwayPlan,
    updatePassport,
  } = useGuidance();
  const { user } = useAuth();
  const streak = useStreak();
  const { lang } = useT();
  const c = lang === "hi" ? { start:"पहले ऑनबोर्डिंग शुरू करें", missing:"यह व्यवसाय मौजूदा ज्ञान-आधार में नहीं है।", demand:"माँग", unavailable:"माँग का सांकेतिक डेटा उपलब्ध नहीं", gaps:"कौशल-अंतर रिपोर्ट · दक्षता और विश्वसनीयता के अनुसार", evidence:"प्रमाण की विश्वसनीयता", readiness:"तैयारी", bring:"आपके मौजूदा उपयोगी कौशल", validate:"स्थानांतरित होने वाले प्रमाण दिखाने के लिए पूर्व सीख को सत्यापित करें।", routes:"तीन व्यावहारिक मार्ग", months:"महीने", confidence:"विश्वसनीयता", map:"इंटरैक्टिव मार्ग मानचित्र", checklist:"जाँच-सूची", streak:"विकास क्रम", day:"दिन", find:"यहाँ खोजें", complete:"मार्ग पूरा—बातचीत की तैयारी करें", completeNote:"आपके प्रमाण और तैयारी की दोबारा गणना हुई है। आवेदन से पहले भूमिका-विशिष्ट प्रश्नों का अभ्यास करें।", interview:"साक्षात्कार अभ्यास खोलें", ask:"क्यों पूछें · अगर ऐसा हो तो पूछें", labels:{direct:"सबसे तेज़",stepping_stone:"कम जोखिम",qualification_first:"प्रमाणपत्र मार्ग"} } : lang === "te" ? { start:"ముందుగా ఆన్‌బోర్డింగ్ ప్రారంభించండి", missing:"ఈ వృత్తి ప్రస్తుత జ్ఞాన భాండాగారంలో లేదు.", demand:"డిమాండ్", unavailable:"సూచనాత్మక డిమాండ్ సమాచారం అందుబాటులో లేదు", gaps:"నైపుణ్య లోటు నివేదిక · ప్రావీణ్యం, నమ్మకం ప్రకారం", evidence:"ఆధారాల నమ్మకం", readiness:"సిద్ధత", bring:"మీరు ఇప్పటికే తీసుకువచ్చేవి", validate:"బదిలీ చేయగల ఆధారాలను చూపడానికి గత అభ్యాసాన్ని ధృవీకరించండి.", routes:"మూడు ఆచరణీయ మార్గాలు", months:"నెలలు", confidence:"నమ్మకం", map:"ఇంటరాక్టివ్ మార్గ పటం", checklist:"తనిఖీ జాబితా", streak:"ఎదుగుదల పరంపర", day:"రోజు", find:"ఇక్కడ కనుగొనండి", complete:"మార్గం పూర్తి—సంభాషణకు సిద్ధం కండి", completeNote:"మీ ఆధారాలు, సిద్ధత మళ్లీ లెక్కించబడ్డాయి. దరఖాస్తుకు ముందు పాత్ర-నిర్దిష్ట ప్రశ్నలను సాధన చేయండి.", interview:"ఇంటర్వ్యూ సాధన తెరవండి", ask:"ఎందుకో అడగండి · పరిస్థితి మారితే అడగండి", labels:{direct:"అత్యంత వేగవంతం",stepping_stone:"తక్కువ ప్రమాదం",qualification_first:"అర్హత మార్గం"} } : { start:"Start onboarding first", missing:"This occupation is not in the current knowledge base.", demand:"Demand", unavailable:"Indicative demand signal unavailable", gaps:"Skill gap report · proficiency & confidence adjusted", evidence:"Evidence confidence", readiness:"Readiness", bring:"What you already bring", validate:"Validate prior learning to surface transferable evidence.", routes:"Three plausible routes", months:"months", confidence:"confidence", map:"Interactive pathway map", checklist:"checklist", streak:"growth streak", day:"day", find:"Find via", complete:"Route complete—prepare for the conversation", completeNote:"Your evidence and readiness have been recomputed. Practice role-specific questions before applying.", interview:"Open interview prep", ask:"Ask why · Ask what-if", labels:{direct:"Fastest",stepping_stone:"Lower-risk",qualification_first:"Credential route"} };
  const existing = pathways.find((plan) => plan.occupationId === occupationId);
  const initial = useMemo(() => {
    if (!passport) return null;
    const refreshed = buildPathwayPlan(passport, occupationId);
    if (!existing) return refreshed;
    return {
      ...refreshed,
      chosenRoute: existing.chosenRoute,
      routes: refreshed.routes.map((route) => {
        const saved = existing.routes.find((item) => item.kind === route.kind);
        return {
          ...route,
          steps: route.steps.map((step, index) => ({
            ...step,
            done: saved?.steps[index]?.done ?? false,
          })),
        };
      }),
    };
  }, [passport, existing, occupationId]);
  const [plan, setPlan] = useState(initial);
  const [chosenKind, setChosenKind] = useState(
    initial?.chosenRoute ?? initial?.routes[0]?.kind,
  );
  const [why, setWhy] = useState<ScoreEvidence | null>(null);

  useEffect(() => setPlan(initial), [initial]);
  useEffect(() => {
    if (!plan || existing) return;
    savePathwayPlan(plan);
    if (user?.id) void savePathway(user.id, plan);
  }, [plan, existing, savePathwayPlan, user]);

  if (!passport || !plan)
    return (
      <div className="min-h-screen p-8 text-center">
        <Link to="/onboarding" className="underline">
          {c.start}
        </Link>
      </div>
    );
  const occupation = occupationById.get(occupationId);
  if (!occupation)
    return (
      <div className="min-h-screen p-8 text-center font-[Inter]">
        {c.missing}
      </div>
    );
  const market = marketFor(occupationId);
  const route =
    plan.routes.find((item) => item.kind === chosenKind) ?? plan.routes[0];
  const routeComplete = route.steps.every((step) => step.done);

  const chooseRoute = (kind: typeof route.kind) => {
    const next = { ...plan, chosenRoute: kind };
    setPlan(next);
    setChosenKind(kind);
    replacePathwayPlan(next);
    if (user?.id) void savePathway(user.id, next);
    sounds.pathUnlock();
  };
  const toggleStep = (index: number) => {
    const routes = plan.routes.map((candidate) =>
      candidate.kind === route.kind
        ? {
            ...candidate,
            steps: candidate.steps.map((step, stepIndex) =>
              stepIndex === index ? { ...step, done: !step.done } : step,
            ),
          }
        : candidate,
    );
    const next = { ...plan, routes, chosenRoute: route.kind };
    setPlan(next);
    replacePathwayPlan(next);
    if (user?.id) void savePathway(user.id, next);
    sounds.success();
    const step = routes.find((candidate) => candidate.kind === route.kind)!
      .steps[index];
    if (step.done && step.refId) {
      const qualification = qualificationById.get(step.refId);
      const skillIds =
        qualification?.developsSkillIds ??
        (step.kind === "learn" || step.kind === "validate_skill"
          ? [step.refId]
          : []);
      if (skillIds.length)
        updatePassport((previous) => {
          if (!previous) throw new Error("Career Passport unavailable");
          const confidence =
            step.kind === "qualification"
              ? 0.9
              : step.kind === "validate_skill"
                ? 0.75
                : 0.85;
          const type =
            step.kind === "qualification"
              ? ("credentialed" as const)
              : step.kind === "validate_skill"
                ? ("self_reported" as const)
                : ("assessed" as const);
          const claims: SkillClaim[] = skillIds.map((skillId) => {
            const required =
              occupation.skills.find((item) => item.skillId === skillId)
                ?.requiredProficiency ?? 2;
            return {
              skillId,
              proficiency: Math.min(4, required) as Proficiency,
              confidence,
              evidence: [
                {
                  type,
                  description: `Completed pathway step: ${step.label}`,
                  confidence,
                  observedAt: new Date().toISOString(),
                },
              ],
            };
          });
          const next = {
            ...previous,
            skills: mergeSkillClaims(previous.skills, claims),
          };
          next.completeness = calculateCompleteness(next);
          return next;
        });
    }
    if (user?.id)
      void logProgress(
        user.id,
        step.kind === "qualification" || step.kind === "learn"
          ? "module_completed"
          : "milestone_done",
        { occupationId, route: route.kind, stepIndex: index, step },
      );
  };

  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8 pb-28">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-4 border-y-4 border-double border-black py-6 mb-8">
          <StickFigure pose="climbing" size={92} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              NCO {occupation.ncoCode} · NSQF {occupation.nsqfEntryLevel} ·{" "}
              {market?.observedPeriod}
            </div>
            <h1 className="text-4xl md:text-5xl font-[Playfair_Display]">
              {occupation.title}
            </h1>
            <p className="font-[Inter] text-black/60 mt-2">
              {market
                ? `${c.demand} ${market.demandIndex} · ${market.growthTrend} · ${market.regions.join(", ")}`
                : c.unavailable}
            </p>
          </div>
        </header>
        <section className="grid lg:grid-cols-[1.5fr_.75fr] gap-4 mb-8">
          <div className="bg-white border border-black/10 p-5">
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-wide">
              {c.gaps}
            </div>
            <div className="mt-4 space-y-4">
              {plan.gapReport.gaps.slice(0, 8).map((gap) => (
                <button key={gap.skillId} className="block min-h-11 w-full text-left" onClick={()=>setWhy({title:`Why the ${skillName(gap.skillId)} gap is ${gap.severity}`,eyebrow:"Skill-gap evidence desk",summary:`This gap compares your current proficiency ${gap.current}/4 with the role requirement ${gap.required}/4, then adjusts for requirement importance and evidence confidence.`,method:"severity = (required − current) ÷ 4 × importance × (2 − claim confidence), normalized over the occupation requirement set.",items:[{label:"Current proficiency",value:gap.current*25,detail:`Current Career Passport level: ${gap.current}/4.`},{label:"Required proficiency",value:gap.required*25,detail:`Curated requirement for ${occupation.title}: ${gap.required}/4.`},{label:"Requirement importance",value:gap.importance*100,detail:"Importance comes from the versioned occupation knowledge base."},{label:"Evidence confidence",value:gap.confidence*100,detail:"Accumulated from the evidence ledger; weaker evidence increases uncertainty."}],source:`KB kb-2026.06.1 · ${occupation.ncoCode}`})} aria-label={`Explain ${skillName(gap.skillId)} gap score ${gap.severity}`}>
                  <ScoreBar
                    label={`${skillName(gap.skillId)} · current ${gap.current} → required ${gap.required}`}
                    value={gap.severity}
                  />
                  <p className="mt-1 font-[Inter] text-xs text-black/50">
                    {c.evidence} {Math.round(gap.confidence * 100)}%
                  </p>
                  <div className="mt-1 font-[Inter] text-[10px] underline">Why this gap?</div>
                </button>
              ))}
            </div>
          </div>
          <button className="block min-h-11 w-full bg-white border border-black/10 p-5 text-left" onClick={()=>setWhy({title:`Why readiness is ${plan.gapReport.readiness}`,eyebrow:"Readiness evidence desk",summary:"Readiness is the complement of the proficiency- and confidence-adjusted Skill Gap Index. It is a planning signal, not a prediction of success.",method:"Each requirement gap is weighted by importance and adjusted for evidence confidence. SGI is the normalized weighted total; readiness = 100 − SGI.",items:[{label:"Readiness",value:plan.gapReport.readiness,detail:"The share of required proficiency currently evidenced after confidence adjustment."},{label:"Skill Gap Index",value:plan.gapReport.sgi,detail:"Lower is better; this is the remaining normalized gap across all role requirements."},...plan.gapReport.gaps.slice(0,4).map(gap=>({label:skillName(gap.skillId),value:gap.severity,detail:`Current ${gap.current}/4 → required ${gap.required}/4 · ${Math.round(gap.confidence*100)}% evidence confidence.`}))],source:`KB kb-2026.06.1 · profile v${passport.version}`})} aria-label={`Explain readiness score ${plan.gapReport.readiness}`}>
            <svg viewBox="0 0 160 100" className="mx-auto w-full max-w-[220px]">
              <path
                d="M20 80a60 60 0 01120 0"
                fill="none"
                stroke="#ddd"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M20 80a60 60 0 01120 0"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="12"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${plan.gapReport.readiness} 100`}
              />
              <text
                x="80"
                y="75"
                textAnchor="middle"
                fontFamily="Playfair Display"
                fontSize="31"
              >
                {plan.gapReport.readiness}
              </text>
            </svg>
            <div className="text-center font-[JetBrains_Mono] text-xs uppercase">
              {c.readiness} · SGI {plan.gapReport.sgi}
            </div>
            <div className="mt-1 text-center font-[Inter] text-[10px] underline">Why these scores?</div>
            <h2 className="font-[Playfair_Display] text-xl mt-6">
              {c.bring}
            </h2>
            {plan.gapReport.transferable.length ? (
              <ul className="mt-3 space-y-2">
                {plan.gapReport.transferable.map((item) => (
                  <li
                    key={item.skillId}
                    title={item.fromExperience}
                    className="font-[Inter] text-sm"
                  >
                    ✓ {skillName(item.skillId)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-[Inter] text-sm text-black/55">
                {c.validate}
              </p>
            )}
          </button>
        </section>
        <section className="mb-8">
          <h2 className="text-3xl font-[Playfair_Display] mb-4">
            {c.routes}
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {plan.routes.map((candidate) => (
              <button
                key={candidate.kind}
                onClick={() => chooseRoute(candidate.kind)}
                className={`min-h-44 text-left bg-white border-2 p-5 ${route.kind === candidate.kind ? "border-black shadow-[3px_3px_0_#1a1a1a]" : "border-black/10"}`}
              >
                <div className="font-[JetBrains_Mono] text-xs uppercase">
                  {c.labels[candidate.kind]}
                </div>
                <div className="text-3xl font-[Playfair_Display] mt-3">
                  {candidate.totalMonths} {c.months}
                </div>
                <p className="font-[Inter] text-sm text-black/60 mt-2">
                  {candidate.tradeoff}
                </p>
                <div className="font-[JetBrains_Mono] text-[10px] uppercase mt-4">
                  {candidate.confidence} {c.confidence}
                </div>
              </button>
            ))}
          </div>
        </section>
        <section className="mb-8">
          <h2 className="text-3xl font-[Playfair_Display] mb-4">
            {c.map}
          </h2>
          <PathwayGraph route={route} />
        </section>
        <section className="bg-white border border-black/10 p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-[Playfair_Display]">{c.labels[route.kind]} {c.checklist}</h2><span className="font-[JetBrains_Mono] text-[10px] uppercase">{c.streak} · {streak.currentStreak} {c.day}</span></div>
          <div className="mt-4 space-y-3">
            {route.steps.map((step, index) => (
              <div
                key={`${step.kind}-${index}`}
                className="flex gap-3 border-b border-black/10 pb-3"
              >
                <button
                  onClick={() => toggleStep(index)}
                  className={`min-h-11 min-w-11 border-2 ${step.done ? "bg-black text-white border-black" : "border-black/20"}`}
                  aria-label={`Mark ${step.label} ${step.done ? "not done" : "done"}`}
                >
                  {step.done ? "✓" : "○"}
                </button>
                <div>
                  <div className="font-[Inter] text-sm font-semibold">
                    {step.label}
                  </div>
                  <div className="font-[JetBrains_Mono] text-[10px] uppercase text-black/50">
                    {step.kind} · {step.estMonths} {c.months}
                  </div>
                  {step.refId && qualificationById.has(step.refId) && (
                    <a
                      className="font-[Inter] text-xs underline"
                      href="https://www.skillindiadigital.gov.in/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.find} {qualificationById.get(step.refId)!.providerHint}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        {routeComplete && <section className="mt-6 flex items-center gap-4 border-2 border-black bg-white p-5"><StickFigure pose="celebrating" size={72}/><div><h2 className="text-2xl font-[Playfair_Display]">{c.complete}</h2><p className="mt-1 font-[Inter] text-sm text-black/60">{c.completeNote}</p><Link to={`/interview-prep?job=${encodeURIComponent(occupation.title)}`} className="mt-3 inline-block min-h-11 bg-black px-4 py-3 font-[Inter] text-sm text-white">{c.interview} →</Link></div></section>}
        <p className="mt-6 font-[JetBrains_Mono] text-[10px] uppercase text-black/45">
          Deterministic scoring over KB kb-2026.06.1 · profile v
          {passport.version} · LLM used for wording only.
        </p>
        <Link
          to="/counselor"
          className="fixed right-5 bottom-20 border-2 border-black bg-[#f9f8f7] px-4 py-3 font-[Inter] text-sm shadow-[3px_3px_0_#1a1a1a]"
        >
          {c.ask}
        </Link>
        {why && <WhyPanel evidence={why} onClose={()=>setWhy(null)}/>}
      </div>
    </div>
  );
}

export default PathwayPage;
