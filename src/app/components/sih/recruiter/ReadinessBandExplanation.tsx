import type { ReadinessBand } from '../../../domain/readiness';

interface Props {
  readonly band: ReadinessBand;
}

export default function ReadinessBandExplanation({ band }: Props) {
  let badgeClass = 'bg-[#111] text-white';
  let label = 'Unknown';
  let isNotEligible = false;

  switch (band) {
    case 'READY_FOR_REVIEW':
      badgeClass = 'bg-[#16a34a] text-white';
      label = 'Ready for Review';
      break;
    case 'NEAR_READY':
      badgeClass = 'bg-[#2563eb] text-white';
      label = 'Near Ready';
      break;
    case 'BUILDING_EVIDENCE':
      badgeClass = 'bg-[#ca8a04] text-white';
      label = 'Building Evidence';
      break;
    case 'NEEDS_REVIEW':
      badgeClass = 'bg-[#d63c1d] text-white';
      label = 'Needs Review';
      break;
    case 'NOT_ELIGIBLE':
      badgeClass = 'bg-[#555] text-white';
      label = 'Not Eligible';
      isNotEligible = true;
      break;
  }

  return (
    <div className="mt-4 border-l-4 border-black bg-[#f7f4ed] p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className={`${badgeClass} px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide`}>
          {label}
        </span>
        <span className="font-mono-ui text-[9px] font-black uppercase text-[#d63c1d]">
          Readiness at submission — not a hiring probability
        </span>
      </div>
      <p className="text-xs text-black/70">
        This band represents the applicant&apos;s readiness context at the exact moment of submission based on the provided evidence. 
        It does not predict recruitment outcomes or candidate ranking.
        {isNotEligible && (
          <span className="mt-1 block font-bold text-[#d63c1d]">
            Note: "Not Eligible" reflects a deterministic gap in opportunity eligibility at the time of submission. It is not an automatic recruiter rejection.
          </span>
        )}
      </p>
    </div>
  );
}
