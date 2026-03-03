import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Brain, Clock, Settings, FlaskConical } from 'lucide-react';
import { hapticTap } from '../utils/haptic';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/quiz', icon: Brain, label: 'Quiz' },
  { path: '/history', icon: Clock, label: 'History' },
  { path: '/compare', icon: FlaskConical, label: 'Compare' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
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
    navigate(path);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-background/95 backdrop-blur-md border-t border-black/10 dark:border-white/10 print:hidden"
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          exit={{ y: 60 }}
          transition={{ duration: 0.2 }}
          aria-label="Bottom navigation"
        >
          <div className="flex items-center justify-around h-14">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path ||
                (path === '/' && location.pathname === '/') ||
                (path !== '/' && location.pathname.startsWith(path));

              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                    isActive ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30'
                  }`}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
                  <span className="font-[Inter]" style={{ fontSize: '0.58rem' }}>{label}</span>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
