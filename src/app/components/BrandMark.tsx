import { StickFigure } from './StickFigure';

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className = '' }: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <StickFigure pose="standing" size={compact ? 24 : 26} animate={false} />
      <span className={`font-[Playfair_Display] tracking-tight text-[var(--ink)] ${compact ? 'text-[1.2rem]' : 'text-[1.3rem]'}`}>
        Career<span className="text-black/35">Case</span>
      </span>
    </span>
  );
}
