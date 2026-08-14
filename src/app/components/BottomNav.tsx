import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Compass, UserRound, Settings, MessageCircle } from 'lucide-react';
import { hapticTap } from '../utils/haptic';
import { sounds } from '../utils/sounds';
import { useT } from '../i18n';
import { useAuth } from '../context/AuthContext';

export function BottomNav() {
  const { t } = useT();
  const navItems = [
    { path: '/', href: '/', icon: Home, label: t('home') },
    { path: '/job', href: '/job?fresh=1', icon: Compass, label: t('explore') },
    { path: '/dashboard', href: '/dashboard', icon: UserRound, label: t('personal') },
    { path: '/counselor', href: '/counselor', icon: MessageCircle, label: t('counselor') },
    { path: '/settings', href: '/settings', icon: Settings, label: t('settings') },
  ];
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false); // scrolling down
      } else {
        setVisible(true); // scrolling up
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (path: string) => {
    hapticTap();
    sounds.navigate();
    navigate(path);
  };

  if (!user || location.pathname === '/auth') return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-[var(--ink)] bg-[var(--paper)] pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden"
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          exit={{ y: 60 }}
          transition={{ duration: 0.2 }}
          aria-label="Bottom navigation"
        >
          <div className="flex items-center justify-around h-14 px-2">
            {navItems.map(({ path, href, icon: Icon, label }) => {
              const isActive = location.pathname === path ||
                (path === '/' && location.pathname === '/') ||
                (path === '/dashboard' && ['/dashboard', '/passport', '/assess', '/recommendations', '/pathways', '/pathway/'].some(personalPath => location.pathname.startsWith(personalPath))) ||
                (path !== '/' && location.pathname.startsWith(path));

              return (
                <button
                  key={path}
                  onClick={() => handleNav(href)}
                  className={`font-mono-ui flex h-full w-full flex-col items-center justify-center gap-1 transition-colors min-w-0 ${
                    isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-faint)]'
                  }`}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`bottom-nav-${path === '/' ? 'home' : path.slice(1)}`}
                >
                  <motion.span
                    className={`grid size-8 place-items-center rounded-full transition-colors ${isActive ? 'bg-[var(--ink)] text-[var(--paper)]' : ''}`}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  </motion.span>
                  <span className="text-[9px] uppercase tracking-wider leading-none">{label}</span>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
