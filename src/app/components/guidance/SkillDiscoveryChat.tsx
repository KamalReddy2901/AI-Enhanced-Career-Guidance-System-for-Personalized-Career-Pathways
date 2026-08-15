import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, Loader2, CheckCircle } from 'lucide-react';
import { callGroq } from '../../services/ai';
import { matchSkillsToKB, mergeSkillClaims } from '../../engine/skillProfile';
import type { SkillClaim, CareerPassport } from '../../engine/types';
import { skillById } from '../../data/knowledge';
import { useT } from '../../i18n';
import { sounds } from '../../utils/sounds';
import { hapticLight, hapticSuccess } from '../../utils/haptic';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface SkillDiscoveryChatProps {
  onClose: () => void;
  onSkillsDiscovered: (skills: SkillClaim[]) => void;
  passport: CareerPassport;
}

const INITIAL_QUESTIONS = {
  en: [
    "Tell me about a recent project or task you're proud of. What did you do?",
    "What tools or technologies did you use? Walk me through your process.",
    "What challenges did you face and how did you solve them?",
    "What would you say you got better at through this work?",
    "Is there anything else about your work or skills I should know?",
  ],
  hi: [
    "एक हालिया प्रोजेक्ट या काम के बारे में बताएं जिस पर आपको गर्व है। आपने क्या किया?",
    "आपने कौन से टूल्स या तकनीक का उपयोग किया? मुझे अपनी प्रक्रिया बताएं।",
    "आपको किन चुनौतियों का सामना करना पड़ा और आपने उन्हें कैसे हल किया?",
    "आप कहेंगे कि इस काम के माध्यम से आप किस चीज़ में बेहतर हुए?",
    "क्या आपके काम या कौशल के बारे में कुछ और है जो मुझे जानना चाहिए?",
  ],
  te: [
    "మీరు గర్వపడే ఇటీవలి ప్రాజెక్ట్ లేదా టాస్క్ గురించి చెప్పండి. మీరు ఏమి చేశారు?",
    "మీరు ఏ టూల్స్ లేదా టెక్నాలజీలు ఉపయోగించారు? మీ ప్రక్రియను వివరించండి.",
    "మీరు ఎటువంటి సవాళ్లను ఎదుర్కొన్నారు మరియు వాటిని ఎలా పరిష్కరించారు?",
    "ఈ పని ద్వారా మీరు దేనిలో మెరుగుపడ్డారని చెబుతారు?",
    "మీ పని లేదా నైపుణ్యాల గురించి నేను తెలుసుకోవలసినది ఇంకా ఏదైనా ఉందా?",
  ],
};

