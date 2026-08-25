import { Outlet } from 'react-router';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { GuidanceProvider } from '../context/GuidanceContext';
import { LanguageProvider } from '../i18n';

/** Route-scoped legacy runtime. Controlled SIH routes are siblings and never
 * mount this provider graph. */
export function LegacyCareerCaseRuntime() {
  return (
    <AuthProvider>
      <GuidanceProvider>
        <LanguageProvider>
          <AppProvider>
            <Outlet />
          </AppProvider>
        </LanguageProvider>
      </GuidanceProvider>
    </AuthProvider>
  );
}
