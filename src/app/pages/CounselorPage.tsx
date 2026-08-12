import { useState } from "react";
import { StickFigure } from "../components/StickFigure";
import { useGuidance } from "../context/GuidanceContext";
import {
  occupationById,
  qualificationById,
  skillById,
} from "../data/knowledge";
import { streamCounselorChat } from "../services/ai";
import { useT } from "../i18n";
import { listen, speak } from "../utils/voice";
import { motion, useReducedMotion } from "motion/react";
import { Mic, Send, Volume2 } from "lucide-react";
import { TextReveal } from '../motion/TextReveal';

const escalationPattern =
  /suicid|self.?harm|hopeless|depress|panic|abuse|forced|family conflict|cannot cope|खुदकुशी|आत्महत्या|निराश|जबरदस्ती|కృంగి|ఆత్మహత్య|బలవంత/i;

export function CounselorPage() {
  const { passport, recommendations, pathways } = useGuidance();
  const { lang, locale, t } = useT();
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [escalate, setEscalate] = useState(false);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const reducedMotion = useReducedMotion();
  const ask = async () => {
    const question = input.trim();
    if (!question) return;
    const priorHistory = history;
    setHistory(previous => [...previous, { role: "user", text: question }]);
    setInput("");
    if (escalationPattern.test(question)) {
      setEscalate(true);
      setAnswer(t("counselorSafetyMessage"));
      setHistory(previous => [...previous, { role: "assistant", text: t("counselorSafetyMessage") }]);
      return;
    }
    setBusy(true);
    setAnswer("");
    setEscalate(false);
    const mentioned = [...occupationById.values()]
      .filter((occupation) =>
        question.toLowerCase().includes(occupation.title.toLowerCase()),
      )
      .slice(0, 4);
    const relevantSkills = new Set(
      mentioned.flatMap((occupation) =>
        occupation.skills.map((item) => item.skillId),
      ),
    );
    const qualifications = [...qualificationById.values()]
      .filter((item) =>
        item.preparesForOccupationIds.some((id) =>
          mentioned.some((occupation) => occupation.id === id),
        ),
      )
      .slice(0, 5);
    const context = JSON.stringify({
      passport: passport && {
        segment: passport.segment,
        education: passport.education,
        experience: passport.experiences,
        skills: passport.skills.map((claim) => ({
          name: skillById.get(claim.skillId)?.name,
          proficiency: claim.proficiency,
          confidence: claim.confidence,
        })),
        assessments: {
          riasec: passport.riasec,
          aptitude: passport.aptitude,
          values: passport.values,
        },
        aspiration: passport.aspiration,
        constraints: passport.constraints,
      },
      recommendations: recommendations?.recommendations.slice(0, 8),
      activePathways: pathways
        .filter((plan) => plan.chosenRoute)
        .map((plan) => ({
          target: occupationById.get(plan.occupationId)?.title,
          readiness: plan.gapReport.readiness,
          gaps: plan.gapReport.gaps.slice(0, 5),
        })),
      retrievedKnowledge: {
        occupations: mentioned,
        qualifications,
        skills: [...relevantSkills]
          .map((id) => skillById.get(id))
          .filter(Boolean),
      },
    });
    try {
      let response = "";
      for await (const chunk of streamCounselorChat(
        [...priorHistory, { role: "user", text: question }],
        context,
        lang === "hi" ? "Hindi" : lang === "te" ? "Telugu" : "English",
      )) { response = chunk; setAnswer(chunk); }
      setHistory(previous => [...previous, { role: "assistant", text: response }]);
      setAnswer("");
    } catch {
      setAnswer(t("counselorUnavailable"));
      setHistory(previous => [...previous, { role: "assistant", text: t("counselorUnavailable") }]);
      setAnswer("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-[var(--paper)] p-4 text-[var(--ink)] md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-4 border-b-2 border-[var(--ink)] pb-6">
          <StickFigure pose="pointing" size={84} />
          <div>
            <div className="label-caps text-[var(--ink-soft)]">{t("counselorDesk")}</div>
            <h1 className="font-display text-5xl leading-[1.25]"><TextReveal text={t("counselorTitle")} /></h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{t("counselorIntro")}</p>
          </div>
        </header>
        <div className="counselor-strip border border-[var(--ink)]/10 bg-[var(--paper-raised)] p-4 pb-0 md:p-6 md:pb-0">
          <div className="space-y-5" aria-live="polite">{history.map((message,index)=>message.role==='user'?<motion.div key={`${message.role}-${index}`} initial={reducedMotion?false:{y:12,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:reducedMotion?0:.25}} className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-[var(--ink)] p-4 text-sm text-[var(--paper)]">{message.text}</motion.div>:<div key={`${message.role}-${index}`} className="flex items-end gap-2"><StickFigure pose="standing" size={28}/><motion.div initial={reducedMotion?false:{y:12,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:reducedMotion?0:.25}} className="card-sketch counselor-answer relative max-w-[86%] whitespace-pre-wrap p-4 text-sm">{message.text}</motion.div></div>)}</div>
          {(answer || busy) && <div className="mt-5 flex items-end gap-2"><StickFigure pose="standing" size={28}/><motion.div initial={reducedMotion?false:{y:12,opacity:0}} animate={{y:0,opacity:1}} className="card-sketch counselor-answer relative max-w-[86%] whitespace-pre-wrap p-4 text-sm">{answer}{busy && <><span className="typewriter-caret ml-0.5" aria-hidden="true">|</span><span className="typing-dots ml-2" aria-label={t("counselorTyping")}><i/><i/><i/></span></>}</motion.div></div>}
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t-2 border-[var(--ink)] bg-[var(--paper)] p-4 md:-mx-6 md:p-6">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder={t("counselorPlaceholder")}
            className="w-full border border-[var(--ink)]/20 bg-[var(--paper-raised)] p-3 text-[var(--ink)]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void ask()}
              disabled={busy}
              data-testid="counselor-send-btn"
              className="min-h-11 bg-[var(--ink)] px-5 py-3 text-[var(--paper)] disabled:opacity-40"
            >
              <Send size={15}/>{busy ? t("counselorThinking") : t("counselorAsk")}
            </button>
            <button
              onClick={() =>
                void listen(locale)
                  .then(setInput)
                  .catch(() => setAnswer(t("counselorVoiceUnsupported")))
              }
              data-testid="counselor-voice-input-btn"
              className="min-h-11 border border-[var(--ink)]/20 px-4 py-3"
            >
              <Mic size={15}/> {t("counselorSpeak")}
            </button>
            <button
              disabled={!answer}
              onClick={() => speak(answer, locale)}
              data-testid="counselor-read-answer-btn"
              className="min-h-11 border border-[var(--ink)]/20 px-4 py-3 disabled:opacity-30"
            >
              <Volume2 size={15}/> {t("counselorRead")}
            </button>
          </div>
          </div>
          {escalate && (
            <aside className="mt-5 border-2 border-[var(--accent-news)] bg-[var(--paper-raised)] p-5">
              <div className="label-caps">{t("counselorHumanSupport")}</div>
              <p className="mt-2">{t("counselorEscalationDetail")}</p>
              <a
                className="mt-3 inline-block min-h-11 py-3 underline"
                href="https://www.ncs.gov.in/"
                target="_blank"
                rel="noreferrer"
              >
                {t("counselorOpenNcs")}
              </a>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
export default CounselorPage;
