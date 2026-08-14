import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, Loader2, RefreshCw, CheckCircle, Circle, Download, Zap, Search } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { generateInterviewQuestions, type InterviewQuestion } from '../services/interview';
import { downloadInterviewPDF } from '../utils/pdfExport';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';
import { TextReveal } from '../motion/TextReveal';
import { hapticLight, hapticTap } from '../utils/haptic';
import { EvidenceButton } from '../components/guidance/EvidenceButton';
import { useT } from '../i18n';

export function InterviewPrepPage() {
  const navigate = useNavigate();
  const { lang } = useT();
  const [searchParams] = useSearchParams();
  const { currentJob } = useApp();
  const jobTitle = currentJob?.title?.trim() || searchParams.get('job')?.trim() || '';
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [preparedQuestions, setPreparedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!jobTitle) return;
    loadQuestions();
  }, [jobTitle]);

  const loadQuestions = async () => {
    if (!jobTitle) return;
    setIsLoading(true);
    try {
      const qs = await generateInterviewQuestions(jobTitle);
      setQuestions(qs);
      hapticLight();
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
      const qs = await generateInterviewQuestions(jobTitle, true);
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
    hapticTap();
    const newSet = new Set(preparedQuestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setPreparedQuestions(newSet);
  };

  if (!jobTitle) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center" data-testid="interview-no-career">
      <StickFigure pose="confused" size={80} />
      <p className="label-caps mt-6 mb-3 text-[var(--ink-soft)]">No career selected</p>
      <h1 className="font-display text-3xl text-[var(--ink)] mb-4">Choose a career to prep for</h1>
      <p className="text-sm text-[var(--ink-soft)] mb-8 max-w-sm">
        Search for a job title first, then come back here for tailored interview questions.
      </p>
      <button
        type="button"
        onClick={() => navigate('/job?fresh=1')}
        className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-3 font-mono-ui text-sm text-[var(--paper)] hover:opacity-80 transition-opacity"
        data-testid="interview-explore-link"
      >
        <Search size={14} />
        Explore careers
      </button>
    </div>
  );



  return (
    <div className="editorial-utility min-h-screen bg-[var(--paper)] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate(currentJob ? '/job/detail' : '/job?fresh=1')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          {currentJob ? 'Back to Job Info' : 'Explore careers'}
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
                <h1 className="font-display text-5xl leading-[1.25] text-black"><TextReveal text="Interview Preparation" /></h1>
                <p className="font-[Inter] text-black/40 flex items-center gap-1.5" style={{ fontSize: '0.82rem' }}>
                  <Sparkles size={12} />
                  for {jobTitle}
                </p>
              </div>
            </div>

            {!isLoading && questions.length > 0 && (
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    downloadInterviewPDF({
                      jobTitle,
                      questions,
                      preparedCount: preparedQuestions.size,
                    });
                    sounds.download();
                    toast.success('Downloading interview prep PDF…');
                  }}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ y: -1 }}
                >
                  <Download size={12} />
                  Download PDF
                </motion.button>
                <motion.button
                  onClick={handleRegenerateAll}
                  className="flex items-center gap-1.5 text-black/40 hover:text-black border border-black/10 px-3 py-1.5 hover:border-black/25 transition-[color,background-color,border-color,opacity,transform,box-shadow] font-[Inter]"
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
              AI-generated interview questions tailored to {jobTitle} positions. Click any question to see the suggested answer strategy and key points to mention.
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
                        onClick={() => { setSelectedQuestion(isOpen ? null : i); hapticTap(); isOpen ? sounds.collapse() : sounds.expand(); }}
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
                                    <EvidenceButton testId={`interview-feedback-${i + 1}-why-btn`} label={lang === 'hi' ? 'फीडबैक कैसे बनता है?' : lang === 'te' ? 'ఫీడ్‌బ్యాక్ ఎలా రూపొందుతుంది?' : 'How is feedback generated?'} evidence={{title:lang === 'hi' ? 'साक्षात्कार प्रमाण' : lang === 'te' ? 'ఇంటర్వ్యూ ఆధారం' : 'Interview evidence',eyebrow:q.category,summary:lang === 'hi' ? 'भूमिका का NCO, क्षेत्र और आवश्यक कौशल संस्करणित ज्ञान-आधार से आते हैं; यही संदर्भ प्रश्न को आधार देता है।' : lang === 'te' ? 'పాత్ర NCO, రంగం, అవసరమైన నైపుణ్యాలు వెర్షన్ చేసిన నాలెడ్జ్-బేస్ నుండి వచ్చి ప్రశ్నకు ఆధారం ఇస్తాయి.' : 'The role NCO, sector, and required skills come from the versioned knowledge base and ground this question.',method:lang === 'hi' ? 'प्रश्न और तैयारी पाठ सुरक्षित Worker प्रॉक्सी से LLM द्वारा लिखे जाते हैं। यहाँ कोई संख्यात्मक अंक नहीं है और LLM कोई अंक नहीं देता।' : lang === 'te' ? 'ప్రశ్న, సిద్ధత వచనం సురక్షిత Worker ప్రాక్సీ ద్వారా LLM రాస్తుంది. ఇక్కడ సంఖ్యాత్మక స్కోర్ లేదు; LLM ఎటువంటి స్కోర్ ఇవ్వదు.' : 'Question and preparation text are LLM-generated through the secure Worker proxy. There is no numeric score here, and no score is LLM-derived.',items:[{label:lang === 'hi' ? 'प्रश्न' : lang === 'te' ? 'ప్రశ్న' : 'Question',detail:q.question},{label:lang === 'hi' ? 'तैयारी विधि' : lang === 'te' ? 'సిద్ధత విధానం' : 'Preparation approach',detail:q.approach}],source:lang === 'hi' ? 'व्यवसाय ज्ञान-आधार · सुरक्षित Worker · कोई अंक नहीं' : lang === 'te' ? 'వృత్తి నాలెడ్జ్-బేస్ · సురక్షిత Worker · స్కోర్ లేదు' : 'Occupation knowledge base · secure Worker · no score' }} />

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
