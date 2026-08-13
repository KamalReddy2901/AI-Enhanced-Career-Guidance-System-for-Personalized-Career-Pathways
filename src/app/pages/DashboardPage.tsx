import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { 
  ClipboardCheck, 
  Map, 
  Route, 
  UserRound, 
  ArrowRight,
  CheckCircle2,
  Circle,
  TrendingUp,
  Target,
  Zap,
  Sparkles
} from 'lucide-react';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { StickFigure } from '../components/StickFigure';
import type { StickFigurePose } from '../components/StickFigure';
import { useT } from '../i18n';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  pose: StickFigurePose;
  accentColor: string;
  stats?: { label: string; value: string | number };
}

export function DashboardPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { passport, recommendations, pathways } = useGuidance();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (!user) {
    navigate('/auth?redirect=/dashboard');
    return null;
  }

  const cards: DashboardCard[] = [
    {
      title: 'Assessment Desk',
      description: 'Discover your interests, aptitudes, values, and aspirations through scientific assessments',
      icon: <ClipboardCheck size={28} strokeWidth={1.5} />,
      path: '/assess',
      pose: 'reading',
      accentColor: 'var(--accent-news)',
      stats: passport ? { 
        label: 'Completed', 
        value: `${[passport.riasec, passport.aptitude, passport.values, passport.aspiration].filter(Boolean).length}/4` 
      } : undefined,
    },
    {
      title: 'Career Landscape',
      description: 'Explore personalized career recommendations matched to your unique profile',
      icon: <Map size={28} strokeWidth={1.5} />,
      path: '/recommendations',
      pose: 'mapping',
      accentColor: '#dc2626',
      stats: (recommendations && recommendations.recommendations.length > 0) ? { label: 'Careers', value: recommendations.recommendations.length } : undefined,
    },
    {
      title: 'Career Pathways',
      description: 'View step-by-step routes to your dream careers with timeline and milestones',
      icon: <Route size={28} strokeWidth={1.5} />,
      path: '/pathways',
      pose: 'climbing',
      accentColor: 'var(--ink)',
      stats: pathways.length > 0 ? { label: 'Pathways', value: pathways.length } : undefined,
    },
    {
      title: 'Career Passport',
      description: 'Your living career profile with skills, experience, and credentials',
      icon: <UserRound size={28} strokeWidth={1.5} />,
      path: '/passport',
      pose: 'presenting',
      accentColor: '#dc2626',
      stats: passport ? { label: 'Complete', value: `${passport.completeness}%` } : undefined,
    },
  ];

  const progressItems = [
    { label: 'Career Passport created', done: !!passport, path: '/passport' },
    { label: 'Interests assessment', done: !!passport?.riasec, path: '/assess/interests' },
    { label: 'Aptitude assessment', done: !!passport?.aptitude, path: '/assess/aptitude' },
    { label: 'Work values assessment', done: !!passport?.values, path: '/assess/values' },
    { label: 'Skills added', done: (passport?.skills.length ?? 0) > 0, path: '/passport' },
    { label: 'Career pathway built', done: pathways.length > 0, path: '/recommendations' },
  ];

  const completedCount = progressItems.filter(item => item.done).length;
  const progressPercentage = Math.round((completedCount / progressItems.length) * 100);

  const getNextStep = () => {
    if (!passport?.riasec) {
      return { text: 'Take the interests assessment to get personalized career matches', path: '/assess/interests', label: 'interests assessment' };
    }
    if (!passport?.aptitude) {
      return { text: 'Complete the aptitude assessment to refine your recommendations', path: '/assess/aptitude', label: 'aptitude assessment' };
    }
    if (!passport?.values) {
      return { text: 'Take the work values assessment to improve matching accuracy', path: '/assess/values', label: 'work values assessment' };
    }
    if ((passport?.skills.length ?? 0) === 0) {
      return { text: 'Add your skills to your passport by uploading a resume', path: '/passport', label: 'passport' };
    }
    if (pathways.length === 0) {
      return { text: 'View your career recommendations and build your first pathway', path: '/recommendations', label: 'career recommendations' };
    }
    return { text: 'Your profile is complete! Continue exploring careers or talk to the AI counselor', path: '/counselor', label: 'AI counselor' };
  };

  const nextStep = getNextStep();

  return (
    <div className="min-h-screen bg-[var(--paper)] pb-16">
      {/* Header Section */}
      <section className="border-b border-[var(--ink-faint)] bg-[var(--paper-raised)] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-start justify-between gap-8 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <p className="label-caps text-[var(--ink-soft)] mb-3">Your Personal Space</p>
                <h1 className="font-display text-4xl md:text-5xl mb-4 text-[var(--ink)]">
                  Dashboard
                </h1>
                <p className="text-base md:text-lg text-[var(--ink-soft)] leading-relaxed max-w-2xl">
                  Your central hub for career exploration. Access all your assessments, recommendations, 
                  pathways, and profile in one place.
                </p>
              </div>

              {/* Animated Stick Figure */}
              <motion.div
                className="shrink-0"
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 2, 0, -2, 0]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <StickFigure pose="celebrating" size={120} />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Dashboard Cards */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.path}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                onMouseEnter={() => setHoveredCard(card.path)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <Link
                  to={card.path}
                  className="group block h-full"
                >
                  <div 
                    className="relative h-full bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8 transition-all duration-300 hover:shadow-[8px_8px_0_var(--ink)] hover:-translate-y-1"
                  >
                    {/* Top stripe accent */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
                      style={{ 
                        backgroundColor: hoveredCard === card.path ? card.accentColor : 'transparent'
                      }}
                    />

                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div 
                        className="transition-transform duration-300 group-hover:scale-110"
                        style={{ color: card.accentColor }}
                      >
                        {card.icon}
                      </div>
                      
                      <motion.div
                        animate={{ 
                          scale: hoveredCard === card.path ? 1 : 0.95,
                          opacity: hoveredCard === card.path ? 1 : 0.7
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <StickFigure pose={card.pose} size={56} />
                      </motion.div>
                    </div>

                    <h3 className="font-display text-2xl mb-3 text-[var(--ink)] group-hover:text-[var(--ink)]">
                      {card.title}
                    </h3>
                    
                    <p className="text-sm leading-relaxed text-[var(--ink-soft)] mb-6">
                      {card.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--ink-faint)]">
                      {card.stats ? (
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-3xl" style={{ color: card.accentColor }}>
                            {card.stats.value}
                          </span>
                          <span className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                            {card.stats.label}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                          Get Started
                        </span>
                      )}

                      <ArrowRight 
                        size={20} 
                        className="text-[var(--ink-soft)] transition-transform duration-300 group-hover:translate-x-2"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Progress Section */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8 shadow-[4px_4px_0_var(--ink)]"
          >
            {/* Progress Header */}
            <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <h2 className="font-display text-2xl md:text-3xl mb-2 text-[var(--ink)]">
                  Your Journey
                </h2>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
                  Track your progress as you build your complete career profile
                </p>
              </div>
              
              <div className="text-right shrink-0">
                <div className="font-display text-5xl md:text-6xl leading-none text-[var(--ink)]">
                  {progressPercentage}%
                </div>
                <div className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)] mt-1.5">
                  Complete
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8 h-3 bg-[var(--paper)] border border-[var(--ink-faint)] overflow-hidden">
              <motion.div
                className="h-full bg-[var(--accent-news)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Progress Checklist */}
            <div className="space-y-2 mb-8">
              {progressItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Link
                    to={item.path}
                    className="flex items-center gap-3 p-4 border border-[var(--ink-faint)] hover:border-[var(--ink)] hover:bg-[var(--paper)] transition-all group"
                  >
                    {item.done ? (
                      <CheckCircle2 size={20} className="text-[var(--accent-news)] shrink-0" strokeWidth={2} />
                    ) : (
                      <Circle size={20} className="text-[var(--ink-faint)] group-hover:text-[var(--ink)] shrink-0" strokeWidth={1.5} />
                    )}
                    <span className={`flex-1 text-sm ${item.done ? 'text-[var(--ink)] font-medium' : 'text-[var(--ink-soft)]'}`}>
                      {item.label}
                    </span>
                    {!item.done && (
                      <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        Complete →
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Next Step Suggestion */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="pt-8 border-t-2 border-[var(--ink-faint)]"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 p-3 bg-[var(--accent-soft)] border border-[var(--accent-news)]">
                  <Sparkles size={24} className="text-[var(--accent-news)]" />
                </div>
                <div className="flex-1">
                  <div className="font-mono-ui text-xs uppercase tracking-wider text-[var(--accent-news)] mb-2">
                    Next Step
                  </div>
                  <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
                    {nextStep.text.split(nextStep.label)[0]}
                    <Link 
                      to={nextStep.path} 
                      className="font-semibold text-[var(--ink)] underline decoration-2 decoration-[var(--accent-news)] underline-offset-2 hover:decoration-[var(--ink)] transition-colors"
                    >
                      {nextStep.label}
                    </Link>
                    {nextStep.text.split(nextStep.label)[1]}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6 text-center"
            >
              <Target size={32} className="mx-auto mb-3 text-[var(--accent-news)]" strokeWidth={1.5} />
              <div className="font-display text-3xl mb-1 text-[var(--ink)]">
                {recommendations?.recommendations.length ?? 0}
              </div>
              <div className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                Career Matches
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6 text-center"
            >
              <TrendingUp size={32} className="mx-auto mb-3 text-[var(--accent-news)]" strokeWidth={1.5} />
              <div className="font-display text-3xl mb-1 text-[var(--ink)]">
                {passport?.skills.length ?? 0}
              </div>
              <div className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                Skills Tracked
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6 text-center"
            >
              <Zap size={32} className="mx-auto mb-3 text-[var(--accent-news)]" strokeWidth={1.5} />
              <div className="font-display text-3xl mb-1 text-[var(--ink)]">
                {pathways.length}
              </div>
              <div className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                Active Pathways
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
