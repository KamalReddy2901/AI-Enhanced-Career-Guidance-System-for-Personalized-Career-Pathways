import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ArrowRight, Sparkles, Loader2, RotateCcw, MessageSquare, ListChecks } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { getQuizResults, getQuizFromScratch, hasApiKey, type QuizResult } from '../services/ai';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';

const QUESTIONS = [
  {
    id: 'environment',
    question: 'What work environment energizes you most?',
    options: [
      'A quiet office or home setup where I can focus deeply',
      'A bustling, fast-paced environment with constant interaction',
      'Outdoors or in the field, away from a desk',
      'A creative studio or workshop where I build things',
    ],
  },
  {
    id: 'problemSolving',
    question: 'When faced with a complex problem, you...',
    options: [
      'Break it down analytically - data and logic guide me',
      'Talk to people, gather perspectives, find consensus',
      'Trust my gut and experiment until something works',
      'Research deeply, read everything available, then decide',
    ],
  },
  {
    id: 'motivation',
    question: 'What motivates you most at work?',
    options: [
      'Making a tangible impact on people\'s lives',
      'Building or creating something that didn\'t exist before',
      'Solving puzzles and cracking hard problems',
      'Leading teams and driving big-picture strategy',
    ],
  },
  {
    id: 'stress',
    question: 'How do you handle high-pressure situations?',
    options: [
      'I thrive on pressure - it brings out my best',
      'I prefer steady, predictable work with minimal surprises',
      'I can handle bursts of pressure if there\'s downtime after',
      'I stay calm and methodical, no matter the chaos around me',
    ],
  },
  {
    id: 'learning',
    question: 'How do you prefer to learn new skills?',
    options: [
      'Hands-on practice - I learn by doing',
      'Reading and studying - I want the theory first',
      'From a mentor - I learn best from people',
      'Self-directed online - I like going at my own pace',
    ],
  },
  {
    id: 'teamwork',
    question: 'Your ideal team dynamic is...',
    options: [
      'Small, tight-knit team where everyone wears multiple hats',
      'Large organization with clear roles and hierarchy',
      'Mostly solo with occasional collaboration',
      'Constantly changing teams and projects',
    ],
  },
  {
    id: 'values',
    question: 'Which matters most to you in a career?',
    options: [
      'Financial security and growth potential',
      'Creativity and self-expression',
      'Helping others and making the world better',
      'Mastery - being the best at what I do',
    ],
  },
];

