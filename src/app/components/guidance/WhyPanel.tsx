import type { CareerRecommendation, Segment } from "../../engine/types";
import { ScoreBar } from "./ScoreBar";
import { useT } from '../../i18n';
import { localizedConfidence, localizedDimension, localizedNote } from '../../i18n/guidanceFormatting';

export interface ScoreEvidence {
  title: string;
  eyebrow: string;
  summary: string;
  method: string;
  items: Array<{ label: string; value?: number; detail: string }>;
  source: string;
}

type RecommendationProps = {
  recommendation: CareerRecommendation;
  segment: Segment;
  evidence?: never;
  onClose: () => void;
};
type EvidenceProps = {
  evidence: ScoreEvidence;
  recommendation?: never;
  segment?: never;
  onClose: () => void;
};

export function WhyPanel(props: RecommendationProps | EvidenceProps) {
  const { onClose } = props;
  const { lang } = useT();
  const c = lang === 'hi' ? {desk:'प्रमाण डेस्क',why:'यह विकल्प क्यों?',method:'नियम-आधारित विधि',source:'स्रोत',noLlm:'इस स्कोर के लिए LLM का उपयोग नहीं हुआ।',ranked:'इस उपयोगकर्ता प्रकार के भारों से क्रम दिया गया है',rerank:'करियर पासपोर्ट में प्रकार बदलकर क्रम दोबारा बनाएँ।',weight:'भार',neutral:'यह संकेत उपलब्ध न होने के कारण तटस्थ स्कोर उपयोग हुआ।',higher:'स्कोर अधिक क्यों नहीं?'} : lang === 'te' ? {desk:'ఆధారాల విభాగం',why:'ఈ ఎంపిక ఎందుకు?',method:'నియమ-ఆధారిత పద్ధతి',source:'మూలం',noLlm:'ఈ స్కోరుకు LLM ఉపయోగించలేదు.',ranked:'ఈ వినియోగదారు రకం బరువులతో ర్యాంక్ చేయబడింది',rerank:'కెరీర్ పాస్‌పోర్ట్‌లో రకాన్ని మార్చి మళ్లీ ర్యాంక్ చేయండి.',weight:'బరువు',neutral:'ఈ సంకేతం అందుబాటులో లేనందున తటస్థ స్కోరు ఉపయోగించబడింది.',higher:'స్కోరు ఇంకా ఎక్కువగా ఎందుకు లేదు?'} : {desk:'Evidence desk',why:'Why this option?',method:'Deterministic method',source:'Source',noLlm:'LLM not used for this score.',ranked:'Ranked with the',rerank:'lens. Change your segment in the Career Passport to re-rank.',weight:'weight',neutral:'Neutral score used because this signal is missing.',higher:'Why not higher?'};
  const generic = "evidence" in props && props.evidence;
  return <div className="fixed inset-0 z-[70] bg-black/25 p-4" role="dialog" aria-modal="true" aria-label={generic ? generic.title : "Why this career"}>
    <button className="absolute inset-0" aria-label="Close explanation" onClick={onClose}/>
    <section className="relative ml-auto h-full max-w-xl overflow-y-auto border-2 border-black bg-[#f9f8f7] p-5 md:p-8">
      <div className="flex justify-between gap-4 border-b-2 border-black pb-4"><div><div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-widest">{generic ? generic.eyebrow : `${c.desk} · ${localizedConfidence(props.recommendation.confidence,lang)}`}</div><h2 className="font-[Playfair_Display] text-3xl">{generic ? generic.title : c.why}</h2></div><button onClick={onClose} className="min-h-11 min-w-11 border border-black/20">×</button></div>
      {generic ? <>
        <p className="my-5 font-[Inter] text-sm text-black/65">{generic.summary}</p>
        <div className="border-l-4 border-black bg-white p-4"><div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-widest">{c.method}</div><p className="mt-2 font-[Inter] text-sm text-black/70">{generic.method}</p></div>
        <div className="mt-6 space-y-4">{generic.items.map(item=><div key={item.label}>{item.value === undefined ? <div className="font-[JetBrains_Mono] text-xs uppercase">{item.label}</div> : <ScoreBar label={item.label} value={item.value}/>}<p className="mt-1 font-[Inter] text-xs text-black/55">{item.detail}</p></div>)}</div>
        <p className="mt-8 border-t border-black/15 pt-4 font-[JetBrains_Mono] text-[10px] uppercase tracking-wide text-black/45">{c.source} · {generic.source} · {c.noLlm}</p>
      </> : <>
        <p className="my-5 font-[Inter] text-sm text-black/65">{c.ranked} <strong>{props.segment.replace("_", " ")}</strong> {c.rerank}</p>
        <div className="space-y-4">{props.recommendation.components.map(component => <div key={component.dimension}><ScoreBar label={`${localizedDimension(component.dimension,lang)} · ${c.weight} ${Math.round(component.weight * 100)}%`} value={component.score}/><p className="mt-1 font-[Inter] text-xs text-black/55">{localizedNote(component.note,lang)}{!component.dataAvailable ? ` · ${c.neutral}` : ""}</p></div>)}</div>
        <div className="mt-8 border-t border-black/15 pt-5"><h3 className="font-[Playfair_Display] text-xl">{c.higher}</h3><ul className="mt-3 space-y-2">{props.recommendation.whyNotHigher.map(reason => <li key={reason} className="font-[Inter] text-sm text-black/70">→ {reason}</li>)}</ul></div>
      </>}
    </section>
  </div>;
}
