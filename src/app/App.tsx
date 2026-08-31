import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ErrorBoundary } from './components/ErrorBoundary';

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-10 h-10 border-3 border-black/15 border-t-black/70 rounded-full animate-spin"
          style={{ borderWidth: '3px' }}
          aria-hidden="true"
        />
        <p className="font-[Inter] text-black/35 tracking-wide" style={{ fontSize: '0.8rem' }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
}
