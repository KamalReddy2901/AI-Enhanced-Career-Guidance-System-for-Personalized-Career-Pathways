import { StickFigure } from '../components/StickFigure';

export function PassportPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="reading" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Career Passport
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 3 — Your living profile: skills with evidence, assessments, 
        experiences, and completeness tracker.
      </p>
    </div>
  );
}

export default PassportPage;
