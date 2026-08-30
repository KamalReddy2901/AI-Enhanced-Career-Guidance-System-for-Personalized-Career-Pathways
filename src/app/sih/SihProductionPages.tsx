import { Link } from 'react-router';
import { useSihProduction } from './SihProductionContext';

function Notice({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="mt-8 border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">
      {children}
    </div>
  );
}

export function CareerWorkspacePage() {
  const { loading, error, actorId } = useSihProduction();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">
        Engine A · private guidance
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Career</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
        Career Passport and Career Direction remain the private guidance engine. Those inputs are structurally separate from Opportunity Readiness and recruiter projections.
      </p>
      {loading ? (
        <Notice>Loading authenticated authority…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : !actorId ? (
        <Notice>Sign in with a provisioned CareerCase role to use this production workspace.</Notice>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            className="border-2 border-black bg-white p-5 font-black shadow-[4px_4px_0_#111]"
            to="/passport"
          >
            Career Passport →
          </Link>
          <Link
            className="border-2 border-black bg-white p-5 font-black shadow-[4px_4px_0_#111]"
            to="/recommendations"
          >
            Career Direction →
          </Link>
        </div>
      )}
    </div>
  );
}
