import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ArrowRight, ArrowLeft, Sparkles, Search, Play,
  Star, Scale, MessageSquare, Map,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TOUR_KEY = 'careersim_onboarded_v2';

interface TourStep {
  tag: string;
  icon: React.ReactNode;
  headline: string;
  body: string;
  preview: React.ReactNode;
}

/* ─────────────────────────── inline mini-mockups ─────────────────────── */

const DossierPreview = () => (
  <div className="w-full space-y-1.5">
    {[
      { label: 'Salary', w: 'w-3/4' },
      { label: 'Education', w: 'w-1/2' },
      { label: 'Skills', w: 'w-2/3' },
      { label: 'Culture', w: 'w-5/6' },
    ].map(r => (
      <div key={r.label} className="flex items-center gap-2">
        <span className="font-[JetBrains_Mono] text-black/25 shrink-0" style={{ fontSize: '0.55rem', width: 44 }}>{r.label}</span>
        <div className={`h-1.5 bg-black/12 ${r.w} rounded-full`} />
      </div>
    ))}
  </div>
);

const SimPreview = () => (
  <div className="w-full space-y-2">
    {['8:00 am — Stand-up meeting', '10:30 am — Code review', '2:00 pm — Client call'].map((t, i) => (
      <div key={i} className="flex items-center gap-2 text-black/40" style={{ fontSize: '0.62rem', fontFamily: 'Inter, sans-serif' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
        {t}
      </div>
    ))}
    <div className="mt-1 border border-black/10 p-2">
      <p className="font-[Inter] text-black/30" style={{ fontSize: '0.58rem' }}>→ A client asks for a tight deadline. You:</p>
      <div className="mt-1 space-y-0.5">
        {['Push back', 'Negotiate', 'Accept'].map(o => (
          <div key={o} className="bg-black/5 px-2 py-0.5 font-[Inter] text-black/35" style={{ fontSize: '0.55rem' }}>{o}</div>
        ))}
      </div>
    </div>
  </div>
);

const ComparePreview = () => (
  <div className="w-full">
    <div className="grid grid-cols-2 gap-1 mb-1.5">
      <div className="bg-black/6 p-1.5 text-center font-[Playfair_Display] text-black/50" style={{ fontSize: '0.62rem' }}>Designer</div>
      <div className="bg-black/6 p-1.5 text-center font-[Playfair_Display] text-black/50" style={{ fontSize: '0.62rem' }}>Developer</div>
    </div>
    {[['$82k', '$118k'], ['Creative', 'Logical'], ['WLB ●●●○', 'WLB ●●○○']].map((row, i) => (
      <div key={i} className="grid grid-cols-2 gap-1 mb-0.5">
        {row.map(c => (
          <div key={c} className="font-[Inter] text-black/30 text-center" style={{ fontSize: '0.55rem' }}>{c}</div>
        ))}
      </div>
    ))}
  </div>
);

const QuizPreview = () => (
  <div className="w-full">
    <p className="font-[Inter] text-black/40 mb-2" style={{ fontSize: '0.62rem' }}>Do you prefer working alone or with people?</p>
    <div className="space-y-1">
      {['Mostly alone', 'Mix of both', 'With people always'].map((o, i) => (
        <div key={o} className={`flex items-center gap-2 px-2 py-1 border font-[Inter] text-black/35 ${i === 1 ? 'border-black/30 bg-black/5' : 'border-black/10'}`} style={{ fontSize: '0.58rem' }}>
          <div className={`w-2 h-2 rounded-full border shrink-0 ${i === 1 ? 'bg-black/40 border-black/40' : 'border-black/20'}`} />
          {o}
        </div>
      ))}
    </div>
  </div>
);

const MoodPreview = () => (
  <div className="w-full">
    <div className="border border-black/10 p-2 mb-2">
      <p className="font-[Inter] italic text-black/30" style={{ fontSize: '0.6rem' }}>
        "I feel restless and want to build something new…"
      </p>
    </div>
    <div className="flex flex-wrap gap-1">
      {['Product Manager', 'Entrepreneur', 'UX Designer', 'Architect'].map(c => (
        <span key={c} className="bg-black/8 font-[Inter] text-black/40 px-1.5 py-0.5" style={{ fontSize: '0.52rem' }}>{c}</span>
      ))}
    </div>
  </div>
);

const InterviewPreview = () => (
  <div className="w-full space-y-1.5">
    <div className="border-l-2 border-black/20 pl-2">
      <p className="font-[Inter] text-black/35" style={{ fontSize: '0.58rem' }}>Tell me about a time you handled failure.</p>
    </div>
    <div className="bg-black/5 p-2">
      <p className="font-[Inter] text-black/45 italic" style={{ fontSize: '0.55rem' }}>
        "In my last role, our product launch was delayed. I…"
      </p>
    </div>
    <div className="flex items-center gap-1">
      <div className="h-1 flex-1 bg-emerald-200 rounded-full" />
      <span className="font-[JetBrains_Mono] text-emerald-600" style={{ fontSize: '0.52rem' }}>Strong answer</span>
    </div>
  </div>
);

const TransitionPreview = () => (
  <div className="w-full">
    <div className="flex items-center gap-1 mb-2 font-[Inter] text-black/35" style={{ fontSize: '0.58rem' }}>
      <span>Nurse</span>
      <ArrowRight size={8} className="text-black/20" />
      <span>UX Researcher</span>
    </div>
    <div className="space-y-1">
      {['Month 1-2: Take UX course', 'Month 3-4: Build portfolio', 'Month 5: Apply'].map((s, i) => (
        <div key={i} className="flex items-center gap-1.5 font-[Inter] text-black/30" style={{ fontSize: '0.55rem' }}>
          <div className="w-1.5 h-1.5 border border-black/20 rounded-full shrink-0" />
          {s}
        </div>
      ))}
    </div>
  </div>
);

const RoadmapPreview = () => (
  <div className="w-full">
    <div className="flex flex-col items-start gap-1 pl-3 border-l-2 border-black/15">
      {['Foundation', 'Core skills', 'Specialisation', 'Senior role'].map((s, i) => (
        <div key={s} className="flex items-center gap-1.5 font-[Inter] text-black/30" style={{ fontSize: '0.55rem' }}>
          <div className={`w-2 h-2 border rounded-full shrink-0 ${i === 0 ? 'bg-black/40 border-black/40' : 'border-black/20'}`} />
          {s}
        </div>
      ))}
    </div>
  </div>
);

const HistoryPreview = () => (
  <div className="w-full space-y-1">
    {[
      { title: 'UX Designer', dot: 'bg-violet-300' },
      { title: 'Data Scientist', dot: 'bg-violet-400' },
      { title: 'Nurse Practitioner', dot: 'bg-emerald-300' },
    ].map(item => (
      <div key={item.title} className="flex items-center gap-2 p-1.5 border border-black/8">
        <div className={`w-1.5 h-1.5 rounded-full ${item.dot} shrink-0`} />
        <span className="font-[Playfair_Display] text-black/50 flex-1" style={{ fontSize: '0.6rem' }}>{item.title}</span>
        <Star size={8} className="text-black/20" />
      </div>
    ))}
  </div>
);

/* ─────────────────────────── step definitions ─────────────────────────── */

const STEPS: TourStep[] = [
  {
    tag: 'WELCOME',
    icon: <Sparkles size={22} />,
    headline: 'Your career workspace, in one place.',
    body: 'CareerCase keeps your Passport, assessments, recommendations and pathways connected to your signed-in account. This short tour shows where each part lives.',
    preview: (
      <div className="flex items-center justify-center w-full py-2">
        <div className="text-center">
          <Sparkles size={28} className="text-black/15 mx-auto mb-2" />
          <p className="font-[Playfair_Display] text-black/30" style={{ fontSize: '0.9rem' }}>CareerCase</p>
          <p className="font-[Inter] text-black/20 mt-1" style={{ fontSize: '0.6rem' }}>Assess · Match · Pathway · Grow</p>
        </div>
      </div>
    ),
  },
  {
    tag: 'PERSONAL',
    icon: <Map size={22} />,
    headline: 'Start in Personal.',
    body: 'Build your Career Passport, complete interests, aptitude and values assessments, then review your personalised Career Landscape and practical pathways.',
    preview: <RoadmapPreview />,
  },
  {
    tag: 'SEARCH',
    icon: <Search size={22} />,
    headline: 'Explore any career you are curious about.',
    body: 'Use Explore to search a role by title. You can open a preliminary profile, refine it, and then build a full career dossier.',
    preview: (
      <div className="w-full">
        <div className="flex items-center gap-2 border border-black/15 px-3 py-2 mb-3">
          <Search size={11} className="text-black/25 shrink-0" />
          <span className="font-[Inter] text-black/30 italic" style={{ fontSize: '0.62rem' }}>what jobs involve travel?</span>
          <div className="ml-auto w-1.5 h-3 bg-black/20 animate-pulse" />
        </div>
        <div className="space-y-1">
          {['Flight Attendant', 'Photojournalist', 'Travel Nurse'].map(s => (
            <div key={s} className="font-[Inter] text-black/30 px-1" style={{ fontSize: '0.6rem' }}>→ {s}</div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: 'DOSSIER & SIMULATION',
    icon: <Play size={22} />,
    headline: 'Read the role, then try a day in it.',
    body: 'Dossiers organise a role’s responsibilities, skills, routes and trade-offs. The day simulation lets you respond to realistic decisions, then use “Does it fit me?” for a Passport-aware AI reflection.',
    preview: <SimPreview />,
  },
  {
    tag: 'EXPLORE TOOLS',
    icon: <Scale size={22} />,
    headline: 'Use the right tool for the question.',
    body: 'Explore also includes Compare, Mood Match, Career Quiz, Career Transition Planner and Roadmap Builder. If you have current work experience, Roadmap Builder can start from that role.',
    preview: <ComparePreview />,
  },
  {
    tag: 'COUNSELOR & ARCHIVE',
    icon: <MessageSquare size={22} />,
    headline: 'Ask, revisit, and keep moving.',
    body: 'Counselor answers questions using your saved Passport and active pathways. Archive keeps your explored careers and favourites available when you return.',
    preview: <HistoryPreview />,
  },
];

/* ─────────────────────────── component ─────────────────────────────────── */

export function OnboardingTour() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return; // Only show tour to logged-in users
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
    // Re-trigger when Settings resets the tour key
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOUR_KEY && e.newValue === null) {
        setStep(0);
        setTimeout(() => setVisible(true), 300);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            className="fixed inset-4 z-50 flex items-center justify-center sm:inset-0"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="flex h-[min(680px,calc(100vh-2rem))] w-full max-w-[600px] flex-col overflow-hidden border border-black/20 bg-[#f9f8f7] shadow-2xl">

              {/* Progress bar */}
              <div className="h-0.5 bg-black/8">
                <motion.div
                  className="h-full bg-black"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-1 py-2.5 px-6 border-b border-black/8">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-[color,background-color,border-color,opacity,transform,box-shadow] ${
                      i === step ? 'w-4 h-1.5 bg-black' : 'w-1.5 h-1.5 bg-black/15 hover:bg-black/30'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-6">

                {/* Preview panel */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`preview-${step}`}
                    className="mb-5 flex h-[132px] shrink-0 items-start border border-black/8 bg-white/60 p-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {current.preview}
                  </motion.div>
                </AnimatePresence>

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="text-black/30">{current.icon}</div>
                    <span
                      className="font-[JetBrains_Mono] text-black/25 uppercase"
                      style={{ fontSize: '0.58rem', letterSpacing: '0.1em' }}
                    >
                      {current.tag} · {step + 1}/{STEPS.length}
                    </span>
                  </div>
                  <button
                    onClick={dismiss}
                    className="text-black/20 hover:text-black/50 transition-colors"
                    aria-label="Close tour"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Text content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`text-${step}`}
                    className="min-h-[145px]"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <h3
                      className="font-[Playfair_Display] text-black mb-2 leading-snug"
                      style={{ fontSize: '1.1rem' }}
                    >
                      {current.headline}
                    </h3>
                    <p
                      className="font-[Inter] text-black/50 leading-relaxed"
                      style={{ fontSize: '0.845rem' }}
                    >
                      {current.body}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Actions */}
                <div className="mt-auto flex items-center justify-between border-t border-black/8 pt-5">
                  <div className="flex items-center gap-3">
                    {step > 0 ? (
                      <button
                        onClick={prev}
                        className="flex items-center gap-1 font-[Inter] text-black/30 hover:text-black/60 transition-colors"
                        style={{ fontSize: '0.78rem' }}
                      >
                        <ArrowLeft size={13} />
                        Back
                      </button>
                    ) : (
                      <button
                        onClick={dismiss}
                        className="font-[Inter] text-black/25 hover:text-black/50 transition-colors"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Skip tour
                      </button>
                    )}
                  </div>
                  <motion.button
                    onClick={next}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 font-[Inter]"
                    style={{ fontSize: '0.82rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {step < STEPS.length - 1 ? (
                      <>Next <ArrowRight size={14} /></>
                    ) : (
                      <>Let's explore! <ArrowRight size={14} /></>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
