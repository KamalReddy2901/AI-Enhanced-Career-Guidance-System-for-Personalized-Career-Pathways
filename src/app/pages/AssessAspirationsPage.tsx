import { StickFigure } from '../components/StickFigure';

export function AssessAspirationsPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="talking" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Your Aspirations
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 4 — Conversational aspiration elicitation with LLM interviewer.
      </p>
    </div>
  );
}

export default AssessAspirationsPage;
