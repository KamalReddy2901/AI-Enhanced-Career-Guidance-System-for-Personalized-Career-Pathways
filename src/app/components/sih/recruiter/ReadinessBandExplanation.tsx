import type { ReadinessBand } from '../../../domain/readiness';

interface Props {
  readonly band: ReadinessBand;
}

export default function ReadinessBandExplanation({ band }: Props) {
  let color = 'bg-[#111]';
  let label = 'Unknown';
  let text = 'black';

  switch (band) {
    case 'READY_FOR_REVIEW':
      color = 'bg-[#16a34a]';
      label = 'Ready for Review';
      text = 'white';
      break;
    case 'NEAR_READY':
      color = 'bg-[#2563eb]';
      label = 'Near Ready';
      text = 'white';
      break;
    case 'BUILDING_EVIDENCE':
      color = 'bg-[#ca8a04]';
      label = 'Building Evidence';
      text = 'white';
      break;
    case 'NEEDS_REVIEW':
      color = 'bg-[#d63c1d]';
      label = 'Needs Review';
      text = 'white';
      break;
    case 'NOT_ELIGIBLE':
      color = 'bg-[#555]';
      label = 'Not Eligible';
      text = 'white';
      break;
  }

  return (
    <div className="mt-4 border-l-4 border-black bg-[#f7f4ed] p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className={`${color} text-${text} px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide`}>
          {label}
        </span>
        <span className="font-mono-ui text-[9px] font-black uppercase text-[#d63c1d]">
          Readiness at submission — not a hiring probability
        </span>
      </div>
      <p className="text-xs text-black/70">
        This band represents the applicant&apos;s readiness context at the exact moment of submission based on the provided evidence. 
        It does not predict recruitment outcomes or candidate ranking.
      </p>
    </div>
  );
}
