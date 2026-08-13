import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { sounds } from '../../utils/sounds';
import { hapticLight } from '../../utils/haptic';

interface PathwayRouteQuizProps {
  onClose: () => void;
  onResult: (recommendedRoute: 'direct' | 'stepping_stone' | 'qualification_first') => void;
}

const QUESTIONS = [
  {
    question: "What's your current priority?",
    options: [
      { text: 'Get there as fast as possible', scores: { direct: 3, stepping_stone: 0, qualification_first: 0 } },
      { text: 'Build a strong foundation first', scores: { direct: 0, stepping_stone: 1, qualification_first: 2 } },
      { text: 'Minimize risk and uncertainty', scores: { direct: 0, stepping_stone: 3, qualification_first: 1 } },
    ],
  },
  {
    question: "How much time can you dedicate to learning?",
    options: [
      { text: 'Full-time — I can focus completely', scores: { direct: 2, stepping_stone: 0, qualification_first: 3 } },
      { text: 'Part-time while working', scores: { direct: 1, stepping_stone: 3, qualification_first: 1 } },
      { text: 'Just evenings and weekends', scores: { direct: 0, stepping_stone: 2, qualification_first: 1 } },
    ],
  },
  {
    question: "What's your learning style preference?",
    options: [
      { text: 'Learn by doing on the job', scores: { direct: 3, stepping_stone: 2, qualification_first: 0 } },
      { text: 'Structured courses with credentials', scores: { direct: 0, stepping_stone: 1, qualification_first: 3 } },
      { text: 'Mix of both', scores: { direct: 1, stepping_stone: 3, qualification_first: 1 } },
    ],
  },
];

export function PathwayRouteQuiz({ onClose, onResult }: PathwayRouteQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scores, setScores] = useState({ direct: 0, stepping_stone: 0, qualification_first: 0 });
  const [answered, setAnswered] = useState(false);

  const handleAnswer = (optionScores: typeof scores) => {
    const newScores = {
      direct: scores.direct + optionScores.direct,
      stepping_stone: scores.stepping_stone + optionScores.stepping_stone,
      qualification_first: scores.qualification_first + optionScores.qualification_first,
    };

    setScores(newScores);
    setAnswered(true);
    sounds.click();
    hapticLight();

    if (currentQuestion < QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setAnswered(false);
      }, 600);
    } else {
      // Calculate result
      setTimeout(() => {
        const maxScore = Math.max(newScores.direct, newScores.stepping_stone, newScores.qualification_first);
        let recommended: 'direct' | 'stepping_stone' | 'qualification_first';
        
        if (newScores.direct === maxScore) recommended = 'direct';
        else if (newScores.stepping_stone === maxScore) recommended = 'stepping_stone';
        else recommended = 'qualification_first';

        onResult(recommended);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        className="max-w-lg w-full bg-[var(--paper-raised)] border-2 border-[var(--ink)] shadow-[var(--shadow-hard)]"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className="border-b-2 border-[var(--ink)] p-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Which route is right for you?</h2>
            <p className="text-sm text-[var(--ink-soft)] mt-1">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 hover:bg-[var(--ink)]/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-[var(--ink-faint)]">
          <motion.div
            className="h-full bg-[var(--ink)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            className="p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="font-display text-xl mb-6">
              {QUESTIONS[currentQuestion].question}
            </h3>

            <div className="space-y-3">
              {QUESTIONS[currentQuestion].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option.scores)}
                  disabled={answered}
                  className="w-full text-left border-2 border-[var(--ink-faint)] p-4 hover:border-[var(--ink)] hover:bg-[var(--paper)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{option.text}</span>
                    <ChevronRight size={16} className="text-[var(--ink-faint)] group-hover:text-[var(--ink)] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
