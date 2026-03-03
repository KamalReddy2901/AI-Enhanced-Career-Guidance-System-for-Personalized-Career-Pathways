import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, Loader2, RefreshCw, CheckCircle, Circle, Download } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { hasApiKey } from '../services/ai';
import { generateInterviewQuestions, type InterviewQuestion } from '../services/interview';
import { downloadInterviewPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';

export function InterviewPrepPage() {
  const navigate = useNavigate();
  const { currentJob, isAIEnabled } = useApp();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [preparedQuestions, setPreparedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!currentJob) {
      navigate('/');
      return;
    }
    if (hasApiKey()) {
      loadQuestions();
    }
  }, [currentJob]);

  const loadQuestions = async () => {
    if (!currentJob) return;
    setIsLoading(true);
    try {
      const qs = await generateInterviewQuestions(currentJob.title);
      setQuestions(qs);
    } catch (error) {
      toast.error('Failed to generate interview questions');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateAll = async () => {
    setIsLoading(true);
    setPreparedQuestions(new Set());
    setSelectedQuestion(null);
    try {
      const qs = await generateInterviewQuestions(currentJob!.title, true);
      setQuestions(qs);
      toast.success('New questions generated!');
    } catch {
      toast.error('Failed to generate questions');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePrepared = (index: number) => {
    sounds.toggle();
    const newSet = new Set(preparedQuestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setPreparedQuestions(newSet);
  };

  if (!currentJob) return null;

  if (!isAIEnabled) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-6 text-center py-20">
          <StickFigure pose="reading" size={80} className="mx-auto mb-6" />
          <h2 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.6rem' }}>
            Interview Prep Requires AI
          </h2>
          <p className="font-[Inter] text-black/50" style={{ fontSize: '0.9rem' }}>
            Add your free Groq API key to unlock AI-powered interview preparation
          </p>
          <motion.button
            onClick={() => navigate('/')}
            className="mt-6 bg-black text-white px-6 py-3 font-[Inter]"
            style={{ fontSize: '0.85rem' }}
            whileHover={{ scale: 1.02 }}
          >
            Go to Homepage
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate('/job/detail')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          Back to Job Info
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <StickFigure pose="presenting" size={64} />
              <div>
                <h1 className="font-[Playfair_Display] text-black" style={{ fontSize: '2rem' }}>
                  Interview Preparation
                </h1>
                <p className="font-[Inter] text-black/40 flex items-center gap-1.5" style={{ fontSize: '0.82rem' }}>
                  <Sparkles size={12} />
                  for {currentJob.title}
                </p>
              </div>
            </div>

            {!isLoading && questions.length > 0 && (
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    downloadInterviewPDF({
                      jobTitle: currentJob.title,
                      questions,
                      preparedCount: preparedQuestions.size,
                    });
                    sounds.download();
                    toast.success('Downloading interview prep PDF…');
                  }}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Download size={12} />
                  Download PDF
                </motion.button>
                <motion.button
                  onClick={handleRegenerateAll}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-all font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <RefreshCw size={12} />
                  Regenerate All
                </motion.button>
              </div>
            )}
          </div>

          <div className="border-l-2 border-black/10 pl-4">
            <p className="font-[Inter] text-black/50 leading-relaxed" style={{ fontSize: '0.88rem' }}>
              AI-generated interview questions tailored to {currentJob.title} positions. Click any question to see the suggested answer strategy and key points to mention.
            </p>
          </div>
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 size={36} className="animate-spin text-black/30 mx-auto mb-4" />
            <StickFigure pose="typing" size={72} className="mx-auto mb-4" />
            <p className="font-[Inter] text-black/40" style={{ fontSize: '0.88rem' }}>
              Generating interview questions...
            </p>
          </motion.div>
        )}

        {/* Questions grid */}
        {!isLoading && questions.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
                {preparedQuestions.size} of {questions.length} prepared
              </p>
              {preparedQuestions.size === questions.length && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 text-black/60 font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                >
                  <CheckCircle size={14} className="text-black/40" />
                  All prepared!
                </motion.div>
              )}
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {questions.map((q, i) => {
                  const isOpen = selectedQuestion === i;
                  const isPrepared = preparedQuestions.has(i);
                  const catLow = (q.category || '').toLowerCase();
                  const catBorderColor = catLow.includes('technical') || catLow.includes('tech')
                    ? 'border-l-blue-400'
                    : catLow.includes('behavioral') || catLow.includes('behaviour') || catLow.includes('behavior')
                      ? 'border-l-purple-400'
                      : catLow.includes('situation')
                        ? 'border-l-amber-400'
                        : 'border-l-black/20';

                  return (
                    <motion.div
                      key={i}
                      className={`border-2 border-black/10 border-l-4 ${catBorderColor}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        onClick={() => { setSelectedQuestion(isOpen ? null : i); isOpen ? sounds.collapse() : sounds.expand(); }}
                        className="w-full text-left p-5 hover:bg-black/2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePrepared(i);
                            }}
                            aria-label={isPrepared ? 'Mark as not prepared' : 'Mark as prepared'}
                            className="shrink-0 mt-0.5"
                          >
                            {isPrepared ? (
                              <CheckCircle size={20} className="text-green-500" />
                            ) : (
                              <Circle size={20} className="text-black/20" />
                            )}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <span className="font-[Inter] text-black/30 uppercase tracking-[0.1em] block mb-1" style={{ fontSize: '0.6rem' }}>
                                  {q.category}
                                </span>
                                <h3 className="font-[Playfair_Display] text-black" style={{ fontSize: '1.05rem' }}>
                                  {q.question}
                                </h3>
                              </div>
                              <motion.div
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-black/30"
                              >
                                ▼
                              </motion.div>
                            </div>

                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 pt-4 border-t border-black/5">
                                    <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-2" style={{ fontSize: '0.65rem' }}>
                                      Suggested Approach
                                    </p>
                                    <p className="font-[Inter] text-black/60 leading-relaxed mb-4 whitespace-pre-line" style={{ fontSize: '0.85rem' }}>
                                      {q.approach}
                                    </p>

                                    <p className="font-[Inter] text-black/40 uppercase tracking-[0.1em] mb-2" style={{ fontSize: '0.65rem' }}>
                                      Key Points to Mention
                                    </p>
                                    <ul className="space-y-1.5">
                                      {q.keyPoints.map((point, pi) => (
                                        <li key={pi} className="flex items-start gap-2 font-[Inter] text-black/60" style={{ fontSize: '0.82rem' }}>
                                          <span className="text-black/30 mt-0.5">•</span>
                                          <span>{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}