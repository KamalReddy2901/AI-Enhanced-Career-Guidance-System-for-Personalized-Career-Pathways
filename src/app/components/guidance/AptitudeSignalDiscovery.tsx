import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, Loader2, CheckCircle, Brain } from 'lucide-react';
import { extractAptitudeEvidence, type AptitudeEvidenceItem } from '../../services/ai';
import { computeAptitudeEvidenceAdjustment, type AptitudeDimension } from '../../engine/aptitude';
import type { AptitudeScores } from '../../engine/types';
import { useT } from '../../i18n';
import { sounds } from '../../utils/sounds';
import { hapticLight, hapticSuccess } from '../../utils/haptic';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface AptitudeSignalDiscoveryProps {
  onClose: () => void;
  onEvidenceDiscovered: (evidence: AptitudeEvidenceItem[]) => void;
  baselineScores: AptitudeScores;
}

const INTERVIEW_QUESTIONS = {
  en: [
    "Tell me about a time you had to work with numbers, data, or calculations to solve a problem. What approach did you take?",
    "Describe a situation where you had to explain something complex to someone clearly. How did you make sure they understood?",
    "Walk me through a recent problem where you had to figure something out step-by-step with incomplete information.",
    "Tell me about a time you had to visualize, arrange, or organize something spatial (a layout, directions, objects). How did you approach it?",
    "Is there anything else about how you think through problems that might be relevant?",
  ],
  hi: [
    "मुझे उस समय के बारे में बताएं जब आपको किसी समस्या को हल करने के लिए संख्याओं, डेटा या गणनाओं के साथ काम करना पड़ा। आपने क्या तरीका अपनाया?",
    "एक ऐसी स्थिति का वर्णन करें जहां आपको किसी को कुछ जटिल स्पष्ट रूप से समझाना था। आपने यह कैसे सुनिश्चित किया कि वे समझ गए?",
    "हाल ही में एक समस्या के बारे में बताएं जहां आपको अधूरी जानकारी के साथ चरण-दर-चरण कुछ समझना था।",
    "मुझे उस समय के बारे में बताएं जब आपको किसी स्थानिक चीज़ (लेआउट, दिशा, वस्तुओं) को विज़ुअलाइज़, व्यवस्थित या व्यवस्थित करना था। आपने इसे कैसे किया?",
    "क्या आप समस्याओं को सुलझाने के तरीके के बारे में कुछ और बताना चाहेंगे जो प्रासंगिक हो सकता है?",
  ],
  te: [
    "సమస్యను పరిష్కరించడానికి సంఖ్యలు, డేటా లేదా లెక్కలతో పని చేయవలసి వచ్చిన సమయం గురించి చెప్పండి. మీరు ఏ విధానాన్ని అనుసరించారు?",
    "సంక్లిష్టమైన విషయాన్ని ఎవరికైనా స్పష్టంగా వివరించవలసిన పరిస్థితిని వివరించండి. వారు అర్థం చేసుకున్నారని మీరు ఎలా నిర్ధారించుకున్నారు?",
    "అసంపూర్ణ సమాచారంతో అంచెలంచెలుగా ఏదైనా గుర్తించాల్సిన ఇటీవలి సమస్య గురించి చెప్పండి.",
    "ప్రాదేశిక విషయాన్ని (లేఅవుట్, దిశలు, వస్తువులు) విజువలైజ్, అమర్చడం లేదా నిర్వహించాల్సిన సమయం గురించి చెప్పండి. మీరు దీన్ని ఎలా చేశారు?",
    "మీరు సమస్యలను ఎలా పరిష్కరిస్తారో దాని గురించి ఇంకా ఏదైనా చెప్పాలనుకుంటున్నారా?",
  ],
};

