import { useState } from "react";
import { useNavigate } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { useGuidance } from "../context/GuidanceContext";
import { useAuth } from "../context/AuthContext";
import { saveAssessment } from "../services/guidanceDb";
import { extractAspiration } from "../services/ai";
import { occupationById } from "../data/knowledge";
import { calculateCompleteness } from "../engine/skillProfile";
import { useT } from "../i18n";
import { sounds } from "../utils/sounds";
import { listen, speak } from "../utils/voice";
import { useVoiceStatus } from "../hooks/useVoiceStatus";

const questions = {
  en: [
    "In the long run, what would you like your working life to look like?",
    "Why does that future matter to you?",
    "What must your work provide—or never ask you to sacrifice?",
    "Whose work do you admire, and what about it draws you?",
    "How soon would you like to make meaningful progress?",
  ],
  hi: [
    "आगे चलकर आप अपनी कामकाजी ज़िंदगी को कैसा देखना चाहते हैं?",
    "वह भविष्य आपके लिए क्यों मायने रखता है?",
    "काम से आपको क्या अवश्य मिलना चाहिए—और आप किस चीज़ से समझौता नहीं करेंगे?",
    "आप किसके काम से प्रेरित हैं, और उसमें क्या आकर्षित करता है?",
    "आप कितनी जल्दी ठोस प्रगति करना चाहते हैं?",
  ],
  te: [
    "దీర్ఘకాలంలో మీ పని జీవితం ఎలా ఉండాలని కోరుకుంటున్నారు?",
    "ఆ భవిష్యత్తు మీకు ఎందుకు ముఖ్యమైంది?",
    "మీ పని తప్పనిసరిగా ఏమి ఇవ్వాలి—దేనిని మాత్రం త్యాగం చేయకూడదు?",
    "ఎవరి పనిని మీరు మెచ్చుకుంటారు, అందులో మీకు నచ్చేది ఏమిటి?",
    "ఎంత త్వరగా అర్థవంతమైన పురోగతి సాధించాలనుకుంటున్నారు?",
  ],
} as const;

