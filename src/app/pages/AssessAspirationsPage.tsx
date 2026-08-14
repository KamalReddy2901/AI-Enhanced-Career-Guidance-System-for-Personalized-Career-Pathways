import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { StickFigure } from "../components/StickFigure";
import { useGuidance } from "../context/GuidanceContext";
import { useAuth } from "../context/AuthContext";
import { saveAssessment } from "../services/guidanceDb";
import { extractAspiration } from "../services/ai";
import { occupationById } from "../data/knowledge";
import { weightsFor } from '../engine/weights';
import { WhyPanel, type ScoreEvidence } from '../components/guidance/WhyPanel';
import { calculateCompleteness } from "../engine/skillProfile";
import { useT } from "../i18n";
import { sounds } from "../utils/sounds";
import { listen, speak } from "../utils/voice";
import { useVoiceStatus } from "../hooks/useVoiceStatus";
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';
import { Mic } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { VoiceWaveform } from '../components/guidance/VoiceWaveform';
import type { Aspiration } from '../engine/types';

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
  const { updatePassport, passport } = useGuidance();
  const { user } = useAuth();
  const { lang, locale } = useT();
  const voiceStatus = useVoiceStatus();
  const c = lang === "hi" ? { interview:"आकांक्षा संवाद", title:"आप किस दिशा में जाना चाहते हैं—उस पर एक छोटी बातचीत", finish:"चिंतन पूरा करें", send:"उत्तर भेजें", dictate:"बोलकर लिखें", unavailable:"संवाद सेवा उपलब्ध नहीं है। यही चिंतन AI के बिना स्थानीय रूप से सहेजें।", voice:"इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।", save:"स्थानीय रूप से सहेजें", typesetting:"संकलन जारी", note:"एक बार में एक प्रश्न, अधिकतम पाँच। परिणाम को आप बाद में पासपोर्ट में बदल सकते हैं।", why:"इसका उपयोग कैसे होता है?", evidenceTitle:"आकांक्षा का उपयोग", evidenceSummary:"आपका कथन करियर पासपोर्ट में सहेजा और संपादित किया जाता है।", method:"AI केवल मुक्त-पाठ को कथन, विषय और संभावित व्यवसायों में व्यवस्थित करने में मदद करता है। विषय/कीवर्ड का व्यवसाय क्लस्टर से मिलान नियम-आधारित है; AI कभी अंकीय स्कोर नहीं देता।", aspirationLabel:"आकांक्षा घटक", passportLabel:"करियर पासपोर्ट", passportDetail:"मूल कथन सहेजा जाता है और संपादित किया जा सकता है।", saved:"आपकी आकांक्षा सहेजी गई", continue:"मूल्यांकन पर जाएँ", weight:"खंड भार" } : lang === "te" ? { interview:"ఆకాంక్షల సంభాషణ", title:"మీరు ఏ దిశలో వెళ్లాలనుకుంటున్నారో తెలిపే చిన్న సంభాషణ", finish:"ఆలోచన పూర్తి చేయండి", send:"సమాధానం పంపండి", dictate:"మాట్లాడి నమోదు చేయండి", unavailable:"సంభాషణ సేవ అందుబాటులో లేదు. ఇదే ఆలోచనను AI లేకుండా స్థానికంగా భద్రపరచండి.", voice:"ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్‌కు మద్దతు లేదు.", save:"స్థానికంగా భద్రపరచండి", typesetting:"అక్షరరూపం సిద్ధమవుతోంది", note:"ఒక్కసారి ఒక ప్రశ్న, గరిష్ఠంగా ఐదు. ఫలితాన్ని తరువాత పాస్‌పోర్ట్‌లో మార్చవచ్చు.", why:"దీన్ని ఎలా ఉపయోగిస్తారు?", evidenceTitle:"ఆకాంక్ష వినియోగం", evidenceSummary:"మీ ప్రకటన కెరీర్ పాస్‌పోర్ట్‌లో భద్రపరచబడి సవరించవచ్చు.", method:"AI స్వేచ్ఛా వచనాన్ని ప్రకటన, థీమ్‌లు, సంభావ్య వృత్తులుగా క్రమబద్ధం చేయడంలో మాత్రమే సహాయపడుతుంది. వృత్తి క్లస్టర్‌లతో థీమ్/కీవర్డ్ సరిపోలిక నియమ-ఆధారితం; AI ఎప్పుడూ అంకె స్కోర్ ఇవ్వదు.", aspirationLabel:"ఆకాంక్ష భాగం", passportLabel:"కెరీర్ పాస్‌పోర్ట్", passportDetail:"మూల ప్రకటన భద్రపరచబడి సవరించవచ్చు.", saved:"మీ ఆకాంక్ష సేవ్ అయింది", continue:"మూల్యాంకనాలకు వెళ్లండి", weight:"విభాగ బరువు" } : { interview:"aspiration interview", title:"A short conversation about where you want to head", finish:"Finish reflection", send:"Send answer", dictate:"Dictate", unavailable:"The conversation service is unavailable. Save the same reflection locally without AI.", voice:"Voice input is not supported on this browser.", save:"Save locally", typesetting:"Typesetting", note:"One question at a time, never more than five. You can edit the result later in your Passport.", why:"How is this used?", evidenceTitle:"Aspiration use", evidenceSummary:"Your statement is stored in the Career Passport and remains editable.", method:"AI only helps structure free text into a statement, themes, and possible occupations. Theme and keyword matching against occupation clusters is rule-based; AI never supplies a numeric score.", aspirationLabel:"Aspiration component", passportLabel:"Career Passport", passportDetail:"Raw statement is saved and can be edited.", saved:"Your aspiration is saved", continue:"Continue to assessments", weight:"Segment weight" };
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [why, setWhy] = useState<ScoreEvidence | null>(null);
  const [completedAspiration, setCompletedAspiration] = useState<Aspiration | null>(null);
  const answerLock = useRef(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
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
      hapticSuccess();
      setCompletedAspiration(aspiration);
    } catch {
      setError(c.unavailable);
    } finally {
      setBusy(false);
    }
  };
  const send = () => {
    if (!draft.trim() || answerLock.current || busy) return;
    answerLock.current = true;
    setIsAdvancing(true);
    const next = [...answers, draft.trim()];
    setAnswers(next);
    setDraft("");
    sounds.click();
    hapticLight();
    if (index === 4) void finish(next);
    else {
      setIndex((current) => Math.min(current + 1, questions[lang].length - 1));
      window.setTimeout(() => {
        answerLock.current = false;
        setIsAdvancing(false);
      }, 450);
    }
  };
  const openUsageEvidence = () => { const weight = Math.round(weightsFor(passport?.segment ?? 'school_student').aspiration * 100); setWhy({ title:c.evidenceTitle, eyebrow:c.why, summary:c.evidenceSummary, method:c.method, items:[{label:c.aspirationLabel,value:weight,detail:`${c.weight}: ${weight}%`},{label:c.passportLabel,detail:c.passportDetail}], source:'Deterministic engine · Career Passport' }); };
  if (completedAspiration) return <div className="assessment-page min-h-screen p-4 md:p-8"><GuidanceEntrance className="mx-auto max-w-2xl"><section className="card-sketch p-6 md:p-8"><div className="label-caps">CareerCase · {c.interview}</div><h1 className="mt-3 font-display text-4xl">{c.saved}</h1><p className="mt-4 border-l-2 border-[var(--ink)] pl-4 font-[Inter] text-[var(--ink-soft)]">{completedAspiration.statement}</p><button data-testid="aspirations-summary-why-btn" onClick={openUsageEvidence} className="mt-6 min-h-11 border border-[var(--ink)] px-3 font-mono-ui text-[10px] uppercase tracking-widest">{c.why}</button><button data-testid="aspirations-continue-btn" onClick={()=>{sounds.navigate();hapticLight();navigate('/assess');}} className="ml-3 mt-6 min-h-11 bg-[var(--ink)] px-4 font-[Inter] text-white">{c.continue}</button></section></GuidanceEntrance>{why&&<WhyPanel evidence={why} onClose={()=>setWhy(null)}/>}</div>;
  return (
    <div className="assessment-page min-h-screen p-4 md:p-8">
      <GuidanceEntrance className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-4 border-b-2 border-black pb-5">
          <StickFigure pose="talking" size={80} />
          <div>
            <div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">
              CareerCase · {c.interview} · {index + 1}/5
            </div>
            <h1><TextReveal text={c.title} /></h1>
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
          <AnimatePresence mode="wait"><motion.div key={index} initial={{x:24,opacity:0}} animate={{x:0,opacity:1}} exit={{x:-24,opacity:0}} transition={{duration:.35}} className="border-t border-black/10 pt-5">
            <div className="flex gap-3">
              <h2 className="flex-1 text-2xl font-[Playfair_Display]">
                <TextReveal text={prompt}/>
              </h2>
              <button
                onClick={() => speak(prompt, locale)}
                className="min-h-11 min-w-11 border border-black/20"
                aria-label="Read question aloud"
              >
                <VoiceWaveform active={voiceStatus.status==='speaking'} />
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
                disabled={!draft.trim() || busy || isAdvancing}
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
                <Mic size={16} aria-hidden="true" /> {c.dictate}
              </button>
            </div>
            {busy && <div className="rule-top mt-5 flex items-center gap-3 py-4" role="status" aria-live="polite"><StickFigure pose="working" size={44} /><span className="font-mono-ui text-xs uppercase tracking-widest">{c.typesetting}<span className="button-loading-dots ml-2" aria-hidden="true"><i/><i/><i/></span></span></div>}
            {voiceStatus.message && <p className="mt-2 font-[Inter] text-xs text-black/55" role="status" aria-live="polite">{voiceStatus.message}</p>}
          </motion.div></AnimatePresence>
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
          <button data-testid="aspirations-why-btn" onClick={openUsageEvidence} className="mt-4 min-h-11 border border-[var(--ink)] px-3 font-mono-ui text-[10px] uppercase tracking-widest">{c.why}</button>
        </div>
      </GuidanceEntrance>
      {why && <WhyPanel evidence={why} onClose={() => setWhy(null)} />}
    </div>
  );
}
export default AssessAspirationsPage;
