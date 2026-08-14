import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { VALUE_CHOICES, scoreValues } from "../engine/values";
import { calculateCompleteness } from "../engine/skillProfile";
import { useGuidance } from "../context/GuidanceContext";
import { useAuth } from "../context/AuthContext";
import { saveAssessment } from "../services/guidanceDb";
import { sounds } from "../utils/sounds";
import { useT } from "../i18n";
import { valueItemText } from "../i18n/assessmentItems";
import { speak } from "../utils/voice";
import { WhyPanel, type ScoreEvidence } from "../components/guidance/WhyPanel";
import { useVoiceStatus } from "../hooks/useVoiceStatus";
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';
import { ScoreBar } from '../components/guidance/ScoreBar';
import { VoiceWaveform } from '../components/guidance/VoiceWaveform';
import { AnimatePresence, motion } from 'motion/react';
export function AssessValuesPage() {
  const navigate = useNavigate();
  const { passport, updatePassport } = useGuidance();
  const { user } = useAuth();
  const { lang, locale } = useT();
  const voiceStatus = useVoiceStatus();
  const c = lang === "hi" ? { desk:"कार्य-मूल्य डेस्क", result:"आपके कार्य-मूल्य", question:"आपके लिए क्या अधिक महत्त्वपूर्ण है?", note:"काम में आपकी प्राथमिकताओं की विकल्प-आधारित झलक। संदर्भ के साथ प्राथमिकताएँ बदल सकती हैं।", back:"आकलन डेस्क पर वापस जाएँ", choose:"एक चुनें", read:"सुनें" } : lang === "te" ? { desk:"పని విలువల విభాగం", result:"మీ పని విలువలు", question:"మీకు ఏది ఎక్కువ ముఖ్యం?", note:"పనిలో మీరు విలువిచ్చే అంశాల ఎంపిక-ఆధారిత చిత్రం. సందర్భంతో ప్రాధాన్యతలు మారవచ్చు.", back:"అంచనా విభాగానికి తిరిగి వెళ్ళండి", choose:"ఒకటి ఎంచుకోండి", read:"వినండి" } : { desk:"values desk", result:"Your work values", question:"Which matters more to you?", note:"A forced-choice snapshot of what you value at work. Your priorities can change with context.", back:"Back to assessment desk", choose:"choose one", read:"Read" };
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "left" | "right">>({});
  const [result, setResult] = useState<ReturnType<typeof scoreValues> | null>(
    null,
  );
  const [why, setWhy] = useState<ScoreEvidence | null>(null);
  const answerLock = useRef(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const choice = VALUE_CHOICES[i];
  const choose = (side: "left" | "right") => {
    if (answerLock.current || result) return;
    answerLock.current = true;
    setIsAdvancing(true);
    const next = { ...answers, [choice.id]: side };
    sounds.pop();
    hapticLight();
    if (i === VALUE_CHOICES.length - 1) {
      const scored = scoreValues(next);
      setResult(scored);
      updatePassport((prev) => {
        if (!prev) throw new Error("Complete onboarding first");
        const p = { ...prev, values: scored };
        p.completeness = calculateCompleteness(p);
        return p;
      });
      void saveAssessment(user?.id ?? null, "values", scored);
      sounds.success();
      hapticSuccess();
    } else {
      setAnswers(next);
      setI((current) => Math.min(current + 1, VALUE_CHOICES.length - 1));
      window.setTimeout(() => {
        answerLock.current = false;
        setIsAdvancing(false);
      }, 450);
    }
  };
  return (
    <div className="assessment-page min-h-screen p-4 md:p-8">
      <GuidanceEntrance className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 border-b-2 border-black pb-5 mb-8">
          <StickFigure pose={result ? "celebrating" : "thinking"} size={76} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              CareerCase · {c.desk}
            </div>
            <h1><TextReveal text={result ? c.result : c.question} /></h1>
          </div>
        </div>
        {voiceStatus.message && <p className="mb-3 font-[Inter] text-xs text-black/55" role="status" aria-live="polite">{voiceStatus.message}</p>}
        {result ? (
          <AnimatePresence mode="wait"><motion.div key={choice.id} initial={{x:24,opacity:0}} animate={{x:0,opacity:1}} exit={{x:-24,opacity:0}} transition={{duration:.35}} className="max-w-xl mx-auto">
            <div className="space-y-3">
              {Object.entries(result)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value]) => (
                  <button key={key} className="block min-h-11 w-full text-left" onClick={()=>{const selected=VALUE_CHOICES.filter(choice=>choice[answers[choice.id]??"left"].dimension===key);setWhy({title:`Why ${key} is ${value}`,eyebrow:"Work-values evidence desk",summary:`You selected ${selected.length} choices associated with ${key} across 15 forced-choice pairs.`,method:"Each selected side adds one count to its value dimension. Counts are divided by all 15 choices and normalized so the six displayed dimensions sum to exactly 100.",items:selected.map((choice,index)=>({label:`Selected evidence ${index+1}`,detail:choice[answers[choice.id]??"left"].label})),source:"15-pair deterministic work-values sorter"})}} aria-label={`Explain ${key} score ${value}`}>
                    <ScoreBar label={key} value={value} />
                    <div className="mt-1 font-[Inter] text-[10px] underline">Why this score?</div>
                  </button>
                ))}
            </div>
            <p className="mt-6 text-sm font-[Inter] text-black/60">
              {c.note}
            </p>
            <button
              onClick={() => navigate("/assess")}
              className="mt-6 w-full bg-black text-white p-3 font-[Inter]"
            >
              {c.back}
            </button>
            {why && <WhyPanel evidence={why} onClose={()=>setWhy(null)}/>}
          </motion.div></AnimatePresence>
        ) : (
          <div className="max-w-xl mx-auto">
            <div className="font-[JetBrains_Mono] text-xs mb-4">
              {i + 1} / {VALUE_CHOICES.length} · {c.choose}
            </div>
            <div className="mb-8 h-1 bg-[var(--ink)]/15"><div className="h-full origin-left bg-[var(--ink)] transition-transform duration-300" style={{transform:`scaleX(${(i+1)/VALUE_CHOICES.length})`}} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              {(["left", "right"] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => choose(side)}
                  disabled={isAdvancing}
                  className="card-sketch min-h-36 p-6 text-left transition-[transform,background-color,color] hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="font-[JetBrains_Mono] text-xs uppercase text-black/40">
                    {side}
                  </span>
                  <div className="mt-4 text-xl font-[Playfair_Display]">
                  {valueItemText(lang, i, side, choice[side].label)}
                  </div>
                <span onClick={(event)=>{event.stopPropagation();speak(valueItemText(lang,i,side,choice[side].label),locale)}} className="mt-3 inline-flex min-h-11 items-center gap-2 py-3 text-sm" role="button" aria-label="Read choice aloud"><VoiceWaveform active={voiceStatus.status==='speaking'} /> {c.read}</span>
              </button>
              ))}
            </div>
          </div>
        )}
      </GuidanceEntrance>
    </div>
  );
}
export default AssessValuesPage;
