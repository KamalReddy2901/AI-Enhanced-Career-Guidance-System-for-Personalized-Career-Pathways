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
import { speak } from "../utils/voice";

const TOTAL_SECONDS = 300;
const FORM_STORAGE_KEY = "cc_guidance_aptitude_form";

export function AssessAptitudePage() {
  const navigate = useNavigate();
  const { updatePassport } = useGuidance();
  const { user } = useAuth();
  const { locale } = useT();
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
    localStorage.setItem(FORM_STORAGE_KEY, form === 0 ? "1" : "0");
    updatePassport((previous) => {
      if (!previous) throw new Error("Complete onboarding first");
      const next = { ...previous, aptitude: scores };
      next.completeness = calculateCompleteness(next);
      return next;
    });
    if (user?.id)
      void saveAssessment(user.id, "aptitude", {
        scores,
        form,
        elapsedSeconds: TOTAL_SECONDS - remainingSeconds,
      });
    sounds.assessComplete();
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
    if (index === questions.length - 1) complete(next, seconds);
    else {
      setAnswers(next);
      setIndex((previous) => previous + 1);
    }
  };

  if (result)
    return (
      <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Header result />
          <div className="max-w-xl mx-auto">
            {Object.entries(result).map(([dimension, score]) => (
              <div key={dimension} className="mb-4">
                <div className="flex justify-between font-[JetBrains_Mono] text-xs uppercase">
                  <span>{dimension}</span>
                  <span>{score}</span>
                </div>
                <div className="h-3 bg-black/10">
                  <div
                    className="h-3 bg-black"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="border-t border-black/10 pt-4 mt-6 text-sm font-[Inter] text-black/60">
              A 5-minute screener, not a full psychometric battery — treat as a
              first signal.
            </p>
            <button
              onClick={() => navigate("/assess")}
              className="mt-6 min-h-11 w-full bg-black text-white p-3 font-[Inter]"
            >
              Back to assessment desk
            </button>
          </div>
        </div>
      </div>
    );

  const question = questions[index];
  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Header />
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between font-[JetBrains_Mono] text-xs mb-3">
            <span>
              FORM {form + 1} · {index + 1}/{questions.length} ·{" "}
              {question.dimension}
            </span>
            <span>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-1 bg-black/10 mb-8">
            <div
              className="h-1 bg-black"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
          {question.dimension === "spatial" && <SpatialSketch id={question.id} />}
          <div className="mb-6 flex items-start gap-3"><h2 className="flex-1 text-2xl font-[Playfair_Display]">{question.prompt}</h2><button onClick={()=>speak(`${question.prompt}. ${question.options.join(". ")}`,locale)} className="min-h-11 min-w-11 border border-black/20" aria-label="Read question aloud">🔊</button></div>
          <div className="space-y-3">
            {question.options.map((option, optionIndex) => (
              <button
                key={option}
                onClick={() => answer(optionIndex)}
                className="w-full min-h-12 border border-black/20 bg-white p-3 text-left font-[Inter] hover:bg-black hover:text-white transition-colors"
              >
                {String.fromCharCode(65 + optionIndex)}. {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ result = false }: { result?: boolean }) {
  return (
    <header className="flex items-center gap-4 border-b-2 border-black pb-5 mb-8">
      <StickFigure pose={result ? "celebrating" : "working"} size={76} />
      <div>
        <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
          CareerCase · five-minute screener
        </div>
        <h1 className="text-3xl md:text-4xl font-[Playfair_Display]">
          {result ? "Aptitude snapshot" : "Work through the signal"}
        </h1>
      </div>
    </header>
  );
}

function SpatialSketch({ id }: { id: string }) { const variant=Number(id.slice(1))%3; return <svg viewBox="0 0 240 92" className="mb-5 h-24 w-full border border-black/10 bg-white" role="img" aria-label="Spatial reasoning diagram">{variant===0?<><path d="M30 65h45V20h45v45h45" fill="none" stroke="#1a1a1a" strokeWidth="4"/><path d="m165 65-12-8m12 8-12 8" stroke="#1a1a1a" strokeWidth="4"/></>:variant===1?<><rect x="72" y="18" width="55" height="55" fill="none" stroke="#1a1a1a" strokeWidth="3"/><path d="m72 18 28-12h55l-28 12m0 0 28-12v55l-28 12" fill="none" stroke="#1a1a1a" strokeWidth="3"/></>:<><circle cx="120" cy="46" r="29" fill="none" stroke="#1a1a1a" strokeWidth="4"/><path d="M120 8v76M82 46h76" stroke="#1a1a1a" strokeOpacity=".25"/></>}</svg>; }

export default AssessAptitudePage;
