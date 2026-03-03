import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, ArrowRight, RotateCcw, CheckCircle2, XCircle, Sparkles, Loader2, Download, TrendingUp } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { generateSimulation, type SimulationScenario } from '../data/simulations';
import { generateSimulationAI, generateSimulationSummary, hasApiKey } from '../services/ai';
import { downloadAssessmentPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';
import { hapticLight, hapticWarn, hapticSuccess } from '../utils/haptic';

// Black confetti particles that fall on simulation completion
function BlackConfetti({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 38 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 4 + Math.random() * 7,
    delay: Math.random() * 1.5,
    duration: 2.2 + Math.random() * 1.8,
    rotate: Math.random() * 720 - 360,
    isRect: Math.random() > 0.5,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute bg-black"
          style={{
            left: `${p.x}%`,
            top: -20,
            width: p.isRect ? p.size : p.size,
            height: p.isRect ? p.size * 0.4 : p.size,
            borderRadius: p.isRect ? 1 : '50%',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0.8, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

type StickFigurePose = 'waking' | 'walking' | 'sitting' | 'presenting' | 'thinking' | 'working' | 'talking' | 'eating' | 'celebrating' | 'tired' | 'running' | 'reading';

export function SimulationPage() {
  const navigate = useNavigate();
  const { currentJob, isAIEnabled } = useApp();
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completedScenarios, setCompletedScenarios] = useState<{ index: number; wasCorrect: boolean }[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const simResultKey = (title: string) => `sim_result_${title.toLowerCase().replace(/\s+/g, '_')}`;

  useEffect(() => {
    if (!currentJob) { navigate('/'); return; }
    // Check for saved result — if found, restore and skip straight to completion screen
    const saved = (() => { try { return JSON.parse(localStorage.getItem(simResultKey(currentJob.title)) || 'null'); } catch { return null; } })();
    if (saved && saved.scenarios && saved.aiSummary) {
      setScenarios(saved.scenarios);
      setCompletedScenarios(saved.completedScenarios);
      setAiSummary(saved.aiSummary);
      setIsComplete(true);
    } else {
      loadScenarios(false);
    }
  }, [currentJob, navigate]);

  // Fire completion sounds
  useEffect(() => {
    if (isComplete) {
      sounds.complete();
      setTimeout(() => sounds.confetti(), 400);
    }
  }, [isComplete]);

  const loadScenarios = async (skipCache: boolean) => {
    if (!currentJob) return;

    if (hasApiKey()) {
      setIsLoadingScenarios(true);
      const messages = [
        'Researching the daily life of a ' + currentJob.title + '...',
        'Crafting realistic scenarios...',
        'Building your choose-your-own-adventure...',
        'Adding professional insights...',
        'Almost ready...',
      ];
      let msgIndex = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setLoadingMessage(messages[msgIndex]);
      }, 2000);

      try {
        const aiScenarios = await generateSimulationAI(currentJob.title, skipCache);
        const formatted: SimulationScenario[] = aiScenarios.map((s, i) => ({
          id: `scenario-${i}`,
          time: s.time,
          title: s.title,
          description: s.description,
          stickFigurePose: s.stickFigurePose as StickFigurePose,
          choices: s.choices,
          correctChoiceIndex: s.correctChoiceIndex,
          explanation: s.explanation,
        }));
        setScenarios(formatted);
        if (!skipCache) toast.success('Simulation ready!');
      } catch (error) {
        console.error('AI simulation generation failed:', error);
        toast.error('AI failed - using template scenarios');
        setScenarios(generateSimulation(currentJob.title));
      } finally {
        clearInterval(interval);
        setIsLoadingScenarios(false);
      }
    } else {
      setScenarios(generateSimulation(currentJob.title));
    }
  };

  if (!currentJob) return null;

  const currentScenario = currentIndex >= 0 && currentIndex < scenarios.length ? scenarios[currentIndex] : null;
  const progress = scenarios.length > 0 ? ((currentIndex + 1) / scenarios.length) * 100 : 0;

  const handleChoiceSelect = (choiceIndex: number) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choiceIndex);
    const wasCorrect = choiceIndex === currentScenario?.correctChoiceIndex;
    setCompletedScenarios(prev => [...prev, { index: currentIndex, wasCorrect }]);
    // Haptic feedback
    if (wasCorrect) hapticLight(); else hapticWarn();

    setTimeout(() => {
      setShowExplanation(true);
    }, 600);
  };

  const handleNext = () => {
    if (currentIndex >= scenarios.length - 1) {
      hapticSuccess();
      setIsComplete(true);
      // Generate AI summary
      if (hasApiKey()) {
        generateAISummary();
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedChoice(null);
      setShowExplanation(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateAISummary = async () => {
    setLoadingSummary(true);
    try {
      const allCompleted = [...completedScenarios, { index: currentIndex, wasCorrect: selectedChoice === currentScenario?.correctChoiceIndex }];
      const correctCount = allCompleted.filter(s => s.wasCorrect).length;
      const titles = scenarios.map(s => s.title);
      const wasCorrectArr = scenarios.map((_, i) => {
        const found = allCompleted.find(c => c.index === i);
        return found?.wasCorrect ?? false;
      });

      const summary = await generateSimulationSummary(
        currentJob!.title,
        scenarios.length,
        correctCount,
        titles,
        wasCorrectArr
      );
      setAiSummary(summary);
      // Persist result for next visit
      try {
        localStorage.setItem(simResultKey(currentJob!.title), JSON.stringify({
          scenarios,
          completedScenarios: allCompleted,
          aiSummary: summary,
          timestamp: Date.now(),
        }));
      } catch { /* localStorage full - fine */ }
    } catch {
      // Silently fail - the summary is optional
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleRestart = async () => {
    setCurrentIndex(-1);
    setSelectedChoice(null);
    setShowExplanation(false);
    setCompletedScenarios([]);
    setIsComplete(false);
    setAiSummary('');
    // New simulation: clear saved result, get fresh scenarios
    if (currentJob) {
      localStorage.removeItem(simResultKey(currentJob.title));
    }
    if (hasApiKey()) {
      await loadScenarios(true);
      toast.success('Fresh simulation generated!');
    }
  };

  const handleRedo = () => {
    // Redo: reuse same scenarios, just reset progress
    setCurrentIndex(-1);
    setSelectedChoice(null);
    setShowExplanation(false);
    setCompletedScenarios([]);
    setIsComplete(false);
    setAiSummary('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPDF = () => {
    if (!currentJob) return;
    const allCompleted = completedScenarios;
    downloadAssessmentPDF({
      jobTitle: currentJob.title,
      totalScenarios: scenarios.length,
      correctCount: correctCount,
      aiSummary: aiSummary,
      scenarios: scenarios.map((s, i) => {
        const completed = allCompleted.find(c => c.index === i);
        return { time: s.time, title: s.title, wasCorrect: completed?.wasCorrect ?? false };
      }),
    });
    sounds.download();
    toast.success('Downloading assessment PDF…');
  };

  const correctCount = completedScenarios.filter(s => s.wasCorrect).length;

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      {/* Progress Bar */}
      {currentIndex >= 0 && !isComplete && (
        <motion.div
          className="fixed top-14 left-0 right-0 z-40 bg-[#f5ede0]/80 backdrop-blur-sm border-b border-black/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="max-w-4xl mx-auto px-6 py-2">
            <div className="flex items-center gap-3">
              <span className="font-[JetBrains_Mono] text-black/40" style={{ fontSize: '0.7rem' }}>
                {currentIndex + 1}/{scenarios.length}
              </span>
              <div className="flex-1 h-1 bg-black/8 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-black rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {currentScenario && (
                <span className="font-[JetBrains_Mono] text-black/40 flex items-center gap-1" style={{ fontSize: '0.7rem' }}>
                  <Clock size={12} />
                  {currentScenario.time}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="pt-24 pb-20 max-w-3xl mx-auto px-6">
        <motion.button
          onClick={() => navigate('/job/detail')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ChevronLeft size={16} />
          Back to Job Info
        </motion.button>

        {/* Loading state */}
        {isLoadingScenarios && (
          <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="inline-block mb-6"
            >
              <Sparkles size={40} className="text-black/40" />
            </motion.div>
            <h2 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.6rem' }}>
              Generating Your Simulation
            </h2>
            <motion.p
              key={loadingMessage}
              className="font-[Inter] text-black/40"
              style={{ fontSize: '0.88rem' }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {loadingMessage}
            </motion.p>
            <div className="mt-8 flex justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-black/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* Intro Screen */}
          {!isLoadingScenarios && currentIndex === -1 && !isComplete && scenarios.length > 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <StickFigure pose="waving" size={100} className="mx-auto mb-6" />
              <h1 className="font-[Playfair_Display] text-black mb-4" style={{ fontSize: '2.2rem' }}>
                A Day in the Life
              </h1>
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="h-px w-8 bg-black/20" />
                <span className="font-[Inter] text-black/40 uppercase tracking-[0.15em] flex items-center gap-1.5" style={{ fontSize: '0.7rem' }}>
                  of a {currentJob.title}
                  {isAIEnabled && <Sparkles size={10} className="text-black/25" />}
                </span>
                <div className="h-px w-8 bg-black/20" />
              </div>

              <div className="max-w-md mx-auto mb-10">
                <p className="font-[Inter] text-black/50 mb-4" style={{ fontSize: '0.9rem' }}>
                  You're about to experience a typical day as a {currentJob.title}.
                  {scenarios.length} scenarios from morning to night.
                </p>
                {isAIEnabled && (
                  <p className="font-[Inter] text-black/30 mb-4 flex items-center justify-center gap-1.5" style={{ fontSize: '0.75rem' }}>
                    <Sparkles size={10} />
                    AI-generated scenarios unique to "{currentJob.title}"
                  </p>
                )}
                <div className="border border-black/10 p-4 text-left">
                  <p className="font-[Inter] text-black/40 mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    How this works
                  </p>
                  <ul className="space-y-2 font-[Inter] text-black/50" style={{ fontSize: '0.85rem' }}>
                    <li className="flex items-start gap-2">
                      <span className="text-black/30 mt-0.5">1.</span>
                      Each scenario presents a real situation a {currentJob.title} faces
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black/30 mt-0.5">2.</span>
                      Pick what you'd do - there are no penalties
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black/30 mt-0.5">3.</span>
                      We'll show you what a professional would do, and why
                    </li>
                  </ul>
                </div>
              </div>

              <motion.button
                onClick={() => setCurrentIndex(0)}
                className="inline-flex items-center gap-3 bg-black text-white py-4 px-10 font-[Inter] hover:bg-black/85 transition-colors"
                style={{ fontSize: '0.95rem' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Begin Simulation
                <ArrowRight size={18} />
              </motion.button>

              <div className="mt-16 flex items-center justify-center gap-1 opacity-30">
                {scenarios.slice(0, 8).map((s, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-black mb-1" />
                    <span className="font-[JetBrains_Mono]" style={{ fontSize: '0.55rem' }}>{s.time}</span>
                  </div>
                ))}
                {scenarios.length > 8 && (
                  <span className="font-[JetBrains_Mono] text-black/40 ml-1" style={{ fontSize: '0.55rem' }}>...</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Active Scenario */}
          {!isLoadingScenarios && currentScenario && !isComplete && (
            <motion.div
              key={`scenario-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-8">
                <motion.div
                  className="inline-flex items-center gap-2 bg-black text-white px-4 py-1.5 mb-4"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  <Clock size={14} />
                  <span className="font-[JetBrains_Mono]" style={{ fontSize: '0.85rem' }}>{currentScenario.time}</span>
                </motion.div>
                <h2 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.8rem' }}>
                  {currentScenario.title}
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mb-8">
                <div className="shrink-0">
                  <StickFigure pose={currentScenario.stickFigurePose} size={100} />
                </div>
                <div className="flex-1 border-l-2 border-black/10 pl-6">
                  <p className="font-[Inter] text-black/70 leading-relaxed" style={{ fontSize: '0.95rem' }}>
                    {currentScenario.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-4" style={{ fontSize: '0.7rem' }}>
                  What would you do?
                </p>
                {currentScenario.choices.map((choice, i) => {
                  const isSelected = selectedChoice === i;
                  const isCorrect = i === currentScenario.correctChoiceIndex;
                  const isRevealed = selectedChoice !== null;

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleChoiceSelect(i)}
                      disabled={selectedChoice !== null}
                      className={`w-full text-left p-5 border-2 transition-all font-[Inter] ${
                        !isRevealed
                          ? 'border-black/12 hover:border-black/30 hover:bg-black/2'
                          : isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isSelected
                              ? 'border-red-300 bg-red-50'
                              : 'border-black/8 opacity-40'
                      }`}
                      style={{ fontSize: '0.9rem' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={!isRevealed ? { scale: 1.005 } : {}}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 w-7 h-7 flex items-center justify-center border font-[JetBrains_Mono] ${
                          isRevealed && isCorrect ? 'border-green-400' : isRevealed && isSelected && !isCorrect ? 'border-red-300' : 'border-black/20'
                        }`} style={{ fontSize: '0.75rem' }}>
                          {isRevealed ? (
                            isCorrect ? <CheckCircle2 size={16} className="text-green-600" /> : isSelected ? <XCircle size={16} className="text-red-400" /> : String.fromCharCode(65 + i)
                          ) : (
                            String.fromCharCode(65 + i)
                          )}
                        </span>
                        <span className={`flex-1 ${
                          isRevealed && isCorrect ? 'text-green-800' : isRevealed && isSelected && !isCorrect ? 'text-red-700' : 'text-black/65'
                        }`}>
                          {choice.text}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 20, height: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className={`border-2 p-6 mb-8 ${
                      selectedChoice === currentScenario.correctChoiceIndex
                        ? 'border-green-300 bg-green-50/40'
                        : 'border-amber-300 bg-amber-50/40'
                    }`}>
                      <div className="flex items-start gap-4">
                        <StickFigure pose="presenting" size={56} />
                        <div className="flex-1">
                          <span className="font-[Inter] text-black/40 uppercase tracking-[0.1em]" style={{ fontSize: '0.65rem' }}>
                            {selectedChoice === currentScenario.correctChoiceIndex
                              ? 'Good instinct - here\'s why'
                              : 'Here\'s what actually happens'
                            }
                          </span>
                          <p className="font-[Inter] text-black/70 leading-relaxed mt-2" style={{ fontSize: '0.9rem' }}>
                            {currentScenario.explanation}
                          </p>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      onClick={handleNext}
                      className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 font-[Inter] hover:bg-black/85 transition-colors"
                      style={{ fontSize: '0.88rem' }}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                    >
                      {currentIndex >= scenarios.length - 1 ? 'Complete Simulation' : 'Next Scenario'}
                      <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Completion Screen */}
          {isComplete && (
            <>
              <BlackConfetti active={isComplete} />
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
              <StickFigure pose="celebrating" size={120} className="mx-auto mb-8" />

              <h1 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '2.2rem' }}>
                Simulation Complete
              </h1>
              <p className="font-[Inter] text-black/50 mb-8 max-w-md mx-auto" style={{ fontSize: '0.92rem' }}>
                You've experienced a full day in the life of a {currentJob.title}.
              </p>

              {/* Stats */}
              <div className="flex justify-center gap-8 mb-10">
                <div className="text-center">
                  <div className="font-[Playfair_Display] text-black" style={{ fontSize: '2rem' }}>{scenarios.length}</div>
                  <div className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>Scenarios</div>
                </div>
                <div className="w-px bg-black/10" />
                <div className="text-center">
                  <div className="font-[Playfair_Display] text-green-600" style={{ fontSize: '2rem' }}>{correctCount}</div>
                  <div className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>Professional Choices</div>
                </div>
                <div className="w-px bg-black/10" />
                <div className="text-center">
                  <div className={`font-[Playfair_Display] ${
                    scenarios.length > 0 && (correctCount / scenarios.length) >= 0.7
                      ? 'text-green-600'
                      : scenarios.length > 0 && (correctCount / scenarios.length) >= 0.4
                        ? 'text-amber-600'
                        : 'text-black'
                  }`} style={{ fontSize: '2rem' }}>
                    {scenarios.length > 0 ? Math.round((correctCount / scenarios.length) * 100) : 0}%
                  </div>
                  <div className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>Alignment</div>
                </div>
              </div>

              {/* AI Summary */}
              {(aiSummary || loadingSummary) && (
                <motion.div
                  className="max-w-3xl mx-auto border-2 border-black p-8 text-left mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start gap-4">
                    <StickFigure pose="presenting" size={48} />
                    <div className="flex-1">
                      <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-2 flex items-center gap-1.5" style={{ fontSize: '0.65rem' }}>
                        <Sparkles size={10} />
                        AI Assessment
                      </p>
                      {loadingSummary ? (
                        <div className="flex items-center gap-2 text-black/40">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="font-[Inter]" style={{ fontSize: '0.85rem' }}>Analyzing your choices...</span>
                        </div>
                      ) : (
                        <div className="font-[Inter] text-black/75 leading-relaxed space-y-3" style={{ fontSize: '0.92rem' }}>
                          {aiSummary.split('\n').map((line, i) => {
                            const isSection = /^(STRENGTHS|AREAS TO DEVELOP|AREAS FOR GROWTH|GROWTH AREAS):/i.test(line.trim());
                            const isBullet = line.trim().startsWith('- ');
                            if (!line.trim()) return null;
                            if (isSection) return (
                              <p key={i} className="font-[Inter] font-semibold text-black uppercase tracking-[0.08em]" style={{ fontSize: '0.72rem', marginTop: '1rem' }}>
                                {line.trim()}
                              </p>
                            );
                            if (isBullet) return (
                              <div key={i} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-black/50 mt-2 shrink-0" />
                                <span>{line.trim().slice(2)}</span>
                              </div>
                            );
                            return <p key={i}>{line.trim()}</p>;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Timeline */}
              <div className="max-w-3xl mx-auto border border-black/10 p-6 text-left mb-10">
                <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-4" style={{ fontSize: '0.65rem' }}>
                  Day Timeline
                </p>
                <div className="space-y-2">
                  {scenarios.map((scenario, i) => {
                    const completed = completedScenarios.find(c => c.index === i);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="font-[JetBrains_Mono] text-black/30 w-16 shrink-0" style={{ fontSize: '0.72rem' }}>
                          {scenario.time}
                        </span>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${completed?.wasCorrect ? 'bg-black' : 'bg-black/20'}`} />
                        <span className="font-[Inter] text-black/50 truncate" style={{ fontSize: '0.82rem' }}>
                          {scenario.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fallback Key Takeaway (non-AI) */}
              {!aiSummary && !loadingSummary && (
                <div className="max-w-3xl mx-auto border-2 border-black p-8 text-left mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start gap-4">
                    <StickFigure pose="reading" size={48} />
                    <div>
                      <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-2" style={{ fontSize: '0.65rem' }}>
                        Key Takeaway
                      </p>
                      <p className="font-[Inter] text-black/70" style={{ fontSize: '0.9rem' }}>
                        Being a {currentJob.title} is more than just technical skills - it's about judgment, communication, and daily decisions.
                        {correctCount >= scenarios.length * 0.7
                          ? ' Your instincts align well with the profession.'
                          : ' Many answers might have surprised you - that\'s the value of this exercise.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                {(aiSummary || !loadingSummary) && (
                  <motion.button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter] whitespace-nowrap"
                    style={{ fontSize: '0.85rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download size={16} className="shrink-0" />
                    Download PDF
                  </motion.button>
                )}
                <motion.button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter] whitespace-nowrap"
                  style={{ fontSize: '0.85rem' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RotateCcw size={16} className="shrink-0" />
                  {isAIEnabled ? 'New Simulation' : 'Retry'}
                </motion.button>
                {scenarios.length > 0 && (
                  <motion.button
                    onClick={handleRedo}
                    className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter] whitespace-nowrap"
                    style={{ fontSize: '0.85rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RotateCcw size={16} className="shrink-0" />
                    Redo This Simulation
                  </motion.button>
                )}
                <motion.button
                  onClick={() => navigate('/')}
                  className="flex items-center justify-center gap-2 bg-black text-white py-3 px-6 hover:bg-black/85 transition-colors font-[Inter] whitespace-nowrap"
                  style={{ fontSize: '0.85rem' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Explore Another Career
                  <ArrowRight size={16} className="shrink-0" />
                </motion.button>
              </div>

              {/* Roadmap + Transition CTAs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-w-md mx-auto">
                <motion.button
                  onClick={() => navigate(`/roadmap?job=${encodeURIComponent(currentJob!.title)}`)}
                  className="flex items-center justify-center gap-2 border border-black/15 text-black/55 py-2.5 px-4 hover:border-black/35 hover:text-black transition-all font-[Inter]"
                  style={{ fontSize: '0.82rem' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <TrendingUp size={14} />
                  Build My Roadmap
                </motion.button>
                <motion.button
                  onClick={() => navigate(`/career-transition?to=${encodeURIComponent(currentJob!.title)}`)}
                  className="flex items-center justify-center gap-2 border border-black/15 text-black/55 py-2.5 px-4 hover:border-black/35 hover:text-black transition-all font-[Inter]"
                  style={{ fontSize: '0.82rem' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <ArrowRight size={14} />
                  Transition Into This Role
                </motion.button>
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}