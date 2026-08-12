import { StickFigure } from '../components/StickFigure';

export function AssessmentHubPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="reading" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Assessment Hub
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 4 — RIASEC inventory, aptitude screeners, work values sorter, 
        and conversational aspiration elicitation.
      </p>
    </div>
  );
}

export default AssessmentHubPage;
