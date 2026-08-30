import type { CanonicalResolutionState } from '../../../domain/skillResolution';

interface Props {
  readonly resolution: CanonicalResolutionState;
}

export default function SkillResolutionBadge({ resolution }: Props) {
  if (resolution.state === 'resolved') {
    return (
      <span className="inline-flex items-center border-2 border-black bg-[#16a34a] px-2 py-0.5 font-mono-ui text-[9px] font-black uppercase text-white shadow-[2px_2px_0_#111]">
        Resolved: {resolution.matchKind}
      </span>
    );
  }

  if (resolution.state === 'review_required') {
    return (
      <span className="inline-flex items-center border-2 border-black bg-[#ca8a04] px-2 py-0.5 font-mono-ui text-[9px] font-black uppercase text-white shadow-[2px_2px_0_#111]">
        Review Required
      </span>
    );
  }

  return (
    <span className="inline-flex items-center border-2 border-black bg-[#dc2626] px-2 py-0.5 font-mono-ui text-[9px] font-black uppercase text-white shadow-[2px_2px_0_#111]">
      Unresolved
    </span>
  );
}
