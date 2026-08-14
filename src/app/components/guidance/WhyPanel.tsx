import type { CareerRecommendation, Segment } from "../../engine/types";
import { ScoreBar } from "./ScoreBar";
import { useT } from '../../i18n';
import { localizedConfidence, localizedDimension, localizedNote, localizedWhyNotHigher } from '../../i18n/guidanceFormatting';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

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
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(()=>{
    const panel=panelRef.current;
    const returnFocus=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.querySelector<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')?.focus();
    const handle=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        // Keep this dismissal local. Without stopping propagation, the global
        // Escape shortcut can observe the dialog after it unmounts and navigate
        // away from the current page.
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if(event.key!=='Tab'||!panel)return;
      const items=[...panel.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')].filter(item=>!item.hasAttribute('disabled'));
      if(!items.length)return;
      if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
    };
    document.addEventListener('keydown',handle);return()=>{
      document.removeEventListener('keydown',handle);
      returnFocus?.focus();
    };
  },[onClose]);
  const c = lang === 'hi' ? {desk:'यह स्कोर क्यों — प्रमाण',why:'यह विकल्प क्यों?',method:'नियम-आधारित विधि',source:'स्रोत',noLlm:'इस स्कोर के लिए LLM का उपयोग नहीं हुआ।',ranked:'इस उपयोगकर्ता प्रकार के भारों से क्रम दिया गया है',rerank:'करियर पासपोर्ट में प्रकार बदलकर क्रम दोबारा बनाएँ।',weight:'भार',neutral:'यह संकेत उपलब्ध न होने के कारण तटस्थ स्कोर उपयोग हुआ।',higher:'स्कोर अधिक क्यों नहीं?',coverage:'आपके पूर्ण इनपुट',close:'स्पष्टीकरण बंद करें',assessment:'मूल्यांकन',passport:'करियर पासपोर्ट',knowledge:'ज्ञान-आधार',market:'संकेतक बाज़ार स्नैपशॉट',computed:'गणना'} : lang === 'te' ? {desk:'ఈ స్కోరు ఎందుకు — ఆధారం',why:'ఈ ఎంపిక ఎందుకు?',method:'నియమ-ఆధారిత పద్ధతి',source:'మూలం',noLlm:'ఈ స్కోరుకు LLM ఉపయోగించలేదు.',ranked:'ఈ వినియోగదారు రకం బరువులతో ర్యాంక్ చేయబడింది',rerank:'కెరీర్ పాస్‌పోర్ట్‌లో రకాన్ని మార్చి మళ్లీ ర్యాంక్ చేయండి.',weight:'బరువు',neutral:'ఈ సంకేతం అందుబాటులో లేనందున తటస్థ స్కోరు ఉపయోగించబడింది.',higher:'స్కోరు ఇంకా ఎక్కువగా ఎందుకు లేదు?',coverage:'మీ పూర్తి ఇన్‌పుట్‌లు',close:'వివరణ మూసివేయండి',assessment:'మూల్యాంకనం',passport:'కెరీర్ పాస్‌పోర్ట్',knowledge:'నాలెడ్జ్ బేస్',market:'సూచనాత్మక మార్కెట్ స్నాప్‌షాట్',computed:'లెక్కింపు'} : {desk:'Why this score — evidence',why:'Why this option?',method:'Deterministic method',source:'Source',noLlm:'LLM not used for this score.',ranked:'Ranked with the',rerank:'lens. Change your segment in the Career Passport to re-rank.',weight:'weight',neutral:'Neutral score used because this signal is missing.',higher:'Why not higher?',coverage:'Your completed inputs',close:'Close explanation',assessment:'Assessment',passport:'Career Passport',knowledge:'Knowledge base',market:'Indicative market snapshot',computed:'Computation'};
  const generic = "evidence" in props && props.evidence;
  const sourceLabel = (source: CareerRecommendation['components'][number]['source'] | undefined) => source === 'assessment' ? c.assessment : source === 'career_passport' ? c.passport : source === 'knowledge_base' ? c.knowledge : source === 'market_snapshot' ? c.market : c.computed;
  return <motion.div className="fixed inset-0 z-[70] bg-[var(--ink)]/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="why-panel-title" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
    <motion.section ref={panelRef} className="card-sketch relative ml-auto h-full max-w-xl overflow-y-auto p-5 md:p-8" initial={reducedMotion ? false : { x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex justify-between gap-4 border-b-2 border-[var(--ink)] pb-4"><div><div className="label-caps">{generic ? `${c.desk} · ${generic.eyebrow}` : `${c.desk} · ${localizedConfidence(props.recommendation.confidence,lang)}`}</div><h2 id="why-panel-title" className="font-display text-3xl">{generic ? generic.title : c.why}</h2></div><button onClick={onClose} className="min-h-11 min-w-11 border border-[var(--ink)]" aria-label={c.close} data-testid="why-panel-close">×</button></div>
      {generic ? <>
        <p className="my-5 font-[Inter] text-sm text-black/65">{generic.summary}</p>
        <div className="border-l-4 border-black bg-white p-4"><div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-widest">{c.method}</div><p className="mt-2 font-[Inter] text-sm text-black/70">{generic.method}</p></div>
        <div className="mt-6">{generic.items.map(item=><div key={item.label} className="rule-top py-4">{item.value === undefined ? <div className="font-mono-ui text-xs uppercase">{item.label}</div> : <ScoreBar label={item.label} value={item.value}/>}<p className="mt-1 text-xs text-[var(--ink-soft)]">{item.detail}</p></div>)}</div>
        <p className="mt-8 border-t border-black/15 pt-4 font-[JetBrains_Mono] text-[10px] uppercase tracking-wide text-black/45">{c.source} · {generic.source} · {c.noLlm}</p>
      </> : <>
        <p className="my-5 font-[Inter] text-sm text-black/65">{c.ranked} <strong>{props.segment.replace("_", " ")}</strong> {c.rerank}</p>
        <p className="mb-5 border-l-4 border-[var(--accent-news)] bg-white p-3 font-[Inter] text-sm text-black/70"><strong>{c.coverage}:</strong> {props.recommendation.evidenceCoverage ?? 0}%</p>
        <div className="space-y-4">{props.recommendation.components.map(component => <div key={component.dimension}><ScoreBar label={`${localizedDimension(component.dimension,lang)} · ${c.weight} ${Math.round(component.weight * 100)}%`} value={component.score}/><p className="mt-1 font-[Inter] text-xs text-black/55">{localizedNote(component.note,lang)}{!component.dataAvailable ? ` · ${c.neutral}` : ""}</p><p className="mt-1 font-mono-ui text-[10px] uppercase tracking-wide text-black/45">{c.source}: {sourceLabel(component.source)} · {component.sourceDetail ?? c.noLlm}</p></div>)}</div>
        <div className="mt-8 border-t border-black/15 pt-5"><h3 className="font-[Playfair_Display] text-xl">{c.higher}</h3><ul className="mt-3 space-y-2">{props.recommendation.whyNotHigher.map(reason => <li key={reason} className="font-[Inter] text-sm text-black/70">→ {localizedWhyNotHigher(reason, lang)}</li>)}</ul></div>
      </>}
    </motion.section>
  </motion.div>;
}
