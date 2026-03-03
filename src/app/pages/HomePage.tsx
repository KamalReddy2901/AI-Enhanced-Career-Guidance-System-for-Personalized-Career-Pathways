import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Key, Sparkles, FlaskConical, Scale, Trash2, ChevronDown, FileText, Brain, Swords, Zap, BarChart2, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';
import { ScrollingTitles } from '../components/ScrollingTitles';
import { MagnifierSearch } from '../components/MagnifierSearch';
import { StickFigure } from '../components/StickFigure';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function HomePage() {
  const navigate = useNavigate();
  const { searchJob, searchJobAI, setCurrentJob, addToHistory, isSearchAnimating, setIsSearchAnimating, setRefinementCount, isAIEnabled, refreshAIStatus, clearAICache } = useApp();
  const { user, isSupabaseConfigured } = useAuth();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // When Supabase is configured, show landing to logged-out users; otherwise show search
  const showLanding = isSupabaseConfigured && !user;

  const handleSearchComplete = useCallback(async (jobTitle: string) => {
    if (isAIEnabled) {
      try {
        const jobData = await searchJobAI(jobTitle);
        setCurrentJob(jobData);
        addToHistory(jobData);
        setRefinementCount(0);
        toast.success(`Dossier ready for "${jobTitle}"`);
        navigate('/job');
      } catch {
        const jobData = searchJob(jobTitle);
        setCurrentJob(jobData);
        addToHistory(jobData);
        setRefinementCount(0);
        navigate('/job');
      }
    } else {
      const jobData = searchJob(jobTitle);
      setCurrentJob(jobData);
      addToHistory(jobData);
      setRefinementCount(0);
      setTimeout(() => navigate('/job'), 200);
    }
  }, [searchJob, searchJobAI, setCurrentJob, addToHistory, navigate, setRefinementCount, isAIEnabled]);

  return (
    <div className="relative bg-background">
      {/* ── HERO SECTION ───────────────────────────────────── */}
      <div className="min-h-screen relative overflow-hidden">
      <ScrollingTitles paused={isSearchAnimating} dimmed={isSearchAnimating} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <StickFigure pose="searching" size={64} />
          </div>

          <h1
            className="font-[Playfair_Display] text-black tracking-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            What do you want to be?
          </h1>

          <motion.div
            className="flex items-center gap-3 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="h-px w-12 bg-black/20" />
            <p
              className="font-[Inter] text-black/40 tracking-widest uppercase"
              style={{ fontSize: '0.7rem' }}
            >
              Experience any career before you commit
            </p>
            <div className="h-px w-12 bg-black/20" />
          </motion.div>
        </motion.div>

        {/* Search */}
        {showLanding ? (
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.button
              onClick={() => navigate('/auth?mode=signup')}
              className="flex items-center gap-3 bg-black text-white py-4 px-10 font-[Inter] hover:bg-black/85 transition-colors"
              style={{ fontSize: '1rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started for Free
              <ArrowRight size={18} />
            </motion.button>
            <button
              onClick={() => navigate('/auth?mode=signin')}
              className="font-[Inter] text-black/35 hover:text-black/60 transition-colors underline underline-offset-2"
              style={{ fontSize: '0.82rem' }}
            >
              Already have an account? Sign in
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="w-full max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MagnifierSearch
              onSearchComplete={handleSearchComplete}
              isAnimating={isSearchAnimating}
              setIsAnimating={setIsSearchAnimating}
            />
          </motion.div>
        )}

        {/* AI Status + Quick Actions (only shown when logged in or no auth) */}
        {!showLanding && (
          <motion.div
            className="mt-6 flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {isAIEnabled ? (
              <>
                <div className="flex items-center gap-2 font-[Inter] text-black/35" style={{ fontSize: '0.72rem' }}>
                  <Sparkles size={12} className="text-black/40" />
                  <span>AI-powered by Groq &middot; Llama 3.3 70B</span>
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className="underline underline-offset-2 hover:text-black/60 transition-colors"
                  >
                    change key
                  </button>
                  <span className="text-black/15">&middot;</span>
                  <button
                    onClick={clearAICache}
                    className="underline underline-offset-2 hover:text-black/60 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={9} />
                    clear cache
                  </button>
                </div>

                {/* Quick action buttons */}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => navigate('/quiz')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <FlaskConical size={12} />
                    Career Match Quiz
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/compare')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <Scale size={12} />
                    Compare Careers
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/mood')}
                    className="flex items-center gap-1.5 font-[Inter] text-black/40 hover:text-black/70 border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all"
                    style={{ fontSize: '0.72rem' }}
                    whileHover={{ y: -1 }}
                  >
                    <Brain size={12} />
                    Mood Match
                  </motion.button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="flex items-center gap-2 font-[Inter] text-black/40 hover:text-black/60 transition-colors border border-black/10 px-4 py-2 hover:border-black/25"
                style={{ fontSize: '0.75rem' }}
              >
                <Key size={13} />
                Add free Groq API key for AI-powered results
              </button>
            )}
          </motion.div>
        )}

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1.2 }}
        >
          <span className="font-[Inter] uppercase tracking-[0.2em] text-black/60" style={{ fontSize: '0.6rem' }}>
            Scroll to know more
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown size={16} className="text-black/50" />
          </motion.div>
        </motion.div>
      </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-black/8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-3" style={{ fontSize: '0.65rem' }}>
              The Process
            </p>
            <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
              How Career Sim Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black/10">
            {[
              {
                step: '01',
                pose: 'searching' as const,
                title: 'Search Any Career',
                body: 'Type any job title - from Software Engineer to Forensic Pathologist. Career Sim knows 250+ professions in depth.',
              },
              {
                step: '02',
                pose: 'reading' as const,
                title: 'Get Your Dossier',
                body: 'AI generates a detailed career file: salary ranges, daily routine, education path, skills, and a week-in-the-life overview.',
              },
              {
                step: '03',
                pose: 'working' as const,
                title: 'Live the Day',
                body: 'Step into the role through interactive simulations, interview prep drills, and a quiz that matches careers to your personality.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className={`p-8 border-black/10 ${i < 2 ? 'md:border-r' : ''} ${i > 0 ? 'border-t md:border-t-0' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-[JetBrains_Mono] text-black/15" style={{ fontSize: '2rem' }}>{item.step}</span>
                  <StickFigure pose={item.pose} size={48} />
                </div>
                <h3 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.2rem' }}>
                  {item.title}
                </h3>
                <p className="font-[Inter] text-black/50 leading-relaxed" style={{ fontSize: '0.88rem' }}>
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ───────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-black/8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-3" style={{ fontSize: '0.65rem' }}>
              Features
            </p>
            <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
              Everything in One Dossier
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-black/8 border border-black/8">
            {[
              {
                icon: <FileText size={20} />,
                title: 'Full AI Dossier',
                body: 'Salary ranges, education path, daily routine, work culture - real data powered by Llama 3.3.',
              },
              {
                icon: <Swords size={20} />,
                title: 'Day Simulation',
                body: 'Make decisions a professional makes from 8am to 8pm. See how you think under pressure.',
              },
              {
                icon: <MessageSquare size={20} />,
                title: 'Interview Prep',
                body: 'Practice tough interview questions with AI feedback calibrated to the specific role.',
              },
              {
                icon: <Brain size={20} />,
                title: 'Career Quiz',
                body: 'Answer 7 questions about your values, pace, and interests. Get matched to careers that fit.',
              },
              {
                icon: <BarChart2 size={20} />,
                title: 'Side-by-Side Compare',
                body: 'Stack any two careers against each other - salary, skills, lifestyle, and growth potential.',
              },
              {
                icon: <Zap size={20} />,
                title: 'Mood Match',
                body: 'Describe how you feel right now. We find careers that vibe with your current energy.',
              },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                className="p-8 bg-background hover:bg-black/2 transition-colors"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <div className="text-black/30 mb-4">{feat.icon}</div>
                <h3 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.05rem' }}>
                  {feat.title}
                </h3>
                <p className="font-[Inter] text-black/50 leading-relaxed" style={{ fontSize: '0.84rem' }}>
                  {feat.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-black/8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="flex flex-col sm:flex-row items-start gap-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="shrink-0">
              <StickFigure pose="waving" size={80} />
            </div>
            <div className="flex-1 border-l-2 border-black/10 pl-10">
              <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-4" style={{ fontSize: '0.65rem' }}>
                Why I Built This
              </p>
              <h2 className="font-[Playfair_Display] text-black mb-6" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                From Kamal Reddy
              </h2>
              <div className="space-y-4 font-[Inter] text-black/65 leading-relaxed" style={{ fontSize: '0.95rem' }}>
                <p>
                  I am Kamal Reddy. I always wondered what it'd be like to live as different careers out there - a forensic analyst, a marine biologist, an investment banker. Not in a "I want to be that" way, but in a "what does Tuesday actually look like for them?" way.
                </p>
                <p>
                  There's no good answer to that question online. Job descriptions are sanitized. Salary sites are noisy. Reddit threads are biased. I wanted something that just let you <em>feel it</em> - even for five minutes.
                </p>
                <p>
                  So I built Career Sim. It's the tool I wish existed when I was figuring things out. Pick a career, read the dossier, live a day, answer an interview question. Then do it again for a completely different career. Compare them. Decide.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-black/10" />
                <span className="font-[JetBrains_Mono] text-black/30" style={{ fontSize: '0.72rem' }}>- Kamal Reddy</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MORE FROM DEVELOPER ────────────────────────────── */}
      <section className="py-20 px-6 border-t border-black/8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="shrink-0">
              <StickFigure pose="coding" size={72} />
            </div>
            <div className="flex-1 sm:border-l-2 sm:border-black/8 sm:pl-8 text-center sm:text-left">
              <p className="font-[Inter] uppercase tracking-[0.2em] text-black/30 mb-2" style={{ fontSize: '0.63rem' }}>
                More from the developer
              </p>
              <h2 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.5rem' }}>
                See what else I've built
              </h2>
              <p className="font-[Inter] text-black/50 leading-relaxed mb-5" style={{ fontSize: '0.9rem' }}>
                More projects, experiments, and ideas from Kamal Reddy. Design-led, minimal, useful.
              </p>
              <motion.a
                href="https://kamrede.page/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-black text-black py-2.5 px-6 font-[Inter] hover:bg-black hover:text-white transition-all"
                style={{ fontSize: '0.85rem' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Visit kamrede.page
                <ExternalLink size={14} />
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-black/8 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StickFigure pose="standing" size={28} animate={false} />
            <span className="font-[Playfair_Display] text-black/60" style={{ fontSize: '0.92rem' }}>Career Sim</span>
          </div>
          <p className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
            Built by Kamal Reddy &middot; v1.0.0 &middot; Powered by Groq
          </p>
          <div className="flex items-center gap-4 font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
            <button onClick={() => navigate('/settings')} className="hover:text-black/50 transition-colors">Settings</button>
            <button onClick={() => navigate('/history')} className="hover:text-black/50 transition-colors">History</button>
          </div>
        </div>
      </footer>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onKeySet={refreshAIStatus}
      />
    </div>
  );
}