export function QuizPage() {
  const navigate = useNavigate();
  const { searchJobAI, searchJob, searchJobPreliminary, setCurrentJob, addToHistory, setRefinementCount, isAIEnabled } = useApp();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExploring, setIsExploring] = useState<string | null>(null);
  const [scratchMode, setScratchMode] = useState(false);
  const [scratchText, setScratchText] = useState('');

  const progress = ((currentQ) / QUESTIONS.length) * 100;

  const handleAnswer = (answer: string) => {
    sounds.quizAnswer();
    const q = QUESTIONS[currentQ];
    const newAnswers = { ...answers, [q.question]: answer };
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(prev => prev + 1);
    } else {
      // Last question - get results
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: Record<string, string>) => {
    if (!hasApiKey()) {
      toast.error('API key required for the career quiz');
      return;
    }

    setIsLoading(true);
    try {
      const quizResult = await getQuizResults(finalAnswers);
      setResult(quizResult);
      sounds.reveal();
    } catch (error) {
      toast.error('Failed to analyze quiz results', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreCareer = async (title: string) => {
    setIsExploring(title);
    try {
      const jobData = isAIEnabled ? await searchJobPreliminary(title) : searchJob(title);
      setCurrentJob(jobData);
      setRefinementCount(0);
      navigate('/job');
    } catch {
      toast.error('Failed to load career data');
    } finally {
      setIsExploring(null);
    }
  };

  const submitScratch = async () => {
    if (!scratchText.trim()) return;
    if (!hasApiKey()) { toast.error('API key required — add your free Groq key in Settings'); return; }
    setIsLoading(true);
    try {
      const quizResult = await getQuizFromScratch(scratchText.trim());
      setResult(quizResult);
      sounds.reveal();
    } catch (error) {
      toast.error('Failed to analyze your description', { description: error instanceof Error ? error.message : 'Please try again' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
    setScratchText('');
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          Home
        </motion.button>

        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StickFigure pose="thinking" size={80} className="mx-auto mb-4" />
          <h1 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '2rem' }}>
            Career Match Quiz
          </h1>
          <p className="font-[Inter] text-black/40" style={{ fontSize: '0.85rem' }}>
            Answer {QUESTIONS.length} questions and AI will suggest careers that match your personality
          </p>
        </motion.div>

        {/* Mode toggle — only show before results or taking the quiz */}
        {!result && !isLoading && (
          <motion.div
            className="flex gap-2 mb-8 border border-black/10 p-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => setScratchMode(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-[Inter] transition-colors ${!scratchMode ? 'bg-black text-white' : 'text-black/50 hover:text-black'}`}
              style={{ fontSize: '0.82rem' }}
            >
              <ListChecks size={14} />
              Guided Quiz
            </button>
            <button
              onClick={() => setScratchMode(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-[Inter] transition-colors ${scratchMode ? 'bg-black text-white' : 'text-black/50 hover:text-black'}`}
              style={{ fontSize: '0.82rem' }}
            >
              <MessageSquare size={14} />
              Start from Scratch
            </button>
          </motion.div>
        )}

        {/* Progress bar — guided mode only */}
        {!result && !isLoading && !scratchMode && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
                Question {currentQ + 1} of {QUESTIONS.length}
              </span>
              <span className="font-[JetBrains_Mono] text-black/30" style={{ fontSize: '0.72rem' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1 bg-black/8 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-black rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Scratch mode panel */}
          {!result && !isLoading && scratchMode && (
            <motion.div
              key="scratch"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="border-2 border-black/10 p-8 mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <StickFigure pose="thinking" size={56} />
                  <div>
                    <h2 className="font-[Playfair_Display] text-black mb-1" style={{ fontSize: '1.3rem' }}>Tell me about yourself</h2>
                    <p className="font-[Inter] text-black/40" style={{ fontSize: '0.85rem' }}>
                      What do you enjoy? What are you good at? What matters to you in a career? Write freely — AI will figure out the rest.
                    </p>
                  </div>
                </div>
                <textarea
                  value={scratchText}
                  onChange={e => setScratchText(e.target.value)}
                  placeholder="e.g. I love solving puzzles and I'm really good at explaining complex things to people. I enjoy working independently but I also like collaborating on big ideas. I care a lot about making a real difference — not just earning money..."
                  className="w-full border border-black/15 p-4 font-[Inter] text-black/70 placeholder:text-black/25 resize-none outline-none focus:border-black/40 transition-colors"
                  rows={6}
                  style={{ fontSize: '0.9rem' }}
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
                    {scratchText.length < 50 ? `Write at least ${50 - scratchText.length} more characters` : `${scratchText.length} characters — ready!`}
                  </span>
                  <motion.button
                    onClick={submitScratch}
                    disabled={scratchText.length < 50}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 disabled:bg-black/30 font-[Inter] hover:bg-black/85 transition-colors"
                    style={{ fontSize: '0.85rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles size={14} />
                    Find My Careers
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Guided Questions */}
          {!result && !isLoading && !scratchMode && (
            <motion.div
              key={`q-${currentQ}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="font-[Playfair_Display] text-black mb-6" style={{ fontSize: '1.4rem' }}>
                {QUESTIONS[currentQ].question}
              </h2>

              <div className="space-y-3">
                {QUESTIONS[currentQ].options.map((option, i) => (
                  <motion.button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className="w-full text-left p-5 border-2 border-black/10 hover:border-black/30 hover:bg-black/2 transition-all font-[Inter]"
                    style={{ fontSize: '0.9rem' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ x: 3 }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-7 h-7 flex items-center justify-center border border-black/20 text-black/40 font-[JetBrains_Mono]" style={{ fontSize: '0.75rem' }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-black/65">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading && (
            <motion.div
              key="loading"
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="inline-block mb-6"
              >
                <Sparkles size={40} className="text-black/40" />
              </motion.div>
              <h2 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.4rem' }}>
                Analyzing Your Responses
              </h2>
              <p className="font-[Inter] text-black/40" style={{ fontSize: '0.85rem' }}>
                AI is matching your personality to ideal careers...
              </p>
            </motion.div>
          )}

          {/* Results */}
          {result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Personality Insight */}
              <div className="border-2 border-black p-6 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-4">
                  <StickFigure pose="jumping" size={56} />
                  <div>
                    <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-2" style={{ fontSize: '0.65rem' }}>
                      Your Work Personality
                    </p>
                    <p className="font-[Inter] text-black/70 leading-relaxed" style={{ fontSize: '0.92rem' }}>
                      {result.personalityInsight}
                    </p>
                  </div>
                </div>
              </div>

              {/* Career Matches */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="font-[Playfair_Display] text-black" style={{ fontSize: '1.2rem' }}>
                    Your Top Career Matches
                  </span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                <div className="space-y-3">
                  {result.careers.map((career, i) => {
                    const matchPct = career.matchScore;
                    const accentClass = matchPct >= 80
                      ? 'border-l-4 border-l-green-400'
                      : matchPct >= 60
                        ? 'border-l-4 border-l-blue-400'
                        : 'border-l-4 border-l-amber-400';
                    const scoreClass = matchPct >= 80
                      ? 'bg-green-50 text-green-700'
                      : matchPct >= 60
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700';

                    return (
                    <motion.div
                      key={career.title}
                      className={`border-2 border-black/10 p-5 hover:border-black/25 transition-all ${accentClass}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-[JetBrains_Mono] text-black/30" style={{ fontSize: '0.72rem' }}>
                              #{i + 1}
                            </span>
                            <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.15rem' }}>
                              {career.title}
                            </h3>
                            <div className={`flex items-center gap-1 px-2 py-0.5 ${scoreClass}`}>
                              <span className="font-[JetBrains_Mono]" style={{ fontSize: '0.75rem' }}>
                                {career.matchScore}%
                              </span>
                              <span className="font-[Inter] opacity-60" style={{ fontSize: '0.65rem' }}>match</span>
                            </div>
                          </div>
                          <p className="font-[Inter] text-black/50" style={{ fontSize: '0.85rem' }}>
                            {career.reason}
                          </p>
                        </div>
                        <motion.button
                          onClick={() => handleExploreCareer(career.title)}
                          disabled={isExploring !== null}
                          className="shrink-0 flex items-center gap-1.5 bg-black text-white px-4 py-2 font-[Inter] hover:bg-black/85 disabled:bg-black/30 transition-colors"
                          style={{ fontSize: '0.78rem' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isExploring === career.title ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <ArrowRight size={13} />
                          )}
                          Explore
                        </motion.button>
                      </div>

                      {/* Match bar */}
                      <div className="mt-3 h-1 bg-black/8 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${matchPct >= 80 ? 'bg-green-500' : matchPct >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${career.matchScore}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                        />
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8">
                <motion.button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-2 border-2 border-black/20 text-black/60 py-3 px-6 hover:border-black/40 hover:text-black transition-all font-[Inter] flex-1"
                  style={{ fontSize: '0.85rem' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <RotateCcw size={15} />
                  Retake Quiz
                </motion.button>
                <motion.button
                  onClick={() => navigate('/')}
                  className="flex items-center justify-center gap-2 bg-black text-white py-3 px-6 hover:bg-black/85 transition-colors font-[Inter] flex-1"
                  style={{ fontSize: '0.85rem' }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Search Any Career
                  <ArrowRight size={15} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
