import { ShieldCheck } from 'lucide-react';

interface NCOBadgeProps {
  variant?: 'default' | 'compact' | 'footer';
  className?: string;
}

export function NCOBadge({ variant = 'default', className = '' }: NCOBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 border border-[var(--ink-faint)] bg-[var(--paper-raised)] ${className}`}>
        <ShieldCheck size={12} className="text-[var(--ink-soft)]" />
        <span className="font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">
          NCO-2015/NSQF
        </span>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <ShieldCheck size={16} className="text-[var(--ink-soft)]" />
        <div className="flex flex-col">
          <span className="font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink)]">
            Powered by
          </span>
          <span className="font-mono-ui text-xs font-semibold text-[var(--ink)]">
            NCO-2015 & NSQF Framework
          </span>
        </div>
      </div>
    );
  }

  // default variant
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-[2px_2px_0_var(--ink)] ${className}`}>
      <ShieldCheck size={18} className="text-[var(--ink)]" />
      <div className="flex flex-col">
        <span className="font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">
          Grounded in
        </span>
        <span className="font-mono-ui text-sm font-semibold text-[var(--ink)]">
          NCO-2015 & NSQF
        </span>
      </div>
    </div>
  );
}
