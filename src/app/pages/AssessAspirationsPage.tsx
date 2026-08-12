import { useState } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { saveAssessment } from '../services/guidanceDb';
import { extractAspiration } from '../services/ai';
import { occupationById } from '../data/knowledge';
import { calculateCompleteness } from '../engine/skillProfile';
import { sounds } from '../utils/sounds';

export function AssessAspirationsPage() {
  const nav = useNavigate(); const { updatePassport } = useGuidance(); const { user } = useAuth();
  const [statement, setStatement] = useState(''); const [horizon, setHorizon] = useState(3); const [themes, setThemes] = useState<string[]>([]); const [intent, setIntent] = useState<'none'|'curious'|'strong'>('none'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const themeOptions = ['technology','people','creativity','stability','business','community','outdoors'];
  const finish = async (useAi: boolean) => {
    if (!statement.trim()) return; setBusy(true); setError('');
    try {
      const extracted = useAi ? await extractAspiration(statement, horizon, themes, intent) : { statement: statement.trim(), horizonYears: horizon, themes, dreamOccupationIds: [], entrepreneurialIntent: intent };
      const dreamIds = extracted.dreamOccupationIds.map(name => { const target = name.toLowerCase(); return [...occupationById.values()].find(o => o.title.toLowerCase() === target || o.title.toLowerCase().includes(target) || target.includes(o.title.toLowerCase()))?.id; }).filter((id): id is string => Boolean(id));
      const aspiration = { ...extracted, dreamOccupationIds: dreamIds, capturedVia: useAi ? 'conversation' as const : 'form' as const };
      updatePassport(prev => { if (!prev) throw new Error('Complete onboarding first'); const p = { ...prev, aspiration }; p.completeness = calculateCompleteness(p); return p; });
      if (user?.id) void saveAssessment(user.id, 'aspiration', aspiration); sounds.success(); nav('/assess');
    } catch { setError('The conversation service is unavailable. Your quick form is ready to save instead.'); } finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8"><div className="max-w-3xl mx-auto"><header className="flex items-center gap-4 border-b-2 border-black pb-5 mb-8"><StickFigure pose="talking" size={80}/><div><div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">CareerCase · interview desk</div><h1 className="text-3xl md:text-4xl font-[Playfair_Display]">Where would you like to head?</h1></div></header><div className="max-w-xl mx-auto bg-white border border-black/10 p-6"><label className="font-[Inter] text-sm font-semibold">In your own words, what would you like your work life to become?</label><textarea value={statement} onChange={e=>setStatement(e.target.value)} rows={5} placeholder="I would like to…" className="w-full mt-3 border border-black/20 p-3 font-[Inter] resize-none"/><label className="block mt-5 font-[Inter] text-sm font-semibold">Time horizon · {horizon} years</label><input type="range" min="1" max="10" value={horizon} onChange={e=>setHorizon(Number(e.target.value))} className="w-full mt-3"/><div className="mt-5"><div className="font-[Inter] text-sm font-semibold mb-2">Themes that matter</div><div className="flex flex-wrap gap-2">{themeOptions.map(t=><button key={t} onClick={()=>setThemes(themes.includes(t)?themes.filter(x=>x!==t):[...themes,t])} className={'px-3 py-2 border rounded-full text-sm '+(themes.includes(t)?'bg-black text-white':'border-black/20')}>{t}</button>)}</div></div><div className="mt-5"><label className="font-[Inter] text-sm font-semibold">Starting a venture feels…</label><select value={intent} onChange={e=>setIntent(e.target.value as typeof intent)} className="block w-full mt-2 border border-black/20 p-3"><option value="none">Not part of my plan right now</option><option value="curious">Something I’m curious about</option><option value="strong">A strong goal</option></select></div>{error&&<p className="mt-4 text-sm text-amber-800 bg-amber-50 p-3">{error}</p>}<div className="mt-6 grid md:grid-cols-2 gap-3"><button disabled={busy||!statement.trim()} onClick={()=>void finish(true)} className="bg-black text-white p-3 font-[Inter] disabled:bg-black/20">{busy?'Saving…':'Reflect with interviewer'}</button><button disabled={busy||!statement.trim()} onClick={()=>void finish(false)} className="border border-black/20 p-3 font-[Inter] disabled:opacity-40">Use quick form</button></div></div></div></div>;
}
export default AssessAspirationsPage;
