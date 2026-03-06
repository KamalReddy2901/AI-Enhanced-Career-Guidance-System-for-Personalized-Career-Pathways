import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { UsageProvider } from './context/UsageContext';
import { PaywallProvider } from './context/PaywallContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 border-black/20 border-t-black/70 rounded-full animate-spin"
          aria-label="Loading"
        />
        <p className="font-[Inter] text-black/30" style={{ fontSize: '0.78rem' }}>
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
        <AppProvider>
          <UsageProvider>
            <PaywallProvider>
              <Suspense fallback={<PageFallback />}>
                <RouterProvider router={router} />
              </Suspense>
            </PaywallProvider>
          </UsageProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
