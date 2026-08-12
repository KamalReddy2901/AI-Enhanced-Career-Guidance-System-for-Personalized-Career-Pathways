import { StickFigure } from '../components/StickFigure';

export function AssessRiasecPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <StickFigure pose="thinking" size={140} />
      <h1 className="mt-8 text-4xl font-[Playfair_Display] text-black">
        Interest Inventory
      </h1>
      <p className="mt-4 text-center text-black/70 max-w-md">
        Coming in Phase 4 — RIASEC interest assessment (36 items, deterministic scoring).
      </p>
    </div>
  );
}

export default AssessRiasecPage;
