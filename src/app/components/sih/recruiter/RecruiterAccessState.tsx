import type { ReactNode } from 'react';

export type AccessState = 'loading' | 'available' | 'unavailable' | 'unauthorized' | 'withdrawn' | 'stale' | 'error';

interface Props {
  readonly state: AccessState;
  readonly errorMessage?: string;
  readonly children?: ReactNode;
}

export default function RecruiterAccessState({ state, errorMessage, children }: Props) {
  if (state === 'loading') {
    return (
      <div className="flex h-32 items-center justify-center border-2 border-black bg-[#f7f4ed] shadow-[4px_4px_0_#111]">
        <p className="animate-pulse font-mono-ui text-sm font-black uppercase tracking-wide">
          Loading applicant data...
        </p>
      </div>
    );
  }

  if (state === 'withdrawn') {
    return (
      <div className="border-2 border-black bg-[#f7f4ed] p-6 shadow-[4px_4px_0_#111]">
        <h2 className="mb-2 font-mono-ui text-sm font-black uppercase text-[#d63c1d]">
          Access Blocked
        </h2>
        <p className="text-sm font-bold text-black/80">
          Applicant has withdrawn consent. You are no longer authorized to view their private data.
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="border-2 border-[#d63c1d] bg-[#f7f4ed] p-6 shadow-[4px_4px_0_#d63c1d]">
        <h2 className="mb-2 font-mono-ui text-sm font-black uppercase text-[#d63c1d]">
          Access Error
        </h2>
        <p className="text-sm font-bold text-black/80">
          {errorMessage || 'A system error occurred while attempting to access this projection.'}
        </p>
      </div>
    );
  }

  if (state === 'unauthorized') {
    return (
      <div className="border-2 border-[#d63c1d] bg-[#f7f4ed] p-6 shadow-[4px_4px_0_#d63c1d]">
        <h2 className="mb-2 font-mono-ui text-sm font-black uppercase text-[#d63c1d]">
          Unauthorized
        </h2>
        <p className="text-sm font-bold text-black/80">
          {errorMessage || 'You are not authorized to view this projection.'}
        </p>
      </div>
    );
  }

  if (state === 'unavailable') {
    return (
      <div className="flex h-32 items-center justify-center border-2 border-black bg-[#f7f4ed] shadow-[4px_4px_0_#111]">
        <p className="font-mono-ui text-sm font-black uppercase tracking-wide text-black/50">
          {errorMessage || 'Select an application to view details'}
        </p>
      </div>
    );
  }

  if (state === 'stale') {
    return (
      <div className="border-2 border-amber-500 bg-[#f7f4ed] p-6 shadow-[4px_4px_0_#f59e0b]">
        <h2 className="mb-2 font-mono-ui text-sm font-black uppercase text-amber-600">
          Stale Projection
        </h2>
        <p className="text-sm font-bold text-black/80">
          {errorMessage || 'The projection data is out of date and cannot be safely rendered for recruitment decisions.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