export function AssessAspirationsPage() {
  const navigate = useNavigate();
  const { updatePassport } = useGuidance();
  const { user } = useAuth();
  const { lang, locale } = useT();
  const voiceStatus = useVoiceStatus();
  const c = lang === "hi" ? { interview:"आकांक्षा संवाद", title:"आप किस दिशा में जाना चाहते हैं—उस पर एक छोटी बातचीत", finish:"चिंतन पूरा करें", send:"उत्तर भेजें", dictate:"बोलकर लिखें", unavailable:"संवाद सेवा उपलब्ध नहीं है। यही चिंतन AI के बिना स्थानीय रूप से सहेजें।", voice:"इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।", save:"स्थानीय रूप से सहेजें", note:"एक बार में एक प्रश्न, अधिकतम पाँच। परिणाम को आप बाद में पासपोर्ट में बदल सकते हैं।" } : lang === "te" ? { interview:"ఆకాంక్షల సంభాషణ", title:"మీరు ఏ దిశలో వెళ్లాలనుకుంటున్నారో తెలిపే చిన్న సంభాషణ", finish:"ఆలోచన పూర్తి చేయండి", send:"సమాధానం పంపండి", dictate:"మాట్లాడి నమోదు చేయండి", unavailable:"సంభాషణ సేవ అందుబాటులో లేదు. ఇదే ఆలోచనను AI లేకుండా స్థానికంగా భద్రపరచండి.", voice:"ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్‌కు మద్దతు లేదు.", save:"స్థానికంగా భద్రపరచండి", note:"ఒక్కసారి ఒక ప్రశ్న, గరిష్ఠంగా ఐదు. ఫలితాన్ని తరువాత పాస్‌పోర్ట్‌లో మార్చవచ్చు." } : { interview:"aspiration interview", title:"A short conversation about where you want to head", finish:"Finish reflection", send:"Send answer", dictate:"Dictate", unavailable:"The conversation service is unavailable. Save the same reflection locally without AI.", voice:"Voice input is not supported on this browser.", save:"Save locally", note:"One question at a time, never more than five. You can edit the result later in your Passport." };
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const prompt = questions[lang][index];
  const finish = async (responses: string[], useAi = true) => {
    setBusy(true);
    setError("");
    const reflection = responses
      .map((response, i) => `${i + 1}. ${response}`)
      .join("\n");
    try {
      const extracted = useAi
        ? await extractAspiration(
            reflection,
            3,
            [],
            "none",
            lang === "hi" ? "Hindi" : lang === "te" ? "Telugu" : "English",
          )
        : {
            statement: responses[0],
            horizonYears: 3,
            themes: [],
            dreamOccupationIds: [],
            entrepreneurialIntent: "none" as const,
          };
      const dreamIds = extracted.dreamOccupationIds
        .map((name) => {
          const target = name.toLowerCase();
          return [...occupationById.values()].find(
            (occupation) =>
              occupation.title.toLowerCase() === target ||
              occupation.title.toLowerCase().includes(target) ||
              target.includes(occupation.title.toLowerCase()),
          )?.id;
        })
        .filter((id): id is string => Boolean(id));
      const aspiration = {
        ...extracted,
        dreamOccupationIds: dreamIds,
        capturedVia: useAi ? ("conversation" as const) : ("form" as const),
      };
      updatePassport((previous) => {
        if (!previous) throw new Error("Complete onboarding first");
        const passport = { ...previous, aspiration };
        passport.completeness = calculateCompleteness(passport);
        return passport;
      });
      void saveAssessment(user?.id ?? null, "aspiration", aspiration);
      sounds.assessComplete();
      navigate("/assess");
    } catch {
      setError(c.unavailable);
    } finally {
      setBusy(false);
    }
  };
  const send = () => {
    if (!draft.trim()) return;
    const next = [...answers, draft.trim()];
    setAnswers(next);
    setDraft("");
    sounds.click();
    if (index === 4) void finish(next);
    else setIndex(index + 1);
  };
  return (
    <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-4 border-b-2 border-black pb-5">
          <StickFigure pose="talking" size={80} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              CareerCase · {c.interview} · {index + 1}/5
            </div>
            <h1 className="text-3xl font-[Playfair_Display] md:text-4xl">
              {c.title}
            </h1>
          </div>
        </header>
        <div className="mx-auto max-w-xl border border-black/10 bg-white p-6">
          {answers.map((answer, i) => (
            <div key={i} className="mb-4">
              <p className="font-[Inter] text-sm text-black/45">
                {questions[lang][i]}
              </p>
              <p className="mt-1 border-l-2 border-black pl-3 font-[Inter]">
                {answer}
              </p>
            </div>
          ))}
          <div className="border-t border-black/10 pt-5">
            <div className="flex gap-3">
              <h2 className="flex-1 text-2xl font-[Playfair_Display]">
                {prompt}
              </h2>
              <button
                onClick={() => speak(prompt, locale)}
                className="min-h-11 min-w-11 border border-black/20"
                aria-label="Read question aloud"
              >
                🔊
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="mt-4 w-full border border-black/20 p-3 font-[Inter]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={send}
                disabled={!draft.trim() || busy}
                className="min-h-11 bg-black px-5 py-3 font-[Inter] text-white disabled:opacity-30"
              >
                {index === 4 ? c.finish : c.send}
              </button>
              <button
                onClick={() =>
                  void listen(locale)
                    .then(setDraft)
                    .catch((voiceError) => setError(voiceError instanceof Error ? voiceError.message : c.voice))
                }
                className="min-h-11 border border-black/20 px-4 py-3 font-[Inter]"
              >
                🎙 {c.dictate}
              </button>
            </div>
            {voiceStatus.message && <p className="mt-2 font-[Inter] text-xs text-black/55" role="status" aria-live="polite">{voiceStatus.message}</p>}
          </div>
          {error && (
            <div className="mt-4 bg-amber-50 p-3 font-[Inter] text-sm text-amber-900">
              {error}
              <button
                disabled={!answers.length}
                onClick={() =>
                  void finish(
                    index === 4 && draft.trim()
                      ? [...answers, draft.trim()]
                      : answers,
                    false,
                  )
                }
                className="ml-2 underline"
              >
                {c.save}
              </button>
            </div>
          )}
          <p className="mt-5 font-[Inter] text-xs text-black/45">
            {c.note}
          </p>
        </div>
      </div>
    </div>
  );
}
export default AssessAspirationsPage;
