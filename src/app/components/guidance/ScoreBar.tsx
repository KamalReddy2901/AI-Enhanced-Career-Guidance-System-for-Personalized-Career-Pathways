export function ScoreBar({ value, label }: { value: number; label?: string }) {
  return <div><div className="flex justify-between font-[JetBrains_Mono] text-[10px] uppercase tracking-wide"><span>{label}</span><span>{Math.round(value)}</span></div><div className="mt-1 h-2 bg-black/10"><div className="h-2 bg-black transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div></div>;
}