export function SkillDiscoveryChat({ onClose, onSkillsDiscovered, passport }: SkillDiscoveryChatProps) {
  const { lang } = useT();
  const questions = INITIAL_QUESTIONS[lang] || INITIAL_QUESTIONS.en;
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: questions[0] },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [discoveredSkills, setDiscoveredSkills] = useState<SkillClaim[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = {
    en: {
      title: 'Skill Discovery',
      subtitle: 'Let\'s discover your skills through conversation',
      placeholder: 'Type your answer...',
      send: 'Send',
      processing: 'Thinking...',
      complete: 'Discovery Complete!',
      foundSkills: 'skills identified',
      addToProfile: 'Add to Profile',
      startOver: 'Start Over',
    },
    hi: {
      title: 'कौशल खोज',
      subtitle: 'बातचीत के माध्यम से अपने कौशल की खोज करें',
      placeholder: 'अपना जवाब टाइप करें...',
      send: 'भेजें',
      processing: 'सोच रहा हूं...',
      complete: 'खोज पूर्ण!',
      foundSkills: 'कौशल पहचाने गए',
      addToProfile: 'प्रोफ़ाइल में जोड़ें',
      startOver: 'फिर से शुरू करें',
    },
    te: {
      title: 'నైపుణ్య ఆవిష్కరణ',
      subtitle: 'సంభాషణ ద్వారా మీ నైపుణ్యాలను కనుగొందాం',
      placeholder: 'మీ సమాధానం టైప్ చేయండి...',
      send: 'పంపండి',
      processing: 'ఆలోచిస్తోంది...',
      complete: 'ఆవిష్కరణ పూర్తయింది!',
      foundSkills: 'నైపుణ్యాలు గుర్తించబడ్డాయి',
      addToProfile: 'ప్రొఫైల్‌కు జోడించండి',
      startOver: 'మళ్లీ ప్రారంభించండి',
    },
  };

  const t = labels[lang] || labels.en;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isProcessing]);

  const extractSkillsFromConversation = async (conversationText: string): Promise<SkillClaim[]> => {
    const systemPrompt = `You are a skilled career counselor extracting skills from a conversation about someone's work experience.

Extract skills that are:
1. Specific and technical (programming languages, tools, frameworks)
2. Professional competencies (project management, data analysis, design)
3. Domain expertise (healthcare, finance, education sectors)

Match extracted skills to this knowledge base:
${[...skillById.entries()].slice(0, 50).map(([id, skill]) => `${id}: ${skill.name} (${skill.aliases.join(', ')})`).join('\n')}

Return ONLY valid JSON array of extracted skills with evidence.`;

    const userPrompt = `Extract skills from this conversation about a user's work:

${conversationText}

Return this exact JSON structure:
[
  {
    "name": "Exact skill name from KB or descriptive name if custom",
    "proficiency": 2,
    "evidence": "Specific quote or context from the conversation showing this skill"
  }
]

Be selective - only extract skills with clear evidence. Proficiency levels:
1 = beginner (mentioned, learning)
2 = intermediate (used in projects, practical application)
3 = advanced (solved complex problems, mentored others)
4 = expert (innovated, published, taught)`;

    try {
      const raw = await callGroq(systemPrompt, userPrompt, {
        temperature: 0.3,
        maxTokens: 1000,
        jsonMode: true,
        usageType: 'skill-discovery',
      });

      const extracted = JSON.parse(raw) as Array<{
        name: string;
        proficiency: 1 | 2 | 3 | 4;
        evidence: string;
      }>;

      const { matched } = matchSkillsToKB(
        extracted.map(item => ({
          name: item.name,
          proficiency: item.proficiency,
          evidence: item.evidence,
        }))
      );

      return matched.map(claim => ({
        ...claim,
        evidence: claim.evidence.map(ev => ({
          ...ev,
          type: 'inferred_from_activity' as const,
          confidence: 0.6,
        })),
        confidence: 0.6,
      }));
    } catch (error) {
      console.error('Skill extraction failed:', error);
      return [];
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);
    hapticLight();

    // Move to next question or complete
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < questions.length) {
      // Ask next question
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: questions[nextIndex] }]);
        setCurrentQuestionIndex(nextIndex);
        setIsProcessing(false);
        sounds.click();
      }, 800);
    } else {
      // Extract skills from full conversation
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n') + `\nUser: ${userMessage}`;

      const skills = await extractSkillsFromConversation(conversationText);
      
      setDiscoveredSkills(skills);
      setIsComplete(true);
      setIsProcessing(false);
      
      if (skills.length > 0) {
        sounds.assessComplete();
        hapticSuccess();
      } else {
        sounds.click();
      }
    }
  };

  const handleAddToProfile = () => {
    onSkillsDiscovered(discoveredSkills);
    sounds.success();
    hapticSuccess();
    onClose();
  };

  const handleStartOver = () => {
    setMessages([{ role: 'assistant', content: questions[0] }]);
    setCurrentQuestionIndex(0);
    setDiscoveredSkills([]);
    setIsComplete(false);
    sounds.click();
    hapticLight();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="card-sketch flex w-full max-h-[80vh] max-w-2xl flex-col overflow-hidden bg-[var(--paper-raised)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--ink)] p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border-2 border-[var(--ink)] bg-[var(--accent-news)]">
              <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-xl text-[var(--ink)]">{t.title}</h2>
              <p className="text-sm text-[var(--ink-soft)]">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center border-2 border-transparent hover:border-[var(--ink)] transition-colors"
            aria-label="Close skill discovery"
          >
            <X className="h-5 w-5 text-[var(--ink-soft)]" aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" aria-live="polite">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-2xl rounded-br-sm bg-[var(--ink)] text-[var(--paper)]'
                      : 'card-sketch counselor-answer relative whitespace-pre-wrap bg-[var(--paper-raised)] text-[var(--ink)]'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
              role="status"
            >
              <div className="card-sketch flex items-center gap-2 bg-[var(--paper-raised)] px-4 py-3">
                <span className="typing-dots text-[var(--ink-soft)]" aria-hidden="true"><i /><i /><i /></span>
                <span className="text-sm text-[var(--ink-soft)]">{t.processing}</span>
              </div>
            </motion.div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-sketch bg-[var(--paper-raised)] p-6"
              role="status"
            >
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-[var(--accent-news)]" aria-hidden="true" />
                <h3 className="font-display text-lg text-[var(--ink)]">{t.complete}</h3>
              </div>

              {discoveredSkills.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-[var(--ink-soft)]">
                    <strong className="text-[var(--ink)]">{discoveredSkills.length}</strong> {t.foundSkills}
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {discoveredSkills.map((skill, idx) => {
                      const skillInfo = skillById.get(skill.skillId);
                      return (
                        <div
                          key={idx}
                          className="rounded-full border border-[var(--accent-news)]/30 bg-[var(--accent-news)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-news)]"
                        >
                          {skillInfo?.name || skill.name || skill.skillId}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToProfile}
                      className="flex-1 border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 text-sm font-mono-ui uppercase text-[var(--paper)] transition-colors hover:bg-[var(--accent-news)] hover:border-[var(--accent-news)]"
                    >
                      {t.addToProfile}
                    </button>
                    <button
                      onClick={handleStartOver}
                      className="border-2 border-[var(--ink)] px-4 py-2.5 text-sm font-mono-ui uppercase text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
                    >
                      {t.startOver}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-sm text-[var(--ink-soft)]">
                    No skills could be extracted. Try describing your work with more specific details.
                  </p>
                  <button
                    onClick={handleStartOver}
                    className="border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-2.5 text-sm font-mono-ui uppercase text-[var(--paper)] transition-colors hover:bg-[var(--accent-news)] hover:border-[var(--accent-news)]"
                  >
                    {t.startOver}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!isComplete && (
          <div className="border-t-2 border-[var(--ink)] p-4">
            <div className="flex gap-2">
              <label htmlFor="skill-discovery-input" className="sr-only">{t.placeholder}</label>
              <input
                ref={inputRef}
                id="skill-discovery-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={t.placeholder}
                disabled={isProcessing}
                className="flex-1 border border-[var(--ink)]/20 bg-[var(--paper-raised)] px-4 py-3 text-[var(--ink)] outline-none focus-visible:border-[var(--accent-news)] disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-3 text-sm font-mono-ui uppercase text-[var(--paper)] transition-colors hover:bg-[var(--accent-news)] hover:border-[var(--accent-news)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t.send}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Send className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">{t.send}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
