import { useEffect } from 'react';
import { occupationById } from '../../data/knowledge';
import type { RecommendationChange } from '../../context/GuidanceContext';
import { sounds } from '../../utils/sounds';
import { useT } from '../../i18n';
import { occupationName } from '../../i18n/occupationNames';
import Marquee from 'react-fast-marquee';

export function StopPress({ changes, onDismiss, onExplain }: { changes: RecommendationChange[]; onDismiss: () => void; onExplain?: (occupationId:string)=>void }) {
  const { lang } = useT();
  const c = lang === 'hi' ? {title:'ताज़ा खबर · आपका मानचित्र बदला',same:'क्रम नहीं बदला',why:'क्यों?',note:'आपके नए प्रमाण से दोबारा गणना हुई। हर घटक देखने के लिए “यह क्यों?” खोलें।'} : lang === 'te' ? {title:'తాజా వార్త · మీ పటం మారింది',same:'ర్యాంక్ మారలేదు',why:'ఎందుకు?',note:'మీ తాజా ఆధారాలతో మళ్లీ లెక్కించబడింది. ప్రతి భాగాన్ని చూడటానికి “ఇది ఎందుకు?” తెరవండి.'} : {title:'Stop press · your map changed',same:'rank unchanged',why:'why?',note:'Recomputed from your latest evidence. Open “Why this?” to inspect every component.'};
  useEffect(() => { if (changes.length) sounds.notification(); }, [changes.length]);
  if (!changes.length) return null;
  return (
    <aside className="relative mb-8 flex min-h-11 items-stretch overflow-hidden bg-[var(--accent-news)] text-[var(--paper)]" aria-live="polite">
      <Marquee speed={40} pauseOnHover className="label-caps !text-[var(--paper)]">
        <span className="mx-6">★ {c.title} ★</span>
        {changes.map((change) => (
          <button
            key={change.occupationId}
            type="button"
            onClick={() => onExplain?.(change.occupationId)}
            className="mx-6 min-h-11 whitespace-nowrap underline-offset-4 hover:underline focus-visible:outline-[var(--paper)]"
            data-testid={`stop-press-explain-${change.occupationId}`}
            aria-label={`${c.why} ${occupationById.get(change.occupationId)?.title ?? change.occupationId}`}
          >
            ★ {occupationById.get(change.occupationId)
              ? occupationName(change.occupationId, occupationById.get(change.occupationId)!.title, lang)
              : change.occupationId}{' '}
            {change.previousScore}→{change.score} · {change.rank < change.previousRank
              ? `▲ ${change.previousRank - change.rank}`
              : change.rank > change.previousRank
                ? `▼ ${change.rank - change.previousRank}`
                : c.same} · {c.why} ★
          </button>
        ))}
        <span className="mx-6">★ {c.note} ★</span>
      </Marquee>
      <button
        type="button"
        onClick={onDismiss}
        className="font-mono-ui relative z-10 grid w-11 shrink-0 place-items-center border-l border-[var(--paper)] bg-[var(--accent-news)]"
        aria-label={lang === 'hi' ? 'समाचार बंद करें' : lang === 'te' ? 'వార్తను మూసివేయండి' : 'Dismiss changes'}
        data-testid="stop-press-dismiss"
      >
        ×
      </button>
    </aside>
  );
}
