import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { RIASEC_ITEMS, scoreRiasec, getTopCode, interpretTopDimension } from '../engine/riasec';
import { calculateCompleteness } from '../engine/skillProfile';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { saveAssessment } from '../services/guidanceDb';
import { sounds } from '../utils/sounds';

export function AssessRiasecPage() {
  const navigate = useNavigate(); const { passport, updatePassport } = useGuidance(); const { user } = useAuth();
  const [index, setIndex] = useState(0); const [answers, setAnswers] = useState<Record<string, number>>({}); const [result, setResult] = useState<ReturnType<typeof scoreRiasec> | null>(null);
  const item = RIASEC_ITEMS[index];
  const finish = (next: Record<string, number>) => { const scores = scoreRiasec(next); setResult(scores); updatePassport(prev => { if (!prev) throw new Error('Complete onboarding first'); const p = { ...prev, riasec: scores }; p.completeness = calculateCompleteness(p); return p; }); if (user?.id) void saveAssessment(user.id, 'riasec', { scores, topCode: getTopCode(scores) }); sounds.success(); };
  if (result) return <AssessmentShell title="Interest inventory complete" pose="celebrating"><div className="max-w-xl mx-auto"><div className="grid grid-cols-3 gap-2 mb-6">{Object.entries(result).map(([key, value]) => <div key={key} className="border border-black/10 p-3 text-center"><div className="font-[JetBrains_Mono] text-xs">{key}</div><div className="text-2xl font-[Playfair_Display]">{value}</div></div>)}</div><p className="font-[JetBrains_Mono] text-sm mb-2">TOP CODE · {getTopCode(result)}</p><p className="font-[Inter] text-black/70">{interpretTopDimension(getTopCode(result)[0] as Parameters<typeof interpretTopDimension>[0])}</p><button onClick={() => navigate('/assess')} className="mt-6 w-full bg-black text-white p-3 font-[Inter]">Back to assessment desk</button></div></AssessmentShell>;
  return <AssessmentShell title="What kind of work draws you in?" pose="thinking"><div className="max-w-xl mx-auto"><div className="flex justify-between font-[JetBrains_Mono] text-xs uppercase tracking-wide mb-3"><span>{index + 1} / {RIASEC_ITEMS.length}</span><span>{item.dimension} · work activity</span></div><div className="h-1 bg-black/10 mb-8"><div className="h-1 bg-black transition-all" style={{ width: `${((index + 1) / RIASEC_ITEMS.length) * 100}%` }} /></div><h2 className="text-3xl font-[Playfair_Display] mb-8">{item.text}</h2><div className="grid grid-cols-5 gap-2">{['Not for me','Dislike','Neutral','Like','Love it'].map((label, n) => <button key={label} onClick={() => { const next = { ...answers, [item.id]: n + 1 }; setAnswers(next); sounds.quizAnswer(); if (index === RIASEC_ITEMS.length - 1) finish(next); else setIndex(index + 1); }} className="min-h-16 border border-black/20 p-2 text-xs font-[Inter] hover:bg-black hover:text-white transition-colors">{label}</button>)}</div></div></AssessmentShell>;
}

function AssessmentShell({ title, pose, children }: { title: string; pose: 'thinking' | 'celebrating'; children: ReactNode }) { return <div className="min-h-screen bg-[#f9f8f7] p-4 md:p-8"><div className="max-w-3xl mx-auto"><div className="flex items-center gap-4 border-b-2 border-black pb-5 mb-8"><StickFigure pose={pose} size={76} /><div><div className="font-[JetBrains_Mono] text-xs uppercase tracking-widest text-black/50">CareerCase · assessment desk</div><h1 className="text-3xl md:text-4xl font-[Playfair_Display]">{title}</h1></div></div>{children}</div></div>; }
export default AssessRiasecPage;
