import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { GuidanceProvider } from './context/GuidanceContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './i18n';

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-10 h-10 border-3 border-black/15 border-t-black/70 rounded-full animate-spin"
          style={{ borderWidth: '3px' }}
          aria-label="Loading"
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
      <AuthProvider>
        <GuidanceProvider>
          <LanguageProvider>
          <AppProvider>
            <Suspense fallback={<PageFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </AppProvider>
          </LanguageProvider>
        </GuidanceProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
