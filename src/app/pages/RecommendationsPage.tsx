import { StickFigure } from '../components/StickFigure';

export function RecommendationsPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="searching" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Your Career Landscape
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 5 — Deterministic multi-objective career recommendations 
        grouped by fit, growth, transition ease, and aspiration.
      </p>
    </div>
  );
}

export default RecommendationsPage;
