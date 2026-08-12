import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { scoreAptitude, selectAptitudeForm } from "../engine/aptitude";
import { calculateCompleteness } from "../engine/skillProfile";
import { useGuidance } from "../context/GuidanceContext";
import { useAuth } from "../context/AuthContext";
import { saveAssessment } from "../services/guidanceDb";
import { sounds } from "../utils/sounds";
import { useT } from "../i18n";
import { aptitudeItemText } from "../i18n/aptitudeItems";
import { WhyPanel, type ScoreEvidence } from "../components/guidance/WhyPanel";
import { speak } from "../utils/voice";
import { useVoiceStatus } from "../hooks/useVoiceStatus";
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';
import { ScoreBar } from '../components/guidance/ScoreBar';
import { VoiceWaveform } from '../components/guidance/VoiceWaveform';
import { AnimatePresence, motion } from 'motion/react';

const TOTAL_SECONDS = 300;
const FORM_STORAGE_KEY = "cc_guidance_aptitude_form";

export function AssessAptitudePage() {
  const navigate = useNavigate();
  const { updatePassport } = useGuidance();
  const { user } = useAuth();
  const { lang, locale } = useT();
  const voiceStatus = useVoiceStatus();
  const explainLabel = lang === "hi" ? "यह स्कोर क्यों?" : lang === "te" ? "ఈ స్కోరు ఎందుకు?" : "Why this score?";
  const [form] = useState<0 | 1>(() =>
    localStorage.getItem(FORM_STORAGE_KEY) === "1" ? 1 : 0,
  );
  const questions = useMemo(() => selectAptitudeForm(form), [form]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [result, setResult] = useState<ReturnType<typeof scoreAptitude> | null>(
    null,
  );
  const [completedAnswers, setCompletedAnswers] = useState<Record<string, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const [why, setWhy] = useState<ScoreEvidence | null>(null);

  const complete = (
    finalAnswers: Record<string, number>,
    remainingSeconds: number,
  ) => {
    if (result) return;
    const scores = scoreAptitude(
      finalAnswers,
      TOTAL_SECONDS - remainingSeconds,
      TOTAL_SECONDS,
      form,
    );
    setResult(scores);
    setCompletedAnswers(finalAnswers);
    setElapsed(TOTAL_SECONDS - remainingSeconds);
    localStorage.setItem(FORM_STORAGE_KEY, form === 0 ? "1" : "0");
    updatePassport((previous) => {
      if (!previous) throw new Error("Complete onboarding first");
      const next = { ...previous, aptitude: scores };
      next.completeness = calculateCompleteness(next);
      return next;
    });
    void saveAssessment(user?.id ?? null, "aptitude", {
        scores,
        form,
        elapsedSeconds: TOTAL_SECONDS - remainingSeconds,
      });
    sounds.assessComplete();
    hapticSuccess();
  };

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(
      () =>
        setSeconds((previous) => {
          if (previous <= 1) {
            window.clearInterval(timer);
            queueMicrotask(() => complete(answers, 0));
            return 0;
          }
          if (previous <= 10) sounds.tick();
          return previous - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [answers, result]);

  const answer = (option: number) => {
    const question = questions[index];
    const next = { ...answers, [question.id]: option };
    sounds.quizAnswer();
    hapticLight();
    if (index === questions.length - 1) complete(next, seconds);
    else {
      setAnswers(next);
      setIndex((previous) => previous + 1);
    }
  };

  if (result)
    return (
      <div className="assessment-page min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Header result lang={lang} />
          <div className="max-w-xl mx-auto">
            {Object.entries(result).map(([dimension, score]) => (
              <button key={dimension} className="mb-4 block min-h-11 w-full text-left" onClick={()=>{const dimensionQuestions=questions.filter(question=>question.dimension===dimension);const correct=dimensionQuestions.filter(question=>completedAnswers[question.id]===question.answer).length;const speedBonus=Math.min(10,Math.max(0,Math.round(10*Math.max(0,TOTAL_SECONDS-elapsed)/TOTAL_SECONDS)));setWhy({title:`Why ${dimension} is ${score}`,eyebrow:"Aptitude evidence desk",summary:`This result combines ${correct} correct answers out of 6 with the same capped timing bonus used across this form.`,method:"score = round(100 × correct ÷ 6) + speed bonus; speed bonus = min(10, round(10 × time remaining ÷ 300)); result capped at 100.",items:[{label:"Accuracy contribution",value:Math.round(100*correct/6),detail:`${correct} of 6 ${dimension} items answered correctly.`},{label:"Timing bonus",value:speedBonus*10,detail:`${elapsed} seconds used across the complete 24-item form; ${speedBonus} points added, capped at 10.`}],source:`Aptitude screener form ${form+1}`})}} aria-label={`Explain ${dimension} score ${score}`}>
                <ScoreBar label={dimension} value={score} />
                <div className="mt-1 font-[Inter] text-[10px] underline">{explainLabel}</div>
              </button>
            ))}
            <p className="border-t border-black/10 pt-4 mt-6 text-sm font-[Inter] text-black/60">
              {lang === "hi" ? "यह 5 मिनट की प्रारंभिक जाँच है, पूर्ण मनोमितीय परीक्षण नहीं—इसे पहला संकेत मानें।" : lang === "te" ? "ఇది 5 నిమిషాల ప్రాథమిక పరీక్ష మాత్రమే, పూర్తి సైకోమెట్రిక్ పరీక్ష కాదు—దీనిని తొలి సంకేతంగా చూడండి." : "A 5-minute screener, not a full psychometric battery — treat as a first signal."}
            </p>
            <button
              onClick={() => navigate("/assess")}
              className="mt-6 min-h-11 w-full bg-black text-white p-3 font-[Inter]"
            >
              {lang === "hi" ? "आकलन डेस्क पर वापस जाएँ" : lang === "te" ? "అంచనా విభాగానికి తిరిగి వెళ్ళండి" : "Back to assessment desk"}
            </button>
            {why && <WhyPanel evidence={why} onClose={()=>setWhy(null)}/>}
          </div>
        </div>
      </div>
    );

  const question = questions[index];
  const localized = aptitudeItemText(lang, question);
  return (
    <div className="assessment-page min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Header lang={lang} />
        <GuidanceEntrance className="max-w-xl mx-auto">
          <AnimatePresence mode="wait"><motion.div key={question.id} initial={{x:24,opacity:0}} animate={{x:0,opacity:1}} exit={{x:-24,opacity:0}} transition={{duration:.35}}>
          <div className="flex justify-between font-[JetBrains_Mono] text-xs mb-3">
            <span>
              {lang === "hi" ? "प्रपत्र" : lang === "te" ? "ఫారం" : "FORM"} {form + 1} · {index + 1}/{questions.length} ·{" "}
              {question.dimension}
            </span>
            <span className={seconds<=10?'animate-pulse text-[var(--accent-news)]':''}>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-1 bg-black/10 mb-8">
            <div className="h-1 origin-left bg-black transition-transform duration-300" style={{ transform: `scaleX(${(index + 1) / questions.length})` }} />
          </div>
          {question.dimension === "spatial" && <SpatialSketch id={question.id} />}
          <div className="mb-6 flex items-start gap-3"><h2 className="flex-1 text-2xl font-[Playfair_Display]"><TextReveal text={localized.prompt}/></h2><button onClick={()=>speak(`${localized.prompt}. ${localized.options.join(". ")}`,locale)} className="grid min-h-11 min-w-11 place-items-center border border-black/20" aria-label="Read question aloud"><VoiceWaveform active={voiceStatus.status==='speaking'} /></button></div>
          {voiceStatus.message && <p className="-mt-4 mb-4 font-[Inter] text-xs text-black/55" role="status" aria-live="polite">{voiceStatus.message}</p>}
          <div className="space-y-3">
            {localized.options.map((option, optionIndex) => (
              <button
                key={option}
                onClick={() => answer(optionIndex)}
                className="card-sketch min-h-14 w-full p-4 text-left transition-[transform,background-color,color] hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              >
                {String.fromCharCode(65 + optionIndex)}. {option}
              </button>
            ))}
          </div>
          </motion.div></AnimatePresence>
        </GuidanceEntrance>
      </div>
    </div>
  );
}

function Header({ result = false, lang }: { result?: boolean; lang: "en" | "hi" | "te" }) {
  return (
    <header className="flex items-center gap-4 border-b-2 border-black pb-5 mb-8">
      <StickFigure pose={result ? "celebrating" : "working"} size={76} />
      <div>
        <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
          CareerCase · {lang === "hi" ? "पाँच मिनट की जाँच" : lang === "te" ? "ఐదు నిమిషాల పరీక్ష" : "five-minute screener"}
        </div>
        <h1><TextReveal text={result ? (lang === "hi" ? "योग्यता की झलक" : lang === "te" ? "సామర్థ్య సంక్షిప్త చిత్రం" : "Aptitude snapshot") : (lang === "hi" ? "संकेतों पर काम करें" : lang === "te" ? "సంకేతాలను పూర్తి చేయండి" : "Work through the signal")} /></h1>
      </div>
    </header>
  );
}

function SpatialSketch({ id }: { id: string }) { const variant=Number(id.slice(1))%3; return <svg viewBox="0 0 240 92" className="mb-5 h-24 w-full border border-black/10 bg-white" role="img" aria-label="Spatial reasoning diagram">{variant===0?<><path d="M30 65h45V20h45v45h45" fill="none" stroke="#1a1a1a" strokeWidth="4"/><path d="m165 65-12-8m12 8-12 8" stroke="#1a1a1a" strokeWidth="4"/></>:variant===1?<><rect x="72" y="18" width="55" height="55" fill="none" stroke="#1a1a1a" strokeWidth="3"/><path d="m72 18 28-12h55l-28 12m0 0 28-12v55l-28 12" fill="none" stroke="#1a1a1a" strokeWidth="3"/></>:<><circle cx="120" cy="46" r="29" fill="none" stroke="#1a1a1a" strokeWidth="4"/><path d="M120 8v76M82 46h76" stroke="#1a1a1a" strokeOpacity=".25"/></>}</svg>; }

export default AssessAptitudePage;
