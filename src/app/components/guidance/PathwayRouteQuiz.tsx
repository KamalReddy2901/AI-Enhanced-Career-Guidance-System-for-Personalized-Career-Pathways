import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { sounds } from '../../utils/sounds';
import { hapticLight } from '../../utils/haptic';

interface PathwayRouteQuizProps {
  onClose: () => void;
  onResult: (route: 'direct' | 'stepping_stone' | 'qualification_first') => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: Array<{
    label: string;
    value: string;
    weights: { direct: number; stepping_stone: number; qualification_first: number };
  }>;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'timeline',
    question: 'How quickly do you need to transition into this career?',
    options: [
      { 
        label: 'As soon as possible (3-6 months)', 
        value: 'asap',
        weights: { direct: 3, stepping_stone: 1, qualification_first: 0 }
      },
      { 
        label: 'Within a year', 
        value: 'year',
        weights: { direct: 2, stepping_stone: 2, qualification_first: 1 }
      },
      { 
        label: 'I can take 1-2 years', 
        value: 'patient',
        weights: { direct: 1, stepping_stone: 2, qualification_first: 3 }
      },
    ],
  },
  {
    id: 'learning',
    question: 'How much time can you dedicate to learning per week?',
    options: [
      { 
        label: '15+ hours (intensive, full-time learning)', 
        value: 'intensive',
        weights: { direct: 3, stepping_stone: 1, qualification_first: 2 }
      },
      { 
        label: '8-15 hours (part-time while working)', 
        value: 'moderate',
        weights: { direct: 2, stepping_stone: 3, qualification_first: 2 }
      },
      { 
        label: 'Less than 8 hours (weekends only)', 
        value: 'limited',
        weights: { direct: 1, stepping_stone: 2, qualification_first: 3 }
      },
    ],
  },
  {
    id: 'risk',
    question: 'How important is income stability during the transition?',
    options: [
      { 
        label: 'Critical - I need steady income', 
        value: 'critical',
        weights: { direct: 0, stepping_stone: 3, qualification_first: 2 }
      },
      { 
        label: 'Important but can manage short gaps', 
        value: 'manageable',
        weights: { direct: 2, stepping_stone: 2, qualification_first: 2 }
      },
      { 
        label: 'Not a concern - I have savings/support', 
        value: 'flexible',
        weights: { direct: 3, stepping_stone: 1, qualification_first: 2 }
      },
    ],
  },
  {
    id: 'credentials',
    question: 'How important are formal credentials to you?',
    options: [
      { 
        label: 'Very important - I want official certifications', 
        value: 'very',
        weights: { direct: 0, stepping_stone: 1, qualification_first: 3 }
      },
      { 
        label: 'Somewhat important - nice to have', 
        value: 'somewhat',
        weights: { direct: 1, stepping_stone: 2, qualification_first: 2 }
      },
      { 
        label: 'Not important - I value skills over certificates', 
        value: 'not',
        weights: { direct: 3, stepping_stone: 2, qualification_first: 0 }
      },
    ],
  },
];

export function PathwayRouteQuiz({ onClose, onResult }: PathwayRouteQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scores, setScores] = useState({ direct: 0, stepping_stone: 0, qualification_first: 0 });

  const handleAnswer = (weights: { direct: number; stepping_stone: number; qualification_first: number }) => {
    sounds.click();
    hapticLight();
    
    const newScores = {
      direct: scores.direct + weights.direct,
      stepping_stone: scores.stepping_stone + weights.stepping_stone,
      qualification_first: scores.qualification_first + weights.qualification_first,
    };
    
    setScores(newScores);

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Quiz complete - determine winner
      const maxScore = Math.max(newScores.direct, newScores.stepping_stone, newScores.qualification_first);
      let recommendedRoute: 'direct' | 'stepping_stone' | 'qualification_first' = 'direct';
      
      if (maxScore === newScores.stepping_stone) {
        recommendedRoute = 'stepping_stone';
      } else if (maxScore === newScores.qualification_first) {
        recommendedRoute = 'qualification_first';
      }
      
      sounds.success();
      onResult(recommendedRoute);
    }
  };

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl bg-[var(--paper)] border-2 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)] p-8"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-black/5 transition-colors"
          aria-label="Close quiz"
        >
          <X size={20} />
        </button>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-ui text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
            </span>
            <span className="font-mono-ui text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-[var(--ink-faint)] overflow-hidden">
            <motion.div
              className="h-full bg-[var(--ink)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-display text-3xl mb-6 leading-tight">
              {question.question}
            </h2>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <motion.button
                  key={option.value}
                  onClick={() => handleAnswer(option.weights)}
                  className="w-full text-left border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] p-4 hover:border-[var(--ink)] hover:shadow-[4px_4px_0_var(--ink)] transition-all flex items-center justify-between group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <span className="text-base">{option.label}</span>
                  <ChevronRight 
                    size={20} 
                    className="text-[var(--ink-soft)] group-hover:text-[var(--ink)] transition-colors" 
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="mt-6 text-sm text-[var(--ink-soft)] text-center">
          Based on your answers, we'll recommend the pathway route that best fits your situation
        </p>
      </motion.div>
    </motion.div>
  );
}
