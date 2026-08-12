import { StickFigure } from '../components/StickFigure';

export function PathwayPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="walking" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Career Pathway
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 6 — Multi-route pathway plans with skill gaps, learning steps, 
        and an interactive hand-drawn pathway graph.
      </p>
    </div>
  );
}

export default PathwayPage;
