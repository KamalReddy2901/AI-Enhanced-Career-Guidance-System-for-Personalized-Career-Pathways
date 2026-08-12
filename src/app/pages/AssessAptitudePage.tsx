import { StickFigure } from '../components/StickFigure';

export function AssessAptitudePage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="working" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Aptitude Screener
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 4 — Timed mini-tests: numerical, verbal, logical, spatial.
      </p>
    </div>
  );
}

export default AssessAptitudePage;
