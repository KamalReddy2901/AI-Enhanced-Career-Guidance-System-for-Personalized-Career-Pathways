import { useState } from 'react';
import { useT } from '../../i18n';
import { WhyPanel, type ScoreEvidence } from './WhyPanel';

export function EvidenceButton({ evidence, testId, label }: { evidence: ScoreEvidence; testId: string; label?: string }) {
  const { lang } = useT(); const [open, setOpen] = useState(false);
  const text = label ?? (lang === 'hi' ? 'यह क्यों?' : lang === 'te' ? 'ఇది ఎందుకు?' : 'Why this?');
  return <>{open && <WhyPanel evidence={evidence} onClose={() => setOpen(false)} />}<button data-testid={testId} onClick={() => setOpen(true)} className="mt-3 min-h-11 border border-[var(--ink)] px-3 font-mono-ui text-[10px] uppercase tracking-widest">{text}</button></>;
}
