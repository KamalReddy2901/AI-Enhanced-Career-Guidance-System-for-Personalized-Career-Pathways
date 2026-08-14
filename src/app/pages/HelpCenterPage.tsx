import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Search, BookOpen, Video, AlertCircle, HelpCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { TextReveal } from '../motion/TextReveal';

const FAQ_CATEGORIES = [
  {
    title: 'Getting Started',
    icon: <BookOpen size={20} />,
    questions: [
      {
        q: 'What is CareerCase?',
        a: 'CareerCase is an AI-powered career guidance platform that helps you explore careers, build pathways, and make informed career decisions. It combines deterministic scoring with AI insights to provide personalized recommendations.',
      },
      {
        q: 'How do I create my Career Passport?',
        a: 'Start by completing the onboarding flow. You can upload your resume, take assessments, and add your skills manually. Your passport grows as you complete more assessments and add experiences.',
      },
      {
        q: 'What are the assessments for?',
        a: 'The assessments (interests, aptitude, and work values) help us understand your preferences and strengths. They improve the accuracy of your career recommendations and pathway suggestions.',
      },
      {
        q: 'Can I skip the assessments?',
        a: 'Yes, but we strongly recommend completing them. Your recommendations will be more generic without assessment data. You can always come back and complete them later from the Assessment Desk.',
      },
    ],
  },
  {
    title: 'Career Recommendations',
    icon: <HelpCircle size={20} />,
    questions: [
      {
        q: 'How are recommendations calculated?',
        a: 'Recommendations use deterministic scoring based on your passport data matched against our versioned knowledge base. We consider your skills, assessment results, constraints, and career requirements. No LLM is used for scoring.',
      },
      {
        q: 'What do the recommendation groups mean?',
        a: 'Safe = best fit or easiest transition; Stretch = growth opportunities that challenge you; Ambitious = emerging or unconventional careers that require significant pivoting.',
      },
      {
        q: 'Can I hide recommendations I\'m not interested in?',
        a: 'Yes! Hover over any recommendation card and click the X button in the top-right corner to hide it. You can restore hidden careers anytime from the hidden careers section.',
      },
      {
        q: 'How often do recommendations update?',
        a: 'Recommendations automatically recompute whenever you update your passport, complete an assessment, or add new skills. You can also manually trigger a recompute from the Recommendations page.',
      },
    ],
  },
  {
    title: 'Pathways & Planning',
    icon: <BookOpen size={20} />,
    questions: [
      {
        q: 'What is a Career Pathway?',
        a: 'A pathway is a step-by-step plan to reach a target career. It includes skills to learn, qualifications to earn, and experiences to gain. You can compare focused, lower-risk, and credential-based routes by their actual duration and trade-offs.',
      },
      {
        q: 'Can I build multiple pathways?',
        a: 'Yes! You can build pathways for as many careers as you want. Each pathway is saved and tracks your progress independently.',
      },
      {
        q: 'What does the route quiz do?',
        a: 'The route quiz asks 3 quick questions about your priorities, time availability, and learning style. Based on your answers, it recommends which of the three routes best fits your situation.',
      },
      {
        q: 'How do I mark pathway steps as complete?',
        a: 'Click the circle next to each step to mark it done. Completing steps that involve skills or qualifications will automatically update your passport with new evidence.',
      },
    ],
  },
  {
    title: 'Features & Tools',
    icon: <Video size={20} />,
    questions: [
      {
        q: 'What is the Day Simulation feature?',
        a: 'Day Simulation lets you experience a realistic day in a career role. You\'ll face decisions and scenarios that help you understand what the job is really like beyond job descriptions.',
      },
      {
        q: 'How does career comparison work?',
        a: 'Select two careers to compare side-by-side across salary, skills, lifestyle, growth potential, and more. Use it to make informed choices between similar options.',
      },
      {
        q: 'Can I practice interviews?',
        a: 'Yes! The Interview Prep tool generates role-specific questions and provides AI feedback on your answers. It helps you prepare for real interviews with confidence.',
      },
      {
        q: 'What is the AI Counselor?',
        a: 'The AI Counselor is a conversational assistant that answers your career questions, provides guidance, and helps you explore what-if scenarios. Think of it as your personal career advisor.',
      },
    ],
  },
  {
    title: 'Data & Privacy',
    icon: <AlertCircle size={20} />,
    questions: [
      {
        q: 'Where is my data stored?',
        a: 'Your data is stored locally in your browser and (if you have an account) synced to secure cloud storage. You have full control over your data and can export or delete it anytime.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes! Go to Settings > Data Management > Export my guidance data. You\'ll get a JSON file with your complete passport, pathways, assessments, and progress history.',
      },
      {
        q: 'How do I delete my data?',
        a: 'In Settings > Data Management, click "Delete guidance data" to remove all your career data from both local storage and cloud. Your account remains active.',
      },
      {
        q: 'Is my resume data used for training AI?',
        a: 'No. Your resume and personal data are never used to train AI models. They are only used to populate your passport and are kept private to your account.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: <AlertCircle size={20} />,
    questions: [
      {
        q: 'My recommendations aren\'t loading',
        a: 'First, ensure you have a complete passport (at least one assessment or skills added). Try refreshing the page. If the issue persists, check Settings > Data Management to verify your passport data.',
      },
      {
        q: 'Resume upload failed',
        a: 'Make sure your resume is in PDF, DOCX, or TXT format and under 5MB. If AI extraction fails, you can still add skills manually or paste resume text directly.',
      },
      {
        q: 'I can\'t undo a passport change',
        a: 'The undo stack holds the last 20 changes. If you don\'t see the undo button or it\'s disabled, there may be no previous state. You can always manually edit your passport fields.',
      },
      {
        q: 'Pathways showing old data',
        a: 'Pathways auto-refresh when you update your passport. If you see stale data, try navigating away and back to the pathway page, or refresh your browser.',
      },
    ],
  },
];

export function HelpCenterPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // Filter FAQs based on search query
  const filteredCategories = FAQ_CATEGORIES.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => searchQuery === '' ||
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <div className="editorial-utility min-h-screen bg-[var(--paper)] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex min-h-11 items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          Home
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <StickFigure pose="reading" size={64} />
            <div>
              <h1 className="font-display text-5xl leading-[1.25] text-black">
                <TextReveal text="Help Center" />
              </h1>
              <p className="font-[Inter] text-black/40" style={{ fontSize: '0.82rem' }}>
                Find answers, guides, and tutorials
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full border-2 border-black/10 bg-white pl-12 pr-4 py-3 font-[Inter] text-black/70 focus:border-black/30 outline-none"
              style={{ fontSize: '0.88rem' }}
            />
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          className="mb-12 grid grid-cols-1 sm:grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <a
            href="https://github.com/KamalReddy2901/career-sim"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border border-black/10 p-4 hover:border-black/30 transition-colors group"
          >
            <BookOpen size={20} className="text-black/40 group-hover:text-black/60" />
            <div className="flex-1">
              <div className="font-[Inter] text-black/70 font-medium" style={{ fontSize: '0.88rem' }}>
                Documentation
              </div>
              <div className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
                Read the full docs on GitHub
              </div>
            </div>
            <ExternalLink size={14} className="text-black/20" />
          </a>

          <button
            onClick={() => navigate('/how-it-works')}
            className="flex items-center gap-3 border border-black/10 p-4 hover:border-black/30 transition-colors group text-left"
          >
            <HelpCircle size={20} className="text-black/40 group-hover:text-black/60" />
            <div className="flex-1">
              <div className="font-[Inter] text-black/70 font-medium" style={{ fontSize: '0.88rem' }}>
                How It Works
              </div>
              <div className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
                Learn how guidance works
              </div>
            </div>
          </button>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-[Playfair_Display] text-2xl mb-6">Frequently Asked Questions</h2>

          {filteredCategories.length === 0 ? (
            <div className="border border-black/10 p-8 text-center">
              <p className="font-[Inter] text-black/40" style={{ fontSize: '0.88rem' }}>
                No results found for "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-black/40">{category.icon}</span>
                    <h3 className="font-[Inter] text-black/70 font-semibold" style={{ fontSize: '1rem' }}>
                      {category.title}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {category.questions.map((question, qIndex) => {
                      const questionId = `${catIndex}-${qIndex}`;
                      const isExpanded = expandedQuestions.has(questionId);

                      return (
                        <div key={qIndex} className="border border-black/10 overflow-hidden">
                          <button
                            onClick={() => toggleQuestion(questionId)}
                            className="w-full flex items-center justify-between p-4 hover:bg-black/2 transition-colors text-left"
                          >
                            <span className="font-[Inter] text-black/70 font-medium pr-4" style={{ fontSize: '0.88rem' }}>
                              {question.q}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={18} className="text-black/40 shrink-0" />
                            ) : (
                              <ChevronDown size={18} className="text-black/40 shrink-0" />
                            )}
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-black/10 p-4 bg-black/[0.02]"
                            >
                              <p className="font-[Inter] text-black/60 leading-relaxed" style={{ fontSize: '0.85rem' }}>
                                {question.a}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Contact Support */}
        <motion.div
          className="mt-12 border-2 border-black/10 p-6 bg-black/[0.02]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-[Playfair_Display] text-xl mb-2">Still need help?</h3>
          <p className="font-[Inter] text-black/60 mb-4" style={{ fontSize: '0.85rem' }}>
            Can't find what you're looking for? Open an issue on GitHub or check the documentation.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/KamalReddy2901/career-sim/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-black/20 px-4 py-2 font-[Inter] text-black/60 hover:border-black/40 hover:text-black transition-colors"
              style={{ fontSize: '0.82rem' }}
            >
              <ExternalLink size={14} />
              Open an Issue
            </a>
            <button
              onClick={() => navigate('/counselor')}
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 font-[Inter] hover:bg-black/85 transition-colors"
              style={{ fontSize: '0.82rem' }}
            >
              Talk to AI Counselor
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default HelpCenterPage;
