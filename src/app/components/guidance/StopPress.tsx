import { useEffect } from 'react';
import { occupationById } from '../../data/knowledge';
import type { RecommendationChange } from '../../context/GuidanceContext';
import { sounds } from '../../utils/sounds';

export function StopPress({ changes, onDismiss, onExplain }: { changes: RecommendationChange[]; onDismiss: () => void; onExplain?: (occupationId:string)=>void }) {
  useEffect(() => { if (changes.length) sounds.notification(); }, [changes.length]);
  if (!changes.length) return null;
  return <aside className="relative mb-8 rotate-[-.35deg] border-y-4 border-double border-black bg-white p-5 shadow-[4px_4px_0_rgba(0,0,0,.08)]" aria-live="polite">
    <button onClick={onDismiss} className="absolute right-3 top-3 min-h-11 min-w-11 font-[Inter]" aria-label="Dismiss changes">×</button>
    <div className="font-[JetBrains_Mono] text-xs font-bold uppercase tracking-[.24em]">Stop press · your map changed</div>
    <ul className="mt-3 space-y-2 pr-10">{changes.map(change => <li key={change.occupationId} className="font-[Inter] text-sm"><button onClick={()=>onExplain?.(change.occupationId)} className="min-h-11 text-left underline-offset-2 hover:underline">
      <strong>{occupationById.get(change.occupationId)?.title ?? change.occupationId}</strong> {change.previousScore}→{change.score} · {change.rank < change.previousRank ? `▲ ${change.previousRank - change.rank}` : change.rank > change.previousRank ? `▼ ${change.rank - change.previousRank}` : 'rank unchanged'} · why?
    </button></li>)}</ul>
    <p className="mt-3 font-[Inter] text-xs text-black/55">Recomputed from your latest evidence. Open “Why this?” to inspect every component.</p>
  </aside>;
}
