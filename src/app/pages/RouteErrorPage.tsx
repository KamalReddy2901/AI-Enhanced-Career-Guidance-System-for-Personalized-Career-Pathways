import { isRouteErrorResponse, useRouteError } from 'react-router';
import { StickFigure } from '../components/StickFigure';

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error interrupted this page.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-6 text-[var(--ink)]">
      <div className="w-full max-w-lg border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-8 text-center shadow-[6px_6px_0_var(--ink)]">
        <div className="flex justify-center"><StickFigure pose="thinking" size={88} animate={false} /></div>
        <div className="label-caps mt-5">CareerCase recovery desk</div>
        <h1 className="font-display mt-3 text-4xl">This page hit a snag.</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          Your saved Career Passport is safe. Reload this page, or return to your dashboard and continue from the next recommended step.
        </p>
        <details className="mt-5 text-left text-xs text-[var(--ink-soft)]">
          <summary className="cursor-pointer font-mono-ui uppercase">Technical detail</summary>
          <p className="mt-2 break-words border border-[var(--ink-faint)] p-3">{message}</p>
        </details>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 border-2 border-[var(--ink)] px-5 font-mono-ui text-xs uppercase">Reload page</button>
          <a href="/dashboard" className="inline-flex min-h-11 items-center bg-[var(--ink)] px-5 font-mono-ui text-xs uppercase text-[var(--paper)]">Go to dashboard</a>
        </div>
      </div>
    </main>
  );
}

export default RouteErrorPage;
