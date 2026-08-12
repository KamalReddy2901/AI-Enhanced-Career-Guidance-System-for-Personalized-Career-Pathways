import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useT, type TranslationKey } from '../i18n';

const ROUTE_LABELS: Record<string, TranslationKey> = {
  '/': 'home',
  '/job': 'breadcrumbJob',
  '/job/detail': 'breadcrumbJobDetail',
  '/simulation': 'breadcrumbSimulation',
  '/compare': 'breadcrumbCompare',
  '/quiz': 'breadcrumbQuiz',
  '/history': 'breadcrumbHistory',
  '/favorites': 'breadcrumbFavorites',
  '/settings': 'settings',
  '/interview': 'breadcrumbInterview',
};

// Parent path for each route
const PARENT_MAP: Record<string, string> = {
  '/job': '/',
  '/job/detail': '/job',
  '/simulation': '/job/detail',
  '/interview': '/job/detail',
  '/compare': '/',
  '/quiz': '/',
  '/history': '/',
  '/favorites': '/',
  '/settings': '/',
};

function buildCrumbs(pathname: string): string[] {
  const crumbs: string[] = [pathname];
  let current = pathname;
  while (PARENT_MAP[current]) {
    current = PARENT_MAP[current];
    crumbs.unshift(current);
  }
  return crumbs;
}

export function Breadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentJob } = useApp();
  const { t } = useT();
  const pathname = location.pathname;

  // Don't show on home
  if (pathname === '/') return null;

  const crumbs = buildCrumbs(pathname);

  // Inject job title into dossier/overview/simulation breadcrumbs
  const getLabel = (path: string, index: number, total: number) => {
    const translationKey = ROUTE_LABELS[path];
    const base = translationKey ? t(translationKey) : path.replace('/', '');
    if (currentJob && path === '/job') return currentJob.title.length > 22 ? currentJob.title.slice(0, 22) + '…' : currentJob.title;
    return base;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.nav
        key={pathname}
        aria-label="Breadcrumb"
        className="w-full border-b border-[var(--ink)] bg-[var(--paper)]/80 backdrop-blur-sm print:hidden"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
      >
        <div className="max-w-5xl mx-auto px-6 py-1.5 flex items-center gap-1">
          {crumbs.map((path, i) => {
            const isLast = i === crumbs.length - 1;
            const label = getLabel(path, i, crumbs.length);
            return (
              <span key={path} className="flex items-center gap-1">
                {isLast ? (
                  <span
                    className="label-caps !text-[var(--ink-soft)]"
                    aria-current="page"
                    style={{ fontSize: '0.7rem' }}
                  >
                    {label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(path)}
                    className="label-caps !text-[var(--ink-faint)] transition-colors hover:!text-[var(--ink)]"
                  >
                    {label}
                  </button>
                )}
                {!isLast && <span className="font-mono-ui text-[var(--ink-faint)]" aria-hidden="true">/</span>}
              </span>
            );
          })}
        </div>
      </motion.nav>
    </AnimatePresence>
  );
}
