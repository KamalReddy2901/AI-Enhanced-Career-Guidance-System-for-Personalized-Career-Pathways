import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { RiasecHexagon } from "../components/guidance/RiasecHexagon";
import { WhyPanel, type ScoreEvidence } from "../components/guidance/WhyPanel";
import {
  RIASEC_ITEMS,
  scoreRiasec,
  getTopCode,
  interpretTopDimension,
} from "../engine/riasec";
import { calculateCompleteness } from "../engine/skillProfile";
import { useGuidance } from "../context/GuidanceContext";
import { useAuth } from "../context/AuthContext";
import { saveAssessment } from "../services/guidanceDb";
import { useT } from "../i18n";
import { riasecItemText } from "../i18n/assessmentItems";
import { sounds } from "../utils/sounds";
import { speak } from "../utils/voice";

export function AssessRiasecPage() {
  const navigate = useNavigate();
  const { updatePassport } = useGuidance();
  const { user } = useAuth();
  const { lang, locale } = useT();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ReturnType<typeof scoreRiasec> | null>(
    null,
  );
  const [why, setWhy] = useState<ScoreEvidence | null>(null);
  const item = RIASEC_ITEMS[index];
  const itemText = riasecItemText(lang, index, item.text);
  const responseLabels = lang === "hi" ? ["बिल्कुल नहीं", "पसंद नहीं", "तटस्थ", "पसंद", "बहुत पसंद"] : lang === "te" ? ["అస్సలు కాదు", "నచ్చదు", "తటస్థం", "నచ్చుతుంది", "చాలా ఇష్టం"] : ["Not for me", "Dislike", "Neutral", "Like", "Love it"];
  const finish = (next: Record<string, number>) => {
    const scores = scoreRiasec(next);
    setResult(scores);
    updatePassport((previous) => {
      if (!previous) throw new Error("Complete onboarding first");
      const passport = { ...previous, riasec: scores };
      passport.completeness = calculateCompleteness(passport);
      return passport;
    });
    void saveAssessment(user?.id ?? null, "riasec", {
        scores,
        topCode: getTopCode(scores),
      });
    sounds.assessComplete();
  };
  if (result)
    return (
      <AssessmentShell title="Interest inventory complete" pose="celebrating">
        <div className="mx-auto max-w-xl">
          <RiasecHexagon scores={result} />
          <div className="mb-6 grid grid-cols-3 gap-2">
            {Object.entries(result).map(([key, value]) => (
              <button key={key} onClick={()=>{const dimensionItems=RIASEC_ITEMS.filter(item=>item.dimension===key);setWhy({title:`Why ${key} is ${value}`,eyebrow:"Interest evidence desk",summary:"This score reflects only your six responses in this RIASEC work-activity family.",method:"Each response is recorded from 1 to 5. The six-item total is shifted from the minimum and normalized to 0–100: (sum − 6) ÷ 24 × 100.",items:dimensionItems.map((item,itemIndex)=>({label:`Response ${itemIndex+1} · ${answers[item.id]??0}/5`,value:((answers[item.id]??1)-1)*25,detail:item.text})),source:"36-item RIASEC work-activity inventory"})}} className="min-h-11 border border-black/10 p-3 text-center hover:border-black" aria-label={`Explain ${key} score ${value}`}>
                <div className="font-[JetBrains_Mono] text-xs">{key}</div>
                <div className="text-2xl font-[Playfair_Display]">{value}</div>
                <div className="font-[Inter] text-[10px] underline">Why?</div>
              </button>
            ))}
          </div>
          <p className="mb-2 font-[JetBrains_Mono] text-sm">
            TOP CODE · {getTopCode(result)}
          </p>
          <p className="font-[Inter] text-black/70">
            {interpretTopDimension(
              getTopCode(result)[0] as Parameters<
                typeof interpretTopDimension
              >[0],
            )}
          </p>
          <button
            onClick={() => navigate("/assess")}
            className="mt-6 min-h-11 w-full bg-black p-3 font-[Inter] text-white"
          >
            Back to assessment desk
          </button>
          {why && <WhyPanel evidence={why} onClose={()=>setWhy(null)}/>}
        </div>
      </AssessmentShell>
    );
  return (
    <AssessmentShell title={lang === "hi" ? "किस तरह का काम आपको आकर्षित करता है?" : lang === "te" ? "ఎలాంటి పని మిమ్మల్ని ఆకర్షిస్తుంది?" : "What kind of work draws you in?"} pose="thinking">
      <div className="mx-auto max-w-xl">
        {localStorage.getItem("cc_guidance_quiz_interest_hint") && (
          <div className="mb-5 border-l-4 border-black bg-white p-4 font-[Inter] text-sm">
            Your exploration quiz suggests a <strong>{localStorage.getItem("cc_guidance_quiz_interest_hint")}</strong> leaning. Treat it as a prompt—not a score—and complete this full inventory.
          </div>
        )}
        <div className="mb-3 flex justify-between font-[JetBrains_Mono] text-xs uppercase tracking-wide">
          <span>
            {index + 1} / {RIASEC_ITEMS.length}
          </span>
          <span>{item.dimension} · work activity</span>
        </div>
        <div className="mb-8 h-1 bg-black/10">
          <div
            className="h-1 bg-black transition-all"
            style={{ width: `${((index + 1) / RIASEC_ITEMS.length) * 100}%` }}
          />
        </div>
        <div className="mb-8 flex items-start gap-3">
          <h2 className="flex-1 text-3xl font-[Playfair_Display]">
            {itemText}
          </h2>
          <button
            onClick={() => speak(itemText, locale)}
            className="min-h-11 min-w-11 border border-black/20"
            aria-label="Read question aloud"
          >
            🔊
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {responseLabels.map(
            (label, n) => (
              <button
                key={label}
                onClick={() => {
                  const next = { ...answers, [item.id]: n + 1 };
                  setAnswers(next);
                  sounds.quizAnswer();
                  if (index === RIASEC_ITEMS.length - 1) finish(next);
                  else setIndex(index + 1);
                }}
                className="min-h-16 border border-black/20 p-2 font-[Inter] text-xs transition-colors hover:bg-black hover:text-white"
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>
    </AssessmentShell>
  );
}
function AssessmentShell({
  title,
  pose,
  children,
}: {
  title: string;
  pose: "thinking" | "celebrating";
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4 border-b-2 border-black pb-5">
          <StickFigure pose={pose} size={76} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              CareerCase · assessment desk
            </div>
            <h1 className="text-3xl font-[Playfair_Display] md:text-4xl">
              {title}
            </h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
export default AssessRiasecPage;