export function AptitudeSignalDiscovery({ onClose, onEvidenceDiscovered, baselineScores }: AptitudeSignalDiscoveryProps) {
  const { lang } = useT();
  const questions = INTERVIEW_QUESTIONS[lang] || INTERVIEW_QUESTIONS.en;
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: questions[0] },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [discoveredEvidence, setDiscoveredEvidence] = useState<AptitudeEvidenceItem[]>([]);
  const [adjustments, setAdjustments] = useState<Record<AptitudeDimension, number> | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = {
    en: {
      title: 'Aptitude Signal Discovery',
      subtitle: 'Sharpen your aptitude scores through conversation',
      placeholder: 'Type your answer...',
      send: 'Send',
      processing: 'Analyzing...',
      complete: 'Evidence Collected!',
      evidenceFound: 'evidence items found',
      adjustmentSummary: 'Score adjustments (capped at +6)',
      addToProfile: 'Apply to Profile',
      startOver: 'Start Over',
      dimensionLabels: {
        numerical: 'Numerical',
        verbal: 'Verbal',
        logical: 'Logical',
        spatial: 'Spatial',
      },
      baseline: 'Baseline (screener)',
      adjusted: 'With evidence',
      noAdjustment: 'No adjustment',
    },
    hi: {
      title: 'योग्यता संकेत खोज',
      subtitle: 'बातचीत के माध्यम से अपने योग्यता स्कोर को तेज करें',
      placeholder: 'अपना जवाब टाइप करें...',
      send: 'भेजें',
      processing: 'विश्लेषण कर रहे हैं...',
      complete: 'साक्ष्य एकत्र किए गए!',
      evidenceFound: 'साक्ष्य आइटम मिले',
      adjustmentSummary: 'स्कोर समायोजन (+6 पर कैप)',
      addToProfile: 'प्रोफ़ाइल में जोड़ें',
      startOver: 'फिर से शुरू करें',
      dimensionLabels: {
        numerical: 'संख्यात्मक',
        verbal: 'मौखिक',
        logical: 'तार्किक',
        spatial: 'स्थानिक',
      },
      baseline: 'बेसलाइन (स्क्रीनर)',
      adjusted: 'साक्ष्य के साथ',
      noAdjustment: 'कोई समायोजन नहीं',
    },
    te: {
      title: 'ఆప్టిట్యూడ్ సిగ్నల్ డిస్కవరీ',
      subtitle: 'సంభాషణ ద్వారా మీ ఆప్టిట్యూడ్ స్కోర్లను మెరుగుపరచండి',
      placeholder: 'మీ సమాధానం టైప్ చేయండి...',
      send: 'పంపండి',
      processing: 'విశ్లేషిస్తోంది...',
      complete: 'సాక్ష్యం సేకరించబడింది!',
      evidenceFound: 'సాక్ష్య అంశాలు కనుగొనబడ్డాయి',
      adjustmentSummary: 'స్కోర్ సర్దుబాట్లు (+6కి క్యాప్)',
      addToProfile: 'ప్రొఫైల్‌కు జోడించండి',
      startOver: 'మళ్లీ ప్రారంభించండి',
      dimensionLabels: {
        numerical: 'సంఖ్యా',
        verbal: 'మౌఖిక',
        logical: 'తార్కిక',
        spatial: 'ప్రాదేశిక',
      },
      baseline: 'బేస్‌లైన్ (స్క్రీనర్)',
      adjusted: 'సాక్ష్యంతో',
      noAdjustment: 'సర్దుబాటు లేదు',
    },
  };

  const t = labels[lang] || labels.en;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isProcessing) inputRef.current?.focus();
  }, [isProcessing]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    sounds.click();
    hapticLight();

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: questions[currentQuestionIndex + 1] }]);
        sounds.notification();
      }, 600);
    } else {
      // All questions answered — extract evidence
      setIsProcessing(true);
      try {
        const conversationText = messages
          .concat([{ role: 'user', content: userMessage }])
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        const evidence = await extractAptitudeEvidence(conversationText, lang);
        setDiscoveredEvidence(evidence);
        
        const adj = computeAptitudeEvidenceAdjustment(evidence);
        setAdjustments(adj);
        
        setIsComplete(true);
        sounds.success();
        hapticSuccess();
      } catch (error) {
        console.error('Evidence extraction failed:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'hi'
              ? 'क्षमा करें, साक्ष्य निकालने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
              : lang === 'te'
              ? 'క్షమించండి, సాక్ష్యం వెలికితీయడంలో లోపం. దయచేసి మళ్లీ ప్రయత్నించండి.'
              : 'Sorry, there was an error extracting evidence. Please try again.',
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleApply = () => {
    sounds.success();
    hapticSuccess();
    onEvidenceDiscovered(discoveredEvidence);
    onClose();
  };

  const handleStartOver = () => {
    setMessages([{ role: 'assistant', content: questions[0] }]);
    setCurrentQuestionIndex(0);
    setDiscoveredEvidence([]);
    setAdjustments(null);
    setIsComplete(false);
    setInput('');
    sounds.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card-sketch relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden bg-[var(--paper-raised)]"
      >
        {/* Header */}
        <div className="border-b-2 border-[var(--ink)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-[var(--accent-news)]" aria-hidden="true" />
              <div>
                <h2 className="font-display text-xl text-[var(--ink)]">{t.title}</h2>
                <p className="text-sm text-[var(--ink-soft)]">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded p-2 text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={
                      message.role === 'user'
                        ? 'rounded-2xl rounded-br-sm bg-[var(--ink)] px-4 py-2.5 text-[var(--paper)] max-w-[80%]'
                        : 'card-sketch bg-[var(--paper-raised)] px-4 py-2.5 text-[var(--ink)] max-w-[85%]'
                    }
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="card-sketch bg-[var(--paper-raised)] px-4 py-2.5">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </motion.div>
            )}

            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-sketch bg-[var(--paper-raised)] p-4 border-2 border-[var(--accent-news)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-[var(--accent-news)]" />
                  <h3 className="font-display text-lg text-[var(--ink)]">{t.complete}</h3>
                </div>
                
                <p className="text-sm text-[var(--ink-soft)] mb-4">
                  {discoveredEvidence.length} {t.evidenceFound}
                </p>

                {/* Evidence items */}
                <div className="space-y-3 mb-4">
                  {discoveredEvidence.map((item, idx) => (
                    <div key={idx} className="border-l-2 border-[var(--accent-news)] pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono-ui text-xs uppercase text-[var(--accent-news)]">
                          {t.dimensionLabels[item.dimension]}
                        </span>
                        <span className="text-xs text-[var(--ink-faint)]">
                          strength: {item.strength.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--ink-soft)] italic">"{item.rationale}"</p>
                    </div>
                  ))}
                </div>

                {/* Adjustment summary */}
                {adjustments && (
                  <div className="border-t-2 border-[var(--ink)] pt-3">
                    <h4 className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] mb-2">
                      {t.adjustmentSummary}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(Object.keys(adjustments) as AptitudeDimension[]).map(dim => {
                        const adj = adjustments[dim];
                        const baseline = baselineScores[dim];
                        const adjusted = Math.min(100, baseline + adj);
                        return (
                          <div key={dim} className="flex justify-between items-center">
                            <span className="text-[var(--ink)]">{t.dimensionLabels[dim]}:</span>
                            <span className="font-mono-ui">
                              {baseline} → {adjusted}
                              {adj > 0 && <span className="text-[var(--accent-news)] ml-1">(+{adj})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleApply}
                    className="flex-1 rounded-sm bg-[var(--accent-news)] px-4 py-2 font-mono-ui text-sm uppercase text-white hover:bg-[var(--ink)] transition-colors"
                  >
                    {t.addToProfile}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="rounded-sm border-2 border-[var(--ink)] bg-transparent px-4 py-2 font-mono-ui text-sm uppercase text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                  >
                    {t.startOver}
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        {!isComplete && (
          <div className="border-t-2 border-[var(--ink)] p-4">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t.placeholder}
                disabled={isProcessing}
                className="flex-1 rounded-sm border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-news)] disabled:opacity-50"
                aria-label={t.placeholder}
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="rounded-sm bg-[var(--accent-news)] px-4 py-2 text-white hover:bg-[var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={t.send}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
