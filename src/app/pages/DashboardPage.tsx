import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, useAnimate } from 'motion/react';
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
  Sparkles,
  Award,
  Clock,
  BarChart3,
  Brain,
  Flame,
  Star
} from 'lucide-react';
import { useGuidance } from '../context/GuidanceContext';
import { StickFigure } from '../components/StickFigure';
import type { StickFigurePose } from '../components/StickFigure';
import { getPassportCompletenessBreakdown } from '../engine/skillProfile';
import { FixedRibbon } from '../components/FixedRibbon';

const MOMENTUM_ICONS: Record<string, React.ReactNode> = {
  skill_confidence_improved: <TrendingUp size={16} className="text-[var(--accent-news)]" strokeWidth={2} aria-hidden="true" />,
  assessment_completed: <Award size={16} className="text-[var(--accent-news)]" strokeWidth={2} aria-hidden="true" />,
  pathway_step_completed: <CheckCircle2 size={16} className="text-[var(--accent-news)]" strokeWidth={2} aria-hidden="true" />,
  evidence_added: <Star size={16} className="text-[var(--accent-news)]" strokeWidth={2} aria-hidden="true" />,
};

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
  const { passport, recommendations, pathways, getMomentumSummary } = useGuidance();
  const momentumSummary = getMomentumSummary();
  const recentMomentumEvents = momentumSummary.recentEvents.slice(-3).reverse();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const completenessSections = passport ? getPassportCompletenessBreakdown(passport) : [];
  const completedAssessments = completenessSections.filter(section => ['interests', 'aptitude', 'values', 'aspiration'].includes(section.id) && section.complete).length;

  const cards: DashboardCard[] = [
    {
      title: 'Assessment Desk',
      description: 'Explore your interests, aptitudes, values, and aspirations through structured screeners',
      icon: <ClipboardCheck size={28} strokeWidth={1.5} />,
      path: '/assess',
      pose: 'reading',
      accentColor: 'var(--accent-news)',
      stats: passport ? { 
        label: 'Completed', 
        value: `${completedAssessments}/4`
      } : undefined,
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
  ];

  const sectionLabels = {
    basics: 'Background and constraints',
    skills: 'Skills evidence',
    interests: 'Interests assessment',
    aptitude: 'Aptitude assessment',
    values: 'Work values assessment',
    aspiration: 'Career aspiration',
  } as const;
  const progressItems = passport
    ? completenessSections.map((item) => ({
        label: sectionLabels[item.id],
        done: item.complete,
        path: item.path,
        detail: `${item.score}/${item.maximum} points`,
      }))
    : [{
        label: 'Create your Career Passport',
        done: false,
        path: '/onboarding',
        detail: 'Required before assessments',
      }];
  const progressPercentage = passport?.completeness ?? 0;

  const getNextStep = () => {
    if (!passport) return { text: 'Create your Career Passport so CareerCase can guide your next steps', path: '/onboarding', label: 'Career Passport' };
    const nextSection = completenessSections.find((item) => !item.complete);
    if (nextSection) return {
      text: `Complete ${sectionLabels[nextSection.id].toLowerCase()} to improve your passport readiness`,
      path: nextSection.path,
      label: sectionLabels[nextSection.id].toLowerCase(),
    };
    if (pathways.length === 0) {
      return { text: 'View your career recommendations and build your first pathway', path: '/recommendations', label: 'career recommendations' };
    }
    return { text: 'Your profile is complete! Continue exploring careers or talk to the AI counselor', path: '/counselor', label: 'AI counselor' };
  };

  const nextStep = getNextStep();

  // Animated counter for stats
  const [counters, setCounters] = useState({ careers: 0, skills: 0, pathways: 0, progress: 0 });
  
  useEffect(() => {
    const targetCareers = recommendations?.recommendations.length ?? 0;
    const targetSkills = passport?.skills.length ?? 0;
    const targetPathways = pathways.length;
    const targetProgress = progressPercentage;
    
    const duration = 1000;
    const steps = 30;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCounters({
        careers: Math.round(targetCareers * progress),
        skills: Math.round(targetSkills * progress),
        pathways: Math.round(targetPathways * progress),
        progress: Math.round(targetProgress * progress),
      });
      
      if (step >= steps) clearInterval(timer);
    }, interval);
    
    return () => clearInterval(timer);
  }, [recommendations, passport, pathways, progressPercentage]);

  return (
    <div className="min-h-screen bg-[var(--paper)] pb-16">
      {/* Animated Red Ribbon - similar to homepage */}
      <FixedRibbon
        messages={[
          'YOUR CAREER COMMAND CENTER',
          `${progressPercentage}% PASSPORT READY`,
          passport ? `${passport.skills.length} SKILLS TRACKED` : 'BUILD YOUR PROFILE',
          recommendations ? `${recommendations.recommendations.length} CAREER MATCHES` : 'GET PERSONALIZED MATCHES',
          pathways.length > 0 ? `${pathways.length} ACTIVE ${pathways.length === 1 ? 'PATHWAY' : 'PATHWAYS'}` : 'EXPLORE PATHWAYS',
        ]}
      />
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
                  Passport readiness uses the same profile score everywhere in CareerCase
                </p>
              </div>
              
              <div className="text-right shrink-0">
                <div className="font-display text-5xl md:text-6xl leading-none text-[var(--ink)]">
                  {progressPercentage}%
                </div>
                <div className="font-mono-ui text-xs uppercase tracking-wider text-[var(--ink-soft)] mt-1.5">
                  Passport ready
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
                    <span className="hidden font-mono-ui text-[10px] uppercase tracking-wider text-[var(--ink-soft)] sm:inline">
                      {item.detail}
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

          {/* Your profile improved — recent momentum */}
          {recentMomentumEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="card-sketch mt-6 border-l-4 border-l-[var(--accent-news)] bg-[var(--paper-raised)] p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp size={22} className="text-[var(--accent-news)]" strokeWidth={2} aria-hidden="true" />
                <h3 className="font-display text-xl text-[var(--ink)]">Your profile improved</h3>
              </div>
              <ul className="space-y-2">
                {recentMomentumEvents.map((event, index) => (
                  <li key={`${event.timestamp}-${index}`} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                    <span className="mt-0.5 shrink-0">{MOMENTUM_ICONS[event.type] ?? <Star size={16} className="text-[var(--accent-news)]" strokeWidth={2} aria-hidden="true" />}</span>
                    <span>{event.description}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono-ui text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                Based on your last 30 days of profile activity · counted toward recommendation feasibility scoring
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Quick Stats - Enhanced with animated counters */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="group relative bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8 text-center overflow-hidden transition-all hover:shadow-[6px_6px_0_var(--ink)]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#dc2626] transition-all group-hover:h-2" />
              <Target size={36} className="mx-auto mb-4 text-[#dc2626] transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <div className="font-display text-5xl mb-2 text-[var(--ink)] tabular-nums">
                {counters.careers}
              </div>
              <div className="font-mono-ui text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
                Career Matches
              </div>
              <motion.div 
                className="absolute -bottom-2 -right-2 opacity-5"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Target size={80} strokeWidth={1} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="group relative bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8 text-center overflow-hidden transition-all hover:shadow-[6px_6px_0_var(--ink)]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-news)] transition-all group-hover:h-2" />
              <Brain size={36} className="mx-auto mb-4 text-[var(--accent-news)] transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <div className="font-display text-5xl mb-2 text-[var(--ink)] tabular-nums">
                {counters.skills}
              </div>
              <div className="font-mono-ui text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
                Skills Tracked
              </div>
              <motion.div 
                className="absolute -bottom-2 -right-2 opacity-5"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              >
                <Brain size={80} strokeWidth={1} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="group relative bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8 text-center overflow-hidden transition-all hover:shadow-[6px_6px_0_var(--ink)]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#dc2626] transition-all group-hover:h-2" />
              <Flame size={36} className="mx-auto mb-4 text-[#dc2626] transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <div className="font-display text-5xl mb-2 text-[var(--ink)] tabular-nums">
                {counters.pathways}
              </div>
              <div className="font-mono-ui text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
                Active Pathways
              </div>
              <motion.div 
                className="absolute -bottom-2 -right-2 opacity-5"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flame size={80} strokeWidth={1} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
