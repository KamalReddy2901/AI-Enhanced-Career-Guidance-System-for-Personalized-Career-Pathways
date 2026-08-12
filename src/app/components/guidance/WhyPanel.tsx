import type { CareerRecommendation, Segment } from "../../engine/types";
import { ScoreBar } from "./ScoreBar";

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
  const generic = "evidence" in props && props.evidence;
  return <div className="fixed inset-0 z-[70] bg-black/25 p-4" role="dialog" aria-modal="true" aria-label={generic ? generic.title : "Why this career"}>
    <button className="absolute inset-0" aria-label="Close explanation" onClick={onClose}/>
    <section className="relative ml-auto h-full max-w-xl overflow-y-auto border-2 border-black bg-[#f9f8f7] p-5 md:p-8">
      <div className="flex justify-between gap-4 border-b-2 border-black pb-4"><div><div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-widest">{generic ? generic.eyebrow : `Evidence desk · ${props.recommendation.confidence} confidence`}</div><h2 className="font-[Playfair_Display] text-3xl">{generic ? generic.title : "Why this option?"}</h2></div><button onClick={onClose} className="min-h-11 min-w-11 border border-black/20">×</button></div>
      {generic ? <>
        <p className="my-5 font-[Inter] text-sm text-black/65">{generic.summary}</p>
        <div className="border-l-4 border-black bg-white p-4"><div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-widest">Deterministic method</div><p className="mt-2 font-[Inter] text-sm text-black/70">{generic.method}</p></div>
        <div className="mt-6 space-y-4">{generic.items.map(item=><div key={item.label}>{item.value === undefined ? <div className="font-[JetBrains_Mono] text-xs uppercase">{item.label}</div> : <ScoreBar label={item.label} value={item.value}/>}<p className="mt-1 font-[Inter] text-xs text-black/55">{item.detail}</p></div>)}</div>
        <p className="mt-8 border-t border-black/15 pt-4 font-[JetBrains_Mono] text-[10px] uppercase tracking-wide text-black/45">Source · {generic.source} · LLM not used for this score.</p>
      </> : <>
        <p className="my-5 font-[Inter] text-sm text-black/65">Ranked with the <strong>{props.segment.replace("_", " ")}</strong> lens. Change your segment in the Career Passport to re-rank.</p>
        <div className="space-y-4">{props.recommendation.components.map(component => <div key={component.dimension}><ScoreBar label={`${component.dimension} · weight ${Math.round(component.weight * 100)}%`} value={component.score}/><p className="mt-1 font-[Inter] text-xs text-black/55">{component.note}{!component.dataAvailable ? " · Neutral score used because this signal is missing." : ""}</p></div>)}</div>
        <div className="mt-8 border-t border-black/15 pt-5"><h3 className="font-[Playfair_Display] text-xl">Why not higher?</h3><ul className="mt-3 space-y-2">{props.recommendation.whyNotHigher.map(reason => <li key={reason} className="font-[Inter] text-sm text-black/70">→ {reason}</li>)}</ul></div>
      </>}
    </section>
  </div>;
}
